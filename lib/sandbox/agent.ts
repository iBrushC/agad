import { Sandbox } from "@vercel/sandbox";
import { v4 as uuid } from "uuid";

import {
  OPENCODE_PORT,
  basicAuthHeader,
  installOpenCode,
  lockDownEgress,
  startOpenCodeServer,
  waitForOpenCodeHealthy,
  writeOpenCodeConfig,
} from "./opencode";
import { syncSkills } from "./skills";
import * as state from "./state";
import type { AgentActionResult, AgentState } from "./types";

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const INSTALL_TIMEOUT_MS = 60 * 60 * 1000;
const SNAPSHOT_SANDBOX_NAME = "agad-agent-base-sandbox";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function readOpenRouterKey(): string {
  return requireEnv("OPENROUTER_API_KEY");
}

function readSnapshotId(): string | undefined {
  const v = process.env.OPENCODE_SNAPSHOT_ID;
  return v && v.length > 0 ? v : undefined;
}

async function writeOpenCodeAssets(sandbox: Sandbox): Promise<void> {
  await writeOpenCodeConfig(sandbox, {
    model: "z-ai/glm-5.2",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: readOpenRouterKey(),
  });
  const count = await syncSkills((files) => sandbox.writeFiles(files));
  if (count > 0) {
    await sandbox.runCommand("chmod", [
      "-R",
      "755",
      "/home/vercel-sandbox/.config/opencode",
    ]);
  }
}

async function runCreatePipeline(userId: string): Promise<AgentState> {
  const name = state.sandboxNameForUser(userId);
  state.setStatus(userId, "creating");

  const snapshotId = readSnapshotId();
  const sandbox = snapshotId
    ? await Sandbox.create({
        name,
        source: { type: "snapshot", snapshotId },
        ports: [OPENCODE_PORT],
        timeout: INSTALL_TIMEOUT_MS,
        resources: { vcpus: 2 },
      })
    : await Sandbox.getOrCreate({
        name,
        runtime: "node24",
        ports: [OPENCODE_PORT],
        timeout: INSTALL_TIMEOUT_MS,
        resources: { vcpus: 2 },
        onCreate: async (sbx) => {
          state.setStatus(userId, "installing");
          await installOpenCode(sbx);
          await writeOpenCodeAssets(sbx);
        },
      });

  if (!snapshotId) {
    state.setStatus(userId, "installing");
    await installOpenCode(sandbox);
    await writeOpenCodeAssets(sandbox);
  }

  const password = state.get(userId).password ?? uuid().replace(/-/g, "");
  state.setStatus(userId, "starting", {
    sandboxId: name,
    password,
    startedAt: Date.now(),
    expiresAt: sandbox.expiresAt ? sandbox.expiresAt.toISOString() : null,
  });

  await startOpenCodeServer(sandbox, password);
  const healthy = await waitForOpenCodeHealthy(sandbox, password, 30_000);
  if (!healthy) {
    state.setError(userId, "opencode server did not become healthy");
    throw new Error("opencode server did not become healthy");
  }

  try {
    await lockDownEgress(sandbox, ["openrouter.ai"]);
  } catch (err) {
    console.warn("network policy lockdown failed", err);
  }

  const url = sandbox.domain(OPENCODE_PORT);
  return state.setStatus(userId, "ready", { url, password });
}

export async function getOrCreateAgent(userId: string): Promise<AgentActionResult> {
  try {
    const entry = state.ensure(userId);
    const current = entry.state;
    if (current.status === "ready" && current.url && current.password) {
      return { ok: true, state: current };
    }
    if (entry.promise) {
      const next = await entry.promise;
      return { ok: true, state: next };
    }
    const promise = runCreatePipeline(userId).catch((err) => {
      state.setError(userId, err instanceof Error ? err.message : String(err));
      return state.get(userId);
    });
    state.setPromise(userId, promise);
    const next = await promise;
    state.setPromise(userId, null);
    return { ok: true, state: next };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function stopAgent(userId: string): Promise<AgentActionResult> {
  try {
    const current = state.get(userId);
    if (!current.sandboxName) {
      return { ok: true, state: state.setStatus(userId, "stopped") };
    }
    state.setStatus(userId, "stopping");
    const sandbox = await Sandbox.get({ name: current.sandboxName });
    await sandbox.stop();
    return { ok: true, state: state.setStatus(userId, "stopped", { url: null }) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function extendAgent(
  userId: string,
  durationMs: number = DEFAULT_TIMEOUT_MS,
): Promise<AgentActionResult> {
  try {
    const current = state.get(userId);
    if (!current.sandboxName) {
      return { ok: false, error: "agent not started" };
    }
    const sandbox = await Sandbox.get({ name: current.sandboxName });
    await sandbox.extendTimeout(durationMs);
    const next = await Sandbox.get({ name: current.sandboxName });
    return {
      ok: true,
      state: state.setStatus(userId, "ready", {
        expiresAt: next.expiresAt ? next.expiresAt.toISOString() : null,
      }),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function getAgentState(userId: string): Promise<AgentState | null> {
  return state.read(userId);
}

export async function tailAgentLogs(
  userId: string,
): Promise<{ stream: ReadableStream<Uint8Array> | null; reachedHead: boolean }> {
  const current = state.get(userId);
  if (!current.sandboxName) {
    return { stream: null, reachedHead: false };
  }
  try {
    const sandbox = await Sandbox.get({ name: current.sandboxName });
    const file = await sandbox.readFile({ path: "/tmp/opencode.log" });
    if (!file) return { stream: null, reachedHead: false };
    return { stream: file as unknown as ReadableStream<Uint8Array>, reachedHead: true };
  } catch {
    return { stream: null, reachedHead: false };
  }
}

export async function proxyToOpenCode(
  userId: string,
  request: Request,
): Promise<Response | null> {
  const current = state.get(userId);
  if (!current.url || !current.password) return null;
  const url = new URL(request.url);
  const target = `${current.url}${url.pathname}${url.search}`;
  const headers = new Headers(request.headers);
  headers.set("Authorization", basicAuthHeader(current.password));
  headers.delete("host");
  headers.delete("connection");
  const init: RequestInit = {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "manual",
  };
  return fetch(target, init);
}

export async function snapshotOpenCodeBaseSandbox(): Promise<{
  ok: boolean;
  snapshotId?: string;
  error?: string;
}> {
  try {
    const sandbox = await Sandbox.create({
      name: SNAPSHOT_SANDBOX_NAME,
      runtime: "node24",
      ports: [OPENCODE_PORT],
      timeout: INSTALL_TIMEOUT_MS,
      resources: { vcpus: 2 },
    });
    await installOpenCode(sandbox);
    await writeOpenCodeAssets(sandbox);
    const snap = await sandbox.snapshot();
    return { ok: true, snapshotId: snap.snapshotId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

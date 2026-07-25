import { Sandbox } from "@vercel/sandbox";
import { v4 as uuid } from "uuid";

import {
  OPENCODE_PORT,
  PROJECT_INDEX_HTML,
  basicAuthHeader,
  installMotion,
  installOpenCode,
  lockDownEgress,
  renderProjectScreenshot,
  startOpenCodeServer,
  waitForOpenCodeHealthy,
  readOpenCodeLog,
  writeOpenCodeConfig,
} from "./opencode";
import { syncSkills } from "./skills";
import * as state from "./state";
import type { AgentActionResult, AgentState } from "./types";

const HOBBY_MAX_TIMEOUT_MS = 45 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = HOBBY_MAX_TIMEOUT_MS;
const INSTALL_TIMEOUT_MS = HOBBY_MAX_TIMEOUT_MS;
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
  console.log(`[agent] runCreatePipeline start userId=${userId} name=${name} snapshotId=${readSnapshotId() ?? "<none>"}`);
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
          await installMotion(sbx);
        },
      });

  if (!snapshotId) {
    state.setStatus(userId, "installing");
    await installOpenCode(sandbox);
    await writeOpenCodeAssets(sandbox);
    await installMotion(sandbox);
  }

  const password = state.get(userId).password ?? uuid().replace(/-/g, "");
  state.setStatus(userId, "starting", {
    sandboxId: name,
    password,
    startedAt: Date.now(),
    expiresAt: sandbox.expiresAt ? sandbox.expiresAt.toISOString() : null,
  });

  console.log(`[agent] starting opencode server userId=${userId} port=${OPENCODE_PORT}`);
  await startOpenCodeServer(sandbox, password);
  const { healthy, lastError } = await waitForOpenCodeHealthy(sandbox, password, 30_000);
  console.log(`[agent] opencode healthy=${healthy} userId=${userId} lastError=${lastError ?? "<none>"}`);
  if (!healthy) {
    const log = await readOpenCodeLog(sandbox);
    const detail = `opencode server did not become healthy: ${lastError ?? "timeout"}; log tail: ${log || "<empty>"}`;
    state.setError(userId, detail);
    throw new Error(detail);
  }

  try {
    await lockDownEgress(sandbox, ["openrouter.ai"]);
  } catch (err) {
    console.warn("network policy lockdown failed", err);
  }

  const url = sandbox.domain(OPENCODE_PORT);
  console.log(`[agent] pipeline ready userId=${userId} url=${url}`);
  return state.setStatus(userId, "ready", { url, password });
}

export async function getOrCreateAgent(userId: string): Promise<AgentActionResult> {
  try {
    const entry = state.ensure(userId);
    const current = entry.state;
    if (current.status === "ready" && current.url && current.password) {
      console.log(`[agent] getOrCreateAgent hit ready state for userId=${userId}`);
      return { ok: true, state: current };
    }
    if (entry.promise) {
      console.log(`[agent] getOrCreateAgent awaiting in-flight pipeline for userId=${userId} status=${current.status}`);
      const next = await entry.promise;
      return settleAfterPipeline(userId, next);
    }
    console.log(`[agent] getOrCreateAgent starting pipeline for userId=${userId} status=${current.status}`);
    const promise = runCreatePipeline(userId).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      const anyErr = err as Error & {
        json?: unknown;
        text?: string;
        response?: { status?: number; url?: string };
      };
      console.error(
        `[agent] pipeline threw for userId=${userId}: ${msg} | status=${anyErr.response?.status ?? "?"} url=${anyErr.response?.url ?? "?"} json=${JSON.stringify(anyErr.json)?.slice(0, 600) ?? "<none>"} text=${anyErr.text?.slice(0, 600) ?? "<none>"}`,
      );
      console.error(`[agent] pipeline stack: ${err instanceof Error ? err.stack : "<no stack>"}`);
      state.setError(userId, msg);
      return state.get(userId);
    });
    state.setPromise(userId, promise);
    const next = await promise;
    state.setPromise(userId, null);
    return settleAfterPipeline(userId, next);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[agent] getOrCreateAgent hard-fail userId=${userId}: ${msg}`);
    return { ok: false, error: msg };
  }
}

function settleAfterPipeline(userId: string, next: AgentState): AgentActionResult {
  if (next.status === "ready" && next.url && next.password) {
    return { ok: true, state: next };
  }
  console.error(
    `[agent] pipeline ended not-ready for userId=${userId} status=${next.status} error=${next.error ?? "<none>"}`,
  );
  return {
    ok: false,
    error: next.error ?? `agent not ready (status=${next.status})`,
  };
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
  if (!current.url || !current.password) {
    console.warn(
      `[agent] proxyToOpenCode missing url/password userId=${userId} status=${current.status} hasUrl=${!!current.url} hasPassword=${!!current.password} error=${current.error ?? "<none>"}`,
    );
    return null;
  }
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
    await installMotion(sandbox);
    const snap = await sandbox.snapshot();
    return { ok: true, snapshotId: snap.snapshotId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function getSandboxForUser(userId: string): Promise<Sandbox | null> {
  const current = state.get(userId);
  if (!current.sandboxName) return null;
  try {
    return await Sandbox.get({ name: current.sandboxName });
  } catch {
    return null;
  }
}

export async function readProjectHtml(userId: string): Promise<string | null> {
  const sandbox = await getSandboxForUser(userId);
  if (!sandbox) return null;
  const buf = await sandbox.readFileToBuffer({ path: PROJECT_INDEX_HTML });
  return buf ? buf.toString("utf8") : null;
}

export async function screenshotProject(
  userId: string,
): Promise<{ png: Buffer; html: string } | null> {
  const sandbox = await getSandboxForUser(userId);
  if (!sandbox) return null;
  const htmlBuf = await sandbox.readFileToBuffer({ path: PROJECT_INDEX_HTML });
  if (!htmlBuf) return null;
  const png = await renderProjectScreenshot(sandbox);
  if (!png) return null;
  return { png, html: htmlBuf.toString("utf8") };
}

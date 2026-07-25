import { Sandbox } from "@vercel/sandbox";
import { v4 as uuid } from "uuid";

import {
  OPENCODE_PORT,
  PROJECT_DIR,
  PROJECT_INDEX_HTML,
  basicAuthHeader,
  ensureProjectDir,
  installImageGenerationSkill,
  installMotion,
  installOpenCode,
  lockDownEgress,
  renderProjectScreenshot,
  startOpenCodeServer,
  waitForOpenCodeHealthy,
  readOpenCodeLog,
  writeOpenCodeConfig,
  writeOpenCodeSecrets,
} from "./opencode";
import { syncSkills } from "./skills";
import * as state from "./state";
import type { AgentActionResult, AgentState } from "./types";

const HOBBY_MAX_TIMEOUT_MS = 45 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = HOBBY_MAX_TIMEOUT_MS;
const INSTALL_TIMEOUT_MS = HOBBY_MAX_TIMEOUT_MS;

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

async function installBaseSkills(sandbox: Sandbox): Promise<void> {
  await installOpenCode(sandbox);
  await writeOpenCodeAssets(sandbox);
  await writeOpenCodeSecrets(sandbox, readOpenRouterKey());
  await installImageGenerationSkill(sandbox);
  await installMotion(sandbox);
}

async function runCreatePipeline(userId: string): Promise<AgentState> {
  const name = state.sandboxNameForUser(userId);
  console.log(`[agent] runCreatePipeline start userId=${userId} name=${name}`);
  await state.setStatus(userId, "creating");

  const existing = await state.get(userId);
  const finalPassword = existing.password ?? uuid().replace(/-/g, "");

  const sandbox = await Sandbox.getOrCreate({
    name,
    runtime: "node24",
    ports: [OPENCODE_PORT],
    timeout: INSTALL_TIMEOUT_MS,
    resources: { vcpus: 2 },
    onCreate: async (sbx) => {
      await ensureProjectDir(sbx);
      await installBaseSkills(sbx);
    },
  });

  await state.setStatus(userId, "starting", {
    sandboxId: name,
    password: finalPassword,
    startedAt: Date.now(),
    expiresAt: sandbox.expiresAt ? sandbox.expiresAt.toISOString() : null,
  });

  console.log(`[agent] starting opencode server userId=${userId} port=${OPENCODE_PORT}`);
  await startOpenCodeServer(sandbox, finalPassword);
  const { healthy, lastError } = await waitForOpenCodeHealthy(sandbox, finalPassword, 90_000);
  console.log(`[agent] opencode healthy=${healthy} userId=${userId} lastError=${lastError ?? "<none>"}`);
  if (!healthy) {
    const log = await readOpenCodeLog(sandbox);
    console.error(`[agent] opencode diagnostics userId=${userId}\n${log}`);
    const detail = `opencode server did not become healthy: ${lastError ?? "timeout"}\n${log || "<no diagnostics captured>"}`;
    await state.setError(userId, detail);
    throw new Error(detail);
  }

  try {
    await lockDownEgress(sandbox, ["openrouter.ai"]);
  } catch (err) {
    console.warn("network policy lockdown failed", err);
  }

  const url = sandbox.domain(OPENCODE_PORT);
  console.log(`[agent] pipeline ready userId=${userId} url=${url}`);
  return state.setStatus(userId, "ready", { url, password: finalPassword });
}

export async function getOrCreateAgent(userId: string): Promise<AgentActionResult> {
  try {
    const entry = await state.ensure(userId);
    const current = entry.state;
    if (current.status === "ready" && current.url && current.password) {
      console.log(`[agent] getOrCreateAgent hit ready state for userId=${userId}`);
      return { ok: true, state: current };
    }
    const existingPromise = await state.getPromise(userId);
    if (existingPromise) {
      console.log(`[agent] getOrCreateAgent awaiting in-flight pipeline for userId=${userId} status=${current.status}`);
      const next = await existingPromise;
      return settleAfterPipeline(userId, next);
    }
    console.log(`[agent] getOrCreateAgent starting pipeline for userId=${userId} status=${current.status}`);
    const promise = state
      .getOrAdoptPromise(userId, () => runCreatePipeline(userId))
      .catch((err) => {
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
        void state.setError(userId, msg);
        return state.get(userId);
      });
    const next = await promise;
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
    const current = await state.get(userId);
    if (!current.sandboxName) {
      return { ok: true, state: await state.setStatus(userId, "stopped") };
    }
    await state.setStatus(userId, "stopping");
    const sandbox = await Sandbox.get({ name: current.sandboxName });
    await sandbox.stop();
    return {
      ok: true,
      state: await state.setStatus(userId, "stopped", { url: null }),
    };
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
    const current = await state.get(userId);
    if (!current.sandboxName) {
      return { ok: false, error: "agent not started" };
    }
    const sandbox = await Sandbox.get({ name: current.sandboxName });
    await sandbox.extendTimeout(durationMs);
    const next = await Sandbox.get({ name: current.sandboxName });
    return {
      ok: true,
      state: await state.setStatus(userId, "ready", {
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

export async function readAgentLogs(userId: string): Promise<string | null> {
  const current = await state.get(userId);
  if (!current.sandboxName) {
    return null;
  }
  try {
    const sandbox = await Sandbox.get({ name: current.sandboxName });
    const buf = await sandbox.readFileToBuffer({ path: "/tmp/opencode.log" });
    return buf ? buf.toString("utf8") : null;
  } catch {
    return null;
  }
}

export async function proxyToOpenCode(
  userId: string,
  request: Request,
): Promise<Response | null> {
  const current = await state.get(userId);
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
    redirect: "manual",
  };
  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = request.body;
    (init as RequestInit & { duplex: "half" }).duplex = "half";
  }
  return fetch(target, init);
}

export async function getSandboxForUser(userId: string): Promise<Sandbox | null> {
  const current = await state.get(userId);
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

export type GeneratedLines = {
  total: number;
  files: { path: string; lines: number }[];
};

const LINE_COUNTABLE = /\.(html?|css|scss|sass|less|js|jsx|ts|tsx|mjs|cjs|json|md|svg|vue|svelte)$/i;

export async function countGeneratedLines(userId: string): Promise<GeneratedLines> {
  const empty: GeneratedLines = { total: 0, files: [] };
  const sandbox = await getSandboxForUser(userId);
  if (!sandbox) return empty;
  let listing: { name: string; type: string }[];
  try {
    const result = await sandbox.runCommand({
      cmd: "bash",
      args: [
        "-c",
        `find ${PROJECT_DIR} -maxdepth 3 -type f -not -path '*/node_modules/*' -not -path '*/.cache/*' -printf '%p\\t%y\\n' 2>/dev/null | head -n 200`,
      ],
    });
    if (result.exitCode !== 0) return empty;
    const raw = await result.stdout();
    listing = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [name, type] = l.split("\t");
        return { name: name ?? "", type: type ?? "f" };
      });
  } catch {
    return empty;
  }
  const files: GeneratedLines["files"] = [];
  let total = 0;
  for (const entry of listing) {
    if (entry.type !== "f") continue;
    if (!LINE_COUNTABLE.test(entry.name)) continue;
    try {
      const buf = await sandbox.readFileToBuffer({ path: entry.name });
      if (!buf) continue;
      const text = buf.toString("utf8");
      const lines = text.length === 0 ? 0 : text.split("\n").length;
      total += lines;
      files.push({ path: entry.name, lines });
    } catch {
      // ignore unreadable files
    }
  }
  files.sort((a, b) => b.lines - a.lines);
  return { total, files: files.slice(0, 8) };
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

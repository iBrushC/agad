import { proxyToOpenCode } from "../sandbox/agent";

export type OpenCodeSession = {
  id: string;
  title?: string;
};

async function call(
  userId: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  pathname: string,
  body?: unknown,
): Promise<unknown> {
  const url = new URL(pathname, "http://placeholder");
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "content-type": "application/json" };
  }
  const req = new Request(url, init);
  const res = await proxyToOpenCode(userId, req);
  if (!res) throw new Error("agent not ready");
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`opencode ${method} ${pathname} -> ${res.status}: ${text.slice(0, 300)}`);
  }
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

export async function getOrCreateSession(
  userId: string,
  title: string,
): Promise<OpenCodeSession> {
  const list = (await call(userId, "GET", "/session")) as OpenCodeSession[];
  if (Array.isArray(list) && list.length > 0 && list[0]?.id) {
    return list[0];
  }
  const created = (await call(userId, "POST", "/session", { title })) as OpenCodeSession;
  return created;
}

export type OpenCodeMessagePart =
  | { type: "text"; text: string }
  | { type: string; [k: string]: unknown };

export type OpenCodeMessage = {
  id: string;
  role: "user" | "assistant";
  parts?: OpenCodeMessagePart[];
};

function extractText(message: OpenCodeMessage): string {
  if (!message.parts) return "";
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

export async function postUserMessage(
  userId: string,
  sessionId: string,
  text: string,
): Promise<OpenCodeMessage> {
  const parts = [{ type: "text", text }];
  return (await call(userId, "POST", `/session/${sessionId}/message`, {
    parts,
  })) as OpenCodeMessage;
}

export async function getMessages(userId: string, sessionId: string): Promise<OpenCodeMessage[]> {
  const res = (await call(userId, "GET", `/session/${sessionId}/message`)) as OpenCodeMessage[];
  return Array.isArray(res) ? res : [];
}

export async function getLastAssistantText(
  userId: string,
  sessionId: string,
): Promise<string> {
  const msgs = await getMessages(userId, sessionId);
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === "assistant") {
      return extractText(msgs[i]);
    }
  }
  return "";
}

export async function waitForTurnIdle(
  userId: string,
  sessionId: string,
  pollMs = 1000,
  maxMs = 5 * 60 * 1000,
): Promise<string> {
  const deadline = Date.now() + maxMs;
  let lastText = "";
  while (Date.now() < deadline) {
    const msgs = await getMessages(userId, sessionId);
    let lastAssistant: OpenCodeMessage | null = null;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "assistant") {
        lastAssistant = msgs[i];
        break;
      }
    }
    if (lastAssistant) {
      lastText = extractText(lastAssistant);
      const status = (lastAssistant as { info?: { time?: { completed?: number } } }).info?.time?.completed;
      if (typeof status === "number" && status > 0) return lastText;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return lastText;
}

export type SessionActivity = {
  toolCount: number;
  lastTool: string | null;
  lastActivity: string | null;
  textLength: number;
  inProgress: boolean;
};

function describePart(part: { type: string; [k: string]: unknown }): string | null {
  const t = part.type;
  if (t === "text") return null;
  const toolName =
    (typeof part.tool === "string" && part.tool) ||
    (typeof part.name === "string" && part.name) ||
    (typeof part.toolName === "string" && part.toolName) ||
    null;
  const args = (part.args ?? part.input ?? part.parameters) as
    | Record<string, unknown>
    | undefined;
  let hint = "";
  if (args && typeof args === "object") {
    const path =
      (typeof args.filePath === "string" && args.filePath) ||
      (typeof args.path === "string" && args.path) ||
      (typeof args.file === "string" && args.file) ||
      null;
    const cmd =
      (typeof args.command === "string" && args.command) ||
      (typeof args.cmd === "string" && args.cmd) ||
      null;
    if (path) hint = ` ${path}`;
    else if (cmd) hint = ` ${cmd.length > 40 ? `${cmd.slice(0, 40)}…` : cmd}`;
  }
  return toolName ? `${toolName}${hint}` : t;
}

export async function getSessionActivity(
  userId: string,
  sessionId: string,
): Promise<SessionActivity> {
  const msgs = await getMessages(userId, sessionId);
  let toolCount = 0;
  let lastTool: string | null = null;
  let lastActivity: string | null = null;
  let textLength = 0;
  let inProgress = false;
  for (const msg of msgs) {
    if (msg.role !== "assistant") continue;
    const status = (msg as { info?: { time?: { completed?: number } } }).info?.time?.completed;
    const completed = typeof status === "number" && status > 0;
    if (!completed) inProgress = true;
    for (const part of msg.parts ?? []) {
      if (part.type === "text") {
        textLength += (part as { type: "text"; text: string }).text.length;
        continue;
      }
      toolCount += 1;
      const label = describePart(part as { type: string; [k: string]: unknown });
      if (label) {
        lastTool = label;
        if (!completed) lastActivity = label;
      }
    }
  }
  return { toolCount, lastTool, lastActivity, textLength, inProgress };
}
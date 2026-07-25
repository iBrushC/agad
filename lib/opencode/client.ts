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
import { randomUUID } from "crypto";

export type SessionActivity = {
  toolCount: number;
  lastTool: string | null;
  lastActivity: string | null;
  textLength: number;
  inProgress: boolean;
};

export type SessionLine = {
  path: string;
  lines: number;
};

export type SessionState = {
  status: "idle" | "creating" | "starting" | "ready" | "stopping" | "stopped" | "failed" | "generating" | "done";
  html: string | null;
  assistantText: string;
  activity: SessionActivity;
  lines: { total: number; files: SessionLine[] };
  error: string | null;
  startedAt: number;
  finishedAt: number | null;
  title: string;
};

export type GenerationSession = {
  id: string;
  userId: string;
  prompt: string;
  updatedAt: number;
  state: SessionState;
};

const sessions = new Map<string, GenerationSession>();

export function createSession(userId: string, prompt: string, title: string): GenerationSession {
  const id = randomUUID();
  const session: GenerationSession = {
    id,
    userId,
    prompt,
    updatedAt: Date.now(),
    state: {
      status: "generating",
      html: null,
      assistantText: "",
      activity: {
        toolCount: 0,
        lastTool: null,
        lastActivity: "calling model",
        textLength: 0,
        inProgress: true,
      },
      lines: { total: 0, files: [] },
      error: null,
      startedAt: Date.now(),
      finishedAt: null,
      title,
    },
  };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): GenerationSession | null {
  return sessions.get(id) ?? null;
}

export function getSessionsForUser(userId: string): GenerationSession[] {
  const out: GenerationSession[] = [];
  for (const s of sessions.values()) {
    if (s.userId === userId) out.push(s);
  }
  return out;
}

export function updateSession(
  id: string,
  patch: (state: SessionState) => SessionState,
): GenerationSession | null {
  const session = sessions.get(id);
  if (!session) return null;
  session.state = patch(session.state);
  session.updatedAt = Date.now();
  return session;
}

export function deleteSession(id: string): void {
  sessions.delete(id);
}

export function countLines(html: string): number {
  if (!html) return 0;
  return html.length === 0 ? 0 : html.split(/\r?\n/).length;
}

export function summarizeSession(state: SessionState): {
  html: string | null;
  assistantText: string;
  activity: SessionActivity;
  lines: SessionState["lines"];
  status: SessionState["status"];
  error: string | null;
} {
  return {
    html: state.html,
    assistantText: state.assistantText,
    activity: state.activity,
    lines: state.lines,
    status: state.status,
    error: state.error,
  };
}

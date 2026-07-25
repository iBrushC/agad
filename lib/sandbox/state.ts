import type { AgentState, AgentStatus } from "./types";

type Entry = {
  state: AgentState;
  promise: Promise<AgentState> | null;
};

const store = new Map<string, Entry>();

export function sandboxNameForUser(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "anon";
  return `agad-agent-${safe}`;
}

export function read(userId: string): AgentState | null {
  const entry = store.get(userId);
  return entry?.state ?? null;
}

export function init(userId: string, name: string): AgentState {
  const empty: AgentState = {
    status: "idle",
    sandboxId: null,
    sandboxName: name,
    url: null,
    password: null,
    snapshotId: null,
    error: null,
    startedAt: null,
    expiresAt: null,
  };
  const entry: Entry = { state: empty, promise: null };
  store.set(userId, entry);
  return empty;
}

export function ensure(userId: string): Entry {
  const existing = store.get(userId);
  if (existing) return existing;
  const entry: Entry = { state: init(userId, sandboxNameForUser(userId)), promise: null };
  store.set(userId, entry);
  return entry;
}

export function setStatus(
  userId: string,
  status: AgentStatus,
  extra: Partial<AgentState> = {},
): AgentState {
  const entry = ensure(userId);
  entry.state = { ...entry.state, status, ...extra };
  return entry.state;
}

export function setError(userId: string, error: string): AgentState {
  return setStatus(userId, "failed", { error });
}

export function setPromise(
  userId: string,
  promise: Promise<AgentState> | null,
): void {
  const entry = ensure(userId);
  entry.promise = promise;
}

export function getPromise(userId: string): Promise<AgentState> | null {
  return ensure(userId).promise;
}

export function get(userId: string): AgentState {
  return ensure(userId).state;
}

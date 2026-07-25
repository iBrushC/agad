import type { AgentState, AgentStatus } from "./types";
import {
  clearPromiseStarted,
  deleteAgentState as deleteStoreAgentState,
  fetchAgentState,
  markPromiseStarted,
  readAgentStateRow,
  upsertAgentState,
} from "./store";

type Entry = {
  state: AgentState;
  promise: Promise<AgentState> | null;
};

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<AgentState>>();

export function sandboxNameForUser(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "anon";
  return `agad-agent-${safe}`;
}

function emptyState(name: string): AgentState {
  return {
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
}

export async function read(userId: string): Promise<AgentState | null> {
  const cached = cache.get(userId)?.state;
  if (cached) return cached;
  const state = await fetchAgentState(userId);
  if (state) cache.set(userId, { state, promise: null });
  return state;
}

export async function ensure(userId: string): Promise<Entry> {
  const cached = cache.get(userId);
  if (cached) return cached;
  const state = await fetchAgentState(userId);
  if (state) {
    const entry: Entry = { state, promise: null };
    cache.set(userId, entry);
    return entry;
  }
  const fresh = emptyState(sandboxNameForUser(userId));
  await upsertAgentState(userId, fresh);
  const entry: Entry = { state: fresh, promise: null };
  cache.set(userId, entry);
  return entry;
}

export async function setStatus(
  userId: string,
  status: AgentStatus,
  extra: Partial<AgentState> = {},
): Promise<AgentState> {
  const entry = await ensure(userId);
  const next: AgentState = { ...entry.state, status, ...extra };
  entry.state = next;
  cache.set(userId, entry);
  await upsertAgentState(userId, next);
  return next;
}

export async function setError(userId: string, error: string): Promise<AgentState> {
  return setStatus(userId, "failed", { error });
}

export async function get(userId: string): Promise<AgentState> {
  const entry = await ensure(userId);
  return entry.state;
}

export async function getPromise(userId: string): Promise<Promise<AgentState> | null> {
  return inflight.get(userId) ?? null;
}

export async function setPromise(
  userId: string,
  promise: Promise<AgentState> | null,
): Promise<void> {
  if (promise) {
    inflight.set(userId, promise);
    await markPromiseStarted(userId);
  } else {
    inflight.delete(userId);
    await clearPromiseStarted(userId);
  }
}

export async function getOrAdoptPromise(
  userId: string,
  start: () => Promise<AgentState>,
): Promise<Promise<AgentState>> {
  const existing = inflight.get(userId);
  if (existing) return existing;
  const row = await readAgentStateRow(userId);
  if (row?.promise_started_at) {
    const ageMs = Date.now() - Date.parse(row.promise_started_at);
    if (ageMs < 10 * 60 * 1000) {
      const promise = (async () => {
        const state = await fetchAgentState(userId);
        if (state && (state.status === "ready" || state.status === "failed")) {
          return state;
        }
        return start();
      })();
      inflight.set(userId, promise);
      void promise.finally(() => {
        if (inflight.get(userId) === promise) inflight.delete(userId);
      });
      return promise;
    }
  }
  const promise = start();
  inflight.set(userId, promise);
  await markPromiseStarted(userId);
  void promise.finally(() => {
    if (inflight.get(userId) === promise) inflight.delete(userId);
    void clearPromiseStarted(userId);
  });
  return promise;
}

export async function reset(userId: string): Promise<void> {
  cache.delete(userId);
  inflight.delete(userId);
  await deleteStoreAgentState(userId);
}

export async function refreshFromStore(userId: string): Promise<AgentState | null> {
  const state = await fetchAgentState(userId);
  if (state) cache.set(userId, { state, promise: null });
  return state;
}

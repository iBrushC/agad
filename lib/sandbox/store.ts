import type { AgentState, AgentStatus } from "./types";
import { createAdminClient } from "@/lib/supabase/admin";

type DbRow = {
  user_id: string;
  status: AgentStatus;
  sandbox_id: string | null;
  sandbox_name: string;
  url: string | null;
  password: string | null;
  snapshot_id: string | null;
  error: string | null;
  started_at: string | null;
  expires_at: string | null;
  promise_started_at: string | null;
};

function fromRow(row: DbRow): AgentState {
  return {
    status: row.status,
    sandboxId: row.sandbox_id,
    sandboxName: row.sandbox_name,
    url: row.url,
    password: row.password,
    snapshotId: row.snapshot_id,
    error: row.error,
    startedAt: row.started_at ? Date.parse(row.started_at) : null,
    expiresAt: row.expires_at,
  };
}

function toRow(userId: string, state: AgentState): DbRow {
  return {
    user_id: userId,
    status: state.status,
    sandbox_id: state.sandboxId,
    sandbox_name: state.sandboxName,
    url: state.url,
    password: state.password,
    snapshot_id: state.snapshotId,
    error: state.error,
    started_at: state.startedAt ? new Date(state.startedAt).toISOString() : null,
    expires_at: state.expiresAt,
    promise_started_at: null,
  };
}

function agentStateTable() {
  return createAdminClient().from("agent_state") as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: DbRow | null; error: { message: string } | null }>;
      };
    };
    upsert: (row: DbRow | DbRow[], opts: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
    update: (patch: Partial<DbRow>) => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
    delete: () => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
  };
}

export async function readAgentStateRow(userId: string): Promise<DbRow | null> {
  const { data, error } = await agentStateTable()
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.warn(`[store] readAgentStateRow failed userId=${userId}: ${error.message}`);
    return null;
  }
  return data ?? null;
}

export async function upsertAgentState(
  userId: string,
  state: AgentState,
): Promise<void> {
  const row = toRow(userId, state);
  const { error } = await agentStateTable().upsert(row, { onConflict: "user_id" });
  if (error) {
    console.warn(`[store] upsertAgentState failed userId=${userId}: ${error.message}`);
  }
}

export async function markPromiseStarted(userId: string): Promise<void> {
  const { error } = await agentStateTable()
    .update({ promise_started_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) {
    console.warn(`[store] markPromiseStarted failed userId=${userId}: ${error.message}`);
  }
}

export async function clearPromiseStarted(userId: string): Promise<void> {
  const { error } = await agentStateTable()
    .update({ promise_started_at: null })
    .eq("user_id", userId);
  if (error) {
    console.warn(`[store] clearPromiseStarted failed userId=${userId}: ${error.message}`);
  }
}

export async function deleteAgentState(userId: string): Promise<void> {
  const { error } = await agentStateTable().delete().eq("user_id", userId);
  if (error) {
    console.warn(`[store] deleteAgentState failed userId=${userId}: ${error.message}`);
  }
}

export async function fetchAgentState(userId: string): Promise<AgentState | null> {
  const row = await readAgentStateRow(userId);
  return row ? fromRow(row) : null;
}

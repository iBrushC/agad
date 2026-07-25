export type AgentStatus =
  | "idle"
  | "creating"
  | "installing"
  | "starting"
  | "ready"
  | "stopping"
  | "stopped"
  | "failed";

export type AgentState = {
  status: AgentStatus;
  sandboxId: string | null;
  sandboxName: string;
  url: string | null;
  password: string | null;
  snapshotId: string | null;
  error: string | null;
  startedAt: number | null;
  expiresAt: string | null;
};

export type AgentActionResult =
  | { ok: true; state: AgentState }
  | { ok: false; error: string };

export type AgentLogLine = {
  ts: number;
  level: "info" | "warn" | "error";
  message: string;
};

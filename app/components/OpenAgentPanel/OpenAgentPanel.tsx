"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  RotateCcw,
  Square,
  Power,
  Clock,
  KeyRound,
  Copy,
  RefreshCw,
} from "lucide-react";

type AgentStatus =
  | "idle"
  | "creating"
  | "installing"
  | "starting"
  | "ready"
  | "stopping"
  | "stopped"
  | "failed";

type AgentState = {
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

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "idle",
  creating: "creating sandbox",
  installing: "installing opencode",
  starting: "starting server",
  ready: "ready",
  stopping: "stopping",
  stopped: "stopped",
  failed: "failed",
};

export default function OpenAgentPanel() {
  const [state, setState] = useState<AgentState | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"url" | "password" | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const res = await fetch("/api/agent", { cache: "no-store" });
        if (!res.ok || !alive) return;
        const json = (await res.json()) as { state: AgentState | null };
        setState((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(json.state)) return prev;
          return json.state;
        });
      } catch {
        // ignore
      }
    };
    void refresh();
    const id = setInterval(refresh, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const status = state?.status;
    if (!status || !["ready", "failed", "stopped"].includes(status)) return;
    let alive = true;
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/agent/logs", { cache: "no-store" });
        if (!res.ok || !res.body || !alive) return;
        const text = await res.text();
        const lines = text
          .split("\n")
          .filter((l) => l.startsWith("data: "))
          .map((l) => l.slice(6));
        if (lines.length > 0) {
          setLogs(lines.slice(-200));
        }
      } catch {
        // ignore
      }
    };
    void fetchLogs();
    return () => {
      alive = false;
    };
  }, [state?.status]);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const call = async (path: string, method: "POST" | "GET" = "POST") => {
    setBusy(true);
    try {
      const res = await fetch(path, { method });
      const json = (await res.json().catch(() => ({}))) as {
        state?: AgentState;
        error?: string;
      };
      if (json.state) setState(json.state);
      if (json.error) {
        const message = json.error;
        setState((prev) => ({
          ...(prev as AgentState),
          error: message,
          status: "failed",
        }));
      }
    } finally {
      setBusy(false);
    }
  };

  const start = () => call("/api/agent/start");
  const stop = () => call("/api/agent/stop");
  const restart = async () => {
    await call("/api/agent/stop");
    await call("/api/agent/start");
  };
  const extend = () => call("/api/agent/extend");
  const snapshot = () => call("/api/agent/snapshot");

  const refreshLogs = async () => {
    try {
      const res = await fetch("/api/agent/logs", { cache: "no-store" });
      if (!res.ok || !res.body) return;
      const text = await res.text();
      const lines = text
        .split("\n")
        .filter((l) => l.startsWith("data: "))
        .map((l) => l.slice(6));
      if (lines.length > 0) setLogs(lines.slice(-200));
    } catch {
      // ignore
    }
  };

  const copy = async (kind: "url" | "password", value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  };

  const status = state?.status ?? "idle";
  const isWorking = ["creating", "installing", "starting", "stopping"].includes(status);
  const isReady = status === "ready";

  return (
    <section className="flex h-full flex-col bg-panel">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Power className="size-3.5 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight">Open Agent</h2>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span
            className={`inline-block size-1.5 ${
              isReady
                ? "bg-emerald-500"
                : isWorking
                  ? "bg-amber-500 animate-pulse"
                  : "bg-muted-foreground"
            }`}
          />
          {STATUS_LABEL[status]}
        </span>
      </header>

      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <Button size="xs" onClick={start} disabled={busy || isWorking || isReady}>
            <Power className="size-3" />
            Start
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={stop}
            disabled={busy || isWorking || status === "idle" || status === "stopped"}
          >
            <Square className="size-3" />
            Stop
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={restart}
            disabled={busy || isWorking}
          >
            <RotateCcw className="size-3" />
            Restart
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={extend}
            disabled={busy || !isReady}
          >
            <Clock className="size-3" />
            Extend
          </Button>
        </div>

        {state?.url && (
          <div className="space-y-2 border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                URL
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => copy("url", state.url!)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Copy URL"
                >
                  <Copy className="size-3" />
                </button>
                <a
                  href={state.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Open in new tab"
                >
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
            <div className="break-all font-mono text-[11px]">{state.url}</div>
          </div>
        )}

        {state?.password && (
          <div className="space-y-2 border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <KeyRound className="size-3" />
                Password (opencode)
              </span>
              <button
                onClick={() => copy("password", state.password!)}
                className="p-1 text-muted-foreground hover:text-foreground"
                aria-label="Copy password"
              >
                <Copy className="size-3" />
              </button>
            </div>
            <div className="break-all font-mono text-[11px]">{state.password}</div>
          </div>
        )}

        {state?.expiresAt && (
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>expires</span>
            <span>{new Date(state.expiresAt).toLocaleTimeString()}</span>
          </div>
        )}

        {state?.snapshotId && (
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>snapshot</span>
            <span className="truncate">{state.snapshotId}</span>
          </div>
        )}

        {copied && (
          <div className="font-mono text-[10px] uppercase tracking-wider text-emerald-600">
            copied {copied}
          </div>
        )}

        {state?.error && (
          <div className="border border-destructive bg-background p-2 font-mono text-[11px] text-destructive">
            {state.error}
          </div>
        )}

        <div className="border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              opencode.log
            </span>
            <button
              onClick={refreshLogs}
              className="flex items-center gap-1 px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="size-3" />
              refresh
            </button>
          </div>
          <div
            ref={logsRef}
            className="scrollbar-thin h-32 overflow-y-auto px-2 py-1 font-mono text-[10px] leading-relaxed"
          >
            {logs.length === 0 ? (
              <div className="text-muted-foreground">no logs yet</div>
            ) : (
              logs.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap break-all">
                  {line}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            snapshot base image
          </span>
          <Button size="xs" variant="ghost" onClick={snapshot} disabled={busy}>
            Capture
          </Button>
        </div>
      </div>
    </section>
  );
}

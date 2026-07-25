"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, FileCode2, Loader2, Terminal } from "lucide-react";

export type ProgressActivity = {
  toolCount: number;
  lastTool: string | null;
  lastActivity: string | null;
  textLength: number;
  inProgress: boolean;
};

export type ProgressLines = {
  total: number;
  files: { path: string; lines: number }[];
};

export type ProgressState = {
  activity: ProgressActivity | null;
  lines: ProgressLines | null;
};

export type GenerationProgressProps = {
  active: boolean;
  startedAt: number | null;
  state: ProgressState;
  error: string | null;
};

export default function GenerationProgress({
  active,
  startedAt,
  state,
  error,
}: GenerationProgressProps) {
  const [now, setNow] = useState(() => Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    tickRef.current = setInterval(() => setNow(Date.now()), 500);
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [active]);

  const elapsed = startedAt
    ? formatElapsed(now - startedAt)
    : "0.0s";
  const toolCount = state.activity?.toolCount ?? 0;
  const linesTotal = state.lines?.total ?? 0;
  const files = state.lines?.files ?? [];
  const lastActivity = state.activity?.lastActivity ?? null;
  const inProgress = state.activity?.inProgress ?? active;

  const phase = error
    ? "failed"
    : !active
      ? "done"
      : inProgress
        ? "working"
        : "finalizing";

  const phaseLabel: Record<typeof phase, string> = {
    working: "agent working",
    finalizing: "finalizing",
    done: "done",
    failed: "failed",
  };

  return (
    <section
      aria-live="polite"
      className="border border-border bg-background"
    >
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          {active && !error ? (
            <Loader2 className="size-3.5 animate-spin text-foreground" />
          ) : (
            <Activity className="size-3.5 text-muted-foreground" />
          )}
          <span className="font-mono text-[10px] uppercase tracking-wider text-foreground">
            {phaseLabel[phase]}
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
          {elapsed}
        </span>
      </header>

      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <Stat
          icon={<Terminal className="size-3" />}
          label="tools"
          value={toolCount.toString()}
        />
        <Stat
          icon={<FileCode2 className="size-3" />}
          label="lines"
          value={linesTotal.toLocaleString()}
        />
        <Stat
          icon={<Activity className="size-3" />}
          label="chars"
          value={(state.activity?.textLength ?? 0).toLocaleString()}
        />
      </div>

      <div className="space-y-2 px-3 py-2">
        <div className="min-h-4 break-words font-mono text-[10px] text-muted-foreground">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : lastActivity ? (
            <>
              <span className="text-foreground">last:</span> {lastActivity}
            </>
          ) : active ? (
            <span className="animate-pulse">thinking…</span>
          ) : (
            <span>idle</span>
          )}
        </div>

        {files.length > 0 ? (
          <ul className="space-y-1">
            {files.slice(0, 4).map((f) => {
              const name = f.path.split("/").pop() ?? f.path;
              const pct = linesTotal > 0 ? Math.round((f.lines / linesTotal) * 100) : 0;
              return (
                <li key={f.path} className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                    <span className="truncate text-foreground" title={f.path}>
                      {name}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {f.lines.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-0.5 w-full bg-border">
                    <div
                      className="h-full bg-foreground transition-[width] duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2">
      <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="font-mono text-sm tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}

function formatElapsed(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r.toString().padStart(2, "0")}s`;
}

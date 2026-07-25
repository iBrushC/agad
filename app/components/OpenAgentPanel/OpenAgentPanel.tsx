"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

type AgentState = {
  status: string;
  sandboxName: string;
};

export default function OpenAgentPanel() {
  const [state, setState] = useState<AgentState | null>(null);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const res = await fetch("/api/agent", { cache: "no-store" });
        if (!res.ok || !alive) return;
        const json = (await res.json()) as { state: AgentState | null };
        setState(json.state);
      } catch {
        // ignore
      }
    };
    void refresh();
    const id = setInterval(refresh, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const status = state?.status ?? "idle";
  const isReady = status === "ready";

  return (
    <aside className="flex h-full w-[200px] flex-col bg-panel">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-muted-foreground" />
          <h2 className="text-xs font-semibold tracking-tight">Generator</h2>
        </div>
        <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span
            className={`inline-block size-1.5 ${isReady ? "bg-emerald-500" : "bg-muted-foreground"}`}
          />
          {status}
        </span>
      </header>
      <div className="flex-1 space-y-3 px-3 py-3">
        <div className="space-y-1.5 border border-border bg-background p-2">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Runtime
          </div>
          <div className="font-mono text-[11px]">direct OpenRouter</div>
          <div className="font-mono text-[11px] text-muted-foreground">
            z-ai/glm-5.2
          </div>
        </div>
        <div className="space-y-1.5 border border-border bg-background p-2">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Sandbox
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">
            none — HTML streamed directly
          </div>
        </div>
      </div>
    </aside>
  );
}

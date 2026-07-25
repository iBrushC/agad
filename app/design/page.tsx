import { getOrCreateAgent } from "@/lib/sandbox/agent";
import { getUserId } from "@/lib/supabase/user";
import Link from "next/link";
import OpenAgentPanel from "../components/OpenAgentPanel/OpenAgentPanel";
import Workspace from "../components/Workspace/Workspace";

export default async function DesignPage() {
  const userId = await getUserId();
  if (userId) {
    void getOrCreateAgent(userId);
  }
  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <nav className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-2">
        <Link
          href="/design"
          className="text-sm font-semibold tracking-[0.18em] uppercase text-[var(--foreground)]"
        >
          agad
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/design"
            className="font-medium text-[var(--foreground)]"
          >
            Design
          </Link>
          <Link
            href="/explore"
            className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            Explore
          </Link>
        </div>
      </nav>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <Workspace />
        </div>
        <aside className="shrink-0 border-l border-border bg-panel">
          <OpenAgentPanel />
        </aside>
      </div>
    </div>
  );
}

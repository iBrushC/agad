import { getOrCreateAgent } from "@/lib/sandbox/agent";
import { getUserId } from "@/lib/supabase/user";
import OpenAgentPanel from "../components/OpenAgentPanel/OpenAgentPanel";
import Workspace from "../components/Workspace/Workspace";

export default async function DesignPage() {
  const userId = await getUserId();
  if (userId) {
    void getOrCreateAgent(userId);
  }
  return (
    <div className="flex h-screen w-full bg-background">
      <div className="min-w-0 flex-1">
        <Workspace />
      </div>
      <aside className="w-[360px] shrink-0 border-l border-border bg-panel">
        <OpenAgentPanel />
      </aside>
    </div>
  );
}

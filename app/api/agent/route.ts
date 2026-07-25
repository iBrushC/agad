import { NextResponse } from "next/server";

import { getAgentState } from "@/lib/sandbox/agent";
import { getUserId } from "@/lib/supabase/user";

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const state = await getAgentState(userId);
  return NextResponse.json({ state });
}

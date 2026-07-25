import { NextResponse } from "next/server";

import { getOrCreateAgent } from "@/lib/sandbox/agent";
import { getUserId } from "@/lib/supabase/user";

export async function POST() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await getOrCreateAgent(userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ state: result.state });
}

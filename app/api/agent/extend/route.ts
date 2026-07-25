import { NextResponse } from "next/server";

import { extendAgent } from "@/lib/sandbox/agent";
import { getUserId } from "@/lib/supabase/user";

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let durationMs = 30 * 60 * 1000;
  try {
    const body = (await request.json()) as { durationMs?: number };
    if (typeof body.durationMs === "number" && body.durationMs > 0) {
      durationMs = body.durationMs;
    }
  } catch {
    // no body, use default
  }
  const result = await extendAgent(userId, durationMs);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ state: result.state });
}

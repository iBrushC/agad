import { NextResponse } from "next/server";

import { getUserId } from "@/lib/supabase/user";

const READY_STATE = {
  status: "ready" as const,
  sandboxId: null,
  sandboxName: "agad-direct",
  url: null,
  password: null,
  snapshotId: null,
  error: null,
  startedAt: Date.now(),
  expiresAt: null,
};

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ state: { ...READY_STATE, startedAt: Date.now() } });
}

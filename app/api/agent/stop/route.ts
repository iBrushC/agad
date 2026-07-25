import { NextResponse } from "next/server";

import { getUserId } from "@/lib/supabase/user";

export async function POST() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    state: {
      status: "stopped",
      sandboxId: null,
      sandboxName: "agad-direct",
      url: null,
      password: null,
      snapshotId: null,
      error: null,
      startedAt: null,
      expiresAt: null,
    },
  });
}

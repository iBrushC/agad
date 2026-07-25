import { NextResponse } from "next/server";

import { readProjectHtml } from "@/lib/sandbox/agent";
import { getLastAssistantText, waitForTurnIdle } from "@/lib/opencode/client";
import { getUserId } from "@/lib/supabase/user";

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const waitParam = url.searchParams.get("wait");
  const shouldWait = waitParam === "1" || waitParam === "true";

  try {
    const assistantText = shouldWait
      ? await waitForTurnIdle(userId, sessionId)
      : await getLastAssistantText(userId, sessionId);
    const html = await readProjectHtml(userId);
    return NextResponse.json({
      assistantText,
      html,
      hasHtml: html !== null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
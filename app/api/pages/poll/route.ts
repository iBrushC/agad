import { NextResponse } from "next/server";

import { getSession, summarizeSession } from "@/lib/generator/sessions";
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

  const session = getSession(sessionId);
  if (!session || session.userId !== userId) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const waitParam = url.searchParams.get("wait");
  const shouldWait = (waitParam === "1" || waitParam === "true") && session.state.status === "generating";

  if (shouldWait) {
    const deadline = Date.now() + 5 * 60 * 1000;
    while (Date.now() < deadline) {
      const current = getSession(sessionId);
      if (!current || current.userId !== userId) break;
      if (current.state.status !== "generating") break;
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  const final = getSession(sessionId);
  if (!final) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const summary = summarizeSession(final.state);
  return NextResponse.json({
    assistantText: summary.assistantText,
    html: summary.html,
    hasHtml: summary.html !== null,
    activity: summary.activity,
    lines: summary.lines,
    status: summary.status,
    error: summary.error,
  });
}

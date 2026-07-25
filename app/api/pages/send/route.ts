import { NextResponse } from "next/server";

import { getOrCreateAgent } from "@/lib/sandbox/agent";
import { getOrCreateSession, postUserMessage } from "@/lib/opencode/client";
import { getUserId } from "@/lib/supabase/user";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { prompt?: string } | null;
  const prompt = body?.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const ready = await getOrCreateAgent(userId);
  if (!ready.ok) {
    console.error(`[send] agent not ready userId=${userId} err=${ready.error}`);
    return NextResponse.json({ error: ready.error ?? "agent failed" }, { status: 500 });
  }
  console.log(`[send] agent ready userId=${userId} state=${JSON.stringify({ status: ready.state.status, hasUrl: !!ready.state.url })}`);

  try {
    console.log(`[send] getOrCreateSession userId=${userId}`);
    const session = await getOrCreateSession(userId, prompt.slice(0, 60));
    console.log(`[send] postUserMessage userId=${userId} sessionId=${session.id}`);
    const userMessage = await postUserMessage(userId, session.id, prompt);
    return NextResponse.json({
      sessionId: session.id,
      messageId: userMessage.id,
    });
  } catch (err) {
    console.error(`[send] opencode call failed userId=${userId}: ${err instanceof Error ? err.message : String(err)}`);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
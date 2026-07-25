import { NextResponse } from "next/server";

import { searchExamples, type ExampleChunkMatch } from "@/lib/examples/search";
import { createSession } from "@/lib/generator/sessions";
import { runGeneration } from "@/lib/generator/runner";
import { getUserId } from "@/lib/supabase/user";

const REFERENCE_COUNT = 6;

type ReferenceLite = { url: string; label: string };

function referencesFromMatches(matches: ExampleChunkMatch[]): ReferenceLite[] {
  return matches.map((m) => ({
    url: m.public_url,
    label: `${m.domain} · ${m.form_factor} · section ${m.chunk_order + 1}`,
  }));
}

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

  const title = prompt.slice(0, 60);
  const session = createSession(userId, prompt, title);

  let references: ReferenceLite[] = [];
  try {
    const examples = await searchExamples(prompt, { topK: REFERENCE_COUNT });
    references = referencesFromMatches(examples);
  } catch (err) {
    console.warn(
      `[send] example search failed userId=${userId}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  void runGeneration(session, references).catch((err) => {
    console.error(
      `[send] runGeneration crashed userId=${userId} sessionId=${session.id}: ${err instanceof Error ? err.message : String(err)}`,
    );
  });

  return NextResponse.json({
    sessionId: session.id,
    messageId: session.id,
  });
}

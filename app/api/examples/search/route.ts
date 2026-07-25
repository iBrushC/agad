import { NextResponse } from "next/server";
import { searchExamples, type ExampleChunkMatch } from "@/lib/examples/search";

export type SearchExamplesResponse = {
  results: ExampleChunkMatch[];
};

export async function POST(request: Request) {
  let body: { prompt?: unknown; topK?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  if (!prompt.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }
  const topKRaw = typeof body.topK === "number" ? body.topK : 10;
  const topK = Math.max(1, Math.min(50, Math.floor(topKRaw)));
  try {
    const results = await searchExamples(prompt, { topK });
    const payload: SearchExamplesResponse = { results };
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { createClient } from "@/lib/supabase/server";

const EMBED_MODEL = "google/gemini-embedding-2";
const EMBED_DIM = 768;
const DEFAULT_TOP = 10;

export type ExampleChunkMatch = {
  id: string;
  source: string;
  domain: string;
  form_factor: "desktop" | "mobile";
  chunk_order: number;
  file: string;
  public_url: string;
  similarity: number;
};

export type SearchExamplesOptions = {
  topK?: number;
};

async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: text,
      dimensions: EMBED_DIM,
      encoding_format: "float",
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`embed failed ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const vec = data?.data?.[0]?.embedding;
  if (!Array.isArray(vec)) throw new Error("no embedding returned");
  if (vec.length !== EMBED_DIM) {
    throw new Error(`dim mismatch: expected ${EMBED_DIM}, got ${vec.length}`);
  }
  return vec;
}

export async function searchExamples(
  prompt: string,
  { topK = DEFAULT_TOP }: SearchExamplesOptions = {},
): Promise<ExampleChunkMatch[]> {
  const text = prompt.trim();
  if (!text) return [];
  const embedding = await embedText(text);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_example_chunks", {
    query_embedding: `[${embedding.join(",")}]`,
    match_count: topK,
  });
  if (error) throw new Error(`match_example_chunks failed: ${error.message}`);
  return (data ?? []) as ExampleChunkMatch[];
}

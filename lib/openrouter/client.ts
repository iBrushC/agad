export const MODEL = "z-ai/glm-5.2";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type StreamChunk = {
  id?: string;
  choices?: Array<{
    index?: number;
    delta?: { role?: string; content?: string; reasoning?: string };
    finish_reason?: string | null;
  }>;
  error?: { message?: string; code?: number };
};

function requireKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  return key;
}

export async function streamChat(
  model: string,
  messages: ChatMessage[],
): Promise<AsyncIterable<string>> {
  const key = requireKey();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://agad.local",
      "X-Title": "AGAD",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      provider: { zdr: true, sort: "price" },
      temperature: 0.7,
    }),
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "");
    throw new Error(`openrouter ${res.status}: ${errText.slice(0, 400)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  async function* gen() {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);
        if (!line || !line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const chunk = JSON.parse(data) as StreamChunk;
          const delta = chunk.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) yield delta;
        } catch {
          // ignore malformed SSE line
        }
      }
    }
  }

  return gen();
}

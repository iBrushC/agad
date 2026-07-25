export const MODEL = "z-ai/glm-5.2";

type OpenRouterModule = typeof import("@openrouter/sdk");
type OpenRouterClient = InstanceType<OpenRouterModule["OpenRouter"]>;

let cachedClient: OpenRouterClient | null = null;

export async function getOpenRouter(): Promise<OpenRouterClient> {
  if (cachedClient) return cachedClient;
  const mod = await import("@openrouter/sdk");
  cachedClient = new mod.OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  return cachedClient;
}

export async function streamChat(
  model: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): Promise<AsyncIterable<string>> {
  const client = await getOpenRouter();
  const result = await client.chat.send({
    model,
    messages,
    stream: true,
    provider: { zdr: true, sort: "price" },
  });

  async function* gen() {
    for await (const chunk of result) {
      const choice = chunk.choices?.[0];
      const delta = (choice?.delta as { content?: string } | undefined)?.content;
      if (typeof delta === "string" && delta.length > 0) {
        yield delta;
      }
    }
  }

  return gen();
}

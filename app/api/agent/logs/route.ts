import { tailAgentLogs } from "@/lib/sandbox/agent";
import { getUserId } from "@/lib/supabase/user";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return new Response("unauthorized", { status: 401 });
  }

  const { stream } = await tailAgentLogs(userId);
  if (!stream) {
    return new Response("no logs", { status: 404 });
  }

  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`: connected\n\n`));
        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = typeof value === "string" ? value : new TextDecoder().decode(value);
            for (const line of text.split("\n")) {
              controller.enqueue(encoder.encode(`data: ${line}\n\n`));
            }
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${err instanceof Error ? err.message : "stream error"}\n\n`,
            ),
          );
        } finally {
          controller.enqueue(encoder.encode(`event: end\ndata: done\n\n`));
          controller.close();
        }
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    },
  );
}

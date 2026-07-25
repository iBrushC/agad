import { readAgentLogs } from "@/lib/sandbox/agent";
import { getUserId } from "@/lib/supabase/user";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return new Response("unauthorized", { status: 401 });
  }

  const content = await readAgentLogs(userId);
  if (content === null) {
    return new Response("no logs", { status: 404 });
  }

  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`: connected\n\n`));
        const lines = content.split("\n");
        for (const line of lines) {
          controller.enqueue(encoder.encode(`data: ${line}\n\n`));
        }
        controller.enqueue(encoder.encode(`event: end\ndata: done\n\n`));
        controller.close();
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

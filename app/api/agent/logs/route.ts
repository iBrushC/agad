import { getUserId } from "@/lib/supabase/user";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return new Response("unauthorized", { status: 401 });
  }
  return new Response("no logs", { status: 404 });
}

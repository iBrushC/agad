import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pages")
    .select("id, title, prompt, html_url, screenshot_url, created_at")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ pages: data ?? [] });
}
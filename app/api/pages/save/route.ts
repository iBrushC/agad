import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/supabase/user";

const BUCKET = "pages";

type SaveBody = {
  prompt?: string;
  html?: string;
  title?: string;
};

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as SaveBody | null;
  if (!body) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const html = body.html?.trim();
  if (!html) {
    return NextResponse.json(
      { error: "no html available; agent has not finished generating yet" },
      { status: 409 },
    );
  }

  const supabase = await createClient();
  const pageId = crypto.randomUUID();
  const safeTitle = (body.title ?? body.prompt ?? "Untitled").slice(0, 120);

  const htmlPath = `${userId}/${pageId}.html`;

  const htmlUpload = await supabase.storage
    .from(BUCKET)
    .upload(htmlPath, Buffer.from(html, "utf8"), {
      contentType: "text/html; charset=utf-8",
      upsert: false,
    });

  if (htmlUpload.error) {
    return NextResponse.json(
      { error: `storage upload failed: ${htmlUpload.error.message}` },
      { status: 500 },
    );
  }

  const { data: htmlUrl } = supabase.storage.from(BUCKET).getPublicUrl(htmlPath);

  const insert = await supabase
    .from("pages")
    .insert({
      id: pageId,
      user_id: userId,
      title: safeTitle,
      prompt: body.prompt ?? null,
      html_path: htmlPath,
      screenshot_path: null,
      html_url: htmlUrl.publicUrl,
      screenshot_url: null,
    })
    .select("id")
    .single();

  if (insert.error) {
    return NextResponse.json(
      { error: `db insert failed: ${insert.error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: insert.data.id,
    htmlUrl: htmlUrl.publicUrl,
    screenshotUrl: null,
  });
}

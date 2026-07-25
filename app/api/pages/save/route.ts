import { NextResponse } from "next/server";

import { screenshotProject } from "@/lib/sandbox/agent";
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

  let { html } = body;
  const { prompt, title } = body;

  const supabase = await createClient();

  let screenshot: Buffer | null = null;
  if (!html) {
    const rendered = await screenshotProject(userId).catch(() => null);
    if (rendered) {
      html = rendered.html;
      screenshot = rendered.png;
    }
  } else {
    const rendered = await screenshotProject(userId).catch(() => null);
    if (rendered) screenshot = rendered.png;
  }

  if (!html) {
    return NextResponse.json(
      { error: "no html available; agent has not written index.html yet" },
      { status: 409 },
    );
  }

  const pageId = crypto.randomUUID();
  const safeTitle = (title ?? prompt ?? "Untitled").slice(0, 120);

  const htmlPath = `${userId}/${pageId}.html`;
  const pngPath = screenshot ? `${userId}/${pageId}.png` : null;

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

  if (screenshot && pngPath) {
    const pngUpload = await supabase.storage
      .from(BUCKET)
      .upload(pngPath, screenshot, {
        contentType: "image/png",
        upsert: false,
      });
    if (pngUpload.error) {
      return NextResponse.json(
        { error: `screenshot upload failed: ${pngUpload.error.message}` },
        { status: 500 },
      );
    }
  }

  const htmlBucket = supabase.storage.from(BUCKET);
  const { data: htmlUrl } = htmlBucket.getPublicUrl(htmlPath);
  const { data: pngUrl } = pngPath
    ? htmlBucket.getPublicUrl(pngPath)
    : { data: { publicUrl: null } };

  const insert = await supabase
    .from("pages")
    .insert({
      id: pageId,
      user_id: userId,
      title: safeTitle,
      prompt: prompt ?? null,
      html_path: htmlPath,
      screenshot_path: pngPath,
      html_url: htmlUrl.publicUrl,
      screenshot_url: pngUrl.publicUrl,
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
    screenshotUrl: pngUrl.publicUrl,
  });
}
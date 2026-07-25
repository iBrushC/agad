#!/usr/bin/env node
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import OpenRouter from "@openrouter/sdk";

const DEFAULT_MODEL = "google/gemini-2.5-flash-image";
const FALLBACK_MODEL = "google/gemini-2.5-flash";
const OUT_DIR = process.env.AGAD_IMG_OUT_DIR ?? "/home/vercel-sandbox/project/assets";
const SECRETS_FILE = "/home/vercel-sandbox/.config/opencode/secrets.env";

async function loadSecrets() {
  try {
    const raw = await readFile(SECRETS_FILE, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/.exec(line);
      if (!m) continue;
      if (process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch {}
}

function fail(msg, code = 1) {
  console.error(`[image-gen] ${msg}`);
  process.exit(code);
}

function getApiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) fail("OPENROUTER_API_KEY is not set in the sandbox environment");
  return key;
}

function getArg(name) {
  const flag = `--${name}`;
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function positionalPrompt() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const text = [];
  for (const a of args) {
    if (a === "--" || a.startsWith("--")) break;
    text.push(a);
  }
  return text.join(" ").trim();
}

function pickModel() {
  if (process.env.OPENROUTER_IMAGE_MODEL) return process.env.OPENROUTER_IMAGE_MODEL;
  if (hasFlag("model")) return getArg("model");
  return DEFAULT_MODEL;
}

async function ensureDir(dir) {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

function decodeDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { mime: m[1], buffer: Buffer.from(m[2], "base64") };
}

function extFromMime(mime) {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "bin";
}

function safeName(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "image";
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
  );
}

function pickImages(accumulated) {
  const out = [];
  for (const img of accumulated.images) {
    const url = img?.image_url?.url ?? img?.url;
    if (typeof url === "string") out.push(url);
  }
  for (const part of accumulated.content) {
    if (part?.type === "image_url" && typeof part.image_url?.url === "string") {
      out.push(part.image_url.url);
    } else if (
      part?.type === "inline_image" ||
      part?.type === "output_image" ||
      part?.type === "image" ||
      part?.inline_data?.data
    ) {
      const data = part.inline_data?.data ?? part.data ?? part.b64_json;
      const mime = part.inline_data?.mime_type ?? part.mime_type ?? "image/png";
      if (data) out.push(`data:${mime};base64,${data}`);
    }
  }
  return out;
}

function mergeDelta(acc, delta) {
  if (!delta) return;
  if (Array.isArray(delta.images)) acc.images.push(...delta.images);
  if (Array.isArray(delta.content)) {
    for (const part of delta.content) {
      if (part?.type === "text" && typeof part.text === "string") {
        if (!acc.content.find((p) => p.type === "text")) {
          acc.content.push({ type: "text", text: part.text });
        } else {
          acc.content[acc.content.length - 1].text += part.text;
        }
      } else if (part) {
        acc.content.push(part);
      }
    }
  } else if (typeof delta.content === "string" && delta.content.length > 0) {
    acc.textBuf += delta.content;
  }
  if (delta.image_url?.url) acc.images.push({ image_url: { url: delta.image_url.url } });
  if (delta.inline_data?.data) {
    acc.content.push({
      type: "inline_image",
      inline_data: { data: delta.inline_data.data, mime_type: delta.inline_data.mime_type ?? "image/png" },
    });
  }
}

async function saveImage(dataUrl, outDir, stem) {
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) {
    console.warn(`[image-gen] skipping unrecognized image payload`);
    return null;
  }
  const ext = extFromMime(decoded.mime);
  const filename = `${stem}.${ext}`;
  const fullPath = resolve(outDir, filename);
  await writeFile(fullPath, decoded.buffer);
  return { path: fullPath, filename, mime: decoded.mime, size: decoded.buffer.length };
}

async function runOnce({ client, model, prompt, outDir, stem }) {
  const stream = await client.chat.send({
    model,
    messages: [{ role: "user", content: prompt }],
    stream: true,
    modalities: ["image", "text"],
  });

  const acc = { content: [], images: [], textBuf: "" };
  for await (const chunk of stream) {
    const choice = chunk.choices?.[0];
    if (!choice) continue;
    const delta = choice.delta ?? choice.message;
    if (!delta) continue;
    if (typeof delta.content === "string" && delta.content.length > 0) {
      acc.textBuf += delta.content;
    } else if (Array.isArray(delta.content)) {
      for (const part of delta.content) {
        if (part?.type === "text" && typeof part.text === "string") acc.textBuf += part.text;
      }
    }
    mergeDelta(acc, delta);
  }

  const images = pickImages(acc);
  if (images.length === 0) return { ok: false, text: acc.textBuf, model };

  const saved = [];
  for (let i = 0; i < images.length; i++) {
    const suffix = images.length > 1 ? `-${i + 1}` : "";
    const out = await saveImage(images[i], outDir, `${stem}${suffix}`);
    if (out) saved.push(out);
  }
  return { ok: true, saved, text: acc.textBuf, model, images };
}

async function main() {
  await loadSecrets();

  const prompt = positionalPrompt();
  if (!prompt) {
    fail(
      'usage: node generate.mjs "<prompt>" [--model <id>] [--name <stem>] [--out <dir>] [--inline] [--no-fallback]',
    );
  }

  const outDir = resolve(getArg("out") ?? OUT_DIR);
  const stemRaw = getArg("name") ?? safeName(prompt.split(/\s+/).slice(0, 6).join("-"));
  const stem = `${stemRaw}-${timestamp()}`;

  await ensureDir(outDir);

  const apiKey = getApiKey();
  const model = pickModel();
  const client = new OpenRouter({ apiKey });

  console.error(`[image-gen] model=${model} out=${outDir}`);
  let res;
  try {
    res = await runOnce({ client, model, prompt, outDir, stem });
  } catch (err) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404 && !hasFlag("no-fallback")) {
      console.error(`[image-gen] model ${model} not found, falling back to ${FALLBACK_MODEL}`);
      res = await runOnce({ client, model: FALLBACK_MODEL, prompt, outDir, stem }).catch((e) => {
        throw e;
      });
    } else {
      throw err;
    }
  }

  if (!res.ok) {
    fail(
      `no images returned by model ${res.model}. response text: ${res.text || "(empty)"}`,
      2,
    );
  }

  const wantInline = hasFlag("inline");
  for (let i = 0; i < res.saved.length; i++) {
    const s = res.saved[i];
    if (wantInline) {
      const dataUrl = `data:${s.mime};base64,${res.images[i].split(",", 2)[1] ?? ""}`;
      console.log(dataUrl);
    } else {
      console.log(`${s.path}`);
    }
  }
  console.error(`[image-gen] wrote ${res.saved.length} file(s) with stem ${stem}`);
}

main().catch((err) => {
  console.error(`[image-gen] error: ${err?.message ?? err}`);
  process.exit(1);
});

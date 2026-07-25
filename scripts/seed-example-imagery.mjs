#!/usr/bin/env node
import { readFile, readdir, writeFile, stat } from "node:fs/promises";
import { join, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = join(HERE, "..");
loadEnv({ path: join(PROJECT_ROOT, ".env.local"), quiet: true });
loadEnv({ path: join(PROJECT_ROOT, ".env"), quiet: true });

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const EMBED_MODEL = process.env.EXAMPLE_EMBED_MODEL ?? "google/gemini-embedding-2";
const EMBED_DIM = Number(process.env.EXAMPLE_EMBED_DIM ?? 768);
const CHUNKS_DIR =
  process.env.CHUNKS_DIR ??
  join(PROJECT_ROOT, "..", "resources", "font-collecting", "chunks");
const CONCURRENCY = Number(process.env.SEED_CONCURRENCY ?? 8);
const BATCH_SIZE = Number(process.env.SEED_BATCH ?? 50);
const BUCKET = "example_imagery";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or publishable/anon key");
}
if (!OPENROUTER_KEY) {
  throw new Error("Missing OPENROUTER_API_KEY");
}

const restHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

async function uploadObject(storagePath, bytes, contentType) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...restHeaders,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: bytes,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`upload ${storagePath} failed: ${res.status} ${text}`);
  }
}

function publicUrlFor(storagePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

async function embedOne({ imageUrl, text }) {
  const content = [];
  if (text) content.push({ type: "text", text });
  content.push({ type: "image_url", image_url: { url: imageUrl } });
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: [{ content }],
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

async function upsertChunk(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/example_chunks`, {
    method: "POST",
    headers: { ...restHeaders, Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`upsert failed: ${res.status} ${text}`);
  }
}

async function loadExistingKeys() {
  const keys = new Set();
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/example_chunks?select=source,form_factor,chunk_order&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, { headers: restHeaders });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`list existing failed: ${res.status} ${t}`);
    }
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const r of rows) keys.add(`${r.source}|${r.form_factor}|${r.chunk_order}`);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return keys;
}

async function listChunkDirs() {
  const entries = await readdir(CHUNKS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, path: join(CHUNKS_DIR, e.name) }));
}

function parseFormFactorAndDomain(dirName) {
  if (dirName.startsWith("desktop__")) return { formFactor: "desktop", domain: dirName.slice("desktop__".length) };
  if (dirName.startsWith("mobile__")) return { formFactor: "mobile", domain: dirName.slice("mobile__".length) };
  return null;
}

async function loadManifest(dirPath) {
  const manifestPath = join(dirPath, "index.json");
  const raw = await readFile(manifestPath, "utf8");
  return JSON.parse(raw);
}

async function processOne({ dir, chunk }) {
  const { formFactor, domain } = parseFormFactorAndDomain(dir.name);
  if (!formFactor) return null;
  const chunkFile = chunk.file;
  const localPath = join(dir.path, chunkFile);
  const bytes = await readFile(localPath);
  const storagePath = `${formFactor}/${domain}/${chunkFile}`;
  await uploadObject(storagePath, bytes, "image/webp");
  const publicUrl = publicUrlFor(storagePath);
  const text = `Landing page screenshot from ${domain}. Form factor: ${formFactor}. Section ${chunk.order + 1} of the page.`;
  const embedding = await embedOne({ imageUrl: publicUrl, text });
  const source = join(basename(CHUNKS_DIR), dir.name);
  await upsertChunk({
    source,
    domain,
    form_factor: formFactor,
    chunk_order: chunk.order,
    file: chunkFile,
    width: chunk.width,
    height: chunk.height,
    src_y_start: chunk.src_y_start,
    src_y_end: chunk.src_y_end,
    storage_path: storagePath,
    public_url: publicUrl,
    embedding: `[${embedding.join(",")}]`,
  });
  return storagePath;
}

async function runWith(items, limit, worker) {
  const results = [];
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      try {
        results.push({ ok: true, value: await worker(items[i]) });
      } catch (err) {
        results.push({ ok: false, error: err.message, item: items[i] });
      }
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const chunksStat = await stat(CHUNKS_DIR).catch(() => null);
  if (!chunksStat?.isDirectory()) {
    throw new Error(`CHUNKS_DIR not found: ${CHUNKS_DIR}`);
  }
  const dirs = await listChunkDirs();
  const tasks = [];
  let skippedDirs = 0;
  for (const dir of dirs) {
    let manifest;
    try {
      manifest = await loadManifest(dir.path);
    } catch {
      skippedDirs++;
      continue;
    }
    for (const chunk of manifest.chunks ?? []) {
      tasks.push({ dir, chunk });
    }
  }
  if (skippedDirs > 0) console.log(`[seed] skipped dirs without index.json: ${skippedDirs}`);
  console.log(
    `[seed] dirs=${dirs.length} chunks=${tasks.length} model=${EMBED_MODEL} dim=${EMBED_DIM} concurrency=${CONCURRENCY}`,
  );
  const results = await runWith(tasks, CONCURRENCY, processOne);
  const ok = results.filter((r) => r.ok).length;
  const fail = results.length - ok;
  console.log(`[seed] done ok=${ok} fail=${fail}`);
  for (const r of results.filter((r) => !r.ok)) {
    console.error(`[seed] FAIL ${r.item?.dir?.name}/${r.item?.chunk?.file}: ${r.error}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

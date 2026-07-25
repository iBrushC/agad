import { promises as fs } from "node:fs";
import path from "node:path";

const SKILL_ROOTS = [
  path.join(process.cwd(), "skills"),
  path.join(process.cwd(), ".agents", "skills"),
];
export const OPENCODE_SKILLS_DIR = "/home/vercel-sandbox/.config/opencode/skills";

export type SkillFile = {
  path: string;
  content: Buffer;
};

async function walk(
  dir: string,
  rel: string,
  out: { abs: string; rel: string }[],
): Promise<void> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
    throw err;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const next = rel ? path.posix.join(rel, entry.name) : entry.name;
    if (entry.isDirectory()) {
      await walk(abs, next, out);
    } else if (entry.isFile()) {
      out.push({ abs, rel: next });
    }
  }
}

export async function loadSkills(): Promise<SkillFile[]> {
  const files: { abs: string; rel: string }[] = [];
  for (const root of SKILL_ROOTS) {
    await walk(root, "", files);
  }
  const out: SkillFile[] = [];
  for (const f of files) {
    const content = await fs.readFile(f.abs);
    out.push({
      path: path.posix.join(OPENCODE_SKILLS_DIR, f.rel),
      content,
    });
  }
  return out;
}

export async function syncSkills(
  writeFiles: (files: SkillFile[]) => Promise<void>,
): Promise<number> {
  const files = await loadSkills();
  if (files.length === 0) return 0;
  await writeFiles(files);
  return files.length;
}

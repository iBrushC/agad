import { MODEL, streamChat } from "@/lib/openrouter/client";
import { SYSTEM_PROMPT } from "./prompts";
import { countLines, updateSession, type GenerationSession } from "./sessions";

type ReferenceImage = { url: string; label: string };

function extractHtml(text: string): string | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("<!doctype");
  const htmlStart = trimmed.indexOf("<html");
  const openIdx = start >= 0 ? start : htmlStart;
  if (openIdx < 0) return null;
  const closeIdx = trimmed.lastIndexOf("</html>");
  if (closeIdx < 0) return null;
  return trimmed.slice(openIdx, closeIdx + "</html>".length);
}

function userPromptWithReferences(prompt: string, references: ReferenceImage[]): string {
  if (references.length === 0) return prompt;
  const lines = references.map(
    (r, i) => `${i + 1}. ${r.url}${r.label ? ` — ${r.label}` : ""}`,
  );
  return [
    prompt,
    "",
    "Visual references (use privately for composition, hierarchy, spacing, and color — do not hotlink, do not copy branding, do not mention this list):",
    ...lines,
  ].join("\n");
}

export async function runGeneration(
  session: GenerationSession,
  references: ReferenceImage[] = [],
): Promise<void> {
  const userContent = userPromptWithReferences(session.prompt, references);
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: userContent },
  ];

  let buffer = "";
  try {
    const stream = await streamChat(MODEL, messages);
    for await (const delta of stream) {
      buffer += delta;
      updateSession(session.id, (state) => ({
        ...state,
        assistantText: buffer,
        activity: {
          ...state.activity,
          textLength: buffer.length,
          lastActivity: "streaming",
          inProgress: true,
        },
      }));

      const html = extractHtml(buffer);
      if (html) {
        const lines = countLines(html);
        updateSession(session.id, (state) => ({
          ...state,
          html,
          lines: {
            total: lines,
            files: [{ path: "index.html", lines }],
          },
          activity: {
            ...state.activity,
            lastActivity: "wrote index.html",
          },
        }));
      }
    }

    const finalHtml = extractHtml(buffer);
    if (!finalHtml) {
      throw new Error("model did not produce a complete index.html document");
    }
    const lines = countLines(finalHtml);
    updateSession(session.id, (state) => ({
      ...state,
      status: "done",
      html: finalHtml,
      finishedAt: Date.now(),
      assistantText: buffer.trim(),
      lines: { total: lines, files: [{ path: "index.html", lines }] },
      activity: {
        toolCount: 1,
        lastTool: "wrote index.html",
        lastActivity: "done",
        textLength: buffer.length,
        inProgress: false,
      },
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    updateSession(session.id, (state) => ({
      ...state,
      status: "failed",
      finishedAt: Date.now(),
      error: msg,
      activity: {
        ...state.activity,
        inProgress: false,
        lastActivity: "failed",
      },
    }));
  }
}

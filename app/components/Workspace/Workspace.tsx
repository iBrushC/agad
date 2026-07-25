"use client";

import { useState } from "react";
import ChatPanel, { ChatMessage } from "../ChatPanel/ChatPanel";
import CanvasViewport from "../CanvasViewport/CanvasViewport";
import SettingsPanel from "../SettingsPanel/SettingsPanel";

const STARTER: ChatMessage[] = [
  {
    id: "seed-1",
    role: "system",
    content:
      "Describe the website you want to build. I'll generate the page in the canvas.",
  },
];

function buildHtml(
  prompt: string,
  theme: "light" | "auto",
  styles: {
    fontFamily: string;
    fontSize: number;
    textColor: string;
    backgroundColor: string;
  },
): string {
  const escaped = prompt.replace(/[<>]/g, "");
  const fontFamilies: Record<string, string> = {
    system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
  };
  const fontFamily = fontFamilies[styles.fontFamily] ?? fontFamilies.system;
  const darkStyles = `
    body { background: #0a0a0a; color: #ededed; }
    .nav a, .nav, .tagline, .lead, .card h3, .card p, footer { color: inherit; }
    .card { background: #111; border-color: #262626; }
  `;
  const themeCss = theme === "auto" ? `@media (prefers-color-scheme: dark) { ${darkStyles} }` : "";
  return `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; border-radius: 0; box-shadow: none; }
  body { font-family: ${fontFamily}; font-size: ${styles.fontSize}px; background: ${styles.backgroundColor}; color: ${styles.textColor}; padding: 0; }
  .nav { display: flex; align-items: center; justify-content: space-between; padding: 20px 48px; border-bottom: 1px solid #e5e5e5; }
  .nav a { color: inherit; text-decoration: none; margin-left: 24px; font-size: 0.875em; }
  .brand { font-weight: 700; letter-spacing: -0.02em; }
  .hero { padding: 96px 48px; max-width: 1100px; }
  .tagline { font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: #71717a; margin-bottom: 16px; }
  .lead { font-size: 44px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; max-width: 720px; }
  .prompt { margin-top: 24px; color: #71717a; font-size: 14px; max-width: 600px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 0 48px 96px; max-width: 1100px; }
  .card { border: 1px solid #e5e5e5; padding: 24px; background: #fff; }
  .card h3 { font-size: 14px; margin-bottom: 8px; }
  .card p { font-size: 13px; color: #71717a; line-height: 1.5; }
  footer { padding: 32px 48px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #71717a; }
  .cta { display: inline-block; margin-top: 24px; background: #18181b; color: #fff; padding: 10px 16px; font-size: 13px; text-decoration: none; }
  ${themeCss}
</style></head>
<body>
  <nav class="nav">
    <div class="brand">agad</div>
    <div>
      <a href="#">Work</a>
      <a href="#">About</a>
      <a href="#">Contact</a>
    </div>
  </nav>
  <section class="hero">
    <div class="tagline">Generated from your prompt</div>
    <h1 class="lead">${escaped || "A new website, built from text."}</h1>
    <p class="prompt">Prompt: "${escaped}"</p>
    <a class="cta" href="#">Get started</a>
  </section>
  <section class="grid">
    <div class="card"><h3>Fast</h3><p>Rendered instantly from your description.</p></div>
    <div class="card"><h3>Editable</h3><p>Refine by chatting — every message updates the page.</p></div>
    <div class="card"><h3>Responsive</h3><p>Preview across desktop, tablet, and mobile.</p></div>
  </section>
  <footer>© agad — generated ${new Date().toLocaleTimeString()}</footer>
</body></html>`;
}

type Device = "desktop" | "tablet" | "mobile";
type Theme = "light" | "auto";

export default function Workspace() {
  const [messages, setMessages] = useState<ChatMessage[]>(STARTER);
  const [html, setHtml] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [settingsWidth, setSettingsWidth] = useState(300);
  const [device, setDevice] = useState<Device>("desktop");
  const [theme, setTheme] = useState<Theme>("light");
  const [showGrid, setShowGrid] = useState(true);
  const [fontFamily, setFontFamily] = useState("system");
  const [fontSize, setFontSize] = useState(16);
  const [textColor, setTextColor] = useState("#18181b");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");

  const pageStyles = { fontFamily, fontSize, textColor, backgroundColor };

  const generate = async (prompt: string) => {
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 700));
    setHtml(buildHtml(prompt, theme, pageStyles));
    setIsGenerating(false);
  };

  const handleSend = (text: string) => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((m) => [...m, userMsg]);
    generate(text).then(() => {
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: `Done. I generated a page for: "${text}". Adjust settings on the right to preview on another device.`,
        },
      ]);
    });
  };

  const updatePageStyles = (next: Partial<typeof pageStyles>) => {
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    if (lastUser) setHtml(buildHtml(lastUser.content, theme, { ...pageStyles, ...next }));
  };

  return (
    <div className="flex h-full w-full bg-background">
      <div className="w-[340px] shrink-0">
        <ChatPanel
          messages={messages}
          onSend={handleSend}
          isGenerating={isGenerating}
        />
      </div>
      <main className="relative flex min-w-0 flex-1 flex-col">
        <CanvasViewport
          html={html}
          device={device}
          onDeviceChange={setDevice}
          showGrid={showGrid}
          onShowGridChange={setShowGrid}
        />
      </main>
      <SettingsPanel
        width={settingsWidth}
        onWidthChange={setSettingsWidth}
        theme={theme}
        onThemeChange={(nextTheme) => {
          setTheme(nextTheme);
          const lastUser = [...messages].reverse().find((message) => message.role === "user");
          if (lastUser) setHtml(buildHtml(lastUser.content, nextTheme, pageStyles));
        }}
        fontFamily={fontFamily}
        onFontFamilyChange={(value) => {
          setFontFamily(value);
          updatePageStyles({ fontFamily: value });
        }}
        fontSize={fontSize}
        onFontSizeChange={(value) => {
          setFontSize(value);
          updatePageStyles({ fontSize: value });
        }}
        textColor={textColor}
        onTextColorChange={(value) => {
          setTextColor(value);
          updatePageStyles({ textColor: value });
        }}
        backgroundColor={backgroundColor}
        onBackgroundColorChange={(value) => {
          setBackgroundColor(value);
          updatePageStyles({ backgroundColor: value });
        }}
      />
    </div>
  );
}

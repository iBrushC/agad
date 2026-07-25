"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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

type Device = "desktop" | "tablet" | "mobile";
type Theme = "light" | "auto";

type PollResponse = {
  assistantText?: string;
  html?: string | null;
  hasHtml?: boolean;
  error?: string;
};

type SendResponse = {
  sessionId?: string;
  messageId?: string;
  error?: string;
};

type SaveResponse = {
  id?: string;
  htmlUrl?: string;
  screenshotUrl?: string | null;
  error?: string;
};

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

  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);

  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const generate = async (prompt: string) => {
    setIsGenerating(true);
    cancelledRef.current = false;
    try {
      const sendRes = await fetch("/api/pages/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const sendJson = (await sendRes.json().catch(() => ({}))) as SendResponse;
      if (!sendRes.ok || !sendJson.sessionId) {
        const err = sendJson.error ?? `send failed (${sendRes.status})`;
        setMessages((m) => [
          ...m,
          { id: `a-${Date.now()}`, role: "assistant", content: `Error: ${err}` },
        ]);
        return;
      }

      const sessionId = sendJson.sessionId;
      const deadline = Date.now() + 5 * 60 * 1000;
      let lastText = "";
      while (!cancelledRef.current && Date.now() < deadline) {
        const pollRes = await fetch(
          `/api/pages/poll?sessionId=${encodeURIComponent(sessionId)}&wait=1`,
          { cache: "no-store" },
        );
        const pollJson = (await pollRes.json().catch(() => ({}))) as PollResponse;
        if (pollJson.html && pollJson.html !== html) {
          setHtml(pollJson.html);
        }
        if (pollJson.assistantText) {
          lastText = pollJson.assistantText;
        }
        if (pollJson.html) {
          break;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      const finalRes = await fetch(
        `/api/pages/poll?sessionId=${encodeURIComponent(sessionId)}`,
        { cache: "no-store" },
      );
      const finalJson = (await finalRes.json().catch(() => ({}))) as PollResponse;
      if (finalJson.html) setHtml(finalJson.html);
      const text = finalJson.assistantText ?? lastText;
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: text?.trim()
            ? text.trim()
            : "Done. The page is in the canvas — tweak settings on the right to refine.",
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : String(err)}`,
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = (text: string) => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((m) => [...m, userMsg]);
    setLastPrompt(text);
    setSaveState("idle");
    setSavedUrl(null);
    void generate(text);
  };

  const handleSave = async () => {
    if (!html) return;
    setSaveState("saving");
    setSaveError(null);
    try {
      const res = await fetch("/api/pages/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          html,
          prompt: lastPrompt,
          title: lastPrompt,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as SaveResponse;
      if (!res.ok || json.error) {
        setSaveState("error");
        setSaveError(json.error ?? `save failed (${res.status})`);
        return;
      }
      setSaveState("saved");
      setSavedUrl(json.htmlUrl ?? null);
    } catch (err) {
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : String(err));
    }
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
        <div className="flex items-center justify-end gap-2 border-b border-border bg-panel px-3 py-2">
          {saveState === "saved" && savedUrl ? (
            <a
              href={savedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] uppercase tracking-wider text-emerald-600 hover:underline"
            >
              saved — open
            </a>
          ) : null}
          {saveState === "error" && saveError ? (
            <span className="font-mono text-[10px] uppercase tracking-wider text-destructive">
              {saveError}
            </span>
          ) : null}
          <Button
            size="xs"
            variant="outline"
            onClick={handleSave}
            disabled={!html || isGenerating || saveState === "saving"}
          >
            {saveState === "saving" ? "Saving…" : "Save to Supabase"}
          </Button>
        </div>
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
        onThemeChange={setTheme}
        fontFamily={fontFamily}
        onFontFamilyChange={setFontFamily}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        textColor={textColor}
        onTextColorChange={setTextColor}
        backgroundColor={backgroundColor}
        onBackgroundColorChange={setBackgroundColor}
      />
    </div>
  );
}

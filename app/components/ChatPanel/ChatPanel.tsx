"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles } from "lucide-react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatPanelProps = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isGenerating: boolean;
};

export default function ChatPanel({
  messages,
  onSend,
  isGenerating,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isGenerating]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isGenerating) return;
    onSend(text);
    setDraft("");
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-panel">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight">Chat</h2>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {messages.length} msg
        </span>
      </header>

      <div
        ref={scrollRef}
        className="scrollbar-thin flex-1 overflow-y-auto"
      >
        <div className="space-y-3 px-4 py-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isGenerating && (
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span className="inline-block size-1.5 bg-foreground animate-pulse" />
              <span>generating page…</span>
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border bg-background p-3"
      >
        <div className="flex items-end gap-2 border border-border bg-background p-2 transition-colors focus-within:border-foreground">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="e.g. a portfolio for a photographer with a dark hero…"
            rows={2}
            className="min-h-10 flex-1 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!draft.trim() || isGenerating}
            className="gap-1.5"
          >
            <Send className="size-3.5" />
            Send
          </Button>
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Enter to send · Shift+Enter for newline
        </p>
      </form>
    </aside>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "system") {
    return (
      <div className="font-mono text-xs text-muted-foreground">
        {message.content}
      </div>
    );
  }
  const isUser = message.role === "user";
  return (
    <div
      className={`max-w-full text-sm leading-relaxed border border-border px-3 py-2 ${
        isUser ? "ml-6 bg-background" : "mr-6 bg-panel"
      }`}
    >
      <div className="mb-1 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {isUser ? "you" : "agad"}
      </div>
      <div className="whitespace-pre-wrap break-words">{message.content}</div>
    </div>
  );
}

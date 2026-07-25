"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";

export type Complexity = "minimal" | "basic" | "complex";
export type Detail = "minimal" | "basic" | "detailed";

export type SurveyAnswers = {
  what: string;
  vibe: string;
  complexity: Complexity;
  detail: Detail;
  resources: string;
};

export type NewPageSurveyProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (answers: SurveyAnswers, composedPrompt: string) => void;
};

const STEPS = [
  "what",
  "vibe",
  "complexity",
  "detail",
  "resources",
] as const;

type Step = (typeof STEPS)[number];

export function buildPrompt(a: SurveyAnswers): string {
  const complexityHint: Record<Complexity, string> = {
    minimal: "Use a minimal visual language: flat color blocks, generous whitespace, very few shapes, no gradients. Geometry should be simple — rectangles, a single circle or line per section.",
    basic: "Use a balanced visual language: a few accent shapes (rounded rectangles, circles, thin lines), light layering, restrained shadows replaced by hairline borders.",
    complex: "Use a rich visual language: layered shapes, overlapping circles/blobs, dotted or striped patterns, soft gradients, and decorative motifs scattered through sections.",
  };

  const detailHint: Record<Detail, string> = {
    minimal: "Keep copy minimal — one short headline per section, a single supporting line, no body paragraphs.",
    basic: "Use moderate copy — a short headline, a 1–2 sentence supporting paragraph, and small captions where useful.",
    detailed: "Use rich copy — full headlines, multi-paragraph body text, captions, and supporting details throughout the page.",
  };

  const resources = a.resources.trim()
    ? `\n\nReference resources:\n${a.resources.trim()}`
    : "";

  return [
    `Build a single-page website.`,
    `\nWhat it is:\n${a.what.trim()}`,
    `\nVibe / mood:\n${a.vibe.trim()}`,
    `\nVisual style — colors and shapes:\n${complexityHint[a.complexity]}`,
    `\nContent density:\n${detailHint[a.detail]}`,
    resources,
    `\nReturn a complete, self-contained index.html with inline CSS. No external assets beyond web-safe fonts. No JavaScript frameworks.`,
  ].join("\n");
}

export default function NewPageSurvey({
  open,
  onClose,
  onSubmit,
}: NewPageSurveyProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [what, setWhat] = useState("");
  const [vibe, setVibe] = useState("");
  const [complexity, setComplexity] = useState<Complexity | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [resources, setResources] = useState("");

  const step: Step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const total = STEPS.length;

  const canAdvance = useMemo(() => {
    switch (step) {
      case "what":
        return what.trim().length > 0;
      case "vibe":
        return vibe.trim().length > 0;
      case "complexity":
        return complexity !== null;
      case "detail":
        return detail !== null;
      case "resources":
        return true;
    }
  }, [step, what, vibe, complexity, detail]);

  const advance = () => {
    if (!canAdvance) return;
    if (isLast) {
      const answers: SurveyAnswers = {
        what: what.trim(),
        vibe: vibe.trim(),
        complexity: complexity ?? "basic",
        detail: detail ?? "basic",
        resources: resources.trim(),
      };
      onSubmit(answers, buildPrompt(answers));
      return;
    }
    setStepIndex((i) => Math.min(total - 1, i + 1));
  };

  const back = () => setStepIndex((i) => Math.max(0, i - 1));

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="New page survey"
    >
      <div className="flex h-full w-full flex-col border border-border bg-panel sm:h-auto sm:max-h-[90vh] sm:w-[640px]">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">
              New page — quick survey
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {stepIndex + 1} / {total}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close survey"
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </header>

        <div className="flex items-center gap-1 border-b border-border px-5 py-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 ${
                i <= stepIndex ? "bg-foreground" : "bg-border"
              }`}
            />
          ))}
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-6 sm:flex-none">
          {step === "what" && (
            <StepShell
              label="01 — What you're making"
              title="Describe what you're making."
              hint="A sentence or two is enough. Focus on the purpose and the audience."
            >
              <Textarea
                value={what}
                onChange={(e) => setWhat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    if (canAdvance) advance();
                  }
                }}
                placeholder="e.g. a landing page for a small-batch coffee roastery in Brooklyn"
                rows={4}
                className="min-h-28 w-full resize-none text-sm"
                autoFocus
              />
            </StepShell>
          )}

          {step === "vibe" && (
            <StepShell
              label="02 — Vibe"
              title="Describe the vibe."
              hint="Tone, mood, references. How should it feel?"
            >
              <Textarea
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    if (canAdvance) advance();
                  }
                }}
                placeholder="e.g. warm and editorial, a little playful, inspired by Kinfolk magazine"
                rows={4}
                className="min-h-28 w-full resize-none text-sm"
                autoFocus
              />
            </StepShell>
          )}

          {step === "complexity" && (
            <StepShell
              label="03 — Colors & shapes"
              title="What colors and shapes do you want to go for?"
              hint="Pick one. This drives geometry, layering, and decoration."
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <ComplexityCard
                  label="Minimal"
                  description="Flat color blocks, generous whitespace, very few shapes."
                  selected={complexity === "minimal"}
                  onClick={() => setComplexity("minimal")}
                >
                  <MinimalIllustration />
                </ComplexityCard>
                <ComplexityCard
                  label="Basic"
                  description="A few accent shapes, light layering, hairline borders."
                  selected={complexity === "basic"}
                  onClick={() => setComplexity("basic")}
                >
                  <BasicIllustration />
                </ComplexityCard>
                <ComplexityCard
                  label="Complex"
                  description="Layered shapes, blobs, patterns, soft gradients."
                  selected={complexity === "complex"}
                  onClick={() => setComplexity("complex")}
                >
                  <ComplexIllustration />
                </ComplexityCard>
              </div>
            </StepShell>
          )}

          {step === "detail" && (
            <StepShell
              label="04 — Level of detail"
              title="What level of detail do you want?"
              hint="How much text per section."
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DetailCard
                  label="Minimal"
                  description="One short headline per section, a single supporting line."
                  selected={detail === "minimal"}
                  onClick={() => setDetail("minimal")}
                  lines={1}
                />
                <DetailCard
                  label="Basic"
                  description="Headline plus a 1–2 sentence supporting paragraph."
                  selected={detail === "basic"}
                  onClick={() => setDetail("basic")}
                  lines={3}
                />
                <DetailCard
                  label="Detailed"
                  description="Full headlines, multi-paragraph body, captions."
                  selected={detail === "detailed"}
                  onClick={() => setDetail("detailed")}
                  lines={6}
                />
              </div>
            </StepShell>
          )}

          {step === "resources" && (
            <StepShell
              label="05 — Resources"
              title="Drop in any related resources."
              hint="Optional. Paste reference text, image URLs, or links. One per line is fine."
            >
              <Textarea
                value={resources}
                onChange={(e) => setResources(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    advance();
                  }
                }}
                placeholder="https://example.com/hero.jpg&#10;https://fonts.google.com/specimen/Fraunces&#10;'Our beans are roasted Tuesdays…'"
                rows={6}
                className="min-h-36 w-full resize-none text-sm font-mono"
                autoFocus
              />
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Optional — leave blank to skip.
              </p>
            </StepShell>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-border px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={back}
            disabled={stepIndex === 0}
            className="gap-1.5"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
              {STEPS[stepIndex]}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={advance}
              disabled={!canAdvance}
              className="gap-1.5"
            >
              {isLast ? "Generate page" : "Next"}
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function StepShell({
  label,
  title,
  hint,
  children,
}: {
  label: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </div>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function ComplexityCard({
  label,
  description,
  selected,
  onClick,
  children,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex flex-col items-start gap-3 border bg-background p-4 text-left transition-colors hover:bg-accent ${
        selected ? "border-foreground" : "border-border"
      }`}
    >
      <div className="h-20 w-full border border-border bg-panel">
        {children}
      </div>
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </button>
  );
}

function DetailCard({
  label,
  description,
  selected,
  onClick,
  lines,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  lines: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex flex-col items-start gap-3 border bg-background p-4 text-left transition-colors hover:bg-accent ${
        selected ? "border-foreground" : "border-border"
      }`}
    >
      <div className="flex h-20 w-full flex-col gap-1 border border-border bg-panel p-2">
        <div className="h-1.5 w-2/3 bg-foreground" />
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-1 bg-muted"
            style={{ width: `${90 - i * 6}%` }}
          />
        ))}
      </div>
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </button>
  );
}

function MinimalIllustration() {
  return (
    <svg viewBox="0 0 200 80" className="h-full w-full">
      <rect x="16" y="28" width="120" height="8" fill="currentColor" />
      <rect x="16" y="44" width="80" height="4" fill="currentColor" opacity="0.4" />
      <rect x="16" y="56" width="40" height="4" fill="currentColor" opacity="0.4" />
      <rect x="160" y="20" width="24" height="40" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function BasicIllustration() {
  return (
    <svg viewBox="0 0 200 80" className="h-full w-full">
      <rect x="16" y="24" width="110" height="8" fill="currentColor" />
      <rect x="16" y="40" width="70" height="3" fill="currentColor" opacity="0.5" />
      <rect x="16" y="48" width="60" height="3" fill="currentColor" opacity="0.5" />
      <circle cx="158" cy="40" r="18" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="148" y="14" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function ComplexIllustration() {
  return (
    <svg viewBox="0 0 200 80" className="h-full w-full">
      <defs>
        <pattern id="dots" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" fill="currentColor" opacity="0.6" />
        </pattern>
      </defs>
      <rect x="16" y="22" width="100" height="8" fill="currentColor" />
      <rect x="16" y="38" width="70" height="3" fill="currentColor" opacity="0.5" />
      <rect x="16" y="46" width="60" height="3" fill="currentColor" opacity="0.5" />
      <rect x="16" y="54" width="40" height="3" fill="currentColor" opacity="0.5" />
      <circle cx="150" cy="36" r="22" fill="url(#dots)" />
      <circle cx="150" cy="36" r="12" fill="currentColor" opacity="0.2" />
      <rect x="134" y="10" width="32" height="52" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

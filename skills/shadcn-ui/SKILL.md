---
name: shadcn-ui
description: Use when building landing pages with shadcn/ui-style component design — Button, Card, Input, Badge, Tabs, Accordion, Dialog. Covers the design language (subtle borders, generous spacing, restraint over decoration), Tailwind v4 + CSS variables theming, and the "ship the source, not a library" philosophy. Plain-HTML/CSS adaptations included since AGAD emits inline styles.
license: MIT
---

# shadcn/ui — Component Design Language

shadcn/ui is a **design system in copy-paste form**, not a package. The principles matter more than the React components: ships here as plain-HTML equivalents since AGAD emits a single inline-styled HTML file.

## Design philosophy

- **Restraint over decoration.** No gradients, no glows, no shadows by default. Borders and whitespace do the work.
- **Neutral palette with one accent.** The base is gray-50/gray-100/gray-900. The accent (often one of `--primary`) carries the brand.
- **Subtle borders, generous padding.** A button is `h-9 px-4 border border-input rounded-md`. Nothing more.
- **Ship the source.** You copy component code into your project. No black-box deps.
- **CSS variables for theming.** Every color is `var(--color)` so dark mode is a single class swap.

## Theming (Tailwind v4 + CSS variables)

The full theme uses CSS variables. For plain HTML, inline the same variables in a `:root` block.

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.5rem;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --card-foreground: oklch(0.985 0 0);
    --primary: oklch(0.985 0 0);
    --primary-foreground: oklch(0.205 0 0);
    --secondary: oklch(0.269 0 0);
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --accent: oklch(0.269 0 0);
    --accent-foreground: oklch(0.985 0 0);
    --border: oklch(0.269 0 0);
    --input: oklch(0.269 0 0);
    --ring: oklch(0.439 0 0);
  }
}
```

## Components (plain-HTML versions)

### Button

```html
<style>
  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    height: 2.25rem; padding: 0 1rem; gap: 0.5rem;
    border-radius: var(--radius);
    font: 500 0.875rem/1 system-ui;
    cursor: pointer; transition: background 150ms;
    white-space: nowrap;
  }
  .btn-primary { background: var(--primary); color: var(--primary-foreground); border: 1px solid var(--primary); }
  .btn-primary:hover { background: color-mix(in oklch, var(--primary), white 10%); }
  .btn-outline { background: transparent; color: var(--foreground); border: 1px solid var(--border); }
  .btn-outline:hover { background: var(--accent); color: var(--accent-foreground); }
  .btn-ghost { background: transparent; color: var(--foreground); border: 1px solid transparent; }
  .btn-ghost:hover { background: var(--accent); }
  .btn:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
</style>
<a class="btn btn-primary" href="#">Get started</a>
<a class="btn btn-outline" href="#">Learn more</a>
```

### Card

```html
<style>
  .card {
    background: var(--card); color: var(--card-foreground);
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;
  }
  .card-header { display: flex; flex-direction: column; gap: 0.375rem; }
  .card-title { font: 600 1.125rem/1.4 system-ui; }
  .card-desc { color: var(--muted-foreground); font: 400 0.875rem/1.5 system-ui; }
</style>
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Card title</h3>
    <p class="card-desc">Short description that explains the value.</p>
  </div>
</div>
```

### Badge

```html
<style>
  .badge {
    display: inline-flex; align-items: center;
    padding: 0.125rem 0.625rem; border-radius: 9999px;
    font: 500 0.75rem/1.25 system-ui;
    background: var(--secondary); color: var(--secondary-foreground);
    border: 1px solid var(--border);
  }
</style>
<span class="badge">New</span>
```

### Input

```html
<style>
  .input {
    display: flex; height: 2.25rem; width: 100%;
    padding: 0 0.75rem; border-radius: var(--radius);
    border: 1px solid var(--input);
    background: var(--background); color: var(--foreground);
    font: 400 0.875rem/1 system-ui;
    transition: border-color 150ms;
  }
  .input:focus { outline: none; border-color: var(--ring); box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring), transparent 80%); }
  .input::placeholder { color: var(--muted-foreground); }
</style>
<input class="input" type="email" placeholder="you@example.com" />
```

## Anti-patterns

- No `<button>` without explicit height, padding, and border.
- No card that fills the whole row — use a grid with gaps.
- No badge used as a primary CTA. Badges are meta, not action.
- No input without focus-visible ring.
- No nested cards.
- No `bg-white` on a page that already has `--background` — use the variable.

## When to use this skill

Load this when the page needs structured components (features grid, pricing table, signup form, dashboard preview) and shadcn's restraint fits the brand. For maximum-impact editorial layouts or bold creative pages, prefer the `visual-primitives` skill instead.

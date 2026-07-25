---
name: stack-picker
description: Choose and install the right frontend libraries for a build — UI components, animation, 3D/WebGL, icons, fonts, carousels, toasts — instead of guessing or writing everything from scratch. Use whenever you are starting a new web page, landing page, marketing site, or app UI, or when you are about to hand-roll something (a modal, a carousel, a toast, a command palette, a scroll animation) that a well-maintained library already does correctly. Also use when a page is loading slowly and you need to decide what to cut.
---

# Stack Picker

Two failure modes, roughly equally common. One: hand-rolling a modal, an accessible dropdown, or a carousel and getting focus trapping, scroll locking, and keyboard support subtly wrong. Two: installing 400KB of dependencies for a page with four sections.

The rule that resolves both: **libraries for behavior that is hard to get right, hand-rolled for anything visual.** Focus management, positioning, gestures, virtualization, date math — take the library. Layout, spacing, a hover state, a gradient — write it yourself; it's ten lines and it's yours to art-direct.

## Default stack for a marketing page

```bash
npm create astro@latest        # or vite / next, but Astro ships zero JS by default
npm i -D tailwindcss @tailwindcss/vite
npm i motion lucide-react clsx tailwind-merge
npx shadcn@latest init
```

That is enough for the large majority of landing pages. Add from the table below only when a specific need appears.

## Decision table

| Need | Reach for | Notes |
|---|---|---|
| Component base | **shadcn/ui** | Copies source into your repo rather than adding a dependency — so you can art-direct it. This is why it suits agent work specifically. |
| Headless behavior | **Radix Primitives**, **Base UI**, **React Aria** | Dialogs, menus, popovers, tabs — take the library, always. Accessible focus/keyboard behavior is not worth reimplementing. |
| Marketing blocks | **Magic UI**, **Aceternity UI**, **React Bits**, **Motion Primitives**, **Cult UI** | Copy-paste animated blocks: bento grids, marquees, animated beams, text shimmer. Take one component, not the design language — these have a recognizable house style, so restyle to your tokens. |
| Animation (React) | **motion** | ~18KB w/ LazyMotion. Default choice. |
| Animation (sequences) | **gsap** + ScrollTrigger | For orchestrated scroll timelines and pinning. All plugins free now. ~50KB. |
| Smooth scroll | **lenis** | ~3KB. Only with ScrollTrigger, and only if the direction wants it. Real accessibility tradeoff — think before adding. |
| List/DOM changes | **@formkit/auto-animate** | ~2KB, one line, hard to misuse. |
| Icons | **lucide-react**, or **iconify** | Lucide for a consistent set; Iconify when you need brand marks or an odd glyph (200k icons, one API). Never emoji. |
| Fonts | **@fontsource/\*** or Fontshare | Self-host. `@fontsource-variable/<face>` for variable fonts. |
| 3D / WebGL | **three** + **@react-three/fiber** + **drei** | Heavy (~600KB+). Lazy-load below the fold, always ship a poster image fallback. |
| One shader plane | **ogl**, or raw WebGL | ~10KB vs three's 600KB. If you only need a full-bleed animated gradient, see the `visual-primitives` skill — it needs no library at all. |
| Generative canvas | **p5** | Easy to reason about, good for ambient backgrounds. |
| 2D particles / WebGL | **pixi.js** | When canvas 2D isn't fast enough. |
| Physics playfulness | **matter-js** | Draggable hero elements, falling type. |
| Confetti / delight | **canvas-confetti** | ~5KB. Success states only. |
| Carousel | **embla-carousel** | Accessible, tiny, no opinions on styling. |
| Toasts | **sonner** | |
| Drawer / bottom sheet | **vaul** | |
| Command palette | **cmdk** | |
| Tooltips / popovers | **@floating-ui/dom** | Positioning is genuinely hard. Take it. |
| Charts | **recharts**, or **visx** / **d3** | Recharts for standard charts fast; d3 when the chart is the design. |
| Forms | **react-hook-form** + **zod** | |
| Table | **@tanstack/table** | Headless. |
| Color system | **Radix Colors**, **Open Props** | Or generate OKLCH ramps directly — see the `design-tokens` skill. |
| Designer-authored motion | **Rive** (`@rive-app/react-canvas`), or **lottie** | Rive if it needs interactive states; Lottie for a linear animation. |
| Class merging | **clsx** + **tailwind-merge** | |

## Weight budget

Set one before installing anything. For a landing page: **under 100KB gzipped JS**, LCP under 2.0s on a mid-tier phone.

Things that blow the budget, in order:
1. **three.js** (~600KB) — lazy-load it, always. `const { Canvas } = await import('@react-three/fiber')` behind an IntersectionObserver, with a static poster until it's ready.
2. **A full icon library imported wholesale** — import individual icons, never `import * as Icons`.
3. **Non-subsetted webfonts** — subset to latin, `font-display: swap`, preload the display face only.
4. **A component library used for two components** — copy the two components instead.
5. **Lottie files** exported at full fidelity — check the JSON size before shipping.

If you're over budget, cut in that order.

## What not to install

- **A CSS-in-JS runtime** for a marketing page. Tailwind or plain CSS.
- **Bootstrap / Material** unless the brief explicitly asks — they carry a visual identity you'll spend the whole build fighting.
- **A date library** for one format call. `Intl.DateTimeFormat` exists.
- **jQuery.** Still shows up in copied snippets. Delete it.
- **A carousel** for three items that fit on screen. Use a grid.
- **three.js for a gradient.** This is the most common overreach. A fragment shader on a plane is 60 lines of raw WebGL — see `visual-primitives`.

## Astro note

If the deliverable is marketing pages rather than an app, Astro is the better target: components render to static HTML, and only the islands you mark `client:*` ship JS. A page with one interactive nav and a shader hero ships ~15KB instead of ~90KB. Use `client:visible` for anything below the fold.

`references/install.md` has copy-ready install commands and minimal setup for each stack combination.

---
name: visual-primitives
description: Drop-in, dependency-free visual set-pieces that make a page look art-directed rather than templated — an animated WebGL gradient hero, film grain overlays, spotlight cards, gradient-masked text, marquees, noise-textured backgrounds. Use when building a hero section, when a page looks flat or plain, when the user asks for something that "pops", looks "premium", "expensive", or "like an awwwards site", and specifically INSTEAD of installing three.js when all that is actually needed is a moving gradient. Each piece is copy-paste and adds no dependencies.
---

# Visual Primitives

A flat background with flat cards on it is the visual signature of an unstyled template. Nearly all of the gap between that and something that looks art-directed is closed by two things: **surface texture** and **one set-piece**. Neither needs a library.

These are ordered by impact per byte. Take one or two. Taking all of them produces a different problem.

## 1. Grain — `assets/grain.css`

An SVG `feTurbulence` overlay at 3–6% opacity. Put it over any gradient, image, or solid background. About 15 lines, no requests, and it is the strongest single "premium" signal available.

The parameters that matter: `baseFrequency` 0.6–0.9 (higher = finer grain), `numOctaves` 3–4, opacity 0.03–0.06, and `mix-blend-mode: overlay` on light backgrounds / `soft-light` on dark. Above ~8% it stops reading as texture and starts reading as a broken image.

## 2. Shader gradient hero — `assets/shader-hero.js`

A domain-warped fbm noise field mapped to three palette colors, drifting slowly, with grain baked into the shader. Raw WebGL, ~120 lines, no dependencies. This is the thing people install three.js for; three.js is 600KB and this is 4.

```html
<div class="shader-hero" data-shader
     data-colors="#1a1035,#6b3fa0,#e8a87c"
     data-speed="0.5">
  <canvas></canvas>
  <div class="shader-hero__content"> …headline… </div>
</div>
<script type="module">
  import { mountShader } from "./shader-hero.js";
  document.querySelectorAll("[data-shader]").forEach(mountShader);
</script>
```

It handles the things that are easy to get wrong: DPR clamping (renders at 1.5x max, not 3x, so phones don't melt), pausing when scrolled offscreen, pausing on tab blur, a single static frame under `prefers-reduced-motion`, and a CSS gradient fallback if WebGL is unavailable.

Pick colors as **dark → mid → warm accent**. Three colors from the same hue family with one contrasting warm tone reads as intentional; three unrelated saturated colors reads as a screensaver. Keep the speed low — `0.3` to `0.6`. If you can perceive it moving while reading the headline, it's too fast.

`assets/ShaderHero.jsx` is the React wrapper.

## 3. Spotlight card — `assets/primitives.css`

A radial highlight that follows the cursor across a card, driven by two CSS custom properties. Costs one `pointermove` listener and no re-renders. Works best on dark surfaces with a hairline border.

## 4. Gradient-masked text — `assets/primitives.css`

Not the purple-to-blue h1 gradient — that's a tell. The useful version is a *mask* that fades text into the background at the edge of a marquee, a scrolling list, or an overflowing container. `mask-image: linear-gradient(...)`. Subtle, and its absence is what makes overflow look broken.

## 5. Marquee, bento, and edge fades — `assets/primitives.css`

The three structural blocks that come up on nearly every landing page, written to be restyled rather than used as-is.

## How to choose

**One set-piece per page.** A shader hero *and* spotlight cards *and* a marquee *and* split text is four things competing. Pick the one that matches the subject and let the rest be quiet.

Match the primitive to what's being sold:
- Software / infrastructure → shader gradient, grain, hairline borders
- Editorial / writing → grain over paper-toned solid, no shader, strong type
- Physical product → real photography with grain, no gradient at all
- Playful / consumer → physics or confetti, brighter palette

If the subject has real imagery available, **use the imagery**. A shader is what you reach for when there is nothing to show.

## The check

After adding any of these, run the `visual-self-review` loop. Shader heroes in particular look different in a screenshot than they do in your head — contrast against the headline is the usual failure, and it's invisible until you look.

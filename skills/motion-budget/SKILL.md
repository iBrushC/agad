---
name: motion-budget
description: Constrain and implement animation on a web page — durations, easing, scroll-triggered reveals, hover micro-interactions, reduced-motion fallbacks. Use whenever you are adding any animation or transition to a page, when a user asks for something to "feel more alive", "add some motion", "make it interactive", or when a built page feels static or, conversely, feels busy and over-animated. Also use before reaching for GSAP, Motion, or a scroll library, so the choice of library follows the effect rather than the other way round.
---

# Motion Budget

Animation fails in two directions. Too little and the page feels like a document. Too much — and this is the more common failure in generated work — and it feels like a demo reel: every element fading up on scroll, three effects competing in one viewport, a hero that won't let you read it.

The fix is a budget. Decide what's allowed, spend it deliberately in one or two places, and let everything else be still. **One orchestrated moment beats twelve scattered effects.**

## The budget

| | Limit |
|---|---|
| Durations | 120–200ms micro (hover, focus) · 200–350ms UI (menus, modals) · 400–700ms entrance/scroll |
| Easing | one family. `cubic-bezier(0.16, 1, 0.3, 1)` for entrances, `cubic-bezier(0.4, 0, 0.2, 1)` for UI, a spring only for the signature element |
| Scroll effects | max **2** in view at once |
| Stagger | 40–70ms per item, capped at ~6 items |
| Distance | entrances travel 8–24px, not 100px |
| Properties | `transform` and `opacity` only. Anything else risks layout thrash |
| Reduced motion | always, and content must remain visible |

## Rules that matter more than they look

**Never animate the h1 on load in a way that delays reading it.** The headline is the page's job. If it fades in over 800ms, the first thing a visitor experiences is waiting. Animate around it — the eyebrow, the CTA, the background — or animate it fast (250ms, 8px).

**Reduced motion must not hide content.** The classic bug: elements start at `opacity: 0`, JS adds the visible class on scroll, and the reduced-motion block kills the transition — leaving everything invisible forever. Whenever you write an entrance animation, verify the reduced-motion path *renders the content*. Test it: screenshot with `prefers-reduced-motion: reduce`.

**Hover states belong on things that are clickable, and nothing else.** A card that lifts on hover but does nothing when clicked is a lie.

**Motion should come from the subject.** A page about precision instruments should move differently from one about a music app. Ask what the thing being sold actually feels like, then pick the curve.

**Entrance animations fire once.** Re-triggering on every scroll back up is nauseating. Use `once: true` / `toggleActions: play none none none`.

## Choosing the tool

Work down this list and stop at the first one that covers the effect. Reaching for GSAP to do a hover state is how pages end up 120KB heavier than they need to be.

1. **CSS transition** — hover, focus, open/close. Free.
2. **CSS `@keyframes` + `animation-timeline: scroll()`** — scroll-linked progress bars, parallax, fade-on-scroll. Zero JS. Baseline in Chrome/Edge/Safari 26; degrades to "no animation", which is fine.
3. **View Transitions API** — page and state transitions. `document.startViewTransition()`.
4. **Motion** (`motion`, ex-Framer Motion) — React components, layout animations, `useInView`, gestures, exit animations. The default for React work.
5. **AutoAnimate** — list add/remove/reorder. One line, hard to misuse.
6. **GSAP + ScrollTrigger** — orchestrated scroll timelines, pinning, scrubbed sequences, text splitting. Reach for it when the effect is a *sequence*, not a state change. All plugins are free now.
7. **Lenis** — smooth scroll. Only alongside ScrollTrigger, and only if the direction actually wants that feel. It fights native scroll on some devices and is a real accessibility tradeoff.

## Where to spend it

Ranked by payoff:

1. **Hero entrance** — a short orchestrated sequence: eyebrow, headline, sub, CTA, background. 600ms total, stagger 60ms. This is the one place worth being ambitious.
2. **Hover micro-interactions** — 140ms, 2px lift or a subtle color shift. Cheap, and their absence is felt.
3. **One scroll set-piece** — a pinned sequence, a scrubbed diagram, a horizontal section. One per page.
4. **Section reveals** — 16px up, 400ms, staggered, once. Restrained; skip on above-the-fold content.
5. **Ambient background** — a slow shader or gradient drift. Must be genuinely slow (20s+) or it becomes a distraction.

Everything below #3 is optional. If you're short on budget, cut from the bottom.

## Implementation

`references/snippets.md` has tested, copy-ready implementations for each library above — the hero timeline, scroll reveals with a correct reduced-motion path, magnetic buttons, split-text, marquee, and the CSS scroll-timeline versions. Read it when you know which effect you want; don't paste all of it.

# Motion snippets

Tested patterns. Take the one you need; don't paste the file.

- [1. Scroll reveal — CSS only](#1-scroll-reveal--css-only)
- [2. Scroll reveal — IntersectionObserver](#2-scroll-reveal--intersectionobserver)
- [3. Hero entrance — CSS](#3-hero-entrance--css)
- [4. Hero entrance — Motion (React)](#4-hero-entrance--motion-react)
- [5. Scroll reveal — Motion (React)](#5-scroll-reveal--motion-react)
- [6. Orchestrated scroll — GSAP ScrollTrigger](#6-orchestrated-scroll--gsap-scrolltrigger)
- [7. Split-text reveal](#7-split-text-reveal)
- [8. Magnetic button](#8-magnetic-button)
- [9. Infinite marquee](#9-infinite-marquee)
- [10. View transitions](#10-view-transitions)

---

## 1. Scroll reveal — CSS only

Zero JS. Degrades to "element is just visible", which is the correct failure mode.

```css
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .reveal {
      animation: reveal-up linear both;
      animation-timeline: view();
      animation-range: entry 10% cover 35%;
    }
  }
}

@keyframes reveal-up {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: none; }
}
```

Scroll-linked progress bar:

```css
.progress {
  position: fixed; inset: 0 0 auto 0; height: 2px;
  transform-origin: 0 50%;
  background: var(--accent);
  animation: scale-x linear both;
  animation-timeline: scroll(root block);
}
@keyframes scale-x { from { transform: scaleX(0); } to { transform: scaleX(1); } }
```

## 2. Scroll reveal — IntersectionObserver

Works everywhere. Note the reduced-motion path *adds the class immediately* rather than relying on the transition — this is the bug to avoid.

```css
.reveal { opacity: 0; transform: translateY(18px);
          transition: opacity 480ms var(--ease-out), transform 480ms var(--ease-out); }
.reveal.is-in { opacity: 1; transform: none; }

@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition: none; }
}
```

```js
const items = document.querySelectorAll('.reveal');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reduce) {
  items.forEach(el => el.classList.add('is-in'));   // <- content stays visible
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (!e.isIntersecting) return;
      e.target.style.transitionDelay = `${Math.min(i, 5) * 60}ms`;
      e.target.classList.add('is-in');
      io.unobserve(e.target);                        // fire once
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  items.forEach(el => io.observe(el));
}
```

## 3. Hero entrance — CSS

600ms total. Headline arrives fast so it's readable immediately.

```css
.hero > * { animation: rise 520ms var(--ease-out) both; }
.hero .eyebrow  { animation-delay:  40ms; }
.hero h1        { animation-delay:  90ms; animation-duration: 380ms; }
.hero .lead     { animation-delay: 200ms; }
.hero .actions  { animation-delay: 280ms; }

@keyframes rise { from { opacity: 0; transform: translateY(14px); } }

@media (prefers-reduced-motion: reduce) {
  .hero > * { animation: none; }
}
```

## 4. Hero entrance — Motion (React)

```jsx
import { motion } from "motion/react";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };
const item = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

export function Hero() {
  return (
    <motion.div className="hero" variants={container} initial="hidden" animate="show">
      <motion.p  variants={item} className="eyebrow">Field notes</motion.p>
      <motion.h1 variants={item}>Instruments for slow work</motion.h1>
      <motion.p  variants={item} className="lead">…</motion.p>
      <motion.div variants={item} className="actions">…</motion.div>
    </motion.div>
  );
}
```

Motion respects `prefers-reduced-motion` automatically when you wrap the app in `<MotionConfig reducedMotion="user">`. Do that once at the root.

## 5. Scroll reveal — Motion (React)

```jsx
<motion.section
  initial={{ opacity: 0, y: 18 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.2 }}
  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
/>
```

Scroll-linked parallax:

```jsx
import { useScroll, useTransform, motion } from "motion/react";

const ref = useRef(null);
const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);   // keep it small
return <motion.img ref={ref} style={{ y }} />;
```

## 6. Orchestrated scroll — GSAP ScrollTrigger

Use when the effect is a *sequence*. One per page.

```js
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".process",
      start: "top top",
      end: "+=180%",
      scrub: 0.8,
      pin: true,
    },
  });
  tl.from(".process__step-1", { opacity: 0, y: 24 })
    .from(".process__step-2", { opacity: 0, y: 24 }, "+=0.3")
    .from(".process__step-3", { opacity: 0, y: 24 }, "+=0.3");
}
```

Use `gsap.matchMedia()` for breakpoint-scoped animations so mobile isn't running a desktop pin:

```js
const mm = gsap.matchMedia();
mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
  /* desktop-only timeline; auto-reverted on exit */
});
```

With Lenis:

```js
import Lenis from "lenis";
const lenis = new Lenis({ duration: 1.1 });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```

## 7. Split-text reveal

GSAP's SplitText is free now and handles masking and resize properly:

```js
import SplitText from "gsap/SplitText";
gsap.registerPlugin(SplitText);

const split = new SplitText("h1", { type: "lines", mask: "lines" });
gsap.from(split.lines, {
  yPercent: 110, duration: 0.75, ease: "power3.out", stagger: 0.08,
});
```

Dependency-free version — split by word, keep it accessible:

```js
function splitWords(el) {
  const text = el.textContent;
  el.setAttribute("aria-label", text);            // screen readers get the whole string
  el.innerHTML = text.split(" ").map(w =>
    `<span class="w" aria-hidden="true"><span>${w}</span></span>`
  ).join(" ");
}
```
```css
.w { display: inline-block; overflow: hidden; vertical-align: bottom; }
.w > span { display: inline-block; transform: translateY(105%);
            animation: word-up 620ms var(--ease-out) both; }
.w:nth-child(n+2) > span { animation-delay: calc(var(--i, 0) * 45ms); }
@keyframes word-up { to { transform: none; } }
```

## 8. Magnetic button

Cheap and disproportionately liked. Keep the pull small (≤8px).

```js
document.querySelectorAll("[data-magnetic]").forEach((el) => {
  const strength = 0.25;
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * strength;
    const y = (e.clientY - r.top - r.height / 2) * strength;
    el.style.transform = `translate(${x}px, ${y}px)`;
  });
  el.addEventListener("pointerleave", () => { el.style.transform = ""; });
});
```
```css
[data-magnetic] { transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1); }
[data-magnetic]:hover { transition-duration: 60ms; }
@media (prefers-reduced-motion: reduce) { [data-magnetic] { transform: none !important; } }
```

## 9. Infinite marquee

Duplicate the track, translate by -50%, no JS.

```html
<div class="marquee"><div class="marquee__track">
  <span>…items…</span><span aria-hidden="true">…same items…</span>
</div></div>
```
```css
.marquee { overflow: hidden; mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); }
.marquee__track { display: flex; width: max-content; gap: var(--s-7);
                  animation: slide 32s linear infinite; }
.marquee:hover .marquee__track { animation-play-state: paused; }
@keyframes slide { to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) { .marquee__track { animation: none; } }
```

## 10. View transitions

```js
function navigate(update) {
  if (!document.startViewTransition) return update();
  document.startViewTransition(update);
}
```
```css
@view-transition { navigation: auto; }          /* MPA, same-origin */
.hero-image { view-transition-name: hero; }     /* element continuity */

::view-transition-old(root) { animation: fade 180ms both; }
::view-transition-new(root) { animation: fade 220ms reverse both; }
```

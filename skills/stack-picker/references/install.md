# Install recipes

## A. Marketing page — Astro + Tailwind v4 (lightest)

```bash
npm create astro@latest -- --template minimal --typescript strict
cd <dir>
npx astro add tailwind react
npm i motion lucide-react
npm i @fontsource-variable/instrument-sans @fontsource/instrument-serif
```

`src/styles/global.css`:
```css
@import "tailwindcss";
@import "@fontsource-variable/instrument-sans";
@import "@fontsource/instrument-serif";
@import "./tokens.css";          /* from the design-tokens skill */

@theme {
  --font-display: "Instrument Serif", serif;
  --font-body: "Instrument Sans Variable", sans-serif;
  --color-accent: oklch(62% 0.17 24);
  --spacing-section: clamp(4rem, 9vw, 11rem);
}
```

Islands: `<Nav client:load />` for the nav, `<ShaderHero client:visible />` for anything below the fold.

---

## B. App UI — Vite + React + shadcn

```bash
npm create vite@latest -- --template react-ts
cd <dir>
npm i -D tailwindcss @tailwindcss/vite
npm i clsx tailwind-merge lucide-react motion
npx shadcn@latest init
npx shadcn@latest add button dialog dropdown-menu input sonner
```

`vite.config.ts` needs `@tailwindcss/vite` in plugins and a `@` alias to `./src`.

Wrap the root once so reduced-motion is respected globally:
```jsx
import { MotionConfig } from "motion/react";
<MotionConfig reducedMotion="user">{children}</MotionConfig>
```

---

## C. Scroll-driven site — GSAP + Lenis

```bash
npm i gsap lenis
```

GSAP is fully free including ScrollTrigger, SplitText, Flip, MorphSVG, ScrollSmoother, DrawSVG.

```js
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitText from "gsap/SplitText";
gsap.registerPlugin(ScrollTrigger, SplitText);
```

Wire Lenis to ScrollTrigger — see the motion-budget snippets. Skip Lenis on touch (`smoothTouch: false` is the default and should stay that way).

---

## D. 3D hero — lazy, with a fallback

```bash
npm i three @react-three/fiber @react-three/drei
```

```jsx
import { lazy, Suspense, useState, useEffect, useRef } from "react";
const Scene = lazy(() => import("./Scene"));

export function Hero3D({ poster }) {
  const ref = useRef(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (navigator.connection?.saveData) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShow(true), { rootMargin: "200px" });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="hero-3d">
      <img src={poster} alt="" className="hero-3d__poster" />
      {show && <Suspense fallback={null}><Scene /></Suspense>}
    </div>
  );
}
```

The poster stays underneath rather than being swapped out — no flash, and it's the graceful degradation path for reduced-motion and data-saver users.

---

## E. Fonts, self-hosted and subset

```bash
npm i @fontsource-variable/<face> @fontsource/<display-face>
```

Preload only the display face — it's the one visible above the fold:
```html
<link rel="preload" as="font" type="font/woff2" href="/fonts/display.woff2" crossorigin>
```

Free display faces worth knowing: Satoshi, Clash Display, General Sans, Cabinet Grotesk, Bricolage Grotesque, Instrument Serif, Fraunces, Gambarino (Fontshare); Newsreader, Literata, Space Grotesk, Sora, Geist (Google/Vercel).

---

## F. Quick capability checks

```bash
# bundle weight, honestly
npx vite-bundle-visualizer

# lighthouse from the CLI
npx unlighthouse --site http://localhost:4321

# what's actually in node_modules
npx howfat <package>
```

---
name: visual-self-review
description: Screenshot a page you just built, look at it, critique it against a rubric, and fix what you find — before showing the user anything. Use this whenever you have built or substantially changed a webpage, landing page, marketing site, component, or any UI that a human will look at, and a browser or Playwright is available. Also use it when the user says the design "looks off", "feels generic", "looks AI-generated", or asks you to polish, review, or improve an existing page. Do not skip this step just because the code looks correct — code correctness and visual quality are different things, and you cannot assess the second one without looking.
---

# Visual Self-Review

You cannot evaluate a design you have not seen. Reading your own markup tells you the DOM is well-formed; it tells you nothing about whether the hero is unbalanced, the type is too small, a card is overflowing at 390px, or the whole thing looks like every other AI-generated page. Rendering it and looking is the single highest-value thing you can do before handing work over.

Budget for at least **two full loops**. The first pass catches breakage, the second catches taste. Work that ships after one pass is reliably worse.

## The loop

1. **Serve** the page (`npx vite`, `python -m http.server`, whatever the project uses).
2. **Shoot** it with `scripts/shoot.py` — full page at desktop and mobile, plus viewport-sized slices.
3. **Look** at every image with the view tool. Actually look. Do not skim filenames and assume.
4. **Critique** against `references/rubric.md`. Write down 3–8 specific, located problems — "the eyebrow above the h1 is 11px and disappears at mobile", not "typography could be improved".
5. **Fix** them. Re-shoot. Compare.
6. **Stop** when the remaining notes are preferences rather than defects.

## Running the shooter

```bash
pip install playwright && playwright install chromium   # once
python scripts/shoot.py http://localhost:5173 --out .review
```

Useful flags:

| Flag | Effect |
|---|---|
| `--out DIR` | where shots land (default `.review`) |
| `--viewports desktop,mobile,tablet` | which widths to capture |
| `--slices` | also capture viewport-height slices down the page, so you see it the way a visitor scrolls it |
| `--wait 1200` | extra ms to let entrance animations settle |
| `--motion reduce` | render with `prefers-reduced-motion: reduce` to verify the fallback |
| `--dark` | render with `prefers-color-scheme: dark` |
| `--element "#hero"` | tight shot of one element |
| `--console` | dump console errors and failed requests to `console.txt` |

Always run `--console` at least once. A silent 404 on a font file is invisible in the code and obvious in the log, and it is the most common cause of "why does this look wrong".

## How to look

Look at the **full-page desktop shot first, zoomed out**. Squint at it. At that scale you are only judging: does the eye land in the right place, is there a clear hierarchy of three levels, is the page breathing or crowded, is anything obviously misaligned. Most real defects are visible here.

Then the **mobile shot**, which is where things actually break: overflowing text, a nav that eats the screen, a 72px display size that was never clamped, a two-column grid that never collapsed.

Then the **slices**, which reveal rhythm problems the full-page shot hides — three sections in a row with identical padding, a wall of same-sized cards, no change in visual density from top to bottom.

## Writing the critique

Be concrete and located. A useful note names the element, the symptom, and the fix:

**Good:** "Hero h1 is `clamp(2rem, 8vw, 4.5rem)` but the subhead below it is a flat 1.125rem — the gap in scale is too large and the subhead reads as an afterthought. Bump to 1.375rem and reduce its opacity instead of its size."

**Useless:** "The hero could use some refinement."

If you cannot say where the problem is, you have not looked hard enough.

## Honesty about what you see

If the page looks generic, say so in your notes and fix it, rather than talking yourself into it. The failure mode here is grading your own homework generously — you built it, so you are primed to see what you intended rather than what rendered. Ask instead: if a stranger sent me this screenshot, what would I say first?

When you report to the user, describe what you changed between passes. "I shot it, the mobile hero was overflowing and the section rhythm was flat, so I clamped the display size and varied the vertical padding" is worth more than a wall of prose about your design philosophy.

## When there is no browser

If Playwright cannot run, say so plainly rather than pretending you reviewed it. Fall back to: check the page at 390px in your head against `references/rubric.md`'s mobile section, and tell the user you were not able to render it and would recommend they check it visually.

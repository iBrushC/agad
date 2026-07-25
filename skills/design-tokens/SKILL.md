---
name: design-tokens
description: Lock a small, opinionated token system — type scale, spacing, color ramp, radius, shadow, one accent — before writing any markup for a new page, landing page, site, or component library. Use this at the START of any frontend build, and also when an existing page looks inconsistent, drifty, or generic and needs a system imposed on it. Trigger whenever you are about to write CSS or Tailwind config for something a human will look at. Skipping this step is the most common cause of pages that look almost right but not designed.
---

# Design Tokens

Generated UI looks generated mostly because every value was chosen independently. A 15px here, a 19px there, three greys that are nearly the same, four radii, two accent hues that don't quite agree. Each choice is defensible; the accumulation reads as noise.

The fix is boring and works: decide the system once, then derive every value from it. **Constrain first, then design inside the constraint.** A page built from eight sizes and one accent hue will look more considered than one built from forty of each.

## Do this before writing markup

Write out the token block and show it, briefly, before you build:

```
Type:     display <face> / body <face>, scale 1.25, 0.875→4.5rem
Space:    4px base, steps 4 8 12 16 24 32 48 64 96 128
Color:    bg <hex>  surface <hex>  text <hex>  muted <hex>  accent <hex>
Radius:   <one value> (plus 999px for pills)
Shadow:   one elevation, or none — hairline borders instead
Signature: <the one memorable element>
```

Six lines. If you can't fill them in, you don't yet know what you're building — pin the subject first.

## The rules that do the work

**One accent hue.** Not two. Everything else is the neutral ramp. If you need a second color it should be a semantic state (error/success), not decoration. Two decorative accents almost always means the choice was never made.

**One type scale, one ratio.** Pick a ratio and stay on it. 1.2 for dense/utilitarian, 1.25 for general, 1.333 for editorial, 1.5 for dramatic minimal. Every size in the page comes from that ladder. Do not add an off-ladder size because something "looked a bit small" — pick the neighbouring rung.

**Two faces, three roles.** A characteristic display face used sparingly, a body face that disappears, optionally a mono/utility face for labels and data. Body face should be boring — its job is legibility. The display face carries the personality, so it should not be the same face you'd reach for on any other project. Fontshare and Fontsource have real display faces (Satoshi, Clash Display, General Sans, Bricolage Grotesque, Instrument Serif) that cost nothing and immediately separate the page from Inter-for-everything.

**One spacing base, and use the big steps.** 4px base. The distinction between designed and undesigned is usually not the small values — it's whether you were willing to use 96px or 128px between sections. Generated pages cluster everything at 16–32px and read as cramped.

**One radius.** Plus `999px` for pills. Mixing 4px cards, 8px buttons and 16px images looks like drift, because it is.

**Neutrals in OKLCH, from one hue.** Pure grey next to a warm accent looks dead. Give the neutral ramp a few degrees of the accent's hue (or its complement) at very low chroma and the whole page coheres. `oklch(L C H)` makes this trivial: hold C and H, vary L.

## What actually separates premium from template

Three things, in order of impact per byte:

1. **A display face with character**, used at a size that commits (48px+ on desktop).
2. **Grain over a gradient.** An SVG `feTurbulence` overlay at 3–6% opacity on top of any gradient or solid background. It is the single strongest "this was art-directed" signal available for ~15 lines of CSS. See `assets/tokens.css`.
3. **Section rhythm that varies.** Not every section gets 96px of padding.

Everything else — shadows, hovers, micro-animations — is downstream of these.

## Anti-defaults

Where the brief pins a direction, follow the brief. Where it leaves you free, don't spend that freedom on:

- warm cream `#F4F1EA` + high-contrast serif + terracotta `#D97757`
- near-black + a single acid-green or vermilion accent
- purple→blue gradient on anything
- broadsheet layout with hairline rules and zero radius

These are the three or four looks generated design converges on. They're fine choices *for a brief that asks for them* and a tell everywhere else.

## Files

`assets/tokens.css` — a complete drop-in token layer: OKLCH ramps, fluid type scale, spacing, the grain overlay, focus rings, and a `prefers-reduced-motion` block. Copy it in, change the four values at the top, delete what you don't use.

For Tailwind v4, the same tokens go inside `@theme { }` and become utilities automatically — the file notes which lines to move.

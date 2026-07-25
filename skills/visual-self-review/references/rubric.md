# Critique rubric

Work through these in order. Stop reading markup; judge the picture. For each item, either write a located defect or move on.

---

## 1. Squint test (full-page desktop, zoomed out)

- **Where does the eye land first?** If the answer is "nowhere in particular" or "the nav", the hero has no focal point. One element should dominate.
- **Are there exactly three levels of hierarchy?** Primary (one thing), secondary (a few), tertiary (everything else). Pages that read as flat have too many things competing at the same weight.
- **Is there real negative space, or just uniform padding?** Generous space around the important thing and tighter space elsewhere is what makes something look designed. Even padding everywhere looks like a framework default.
- **Does anything sit on a different grid than everything else?** Misalignment reads as sloppiness before it reads as anything else.

## 2. The AI-generated tells

These are the specific things that make a page read as machine-made. Check each honestly.

- **Everything centered.** Centered hero, centered section headers, centered cards, centered footer. Real designs vary alignment. Left-align something.
- **Uniform card grid as the answer to every section.** Three equal cards, then three more equal cards, then three more. Vary the block types: a wide feature, a split, a list, a full-bleed quote.
- **No type contrast.** Display face and body face at similar weights and sizes. You want a genuine jump — a 4rem display against 1rem body is a decision; 2rem against 1.25rem is a shrug.
- **Inter (or the system stack) doing all the work.** Fine for body. If it's also the display face, the page has no voice.
- **The default palettes.** Warm cream (#F4F1EA-ish) + high-contrast serif + terracotta accent. Near-black + one acid-green or vermilion accent. Purple-to-blue gradient on anything. These are legitimate choices for some briefs and defaults for all others; if the brief didn't ask, don't spend your one free axis on them.
- **Emoji as icons.** 🚀 in a feature card is a tell. Use a real icon set.
- **Gradient text on the h1** with no other gradient anywhere on the page.
- **Placeholder-flavoured copy.** "Transform your workflow." "Built for modern teams." "Everything you need to succeed." If the copy would fit any product, the page is generic regardless of how it looks.
- **A glassmorphism card floating over a blurred blob**, unless the whole direction commits to it.
- **Every section the same vertical rhythm.** Sections should compress and expand — a dense spec table shouldn't breathe like a hero.

## 3. Typography

- Body copy 16–18px minimum; line-height 1.5–1.65 for body, 0.95–1.1 for large display.
- Measure (line length) 55–75 characters. A full-width paragraph at 1440px is unreadable and looks unconsidered.
- Is the type scale actually a scale? Sizes should come from a ratio, not from vibes. Random 15px/19px/23px values look like drift.
- Optical alignment: large display type often needs a negative left offset to align with body text below it. Check the left edge of the h1 against the paragraph under it.
- Letter-spacing: tighten large display (-0.02em to -0.04em), leave body alone, open up small all-caps eyebrows (0.08em+).
- Widows and orphans in headlines. A two-word third line on an h1 looks broken. Use `text-wrap: balance`.

## 4. Color and surface

- Count the colors actually in use. More than one accent hue usually means no decision was made.
- Is contrast sufficient? Body text at 4.5:1, large text at 3:1. Low-contrast grey-on-grey is the most common accessibility failure and it also just looks weak.
- Is there any surface texture — grain, a subtle gradient, a real photograph, a shader? Flat solid backgrounds with flat solid cards is the look of an unstyled template.
- Do borders and shadows agree? Pick one system (hairline borders *or* soft shadows) rather than both at random.

## 5. Mobile (390px)

- Any horizontal overflow? Check for a scrollbar. Common causes: fixed-width elements, `100vw` with a scrollbar present, a long unbroken string, a negative margin.
- Did the display size clamp? A 72px headline at 390px is 5 words per screen.
- Do multi-column grids collapse to one column, and do the resulting cards still look intentional?
- Are tap targets 44px minimum, with real space between them?
- Does the nav work, and does it not consume the entire first screen?

## 6. Motion

- Does anything animate on load that delays reading the headline? The h1 should be legible immediately.
- Are there more than two scroll-triggered effects competing in one viewport?
- Does `prefers-reduced-motion: reduce` actually neutralize it? Re-shoot with `--motion reduce` and verify content is still visible — the classic bug is an entrance animation whose reduced-motion fallback leaves everything at `opacity: 0`.
- Any layout shift as things animate in?

## 7. Craft details

These are small and they are most of the difference.

- Focus states visible on every interactive element, keyboard-tested.
- Hover states on everything clickable, and nothing else.
- Real content, not "Lorem ipsum" and not `[Company Name]`.
- Images have real dimensions set (no layout shift) and `alt` text.
- The favicon and page title are set. An untitled tab undoes a lot of polish.
- Scrollbar and selection color match the design, if the direction is strong.
- The footer isn't an afterthought — it's the last impression.

---

## Output format for the critique

```
### Pass N critique

1. [location] symptom → fix
2. ...

Fixing 1, 3, 4 now. 2 and 5 are preference calls — leaving them.
```

Then fix and re-shoot. If the second pass produces no defects in sections 1–5, you're done.

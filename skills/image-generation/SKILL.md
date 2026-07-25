---
name: image-generation
description: Generate raster images on demand via OpenRouter's image models (default google/gemini-2.5-flash-image) and write them into the project so the page can reference them. Use this whenever a landing page needs a hero photo, a product shot, an illustration, an icon photo, an avatar, a background image, or any other raster image that cannot reasonably be inline SVG. Do NOT use this for icons (use lucide-react), diagrams, or anything that should be crisp at every size (use inline SVG). Do NOT use this for logos unless the user explicitly asked for AI imagery; the brand mark is usually provided.
---

# Image Generation

The agent can produce a raster image, save it under `/home/vercel-sandbox/project/assets/`, and reference it from `index.html`. The image is generated server-side via OpenRouter; you do not need to `npm install` anything to use it.

## How to call

```bash
node /home/vercel-sandbox/.config/opencode/skills/image-generation/scripts/generate.mjs \
  "a cinematic photo of a fox in a moonlit forest, soft rim light" \
  --name hero-fox \
  --out /home/vercel-sandbox/project/assets \
  --inline
```

**Always pass `--inline`.** The host renders your `index.html` inside an `iframe` with `srcDoc`, so relative `src="assets/..."` paths will not resolve. `--inline` makes the script print a `data:` URL on stdout that you can paste directly into an `<img src="data:...">`. The image is still saved to disk for posterity, but you should reference it as a data URL in the HTML you write.

The script prints one data URL per generated file to **stdout** (so you can capture it) and a short status line to **stderr**. Use the stdout value as the `src` for your `<img>` tag.

### Flags

| Flag | Effect |
|---|---|
| `--model <id>` | Override the model. Default: `google/gemini-2.5-flash-image`. |
| `--name <stem>` | Filename stem (a UTC timestamp is appended automatically). |
| `--out <dir>` | Output directory. Default: `/home/vercel-sandbox/project/assets`. |
| `--inline` | Print `data:` URLs on stdout instead of file paths. Use this for `<img src>`. |
| `--no-fallback` | Do not retry with a text-only model if the image model is unavailable. |

Environment variables (already set in the sandbox by the host):

- `OPENROUTER_API_KEY` — the key used to call OpenRouter. Do not pass your own.
- `OPENROUTER_IMAGE_MODEL` — optional override for the default model id.

## Workflow for a hero image

1. Decide what the image should depict and write a single, dense prompt (subject, setting, light, mood, camera/composition, palette). See the prompt rules below.
2. Run the script with that prompt, a clear `--name` (e.g. `hero-fox`, `product-shot`, `avatar-1`), `--out` pointed at the project assets dir, and `--inline`.
3. Capture the data URL it prints.
4. Reference it from `index.html` with `<img src="<data url>" alt="..." />` and add a width/height or `loading="lazy"` / `decoding="async"` as appropriate. Use a meaningful `alt`. The data URL is large; keep total page weight under ~2MB if you have more than one image.
5. In the self-review pass, look at the rendered page and decide whether the image earns its place. If it looks generic, regenerate with a more specific prompt — do not ship a generic photo.

## Prompt rules that actually matter

The single biggest determinant of whether a generated image looks "AI" is the prompt.

- **Name a subject, not a mood.** "A weathered fisherman holding a knife on a trawler at dawn, 35mm film, shallow depth of field" beats "rustic coastal vibes".
- **One subject per image.** Compositional ambiguity produces mush. State what's in the frame, what the light is doing, and what the camera is doing.
- **Camera + lens language helps.** `35mm`, `50mm f/1.8`, `macro`, `top-down`, `wide angle`, `aerial`. It pins the framing the model defaults to.
- **Light is half the image.** "Rim light", "overcast softbox", "single hard key from camera-left", "golden hour backlight". Default flat lighting is the AI tell.
- **Say no to the things you don't want.** "No text, no watermark, no logo, no UI."
- **For product shots:** state the product, the surface it sits on, the background, the camera angle, the light. "A matte black ceramic pour-over kettle on a slate counter, three-quarter angle, soft window light from the right, shallow depth of field."
- **For people/avatars:** describe age range, expression, wardrobe, light, framing. Avoid ethnicity / specific identity attributes unless the user asked. Add "no text".
- **Size guidance:** for a full-bleed hero, ask for "16:9" or "wide aspect ratio" in the prompt. For a card image, ask for "square, centered subject, generous padding on all sides".

## What this skill is **not** for

- **Icons.** Use `lucide-react` SVGs. The image model cannot do small UI icons and will produce soft, branded-looking junk.
- **Logos.** Never generate a logo with an image model unless the user explicitly asked for AI imagery for the brand mark.
- **Diagrams, charts, schematics.** Inline SVG or a chart library.
- **Anything that must be sharp at 16×16.** Raster at icon sizes is wrong.
- **Photographic content for sensitive topics** (medical, legal, financial claims) without the user explicitly asking.

## After generating

The image lands on disk in the project tree (the script creates the dir) **and** as a data URL on stdout. Use the data URL in your `index.html` — never `src="assets/foo.png"`, those won't resolve in the host's `srcDoc` iframe. If the file is tiny (under ~5KB) the model probably returned a placeholder — regenerate.

## Failure modes to handle

- `OPENROUTER_API_KEY is not set` — the host didn't inject the key. Tell the user, do not try to set one.
- `no images returned by model` — the model gave only text. Rewrite the prompt to be more concrete, or try `--model google/gemini-2.5-flash-image` explicitly.
- Model 404 — the script auto-falls back to `google/gemini-2.5-flash` (text-only). Re-run without `--no-fallback` if you want the fallback, or with a different `--model` id.
- Network errors — the sandbox only has `openrouter.ai` in its egress allow-list. The image call goes through that, so it should work; anything else is a real network problem.

## Don't

- Don't generate more than ~4 images per page. Pages full of AI photos look like stock-photo soup.
- Don't generate an image you wouldn't be willing to look at twice. If a stock photo of "abstract gradient" would do the same job, use the gradient.
- Don't regenerate repeatedly hoping for a different result with the same prompt. Change the prompt.
- Don't reference generated images by relative file path in `index.html`. The host renders the page in a `srcDoc` iframe, so only data URLs (or absolute URLs) resolve.

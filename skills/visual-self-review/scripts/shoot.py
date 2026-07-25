#!/usr/bin/env python3
"""
shoot.py — render a page and capture what an agent needs in order to critique it.

    pip install playwright && playwright install chromium
    python shoot.py http://localhost:5173 --slices --console

Outputs into --out (default .review/):
    desktop-full.png      whole page, 1440 wide
    desktop-slice-01.png  viewport-height slices down the page
    mobile-full.png       whole page, 390 wide
    tablet-full.png       whole page, 834 wide
    console.txt           console errors + failed network requests
"""

import argparse
import asyncio
import sys
from pathlib import Path

VIEWPORTS = {
    "desktop": (1440, 900),
    "laptop": (1280, 800),
    "tablet": (834, 1112),
    "mobile": (390, 844),
    "mobile-sm": (320, 700),
}


async def capture(pw, url, name, size, args, out: Path, log):
    width, height = size
    browser = await pw.chromium.launch()
    ctx = await browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=2 if width <= 500 else 1,
        reduced_motion="reduce" if args.motion == "reduce" else "no-preference",
        color_scheme="dark" if args.dark else "light",
    )
    page = await ctx.new_page()

    page.on("console", lambda m: log.append(f"[{name}][console.{m.type}] {m.text}")
            if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: log.append(f"[{name}][pageerror] {e}"))
    page.on("requestfailed", lambda r: log.append(
        f"[{name}][requestfailed] {r.url} — {r.failure}"))

    try:
        await page.goto(url, wait_until="networkidle", timeout=45_000)
    except Exception as e:
        log.append(f"[{name}][navigation] {e}")
        await page.goto(url, wait_until="domcontentloaded", timeout=45_000)

    # Let webfonts land — swapped fallback fonts make every spacing judgment wrong.
    try:
        await page.evaluate("document.fonts && document.fonts.ready")
    except Exception:
        pass
    await page.wait_for_timeout(args.wait)

    if args.element:
        el = await page.query_selector(args.element)
        if el:
            await el.screenshot(path=str(out / f"{name}-element.png"))
        else:
            log.append(f"[{name}] selector not found: {args.element}")

    await page.screenshot(path=str(out / f"{name}-full.png"), full_page=True)

    if args.slices:
        total = await page.evaluate("document.body.scrollHeight")
        n = min(int(total / height) + 1, args.max_slices)
        for i in range(n):
            y = i * height
            await page.evaluate(f"window.scrollTo(0, {y})")
            # scroll-triggered reveals need a beat to fire
            await page.wait_for_timeout(args.slice_wait)
            await page.screenshot(path=str(out / f"{name}-slice-{i + 1:02d}.png"))
        await page.evaluate("window.scrollTo(0, 0)")

    await browser.close()


async def main():
    p = argparse.ArgumentParser()
    p.add_argument("url")
    p.add_argument("--out", default=".review")
    p.add_argument("--viewports", default="desktop,mobile")
    p.add_argument("--slices", action="store_true")
    p.add_argument("--max-slices", type=int, default=8)
    p.add_argument("--slice-wait", type=int, default=450)
    p.add_argument("--wait", type=int, default=600)
    p.add_argument("--element")
    p.add_argument("--motion", choices=["normal", "reduce"], default="normal")
    p.add_argument("--dark", action="store_true")
    p.add_argument("--console", action="store_true")
    args = p.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    log = []

    from playwright.async_api import async_playwright

    names = [v.strip() for v in args.viewports.split(",") if v.strip()]
    unknown = [n for n in names if n not in VIEWPORTS]
    if unknown:
        sys.exit(f"unknown viewport(s): {unknown}. choose from {list(VIEWPORTS)}")

    async with async_playwright() as pw:
        for n in names:
            await capture(pw, args.url, n, VIEWPORTS[n], args, out, log)

    shots = sorted(f.name for f in out.glob("*.png"))
    print(f"{len(shots)} shots → {out}/")
    for s in shots:
        print(f"  {s}")

    if args.console or log:
        (out / "console.txt").write_text("\n".join(log) or "clean — no errors\n")
        errs = [l for l in log if "error" in l.lower() or "failed" in l.lower()]
        if errs:
            print(f"\n{len(errs)} console/network problems — see {out}/console.txt")
            for e in errs[:10]:
                print(f"  {e}")


if __name__ == "__main__":
    asyncio.run(main())

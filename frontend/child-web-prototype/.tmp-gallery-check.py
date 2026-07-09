"""
Task 6 TDD: renderEvolutionRail — 图鉴弹窗 5 阶同地平线阶梯
RED → GREEN test.

Assert:
  1. #evolutionRail svg use count === 5
  2. href values are #sp-dragon-1 .. #sp-dragon-5 in order
  3. Zero uncaught JS errors

Screenshot → .tmp-shot-gallery.png
"""

import asyncio
import os
import sys
from pathlib import Path

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("ERROR: playwright not installed. Run: pip install playwright && playwright install chromium")
    sys.exit(1)

HTML_PATH = Path(__file__).parent / "child-homepage.html"
SHOT_PATH = Path(__file__).parent / ".tmp-shot-gallery.png"


async def run():
    errors = []
    failures = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Capture JS errors
        page.on("pageerror", lambda err: errors.append(str(err)))

        await page.goto(HTML_PATH.as_uri())
        await page.wait_for_load_state("networkidle")

        # Open the 图鉴 modal
        btn = page.locator("#openEvolutionGalleryButton")
        await btn.click()
        await page.wait_for_timeout(400)

        # Assert: 5 <use> elements inside #evolutionRail svg
        uses = await page.locator("#evolutionRail svg use").all()
        if len(uses) != 5:
            failures.append(f"Expected 5 <use> elements, got {len(uses)}")
        else:
            # Assert hrefs in order
            for i, use in enumerate(uses, 1):
                href = await use.get_attribute("href")
                expected = f"#sp-dragon-{i}"
                if href != expected:
                    failures.append(f"use[{i-1}] href={href!r}, expected {expected!r}")

        # Screenshot
        await page.screenshot(path=str(SHOT_PATH), full_page=False)

        await browser.close()

    print(f"JS errors: {errors}")
    if failures:
        print("FAIL:")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    elif errors:
        print("FAIL: JS errors detected")
        sys.exit(1)
    else:
        print("PASS: 5 dragon uses in order, zero JS errors")
        print(f"Screenshot: {SHOT_PATH}")


asyncio.run(run())

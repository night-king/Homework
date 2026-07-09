"""
Task 4 TDD check: assert #petStageMount has svg>use with href="#sp-dragon-1" at default level 1.
Saves .tmp-shot-dragon-1.png for visual inspection.
"""
import asyncio
import pathlib
import sys

from playwright.async_api import async_playwright

PAGE = pathlib.Path(__file__).parent / "child-homepage.html"
SHOT = pathlib.Path(__file__).parent / ".tmp-shot-dragon-1.png"


async def main() -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        await page.goto(PAGE.as_uri())
        await page.wait_for_load_state("domcontentloaded")

        # Assert use element exists with correct href
        use_el = await page.query_selector("#petStageMount svg use")
        assert use_el is not None, "FAIL: #petStageMount svg use not found"

        href = await use_el.get_attribute("href")
        assert href == "#sp-dragon-1", f"FAIL: href was {href!r}, expected '#sp-dragon-1'"

        # Screenshot
        mount = await page.query_selector("#petStageMount")
        if mount:
            await mount.screenshot(path=str(SHOT))
            print(f"Screenshot saved: {SHOT}")
        else:
            await page.screenshot(path=str(SHOT))
            print(f"Full-page screenshot saved: {SHOT}")

        if errors:
            print(f"WARN: uncaught JS errors: {errors}", file=sys.stderr)

        await browser.close()

    print("PASS: #sp-dragon-1 is rendered in #petStageMount")


asyncio.run(main())

"""
T2 review: verify render() completes without uncaught exceptions on page load.
Checks that #dayStrip and #growthFill exist and that zero page errors are thrown.
"""

import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

HTML_PATH = Path(__file__).parent / "child-homepage.html"
FILE_URL = HTML_PATH.as_uri()

async def main():
    page_errors = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()

        page.on("pageerror", lambda err: page_errors.append(str(err)))

        console_errors = []
        def on_console(msg):
            if msg.type == "error":
                console_errors.append(msg.text)
        page.on("console", on_console)

        await page.goto(FILE_URL, wait_until="domcontentloaded")
        # Give JS a tick to run any deferred render calls
        await page.wait_for_timeout(500)

        # Assert non-pet elements exist
        day_strip = await page.query_selector("#dayStrip")
        growth_fill = await page.query_selector("#growthFill")

        await browser.close()

    errors = page_errors + console_errors
    missing = []
    if day_strip is None:
        missing.append("#dayStrip")
    if growth_fill is None:
        missing.append("#growthFill")

    if errors or missing:
        print("FAIL:")
        for e in errors:
            print(f"  page error: {e}")
        for m in missing:
            print(f"  missing element: {m}")
    else:
        print("PASS nocrash")

asyncio.run(main())

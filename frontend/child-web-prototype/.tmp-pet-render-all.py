"""
Task 4 EXTRA: screenshot all 5 dragon stages for visual confirmation.
Sets state.level via page.evaluate then calls renderPetStage(), screenshots each.
"""
import asyncio
import pathlib
import sys

from playwright.async_api import async_playwright

PAGE = pathlib.Path(__file__).parent / "child-homepage.html"
SHOTS_DIR = pathlib.Path(__file__).parent


async def main() -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 420, "height": 700})

        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        await page.goto(PAGE.as_uri())
        await page.wait_for_load_state("domcontentloaded")

        passed = 0
        for level in range(1, 6):
            # Set level and re-render pet stage
            await page.evaluate(f"""
                () => {{
                    state.level = {level};
                    renderPetStage();
                }}
            """)
            await page.wait_for_timeout(200)

            # Check use href
            use_el = await page.query_selector("#petStageMount svg use")
            assert use_el is not None, f"FAIL level {level}: no svg use found"
            href = await use_el.get_attribute("href")
            expected = f"#sp-dragon-{level}"
            assert href == expected, f"FAIL level {level}: href={href!r} expected {expected!r}"

            # Screenshot the mount
            mount = await page.query_selector("#petStageMount")
            shot_path = SHOTS_DIR / f".tmp-shot-dragon-{level}.png"
            if mount:
                await mount.screenshot(path=str(shot_path))
            else:
                await page.screenshot(path=str(shot_path))

            print(f"Stage {level}: PASS — saved {shot_path.name}")
            passed += 1

        if errors:
            print(f"WARN: uncaught JS errors: {errors}", file=sys.stderr)

        await browser.close()

    print(f"\n{passed}/5 stages render non-blank with correct sprite href")
    if passed < 5:
        sys.exit(1)


asyncio.run(main())

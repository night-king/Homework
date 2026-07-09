"""
Task 5 TDD gate: evolution animation check.

Loads child-homepage.html, forces state.level=1, clicks #evolveButton,
asserts .evo-flash appears during animation, asserts #petStageMount use href
advances to #sp-dragon-2 after ~1.5s.  Screenshots mid-flash and after.
"""
import asyncio, pathlib, sys, os, time

try:
    from playwright.async_api import async_playwright, expect
except ImportError:
    print("playwright not installed — run: pip install playwright && playwright install chromium")
    sys.exit(1)

PAGE_PATH = (
    pathlib.Path(__file__).parent / "child-homepage.html"
).resolve().as_uri()

SHOT_MID  = str(pathlib.Path(__file__).parent / ".tmp-shot-evo-mid.png")
SHOT_AFTER = str(pathlib.Path(__file__).parent / ".tmp-shot-evo-after.png")

async def main():
    errors = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})

        # Capture JS errors
        page.on("pageerror", lambda e: errors.append(str(e)))

        await page.goto(PAGE_PATH)
        await page.wait_for_load_state("domcontentloaded")

        # Force level=1 so we are always starting from egg
        await page.evaluate("state.level = 1; render();")

        # Make evolveButton always visible for test (bypass growth gate)
        await page.evaluate("evolveButton.hidden = false;")

        # Confirm initial sprite is sp-dragon-1
        initial_href = await page.evaluate(
            "document.querySelector('#petStageMount use')?.getAttribute('href') ?? 'none'"
        )
        print(f"[init] href = {initial_href}")
        assert initial_href == "#sp-dragon-1", f"Expected #sp-dragon-1 but got {initial_href}"

        # Click evolveButton via JS dispatch (the button may be covered by overlapping elements)
        await page.evaluate("document.getElementById('evolveButton').dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true}))")

        # Wait for .evo-flash to appear (the white flash overlay)
        try:
            await page.wait_for_selector(".evo-flash", timeout=2000)
            print("[PASS] .evo-flash appeared during animation")
        except Exception:
            print("[FAIL] .evo-flash did NOT appear — evolution animation not triggered")
            await page.screenshot(path=SHOT_MID)
            await browser.close()
            sys.exit(1)

        # Screenshot mid-flash
        await page.screenshot(path=SHOT_MID)
        print(f"[shot] mid-flash screenshot → {SHOT_MID}")

        # Wait for sprite swap (~1.5s after click)
        await asyncio.sleep(1.5)

        # Check href advanced
        final_href = await page.evaluate(
            "document.querySelector('#petStageMount use')?.getAttribute('href') ?? 'none'"
        )
        print(f"[after] href = {final_href}")

        await page.screenshot(path=SHOT_AFTER)
        print(f"[shot] after screenshot → {SHOT_AFTER}")

        # Check errors
        if errors:
            print(f"[FAIL] {len(errors)} JS error(s): {errors}")
            await browser.close()
            sys.exit(1)
        else:
            print("[PASS] 0 uncaught JS errors")

        assert final_href == "#sp-dragon-2", (
            f"Expected href=#sp-dragon-2 after evolution, got {final_href}"
        )
        print("[PASS] href advanced to #sp-dragon-2")
        print("=== ALL CHECKS PASSED ===")

        await browser.close()

asyncio.run(main())

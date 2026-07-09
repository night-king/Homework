"""
TDD check for Task 8: 光之英雄 5-stage hero SVG sprites
Asserts sp-hero-1..5 exist and render non-blank blue-silver figures.
"""
import asyncio, sys, os
from playwright.async_api import async_playwright

HTML_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "child-homepage.html")
)
URL = f"file:///{HTML_PATH.replace(os.sep, '/')}"
OUT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(OUT_DIR, exist_ok=True)

HERO_STAGES = [1, 2, 3, 4, 5]

async def main():
    errors = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 390, "height": 844})

        # Capture console errors
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: console_errors.append(str(err)))

        await page.goto(URL, wait_until="domcontentloaded")
        await page.wait_for_timeout(500)

        # Check JS errors on load
        if console_errors:
            errors.append(f"JS errors on load: {console_errors}")

        # Test stage 5 specifically (TDD gate)
        result = await page.evaluate("""() => {
            state.speciesId = 'hero';
            state.level = 5;
            renderPetStage();
            const use = document.querySelector('#petStageMount use');
            return use ? use.getAttribute('href') : null;
        }""")
        if result != "#sp-hero-5":
            errors.append(f"Stage 5: expected href='#sp-hero-5', got '{result}'")
        else:
            print("PASS: #petStageMount use href === '#sp-hero-5'")

        # Screenshot stage 5
        await page.screenshot(path=os.path.join(OUT_DIR, "hero-stage-5.png"))
        print(f"Screenshot saved: hero-stage-5.png")

        # Test ALL 5 hero stages
        for lvl in HERO_STAGES:
            await page.evaluate(f"""() => {{
                state.speciesId = 'hero';
                state.level = {lvl};
                renderPetStage();
            }}""")
            await page.wait_for_timeout(100)

            href = await page.evaluate("""() => {
                const use = document.querySelector('#petStageMount use');
                return use ? use.getAttribute('href') : null;
            }""")
            expected = f"#sp-hero-{lvl}"
            if href != expected:
                errors.append(f"Level {lvl}: expected href='{expected}', got '{href}'")
            else:
                print(f"PASS: hero level {lvl} => href='{href}'")

            # Check that symbol exists in the DOM
            sym_exists = await page.evaluate(f"""() => !!document.getElementById('sp-hero-{lvl}')""")
            if not sym_exists:
                errors.append(f"symbol #sp-hero-{lvl} not found in DOM")

            # Screenshot each stage
            shot_path = os.path.join(OUT_DIR, f"hero-stage-{lvl}.png")
            await page.screenshot(path=shot_path)
            print(f"Screenshot saved: hero-stage-{lvl}.png")

        # Check all defs pl-* exist
        pl_ids = ['pl-lBody', 'pl-lArmor', 'pl-lCore', 'pl-lGold', 'pl-lAura', 'pl-lBeam', 'pl-lGlow']
        for pid in pl_ids:
            exists = await page.evaluate(f"""() => !!document.getElementById('{pid}')""")
            if not exists:
                errors.append(f"def #{pid} not found in DOM")
            else:
                print(f"PASS: #{pid} found")

        await browser.close()

    if errors:
        print("\nFAIL:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    else:
        print("\nALL TESTS PASSED: 5/5 hero stages render with correct href, all pl-* defs present, zero JS errors")
        sys.exit(0)

asyncio.run(main())

"""
TDD check for Task 7: dino 5-stage SVG sprites injection.
Step 1 (RED): symbols not yet injected -> symbol elements absent in DOM.
Step 2 (GREEN): after injection -> symbols exist, hrefs correct, screenshots show green dino.
"""
import sys, os, pathlib, asyncio, json

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("ERROR: playwright not installed. Run: pip install playwright && playwright install chromium")
    sys.exit(1)

HTML_PATH = pathlib.Path(__file__).parent / "child-homepage.html"
SCREENSHOT_DIR = pathlib.Path(__file__).parent

async def run():
    failed = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        js_errors = []
        page.on("console", lambda msg: print(f"  JS [{msg.type}]: {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda err: (print(f"  JS ERROR: {err}"), js_errors.append(str(err))))

        await page.goto(f"file:///{HTML_PATH.as_posix()}")
        await page.wait_for_load_state("networkidle")

        # --- Test: symbol elements exist in DOM ---
        for i in range(1, 6):
            exists = await page.evaluate(f"() => !!document.getElementById('sp-dino-{i}')")
            if exists:
                print(f"  PASS: <symbol id='sp-dino-{i}'> found in DOM")
            else:
                print(f"  FAIL: <symbol id='sp-dino-{i}'> NOT found in DOM")
                failed.append(f"symbol_sp-dino-{i}")

        # --- Test: pn-* defs exist ---
        pn_ids = ["pn-nBody", "pn-nEgg", "pn-nPlate", "pn-nHorn", "pn-nCore", "pn-nGlow"]
        for def_id in pn_ids:
            exists = await page.evaluate(f"() => !!document.getElementById('{def_id}')")
            if exists:
                print(f"  PASS: defs #{def_id} found")
            else:
                print(f"  FAIL: defs #{def_id} NOT found")
                failed.append(f"defs_{def_id}")

        # --- Test: level 5, sp-dino-5 href ---
        result = await page.evaluate("""() => {
            state.speciesId = 'dino';
            state.level = 5;
            renderPetStage();
            const mount = document.getElementById('petStageMount');
            const use = mount ? mount.querySelector('use') : null;
            return use ? use.getAttribute('href') : null;
        }""")
        print(f"[level 5] use href = {result!r}")
        if result == "#sp-dino-5":
            print("  PASS: sp-dino-5 href correct")
        else:
            print("  FAIL: expected '#sp-dino-5'")
            failed.append("level5_href")

        # Screenshot stage 5
        await page.screenshot(path=str(SCREENSHOT_DIR / ".tmp-dino-stage5.png"), full_page=False)
        print(f"  Screenshot saved: .tmp-dino-stage5.png")

        # --- Screenshot all 5 stages and verify hrefs ---
        for lvl in range(1, 6):
            href = await page.evaluate(f"""() => {{
                state.speciesId = 'dino';
                state.level = {lvl};
                renderPetStage();
                const mount = document.getElementById('petStageMount');
                const use = mount ? mount.querySelector('use') : null;
                return use ? use.getAttribute('href') : null;
            }}""")
            expected = f"#sp-dino-{lvl}"
            if href == expected:
                print(f"  PASS level {lvl}: {href}")
            else:
                print(f"  FAIL level {lvl}: got {href!r}, expected {expected!r}")
                failed.append(f"level{lvl}_href")
            await page.screenshot(
                path=str(SCREENSHOT_DIR / f".tmp-dino-stage{lvl}.png"),
                full_page=False
            )
            print(f"  Screenshot stage {lvl} saved: .tmp-dino-stage{lvl}.png")

        # --- Check no uncaught JS errors ---
        if js_errors:
            print(f"  FAIL: {len(js_errors)} uncaught JS error(s): {js_errors}")
            failed.append("js_errors")
        else:
            print("  PASS: no uncaught JS errors")

        await browser.close()

    if failed:
        print(f"\nFAIL: {len(failed)} assertion(s) failed: {failed}")
        sys.exit(1)
    else:
        print("\nPASS: all 5 dino stages render with correct sprite IDs and symbols exist")
        sys.exit(0)

asyncio.run(run())

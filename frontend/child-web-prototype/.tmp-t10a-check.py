"""
Task 10a verification script.
RED  → run before the fix to see failures.
GREEN → run after the fix to confirm all pass.
"""
import re
import sys
import time
import pathlib

from playwright.sync_api import sync_playwright, Error as PlaywrightError

FILE = pathlib.Path(__file__).parent / "child-homepage.html"
URL  = FILE.as_uri()

SPECIES_STAGES = {
    # level: expected stage name
    1: "龙蛋",
    2: "破壳萌龙",
    3: "成长幼龙",
    4: "展翼幼龙",
    5: "喷火成龙",
}

errors = []

def fail(msg):
    errors.append(msg)
    print(f"  FAIL: {msg}")

def ok(msg):
    print(f"  OK  : {msg}")


# ── Grep assertions (no browser needed) ────────────────────────────────────
print("\n=== Grep assertions (dead-code removed) ===")
src = FILE.read_text(encoding="utf-8")

dead_patterns = {
    ".element-switcher":           r"\.element-switcher",
    ".pet-3d-canvas":              r"\.pet-3d-canvas",
    "createUnlockedEvolutionAvatar": r"createUnlockedEvolutionAvatar",
    "createLockedDexAvatar":       r"createLockedDexAvatar",
    # monkey-patch remnants
    "_origRenderPetStage":         r"_origRenderPetStage",
}

for label, pattern in dead_patterns.items():
    if re.search(pattern, src):
        fail(f"{label!r} still present in source")
    else:
        ok(f"{label!r} not found (good)")


# ── Browser tests ────────────────────────────────────────────────────────
print("\n=== Browser tests ===")

with sync_playwright() as p:
    browser = p.chromium.launch()
    js_errors = []

    def on_js_error(exc):
        js_errors.append(str(exc))

    # ── Test 1: stage-name labels at levels 1, 3, 5 ────────────────────
    print("\n-- Test 1: stage-name labels at levels 1, 3, 5 --")
    for level, expected_name in [(1, "龙蛋"), (3, "成长幼龙"), (5, "喷火成龙")]:
        page = browser.new_page()
        page.on("pageerror", on_js_error)
        page.goto(URL)

        # Close selection overlay if present
        page.evaluate("""
            const ov = document.getElementById('petSelectOverlay');
            if (ov) ov.remove();
        """)

        # Set species = dragon, level = target, then render
        page.evaluate(f"""
            window._petSpeciesReady = true;
            state.speciesId = 'dragon';
            state.level = {level};
            render();
        """)

        # petStageName (evolution card strong)
        stage_name_el = page.locator("#petStageName")
        stage_text = stage_name_el.inner_text().strip()
        if stage_text == expected_name:
            ok(f"  level {level}: #petStageName = {stage_text!r}")
        else:
            fail(f"  level {level}: #petStageName = {stage_text!r}, expected {expected_name!r}")

        # petHeroStageName
        hero_name_el = page.locator("#petHeroStageName")
        hero_text = hero_name_el.inner_text().strip()
        if hero_text == expected_name:
            ok(f"  level {level}: #petHeroStageName = {hero_text!r}")
        else:
            fail(f"  level {level}: #petHeroStageName = {hero_text!r}, expected {expected_name!r}")

        # Evolution panel: not "已满级" at level 1, IS "已满级" at level 5
        evo_trigger_text = page.locator("#petEvolutionTrigger").inner_text().strip()
        if level == 1:
            if "已满级" not in evo_trigger_text:
                ok(f"  level 1: evolution trigger not '已满级' (good): {evo_trigger_text!r}")
            else:
                fail(f"  level 1: evolution trigger wrongly shows '已满级'")
        if level == 5:
            if "已满级" in evo_trigger_text:
                ok(f"  level 5: evolution trigger correctly shows '已满级'")
            else:
                fail(f"  level 5: evolution trigger should show '已满级', got {evo_trigger_text!r}")

        page.close()

    # ── Test 2: playEvolution() updates stage label + triggers render() ──
    print("\n-- Test 2: playEvolution(2) updates label to '破壳萌龙' --")
    page = browser.new_page()
    page.on("pageerror", on_js_error)
    page.goto(URL)

    # Close overlay, set up level 1 dragon
    page.evaluate("""
        const ov = document.getElementById('petSelectOverlay');
        if (ov) ov.remove();
        window._petSpeciesReady = true;
        state.speciesId = 'dragon';
        state.level = 1;
        render();
    """)

    # Trigger evolution animation to level 2
    page.evaluate("playEvolution(2);")

    # Wait for Beat 4 callback (~2.3s) + a small buffer
    page.wait_for_timeout(2600)

    # Check that level advanced and render() updated the badge
    badge_level = page.locator("#badgeLevel").inner_text().strip()
    if badge_level == "2":
        ok(f"  #badgeLevel = {badge_level!r} (render() ran at Beat 4)")
    else:
        fail(f"  #badgeLevel = {badge_level!r}, expected '2' (render() may not have run)")

    stage_text = page.locator("#petStageName").inner_text().strip()
    if stage_text == "破壳萌龙":
        ok(f"  #petStageName = {stage_text!r} after evolution (correct)")
    else:
        fail(f"  #petStageName = {stage_text!r} after evolution, expected '破壳萌龙'")

    page.close()

    # ── Test 3: no uncaught JS errors ────────────────────────────────────
    print("\n-- Test 3: zero uncaught JS errors --")
    if js_errors:
        for e in js_errors:
            fail(f"  JS error: {e}")
    else:
        ok("  No uncaught JS errors")

    browser.close()


# ── Summary ──────────────────────────────────────────────────────────────
print("\n=== Summary ===")
if errors:
    print(f"FAILED ({len(errors)} assertion(s)):")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
else:
    print("ALL PASSED")
    sys.exit(0)

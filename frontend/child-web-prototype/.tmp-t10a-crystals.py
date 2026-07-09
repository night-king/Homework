"""
Task 10a crystals-retirement verification script.
Confirms:
  1. Grep: '晶核' absent from child-homepage.html source.
  2. Runtime: petEvolutionHint contains '成长值' and next stage name, NOT '晶核'.
  3. Header has no visible 晶核 badge (element removed / absent).
  4. playEvolution(2) from level 1 → stage advances to '破壳萌龙'; growth-only gate.
  5. Zero uncaught JS errors.
"""
import re
import sys
import pathlib

from playwright.sync_api import sync_playwright

FILE = pathlib.Path(__file__).parent / "child-homepage.html"
URL  = FILE.as_uri()

errors = []

def fail(msg):
    errors.append(msg)
    print(f"  FAIL: {msg}")

def ok(msg):
    print(f"  OK  : {msg}")


# ── 1. Grep assertion ──────────────────────────────────────────────────────
print("\n=== 1. Grep: no 晶核 in source ===")
src = FILE.read_text(encoding="utf-8")

if "晶核" in src:
    # Find all occurrences for diagnostics
    for i, line in enumerate(src.splitlines(), 1):
        if "晶核" in line:
            print(f"  line {i}: {line.strip()}")
    fail("'晶核' still present in child-homepage.html")
else:
    ok("'晶核' not found anywhere in source")


# ── 2–5. Browser tests ────────────────────────────────────────────────────
print("\n=== Browser tests ===")

with sync_playwright() as p:
    browser = p.chromium.launch()
    js_errors = []

    def on_js_error(exc):
        js_errors.append(str(exc))

    # ── Test 2: petEvolutionHint text (level 1, growth=58) ──
    print("\n-- Test 2: petEvolutionHint shows 成长值 and next stage name --")
    page = browser.new_page()
    page.on("pageerror", on_js_error)
    page.goto(URL)

    # Use growth=10 so canEvolve() is false (nextGrowth for dragon lv1 = 36)
    page.evaluate("""
        const ov = document.getElementById('petSelectOverlay');
        if (ov) ov.remove();
        state.speciesId = 'dragon';
        state.level = 1;
        state.growth = 10;
        render();
    """)

    hint_text = page.locator("#petEvolutionHint").inner_text().strip()
    print(f"  petEvolutionHint text (growth=10): {hint_text!r}")

    if "晶核" in hint_text:
        fail(f"petEvolutionHint still contains '晶核': {hint_text!r}")
    else:
        ok("petEvolutionHint does NOT contain '晶核'")

    if "成长值" in hint_text:
        ok(f"petEvolutionHint contains '成长值': {hint_text!r}")
    else:
        fail(f"petEvolutionHint missing '成长值': {hint_text!r}")

    if "破壳萌龙" in hint_text:
        ok(f"petEvolutionHint contains next stage name '破壳萌龙'")
    else:
        fail(f"petEvolutionHint missing next stage name '破壳萌龙': {hint_text!r}")

    page.close()

    # ── Test 3: no badgeCrystal / 晶核 badge in header ──
    print("\n-- Test 3: no 晶核 badge in header --")
    page = browser.new_page()
    page.on("pageerror", on_js_error)
    page.goto(URL)

    page.evaluate("""
        const ov = document.getElementById('petSelectOverlay');
        if (ov) ov.remove();
        state.speciesId = 'dragon';
        state.level = 1;
        render();
    """)

    badge_crystal = page.locator("#badgeCrystal")
    count = badge_crystal.count()
    if count == 0:
        ok("#badgeCrystal element absent from DOM (removed)")
    else:
        # Check if it's hidden/invisible
        visible = badge_crystal.first.is_visible()
        if visible:
            fail(f"#badgeCrystal is still visible in header (count={count})")
        else:
            ok(f"#badgeCrystal exists but is hidden (count={count})")

    # Also grep the rendered HTML for visible 晶核 text
    body_text = page.locator("body").inner_text()
    if "晶核" in body_text:
        fail(f"'晶核' found in rendered page text")
    else:
        ok("'晶核' not found in rendered page text")

    page.close()

    # ── Test 4: playEvolution(2) advances to 破壳萌龙 (growth-only) ──
    print("\n-- Test 4: playEvolution(2) → stage 破壳萌龙 --")
    page = browser.new_page()
    page.on("pageerror", on_js_error)
    page.goto(URL)

    page.evaluate("""
        const ov = document.getElementById('petSelectOverlay');
        if (ov) ov.remove();
        state.speciesId = 'dragon';
        state.level = 1;
        state.growth = 100;  // max growth so canEvolve() returns true
        state.crystals = 0;  // no crystals — should still evolve growth-only
        render();
        playEvolution(2);
    """)

    # Wait for Beat 4 callback (~2.3s) + buffer
    page.wait_for_timeout(2700)

    badge_level = page.locator("#badgeLevel").inner_text().strip()
    stage_text = page.locator("#petStageName").inner_text().strip()

    if badge_level == "2":
        ok(f"  #badgeLevel = {badge_level!r} after evolution")
    else:
        fail(f"  #badgeLevel = {badge_level!r}, expected '2'")

    if stage_text == "破壳萌龙":
        ok(f"  #petStageName = {stage_text!r} after evolution (growth-only gate works)")
    else:
        fail(f"  #petStageName = {stage_text!r}, expected '破壳萌龙'")

    page.close()

    # ── Test 5: zero uncaught JS errors ──
    print("\n-- Test 5: zero uncaught JS errors --")
    if js_errors:
        for e in js_errors:
            fail(f"  JS error: {e}")
    else:
        ok("No uncaught JS errors")

    browser.close()


# ── Summary ───────────────────────────────────────────────────────────────
print("\n=== Summary ===")
if errors:
    print(f"FAILED ({len(errors)} assertion(s)):")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
else:
    print("ALL PASSED")
    sys.exit(0)

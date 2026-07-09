"""
Final regression + fix-verification test for child-homepage pet redesign.
Run: python .tmp-final.py
Requires: pip install playwright && python -m playwright install chromium

Notes:
- localStorage is seeded via add_init_script (runs in the page's own file:// origin
  before the page's own scripts), sidestepping the about:blank -> file:// SecurityError.
- The page's `state`, `SPECIES`, `canEvolve`, etc. are top-level `const`/`function`
  declarations in a classic <script>. `const` does NOT attach to window, so we
  reference them as BARE globals inside evaluate (they resolve via the realm's
  global lexical scope), never as `window.state`.
- Species keys are: dragon, dino, hero.
"""
import asyncio
from playwright.async_api import async_playwright

URL = "file:///D:/WorkSpace/night-king/Homework/frontend/child-web-prototype/child-homepage.html"
VIEWPORT = {"width": 430, "height": 860}

SPECIES = ["dragon", "dino", "hero"]
LEVELS = [1, 2, 3, 4, 5]


async def new_page_with_species(browser, species=None, clear=False):
    """New context+page. Seeds localStorage via init script BEFORE page scripts run."""
    ctx = await browser.new_context(viewport=VIEWPORT)
    page = await ctx.new_page()
    js_errors = []
    page.on("pageerror", lambda e: js_errors.append(str(e)))
    if clear:
        await page.add_init_script("try { localStorage.removeItem('hw_pet_species'); } catch(e) {}")
    elif species:
        await page.add_init_script(
            f"try {{ localStorage.setItem('hw_pet_species', '{species}'); }} catch(e) {{}}"
        )
    await page.goto(URL)
    await page.wait_for_load_state("domcontentloaded")
    return ctx, page, js_errors


async def main():
    errors = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # ---- REGRESSION: all species x all stages render non-blank ----
        print("=== Regression: species x stages ===")
        for sp in SPECIES:
            for lvl in LEVELS:
                ctx, page, js_errors = await new_page_with_species(browser, species=sp)

                await page.evaluate(f"""() => {{
                    if (typeof state !== 'undefined') {{
                        state.speciesId = '{sp}';
                        state.level = {lvl};
                    }}
                    if (typeof _petSpeciesReady !== 'undefined') {{ /* set below */ }}
                }}""")
                # _petSpeciesReady is a top-level `let`; reassign it as bare global
                await page.evaluate("() => { try { _petSpeciesReady = true; } catch(e) {} }")
                await page.evaluate("() => { if (typeof renderPetStage === 'function') renderPetStage(); }")

                use_href = await page.evaluate("""() => {
                    const use = document.querySelector('#petStageMount use');
                    return use ? use.getAttribute('href') : null;
                }""")
                bb = await page.evaluate("""() => {
                    const mount = document.getElementById('petStageMount');
                    if (!mount) return null;
                    const r = mount.getBoundingClientRect();
                    return { w: r.width, h: r.height };
                }""")

                expected_id = f"#sp-{sp}-{lvl}"
                ok = (use_href == expected_id) and bb and bb['w'] > 0 and bb['h'] > 0
                status = "PASS" if ok else "FAIL"
                print(f"  [{status}] {sp} L{lvl}: href={use_href} (expected {expected_id}), box={bb}")
                if not ok:
                    errors.append(f"Regression fail: {sp} L{lvl}: href={use_href}, box={bb}")
                if js_errors:
                    print(f"    JS ERRORS: {js_errors}")
                    errors.extend([f"JS error {sp} L{lvl}: {e}" for e in js_errors])
                await ctx.close()

        # ---- REGRESSION: evolution rail has 5 use elements ----
        print("\n=== Regression: evolution rail ===")
        ctx, page, js_errors = await new_page_with_species(browser, species="dragon")
        rail_count = await page.evaluate("""() => {
            if (typeof renderEvolutionRail === 'function') renderEvolutionRail();
            return document.querySelectorAll('#evolutionRail svg use').length;
        }""")
        ok = rail_count == 5
        print(f"  [{'PASS' if ok else 'FAIL'}] Evolution rail use count: {rail_count} (expected 5)")
        if not ok:
            errors.append(f"Rail count {rail_count} != 5")
        if js_errors:
            errors.extend([f"Rail JS error: {e}" for e in js_errors])
        await ctx.close()

        # ---- REGRESSION: selection overlay flow + FIX 2 ----
        print("\n=== Regression: first-visit selection + FIX 2 ===")
        ctx, page, js_errors = await new_page_with_species(browser, clear=True)

        card_count = await page.evaluate("() => document.querySelectorAll('.pet-select-card').length")
        print(f"  [{'PASS' if card_count == 3 else 'FAIL'}] 3 selection cards shown: {card_count}")
        if card_count != 3:
            errors.append(f"Expected 3 selection cards, got {card_count}")

        stage_name_before = await page.evaluate("() => document.getElementById('petStageName')?.textContent")

        await page.evaluate("() => { if (typeof choosePet === 'function') choosePet('dino'); }")
        await page.wait_for_timeout(100)

        stage_name = await page.evaluate("() => document.getElementById('petStageName')?.textContent")
        hero_name = await page.evaluate("() => document.getElementById('petHeroStageName')?.textContent")
        mood_tag = await page.evaluate("() => document.getElementById('petMoodTag')?.textContent")
        expected_name = await page.evaluate("() => SPECIES.dino.stages[0].name")
        dino_l1 = expected_name  # '恐龙蛋'

        name_ok = (stage_name == expected_name) and (hero_name == expected_name)
        print(f"  [FIX2][{'PASS' if name_ok else 'FAIL'}] After choosePet('dino'): "
              f"petStageName='{stage_name}', petHeroStageName='{hero_name}', expected='{expected_name}'")
        print(f"        (before-choose label was '{stage_name_before}'; moodTag now '{mood_tag}')")
        if not name_ok:
            errors.append(f"FIX2: label '{stage_name}'/'{hero_name}' after choosePet('dino'), expected '{expected_name}'")

        overlay_gone = await page.evaluate("() => document.getElementById('petSelectOverlay') === null")
        print(f"  [{'PASS' if overlay_gone else 'FAIL'}] Selection overlay removed after choosePet")
        if not overlay_gone:
            errors.append("Selection overlay not removed after choosePet")

        ls_val = await page.evaluate("() => { try { return localStorage.getItem('hw_pet_species'); } catch(e) { return null; } }")
        ls_ok = ls_val == "dino"
        print(f"  [{'PASS' if ls_ok else 'FAIL'}] localStorage hw_pet_species='{ls_val}' (expected 'dino')")
        if not ls_ok:
            errors.append(f"localStorage not set to dino: {ls_val}")

        if js_errors:
            errors.extend([f"Selection JS error: {e}" for e in js_errors])
        await ctx.close()

        # ---- REGRESSION: reload skips overlay when species saved ----
        print("\n=== Regression: reload skips overlay ===")
        ctx, page, js_errors = await new_page_with_species(browser, species="dino")
        card_count2 = await page.evaluate("() => document.querySelectorAll('.pet-select-card').length")
        skip_ok = card_count2 == 0
        print(f"  [{'PASS' if skip_ok else 'FAIL'}] Saved species -> no overlay cards: {card_count2}")
        if not skip_ok:
            errors.append(f"Reload showed {card_count2} cards, expected 0")
        if js_errors:
            errors.extend([f"Reload JS error: {e}" for e in js_errors])
        await ctx.close()

        # ---- FIX 1 CHECK: growth-gate + reset + loop playable ----
        print("\n=== FIX 1: evolve gate + growth reset + loop ===")
        ctx, page, js_errors = await new_page_with_species(browser, species="dragon")

        can_evolve_init = await page.evaluate("() => canEvolve()")
        level_init = await page.evaluate("() => state.level")
        growth_init = await page.evaluate("() => state.growth")
        print(f"  Initial state: level={level_init}, growth={growth_init}, canEvolve={can_evolve_init}")
        if not (level_init == 1 and growth_init == 58 and can_evolve_init is True):
            errors.append(f"FIX1: unexpected initial state level={level_init} growth={growth_init} canEvolve={can_evolve_init}")

        await page.evaluate("() => { document.getElementById('evolveButton')?.click(); }")
        await page.wait_for_timeout(2500)  # wait for playEvolution beat 4 (2200ms) to finish

        level_after = await page.evaluate("() => state.level")
        growth_after = await page.evaluate("() => state.growth")
        can_evolve_after = await page.evaluate("() => canEvolve()")

        level_ok = level_after == 2
        growth_ok = growth_after == 18
        gate_ok = can_evolve_after is False

        print(f"  [{'PASS' if level_ok else 'FAIL'}] After evolve: level={level_after} (expected 2)")
        print(f"  [{'PASS' if growth_ok else 'FAIL'}] After evolve: growth={growth_after} (expected 18, bar emptied)")
        print(f"  [{'PASS' if gate_ok else 'FAIL'}] After evolve: canEvolve={can_evolve_after} (expected False - gated)")
        if not level_ok:
            errors.append(f"FIX1: level after evolve is {level_after}, expected 2")
        if not growth_ok:
            errors.append(f"FIX1: growth after evolve is {growth_after}, expected 18")
        if not gate_ok:
            errors.append(f"FIX1: canEvolve after evolve is {can_evolve_after}, expected False")

        # Repeated immediate clicks should NOT advance level (gated) - assert no jump to 5
        for _ in range(5):
            await page.evaluate("() => { document.getElementById('evolveButton')?.click(); }")
            await page.wait_for_timeout(80)
        await page.wait_for_timeout(300)
        level_after2 = await page.evaluate("() => state.level")
        no_chain = level_after2 == 2
        print(f"  [{'PASS' if no_chain else 'FAIL'}] Repeated clicks (no feed): level={level_after2} "
              f"(expected still 2, no chain-evolve to 5)")
        if not no_chain:
            errors.append(f"FIX1: chain-evolve not gated! level jumped to {level_after2}")

        # Loop playable: feed until canEvolve() true again (threshold now 60), then evolve L2->L3
        await page.evaluate("() => { for (let i = 0; i < 30; i++) state.rewardQueue.push('测试补给'); }")
        feeds = 0
        while feeds < 30:
            if await page.evaluate("() => canEvolve()"):
                break
            await page.evaluate("() => feedPet()")
            feeds += 1
        can_evolve_refed = await page.evaluate("() => canEvolve()")
        growth_refed = await page.evaluate("() => state.growth")
        print(f"  [{'PASS' if can_evolve_refed else 'FAIL'}] After {feeds} feeds: growth={growth_refed}, "
              f"canEvolve={can_evolve_refed} (loop re-armed by feeding)")
        if not can_evolve_refed:
            errors.append(f"FIX1: could not re-arm evolve by feeding (growth={growth_refed} after {feeds} feeds)")
        else:
            # Evolve again to prove full loop advances L2 -> L3
            await page.evaluate("() => { document.getElementById('evolveButton')?.click(); }")
            await page.wait_for_timeout(2500)
            level_l3 = await page.evaluate("() => state.level")
            growth_l3 = await page.evaluate("() => state.growth")
            l3_ok = level_l3 == 3 and growth_l3 == 18
            print(f"  [{'PASS' if l3_ok else 'FAIL'}] Second evolve: level={level_l3} (expected 3), "
                  f"growth={growth_l3} (expected 18)")
            if not l3_ok:
                errors.append(f"FIX1: second evolve level={level_l3} growth={growth_l3}, expected 3/18")

        if js_errors:
            errors.extend([f"FIX1 JS error: {e}" for e in js_errors])
        await ctx.close()

        # ---- INTERACTIONS: feed/talk/nap/tap non-throwing ----
        print("\n=== Regression: interactions ===")
        ctx, page, js_errors = await new_page_with_species(browser, species="dragon")
        for action in ["feedButton", "petTalkButton", "petNapButton"]:
            await page.evaluate(f"() => document.getElementById('{action}')?.click()")
        await page.evaluate("() => document.getElementById('pet3dStage')?.click()")
        await page.wait_for_timeout(200)

        has_bubble = await page.evaluate("""() => {
            const b = document.getElementById('petSpeechBubble');
            return b && b.getAttribute('aria-hidden') === 'false';
        }""")
        print(f"  [{'PASS' if has_bubble else 'INFO'}] Speech bubble shown after interaction: {has_bubble}")

        int_errors_ok = len(js_errors) == 0
        print(f"  [{'PASS' if int_errors_ok else 'FAIL'}] 0 uncaught JS errors: {js_errors if js_errors else 'none'}")
        if not int_errors_ok:
            errors.extend([f"Interaction JS error: {e}" for e in js_errors])
        await ctx.close()

        await browser.close()

    print("\n" + "=" * 50)
    if errors:
        print(f"FAILED - {len(errors)} error(s):")
        for e in errors:
            print(f"  X {e}")
    else:
        print(f"ALL PASS - 0 errors, regression {len(SPECIES)*len(LEVELS)}/{len(SPECIES)*len(LEVELS)}")
    return len(errors)


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    import sys
    sys.exit(exit_code)

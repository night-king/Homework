"""
Task 9 TDD Gate: 开局选宠物界面 + 记住选择
Tests:
  (a) clear localStorage → load page → #petSelectOverlay visible with 3 cards; screenshot
  (b) click hero card → overlay removed, #petStageMount use href starts #sp-hero-, localStorage hw_pet_species==='hero'
  (c) reload page (localStorage persists) → overlay does NOT appear; pet is hero
"""

import sys
import os
import subprocess

def run():
    try:
        from playwright.sync_api import sync_playwright, expect
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright"])
        subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
        from playwright.sync_api import sync_playwright, expect

    html_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "child-homepage.html")
    )
    url = f"file:///{html_path.replace(os.sep, '/')}"
    shot_path = os.path.join(os.path.dirname(__file__), ".tmp-shot-select.png")

    errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 430, "height": 932})

        # ── (a) First visit: overlay visible with 3 cards ──────────────────────
        page = ctx.new_page()
        js_errors = []
        page.on("pageerror", lambda e: js_errors.append(str(e)))

        # Clear localStorage before load
        page.goto(url)
        page.evaluate("localStorage.clear()")
        page.reload()
        page.wait_for_load_state("networkidle")

        overlay = page.locator("#petSelectOverlay")
        try:
            expect(overlay).to_be_visible(timeout=5000)
            print("[a] PASS: #petSelectOverlay is visible on first visit")
        except Exception as e:
            errors.append(f"[a] FAIL: #petSelectOverlay not visible — {e}")

        cards = page.locator(".pet-select-card")
        try:
            expect(cards).to_have_count(3, timeout=3000)
            print("[a] PASS: 3 pet-select-card elements found")
        except Exception as e:
            errors.append(f"[a] FAIL: expected 3 cards — {e}")

        # Screenshot at mobile width
        page.screenshot(path=shot_path, full_page=False)
        print(f"[a] Screenshot saved → {shot_path}")

        # ── (b) Click hero card → overlay gone, sprite updated, localStorage set ─
        hero_card = page.locator(".pet-select-card[data-id='hero']")
        try:
            expect(hero_card).to_be_visible(timeout=3000)
            hero_card.click()
            page.wait_for_timeout(300)

            # overlay should be removed
            try:
                expect(overlay).not_to_be_visible(timeout=3000)
                print("[b] PASS: overlay removed after choosing hero")
            except Exception as e:
                errors.append(f"[b] FAIL: overlay still visible after choosePet — {e}")

            # sprite href should start with #sp-hero-
            use_href = page.locator("#petStageMount use").first.get_attribute("href")
            if use_href and use_href.startswith("#sp-hero-"):
                print(f"[b] PASS: #petStageMount use href = {use_href}")
            else:
                errors.append(f"[b] FAIL: expected href starting #sp-hero-, got {use_href!r}")

            # localStorage should be 'hero'
            saved = page.evaluate("localStorage.getItem('hw_pet_species')")
            if saved == "hero":
                print(f"[b] PASS: localStorage['hw_pet_species'] === 'hero'")
            else:
                errors.append(f"[b] FAIL: localStorage['hw_pet_species'] === {saved!r}, expected 'hero'")

        except Exception as e:
            errors.append(f"[b] FAIL: hero card not found or click failed — {e}")

        # ── (c) Reload: overlay does NOT appear, pet stays hero ─────────────────
        page.reload()
        page.wait_for_load_state("networkidle")

        try:
            expect(page.locator("#petSelectOverlay")).not_to_be_visible(timeout=3000)
            print("[c] PASS: overlay does NOT appear on reload (species remembered)")
        except Exception as e:
            errors.append(f"[c] FAIL: overlay appeared on reload — {e}")

        use_href_reload = page.locator("#petStageMount use").first.get_attribute("href")
        if use_href_reload and use_href_reload.startswith("#sp-hero-"):
            print(f"[c] PASS: pet is still hero after reload — href={use_href_reload}")
        else:
            errors.append(f"[c] FAIL: expected hero after reload, got {use_href_reload!r}")

        # ── JS error check ────────────────────────────────────────────────────────
        if js_errors:
            errors.append(f"[js] FAIL: uncaught JS errors — {js_errors}")
        else:
            print("[js] PASS: no uncaught JS errors")

        browser.close()

    if errors:
        print("\n=== FAILURES ===")
        for e in errors:
            print(e)
        sys.exit(1)
    else:
        print("\n=== ALL TESTS PASSED ===")
        sys.exit(0)

if __name__ == "__main__":
    run()

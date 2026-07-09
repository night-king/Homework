"""Task 3 TDD gate: 位图优先/缺图回退矢量 验证脚本

Tests:
  1. 缺图时 #petStageMount svg 包含 <use>，不含 <image>
  2. 有图（1×1 假 PNG）时重载后 #petStageMount svg 含 <image>，0 JS 错误
  3. 所有 3 个面（主舞台/图鉴轨道/选宠物卡片）缺图时均用 <use>，无报错
"""
from playwright.sync_api import sync_playwright
import pathlib
import base64

proto = pathlib.Path("frontend/child-web-prototype/child-homepage.html")
url = proto.resolve().as_uri()

# 1×1 透明 PNG（触发"有图"分支用）
png1x1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="
)
assets = proto.parent / "assets" / "pets"
assets.mkdir(parents=True, exist_ok=True)

# 确保无遗留测试图
for f in assets.glob("sp-dragon-*.png"):
    f.unlink()

with sync_playwright() as p:
    b = p.chromium.launch()

    # ── Test 1: 缺图回退矢量 ──────────────────────────────────────────────
    pg = b.new_page(viewport={"width": 430, "height": 860})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.add_init_script("try{localStorage.setItem('hw_pet_species','dragon')}catch(e){}")
    pg.goto(url)
    pg.wait_for_timeout(600)

    fallback = pg.evaluate("""() => {
        state.speciesId = 'dragon';
        state.level = 1;
        _petSpeciesReady = true;
        renderPetStage();
        const s = document.querySelector('#petStageMount svg');
        return { use: !!s.querySelector('use'), image: !!s.querySelector('image') };
    }""")
    assert fallback["use"] and not fallback["image"], \
        f"FAIL Test1 fallback should be <use>, got {fallback}"
    print("PASS Test1: 缺图→<use>")

    # ── Test 2: 有图时显示 <image> ────────────────────────────────────────
    (assets / "sp-dragon-1.png").write_bytes(png1x1)
    pg.reload()
    pg.wait_for_timeout(900)

    hires = pg.evaluate("""() => {
        state.speciesId = 'dragon';
        state.level = 1;
        _petSpeciesReady = true;
        renderPetStage();
        const s = document.querySelector('#petStageMount svg');
        return { use: !!s.querySelector('use'), image: !!s.querySelector('image') };
    }""")
    assert hires["image"], f"FAIL Test2 with png should render <image>, got {hires}"
    assert not errs, f"FAIL Test2 js errors: {errs}"
    print("PASS Test2: 有图→<image>，0 JS 错误")

    (assets / "sp-dragon-1.png").unlink()  # 清理假图

    # ── Test 3: 三个面缺图均用 <use>，无报错 ─────────────────────────────
    pg3 = b.new_page(viewport={"width": 430, "height": 860})
    errs3 = []
    pg3.on("pageerror", lambda e: errs3.append(str(e)))
    pg3.add_init_script("try{localStorage.setItem('hw_pet_species','dragon')}catch(e){}")
    pg3.goto(url)
    pg3.wait_for_timeout(800)

    surfaces = pg3.evaluate("""() => {
        // 主舞台
        state.speciesId = 'dragon';
        state.level = 1;
        _petSpeciesReady = true;
        renderPetStage();
        const mainSvg = document.querySelector('#petStageMount svg');
        const mainOk = !!mainSvg.querySelector('use') && !mainSvg.querySelector('image');

        // 图鉴轨道：先打开进化 modal 区域（renderEvolutionRail 写入 evolutionRail）
        renderEvolutionRail();
        const railSvg = document.querySelector('#evolutionRail svg');
        const railUses = railSvg ? railSvg.querySelectorAll('use').length : 0;
        const railImages = railSvg ? railSvg.querySelectorAll('image').length : 0;
        const railOk = railUses >= 5 && railImages === 0;

        // 选宠物卡片：openPetSelect 已在无存档时调用；这里手动触发读 DOM
        // 若 overlay 已挂，直接读；否则触发 openPetSelect
        let selOk = false;
        const existing = document.getElementById('petSelectOverlay');
        if (existing) {
            const cardSvgs = existing.querySelectorAll('.pet-select-card svg');
            const cardUses = Array.from(cardSvgs).every(s => !!s.querySelector('use') && !s.querySelector('image'));
            selOk = cardSvgs.length >= 3 && cardUses;
        } else {
            openPetSelect();
            const ov = document.getElementById('petSelectOverlay');
            if (ov) {
                const cardSvgs = ov.querySelectorAll('.pet-select-card svg');
                const cardUses = Array.from(cardSvgs).every(s => !!s.querySelector('use') && !s.querySelector('image'));
                selOk = cardSvgs.length >= 3 && cardUses;
            }
        }

        return { mainOk, railOk, railUses, railImages, selOk };
    }""")
    assert surfaces["mainOk"],  f"FAIL Test3 main stage not <use>: {surfaces}"
    assert surfaces["railOk"],  f"FAIL Test3 rail not all <use> (uses={surfaces['railUses']}, images={surfaces['railImages']})"
    assert surfaces["selOk"],   f"FAIL Test3 selection cards not <use>: {surfaces}"
    assert not errs3, f"FAIL Test3 js errors: {errs3}"
    print(f"PASS Test3: 三面缺图均<use> (rail={surfaces['railUses']} uses), 0 JS 错误")

    b.close()

print("PASS hires fallback+bitmap+3-surfaces+0-errors")

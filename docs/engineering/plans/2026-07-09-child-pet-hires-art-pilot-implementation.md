# 孩子端宠物高清美术产线（火龙试点）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 产出「火龙 5 阶 SVG 参考图 + 即梦中文提示词/操作说明」，并给 `child-homepage.html` 加「位图优先、缺图回退矢量」的接线——让创始人跑图后把 5 张高清 PNG 丢进 `assets/pets/` 即可自动显示，不改动 SPECIES/进化逻辑。

**Architecture:** 单文件原型 + 外部位图资源。Claude 用 Playwright 把 5 个火龙 `<symbol>` 按其 viewBox 导成方形透明 PNG 作参考图；写一份中文美术 brief 给创始人在即梦跑图；在渲染层（主舞台/图鉴/选宠物）加一个"探测位图是否存在→存在用 `<image>`、不存在回退 `<use>` 矢量"的分支。位图沿用矢量原有的取景与定位，保证无缝换皮。

**Tech Stack:** 原生 HTML/CSS/JS、内联 SVG（`<image>`/`<use>`）、Playwright（Python，导图 + 验证）、透明 PNG。

## Global Constraints

- 单文件逻辑：JS/CSS/DOM 改动只在 `frontend/child-web-prototype/child-homepage.html`；位图资源放外部 `frontend/child-web-prototype/assets/pets/`（spec §2）。
- 只做**火龙 5 阶试点**（`sp-dragon-1..5`）；恐龙/光之英雄本计划不做（spec §2、§4）。
- **位图优先、缺图回退矢量**：有 `assets/pets/<spriteId>.png` 用位图，否则用现有 `<use href="#<spriteId>">`；缺图不得崩、不得空白（spec §2、§3.4）。
- 不改动 SPECIES 数据、spriteId、renderPetStage/renderEvolutionRail/playEvolution/选宠物 的逻辑骨架，只在"渲染一个精灵"处加位图分支（spec §3.4、§5）。
- 位图规范：透明 PNG、**1024×1024**、命名 `sp-dragon-1.png`…`sp-dragon-5.png`（spec §2、§3.3）。
- 参考图取景须与 SVG 渲染取景一致（同 viewBox 框），保证换皮后主舞台/图鉴/选宠物三处位置尺寸不变（spec §3.1、§3.4）。
- Claude 不产成品美术；成品由创始人在即梦生成（spec §1、§5 风险）。

---

### Task 1: 导出火龙 5 阶参考图（透明方形 PNG）

写一个可复用脚本，把 `child-homepage.html` 里的 5 个火龙 `<symbol>` 各渲染到透明背景、方形、统一 1024×1024 的 PNG，作为喂给即梦的结构参考图。取景 = 该 symbol 的 viewBox 补成正方形（角色居中，与 SVG 渲染同框）。

**Files:**
- Create: `frontend/child-web-prototype/tools/export-sprite-refs.py`
- Create（脚本产物）: `frontend/child-web-prototype/assets/pets/ref/ref-dragon-1.png` … `ref-dragon-5.png`
- Test: 脚本自带断言 + 人工看图

**Interfaces:**
- Consumes: `child-homepage.html` 中的 `<symbol id="sp-dragon-1..5">` 及其 `viewBox`。
- Produces: 5 张 `ref-dragon-N.png`（1024×1024 透明，火龙第 N 阶，居中，取景=symbol viewBox 补方）。脚本参数化 species 前缀，便于后续复用于 dino/hero。

- [ ] **Step 1: 写导出脚本**

`tools/export-sprite-refs.py`（Playwright，chromium 已装）：
```python
import re, pathlib, sys
from playwright.sync_api import sync_playwright

PROTO = pathlib.Path(__file__).resolve().parent.parent / "child-homepage.html"
OUT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "pets" / "ref"
OUT.mkdir(parents=True, exist_ok=True)
species = sys.argv[1] if len(sys.argv) > 1 else "dragon"
html = PROTO.read_text(encoding="utf-8")

def square_viewbox(vb):  # "-12 -8 130 148" -> 居中补成正方形
    x, y, w, h = [float(n) for n in vb.split()]
    s = max(w, h)
    return f"{x - (s-w)/2} {y - (s-h)/2} {s} {s}"

url = PROTO.as_uri()
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1100, "height": 1100})
    pg.goto(url); pg.wait_for_timeout(400)
    for n in range(1, 6):
        sid = f"sp-{species}-{n}"
        m = re.search(rf'<symbol id="{sid}" viewBox="([^"]+)"', html)
        if not m:
            print("MISSING symbol", sid); sys.exit(1)
        vb = square_viewbox(m.group(1))
        pg.evaluate("""([sid, vb]) => {
          let host = document.getElementById('__refhost');
          if (!host) { host = document.createElement('div'); host.id='__refhost';
            host.style.cssText='position:fixed;left:0;top:0;width:1024px;height:1024px;background:transparent;z-index:99999';
            document.body.appendChild(host); }
          host.innerHTML = `<svg width="1024" height="1024" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg"><use href="#${sid}"/></svg>`;
        }""", [sid, vb])
        pg.wait_for_timeout(120)
        pg.locator("#__refhost").screenshot(path=str(OUT / f"ref-{species}-{n}.png"), omit_background=True)
        print("wrote", f"ref-{species}-{n}.png", "viewBox", vb)
    b.close()
print("DONE 5 refs")
```

- [ ] **Step 2: 跑脚本导出 5 张**

Run: `python frontend/child-web-prototype/tools/export-sprite-refs.py dragon`
Expected: 打印 `wrote ref-dragon-1.png` … `ref-dragon-5.png`、`DONE 5 refs`，无 `MISSING`。

- [ ] **Step 3: 校验尺寸/透明/数量**

Run（Python 断言）:
```python
from PIL import Image; import pathlib
d = pathlib.Path("frontend/child-web-prototype/assets/pets/ref")
files = sorted(d.glob("ref-dragon-*.png"))
assert len(files) == 5, f"expected 5, got {len(files)}"
for f in files:
    im = Image.open(f); assert im.size == (1024,1024), f"{f.name} {im.size}"; assert im.mode == "RGBA", f"{f.name} {im.mode}"
    assert im.getextrema()[3][0] == 0, f"{f.name} not transparent"  # alpha 有 0
print("PASS refs 1024 RGBA transparent x5")
```
（若无 Pillow：`pip install pillow`。）
Expected: `PASS refs 1024 RGBA transparent x5`

- [ ] **Step 4: 人工看 5 张**

打开 `assets/pets/ref/ref-dragon-1..5.png`：确认每张是透明底、居中的对应阶火龙（蛋→破壳萌龙→成长幼龙→展翼幼龙→喷火成龙），非空白、无裁切。

- [ ] **Step 5: Commit**

```bash
git add frontend/child-web-prototype/tools/export-sprite-refs.py frontend/child-web-prototype/assets/pets/ref/
git commit -m "feat(child-prototype): 导出火龙5阶SVG参考图(透明方形PNG)+可复用导出脚本"
```

---

### Task 2: 火龙美术 brief（即梦中文提示词 + 操作说明）

写一份创始人可直接照做的文档：统一风格锚点 + 5 段分阶中文提示词 + 即梦「图生图/参考图」操作步骤 + 交付规范。

**Files:**
- Create: `docs/engineering/specs/frontend/assets/2026-07-09-pet-hires/dragon-art-brief.md`
- Test: 内容自检（grep 关键段落齐全）

**Interfaces:**
- Consumes: Task 1 的 `ref-dragon-1..5.png`（brief 里指名每阶用哪张参考图）。
- Produces: 一份 brief.md，含「风格锚点」「5 段分阶提示词」「即梦操作步骤」「交付规范（命名/尺寸/透明/存放路径）」。

- [ ] **Step 1: 写 brief 文档**

内容必须包含以下四块（用词以 spec §3.2 为准）：

1. **统一风格锚点**（每张都加）：英雄卡通/暴雪卡通游戏角色感、柔和 cel-shading + 边缘轮光 + 柔光高光；暖橙红火龙主体、奶黄腹甲、发光胸核、尾焰；透明背景、单角色居中、正面略 3/4、无地台无阴影、儿童向明亮不暗黑、无文字无边框；负向：写实恐怖/暗黑/多角色/地面阴影/水印/粗糙线条。
2. **5 段分阶提示词**（各配参考图）：
   - 阶1 `ref-dragon-1.png` → 龙蛋：暖色蛋 + 发光裂纹，神秘感。
   - 阶2 `ref-dragon-2.png` → 破壳萌龙：超大圆头巨眼奶龙、蛋壳、尾焰，纯萌。
   - 阶3 `ref-dragon-3.png` → 成长幼龙：站立、小角小背刺、小吻，不会飞。
   - 阶4 `ref-dragon-4.png` → 展翼幼龙：长翅、口鼻/眉骨/脖子，眼神变利。
   - 阶5 `ref-dragon-5.png` → 喷火成龙：长吻龙头+大弯角+獠牙+双翼+喷火，英雄战龙。
   每段给出「参考图 + 中文正向提示词 + 负向提示词」完整可复制文本。
3. **即梦操作步骤**：新建图生图→上传对应 `ref-dragon-N.png`→贴该阶提示词→参考强度调「保结构、换质感」区间→出图；出完第 N 阶满意后，把成品当二次参考再生成第 N+1 阶以强化"同一只龙"；固定风格基准减少漂移。
4. **交付规范**：透明 PNG、1024×1024、命名 `sp-dragon-1.png`…`sp-dragon-5.png`、居中同比例，放 `frontend/child-web-prototype/assets/pets/`（注意：成品命名是 `sp-dragon-N.png`，不是 `ref-`）。

- [ ] **Step 2: 自检四块齐全**

Run:
```bash
f=docs/engineering/specs/frontend/assets/2026-07-09-pet-hires/dragon-art-brief.md
for k in "风格锚点" "ref-dragon-1.png" "ref-dragon-5.png" "即梦" "参考强度" "sp-dragon-1.png" "1024"; do grep -q "$k" "$f" || echo "MISSING: $k"; done; echo "checked"
```
Expected: 只打印 `checked`（无 MISSING）。

- [ ] **Step 3: Commit**

```bash
git add docs/engineering/specs/frontend/assets/2026-07-09-pet-hires/dragon-art-brief.md
git commit -m "docs(child-prototype): 火龙高清美术brief(即梦中文提示词+操作说明)"
```

---

### Task 3: 位图优先/缺图回退矢量 的渲染接线 + 校验脚本

在 `child-homepage.html` 加一层"位图探测 + 条件渲染"：页面加载时探测 `assets/pets/<spriteId>.png` 是否存在，存在则主舞台/图鉴/选宠物用 `<image>` 显示高清图，否则回退现有 `<use>` 矢量。位图沿用矢量原有取景/定位，无缝换皮。

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`（渲染层：`renderPetStage`、`renderEvolutionRail`、选宠物卡片 `openPetSelect`）
- Create: `frontend/child-web-prototype/tools/validate-pet-art.py`（校验成品 PNG 规范）
- Test: `frontend/child-web-prototype/.tmp-hires-check.py`（Playwright，缺图回退 + 有图显示）

**Interfaces:**
- Consumes: `SPECIES`、`getCurrentStage()`、`getSpecies()`、现有 `renderPetStage`/`renderEvolutionRail`/`openPetSelect`、`state.speciesId/level`。
- Produces:
  - `const HIRES_READY`（Set，探测得到的可用位图 spriteId）
  - `preloadHiResArt()`：并行 `new Image()` 探测每个 spriteId 的 `assets/pets/<id>.png`，成功则加入 `HIRES_READY` 并触发一次当前面的重渲染。
  - `petArtMarkup(spriteId, x, y, w, h)`：返回 SVG 片段——`HIRES_READY.has(id)` 时 `<image href="assets/pets/<id>.png" x y width height preserveAspectRatio="xMidYMid meet"/>`，否则 `<use href="#<id>" .../>`。三处渲染改调它。

- [ ] **Step 1: 写失败断言（缺图应回退矢量、有图应显示位图）**

`.tmp-hires-check.py`：
```python
from playwright.sync_api import sync_playwright
import pathlib, base64
proto = pathlib.Path("frontend/child-web-prototype/child-homepage.html")
url = proto.resolve().as_uri()
# 1x1 透明 png（放一张假的 sp-dragon-1.png 触发"有图"分支）
png1x1 = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=")
assets = proto.parent / "assets" / "pets"; assets.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":430,"height":860})
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    # 缺图：应回退矢量 <use>
    for f in assets.glob("sp-dragon-*.png"): f.unlink()
    pg.add_init_script("try{localStorage.setItem('hw_pet_species','dragon')}catch(e){}")
    pg.goto(url); pg.wait_for_timeout(600)
    fallback = pg.evaluate("()=>{state.speciesId='dragon';state.level=1;_petSpeciesReady=true;renderPetStage();const s=document.querySelector('#petStageMount svg'); return {use:!!s.querySelector('use'), image:!!s.querySelector('image')};}")
    assert fallback["use"] and not fallback["image"], f"fallback should be <use>, got {fallback}"
    # 有图：放一张 sp-dragon-1.png，重载后应用 <image>
    (assets/"sp-dragon-1.png").write_bytes(png1x1)
    pg.reload(); pg.wait_for_timeout(900)
    hires = pg.evaluate("()=>{state.speciesId='dragon';state.level=1;_petSpeciesReady=true;renderPetStage();const s=document.querySelector('#petStageMount svg'); return {use:!!s.querySelector('use'), image:!!s.querySelector('image')};}")
    assert hires["image"], f"with png should render <image>, got {hires}"
    assert not errs, f"js errors {errs}"
    print("PASS hires fallback+bitmap")
    b.close()
    (assets/"sp-dragon-1.png").unlink()  # 清理假图
```

- [ ] **Step 2: 跑，确认失败**

Run: `python frontend/child-web-prototype/.tmp-hires-check.py`
Expected: FAIL（`petArtMarkup`/`HIRES_READY` 尚未实现，`<image>` 分支不存在）。

- [ ] **Step 3: 实现探测 + 条件渲染**

在 JS 里加（`SPECIES` 之后）：
```js
const HIRES_READY = new Set();
function petArtMarkup(spriteId, x, y, w, h) {
  const box = `x="${x}" y="${y}" width="${w}" height="${h}"`;
  if (HIRES_READY.has(spriteId)) {
    return `<image href="assets/pets/${spriteId}.png" ${box} preserveAspectRatio="xMidYMid meet"></image>`;
  }
  return `<use href="#${spriteId}" ${box}></use>`;
}
function preloadHiResArt() {
  const ids = [];
  Object.values(SPECIES).forEach(sp => sp.stages.forEach(s => ids.push(s.spriteId)));
  ids.forEach(id => {
    const img = new Image();
    img.onload = () => { HIRES_READY.add(id); if (typeof renderPetStage==='function') renderPetStage(); };
    img.src = `assets/pets/${id}.png`;
  });
}
```
把三处渲染的 `<use .../>` 改用 `petArtMarkup(...)`：
- `renderPetStage()`：当前用 `<use href="#${stage.spriteId}">`（无显式 x/y/w/h，靠外层 svg viewBox 填充）——改为 `petArtMarkup(stage.spriteId, viewBoxX, viewBoxY, viewBoxW, viewBoxH)`，其中 x/y/w/h 用外层 svg 的 viewBox（`-12 -8 140 148`）四值，使 `<image>` 铺满同一取景。
- `renderEvolutionRail()`：把 `<use href="#${s.spriteId}" x y width height>` 换成 `petArtMarkup(s.spriteId, x, y, w, h)`（x/y/w/h 沿用现有计算）。
- `openPetSelect()`（选宠物卡片）：把 `<use href="#${sp.stages[0].spriteId}">` 换成 `petArtMarkup(sp.stages[0].spriteId, 卡片svg的viewBox四值)`。
在初始化处调用一次 `preloadHiResArt()`（在 `initPet()` 之后）。

- [ ] **Step 4: 跑，确认通过**

Run: `python frontend/child-web-prototype/.tmp-hires-check.py`
Expected: `PASS hires fallback+bitmap`

- [ ] **Step 5: 写成品校验脚本**

`tools/validate-pet-art.py`（创始人丢图后自查）:
```python
from PIL import Image; import pathlib, sys
d = pathlib.Path(__file__).resolve().parent.parent / "assets" / "pets"
species = sys.argv[1] if len(sys.argv) > 1 else "dragon"
ok = True
for n in range(1,6):
    f = d / f"sp-{species}-{n}.png"
    if not f.exists(): print("MISSING", f.name); ok=False; continue
    im = Image.open(f)
    if im.size != (1024,1024): print("SIZE", f.name, im.size); ok=False
    if im.mode != "RGBA" or im.getextrema()[3][0] != 0: print("NOT-TRANSPARENT", f.name); ok=False
print("PASS validate-pet-art" if ok else "FAIL validate-pet-art"); sys.exit(0 if ok else 1)
```

- [ ] **Step 6: 回归——三处面缺图仍正常 + 无报错**

Run（复用 `.tmp-hires-check.py` 已覆盖主舞台；再手动确认图鉴/选宠物缺图时显示矢量、无控制台报错）：加载页面，清 `assets/pets/sp-dragon-*.png`，断言选宠物 3 卡、图鉴 5 精灵、主舞台都用 `<use>` 且 0 报错。

- [ ] **Step 7: Commit**

```bash
git add frontend/child-web-prototype/child-homepage.html frontend/child-web-prototype/tools/validate-pet-art.py frontend/child-web-prototype/.tmp-hires-check.py
git commit -m "feat(child-prototype): 位图优先/缺图回退矢量渲染接线+成品校验脚本"
```

---

## 创始人产图环节（本计划外的手动步骤）

Task 1–3 完成后交付给创始人：`assets/pets/ref/ref-dragon-1..5.png` + `dragon-art-brief.md`。创始人在即梦按 brief 跑出 5 张 `sp-dragon-1..5.png`（透明 1024 方图）丢进 `assets/pets/`，`python tools/validate-pet-art.py dragon` 自查通过后，刷新页面即自动显示高清火龙（探测机制无需改代码）。验收：主舞台/图鉴/选宠物三处显示高清火龙、5 阶质感统一连续、移动端清晰、缺图回退正常。满意后照此产 dino/hero（`export-sprite-refs.py dino` 导参考图 + 各自 brief）。

## Self-Review

**Spec coverage：**
- §3.1 参考图导出 → Task 1 ✓
- §3.2 美术设定+分阶提示词 → Task 2 ✓
- §3.3 交付规范 → Task 2 Step1(4) + Task 3 校验脚本 ✓
- §3.4 接回原型（位图优先/回退） → Task 3 ✓
- §3.5 试点验收 → "创始人产图环节"验收 + Task 3 回归 ✓
- §4 扩展 dino/hero → 脚本参数化 species（Task 1）+ 手动环节说明 ✓
- §5 风险（缺图回退不崩） → Task 3 Step1/6 明确断言 ✓

**Placeholder scan：** 无 TBD/TODO；每步含实际脚本/代码。Task 3 Step3 中"卡片svg的viewBox四值"是明确指向现有代码的四个数值（实现时读取现有 openPetSelect 的 svg viewBox 填入），非占位。

**Type consistency：** `HIRES_READY`(Set)/`petArtMarkup(spriteId,x,y,w,h)`/`preloadHiResArt()` 跨步骤一致；成品命名 `sp-<species>-<n>.png`、参考图 `ref-<species>-<n>.png` 全计划一致；存放 `assets/pets/`（成品）与 `assets/pets/ref/`（参考）区分清晰。

# 孩子端首页宠物重设 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `child-homepage.html` 首页宠物从"单一圣龙 + 五行 + canvas 伪 3D"改成"3 只可选独立角色（火龙/恐龙/光之英雄），统一英雄卡通 SVG 画风，各自 5 阶进化 + 进化演出动画 + 开局选宠物"。

**Architecture:** 单文件原型。用一张隐藏的 SVG `<symbol>` 精灵表承载全部 15 个角色阶段造型，主舞台 / 图鉴 / 选宠物界面都用 `<use href="#...">` 引用同一批精灵。数据层用 `SPECIES` 目录（3 物种 × 5 阶）取代旧 `petStages` + `elementMeta`。移除 canvas 3D 渲染器、3D 数学与五行系统。进化演出用"光爆盖住瞬间换装"的 CSS 动画。

**Tech Stack:** 原生 HTML / CSS / JavaScript（无框架、无构建）、内联 SVG（`<symbol>` + `<use>` + 渐变 + `feGaussianBlur` 发光 + CSS keyframes）。验证用仓库既有的 Playwright/CDP 浏览器检查脚本模式（`.tmp-*-check.py` / `.tmp-*-check.js`）。

## Global Constraints

- 单文件：所有改动落在 `frontend/child-web-prototype/child-homepage.html`，不引入外部资源 / 构建 / 依赖（源自 spec §7）。
- 统一画风：英雄卡通（明亮不暗黑，适配 6–8 岁）；三物种身份色固定 —— 火龙红橙 `#E8461F`、恐龙绿 `#4E9E3E`、光之英雄蓝银 + 光核青 `#6FE8FF`（spec §3.4、§4）。
- 5 阶节奏统一：神秘容器 → 萌态揭晓 → 成长 → 招牌觉醒 → 终极大招；情感弧线"从萌到酷"（spec §2、§4）。
- 个头递增 + 头部/头身比每阶明显差异，同一地平线可比（spec §4）。
- 光之英雄必须是原创，不用奥特曼官方形象/名称/配色比例（spec §3.3）。
- 五行系统一并移除，不保留任何 element 入口（spec §2、§11.1）。
- 保留现有首页壳与逻辑：顶部状态条、Day 切换、今日委托、补给→喂食成长循环、任务列表、成长条、里程碑、互动按钮（喂食/打盹/说话/摸摸）、图鉴弹窗——本计划只替换"宠物形象系统 + 进化路线 + 进化演出 + 选宠物入口"（spec §7）。
- 已批准的角色 SVG 源在 brainstorm mockup 里，见 Task 1 落地后的 `docs/engineering/specs/frontend/assets/2026-07-09-pet-redesign/` 参考文件；每个精灵直接从对应参考文件移植，不重画。

---

### Task 1: 固化已批准的角色 SVG 参考进仓库

把 brainstorm 阶段已确认的 SVG 造型稿从 `.superpowers/`（gitignore、临时）复制到仓库内持久位置，作为后续所有造型任务的**唯一美术来源**，避免临时目录被清理后丢稿。

**Files:**
- Create: `docs/engineering/specs/frontend/assets/2026-07-09-pet-redesign/dragon-route.html`（火龙 5 阶 · 同地平线个头 + 头部差异版）
- Create: `docs/engineering/specs/frontend/assets/2026-07-09-pet-redesign/dino-route.html`（恐龙 5 阶）
- Create: `docs/engineering/specs/frontend/assets/2026-07-09-pet-redesign/hero-route.html`（光之英雄 5 阶）
- Create: `docs/engineering/specs/frontend/assets/2026-07-09-pet-redesign/evolution-anim.html`（进化演出动画）

**Interfaces:**
- Produces: 4 个参考 HTML，每个含对应角色/演出的**内联 SVG 源**（`<defs>` 渐变 + 各阶 `<g transform>` 造型 + CSS keyframes）。后续 Task 用它们做移植底稿。

- [ ] **Step 1: 定位 brainstorm 产物目录**

Run: `ls "D:/WorkSpace/night-king/Homework/.superpowers/brainstorm/"*/content/`
Expected: 列出 `dragon-route-heads.html`、`dino-route.html`、`hero-route.html`、`evolution-anim.html` 等文件。

- [ ] **Step 2: 复制 4 份最终稿到参考目录**

把最终采纳版复制过去（火龙用 `dragon-route-heads.html`）：
```bash
SRC=$(ls -d "D:/WorkSpace/night-king/Homework/.superpowers/brainstorm/"*/content | head -1)
DST="D:/WorkSpace/night-king/Homework/docs/engineering/specs/frontend/assets/2026-07-09-pet-redesign"
mkdir -p "$DST"
cp "$SRC/dragon-route-heads.html" "$DST/dragon-route.html"
cp "$SRC/dino-route.html"          "$DST/dino-route.html"
cp "$SRC/hero-route.html"          "$DST/hero-route.html"
cp "$SRC/evolution-anim.html"      "$DST/evolution-anim.html"
```

- [ ] **Step 3: 校验 4 份都含 `<svg`**

Run: `grep -l "<svg" "D:/WorkSpace/night-king/Homework/docs/engineering/specs/frontend/assets/2026-07-09-pet-redesign/"*.html | wc -l`
Expected: `4`

- [ ] **Step 4: Commit**

```bash
git add docs/engineering/specs/frontend/assets/2026-07-09-pet-redesign/
git commit -m "docs(child-prototype): 固化三角色5阶+进化演出SVG造型参考稿"
```

---

### Task 2: 建立 SPECIES 数据模型 + 移除旧 petStages/五行数据

用 3 物种 × 5 阶的 `SPECIES` 目录取代旧的单龙 `petStages`、`elementOrder`、`elementMeta`；`state` 增加 `speciesId`、移除 `activeElement`/`unlockedElements`。本任务只改数据层，渲染在后续任务接。

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`（数据区，约 5046–5141）
- Test: `frontend/child-web-prototype/.tmp-pet-data-check.js`（Node 断言）

**Interfaces:**
- Produces:
  - `SPECIES`：`Record<'dragon'|'dino'|'hero', { id, name, accent, stageColor, stages }>`
  - `stages`：长度 5 的数组，每项 `{ level:number, key:string, name:string, reveal:string|null, nextGrowth:number|null, spriteId:string, scale:number }`
  - `state.speciesId: 'dragon'|'dino'|'hero'`（默认 `'dragon'`）
  - 全局 `getSpecies()` 返回 `SPECIES[state.speciesId]`，`getCurrentStage()` 返回当前阶对象。

- [ ] **Step 1: 写失败断言**

Create `frontend/child-web-prototype/.tmp-pet-data-check.js`（用 jsdom 或纯正则从 HTML 抽 `<script>` 跑）。最简做法：Node 里 `require('fs')` 读文件，`eval` 出 `SPECIES` 前先 `new Function`。这里用轻量方式——把数据抽成可被断言的结构：
```js
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/child-homepage.html', 'utf8');
// 断言：不再出现 elementMeta / elementOrder / petStages
for (const gone of ['const elementMeta', 'const elementOrder', 'const petStages', 'activeElement', 'unlockedElements']) {
  if (html.includes(gone)) { console.error('FAIL still present:', gone); process.exit(1); }
}
// 断言：SPECIES 三物种存在，各 5 阶
for (const id of ["id: 'dragon'", "id: 'dino'", "id: 'hero'"]) {
  if (!html.includes(id)) { console.error('FAIL missing species', id); process.exit(1); }
}
const stageMatches = html.match(/spriteId:\s*'sp-/g) || [];
if (stageMatches.length !== 15) { console.error('FAIL expected 15 stage sprites, got', stageMatches.length); process.exit(1); }
console.log('PASS pet-data');
```

- [ ] **Step 2: 跑，确认失败**

Run: `node frontend/child-web-prototype/.tmp-pet-data-check.js`
Expected: FAIL（`elementMeta` 等仍在、或 SPECIES 未定义）。

- [ ] **Step 3: 替换数据块**

删除 `petStages`（5046–5087）、`elementOrder`（5089）、`elementMeta`（5091–5127）三块，替换为 `SPECIES`：
```js
const SPECIES = {
  dragon: {
    id: 'dragon', name: '火龙', accent: '#E8461F', stageColor: '#1C3A4A',
    stages: [
      { level:1, key:'egg',       name:'龙蛋',       reveal:null,               nextGrowth:36, spriteId:'sp-dragon-1', scale:0.48 },
      { level:2, key:'hatchling', name:'破壳萌龙',   reveal:'裂壳光爆·奶龙探头', nextGrowth:60, spriteId:'sp-dragon-2', scale:0.72 },
      { level:3, key:'juvenile',  name:'成长幼龙',   reveal:null,               nextGrowth:80, spriteId:'sp-dragon-3', scale:0.98 },
      { level:4, key:'winged',    name:'展翼幼龙',   reveal:'翅膀第一次展开',    nextGrowth:100, spriteId:'sp-dragon-4', scale:1.24 },
      { level:5, key:'adult',     name:'喷火成龙',   reveal:'首次喷火',          nextGrowth:null, spriteId:'sp-dragon-5', scale:1.62 },
    ],
  },
  dino: {
    id: 'dino', name: '恐龙', accent: '#4E9E3E', stageColor: '#24402C',
    stages: [
      { level:1, key:'egg',       name:'恐龙蛋',   reveal:null,            nextGrowth:36, spriteId:'sp-dino-1', scale:0.48 },
      { level:2, key:'hatchling', name:'破壳幼崽', reveal:'破壳探头',       nextGrowth:60, spriteId:'sp-dino-2', scale:0.72 },
      { level:3, key:'juvenile',  name:'小恐龙',   reveal:null,            nextGrowth:80, spriteId:'sp-dino-3', scale:0.98 },
      { level:4, key:'awaken',    name:'甲刺觉醒', reveal:'甲刺+头冠鼻角',  nextGrowth:100, spriteId:'sp-dino-4', scale:1.24 },
      { level:5, key:'rex',       name:'霸王战龙', reveal:'首次震地咆哮',   nextGrowth:null, spriteId:'sp-dino-5', scale:1.55 },
    ],
  },
  hero: {
    id: 'hero', name: '光之英雄', accent: '#2A9BD8', stageColor: '#1E2E4A',
    stages: [
      { level:1, key:'core',    name:'光之核',     reveal:null,          nextGrowth:36, spriteId:'sp-hero-1', scale:0.48 },
      { level:2, key:'chibi',   name:'觉醒小英雄', reveal:'从光中觉醒',   nextGrowth:60, spriteId:'sp-hero-2', scale:0.72 },
      { level:3, key:'fighter', name:'成长斗士',   reveal:null,          nextGrowth:80, spriteId:'sp-hero-3', scale:0.98 },
      { level:4, key:'armored', name:'铠甲光刃',   reveal:'铠甲+光刃',    nextGrowth:100, spriteId:'sp-hero-4', scale:1.24 },
      { level:5, key:'titan',   name:'光之巨神',   reveal:'首次光束',     nextGrowth:null, spriteId:'sp-hero-5', scale:1.55 },
    ],
  },
};
```
把 `state`（5129–5141）里的 `activeElement`、`unlockedElements` 删除，新增 `speciesId: 'dragon'`；`level` 改为初始 `1`。在 `state` 之后加：
```js
const getSpecies = () => SPECIES[state.speciesId];
const getCurrentStage = () => getSpecies().stages[Math.max(0, Math.min(4, state.level - 1))];
```

- [ ] **Step 4: 跑，确认通过**

Run: `node frontend/child-web-prototype/.tmp-pet-data-check.js`
Expected: `PASS pet-data`

- [ ] **Step 5: Commit**

```bash
git add frontend/child-web-prototype/child-homepage.html frontend/child-web-prototype/.tmp-pet-data-check.js
git commit -m "feat(child-prototype): 三物种SPECIES数据模型，移除petStages/五行数据"
```

---

### Task 3: 移除 canvas 3D 渲染器、3D 数学与五行 DOM/JS

清掉旧宠物系统的实现残留：`pet3dCanvas` 与其渲染器类、3D 向量数学（`rotateX/Y/Z`、`cross`、`dot`、`transformChain` 等）、`dragonForms`/`dragonElementThemes`、以及 `elementSwitcher`/`elementCore*`/`elementOrbit` 的 DOM 与事件。为 Task 4 的 SVG 渲染腾位置。

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`（HTML 舞台约 4786；JS 约 5199–5680 的渲染器/数学；元素切换 DOM/JS）
- Test: `frontend/child-web-prototype/.tmp-pet-cleanup-check.js`

**Interfaces:**
- Produces: 一个空的 `#petStageMount` 容器（`<div id="petStageMount" class="pet-stage-mount"></div>`）替换原 `<canvas id="pet3dCanvas">`，供 Task 4 挂载 SVG。

- [ ] **Step 1: 写失败断言**

```js
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/child-homepage.html', 'utf8');
const gone = ['pet3dCanvas','function rotateX','function transformChain','dragonElementThemes','elementSwitcher','elementOrbit','dragonForms'];
for (const g of gone) if (html.includes(g)) { console.error('FAIL still present:', g); process.exit(1); }
if (!html.includes('id="petStageMount"')) { console.error('FAIL missing petStageMount'); process.exit(1); }
console.log('PASS cleanup');
```

- [ ] **Step 2: 跑，确认失败**

Run: `node frontend/child-web-prototype/.tmp-pet-cleanup-check.js`
Expected: FAIL（`pet3dCanvas` 等仍在）。

- [ ] **Step 3: 删除并替换**

- HTML：把 `<canvas class="pet-3d-canvas" id="pet3dCanvas" ...></canvas>`（约 4786）替换为 `<div id="petStageMount" class="pet-stage-mount" aria-label="宠物伙伴"></div>`。
- HTML：删除元素切换器整块 DOM（`elementSwitcher` / `elementCoreButton` / `elementCoreLabel` / `elementOrbit`）。
- JS：删除 3D 数学函数（`normalize`/`add3`/`sub3`/`scale3`/`cross`/`dot`/`averagePoints`/`rotateX`/`rotateY`/`rotateZ`/`rotatePoint`/`transformChain`/`offset2D` 及 `createDragonPalette`）、渲染器类整段、以及 `dragonMoodPose`/`dragonElementThemes`/`dragonVoiceBank` 里与 element 主题耦合的部分（`dragonVoiceBank` 若被互动文案复用则保留其文案、去掉 element 维度）。
- JS：删除所有 `elementSwitcher`/`elementCore*`/`elementOrbit` 的 `getElementById` 与事件绑定、以及引用 `elementMeta`/`unlockedElements`/`activeElement` 的函数体（如 `renderElements`、`shiftElement` 等）。
- 保留：`clamp`/`lerp`/`easeInOutSine`/`hexToRgb`/`rgbToHex`/`mixHex`/`shadeHex`/`rgba`/`pick`（通用工具，后续复用）。

- [ ] **Step 4: 跑，确认通过 + 页面无 JS 报错**

Run: `node frontend/child-web-prototype/.tmp-pet-cleanup-check.js` → Expected: `PASS cleanup`
再用 CDP 检查无控制台报错（复用仓库 `.tmp-*-cdp-check.py` 模式）：加载页面，断言 `window` 无未捕获异常、`#petStageMount` 存在。

- [ ] **Step 5: Commit**

```bash
git add frontend/child-web-prototype/child-homepage.html frontend/child-web-prototype/.tmp-pet-cleanup-check.js
git commit -m "refactor(child-prototype): 移除canvas 3D渲染器/3D数学/五行DOM，改挂petStageMount"
```

---

### Task 4: 注入火龙 5 阶 SVG 精灵 + 主舞台渲染器

把火龙 5 阶造型作为 `<symbol>` 注入隐藏精灵表，写主舞台渲染函数 `renderPetStage()`，按 `getCurrentStage().spriteId` 用 `<use>` 显示当前形态 + 呼吸待机动画。

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`（`<body>` 顶部加精灵表；JS 加渲染器）
- Source: `docs/engineering/specs/frontend/assets/2026-07-09-pet-redesign/dragon-route.html`（移植底稿）
- Test: `frontend/child-web-prototype/.tmp-pet-render-check.py`（Playwright 截图 + DOM 断言）

**Interfaces:**
- Consumes: `SPECIES`、`getCurrentStage()`（Task 2）；`#petStageMount`（Task 3）。
- Produces: `renderPetStage()`：把 `<svg class="pet-stage-svg"><use href="#<spriteId>"/></svg>` 写入 `#petStageMount`；`<symbol id="sp-dragon-1..5">`（含共享 `<defs>` 渐变/发光滤镜，id 前缀 `pg-` 防冲突）。

- [ ] **Step 1: 写失败断言（Playwright）**

`.tmp-pet-render-check.py`：加载 `child-homepage.html`，断言 `#petStageMount svg use` 的 `href` 为 `#sp-dragon-1`（默认 level 1），并保存 `.tmp-shot-dragon-1.png` 供人工核对。
Expected 现在：FAIL（无 `<use>`）。

- [ ] **Step 2: 跑，确认失败**

Run: `python frontend/child-web-prototype/.tmp-pet-render-check.py`
Expected: FAIL。

- [ ] **Step 3: 注入火龙精灵表**

在 `<body>` 顶部加一段隐藏 SVG，把 `dragon-route.html` 里 5 个 `<g transform=...>` 造型各自搬进一个 `<symbol id="sp-dragon-N" viewBox="0 0 100 130">`（去掉 lineup 的 translate/scale，仅保留局部造型，让每个 symbol 自成一体、以 viewBox 居中）。共享 `<defs>`（`dBody`/`dHorn`/`dFlame`/`dCore`/`dEgg`/`dGlow`）放在精灵表顶部，id 前缀统一改 `pg-` 避免与页面其它 svg 冲突：
```html
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs> … pg-dBody / pg-dHorn / pg-dFlame / pg-dCore / pg-dEgg / pg-dGlow … </defs>
  <symbol id="sp-dragon-1" viewBox="0 0 100 130"> …龙蛋造型… </symbol>
  <symbol id="sp-dragon-2" viewBox="0 0 100 130"> …破壳萌龙… </symbol>
  <symbol id="sp-dragon-3" viewBox="0 0 100 130"> …成长幼龙… </symbol>
  <symbol id="sp-dragon-4" viewBox="0 0 100 130"> …展翼幼龙… </symbol>
  <symbol id="sp-dragon-5" viewBox="0 0 100 130"> …喷火成龙… </symbol>
</svg>
```

- [ ] **Step 4: 写主舞台渲染器**

```js
const petStageMount = document.getElementById('petStageMount');
function renderPetStage() {
  const stage = getCurrentStage();
  petStageMount.innerHTML =
    `<svg class="pet-stage-svg" viewBox="0 0 100 130" role="img" aria-label="${getSpecies().name}·${stage.name}">
       <use href="#${stage.spriteId}"></use>
     </svg>`;
  petStageMount.style.setProperty('--accent', getSpecies().accent);
}
```
CSS 加 `.pet-stage-svg{width:min(62vw,300px);height:auto;animation:petBreath 3.4s ease-in-out infinite}` 与 `@keyframes petBreath{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-2%) scale(1.02)}}`。在初始化处调用 `renderPetStage()`。

- [ ] **Step 5: 跑，确认通过 + 人工看截图**

Run: `python frontend/child-web-prototype/.tmp-pet-render-check.py`
Expected: PASS（`href="#sp-dragon-1"`）；打开 `.tmp-shot-dragon-1.png` 确认是精致龙蛋、非旧圣龙。

- [ ] **Step 6: Commit**

```bash
git add frontend/child-web-prototype/child-homepage.html frontend/child-web-prototype/.tmp-pet-render-check.py
git commit -m "feat(child-prototype): 注入火龙5阶SVG精灵+主舞台渲染器"
```

---

### Task 5: 进化演出动画 + 接 evolve 按钮 / 成长阈值

实现"蓄力→光爆→揭晓→庆祝"4 拍进化动画（光爆盖住瞬间换 `<use>`），点击 evolve（或成长值达 `nextGrowth`）时 `state.level++` 并播放。

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`
- Source: `docs/engineering/specs/frontend/assets/2026-07-09-pet-redesign/evolution-anim.html`（keyframes/结构底稿）
- Test: `frontend/child-web-prototype/.tmp-evolution-check.py`

**Interfaces:**
- Consumes: `renderPetStage()`、`getCurrentStage()`、`state.level`、`evolveButton`（现有 DOM `#evolveButton`）。
- Produces: `playEvolution(nextLevel)`：叠加白光/光线/星屑层，动画中点切 `<use href>` 到新 spriteId，动画结束调用 `renderPetStage()` 并弹 `stage.reveal` 文案气泡。

- [ ] **Step 1: 写失败断言（Playwright）**

`.tmp-evolution-check.py`：加载页面，`state.level=1`，点击 `#evolveButton`，等 1.2s 后断言 `#petStageMount use` 的 href 变为 `#sp-dragon-2`，并断言 DOM 出现过 `.evo-flash`（可用 `page.wait_for_selector('.evo-flash')`）。截图 `.tmp-shot-evo.png`。
Expected: FAIL。

- [ ] **Step 2: 跑，确认失败**

Run: `python frontend/child-web-prototype/.tmp-evolution-check.py`
Expected: FAIL。

- [ ] **Step 3: 实现 playEvolution**

移植 `evolution-anim.html` 的 CSS keyframes（`evFlash`/`evRays`/`evSpark`/`evGlow` 等，前缀 `evo-`），写：
```js
function playEvolution(nextLevel) {
  const overlay = document.createElement('div');
  overlay.className = 'evo-overlay';
  overlay.innerHTML = `<div class="evo-glow"></div><div class="evo-rays"></div><div class="evo-flash"></div><div class="evo-spark"></div>`;
  petStageMount.appendChild(overlay);
  petStageMount.classList.add('evo-old-shake');
  // 光爆最亮时换形态（~1.05s，对应 keyframe flash 峰值）
  setTimeout(() => { state.level = nextLevel; renderPetStage(); }, 1050);
  setTimeout(() => {
    overlay.remove();
    petStageMount.classList.remove('evo-old-shake');
    const reveal = getCurrentStage().reveal;
    if (reveal) showPetSpeech(reveal); // 复用现有气泡函数
  }, 2200);
}
```
`renderPetStage()` 在 `evo-overlay` 存在时需保持 overlay 在最上层（overlay 用 `position:absolute;inset:0;z-index:5`）。给 `evolveButton` 绑定：`if (state.level < 5) playEvolution(state.level + 1)`。若已有"成长值达标才可进化"逻辑，则在 `state.growth >= getCurrentStage().nextGrowth` 时启用按钮。

- [ ] **Step 4: 跑，确认通过 + 看截图/录屏**

Run: `python frontend/child-web-prototype/.tmp-evolution-check.py`
Expected: PASS（href 变 `#sp-dragon-2`，出现过 `.evo-flash`）。人工确认演出有"光爆→新形态"观感。

- [ ] **Step 5: Commit**

```bash
git add frontend/child-web-prototype/child-homepage.html frontend/child-web-prototype/.tmp-evolution-check.py
git commit -m "feat(child-prototype): 进化演出动画(光爆换装)+接evolve按钮"
```

---

### Task 6: 图鉴弹窗改为 5 阶同地平线个头阶梯

把现有进化图鉴弹窗（`evolutionModal`/`evolutionRail`）的内容换成"5 阶同一地平线、按 `stage.scale` 递增"的阶梯图（就是已批准的 lineup 观感），当前物种驱动。

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`（`evolutionRail` 渲染逻辑）
- Source: `docs/engineering/specs/frontend/assets/2026-07-09-pet-redesign/dragon-route.html`（同地平线布局参考）
- Test: `frontend/child-web-prototype/.tmp-gallery-check.py`

**Interfaces:**
- Consumes: `getSpecies().stages`（含 `scale`/`name`/`reveal`）、`#evolutionRail`。
- Produces: `renderEvolutionRail()`：一张宽 SVG，5 个 `<use>` 按 `scale` 落在同一 `y` 基线、`x` 递增，下方标注阶名 + ★（有 reveal 的阶）。

- [ ] **Step 1: 写失败断言**

`.tmp-gallery-check.py`：打开图鉴弹窗，断言 `#evolutionRail svg use` 恰 5 个、`href` 依次 `#sp-dragon-1..5`；截图 `.tmp-shot-gallery.png`。Expected: FAIL。

- [ ] **Step 2: 跑，确认失败**

Run: `python frontend/child-web-prototype/.tmp-gallery-check.py` → FAIL。

- [ ] **Step 3: 实现 renderEvolutionRail**

```js
function renderEvolutionRail() {
  const stages = getSpecies().stages;
  const GROUND = 188, VB_W = 640;
  const cx = [55,132,235,365,520];
  const uses = stages.map((s,i) => {
    const sc = s.scale, w = 100*sc, h = 130*sc;
    const x = cx[i]-w/2, y = GROUND - 120*sc;
    return `<use href="#${s.spriteId}" x="${x}" y="${y}" width="${w}" height="${h}"/>
            <text x="${cx[i]}" y="205" text-anchor="middle" fill="#CFE3EE" font-size="12">${s.name}${s.reveal?' ★':''}</text>`;
  }).join('');
  evolutionRail.innerHTML =
    `<svg viewBox="0 0 ${VB_W} 214" width="100%"><line x1="12" y1="${GROUND}" x2="628" y2="${GROUND}" stroke="#3A5A6E"/>${uses}</svg>`;
}
```
在打开图鉴时调用。`<use>` 支持 `x/y/width/height` 定位缩放，避免逐个 transform。

- [ ] **Step 4: 跑，确认通过 + 看截图**

Run: `python frontend/child-web-prototype/.tmp-gallery-check.py` → PASS；`.tmp-shot-gallery.png` 呈现个头递增阶梯。

- [ ] **Step 5: Commit**

```bash
git add frontend/child-web-prototype/child-homepage.html frontend/child-web-prototype/.tmp-gallery-check.py
git commit -m "feat(child-prototype): 图鉴改为5阶同地平线个头阶梯"
```

---

### Task 7: 注入恐龙 5 阶精灵（第 2 物种）

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`
- Source: `docs/engineering/specs/frontend/assets/2026-07-09-pet-redesign/dino-route.html`
- Test: `frontend/child-web-prototype/.tmp-dino-check.py`

**Interfaces:**
- Consumes: 精灵表结构（Task 4）、`renderPetStage()`。
- Produces: `<symbol id="sp-dino-1..5">` + 绿色系 `<defs>`（前缀 `pn-`）。

- [ ] **Step 1: 写失败断言**

`.tmp-dino-check.py`：JS 里临时 `state.speciesId='dino'; state.level=5; renderPetStage()`，断言 `use href="#sp-dino-5"`；截图。Expected: FAIL（symbol 不存在→空渲染）。

- [ ] **Step 2: 跑，确认失败**

Run: `python frontend/child-web-prototype/.tmp-dino-check.py` → FAIL。

- [ ] **Step 3: 注入恐龙精灵**

把 `dino-route.html` 5 个造型搬进 `<symbol id="sp-dino-1..5" viewBox="0 0 100 130">`，绿系 `<defs>`（`pn-nBody`/`pn-nEgg`/`pn-nPlate`/`pn-nHorn`/`pn-nCore`/`pn-nGlow`）加进精灵表。去掉 lineup 的外层 translate/scale。

- [ ] **Step 4: 跑，确认通过 + 看截图**

Run: `python frontend/child-web-prototype/.tmp-dino-check.py` → PASS；截图为绿色霸王战龙。

- [ ] **Step 5: Commit**

```bash
git add frontend/child-web-prototype/child-homepage.html frontend/child-web-prototype/.tmp-dino-check.py
git commit -m "feat(child-prototype): 注入恐龙5阶SVG精灵"
```

---

### Task 8: 注入光之英雄 5 阶精灵（第 3 物种）

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`
- Source: `docs/engineering/specs/frontend/assets/2026-07-09-pet-redesign/hero-route.html`
- Test: `frontend/child-web-prototype/.tmp-hero-check.py`

**Interfaces:**
- Produces: `<symbol id="sp-hero-1..5">` + 蓝银光 `<defs>`（前缀 `pl-`，含 `pl-lBeam`/`pl-lAura`）。

- [ ] **Step 1: 写失败断言**

`.tmp-hero-check.py`：`state.speciesId='hero'; state.level=5; renderPetStage()`，断言 `use href="#sp-hero-5"`；截图。Expected: FAIL。

- [ ] **Step 2: 跑，确认失败**

Run: `python frontend/child-web-prototype/.tmp-hero-check.py` → FAIL。

- [ ] **Step 3: 注入光之英雄精灵**

把 `hero-route.html` 5 个造型搬进 `<symbol id="sp-hero-1..5" viewBox="0 0 100 130">`，蓝银光 `<defs>`（`pl-lBody`/`pl-lArmor`/`pl-lCore`/`pl-lGold`/`pl-lAura`/`pl-lBeam`/`pl-lGlow`）加进精灵表。

- [ ] **Step 4: 跑，确认通过 + 看截图**

Run: `python frontend/child-web-prototype/.tmp-hero-check.py` → PASS；截图为蓝银光之巨神 + 光束。

- [ ] **Step 5: Commit**

```bash
git add frontend/child-web-prototype/child-homepage.html frontend/child-web-prototype/.tmp-hero-check.py
git commit -m "feat(child-prototype): 注入光之英雄5阶SVG精灵"
```

---

### Task 9: 开局选宠物界面 + 记住选择

首访显示"选择伙伴"覆盖层：3 物种 stage-1 并排 + 一句气质文案，点选写入 `state.speciesId` 并 `localStorage` 持久化；已选过则跳过。选定后重渲染主舞台/图鉴。

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`
- Test: `frontend/child-web-prototype/.tmp-select-check.py`

**Interfaces:**
- Consumes: `SPECIES`、`renderPetStage()`、`renderEvolutionRail()`。
- Produces: `#petSelectOverlay` DOM + `openPetSelect()` / `choosePet(id)`；`localStorage['hw_pet_species']`。

- [ ] **Step 1: 写失败断言**

`.tmp-select-check.py`：清 `localStorage`，加载页面，断言 `#petSelectOverlay` 可见且含 3 张卡；点第 3 张（hero），断言 overlay 消失、`#petStageMount use` href 前缀 `#sp-hero-`、`localStorage['hw_pet_species']==='hero'`。重载页面断言 overlay 不再出现。Expected: FAIL。

- [ ] **Step 2: 跑，确认失败**

Run: `python frontend/child-web-prototype/.tmp-select-check.py` → FAIL。

- [ ] **Step 3: 实现选择层**

```js
function openPetSelect() {
  const cards = Object.values(SPECIES).map(sp =>
    `<button class="pet-select-card" data-id="${sp.id}" style="--accent:${sp.accent}">
       <svg viewBox="0 0 100 130"><use href="#${sp.stages[0].spriteId}"></use></svg>
       <span class="pet-select-name">${sp.name}</span>
     </button>`).join('');
  const ov = document.createElement('div');
  ov.id = 'petSelectOverlay'; ov.className = 'pet-select-overlay';
  ov.innerHTML = `<h2 class="pet-select-title">选择你的伙伴</h2><div class="pet-select-row">${cards}</div>`;
  document.body.appendChild(ov);
  ov.querySelectorAll('.pet-select-card').forEach(b =>
    b.addEventListener('click', () => choosePet(b.dataset.id)));
}
function choosePet(id) {
  state.speciesId = id; state.level = 1;
  try { localStorage.setItem('hw_pet_species', id); } catch (e) {}
  document.getElementById('petSelectOverlay')?.remove();
  renderPetStage(); renderEvolutionRail();
}
// 初始化：
(function initPet(){
  const saved = (()=>{ try { return localStorage.getItem('hw_pet_species'); } catch(e){ return null; } })();
  if (saved && SPECIES[saved]) { state.speciesId = saved; renderPetStage(); }
  else { openPetSelect(); }
})();
```
CSS 加 `.pet-select-overlay`（全屏、居中、半透明底）、`.pet-select-card`（大点区、圆角、选中态用 `--accent`）、`.pet-select-row`（3 列，移动端优先）。

- [ ] **Step 4: 跑，确认通过 + 看截图**

Run: `python frontend/child-web-prototype/.tmp-select-check.py` → PASS。人工核对三卡观感 + 记忆生效。

- [ ] **Step 5: Commit**

```bash
git add frontend/child-web-prototype/child-homepage.html frontend/child-web-prototype/.tmp-select-check.py
git commit -m "feat(child-prototype): 开局选宠物界面+localStorage记忆"
```

---

### Task 10: 全物种回归 + 清理临时脚本 + 归档旧稿

三物种整链跑通、互动/成长/里程碑不回归；清理 `.tmp-*` 检查脚本；把被取代的旧设计稿归档。

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`（如有回归修复）
- Delete: `frontend/child-web-prototype/.tmp-*`（本轮及历史临时脚本/产物）
- Move: `docs/engineering/specs/frontend/2026-07-05-child-homepage-sacred-dragon-design.md` → `docs/archive/engineering/specs/`
- Move: `docs/engineering/specs/frontend/2026-07-06-child-homepage-3d-dragon-design.md` → `docs/archive/engineering/specs/`
- Move: `docs/engineering/plans/2026-07-06-child-homepage-3d-dragon-implementation.md` → `docs/archive/engineering/plans/child-prototype/`
- Test: `frontend/child-web-prototype/.tmp-regression-check.py`（跑完即删）

**Interfaces:**
- Consumes: 全部前序产物。

- [ ] **Step 1: 写全物种回归断言**

`.tmp-regression-check.py`：对 `['dragon','dino','hero']` × `level 1..5`：设 `state`、`renderPetStage()`，断言 `use href` 命中 `#sp-<id>-<level>`；再触发一次进化断言 href 前进；断言喂食/打盹/说话按钮点击后各自 DOM 反应存在（沿用现有互动函数）；断言页面无控制台报错。逐一截图。

- [ ] **Step 2: 跑，修回归至通过**

Run: `python frontend/child-web-prototype/.tmp-regression-check.py`
Expected: PASS（15 组形态 + 互动 + 无报错）。有回归就改 `child-homepage.html` 直到通过。

- [ ] **Step 3: 删除临时脚本**

```bash
rm -f frontend/child-web-prototype/.tmp-*
```

- [ ] **Step 4: 归档被取代的旧设计稿**

```bash
mkdir -p docs/archive/engineering/plans/child-prototype
git mv docs/engineering/specs/frontend/2026-07-05-child-homepage-sacred-dragon-design.md docs/archive/engineering/specs/
git mv docs/engineering/specs/frontend/2026-07-06-child-homepage-3d-dragon-design.md docs/archive/engineering/specs/
git mv docs/engineering/plans/2026-07-06-child-homepage-3d-dragon-implementation.md docs/archive/engineering/plans/child-prototype/
```
（若这些文件本就未纳入版本控制，则用普通 `mv`。）

- [ ] **Step 5: Commit**

```bash
git add -A frontend/child-web-prototype/child-homepage.html docs/
git commit -m "chore(child-prototype): 全物种回归修复+清理临时脚本+归档旧圣龙/3D龙稿"
```

---

## Self-Review

**Spec coverage（逐节对照）：**
- §2 核心决策：3 物种(T2/7/8) · 英雄卡通(T4/7/8 移植) · 5 阶节奏(T2 数据) · 从萌到酷(造型内含) · 进化演出(T5) · 砍五行(T2/3) ✓
- §3 三角色 5 阶路线：T2 数据 + T4/7/8 造型 ✓
- §4 造型规范：个头递增(T6 阶梯 + `scale`) · 头部差异(移植稿已含) · 身份锚点(各物种 accent/defs) ✓
- §5 进化演出：T5（4 拍 + 光爆换装 + reveal 文案）✓
- §6 选宠物 UX：T9 ✓
- §7 技术边界：单文件 SVG(全程) · 移除 3D(T3) · 保留壳(全程约束) ✓
- §8 后端映射：数据字段 `level/species` 对齐 `Pet.Stage/Species/GrowthPoints`（T2 结构，前端原型不改后端）✓
- §9 分期：T4→T7→T8→T9 正是"火龙→恐龙→英雄→选择" ✓
- §10 验收：T10 回归覆盖 ✓
- §11 待确认：本计划按"砍五行/光之核/先火龙/SVG稿后精修"落地，若创始人复审改动则回带对应 Task。

**Placeholder scan:** 造型步骤以"从具名参考文件移植第 N 阶"给出确切来源与目标 symbol id，非占位；系统步骤含完整 JS。无 TBD/TODO。

**Type consistency:** `spriteId` 命名 `sp-<species>-<level>` 全计划一致；`getCurrentStage()`/`renderPetStage()`/`renderEvolutionRail()`/`playEvolution()`/`choosePet()` 跨任务签名一致；`state.speciesId`/`state.level` 全程一致。

## 备注（美术精修口子）

本计划产出的是"英雄卡通矢量方向稿"版本，满足 spec 验收。spec §7、§11.4 记录的"上线前可换高清美术（AI 生成/委托）"是后续独立事项：届时只需替换各 `<symbol>` 内容或改用位图 `<image>`，`spriteId`/数据/动画/选择逻辑均不动。

# Child Homepage Declutter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify the child homepage so the pet stage becomes the main storyteller, while redundant status panels are removed and reward/feeding stays clear.

**Architecture:** Keep the existing standalone HTML prototype and refactor it in place. Move repeated state information out of separate cards and into the pet stage animation, compact badges near the growth rail, and a single reward-focused `补给台` interaction zone.

**Tech Stack:** Standalone HTML, CSS, vanilla JavaScript

---

### Task 1: Remove redundant homepage cards

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`

**Step 1: Simplify the left stage markup**

- Remove the standalone `伙伴状态` card from `frontend/child-web-prototype/child-homepage.html`
- Remove the four-item `今日战力` grid from `frontend/child-web-prototype/child-homepage.html`
- Keep the pet stage, evolution controls, gallery trigger, and bottom growth panel

**Step 2: Add compact hard-info badges**

- Add two small badges near the growth rail in `frontend/child-web-prototype/child-homepage.html`
- Badge content:
  - `Lv`
  - `晶核`

**Step 3: Trim now-unused helper elements**

- Remove now-unused labels and wrappers tied only to `伙伴状态`, `已完成`, `待喂`, and duplicated `状态`
- Keep top summary stats and right-side `今日委托` + `补给台`

**Step 4: Verify markup still parses**

Run:

```powershell
@'
const fs = require('fs');
const html = fs.readFileSync('frontend/child-web-prototype/child-homepage.html', 'utf8');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
if (dupes.length) throw new Error('Duplicate ids: ' + [...new Set(dupes)].join(', '));
const match = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);
if (!match) throw new Error('script block not found');
new Function(match[1]);
console.log('HTML ids ok; JS parse ok');
'@ | node -
```

Expected: `HTML ids ok; JS parse ok`

---

### Task 2: Turn pet state into animation-first feedback

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`

**Step 1: Keep only one visible state label**

- Retain the short head tag above the pet
- Limit visible labels to short words such as:
  - `待命`
  - `待喂`
  - `可进化`
  - `满状态`

**Step 2: Extend CSS for state-driven motion**

- Update the pet CSS in `frontend/child-web-prototype/child-homepage.html` so each `data-mode` reads differently
- Add or refine:
  - idle breathing
  - more active flame / stance for progress
  - eager bounce for feed-ready
  - stronger glow / energy ring for evolution-ready
  - celebratory particles or proud pose for all-clear

**Step 3: Move status copy to transient feedback only**

- Remove persistent long-form status output from the stage
- Reuse short floating or temporary feedback near the pet for:
  - `成长+12`
  - `晶核+1`
  - evolution-ready cue

**Step 4: Verify visual state mapping in script**

- Update the render logic in `frontend/child-web-prototype/child-homepage.html` so pet mode and top label still match each daily state
- Manually check:
  - rest day
  - not started
  - in progress
  - feed ready
  - evolution ready
  - all clear

---

### Task 3: Rebuild the reward area into a single `补给台`

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`

**Step 1: Rename and simplify the reward panel**

- Keep only one reward action area labeled `补给台`
- Remove any duplicate “待喂” summary outside this panel

**Step 2: Make reward inventory visual**

- Show up to 3 visible food drops in `frontend/child-web-prototype/child-homepage.html`
- Add a compact overflow marker like `+2` if queue size exceeds visible items
- Empty state should use a short prompt such as `去拿补给`

**Step 3: Update the feed button contract**

- Button text rules:
  - `喂给伙伴`
  - `喂给伙伴 x2`
- Make the button the only primary action in the panel

**Step 4: Add the feed-to-pet motion**

- On feed:
  - animate reward icons toward the pet stage
  - pulse the growth rail
  - trigger pet reaction
  - show short floating feedback like `成长+12`

**Step 5: Re-run syntax verification**

Run the same verification command from Task 1.

Expected: `HTML ids ok; JS parse ok`

---

### Task 4: Clean script state ownership after UI consolidation

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`

**Step 1: Remove references to deleted DOM nodes**

- Delete unused `getElementById(...)` bindings for removed cards and fields
- Delete render assignments that only fed removed UI blocks

**Step 2: Reassign remaining state outputs**

- Keep these outputs only:
  - top stats
  - pet top tag
  - pet mode
  - compact `Lv` / `晶核`
  - growth rail
  - reward queue / feed action
  - task list

**Step 3: Check each source of truth is unique**

- `今日进度` only in the top stats
- `待喂` only in `补给台`
- main pet state only on the pet stage

**Step 4: Run syntax and duplicate-id verification**

Run the same verification command from Task 1.

Expected: `HTML ids ok; JS parse ok`

---

### Task 5: Manual browser review

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`

**Step 1: Open the prototype locally**

Run:

```powershell
Start-Process 'D:\WorkSpaces\night-king\Homework\docs\prototypes\child-homepage.html'
```

**Step 2: Review the approved product goals**

- The homepage feels cleaner than the previous version
- The pet stage is the first focus
- `伙伴状态` no longer exists as a text card
- `今日战力` no longer duplicates top metrics
- `待喂` appears only in `补给台`
- Pet state feels animated instead of explained

**Step 3: Adjust spacing only if needed**

- If the page still feels busy, reduce labels before adding new visuals
- Prefer deleting UI over adding helper copy

**Step 4: Final verification**

Run the same verification command from Task 1 after the last change.

Expected: `HTML ids ok; JS parse ok`

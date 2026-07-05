# Child Homepage Elemental Evolution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the child homepage pet prototype so evolution makes the dragon visibly grow, while `金 / 木 / 水 / 火 / 土` elemental forms unlock over time and can be switched on the homepage.

**Architecture:** Keep the existing standalone HTML prototype and extend its pet stage model in place. Split visual growth from elemental form state: stage level controls the dragon's body scale and silhouette, while the active element controls colors, effects, and short transformation feedback.

**Tech Stack:** Standalone HTML, CSS, vanilla JavaScript

---

### Task 1: Extend the pet data model for elemental forms

**Files:**
- Modify: `docs/prototypes/child-homepage.html`

**Step 1: Expand stage metadata**

- Update the `petStages` data in `docs/prototypes/child-homepage.html`
- Add stage-level metadata for:
  - stronger size tier
  - silhouette emphasis
  - newly unlocked element at this stage

**Step 2: Add elemental metadata**

- Add a new element configuration object in `docs/prototypes/child-homepage.html`
- Include:
  - `metal`
  - `wood`
  - `water`
  - `fire`
  - `earth`

Each element definition should include:
- display name
- primary color set
- icon token
- effect keywords
- unlock stage

**Step 3: Add element state to runtime data**

- Extend the `state` object in `docs/prototypes/child-homepage.html`
- Track:
  - current active element
  - unlocked element list
  - short transformation cue state if needed

**Step 4: Verify script parsing**

Run:

```powershell
@'
const fs = require('fs');
const html = fs.readFileSync('docs/prototypes/child-homepage.html', 'utf8');
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

### Task 2: Make stage evolution visibly grow the dragon

**Files:**
- Modify: `docs/prototypes/child-homepage.html`

**Step 1: Refactor stage-based pet CSS**

- Update the stage selectors in `docs/prototypes/child-homepage.html` for:
  - `data-stage="1"`
  - `data-stage="2"`
  - `data-stage="3"`
  - `data-stage="4"`
  - `data-stage="5"`

**Step 2: Make each stage visibly different**

- For every stage, change more than color
- Adjust combinations of:
  - overall scale
  - head/body proportion
  - horn size
  - wing span
  - tail length
  - stance / posture

**Step 3: Emphasize the three biggest jumps**

- Ensure `2 -> 3`, `3 -> 4`, and `4 -> 5` each feel substantial
- Avoid “just a small accessory” progression

**Step 4: Verify in browser after changes**

- Confirm the dragon reads as:
  - baby dragon
  - small battle pet
  - young flying dragon
  - guardian dragon
  - king form

---

### Task 3: Add the elemental switcher to the pet stage

**Files:**
- Modify: `docs/prototypes/child-homepage.html`

**Step 1: Add homepage element switcher markup**

- Add a compact element-core control near the pet’s upper-right area
- Keep it inside the stage, not as a new panel

**Step 2: Define element button states**

- Current element: highlighted pulse
- Unlocked elements: clickable
- Locked elements: muted with small lock or `?`

**Step 3: Add expand/collapse interaction**

- Default state shows only the active element core
- Click expands into a half-ring or fan of element buttons
- Click outside or escape closes it

**Step 4: Keep layout clean on mobile**

- Add a responsive fallback so the switcher does not collide with:
  - evolution route
  - gallery trigger
  - growth rail

**Step 5: Re-run syntax verification**

Run the same verification command from Task 1.

Expected: `HTML ids ok; JS parse ok`

---

### Task 4: Apply element-driven visual identity to the dragon

**Files:**
- Modify: `docs/prototypes/child-homepage.html`

**Step 1: Add an element attribute to the pet**

- Set a pet-level attribute such as `data-element`
- Make rendering assign one of:
  - `metal`
  - `wood`
  - `water`
  - `fire`
  - `earth`

**Step 2: Create element-specific CSS variants**

- Fire: flame-heavy, hot glow
- Water: wave / rain / frost cues
- Wood: leaf / vine / airy green motion
- Earth: stone armor / dust / weight
- Metal: silver-gold highlights, electric slash / arc cues

**Step 3: Vary more than color**

- Change combinations of:
  - aura
  - tail treatment
  - horn / wing edge accents
  - stage floor effect
  - particles

**Step 4: Keep identity consistent**

- No matter the element, the dragon must still read as the same companion
- Stage progression should remain the stronger identity layer than color swapping alone

---

### Task 5: Add short elemental transformation feedback

**Files:**
- Modify: `docs/prototypes/child-homepage.html`

**Step 1: Add element switch interaction in script**

- Clicking an unlocked element should:
  - set active element
  - trigger a short stage-local effect
  - update the switcher highlight

**Step 2: Add short transformation cues**

- Trigger a 0.6 to 1 second transition:
  - color sweep
  - aura change
  - pet accent change
  - short floating label such as `水系激活`

**Step 3: Add locked-state feedback**

- Clicking a locked element should not shame the child
- Show short expectation cues such as:
  - `2阶解锁`
  - `5阶解锁`

**Step 4: Keep switching free**

- Do not deduct growth, crystals, or any other resource
- This interaction exists for delight, identity, and replay value

---

### Task 6: Show element unlocks in the evolution gallery

**Files:**
- Modify: `docs/prototypes/child-homepage.html`

**Step 1: Extend each evolution card**

- Add a small row to each stage card in the gallery
- Label it like `本阶新增`

**Step 2: Render unlock badges by stage**

- Show the newly unlocked element for each stage
- Use:
  - full-color badge if unlocked
  - muted badge / lock if not unlocked yet

**Step 3: Keep hierarchy clear**

- Stage growth remains the primary story
- Element unlocks remain a secondary reward line

**Step 4: Update gallery summary copy**

- Mention both:
  - current stage
  - current unlocked element count or next unlock

**Step 5: Re-run syntax verification**

Run the same verification command from Task 1.

Expected: `HTML ids ok; JS parse ok`

---

### Task 7: Manual browser review of the full elemental loop

**Files:**
- Modify: `docs/prototypes/child-homepage.html`

**Step 1: Open the prototype locally**

Run:

```powershell
Start-Process 'D:\WorkSpaces\night-king\Homework\.worktrees\child-homepage-declutter\docs\prototypes\child-homepage.html'
```

**Step 2: Review the visual goals**

- Evolution clearly makes the dragon look older and larger
- Element switching feels like “same dragon, different battle mode”
- `金 / 木 / 水 / 火 / 土` all read differently
- `风 / 雨 / 雷 / 电` appear only as effect language, not separate top-level attributes
- The homepage stays clean despite the new switcher

**Step 3: Review progression goals**

- Stage 1 shows only `火`
- Stage 2 introduces `水`
- Stage 3 introduces `木`
- Stage 4 introduces `土`
- Stage 5 introduces `金`

**Step 4: Final verification**

Run the same verification command from Task 1 after the last change.

Expected: `HTML ids ok; JS parse ok`

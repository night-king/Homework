# Child Homepage Sacred Dragon Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the homepage pet into a five-stage sacred guardian dragon with much larger silhouette changes while preserving the existing day-switching, feeding, growth, and elemental unlock interactions.

**Architecture:** Keep the standalone homepage prototype in a single HTML file and evolve the current `pet-core` system instead of replacing it. Reuse the existing stage and element state, add a few lightweight anatomy nodes, then drive visual growth with stage-level CSS variables and targeted per-stage overrides.

**Tech Stack:** Standalone HTML, CSS, vanilla JavaScript

---

### Task 1: Align pet data and copy with the sacred dragon line

**Files:**
- Modify: `docs/prototypes/child-homepage.html`

**Step 1: Rename the five stage entries**

- Update the `petStages` array in `docs/prototypes/child-homepage.html`
- Replace the current placeholder dragon names with:
  - `焰尾幼龙`
  - `角焰迅龙`
  - `翼焰圣龙`
  - `岩甲守护龙`
  - `曜冠圣焰龙`

**Step 2: Refresh short stage descriptions**

- Replace the short `description` fields so each stage matches the approved silhouette intent:
  - 1st stage: cute flame-tailed baby dragon
  - 2nd stage: fast horned juvenile dragon
  - 3rd stage: first winged sacred dragon
  - 4th stage: armored guardian dragon
  - 5th stage: crowned sacred dragon king

**Step 3: Update pet-facing copy strings**

- Update short UI copy in `docs/prototypes/child-homepage.html` that references evolution state so it matches the sacred dragon line
- Keep copy short and child-friendly

**Step 4: Run script validation**

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

### Task 2: Extend the pet markup with sacred dragon anatomy hooks

**Files:**
- Modify: `docs/prototypes/child-homepage.html`

**Step 1: Add a neck node**

- Insert a `pet-neck` element inside the existing pet body structure
- Position it so 1st stage can keep it nearly hidden and 5th stage can stretch it visibly

**Step 2: Add back-spine nodes**

- Add a lightweight `pet-spines` wrapper with a small number of decorative spine segments
- Keep the markup small enough to remain maintainable in a single file

**Step 3: Add sacred chest and forearm hooks**

- Add:
  - `pet-chest-core`
  - left and right `pet-forearm-guard`
- Use them later for 3rd-stage sacred marks and 4th/5th-stage guardian armor

**Step 4: Add minimal base styles**

- Add neutral default CSS for the new nodes in `docs/prototypes/child-homepage.html`
- Make them safe for all stages before per-stage tuning

**Step 5: Run script validation**

Run the same parse command from Task 1.

Expected: `HTML ids ok; JS parse ok`

---

### Task 3: Refactor stage variables so each stage changes silhouette, not just accessories

**Files:**
- Modify: `docs/prototypes/child-homepage.html`

**Step 1: Add new stage-scale variables**

- Introduce stage-level CSS variables such as:
  - `--neck-length`
  - `--chest-width`
  - `--leg-length`
  - `--stance-width`
  - `--crown-scale`
  - `--flame-size`

**Step 2: Rebalance stage 1**

- Make `data-stage="1"` clearly baby-like:
  - larger head ratio
  - shorter body
  - almost invisible neck
  - no crown
  - oversized tail flame

**Step 3: Rebalance stage 3**

- Make `data-stage="3"` the first major evolution jump:
  - fully visible wings
  - taller chest
  - longer neck
  - more heroic upright posture

**Step 4: Rebalance stage 5**

- Make `data-stage="5"` the crowned sacred-dragon endpoint:
  - longest neck
  - strongest wing span
  - complete crown
  - brightest sacred flame core

**Step 5: Fill in stage 2 and stage 4 transitions**

- Tune 2nd stage as the adolescent runner form
- Tune 4th stage as the heavy guardian form
- Ensure 1 → 5 reads as a continuous single creature

**Step 6: Run script validation**

Run the same parse command from Task 1.

Expected: `HTML ids ok; JS parse ok`

---

### Task 4: Turn existing horn, wing, armor, and crown parts into sacred-dragon landmarks

**Files:**
- Modify: `docs/prototypes/child-homepage.html`

**Step 1: Rework horn progression**

- Keep 1st stage horns hidden
- Make 2nd stage horns short and visible
- Make 5th stage horns visually merge into the crowned silhouette

**Step 2: Rework wing progression**

- Keep 1st and 2nd stage wings effectively absent
- Make 3rd stage wings the first dominant silhouette marker
- Make 4th stage wings broader and shield-like
- Make 5th stage wings longer and more regal

**Step 3: Rework armor progression**

- Keep 1st and 2nd stage armor nearly invisible
- Show first sacred chest motif in 3rd stage
- Make 4th stage armor defensive and heavy
- Make 5th stage armor bright and ceremonial

**Step 4: Rework crown progression**

- Keep crown hidden through stage 3
- Show a crown bud or brow crest in stage 4
- Fully reveal the crown in stage 5

**Step 5: Run script validation**

Run the same parse command from Task 1.

Expected: `HTML ids ok; JS parse ok`

---

### Task 5: Keep elemental identity while preventing visual overload

**Files:**
- Modify: `docs/prototypes/child-homepage.html`

**Step 1: Keep the dragon body consistent across elements**

- Do not turn each element into a different creature
- Keep the same sacred-dragon silhouette and use elements as accents only

**Step 2: Map element accents to approved anatomy**

- Fire: tail flame core
- Water: head or neck crystal lines
- Wood: wing membrane life pattern
- Earth: shoulder and chest armor weight
- Metal: crown, claws, and wing-bone trim

**Step 3: Tame any conflicting colors or effects**

- Reduce any element effect that breaks the sacred guardian feel
- Preserve readability for children on both desktop and mobile

**Step 4: Run script validation**

Run the same parse command from Task 1.

Expected: `HTML ids ok; JS parse ok`

---

### Task 6: Tune state animations and verify the three hero checkpoints

**Files:**
- Modify: `docs/prototypes/child-homepage.html`

**Step 1: Tune idle, hungry, and evolve motion by stage**

- Stage 1: small bounce, tiny tail-flame puff
- Stage 3: wing-led motion
- Stage 4: grounded guardian weight
- Stage 5: crown glow and sacred-flame flow

**Step 2: Verify the three key silhouette checkpoints**

- Reload the homepage prototype and inspect:
  - Stage 1: obvious baby-dragon silhouette
  - Stage 3: obvious first-flight silhouette
  - Stage 5: obvious crowned sacred-dragon silhouette

**Step 3: Verify guardian progression**

- Confirm stage 4 is clearly bulkier and more protective than stage 3
- Confirm stage 5 feels more regal than merely larger

**Step 4: Run final script validation**

Run the same parse command from Task 1.

Expected: `HTML ids ok; JS parse ok`

**Step 5: Commit**

```bash
git add docs/prototypes/child-homepage.html docs/plans/2026-07-05-child-homepage-sacred-dragon-design.md docs/plans/2026-07-05-child-homepage-sacred-dragon-plan.md
git commit -m "feat: redesign homepage pet into sacred dragon line"
```

Only commit after the visual pass and parse validation are both complete.

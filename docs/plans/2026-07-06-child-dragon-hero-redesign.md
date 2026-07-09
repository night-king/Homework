# Child Dragon Hero Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Re-sculpt the child homepage companion into an original heroic western sacred dragon whose default stage-2 form clearly reads as a dragon.

**Architecture:** Keep the current single-file homepage prototype and the existing canvas renderer, but rebuild the dragon's geometry and per-stage proportions around a silhouette-first dragon skeleton. Preserve all existing homepage loops and interaction wiring while replacing the weak beast-like body language with stronger dragon anatomy.

**Tech Stack:** Single-file HTML, CSS, vanilla JavaScript, canvas 2D custom projection renderer, local browser validation scripts.

---

### Task 1: Save the approved redesign direction

**Files:**
- Create: `docs/plans/2026-07-06-child-dragon-hero-redesign-design.md`
- Create: `docs/plans/2026-07-06-child-dragon-hero-redesign.md`

**Step 1: Record the approved art direction**

Capture the confirmed choice:
- heroic western dragon silhouette
- original sacred-dragon identity
- stage-2-first redesign priority

**Step 2: Record the silhouette rules**

Document the required changes for:
- head / jaw
- neck / chest / waist
- claws / hind legs
- tail
- wings

**Step 3: Freeze the stage-by-stage shape ladder**

Write the silhouette goals for stages 1-5 so implementation does not drift back toward a generic pet read.

### Task 2: Establish a browser-level regression check before geometry changes

**Files:**
- Review: `frontend/child-web-prototype/.tmp-child-homepage-cdp-check.py`
- Review: `frontend/child-web-prototype/.tmp-child-homepage-validate-summary.html`
- Review: `output/browser-checks/child-homepage-validation-summary-fixed.png`

**Step 1: Reuse the existing renderer diagnostic**

Keep the current browser-level diagnostic as the regression guard for:
- canvas render present
- reward / feed / drag / evolve interactions still wired

**Step 2: Run the diagnostic on the current baseline**

Run: `python frontend/child-web-prototype/.tmp-child-homepage-cdp-check.py`

Expected:
- exit code `0`
- non-zero painted sample count

**Step 3: Keep the summary screenshot path for comparison**

Reuse:
- `output/browser-checks/child-homepage-validation-summary-fixed.png`

### Task 3: Rebuild the default stage-2 dragon proportions first

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`

**Step 1: Rewrite the stage-2 form table**

Update `dragonForms[2]` so the level-2 dragon has:
- longer neck
- longer snout
- stronger chest lift
- longer tail
- stronger hind legs
- clearer horn / spine sweep

**Step 2: Re-sculpt the head and jaw construction**

Change `buildDragon()` so the head reads as a dragon:
- separate upper / lower jaw volumes
- sharper wedge-shaped skull
- stronger mouth line
- cleaner horn placement

**Step 3: Re-sculpt torso balance**

Change the torso build so it reads as a flying dragon body:
- larger chest mass
- tighter waist
- less pet-like barrel body
- clearer pelvis / tail transition

**Step 4: Re-sculpt limb language**

Update forelimbs and hind limbs so they read more like dragon claws and launch legs than pet limbs.

### Task 4: Propagate the new skeleton language across stages 1, 3, 4, and 5

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`

**Step 1: Rebuild stage 1 around a baby-dragon silhouette**

Keep it cute but clearly draconic:
- short neck
- visible dragon snout
- wing buds
- strong tail flame

**Step 2: Rebuild stage 3 around first-flight silhouette**

Make wings dominant and clearly readable from the default camera angle.

**Step 3: Rebuild stage 4 around guardian massing**

Widen chest / shoulder structure and make armor feel structural rather than pasted on.

**Step 4: Rebuild stage 5 around crowned heroic silhouette**

Push:
- neck length
- wingspan
- tail reach
- crown / horn integration

### Task 5: Tune motion so the new body feels dragon-like

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`

**Step 1: Adjust idle motion emphasis**

Shift pose motion away from pet-like bounce and toward:
- head lead
- chest lift
- tail sweep
- wing-breath support

**Step 2: Adjust talk / feed / nap / pet reactions**

Make reactions support the new anatomy:
- jaw-driven talk read
- proud head lift on feed
- softer neck fold on nap
- cleaner head nudge on tap

**Step 3: Keep drag rotation behavior intact**

Verify the redesigned silhouette still looks good across the allowed yaw / pitch range.

### Task 6: Re-run browser validation and compare the visual result

**Files:**
- Review: `frontend/child-web-prototype/child-homepage.html`
- Review: `frontend/child-web-prototype/.tmp-child-homepage-cdp-check.py`
- Review: `frontend/child-web-prototype/.tmp-child-homepage-validate-summary.html`

**Step 1: Run renderer regression**

Run: `python frontend/child-web-prototype/.tmp-child-homepage-cdp-check.py`

Expected:
- exit code `0`
- painted canvas sample remains non-zero

**Step 2: Capture a fresh summary screenshot**

Run headless Chrome against:
- `frontend/child-web-prototype/.tmp-child-homepage-validate-summary.html`

Expected:
- render / talk / nap / rewards / feed / drag / evolve all remain `PASS`

**Step 3: Manually inspect dragon readability**

Check that:
- stage 2 now reads as a dragon from the hero angle
- stage 3 wing expansion feels like a major upgrade
- final silhouette remains original rather than derivative

**Step 4: Record residual gaps**

If any stage still reads too much like a pet or block creature, note the exact stage and body region for a follow-up sculpt pass.

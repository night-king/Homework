# Child Homepage 3D Dragon Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the child homepage hero pet into a rotatable 3D-feeling sacred dragon stage with obvious five-stage evolution silhouettes and direct interaction actions.

**Architecture:** Keep the page as a single HTML prototype. Replace the flat CSS dragon in the main hero stage with a canvas-based lightweight renderer, while preserving the existing task, reward, growth, evolution, and element-switching shell. Use HTML overlays for labels, speech bubbles, cards, and action buttons.

**Tech Stack:** Single-file HTML, CSS, vanilla JavaScript, canvas 2D custom projection renderer.

---

### Task 1: Write the 3D stage spec into active docs

**Files:**
- Create: `docs/engineering/specs/frontend/2026-07-06-child-homepage-3d-dragon-design.md`
- Review: `docs/engineering/specs/frontend/2026-07-05-child-homepage-design.md`
- Review: `docs/engineering/specs/frontend/2026-07-05-child-homepage-sacred-dragon-design.md`

**Step 1: Capture confirmed scope**

Document the approved constraints:
- single-file homepage prototype first
- strong 3D feel and draggable rotation
- five stages must change at silhouette level
- add `喂食 / 打盹 / 说话` interactions

**Step 2: Freeze the visual direction**

Document the low-poly toy-like sacred dragon direction, keeping the current homepage shell but upgrading the pet stage renderer.

**Step 3: Record stage-by-stage shape differences**

Describe the five approved forms and the biggest structural change between each adjacent stage.

**Step 4: Record technical boundaries**

Clarify that the stage uses a canvas renderer plus HTML overlays, without asset pipelines, model files, or a full animation stack.

### Task 2: Create the active implementation handoff doc

**Files:**
- Create: `docs/engineering/plans/2026-07-06-child-homepage-3d-dragon-implementation.md`

**Step 1: Describe the implementation slices**

Break work into markup, CSS overrides, renderer implementation, state wiring, and validation.

**Step 2: List exact touch points**

Call out the exact file that changes:
- Modify: `frontend/child-web-prototype/child-homepage.html`

**Step 3: Define the expected verification**

Record a lightweight validation pass:
- page still renders
- task completion still adds rewards
- feed still increases growth
- evolve still switches forms
- drag, talk, nap interactions all respond

### Task 3: Replace the flat dragon markup with a 3D stage shell

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`

**Step 1: Swap the old pet body DOM**

Replace the nested flat dragon parts inside `#petCore` with:
- a `canvas` mount
- stage banner labels
- speech bubble container
- drag hint

**Step 2: Add new interaction controls**

Add secondary buttons for:
- `说句话`
- `打个盹`

Keep the existing feed shortcut as the main growth action.

**Step 3: Add CSS overrides for the new stage**

Create new styles for:
- the canvas shell
- speech bubble
- stage banner
- action row
- responsive layout adjustments

### Task 4: Implement the lightweight 3D dragon renderer

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`

**Step 1: Add renderer utilities**

Create helper functions for:
- vector transforms
- projection
- polygon shading
- primitive shape building
- color mixing

**Step 2: Define dragon form configs**

Create a five-stage form table with clearly different structure for:
- body proportions
- neck/head ratio
- horns/crown
- wings
- armor
- tail length
- stance

**Step 3: Add idle and state-based motion**

Support:
- breathing
- blinking
- tail sway
- flame/core pulse
- wing idle motion for later stages
- mood differences for `rest / idle / ready / hungry / complete / evolve`

**Step 4: Add manual actions**

Implement one-shot action reactions for:
- `feed`
- `talk`
- `nap`
- `pet`
- `evolve`

**Step 5: Add draggable rotation**

Implement pointer drag with:
- limited yaw / pitch
- grab cursor feedback
- release-to-hero-angle easing
- click-without-drag pet response

### Task 5: Re-wire homepage state to the new stage

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`

**Step 1: Update stage naming and copy**

Align the visible stage names and descriptions with the approved stronger silhouettes.

**Step 2: Instantiate the renderer**

Wire the renderer to the new DOM nodes and initialize it once.

**Step 3: Bridge existing actions**

Hook current homepage actions so they trigger 3D reactions:
- `feedPet()` -> feed animation
- `evolvePet()` -> evolve burst
- render cycle -> stage / mode / element updates
- talk / nap buttons -> renderer actions

**Step 4: Preserve existing gameplay loop**

Ensure task completion, reward queue, growth meter, crystals, and evolution modal all continue to work.

### Task 6: Validate the prototype and capture follow-up risks

**Files:**
- Review: `frontend/child-web-prototype/child-homepage.html`
- Review: `docs/engineering/specs/frontend/2026-07-06-child-homepage-3d-dragon-design.md`
- Review: `docs/engineering/plans/2026-07-06-child-homepage-3d-dragon-implementation.md`

**Step 1: Run a local sanity pass**

Check for obvious markup or script breakage and confirm the file saves cleanly.

**Step 2: Verify the key interactions**

Confirm that:
- dragging rotates the dragon
- talking shows a bubble and motion
- napping closes the eyes and settles the pose
- feeding still consumes queue items and increases growth
- evolving changes the rendered silhouette

**Step 3: Record residual gaps**

If browser automation or live preview is unavailable, explicitly note what still needs manual visual verification.

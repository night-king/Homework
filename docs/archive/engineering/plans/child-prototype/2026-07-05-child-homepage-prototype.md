# Child Homepage Prototype Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone HTML prototype for the child homepage so the product can review layout, visual tone, day switching, and task-to-pet feedback in a browser.

**Architecture:** Create a self-contained HTML file under `frontend/child-web-prototype/` with embedded CSS and vanilla JavaScript. Use mocked weekly schedule data to drive the Day switcher, homepage task board, pet stage, and reward interactions without any backend dependency.

**Tech Stack:** HTML, CSS, vanilla JavaScript

---

## Notes

- This plan is for a throwaway prototype used for product discussion.
- Per `test-driven-development`, this is using the prototype exception and will rely on manual browser verification instead of formal automated tests.

### Task 1: Save the approved homepage design context

**Files:**
- Create: `docs/engineering/specs/frontend/2026-07-05-child-homepage-design.md`
- Modify: none
- Test: manual read-through

**Step 1: Write the homepage design summary**

- Capture the approved homepage layout, Day switch rules, task-card behavior, reward loop, and visual direction.

**Step 2: Verify the doc matches the approved discussion**

Run: manual review in editor
Expected: the doc reflects the current “child homepage only” scope and includes Day switching.

### Task 2: Build the standalone child homepage prototype

**Files:**
- Create: `frontend/child-web-prototype/child-homepage.html`
- Modify: none
- Test: manual browser review

**Step 1: Create the page shell**

- Build the full-page layout with:
  - top status bar
  - 7-day switcher
  - pet / character main stage
  - task quest board
  - reward strip
  - compact growth strip

**Step 2: Add mocked weekly data**

- Model seven days of schedule data including:
  - weekday labels
  - sample tasks
  - rest-day support
  - task completion states

**Step 3: Wire Day switching**

- Clicking a Day badge updates:
  - header date context
  - main-stage message
  - quest cards
  - daily progress
  - reward summary

**Step 4: Wire task completion and feed interactions**

- Completing a task updates:
  - daily progress
  - task card state
  - reward queue
  - pet mood text
- Feeding the pet consumes queued rewards and boosts the growth meter.

**Step 5: Add visual polish**

- Apply the approved “少年冒险训练营” direction with strong typography, warm adventure colors, and bold card/button styling.

### Task 3: Launch and review the prototype locally

**Files:**
- Create: none
- Modify: none
- Test: manual browser review

**Step 1: Open the prototype in a browser**

Run: open `frontend/child-web-prototype/child-homepage.html`
Expected: the standalone page renders without a build step.

**Step 2: Verify the primary product flows**

Check:
- Day badges switch the displayed schedule
- task cards reflect different states
- feed action changes reward/growth feedback
- homepage keeps the pet stage as the visual center

**Step 3: Gather product feedback for the next iteration**

- Use the open page to discuss:
  - spacing
  - tone
  - task-card density
  - Day switch prominence
  - PK world entry weight

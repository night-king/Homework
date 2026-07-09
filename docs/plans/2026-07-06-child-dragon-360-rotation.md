# Child Dragon 360 Rotation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the homepage dragon stage so users can drag through full 360-degree horizontal rotation while keeping a comfortable constrained pitch.

**Architecture:** Keep the existing `DragonStage` interaction model, but decouple yaw from the old clamp-and-return behavior. Preserve pitch clamping and pitch recentering, and verify the new behavior with a browser-level CDP regression script.

**Tech Stack:** Single-file HTML, vanilla JavaScript, canvas 2D renderer, Python CDP regression script.

---

### Task 1: Record the approved interaction change

**Files:**
- Create: `docs/plans/2026-07-06-child-dragon-360-rotation-design.md`
- Create: `docs/plans/2026-07-06-child-dragon-360-rotation.md`

**Step 1: Capture the approved behavior**

Document:
- full 360 horizontal yaw
- no yaw snap-back after release
- clamped pitch
- pitch recenters after release

### Task 2: Write a failing browser regression check

**Files:**
- Create: `frontend/child-web-prototype/.tmp-child-homepage-rotation-check.py`

**Step 1: Assert old yaw clamp is gone**

Check that a large horizontal drag produces a yaw greater than the old capped range.

**Step 2: Assert yaw persists after release**

Check that released yaw stays near the released orientation after a wait.

**Step 3: Assert pitch still recenters**

Check that pitch moves back toward the resting pitch after release.

### Task 3: Update DragonStage drag behavior

**Files:**
- Modify: `frontend/child-web-prototype/child-homepage.html`

**Step 1: Remove horizontal yaw clamp**

Allow `targetYaw` to accumulate freely from drag input.

**Step 2: Stop yaw from auto-returning**

Keep the released horizontal orientation instead of lerping back to `restYaw`.

**Step 3: Keep pitch comfort behavior**

Retain pitch clamp and gentle pitch recentering.

### Task 4: Re-run regression and interaction checks

**Files:**
- Review: `frontend/child-web-prototype/.tmp-child-homepage-rotation-check.py`
- Review: `frontend/child-web-prototype/.tmp-child-homepage-cdp-check.py`

**Step 1: Run the new rotation check**

Run: `python frontend/child-web-prototype/.tmp-child-homepage-rotation-check.py`

Expected:
- exit code `0`

**Step 2: Re-run renderer / interaction regression**

Run: `python frontend/child-web-prototype/.tmp-child-homepage-cdp-check.py`

Expected:
- exit code `0`

# Child Dragon 360 Rotation Design

**Date:** 2026-07-06

**Target:** `frontend/child-web-prototype/child-homepage.html`

---

## Goal

Change the dragon stage from a hero-angle preview into a model-viewer style interaction:

- horizontal drag supports full 360-degree rotation
- released yaw stays where the user leaves it
- vertical pitch remains softly constrained
- pitch can still ease back toward a comfortable default

---

## Approved Behavior

### Horizontal

- remove left / right yaw clamp
- allow unlimited accumulated horizontal rotation
- do not auto-return yaw after release

### Vertical

- keep pitch clamped to a small range
- allow pitch to ease back toward the default resting pitch after release

### Interaction Feel

- keep existing drag / grab behavior
- preserve tap-without-drag pet response
- keep current renderer and stage wiring

---

## Validation

Success means:

- a large horizontal drag can push yaw well beyond the old range
- after release, yaw remains near the released value instead of drifting back
- pitch still recenters gradually
- rendering and homepage interactions remain intact

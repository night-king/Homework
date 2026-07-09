# Child Dragon Hero Redesign Design

**Date:** 2026-07-06

**Target:** `frontend/child-web-prototype/child-homepage.html`

---

## Goal

Replace the current blocky sacred-dragon stage with an original heroic western dragon silhouette that reads as "dragon" at first glance while keeping the existing child-homepage loop, five-stage growth system, and sacred-dragon identity.

---

## Direction

The approved direction is a heroic western dragon with the immediate readability of a classic fire dragon:

- long neck
- sharp snout
- clear open jaw
- large membrane wings
- lifted chest, tucked waist, long balancing tail
- aggressive front claws and stronger hind legs

This is not a copy of any existing character. The final form must remain original and keep this project's sacred-dragon elements:

- chest core
- crown / horn language
- five-element color shifts
- five-stage evolution ladder

---

## Visual Priorities

### 1. Read as a dragon before any detail is noticed

The stage should no longer read like a small quadruped toy or blocky beast. The first silhouette pass must already communicate:

- winged dragon
- fire element
- heroic adventure companion

### 2. Default stage-2 form must stand on its own

The homepage defaults to level 2, so stage 2 is the most important redesign target. It must feel like a teenage fire dragon rather than a running pet.

### 3. Keep the child-facing tone

The redesign should become more dragon-like, not more monstrous. It should feel bold, energetic, and aspirational for a child audience.

---

## Silhouette System

### Overall Pose

The default pose should shift from a grounded quadruped feel to a semi-airborne heroic pose:

- chest lifted
- pelvis dropped back
- tail sweeping down and away in an S-curve
- head projecting forward rather than sitting on the torso
- body reading as a flying dragon even while idle

### Head

The head is the biggest problem in the current version and must be rebuilt.

New head language:

- longer wedge-shaped skull
- longer snout
- visible upper / lower jaw split
- stronger mouth opening for roar / response states
- swept-back horns
- sharper brow line, but still child-friendly

### Body

The torso needs a dragon-specific weight distribution:

- fuller chest
- tighter waist
- cleaner belly line
- stronger rear mass for leap / flight support

### Limbs

- front limbs should read as grasping / striking claws
- hind legs should read as strong dragon legs, not pet legs
- claws should be visible enough to contribute to silhouette

### Tail

- longer and more flexible
- thicker at the base
- more important to balance the pose
- tail flame should reinforce the silhouette, not sit as an isolated effect

### Wings

Wings must become a silhouette-defining feature rather than accessories.

- larger membrane area
- stronger shoulder-root placement
- clearer wing-finger geometry
- expanded spread from stage 3 onward

---

## Stage-by-Stage Shape Language

### Stage 1 - 焰团幼龙

- still cute and compact
- unmistakably a baby dragon rather than a generic pet
- short neck, round belly, small wing buds
- strong tail-flame emphasis

### Stage 2 - 迅爪少龙

- the most important redesign
- longer neck and snout
- lifted chest and stronger rear legs
- no full flight yet, but obvious young fire-dragon energy
- should read like a teenage western dragon

### Stage 3 - 展翼飞龙

- first true wing-led silhouette
- large membrane wings become primary shape
- lighter, longer body for airborne feel
- strong "it can finally fly" moment

### Stage 4 - 重甲守护龙

- retains flying-dragon outline
- wider chest and shoulders
- heavier sacred armor
- wings feel more protective and structural

### Stage 5 - 圣冠龙王

- longest neck, tail, and wingspan
- integrated crown / horn silhouette
- regal, elevated heroic stance
- final crowned sacred-dragon identity

---

## Technical Approach

The page remains a single-file prototype:

- single HTML file
- canvas 2D renderer
- custom projection and primitive geometry
- no external model or asset pipeline

Implementation focus is not on replacing the renderer, but on re-sculpting the geometry system:

- rework `dragonForms`
- rework `buildDragon()`
- keep rotation, stage state, actions, and five-element wiring

---

## Geometry Strategy

The current renderer already supports enough primitives to achieve the redesign. The work should shift from "stacked boxes that suggest an animal" to "silhouette-first dragon construction."

Priority order:

1. stage-2 silhouette first
2. new head / jaw system
3. lifted dragon torso and longer tail
4. stronger claw and hind-leg read
5. wing language for stages 3-5
6. unify all stages under one coherent skeleton language

---

## Validation Standard

Success means:

- the center-stage creature reads as a dragon without relying on labels
- stage 2 alone looks like a young fire dragon
- stage 3 clearly introduces flight via silhouette
- drag rotation, talk, nap, feed, evolve, and element changes still work
- the redesign remains original and sacred-dragon themed

# Cup Orb (`CUP-AR-01`)

The physical orb: a slate-blue tumbler wrapped in a printed label of 24 columns (A–X, 01–24) by 6 bands (B1–B6),
with a white ruler strip over the seam between column 24 and column 01.

* `cup-ar.html` — the page: camera (or `?img=URL` for a still), the three.js model, the unwrapped map, the overlay.
* `assets/cup/cup.js` — `window.CUP`: the measurements (`spec`), the model (`buildModel`), the map (`paintLabel`,
  `cellAt`, `cellCenter`, `cellPatch`), the reader (`detect`, `track`), the pose (`poseFrom`) and the finger lookup
  (`rayToCup`).

## The cup's own frame

Millimetres. `y` runs up the axis from the base. Angle 0 is the middle of the ruler strip and grows to the viewer's
right with the lid up. Column `c` is centred at `-(gap/2 + (c - .5) * pitch)`; the pitch is 14.0 degrees. Band 1 is
nearest the base. A cell is named letter + number + band, e.g. `A01-B4`.

## How a frame is read

1. **Find the label.** Print is fine dark-on-light texture; the paper's colour is learned from it and the plain paper
   round it (the strip, the margins) is taken in. What hangs off the region (a lit finger, bright things behind) is
   trimmed by keeping only its broad body.
2. **Unwrap it.** Tightest box, ends fitted as arcs, sides fitted as straight lines (the far end is narrower), and the
   nearness of the camera allowed for.
3. **Read it like a ring encoder.** The columns repeat every 14 degrees: that gives the turn within one column. The
   ruler strip is the one place with almost no ink, 2.7 pitches wide: when it is in view the turn is known outright.
   `track` then carries the turn column by column while the strip is out of view (good while the cup turns less than
   7 degrees between readings).
4. **Pose.** Distance from the width of the outline; lean from how short the label looks and which end is wider.
5. **Fingers.** MediaPipe HandLandmarker gives 21 points per hand; each fingertip's ray is met with the cylinder,
   which gives column, band, lid, collar or base.

The page publishes each frame as `window.CUPAR.state`, a `cup:state` event and on `BroadcastChannel('cup')`:
`{ seen, turnKnown, how, face, cell, dist, tilt, matrix (column-major, camera space, mm), hands, fingers[] }`.

## What was run, on the six photographs of the cup (kept out of the repository)

| photo | result |
|---|---|
| lying, strip in view | found; strip read at 25 degrees right of centre; facing A 01 |
| lying, columns 18–24 | found; no strip in view, correctly reported as turn unknown |
| lying, columns 15–22 | found; no strip, turn unknown |
| lying, blurred | found; no strip, turn unknown |
| held in a hand, strip in view | found; strip read at 12 degrees right of centre |
| standing, seen from above, cluttered room | found; strip read at centre; lean 42 degrees toward the camera |

Round trip: with the pose from three of those photos, every visible cell centre (54–60 cells each) was projected to a
pixel and looked up again through `rayToCup`; all came back as the same cell.

## What is not done, or not known

* **The numbers are not read.** Without the strip in view at least once, the page knows the cup is there and how it
  lies, but not which column faces the camera. Attempts to read the digits by averaging bands were not reliable.
* **Which end is the lid** is not read from the print (the cue tried was wrong on one photo in three). The lid is taken
  to be the end pointing up the picture; the LID button swaps it.
* **Measurements are estimates from the photographs**: 90 mm across, 172 mm tall, label 117 mm tall starting 20 mm
  above the base, strip gap 24 degrees. CALIBRATE takes the real ones; distance and lean depend on them and on the
  camera's field of view (66 degrees assumed).
* **Hands were run on one still only.** MediaPipe found the hand in the hand-held photo only on the CPU delegate with
  the confidence lowered to .15, and its landmarks there were poor (the hand is under the cup, mostly hidden). No
  fingertip was on the label in that photo. It has not been run on live camera video here: this machine has no camera.
* **Speed**: 150–400 ms per reading in headless software rendering here; the page reads every third frame. Not
  measured on a phone.
* The model's lid and base shapes are approximate.

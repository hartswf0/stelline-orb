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

## The trained reader (`assets/cup/cupnet.js`, `tools/cupnet/`)

A small convolutional network (five 3x3 convolutions, 130,000 weights, 520 kB, run in plain JavaScript with no
library) looks at the unwrapped patch and gives two things: which angle of the cup faces the camera, and which end of
the patch is the lid. `track` uses it when the strip is not in view, snaps it to the column ticks, and believes a
reading far from the last one only when the next reading agrees.

**How it was trained.** Only on pictures made from the cup's own drawing (`CUP.paintLabel`, in 40 variations of
typeface and proportion): a random turn, then the faults a real unwrap has (wrong scale, bowed and slanted rows,
fanned columns, blur, glare, uneven light, things in the way, either end up). About 75 minutes on four CPU cores
across three passes. No photograph was a training picture.

**On fresh made pictures** (2,000): median error 1.6 degrees, 87% within 7 degrees (half a column), lid end right
99.95%.

**On the six photographs:**

| photo | truth | read | used by the page |
|---|---|---|---|
| lying, strip in view | -24.7 (strip) | -23, confidence .86 | strip |
| held in a hand | -11.7 (strip) | -10, confidence .21 (too low to be used) | strip |
| standing | 2.6 (strip) | -7, confidence .72 | strip |
| lying, columns 18–24 | about 51 (by eye) | 65, snapped to 60 | read: facing U 21 (by eye 21–22) |
| lying, columns 15–22 | about 96 (by eye) | 111, snapped to 109 | read: facing R 18 (by eye 18–19) |
| lying, blurred | not known | confidence .48, not used | turn unknown |

Lid end right on all six. The turn is within one column on the five with a known answer, and within 3 degrees on
two. This is not an independent test: the same photographs were looked at to set the proportions of the training
print (the first two passes, trained on print that was too large or too wide, read them wrong).

Two things made it work, both found by looking at failures: the unwrap now samples the full-size frame (up to 1600
across) instead of the 640 copy the label is found in, and the training print was matched to the measured size of
the real digits.

**TWIN** shows a solid cup on screen turned and leaned as the real one is, with the facing cell and any touched
cells lit.

## What is not done, or not known

* **The turn read from the print is good to about a column, not better**, on six photographs. It has not been run on
  live video, on other lighting, or with a hand across the label. The strip, when seen, is still the exact reading.
* **Measurements are estimates from the photographs**: 90 mm across, 172 mm tall, label 117 mm tall starting 20 mm
  above the base, strip gap 24 degrees. CALIBRATE takes the real ones; distance and lean depend on them and on the
  camera's field of view (66 degrees assumed).
* **Hands were run on one still only.** MediaPipe found the hand in the hand-held photo only on the CPU delegate with
  the confidence lowered to .15, and its landmarks there were poor (the hand is under the cup, mostly hidden). No
  fingertip was on the label in that photo. It has not been run on live camera video here: this machine has no camera.
* **Speed**: 150–400 ms per reading in headless software rendering here; the page reads every third frame. Not
  measured on a phone.
* The model's lid and base shapes are approximate.

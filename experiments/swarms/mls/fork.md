# THE BLOW: the face fork (A dense vs B sparse)

## Why fork

Critic round 1: "filling the cheeks bends the whole plate, not the cheeks", and the three face families were nearly
indistinguishable. Repair condition: cheeks 100 %, purse 60 %. (1) Plate border and neck move 1 px or less in the chosen family.
(2) The outer cheek outline differs by at least 4 px between at least two families.

Two fixes on the dense face closed (1) but not (2). The first fix pinned the plate edges and neck with fixed segments, which took
the border from 15 px to 0.07 px. The second rebuilt the cheek as a ring of handles, but the families still differed by 0.95 px.
So the face was forked: same proof material, same controller, same budget, same measurements (tools/fork.js, fork.json;
tools/test.js with FACE_SET=sparse, tests-sparse.json).

## Hypotheses

- **A (dense, alpha 1):** 35 points + 15 segments on the face. Many handles protect features.
- **B as specified (sparse):** 9 moving points, a cheek-to-mouth segment that is pushed out and turned as the lips purse, and
  the pinned plate lines. Fewer handles should let the families extrapolate differently.

## What the measurements showed

| face set | alpha | plate / neck px | cheek outline family diff px | chosen (similarity) folds | eyes / nose area ratio |
|---|---|---|---|---|---|
| A dense | 1 | 0.07 / 0.24 | 0.95 | 0 | 0.97 / 1.21 |
| B as specified (segment turns with the purse) | 1 | 0.01 / 0.04 | 0.12 | 2 | 1.01 / 1.08 |
| B, inner fixed + outer pushed cheek points | 1 | 0.01 / 0.04 | 0.09 | 2 | (not recorded) |
| same, alpha 2 | 2 | 0.00 / 0.04 | 2.09 | 0 | (not recorded) |
| **B final** (+ 6 lip-contour points) | **3** | **0.00 / 0.06** | **4.11** | **0** (min area ratio 0.19) | **1.005 / 0.99** |
| control: A dense handles at alpha 3 | 3 | 0.00 / 0.03 | 6.69 | 2 | 0.90 (eye height 0.83) / 1.22 |

The handle count was not the cause. The weight exponent was. At alpha = 1, each handle sample contributes w·|p̂|² to the fit's
second moment, and that term is about constant with distance. So the many samples on the long pinned plate lines dominate the
fitted transform, pulling it toward identity in every family, and only the translation carries the cheek. That holds for any
handle count. At alpha 3 the near handles dominate and the families diverge.

The specified segment rotation also worked against divergence. The purse pulls the mouth corners in while the cheek pushes out,
so the fitted local scale cancels to about 1, and that local scale is the only thing similarity and rigid disagree on. B keeps
the cheek as a fixed inner point and a pushed outer point: a real stretch along the cheek axis. Under alpha 3, a two-point lip
opening tore the mesh. Four quarter-width and two outer lip points (19 points in all, of which 13 move) spread the opening.

Under B, the family is a visible choice. Similarity swells the cheek evenly and round, with 0 folds. Affine and rigid crease it
(170 and 173 folded triangle-instances over the demo and the extreme states): fork-strip.png, row 2. The family also matters to
the breath again: the cheek discs grow 69 % in similarity, 51 % in affine and 52 % in rigid. In the proof's all-affine world,
five candles are still burning at the end.

## Full tests (13 checks)

- A: 10 pass, 3 fail. The fails are cheek divergence (0.95 px), the area floor (face 0.035, flame 0.010), and one contour
  reversal during a flame's fade-out.
- B: 11 pass, 2 fail. The fails are the area floor (flame 0.010 only; the face is 0.19) and the same fade-out reversal frame.
  Both branches share these two fails.
- B's win window: 7 of 143 ring settings, all needing aim +8° with purse 30-90 %. Maxing every ring puts out 4-5.

## Verdict

**B earns promotion.** It meets both parts of the repair condition and the "no folds in the chosen family" condition, and it
keeps eyes and nose intact (area within 1 %). It does not break the protected conditions: the breath is read off the mesh, the
streamer is rigid, the flames tear, the machine runs at 11.8/s, and the device is the only control. The control run (dense at
alpha 3) shows that alpha alone is not enough: it diverges but folds the chosen face and squashes the eyes.

The claim that the viewer experience improved is **perceptually judged by the builder only** (fork-strip.png, fork.mp4). It has
not had an independent critic. That is the next step.

Files:
- index.html is now branch B (identical to sparse.html). dense.html is branch A.
- proof.mp4 is B; proof-dense.mp4 is A. fork.mp4 shows A on the left and B on the right, 10 s, with B's sound.
- tests.json and handles.json are A; tests-sparse.json and handles-sparse.json are B.

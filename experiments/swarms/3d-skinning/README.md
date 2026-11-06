# SCION 37 · Weighted Skinning — Four Pairs of Hands

## Thesis
Four children make the birthday cake with their hands, from an empty table to seven lit candles. Then the birthday child blows them out. The children have no faces. You read them by height, clothes, posture and what their arms are doing, mostly from behind and three-quarter back. Each child is one skinned mesh, and the skinning is what makes the hands believable: arms raise, fold, reach and twist without collapsing at the elbows or forearms. Printed ornaments on the clothes hold their shape, and the palms stay on what they hold.

## The game (index.html)
The device is ported from `ana/index.html`. A hand turn makes quiet detent clicks, then the machine steps at 11.8 steps/s, or 23.6 when more than 6 steps behind. It uses the real grains from `ana/device-sounds.wav`.
- **SELECT** picks a child:
  - 1, the birthday child: the board, then the blow.
  - 2: layer 1 and layer 2.
  - 3: ice the top, ice the side, beads, write 生日快乐.
  - 4: place the seven candles, then light them.
- **Knurl** advances the selected child's next making action, one detent at a time. Actions have dependencies. A blocked child does not move. The ring stops, a double click sounds, and the label says what is missing.
- **Triangle ring** sets the child's reach, from -6 to +6. It changes the pose: a higher lift, tiptoe, more lean. It also chooses what goes on the cake:
  - sponge: chocolate, plain or red
  - icing: five colours taken from the film's cakes
  - beads: white or coloured
- **Evolution:** each finished action is a new generation of the cake. The status line names the nearest film cake and gives the colour distance.
- **Scale ring** sets where you kneel.
- **HOLD**: all children perform together, and the machine runs the remaining chain. A long press switches the memory off.
- **PLAY** (left collar) plays the whole making through the same rings.
- `?stress=1` shows child 2 twice, through raise, fold, reach and forearm twist. Left: linear blending alone. Right: corrected.

## Primitives (rig.js)
- **Mesh:** one BufferGeometry per child (about 4.6k vertices). It has sleeve tubes, an elliptical-ring torso, a dress skirt, leg tubes, mitten hands, a featureless head and hair.
- **Bones and rest matrices:** 23 bones with identity rest orientation, so the inverse bind is translate(-rest). The test shows the bind pose reproduces the mesh exactly.
- **Vertex weights:** computed from the vertex's position along its limb, as smoothstep blends between knots (clavicle, upper, elbow, two forearm twist bones, hand). The torso uses height knots plus a clavicle share near the shoulders. Weights are normalized and kept to the top 4.
- **Twist distribution:** a hand twist τ is split τ/3 over two forearm twist bones and the hand.
- **Corrective shapes** (six, as three.js morph targets): elbow L/R, shoulder raise sideways L/R, shoulder raise forward L/R. Each one is baked at a key pose as M_lbs⁻¹·(dual-quaternion result) − rest, and driven by (1−cos θ)/(1−cos θ_key).
- **Region masks:** the sleeve badge (child 2, left upper arm) and the dress bow (child 1, back) are assigned rigidly to their dominant bone. Their correctives are masked, and a feathered ring around each takes the strain.
- **Pose solver:** two-bone IK aims the palm vertex, not the wrist, at the grip point, with an elbow pole. A clavicle shrug takes 0.2 of the elevation above 60°.
- **CPU skinner:** identical to three.js r128's skinning (tested). It is used for the measurements.

## Measured results
These come from `node tests.js` (tests.json), run on the proof trace: 17 of 18 pass.

| Invariant | Corrected | Linear blending alone | Tolerance |
|---|---|---|---|
| Weights sum to 1 | max error 3.7e-8 over 19,109 vertices | | < 1e-6 |
| CPU skin vs three.js boneTransform | 0 m | | < 1e-6 |
| Forearm twist 150°, min ring area | 0.862 | 0.081 (candy wrapper) | ≥ 0.80 |
| Forearm volume at twist 150° | 0.914 | 0.831 | ≥ 0.88 |
| Elbow volume at 125/145/150° | 0.986 / 0.953 / 0.945 | 0.898 / 0.882 / 0.879 | 0.92–1.08 |
| Shoulder volume, raise/forward/reach/fold | 0.91–1.01 | 0.80–0.94 | 0.90–1.15 |
| Sleeve badge area / shape | 1.000 / 0 | 0.994–1.032 / 0.021 | ±0.02 / ≤0.02 |
| Fabric ring around the badge | total 0.91–1.11; worst triangle 0.07–2.58 | | 0.75–1.35 |
| UV seams welded | 5e-17 m | | < 1e-9 |
| Hands on held things (node, 55 sampled poses) | max 5.0 mm (piping bag) | | < 10 mm |
| Hands on held things (page, every 2nd frame) | **FAIL**: child 2, layer 2 overhead, 10.2 mm | | < 10 mm |
| Whole cake made in order; 7 lit, 7 out; 28 beads | yes | | |

## Proof
- `proof.mp4` is 27.8 s at 30 fps. It was recorded with `record.js`: Playwright with real mouse drags and taps on the device, a virtual clock, and audio rendered offline from the page's own sound log.
- The input sequence:
  1. Child 1 turns the board in.
  2. Child 2 carries layer 1 at reach 0.
  3. Child 2 carries layer 2 at reach +6 (lifted overhead, red sponge).
  4. Child 3 ices the top at reach +3 (red-orange).
  5. HOLD runs the rest: side, beads, writing, candles, light, blow. Meanwhile the scale ring turns 30° and back.
- The generations run plain sponge → red sponge → red-orange top and side → coloured beads. The nearest film cake becomes RED-ORANGE at a distance of 0.30, then 0.00. The 0.00 is by construction: the palette steps are the film's colours.
- Other evidence: `proof-strip.png` (12 frames), `stress-strip.png`, `trace.json`.

## What failed and what changed
- A shoulder corrective at full gain inflated the shoulder to 1.27× once the clavicle shrug and the rigid badge were in. It was tuned down to 0.35.
- Averaging the badge region's weights shrank the badge to 0.73 of its area at a full raise. The mask was switched to rigid assignment to the dominant bone.
- The badge first sat on top of the shoulder cap, out of sight, at 20% down the upper arm. It moved to 42%. **Consequence:** at 42% the region is almost all upper-arm weight anyway. Linear blending alone keeps it within 3%, so the badge test no longer distinguishes the mask much. The hard part moved to the feather ring.
- Icing painted per frame left gaps on the side. It now paints continuous strokes.
- Zero-opacity sprites cost a full software-GL pass, so they are now hidden.

## What is weak
- **Believability (FILM-BAR.md): not met.**
  - The recorded proof uses this page's own plain lighting, not the shared look.
  - `../shared/look.js` and `../shared/holo.js` (arc and readout) are now wired into index.html. `?plain=1` gives the old look. `look-still.png` is one frame with LOOK applied, at a lowered key of 1.25.
  - That frame took 80 s to render here: software GL, with the machine shared by several swarms. It also logs a GL feedback-loop warning from the post pipeline. So **no proof has been recorded with LOOK**.
  - The device is still this page's port of ana's, not `HOLO.device`.
- **The badge is rarely visible from the default camera.** It faces outward on child 2's left arm, away from the viewer. In the stress view it is hard to see too, because the IK pole rolls the upper arm.
- **No independent critic run.** This builder had no Agent tool.
- The children's far-side positions show a blank skin oval at the front of the head when seen from the front three-quarter.
- Hands use mittens. The hair cap has a jagged hairline.
- The making is serialized by dependencies, so "together" under HOLD means a chain, not simultaneous work.
- The page-side contact fail (10.2 mm on the overhead layer lift) has not been repaired.

## Files
`index.html` (game), `rig.js` (mesh, weights, rest matrices, correctives, IK, metrics), `tests.js` / `tests.json`, `record.js`, `trace.json`, `proof.mp4`, `proof-strip.png`, `stress-strip.png`, `look-still.png`, `operator.html`, `tools/` (shot scripts).

Frames for the proof are kept outside the repo, in `/home/claude/stelline-work/skin-rec2/`. The pre-LOOK page is saved at `/home/claude/stelline-work/skin-index-pre-look.html`.

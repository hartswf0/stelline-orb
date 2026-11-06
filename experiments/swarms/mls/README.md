# SCION // SCHAEFER, MCPHAIL & WARREN · MLS DEFORMATION · THE BLOW

## Thesis

One flat archived picture, bent by handles, has to do the blow: the cheeks fill, the lips purse into an O, the breath goes out,
and seven candle flames lean away, stream and go out. A paper streamer curls round the cake (the long-neck case). Each surface
gets the moving-least-squares family that suits its material, chosen by how it looks: similarity for the face (cheeks must
swell), affine for the flames (gas shears and stretches), rigid for the paper (it does not stretch).

It is a game played on the memory maker's device (the controller from ana/index.html), not an editor. The goal is to put out all
seven candles in one breath. The breath is **read off the deformed picture**. Its strength comes from how much two cheek discs
grow and how large the mouth opening is after the handles have bent the engraving, under the family you chose for the face. So
the family is a game decision, not a display setting.

What would make it bland: a face that only translates, flames that swing like stiff petals, a streamer that thins on the
bend, a family switch that changes nothing you can see or do.

## Native formal language and the material

Control points, line-segment handles, local weighting (alpha), the affine, similarity and rigid families, and feature
protection. The solver (mls.js) is written by hand from the paper. Point handles use w = 1/|p - v|^(2 alpha). **Line handles
are integrated numerically** (adaptive midpoint rule, 2 to 64 samples per segment, weight ds / 8 px). This is not the paper's
closed form.

The material is drawn by code for this page (textures.js): an engraved portrait of a child (luminous lines on black, line
width = light, lit from below by the candles; plate "PL. 128"), one painted flame used seven times, a printed paper streamer
550 x 36 px, and the cake. The deformed surfaces are WebGL meshes: face 37 x 44 vertices, streamer 111 x 5, seven flames 7 x 17.

Handle set (handles.json): **77 point handles and 32 line handles**. Face: 31 points (11 of them anchors on the plate edge,
skull and neck) and 8 segments (brows, four lip contours, cheek outlines). Each flame: 6 points and 2 spine segments. Streamer:
10 spine segments and 4 corner points.

## The game (game.js, index.html)

- SELECT (short): STREAMER, CHEEKS, LIPS, FLAMES. SELECT (long): the next family for that thing's surface.
- KNURLED RING: the selected thing's value. Wrap 0-16 steps, breath held 0-100 %, purse 0-100 %, or candles lit 0-7.
  Turned by hand in quiet detents. The machine then steps to the value at 11.8 per second, one device click per step.
- TRIANGLE RING: the aim of the breath (cheeks or lips, 4 degrees a detent), the streamer's height, or the flame size.
- SCALE RING: where you kneel (the flat layers slide against each other).
- HOLD (short): blow. The machine steps the cheeks back to empty under the breath. HOLD (long): switch the memory off.
- Left collar: SCENE (the 10 s demonstration through the same rings) and CLEAR.
- You have three breaths. The end states are ALL SEVEN OUT IN ONE BREATH, ALL SEVEN OUT IN TWO or THREE BREATHS, or N STILL BURNING.
- The (i) sheet holds the explanation, the measured breath in each family, and COMPARE (four views side by side).

Breath model (scene.js `breathPlan`): V = cheek-disc area gain / 0.40; jet = 1.37 · V · sqrt(580 / mouth area); spread = 0.05 + 0.5 ·
mouth width / 50 rad. Each candle gets s = jet · gaussian(angle - aim, spread) · (290 / distance) / flame size. A candle goes out if s >= 1.

## Measured (node tools/test.js; tests.json)

| check | result |
|---|---|
| point handles land on their targets (every family) | 0.000 px |
| line handles: samples at 1/4 and 1/2 of each segment, distance from target | 0.16 / 0.18 / 0.18 px (affine / similarity / rigid) |
| folded triangles, chosen family (demo every 3rd frame + 4 extreme states) | face 0, flames 0, streamer 0 |
| folded triangles, other families | face: rigid 7. Streamer: affine 94. Flames: rigid 2886, similarity 0 |
| smallest triangle area ratio, chosen | face 0.046, flames 0.000 (positive, near-degenerate sliver), streamer 0.131 |
| contour acceleration / handle acceleration, chosen | face 0.92, flames 1.07, streamer 1.00 |
| contour reversals not caused by any handle, chosen | 0 |
| machine step rate | 11.79 / s |
| most candles one breath can put out (grid over purse and aim, full cheeks) | similarity 7, affine 5, rigid 5 |
| demo outcome (proof film) | yours: all seven out in two breaths. All-affine world: one still burning |
| solve time, one world, all surfaces (node, 3016 vertices) | ~3-4 ms |

The cheek-disc gain at full cheeks and purse 0.6 is 0.334 (similarity), 0.305 (rigid) and 0.278 (affine) of the rest area.
The difference between the families is about 10-20 %. That is real but small, and the breath constants were tuned so that this
difference decides the one-breath win. That tuning is a design choice, not a measurement.

Sound (proof.mp4): the device grains from ana/device-sounds.wav for hand detents (quiet, rate 1.25), machine steps, select and family
ticks. The breath, the candle outs and the wash are synthesized in sound.js. One mixer serves both the page and the film.
Whole-film levels: mean -20.2 dBFS, peak -1.4 dBFS (first render; not re-measured per stem).

## Protected conditions

The breath is computed from the solved mesh, never from the ring values directly. The chosen family of each surface has no
folded triangles. Flames never turn inside out (the downward bend is capped by the spine-order condition). The machine's rate is
11.8/s. There are no free-form drag handles or plain buttons as the primary input. No film frames or film audio are used.

## What failed and what changed

1. **The brief changed mid-build** from a drag-handle editor to a game on the device. Free dragging was removed. Rings, SELECT
   and HOLD drive the handle groups, and the breath was made a measurement of the deformed face.
2. **The flames folded in every family** (chosen affine: 14,861 folded triangle-instances). The first cause found was the
   downward bend exceeding the spine-order limit (dy/df < 0 needs bend < 42 px), which turned flames inside out. Capping it
   brought the count to 755. Adding width handles near the top made it worse (1,617), so the defect was plotted. The plot showed
   the root cause: the flame model *sheared* the flame (cross-sections stayed horizontal), so its width collapsed as it lay over.
   It was replaced by a bending rod whose cross-sections stay perpendicular to the spine (11 folds left), and the tip angle was
   capped at 77 degrees (0 folds).
3. **Contour reversals on the flames** (5 frames) came from turbulence noise at 16 Hz sampled at 30 fps. It was lowered to 7 Hz (0).
4. The face was too small in frame and the lips' O did not read. The view was reframed to x 50-550, y 30-800. The opening pose was
   enlarged and the cheek pose made 1.5x larger, and the breath constants were then re-measured and re-tuned.
5. The room went black after the candles went out and hid the smile. The ambient floor on the face was raised from 0.17 to 0.34.

## Independent critic

**Not run.** The builder's session had no tool for spawning agents. No independent critic has watched proof.mp4. The builder
watched a contact sheet of 10 frames. That is not a verdict.

Critic brief (give the critic only this and the outputs): *Expected experience: in ten seconds, on the memory maker's device, a
hand wraps a paper streamer round a cake in clicking steps, fills an engraved child's cheeks, purses her lips and aims, then
blows. The flames lean away from her, stream and go out, five on the first breath. She re-aims, fills again and blows again, and
the last two go out. She smiles. Three side panels show the same inputs with one MLS family everywhere. Watch proof.mp4 at
normal speed with sound. Return pass / reference stronger / inconclusive, exact frames, the largest gap, a falsifiable repair
condition, and strengths to keep.*

## What is weak, unknown, not done

- Scale: in the 4-panel proof each face is ~330 px tall. The cheek swell and the family differences on the face are hard to see
  at normal speed. They read in strip.png, not in the film.
- The family columns look alike on the face. They differ in the flames (affine streams thin; similarity and rigid swing as
  petals) and in the outcome (the affine world leaves one candle burning).
- The flames' smallest area ratio in affine is ~0.000: no fold, but slivers at the inner bend near the tip.
- The demonstration is dense (two breaths in 10 s). It may read as rushed.
- The engraving aliases (moiré) at phone size.
- The game has not been playtested on a phone by a person. Audio was checked by level only, not listened to by a person.
- The line handles are the numerical integral, not the paper's closed form.
- Not done: the film-derived face option (ana/cut sprites were inspected; the face is ~70 px wide, too small to deform well).
  There is no handle-set import in the game; handles.json is generated by tools/test.js.

## Files

index.html (the game), operator.html, proof.mp4, strip.png, handles.json, tests.json, proof-events.json, mls.js, scene.js,
game.js, sound.js, textures.js, tools/test.js, tools/render.js (needs `python3 -m http.server 8765` at the repo root), tools/shot.js.

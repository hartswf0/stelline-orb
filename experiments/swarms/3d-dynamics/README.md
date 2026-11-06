# SCION 41 · SECONDARY DYNAMICS · the settling cake, as a game on the memory maker's device

## Thesis

The cake is built physically, in 3D, on a stand that tilts toward her. Every material answers the stand's motion with
momentum and then stops: sponge layers are lowered, land, compress softly and settle; icing is poured, runs down the
sides and sets; cream beads are piped and slump; candles are pushed in and sway once; the paper crown and the streamers
swing when the stand turns; flames lean with the tilt and with the breath. Nothing wiggles for its own sake. A careful hand
lets everything settle; a fast flick of the tilt ring costs candles (they lose their grip and fall onto the cake) and, while
the icing is wet, sends more of it down the sides. The goal is the film's cake (chocolate, orange top, white beads,
生日快乐, seven candles), matched within tolerance, at rest, lit, and then the blow.

What would make it bland: springs on everything, always moving; or no secondary motion at all (the RIGID preset, shown
beside it in the split view, is that alternative).

## The controller

The device canvas from `ana/index.html` is reused (rings, collars, SELECT, HOLD, info). Hand turns make quiet detent
clicks; the machine then steps the scale and knurl rings at 11.8 steps/s (23.6/s only when more than 6 behind). Tilt is a
smooth move and is not stepped (the film's tilt is smooth). Sounds: device grains from `ana/device-sounds.wav` when
present, otherwise synthesized; the making (layer thump, pour, piping, candle push, match, flame catch, candle fall,
breath) is synthesized in `sound.js`.

| control | does |
|---|---|
| SELECT | LAYER, POUR, BEADS, WRITE, CANDLES, LIGHT |
| knurl | layer offset (4 mm a detent), icing amount (20 ml), beads to pipe, the inscription (24 steps), candle slot, candles lit |
| triangle ring | stand tilt toward her, 2 deg a detent, -4 to 16 deg, smooth |
| scale ring | turns the stand under her eye, 5 deg a detent (the viewpoint yaw, done by turning the cake instead of the camera) |
| HOLD | lower the layer / pour / pipe / push the candle; when ready, the blow; long press: memory off |
| left collar | scene, SPLIT (LOOSE / TUNED / RIGID side by side), clear |

## Primitives (`dyn.js`, no rendering, runs in node)

- **Osc**: spring and damper on a mass proxy (kg), natural frequency (Hz), damping ratio; semi-implicit Euler at a fixed
  1/240 s substep counted in integer ticks; sleeps to exact rest when |x - rest| < 1e-4, |v| < 1e-3, |drive| < 1e-3 for 0.25 s.
- **Primary**: stand tilt and turn, critically damped 2.6 Hz springs following the hand (same in every preset).
- **Material priors (TUNED)**: sponge 3.2 Hz, zeta 0.45; bead 2.5 Hz, 0.8; candle 2.2 Hz, 0.38; flame 1.6 Hz, 0.5; crown
  4 Hz, 0.3; fallen candle contact 6 Hz, 0.7; streamer air drag 2.4/s. LOOSE multiplies damping by 0.25 (icing runnier);
  RIGID has no secondary motion (everything rigid to the stand, icing simply appears on the top).
- **Contact**: a lowered layer lands when its base reaches the stack top (sponge strain kicked by the landing speed; the
  layer below takes half); a falling candle stops at 79 deg on the cake top (a collision boundary, rebound 0.25); streamers
  stop at the table and the stem.
- **Icing**: a yield-stress thin film per 5 deg sector, 10 top + 16 side + 4 board cells, conservative fluxes (volume
  conserved to 1e-9), driven by gravity in the plate frame, the stand's inertial acceleration and centrifugal load; it stops
  below yield and sets as it cools (yield x1 to x3 over 4 s).
- **Inertial loads**: candles, crown and flames are driven by finite-difference accelerations of their roots plus the
  stand's angular acceleration. Flames are buoyant: they lean toward the wick's acceleration (gain omega^2/g, so the static
  lean is atan(a/g)), and the breath is a front of air crossing the cake from her side.
- **Grip**: each candle breaks free above a lean threshold (outer 6.0 to 9.6 deg, inner 11 deg) and falls the way it leans.

## Measured (`node tests.js`: 36 passed, 0 failed; numbers in `tests.json`)

| invariant | declared | measured |
|---|---|---|
| sponge after landing: energy to 1e-6 of peak / asleep | 1.0 s | 0.73 / 1.08 s (sleep allowed declared + 25%) |
| bead slump | 0.8 s | 0.56 / 0.87 s |
| candle pushed in (sways once) | 1.6 s | 1.27 / 1.47 s |
| flame after a push | 1.6 s | 1.39 / 1.62 s |
| paper crown after a 5 deg turn step | 1.3 s | 1.04 / 1.14 s |
| streamers after a 10 deg tilt | 3.5 s | 1.48 / 3.06 s |
| icing stops after the pour ends (240 ml) | 4.0 s | 3.08 s, flow exactly 0 |
| LOOSE candle (for comparison) | | asleep at 5.27 s vs 1.47 TUNED |
| no motion at rest | bit-identical | identical over 10 s; also after the blow |
| 30 vs 60 fps | identical | max difference 0 over 600 frames; max omega*H 0.157 |
| response after primary | | first secondary motion on the same substep the stand starts, peak 92 ms later |
| careless 12 deg flick (0.1 s and back) | consequence | TUNED 1 candle falls, LOOSE 7, RIGID 0; careful 2 s tilt: 0 in all |
| wet icing flicked | consequence | drip 0.193 to 0.222 of side height |
| the scene (30 and 60 fps) | whole cake | 3 layers, 200 ml, 24 beads, inscription, 7 candles; candles 1 and 3 fall at the flick and are pushed back; match 100 at the blow; seven out one by one over 0.53 s |

`trace.json` is the proof run (855 frames, 289 sound events, match 100 at the blow): per frame TUNED secondary energy, icing
flow, LOOSE energy, at-rest flag; the events; and for each impulse the time until the whole cake is next at rest. In the
scene the next action usually comes before rest, so those times (1.0 to 19 s) measure the scene's pace, not a material's
settle time; the per-material settle times are the test numbers above.

`proof.mp4`: 28.5 s, 1280x720, 30 fps, with sound (device grains from `ana/device-sounds.wav`, making sounds synthesized).
Recorded with Playwright on a fixed clock; frames 408 onward were re-recorded after an interrupted run (the game is
deterministic; the earlier frames were re-simulated without drawing). Shows: memory on, three layers lowered (the second
4 mm off centre), the pour and drips, a careful tilt toward her while the icing is wet, 24 beads, 生日快乐 stroke by stroke,
the split view (LOOSE / TUNED / RIGID) while the cake levels and the seven candles go in, the stand turned 40 deg, the
careless flick (TUNED loses candles 1 and 3, LOOSE all seven, RIGID none), the two pushed back, lighting, the blow.

## What failed and changed

- Icing never stopped (an asymptotic approach to yield): added a finite stop margin (flow below 10% over yield holds) and
  setting with age. Before that it was still creeping after 12 s.
- Candles never fell in the TUNED preset at a 12 deg flick, then all four outer ones fell at 16 deg: the grip thresholds
  are now spread per candle (6.0 + 0.6 k deg) so a careless flick costs one or two, as a consequence should.
- A fallen candle bounced through the cake top (contact spring overshoot): the top is now a hard boundary.
- The page drew stale worlds after the scene reset (views held the old objects): views now rebind every frame.

## What is weak

- No independent critic has run (this builder had no tool to start one); the coordinator should.
- A fallen candle usually falls toward or away from her eye and reads as a dark stub end-on.
- Only one film cake (chocolate, orange top) is the target; the evolution is a sequence of stages toward it, not a
  population of cakes.
- The match score is this page's reading of the traced frame (height to width 0.40 +/- 0.06, a colour pair), not a pixel
  comparison with the film.
- In the proof film the flames' lean under the breath is small at this frame size; the blow reads mostly as flames going
  out one by one.
- A thin vertical light line shows on the middle layer's front in single view (a rendering artefact, cause not found).
- The match readout drops to 90 during the blow (the at-rest part of the score is false while she blows).
- Recording is slow on this machine (software WebGL under heavy load, up to 2.5 s per split-view frame).
- The magnesium flash and the memory's round spots are present but small; the split view (three cakes) is heavy on phones.

Files: `index.html` (the game), `dyn.js`, `game.js`, `sound.js`, `tests.js` / `tests.json`, `record.js`, `trace.json`,
`proof.mp4`, `operator.html`. Film frames are not used; the reference numbers come from `../evolve/refs.json`.

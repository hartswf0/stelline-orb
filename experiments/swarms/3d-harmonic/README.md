# HARMONIC CAKE (3d-harmonic)

SCION 6, John Whitney, harmonic motion. A gear train decorates the cake on screen: a turntable turns it, a piping arm and a nozzle move on gear-driven harmonic paths, and every icing tube is a closed figure set by whole-number gear ratios and a phase. There are no keyframes. The memory orb's device is the controller.

## Thesis
The cake is the score. Each decoration is one closed harmonic figure: N beads, M shells, a 13:2 crossing garland, seven candles at the stops of a 7:1 nozzle. The player finds each figure by setting gear ratios and phases on the device's rings. A pass that does not match the memory's pattern flares silver and decays, and the stage stays where it was.

## How it plays (index.html)
- SELECT cycles the gear: TURNTABLE, PIPING ARM, NOZZLE (the selected gear glows amber on the post).
- KNURL sets that gear's ratio to the master shaft in rational detents (1:4 ... 1:1, 5:4, 4:3, 3:2, 5:3, 7:4, 2:1 ... 13:2 ... 36:1). The turntable stops at 4:1.
- TRI sets its phase in 15 degree detents. SCALE sets where you kneel (yaw).
- The hand turn makes quiet detent clicks. Then the machine steps to the new value at 11.8/s, or 23.6/s while more than 6 steps behind. A pass of the gear train steps at the same rates, at 24 clicks per master turn.
- HOLD runs one pass. A long press switches the memory off.
- Round amber spots on the cake show the pattern the memory wants. A thin pale line shows what your gears would pipe. A scope beside the arc unrolls both and prints OFF BY x MM against TOLERANCE 0.8 MM.
- The stages: SPONGE (two layers rise as harmonic lathes), COAT (the cream spreads by azimuth as the cake turns, with sprinkles), BASE BEADS (nozzle 24:1), TOP SHELLS (nozzle 36:1, trochoid), SIDE LATTICE (arm 13:2 at 90 degrees, two turns, the path crosses itself), INSCRIPTION (生日快乐 as 21 tube strokes in stroke order, then a 3:2 flourish; the cake tilts toward you while it is written and levels after), CANDLES (arm 1:1 at 90 degrees, nozzle 7:1; candles drop where the nozzle comes down), LIGHT (the cake turns past a match), BLOW (the flames go out one by one). After that the game is over.
- The left collar's play button plays the game through the same rings using the planner, then clears.
- The (i) button opens the operator panel.

## Primitives (harmonic.js, shared by the page and the tests)
`gearAngle(ri, ph, k, S)` is exact: `2π·((p·k) mod (q·S))/(q·S) + phase`, with the remainder taken in integers. `passRevs` is the lcm of the ratio denominators. `pass(def, gears, S)` gives the samples (centre, tube radius, contact normal) and the candle stops, which sit on an exact finer grid. `chamfer` is the pattern score: a symmetric mean nearest-neighbour distance in (x, y, z, 3r). `cakeSDF` is the coated cake with a rounded top edge. `newGame/setGear/commit` is a pure reducer: the page feeds it the values the machine reaches and the HOLDs.

## Measured (node tests.js → tests.json, r2; trace from the r2 proof run)
1. Exact periodicity: 404 passes (the stage targets plus 400 random gear settings). The closure error is 0 m and the gear angle error is 0 rad.
2. Clearance: no tube cuts the cream. Over 1,017,392 samples and chord midpoints, including random gear settings and the inscription, the minimum of (signed distance − tube radius) is +0.000299 m (the 0.3 mm margin). The lowest point of the bead ring is 0.6 mm above the board.
3. Discrimination: every target scores 0. Every one-detent error in a needed gear scores at least 0.98 mm, against a 0.8 mm tolerance. One exclusion: turntable phase on the 24-bead ring is a true symmetry.
4. All seven candles clear every inscription stroke and every shell. The smallest gap is 3.5 mm.
5. Reproducibility: replaying the trace's 79 machine events through the pure core reproduces all 10 passes, their distances and their path hashes.
6. Click rates from the trace: the last six steps of each gear-setting train run at 11.52 to 12.5 /s. No 6-step window runs faster than 25.75 /s.
- proof.mp4 is 27.6 s, 432x768, 30 fps, with AAC sound (mean −20.7 dB, max −0.4 dB). The clicks are the device grains from ana/device-sounds.wav, rendered offline from the page's own sound log. The run shows the whole cake being made from an empty turntable. One deliberate wrong pass (TOP SHELLS with the nozzle still at 24:1, off by 3.8 mm) decays, then the right one is kept.

## Evidence labels
- MEASURED: the six tests above, the proof run's pass log, and the audio levels.
- SEEN by the builder in rendered frames: sponge rising, coat sweep, bead ring, shells, garland, the silver decay, the inscription (legible while tilted, frame 560), candles dropping, lit, out.
- NOT DONE: the independent critic. This builder had no agent-spawning tool, so the coordinator must run it. No player other than the script has played it. Phone performance is untested. It was recorded on a SwiftShader software renderer.

## What failed and what changed
- Candle stops were first taken from the sample grid. 7 does not divide 240, so only 1 stop was found. Stops now sit on their own exact grid (24·p samples per turn).
- The clearance test failed when the turntable ran at 36:1: chords between samples cut the cream by 1.3 mm. The fix has two parts: the sample density now grows with the turntable ratio, and the turntable gear is capped at 4:1.
- The first rate test asserted 23.6/s for the front of each train. That is wrong when the hand drags slowly, because the machine keeps up at 11.8. The test now asserts the slow tail and a speed ceiling, and only reports the fast stretches.
- r1 to r2: the scope was moved off the HUD. The inscription tilt went from 9 to 18 degrees so the characters read while they are written. The decay lasts 0.6 s. The icing is a little brighter. The r1 proof is kept in /home/claude/stelline-work/harmonic/r1/.

## What is weak
- The evolution has a single target. Every stage heads toward the sponge with white beads. The other film cakes (chocolate/orange, mint, red-orange, brown dome) cannot be reached, and the sponge profile and colours are not set by the player.
- 生日快乐 is foreshortened to red marks once the cake levels at the kneeling view.
- The beads are small at this distance and read partly as dots. The shells shade grey under the key light.
- The game is a lock-matching puzzle: the amber spots give the answer away. The SCION A/B test of rational lock against detuned drift was not built.
- There are no children or faces at all, which follows the brief. The table, children and blow performance from ana are left out. "The blow" is a HOLD, not a breath.
- Each run of record.js plays the same scripted route. Sound is synthesized except for the device click grains.

## Files
index.html, harmonic.js, tests.js, tests.json, trace.json, record.js (Playwright; serve the repo root on port 8779), proof.mp4 (gitignored), strip.jpg, operator.html.

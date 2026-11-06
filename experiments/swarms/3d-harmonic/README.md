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

## r4: shared modules adopted, inscription cleared
- **LOOK (../shared/look.js + look-genome.json).** It now supplies the room, the grade, the post pipeline (bloom, grain, depth of field, spot screen), the key and candle lights, and the materials for sponge, icing, chocolate, beads, red piping, wax, flame and halo. The page's own lights, room, warm emissive hacks and amber pool are gone. The cake parts switch on and off through `LOOK.reveal` (round spots), and a cake change through `LOOK.flash`. A rejected pass decays by the same pair. The machine (post, arm, gears, turntable) keeps plain materials and fades with the memory.
- **HOLO (../shared/holo.js).** `HOLO.arc` replaces the page's own arc: exposure 1 under LOOK's grade, left of the cake at candle height, stepped by the same stage and character events, and updated by the page's clock (`auto: false`, so the virtual clock in recordings drives it).
  - `HOLO.device` is **not** adopted. The device is still ana's ring barrel, with this game's gear mapping. HOLO's controller has generic targets and ranges; mapping the per-gear rational detent lists, the per-gear ranges (turntable stops at 4:1) and the ratio/phase labels onto it was more work than this round allowed. It is the next integration step.
  - The page's own scope (the phase visualizer) stays, because HOLO has no equivalent.
- **Inscription cleared.** The text moved 30 mm toward the reader. The candles now sit on an inner-loop limaçon (arm 1:1 at 90 degrees, ρ = 30 mm + 60 mm·cos), so all seven stand behind the words (all z ≤ 1.7 mm, text from z = 10 mm). The flourish moved to 71 mm, in front of the text, with 7 mm clear. Test 4: minimum candle gap 8.2 mm.
- **Inscription colour.** On the chocolate cake the words are piped in the bead cream. Red did not read on the orange glaze under LOOK's grade. The white cake keeps the film's red piping. Top sprinkles are kept off the writing's ground.
- **Own spots.** The page's persistent spots bloomed into white blobs under LOOK's post. They now only mark switching on (opacity 0.22). LOOK's spot screen and reveal carry the rest. LOOK.md notes that the film shows no steady spot pattern.

### Measured on the r4 proof (proof.mp4 26.8 s, chocolate path; trace.json; `node tests.js` → tests.json)
- **All 7 tests pass on the proof's own trace.**
  - Closure error 0.
  - Clearance at least 0.3 mm over about 1.02M samples.
  - Smallest one-detent error 0.81 mm against 0.7 mm tolerance.
  - Candles at least 8.2 mm from every stroke and shell.
  - Both recipes reachable.
  - Replay of 71 machine events reproduces all 10 passes.
  - Click rates: slow tails 11.5–12.5/s; fastest 6-step window 22.56/s.
- **Red/blue of the cake region**, sampled every second from 5 to 23 s: mean 4.27, min 1.30.
  - The two samples at 1.30 and 1.32 (14 s, 18 s) land on the magnesium flash at a stage change. LOOK.flash turns the whole cake white for about 3 frames. A scan every third frame finds 8 such flashes, one per accepted stage.
  - Without those two, the minimum is 1.78 and most samples are 3.7–6.0. The film's side measures 3.84 and its top 2.95 (LOOK.md).
- **Inscription, final level frame (26.8 s, scale at 20 degrees):** 生日快乐 reads as four separate characters, about 12–15 px tall at 432x768 (estimated from a 3x crop, not an automated count). All candles are behind the words and the flourish sits clear in front.
- **Not measured in r4:** the audio bed (unchanged from r3) and the white recipe under LOOK (no still render this round).

## Round 1 critic repair (r3)
The critic's verdict on r2 (critic-round1.md): the making and the game pass; the reference is stronger on the look. The repairs:
- **Look.** The key light is now warm (0xff9a48). The hemisphere fill is warm and very low. The materials carry a warm emissive base. A round amber pool of light sits behind the memory. The projected spots stay on for the whole run, flickering, and flare on each stage change.
  - Measured on the r3 proof: red/blue of non-black pixels in the cake region, every second from 5 to 23 s, is min 1.62, mean 2.87 (19 frames). r2 was 1.04-1.08, the bar is 1.5, the film is 3.8.
  - The white recipe's still renders measure 1.74-1.81. Those are lower than chocolate because the cream is pale.
- **Inscription.** Each glyph is piped 1.4x deeper (29 mm wide, 40 mm deep) to offset the kneeling view's foreshortening. The gaps are 5 mm, the tube is 2.6 mm, and the camera is about 24 degrees up (it was 17).
  - Final frame of the r3 proof (26.7 s, scale at 20 degrees): red glyph runs measure 12-24 px tall at 432x768, the bar being 10. 生 and 日 are separated by a visible gap. The flourish underneath and two candles in front touch the 日 and 快 runs, so the gaps are not clean everywhere.
- **Earned hint.** The amber target spots and the scope's target trace appear only after one of your passes at that stage has decayed. Before that, the scope shows only your own path and OFF BY x MM. The HUD no longer names the answer.
- **A second film cake.** The nozzle ratio at the COAT pass picks the recipe: 1:1 gives white cream, 2:1 gives chocolate with an orange glaze top. The chocolate recipe has its own targets: beads 18:1, shells 28:1, garland 5:1 at 0 degrees, and the same candles. Test 7 shows both cakes are reachable and each rejects the other's bead ring. The r3 proof plays the chocolate cake. The white path is covered by the node tests and still renders, but not by a video.
- **Sound.** The piping bed is about 12 dB lower and narrow-band, and the spread bed is about 12 dB lower. The machine and hand clicks are louder.
  - Measured as 50 ms window levels (p10 / median / p95): r2 −34.5 / −21.2 / −15.7 dB, r3 −35.0 / −20.1 / −14.6 dB. The bed is lower, so more of the level now comes from the clicks. The spread between quiet and loud windows hardly changed, so this measure does not show a clear improvement. Listen before believing it.
- **Rate burst found.** The r3 trace shows one 6-step window at 30 steps/s. Time banked at the slow rate was spent at the fast rate when a drag pulled the ring more than 6 behind. Fixed after recording (`stepClock` is capped). The proof's trace.json still fails test 6 (30.0/s). The same scripted game re-run after the fix without screenshots (trace-fixed-rate.json, `TRACE=trace-fixed-rate.json node tests.js`) passes all 7 tests: fastest window 22.56/s, slow tails 11.5-12.5/s. The proof video predates the fix.
- **FILM-BAR.md.** The shared look.js and holo.js did not exist when this round finished (experiments/swarms/shared/ was absent). Adoption is pending. This page keeps its own grade and ana's device and arc.

## Measured at r2 (kept for the record; r3 numbers are in the section above and in tests.json)
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
- Two of the film's cakes are reachable (white sponge, chocolate with orange top). Mint, red-orange and the brown dome are not. The sponge profile is fixed.
- 生日快乐 is legible level, but the flourish and the candles in front still touch some glyphs.
- The look has its own grade; the shared film-evolved look.js has not been adopted. The R/B of 2.9 on chocolate and about 1.8 on white is still below the film's 3.8.
- The beads are small at this distance and read partly as dots. The shells shade grey under the key light.
- Before the hint is earned, the game is hot-and-cold search on the distance readout. The candle count readout still leaks the nozzle count. The SCION A/B test of rational lock against detuned drift was not built.
- There are no children or faces at all, which follows the brief. The table, children and blow performance from ana are left out. "The blow" is a HOLD, not a breath.
- Each run of record.js plays the same scripted route. Sound is synthesized except for the device click grains.

## Files
trace-fixed-rate.json (post-fix rerun), critic-round1.md, index.html, harmonic.js, tests.js, tests.json, trace.json, record.js (Playwright; serve the repo root on port 8779), proof.mp4 (gitignored), strip.jpg, operator.html.

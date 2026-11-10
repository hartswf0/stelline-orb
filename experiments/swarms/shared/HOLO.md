# HOLO: the hologram UI and the device, measured against the film

Rerun pass 2: `node holo-measure.js --minutes 14 --seed 7` (`--no-evolve` only measures and sets the genes directly).

Files: `holo.js` (module), `holo-genome.json` (evolved numbers, also injected into holo.js), `holo-test.html` (bench), `holo-measure.js` (measurement and evolution), `holo-trace.json` (numbers only, no film pixels). Side-by-side strips with film pixels are only in `/home/claude/stelline-work/holo/` (strip-arc.png: film on top, HOLO at the same framing below, brightened 2.2x).

## API
`HOLO.arc(scene, anchor, {size, camera, side})` returns `.object`, `.step(i)` (the mark blinks out for blinkFrames/24 s, comes back at -23.2/-19.3/-10/-0.7/+6 deg, then drifts), `.show(on)`, `.off(dur)` (segments go out one by one, neon style). `HOLO.readout(...)` returns `.type(n)`, `.feed(px)`, `.clear()`. `HOLO.childMark(scene, head, {size})` returns `.show(p)` (visible while 0 < p < 1). `HOLO.spots(root)` returns `.on(dur)`, `.off(dur, {origin})` (banks ordered by distance), `.flash()`, `.set(k)`. `HOLO.device(canvas, {targets, rings})` returns the controller: `on('step'|'hand'|'select'|'hold'|'off'|'ring')`, `setRange`, `setValue`, `setLabel`, `turn`, `press`. `HOLO.Machine` is the device's stepping logic without the DOM (works in node). `HOLO.draw.*` are the plain 2D renderers the measurement uses. The objects update themselves on requestAnimationFrame; pass `camera` so they keep to the cake's side.

## Pass 2 (current): a fit checked against the film, measured genes set directly, only the free genes evolved
**Fit.** Pass 1 fitted an axis-aligned ellipse to every bright pixel, and the result sat on the edge of its search range. Pass 2 treats the arc as a circle seen in perspective, i.e. a turned ellipse. It finds 234 half-max crossings on the band's outer edge (scanning rows on the right side and columns along the top). It then searches over rotation and aspect, with a linear circle fit at each step, and refines the best result.

Result in ROI coordinates: centre (120.9, 109.2), which is frame (660.9, 379.2); semi-major axis R 91.8 px; aspect 0.78; rotation -22 deg; RMS 1.55 px. An independent direct conic fit in Python agrees: frame (662.4, 378.7), axes 68.6 x 91.0, so aspect 0.754, rotated 158.5 deg (the same as -21.5). The overlay is at /home/claude/stelline-work/holo/fit-overlay.png: the red ellipse runs along the outer edge across the top, the right side and the bottom.

All arc angles are now the ellipse's own angle measured around its centre in the turned frame (not image degrees).

**Set straight from the film (holo-trace.json `directGenes`):**

| gene | value |
|---|---|
| R / aspect / rotation | 91.8 px / 0.78 / -22 deg |
| band width (FWHM) | 21 px |
| extent | -111 to 99 deg |
| segments | 4 (gaps at 1, 34, 48 deg; 5.3 deg wide) |
| notch darkness | 0.64 |
| notch reach | full band width (the film's notches darken the outer half at least as much as the inner half, so they are not inner-side only) |
| colour | film mean RGB of the band's brighter half, hue only (brightness left to the free gene `gain`) |
| index mark | 15 x 14 px including bloom |
| mark rest positions | -5.5, -1.5, 7, 16, 23 deg (median over each run in arc-series.json) |
| blink | 3.75 frames (4, 3, 4, 4) |
| drift after landing | -0.25 deg (almost none at this precision) |

**Evolved, free genes only.** These are band falloff (in, out, exponent), the outer lip, glow and glow alpha, softness, gain, the hairline, the two end fades and a sub-pixel offset. The score combines edge distance, ΔE, the radial profile and the angular profile. Seed 7, 5 parents and 16 children per generation, 265 generations, stopped at the 14-minute cap. Flicker cannot be measured from a static plate, so I did not evolve it.

| metric | tol | pass-1 genome under the new fit | genes set directly | after evolution |
|---|---|---|---|---|
| chamfer distance between edge maps (px) | 1.6 | 3.89 | 2.75 | **1.41 (pass)** |
| colour ΔE (Lab) | 6 | 11.9 | 25.8 | **1.17 (pass)** |
| angular profile correlation | >= 0.88 | 0.64 | 0.80 | **0.881 (pass, at the limit)** |
| radial profile L2 | 0.12 | 0.31 | 0.24 | 0.207 (fail) |

Checks: the same extractor run on the final render.

| check | render | film | |
|---|---|---|---|
| segments | 4 | 4 | ok |
| band width | 21 px | 21 px | ok |
| gap positions | within 1.3 deg | | ok |
| extent | -105 / 91 | -111 / 99 | off by 6 and 8 deg; the check tolerance is 4 |
| mark | 19 x 15 | 15 x 14 | too wide |

**Child mark** (frame 153.07 s, measured with the same edge fit). The C has R 23.8 px, aspect 0.82, rotation 4 deg, RMS 0.33 px, and a 5 px band. Its bar has a bright top 8 x 5 px, 45 px to the left of the C's centre and 17 px above it.

I set these as genes, rendered the mark, and measured it again with the same extractor: R 24.3, aspect 0.85, rotation 7. The overlay is at /home/claude/stelline-work/holo/kid-overlay.png (film left, render right). The bar's dim body below its bright top runs into the transparent child behind it, so I did not measure it. I also did not measure the leader line. e-children.jpg and e-kids.jpg are crops of the same moments; I measured the raw frame because its pixel scale is known.

**3D use.** The genome holds the film's pixel levels, which are dark because they come after the film's grade. `HOLO.arc` therefore takes `exposure` (default 2.2), so the arc shows in an ungraded scene. A swarm using LOOK's grade should pass about 1.

**Still weak.** The radial profile fails: the film band has a softer inner ramp. The mark renders as a round bright blob, where the film's is a squarer block. The cap is not detected as brighter, because the mask under the wall light cuts it off, so capGain is 1. The readout, step-timing and feel numbers below come from pass 1 and were not changed.

## Pass 1 record
## What was measured (film, by holo-measure.js)
- Arc, medium cake shot 144.70 to 148.5 s, every frame (91 frames), ROI x540-800 y270-490. Static plate = 20th-percentile frame. Ellipse fit in ROI coordinates: centre (97, 120), R 93 px, aspect 1.0. The fit sits on the edge of its search range, so its geometry is not reliable (weak).
- Band radial FWHM 18 px. Angular extent -125 to 57 deg. 4 segments (gaps at -21, 7, 19 deg). Cap ratio 0.36. Band colour Lab (28.6, -2.0, 5.4): dark grey with a slight green-yellow cast.
- Index mark blob 19 x 13 px including bloom. My tracker agrees with arc-series.json on which frames have no mark in 83% of frames. Angle offset -6.4 deg, RMS 6.1 deg after removing the offset, because the centre is different.
- Readout, deskewed by a slope of 0.18 (the rows rise to the right): row FWHM 14 px, line spacing 6 px, up to 4 rows detected (the film has 3), longest row 112 px, typing rate 88 px/s.
- Child mark at 153.07 s: 62 x 47 px including its bar and leader (frame k04).
- Sound, pre.wav 28.8 to 31.0 s: 14 irregular hand clicks (28.91 to 29.32 s). The train starts 0.43 s after the last hand click and runs at 0.0858 s per click (11.7/s), 8 loud clicks. Hand-click level / train-click level = 0.21. The second burst I detected also runs at about 11.7/s, so the dossier's 24/s doubling is not confirmed. Train-click spectral centroid 10.5 kHz, hand clicks 8.7 kHz, device-sounds.wav click grain 6.0 kHz. events.json: 18 of 23 trains run at 10 to 12.5/s, median 11.8.

## Tolerances and results (seed 7, 16 generations, elitist search: 5 parents, 14 children)
The score is the sum of (error / tolerance)^2. It fell from 209.8 to 155.2. **5 of 19 metrics are within tolerance.** I stopped on the time budget, not because the metrics converged.

| metric | tol | after |
|---|---|---|
| chamfer (edge maps, px) | 1.6 | 8.4 (worse than the 5.5 at the start; the search traded it away) |
| radial profile L2 | 0.12 | 0.50 |
| angular profile corr | >=0.88 | 0.76 |
| segment count | +-1 | 6 vs 4 |
| gap position (deg) | 3 | 2.0 (pass) |
| band FWHM (px) | 1.5 | 14 vs 18 |
| extent a0 / a1 (deg) | 4 | -105 / 47 vs -125 / 57 |
| colour dE (Lab) | 6 | 11.7 |
| mark w / h (px) | 1.5 | 20 / 3 vs 19 / 13 (w passes) |
| step timing RMS vs arc-series (deg) | 1.5 | 1.51 (borderline) |
| blink frames per step | 0.75 | 0.75 (pass) |
| drift after landing (deg) | 1.0 | 1.16 |
| readout row FWHM / spacing (px) | 0.75 | 14 / 4 vs 14 / 6 (FWHM passes) |
| typing rate | 20% | 72 vs 88 px/s (passes, -18%) |
| longest row | 15% | 92 vs 112 |

Controller feel (Machine evolved in node against the forest close-up). Latency 0.43 s (film 0.43), slow interval 0.0857 s (film 0.0858), slow count 8 (film 8), hand/step and fast/step gain ratios 0.21 (film 0.21). All of these pass. Fast interval 0.0625 vs 0.0856: this fails, because the film shows no clear doubling. Grain playback rates are set from the centroid ratio: clickRate 1.6 (clamped), handRate 1.44.

## Weak
- Not believable yet on the arc. The strip shows that HOLO's band is thinner, whiter and cut all the way through by its gaps. In the film the band is wider and grey-green, its notches cut only the inner side, and its mark is a larger glowing block. The evolution ran too few generations, and the ellipse fit is unreliable.
- The readout extractor merges the blurred rows, so its row FWHM and line count are weak measures.
- The child mark, spots and neon-bank shutdown are built from the dossier but not measured. The forest shutdown was examined; the party's own shutdown was not.
- I did not compare the device's look against the film's insert numerically. The Oswald choice comes from the dossier's font match.
- No independent critic was run.
- Rerun: `node holo-measure.js --gens 60 --seed 7` (about 30 s per generation). `--strip-only` remakes the strip.

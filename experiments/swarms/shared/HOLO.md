# HOLO: the hologram UI and the device, measured against the film

Files: `holo.js` (module), `holo-genome.json` (evolved numbers, also injected into holo.js), `holo-test.html` (bench), `holo-measure.js` (measurement and evolution), `holo-trace.json` (numbers only, no film pixels). Side-by-side strips with film pixels are only in `/home/claude/stelline-work/holo/` (strip-arc.png: film on top, HOLO at the same framing below, brightened 2.2x).

## API
`HOLO.arc(scene, anchor, {size, camera, side})` returns `.object`, `.step(i)` (the mark blinks out for blinkFrames/24 s, comes back at -23.2/-19.3/-10/-0.7/+6 deg, then drifts), `.show(on)`, `.off(dur)` (segments go out one by one, neon style). `HOLO.readout(...)` returns `.type(n)`, `.feed(px)`, `.clear()`. `HOLO.childMark(scene, head, {size})` returns `.show(p)` (visible while 0 < p < 1). `HOLO.spots(root)` returns `.on(dur)`, `.off(dur, {origin})` (banks ordered by distance), `.flash()`, `.set(k)`. `HOLO.device(canvas, {targets, rings})` returns the controller: `on('step'|'hand'|'select'|'hold'|'off'|'ring')`, `setRange`, `setValue`, `setLabel`, `turn`, `press`. `HOLO.Machine` is the device's stepping logic without the DOM (works in node). `HOLO.draw.*` are the plain 2D renderers the measurement uses. The objects update themselves on requestAnimationFrame; pass `camera` so they keep to the cake's side.

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

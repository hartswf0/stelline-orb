# LOOK — the memory's look (shared module)

`look.js` gives any three.js r128 scene of the cake, table and candles the look of Ana's memory: warm key and candle light on true black, falloff, bloom with warm halation on flames, grain, depth of field, vignette, the round projected-spot screen (switch on/off as round spots, magnesium-flash decay), and procedural materials (sponge, cream icing, piped beads, chocolate, striped wax, red piping, cake board, table). API is in the header of `look.js` (`LOOK.apply`, `LOOK.material`, `LOOK.post`, `LOOK.stats`, plus `LOOK.reveal`, `LOOK.flash`, `LOOK.load`).

Use:
```js
const H = LOOK.apply(renderer, scene, camera, { target: cakeCentre, candles: flameObjects, room: true });
await LOOK.load('../shared/look-genome.json');      // the accepted parameters
mesh.material = LOOK.material('icing', { speckle: 1, repeat: [3, 1] });
// each frame: H.render(dt) instead of renderer.render(scene, camera); on resize: H.setSize(w, h)
LOOK.reveal(cakeGroup, k);   // 0 gone .. 1 whole, as round spots
LOOK.flash(cakeGroup, k);    // 1 -> 0 over ~0.4 s on a cake change
```

## What is measured (look-measure.js)
Film frames: 145.6/146.0/146.4 s (shot A, floating sponge cake, tilted) and 154.9/155.3/155.7 s (shot B, chocolate-sided cake on the hex table), averaged, downscaled to 640x360. Regions are hand-drawn polygons in film pixels (overlays in `/home/claude/stelline-work/look/regions-*.png`); in renders the same regions come from an ID pass of the test scene (exact), and the background is the ID background inside the same film rectangles.

Per shot: per-region CIELAB mean and spread (top, side, table, background); red/blue ratio of the lit cake top (mean sRGB R / mean sRGB B); L histogram (25 bins) earth-mover distance over the union of regions; bloom radius (upper-sector radius where luminance above each of the 7 brightest flame peaks falls to 10 % of peak minus surround, in 1280-wide pixels); fine texture (std of L minus its 3x3 blur on the cake top) as the stand-in for grain and the spot screen.

Film numbers (640x360, means of 3 frames): see `look-genome.json` `film`. Notable: background L 2.5-3.6 (true black, slightly green-yellow); A top L 54, a 9, b 41; B table L 47, a 13, b 48; bloom radius 11.6 (A) and 14.0 (B) px at 1280 width.

**Red/blue ratio.** The brief quotes ~3.8 for the lit cake at 146 s. With mean sRGB R / mean sRGB B this measures 2.95 on the cake top and 3.84 on the cake side at 146 s, 4.4 on the top at 155 s (linear-light ratio on the top at 146 s is ~7.9). The 3.8 figure matches the cake side, so the region the brief meant is probably the whole cake or its side. The term evolved is the top (2.95).

**Colour management.** ffmpeg PNGs carry cICP/cHRM/gAMA chunks and Chromium colour-manages them (R/B read 2.48 instead of 2.95). Film frames are therefore passed as BMP. Anyone measuring film frames in a browser should do the same.

**Spot screen.** The round projected-spot pattern is not resolvable in steady 720p frames (zoomed crops at 141.5-142.1 s and 146 s show none), so the steady-state spot amplitude is held to the film's fine texture and the spots are used only for switching on and off.

## Tolerances (declared before evolving)
|term|tolerance|
|---|---|
|region L mean|4|
|region a mean|3|
|region b mean|4|
|region L spread, b spread|max(2.5, 40 % of film)|
|red/blue, cake top 146 s|0.4|
|L histogram EMD|4 L units|
|bloom radius|35 % of film|
|fine texture (cake top)|max(0.4, 40 % of film)|

Each term is |render − film| / tolerance; a term above 1 fails. Score = sum of squared terms + 4 per failing term.

## Evolution
Seeded (20261106) elitist (mu+lambda), mu 5, lambda 10, uniform crossover between elites, Gaussian mutation (half the genes, sigma adapted by success), 9 generations. Earlier runs also re-measured the elite each generation; dropped once the render was shown to be deterministic. Genome: 41 genes (light, grade, bloom, grain, DOF, vignette, spot screen, material tones). Log: `look-trace.json`.

## Results (accepted genome, gen 8 of 9; `look-genome.json`)
Score 137.4 (start 238.3). **Not within tolerance: 15 of 40 terms fail.** The evolution was stopped by the time budget, not by convergence.

|region|render L / a / b|film L / a / b|
|---|---|---|
|A top|62.4 / 7.9 / 44.6|53.7 / 8.9 / 41.1|
|A side|13.6 / 3.9 / 14.8|8.1 / 4.2 / 8.2|
|A bg|0.2 / 0.0 / 0.0|3.6 / -1.3 / 1.7|
|B top|57.5 / 10.4 / 43.4|62.8 / 14.7 / 55.9|
|B side|10.4 / 18.9 / 15.3|14.7 / 7.8 / 19.7|
|B table|44.8 / 15.8 / 46.3|47.1 / 13.0 / 47.9|
|B bg|0.2 / 0.0 / 0.0|2.5 / -1.1 / 1.9|

Red/blue cake top 146 s: render 2.66, film 2.95 (pass). Bloom radius: A 25.7 vs 11.6, B 26.9 vs 14.0 px (fail, about twice the film's). Histogram EMD passes on both shots.

Failing terms (|diff| / tolerance): B.side.a 3.69, A.bloom 3.47, B.top.b 3.14, B.bloom 2.62, A.top.L 2.19, B.top.sb 1.95, B.table.sb 1.76, A.side.b 1.65, B.side.sb 1.54, B.top.a 1.46, A.side.L 1.38, B.top.L 1.33, B.side.b 1.10, B.side.L 1.08, B.table.sL 1.05

## Bug found and fixed during the run
The post pipeline first replaced each ShaderMaterial's `uniforms` object per pass. three r128 keeps the object it compiled with, so every post parameter (exposure, white balance, bloom, grain, vignette, spots) was frozen at the first frame's values. Two earlier evolution runs were invalid because of it (their scores depended on which genome was rendered first in the page); their traces were discarded. Fixed by updating uniform values in place; `node look-measure.js repeat` now gives the same score for the same genome regardless of order (±1.3 on the very first render).

## What is weak
- Bloom: the halo sprites read as round discs around each flame and the measured radius is about 2x the film's. The halo should be smaller and the bloom tighter; the evolution did not get there.
- Steady spot screen: the evolution raised `spotSteady` to 0.12 at a 2.4 px pitch to match the film's fine texture; in the render it reads as a visible dot screen on the lit cake, which the film does not show. Swarms should set `spotSteady: 0` until this is re-measured (or the texture term weighted against it).
- Background: renders sit at L 0.2; the film's dark room is L 2.5-3.6 with a slight green-yellow cast. `bgLevel` does not lift it enough after the tone curve.
- Chocolate side (B): too red (a 18.9 vs 7.8) and its horizontal bump streaks read as stacked layers; the film's side is smoother frosting with dark dots.
- The film's key light is a wide pool that lights the whole table and the children; the test scene's spot is narrower.
- The band of light is thin and hard; the film's band is wider and softer.
- Region polygons are hand-drawn on single frames; the B cake top is only ~1000 px at 640x360, so its spreads are noisy.
- Rendering is SwiftShader (software) at 640x360; a phone GPU will differ in grain and bloom texture sizes.
- No independent critic has seen the strips. Side-by-sides with film frames: `/home/claude/stelline-work/look/side-A.png`, `side-B.png`. `look-strip.png` holds renders only (shot A, shot B, a half-revealed spot frame).

## Files
`look.js` module; `look-genome.json` accepted genome + film numbers + per-term result; `look-test.html` test scene (phone: scene top half, controls and measured-vs-film table bottom half, no page scroll; serve over http so it can fetch the genome); `look-measure.js` (`film`, `frame`, `evolve N`, `strip`, `repeat`); `look-trace.json` per-generation log.


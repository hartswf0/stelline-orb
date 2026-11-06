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
Seeded (20261106) elitist (mu+lambda), mu 5, lambda 10, uniform crossover between elites, Gaussian mutation (half the genes, sigma adapted by success), elites re-measured every generation and kept at their worse score. Genome: 41 genes (light, grade, bloom, grain, DOF, vignette, spot screen, material tones). Log: `look-trace.json`.

RESULTS_PLACEHOLDER

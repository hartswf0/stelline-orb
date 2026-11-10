# LIGHT — modules/light.js

The memory's light: candle colour and strength, the dark-dome falloff, the ambient level and tint, the grade (exposure, black point, gamma, white balance), and the projected-spot parameters.

**API**: `name, genes, groups, stages, making, blank(), evaluate(G, refs), build(THREE, G, {t, candle})`, `anchors(G)` ({candle, domeCentre}), `params(G)`, `render(G)`, `stats(img)`, `kelvinRGB`.
- `build` returns a `THREE.Group` holding a candle `PointLight` and a `HemisphereLight`.
- `group.userData.params` carries the values the host applies to its grade or shader: `exposure`, `blackPoint`, `gamma`, `warmth`, `whiteBalance`, `candleRGB`, `candleIntensity/Range/Decay`, `ambient`, `ambientRGB`, `domeFalloff`, `domeBand`, `spotDensity`, `spotSize`, `spotDecay`.

**Genome (16)**: CANDLE kelvin 1800–4500, yellow, candleI 0.4–3 · DOME range, decay, domeFall, bandI · GRADE amb ≤ 0.1, ambWarm, exposure 0.3–1.2, black ≤ 0.05, gamma, warmth · SPOT density, size, decay.
- The bounds are set so that no variant overexposes. Tested: the worst of 200 random variants burns out ≤ 2 % of the frame.

**Stages**: CANDLE hiC ≥ 0.8 · DOME falloff ≥ 0.65 · GRADE level ≥ 0.58.

**Fitness**
- A fixed 64×36 synthetic party frame (camera, table disc, cake, three figures, floor, dome wall with its band, flame) is shaded and graded.
- It is compared with frames 155/156 on five things:
  - luma percentiles
  - black fraction
  - mean luma
  - mean luma in rings around the candle (as a shape, relative to the candle ring)
  - the chroma of highlights and shadows

**Measured**: 8 seeds, host settings. Generations needed per stage:
- CANDLE: median 13, max 20
- DOME: median 7, max 11
- GRADE: median 19, max 31 (over the 25 target)

**Weak**
- The evolved whole fit is only about 0.6. The synthetic frame's composition is not the film's: its p90 luma is about 98 against the film's 75, and the shadow chroma stays poor (shC about 0.24).
- The SPOT genes are not measured.
- Each evaluation takes about 3 ms.

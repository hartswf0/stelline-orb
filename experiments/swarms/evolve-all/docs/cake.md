## Cake (modules/cake.js)

Ported from `../evolve/evolve-core.js`. The lathe profile, the projection from the reference camera and the rasterised
silhouette IoU are kept. Breeding is not in the module (`core/breed.js` does it). Checked: the module runs through
`core/breed.js` (`stageOf`, `breed` with `keep`) from the blank genome to all six stages in 67 generations at a fixed
strength of 0.15 (target `cream`, seed 9). That was one run, made by hand.

### API

```
EVOMOD.cake / require('modules/cake.js')
name 'cake'
genes   21 genes [key, group, min, max, default]; the defaults are the blank genome
groups  BASE FORM SPONGE ICING FROSTING DECORATION
stages  BASE shape>=0.5 | FORM shape>=0.7 | SPONGE side>=0.82 | ICING top>=0.85 | FROSTING frost>=0.8 | DECORATION deco>=0.75
blank() -> Float64Array (a flat disc of raw dough, 6% as tall as it is wide)
evaluate(G, refs) -> { fit, parts: { iou, shape, top, side, beads, frost, border, deco, dETop, dESide, dEBead, slope* } }
    refs = the whole refs/cake.json (it uses refs.target, else refs.default = 'cream') or a single cake entry
build(THREE, G, { t, tint, linear }) -> THREE.Group; group.userData.setT(t) re-poses it cheaply; userData.step is the current making label
making  SET THE BOARD 0-.08 | SET THE SPONGE LAYERS .08-.36 | RAISE THE DOME .36-.44 | POUR THE ICING .44-.58 |
        SPREAD THE ICING DOWN THE SIDE .58-.72 | PIPE THE BORDERS .72-.86 | SET THE BEADS .86-1
anchors(G) -> { base, baseRim, bodyBase, bodyRim, top, widest, rim, edge, inscription, candle0..candle6 }  (scene units)
extras  select(refs, id), targets(refs), colours(G), topY(G, r), stepAt(t), named(G), lab2srgb, srgb2lab
```

Units are those of ana/index.html: the body radius is 0.12. The origin is the centre of the underside, so the host sets the
cake's origin on the table module's `top` anchor. `top` is the top centre on the surface (under the 3 mm icing coat).
`rim` is where the flat top ends: its x is the radius candles may use. `baseRim` x is the base radius including the board,
and `widest` x includes the side ripples. `candle0..6` are seven seats on the top surface at 0.62 of the rim radius,
starting at the back (-z). `inscription` is the centre of the writing, 0.3 of the rim radius toward the viewer (+z).
`topY(G, r)` gives the surface height at any radius, so a part placed on a dome sits on it.

The making happens on screen. The board is set down. The sponge layers drop in one at a time and settle, and the filling
spreads between them. The dome rises. A pour column of icing comes down and the top coat spreads out from the centre. The
side coat runs down the side. The piped shells go round the top rim one by one, then round the foot. Then the beads are set.

### References (refs/cake.json, numbers only)

There are eight cakes: chocolate_orange 138.0 s, mint 138.9, red_orange 139.6, yellow_sponge 140.6 (tilted 21 degrees),
sponge_beads 141.5, brown_dome 143.0 (underside showing), cream 147.0 (her cake, close, 37.5 degrees from above), and
cream_table 155.0 (the earlier evolver's target, kept for comparison).

The measuring script is `/home/claude/stelline-work/evolve-all-refs/cake/extract.py`. It and the frames, overlays and
gridded crops stay outside the repo. Outlines and top ellipses were hand-traced in frame pixels. Elevation is
asin(minor/major) of the top ellipse; for the brown dome it comes from the underside ellipse. The top, side and bead colours
are medians plus a 3-colour k-means in CIELAB, measured per region. Texture is the standard deviation of band-pass
lightness per region and along the top rim.

### The olive icing: cause and fix

**Cause: the fitness.** The old fitness compared one sRGB histogram of every pixel inside the cake outline. At 7 degrees
the top is a thin band and the dark side covers about 90% of the pixels. The film's grade crushes blue: 77% of the
reference pixels have B < 8. The icing genes also painted the filling lines and an edge band on the side. So lowering the
icing's blue, which moves it toward olive and mustard, reduced the per-channel distance, even though the top in the frame
is cream. Measured: the old fitness scores the evolved olive icing sRGB (191,136,30) at 0.9421. It scores the icing
measured inside the top ellipse of the same frame, (214,162,68), lower, at 0.9349. So the old search was right to prefer
olive under the measure it had.

**Fix:** each region is measured on its own, in CIELAB. Icing genes are compared with the top's median, sponge genes with
the side's, bead genes with the beads'. Colour genes are L, a, b, so a mutation step is about the same visible change
everywhere. Result: on the 155 s frame the evolved top is sRGB (217,159,57), dE 4.7 from the measured (214,162,68). The
old olive is dE 10.7 away. On the 147 s cream cake the evolved top is (184,142,75) against a measured (178,135,61).

**Second, smaller cause, in the old page's 3D view.** The colour was raised to the power 2.2, multiplied by 1.6, lit by
warm lights and then ACES-mapped. That lit an already candle-warm colour a second time. Here `build` converts sRGB to
linear for an sRGB-encoded renderer, and `opts.tint` can divide a warm scene light back out.

Note: in this film's grade, "cream" measures warm, about sRGB (180-215, 135-162, 60-70). It is not white.

### Frosting, piping, beads (critic round 1)

There are new genes and geometry:
- `frostTop` and `frostSide` are ripple slopes, built as displaced coats. The top uses plane waves in x and z; the side uses
  waves round the circumference.
- `border` is a piped shell border round the top rim (instanced shells).
- `foot` is a piped border round the foot.
- Bead count comes from the covered share of the side area.

Fitness terms:
- `frost` compares the slopes with the measured band-pass lightness spread divided by the region's lightness.
- `border` compares 0.4 x frostTop + border with the rim's measured spread over lightness.

The evolved slopes match the measured ones for all eight references. For example, cream measured top 0.106 / side 0.219,
evolved 0.119 / 0.231. The test (`tests/cake.test.js`) checks that the finished cream cake has piped shells and beads as
visible instanced geometry (224 pieces) and a rippled top coat.

Headless renders, Chromium with SwiftShader, kept outside the repo in the scratchpad, show distinct cakes for all eight
targets. The finished cream cake has a cream frosted top, a piped rim and beads. These were checked by eye only. No viewer
test has been run.

### Measured (node tests/cake.test.js, 20 s, all pass)

The test player is a copy of the elitist (1+8) breeder. It works one stage at a time with strength 0.25, then 0.08, then
0.04 near the bar. For all eight references, seed 3125 passes every stage in 22 to 42 generations, and at least 2 of 3
seeds pass.

Final whole-match fit on seed 3125 is 0.85 to 0.89. Silhouette IoU is 0.80 (yellow_sponge) to 0.97 (chocolate_orange).
Top dE is 2.3 to 4.7 and side dE is 1.5 to 5.0. Elitism held: no stage measure fell in 100 random-strength generations.
Determinism held. `build` stands on its origin. Its top matches `anchors().top` within the 3 mm icing coat.

### What is weak

- The texture rule (lightness spread = lightness x slope) has not been calibrated against renders. The built ripples use a
  visual gain of 3 (`FROST_GAIN`) so they show under the memory's light. The frames' top texture also includes candle
  bases, sweets and the inscription.
- Rim and foot peak counts measure noise at these sizes, so they are not used. The foot is in shadow in every frame, so
  `foot`, `spread`, `fill` and `layers` are not measured: they are the player's choice.
- The brown dome is seen from below. There, a plain cylinder overlaps 0.957 and the search keeps dome 0, while a domed
  form reaches 0.98. The silhouette alone does not force the dome.
- yellow_sponge is tilted in depth as well as in the image, and an orthographic, rolled lathe reaches only about 0.85 IoU.
  The FORM bar (shape 0.7) is set so it can pass.
- Colours are as seen in the film, already under its candlelight. With a warm scene light the host should pass
  `opts.tint`.
- The lathe seam shows as a faint vertical line on rippled coats.

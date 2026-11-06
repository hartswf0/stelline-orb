# Cake metamorphosis: the birthday cake as one surface that changes, played on the memory maker's device

SCION 7 // PETER FOLDES (drawn metamorphosis), translated into 3D. Revision 1, 2026-11-06. Not committed.

## Thesis

Foldes's in-betweens hold a shape's identity long enough for the change to be felt. Here the cake is one continuous
surface, the same 41 x 64 points from the first lump of dough to the film's brown dome; every stage of the making is a key
form of that surface, and the player carries it from one to the next with the knurled ring, one machine step at a time.
The making is the performance: nothing, then the memory switching on through round spots of light and the dough is
there, then sponge, layers, icing, the film's cakes, seven candles, the inscription written stroke by stroke, the match,
and the blow. Where the film changes cake by a cut, the game cuts too, and marks it.

What would make it bland: a cross-fade between models (a dissolve), a cake that simply appears, cuts dressed as morphs.

## Native formal language (all in `morph.js`, shared by the page and the tests)

| Primitive | Here |
|---|---|
| Key forms | 10 keys: DOUGH, SPONGE DISC, DOMED SPONGE, LAYERED, ICED (the making) and the film's CHOCOLATE ORANGE TOP, MINT, RED-ORANGE, BROWN DOME, SPONGE WHITE BEADS. Each is a profile (base radius, top radius, rim height, side swell, icing bead, crown) plus angular unevenness (the hand-shaped dough) and a colour field (crust, crumb, cream layers, icing). |
| Point correspondences | One grid topology for all keys: rows run bottom centre (u = 0), foot of the side (u = 0.15, row 6), top rim (u = 0.55, row 22), top centre (u = 1); columns are fixed angles. The cap is parameterised linearly in radius, so a cap point keeps its radius fraction in every key. Vertex (i, j) is the same point of the cake in every form. |
| In-between fields | Per transition: RISE (the base changes first, the bake rising: dough to sponge, sponge to layers) or POUR (the top changes first, icing or ganache running down). The field delays each row by up to 32% of the change. |
| Pacing | Triangle ring: EVEN, EASE, LINGER (holds each shape longest), LEAN (changes at once). |
| Steps | Each change gets `stepsFor(a, b, pace)` machine steps: at least 12, more when the change is large or the pacing steep (dough to sponge 12 to 25; sponge to layered 14 to 32), so no single step moves a candle anchor more than 5.5 mm or the volume more than 15%. |
| Discontinuity markers | Between two film cakes the change is a CUT, never interpolated: the surface is the old cake until the middle step, then the new one. A thin ring at the cake's foot brightens as the cut approaches; on the cut, alternately a hard cut and a 3-frame silver decay (magnesium flash, 0.125 s). The candles are held through the cut and settle onto the new cake over 6 frames. |
| Anchors | The seven candles and 84 side beads are surface parameters (u, angle), read from the current surface by bilinear interpolation, so they ride every metamorphosis. Beads grow out of the side as the change passes their height. |

## The game (index.html)

Mobile layout: the cake above, the device below, no page scroll. The device is the one from `ana/index.html` (scale,
knurl, triangle rings; SELECT; HOLD; info), redrawn with this game's roles. Labels under each ring say what it does now.

- SELECT cycles the next forms this one can become (the making grammar in `morph.js`, e.g. DOUGH can become SPONGE DISC or
  DOMED SPONGE; ICED can become MINT, RED-ORANGE, SPONGE WHITE BEADS or BROWN DOME), then the jobs: CANDLES, INSCRIPTION
  (only once the brown dome, the cake the film writes on, has been reached), MATCH (once seven candles stand).
  The choices are listed under the device with the selected one underlined.
- KNURLED RING drives the change forward or back. Hand turns give quiet detent clicks; the machine steps after them at
  11.8 per second (23.6 when more than 6 behind), one device click per step plus a making sound (knead, rise, pour, pipe,
  candle tock, match strike, flare).
- TRIANGLE RING sets the pacing; it refuses while a change is part-way (it would change the step count under the hand).
- SCALE RING is where you kneel (5 degrees a detent).
- HOLD sets a finished change (a thud on the board). With 7 lit and the inscription written, HOLD is the blow: the seven go
  out one by one, 0.14 s apart, each with a wisp of smoke. A long HOLD switches the memory off through the round spots.
- The arc beside the cake at candle height (from ana) steps its mark through the five measured positions as a change
  or the inscription proceeds; its readout types while the cake is worked.
- SCENE (left collar) plays one path through the whole making on the same rings; CLEAR empties the dome.
- No faces. No children are shown: the cake is the only subject.

## Measured (labels: MEASURED = computed by code in this folder on this date; VIEWED = I looked at frames; NOT RUN)

MEASURED, `node tests.js` (all transitions in the grammar, under all four pacings, every step):
see `tests-result.json`. At the time of writing: 3544 passed, 0 failed. 11 morph transitions and 20 cut transitions.
0 flipped faces, 0 profile self-intersections (tolerance 0), smallest profile area 3.3e-3 m^2 (orientation never inverts).
Worst volume change in one step 9.7% of the larger form (DOUGH > DOMED SPONGE, EVEN), limit 16%.
Worst candle anchor move in one morph step 5.49 mm, limit 6 mm. Largest candle jump at a cut 17.4 mm (drum to dome),
settled over 6 frames, 2.9 mm a frame. Identity proxy: under LINGER, a quarter of the way through its steps the surface has
moved 0 to 1.7% of the way to the next key (mean vertex distance); this is a proxy only.

MEASURED, the proof run (`trace.json`, `render.js`): RESULTS_PLACEHOLDER

VIEWED: contact sheets of the scene at 1 to 29 s (scratch, not kept). The dough, the striped layers, the iced drum, mint with
beads, red-orange, the brown dome with 生日快乐 legible from the default kneel, the candles lit, out.

NOT RUN: the independent critic. This builder had no Agent tool; the coordinator runs it.

## Invariants (declared, tested in tests.js)

1. Correspondence: same vertex count and grid in every key and in-between.
2. No flips: no face normal reverses between consecutive steps.
3. No self-intersection: each angular column's profile, closed through the axis, keeps positive area, no crossing
   segments, no negative radius.
4. Volume per step bounded: at most 16% of the larger form per step (cuts exempt and flagged).
5. Candle anchors continuous: at most 6 mm a step in a morph; at a cut, held and settled (at most 4 mm a frame).
6. Identity held (proxy): under LINGER, less than 15% of the change done at a quarter of the steps.
7. The proof trace shows the whole making: arrival from nothing, at least three making stages, the brown dome, 24
   inscription steps, 7 candles placed, 7 lit, the blow and 7 out; no machine step faster than 23.6/s.

Artistic achievement judged only by viewing: whether each in-between still reads as the cake it was while visibly becoming
the next, and whether the rising and pouring fields read as making rather than as a dissolve.

## What failed and changed

- First render: the surface's triangle winding was inverted, so the outside faces were culled and the inside of the far
  wall and the underside showed through the top as a white star pattern. Fixed (winding a, b, c / a, c, d).
- First invariant run: 12 failures. A fixed 12 steps per change moved candle anchors up to 13.8 mm a step (sponge to
  layered under LINGER) and the volume 22% a step (dough to domed sponge). Instead of loosening the limits, the number of
  steps now grows with the size of the change and the steepness of the pacing (`stepsFor`). A bigger metamorphosis
  takes more in-betweens; this is also Foldes's rule of holding shape identity.
- The inscription canvas was first mapped rotated 90 degrees and then mirrored; now it reads from the default kneel.
- The camera was first too low and close (the top, where the inscription and candles are, was nearly edge-on); raised to
  about 26 degrees above the cake.
- The table was flooded by the candle light; light lowered and the table darkened toward the true-black dome.

## What is weak

- The brown dome, the film's chosen cake, is reached in the proof by a cut from red-orange (as in the film), not by
  metamorphosis; a player can reach it by morph (DOMED SPONGE or ICED to BROWN DOME), but the proof does not show that path.
- Surfaces are vertex colour only (no crumb or icing texture); at phone size the drum-to-drum morphs (layered to iced,
  iced to mint) can read as colour changes more than shape changes. The strongest shape changes are dough to sponge and
  sponge to layers.
- The beads are spheres on the surface, not piped; the piping of decoration is not shown, only the inscription.
- Candles drop onto the cake in 0.22 s; that drop is not an anchor move and is excluded from the per-frame candle measure.
- Sounds of making are synthesized (sound.js), not recorded; the device clicks are the real grains from
  ana/device-sounds.wav (gitignored) when present.
- No tilt (the film's tilt toward Ana is not on the triangle ring here; the ring is the pacing).

## Files

- `index.html` the game. `morph.js` key forms, correspondences, fields, pacing, cuts, anchors, measures. `sound.js` the
  sounds of making (one synth for page and mix). `tests.js` the invariants (writes `tests-result.json`).
- `render.js` records `proof.mp4` (540 x 960, 30 fps, with sound) and `trace.json` from the page's SCENE on a fixed clock;
  `mix.js` makes its soundtrack from the page's sound log.
- `operator.html` one-tap preview, revision, verdict, next blocking failure, links.

Rights: no film frames or film audio are in this folder. The film cakes' colours are the hex values already in
`ana/index.html`. three.js r128 and the Oswald font are reused from `ana/assets` by relative path.

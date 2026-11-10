## CANDLES — seven candles, placed one by one, lit one by one

Files: `modules/candles.js`, `refs/candles.json`, `tests/candles.test.js` (run `node tests/candles.test.js`).

### What it is
The candles on the cake top: shafts (plain cream, or with a red or blue spiral painted into the shaft), wicks, and flames (outer, core, faint
halo; all named `flame*`/`halo` and flagged `userData.flame`). The blank is one plain white stub in the middle, unlit, without a wick.

### Genome (25 genes, eight groups, one stage each)
- COUNT: `count` (1-12; fitness rewards 7).
- PLACING: `ring` (m), `arc` (deg, up to 270), `mid` (arc centre, deg; -90 = the back), `jitter` (in/out zigzag).
- SHAFT: `height` (m), `thick` (m), `depth` (pushed in, m).
- STRIPES: `striped` (share striped), `turns` (spiral turns), `cool` (share of the striped ones in blue).
- CREAM: the shaft colour and the blue stripe colour (under the film's grade the blue stripe is a cool off-white, close to cream).
- RED: the red stripe colour.
- FLAME: `wick` (to shaft), `flame` (height to shaft), `fw` (width to height).
- FLICKER: `lean` (deg), `flicker` (relative height variation).

Lengths are absolute (metres), so the same genome stands differently on a different cake: when the cake changes, PLACING and support are re-measured.

### References (refs/candles.json, numbers only)
Frames 147.375 s and 155.0 s (kept in /home/claude/stelline-work/evolve-all-refs/ins/; script make_refs_ic.py there); points read by hand on 4x crops.
- Seven bases in cake-top coordinates (R), same ellipse as the inscription: radius mean 0.53 (sd 0.17, 0.22-0.84); angles 160 to -22 deg,
  i.e. the back half and the left side, the front left to the writing. Kinds by angle: cream, red, cream, blue, cream, red, cream (4 cream, 2 red, 1 blue).
- Shaft length to cake diameter 0.206 (147.375 s, corrected for the 37 deg view) and 0.198 (155.0 s); used 0.202. Thickness to length 0.155.
  Flame height to shaft 0.37, flame width to height 0.41. About 8 stripe turns. Wick about 0.1 of the shaft (rough).
- Flicker 0.08: coefficient of variation of the bright flame-core height over 64 registered frames (0.05-0.10 for four flames; includes registration jitter).
- Colours relative to the cake top (per channel): cream 0.95, 0.94, 0.83; red 0.68, 0.43, 0.01 (reddest decile; the stripes are 1-2 px, so plain
  medians mix in white; under the film's grade the red reads orange); blue 0.93, 0.99, 1.54 (a cool off-white under the grade).

### Fitness and stages
Every score is 1 anywhere within its tolerance, then falls (a Gaussian plus a straight slope that spans the gene's range). The flat top
matters: later stages still nudge earlier genes a little, and a stage passed on a slope was lost to those nudges (first pass: 1-2 of 8
children admissible late in the run).
`count`; `placing` = where (0.7 chamfer distance between model and film bases, both ways, tolerance 0.12 R; 0.3 the group's mean position)
x `edge` (every base inside the rim, with its half thickness); `shaft` = length and thickness x `seat` (pushed in at least about 2 mm, not more
than half its height: a floating or sinking candle scores 0); `stripes`; `pale` (cream and blue), `red` (colours x the cake's top colour,
or a default cream until the cake supplies `topColour`; tolerance 0.1 RGB); `flame`; `flicker`. Support = edge x seat; fit = weighted
sum x (0.5 + 0.5 support). Stages: COUNT .99, then PLACING, SHAFT, STRIPES, CREAM, RED, FLAME, FLICKER all at .9 (set from measured convergence).

### Build, making, anchors (API)
`build(THREE, G, {t, support, refs, cakeTop, time, blown, light})`: origin = cake-top centre (the host hangs it on the cake's `top`). `opts.t`:
0-0.5 places candles one by one (each comes down from above), 0.5-1 lights them one by one with a match held to the wick. `time` drives
flicker; `blown` = how many flames are out (the blow, one by one); `light: true` adds one warm point light. `making`: PLACE CANDLE 1..7, LIGHT CANDLE 1..7.
`anchors(G, opts)`: base, centre, `wick0..wick6` = flame base of each candle, in the module's local coordinates (relative to the cake-top centre),
following a domed top. Also exported: `named, layout, refOf, supportOf, W`.

### Measured (node tests/candles.test.js, all pass)
Scripted chooser as in docs/inscription.md (8 visible variants, best kept). Generations per stage over 8 seeds, median / max: COUNT 3 / 7,
PLACING 11.5 / 22, SHAFT 9 / 17, STRIPES 8 / 21, CREAM 6.5 / 15, RED 14 / 29, FLAME 10.5 / 22, FLICKER 9 / 11.
- Defaults pass every stage; bases 0.13 R from the film's on average.
- Floating 6 mm: support 0, SHAFT 0. Sunk 20 mm in 30 mm shafts: support 0.33. Same genome on a 0.06 m cake: off its rim, PLACING below its bar.
- Built with three.js r128 in node: k candles placed at t = k/14, k flames at t = 0.5 + k/14; blown = 3 leaves 4 flames; three striped shafts.
- First pass (7 stages, 5-gene groups, no flat top, lambda 6) took 97-222 generations for the whole part; per stage up to 137.

### What is weak
- The arrangement model (an arc with an in/out zigzag) cannot copy the film's loose two rows: its best is 0.13 R mean distance; the 0.12 R
  tolerance is about the hand-read measurement error. Per-candle position genes would fit better and breed slower.
- The flat-topped scores mean anything within tolerance counts as exact; the tolerances are about the film's measurement error, no finer.
- Base points, the ellipse, wick length and flame size were read by hand from one or two frames; colours are under the film's grade and blur.
- The host's `wicks()` (index.html) reads `wick*` anchors as world positions; they are local to the cake-top centre and need the candles holder's position added.
- Under ui/player.js simulatePart at the time of writing, this module did not pass within 400 generations (seeds 1-3).

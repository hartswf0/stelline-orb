## CANDLES — seven candles, placed one by one, lit one by one

Files: `modules/candles.js`, `refs/candles.json`, `tests/candles.test.js` (run `node tests/candles.test.js`).

### What it is
The candles on the cake top: shafts (plain cream, or with a red or blue spiral painted into the shaft), wicks, and flames (outer, core, faint
halo; all named `flame*`/`halo` and flagged `userData.flame`). The blank is one plain white stub in the middle, unlit, without a wick.

### Genome (25 genes, seven groups)
- COUNT: `count` (1-12; fitness rewards 7).
- PLACING: `ring` (m), `arc` (deg, up to 270), `mid` (arc centre, deg; -90 = the back), `jitter` (in/out zigzag), `depth` (pushed in, m).
- SHAFT: `height` (m), `thick` (m), `striped` (share striped), `turns` (spiral turns), `cool` (share of the striped ones in blue).
- CREAM, RED, BLUE: the shaft colour and the two stripe colours (three genes each; one 9-gene colour group bred too slowly, so three groups).
- FLAME: `wick` (to shaft), `flame` (height to shaft), `fw` (width to height), `lean` (deg), `flicker` (relative height variation).

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
`count`; `placing` = where (0.7 chamfer distance between model and film bases, both ways; 0.3 the group's mean position) x `support`;
`support` = every base inside the rim (with its half thickness), pushed in at least about 2 mm, not more than half its height (a floating
or sinking candle scores 0); `shaft`; `cream`, `red`, `blue` (colours x the cake's top colour, or a default cream until the cake supplies
`topColour`); `flame`. Fit = weighted sum x (0.5 + 0.5 support).
Stages: COUNT count .99, PLACING placing .65, SHAFT shaft .8, CREAM .8, RED .8, BLUE .8, FLAME flame .8.

### Build, making, anchors (API)
`build(THREE, G, {t, support, refs, cakeTop, time, blown, light})`: origin = cake-top centre (the host hangs it on the cake's `top`). `opts.t`:
0-0.5 places candles one by one (each comes down from above), 0.5-1 lights them one by one with a match held to the wick. `time` drives
flicker; `blown` = how many flames are out (the blow, one by one); `light: true` adds one warm point light. `making`: PLACE CANDLE 1..7, LIGHT CANDLE 1..7.
`anchors(G, opts)`: base, centre, `wick0..wick6` = flame base of each candle, in the module's local coordinates (relative to the cake-top centre),
following a domed top. Also exported: `named, layout, refOf, supportOf, W`.

### Measured (node tests/candles.test.js, all pass)
- Blank to every stage, 8/8 seeds within 300 generations: 97-222, median 134; all end with seven candles; bases 0.15-0.21 R from the film's.
- Defaults (best of a 3000-generation run, rounded): fit 0.938, bases 0.132 R from the film's on average.
- Floating 6 mm: support 0, fit 0.94 to 0.35. Sunk 20 mm in 30 mm shafts: support 0.33. Same genome on a 0.06 m cake: support 0.14, PLACING below its bar.
- Built with three.js r128 in node: k candles placed at t = k/14, k flames at t = 0.5 + k/14; blown = 3 leaves 4 flames; three striped shafts.

### What is weak
- The arrangement model (an arc with an in/out zigzag) cannot copy the film's loose two rows: its best is 0.13 R mean distance, and the PLACING
  bar (.65) accepts about 0.16 R. Per-candle position genes would fit better and breed slower.
- Base points, the ellipse, wick length and flame size were read by hand from one or two frames; colours are under the film's grade and blur.
- The host's `wicks()` (index.html) reads `wick*` anchors as world positions; they are local to the cake-top centre and need the candles holder's position added.
- Under ui/player.js simulatePart at the time of writing, this module did not pass within 400 generations (seeds 1-3).

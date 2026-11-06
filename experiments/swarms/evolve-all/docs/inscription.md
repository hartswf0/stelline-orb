## INSCRIPTION — 生日快乐 and the flourish, piped stroke by stroke

Files: `modules/inscription.js`, `refs/inscription.json`, `tests/inscription.test.js` (run `node tests/inscription.test.js`).

### What it is
The writing on the cake top: four characters and the film's Z-shaped underline, piped as 3D icing beads. 24 strokes: 21 for the
characters (生 5, 日 4, 快 7, 乐 5, standard order) and 3 bars for the flourish (top bar left to right, diagonal back down-left, bottom bar right).
The blank is one short level dash of white icing.

### Genome (24 genes, five groups)
- STROKES: `count` (how many of the 24 strokes are written), `order` (0 = a fixed shuffle, 1 = the standard order).
- FORM: `fSheng fRi fKuai fLe` (each character's strokes bend from a level dash in the stroke's slot to the stroke's chord and median),
  `curve` (chord to median), `wobble` (hand shake), `slant`, `aspect`.
- HAND: `size` (em, m), `pitch` (character spacing, m), `rot` (line direction on the top, degrees), `cx cz` (centre on the top, m), `pressure` (bead width, m).
- FLOURISH: `fSpan fDrop fOff fBack fBot` (the Z's four corners).
- COLOUR: `r g b`.

Each stroke is a 6-point polyline whose points are computed from these genes. The genome does not hold one free number per control
point. Measured reason: on a toy sphere problem with the host's (1 + 6) breeder and the careful strength policy, 96 free genes needed
1599 generations and 132 genes did not get there in 2000; 48 genes needed 237. A playable part needs about 100-200.

### References (refs/inscription.json, numbers only)
- Stroke skeletons and order: hanzi-writer-data 2.0.1 (npm), derived from Make Me a Hanzi (Arphic fonts), **Arphic Public License**;
  medians resampled to 6 points in a -0.5..0.5 em box. If this is published, ship ARPHICPL.TXT with it. Noto Sans/Serif CJK are installed
  in the sandbox but carry outlines, not skeletons or stroke order, so they were not used.
- The film's hand, frames 144.75-147.375 s (frames kept in /home/claude/stelline-work/evolve-all-refs/ins/, scripts ins_track.py,
  ins_timing.py, make_refs_ic.py there): frames registered by phase correlation; icing pixels R/G > 1.55; a pixel counts once present
  in 3 consecutive frames and in the last. Cake-top ellipse read by hand (centre 413.5, 404 px; 134 x 80 px; tilt 10 deg), so cake-top
  coordinates are in top radii R with an estimated error of about 0.08 R.
  - Character centres (R): 生 (-0.08, 0.32), 日 (0.15, 0.23), 快 (0.35, 0.11), 乐 (0.56, -0.01); pitch 0.21 R; the line runs about 27 deg
    from the camera's left-right toward the back on the right (depends on the ellipse tilt, the least certain number).
  - Flourish corners (R): (-0.07, 0.45), (0.60, 0.19), (0.24, 0.55), (0.74, 0.29).
  - Timing (measured, 10% ink times): 生 144.88, 日 145.33, 快 145.67, 乐 146.29, flourish bars 146.79 / 146.96 / 147.13; done by 147.29 s.
    Inside a character the film is too small (about 30 px wide) to separate strokes: stroke timing inside a character is shared by median
    length, not measured.
  - Bead width 0.041 R (an upper bound: blur widens it). Icing / cake top per channel 0.78, 0.54, 0.26 (colour judged relative to the top).

### Fitness and stages
Each part is a score 0..1: a Gaussian near the target plus a straight slope far out, so far genomes still feel the way.
`strokes` (count and fraction of stroke pairs in order), `form` (em-box distance to the medians), `hand` (line centre per axis, line angle,
pitch, character box, bead width — one measure per hand gene), `flourish` (corner distance), `colour`, and `support` (every bead inside the rim;
the whole fit is multiplied by 0.5 + 0.5 support). Stages: STROKES strokes .95, FORM form .85, HAND hand .8, FLOURISH flourish .75, COLOUR colour .9.

### Build, making, anchors (API)
`build(THREE, G, {t, support, refs, cakeTop})` returns a Group of TubeGeometry beads (blob where the tip lands, thinning as it lifts, flattened
to sit on the icing), half-sunk on the top surface (a dome is followed as a parabola from the support's top and rim). Origin = cake-top centre;
when `support` has both `top` and `inscription` anchors (the cake module's), the group steps back by (top - inscription) because the host hangs
it on the cake's inscription anchor. `opts.t` writes stroke by stroke in the film's order and timing (t = 0 at 144.80 s, t = 1 at 147.30 s),
with a piping tip at the pen. `making`: 24 steps `WRITE 生 STROKE 1` ... `FLOURISH 3`. `anchors(G)`: base, centre, start, end, boxMin, boxMax.
Also exported: `named, geometry, table, refOf, supportOf, W, SC`.

### Measured (node tests/inscription.test.js, all pass)
- Blank to every stage, 8/8 seeds within 250 generations: 87-207, median 163 (per-stage counts printed by the test).
- Defaults (the best a 3000-generation run found, rounded): fit 0.984; mean character-centre error 0.014 R; flourish corner error 0.029 R.
- On a 0.06 m cake the same writing runs off the rim (support 1.00 to 0.68, fit 0.98 to 0.57); on a 0.2 m cake the hand no longer matches (0.98 to 0.55).
- Built with three.js r128 in node: 24 tubes at t = 1, none at t = 0, strokes finished = making steps passed at every t tested, all vertices inside the rim.

### What is weak
- Per-stroke control points are derived, not free: the evolution bends the font's strokes; it cannot invent a stroke shape the font lacks.
- The film's characters are about 30 px wide: stroke shapes, slant and stroke timing inside a character are not measured; the font is the reference there.
- The ellipse (and so the line angle and every cake-top coordinate) was read by hand from one frame mid-tilt.
- Under ui/player.js simulatePart at the time of writing (the player picks by eye and may keep a child that breaks an earlier stage),
  this module did not pass within 400 generations (seeds 1-3); the real table module did not either; the stand-ins did.

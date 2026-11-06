# SCION // SCHAEFER, MCPHAIL & WARREN · MLS DEFORMATION · THE BLOW

Revision r4: the face was forked (fork.md), and **branch B (sparse face, weight exponent 3 on the face) is promoted to index.html**.
Branch A (dense face, alpha 1) is dense.html. Everything below the fork section describes r3 = branch A unless it says B. Not committed.

## The fork (r4), in short

The cause of the critic's "families indistinguishable" gap was the weight exponent, not the handle count. At alpha 1 the long pinned
plate lines dominate every family's fitted transform. Branch B gives the face 19 points and 5 segments (each cheek is a fixed inner
point and a pushed outer point; 6 lip-contour points spread the mouth's opening) and solves the face at alpha 3.

| | A dense, alpha 1 | B sparse, alpha 3 |
|---|---|---|
| plate border / neck movement (cheeks 100 %, purse 60 %) | 0.07 / 0.24 px | 0.00 / 0.06 px |
| cheek outline, largest difference between face families | 0.95 px (fails) | **4.11 px** (passes) |
| chosen face family: folds; smallest area ratio | 0; 0.035 | 0; **0.19** |
| eyes / nose area ratio | 0.97 / 1.21 | 1.005 / 0.99 |
| affine / rigid face folds | 0 / 0 | 170 / 173 (the visible reason to choose similarity) |
| cheek disc growth: similarity / affine / rigid | 43 / 43 / 42 % | 69 / 51 / 52 % (the face family matters to the breath again) |
| test checks passing (of 13) | 10 | 11 (the remaining 2 are the shared flame fade-out fails) |

Files: fork.md, fork.json, fork-strip.png (the face in 3 families, A above B), and fork.mp4 (10 s, A left, B right, with B's sound).
proof.mp4 is now B; proof-dense.mp4 is A. tests.json and handles.json are A; tests-sparse.json and handles-sparse.json are B
(`FACE_SET=sparse node tools/test.js`). The improvement in viewer experience is judged by the builder only; critic round 2 has not run.


## Thesis

One flat archived picture, bent by handles, has to do the blow: the cheeks fill, the lips purse, the breath goes out, and seven
candle flames lean away, stream and go out. A paper streamer curls round the cake (the long-neck case). Each surface gets the
moving-least-squares family that suits its material: similarity for the face, affine for the flames (gas thins and tears), rigid
for the paper (it does not stretch).

It is a game played on the memory maker's device (ana/index.html's ring barrel), not an editor. The goal is to put out all seven
in one breath; you have three. The breath's strength is **read off the deformed face**: how much two cheek discs grow and how big
the mouth opening is. Whether a flame goes out is **read off the deformed flame**: it goes out when the breath stretches it
thinner than 0.66 of its rest width (measured at 35 % and 70 % of its height on its own solved mesh). So the flame family decides
the game. Affine flames thin to about 0.6 and tear out. Similarity flames thin to 0.64-0.76, and in practice two at most go out.
Rigid flames stay at 0.83 and never go out.

What would make it bland: a face that only translates, flames that swing like stiff petals, a family switch that changes nothing
you can see or do.

## Native formal language and the material

The formal language is control points, line-segment handles, local weighting (alpha = 1), the affine, similarity and rigid
families, and feature protection. The solver (mls.js) is written by hand from the paper. **Line handles are integrated
numerically** (adaptive midpoint rule, 2-64 samples per segment, weight ds / 8 px). This is not the paper's closed form.

The material is drawn by code here (textures.js): an engraved child's portrait (luminous lines, width = light, lit from below),
one painted flame used seven times, a printed streamer, and the cake. The meshes are face 37 x 44, streamer 111 x 5, and seven
flames of 7 x 17.

The handle set (handles.json) has **81 point handles and 39 line handles**:
- Face: 50 handles. These include fixed segments along all four plate edges and across the neck, a radial ring of four handles
  per cheek, and the lips and eyes.
- Flames: 6 points and 2 spine segments each.
- Streamer: 10 spine segments and 4 corners.

## The game (game.js, index.html)

- SELECT short: STREAMER, CHEEKS, LIPS, FLAMES. SELECT long (0.6 s of wall-clock time): the next family for that surface.
- KNURLED RING: the value (wrap, breath held, purse, or candles lit). Hand detents, then the machine steps at 11.8/s, one step
  per tick across all values. There is no fast mode.
- TRIANGLE RING: the aim, the streamer's height, or the flame size. SCALE RING: where you kneel (parallax of the flat layers).
- HOLD short: blow. HOLD long: switch off. Left collar: SCENE (the 10 s demonstration) and CLEAR.
- She leans, so at aim 0 the breath goes 8° off. Winning needs full cheeks, aim +8° and a purse of 50 % or less: **6 of the 143**
  ring settings win in one breath. Maxing every ring puts out 4 or 5 (measured).

## Measured (node tools/test.js; tests.json)

| check | result |
|---|---|
| point handles land on their targets | 0.000 px, every family |
| line-handle samples from the target segment | 0.36 px |
| folded triangles, chosen families (demo every 3rd frame + 4 extreme states, drawn geometry only) | face 0, flames 0, streamer 0 |
| folded triangles, other families | streamer affine 90, flames rigid 15. Face: 0 in every family |
| **FAIL** smallest triangle area ratio >= 0.05, chosen | face similarity 0.035, flames affine 0.010, streamer rigid 0.132 |
| **FAIL** contour reversals not caused by a handle, chosen | flames affine 1 frame (face 0, streamer 0) |
| contour acceleration / handle acceleration, chosen | face 0.90, flames 1.07, streamer 1.00 |
| critic r1: cheeks 100 %, purse 60 %: plate border / neck movement, similarity | **0.07 px / 0.24 px** (round 1: 15 px / 4.6 px) |
| cheek outline moves outward when the cheeks fill | 21.4 px (round 1: about 3 px) |
| **FAIL** critic r1: outer cheek outline differs >= 4 px between two face families | 0.95 px (largest anywhere in the cheek region: 0.95 px) |
| machine step rate; film frames with two steps | 11.79/s; 0 |
| most candles one breath can put out, by flame family (face similarity) | affine 7, similarity 2, rigid 0 |
| demo outcome | yours: all seven out in two breaths. Same inputs: affine everywhere 7 out, similarity 1 out, rigid 0 out |
| solve time, one world, all surfaces (node) | ~4.4 ms |

"Drawn geometry only": a flame that has gone out has zero opacity and index.html does not draw it, so the tests skip it. The two
remaining fails both occur in the 0.11 s fade-out of a flame that is going out (the flame shrinks to 40 % while it fades).

## What failed and what changed

Round 0 (builder): the flames folded in every family. The cause was a shear model whose cross-sections stayed horizontal, and it
was replaced by a bending rod. Turbulence at 16 Hz, sampled at 30 fps, read as jitter and was lowered to 7 Hz.

Round 1 critic (critic-round1.md), with the repairs:
1. **Filling the cheeks bent the whole plate.** Four corner anchors could not hold a 414 px edge at alpha 1. Points every 70 px
   along the edge still let it move 1-5 px. The edges and the neck are now pinned by fixed **line handles**, and the plate border
   moves 0.07 px. The swell itself was rebuilt as a radial ring of handles per cheek, with the outer one a short segment (as a
   single point it spiked and folded). The cheek outline now moves 21 px outward.
2. **The face families are nearly indistinguishable.** This was not repaired. With the face held locally, the three families
   agree on the cheek to within 0.95 px. Every configuration I tried (ring radius 12-44 px, swell 6-24 px, alpha 1-2, cheek
   segments on or inside the outline) stayed under 1 px. The round-0 handle set reached 2.4 px only because the plate was free to
   bow. In these experiments, locality and visible family divergence on the face pull against each other on one handle set.
   Consequence: the face family no longer changes the breath (within 4 %), so the game's family coupling moved to the flames,
   where the families do diverge (thinning 0.59 / 0.76 / 0.83 at the same breath).
3. **The machine ran at 23.6/s and stepped twice in one frame.** The fast mode was removed, and the machine now takes one step per
   tick, in turn, across all busy values. Measured: 11.79/s and 0 double frames.
4. **The long SELECT was timed on the game clock.** It is now timed on performance.now (600 ms).
5. **Maxing the rings won.** The fix adds a lean bias (aim must be +8°), narrows the jet, and makes the flames tear rather than
   reach a strength threshold. 6 of 143 settings win; maxing gives 4-5.
6. **A flame triangle had an area ratio of 0.000.** It was in an out-going flame collapsing to 10 % size. The collapse now stops
   at 40 % and fades instead. Drawn flames now bottom out at 0.010, still under the 0.05 floor.
7. Full cheeks plus a smile folded the face. The smile now acts only on empty cheeks.

## Independent critic

Round 1 was run by the coordinator's critic: **inconclusive, leaning pass**. Quote: "filling the cheeks bends the whole plate,
not the cheeks". Round 2 has not been run. Fork for the open gap (face divergence): a sparse-handle face branch, with no edge
pinning but with alpha raised only far from the cheek. It has not been built.

Critic brief: *in ten seconds on the memory maker's device, a hand wraps a paper streamer round a cake in clicking steps, fills an
engraved child's cheeks, purses her lips lightly, and blows. Five flames lean, thin and go out. The hand re-aims two detents,
fills again and blows, and the last two go out. Three side panels show the same inputs with one family everywhere: the
similarity flames mostly survive and the rigid flames all survive.*

## What is weak, unknown, not done

- The face family choice is not visible (under 1 px) and no longer matters to the game.
- Two numerical fails remain: the area floor (face 0.035, flame 0.010) and one contour-reversal frame during a flame's fade-out.
- The proof is dense. In the 4-panel layout each face is about 330 px tall.
- There has been no phone playtest by a person and no listening test.
- The line handles use the numerical integral.
- The film-derived face was not used: the ana/cut faces are about 70 px wide.

## Files

index.html (B), sparse.html (B), dense.html (A), operator.html, proof.mp4 (B), proof-dense.mp4 (A), fork.mp4, fork-strip.png, fork.md, fork.json, strip.png (A), handles.json / tests.json (A), handles-sparse.json / tests-sparse.json (B), proof-events.json, critic-round1.md, tools/fork.js, mls.js, scene.js,
game.js, sound.js, textures.js, tools/test.js, tools/render.js (needs `python3 -m http.server 8765` at the repo root), tools/shot.js.

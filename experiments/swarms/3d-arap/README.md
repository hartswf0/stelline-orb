# Sculpted Birthday: 3D ARAP swarm (SCION 34)

Revision r1, 2026-11-06. Not committed (the coordinator commits).

## Thesis
The cake is worked by hand like dough. One closed mesh (1298 points, 2592 triangles, a plain disc 240 mm across and 40 mm high) is pushed and pulled by five handle rings on the memory orb's device. Everything between the handles is solved as-rigid-as-possible (Sorkine and Alexa 2007): the local step gives every point its best rotation (3x3 SVD of the cotangent-weighted edge covariance), the global step solves all positions together (cotangent Laplacian, warm-started conjugate gradient), and the two repeat. HOLD bakes the shape: the current shape becomes the rest shape (plastic commit), so the cake evolves in generations. Once a generation is within tolerance of one of the film's cakes, HOLD moves on to the next layer: icing, piped beads, the 生日快乐 inscription, seven candles, lighting them, then the blow. Beads and candles ride each point's ARAP rotation, so they keep their own shape. The small pane is the same moves solved the naive way (one linear Laplacian solve, no rotations), with details carried by the linear map.

## Primitives (arap.js)
- Mesh: closed surface of revolution (27 rings x 48 + 2 poles), outward orientation, ring index and arclength parameter per point.
- Cotangent edge weights, clamped below at 1e-3 (792 of the edges sit at the clamp, mostly diagonals of right triangles whose cotangent sum is 0).
- Local step: optimal rotation per point, det fixed to +1. Global step: Jacobi-preconditioned CG from the current positions.
- Handles: BASE (spread / twist, always held), SIDE BAND, RIM, TIER RING (push-pull along the normal / slide along the surface), TOP CENTRE (push-pull / twist). 3 mm per detent, 3 deg per twist detent.
- While sculpting every handle holds; after the sponge is baked only BASE and the selected handle hold (the rest of the dough is free).
- Targets from the film (profiles r, y): DRUM (chocolate, orange top; height from the traced outline in evolve/refs.json), DOME (brown dome, from ana/index.html), TIERS (sponge with white beads read as two tiers: INFERRED, the film's sponge is one drum).
- Shape distance: symmetric Chamfer (area-weighted) and Hausdorff on the revolution profile. Tolerance: 2.0 mm mean, 8.0 mm worst, and no fold sharper than 100 deg in the profile.

## Files
- index.html: the game (three.js r128; view above, device below; the (i) panel has the numbers and SAVE TRACE).
- arap.js: solver, handles, targets, metrics. plan.js: greedy search for handle moves, writes plan.json.
- tests.js: node tests (17). record.js: plays the game with mouse input on a virtual clock and films it.
- proof.mp4: 25 s, 30 fps, 432x768, with sound. trace.json: the proof run's commits, inputs, energy bursts. strip.jpg: 12 frames from the final proof run.

## Measured (proof run, record.js, mouse input on the device)
- Generation 1 (centre +60 mm, tier ring +36 mm): 2.71 mm mean / 10.34 mm worst from BROWN DOME. HOLD does not advance.
- Generation 2 (rim slide +6, side band slide +9, tier ring +9 mm): 0.71 / 3.61 mm. Baked as BROWN DOME.
- Then icing 16 steps, beads 96 (tier ring and base), writing 24 steps, a 24 deg twist of the top, candles 7, lit 7, blown out one by one. Ends at DONE at about 22 s.
- ARAP energy rises within a settle: 0 (392 iterations logged across 66 bursts). Inverted triangles: 0, collapsed: 0, all run.
- Beads off their shape (largest |singular value - 1| of the frame): ARAP 3.5e-9, naive 0.048 after the twist.
- Writing in-plane stretch (largest |log singular value| over triangles under the letters) after the twist: ARAP 0.384, naive 0.448.
- Naive linear pane, same moves: 1.30 mm mean from the dome at generation 2 (also within tolerance).
- Node tests: 17 passed, 0 failed (rotation recovery 1e-14, det +1, rigid twist energy 1e-11, energy monotone over 480 iterations, plan reaches tolerance, bit-identical reruns, profile distance bounds a brute-force 3D check: 3.56 vs 3.60 mm).
- Audio: rendered offline from the page's sound log with the real device grains (ana/device-sounds.wav).

## Invariants and how they are checked
1. ARAP energy never rises per local-global iteration for fixed handles: tests.js (random handles, both pinning modes) and counted live in the page (RISES in the HUD, monotoneViolations in trace.json).
2. No inverted triangles (deformed normal against the rest normal carried by the local rotations) and no collapsed ones: tests.js and every settle in the page.
3. Beads and candles keep their own shape within 1e-6: their frame is the point's ARAP rotation, so this holds by construction; the measured part is that the naive map does not (0.048), so the comparison has teeth.
4. Shape within tolerance before HOLD advances; no fold over 100 deg.
5. Determinism: same moves, bit-identical mesh.

## What failed and changed
- First plan reached the dome by sliding the side band up past the rim: low Chamfer, but the dough folded back on itself. Added the fold metric (sharpest turn of the profile) to the plan score and to the HOLD gate; re-planned.
- The live solver counted 29 energy rises in the first build: bursts spanned handle moves. Each handle move now closes a burst; within a settle the count is 0.
- Twisting the top with every handle pinned forced shear (the tier ring held the letters still). After the sponge is baked only BASE and the selected handle hold.
- Beads first drew as dark rings: their frame was left-handed (det -1). Fixed (b = a x n).
- Recording: one recorder bug (SELECT only cycles forward; a run went wrong and the cake was ruined, a useful counterexample: generation 8, 30 mm off). A frame took 190 s once under machine load (load average 20 on 2 cores, other swarms recording). Screenshot capture now retries. Two recorded runs drew the candles black with no flames: the small textures came from GPU-backed 2D canvases that failed to upload under load; all texture canvases are now software canvases (willReadFrequently), checked by a screenshot at 20.3 s.

## What is weak (honest)
- The naive pane reaches the dome too (1.3 mm): for pure pulls the linear solve is not much worse in shape. ARAP's advantage shows only where the surface turns (the twist), and in details, not in the gross silhouette.
- Under the 24 deg twist the writing stretches under ARAP too (0.384 vs 0.448 naive): the twist zone crosses the letters. ARAP keeps beads rigid by construction; it does not keep the letters undistorted when the handles force shear.
- TIERS: run 1 of the planner (fixed 10 iterations per test) reached 0.97 / 3.84 mm; under the settle criterion the greedy search stalls at 3.1 / 17.6 mm. A tiered cake is not shown to be reachable with these five handles. DRUM is reachable (0.24 / 1.74 mm, one generation).
- Look: the frames do not yet look like the film's memory. Lighting is a plain directional key plus a point light; no grain, no bloom, no spot screen; the arc is the ana/index.html arc, not the evolved HOLO arc. 
- No independent critic: this agent has no Agent tool. The coordinator must run the critic and the FILM-BAR believability strip test.
- The arc and HUD readouts are mine, not the shared holo.js; the shared look.js and holo.js appeared during this run and are not yet adopted.
- The 1298-point mesh is coarse for piping: beads sit one per angular column (48 per ring).

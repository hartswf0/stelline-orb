# Blind-critic loop — log

The user (verbatim): "why not use the design tools you are giving to make a cake with and evolve based on that signal from the blind critic".

## How it runs
- MAKER (this folder): `node maker.js init` writes round 01; `node maker.js next <scores.json>` records the critic's scores, selects (elitist, top 2 kept), breeds 6 children (crossover + mutation, raised rate and step on the genes named by the critic's giveaways, see `STEER` in maker.js) and writes the next round.
- A candidate is one genome for the whole cake shot: the EVOLVE-ALL module genomes (cake, candles, inscription, table), the shared LOOK genome (swarms/shared/look.js), and the scene (framing A or B, cake pose, camera offsets, flame sprites, room band, colour tint).
- Rendering: render.html + render.js, headless Chromium (SwiftShader) at 1280x720, then the same crop as the decoy of that framing.
- Framings: A = 146.0 s (her cake in the air, crop 608x342 at (20,250) scaled to 640x360, Ana outside the crop); B = 152.25 s (cake on the table before the children appear, crop 640x360 at (300,345)). The 155 s frame has the children's faces behind the cake, so the decoy for that setup is taken at 152.25 s, the same camera setup, before they arrive.
- Every image (8 renders, 2 film decoys) gets the same chain: crop, Gaussian blur sigma 0.45, temporal+uniform noise 7, JPEG q 3, metadata stripped, bitexact. Film frames are decoded straight to PNG first so they are not compressed twice.
- Blind images: /home/claude/stelline-work/blind/round-NN/ (random 3-letter names). Keys: /home/claude/stelline-work/blind-keys/round-NN.json. Candidate renders (no film pixels): rounds/NN/<id>.jpg. Decoys never enter the repo.
- Stop: a candidate scores at or above the lower decoy score, or 8 rounds.

## Tool used
The orb tool (experiments/orb-tool) has a core and an agent command language but no scene renderer yet (no scene/ folder), and its cake genome is coarse (form, side, top, dots, height, radius, layers), so its ops cannot produce a frame. Round 01 uses the EVOLVE-ALL modules' build(THREE, G, {t: 1}) and shared/look.js. To be revisited each round.

## Seeds
seed.js grows the starting genomes with the modules' own fitness (cake toward refs `cream` for A and `cream_table` for B; table toward its refs; candles and inscription at their measured defaults). FROSTING and DECORATION stages did not pass in 300 generations of that player. Then set by hand after two test renders compared with the film frames by eye: side colour = top colour 12 L darker (the measured side L was 3, black under this light), frost slopes lowered to 0.08 (the module's visual gain of 3 made dark ridges), inscription red (0.8, 0.22, 0.12) and lifted 3 mm above the icing coat, LOOK saturation 0.72, table tone 0.22, smaller flame sprites.

## Rounds
### Round 01
8 candidates: A1 and B1 = the seeds; A2-A4 and B2-B4 = seeds mutated (35 % of genes, step 0.1 of range). Tool: EVOLVE-ALL modules + LOOK.
Scores (critic, blind): decoys 9 (FILM-A, utz) and 9 (FILM-B, lgx). Candidates: A1 (kff) 2, A3 (aov) 2, B1 (eyv) 2, B4 (zuf) 2, B2 (tqd) 1, B3 (fft) 1, A4 (jtq) 1, A2 (cbc) 1. Full giveaways in trace.json (rounds[0].scores).
Main giveaways: (1) flames are white balls with no teardrop, blue base or wick; candles identical straight rods in an even ring; flames cut off by the top of the frame in 5 of 8. (2) Machine-made cake: perfect cylinder, clean ellipse, perfect rope borders, grid/tiled top, identical evenly spaced beads; lettering read as a decal. (3) Hard overhead spot, orange top, black sides, no bounce or gradual falloff; table a hard cream slab with a visible leg; one saturated orange grade.

## Tool mutations before round 02 (TOOL v2; render.html "hand layer", maker.js upgradeV2)
The critic's coordinator allowed changing the generator code. These changes are mutations of the tool, applied to every genome (elites included, so the elites of round 01 are re-rendered under tool v2).
- M1 candles (giveaway 1): the module's candles are hidden; seven candles are built at the module's wick positions with the film's kinds in order (cream, red spiral, cream, blue spiral, cream, red spiral, cream; LOOK wax material), each with its own height (0.85-1.15), sink (3-11 mm) and lean (up to gene `lean`, default 7 degrees), a dark wick, and a teardrop flame sprite (white core, orange edge, blue base) with gain `flameGain`. Flame size kept at least 1.
- M2 borders and beads (giveaway 2): the module's instanced pieces (piped shell borders, beads) are hidden (gene `modBeads` can bring them back).
- M3 hand-spread surface (giveaway 2): every cake mesh is displaced by a seeded smooth noise (gene `lump`, radial) and tilted lopsided (gene `lop`); materials replaced by the LOOK buttercream (bump, speckle) in the module's colour (gene `lookIcing`). A lumpy piped rim tube with wandering radius and height (`rimW`) and toasted speckle replaces the clean edge. Frost ripple genes set to 0.03 (the module's plane waves made the grid).
- M4 dots (giveaway 2): `dots` (default 34) dark chocolate dots of varied size (`dotS`) pressed half into the side at random angles and heights.
- M5 table (giveaway 3): the module table is hidden; a thin hexagonal top (LOOK table material, radius `tableR`) with no leg.
- M6 light (giveaway 3): LOOK key softened and widened (keySoft 1, keyCone 0.8, key lower and further forward), ambient 0.12 for bounce, contrast 0.9, saturation 0.65, wbB 1.0, aperture 1.4 for optical softness, exposure 1.3.
- M7 framing (giveaway 1): A: fov x1.12 and look 3 cm higher; B: look 4 cm higher, camera 12 cm back, so the flames are inside the frame.
- M8 board (giveaway 3): a thin metal cake board under the B cake.
- Also: cake top colour raised to L >= 74 with b <= 38 (cream, less orange), side 8 L darker; inscription limited to the 21 character strokes (the frames show no flourish; the critic read the flourish as an "N/lightning" decal). Each genome gets a new `seed` for the hand layer.
- render.js: a frame that comes out near black (lost to the GPU when the disk was full) is rendered again, up to 3 tries.

### Round 02
Elites: r01-A1 and r01-A3 (both 2; the sort kept the first two of the four tied at 2; upgraded to tool v2). Children: A1-A2 and B1-B4. Seen by eye before sending: several children drifted to off colours (pink, green, lavender) and one is very lumpy; left for the critic to select. 6 children: per framing, crossover of the two best of that framing plus mutation (rate 0.18, step 0.07) raised on the genes named by the giveaways (STEER). Tool: EVOLVE-ALL modules + LOOK + the v2 hand layer in render.html.
Scores: decoys 9 (FILM-A, bdz) and 9 (FILM-B, xjb). Candidates: A1 (psv) 3, E-r01-A3 (fbm) 2, E-r01-A1 (ovi) 2, B4 (mlj) 1, B2 (mrb) 1, A2 (gkd) 1, B3 (ntb) 0, B1 (vas) 0.
Regressions the v2 tool introduced (critic, via coordinator): (a) form broke: shallow pies with rolled lips and sagging sides, lid-like caps, one crescent at the wrong scale (gkd); (b) a white horizontal bar through the candles (ntb, vas): the LOOK room band moved by `bandY` into the subject; (c) off colours (green, pink, lavender). Still giving it away: felt/cotton surface instead of buttercream skin with trowel ridges; puffball flames; candles too long and thin with no crater; lettering a smudge; the B table a hard hex with an even pool instead of a dim tabletop under a low warm key.

## Tool mutations before round 03 (TOOL v3; render.html, maker.js upgradeV3 and V3R ranges)
- M9 form (regression a): the hand-layer noise is now surface scale only (wavelengths 1.5-3.5 cm instead of 5-25 cm), amplitude `lump` capped at 1.5 mm, `lop` at 2 mm and only on the top; the wall stays straight. Trowel ridges (`ridge`, default 0.6 mm): horizontal on the wall, arc-shaped on the top. Rim tube thinner (2-5 mm) and lower. Cake genes clamped: height 0.45-0.68, dome and bevel <= 0.06, taper 0.97-1.03, layers 1-2. Scale 0.9-1.1, camera offsets within 5 cm, fov 0.95-1.2 (gkd's scale failure).
- M10 layer seam (giveaway: "visible layer seam"): a shallow darker groove round the wall at `seamY` (0.35-0.65 of the height).
- M11 candles (puffballs, too long/thin, no crater): length x0.78 (`candleLen` 0.65-0.9), thickness x1.3 (`candleThick`), a darker icing crater ring at the entry; flame sprite 13 mm instead of 20 mm, rotated up to 10 degrees (a lean), halo capped at 0.6 and scaled 0.03 m; `flameGain` 1.2-2.0; module flames forced off (`modFlame` < 0.4). The LOOK candle point light raised (candleIntensity 2.0, range 1.4-3; decay 2.0) so the flames light the frosting near them.
- M12 no band across the subject (regression b): the LOOK room (floor, wall and band) is off in every genome (`room` range 0-0.4). The film's soft grey band at the very top edge is not drawn for now.
- M13 palette (regression c): cake top L 72-86, a 0-6, b 28-45; side L 62-80, a 0-6, b 24-42; tint R 1.05-1.2, G 0.95-1.05, B 0.8-0.95; LOOK wbR 0.95-1.15, wbB 0.85-1.05, saturation 0.55-0.8, icingWarm <= 0.35.
- M14 buttercream skin (felt/cotton): LOOK roughIcing 0.45 (range 0.35-0.6) and bumpIcing 0.5 (0.2-0.8), so specular shows on the ridges and the bump no longer reads as fibre.
- M15 lettering (smudge): inscription bead width 5.5-8 mm range, lifted 2 mm, colour clamped red (r 0.7-0.9, g 0.12-0.3, b 0.05-0.2).
- M16 tabletop (hard hex, even pool): table radius 0.45-0.7 so its corners leave the frame, LOOK tableTone 0.12 (0.06-0.2), key light lower and further forward (keyHeight 0.75, keyForward 1.1, 2300 K).
- Test render of r02-A1 and r02-B4 under v3 before the round: the wall is straight and the top flat; A still reads peach and B's flames still look fuzzy, so the tint, flameGain and modFlame clamps above were added after that test.

### Round 03
Selection by the coordinator (env ELITES): elites r02-A1 (psv, 3) and r02-E-r01-A1 (ovi, 2), both upgraded to v3. 6 children: 2 for A from the elites and 4 for B from r02-B4 and r02-B2 (crossover + mutation steered by their giveaways, inside the v3 ranges). Tool: EVOLVE-ALL modules + LOOK + hand layer v3.
Scores: decoys 9 (FILM-A, avk) and 9 (FILM-B, gcv). Candidates: B1 (jyt) 3, B4 (kbp) 2, B3 (alm) 2, A2 (uma) 2, B2 (gjf) 2, E-r02-E-r01-A1 (sda) 1, E-r02-A1 (sfi) 1, A1 (wxr) 1.
Giveaways that survived two rounds of fixes: grey puffball flames with no bright core and no light on the frosting; thick candles of one height in an even row; doubled/ghosted edges and ghost candles; an overhead spot making an orange disc on the table and a hard dark bottom band; floating top-down cakes with no table.

## Round 04: fork of competing hypotheses (coordinator's instruction), TOOL v4
Both branches use the same 4 genomes, rendered once: E1 = r03-B1 (jyt), E2 = r03-B4 (kbp), K1 = crossover of the two + steered mutation, K2 = steered mutation of E1. Each is finished twice, once per branch, so the only difference between branches is the finishing pipeline. Each branch has its own 2 film decoys (146.0 s and 152.25 s) finished through that branch's pipeline: 12 images in all. The key records the branch of every image (`name:branch`). The floating top-down family (framing A) is dropped from the candidates; all candidates are on the table at the 152 s framing. The 146 s decoy is still the film's floating cake seen from above, because that is what the film shows at 146 s.

Tool mutations shared by both branches (render.html, maker.js upgradeV4):
- M17 candles (row, thick, one height): 7 seats scattered over the top by rejection sampling (back half and sides, clear of the writing, at least 0.17 R apart); shafts 4 mm diameter; heights 0.7-1.2 x 45 mm; the film's mix: plain yellow (wax colour #f0d27a), red-white and blue-white spirals.
- M18 flames (puffballs): no flame sprites in the 3D scene. Each flame is drawn at full resolution on a transparent layer (a teardrop from wick to a tip 13 mm above, leaning with the candle, white-yellow core, orange edge, faint blue base, a soft warm glow) and laid over the frame after the blur, before grain or codec.
- M19 light (overhead spot, orange disc, ghosting): a short-range point light at each wick (`wickLight` 0.35, range 0.28 m) lights the frosting near it. No overhead key: the LOOK key light becomes a low, wide, soft frontal fill (height 0.3 m above the cake, 1.4 m forward, cone 0.95, intensity 0.8). A test with candle light only left the cake wall black while the film's wall is lit, so this fill was added; it is a departure from "candles the only key light". Depth of field and bloom are off (aperture 0, bloom 0, halation 0); the DOF pass is the likely source of the doubled edges. Table radius 0.8 so its edges leave the frame; camera 15 cm further back and the look point 6 cm higher so the cake sits lower in the frame.
- Branch A (rendering is the cause): finished as before: crop, blur 0.45, flame layer, overlay grain (noise 7), JPEG q3.
- Branch B (the degrade pipeline is the cause): crop, blur 0.45, flame layer, no grain; encoded as H.264 (libx264, crf 30, 1 s of the still at 24 fps, yuv420p), frame 0 decoded back out, JPEG q3. The decoys of branch B go through the same encode.

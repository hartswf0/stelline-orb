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

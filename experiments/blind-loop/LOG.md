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

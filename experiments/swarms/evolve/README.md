# GROWN CAKE (swarm 5: evolved sculpture)

## Thesis

A remembered cake is not drawn; it is grown. The viewer watches a form evolve, generation by generation, from a flat disc of
dough until it matches the reference, and the player steers the evolution with the memory orb's device. Then the cake is
finished by hand: the inscription written stroke by stroke, seven candles placed, lit, and blown out.

What would make it bland: a cake that appears; a slider that sets the answer; a fitness number pasted into the scene.

## Change of direction (Nov 6)

The first build evolved a neuroglow head toward the birthday girl's face (traced outline and five landmarks from the film
frame at 214.0 s) and then the cake. The user found the faces creepy and asked for the whole cake to be made, in 3D
(see `../BRIEF-3D.md`). The head was removed entirely: no face data is in this folder (refs.json holds the cake only; the
extraction script no longer reads the face frame). The earlier page is kept outside the repo at
`/home/claude/stelline-work/evolve-old-index-with-heads.html`.

## Primitives

- **Genome**: 15 numbers in [0,1] (`evolve-core.js`, `CAKE_GENES`), grouped by the stage that grows them:
  BASE (height, taper, board), FORM (layers, dome, edge), SPONGE (red, green, blue, light falloff),
  ICING (red, green, blue, filling), DECORATION (beads). The blank genome is a flat disc of raw dough.
- **Mesh**: a lathe profile from the genome (board, side, rounded edge, dome), 64 segments round.
- **Generation**: eight children around the parent (four at the set mutation strength, four at 0.35 of it), mutating the
  selected stage's genes fully and earlier stages' at 0.35; later stages are frozen. Elitist (1 + 8): the parent survives
  unless a child scores strictly higher. Seeded with mulberry32(hash(seed, generation)).
- **Fitness** (measured from the reference camera, 7 degrees above the cake, orthographic, normalised by width; 88 x 48 grid):
  - silhouette overlap (IoU) with the outline traced from the film frame at 2:35.0 (her cake on the table, candles excluded);
  - colour distance: 0.7 x per-channel earth mover's distance (32 bins) / 0.4, capped at 1, plus 0.3 x Hellinger distance of
    the 6x6x6 soft histogram. The earth mover's term has a slope everywhere (a grey cake is told which way brown is; bin overlap
    alone gave flat plateaus and the search stalled at 0.82); the joint term penalises wrong hues the marginals let through.
  - whole match = 1 - (0.6 (1 - IoU) + 0.4 colour distance).
  - Shape stages (BASE, FORM) are selected on IoU alone; colour stages on the whole match. Selecting shape on the whole match
    stalled at IoU 0.80, because a better shape also changes the colour mix.
- **Stage bars** (`STAGES`): BASE IoU 0.85, FORM IoU 0.94, SPONGE 0.78, ICING 0.84, DECORATION 0.87. Best seen over 300
  generations of free evolution: about 0.90 whole match.
- **Hand-made stages**: INSCRIPTION (knurl = strokes, 24 steps, 生日快乐 then the flourish, as in ana/index.html, with the
  arc and its stepping mark beside the cake), CANDLES (knurl = how many, 0..7), LIGHT (HOLD: one match per machine step),
  BLOW (HOLD: out one by one). Then HOLD starts again; HOLD long switches the memory off.

## The device

ana/index.html's barrel: SCALE ring = where you kneel (yaw), KNURLED ring = mutation strength (0.010 to 0.400 over 12
detents) or strokes or candles, TRIANGLE ring = lean the mutation toward one trait of the stage, SELECT = which made stage
to work (the knurl takes up that stage's value), HOLD = breed / set the stage when its bar is reached / light / blow;
held over 0.7 s = off. A hand turn clicks quietly per detent; the machine then steps at 11.8/s, 23.6/s when more than six
behind or when a second generation is queued. Each machine step of a generation shows one child (a click and a short tone at
that child's pitch). The left collar reads generation, the stage's score against its bar, and what has been made. The (i)
panel is the operator view: the score's parts, the silhouette against the reference outline, the genome, saving the trace.

Sound: device grains from ana/device-sounds.wav (loaded if present, synthesised otherwise), a tone whose pitch follows the
match (196 Hz at 0.50 to 784 Hz at 0.95), a white wash on each improvement with the magnesium-flash decay on the cake
(about 0.14 s), a thud and chord when a stage is set, piping noise for icing and decoration, a pen sound per stroke,
a tick per candle placed, a match strike per candle lit, puffs and a breath for the blow.

The neuroglow look (horizontal slice contours over the growing cake, additive, cool far from the bar and warm near it)
follows Watson's neuroglow_v3-plus.html; the genome-plus-breeding loop follows his head-evolution.html
(github.com/hartswf0/head-neuroglow; head3c.html and head-clipper.html were read for the mesh and slicing approach).
The contours disappear once the cake is decorated.

## Files

- `index.html` the game (phone: view on top, device below, no page scroll; `?seed=N` to change the seed, default 3125)
- `evolve-core.js` genome, mesh, projection, fitness, breeding (shared by the game and the tests)
- `refs.json` the derived reference (20-point outline, histograms; 3 KB) with provenance; `extract-refs.py` makes it from the clip
- `test.js` node tests; `record.js` the proof recorder; `trace.json` the proof run's generations (seed, settings, parent and
  child scores, chosen genome) and its inputs; `proof.mp4` the proof; `operator.html` the operator page

## Measured (node test.js, this build)

- Elitism: stage score non-decreasing over 125 generations with random strengths and leans; a parent is replaced only by a
  strictly better child. PASS.
- Determinism: identical children and choice for the same seed; different for another seed. PASS.
- Convergence with a simple player (strength 0.27 far from the bar, 0.10 near it): seed 3125 sets all five stages in
  2, 3, 2, 8, 2 generations (17 in all); 20 other seeds: 20/20 set all stages within 40 per stage, median 17 generations
  in all, range 9 to 35. PASS.
- Trace: all generations of the proof recording reproduce from seed, parent and settings. PASS.
- Proof recording (record.js, mouse input at 432 x 768, virtual clock, 30 fps): about 18 s, 15 generations, every stage made,
  candles lit and blown; soundtrack mean -22.4 dB, peak -0.4 dB (ffmpeg volumedetect on proof.mp4).

## What is weak (perceptually judged by the builder, not by an independent critic)

- The icing comes out olive-yellow; the film's top is cream with red decoration. The colour distance weights the top little
  because it is a small share of the frame's pixels. A separate top-colour target would fix it.
- One reference only (her cake at 2:35.0). The other film cakes (chocolate with orange top, mint, red-orange, brown dome,
  sponge with white beads) are not yet targets.
- Shape stages converge in a few generations; the evolution reads as a cake changing, but the population ring is small on a
  phone and the children are hard to tell apart.
- Ana, the children and the table are not in the scene; the memory is the cake alone.
- No independent critic has watched it: this builder has no Agent tool. The coordinator runs the critic.

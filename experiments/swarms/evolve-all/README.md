# EVOLVE ALL: the host

One 3D memory (Ana's birthday) in which every part is bred from a primitive: the table, the cake, the inscription
生日快乐, the seven candles, the people (faceless) and the room light. It is played on the memory orb's device. The
interface that breeds the parts is a genome too, and it is bred from how the player plays.

This README covers the host: `core/breed.js`, `index.html`, `ui/*.js`, `tests/host.test.js`, `tests/ui.test.js`,
`proof.mp4`, `trace.json`, `operator.html`. Each module (`modules/<name>.js`) belongs to its own owner and is documented in
`docs/<name>.md`.

## How it plays

- **The device** is ana/index.html's barrel, unchanged in look: three rings, SELECT, HOLD, (i). A hand turn makes quiet
  detent clicks. The machine then steps to the value at the UI's rate (11.8/s in the film), or twice that, capped at 23.6/s,
  when it is more than six detents behind. Grains come from `ana/device-sounds.wav` when it is present and are synthesised
  when it is not.
- **The three rings carry three roles:** VIEW (where you kneel), STRENGTH (mutation, 0.010 to 0.400 on a log scale) and BIAS
  (lean toward one trait group of the part). Which ring carries which role is part of the UI genome, so the role is printed
  above each ring.
- **HOLD** keeps the highlighted variant and breeds the next generation. The variants appear one per machine step as small
  3D copies around the part, laid out as a RING, ROW or FAN. A long HOLD (over 0.7 s) switches the memory off.
- **SELECT is the core move.** While variants are shown, SELECT moves a highlight across them; the parent is the last stop.
  The stage's score floats over each variant as a bar, with a white tick for the stage's threshold and a grey tick for the
  parent. It is a hint: the machine never chooses. Every choice goes into `trace.json` `choices[]`: which variant was kept,
  which one was fitness-best, all their scores, and `notTheBest`. When no variants are up (at the start of a part), SELECT
  changes the part instead.
- **Stages and making.** A part passes a stage when the module's measure reaches its threshold. At each pass the part is
  built again on screen with `build(THREE, G, {t})`, t stepping from 0 to 1 on the machine clock (10 steps), with the
  module's `making` label as a caption and a making sound (a knock for the table, piping for the cake, a pen for the
  inscription, a candle pushed in, footfalls, a hum for the light). Passing the last stage makes the whole part (24 steps).
  The arc beside the part steps its mark with the stages passed.
- **Supports.** Table -> cake -> inscription and candles; table (floor) -> people. Each part sits on its support's anchor,
  minus its own `base` anchor. The anchor names the host looks for are listed in `ui/relations.js`. When a support changes,
  its dependants are re-scored against it and glide to the new anchor with a sound. Dependants get `refs.support`: the
  support's anchors, plus its `top(G)` description when the module has one (the table's polygon).
- **Breeding** (`core/breed.js`, adapted from ../evolve/evolve-core.js): seeded mulberry32. Half of each brood is at full
  strength and half at 0.35 of it. Strength can be set per group. A bias moves its group fully and the others at 0.2.
  Groups named by later stages are frozen, so colour cannot wander while the shape is being found. `breed()` is elitist
  for anyone who uses `best`; the host gives that decision to the player.
- **The end.** When all six parts are made, HOLD lights the candles one per machine step (a match each) at the candles'
  wick anchors. HOLD again blows them out one by one. The memory then goes off as round spots of light.
- **The look** follows ana/index.html: true black, a dark dome, the band of light where wall meets floor, a round projected
  spot, candlelight, and a magnesium flash (0.14 s) when a variant is kept. Parts not yet offered are absent. A part that was
  offered and left stands faint.
- **Phone layout:** view on top, device below, no page scroll, plain labels, no emoji. The operator panel sits behind (i).

## The interface evolves

`ui/uigenome.js`. The UI genome has eight genes, bred by the same `core/breed.js`:

- ring map: one of the six permutations of VIEW/STRENGTH/BIAS over the three rings
- detent size: 4 to 12 degrees
- step rate: 5.9 to 23.6/s, snapped to the film's 11.8/4 grid
- where STRENGTH starts
- variants per generation: 3 to 9
- variant layout: RING, ROW or FAN
- which part is offered next: FILM ORDER, WEAKEST FIRST or NEAREST FIRST
- readout on the left collar: SCORE AND BAR, GENERATION, or ALL PARTS

`safe()` clamps any genome back into these bounds, so no control can vanish. The lineage starts from a primitive UI (fine
detents, the slowest rate, three variants, no bar shown), the same way each part starts from a primitive.

**Fitness is measured from play only.** For each part the host records:

- generations
- accepted generations (a child kept)
- moves (gestures and presses)
- reversals (a gesture against the previous one on the same ring)
- idle time (no input while the machine is not stepping)
- stages passed

The fitness formula is 0.2 x accept rate + 0.2 x exp(-moves per accepted / 6) + 0.25 x (1 - 3 x reversal rate)
+ 0.35 x exp(-idle per generation / 1.2).

Parts differ in difficulty, so a UI is scored against the mean of all measurements on the same part (on a first visit, the
mean over all parts so far). A pool of four measured UIs keeps running means, and the elite is the best mean shrunk toward
zero by n / (n + 1). A single lucky run therefore does not take the elite, and the elite is re-measured whenever it is
played again.

**Between parts** the device shows three UIs side by side: the kept elite (with its measured score) and two new variants of
it. SELECT moves between them and HOLD keeps one. That UI then breeds the next part, which is chosen by its own "next part"
gene. The UI lineage is logged in `trace.json` `ui[]`, one entry per part played: the UI played, the raw and relative
fitness, the outcome (NEW ELITE, ELITE KEPT, ELITE RE-MEASURED), the elite and the pool.

**Scripted players** (`ui/player.js`) are models of two play styles, not people. The same policy drives the browser
(`index.html?player=careful|hasty`, acting through the device's own input functions) and a node simulation.

- CAREFUL makes 6-degree gestures, waits for every variant, compares them, reads the hint with a small error (0.004), and
  leans toward the stage's group.
- HASTY makes one sweeping gesture with a 14-degree error, keeps after 0.35 s whatever has been shown, reads the hint with
  more error (0.015), and never leans.

Both choose with SELECT. The scripted chooser between UIs plays the elite every third round and a new variant otherwise.

## Measured results (all runs named; nothing here is from a person playing)

- `node tests/host.test.js`: 56/56 passed on Nov 6 with all six real modules present. The tests cover:
  - breed: determinism, elitism, freezing, bias, bounds
  - the contract shape of each module, deterministic evaluate, and the anchors dependants need
  - stand-ins reaching every stage from blank in 20-58 generations
  - simulated players keeping a variant that was not the fitness best (10 times in 12 parts)
  - the page rules (no emoji, r128 path, no scroll, no plain buttons)
- `node tests/ui.test.js`: 4/4 passed.
  - Safety: 2000 random or broken genomes and 300 bred rounds all stay safe.
  - Improvement, CAREFUL player: over 10 lineage seeds of 42 parts each on the stand-in parts, the final elite beat the
    primitive UI on a held-out benchmark (6 parts x 3 seeds) in 9/10 lineages. The mean gain was +0.020 on a fitness near
    0.49. That is real but small.
  - HASTY player: 4/10 lineages, mean gain +0.005. This is reported, not asserted. In this model the primitive UI is
    already close to the hasty player's best, because more variants or a faster rate mean more SELECT presses for it.
  - Mean elite step rate: careful 8.3/s, hasty 8.9/s. The two styles end only slightly apart.
  - Lineage logs: `tests/ui-lineage-trace.json`.
- The real modules are hard. In node simulation the careful player ran 200 generations per part from the primitive UI and
  passed only some stages:

  | Part | Stages passed |
  |---|---|
  | table | 1/5 |
  | cake | 3/6 |
  | inscription | 2/5 |
  | candles | 2/7 |
  | people | 2/7 |
  | light | 1/4 |

  Plain elitist auto-breeding (8 children, sigma 0.1) does a little better: the cake passed all its stages in about 110-150
  generations, but the table passed 2/5 in 300. These are the module versions as of about 03:50; their owners were still
  working.
- `proof.mp4` and `trace.json`: revision 4 (Nov 6, about 07:20).
  - The run: CAREFUL script, budget 300 generations per part, look.js plus the holo.js arc and readout. The film is 55.7 s
    with sound, from 881 s of virtual play.
  - Stages passed: table 3/3 (28 generations), light 3/3 (44), people 3/3 (75), candles 8/8 (168), inscription 6/6 (123).
    The cake reached 5/6 by generation 44 and never passed DECORATION in 300 generations.
  - The player made 738 choices; 39 kept a variant that was not the fitness best.
- **Revision 4 fixes:**
  - **Overexposure.**
    - Cause found by rendering the same end frame three ways: with LOOK and the light part's exposure, with LOOK alone, and
      without LOOK. All three were washed out, so the exposure product was not the main cause. The main cause was the light
      module's own lamps: `build()` returns a PointLight (intensity 2.9, range x4) and a hemisphere light, which added to
      LOOK's (or the host's) lights.
    - Fix: the light part's lamps are switched off in the scene. Under LOOK, the light part's `params()` are not applied
      either, because LOOK's grade was evolved against the film.
    - The host's own dome and glow are hidden under LOOK. The surround is now black.
  - **Flames.** They show as small glows once the light no longer floods the frame. They are still too small and faint
    against the film.
  - **People.** Each child is scaled about its own feet so that heads stand about 1.75 x the table height above the floor;
    this run used 0.915. This is a host correction, recorded in the trace as `hostScale`; the people module's fitness does
    not see it. LOOK's depth of field is focused on the cake.
  - **End shot.** It now frames the whole table from a little above its top, as at 155 s.
  - **Cake budget.** Raised to 300. It was not enough: with the player choosing, the cake's DECORATION stage was not passed.
- **Believability strip, revision 4, run by the host owner: FAIL** (film 155.3 s against proof frame 805; frames in
  /home/claude/stelline-work/evolve-all-strip/). What still gives it away:
  1. The cake is an orange dome, not cream frosting with beads; DECORATION was not reached.
  2. The flames are hardly visible.
  3. The table top is flat-lit and white, where in the film the top is lit from the candles and falls off.
  4. Four doll-like children with identical bobbed hair, where the film has three.
  5. No band of light on the wall.

## The proof film

```
python3 -m http.server 8790        # at the repo root
node experiments/swarms/evolve-all/ui/record.js <frames-dir> 16 careful
ffmpeg -framerate 15 -i <frames-dir>/%05d.jpg -i <frames-dir>/audio.wav -r 30 -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest proof.mp4
```

- The page runs on a virtual clock. The output has 15 distinct frames per second, written at 30 fps (each frame twice),
  because software GL on this shared machine renders about one frame per second.
- Real time except where TIME-LAPSE shows: later generations of a part x16, the first generation of the last three parts
  x4, stage makings x3, whole makings x2.
- The soundtrack is the page's own sound log rendered offline, with each event moved to the output time of its frame, at
  most two of a kind per frame.
- A part that does not pass its stages within the budget is made as it stands. The trace records it (`events`: "budget
  spent"), and the operator page lists it as the next blocking failure.

## Shared film look (FILM-BAR.md), revision 2

- `../shared/holo.js` exists and is adopted for the in-scene hologram: `HOLO.arc` (stepped by stages passed) and `HOLO.readout`
  (typed once per kept generation) replace the host's own arc whenever holo.js loads. These are updated from the host's
  frame loop, not by HOLO's own timer.
- `HOLO.device` is not adopted. The host's barrel is ana/index.html's, and it needs three hooks HOLO.device does not have:
  - ring roles and detent size set from the UI genome;
  - the UI-choice panel and the left-collar readout drawn over the barrel;
  - per-gesture move and reversal counts for the UI's fitness.
- `HOLO.spots` is not adopted.
- `../shared/look.js` is adopted (revision 3). `LOOK.apply(renderer, scene, camera, {target, candles})` renders every frame
  through `handle.render(dt)`, and the host's own lights are turned off. The key light follows the cake. `candlesLit` follows
  the lit flames. Switching on and off, and the light part's exposure, go through `handle.set({exposure})`. Each keep calls
  `LOOK.flash(part)`. Module materials are left as the modules make them; LOOK materials are not swapped in. At the time of
  writing this ran only as a syntax check (see below).
- The host keeps its own device (ana/index.html's barrel), not `HOLO.device`, so that the UI genome can set the ring roles,
  the detent size and the rate, draw the choice panel and the readout, and count gestures and reversals for the UI's
  fitness.
- The light module's `params(G)` now sets the grade: exposure, candle colour, range, decay and strength, ambient level and
  tint.

## Revision 2 fixes

- Stages are sticky (`BREED.advance`). Before, `stageOf` required every earlier stage to still pass, so a kept child that
  dipped an earlier measure froze progress for good. This was in both the host and the simulation.
- A variant that would undo a passed stage shows a red hint bar, and the scripted players pass over it.
- People get the table's `top(G)` in `refs.support`. Dependants' `anchors()` get their support.
- Wick anchors are local to the cake-top centre. The candles' holder sits on the cake's `top` anchor, so holder position
  plus wick gives the world position.

## What is weak

- The proof is not believable as the film's memory (FILM-BAR.md), and it would not pass the strip test. The parts are near
  primitives (a post for a table, mannequin-like people, a plain cake), and the light part overexposes the scene while it is
  being bred.

- With the current real modules, the proof's parts mostly do not reach their final stage within the budget. The film shows
  every part being bred, chosen and made, but several finish as near-primitives. This is the main gap. It needs the module
  stages to be reachable in tens of generations, or a film cut from a much longer run.
- The UI's fitness has a confound: different parts are played with different UIs. The per-part mean and the shrinkage
  reduce it but do not remove it. Within one memory every part is played once, so the elite moves on first-visit scores
  compared against the mean over all parts.
- The UI gains in simulation are small, and the hasty player gains nothing reliable. The players are models with chosen
  parameters (gesture size, error, reaction time, compare cost per layout). The UI genes act only through those
  parameters, and "next part" has no effect on the simulated metrics.
- The variants are small copies of whole parts. For the light, a variant is a sphere whose brightness follows its score,
  not its lighting.
- Flames are the host's own sprites at the candles' wick anchors; a module's own flames are hidden. If a candles genome has
  fewer wicks, fewer flames are lit.
- No independent critic has judged the host. The host owner had no agent tool, so the coordinator runs the critic.
- A module file that arrives while the page is open is picked up within 30 s, and that part restarts from blank. The
  recording loads modules once, at the start.

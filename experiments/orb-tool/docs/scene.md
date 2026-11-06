# SCENE — the renderer of the ORB TOOL

Owner: SCENE role. Files: `scene/scene.js`, `scene/genomes.js`, `scene/index.html` (bench), `landing-backdrop.html`, `tests/scene.test.js`, this file.

## What it is
`scene/scene.js` draws the memory state of `core/SCHEMA.md` (v1) in three.js r128 as Ana's memory in the film (party scene 128-245 s).
It loads its own dependencies relative to its own URL, so the shell only loads `scene/scene.js`:

- `experiments/swarms/shared/look.js` (LOOK): the grade, candle warmth and falloff, bloom, grain, the round-spot screen; key, candle and ambient lights.
- `experiments/swarms/shared/holo.js` (HOLO): the segmented C arc with its stepping index mark, the typing readout, child marks, and `HOLO.spots` (matter switching on and off as round spots, in banks when the memory goes off; the magnesium flash).
- `experiments/swarms/evolve-all/modules/{cake,inscription,candles,table}.js`: the made things, each built by its own `build(THREE, G, {t})` so the making is the module's own (board, sponge layers dropped in, dome raised, icing poured then run down the side, borders piped, beads set one by one; 生日快乐 piped stroke by stroke with the piping tip; candles from the evolved layout).
- `scene/genomes.js`: the genomes those modules are built from. Each is the best of a hill climb on the module's own node fitness against its film-derived refs (no film pixels): table 0.964, inscription 0.992, candles 0.997, cake finish (reference "cream") 0.971. The cake's form, colours, height, radius and layers come from the state; `cakeGenes()` maps them.
- The children are the film's cut-outs already in the repo (`assets/cutouts/stelline_child1..3.webp`, sprite sheets, as weaver.html uses them), lit by the scene, seen at a distance across the table. `opts.figures: 'faceless'` swaps them for soft featureless figures.
- Places follow weaver.html: `dome` (cinema set: dark dome, seams, the thin lit line where wall meets floor, the lit booth with the man), `room` (the lab: glass, mullions, ring lamp, haze cone), `forest` (trunks in fog, one shaft of light). Dust drifts in every place.

## API
```js
SCENE.mount(canvas, bus, opts) -> { ready, frame(nowMs), resize(), dispose(), stats(), world }
ORB_SCENE.create(container, ORB) -> { frame(nowMs), resize(), dispose(), ready, stats() }   // the core hook (SCHEMA.md section 6)
```
`bus` needs `view()` (or `state()`) and `on(event, fn)`. Each frame draws `bus.view()` (the machine's stepped values). opts: `quality` ('high' DOF + shadows, 'mid' phone default: post without DOF, no shadows, 'low' no post), `maxDpr`, `loop`, `figures`, `preserve`, `base`.

## State to scene
| state | drawn as |
|---|---|
| `cake.genome` | cake rebuilt from the genome; magnesium flash on the change |
| `cake.stage` 0..4 | the module's making time t = 0, .44, .72, .86, 1, played at about one stage a second (forward and back) |
| `cake.tilt` | the cake (and its top) tips about the viewer's right axis, 3 degrees a step, eased |
| `inscription.written` / `.text` | 生日快乐: the module writes strokes up to written/24 with the piping tip; other text: piped from a font, left to right |
| `candles.count` / `.lit` | evolved candles; the first count-lit are out; each candle that goes out smokes |
| `table.up` | the hexagonal table makes itself (legs rise, top comes down) or unmakes; with it down the cake floats as at 138-141 s |
| `people[].arrived` | round spots fill her in (0..10); the child mark shows while she is arriving (and at 0 to show she is waiting) |
| `people[].offset`, `.x`, `.z` | frame offset of her performance; her place, eased |
| `props[]` | cup, plate, gift, hat, balloon, or a box; on the table if over it, else on the floor |
| `camera` | Ana's eye: yaw round the focus, kneel 0..10 = eye 1.32 m to 0.58 m; eased with a 70 ms time constant |
| `scene.place/light/look` | place group; exposure and key/candle strength; film = LOOK post, plain = no post, holo = cyan fresnel scan lines |
| `time.hold` | flames, cut-out frames, dust and grain stop |
| `time.off` | every part goes out in banks of round spots from the cake outward; the arc goes out segment by segment |
| `selection` | the arc and readout move beside it (cake at candle height, a child's head) |
| `proposals` | ghosts: the proposal is applied to a copy of the state and what it would change is drawn pale blue, flickering, with a label (author: op (note)) |

## Every op has a consequence in the next frame
The machine puts the first step on screen at once; on `change` the scene also steps the arc's index mark, types readout lines and adds: select = pulse at the new anchor + flash; make / stage = pulse round the cake; kind / breed / keep = flash + pulse; write = flash; candles = flash; hold / release / blow = pulse; add / remove = pulse where it happens; accept / snapshot / load / reset / batch = flash everything + pulse; propose / amend / reject = pulse above the cake + ghost change; look = wide pulse; undo / redo / seek = flash everything; refused op = arc flicker + readout line. Each machine `step` feeds the readout.

## Landing backdrop
`landing-backdrop.html`: the same renderer drawing a scripted state (no core, no device, no controls), a 36 s loop: sponge, made, written, candles lit, table up, three children arrive, blown out one by one, switched off in banks, back. Quality mid, pixel ratio 1, no DOF, paused when hidden; `prefers-reduced-motion` renders one still frame. `?embed` drops the demo text and the vignette.

## Measured
See the final section, written from runs (filled in below).

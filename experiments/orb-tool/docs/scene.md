# SCENE — the renderer of the ORB TOOL

Owner: SCENE role. Files: `scene/scene.js`, `scene/genomes.js`, `scene/index.html` (bench), `landing-backdrop.html`, `tests/scene.test.js`, this file.

## What it is
`scene/scene.js` draws the memory state of `core/SCHEMA.md` (v1) in three.js r128 as Ana's memory in the film (party scene 128-245 s).
It loads its own dependencies relative to its own URL, so the shell only loads `scene/scene.js`:

- `experiments/swarms/shared/look.js` (LOOK): the grade, candle warmth and falloff, bloom, grain, the round-spot screen; key, candle and ambient lights.
- `experiments/swarms/shared/holo.js` (HOLO): the segmented C arc with its stepping index mark, the typing readout, child marks, and `HOLO.spots` (matter switching on and off as round spots, in banks when the memory goes off; the magnesium flash).
- `experiments/swarms/evolve-all/modules/{cake,inscription,candles,table}.js`: the made things, each built by its own `build(THREE, G, {t})` so the making is the module's own (board, sponge layers dropped in, dome raised, icing poured then run down the side, borders piped, beads set one by one; 生日快乐 piped stroke by stroke with the piping tip; candles from the evolved layout).
- `scene/genomes.js`: the genomes those modules are built from. Each is the best of a hill climb on the module's own node fitness against its film-derived refs (no film pixels): table 0.964, inscription 0.992, candles 0.997, cake finish (reference "cream") 0.971. The cake's form, colours, height, radius and layers come from the state; `cakeGenes()` maps them.
- The children are the evolve-all people module's children (genome climbed to fit 0.996 against refs/people.json): soft rounded forms with hair masses and no facial features, hands on the table edge, scaled to the 0.5 m table and turned to face the cake from the state's x, z. `opts.figures: 'cutout'` uses weaver.html's film cut-outs instead (`assets/cutouts/stelline_child1..3.webp`); they were the first choice and were dropped after the first render: each sheet's mask also carries a second cake and a piece of table from the source frame, which gave the frame away at once.
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

## Measured (Nov 6 2026, this machine: 2 cores, load average 16-33 from the other swarms, headless Chromium with SwiftShader software GL)
- Node tests (`node tests/scene.test.js`): 9 of 9 pass (mapping into module ranges, colours survive the mapping within 2 levels, dome/drum, every making stage adds visible parts, n candles with exactly `lit` flames for n = 1, 7, 12, the inscription grows stroke by stroke, table height, genome ranges).
- Frame time at 390x844, quality mid, pixel ratio 1, a finished party: median 3223 ms, max 20681 ms on SwiftShader under that load (second run; the first run gave median 6500 ms). The scene's own JavaScript per steady frame was 4.1-4.4 ms (`stats().lastMs` in three runs); the rest is software rasterising and shader compiles. These numbers say nothing about a phone GPU; no phone was measured.
- Every op visible within one frame (`--browser`): the run did not finish inside the budget (each frame took 2-5 s). Of the ops it reached: turn the viewpoint, kneel, cake kind passed (changed pixels 997 / 2245 / 1251 against a settled no-op noise of 21 / 285 / 15); select next failed the check (2518 changed against noise 1826: the previous setup's transition had not settled within 16 frames, so the check could not tell). An earlier run without settling failed most ops for the same reason (noise from the previous op's transition), not because nothing changed. Treat the op table above as designed, not proven.
- Believability strips (scene frame next to the film frame, kept outside the repo in /home/claude/stelline-work/orb-tool-scene/strip-1..3.jpg; stats by strip.py there). Party against 155 s (strip-3): mean L 23.9 vs 31.7, black fraction 0.61 vs 0.51, lit red/blue 3.55 vs 4.47. What gives it away (my reading, not an independent critic): the children read as mannequins (full bodies, smooth heads, stick arms) where the film shows real children in close shadow; the camera is wider and higher than the film's close kneeling shot; the cake side is too orange and too rough; the dome wall is pure black where the film's is a dim grey; dust reads as stars. Floating cake against 147.4 s: the red inscription and arc are in place; the cake is smaller in frame and brighter.
- Shell: experiments/orb-tool/index.html loads scene/scene.js and the world builds (renderer 'scene'), no page errors except one failed resource fetch (the device sounds file the HOLO loader probes). Landing backdrop: builds and renders, no page errors.

## Known faults
- look.js logs "GL_INVALID_OPERATION: Feedback loop formed between Framebuffer and active Texture" on some frames in SwiftShader (seen in the drive runs, not in the page runs); frames still render. Not traced; look.js is not this role's file.
- One drive run produced an all-black frame after `write` (before `clean()` was added, which drops NaN vertices and repairs NaN normals of built parts); it did not recur in the three later runs, but the cause was not proven.
- The film cut-outs in assets/cutouts carry pieces of other cakes and tables in their masks; the `cutout` option is left in only for comparison.
- No mist of points (weaver.html's 24,000-point weave) yet; dust only.

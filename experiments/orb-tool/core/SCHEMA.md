# ORB TOOL core: state schema and operation list (v1)

Owner: CORE. SCENE and AGENT build against this file. Changes are additive only and are logged at the bottom.

All core files are plain scripts that work in the browser (they set a global) and in node (`module.exports`).
Load order in a page: `core/state.js`, `core/ops.js`, `core/bus.js`, `core/machine.js`, `core/devmap.js` (the device as ops, pure), then `core/sound.js`, `core/device.js`, `core/stub-scene.js`.

## 1. The memory state (one JSON object)

```js
{
  v: 1,
  scene:  { place: 'dome' | 'room' | 'forest',  light: 0..10 (int),  look: 'film' | 'plain' | 'holo' },
  cake:   { kind: -1..N-1 (int, index into library; -1 none, -2 bred and not kept),
            stage: 0..4 (int; 0 nothing, 1 sponge, 2 frosted, 3 decorated, 4 finished),
            tilt: -2..10 (int; degrees = tilt * 3, about the viewer's right-hand axis),
            genome: { form: 'drum'|'dome', side: '#rrggbb', top: '#rrggbb', dots: 0..1, height: 0.06..0.16 (m), radius: 0.08..0.16 (m), layers: 1..3 } },
  inscription: { text: string (max 12 chars, default '生日快乐'), written: 0..24 (int; 5 steps per character for 4 characters then 4 for the flourish; the renderer scales to text length) },
  candles: { count: 0..12 (int), lit: 0..count (int) },
  table:   { up: 0 | 1 },
  people:  [ { id: 'child-1', kind: 'child', arrived: 0..10 (int; 10 = solid), offset: -12..12 (int frames of her performance), x: m, z: m } ],   // faceless figures; child-1..3 exist from the start
  props:   [ { id, kind: string, x, z, scale } ],          // added with `add`
  camera:  { yaw: -180..180 (int degrees, step 5), kneel: 0..10 (int; 0 standing, 10 lowest kneel), focus: 'cake' | person id | prop id },
  time:    { hold: bool, off: bool, blown: bool },
  selection: 'cake' | 'make' | 'inscription' | 'candles' | 'child-1' | 'child-2' | 'child-3' | 'room',
  library: [ { name, genome } ],                            // the film's five cakes first, then kept genomes
  proposals: [ { id: 'p1', op, args, author, note } ],      // agent suggestions, drawn as ghosts until accepted or rejected
  marks: [ { name, at } ],                                  // named snapshots: `at` = history length when taken
  seq: int                                                  // counter for ids (deterministic)
}
```

Fixed coordinates: the cake stands at the origin; table top at y = 0.5 m; people stand on a ring of radius about 0.55 m on the far side (z < 0). Camera yaw 0 looks from +z toward the cake.

### Settable paths (for `set` and `nudge`)
Each has a range and a `step`; the machine steps the shown value one `step` at a time toward the state value.

| path | range | step |
|---|---|---|
| `cake.kind` | -1 .. library.length-1 | 1 |
| `cake.stage` | 0..4 | 1 |
| `cake.tilt` | -2..10 | 1 |
| `cake.genome.dots` | 0..1 | 0.1 |
| `cake.genome.height` | 0.06..0.16 | 0.01 |
| `cake.genome.radius` | 0.08..0.16 | 0.01 |
| `cake.genome.layers` | 1..3 | 1 |
| `cake.genome.form` | 'drum' / 'dome' | - |
| `cake.genome.side`, `cake.genome.top` | '#rrggbb' | - |
| `inscription.written` | 0..24 | 1 |
| `inscription.text` | string <= 12 | - |
| `candles.count` | 0..12 | 1 |
| `candles.lit` | 0..count | 1 |
| `table.up` | 0..1 | 1 |
| `people.<id>.arrived` | 0..10 | 1 |
| `people.<id>.offset` | -12..12 | 1 |
| `people.<id>.x`, `.z` | -1.5..1.5 | 0.05 |
| `props.<id>.x`, `.z` | -1.5..1.5 | 0.05 |
| `props.<id>.scale` | 0.2..3 | 0.1 |
| `camera.yaw` | -180..180 | 5 |
| `camera.kneel` | 0..10 | 1 |
| `camera.focus` | id string | - |
| `scene.place` | 'dome','room','forest' | - |
| `scene.light` | 0..10 | 1 |
| `scene.look` | 'film','plain','holo' | - |

Setting `cake.kind` >= 0 copies `library[kind].genome` into `cake.genome`, and if `cake.stage` is 0 sets it to 4 (the whole cake appears, as in the film). Setting `cake.kind` to -1 sets stage 0.

## 2. Operations

Every operation is `{ op, args }`. `ORB.do(op, { author })` validates, applies, records it in the history (undoable) and in the log (with author). `author` is `'hand'` or `'agent:<name>'` (default `'agent:api'` through `window.ORB`, `'hand'` from the device). Invalid ops are refused with `{ ok: false, error }` and change nothing.

| op | args | effect |
|---|---|---|
| `select` | `{ target }` one of the selection values, or `{ by: +1/-1 }` | what the rings work on |
| `set` | `{ path, value }` | set one path (clamped to its range; ints rounded) |
| `nudge` | `{ path, by }` | add `by` steps (by * step) |
| `add` | `{ kind: 'child'|'prop', id?, x?, z?, scale?, propKind? }` | add a person or prop; id assigned `child-4`, `prop-1`... |
| `remove` | `{ id }` | remove a person or prop |
| `make` | `{}` or `{ to }` | advance the cake one making stage (or to stage `to`) |
| `breed` | `{ a, b, seed }` | mix library genomes a and b (deterministic in seed) into `cake.genome`; kind = -2 |
| `keep` | `{ name? }` | append the current genome to the library; kind = its index |
| `write` | `{ text }` | set inscription text and set `written` to 24 (the machine writes it in) |
| `candles` | `{ count }` | set count, all lit |
| `hold` / `release` | `{}` | freeze / let go every performance. `release` when all three children have arrived (10) and candles are lit also blows them out (time.blown, candles.lit = 0) |
| `blow` | `{}` | candles.lit = 0, time.blown = true (refused with no cake or no lit candle) |
| `switchOff` / `switchOn` | `{}` | the memory goes dark / comes back |
| `look` | `{ look?, place?, light? }` | scene look |
| `camera` | `{ yaw?, kneel?, focus?, turn? }` | `turn` is relative degrees |
| `propose` | `{ op, args, note? }` or `{ ops, note? }` | adds a ghost to `proposals` (the inner op is validated first); with `ops`, one ghost of op `batch` |
| `batch` | `{ ops }` | several proposable ops as one (all or nothing) |
| `amend` | `{ id, args }` | change a pending proposal's args (the person turning a ghost) |
| `accept` | `{ id? }` | apply the proposal (oldest if no id) and remove it; history entry records `via: id`. On the device: ACCEPT, or HOLD while a ghost waits |
| `reject` | `{ id? }` | drop the proposal (oldest if no id) |
| `snapshot` | `{ name }` | push a named mark |
| `load` | `{ memory }` | replace the whole state with a saved memory's state (undoable) |
| `reset` | `{}` | back to the empty memory |
| `undo` / `redo` | `{ steps? }` | move in the history (logged, not themselves undoable) |

A list of ops `ORB.do([op, op, ...])` is applied as one history entry (all or nothing).

## 3. The bus: `window.ORB`

```js
ORB.state()            // deep copy of the true state (targets)
ORB.view()             // the state as shown now: machine-stepped values substituted (renderers draw this)
ORB.do(opOrOps, {author, gesture})  // -> { ok, error?, entry? }
ORB.propose(op, note)  // shorthand for do({op:'propose', args:{op:op.op, args:op.args, note}})
ORB.on(event, fn)      // events: 'change' (state, entry), 'step' (path, value, fast)  machine step, for sound and renderers,
                       //         'log' (logEntry), 'refuse' (op, error), 'seek' (index)
ORB.describe()         // plain text account of the memory (AGENT may replace via ORB.setDescribe(fn))
ORB.history()          // [{ i, op, args, author, via?, label }] the undoable entries, oldest first; ORB.cursor() = how many are applied
ORB.seek(n)            // undo/redo until n entries are applied (the history strip uses it)
ORB.log()              // every op ever sent including undo/redo/refused, with author and seq
ORB.save()             // { format: 'orb-memory', v: 1, state, log }
ORB.load(json)         // same as do({op:'load', args:{memory: json}})
ORB.replay(log)        // static: CORE.replay(log) -> state, from an empty memory (deterministic)
ORB.paths()            // the settable paths table above, with ranges
```

`postMessage`: a window may send `{ orb: 'do', ops, author }`, `{ orb: 'propose', op, note, author }`, `{ orb: 'command', line, author }`, `{ orb: 'describe' }`, `{ orb: 'state' }`, `{ orb: 'history' }` (author must look like `agent:<name>`, else `agent:remote`); the page answers with `{ orb: 'reply', id, result }` (echoing `id` if given).

Gesture merging: consecutive `set`/`nudge` on the same path with the same `gesture` id merge into one history entry (one undo undoes a whole drag).

## 4. The machine (core/machine.js)
`MACHINE.tick(dt)` steps every shown value toward its state value one `step` at a time at 11.8 steps a second (23.6 when more than 6 steps away), the first step at once when a value changes (so a detent is visible within one frame). Each step fires `'step'` (path, shownValue, fast). Non-numeric paths jump at once.

## 5. The device (core/device.js)
Rings: 1 SCALE (camera.yaw, 5 degrees a detent), 2 KNEEL (camera.kneel), 3 KNURL (the value of the selection), 4 TRIANGLES (the second value of the selection). Buttons: SELECT, HOLD (long press = switch off), MAKE, ACCEPT (long press = reject), UNDO, REDO, KEEP, BREED, SAVE, ASK (opens the command line).

| selection | KNURL | TRIANGLES |
|---|---|---|
| cake | cake.kind | cake.tilt |
| make | cake.stage | cake.genome.height |
| inscription | inscription.written | cake.tilt |
| candles | candles.count | candles.lit |
| child-n | people.child-n.arrived | people.child-n.offset |
| room | scene.light | scene.place (index) |

If a pending proposal sets the path a ring would set (`set`, or the count of `candles`, yaw/kneel of `camera`, light/place of `look`), turning that ring amends the ghost instead (the person turns the agent's suggestion); ACCEPT or HOLD applies it, long ACCEPT rejects it. Presses are timed from the events' timeStamps.

## 6. Hooks for the other roles
- SCENE: define `window.ORB_SCENE = { create(container, ORB) -> { frame(nowMs), resize() } }` in `scene/scene.js`. The shell uses it if present, else `core/stub-scene.js` (same interface, global `ORB_STUB_SCENE`). Draw `ORB.view()`; draw `state.proposals` as ghosts; listen to `ORB.on('change')` for state-change flashes.
- AGENT: define `window.ORB_COMMANDS = { parse(line, state) -> op | op[] | { error } }` in `agent/commands.js` (node: module.exports). The shell's command line uses it if present, else a small fallback (JSON ops and `set <path> <value>`). A describe function may be installed with `ORB.setDescribe(fn(state) -> string)`.

## 7. The shell (index.html)
Loads `../../ana/assets/three.min.js` (r128, global THREE) before `scene/scene.js`, so a scene may rely on THREE. If `ORB_SCENE.create` returns a handle with a `ready` promise that rejects, the shell swaps to the stub. `?stub` forces the stub. After load it loads `agent/commands.js`, `agent/describe.js` (installed with `ORB_DESCRIBE.install(ORB)`) and `agent/console.js` (mounted as `window.ORB_CONSOLE_INSTANCE`, opened by ASK, the glass strip and the COMMANDS button); without them a small built-in drawer takes JSON ops. `ORB.ready` is true once all of this is done.

Extra members on `window.ORB` in the shell: `command(line, author)` (runs one command line), `renderer` ('scene' or 'stub'), `device` (the device: `toPage(x, y)`, `ringX(i)`, `BTN`, `BODY`, `M`, `turn(ring, detents, gesture)`, `press(id, long)`, `ringInfo(i)`), `machine`, `bus`, `undo()`, `redo()`, `replay(log)`.
Probes may set `window.__orbStill = true` to stop the stub's flames and performances so only inputs change the picture.

## Change log
- v1 (Nov 6 2026): first publication.
- v1.5: `measure` is a non-editing op: it changes `state.measures` and is logged (log record `nonedit: true`, in `ORB.ledger()` and replay) but makes no history entry, does not show on the strip or the status line, and its values survive undo/redo.
- v1.4 (AUDIT.md section R): (R1) `CORE_STATE.birthday()` is the start the shell opens on (whole brown dome, written, 7 lit, table up, three arrived, kneel 8); `?empty` opens empty; the saved session (which now stores `initial`) is replayed on open unless `?fresh`; `createOrb({ state })` keeps it as `ORB.initial()` and `save()` includes `initial`, and `replay(savedMemory)` starts from it. (R2) `select` sets `camera.focus` to the selected child, or to the cake for cake/make/inscription/candles; a ring turn whose change would not show is re-targeted (no cake: the ring makes one; writing on an unfrosted cake: frosts it; her time when she is absent: brings her in; lit with no candles: adds candles; any ring on a dark memory switches it on); the result says why in `retarget`. `ORB.device.touching` is the ring under the finger (renderers may light the selection while it is set). (R5) device text is never under 13 units (12.4 px at 390 px); the glass strip line 1 is what is true, line 2 what just happened (`ORB.device.truth()`). (R6) `core/governor.js`: two paints over 34 ms coarsen one level (0-2), 180 good paints give one back; the shell sets `ORB.quality` and calls `scene.setQuality(level)` if the scene has it, and the status line says so. (R7) buttons have a 26-unit touch radius (49 px), the strip and the toolbar buttons are 44 px. (R8) undo/redo labels end with `brought back <path value, ...>`. (R9) `ORB.manual(true)` stops the shell's clock; `ORB.advance(seconds)` steps the machine and paints. (R10) every made thing carries `source: { by, from }` (stamped by the bus after each op; film things `by: 'film'`, defaults `by: 'core'`); library entries carry `source` text; new op `measure { test, value, note }` stores `measures[test]`; `ORB.tests()` / `CORE_TESTS.run(state)` give `[{ name, value, bar, pass, note }]` for whole cake made, no faces, film-bar match (bar 0.6, provisional; fails until measured), every made thing names its source; `save()` includes `tests`; `ORB.ledger()` lists propose/amend/accept/reject records.
- v1.3 (after docs/agent.md): (a) button presses are timed from the pointer events' own `timeStamp` (down to up, 650 ms = long, `CORE_DEVMAP.isLong`), so a slow frame no longer turns a tap into a long press. (b) HOLD with a ghost waiting accepts it (a short press); long HOLD still switches off; ACCEPT / long ACCEPT stay. (c) `candles`, `camera` (yaw, kneel) and `look` (light, place) ghosts turn on the rings like `set` ghosts (`CORE_OPS.ghostArg(proposal, path)`). (d) new op `batch { ops }`, and `propose { ops: [...] , note }` makes ONE ghost of several steps (op 'batch'), so `cake target` can be proposed as one ghost that shows only where it ends; `ORB.propose([op, op], note)` also works. (e) `CORE_OPS.ghostState(state, proposal)` returns the state a proposal would make without touching the real one; renderers should draw ghosts from it. (f) the shell loads `agent/bridge.js` and calls `ORB_BRIDGE.attach(ORB)` (JSON-RPC over postMessage; `?bridge=ws://localhost:PORT` for the relay); `ORB.bridge` is the server. (g) the device's height follows its frame, so no empty band is left under the history strip on a phone.
- v1.2 (after AUDIT.md): log records carry `t` (ms since the bus started, for playback only; replay ignores it) and `label` (what happened in words: `undid cake.kind 3`, `candles 5 (accepted p2)`); `'log'` now fires after the change for applied ops; history entries carry `t`; `'seek'` passes `(n, from)` and the machine steps a one-step move instead of jumping; long REDO plays the history from the cursor at its recorded pace (`ORB.playback()`); the shell writes the session to localStorage 1 s after each change and offers RESTORE on the next visit (`?fresh` skips it); the glass strip says every op in words, from either hand, and a page error is reported there.
- v1.1: added `switchOn`, `amend`, `reset` to the op table (they were in ops.js from the start); section 7 (the shell); `postMessage` also takes `{ orb: 'command', line }` and `{ orb: 'history' }`; `blow` refused with no cake.

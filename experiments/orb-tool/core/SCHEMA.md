# ORB TOOL core: state schema and operation list (v1)

Owner: CORE. SCENE and AGENT build against this file. Changes are additive only and are logged at the bottom.

All core files are plain scripts that work in the browser (they set a global) and in node (`module.exports`).
Load order in a page: `core/state.js`, `core/ops.js`, `core/bus.js`, `core/machine.js`, then `core/sound.js`, `core/device.js`, `core/stub-scene.js`.

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
| `blow` | `{}` | candles.lit = 0, time.blown = true |
| `switchOff` / `switchOn` | `{}` | the memory goes dark / comes back |
| `look` | `{ look?, place?, light? }` | scene look |
| `camera` | `{ yaw?, kneel?, focus?, turn? }` | `turn` is relative degrees |
| `propose` | `{ op, args, note? }` | adds a ghost to `proposals` (the inner op is validated first) |
| `amend` | `{ id, args }` | change a pending proposal's args (the person turning a ghost) |
| `accept` | `{ id? }` | apply the proposal (oldest if no id) and remove it; history entry records `via: id` |
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

`postMessage`: a window may send `{ orb: 'do', ops, author }`, `{ orb: 'propose', op, note, author }`, `{ orb: 'describe' }`, `{ orb: 'state' }`; the page answers with `{ orb: 'reply', id, result }` (echoing `id` if given).

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

If a pending `set` proposal targets the path a ring would set, turning that ring amends the ghost instead (the person turns the agent's suggestion); ACCEPT applies it.

## 6. Hooks for the other roles
- SCENE: define `window.ORB_SCENE = { create(container, ORB) -> { frame(nowMs), resize() } }` in `scene/scene.js`. The shell uses it if present, else `core/stub-scene.js` (same interface, global `ORB_STUB_SCENE`). Draw `ORB.view()`; draw `state.proposals` as ghosts; listen to `ORB.on('change')` for state-change flashes.
- AGENT: define `window.ORB_COMMANDS = { parse(line, state) -> op | op[] | { error } }` in `agent/commands.js` (node: module.exports). The shell's command line uses it if present, else a small fallback (JSON ops and `set <path> <value>`). A describe function may be installed with `ORB.setDescribe(fn(state) -> string)`.

## Change log
- v1 (Nov 6 2026): first publication.

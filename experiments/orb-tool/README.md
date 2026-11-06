# ORB TOOL

One tool for making a memory (a cake, a scene, a birthday), used by a person on the orb's device and by an agent through written commands. Both act through the same operations on the same state, see the same result, and can work at the same time: an agent proposes, the person accepts or turns it; the person sets, the agent refines. The contract is `CONTRACT.md`; the state and the operations are `core/SCHEMA.md`.

Open `index.html` (served over http from the repo root, so `../../ana/` resolves). On a phone: the view on top, the history strip, the device below; the page does not scroll.

## Our reading of the request
The user named hand-orb-v5 as the most usable page and maker.html as having no control authority. So the device here keeps v5's barrel (knurled rings with engraved labels that scroll under the finger, a red index line, a glass strip on top, buttons with lit rings) and ana/index.html's behaviour (a quiet click per hand detent, then the machine stepping the shown value at 11.8 a second with the film's own click grains; SELECT; HOLD, held down = switch off). Every ring and button is an operation on one bus, and every operation changes the view. If this reading is wrong, the person can say so and the mapping table in `core/devmap.js` is the one place to change it.

## The device
| control | does |
|---|---|
| ring 1 SCALE | where you kneel around the memory (camera yaw, 5 degrees a detent, all the way round) |
| ring 2 KNEEL | how low you kneel |
| ring 3 KNURL | the selection's value: which cake, the making stage, how much of the inscription is written, the number of candles, how far a child has arrived, the light |
| ring 4 TRIANGLES | the selection's second value: tilt, height, candles lit, a child's time (earlier or later in her performance), the place |
| SELECT | the next thing to work on (held: the previous one): cake, make, inscription, candles, child 1-3, room |
| HOLD | freeze every performance / release; releasing when the three children are there and the candles lit blows them out. Held down: switch the memory off; pressed again: on |
| MAKE | the next making stage of the cake (held: back to nothing) |
| ACCEPT | accept the agent's oldest proposal (held: reject it). Turning the ring that sets the same thing turns the proposal instead |
| UNDO / REDO | one history step (UNDO held: to the start; REDO held: play the history from here at the pace it was made, again to stop) |
| KEEP / BREED | keep this cake in the library / mix two library cakes into a new one |
| SAVE | download the memory as JSON (held: load one) |
| ASK, the glass strip, COMMANDS | open the command line (agent/console.js when present) |

Keys: 1-4 pick a ring, up/down turn it, left/right move between rings, space HOLD, s SELECT, m MAKE, Enter ACCEPT, z UNDO, y REDO. Mouse wheel over a ring turns it.

The glass strip on top of the device answers every operation in words, whoever made it ("YOU: cake.kind 3", "BUILDER: candles 7", "YOU: undid write 生日快乐", "DEMO REFUSED: blow: there is no cake"); when nothing has just happened it shows the oldest waiting proposal or what to do next. The session is written to the browser 1 s after each change and offered back with RESTORE on the next visit (`?fresh` skips the offer). Changes after AUDIT.md: the status line, the restore, the playback and the fault message follow its section 3 (orb-pro-5's status line, journal and session).

The history strip: one cell per history entry, amber for the hand, cyan for an agent, taller for an accepted proposal, white marks for snapshots. Drag along it to scrub; the next operation after scrubbing back drops the undone steps.

## For agents
`window.ORB` (`state()`, `view()`, `do(op | ops, author)`, `propose(op, note, author)`, `on(event, fn)`, `describe()`, `history()`, `seek(n)`, `save()`, `load(json)`, `command(line)`), `postMessage` JSON, and the command line. Details in `core/SCHEMA.md` sections 3 and 7. The command language, the richer describe, the console and the JSON-RPC bridge are the AGENT role's, in `agent/`.

## Files (CORE role)
- `core/state.js` the memory state, the film's five cakes, the settable paths with ranges and steps.
- `core/ops.js` the operations; each validates and applies, a refused op changes nothing.
- `core/bus.js` dispatch, history with gesture merging (one drag = one undo), the log with authors, undo/redo/seek, save/load, replay, a plain describe.
- `core/machine.js` the shown values step toward the state at 11.8 a second (23.6 when far), the first step at once.
- `core/devmap.js` rings and buttons as operations (pure, tested in node).
- `core/device.js` the drawn device and its pointer, wheel and key input. `core/sound.js` the grains from `ana/device-sounds.wav`.
- `core/stub-scene.js` a minimal 2D renderer used when `scene/scene.js` is absent or fails (`?stub` forces it).
- `index.html` the shell. `tests/core.test.js` the node tests.

## Tests
`node experiments/orb-tool/tests/core.test.js` runs 10 tests: op validation, clamping, undo/redo round-trip, authors and proposals, the hand turning an agent's ghost, replay determinism and save/load, device-to-op mapping, the machine's timing, a whole birthday from nothing to the blow through ops only, and the words each op answers with. All 10 passed on Nov 6 2026.

Measured in Chromium (Playwright, 390x844, stub renderer, flames and performances stopped with `window.__orbStill`): real pointer drags on each of the four rings under six selections (24 cases) and presses of SELECT, HOLD, MAKE, ACCEPT, UNDO, REDO, KEEP and BREED each changed the view's pixels; the time from the operation to the first changed frame was 2 to 51 ms in every case. Session restore and long-REDO playback were checked in the same browser (3 steps restored with their authors; playback reached the end). The pixel probe reads a 2D canvas, so it was run on the stub renderer only, not on scene/. A ring at the end of its range does not move further, so a probe has to turn away from the end stop.

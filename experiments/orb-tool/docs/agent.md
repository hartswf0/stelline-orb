# ORB TOOL: the agent side

Owner: AGENT. Files: `agent/commands.js`, `agent/describe.js`, `agent/console.js`, `agent/bridge.js`, `agent/bridge-relay.js`,
`agent/harness.js`, `agent/harness-page.html`, `tests/agent.test.js`. Built against `core/SCHEMA.md` v1.3.

Our reading of the job: a person on the device and an agent typing or calling tools act through the same core ops on the
same state. The agent side gives the agent a short written language, a plain account of the memory it can act on, a way
to suggest instead of act (ghosts the person answers), a harness that proves both, and a bridge a real agent can connect to.

## 1. The command language (`agent/commands.js`, global `ORB_COMMANDS`)

`ORB_COMMANDS.parse(line, state)` returns an op, a list of ops (one history entry, one undo), or `{ error }`, `{ help }`,
`{ describe: true }`, `{ wait: seconds }`. Several commands on a line are separated by `;`. Lines starting with `#` are comments.

| command | ops |
|---|---|
| `cake brown-dome`, `cake mint`, `cake 3` | `set cake.kind` (the film's swap: if nothing is made yet, the whole cake appears) |
| `cake target brown-dome` | `set cake.kind` then `set cake.stage <current>`: choose what is being made without skipping the making |
| `cake none`, `cake tilt 4`, `cake form dome`, `cake side chocolate`, `cake top #ffcc88`, `cake dots 0.5`, `cake height 0.12`, `cake radius 0.12`, `cake layers 2` | `set` on the cake paths |
| `make`, `make sponge`, `make frosted`, `make decorated`, `make finished`, `make 0..4` | `make` / `make {to}` |
| `write 生日快乐`, `ink 12` | `write`, `set inscription.written` |
| `candles 7`, `light 3`, `light all`, `candles out` | `candles`, `set candles.lit` |
| `table up`, `table down` | `set table.up` |
| `child 2 arrive`, `child 2 arrive 0.5`, `child 2 gone`, `children arrive` | `set people.child-n.arrived` |
| `child 2 later 0.5`, `child 2 earlier 0.25` | `set people.child-2.offset` in frames at 24 fps (0.5 s = 12, the most the core allows) |
| `child 3 at 0.3 -0.6`, `add child`, `add prop balloon 0.4 -0.2 1.5`, `remove prop-1` | `set` x/z, `add`, `remove` |
| `turn -20`, `yaw 30`, `kneel 0.4`, `kneel 4`, `stand`, `focus child-2` | `camera` |
| `place room`, `look holo`, `brightness 6` | `look` |
| `hold`, `release` (`let go`), `blow`, `off` (`switch off`), `on` | `hold`, `release`, `blow`, `switchOff`, `switchOn` |
| `select candles`, `next`, `previous` | `select` |
| `breed mint brown-dome 7`, `keep my cake` | `breed`, `keep` |
| `propose <command> [-- note]` | one `propose` per op (see section 3) |
| `accept [p3]`, `reject [p3]`, `amend p3 6`, `amend p3 count=6` | `accept`, `reject`, `amend` |
| `undo [n]`, `redo [n]`, `mark <name>`, `reset` | `undo`, `redo`, `snapshot`, `reset` |
| `set <path> <value>`, `nudge <path> <by>`, `{"op":...,"args":...}` | passed through |
| `help`, `help <command>`, `describe`, `wait 1.5` | not ops |

Numbers: for `kneel`, `brightness` and `child n arrive`, a number written with a decimal point between 0 and 1 is a share of
the 0..10 scale (`kneel 0.4` = 4, `kneel 1.0` = 10); whole numbers are steps (`kneel 1` = 1).

Errors name what was expected and what exists: `cnadles 7` -> "no command "cnadles". Did you mean candles?";
`candles 20` -> "candles takes 0 to 12; you wrote 20"; `cake target bown dome` -> "Did you mean brown dome?";
`child 9 arrive` -> "there is no child-9. There are child-1, child-2, child-3."; `accept` with nothing pending ->
"nothing is proposed". Ranges are checked in the parser (from SCHEMA.md) so an agent is told instead of silently clamped.

`ORB_COMMANDS.say(op, state)` gives a short plain account of an op (used by the drawer, the bridge and the ghost list).

## 2. `describe()` (`agent/describe.js`, global `ORB_DESCRIBE`)

`ORB_DESCRIBE.install(ORB)` replaces the core's describe through `ORB.setDescribe`. The first line is the status, so an
agent reading only one line knows where it is: `MEMORY MAKING: 5 things before the blow`, `MEMORY READY FOR THE BLOW`,
`MEMORY BLOWN: ...`, `MEMORY SWITCHED OFF`. Then: scene, cake (name, stage n of 4, genome), inscription (n/24 written),
candles, table, each person and prop, the view, what the person's rings work on, the library, PENDING proposals with
author and note, BEFORE THE BLOW (each missing thing with the command that does it), LAST (newest five history entries
with author, and how many are undone), `the person last: ...`, and `NEXT: <command>`.
Every NEXT is a command in the language; the tests follow NEXT from an empty memory and reach the blow.

The order of BEFORE THE BLOW is the film's: table, cake finished, inscription written, candles there and lit, the three
children arrived, the moment held. (The core's `release` blows when all three children are there and candles are lit.)

## 3. Co-working protocol

- The agent proposes; it does not act while the person is working. `propose <command>` (or the bridge tool `orb_propose`)
  adds ghosts through the core's `propose` op, each with the agent's author and a note saying why: one ghost per command.
  A command that compiles to several ops (`cake target brown-dome`, `children arrive`, `child 3 at x z`) is ONE ghost
  (core v1.3 `propose { ops }`, op `batch`) that shows only where its steps end and is accepted or dismissed whole; a
  batch ghost cannot be amended. Commands joined with `;` stay separate ghosts.
- Proposals are made turnable: camera, making and scene changes are proposed as plain `set` ops on the path a ring works
  (`turn -20` becomes `set camera.yaw <absolute>`, `make` becomes `set cake.stage <n+1>`, `kneel 0.4` becomes
  `set camera.kneel 4`), because the core's device amends a pending `set` ghost when the person turns the ring that sets
  that path. A ghost that would change nothing is not proposed.
- The person answers on the device (core/devmap.js): ACCEPT applies the oldest ghost; a long ACCEPT dismisses it; turning
  the matching ring adjusts the ghost first. In the drawer each ghost also has ACCEPT and DISMISS.
- Conflicts are the person's: a ghost is validated when proposed and again when accepted; if the person has changed
  things so it no longer applies, the accept is refused and the ghost stays for them to dismiss. The person's own moves
  are never blocked by pending ghosts.
- The agent learns the answer with `orb_await_decision` (accepted, with the value as turned by the person; or dismissed),
  and reads `describe()` again before its next proposal.

Note: the brief for this role said HOLD accepts and SELECT dismisses. The core's device (owned by CORE) gives those jobs
to ACCEPT and long ACCEPT and keeps HOLD and SELECT for holding the memory and choosing what the rings work on. The
harness uses the device as built.

## 4. The harness (`agent/harness.js`)

`node experiments/orb-tool/agent/harness.js [agent|cowork|both] [--page experiments/orb-tool/index.html] [--out DIR] [--no-film]`

It serves the repo over http, opens the page in Chromium at 390x844, loads the agent files if the shell has not, and:
- **agent**: a scripted agent that only uses bridge tool calls (`orb_describe`, `orb_command`). It makes three choices of
  its own (`cake target brown-dome`, `kneel 0.4`, `turn -20`, and `child 2 later 0.5` once child 2 is there) and otherwise
  does whatever `NEXT:` says, until describe says BLOWN.
- Presses are pointer events dispatched on the device canvas (see section 7 for why); ring turns are mouse drags.
- **cowork**: the agent proposes (`orb_propose`, `orb_await_decision`); a scripted hand answers with real mouse events on
  the device canvas (positions from `ORB.device.toPage`): ACCEPT; four MAKE presses of its own; the KNEEL ring turned two
  detents to raise the agent's `kneel 4` ghost to 6 before accepting; a long ACCEPT to dismiss `turn 90`; the SCALE ring
  turned on its own; HOLD, then HOLD again to release, which blows the candles.
- Films: the page's own sound is tapped (every node connected to the AudioContext destination also feeds a
  MediaRecorder), muxed with Playwright's video by ffmpeg into `agent.mp4` and `cowork.mp4` in the scratchpad. A finger
  ring is drawn where the pointer is. `harness-record.json` holds every call, timing and the final describe.

`agent/harness-page.html` is a bare page (core + device + describe as text + drawer) for running the harness without the shell.

## 5. The bridge (`agent/bridge.js`, `agent/bridge-relay.js`)

JSON-RPC 2.0 with MCP method names: `initialize`, `tools/list`, `tools/call`, `ping`. Tools:

| tool | arguments | does |
|---|---|---|
| `orb_describe` | - | the text of section 2 |
| `orb_command` | `line`, `author?` | runs command lines at once (one undo) |
| `orb_propose` | `line`, `note?`, `author?` | ghosts for the person; returns their ids |
| `orb_await_decision` | `id`, `timeout_ms?` | waits for accepted (with the person's adjustment) or dismissed |
| `orb_do` | `ops`, `author?` | raw core ops |
| `orb_state` | - | the state JSON |
| `orb_history` | `last?` | who did what |
| `orb_paths` | - | settable paths and ranges |

Authors must look like `agent:<name>`; otherwise `agent:mcp`.

Transports:
- In the page: `ORB_BRIDGE.attach(ORB)` listens for `{ jsonrpc: '2.0', ... }` messages (postMessage; the reply goes back to
  the sender) and, with `?bridge=ws://localhost:8787`, connects out to the relay. Only localhost URLs are accepted.
- `node experiments/orb-tool/agent/bridge-relay.js` is an MCP stdio server with no dependencies: it relays stdin JSON-RPC to the
  page over a WebSocket on 127.0.0.1:8787. `--local` answers from an orb in the node process instead (no page).
  Register it with an MCP client as `{ "command": "node", "args": ["<repo>/experiments/orb-tool/agent/bridge-relay.js"] }`.

The shell already loads `agent/commands.js`, `agent/describe.js` and `agent/console.js`. To add the bridge (CORE's file): load
`agent/bridge.js` and call `ORB_DESCRIBE.install(ORB); ORB_BRIDGE.attach(ORB);`. The harness injects it when missing.

## 6. Measured (Nov 6 2026, this machine: 2 CPUs, load average 31-35 from other swarms during the runs)

- `node experiments/orb-tool/tests/agent.test.js`: 16 passed, 0 failed after the v1.3 change (15 before) (the brief's example lines, a full birthday by text,
  errors, help, kneel scaling, ghosts and amend/accept/reject, ring-turned ghosts through core/devmap.js, describe and
  following NEXT from empty to BLOWN, JSON ops, the rest of the language, the bridge's tools and orb_await_decision, and one batch ghost for `cake target` / `children arrive` with no stage-4 change event on accept).
- Relay end to end (scratch script, harness-page.html with `?bridge=ws://localhost:8799`): initialize queued before the page
  connected was answered after it connected; `orb_command` changed the page's state with author `agent:claude`.
- agent run on index.html with scene/scene.js: 16 bridge calls, describe says BLOWN, 132 s wall clock. Agent call to the
  machine's first `step` event: median 0.6 ms, max 50.4 ms over 23 calls (in-page timing, not glass-to-glass).
  Film agent.mp4: 97 s, with sound.
- cowork run on index.html with scene/scene.js: 11 ghosts; 10 accepted by the hand on the device, one (kneel) after the
  KNEEL ring raised it from 4 to 6, one (turn 90) dismissed by a long ACCEPT; the hand's own MAKE x4 and SCALE -4;
  HOLD then HOLD released and blew the candles. 887 s wall clock under that load; film cowork.mp4 is 626 s real time
  with sound, plus cowork-x8-timelapse.mp4 (8x, no sound). An earlier run on the core stub renderer at lower load
  finished in 100 s (cowork-stub-renderer.mp4, 76 s film).
- Films are in the role's scratchpad, not the repo.

## 7. What is weak

- Under heavy CPU load the device read quick mouse taps as long presses (a first cowork run rejected 9 of 11 ghosts and
  switched the memory off). The device times presses with `performance.now()` in its handlers; when the main thread
  stalls, the pointerup is handled late. The harness now dispatches the pointerdown/pointerup pair in one task (real DOM
  pointer events on the device canvas; the finger glides there with the mouse). Ring turns are real mouse drags. A fix in
  core/device.js would be to time presses with `event.timeStamp`.
- Fixed after core v1.3: `cake target X` is now one batch ghost (it used to be two, and accepting the first showed the
  whole cake for a moment); core now times presses from the events' `timeStamp`, and `candles`, `camera` and `look`
  ghosts turn on the rings too. The films in section 6 were made before these changes; they were not re-recorded.
- `describe()` lists a batch ghost's steps as raw JSON.
- The films are slow because the machine was loaded; the timings above are not what a phone would show.

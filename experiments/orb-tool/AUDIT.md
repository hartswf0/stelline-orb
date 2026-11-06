# ORB TOOL — AUDIT (first pass 04:40 from code reading; section M measurements and section R decisions added 06:00)

Our reading of the user's notes is the one in CONTRACT.md (each note follows its link). Line numbers are for the files as they stand on Nov 6 2026.

## 0. The shared base (the user's "see how we use the same base")

There is no shared module. There are three lineages, copied, not imported:

| lineage | pages | where the base is | agent handle |
|---|---|---|---|
| A. 3D orb device in its own three.js scene (five rings, six buttons, OLED, MQTT+BroadcastChannel pairing, DOC + UNDO) | weaver.html (origin), maker.html, cineosis-orb/index.html ("its body, rings and display are the weaver's": maker.html:136, cineosis-orb/index.html:204); film.html embeds weaver.html in an iframe and plays a video of it | weaver.html:829-1002 (orb), 405-528 (rings/turn/scrub), 529-554 (buttons), 1160-1230 (pairing); maker.html:136-221, 244-356; cineosis-orb/index.html:204-289, 355-499 | `window.FORGE` (weaver.html:1748, maker.html:466, cineosis-orb/index.html:666): turn, scrub, press, viewBy, rings, DOC getter |
| B. 2D canvas device + film atlas (v5) | hand-orb-v5.html + assets/v5/{core,orb,hand,scene,link,hands}.js | assets/v5/core.js (state + ops), orb.js (device), hand.js (hands + simulator) | `window.CORE`, `window.ST`, `window.ORB`, `window.HAND.SIM` |
| C. one-off | ana/index.html (2D barrel, 3 rings, stepping machine), stage.html (+assets/stage/*, driven only by pad.html), studio.html (+assets/atlas-*.js, DOM sliders) | — | ana: `window.MM` (ana/index.html:261); stage: `window.STAGE` (assets/stage/stage.js:472); studio: none found |

Consequence: every fix is made three times, and the three forks have drifted (maker DOC has no `items`, cineosis DOC does; weaver DOC is frames of a stop-motion). The new tool must have one core (CONTRACT: core/state.js, ops.js, bus.js) that every view imports.

## 1. What to keep, page by page

**hand-orb-v5.html (most usable)** — keep the architecture, not the look.
- One state object with a change bus: assets/v5/core.js:6-13 (`ST`, `on/emit/touch`). Nothing in core draws.
- Rings whose meaning comes from the state and mode, defined as data with `get/set/labels/long`: core.js:51-74 (`ringDefs`). A ring is a view over a state field, so the device and any script read the same thing.
- Every input is one call: `turn(i, d)` / `setRing(i, v)` / `press(k, long)` (core.js:80-102), each recorded (`rec`, core.js:79) and logged (`log`, core.js:13). Keyboard 1-5 / arrows / letters map to the same calls (orb.js:42-46 = concat line 206-210).
- Teaching steps that complete themselves when the state says so: `PROTO_STEPS` + `check()` (core.js:124-152). This is the right shape for a guide that a person and an agent can both satisfy.
- Simulated hands entering through the same door as camera hands (`HAND.feed`, hand.js:18-42) and scripts built from `twist/turnTo/press/point/spread` (hand.js:63-106); the recorded performance replays as a memory (hand.js:100-104). This is the best existing example of code and a person sharing control.
- The glass strip on the device saying the long name of what the ring points at and the next step (orb.js:147-155): legible guidance on the device itself.
- IMPRINT + MATCH: render the bench from the reference camera and score colour/layout/edges against the film frame (hand-orb-v5.html, the `MATCH` function). Keep as the FILM-BAR self-check.

**ana/index.html (functional bar)**
- The stepping machine: the hand sets `target` in detents, the machine walks `applied` toward it at 11.8 steps/s (23.6 when far), each step a sound and a visible change: ana/index.html:136-154 (`RINGS`, `machine`, `applyStep`). This is the "hand-turn detents, then the 11.8/s machine" in CONTRACT.
- The scene script drives the same `handTurn` as the finger (ana/index.html:220-227, `SCRIPT`, `runScene`, `runAnims`): the film's order is played through the person's own controls. Keep this: an agent's moves should animate the same rings.
- Ring roles under each ring in words ("WHERE YOU KNEEL", "WHICH CAKE", "HER TIME"): `ringRole` ana/index.html:208-211.
- HOLD and SWITCH OFF as first-class verbs (ana/index.html:213-217).

**cineosis-orb/index.html (functional)**
- The shelves: one ADD list of everything that can be added, grouped (cineosis-orb/index.html:335-354), and PRESETS of named whole cakes (290-298).
- Squeeze/stretch of the orb changes ring gain (coarse x4 / fine x1/4), cineosis-orb/index.html:355-356.
- When paired, `rings()` is replaced by `REMOTE_RINGS` and turn/scrub/press forward to the scene (425-439): the phone holds no truth, the scene does. Keep that rule.

**weaver.html (the look the user wants behind the landing page)**
- CINEMA set: dark dome, faint seams, one lit line where wall meets floor (weaver.html:149-182); hologram material treatment (183-198); MIST of 24,000 points (1128-1159). These are SCENE's material.
- Gizmo in the room driving the same rings (1003-1042): a second way to the same op.
- The guide (1073-1127) and `window.FORGE` with `advance/step/setAim/manual` (1748-1749), which already lets a script run the page deterministically.

**maker.html**
- The DOC model is the cleanest of lineage A: `DOC0` (maker.html:223) — cake, candles, writing, table, kids, light — with `snap()`/UNDO/REDO of JSON copies (229-230), `things()/addable()/create()/remove()` (235-242). Close to CONTRACT's state.objects.
- Ring definitions as `list()` / `num()` records with range, step and a formatter (maker.html:245-247) — same idea as v5's ringDefs, with units (CM, K, MM, degrees).
- VIEW mode cameras EYE/FRONT/SIDE/TOP/FREE (maker.html:227, 250-255).

**stage.html** — keep the post pass (depth of field from a depth texture, bloom, grade; assets/stage/stage.js:36-61) and the scene graph walk by depth/sibling (273-288). Keep the build-from-nothing tiers/icing/piping functions (113-210) as SCENE reference.

**studio.html** — keep the render look only (the user: "looks great"); its controls are DOM sliders with 7.5 px labels (studio.html:294-298).

**film.html** — keep the idea: a timed film of the tool doing the whole build, with chapter buttons that seek it (film.html:246-281, 292-325). In the new tool the film should be a replay of ops, not a separate MP4.

## 2. What fails, and why (code reading; measured numbers in M)

- **maker.html — "nothing happens".** The document starts empty (`DOC0`, maker.html:223: cake null, table null, kids []); `things()` then holds only LIGHT, so ring 1 (PICK) is null and rings 2-5 set the light's AROUND / HEIGHT / WARMTH / strength on an empty dark room (maker.html:256-265). Turning any ring changes a light on nothing. Making anything requires ADD, then ring 1 to choose, then ADD again (maker.html:298-299); the OLED says "TURN RING 1 TO CHOOSE · ADD AGAIN TO PUT IT IN" only after ADD is pressed, and nothing before that points at ADD. A dead ring only clicks (`tick('dead')`, maker.html:279).
- **stage.html — "promise, not functional".** No local input at all: no pointer, key or wheel listener in assets/stage/stage.js (only `resize`, line 420). Every op arrives from pad.html over the relay (`STAGE.onmsg`, 462-471). "Use without the orb" (stage.html, `#skip`) hides the pairing screen and leaves a page with no controls.
- **studio.html — "unusable, not believable".** Controls are DOM sliders and buttons with 7.5 px labels (studio.html:294-298); the device is a picture, not the controls.
- **weaver.html — unusable as a tool.** Seven modes on ring 1, ten verbs, a frame-based document: the vocabulary is larger than the device can show (weaver.html:28-38 lists it). It also gets loaded inside film.html as an iframe, so the film page runs two WebGL scenes.
- **hand-orb-v5.html — usable, does not look good.** The scene is the film atlas cut into layers (assets/v5/scene.js); the bench builds are primitives and cards. The device is a flat 2D drawing at 9-12 px type inside a 1000x300 frame scaled to the phone (orb.js:7-10, ring labels 9-12.5 px at frame scale).
- **film.html** — scrolls (body padding, min-height 100vh, film.html:22-28); embeds a second full app in an iframe.
- **All lineage A pages** ship an MQTT client inline and connect to public brokers on load of PAIR (maker.html:313-340); the new tool should pair through one module.

## 3. What orb-pro-5 and secondhand-motion do that ours do not

**orb-pro-5.html** (abc-flix, 3559 lines, white paper, black ink, Plex Mono):
- **A status line that always says what is true and what just happened** (`#where`, `ttrace`, orb-pro-5.html:2564-2569 and paint() 1374-1408): "f3/12 40° 12°", "thinned · slow paint", "BASE is hidden · tap its eye in B", "brought back 3 marks, took away 1 frame". Every op answers in words. Ours answer only with a click sound or a tiny OLED.
- **An honest UNDO journal** (1423-1451): snapshot of the score's shape before each edit, 40 deep, one finger-down = one edit, and UNDO says what it brought back.
- **The session survives the tab** (1452-1504): written 1 s after the last edit and on hide; RESTORE offers it with a count and says what was not kept.
- **A fault bar instead of a dead page** (1505+, `#fault` with RESTORE / KEEP SCORE / NEW, html line 238-240).
- **A governor** (1353-1366): measures paint time, coarsens after two slow paints, says so on the line; never lies about quality.
- **Six lettered trays A-F (DRAW LAYER PLACE TIME OUT CAM) in a foot bar** (html 245-252, `openTray` 2570): one tray open at a time, the view never covered; each tray is built from state (`buildTray`).
- **Operations named as verbs on a span** (889-986: COPY, CUT, PASTE, DUP, DROP, HOLD, FADE, REVERSE, BAKE) with a subject line "ON <what> · touch the strip to narrow".
- **Motion as a small JSON spec** (`{spin:{axis,rate}}, {bob}, {pulse}, {boil}`, the TIME tray 2945-2990): a button press and a typed object produce the same spec through one `set(m)`, and `ask(text,set)` (3144-3164) accepts either a JSON object or plain words sent to a model, with a 15 s stop. (In this file `ask` is defined but no tray calls it; the pattern is there, the wiring is not.)
- **The score is the file** (`saveScore/openScore`, 3166-3215): whole state as JSON in and out.

**secondhand-motion** (gallery + pipeline; repo AGENTS.md, pages/agent-prompt.html):
- **The agent works on files, the page reads them**: one state file per shot (`shot.json`: planes, camera per frame, objects with strokes and their source, cast frames, x-sheet), an append-only `ledger.jsonl` of every proposal, critic verdict and repair, and `tests.json` with each gate's value, bar and pass/fail. The person sees the same state rendered in the studio player (plane tabs, render styles Butter/Slices/Radial/2-Rail, layer filters, explode %, frame step, speed, scrub).
- **Gates that may not be lowered** and a **blind critic packet** (AGENTS.md: gate table; critic sees only the listed files). Still-key approval and motion approval are separate verdicts.
- **Provenance on every made thing** (`source: "quickdraw:<id>"`, or "drawn by agent" with a reason).
- **A rack ordered by progress** (stage reached, tests passed) so a person sees where each agent's work stands.
- What it lacks for us: the page has no live command surface; changes appear after `tools/build_pages.py`. Ours must be live.

**What neither of ours has:** a written command line, a `describe()` text account of the state, a proposal the person can accept, a status line, a persisted session, an op log that is also the undo and the film.

## M. Measurements (Playwright, headless Chromium with SwiftShader, served from 127.0.0.1:8731)

**Read this first: what the numbers can and cannot say.** The machine was shared with other swarms (2 CPUs, load average 25-33 for the whole run). Under that load one screenshot took 2-25 s and pages drew 1-7 frames a second (table below), so the "within 100 ms / within 1 s" windows in the brief could not be measured as wall-clock latency. What was measured instead:
- **authority**: does the scene region's pixels change after the input (more than 1% of a 96-px-wide downsample changing by more than 12/255, and more than 1.5 x the idle drift)? Where the page offers `FORGE.manual()/advance()` (maker, weaver, cineosis-orb) its loop was stopped and stepped 6 frames for the "100 ms" capture and 60 for the "1 s" capture, so the result does not depend on load.
- **cost of the operation itself**: time inside the op call (`opMs`), measured in the page. Every ring op on v5 and maker took 0.2-0.9 ms; press(ADD) 2-2.5 ms; v5 IMPRINT 1590 ms (renders and scores a frame); maker's first turn 22 ms. So the ops are not the latency problem; drawing is.
- External requests (Google Fonts, MQTT relays wss://broker.emqx.io, broker.hivemq.com, test.mosquitto.org) are blocked in this sandbox; those console errors are counted as environment, not page faults.
Scripts: experiments/orb-tool/audit/probe.js (generic controls + canvas row), probe-v5.js (v5 rings/buttons at their exact device positions), probe-ops.js (the page's own ops through its script handle), probe-static.js (layout, text, targets, frame time). Results: experiments/orb-tool/audit/results2/*.json. Runs that hit the time limit are marked partial in their JSON.

### M1. Static, 390x844 (results2/static.json)

| page | page scrolls | DOM controls (in view) | controls under 44 px | visible text under 12 px | smallest font | median frame here | script handle |
|---|---|---|---|---|---|---|---|
| hand-orb-v5.html | no | 0 (all on canvas) | — | — (canvas text: ring labels 7.7 px, collar labels 5.5 px at this size, measured from ORB.M scale 0.613) | — | 150 ms | CORE, ORB, ST, HAND, SCENE, LINK |
| maker.html | no | 0 (all in 3D canvas) | — | — (OLED text rendered in 3D, about 9 px tall in the 390 screenshot) | — | 450 ms | FORGE |
| stage.html | no | 1 ("Use without the orb") | 1 | 5 of 7 | 6.8 px (reticle) | 10 frames in 15 s | STAGE, PAIR |
| weaver.html | no | 0 | — | — | — | 11 frames in 15 s | FORGE |
| studio.html | no | 15 (5) | 15 of 15 | 0 of 16 | 13.3 px | 7 frames in 15 s | none |
| film.html | **yes** | 17 (12) | 11 | 18 of 21 | 10 px | 12 frames in 15 s (video + iframe weaver) | none |
| ana/index.html | no | 0 (canvas device) | — | — | — | 50 ms | MM |
| cineosis-orb/index.html | no | 0 | — | — | — | 483 ms | FORGE |

1280x800 static rows are appended to results2/static.json as the run completes.

### M2. hand-orb-v5.html at 390x844, every ring and button pressed at its own place on the device (results2/v5input-390x844.json)

The scene canvas is 390x219 (the film at 16:9); the device takes the other 625 px, turned a quarter. Ring widths on screen 56/69/103/69/56 px; buttons 23 px across.

| input (finger) | scene changed | state changed |
|---|---|---|
| WATCH: drag ring 1 TIME | 60% | yes |
| ring 2 PART | **0%** | yes (part index moved; nothing in the scene marks the part) |
| ring 3 DEPTH | 32% | yes |
| ring 4 VIEW | 53% | yes |
| ring 5 LIGHT | 55% | yes |
| button CUT / BUILD / ZERO / BIRTHDAY / BUG | 65% / 75% / 67% / 90% / 86% | yes |
| button WATCH (play/pause) | 6% at first capture, 3% after (below the 1.5 x idle bar) | playing flag only |
| button TAKE / ANYTHING / OTHERWISE / IMPRINT | **0%** each | TAKE, ANYTHING, OTHERWISE yes; IMPRINT no (refused outside BUILD, note on the glass strip only) |
| BUILD (birthday): ring 1 COMPARE TO | 61% | yes |
| ring 2 FACET | **0%** | yes (facet chosen; no mark in the scene) |
| ring 3 DEPTH | 17% | yes |
| ring 4 MAKE (facet 0) | 0.25% | no (already at its end) |
| ring 5 LIGHT | 0% | no |
| scene: drag | 8.5% (swing) | — |
| scene: tap | 0% | — |
Summary: 13 of 22 finger inputs changed the scene; 16 changed the state. The selection rings (PART, FACET) change state with no visible consequence; TAKE / ANYTHING / OTHERWISE changed state with no visible change from the watch state they were pressed in.

### M3. maker.html at 390x844

Through its own ops (FORGE.turn / FORGE.press, manual clock; results2/ops-maker-390x844.json):
- From the starting state (empty document), **all five rings turned 3 detents each: 0.0% scene change for every ring.** (They set the light's angle, height, warmth and strength in an empty room.)
- ADD (first press): 0% (it only opens the chooser); ADD again: 9.6% (the cake appears). MODE: 1%. UNDO: 9.9% (cake gone).
- With a cake in: ring 1 PICK 1.3%, ring 2 FORM 14.3%, ring 3 ICING 0.8%, ring 4 BORDER 0%, ring 5 SIZE 0.1-0.2%. Two of five rings give a visible change at this camera distance.
Through a finger on the device (results2/maker-390x844.json, the barrel row found from the screenshot at y=667):
- 18 inputs (tap, drag up, drag sideways at 6 points across the left grip and rings 1-4): 2 changed the scene, both a drag on the grip end (orbits the camera, 17-22%). Taps and drags on the rings: 0% scene change, and under 0.2% change in the device picture.
- The only words on the phone screen are "EMPTY SCENE" and a smaller "PRESS ADD" on the OLED (screenshot results2/maker-390x844.jpg). This is the measured form of the user's "nothing happens, no control authority".

### M4. weaver.html at 390x844 (partial: 3 inputs in the time limit; results2/weaver-390x844.json)
- One tap on the left grip end changed 95% of the scene and 76% of the device area: the page switched to the observer view and shrank the orb to a 100 px thumbnail in the corner (screenshot results2/weaver-390x844.jpg). A single tap can take the tool away from the person.
- Drags on the same spot: 1.5% (below threshold).

### M5. Lineage A frame time
maker 450-583 ms per frame, cineosis-orb 483 ms, weaver about 1.4 s, against v5 150 ms and ana 50 ms on the same machine at the same moment. The three-scene pages (room + orb device + post) are 3-10x heavier per frame than the 2D-device pages. On a phone this is the difference between a detent that answers and one that does not.

## R. Ranked design decisions for the new tool

1. **Never start empty.** Open on a whole birthday memory (cake, candles lit, inscription, table, three faceless figures) at the making stage the person left, as ana/index.html and v5 BIRTHDAY do. maker's empty start is the measured cause of "nothing happens" (M3: 0% for all five rings).
2. **Every ring always moves something you can see.** A ring whose current target cannot show a change at the current camera is re-targeted or the camera reframes to it. Selection rings (PICK / PART / FACET, 0% in M2) must draw the selection in the scene: a lit outline or reticle on the picked thing, held while the ring is touched. Acceptance test = the M2/M3 probes: no input under 1% scene change.
3. **One core, imported by every view.** state.js + ops.js + bus.js (CONTRACT); retire the copy-paste lineage A. Start ops from v5 core.js:51-102 (rings as data over state; turn/setRing/press; rec/log) and ana's target/applied machine (ana/index.html:136-154) so the hand sets detents and the machine steps at 11.8/s.
4. **The agent uses the same ops and the person sees it happen.** An agent op animates the same ring (ana's SCRIPT through handTurn, ana/index.html:220-227; v5 SIM through HAND.feed, hand.js) and its author is written in the log. `propose` shows the result as a ghost in the scene and on the ring, accepted by SELECT, turned by the person's next detent, rejected by HOLD-back.
5. **A status line that always says what is true and what just happened** (orb-pro-5 `#where`/`ttrace`): "CAKE · CANDLES 7 · agent:director set candles 7 · UNDO brings back 0". Readable at 390 px: no text under 12 px (v5 ring labels measure 7.7 px, stage 6.8 px, film 10 px).
6. **Budget the frame, and say when thinned.** One WebGL scene for the memory; the device drawn in 2D (v5 orb.js / ana style), not a second three.js scene (M5: lineage A 450-1400 ms per frame vs 50-150 ms for 2D devices here). Add orb-pro-5's governor (orb-pro-5.html:1353-1366): two slow paints coarsen, the status line says so.
7. **Layout fixed and unscrollable at 390x844: scene on top, device below, no layout changes from a single tap.** Pairing, observer view, export behind an explicit (i) drawer, never on the grip end (M4: one tap took 95% of the screen). Touch targets 44 px minimum; v5 buttons measure 23 px.
8. **Undo is a journal that says what it brought back; the session survives the tab.** orb-pro-5.html:1423-1504: one finger-down = one entry, 40 deep, restore offered with a count. The op log is also the undo stack and the replayable film (v5 `rec` + SIM.replay), so film.html becomes a replay, not an MP4.
9. **Text and JSON in, plain text out.** A command line and `ORB.do({op,args})` that accept the same ops (orb-pro-5's `ask(text,set)` pattern: JSON applied directly, words parsed or sent to a model with a 15 s stop), and `describe()` returning the memory in sentences. Expose `manual()/advance(dt)` like FORGE so agents and tests can step the clock deterministically (it is what made M3 measurable).
10. **Gates and provenance, the secondhand-motion way.** Every made thing names its source (film shot n, preset name, agent name); a memory carries `tests` (FILM-BAR match from v5's IMPRINT/MATCH, faces none, whole cake made) with value, bar and pass/fail, and an append-only ledger of proposals, accepts and rejects. The critic later reads the ledger and the strip, not the builders' notes.

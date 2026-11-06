# ORB TOOL — AUDIT (first pass, 04:40, code reading; measurements follow in section M)

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

## M. Measurements — running (Playwright, 390x844 and 1280x800); this section is filled in below.

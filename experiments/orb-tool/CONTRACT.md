# ORB TOOL — the tool that builds the cakes, scenes and memories, used by humans and agents together

## What the user said (verbatim, Nov 6 2026, 04:08)
"but also the memory orb ui this one is not usable. not like https://hartswf0.github.io/stelline-orb/#film this one is not bad but see how we use the same base https://hartswf0.github.io/stelline-orb/#maker this one is not buad but nothign happens no conrol authority https://hartswf0.github.io/stelline-orb/#stage this one has promize nut not functional https://hartswf0.github.io/stelline-orb/#weaver i really like this one as whats happening behind us on the main page landuingi page this one is dope but unsuable and not beliebavle https://hartswf0.github.io/stelline-orb/#studio this one is usable but doesnt look good https://hartswf0.github.io/stelline-orb/#orbv5 actually most usable. this one is good but it could be so much better consider this https://hartswf0.github.io/abc-flix/orb-pro-5.html or this https://hartswf0.github.io/secondhand-motion/ see wgat we need to evolve swarms for building better tools that humans and agents can both use together start those swarms the swarms that build the things that build better cakes scenes memories"

Our reading (state it in your work; the user can correct it). Landing page ids map to files in this repo: #film = film.html, #maker = maker.html, #stage = stage.html, #weaver = weaver.html, #studio = studio.html, #orbv5 = hand-orb-v5.html. The user's notes, read as each note following its link:
- The swarm/evolve pages are not usable as tools.
- film.html: not bad; note that several pages share the same base.
- maker.html: not bad, but nothing happens: no control authority (turning a control does not visibly change anything).
- stage.html: promise, not functional.
- weaver.html: the user really likes it as what happens behind the main landing page.
- studio.html: looks great but unusable and not believable.
- hand-orb-v5.html: usable but does not look good; actually the most usable.
- Consider https://hartswf0.github.io/abc-flix/orb-pro-5.html and https://hartswf0.github.io/secondhand-motion/ (study both; their repos are hartswf0/abc-flix and hartswf0/secondhand-motion).
Also the bar from earlier: ana/index.html and cineosis-orb/index.html are functional; ../swarms/FILM-BAR.md (believable as the film's memory); ../swarms/BRIEF-3D.md (3D, whole cake made, no faces, device as controller).

## The thesis
A memory is made with one tool. The tool has two kinds of hands: a person on the orb's device, and an agent through a written command interface. Both act through the same operations on the same state, see the same consequences, and can work at the same time (an agent proposes, the person accepts or turns it; the person sets, the agent refines). Every control has authority: every input produces an immediate, visible, audible consequence in the scene. The tool makes cakes, scenes and memories; the swarms build the tool.

## Shared core: one state, one operation bus (owned by the CORE builder)
experiments/orb-tool/core/
- `state.js`: one JSON-serialisable memory state: scene (place, light, look), objects (cake with its making stage and genome or parameters, inscription, candles, table, people as faceless figures, cut-outs, props), camera (Ana's viewpoint: yaw, kneel height, focus), time (the memory's clock, holds), selection, history.
- `ops.js`: the operation set, each `{op, args}` validated, applied, undoable, logged with author ('hand' or 'agent:<name>'): e.g. `select`, `set`, `nudge`, `add`, `remove`, `make` (advance a making step), `breed`, `keep`, `hold`, `release`, `blow`, `switchOff`, `look`, `camera`, `propose` (an agent's suggested op shown to the person as a ghost until accepted), `accept`, `reject`, `undo`, `redo`, `snapshot`, `load`.
- `bus.js`: dispatch, subscribe, replay; the device maps rings/SELECT/HOLD to ops (hand-turn detents, then the 11.8/s machine steps the applied value); the agent API maps text and JSON to ops.
- Agent surfaces: `window.ORB = { state(), do(op|ops), propose(op), on(event, fn), describe() }`; a text command line on the page (behind (i) or a pull-up drawer) accepting lines like `cake target brown-dome`, `candles 7`, `write 生日快乐`, `kneel 0.4`, `turn -20`, `hold`, `blow`; and `postMessage` JSON so an external agent (or another window) can drive it. `describe()` returns a plain-text account of the current memory for an agent to read.

## Roles (parallel swarms)
1. AUDIT — studies every page named above plus orb-pro-5 and secondhand-motion; writes AUDIT.md: for each, what to keep (exact elements, files, line ranges), what fails and why (measured: input-to-visible-change latency, controls with no effect, legibility at 390x844), and the shared base they use. Fast first pass in ~30 min so builders can use it; then deeper.
2. CORE — state, ops, bus, device mapping (start from hand-orb-v5.html's device, the most usable), agent API, undo/history, tests (node) and the tool shell index.html: phone layout view on top, device below, no page scroll, no emoji, plain labels.
3. SCENE — the renderer that draws the state believably (studio.html and weaver.html are the looks the user likes; FILM-BAR.md is the bar; adopt ../swarms/shared/look.js and holo.js when they exist). Every op must have a visible consequence; owns `scene/*.js` and the landing-page backdrop proposal (weaver-style, behind the main page: experiments/orb-tool/landing-backdrop.html).
4. AGENT — the agent side: the text command language and its parser, `describe()`, a node + Playwright agent harness that builds a whole birthday memory through the agent API, a co-working demo (agent proposes, scripted hand accepts/turns on the device), and an MCP-style JSON-RPC bridge stub documented for real agents. Owns `agent/*`.

## Rules
Write only your own files. Scratch only under the shared scratchpad in a subfolder named for your role (orb-tool-<role>); never delete anything outside it. Film frames never enter the repo. Do not git commit. Literal plain prose; never claim runs that did not happen. Playwright: Chromium preinstalled, require('playwright') works, never reinstall.

## Acceptance (independent critic, later)
A person on a phone and an agent through the API, together, make one birthday memory from nothing to the blow in under 3 minutes; every input changes the scene within 100 ms; the critic names no control without authority; the side-by-side strip with the film passes FILM-BAR.md.

# EVOLVE-ALL — one memory, every part evolved

## What the user asked for (verbatim, Nov 6 2026, 03:19)
"we dont evolve the writing or the candles and we dont evolve the people or the table we need better swarms and evolve the ui that evolves these others"

Read also: ../BRIEF-3D.md (3D, the whole cake made on screen, no faces, played on the memory orb's device, the memory's look, sound). Earlier evolution swarm (cake only): ../evolve/ (evolve-core.js, index.html, refs.json, README.md, critic notes if present). Reuse what works there.

## The idea
Everything in Ana's birthday memory is grown, not placed: the cake, the inscription 生日快乐, the seven candles and their flames, the table, the people (faceless), the room light. Each part is an **evolver module** with its own genome, its own 3D build, its own fitness against references collected from the film. A **host** puts them all in one 3D scene and is played with the memory orb's device. The host's own interface is also a genome: **the UI that evolves the others evolves too** — its control mapping, step sizes, which part is offered next, how variants are laid out — selected by how well the player does with it.

## Module contract (plain JS, UMD like ../evolve/evolve-core.js, works in node for tests and in the browser as window.EVOMOD[name])
```
{
  name: 'candles',                 // cake | inscription | candles | table | people | light
  genes: [[key, group, min, max, default], ...],   // named, bounded, real-valued
  groups: ['SHAPE', 'COLOUR', ...],                // trait groups the device's SELECT can target
  stages: [[label, measure, threshold], ...],      // ordered; a stage is passed when the measure >= threshold
  blank(): Float64Array,                           // the primitive start (a disc, a stick, a block, a post ...)
  evaluate(G, refs): { fit, parts: {...} },        // 0..1, deterministic, node-safe (no DOM, no THREE)
  build(THREE, G, opts): THREE.Object3D,           // the 3D form; opts.t (0..1) = how far made (for the making animation)
  making: [[label, from, to], ...],                // the on-screen making steps (e.g. pour, set, pipe, write stroke 3, place candle 5)
  anchors(G): { name: [x,y,z] }                    // where other parts attach (cake top centre, candle wicks, table top, hands)
}
```
Breeding is shared and lives in `core/breed.js` (the host owner writes it, adapted from ../evolve/evolve-core.js breed(): seeded mulberry32, elitist, sigma per group, bias toward a group). Modules never breed themselves.

Module relations (anchors): the table supports the cake (cake base on table top); the cake supports the inscription (on the cake top) and the candles (wicks on the cake top, seven); people stand around the table (feet on the floor, hands toward the cake). When a supporting part changes, dependent parts re-attach; a dependent part's fitness includes its fit to its support (a candle that floats or sinks fails).

## References
Collect from /home/claude/stelline-work/film/memory.mp4 (party scene 128-245 s; cakes 138-148 s; inscription written 144.95-147.4 s; candles throughout; table: the hexagonal table; children 152-166 s and 213-217 s, at distance / from behind for posture and clothing only). Keep frames in /home/claude/stelline-work/evolve-all-refs/ (never in the repo). In the repo, `refs/<module>.json` holds only numbers (outlines, proportions, palettes, stroke paths) with provenance. People references must contain no facial data.

## Folders
experiments/swarms/evolve-all/
  CONTRACT.md (this)
  core/breed.js            — host owner
  modules/<name>.js        — one owner per module
  refs/<name>.json         — that module's owner
  tests/<name>.test.js     — that module's owner (node; deterministic; fitness monotone under elitism; blank -> threshold within N generations for each stage; anchors consistent)
  index.html, ui/*.js      — host owner
  proof.mp4, operator.html, README.md — host owner (each module owner adds a section file docs/<name>.md)

Only write inside your own files. Do not git commit or push. Literal plain prose; never claim runs that did not happen. Film frames never enter the repo.

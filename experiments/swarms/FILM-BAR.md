# The film bar — shared by every swarm from Nov 6 2026, 03:57

## What the user said (verbatim)
"we need better swarms that are also in paralele evolving the ui to be more like the film references and as good as the other functional ones we have this one is not ever beleieable it amde all of tis."

Meaning, literally:
1. The results so far are not believable as the film's memory. Making the whole cake is not enough; it has to look like Ana's memory in Blade Runner 2049.
2. In parallel with the birthday swarms, the **UI** must be evolved toward the film's references: the hologram UI seen in the scene (the segmented C arc with its stepping index mark at candle height, the typing readout of tiny lines, the radial needle and dotted tick, the small arcs with leader lines on arriving children, the projected round spots, the switch-off like banks of neon) and the device itself (knurled rings, the full-circle numbered scale 220/255/280/300, SELECT on the grip, condensed grotesque type, chrome band).
3. The bar is the functional versions we already have: ana/index.html and cineosis-orb/index.html in this repo. New work must be at least as usable and as finished as those, not a lesser demo.

## Two shared modules, evolved in parallel and used by all swarms
- **experiments/swarms/shared/look.js** — the memory's look: colour grade, candlelight warmth and falloff, true-black, the projected-spot screen, bloom on flames, film grain, depth of field, materials for sponge, icing, cream beads, chocolate, candle wax, red piping. Tuned (evolved) so rendered frames match measured statistics of the film's party frames (per-region Lab means and spreads, red/blue ratio of the lit cake region ~3.8 at 146 s, luminance histogram, highlight bloom radius, spot screen frequency). API: `LOOK.apply(renderer, scene, camera, opts)`, `LOOK.material(kind, opts)`, `LOOK.post(composerOrNull)`, `LOOK.stats(canvas)` for tests.
- **experiments/swarms/shared/holo.js** — the hologram UI and the device, rebuilt from the forensic dossier, evolved to match the film's crops (shape, stroke weight, segment counts, colour, flicker, typing rate, index-mark step timing). API: `HOLO.arc(scene, anchor, opts)` with `.step(i)`, `HOLO.readout(...)` with `.type(lines)`, `HOLO.childMark(...)`, `HOLO.spots(...)` (switch on/off as round spots), `HOLO.device(canvas, opts)` returning the controller with ring/select/hold events and the 11.8/s machine, plus its sounds.

## References (never committed)
- Forensic crops and data: /home/claude/stelline-work/forensic/ (e-arc.jpg, e-arcseq.jpg, e-readout.jpg, e-letters.jpg, e-cake6.jpg, e-swap.jpg, e-shutdown.jpg, e-chrome.jpg, e-pov-*.jpg, arc-series.json, readout-series.json, events.json, motion.json, font/, device-dossier.html, memory-maker-dossier.html).
- Film: /home/claude/stelline-work/film/memory.mp4 (scene 128-245 s; forest close-ups near the start).
- Film-derived numbers may be committed (palettes, outlines, timings); film pixels may not.

## The believability test every swarm must pass (independent critic)
A side-by-side strip: the swarm's frame next to the film frame of the same moment (same framing as far as possible). The critic writes what gives the swarm frame away. Pass when the critic can name no more than one thing that clearly gives it away, and the measured stats are within the stated tolerances.

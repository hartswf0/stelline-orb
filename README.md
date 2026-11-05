◎ 1000 Small Futures

> **Tagline:** *Tools for thinking about media, narrative, belief, and culture*

**LEGOS Framework** (Legible Emergent Generative Ontological Systems) — A collection of 14 computational engines for systematic exploration, spatial reasoning, and temporal memory. Built as **anti-tools**: single-file HTML artifacts that expose their operations, invite modification, and resist extraction.

**What makes it different**: Natural language becomes spatial structure. One perspective becomes four. Linear chat becomes navigable timeline.

**Status**: Operational, evolving | **Latest**: [OLOG #002](OLOG_2025_10_24.md) (2025.10.24) • [OLOG #001](OLOG_2025_10_23.md)

---

## Overview

**1000 Small Futures** is a research project exploring computational tools that resist their own instrumentalization. We build **thinking instruments**—not apps, not products, but **media for analysis** that expose rather than conceal their operations.

### How It's Different from ChatGPT

| Feature | ChatGPT | LEGOS |
|---------|---------|-------|
| **Output** | Pure text | Text + spatial structure (9×9 grid) |
| **Memory** | Context window (then forgets) | Ring buffer (circular, graceful degradation) |
| **Exploration** | Single response path | 4 systematic directions (amplify, negate, retrieve, invert) |
| **Viewpoints** | One narrator | Multiple entity perspectives |
| **Time** | Linear chat | Navigable timeline with temporal queries |
| **Structure** | Unstructured | Scene graphs as knowledge graphs |

**Core innovation**: Language becomes spatial structure. You can query "Who is near Clancy?" or "What blocks the path to Acceptance?" This is neurosymbolic—neural interpretation grounded in symbolic structure.

### Core Components

1. **Ring Memory System** (`thousand-ring.html`) — Circular buffer with graceful degradation, temporal indexing, "chat across time" queries
2. **Tetrad Analyzer** (`thousand-tetrad.html`) — McLuhan's Four Laws engine with 57 scenarios across 12 categories
3. **Belief Formation Simulator** (`thousand-lives.html`) — Agent-based model applying Bret Victor's "Media for Thinking the Unthinkable"
4. **Session Viewer** (`session-viewer-filmic.html`) — Spatio-temporal control surface for navigating LEGOS sessions
5. **Cartridge Browser** (`CARTRIDGE_BROWSER.html`) — Scenario navigation with retro game aesthetic

### Design Principles

* **Tools should expose their operations** — No black boxes, clear code, visible telemetry
* **Interfaces should invite modification** — Single-file HTML, forkable, hackable, remixable
* **Computation should know its limits** — Memory-aware, graceful degradation, adaptive capacity
* **Documentation should be theory** — Every document makes claims, asks questions, generates insight

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/[username]/1000-small-futures.git
cd 1000-small-futures

# Open the project manifest
open index.html

# Or open any engine directly
open thousand-ring.html      # Ring memory system
open thousand-tetrad.html    # Tetrad analyzer
open thousand-lives.html     # Belief simulator
```

**No build step required.** All engines are single-file HTML with embedded CSS and JavaScript.

---

## Documentation

* **[OLOG #002](OLOG_2025_10_24.md)** — Tetrad as latent space navigation, neurosymbolic translation, framing problem (2025.10.24)
* **[OLOG #001](OLOG_2025_10_23.md)** — Synthetic anthropology field note, ring buffer as computational orality (2025.10.23)
* **[LOGOS as Center](logos-center.html)** — LEGOS as universal information framework; theories as instantiations of the same LOGOS pattern
* **[Theoretical Correspondences](theory-map.html)** — How LEGOS implements Metabolarum, Media Thermodynamics, MYTHOSLOG, Myth-OS, and LLMA
* **[Scenario Generator](scenario-generator.html)** — Universal prompt template to turn any topic into a LEGOS scenario
* **[Scenario Library](SCENARIO_LIBRARY_DOCS.md)** — Complete documentation of 57 scenarios
* **[Data Architecture](DATA_ARCHITECTURE.md)** — System architecture and design decisions
* **[Ring Buffer Summary](THOUSAND_RING_SUMMARY.md)** — Ring memory system documentation
* **[Viewer Redesign](VIEWER_REDESIGN.md)** — Session viewer redesign notes

---

## Theoretical Substrate

### McLuhan's Four Laws (Applied to This Project)

**ENHANCES**: Thinking about media effects, recursive analysis, temporal reasoning, multi-channel narrative tracking

**OBSOLESCES**: Linear documentation, passive log viewing, single-perspective analysis, static knowledge bases

**RETRIEVES**: Oral tradition's circularity (ring buffer), film editing's tactile control (timeline scrubber), game cartridge's modularity (scenario system), field notes' observational stance (OLOG)

**REVERSES INTO**: Tools that resist toolification, software that exposes its seams, interfaces that invite modification, documentation that's also theory

---

## Original Inspiration (Thousand Lives Simulation)

### 1) World / Environment Structure

* **Setting:** A cluttered, sunlit apartment interior with ambiguous objects—grapes, jars, bottles, spiky urchins, food pellets, odd fruits, etc.; surfaces at multiple heights; dynamic day–night lighting and shadows. [1][5][6]
* **No Prescribed Meaning:** Objects are not labeled “food” or “danger.” Relevance is **emergent**, discovered only through interaction and experience. [5][6]
* **Disruption:** A human (Chalice) **appears sporadically**, acting like weather to disrupt routines and learned patterns. [1][5]

### 2) Agent Model (Thousand the Turtle)

* **Inferential / neuro-symbolic AI:** Learns what is relevant to its needs, constructs motives, adapts when expectations are violated. [5][1]
* **Needs / Drives:** Internal states such as hunger, warmth, rest, certainty, curiosity, and safety **compete** for priority and drive behavior. [5]
* **Perception & Belief:** Every object is first a mystery; beliefs (e.g., “grapes are nourishing,” “urchins are painful”) are formed via trial, error, and feedback, then **updated** when contradicted. [6][5]
* **Motives & Intent:** At any moment, Thousand intends to satisfy the most urgent need (eat / explore / flee / rest). **Motives shift** as needs are met or surprises occur. [5]
* **Emotion / Feedback:** The sim surfaces internal state—joy, pain, boredom, grief, curiosity—via on-screen overlays or expressive animation. [5]

### 3) Simulation Dynamics

* **Learning Loop:**
  `Perceive → Hypothesize → Act (bite/nudge/avoid/rest) → Feedback (pleasure/pain/indifference) → Update Belief → Adjust Behavior` [6][5]
* **Memory & Forgetting:** Occasional forgetting prevents full optimization and preserves unpredictability—agency is real but never total. [5]
* **Slow Story:** Unfolds over many days; **no fixed endpoint**. The drama is the open-ended process of learning, forgetting, and adapting. [1][5]

### 4) Interface / Presentation

* **Live Simulation:** Not pre-scripted; rendered in real time; every run is unique. [1][5]
* **Monitor / Overlay:** Charts show current needs, beliefs, emotions—inviting empathy and making reasoning **legible**. [5]
* **Camera:** Tracks Thousand, orbiting to keep frame; adapts to viewer perspective if interactive. [5]
* **Form:** *Live simulation, infinite duration, sound.* [2][3][8]

---

## Build Prompts / Blueprints

**Environment Prompt**

> “Generate a cluttered apartment with ambiguous objects (grapes, jars, bottles, spiky urchins, food pellets, ambiguous fruits). No object has a fixed meaning. Lighting cycles day→night with dynamic shadows. Occasionally, a human enters and disrupts the space.”

**Agent Prompt**

> “Create an AI turtle with internal needs (hunger, warmth, rest, certainty, curiosity, safety). The agent perceives objects, forms beliefs via trial/error, updates motives as needs shift, and revises beliefs when expectations are violated. The agent sometimes forgets to maintain surprise. Surface current need, belief, and emotional state visually.”

**Simulation Loop Prompt**

> “At each timestep:
>
> 1. Perceive environment, select an object of interest.
> 2. Act (approach, bite, avoid, rest) based on the most urgent need.
> 3. Receive feedback (pleasure/pain/indifference) and update belief.
> 4. If a human appears, adapt to the disruption.
> 5. Occasionally forget associations to preserve unpredictability.”

**Interface Prompt**

> “Display the turtle’s current needs, beliefs, and emotions on an overlay. The camera follows the turtle, adjusting to viewer perspective if interactive. The simulation runs continuously, with no fixed endpoint.”

---

## Implementation Notes

* **Environment Art:** Rich in affordances yet ambiguous in meaning; avoid explicit function cues.
* **AI / Behavior:** Inferential model: beliefs tested and sometimes forgotten; needs compete; motives shift dynamically.
* **Interaction:** Optional pause/inspect influence; always surface internal state for **interpretability**.

---

## Core Loop & State (reference)

```
Perceive → InferRelevance → UpdateBeliefs → SelectMotive → PlanMinimalAction
→ Act → ObservePredictionError → ReviseBeliefsOrMintNewMotive → (loop)
```

**Conceptual State:**

```json
{
  "beliefs": { "map": "sparse affordance grid", "certainty": 0.0-1.0 },
  "urges":  { "hunger":0-1, "warmth":0-1, "rest":0-1, "curiosity":0-1, "safety":0-1, "certainty":0-1 },
  "motive": "eat|warm_up|explore|avoid|rest",
  "emotion": "neutral|curious|tense|calm|pained|joyful|bored|grieving",
  "prediction_error": 0.0-1.0
}
```

---

## Quick Start (Web Prototype)

* **Stack:** Single-file `index.html` (inline CSS/JS). Optional CDNs: **Three.js** (scene), **Tone.js** (subtle audio).
* **Constraints:** No external fonts; honors `prefers-reduced-motion`; DPR clamp ≤ 2.

**Controls**

* Tap/Click: set waypoint (soft bias)
* Double-tap: toggle Cinema/Inspect
* Hold: Inspect mode; tap objects/agent for details
* Keys: `R` reseed, `P` pause, arrows nudge (debug)

**Success Criteria**

* Viewers can answer: *What is Thousand trying to do? Why? What changed?*
* > 30 FPS on modest hardware; conservative updates only on deltas
* Distinct behavior across seeds; visible adaptation to visitor/heat/leak events
* Self-checks at boot for movement conservation, belief updates, perturbation handling

---

## Attribution & Basis

**Primary exhibition basis**

* **Pilar Corrias, London (2023):** exhibition text pairing *Life After BOB: The Chalice Study* with **Thousand Lives** and framing the LAB world. [1]
* **Viewing Room artwork entry:** defines **Thousand Lives** as a simulation with an **inferential AI model** reconciling urges with affordances/threats; learning relevance; minimizing upsets; generating new motives—basis for our agent loop & HUD transparency. [2]
* **Artwork metadata:** **“Live simulation, infinite duration, sound.”** establishes continuous, unscripted runtime. [3]

**Independent documentation & reviews**

* **ArtReview (Thomas McMullan):** cluttered apartment; inferential AI; **Sisyphean** ongoing adjustment—basis for *slow story*, trial/error/feedback, and designed *forgetting*. [5]
* **Shuruq Tramontini (project page):** **no prescribed meaning** for objects; the agent **constructs motives** and learns by reconciling expectation and reality. [6]

**Subsequent showings / provenance**

* **Gladstone Gallery, Seoul (2024)** and **Matadero Madrid (2024):** confirm identity and live-sim format; program chronology. [8][4]
* **Artist/gallery listings:** further corroborate form and edition notes. [7][9]

**Reference list**

1. Pilar Corrias — Exhibition: *Thousand Lives* (2023): [https://www.pilarcorrias.com/exhibitions/350-ian-cheng-thousand-lives/](https://www.pilarcorrias.com/exhibitions/350-ian-cheng-thousand-lives/)
2. Viewing Room / artwork text: [https://pilarcorrias.viewingrooms.com/artworks/13309-ian-cheng-thousand-lives-2023/](https://pilarcorrias.viewingrooms.com/artworks/13309-ian-cheng-thousand-lives-2023/)
3. Artwork metadata (live simulation): [https://www.pilarcorrias.com/artists/39-ian-cheng/works/13309/](https://www.pilarcorrias.com/artists/39-ian-cheng/works/13309/)
4. Matadero Madrid program: [https://www.mataderomadrid.org/en/schedule/ian-cheng-thousand-lives](https://www.mataderomadrid.org/en/schedule/ian-cheng-thousand-lives)
5. ArtReview feature: [https://artreview.com/ian-cheng-thousand-lives-pilar-corrias-london-review/](https://artreview.com/ian-cheng-thousand-lives-pilar-corrias-london-review/)
6. Shuruq Tramontini project page: [https://shuruqtramontini.com/Thousand-Lives](https://shuruqtramontini.com/Thousand-Lives)
7. Korea Times coverage: [https://www.koreatimes.co.kr/lifestyle/arts-theater/20240303/ian-cheng-and-his-ai-turtle-with-thousand-lives](https://www.koreatimes.co.kr/lifestyle/arts-theater/20240303/ian-cheng-and-his-ai-turtle-with-thousand-lives)
8. Gladstone Gallery (Seoul) exhibition page: [https://gladstonegallery.com/exhibit/thousand-lives/](https://gladstonegallery.com/exhibit/thousand-lives/)
9. Ocula listing: [https://ocula.com/art-galleries/gladstone-gallery/artworks/ian-cheng/thousand-lives-(1)/](https://ocula.com/art-galleries/gladstone-gallery/artworks/ian-cheng/thousand-lives-%281%29/)

**Credit & fair-use note**

> Simulation concept and world framing inspired by Ian Cheng’s *Thousand Lives* (2023). Exhibition texts © Pilar Corrias; images and installation documentation © the artist and respective galleries.
> This project references public exhibition materials for scholarly/transformative purposes (interface research & simulation prototyping). All trademarks and artworks remain the property of their respective owners.
> **No affiliation:** This prototype is an independent homage; it is neither endorsed by nor affiliated with Ian Cheng, Pilar Corrias, Gladstone Gallery, or associated institutions.

---

## Project Status

**Active Engines**: 14  
**Documentation**: 9 files  
**Latest Update**: 2025.10.23.05:36 UTC-04:00  
**Status**: Operational, evolving

### Recent Changes

* **2025.10.23** — Ring buffer infinite recursion bug fixed, session viewer redesign in progress
* **2025.10.22** — Tetrad analyzer with 57 scenarios operational
* **2025.10.21** — Ring memory system integrated with temporal indexing

See [OLOG #001](OLOG_2025_10_23.md) for complete field notes.

---

## Contributing

This is a research project, not a product. Contributions should:

1. **Expose operations** (no black boxes)
2. **Invite modification** (clear, hackable code)
3. **Generate theory** (documentation as ontology)
4. **Resist extraction** (local-first, no tracking)

Fork freely. Remix wildly. Question everything.

---

## License

* Code: MIT
* Documentation: CC BY-NC-SA 4.0
* OLOG format: Public domain

---

## Contact

This is a living project. The code is the theory. The interface is the argument. The system is the claim.

**Next OLOG**: TBD (when significant changes occur)

◎ ⋈ ▶ ⋔


---

## Studio V5 (`studio.html`): the orb-driven bug, birthday and child builders

A speculative artifact from *Blade Runner 2049* made real: Dr. Stelline's memory orb as a working design tool. Two builders, **BUG** and **BIRTHDAY**, render a procedural macro specimen live in the browser (PBR materials, depth of field, candle light, faceted compound eyes, instanced bristles, piped icing). The five coaxial orb rings edit the specimen's genome. A third mode, **FILM**, treats the whole 407-second footage as data: every second segmented, relief-modelled and addressable by the same rings.

```bash
python3 -m http.server 8095
# open http://localhost:8095/studio.html   (?m=bug | ?m=cake | ?m=film&t=179)
```

## V5 ATLAS (default engine)

| Mode | What you get |
|---|---|
| **BUG** | Procedural beetle: ommatidia, pseudopupil, mandibles, beaded antennae, 6 legs with a tripod gait, ~1,900 swaying setae, structural-colour chitin. Starts as the film's emerald carabid (`CANONICAL`). |
| **BIRTHDAY** | Procedural cake on the film's golden hex table: 1-3 tiers or fluted bundt, drips, piped rosettes, striped candles (one per year of age) with flickering flames that light the icing, piped inscription (CJK ok), balloons, smarties, sprinkles. Starts as the film's vanilla cylinder with red 生日快樂 and 7 wicks. |
| **FILM** | 407 s / 57 shots at 1 Hz: tracked segment ids, class and colour names, relief proxy, vector outlines, FILM / PARTS / RELIEF views, a per-segment model ladder (FLAT > GRADIENT > RELIEF > MOSAIC > FILM) and a "blind critic" that scores the model against the frame. |

**Practical output:** `DESIGN` drawer (name, age, inscription, sponge / icing / ink palettes, drips, balloons; bug: species, length, habitat, elytra pattern, jaw / legs / antennae) then `SNAPSHOT` saves a **spec card PNG** (render + spec + the palette of the film moment it came from), `LINK` copies a share URL that reopens the exact design, `SPEC` saves JSON. `REROLL` makes a new seeded specimen; `OTHERWISE` cycles the film's four counterfactual variants (SCARAB.AURUM, OBSIDIAN.VOID, HETEROCERA.SPLIT / kept bundt, dark ganache, rose crown).

### The orb is the interface

Rings (labels and readouts change with what is on the glass): **BUG** L1 HEX.FACET, L2 OPTIC.DOME (focus / aperture), L3 SETAE, R1 MAND.GAIT, R2 CHITIN.NM. **BIRTHDAY** L1 GEOM.SOLID (tiers), L2 WICKS.DOF, L3 BUNDT.PIPE, R1 STAGE.LUMA (candlelight to room light), R2 WIND.GLAZE. **FILM** L1 SOLID ladder, L2 FOCUS, L3 MORPH, R1 LUMA, R2 TINT.

Buttons: SELECT = next part (camera racks to it) · ENGRAM = new specimen (film: next chapter) · red dot = snapshot (hold: share link) · aux = switch mode (hold: back to film canon) · jog wheel = rack focus (film: scrub) · rocker = orbit / dolly · X-RAY = bug anatomy / **blow the candles** · speed dome tap = OTHERWISE · big red thumb = photo mode · M1-M4, LR1 tap = that ring seeks the film's canon, hold = spin · scale window = sound. Everything also has a key (`?` in the app lists them) and a screen-reader mirror.

Scene makes the interface: ring positions are the specimen's genome, the ◆ on each orb gauge is the film's canon, the orb's casing takes the scene's light (candle flicker included), and the accordion spread follows the shot scale. Interface makes the scene: every ring edit rebuilds or re-lights the specimen.

### The glass has no menus: the orb is the interface

Mode, tool, recipe, actions and outputs all live on the orb. **Aux button** = mode (film / bug / birthday / child). **Rocker ◀ ▶** = ring bank, **▲ ▼** = dolly. **SYSTEM bank:** L1 MODE, L2 TOOL, L3 RECIPE (cake recipes, or the film's OTHERWISE variants for bug and child), R1 ACTION (replay, reroll, gallery, otherwise, match, fit, undo, redo, blow, photo mode, sound, narrate, drawer, help, plus keep-clear / clear piping / snuff / light on cake), R2 OUTPUT (snapshot, 4K still, clip, share link, spec file). **Red dot** executes the selected action or output (in WRITING it types the letter). The orb's strip shows the mode, the bank tabs, the part, candle count, critic score and inverse-design progress.

### The orb designs everything (inverse design)

The drawer is a convenience; the orb alone can design any specimen. **Ring banks:** the rocker ◀ ▶ (or `PgUp`/`PgDn`, or the BANK tabs) switches five-ring banks. Cake: LENS, FORM (shape, finish, tiers, border, sides), SURFACE (sponge, icing, drips, topping, dust), CANDLES (type, age, layout, burn, party), WRITING. Bug: LENS, EYE, BODY, SURFACE. Child: LENS, LOOK. Discrete choices are detented rings; continuous ones are smooth. **Letter wheel:** in WRITING, L1 spins A–Z 0–9 space ⌫ and the red-dot button (or `Enter`) types the letter, so the orb types the name. **Inverse design:** `I` (or FIT, or hold the LR1 button) makes the orb turn its own rings, bank by bank, searching for the setting that best matches the film's frame; `Shift+I`, PHOTO, or dropping an image on the glass does it for your photo. The final ring positions are the recipe. Honest limits: the matcher scores coarse colour and layout at 96×54, so it finds the closest thing the engine can build, not a faithful copy; a full search takes about 5 minutes on slow software rendering.

### Cake engine

Build any cake from parts. **Bodies:** drum (tall cylinder), 12-gon polygon, opera slab, round tiers, square, heart, bundt, naked layers, cupcake tower. **Finishes:** crumb sponge, ridged buttercream, mirror ganache, naked layers with caramel, opera stripes. **Borders:** piped shells, beads, sugar crystals. **Sides:** orange slices, gold leaf. **Dust.** **Candles:** striped, braided, daisy, wax numbers from the age with drips, taper, tealight, sparkler, each in a holder; layouts auto / grid / row / arc / cluster. **Lettering:** real 3D piped tubes from a single-stroke font (A–Z, 0–9, & ! . - '), drawn stroke by stroke by the L3 ring; other scripts fall back to a texture. **Scene:** pure black void, no table, hero framing. **RECIPES** in the drawer rebuild five reference cakes (LUZ, BEA, IZZY, NIA, MARA); typing a name pipes it. Random genomes (`G` gallery) mix all of these.

### Authoring (key `D` opens the drawer; `C` cycles tools; `Z` undo / `Shift+Z` redo)

- **CANDLES tool:** click the icing to place a candle, click a candle to light or snuff it, shift-click to remove. The ghost candle turns red when too close to another and yellow when it sits on the writing; `KEEP CLEAR` moves candles off the inscription. Snuffed candles stop lighting the icing and leave a smoke wisp; `BURN` shortens candles in real time or ×6 until they gutter; all out = a wish is made.
- **PIPE tool:** draw freehand piping on the cake top (camera drops top-down); nozzle width slider; strokes are saved in the design and the share link, and undoable.
- **WRITING:** presets (English, 中文, 日本語, Español, Русский, Français), 5 scripts, 4 media (pipe, gel, chocolate, gold leaf), 4 layouts (top, arc, side, topper), ink colour, L3 ring reveals the piping stroke by stroke.
- **EYE STUDIO (bug):** 7 eye types, hex / square / round facets, density, size, bulge, colour, banding + band colour, cornea sheen, bioluminescence, symmetric or asymmetric. The key light follows the pointer so facets glint as you sweep, and the dark pseudopupil tracks the camera as in real compound eyes.

### Replay the film's beats (key `B`, or REPLAY)

Four moments Stelline lingers on, each choreographed so one event happens in three places at once: the orb ring turns, the screen answers, and a crescent reticle (arc opens with the ring's value, leader line to the exact thing changing, LOCK flash when the ring hits the film's value) follows. Drag the reticle's arc to turn that ring yourself.
- **THE EYE 0:29** L2 FOCUS racks while the camera dives; L1 resolves the facets.
- **THE WRITING 2:17** the cake spawns cold and ghostly (L1 solid, R2 warm), candles 3, 5, 7, then L3 pipes the inscription stroke by stroke with a glowing nozzle.
- **THE CHILDREN 2:32** cake solid; L1 materialises the film's children from ghost.
- **THE FACE 2:51** child portrait: ghost to solid, candle light up, rack focus flame to face, expression to blowing, then the flame goes out.
New builder **CHILD**: underlit faces, 6 skins, 6 hair colours, 5 styles, eye colour, expression neutral to blow. Inscription variants: 5 scripts, 4 media (pipe, gel, chocolate, gold leaf), 4 layouts (top, arc, side, topper), plus CJK presets. Candles: striped, taper, tealight, sparkler.

**Honest status:** the child faces are stylised and clearly synthetic; they are a working system with correct lighting behaviour, not film-grade faces. The bug and cake are better. The 'blind critic' trained classifier is not trained yet (features exist in `atlas-builder.js`); the gallery's quality score is a hand-written heuristic.

### Watch the film: the critic wired to the builders

`MATCH` (key `M`, or the big red thumb button on the orb) locks the camera to the film's own camera, draws the film frame on the left of a draggable wipe and your model on the right, and scores them every couple of seconds (SSIM, colour distance, edges, tone histogram) with plain-language notes ("model is brighter than the frame", "too warm"). `,` `.` step through the film. Reference frames: bug 0:33 (head-on macro), cake 2:34 (children round the cake). The cake canon includes the film's own children as cutouts (`FILM CHILDREN` in the drawer). Current scores for the canonical specimens: cake about 52-63 / 100 across frames 2:30-2:42, bug about 33-36 (the bug is the weaker match). These are honest baselines, not "indistinguishable".

### Blind-critic accessibility

`SOUND` sonifies the frame (pan = x, pitch = height, level = area, timbre = class) and gives each builder its own room tone, candle crackle, shutter and breath. `NARRATE` / `H` describe the frame, part or specimen aloud (aria-live + speech synthesis). Full keyboard control.

## How the film atlas was made (no ML downloads)

`SLIC` superpixels, greedy region merging on Lab colour, edge strength and a person mask (MediaPipe selfie segmenter + BlazeFace, both run offline from the pip wheel's bundled `.tflite`), boundary snapping at full resolution, Hungarian IoU tracking of ids within shots, a heuristic relief proxy (sharpness + person + vertical prior, flattened per segment). The ladder levels and class priors were measured offline by reconstructing each segment from progressively richer parameters and scoring SSIM. This is **classical CV, not SAM or MiDaS**: names such as `FOLIAGE` or `HAIR` are colour/position heuristics and can be wrong; relief is a proxy, not metric depth. Frames are 768x432, labels 480x270; load your own copy of the film (`FOOTAGE`) for live playback (it stays on your device).

## Legacy engines

`ENGINE` (in `?` help, or `?engine=v4`) still opens V4 SAM-RELIEF, V3, V2, V1 and the mobile / versions pages from the earlier work.

## Layout

`assets/atlas-core.js` segment-mesh renderer and film views · `atlas-hero.js` PBR + DOF macro renderer · `atlas-bug.js`, `atlas-cake.js` the builders (genome, geometry, labels, spec) · `atlas-ui.js` viewfinder HUD, drawer, orb operations, keys · `atlas-sense.js` sound and narration · `atlas-builder.js` film critic, ladder fit, legacy 2D stage · `assets/atlas/` data (`f/` frames, `l/` labels, `d/` relief, `atlas-data.js`).

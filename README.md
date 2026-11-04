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

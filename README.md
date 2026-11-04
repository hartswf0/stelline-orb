# Stelline Memory Orb (`stelline-orb`)

A speculative artifact from *Blade Runner 2049* made real: Dr. Stelline's memory orb as a working design tool. Two builders, **BUG** and **BIRTHDAY**, render a procedural macro specimen live in the browser (PBR materials, depth of field, candle light, faceted compound eyes, instanced bristles, piped icing). The five coaxial orb rings edit the specimen's genome. A third mode, **FILM**, treats the whole 407-second footage as data: every second segmented, relief-modelled and addressable by the same rings.

```bash
python3 -m http.server 8095
# open http://localhost:8095/   (?m=bug | ?m=cake | ?m=film&t=179)
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

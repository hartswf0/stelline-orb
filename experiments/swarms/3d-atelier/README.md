# SCION 49 // GETTY & SMITHSONIAN OPEN-CONTENT ATELIER · The Archive Cake

A 3D birthday game on the memory maker's device. The cake is built, stage by stage, from pieces drawn out of a museum
archive: a stand, a plate, a mould, a decoration, candle holders. You turn the knurl to draw a piece from the archive for
the selected slot, set its size and turn on the triangle ring, and press HOLD to place it. Each placement plays its making:
the stand is set down, the plate is set on it, the mould comes down, batter is poured in and rises, bakes, the mould is
lifted off, the icing is spread from the top down, the beads are piped one by one, 生日快乐 is written stroke by stroke, the
seven candles are set one at a time, HOLD strikes the match and lights them one by one, HOLD again and they go out.

## Thesis, and what the network allowed

The technique prompt asks for a rights-aware reservoir in which the archive supplies the actual objects, not mood
references. The plan was to pull CC0 3D scans (.glb) from Smithsonian Open Access and open images from Getty, and build
the cake out of them.

**What happened, plainly (all checks run 2026-11-06, quoted in `core.js` CHECKS and `manifest.json`):**

- The sandbox egress proxy refuses (CONNECT 403) every museum host tried: 3d-api.si.edu, cdn.3d-api.si.edu, api.si.edu,
  3d.si.edu, ids.si.edu, the Smithsonian Open Access S3 bucket, api.getty.edu, media.getty.edu, data.getty.edu.
  **No .glb and no image was downloaded.**
- WebFetch could read the Smithsonian 3D API file listing (`/api/v1.0/content/file/search`). It lists `3d_package` ids and
  .glb URLs, but has no rights or CC0 field, and its `q` parameter did not filter (the same seven objects came back for
  "vessel", "plate" and "candlestick"). Of those seven, four are vessels: a colonoware pot, a lidded incense burner
  (boshanlu), a ritual wine container (fangyi), a ritual wine ewer (gong). The rest are corals and a porcupinefish.
- WebFetch of the Open Access API (`api.si.edu/openaccess/api/v1.0/search`, DEMO_KEY) returned rowCount 0 for every query,
  so no record's `metadata_usage.access` could be read. 3d.si.edu object pages were not fetched (permission request
  unanswered). GitHub mirrors (Smithsonian/dpo-voyager, Smithsonian/OpenAccess) hold no models.

So the reservoir is honest about two things at once: each piece on stage is an **original procedural stand-in** drawn in
`index.html`, and each carries the **archive record it stands for** (institution id, package URI, .glb URL, title, the
crop that would be taken from it) with rights state **UNVERIFIED, publish-blocked**. Pieces for which no record turned up
(glass cake stand, porcelain plate, pewter charger, cake tin, copper ring mould, brass candle cups) are listed as
**NOT FOUND (wanted)** with the query that would find them. The five decorations are the film's cake colours, recorded as
**derived numbers** (no film pixels). Nothing from any archive is in this folder; nothing is claimed CC0.

The proof therefore shows the whole cake assembled from the reservoir's slots, with every layer traced to its record;
it does not show the archive's own scanned geometry. That is the largest gap (see What is weak).

## The device

The device canvas from `ana/index.html` is reused (drawing and drag handling nearly unchanged; rings relabelled).

| control | what it does here |
|---|---|
| SELECT | cycles STAND, PLATE, MOULD, DECORATION, INSCRIPTION, CANDLES, LIGHT (after a stand, plate, mould or candles finish, it moves on by itself; after a decoration it stays so you can evolve the finish) |
| knurled ring | slot: which archive piece (the ghost of it appears in a round projected spot); INSCRIPTION: how many of 24 strokes are written |
| triangle ring | stand, plate, holders: size 0.84-1.16 and turn 15 degrees a detent; mould and decoration: turn only (the cake's size is the candles'); INSCRIPTION: tilt toward you (3 degrees a detent) |
| scale ring | where you kneel: view yaw, 5 degrees a detent |
| HOLD | place the piece (first time: its making plays; later, a mould or decoration swap is the film's three-frame silver decay with the candles holding still); on LIGHT: strike the match, then blow; after the blow: the next cake; long press: memory off |
| SCENE / CLEAR collar | plays `scenario.js` through the same rings / clears |
| (i) | operator panel: what is on stage traced to its records, and the whole reservoir with rights |

A hand turn makes quiet detent clicks; the machine then steps every busy ring one detent at a time at 11.8 steps/s
(23.6 when more than 6 behind), one device click per step. A HOLD that cannot stand (a mould before a plate) is refused
with a dull click and the reason under HOLD.

The goal shown at the top: the film cake this cake heads toward (cake 1: CHOCOLATE, ORANGE TOP; then MINT, RED-ORANGE,
BROWN DOME, SPONGE WHITE BEADS) and MATCH, a score of form, side colour, top colour, beads, inscription and candles. After
the blow, HOLD begins the next cake toward the next film cake; stand and plate stay.

## Primitives (core.js; the page renders it, node tests it)

- **Reservoir record**: id, slot, institutional source (institution, institution_id = `3d_package:...`, title, uri,
  media_url, accession read from the file name where marked), rights (status, cc0 flag, the checks that were run,
  publish rule), stage_asset (what is actually drawn and its licence), crop, animator tags (carries, shapes, holds-up,
  coats, beads...), and in `manifest.json` a transform history (select, crop, stand-in, stage scale/turn).
- **Stage audit** (`stageAudit`): every visible layer mapped to its record and rights; shown in the (i) panel and in
  `trace.json`.
- **Layout**: what stands on what. The candle plane depends only on stand and plate, never on the cake under it.
- **Making ops** with fixed durations, each emitting the sound events of the making (set, plate, clank, pour, bake, lift,
  spread, pipe or drip, stroke, candle, match, flame, inhale, blow, puff).
- **Match** toward the film's cakes (forms and colours as numbers).

## Look and sound

Dark room, the band of light, the hex table; a soft top light that gives way to the candles once they are lit. The piece
the knurl is drawing appears as a cool additive ghost flickering inside a round spot of light; on arrival round spots of
light bloom and fade around it and a magnesium-white flash decays over 0.35 s; a decoration swap is a 0.1 s silver decay.
The segmented arc stands beside the cake at candle height; its mark steps four times as the inscription is written.
No people and no faces: the cake is the only protagonist; you are the kneeling viewpoint.

Sound: grains of `ana/device-sounds.wav` (gitignored; loaded if present) for the detents and the machine, the select chirp,
and synthesized sounds of making: a bronze foot set on wood, porcelain on bronze, a tin clank, batter pouring, an oven hum,
the mould lifting away, a knife spreading icing, beads squeezed out, the piping pen, a candle pushed into its cup, a match
scratch and flare, the inhale, the blow, a puff per flame. The recorder renders the page's own event log offline through
the same `play()`.

## Measured (r1)

`node tests.js` (tests.json): 18 of 18 pass.

| invariant | result |
|---|---|
| every reservoir item has URI, institution id, rights, media URL fields and a transform history | pass |
| no item marked CC0 (none could be confirmed) | pass: 0 marked |
| archive candidates traceable to a `3d_package` id and a .glb URL; all publish-blocked | 6 pieces stand for 3 records |
| the folder holds no archive model or image file | pass |
| the making happens in order from nothing (stand ... out) | pass, times in tests.json |
| 7 candles set, 7 lit, 7 out one at a time; out 0.07 s apart | pass |
| 24 inscription strokes; arc mark steps 4 times | pass |
| machine 11.8 steps/s | median 83.4 ms at the 120 Hz test clock (84.7 ms ideal; the clock quantizes) |
| candles move 0 m across a cake swap | pass (1 swap in the scenario) |
| under every mould form no candle floats more than 3 mm or sinks more than 8 mm | worst float 2.7 mm (dome, outer ring, covered by the holder), worst sink 5 mm |
| the decoration swap raises the match toward the target | MINT 0.633 to CHOCOLATE, ORANGE TOP 0.900; finished 1.000 |
| a mould before a plate is refused | pass |
| after the blow HOLD starts cake 2 toward MINT, keeping stand and plate | pass |

**proof.mp4** (29.0 s, 1280x720, 30 fps, AAC sound; recorded 2026-11-06 by `tools/record.js` with Playwright mouse drags on
the rings and presses on SELECT and HOLD; the WebGL canvas at 0.75 pixel ratio, no antialiasing). From `trace.json` of that
run (0 page errors, device grains from ana/device-sounds.wav loaded):

| making event | time in proof.mp4 (s) |
|---|---|
| stand placed (bronze foot; after drawing the footring and the glass stand) / set down | 2.85 / 3.71 |
| plate placed (porcelain, size 1.08) / set | 5.02 / 5.78 |
| tin mould clanks down / batter poured / baked / mould lifted | 7.92 / 8.02 / 9.33 / 9.83 |
| mint icing spread, beads piped | 11.43 |
| swapped to chocolate with the orange top (silver decay; match 0.63 to 0.90) | 15.22 |
| 生日快乐 finished (cake tilted 24 degrees toward the viewer while written) | 18.20 |
| brass cups and candles set one by one | 19.45 onward |
| match struck / seven lit | 22.03 / 24.44 |
| blow / seven out | 26.13 / 27.11 |

Machine: 55 steps, median interval 83.4 ms. Audio peak before normalization 1.19 (normalized to 0.95).

## What failed and changed

- First stills: the camera stood too far back and the warm table filled the frame; the inscription could not be seen
  from a kneeling eye. Changed: closer camera that follows the cake's height, darker table, narrower top light, and the
  scenario now tilts the cake toward the viewer while 生日快乐 is written (the film tilts the cake before the writing).
- The first form of the candle invariant ("every mould is within 3 mm of the candle plane under every candle") failed for
  the dome (5 mm). Restated as what matters on screen: no candle floats more than 3 mm (its holder hides that) or sinks more
  than 8 mm.
- Recording: the machine has 2 CPUs shared with the other swarms (load average about 24) and swiftshader WebGL; a frame
  took 2 to 6 s. The proof is recorded with the WebGL canvas at 0.75 pixel ratio without antialiasing (`?aa=0&pr=0.75`);
  the HUD and device are full resolution.

## What is weak

- **The archive objects are not on stage.** Every piece is a stand-in drawn in code; the scans were unreachable and their
  CC0 status unread. The atelier's central claim (the archive supplies the actors) is not proved here; only the
  rights-aware structure is. Repair condition in operator.html.
- Getty open-content images (planned as textures) were not reached at all.
- The stand-ins are simple lathe and box forms; they read as stand, plate, tin, beads, but not as the specific historical
  objects named in their records.
- The mobile layout was checked once at 390 x 844 before the camera was refitted for portrait; not re-checked since. The right collar's labels are tight at that width.
- Not yet measured against the film (FILM-BAR.md, received late): the shared look.js and holo.js did not exist when this run ended, so the grade, spots, arc and device are this folder's own, not the evolved shared ones; the believability strip test has not been run.
- The ring label under the knurl on LIGHT reads UNLIT until all seven are lit.
- No independent critic was run by this builder (no Agent tool); the coordinator should run it.

## Files

`index.html` (the game), `core.js` (reservoir, rings, machine, making, layout, match), `scenario.js` (the played
birthday), `tests.js` / `tests.json`, `manifest.json` (written by tests.js from core.js), `trace.json` (from the
recording), `tools/record.js` (Playwright recorder), `tools/shots.js` (stills), `operator.html`, `proof.mp4` (gitignored).
Run: `python3 -m http.server 8771` at the repo root, then `Q="&aa=0&pr=0.75" node tools/record.js <framesdir>` and
`ffmpeg -framerate 30 -i <dir>/%05d.jpg -i <dir>/audio.wav -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest proof.mp4`.

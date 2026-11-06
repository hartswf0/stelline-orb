# Memory Maker videos: audit and beat-exact spec

Status: written while fal balance is exhausted. Nothing below has been generated yet.

## 0. Standing rules (every video, every cake)

1. **First-person POV of the Memory Maker, always.** The camera is Ana's eyes: her hands, the orb in them, the world she is making in front of her. No third-person or orbiting shots.
2. **The same memory orb controller in every frame.** Refs 06/07/08, never redrawn; the real panel is composited over generated frames.
3. **The same beats, in the same order, for every cake** (U1-U8 below). Cakes, kids and boys change; beats, timing and ring moves do not.

## 1. What references we already have (incl. archival birthdays)

| Set | Where | Use |
|---|---|---|
| Film beats | `assets/v6/moments.json` (keys are film seconds: 6, 7, 25, 26, 27, 29, 31, 36, 46) | The timing spine. Curves: `appear`, `tilt`, `icing`, `upright`, `flames`; ring/facet per beat |
| Controller stills | `assets/refs/06,07,08` (+ manifest roles) | Locked controller look: chrome barrel, knurled rings, engraved scale, red index |
| Our surfaces | `assets/refs/10-14` | Locked operator surfaces (weaver, panel, film page, pad, reticle) |
| Scene stills | `assets/refs/01-05,09` | Kneeling+orb, cake summoned, tipped, lettered, table+children |
| Archival birthdays | `assets/clips/stelline_birthday_craft.mp4` (94.5 s), `assets/shelf/cake_made_*` (24 named cakes), `cake_recipe_*` (5), `cake_film_*` (4), `assets/shelf/ref/` (216 cake refs), `assets/cake/c0-c8` | Cake variety already made; film-pixel cakes |
| People | `assets/boys/*` (6 boys, 960 px strips), `assets/girls/*`, `assets/cutouts/catalog.json` (plane/seat) | Kid placement at the table |
| Film plate | `assets/arcs` plate p_001-p_041, slabs, patch, snuff | Real table/room pixels |
| Sibling repo | cineosis-lab `lab/party`, `lab/atlas/frames` | More archival party scenes |

So yes: archival birthdays exist, and we have far more cakes than any generated clip has used.

## 2. How the generated clips miss the mark

1. **Controller drifts.** Text-only or single-image prompts make the model redraw the orb each clip; drums become ovals/dots. Fix: never ask the model to draw it. Composite our real panel/orb stills over the generated scene.
2. **No ring-to-world sync.** The ring turns on its own clock, the cake changes on another. Fix: drive both from one beat table (section 3) and cut generation into per-beat shots.
3. **One generic cake.** We have 24+ named cakes and 6 per-boy recipes (`party.html` CAKE table) but clips show one. Fix: one shot per cake, same movement.
4. **Kids not placed.** Children appear whenever. Film beat 29 fades them in; seats come from `cutouts/catalog.json`.
5. **10 s lumps.** Whole sequences are one prompt. Fix: units of 2-4 s, one change each, chained by last frame.
6. **Critics only compare stills,** so no render has ever been judged for motion. Fix: judge first/mid/last frame per unit plus a ring-delta check.

## 3. Beat table (one unit = one visible change, one ring move)

| Unit | Film s | Ring / facet | World change | Source of truth | Length |
|---|---|---|---|---|---|
| U1 | 6-7 | focus | beetle/bug eye comes into focus | moments 6,7 | 3 s |
| U2 | 25 | make / tilt (appear) | cake appears from nothing, tries frostings | curve `appear` | 4 s |
| U3 | 25-26 | make / tilt, bundt | cake tilts, becomes bundt, reticle turns with her hand | curve `tilt` | 3 s |
| U4 | 27 | make / icing | lettering 生日快乐 / name, then cake rights itself | curves `icing`,`upright` | 4 s |
| U5 | 29 | make / appear | children fade in, one per seat, left to right | `appear`, catalog seats | 3 s |
| U6 | 31 | time | her hands on the lens in the dark | moment 31 | 2 s |
| U7 | 36 | light | candlelight rises on the boy's face | moment 36 | 3 s |
| U8 | 46 | make / flames | candles go out, exposure falls | curve `flames` | 3 s |

The long transcript (0:00-6:39) must be aligned to these units line by line. That alignment still has to be done against the transcript text, which is not stored in the repo: paste it into `docs/transcript.md` and each dialogue line gets a unit id.

## 4. Many cakes on the same movements

Run U2-U4 and U7-U8 once per cake: 6 boy recipes (hair, tall, small, left, right, dark) plus 6-10 picks from `cake_made`. Same camera, same ring moves, same timing; only the cake and the boy at the back change. Units U5 differs per boy only in who is seated.

## 5. Locked UI rule

Every unit carries the same reference set: `06,07,08` for the controller and the one matching surface of `10-14`. For fal, pass them as multi-reference inputs (`tools/gen/multiref.py`; endpoint names there are unverified) and composite the real panel afterwards so the controller cannot drift.

## 6. Plan once balance is restored

1. Verify the multi-reference endpoint with one 3 s unit (U2) before anything else.
2. Generate U1-U8 for one cake; judge motion with first/mid/last frames.
3. Fan out to the other cakes only after the first set passes.
4. Stitch with ffmpeg; panel composited per unit; publish in `versions-film.html`.

Blocker: fal returns "User is locked. Exhausted balance" (top up at fal.ai/dashboard/billing). Offline alternative: render the same units from our own engine (arcs.html + party.html) with Playwright, which needs no balance.

## 7. First test (U2, 5 s, `assets/units/U2-vidu/`)

Endpoint `fal-ai/vidu/q1/reference-to-video` with refs 06, 07, 03 works (1920x1080, 5.4 s). `fal-ai/kling-video/v1.6/pro/elements` returned "downstream service error" with the same refs. Result: first-person hands, a chrome knurled barrel resembling the orb, cake appears from nothing in the dark with candles lit. Misses: the orb drifts down and away from her hands by the last second; the candles are already lit (the beat wants flames only at U7/U8); the barrel is camera-like, not yet the exact orb. Next: shorter 3 s units, "orb stays centred in both hands" in the prompt, 'candles unlit' and the real panel composited.

### U2 on `fal-ai/veo3.1/reference-to-video` (refs 06, 07, 03; 8 s, 1280x720) — better than vidu
First-person hands keep the knurled chrome orb centred for the whole clip, one hand turns the ring, the room is a long table with chairs, and the cake rises from nothing at the far end. Misses: candles are lit from the start (the beat wants them unlit until U7/U8), the table is longer than the film's, no tilt/frosting flicker. Veo is the endpoint to use for units; add "candles unlit" and keep refs 06/07/08.

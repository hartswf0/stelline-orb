# Brief for the 3D birthday swarms

Read this whole brief, then your own technique prompt (path given in your task).

## What the user asked for (verbatim, Nov 6 2026)
"these faces are all incredible creepy and it doesnt show the whole cake being made as well each is meant to evolve see the diea and mroe 3d. i would start up the swarms taht are 3d"
Earlier: "all must use the controller and be games played with the movile tool memory orb thats the game controller", and "we could evolve the heads until they match the references we collect and do the same for the cakes".

So every 3D birthday must:
1. **Be 3D.** three.js r128 (repo copy at ana/assets/three.min.js), real meshes, lit, viewable from the device's scale ring (viewpoint yaw, Ana kneeling). No flat cards as the main subject.
2. **Show the whole cake being made, from nothing to finished, on screen.** Base, tiers or dome, icing, decoration, the 生日快乐 inscription, the seven candles, lighting them. The making is the performance. A cake that simply appears fails.
3. **Evolve.** The cake (and anything else made) changes through stages or generations the viewer can follow; each stage is a consequence of the player's moves on the device. The film's seven cakes (chocolate with orange top, mint, red-orange, brown dome, sponge with white beads, and variants) are the reference set the evolution can head toward.
4. **No creepy faces.** No warped photographs of faces, no near-human sculpted faces, no uncanny heads. Children, if present, are either: seen from behind or at distance, stylized without facial detail (soft rounded forms, the way the film's projected memory reads at a glance), or the unaltered film cut-outs at a distance. The cake is the protagonist.
5. **Be a game played on the memory orb's device.** Reuse the device canvas from ana/index.html: three rings (scale = viewpoint yaw; knurl = selected thing's value; tri = tilt or time offset), SELECT (cycles targets), HOLD (commit / freeze; long press = switch the memory off). A hand turn makes quiet detent clicks; then the machine steps to the value at 11.8 steps/s (23.6/s only when far behind). Real click grains: ana/device-sounds.wav (gitignored; load it if present, otherwise synthesize). No plain buttons as primary input; an operator panel only behind (i). The game has a goal, a play state and an end (the candles lit, then the blow).
6. **Look like the memory.** Dark dome, true-black grade, warm candlelight, the round projected-spot look (memory switching on and off as round spots of light), magnesium-flash decay on a cake change. The hologram arc with its stepping mark beside the cake at candle height (see ana/index.html).
7. **Sound is part of the shot.** Detents, the 11.8/s machine, and sounds of making (piping, setting a tier, a candle placed, a match).

## Facts from the film (frame-by-frame forensic)
- Cake swaps: hard cut or 3-frame silver decay; candles stay within ~6 px across swaps. The cake tilts toward Ana (139.4-140.2 s); the brown dome arrives 141.6-141.9 s.
- 生日快乐 is written stroke by stroke (144.95-147.4 s), flourish, then the cake levels.
- A segmented C arc beside the cake at candle height; its index mark steps four times (-23/-19/-9/-1/+6 deg).
- Hand turn, then a fixed click train at ~11.8/s while nothing moves; smooth moves (tilt, tableau shift) are not stepped by clicks.
- Seven candles; the blow puts them out one by one.

## Rights
Film frames and audio are never committed or published. Film clip for reference only: /home/claude/stelline-work/film/memory.mp4 (party 128-245 s). Derived references (palettes, silhouettes as numbers) may live outside the repo in /home/claude/stelline-work/. CC0/open assets may be used with provenance recorded.

## Deliverables in your folder experiments/swarms/<yours>/
index.html (the game; mobile: view on top, device below, no page scroll; no emoji; literal plain labels), tests (node) for your declared invariants, a trace JSON, proof.mp4 (15-30 s with sound, recorded with Playwright: Chromium preinstalled, require('playwright') works, never reinstall; ffmpeg 30 fps; it must show the whole cake being made), operator.html (one-tap preview, revision, critic verdict, next blocking failure, links), README.md (thesis, primitives, measured results, invariants, what failed and changed, what is weak; honest evidence labels).

## Process
Hard proof first. If you have the Agent tool, spawn an independent critic that sees only this brief's expected experience and your outputs; otherwise say so (the coordinator runs it). Do not git commit or push. Only write inside your own folder and /home/claude/stelline-work/. Literal plain prose; never claim runs that did not happen. Budget roughly 60-90 minutes. Final report under 300 words: files, measured results, what is weak.

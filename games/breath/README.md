# The Breath

A game made from the birthday archive. You are the breath: carry it from flame to flame and put every candle out before they burn down. The next cake arrives with its own people. Five cakes make a sitting.

**Play:** `games/breath/index.html` (any static server). Mouse or arrows aim, hold Space (or press) to blow, R starts the cake again.
`?clip=bday_35` starts on a level, `?autostart` skips the title, `?seed=N` fixes which candles relight, `?look=camcorder90|clean`, `?endless`.

## How it was made: two loops, and what stood in for what

**Loop 1, [lovisdotio/video-to-game](https://github.com/lovisdotio/video-to-game) (MIT):** study the video, take every asset from its own frames, build one Three.js file, match the look, play it and film it.

| Step of that loop | Done here | With |
| :--- | :--- | :--- |
| Study the video | Yes | `tools/normalize/register.py`, `triads.py`: cake box, people mask, event time, palette, for all 77 clips |
| The mechanic is the video's | Yes | Every clip shows candles blown out, on a beat. The game is that. |
| Every asset generated on fal | **No** | fal answered every call with `403 User is locked. Reason: Exhausted balance`. `tools/games/fal_assets.py` holds the calls (concept, cut-out, image-to-3D, three sounds per level) and has not been run. `fal_log.json` does not exist because nothing was generated. |
| One file, Three.js only, pinned | Yes | `index.html`, Three.js 0.160.0 vendored in `games/vendor/three` (MIT) |
| `?autostart`, `?seed`, `window.__game.state` | Yes | |
| No text beyond a title and one controls line | Yes | Lung, beat and time are read off the crescent beside the cake |
| The agent plays it and films it | Yes | `tools/games/play.cjs`: keyboard only, reads only `window.__game.state` |
| Side-by-side with the video | Yes | `pairs/` |

**Loop 2, Video2Game (video to NeRF to mesh with collision to a browser game):** its project page could not be opened from this session (the host is outside the allowed network), so this follows the published method as I know it. It needs a moving camera for many views and a GPU to train the field; these clips are ten seconds from a locked camera, and there is no GPU here. What stands in:

| Stage of that loop | Stand-in |
| :--- | :--- |
| Reconstruct geometry from the video | The Memory Weaver builds the clip's recipe by its rings and the clay is exported: `levels/<id>/cake.glb` (`tools/games/export_levels.cjs`). A real mesh, but made from the clip's description, not reconstructed from its pixels. |
| Collision mesh | The cake is a cylinder collider taken from the model's bounds; breath that meets it goes over or round. |
| Physics | Each flame has heat that falls under the breath and returns when left; the breath is motes with velocity and drag. No rigid bodies. |
| Runs in the browser | Yes |

## What is in a level
`levels/index.json`: for each of the 33 kept clips, the model, where its candles stand, its size and tilt, its people (the eight-pose cast cut from its own frames, placed where they stood in the plate), and the grid. The camera stands where the archive's grid camera stands, so a frame of the game lines up with a frame of the plate.

## Checked
- **Played:** `takes/sitting.mp4` and `takes/sitting.json`: a script with arrows and space, reading only `window.__game.state`, plays a whole sitting of five cakes. Zero console errors.
- **Tuned by play:** the first take cleared five cakes in 25 s (too easy; one level had no candles). The second lost the same cake twice in 80 s (too hard). `play.cjs --dry` then ran whole sittings unfilmed in seconds to find the setting now in `TUNE`: five cakes in about a minute, each taking longer than the last, no losses for a precise player. A person will find it harder than the script does.
- **Compared:** `pairs/` holds the plate beside the game at the same spot in the bar for three clips. The first pairs showed the game's cakes dark on their sides; a front fill light was added and the pairs remade.
- **Not measured:** the take is stepped at 30 fps on a software renderer, so the frame rate on real hardware is unknown. Mouse, touch and sound were not exercised by the script.

## What differs from the videos
- The cakes are the recipe's reading of each plate (tiers, colour, border, candle count), not its exact decoration.
- The people are flat cut-outs with eight poses; the plate's own candles sometimes show on them behind the game's candles.
- The table and room are the orb's, the same in every level.
- Sound is short filtered noise made in the browser (a beat, a breath in grains, a flame going out). There is no music.
- One clip has no candles and is passed over in a sitting; it still opens with `?clip=`.

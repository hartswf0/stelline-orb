# Cineosis Orb

A memory is built from cut-outs and worked from the rings of an orb. Open `index.html` (live at `hartswf0.github.io/stelline-orb/cineosis-orb/`).

## What it holds (104 cut-outs, 24 cakes, 13 props)

| Shelf | From | How it was cut |
|---|---|---|
| FROM THE FILM | the three children in the Memory Maker scene | one frame, by hand-checked matte (stills for now) |
| CAST (33) | CINEOSIS · The Republic (`cineosis-lab/lab/republic/planes`) | SAM 2.1 tracked each archive figure for a few seconds; feet height kept |
| MOVING (32) | Secondhand Motion SAM shots (`secondhand-motion/shots/*-sam`) | Grounding DINO box + SAM 2.1 mask on every frame, 12 fps |
| STILLS (36) | CINEOSIS lab cut-outs (`cineosis-lab/lab/cutouts`) | SAM on single archive frames, the clearest people and objects |
| CAKES (24) | made here | presets of form, icing and border, each changeable |
| PROPS (13) | made here | plate, cake slice, fork, spoon, cup, glass of milk, party hat, present, bowl of berries, matchbox, napkin, balloon, streamer |

`tools/build_cutouts.py` makes every sprite sheet and `cut/catalog.json` (with each cut-out's source title, its frame grid, fps, height in metres, and the plane it belongs on).

## Planes

Every thing is on one plane, and the PLACE rings mean that plane's coordinates:
TABLE (across, depth) · FLOOR (across, depth) · AIR (across, up) · BACK, a glass plane behind the table as in a multiplane camera (across, up, distance) · FLAT on the table (across, depth, turn).

## The orb

- MODE cycles PLACE (where), STYLE (what it is like), VIEW (how it is seen); each mode lights the rings its own colour.
- Ring 1 always picks. Rings 2-5 are the picked thing's coordinates (PLACE) or properties (STYLE) or the camera (VIEW: preset, orbit, tilt, zoom, lens; FLY circles slowly).
- Squeeze the orb (push the ends together, pinch in) and every ring moves coarsely (×4); stretch it and they move finely (×¼).
- Flick a ring and it keeps turning, slowing like a flywheel.
- ADD opens the shelves (ring 1 the shelf, ring 2 the thing, shown as a ghost where it will go); ADD again puts it in. DEL takes out the picked thing. UNDO, hold to redo. PHONE shows a QR code; the phone becomes the orb.
- ICING PEN is an Etch A Sketch: ring 2 moves the pen across, ring 3 toward and away; with the pen down every turn is piped. DEL (or shaking the phone) clears it.
- THE ROOM has MIST (soft focus and haze, no particles) and MESS (crumbs and confetti on the table).

## Not yet

- The film's children are stills. To make them move, the clip's frames 2:32-2:36 need the same SAM 2.1 tracking the CAST and MOVING shelves had (`secondhand-motion/tools/wave2_track.py` on GitHub Actions); this session cannot run SAM.
- Cut-outs are flat cards that turn toward the camera; a figure seen from the side is a sliver. Depth maps exist for the MOVING shots (`depth/fNNN.png`) and could bend the card into relief.
- Only birthdays: the shelves are data (`cut/catalog.json`, `PRESETS`, `PROPS`), so other scenes need other shelves, not new code.

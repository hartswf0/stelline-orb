# What Ana does: the operations the footage shows

Source: "The Memory Maker" clip, seconds from the start of the clip. Seen = on screen. Inferred = our reading.

| clip time | seen | operation |
|---|---|---|
| 2:17.5 | a small cake hangs in the dark, left of Ana, who stands holding the orb | summon an object into the room |
| 2:18-2:20 | the same cake in three looks: brown frosting, then white with a blue cast, then white, then gold | swap the cake variant in place |
| 2:20-2:21 | the gold cake tips over on one side, lit from below | turn it in 3D |
| 2:21.5-2:24.5 | Ana kneels, orb in both hands, the cake lies tilted on the floor beside her; a faint crescent hangs between them | move the cake; the crescent is the first sight of the arc |
| 2:25-2:28 | over Ana's shoulder: the cake comes upright, candles on top, red lettering appears on the icing, the crescent sits beside it and changes between shots | set it upright, add letters, change the candles; the arc reads the object it is beside |
| 2:31-2:34.5 | Ana's face, lit by the candles, smiling | her reaction is part of the working view |
| 2:32.5-2:35.5 | the cake stands on a hexagonal table; three girls appear as ghosts, then solid; small round marks float above them | add people (fade in); a mark above each person |
| 2:39-2:42 | far wide shot, the table small, a reflection under it | the whole memory seen from outside |
| 2:42-2:44 | close on the orb in her hands, fingers working the rings | the hand operation itself |
| 2:52.5-2:57 | close-ups of the girls and a boy; the birthday girl breathes in and then blows | the performances we can retime |

Seen once, not understood: the crescent has no readable label in any frame; the marks above the girls are only glimpsed. What each does is our inference.

## Revised reading: lettering is its own operation

Stepped through frame by frame (clip 2:20-2:26): red icing builds stroke by stroke into 生日快乐, then a flourish underneath; the candles and the rim do not move while it builds; then the lettered cake tilts, with the lettering attached.
So three things are separate and testable: a mark added to a surface, the object turned with that mark on it, and a child's reaction retimed while both hold.
The side arc is on screen during both the lettering and the tilt, so it belongs to the cake as a readout of whatever the orb is on, more than to a variant picker. What it shows (version, surface, orientation) is our reading.
Open: whether the lettering is freehand piping, typed text, or a prepared inscription revealed in order; whether the tilt turns the cake or inspects the party from another side.

## What we build from it

`arcs.html`: Ana's working view of the moment before the breath.
- One arc, above and to the side of the cake, always on screen. Its inner tick reads what the orb is on: the cake's version (low, tall candles, homemade), its surface (the inscription building stroke by stroke), or its orientation (tilt, with the lettering attached). Rolling changes only that; the instant, the candles, the table and the view hold. "Eyes clear" is how much of the birthday girl's eyes the candles leave open from where the camera is.
- One arc above each child: a notch where the flame goes out, a marker where her reaction lands, a ring for where the party is now. Rolling shifts only her reaction; the cake holds.
- V moves the camera to the birthday girl's seat, and the same take is read from there.

What the footage does not give us: the candles going out (the clip cuts away), the third girl, and any label on an arc.

## Plate-based build (arcs.html, latest)

The default view of `arcs.html` is the film's own wide shot (213.15-216.55 s, 41 frames at 960x540 in `assets/plate/`) used as the base plate, so the table, the wall band, the horizon and the lit adult at right are film pixels. The six children are full-body cut-outs (`assets/slabs/`) laid over it; they appear only when a child's timing arc moves away from zero, so the retimed child replaces the original at her new time (the original shows through at her edges as a ghost).
The cake arc has a FILM detent (the plate's own cake) and three 3D cakes. A clean-plate patch (`assets/plate/patch.webp`, made by `tools/boys/cake_patch.py`) covers the film's cake when a 3D cake is selected. Lettering and tilt work on the 3D cakes only.
3D cakes now sit on the plate's table with warm light and a clean-plate patch under them; the film cake is the default.

## Generated cake (fal)

`assets/gen/cake_trellis.*` is an image-to-3D model (fal-ai/trellis, 4,798 vertices, baked texture) of the film's own cake, generated from a crop of the 213 s frame. It is the GENERATED detent on the cake arc in `arcs.html`. The generation key lives on the environment, not in the repo.

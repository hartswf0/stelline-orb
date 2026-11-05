# Stage and pad

`stage.html` is the second screen: a scene graph, a camera rig, a lens with real depth of field, an etch-a-sketch piping pen and a cake built from nothing.
`pad.html` is the handheld orb on a phone, held landscape: five rings, a thumb key, keys in the left housing, tilt, shake and a two-edge spread.
They pair by a four-letter room: same browser over BroadcastChannel, across devices over public MQTT relays (several at once).

Rings (always the same shape): 1-3 are the three axes of the current channel (MOVE x/y/z, TURN roll/pitch/yaw, SCALE, or ETCH pen x / pen y / assist).
Ring 4 moves down or up the scene graph; ring 5 steps through siblings. The selected node decides what rings 1-3 mean; the camera is a node (focal / focus pull / stop).
Thumb: CLUTCH (tilt drives the camera while held), PLACE (on the ADD palette), PEN (in ETCH).
Spread: two fingers on the barrel, pull apart / push together, scales the selected node (dollies the camera when it is selected).
Shake undoes the last stroke. NEXT PART jumps to the next item on the ADD palette so the whole cake can be built without leaving the rings.

The reticle on the stage is the film's: a segmented crescent that floats up and to the left of the selected thing. The two needles read rings 1 and 2, the small block on the band reads ring 3, and the tiny labels and code lines read the selection and what the rings just did.
The + pad on the handheld: up/down move through the scene graph, left/right step through siblings, the centre changes channel.

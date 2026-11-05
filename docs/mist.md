# Mist

`mist.html` plays the memory from 1:49 to 3:46 of the clip the way Ana says memory works: by what it felt like, not by how much of it there is.

**How it is made** (`tools/mist/segment.py`): every quarter second is clustered into 24 regions in colour and position (k-means seeded from the previous frame, so a region keeps its identity through time).
Each region gets a *felt* weight: how much of it is a person, how much is a small bright warm thing (a flame), how much edge it carries. Stored per frame: a 128x72 mosaic of region colours, a map of what was felt, and one number for the whole frame.

**How it is shown**: everything drifts and blurs. Only what was felt stays sharper, and warm felt regions glow. Hold a finger anywhere and that part of the memory comes back. The slider on the right moves from mist to data, where the same regions are shown as the blocks they are.

**Not in this clip, so not here**: the wooden horse memory. The clip has no horse footage; the horse assets in the repo are renders.

**Assets the project does not use yet**
- Audio: Ana's lines (the mist line at 4:16-4:27, imagination at 2:52-3:07). The feeling curve should come from her voice, not only from the picture.
- Motion: optical flow per region. Memory moves in gestures, not frames.
- Light: the candle's light as its own layer, apart from what it lights.
- Depth at more than one sample a second, so regions can be placed in space and the stage can fly through them.
- The horse memory footage itself, and the other memories the film shows (K's), as separate clips to segment the same way.
- The reticle as it appears in the film, as video, to match its motion to ours.

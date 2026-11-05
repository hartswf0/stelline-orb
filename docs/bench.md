# Bench: how the assets were made

- **People**: film frames (`assets/sec_156.jpg`, `sec_145.jpg`) cut with MediaPipe selfie segmentation (gamma-lifted for the dark frames). The table and cake were then masked out of the children's cut-out; the table is its own cut-out with the cake inpainted.
- **Trees**: `assets/stelline_frames/sec_050.jpg` split into far / mid / near layers using the atlas depth map (`assets/atlas/d/0050.jpg`), refined with a guided filter against the frame.
- **Leaf**: `sec_026.jpg` with the real beetle inpainted out.
- **Cakes (12) and bugs (9)**: rendered from the Three.js builders in `studio.html` (`ATLAS.hero`): 12-frame turntables. Bugs are matted by rendering on black and on white and solving for alpha. Eye macros are the compound-eye part framed without depth-of-field.
- Everything is stored as WebP strips in `assets/bench/`; `gallery.json` lists them.

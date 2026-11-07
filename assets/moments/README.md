# Reference clips cut from the film

Cut from *The Memory Maker* (Blade Runner 2049, open matte, 407 s) at the film's own shot cuts, by `tools/cut/cut_moments.py`.
Silent H.264 1280x720. These are inputs for style transfer / cloning-and-varying a memory, so **the Memory Maker (the orb in Ana's hands) is never in them.**

- `shotNN_*.mp4` — one clip per film shot with no orb in frame. Shots 25 and 26 (Ana holds the orb) are cropped to the cake only.
- `design_*.mp4` — 1.5 s windows at the exact frame each design on `designs.html` was made from.
- Left out on purpose: shot 6 (the orb close-up), shot 31 (hands on the lens), the forest shots where Ana holds the orb, the white-room dialogue.
- The reticle (the white crescent) is part of the film's scene and is visible in shots 26 and 27.
- `catalog.json` lists every clip with film time, tags and crop flag.

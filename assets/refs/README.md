# Reference pack for generating the Memory Maker UX video

`contact-sheet.jpg` shows all 14. `manifest.json` says what each one is for.

- **Controller (what must be buildable):** 06, 07, 08 are the film's orb: a round chrome lens-like barrel, knurled rings with engraved scales and red index marks, studs on the left, the barrel opening on the right.
- **Operator surface (the UI we build):** 10, 11 (Weaver), 12 (Film), 13 (pad), 14 (stage reticle).
- **Scene:** 01-05 and 09 from the original: the cake summoned in the dark, tipped, lettered, the crescent arc, the table and children lit by flames.

Run: `python3 tools/gen/multiref.py ENDPOINT out/ "prompt" --refs 06,07,08,10,11,01`

# Experiments

Scripts behind the pages and films in this repo, kept so every render can be made again.

- `maker/` builds `maker.html` (the lean memory maker): `gen.py` joins `head.html` and `body.js` with the orb parts taken from `weaver.html`.
- `film/` films the pages with Playwright at 30 fps and scores them:
  - `weave-film.js`, `encode.sh`, `cards.py`: the first weaver cake film (`assets/weaver/` has the results).
  - `guide-film.js`: the weaver's guided cake build (`assets/weaver/weaver-cake-guided.mp4`).
  - `cinema-film.js`, `shots.js`, `score.py`: the weaver's film view, its stills, and the synthesized score (`assets/weaver/weaver-cake-film.mp4`).
- `mist/`: the spacetime mist renders of the Memory Maker scene (`mist-renders.html`, `assets/mist/`).
- `film/cut-to-original.js`: the maker filmed from the kneeling eye, each act placed on a click in the original scene's sound (2:08 to 2:40 of the clip). The sound itself is not in this repo: it is the film's, so the encode step takes it from your own copy of the clip:
  `ffmpeg -ss 128 -t 32 -i memory.mp4 -vn -c:a aac original.m4a` then `ffmpeg -framerate 30 -i f/%05d.jpg -i original.m4a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a copy -shortest cut.mp4`.

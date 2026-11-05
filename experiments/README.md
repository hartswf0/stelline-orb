# Experiments

Scripts behind the pages and films in this repo, kept so every render can be made again.

- `maker/` builds `maker.html` (the lean memory maker): `gen.py` joins `head.html` and `body.js` with the orb parts taken from `weaver.html`.
- `film/` films the pages with Playwright at 30 fps and scores them:
  - `weave-film.js`, `encode.sh`, `cards.py`: the first weaver cake film (`assets/weaver/` has the results).
  - `guide-film.js`: the weaver's guided cake build (`assets/weaver/weaver-cake-guided.mp4`).
  - `cinema-film.js`, `shots.js`, `score.py`: the weaver's film view, its stills, and the synthesized score (`assets/weaver/weaver-cake-film.mp4`).
- `mist/`: the spacetime mist renders of the Memory Maker scene (`mist-renders.html`, `assets/mist/`).

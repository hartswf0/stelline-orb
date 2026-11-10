# PEOPLE — modules/people.js

Three to five children around the far half of the table. They are **faceless**: each head is a smooth form under a hair mass (crown, nape, a fall down the back, side curtains). No facial parts are built, and no face data is read or stored. The refs hold only clothing and hair boxes, sampled below the neck or on the crown or side of the head.

**API**: `name, genes, groups, stages, making, blank(), evaluate(G, refs), build(THREE, G, {t, stagger, refs|support}), anchors(G, refs)`, plus `pose`, `children`, `count`, `supportOf`, `named`, `DEFAULT_SUPPORT`.
- The table comes in through `refs.support`. Pass `table.top(G)` there. Without it, the module uses a default copy of the film's table.

**Genome (22, one group)**
- PLACE: count, arc, centre, dist.
- FIGURE: height, head, shoulders, variety, lean, tilt, onTable, freeLift, together.
- CLOTHING: clothLum, clothSpread, clothWarm, dress, hat, hairLen, hairVol, hairTone, hairSpread.

Each child is derived from the group genes through a fixed offset table. Children differ in height, bend, hip sway, clothing lightness and hair, without needing a gene per child.

**Stages**: PLACE place (support × placement) ≥ 0.8 · FIGURE figure ≥ 0.8 · CLOTHING palette ≥ 0.76.

**Fitness**
- Support: feet on the floor, clear of the table and of each other, and no hand inside the table.
- Placement: the far half of the table, spaced at least 30° apart, close to the edge.
- Figure: height = 1.79 × the table (inferred); head 0.167 and shoulders 0.25 of the height (inferred); a lean of 5° (measured); a head bend of 15° (inferred); hands on the edge for 2 of 3 children (measured at 155 s); and the children differ from one another.
- Palette: the lit clothing and hair, matched by brightness quantile to 7 clothing and 8 hair samples.

**Making (t)**: each child in turn grows legs → body → arms → head → hair, then the clothing colour wraps on.

**Measured**: 8 seeds, host settings. Generations needed per stage:
- PLACE: median 3, max 6
- FIGURE: median 17, max 24
- CLOTHING: median 18, max 23

**Weak**
- I have not rendered or reviewed it against the film. Whether the figures read as children rather than mannequins is unverified.
- Arms are cylinders with spheres at the joints.
- The bodies are lathe forms: no folds, no cloth simulation.
- The figures are seen from the front across the table, so the smooth faces show. The hair fringe covers the brow only.

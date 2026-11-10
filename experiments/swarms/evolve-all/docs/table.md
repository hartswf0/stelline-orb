# TABLE — modules/table.js

The party table: a pale, bare top with six corners, a thin edge, and nothing visible underneath. These come from the film at 155 s.

**API** (`window.EVOMOD.table` / `require`): `name, genes, groups, stages, making, blank(), evaluate(G, refs), build(THREE, G, {t}), anchors(G)`, plus `top(G)` → `{y, thick, sides, hex, rOut, rIn, stretch, yaw, verts}` (the numbers that `people` takes as `refs.support`), `edgeAt`, `named`, `CAKE_R` (0.12, the cake radius the proportions use).

**Genome (17)**: SHAPE hex (0 = square post, 1 = regular hexagon), stretch, yaw · SIZE radius, height, thick, foot · BASE legs, legW · COLOUR cloth (on above 0.5), cloth RGB, top RGB, legLum. The blank is a square post.

**Stages**: SHAPE silhouette ≥ 0.86 · SIZE frame (proportion × support) ≥ 0.8 · COLOUR palette ≥ 0.85.

**Fitness**
- Silhouette: the top is projected at 15° and compared with the traced outline, using √(IoU / (1 + (chamfer/0.02)²)).
- Proportion: cake-to-top width (0.35), height-to-width (0.61, inferred), and edge-to-width (≤ 0.017).
- Support: the table stands, and the cake fits on it.
- Palette: the colour of the lit top under a reference candle tint, and a dark base. The film shows nothing under the top: the measured luma there is 2.8.

**Anchors**: `topCentre`, `floor`, `topEdgeFront/Back/Left/Right`, and `topRadius` = [inscribed radius, top height, vertex radius].

**Making (t)**: the legs rise, the top comes down onto them, the colour arrives, and the cloth falls.

**Measured** (`node tests/table.test.js`). These runs use the host's breeder settings (σ 0.205, 8 children, bias to the stage group, later groups frozen, earlier stages kept), with a chooser that takes the best visible child. Over 8 seeds, generations needed per stage:
- SHAPE: median 5, max 12
- SIZE: median 11, max 19
- COLOUR: median 5, max 8

**Weak**
- The back edge of the traced outline is cut at row 455, because the cake and the children hide it.
- Height-to-width and the 15° elevation are inferred, not measured.
- A hex value of 0.4–1 projects almost the same outline, so "hexagon" is only loosely determined.
- The cloth skirt uses a 6-segment cylinder, so it fits the top exactly only at hex = 1.

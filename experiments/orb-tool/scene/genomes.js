/* ORB TOOL scene: the evolved parts' genomes the renderer builds from.
   Each is the best of a hill climb on the evolve-all module's own node fitness against its film-derived refs
   (experiments/swarms/evolve-all/refs/*.json; derived numbers only, no film pixels). Climb: 6000 evaluations (cake 1500),
   1-3 genes mutated per try, steps 30% of a gene's range for the first half then 8%. Fitness reached (0..1):
   table 0.964, inscription 0.992, candles 0.997, people 0.996, cake (reference 'cream', her cake) 0.971.
   The cake's colours, form, height, radius and layers come from the memory state; only its finish genes (frosting, borders, beads) come from here.
   Browser global SCENE_GENOMES; node module.exports. */
(function (root) {
  'use strict';
  const G = {
    table: { hex: 0.4714, stretch: 1.125, yaw: 0.6193, radius: 0.3602, height: 0.4191, thick: 0.0083, foot: 0.3731, legs: 3.4774, legW: 0.0419, cloth: 0.3025, clothR: 0.5328, clothG: 0.6814, clothB: 0.6397, topR: 0.7149, topG: 0.6834, topB: 0.4522, legLum: 0.0202 },
    inscription: { count: 1, order: 1, form: 1, curve: 1, wobble: 0, size: 0.0293, pitch: 0.0287, pressure: 0.0049, cx: 0.0297, cz: 0.0188, rot: -27.1767, fSpan: 0.0924, fDrop: 0.0265, fBack: 0.2911, fBot: 0.0674, r: 0.62, g: 0.1, b: 0.06 }   // colour: the climb's icing colour (0.75, 0.47, 0.19, measured relative to the top) read as orange on the lit top; set to the red of the 147 s frame,
    candles: { count: 7.393, ring: 0.0462, arc: 117.4658, mid: -122.9271, jitter: 0.3765, height: 0.052, thick: 0.0076, depth: 0.0098, striped: 0.4665, turns: 7.9867, cool: 0.282, cr: 0.8878, cg: 0.7556, cb: 0.5497, sr: 0.5769, sg: 0.3767, sb: 0, br: 0.831, bg: 0.8706, bb: 0.9473, wick: 0.1136, flame: 0.3444, fw: 0.4195, lean: 0.7831, flicker: 0.0765 },
    people: { count: 3.482, arc: 93.7882, centre: 4.4722, dist: 0.0682, height: 0.7679, head: 0.167, shoulders: 0.2499, variety: 0.5999, lean: 4.9981, tilt: 15.0114, onTable: 0.6277, freeLift: 0.1431, together: 0.047, clothLum: 0.4656, clothSpread: 0.8735, clothWarm: 0.3802, dress: 0.6682, hat: 0.0838, hairLen: 0.737, hairVol: 0.6172, hairTone: 0.075, hairSpread: 0.3908 },
    cakeFinish: null   // filled below from the cake climb
  };
  // climbed (reference 'cream', fit 0.971): frostTop 0.099, frostSide 0.219, spread 0.717, fill 0.228, border 0.032, foot 0, dome 0.19, layers 2.1.
  // Kept as climbed except border and foot, and frostSide lowered to 0.08 (the climbed 0.219 rendered as a rough bark under the key light), raised so the DECORATED stage has a visible piped border (the film's 155 s cake shows one).
  G.cakeFinish = { taper: 1.0, board: 0, bevel: 0.05, frostTop: 0.099, frostSide: 0.08, spread: 0.717, fill: 0.228, border: 0.12, foot: 0.3, beadL: 88, beadA: 1, beadB: 9 };
  // a genome array for a module from a named object (genes not named keep the module's blank)
  function arr(M, named) { const g = M.blank(); M.genes.forEach((d, i) => { if (named && named[d[0]] != null) g[i] = Math.max(d[2], Math.min(d[3], named[d[0]])); }); return g; }
  // the state's cake genome (core/SCHEMA.md: form, side, top, dots, height, radius, layers) -> the cake module's genes.
  // CAKE = the evolve-all cake module (it supplies srgb2lab and the gene table). Height is relative to the diameter in the module.
  function cakeGenes(CAKE, g) {
    const F = G.cakeFinish, hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), lab = h => { const c = hx(h); return CAKE.srgb2lab(c[0], c[1], c[2]); };
    const sd = lab(g.side), tp = lab(g.top), dome = g.form === 'dome';
    return arr(CAKE, Object.assign({}, F, { height: Math.max(.06, Math.min(.9, g.height / (2 * g.radius))), layers: g.layers, dome: dome ? .85 : 0, bevel: dome ? 0 : F.bevel, beads: g.dots * .32,
      sideL: sd[0], sideA: sd[1], sideB: sd[2], topL: tp[0], topA: tp[1], topB: tp[2], border: dome ? 0 : F.border, spread: dome ? 0 : F.spread })); }
  // the making: cake.stage 0..4 -> the module's making time t (0 nothing; 1 board, sponge layers, dome; 2 icing poured and spread; 3 borders piped; 4 beads set)
  const STAGE_T = [0, .44, .72, .86, 1];
  const API = { G, arr, cakeGenes, STAGE_T };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SCENE_GENOMES = API;
})(typeof window !== 'undefined' ? window : globalThis);

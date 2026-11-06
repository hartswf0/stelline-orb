/* ui/uigenome.js — the interface that evolves the parts is itself a genome, bred with the same core/breed.js.
   Genes: which ring does what (a permutation, so no control can vanish), detent size, machine step rate (snapped to the film's
   11.8/s grid, 5.9 to 23.6), variants per generation, their layout (ring, row, fan), which part is offered next, the readout layout,
   and where the strength ring starts. Fitness comes only from measured play: accepted generations, moves per accepted generation,
   reversals, idle time. The lineage is elitist: the elite survives unless a chosen variant measures better. Node and browser (window.UIG). */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(require('../core/breed.js')); else root.UIG = factory(root.BREED); })(this, function (BREED) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const RINGS = ['scale', 'knurl', 'tri'], ROLES = ['VIEW', 'STRENGTH', 'BIAS'];
  // the six ways to put three roles on three rings: PERMS[p][ringIndex] = role
  const PERMS = [['VIEW', 'STRENGTH', 'BIAS'], ['VIEW', 'BIAS', 'STRENGTH'], ['STRENGTH', 'VIEW', 'BIAS'], ['STRENGTH', 'BIAS', 'VIEW'], ['BIAS', 'VIEW', 'STRENGTH'], ['BIAS', 'STRENGTH', 'VIEW']];
  const LAYOUTS = ['RING', 'ROW', 'FAN'], OFFERS = ['FILM ORDER', 'WEAKEST FIRST', 'NEAREST FIRST'], READOUTS = ['SCORE AND BAR', 'GENERATION', 'ALL PARTS'];
  const RATE_MIN = 5.9, RATE_MAX = 23.6, RATE_GRID = 11.8 / 4;
  const UIMOD = { name: 'ui', groups: ['MAP', 'FEEL', 'BROOD', 'FLOW'], stages: [],
    genes: [['perm', 'MAP', 0, 5.999, 0], ['detent', 'FEEL', 4, 12, 9], ['rate', 'FEEL', RATE_MIN, RATE_MAX, 11.8], ['sigma0', 'FEEL', 0, 11.999, 9],
      ['lambda', 'BROOD', 3, 9.999, 6], ['layout', 'BROOD', 0, 2.999, 0], ['offer', 'FLOW', 0, 2.999, 0], ['readout', 'FLOW', 0, 2.999, 0]],
    evaluate: () => ({ fit: 0, parts: {} }) };   // a UI has no fitness of its own: it is measured from play (fitness() below)
  const defaults = () => BREED.defaults(UIMOD);        // the film's own device: knurl = strength, 11.8/s, six variants
  /* the primitive UI the lineage starts from (as every part starts from a primitive): fine detents, the slowest rate, three variants, no bar shown */
  const blank = () => Float64Array.from([0, 4, RATE_MIN, 11, 3, 0, 0, 1]);
  /* the safety net: whatever breeding does, the result is clamped back into bounds and the rate onto the film's grid */
  function safe(U) { const o = Float64Array.from(U); UIMOD.genes.forEach((g, i) => { o[i] = clamp(Number.isFinite(o[i]) ? o[i] : g[4], g[2], g[3]); });
    const ri = 2; o[ri] = clamp(Math.round(o[ri] / RATE_GRID) * RATE_GRID, RATE_MIN, RATE_MAX); return o; }
  function decode(U) { const s = safe(U), p = PERMS[Math.floor(s[0])], map = {}; RINGS.forEach((r, i) => map[p[i]] = r);
    return { perm: Math.floor(s[0]), roles: p.slice(), map, detent: Math.round(s[1]), rate: +s[2].toFixed(2), sigma0: Math.floor(s[3]), lambda: Math.floor(s[4]),
      layout: LAYOUTS[Math.floor(s[5])], offer: OFFERS[Math.floor(s[6])], readout: READOUTS[Math.floor(s[7])] }; }
  /* strength ring detent (0..11) -> mutation strength, 0.01 to 0.40 on a log scale (as ../evolve) */
  const sigmaOf = d => .01 * Math.pow(40, clamp(d, 0, 11) / 11);
  /* fitness of a UI from what the player did with it (all measured, none guessed) */
  function fitness(m) { if (!m || !m.gens) return 0; const acc = m.accepted / m.gens, mpa = m.moves / Math.max(1, m.accepted), rev = m.reversals / Math.max(1, m.moves), ipg = m.idle / m.gens;
    return +(.2 * acc + .2 * Math.exp(-mpa / 6) + .25 * (1 - Math.min(1, rev * 3)) + .35 * Math.exp(-ipg / 1.2)).toFixed(5); }
  function blankMetrics() { return { gens: 0, accepted: 0, moves: 0, reversals: 0, idle: 0, stages: 0, time: 0 }; }
  /* the lineage: elitist, logged */
  /* the lineage: elitist under noise. A small pool of measured UIs, each with the running mean of its scores; the elite is the pool's best by its mean shrunk toward zero (mean x n / (n + 1)).
     A UI's score is re-measured whenever it is played again, so a lucky single measurement does not hold the elite for ever. */
  const POOL = 4;
  function lineage(seed) { const L = { seed: seed || 7, round: 0, pool: [{ U: blank(), fit: null, n: 0, id: 'U0', parent: null }], nextId: 1, log: [], parts: {} }; L.elite = L.pool[0]; return L; }
  /* parts differ in difficulty, so a UI is judged against the mean of every measurement made on the same part (any UI): score = fitness - that mean;
     on a part's first visit the mean over all parts so far stands in (confounded by part difficulty until the part is played again) */
  function relative(L, part, f) { const ps = L.parts[part] || (L.parts[part] = { sum: 0, n: 0 }), all = L.all || (L.all = { sum: 0, n: 0 });
    const base = ps.n ? ps.sum / ps.n : all.n ? all.sum / all.n : f;   // first visit to a part: against the mean over all parts so far
    ps.sum += f; ps.n++; all.sum += f; all.n++; return +(f - base).toFixed(5); }
  function candidates(L, k) { k = clamp(k || 3, 2, 3); const r = BREED.breed(UIMOD, { G: L.elite.U, e: { fit: 0, parts: {} } }, { seed: L.seed, gen: 1000 + L.round, sigma: { MAP: .35, FEEL: .22, BROOD: .3, FLOW: .45 }, lambda: k - 1 }, null);
    return [{ U: L.elite.U, id: L.elite.id, elite: true }].concat(r.kids.map(c => ({ U: safe(c.G), id: 'U' + (L.nextId++), elite: false, parent: L.elite.id }))); }
  /* after a part was played with the chosen candidate: update its running mean (or enter it in the pool), and the elite is the pool's best */
  function record(L, cand, metrics, info) { const raw = fitness(metrics), part = (info && info.part) || 'any', f = relative(L, part, raw), before = L.elite.id, beforeFit = L.elite.fit;
    let m = L.pool.find(q => q.id === cand.id); if (m) { m.fit = m.fit == null ? f : (m.fit * m.n + f) / (m.n + 1); m.n++; } else { m = { U: Float64Array.from(cand.U), fit: f, n: 1, id: cand.id, parent: cand.parent || null }; L.pool.push(m); }
    const sh = q => q.fit == null ? -9 : q.fit * q.n / (q.n + 1);   // shrunk toward 0 by how few times it was measured: one lucky run does not take the elite
    L.pool.sort((a, b) => sh(b) - sh(a)); L.pool.length = Math.min(L.pool.length, POOL); L.elite = L.pool[0];
    const kept = L.elite.id !== before ? 'NEW ELITE' : cand.id === before ? 'ELITE RE-MEASURED' : 'ELITE KEPT';
    L.log.push(Object.assign({ round: L.round, played: cand.id, parent: cand.parent || null, ui: decode(cand.U), metrics: Object.assign({}, metrics), fitness: raw, relative: f, eliteBefore: before, eliteBeforeFit: beforeFit, outcome: kept, elite: L.elite.id, eliteFit: L.elite.fit, eliteUI: decode(L.elite.U), pool: L.pool.map(q => [q.id, q.fit == null ? null : +q.fit.toFixed(4), q.n]) }, info || {}));
    L.round++; return kept; }
  function inBounds(U) { return UIMOD.genes.every((g, i) => U[i] >= g[2] && U[i] <= g[3]); }
  return { UIMOD, PERMS, RINGS, ROLES, LAYOUTS, OFFERS, READOUTS, RATE_MIN, RATE_MAX, defaults, blank, safe, decode, sigmaOf, fitness, blankMetrics, lineage, candidates, record, inBounds };
});

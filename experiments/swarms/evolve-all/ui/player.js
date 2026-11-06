/* ui/player.js — two scripted players (CAREFUL, HASTY) and a node simulation of a part played through a UI genome.
   The same policy drives the device in the browser (index.html ?player=careful|hasty) and the simulation here; the gesture model
   (degrees turned, error, corrections) uses the device's own arithmetic: a ring's detent is round(angle / detent size).
   This is a model of two play styles, not a study of people. Node and browser (window.PLAYER). */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(require('../core/breed.js'), require('./uigenome.js')); else root.PLAYER = factory(root.BREED, root.UIG); })(this, function (BREED, UIG) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const STYLES = {
    careful: { name: 'CAREFUL', gesture: 6, err: 1.5, react: .9, turnTime: .3, thumb: 'knurl', waitsAll: true, compare: { RING: .14, ROW: .08, FAN: .11 }, strain: .012 },
    hasty: { name: 'HASTY', gesture: 0, err: 14, react: .35, turnTime: .2, thumb: 'tri', waitsAll: false, compare: { RING: 0, ROW: 0, FAN: 0 }, strain: 0 } };
  /* what strength the player wants (strength ring detent 0..11) */
  function wantStrength(style, ui, score, bar) { if (style.name === 'HASTY') return score > bar - .04 ? 8 : 11; const near = score > bar - .06; return !near ? 9 : ui.readout === 'SCORE AND BAR' ? 5 : 7; }
  /* the group to lean toward: the careful player leans toward the group named like the stage, the hasty one never leans */
  function wantBias(style, mod, si) { if (style.name === 'HASTY' || si >= mod.stages.length) return 0; const lab = String(mod.stages[si][0]).toUpperCase(); const gi = mod.groups.findIndex(g => g.toUpperCase() === lab); return gi + 1; }
  /* gestures (degrees) to bring a ring from angle a to detent goal; returns [{deg}] using the device's rounding. rnd: () -> gaussian */
  function gestures(style, a, goal, detent, rnd) { const out = []; let ang = a, guard = 0;
    while (Math.round(ang / detent) !== goal && guard++ < 40) { const need = goal * detent - ang;
      let g = style.gesture ? Math.sign(need) * Math.min(style.gesture, Math.abs(need) + detent * .5) : need; g += (guard > 1 ? .5 : 1) * style.err * rnd(); out.push(g); ang += g; }
    return { list: out, ang }; }
  /* simulate one part played with UI genome U by a style. Returns measured metrics (the same names the browser records). */
  function simulatePart(mod, refs, U, styleName, seed, opts) {
    opts = opts || {}; const style = STYLES[styleName], ui = UIG.decode(U), r = BREED.mulberry32(BREED.hash(seed, 99, mod.name, styleName)), rnd = () => BREED.gauss(r);
    const M = UIG.blankMetrics(), maxG = opts.maxGens || 160; let P = { G: BREED.blank(mod) }; P.e = mod.evaluate(P.G, refs); let si = BREED.stageOf(mod, P.e);
    const ring = { strength: { ang: ui.sigma0 * ui.detent, last: 0 }, bias: { ang: 0, last: 0 } }; let biasStage = -1;
    const turn = (key, goal) => { const R = ring[key], g = gestures(style, R.ang, goal, ui.detent, rnd); g.list.forEach(d => { M.moves++; M.time += style.turnTime; if (R.last && Math.sign(d) !== Math.sign(R.last)) M.reversals++; R.last = d; }); R.ang = g.ang;
      const roleRing = ui.map[key === 'strength' ? 'STRENGTH' : 'BIAS']; if (g.list.length && roleRing !== style.thumb) M.moves++; };   // reaching for the wrong ring first
    while (si < mod.stages.length && M.gens < maxG) { const bar = mod.stages[si][2], sc = BREED.measure(P.e, mod.stages[si][1]);
      const ws = wantStrength(style, ui, sc, bar); if (Math.round(ring.strength.ang / ui.detent) !== ws) turn('strength', ws);
      if (biasStage !== si) { biasStage = si; const wb = wantBias(style, mod, si); if (Math.round(ring.bias.ang / ui.detent) !== wb) turn('bias', wb); }
      const sig = UIG.sigmaOf(clamp(Math.round(ring.strength.ang / ui.detent), 0, 11)), bi = clamp(Math.round(ring.bias.ang / ui.detent), 0, mod.groups.length);
      const keep = mod.stages.slice(0, si).map(s => [s[1], s[2]]);
      const res = BREED.breed(mod, P, { seed, gen: M.gens, sigma: sig, bias: bi ? mod.groups[bi - 1] : null, lambda: ui.lambda, stage: si, keep }, refs);
      M.moves++;   // the HOLD that bred it
      const reveal = ui.lambda / ui.rate; let n;
      if (style.waitsAll) { n = ui.lambda; M.idle += n * (style.compare[ui.layout] + Math.max(0, ui.rate - 12) * style.strain) + style.react; M.time += reveal; }
      else { n = Math.min(ui.lambda, 1 + Math.floor(style.react * ui.rate)); M.idle += Math.max(0, style.react - reveal); M.time += style.react; }
      const pk = BREED.pick(P, res.kids, n, res.measure, keep); M.gens++; if (pk.bestIndex >= 0) M.accepted++;
      P = pk.best; const ns = BREED.stageOf(mod, P.e); if (ns > si) M.stages += ns - si; si = Math.max(si, ns); }
    M.time += M.idle; M.passed = si >= mod.stages.length; M.fit = +P.e.fit.toFixed(4); return M; }
  /* the browser policy: given what the device shows, the next thing the scripted player does */
  function next(styleName, v) { const style = STYLES[styleName];
    if (v.phase === 'uichoice') return v.since > (style.name === 'HASTY' ? .5 : 1.4) ? (v.choiceIndex !== v.want ? { kind: 'select' } : { kind: 'hold' }) : { kind: 'wait' };
    if (v.phase !== 'evolve') return v.phase === 'ready' && v.since > style.react ? { kind: 'hold' } : { kind: 'wait' };
    if (v.making || v.turning) return { kind: 'wait' };
    const ws = wantStrength(style, v.ui, v.score, v.bar); if (v.strength !== ws) return { kind: 'turn', role: 'STRENGTH', goal: ws };
    const wb = wantBias(style, v.mod, v.stage); if (v.bias !== wb && v.biasStage !== v.stage) return { kind: 'turn', role: 'BIAS', goal: wb };
    if (style.waitsAll) { if (v.revealing) return { kind: 'wait' }; return v.since > style.react + v.lambda * (style.compare[v.ui.layout] + Math.max(0, v.ui.rate - 12) * style.strain) ? { kind: 'hold' } : { kind: 'wait' }; }
    return v.sinceHold > style.react ? { kind: 'hold' } : { kind: 'wait' }; }
  /* which candidate the scripted player picks between parts: every third time it plays the elite again (a re-measurement), otherwise it explores one of the two new variants; elitism by measured play decides */
  const choose = (round, n) => round % 3 === 0 ? 0 : 1 + (round % Math.max(1, n - 1));
  return { STYLES, wantStrength, wantBias, gestures, simulatePart, next, choose };
});

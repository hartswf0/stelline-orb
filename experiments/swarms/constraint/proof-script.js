/* The birthday played on the device's rings, as a script (shared by the page's SCENE button, tests.js and render.js).
   Entries: [time s, 'turn', ring, detents, duration s] | [time s, 'select'] | [time s, 'hold'] | [time s, 'end'].
   'turn' spreads the detents over the duration like a hand turning (about 14 detents a second, a little faster
   than the machine's 11.8 steps a second, so the machine stays a few detents behind and steps at 11.8).
   The detent counts are computed here from the scene's geometry (the same numbers solver.js uses), so the
   script lights every candle by bringing it into her plane, not by luck.
   proof.mp4 is the first 10 s of this run; birthday.mp4 is the whole run. */
(function (root) {
  const REST = [-0.405, 0.68], DH = 0.015, DC = 0.015, DT = 5, TOP = 0.62 + 0.095 + 0.07;
  const A = k => (k / 7 * 360 + 0.3 * 180 / Math.PI), R = k => (k % 2 ? .052 : .088);
  const START = { handX: 18, handY: 9, cakeX: 14, cakeTurn: 25 };
  const st = Object.assign({}, START), S = []; let t = 0.4, sel = 'HAND';
  const turn = (ring, n) => { if (!n) return; const dur = Math.max(.25, Math.abs(n) / 14); S.push([+t.toFixed(3), 'turn', ring, n, +dur.toFixed(3)]); t += Math.abs(n) / 11.8 + 0.35; };
  const select = want => { if (sel !== want) { S.push([+t.toFixed(3), 'select']); sel = want; t += 0.3; } };
  const pen = (x, y) => { select('HAND'); const nx = Math.round((x - REST[0]) / DH) - st.handX, ny = Math.round((y - REST[1]) / DH) - st.handY;
    if (nx && ny) { const t0 = t; turn('knurl', nx); const t1 = t; t = t0 + .1; turn('tri', ny); t = Math.max(t1, t); } else { turn('knurl', nx); turn('tri', ny); } st.handX += nx; st.handY += ny; };
  // the turn (in detents) that brings candle k to the near side of the cake (angle 180), nearest to the current turn, forward only
  const align = k => { const cur = st.cakeTurn * DT; let need = ((180 - A(k) - cur) % 360 + 360) % 360; return Math.round(need / DT); };
  const cakeTurn = n => { select('CAKE'); turn('tri', n); st.cakeTurn += n; };
  const cakeSlide = det => { select('CAKE'); turn('knurl', det - st.cakeX); st.cakeX = det; };
  // 1. reach for the far side of the cake: she runs out of arm, the gap is shown
  pen(0.27, 0.815); t += 0.6;
  // 2. bring the cake toward her and turn candle 0 into her plane
  cakeSlide(-7); cakeTurn(align(0));
  // 3. the taper down onto that wick (the near side of the big ring of candles)
  const cx = () => st.cakeX * DC; pen(cx() - R(0), TOP);
  // 4. turn the cake under the held taper: the other three big candles come round to it, in order 6, 4, 2
  [6, 4, 2].forEach(k => cakeTurn(align(k)));
  // 5. the taper in to the small ring, then turn candles 1, 5, 3 to it
  pen(cx() - R(1), TOP); [1, 5, 3].forEach(k => cakeTurn(align(k)));
  // 6. take the taper away, kneel a little to the side, and HOLD: she blows them out
  pen(cx() - 0.30, 0.74); select('HAND');
  S.push([+t.toFixed(3), 'turn', 'scale', -4, 0.5]); t += 0.8; S.push([+t.toFixed(3), 'hold']); t += 2.2; S.push([+t.toFixed(3), 'end']);
  const API = { SCRIPT: S, START, DURATION: Math.ceil(t * 10) / 10, PROOF_DURATION: 10.0 };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.PROOF = API;
})(typeof window !== 'undefined' ? window : globalThis);

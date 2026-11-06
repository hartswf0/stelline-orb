/* ORB TOOL core: a minimal renderer so every op is visible until scene/ exists. A 2D canvas with a small perspective
   projection: Ana's eye kneeling around the memory (camera.yaw, camera.kneel), the cake at its making stage, the inscription
   written stroke by stroke, the candles, the table, faceless figures arriving, props, the dome's band of light, and agent
   proposals as cyan ghosts. Draws ORB.view() (the machine's stepped values). Interface as scene/: create(container, ORB) -> { frame(nowMs), resize() }.
   Browser global ORB_STUB_SCENE. */
(function (root) {
  'use strict';
  const S = root.CORE_STATE, O = root.CORE_OPS;
  const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a == null ? 1 : a})`, shade = (c, k) => c.map(v => clamp(v * k, 0, 255));
  const TABLE_Y = 0.5, SPONGE = [222, 190, 128], FONTCJK = '"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC","Microsoft YaHei",sans-serif';
  function create(container, orb) {
    const cv = document.createElement('canvas'); cv.style.cssText = 'width:100%;height:100%;display:block'; container.appendChild(cv); const c = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, last = performance.now(), off = 0, changeAt = -9, lastSel = null, focusPt = [0, 0.56, 0], cam = null;
    const clocks = {};   // each figure's own performance clock (seconds), stopped while held
    orb.on('change', () => { changeAt = performance.now(); });
    function resize() { dpr = Math.min(2, root.devicePixelRatio || 1); W = container.clientWidth; H = container.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    // ---- the camera: kneeling around the memory
    function setCam(v) { const a = v.camera.yaw * Math.PI / 180, D = 1.05, ey = 0.6 + (10 - v.camera.kneel) * 0.085;
      const f = v.camera.focus === 'cake' ? [0, 0.56, 0] : (() => { const q = v.people.concat(v.props).find(p => p.id === v.camera.focus); return q ? [q.x * .6, 0.6, q.z * .6] : [0, 0.56, 0]; })();
      focusPt = focusPt.map((x, i) => lerp(x, f[i], .12));
      const e = [Math.sin(a) * D, ey, Math.cos(a) * D], fw = norm(sub(focusPt, e)), rt = norm(cross(fw, [0, 1, 0])), up = cross(rt, fw);
      cam = { e, fw, rt, up, F: Math.min(W, H * 1.3) * 1.25 }; }
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    function P(p) { const d = sub(p, cam.e), z = dot(d, cam.fw); if (z < .02) return null; return [W / 2 + dot(d, cam.rt) / z * cam.F, H * .52 - dot(d, cam.up) / z * cam.F, z]; }
    function rot(p, piv, ax, ang) { if (!ang) return p; const v = sub(p, piv), c0 = Math.cos(ang), s0 = Math.sin(ang), k = ax, kv = cross(k, v), kd = dot(k, v);
      return [0, 1, 2].map(i => piv[i] + v[i] * c0 + kv[i] * s0 + k[i] * kd * (1 - c0)); }
    function poly(pts) { c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath(); }
    // ---- the room
    function room(v, look, light) {
      const bg = look === 'plain' ? '#1b1d1d' : v.scene.place === 'room' ? '#16120f' : v.scene.place === 'forest' ? '#06100b' : '#030404'; c.fillStyle = bg; c.fillRect(0, 0, W, H);
      // the floor ring and the band of light where wall meets floor
      const band = []; for (let k = 0; k <= 160; k++) { const a = k / 160 * TAU, q = P([Math.cos(a) * 7.5, .42, Math.sin(a) * 7.5]); band.push(q); }
      c.lineWidth = 1.4; c.strokeStyle = look === 'holo' ? 'rgba(80,220,230,.6)' : v.scene.place === 'forest' ? 'rgba(120,170,120,.5)' : 'rgba(223,232,228,' + (.35 + light * .06) + ')';
      c.beginPath(); let pen = false; for (const q of band) { if (!q) { pen = false; continue; } pen ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); pen = true; } c.stroke();
      if (v.scene.place === 'forest') { c.strokeStyle = 'rgba(70,110,80,.35)'; for (let k = 0; k < 28; k++) { const a = k * 2.399, r = 3 + (k % 5); const b0 = P([Math.cos(a) * r, 0, Math.sin(a) * r]), b1 = P([Math.cos(a) * r, 3, Math.sin(a) * r]); if (b0 && b1) { c.lineWidth = 6 / b0[2]; c.beginPath(); c.moveTo(b0[0], b0[1]); c.lineTo(b1[0], b1[1]); c.stroke(); } } }
      if (v.scene.place === 'room') { c.fillStyle = 'rgba(120,95,70,.10)'; const w0 = P([-3, 2.2, -3]), w1 = P([3, 0, -3]); if (w0 && w1) c.fillRect(Math.min(w0[0], w1[0]), w0[1], Math.abs(w1[0] - w0[0]), w1[1] - w0[1]); }
      const ring = []; for (let k = 0; k <= 96; k++) { const a = k / 96 * TAU, q = P([Math.cos(a) * 1.9, .002, Math.sin(a) * 1.9]); if (q) ring.push(q); }
      c.strokeStyle = look === 'holo' ? 'rgba(80,220,230,.35)' : 'rgba(60,70,66,.8)'; c.lineWidth = 1; c.beginPath(); ring.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke(); }
    // ---- the table: hexagonal, warm, comes up under the cake
    function table(v, up, look, ghost) { if (up <= 0) return; const top = [], bot = [], y = TABLE_Y * up; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; top.push(P([Math.cos(a) * .4, y, Math.sin(a) * .4])); bot.push(P([Math.cos(a) * .4, y - .03, Math.sin(a) * .4])); }
      if (top.some(q => !q)) return; const legT = P([0, y - .03, 0]), legB = P([0, 0, 0]);
      if (legT && legB) { c.strokeStyle = ghost ? 'rgba(56,214,224,.5)' : '#1a1612'; c.lineWidth = Math.max(2, .1 / legB[2] * cam.F * .5); c.beginPath(); c.moveTo(legT[0], legT[1]); c.lineTo(legB[0], legB[1]); c.stroke(); }
      for (let k = 0; k < 6; k++) { const k2 = (k + 1) % 6; poly([top[k], top[k2], bot[k2], bot[k]]); fillOr(look, ghost, [90, 62, 32], .9 * up); }
      poly(top); fillOr(look, ghost, [138, 98, 50], up); }
    function fillOr(look, ghost, col, a) { if (ghost) { c.setLineDash([4, 3]); c.strokeStyle = 'rgba(56,214,224,.7)'; c.lineWidth = 1.2; c.stroke(); c.setLineDash([]); return; }
      if (look === 'holo') { c.strokeStyle = 'rgba(90,230,240,' + (.5 * (a == null ? 1 : a)) + ')'; c.lineWidth = 1; c.stroke(); return; } c.fillStyle = rgba(col, a); c.fill(); }
    // ---- the cake, by making stage and genome
    function cake(v, look, glow, ghost, now) { const k = v.cake, st = Math.round(k.stage); if (st <= 0) return null;
      const g = k.genome, R = g.radius, Hh = st === 1 ? g.height * .8 : g.height, base = TABLE_Y, piv = [0, base + .05, 0], ang = k.tilt * 3 * Math.PI / 180, ax = norm([cam.rt[0], 0, cam.rt[2]]);
      const side = st === 1 ? SPONGE : hex(g.side), topc = st === 1 ? shade(SPONGE, 1.08) : hex(g.top), N = 48, lit = .55 + glow * .45;
      const W3 = (x, y, z) => P(rot([x, y, z], piv, ax, ang));
      const prof = g.form === 'dome' && st > 1 ? Array.from({ length: 8 }, (_, i) => { const a = i / 7 * Math.PI / 2; return [R * Math.cos(a) + .001, base + .02 + (Hh - .02) * Math.sin(a)]; }) : [[R, base], [R, base + Hh]];
      if (g.form === 'dome' && st > 1) prof.unshift([R, base]);
      // side bands, back to front
      const quads = [];
      for (let j = 0; j < prof.length - 1; j++) for (let i = 0; i < N; i++) { const a0 = i / N * TAU, a1 = (i + 1) / N * TAU, am = (a0 + a1) / 2, [r0, y0] = prof[j], [r1, y1] = prof[j + 1];
        const n = rot([Math.cos(am), 0, Math.sin(am)], [0, 0, 0], ax, ang), mid = rot([Math.cos(am) * r0, (y0 + y1) / 2, Math.sin(am) * r0], piv, ax, ang); if (dot(n, sub(cam.e, mid)) < 0 && g.form !== 'dome') continue;
        const q = [W3(Math.cos(a0) * r0, y0, Math.sin(a0) * r0), W3(Math.cos(a1) * r0, y0, Math.sin(a1) * r0), W3(Math.cos(a1) * r1, y1, Math.sin(a1) * r1), W3(Math.cos(a0) * r1, y1, Math.sin(a0) * r1)]; if (q.some(p => !p)) continue;
        quads.push({ q, z: (q[0][2] + q[2][2]) / 2, l: .55 + .45 * Math.max(0, dot(n, norm(sub(cam.e, mid)))), j }); }
      quads.sort((a, b) => b.z - a.z);
      for (const Q of quads) { poly(Q.q); const col = g.form === 'dome' && st > 1 ? shade(lerpc(side, topc, Q.j / prof.length), Q.l * lit) : shade(side, Q.l * lit); fillOr(look, ghost, col, 1); }
      let topPts = null; if (!(g.form === 'dome' && st > 1)) { topPts = []; for (let i = 0; i < N; i++) { const a = i / N * TAU; topPts.push(W3(Math.cos(a) * R, base + Hh, Math.sin(a) * R)); } if (topPts.every(p => p)) { poly(topPts); fillOr(look, ghost, shade(topc, lit), 1); } }
      if (ghost) return null;
      // layers: lines around the side
      if (g.layers > 1 && st >= 2) for (let L = 1; L < g.layers; L++) { const y = base + Hh * L / g.layers; c.strokeStyle = rgba(shade(topc, .9 * lit), .9); c.lineWidth = 1.5; c.beginPath(); let pen = false; for (let i = 0; i <= N; i++) { const a = i / N * TAU, p = W3(Math.cos(a) * R * 1.002, y, Math.sin(a) * R * 1.002), n = rot([Math.cos(a), 0, Math.sin(a)], [0, 0, 0], ax, ang); if (!p || dot(n, sub(cam.e, [0, y, 0])) < 0) { pen = false; continue; } pen ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); pen = true; } c.stroke(); }
      // beads
      if (st >= 3 && g.dots > 0) { const n = Math.round(70 * g.dots), cols = [[233, 75, 60], [242, 209, 75], [75, 176, 233], [247, 243, 234], [108, 192, 112]];
        for (let i = 0; i < n; i++) { const a = i * 2.399, y = base + .012 + ((i * 37) % 70) / 70 * (Hh - .025), r = g.form === 'dome' ? R * Math.cos(Math.asin(clamp((y - base) / Hh, 0, .95))) : R, nn = rot([Math.cos(a), 0, Math.sin(a)], [0, 0, 0], ax, ang), p = W3(Math.cos(a) * r, y, Math.sin(a) * r);
          if (!p || dot(nn, sub(cam.e, [0, y, 0])) < 0) continue; c.fillStyle = rgba(shade(cols[i % 5], lit)); c.beginPath(); c.arc(p[0], p[1], Math.max(1, .0045 / p[2] * cam.F), 0, TAU); c.fill(); } }
      // the finished rim
      if (st >= 4 && topPts && topPts.every(p => p)) { poly(topPts); c.strokeStyle = rgba(shade(topc, 1.15 * lit)); c.lineWidth = Math.max(1.5, .008 / topPts[0][2] * cam.F); c.stroke(); }
      const topY = g.form === 'dome' && st > 1 ? base + Hh : base + Hh; return { W3, topY, R };
    }
    const lerpc = (a, b, t) => a.map((x, i) => lerp(x, b[i], t));
    // ---- the inscription, stroke by stroke on the top
    function inscription(v, ck, look) { if (!ck || v.cake.stage < 2) return; const txt = [...v.inscription.text], n = txt.length || 1, p = v.inscription.written / 24 * (n + .8);
      const pts = []; for (let i = 0; i < n; i++) { const u = n === 1 ? 0 : i / (n - 1) - .5, q = ck.W3(u * ck.R * 1.25, ck.topY + .002, .015); pts.push(q); }
      const q0 = ck.W3(0, ck.topY, 0), qa = ck.W3(0, ck.topY, .05), qb = ck.W3(.05, ck.topY, 0); if (!q0 || !qa || !qb) return; const squash = clamp(Math.abs(qa[1] - q0[1]) / Math.max(1, Math.abs(qb[0] - q0[0])), .15, 1);
      c.fillStyle = look === 'holo' ? 'rgba(120,240,250,.9)' : '#c4231c'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let i = 0; i < n; i++) { const f = clamp(p - i, 0, 1), q = pts[i]; if (f <= 0 || !q) break; const sz = Math.max(6, ck.R * 1.1 / n * 1.6 / q[2] * cam.F * .8);
        c.save(); c.translate(q[0], q[1]); c.scale(1, squash); c.font = '600 ' + sz + 'px ' + FONTCJK; c.beginPath(); c.rect(-sz, -sz * .6, sz * 2, sz * 1.2 * Math.min(1, f * 1.2)); c.clip(); c.fillText(txt[i], 0, 0); c.restore(); }
      const ff = clamp(p - n, 0, .8) / .8; if (ff > 0) { c.strokeStyle = c.fillStyle; c.lineWidth = 2; c.beginPath(); for (let k = 0; k <= 30 * ff; k++) { const u = k / 30, q = ck.W3((u - .5) * ck.R * 1.4, ck.topY + .002, -.035 - Math.sin(u * Math.PI * 1.6) * .008); if (q) k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); } c.stroke(); } }
    // ---- candles: their own layer on the cake; lit ones flicker
    function candles(v, ck, now, look, ghost) { if (!ck) return 0; const n = Math.round(v.candles.count), lit = v.candles.lit; let on = 0;
      for (let k = 0; k < n; k++) { const a = k / Math.max(1, n) * TAU + .3, r = k % 2 ? ck.R * .43 : ck.R * .73, b = ck.W3(Math.cos(a) * r, ck.topY, Math.sin(a) * r), t = ck.W3(Math.cos(a) * r, ck.topY + .07, Math.sin(a) * r); if (!b || !t) continue;
        c.strokeStyle = ghost ? 'rgba(56,214,224,.8)' : look === 'holo' ? 'rgba(120,240,250,.8)' : '#efe4d0'; c.lineWidth = Math.max(1.2, .0056 / b[2] * cam.F); if (ghost) c.setLineDash([3, 2]); c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(t[0], t[1]); c.stroke(); c.setLineDash([]);
        if (!ghost && look !== 'holo') { c.strokeStyle = 'rgba(212,72,62,.8)'; c.lineWidth = 1; for (let s = .2; s < 1; s += .3) { c.beginPath(); c.moveTo(lerp(b[0], t[0], s) - 1.5, lerp(b[1], t[1], s) + 1); c.lineTo(lerp(b[0], t[0], s) + 1.5, lerp(b[1], t[1], s) - 1); c.stroke(); } }
        if (k < lit && !ghost) { on++; const fl = .92 + Math.sin(now / 1000 * 23 + k * 1.7) * .05 + Math.sin(now / 1000 * 7.1 + k) * .04, s = .016 / t[2] * cam.F;
          const gr = c.createRadialGradient(t[0], t[1] - s * .9, 0, t[0], t[1] - s * .9, s * 3); gr.addColorStop(0, 'rgba(255,190,110,.45)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); c.fillStyle = gr; c.fillRect(t[0] - s * 3, t[1] - s * 4, s * 6, s * 6);
          c.fillStyle = 'rgba(255,236,170,.95)'; c.beginPath(); c.ellipse(t[0], t[1] - s * .9 * fl, s * .45, s * 1.05 * fl, 0, 0, TAU); c.fill(); }
        else if (!ghost && v.time.blown) { c.strokeStyle = 'rgba(200,200,200,.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(t[0], t[1]); for (let s = 1; s < 8; s++) c.lineTo(t[0] + Math.sin(now / 300 + s + k) * 3, t[1] - s * 4); c.stroke(); } }
      return on; }
    // ---- faceless figures: arriving (translucent, with a mark), each on her own performance clock
    function figure(p, now, dt, v, look, glow, ghost, selected) { const a = ghost ? 1 : p.arrived / 10; if (a <= 0 && !ghost) return;
      if (!(p.id in clocks)) clocks[p.id] = Object.keys(clocks).length * .7; if (!v.time.hold && !ghost) clocks[p.id] += dt;
      const t = clocks[p.id] + p.offset / 11.73, bob = Math.sin(t * TAU * .55) * .012, lean = v.time.blown ? .05 * Math.max(0, Math.sin(Math.min(1, t % 3))) : Math.sin(t * TAU * .23) * .02;
      const h = p.kind === 'child' ? 1.0 : .7, foot = P([p.x, 0, p.z]), head = P([p.x + lean * (-p.x), h + bob, p.z + lean * (-p.z) * 2]); if (!foot || !head) return;
      const sc = cam.F / foot[2], bw = .2 * sc, hr = .085 * sc, alpha = ghost ? 1 : (p.arrived >= 10 ? 1 : a * .55);
      const col = look === 'holo' ? null : shade([196, 170, 140], .35 + glow * .55);
      c.save(); c.globalAlpha = alpha;
      const sh = [head[0], head[1] + hr * 1.1]; c.beginPath(); c.moveTo(foot[0] - bw * .55, foot[1]); c.lineTo(sh[0] - bw * .5, sh[1] + hr * .6); c.quadraticCurveTo(sh[0], sh[1] - hr * .2, sh[0] + bw * .5, sh[1] + hr * .6); c.lineTo(foot[0] + bw * .55, foot[1]); c.closePath();
      if (ghost) { c.setLineDash([4, 3]); c.strokeStyle = 'rgba(56,214,224,.8)'; c.lineWidth = 1.2; c.stroke(); } else if (!col) { c.strokeStyle = 'rgba(90,230,240,.7)'; c.stroke(); } else { c.fillStyle = rgba(col); c.fill(); }
      c.beginPath(); c.arc(head[0], head[1], hr, 0, TAU); if (ghost) { c.stroke(); c.setLineDash([]); } else if (!col) c.stroke(); else { c.fillStyle = rgba(shade(col, 1.05)); c.fill(); }
      c.restore();
      if (!ghost && p.arrived > 0 && p.arrived < 10) { c.strokeStyle = 'rgba(225,236,232,.8)'; c.lineWidth = 2; c.beginPath(); c.arc(head[0] - hr * .4, head[1] - hr * 2.2, hr * .7, -2.3, 2.3); c.stroke(); c.fillStyle = 'rgba(245,250,248,.95)'; c.fillRect(head[0] + hr * .1, head[1] - hr * 2.6, 4, 3); }
      if (selected) bracket(head[0] - bw * .8, head[1] - hr * 1.3, bw * 1.6, foot[1] - head[1] + hr * 1.3);
      return { x: head[0], y: head[1] }; }
    function prop(p, look, ghost, selected) { const b = P([p.x, 0, p.z]), t = P([p.x, .25 * p.scale, p.z]); if (!b || !t) return; const w = .25 * p.scale / b[2] * cam.F;
      c.beginPath(); c.rect(b[0] - w / 2, t[1], w, b[1] - t[1]); fillOr(look, ghost, [110, 120, 130], .9); if (selected) bracket(b[0] - w / 2 - 4, t[1] - 4, w + 8, b[1] - t[1] + 8);
      if (!ghost) { c.fillStyle = 'rgba(230,230,230,.7)'; c.font = '10px ui-monospace,monospace'; c.textAlign = 'center'; c.fillText(p.kind.toUpperCase(), b[0], b[1] + 12); } }
    function bracket(x, y, w, h) { const k = Math.min(10, w / 4, h / 4), f = clamp(1 - (performance.now() - changeAt) / 400, 0, 1); c.strokeStyle = 'rgba(224,51,43,' + (.55 + f * .45) + ')'; c.lineWidth = 1.5 + f * 1.5;
      c.beginPath(); c.moveTo(x, y + k); c.lineTo(x, y); c.lineTo(x + k, y); c.moveTo(x + w - k, y); c.lineTo(x + w, y); c.lineTo(x + w, y + k); c.moveTo(x, y + h - k); c.lineTo(x, y + h); c.lineTo(x + k, y + h); c.moveTo(x + w - k, y + h); c.lineTo(x + w, y + h); c.lineTo(x + w, y + h - k); c.stroke(); }
    // ---- one frame
    function frame(now) { if (!W) resize(); const dt = Math.min(.05, (now - last) / 1000); last = now;
      const v = orb.view(), look = v.scene.look, light = v.scene.light; setCam(v);
      c.setTransform(dpr, 0, 0, dpr, 0, 0); room(v, look, light);
      const glow = clamp(light / 10, 0, 1);
      // depth order: figures and props behind the table are drawn first
      const things = v.people.map(p => ({ p, z: (P([p.x, .5, p.z]) || [0, 0, 99])[2], kind: 'fig' })).concat(v.props.map(p => ({ p, z: (P([p.x, .1, p.z]) || [0, 0, 99])[2], kind: 'prop' })));
      const cz = (P([0, .5, 0]) || [0, 0, 1])[2]; things.sort((a, b) => b.z - a.z);
      const drawThing = t => t.kind === 'fig' ? figure(t.p, now, dt, v, look, glow, false, v.selection === t.p.id) : prop(t.p, look, false, false);
      things.filter(t => t.z >= cz).forEach(drawThing);
      table(v, v.table.up, look, false);
      const ck = cake(v, look, glow, false, now); inscription(v, ck, look); const on = candles(v, ck, now, look, false);
      if (on) { const q = P([0, .62, 0]); if (q) { const r = .5 / q[2] * cam.F, g = c.createRadialGradient(q[0], q[1], 0, q[0], q[1], r); g.addColorStop(0, 'rgba(255,160,74,' + (.05 * on) + ')'); g.addColorStop(1, 'rgba(255,160,74,0)'); c.fillStyle = g; c.fillRect(q[0] - r, q[1] - r, r * 2, r * 2); } }
      things.filter(t => t.z < cz).forEach(drawThing);
      // the selection: a bracket around what the rings work on
      const sel = v.selection; if (sel === 'cake' || sel === 'make' || sel === 'inscription' || sel === 'candles') { const a = P([-.16, .5, 0]), b = P([.16, .5 + (sel === 'candles' ? .2 : .14), 0]); if (a && b) bracket(Math.min(a[0], b[0]) - 6, Math.min(a[1], b[1]) - 6, Math.abs(b[0] - a[0]) + 12, Math.abs(b[1] - a[1]) + 12); }
      if (v.cake.stage === 0 && (sel === 'cake' || sel === 'make')) { const q = P([0, .55, 0]); if (q) { c.setLineDash([3, 4]); c.strokeStyle = 'rgba(200,210,206,.4)'; c.beginPath(); c.ellipse(q[0], q[1], .12 / q[2] * cam.F, .05 / q[2] * cam.F, 0, 0, TAU); c.stroke(); c.setLineDash([]); } }
      // ghosts: what each pending proposal would change, in dashed cyan
      for (const pr of v.proposals) ghost(v, pr, now, look, glow);
      // the light level and switching off
      if (light < 10) { c.fillStyle = 'rgba(0,0,0,' + ((10 - light) / 16) + ')'; c.fillRect(0, 0, W, H); }
      off = clamp(off + (v.time.off ? dt : -dt * 2), 0, 1); if (off > 0) { c.fillStyle = 'rgba(0,0,0,' + off + ')'; c.fillRect(0, 0, W, H); }
      if (v.time.off && off >= 1) { c.fillStyle = 'rgba(200,210,206,.35)'; c.font = '11px ui-monospace,monospace'; c.textAlign = 'center'; c.fillText('THE MEMORY IS OFF', W / 2, H / 2); }
      if (v.time.hold) { c.fillStyle = 'rgba(240,176,64,.9)'; c.font = '600 11px ui-monospace,monospace'; c.textAlign = 'left'; c.fillText('HELD', 10, 18); }
      c.fillStyle = 'rgba(200,210,206,.4)'; c.font = '10px ui-monospace,monospace'; c.textAlign = 'right'; c.fillText('STUB RENDERER', W - 8, H - 8); }
    function ghost(v, pr, now, look, glow) { const g = S.clone(v); g.proposals = []; let e; try { e = O.OPS[pr.op](g, S.clone(pr.args), { author: pr.author }); } catch (er) { e = 'x'; } if (e) return;
      const same = k => JSON.stringify(g[k]) === JSON.stringify(v[k]);
      if (!same('table')) table(g, g.table.up, look, true);
      if (!same('cake') || !same('candles') || !same('inscription')) { const ck = cake(g, look, glow, true, now); if (ck) candles(g, ck, now, look, true); else if (g.cake.stage === 0 && v.cake.stage > 0) { const q = P([0, .6, 0]); if (q) { c.strokeStyle = 'rgba(56,214,224,.8)'; c.beginPath(); c.moveTo(q[0] - 12, q[1] - 12); c.lineTo(q[0] + 12, q[1] + 12); c.moveTo(q[0] + 12, q[1] - 12); c.lineTo(q[0] - 12, q[1] + 12); c.stroke(); } } }
      g.people.forEach(p => { const o = v.people.find(q => q.id === p.id); if (!o || JSON.stringify(o) !== JSON.stringify(p)) figure(p, now, 0, g, look, glow, true, false); });
      g.props.forEach(p => { const o = v.props.find(q => q.id === p.id); if (!o || JSON.stringify(o) !== JSON.stringify(p)) prop(p, look, true, false); });
      if (!same('camera') || !same('scene') || !same('time')) { c.fillStyle = 'rgba(56,214,224,.9)'; c.font = '600 11px ui-monospace,monospace'; c.textAlign = 'center'; c.fillText('PROPOSED: ' + O.label(pr.op, pr.args).toUpperCase(), W / 2, 20); } }
    resize(); return { frame, resize, canvas: cv };
  }
  root.ORB_STUB_SCENE = { create };
})(typeof window !== 'undefined' ? window : globalThis);

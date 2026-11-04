/* Hands. The camera's hands (assets/v5/hands.js, the MediaPipe tracker) and the simulated hands come in by the same door,
   feed(tracks), and are read the same way:
     pinch on a ring and roll the wrist   turns that ring, one detent per 24 degrees of roll (as she turns the lens barrel)
     pinch on a ring and move up or down  turns it too, the way a finger drags the barrel
     pinch and let go on a button         presses it; held past 0.65 s it is the long press (BUG or BIRTHDAY held: watch it done)
     point at the film and hold           picks the part under the finger
     pinch on the film and drag           swings the camera round the model
     both hands pinching                  the barrel held in two hands: roll both to turn the ring in hand, pull apart for DEPTH
   The simulator writes hands that do whole builds: it is the tests' hand and the teacher's (long press on BUG or BIRTHDAY). */
(function () {
  const { ST, ringDefs } = window.CORE; const ORB = window.ORB, SC = window.SCENE;
  const HS = window.HAND = { mem: {}, two: null, src: 'none', last: 0, sim: null };
  const ang = a => Math.atan2(Math.sin(a), Math.cos(a));
  // the wrist's roll: the direction from the wrist to the middle knuckle, as a mirror shows it
  const roll = m => Math.atan2(m[9].x - m[0].x, -(m[9].y - m[0].y));
  function where(x, y) { if (ORB.cv) { const r = ORB.cv.getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { const [dx, dy] = ORB.fromPage(x, y); const h = ORB.hitAt(dx, dy); return h ? Object.assign({ dev: true }, h) : { dev: true }; } }
    return { scene: true }; }
  HS.feed = function (tracks, src) {
    const now = performance.now(); HS.src = src; HS.last = now; ST.hands.n = tracks.length; ST.hands.marks = tracks.map(t => t.marks).filter(Boolean); ST.hands.src = src;
    const seen = new Set();
    for (const t of tracks) { seen.add(t.id); const s = HS.mem[t.id] || (HS.mem[t.id] = { grab: null, dwell: null, palm: null }); s.t = t; s.at = now;
      const r = t.marks ? roll(t.marks) : (t.roll || 0), w = where(t.x, t.y);
      if (w.scene && SC.ready) { const f = SC.toFrame(t.x, t.y); if (f) SC.hand = { u: f[0], v: f[1], k: t.closed ? 1 : .6, at: now }; }
      if (s.lock && !t.closed) s.lock = false;
      if (s.lock) continue;
      if (t.closed && !s.grab) { s.grab = w.btn ? { btn: w.btn, at: now } : w.ring != null ? { ring: w.ring, r0: r, y0: t.y, acc: 0, at: now } : w.scene ? { scene: true, x0: t.x, y0: t.y, at: now, o0: (ST.mode === 'build' ? SC.benchOrbit : SC.handOrbit || [0, 0]).slice(), moved: 0 } : { none: true };
        if (s.grab.ring != null) { ST.ring = s.grab.ring; window.CORE.touch('hand ring'); } }
      else if (!t.closed && s.grab) { release(s, now); }
      if (s.grab && t.closed && !HS.two) move(s, t, r, now);
      // pointing at the film, held still: pick what is under the finger
      if (!t.closed && t.pose === 'point' && w.scene) { const k = SC.pick(t.x, t.y); if (k >= 0) { if (!s.dwell || s.dwell.k !== k) s.dwell = { k, at: now }; else if (now - s.dwell.at > 380 && ST.part !== k && ST.mode !== 'build') { window.CORE.setRing(1, k); if (ORB.remote) ORB.remote({ k: 'set', a: [1, k] }); window.CORE.log('hand', 'pointed at ' + k); } } }
      else s.dwell = null; }
    for (const id in HS.mem) if (!seen.has(id)) { const s = HS.mem[id]; if (s.grab) release(s, now); if (now - s.at > 500) delete HS.mem[id]; }
    // two hands, both pinching: the barrel in both hands
    const g = Object.values(HS.mem).filter(s => s.t && s.t.closed && now - s.at < 200);
    if (g.length >= 2) { const [a, b] = g, d = Math.hypot(a.t.x - b.t.x, a.t.y - b.t.y), an = Math.atan2(b.t.y - a.t.y, b.t.x - a.t.x), rr = ((a.t.marks ? roll(a.t.marks) : a.t.roll || 0) + (b.t.marks ? roll(b.t.marks) : b.t.roll || 0)) / 2;
      if (!HS.two) { HS.two = { d0: d, sp0: ST.spread, r: rr, acc: 0 }; for (const s of g) { s.grab = null; s.lock = true; } window.CORE.log('hand', 'both hands on the barrel'); }
      const T2 = HS.two, sp = Math.max(0, Math.min(1, T2.sp0 + (d - T2.d0) / 420)); if (Math.abs(sp - ST.spread) > .002) { window.CORE.setRing(2, sp * 4); if (ORB.remote) ORB.remote({ k: 'set', a: [2, sp * 4] }); }
      const dr = ang(rr - T2.r); T2.r = rr; T2.acc += dr / (24 * Math.PI / 180); const i = ST.ring === 2 ? 0 : ST.ring, R = ringDefs()[i]; if (R && R.disc) { const k = T2.acc > 0 ? Math.floor(T2.acc) : Math.ceil(T2.acc); if (k) { T2.acc -= k; ORB.act('turn', i, k, 'two hands'); } } else if (Math.abs(T2.acc) > .02) { ORB.act('turn', i, T2.acc, 'two hands'); T2.acc = 0; }
      ORB.grip = { ring: i, at: now }; }
    else HS.two = null;
  };
  function move(s, t, r, now) { const G = s.grab;
    if (G.ring != null) { const R = ringDefs()[G.ring]; if (!R) return; const dr = ang(r - G.r0); G.r0 = r; const dy = t.y - G.y0; G.y0 = t.y;
      G.acc += dr / (24 * Math.PI / 180) - dy / 38; ORB.grip = { ring: G.ring, at: now };
      if (R.disc) { const k = G.acc > 0 ? Math.floor(G.acc) : Math.ceil(G.acc); if (k) { G.acc -= k; ORB.act('turn', G.ring, k, 'hand'); } } else if (Math.abs(G.acc) > .01) { ORB.act('turn', G.ring, G.acc, 'hand'); G.acc = 0; } }
    else if (G.scene) { const dx = t.x - G.x0, dy = t.y - G.y0; G.moved = Math.max(G.moved, Math.hypot(dx, dy)); const o = [G.o0[0] + dx / 300, Math.max(-.6, Math.min(.8, G.o0[1] + dy / 400))]; if (ST.mode === 'build') SC.benchOrbit = o; else SC.handOrbit = o; }
    else if (G.btn) { ORB.held = { btn: G.btn, at: G.at, long: now - G.at > 650 }; } }
  function release(s, now) { const G = s.grab; s.grab = null; if (!G) return;
    if (G.btn) { ORB.held = null; ORB.act('press', G.btn, now - G.at > 650); }
    else if (G.scene && G.moved < 14 && now - G.at < 600 && ST.mode !== 'build') { const k = SC.pick(s.t.x, s.t.y); if (k >= 0) { window.CORE.setRing(1, k); if (ORB.remote) ORB.remote({ k: 'set', a: [1, k] }); } } }

  /* ---------------- simulated hands ---------------- */
  // a hand's 21 points in camera fractions, at a page point, rolled, open or pinching or pointing
  const OPEN = [[0, 0], [-.035, -.025], [-.06, -.055], [-.075, -.085], [-.085, -.11], [-.03, -.1], [-.035, -.145], [-.037, -.172], [-.038, -.195], [0, -.105], [0, -.155], [0, -.185], [0, -.21], [.025, -.1], [.03, -.145], [.032, -.172], [.033, -.195], [.048, -.088], [.055, -.122], [.058, -.145], [.06, -.165]];
  function synth(X, Y, rl, closed, pose) { const W = innerWidth, H = innerHeight, px = 1 - (.15 + X / W * .7), py = .12 + Y / H * .7, c = Math.cos(-rl), s = Math.sin(-rl);
    let P = OPEN.map(([x, y]) => [x, y]);
    if (closed) { P[4] = [-.04, -.15]; P[8] = [-.04, -.152]; P[3] = [-.07, -.12]; P[7] = [-.04, -.16]; }
    if (pose === 'point') for (const i of [10, 11, 12, 14, 15, 16, 18, 19, 20]) P[i] = [P[i][0] * .6, P[i][1] * .45];
    // mirrored: the camera's x runs the other way from the page's
    P = P.map(([x, y]) => [-(x * c - y * s), x * s + y * c]); const mid = closed ? [(P[4][0] + P[8][0]) / 2, (P[4][1] + P[8][1]) / 2] : [(P[4][0] + P[8][0]) / 2, (P[4][1] + P[8][1]) / 2];
    return P.map(([x, y]) => ({ x: px + x - mid[0], y: py + y - mid[1], z: 0 })); }
  const SIM = HS.SIM = { hands: {}, queue: [], on: false, speed: 1 };
  function simHand(id) { return SIM.hands[id] || (SIM.hands[id] = { id, x: innerWidth * (id === 'Right' ? .62 : .38), y: innerHeight * .55, roll: 0, closed: false, pose: 'open', show: true }); }
  function emitSim() { const T = Object.values(SIM.hands).filter(h => h.show).map(h => ({ id: h.id, x: h.x, y: h.y, closed: h.closed, pose: h.closed ? 'pinch' : h.pose, span: .1, roll: h.roll, marks: synth(h.x, h.y, h.roll, h.closed, h.pose) })); HS.feed(T, 'sim'); }
  const wait = ms => new Promise(r => setTimeout(r, ms / SIM.speed));
  async function glide(h, X, Y, ms) { const x0 = h.x, y0 = h.y, n = Math.max(2, Math.round(ms / 33)); for (let i = 1; i <= n; i++) { if (!SIM.on) throw 'stopped'; const e = i / n, k = e * e * (3 - 2 * e); h.x = x0 + (X - x0) * k; h.y = y0 + (Y - y0) * k; emitSim(); await wait(33); } }
  async function hold(ms) { const n = Math.max(1, Math.round(ms / 33)); for (let i = 0; i < n; i++) { if (!SIM.on) throw 'stopped'; emitSim(); await wait(33); } }
  const ringPage = i => ORB.toPage(ORB.ringX(i), 150), btnPage = k => ORB.toPage(ORB.btn[k].cx, ORB.btn[k].cy);
  // turn a ring by n detents, the way a wrist does: grip, roll up to 72 degrees, let go, come back, again
  async function twist(i, n, R) { const h = simHand(R || 'Right'), [X, Y] = ringPage(i); await glide(h, X, Y, 350); const dir = Math.sign(n); let left = Math.abs(n);
    while (left > 0 || (n === 0 && false)) { const k = Math.min(3, left); h.closed = true; await hold(120); const r0 = h.roll; for (let j = 1; j <= 8; j++) { h.roll = r0 + dir * k * (24 * Math.PI / 180) * j / 8 + dir * .004; emitSim(); await wait(40); }
      await hold(90); h.closed = false; await hold(90); for (let j = 1; j <= 5; j++) { h.roll = r0 + dir * k * (24 * Math.PI / 180) * (1 - j / 5); emitSim(); await wait(25); } h.roll = 0; left -= k; } }
  async function turnTo(i, v) { for (let guard = 0; guard < 40; guard++) { const R = ringDefs()[i]; if (!R) return; const d = v - R.get(); if (Math.abs(d) < (R.disc ? .5 : .06)) return;
      if (R.disc) await twist(i, Math.round(d)); else { const h = simHand('Right'), [X, Y] = ringPage(i); await glide(h, X, Y, 300); h.closed = true; await hold(100); const steps = Math.min(Math.abs(d), 2.5), r0 = h.roll;
        for (let j = 1; j <= 10; j++) { h.roll = r0 + Math.sign(d) * steps * (24 * Math.PI / 180) * j / 10; emitSim(); await wait(40); } await hold(80); h.closed = false; h.roll = 0; await hold(120); } } }
  async function press(k, long) { const h = simHand('Right'), [X, Y] = btnPage(k); await glide(h, X, Y, 450); h.closed = true; await hold(long ? 900 : 160); h.closed = false; await hold(200); }
  async function point(u, v) { const h = simHand('Right'), r = window.SCENE.R().domElement.getBoundingClientRect(), a = r.width / r.height, fw = a >= 16 / 9 ? (16 / 9) / a : 1, fh = a >= 16 / 9 ? 1 : a / (16 / 9);
    const X = r.left + r.width * (.5 + (u - .5) * fw), Y = r.top + r.height * (.5 + (v - .5) * fh); h.pose = 'point'; await glide(h, X, Y, 500); await hold(650); h.pose = 'open'; }
  async function spread(to) { const L = simHand('Left'), Rr = simHand('Right'), r = window.SCENE.R().domElement.getBoundingClientRect(), cy = r.top + r.height * .6, cx = r.left + r.width / 2;
    await Promise.all([glide(L, cx - 120, cy, 400), glide(Rr, cx + 120, cy, 400)]); L.closed = Rr.closed = true; await hold(150); const d = (to - ST.spread) * 420;
    await Promise.all([glide(L, cx - 120 - d / 2, cy, 900), glide(Rr, cx + 120 + d / 2, cy, 900)]); await hold(120); L.closed = Rr.closed = false; await hold(150); }
  const facetIndex = (name, key) => window.CORE.facetsOfBuild().findIndex(x => x.it.name === name && x.f[0] === key);
  const SAY = s => { ST.lcd.note = s; window.CORE.touch('sim say'); };
  const SCRIPTS = {
    bug: [() => SAY('the hand finds the beetle'), () => turnTo(0, ST.TL.findIndex(e => e.kind === 'film' && e.n === 4)), () => point(.5, .52), () => SAY('opens the shot into its model'), () => spread(1), () => spread(.0),
      () => press('bug'), () => SAY('racks the eye into focus'), () => turnTo(1, facetIndex('beetle', 'focus')), () => turnTo(3, 4), () => SAY('grows the setae'), () => turnTo(1, facetIndex('beetle', 'setae')), () => turnTo(3, 4),
      () => turnTo(1, facetIndex('beetle', 'gait')), () => turnTo(3, 1), () => SAY('turns the drum: film, then model'), () => spread(1), () => press('imprint')],
    birthday: [() => SAY('the hand finds the birthday'), () => turnTo(0, ST.TL.findIndex(e => e.kind === 'film' && e.n === 24)), () => point(.5, .62), () => spread(.5), () => spread(0), () => press('birthday'),
      () => SAY('seven candles'), () => turnTo(1, facetIndex('cake', 'candles')), () => turnTo(3, 6), () => SAY('flutes the cake'), () => turnTo(1, facetIndex('cake', 'bundt')), () => turnTo(3, 4), () => SAY('writes on it'), () => turnTo(1, facetIndex('cake', 'icing')), () => turnTo(3, 4),
      async () => { SAY('brings the children in'); for (const it of ST.build.items.filter(i => i.type === 'card')) { await turnTo(1, facetIndex(it.name, 'appear')); await turnTo(3, 4); } },
      async () => { SAY('warms one child'); const c = ST.build.items.find(i => i.type === 'card'); await turnTo(1, facetIndex(c.name, 'appear')); await turnTo(4, 3.4); },
      () => SAY('turns the drum: film, then model'), () => spread(1), () => press('imprint'), () => SAY('blows the candles out'), () => turnTo(1, facetIndex('cake', 'flames')), () => turnTo(3, 0)]
  };
  SIM.run = async function (name, speed) { if (SIM.on) { SIM.on = false; await new Promise(r => setTimeout(r, 120)); } SIM.on = true; SIM.speed = speed || 1; SIM.name = name; SIM.done = false; window.CORE.log('sim', 'start ' + name);
    try { for (const step of SCRIPTS[name]) { if (!SIM.on) break; await step(); } } catch (e) { if (e !== 'stopped') { console.error(e); window.CORE.log('sim', 'error ' + (e.message || e)); } }
    SIM.on = false; SIM.done = true; ST.lcd.note = ''; for (const h of Object.values(SIM.hands)) h.show = false; HS.feed([], 'sim'); SIM.hands = {}; window.CORE.log('sim', 'end ' + name); window.CORE.touch('sim end'); };
  SIM.stop = () => { SIM.on = false; };
  // a memory's performance, played back by the simulated hands: each run of turns on one ring becomes one turn to where it ended
  SIM.replay = async function (mem, speed) { const R = mem.rec || [], steps = [];
    for (const e of R) { const last = steps[steps.length - 1]; if (e.k === 'ring') { if (last && last.k === 'ring' && last.a[0] === e.a[0]) last.a = e.a; else steps.push({ k: 'ring', a: e.a }); } else if (e.k === 'press' && e.a[0] !== 'imprint') steps.push(e); }
    const S = steps.map(e => e.k === 'press' ? () => press(e.a[0], false) : () => turnTo(e.a[0], e.a[1]));
    SCRIPTS['mem' + mem.id] = [() => SAY('playing back how memory ' + mem.id + ' was made'), ...S, () => SAY('and imprints it again'), () => press('imprint')]; ST.replaying = true;
    await SIM.run('mem' + mem.id, speed || 1.5); ST.replaying = false; };
  window.CORE.on('replay', m => { if (window.LINK && window.LINK.role !== 'scene') return; SIM.replay(m); });
  SIM.api = { twist, turnTo, press, point, spread, emitSim, simHand, synth };
  window.CORE.on('demo', k => { if (k === 'anything' || (window.LINK && window.LINK.role !== 'scene')) return; ST.lcd.note = ''; SIM.run(k, 1); });
})();

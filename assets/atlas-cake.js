// ============================================================================
// BIRTHDAY BUILDER  (Protocol II)   genome -> procedural cake by candlelight
// L1 GEOM.SOLID tiers (1-3)       L2 WICKS.DOF  depth of field on the flames
// L3 BUNDT.PIPE cylinder -> fluted bundt + piping depth
// R1 STAGE.LUMA room light vs candle light       R2 WIND.GLAZE  glaze hue
// ============================================================================
(function () {
  'use strict';
  const A = window.ATLAS, H = A.hero; if (!A || !H) return;
  const T = THREE, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const V3 = (x, y, z) => new T.Vector3(x, y, z);

  const SPONGES = [['vanilla', '#e3c68e'], ['chocolate', '#4a2c1c'], ['red velvet', '#8b2230'], ['lemon', '#efd878'], ['matcha', '#9bb56b'], ['strawberry', '#f0a3a6']];
  const ICINGS = [['buttercream', '#f6ecd8'], ['rose', '#f1b9c4'], ['mint', '#bfe6d2'], ['sky', '#bcd7f0'], ['ganache', '#3b2217'], ['lilac', '#cdb8ea'], ['film cream', '#e6c98e']];
  const INKS = [['red', '#c8162c'], ['gold', '#d9a62e'], ['navy', '#1e3a8a'], ['green', '#1f7a43'], ['white', '#fbfbf5'], ['chocolate', '#3a2216']];
  const BALLOONS = ['#d23a4c', '#e9b13a', '#3a78d2', '#44b57a', '#a35bd0'];
  A.cakeOptions = { SPONGES, ICINGS, INKS };

  const D2 = A.data;
  const FILM_VARIANTS = [
    { code: 'CANONICAL [VANILLA CYLINDER + 生日快樂 + 7 WICKS]', patch: { tiers: 1, bundt: 0.0, age: 7, text: '生日快樂', sponge: 0, icing: 6, ink: 0, drips: 0.0, glaze: 0.5, room: 0.0, focus: 0.55, balloons: 0, smarties: 0, cutouts: 1 } },
    { code: 'OTHERWISE I: KEPT BUNDT AT PARTY! [11-FLUTE DOME + SMARTIES]', patch: { tiers: 1, bundt: 0.96, age: 7, sponge: 0, icing: 0, ink: 1, drips: 0.25, glaze: 0.58, room: 0.0, focus: 0.62, smarties: 24 } },
    { code: 'OTHERWISE II: DARK GANACHE & 3 WICKS [SPOTLIGHT]', patch: { tiers: 1, bundt: 0.0, age: 3, sponge: 1, icing: 4, ink: 1, drips: 0.8, glaze: 0.1, room: 0.0, focus: 0.7, smarties: 0 } },
    { code: 'OTHERWISE III: ROSE-GLAZE CROWN & 24 SMARTIES [FULL PARTY]', patch: { tiers: 2, bundt: 0.68, age: 7, sponge: 5, icing: 1, ink: 4, drips: 0.5, glaze: 0.9, room: 0.25, focus: 0.5, smarties: 24, balloons: 3 } },
  ];

  function makeGenome(seed) {
    const r = H.rng(seed);
    return { kind: 'cake', seed, name: '', age: 4 + ((r() * 14) | 0), text: 'HAPPY BIRTHDAY', tiers: 1 + ((r() * 3) | 0), bundt: r() < 0.25 ? 0.5 + r() * 0.5 : r() * 0.15, sponge: (r() * SPONGES.length) | 0, icing: (r() * ICINGS.length) | 0, ink: (r() * INKS.length) | 0,
      drips: r() < 0.6 ? 0.2 + r() * 0.7 : 0, glaze: r(), room: r() * 0.35, focus: 0.45 + r() * 0.4, smarties: r() < 0.5 ? 6 + ((r() * 30) | 0) : 0, balloons: (r() * 4) | 0, sprinkles: r() < 0.5 ? 1 : 0, cutouts: 0, variant: -1 };
  }
  function filmCanon(seed) { const g = makeGenome(seed); Object.assign(g, FILM_VARIANTS[0].patch, { name: '', sprinkles: 0, variant: 0 }); return g; }
  const dialOf = v => 20 + 180 * clamp(v, 0, 1);
  const valOf = a => clamp((((a % 360) + 360) % 360 - 20) / 180, 0, 1);
  function dials(g) { return [dialOf((g.tiers - 1) / 3 + 0.05), dialOf(g.focus), dialOf(g.bundt), dialOf(g.room), dialOf(g.glaze)]; }
  const icingColor = g => new T.Color(ICINGS[g.icing][1]);
  const glazeColor = g => { const c = icingColor(g).clone(); const hsl = {}; c.getHSL(hsl); const h = (g.glaze - 0.5) * 1.0 + hsl.h; return new T.Color().setHSL(((h % 1) + 1) % 1, clamp(hsl.s * 0.5 + Math.abs(g.glaze - 0.5) * 1.6, 0.1, 0.85), clamp(hsl.l * (g.icing === 4 ? 1.0 : 0.92), 0.12, 0.85)); };

  function textTexture(text, size) {
    const W = 1024, Hh = 512, c = document.createElement('canvas'); c.width = W; c.height = Hh; const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, W, Hh); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const lines = String(text || '').split('\n').slice(0, 3); const font = '"Noto Sans CJK SC","Noto Sans SC","PingFang SC","Microsoft YaHei","Segoe Script","Brush Script MT",cursive,sans-serif';
    let sz = lines.length > 1 ? 150 : 200; for (; sz > 30; sz -= 6) { x.font = `bold ${sz}px ${font}`; if (Math.max(...lines.map(l => x.measureText(l).width)) < W * 0.86 && sz * lines.length * 1.1 < Hh * 0.9) break; }
    x.font = `bold ${sz}px ${font}`; lines.forEach((l, i) => x.fillText(l, W / 2, Hh / 2 + (i - (lines.length - 1) / 2) * sz * 1.08));
    const t = new T.CanvasTexture(c); t.anisotropy = 8; const b = document.createElement('canvas'); b.width = W; b.height = Hh; const bx = b.getContext('2d'); bx.filter = 'blur(5px)'; bx.drawImage(c, 0, 0); const bt = new T.CanvasTexture(b); return [t, bt];
  }
  function glowTex() { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,230,170,1)'); g.addColorStop(0.18, 'rgba(255,170,70,0.55)'); g.addColorStop(0.5, 'rgba(255,120,30,0.12)'); g.addColorStop(1, 'rgba(255,100,20,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); }

  function build(g, ctx) {
    const root = ctx.root; H.updaters = []; H.parts = [];
    const rr = H.rng(g.seed ^ 0x51ed);
    const iceCol = icingColor(g), spCol = new T.Color(SPONGES[g.sponge][1]), inkCol = new T.Color(INKS[g.ink][1]);
    const glaze = glazeColor(g);
    const icing = new T.MeshPhysicalMaterial({ color: iceCol, roughness: 0.52, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.5, envMapIntensity: 0.6,
      bumpMap: H.noiseTex(512, (u, v) => { const c = Math.round(120 + 90 * H.fbm(u * 18, v * 18, 4)); return [c, c, c]; }, false, 3), bumpScale: 0.35 });
    const glazeMat = new T.MeshPhysicalMaterial({ color: glaze, roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.9 });
    const spongeMat = new T.MeshStandardMaterial({ color: spCol, roughness: 0.85, envMapIntensity: 0.3, bumpMap: H.noiseTex(256, (u, v) => { const c = Math.round(80 + 140 * H.vnoise(u * 60, v * 60)); return [c, c, c]; }, false, 2), bumpScale: 1.2 });
    const inkMat = new T.MeshPhysicalMaterial({ color: inkCol, roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.12, envMapIntensity: 0.8 });

    // ---- room & table -----------------------------------------------------------
    const floor = new T.Mesh(new T.CircleGeometry(40, 64), new T.MeshStandardMaterial({ color: 0x030202, roughness: 0.95 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.62; floor.receiveShadow = true; root.add(floor);
    const table = new T.Mesh(new T.CylinderGeometry(5.6, 5.6, 0.22, 6), new T.MeshStandardMaterial({ color: 0xcdb27a, roughness: 0.72, metalness: 0.05, envMapIntensity: 0.35 })); table.position.y = -0.11; table.rotation.y = Math.PI / 6; table.castShadow = true; table.receiveShadow = true; root.add(table);
    const leg = new T.Mesh(new T.CylinderGeometry(0.55, 0.9, 0.55, 24), table.material); leg.position.y = -0.5; root.add(leg);
    { const arc = new T.Mesh(new T.TorusGeometry(30, 0.07, 8, 160, Math.PI * 1.1), new T.MeshBasicMaterial({ color: new T.Color(1.3, 1.35, 1.3), toneMapped: false })); arc.rotation.x = Math.PI / 2; arc.rotation.z = Math.PI * 0.95; arc.position.y = 1.5; arc.material.color.setScalar(0.55); root.add(arc); }
    const T_N = g.tiers; const radii = T_N === 1 ? [2.2] : T_N === 2 ? [2.3, 1.55] : [2.4, 1.75, 1.15];
    const TH = 1.12; const board = new T.Mesh(new T.CylinderGeometry(radii[0] + 0.55, radii[0] + 0.55, 0.09, 96), new T.MeshPhysicalMaterial({ color: 0xe9e6de, roughness: 0.25, metalness: 0.6, clearcoat: 1, envMapIntensity: 0.9 })); board.position.y = 0.045; board.castShadow = board.receiveShadow = true; root.add(board);

    // ---- tiers ----------------------------------------------------------------
    const bundt = g.bundt; let y = 0.09; const tierMeshes = [], rosetteJobs = [];
    const dripRand = H.rng(g.seed ^ 31);
    for (let i = 0; i < T_N; i++) {
      const r = radii[i], h = TH * (i === 0 && bundt > 0.4 ? 1.12 : 1);
      const geo = new T.CylinderGeometry(r, r * (1 - bundt * 0.1 * (i === 0 ? 1 : 0)), h, 176, 28, false);
      const p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) { const x = p.getX(k), yy = p.getY(k), z = p.getZ(k); const th = Math.atan2(z, x), rad = Math.hypot(x, z); const t = (yy + h / 2) / h;
        let f = 1; if (i === 0 && bundt > 0) { f += bundt * 0.075 * (0.5 + 0.5 * Math.cos(th * 11)) * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, t * 1.05))); }
        f *= 1 - 0.02 * Math.pow(Math.abs(t * 2 - 1), 8);       // rounded rim
        const k2 = rad > 0.01 ? f : 1; p.setXYZ(k, x * k2, yy + (i === 0 && bundt > 0 && Math.hypot(x, z) < r * 0.55 ? 0.06 * bundt * (1 - Math.hypot(x, z) / (r * 0.55)) : 0), z * k2); }
      geo.computeVertexNormals();
      const m = new T.Mesh(geo, bundt > 0.5 && i === 0 ? spongeMat : icing); m.position.y = y + h / 2; m.castShadow = m.receiveShadow = true; root.add(m); tierMeshes.push({ m, r, y0: y, h });
      // top cap (icing) a hair above
      const cap = new T.Mesh(new T.CylinderGeometry(r * 0.985, r * 0.985, 0.05, 128), bundt > 0.5 && i === 0 ? glazeMat : icing); cap.position.y = y + h + 0.015; cap.receiveShadow = true; root.add(cap);
      // drip skirt
      if (g.drips > 0.02 || (bundt > 0.5 && i === 0)) {
        const dg = new T.CylinderGeometry(r * 1.012, r * 1.012, 0.7, 192, 14, true); const dp = dg.attributes.position; const lens = []; for (let k = 0; k < 28; k++) lens.push(0.1 + dripRand() * (0.25 + 0.5 * Math.max(g.drips, bundt > 0.5 ? 0.6 : 0)));
        for (let k = 0; k < dp.count; k++) { const x = dp.getX(k), yy = dp.getY(k), z = dp.getZ(k); const th = (Math.atan2(z, x) + Math.PI) / (Math.PI * 2) * 28; const a = Math.floor(th) % 28, b = (a + 1) % 28, f = th - Math.floor(th); const s = f * f * (3 - 2 * f); const L = lens[a] * (1 - s) + lens[b] * s; const ph = Math.max(0, Math.sin(th * Math.PI * 1.0)); const dripL = L * (0.5 + 0.5 * Math.pow(Math.abs(Math.sin(th * Math.PI)), 0.6)); if (yy < 0) dp.setY(k, 0.35 - dripL); else dp.setY(k, 0.35); const bulge = yy < 0 ? 1.012 + 0.012 * Math.pow(Math.sin(th * Math.PI), 2) : 1.0; dp.setX(k, x * bulge); dp.setZ(k, z * bulge); }
        dg.computeVertexNormals(); const sk = new T.Mesh(dg, glazeMat); sk.position.y = y + h - 0.35 + 0.03; sk.castShadow = true; root.add(sk);
      }
      rosetteJobs.push({ r, y: y + h + 0.05 }); if (i === 0) rosetteJobs.push({ r: r * 1.0, y: y + 0.05, base: true });
      y += h + 0.04;
    }
    const topY = y, rTop = radii[T_N - 1];

    // ---- piped border (instanced rosettes) ---------------------------------------
    const roGeo = new T.IcosahedronGeometry(0.075, 2); const roMat = new T.MeshPhysicalMaterial({ color: iceCol.clone().multiplyScalar(1.02), roughness: 0.45, clearcoat: 0.15, envMapIntensity: 0.6 });
    const nRo = rosetteJobs.reduce((a, j) => a + Math.floor(2 * Math.PI * j.r / (0.17 - 0.03 * bundt)), 0); const ros = new T.InstancedMesh(roGeo, roMat, nRo); ros.castShadow = true; let ri = 0; const mm = new T.Matrix4(), q = new T.Quaternion(), ps = new T.Vector3(), sc = new T.Vector3();
    rosetteJobs.forEach(j => { const n = Math.floor(2 * Math.PI * j.r / (0.17 - 0.03 * bundt)); for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; const s = 0.85 + 0.35 * (rr() - 0.5) + 0.25 * bundt; ps.set(Math.cos(a) * (j.r - 0.02), j.y + 0.01, Math.sin(a) * (j.r - 0.02)); sc.set(s * 1.1, s * 0.85, s * 1.1); q.setFromEuler(new T.Euler(0, -a, 0)); mm.compose(ps, q, sc); ros.setMatrixAt(ri++, mm); } });
    root.add(ros);

    // ---- inscription on the top tier --------------------------------------------
    const [tt, tb] = textTexture(g.text, 200);
    const inscr = new T.Mesh(new T.PlaneGeometry(rTop * 1.62, rTop * 0.81), new T.MeshPhysicalMaterial({ color: inkCol, alphaMap: tt, transparent: true, alphaTest: 0.35, bumpMap: tb, bumpScale: 4.5, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
    inscr.rotation.x = -Math.PI / 2; inscr.position.y = topY + 0.045; inscr.position.z = 0.0; root.add(inscr);

    // ---- candles --------------------------------------------------------------
    const N = clamp(g.age, 1, 30); const candles = []; const lights = [];
    const waxTex = H.noiseTex(128, (u, v) => { const s = (Math.floor((u * 4 + v * 6) % 1 * 2)); return s ? [248, 248, 244] : [200, 60, 80]; }, true);
    const candleCols = [[0xd23a4c, 0xf8f6ee], [0x3a78d2, 0xf8f6ee], [0xe9b13a, 0xf8f6ee], [0x44b57a, 0xf8f6ee]];
    const glow = glowTex(); const flameGeo = (() => { const pts = []; for (let k = 0; k <= 20; k++) { const t = k / 20; pts.push(new T.Vector2(0.05 * Math.sin(Math.PI * Math.pow(t, 0.62)) * (1 - 0.35 * t), t * 0.24)); } return new T.LatheGeometry(pts, 18); })();
    const flameMat = new T.MeshBasicMaterial({ color: new T.Color(4.0, 2.6, 1.0), toneMapped: false });
    const flameCore = new T.MeshBasicMaterial({ color: new T.Color(3.0, 3.2, 4.0), toneMapped: false });
    const ringA = N > 12 ? Math.ceil(N * 0.62) : N, ringB = N - ringA;
    function candleAt(x, z, idx) {
      const grp = new T.Group(); grp.position.set(x, topY + 0.05, z);
      const cc = candleCols[idx % candleCols.length]; const wmat = new T.MeshPhysicalMaterial({ color: cc[1], map: null, roughness: 0.45, clearcoat: 0.3, transmission: 0, envMapIntensity: 0.5 });
      const body = new T.Mesh(new T.CylinderGeometry(0.05, 0.055, 0.78, 20), new T.MeshPhysicalMaterial({ color: 0xffffff, map: waxTex, roughness: 0.42, clearcoat: 0.3, envMapIntensity: 0.5 })); body.material.color.setHex(0xffffff); body.position.y = 0.39; body.castShadow = true; grp.add(body);
      const wick = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 0.07, 6), new T.MeshBasicMaterial({ color: 0x120a06 })); wick.position.y = 0.815; grp.add(wick);
      const fl = new T.Group(); fl.position.y = 0.85; const f1 = new T.Mesh(flameGeo, flameMat); const f2 = new T.Mesh(flameGeo, flameCore); f2.scale.set(0.45, 0.4, 0.45); f2.position.y = 0.012; fl.add(f1, f2);
      const halo = new T.Sprite(new T.SpriteMaterial({ map: glow, color: 0xffb060, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85, toneMapped: false })); halo.scale.set(0.9, 0.9, 1); halo.position.y = 0.12; fl.add(halo);
      grp.add(fl); root.add(grp); candles.push({ grp, fl, halo, ph: rr() * 6.28, x, z });
    }
    for (let i = 0; i < ringA; i++) { const a = i / ringA * Math.PI * 2 + 0.3; const rad = N === 1 ? 0 : rTop * (N > 12 ? 0.78 : 0.62); candleAt(Math.cos(a) * rad, Math.sin(a) * rad, i); }
    for (let i = 0; i < ringB; i++) { const a = i / ringB * Math.PI * 2; candleAt(Math.cos(a) * rTop * 0.35, Math.sin(a) * rTop * 0.35, i + 1); }
    // candle lights: a few clustered point lights carry the glow onto the icing
    const nL = Math.min(4, Math.max(1, Math.ceil(N / 6)));
    for (let i = 0; i < nL; i++) { const L = new T.PointLight(0xff9440, 1, 14, 1.6); const a = i / nL * Math.PI * 2; L.position.set(Math.cos(a) * rTop * 0.4, topY + 1.3, Math.sin(a) * rTop * 0.4); L.userData.heroLight = true; scene_add(L); lights.push(L); }
    function scene_add(o) { ctx.scene.add(o); }

    // ---- smarties & sprinkles ----------------------------------------------------
    if (g.smarties > 0) { const sg = new T.CylinderGeometry(0.11, 0.11, 0.05, 20); const sm = new T.InstancedMesh(sg, new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 1, envMapIntensity: 0.8 }), g.smarties); sm.castShadow = true; const c = new T.Color(); for (let i = 0; i < g.smarties; i++) { const a = rr() * 6.28, rad = radii[0] + 0.85 + rr() * 2.2; ps.set(Math.cos(a) * rad, 0.03, Math.sin(a) * rad); q.setFromEuler(new T.Euler((rr() - 0.5) * 0.2, rr() * 6.28, (rr() - 0.5) * 0.2)); sc.set(1, 1, 1); mm.compose(ps, q, sc); sm.setMatrixAt(i, mm); c.setHSL(rr(), 0.75, 0.5); sm.setColorAt(i, c); } root.add(sm); }
    if (g.sprinkles) { const sg = new T.CylinderGeometry(0.014, 0.014, 0.09, 6); const n = 220; const sp = new T.InstancedMesh(sg, new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }), n); const c = new T.Color(); for (let i = 0; i < n; i++) { const a = rr() * 6.28, rad = Math.sqrt(rr()) * rTop * 0.92; ps.set(Math.cos(a) * rad, topY + 0.07, Math.sin(a) * rad); q.setFromEuler(new T.Euler(Math.PI / 2 + (rr() - 0.5) * 0.3, rr() * 6.28, 0)); sc.set(1, 1, 1); mm.compose(ps, q, sc); sp.setMatrixAt(i, mm); c.setHSL(rr(), 0.8, 0.55); sp.setColorAt(i, c); } root.add(sp); }

    // ---- balloons (out of focus, behind) ---------------------------------------
    const balloons = [];
    for (let i = 0; i < g.balloons; i++) { const col = new T.Color(BALLOONS[(i + g.seed) % BALLOONS.length]); const b = new T.Mesh(new T.SphereGeometry(1, 48, 32), new T.MeshPhysicalMaterial({ color: col, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1 })); b.scale.set(1.05, 1.3, 1.05); const a = -0.6 - i * 0.55 + (i % 2) * 0.4; b.position.set(Math.cos(a * 2 + 2.6) * (6 + i), 4.2 + (i % 3) * 0.8, -5 - i * 0.9); b.castShadow = false; root.add(b); balloons.push({ b, ph: rr() * 6 }); const s = new T.Mesh(new T.CylinderGeometry(0.01, 0.01, 8, 4), new T.MeshBasicMaterial({ color: 0xd8d0c0 })); s.position.set(b.position.x, b.position.y - 4.6, b.position.z); root.add(s); }

    // ---- the film's children, as cutouts (Act II) ---------------------------------------
    if (g.cutouts) {
      const CS = 154, cr = A.getRes(CS), myId = ctx.id;
      const addCut = () => {
        if (!cr.ready) { if (!cr.failed) setTimeout(addCut, 200); return; } if (H.buildId !== myId) return;
        const FW = 768, FH = 432, c = document.createElement('canvas'); c.width = FW; c.height = FH; const x = c.getContext('2d'); x.drawImage(cr.frameImg, 0, 0, FW, FH);
        const pset = {}; D2.sec[CS].segs.forEach(sg => { pset[sg.i] = sg.p > 0.5 ? 1 : 0; });
        const m = document.createElement('canvas'); m.width = FW; m.height = FH; const mx = m.getContext('2d'); const md = mx.createImageData(FW, FH);
        for (let yy = 0; yy < FH; yy++) for (let xx = 0; xx < FW; xx++) { const l = cr.labels[Math.floor(yy * 270 / FH) * 480 + Math.floor(xx * 480 / FW)]; md.data[(yy * FW + xx) * 4 + 3] = pset[l] ? 255 : 0; }
        mx.putImageData(md, 0, 0); const mb = document.createElement('canvas'); mb.width = FW; mb.height = FH; const bx = mb.getContext('2d'); bx.filter = 'blur(2px)'; bx.drawImage(m, 0, 0);
        x.globalCompositeOperation = 'destination-in'; x.drawImage(mb, 0, 0);
        const tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = 8;
        const mat = new T.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.04, toneMapped: false, depthWrite: true }); mat.color.setScalar(1.15);
        const pl = new T.Mesh(new T.PlaneGeometry(26.0 * 1.0, 26.0 * 9 / 16 * 1.0), mat); const sc = 1.0; pl.scale.set(sc, sc, 1); pl.position.set(0.4, 2.9, -3.6); root.add(pl);
      };
      addCut();
    }

    // ---- selection parts ---------------------------------------------------------
    const cTop = [0, topY + 0.7, 0];
    H.parts = [
      { id: 'WICKS.DOF', name: N + ' CANDLES', focus: { pos: cTop, dist: 3.6 + rTop * 0.6, yaw: 0.3, pitch: 0.22 }, ring: 1 },
      { id: 'FLAME', name: 'A SINGLE FLAME', focus: { pos: [candles[0].x, topY + 0.95, candles[0].z], dist: 0.9, yaw: 0.2, pitch: 0.05 }, ring: 3 },
      { id: 'HANZI', name: 'PIPED INSCRIPTION', focus: { pos: [0, topY + 0.06, 0], dist: rTop * 2.4, yaw: 0.0, pitch: 1.05 }, ring: 4 },
      { id: 'TIERS', name: T_N + (T_N === 1 ? ' TIER' : ' TIERS') + (bundt > 0.4 ? ' · BUNDT' : ''), focus: { pos: [0, topY * 0.5, 0], dist: 6 + radii[0] * 0.9, yaw: 0.5, pitch: 0.16 }, ring: 0 },
      { id: 'BUNDT.PIPE', name: 'PIPED BORDER & FLUTES', focus: { pos: [radii[0] * 0.2, 0.55, radii[0] * 0.95], dist: 1.9, yaw: 0.1, pitch: 0.2 }, ring: 2 },
      { id: 'GLAZE', name: 'GLAZE & DRIPS', focus: { pos: [radii[0] * 0.7, topY - 0.45, radii[0] * 0.7], dist: 2.2, yaw: 0.85, pitch: 0.1 }, ring: 4 },
      { id: 'STAGE', name: 'THE HEX TABLE', focus: { pos: [0, 0.2, 0], dist: 13, yaw: 0.45, pitch: 0.33 }, ring: 3 },
    ];
    H.cakeRefs = { glazeMat, icing, inkMat, candles, lights, balloons, topY, rTop, inscr, radii };

    // ---- life: flicker, sway, blow ---------------------------------------------
    H.blown = H.blown || 0; H.blowT = 0;
    H.updaters.push((dt, t) => {
      const stage = g.room, lit = H.blown ? Math.max(0, 1 - H.blowT) : 1; if (H.blown) H.blowT = Math.min(2, H.blowT + dt * 0.9);
      const wind = H.blown ? Math.min(1, H.blowT * 1.6) : 0.0;
      candles.forEach((c, i) => { const fl = 0.85 + 0.18 * Math.sin(t * 11 + c.ph) + 0.1 * Math.sin(t * 23 + c.ph * 2) + 0.06 * Math.sin(t * 47 + i); const k = lit < 0.02 ? 0.0001 : fl * (0.4 + 0.6 * lit); c.fl.scale.set(k, k * (0.9 + 0.25 * Math.sin(t * 8 + c.ph)), k); c.fl.rotation.z = Math.sin(t * 3.3 + c.ph) * 0.12 + wind * 0.9; c.fl.rotation.x = Math.cos(t * 2.7 + c.ph) * 0.1; c.halo.material.opacity = 0.85 * lit * (0.8 + 0.2 * fl); c.fl.visible = lit > 0.02; });
      const base = (0.5 + 0.9 * (Math.min(N, 12) / 12)) * 1.0 * lit; lights.forEach((L, i) => { L.intensity = base * (0.9 + 0.1 * Math.sin(t * 13 + i * 2) + 0.06 * Math.sin(t * 29 + i)) / nL * 1.4; });
      H.lights.key.intensity = 0.25 + stage * 3.2; H.lights.rim.intensity = 0.15 + stage * 1.2; H.lights.fill.intensity = 0.02 + stage * 0.3;
      balloons.forEach(bb => { bb.b.position.y += Math.sin(t * 0.8 + bb.ph) * 0.0015; bb.b.rotation.y = t * 0.1 + bb.ph; });
      H.post.uniforms.exposure.value = 0.5 + stage * 0.5; H.aperture = 0.22 + 0.95 * (1 - g.focus) + 0.25;
      glazeMat.color.copy(glazeColor(g));
    });
  }

  H.blow = function () { H.blown = H.blown ? 0 : 1; H.blowT = 0; A.emit('blow', H.blown); };

  function onDial(ring, ang) {
    const g = H.genome, v = valOf(ang);
    if (ring === 0) { const t = clamp(Math.floor(v * 4 - 0.2) + 1, 1, 3); if (t !== g.tiers) { g.tiers = t; H.rebuildSoon(); } }
    else if (ring === 1) { g.focus = v; }
    else if (ring === 2) { const b = Math.round(v * 20) / 20; if (Math.abs(b - g.bundt) > 0.001) { g.bundt = b; H.rebuildSoon(); } }
    else if (ring === 3) { g.room = v * 0.6; }
    else if (ring === 4) { g.glaze = v; }
    g.variant = -1;
  }

  H.register('cake', {
    ref: { sec: 154, frame: { pos: [0.4, 3.3, 0], dist: 25, yaw: 0.0, pitch: 0.12 } },
    mood: g => 'amber', makeGenome, build, filmCanon, dials, onDial, variants: FILM_VARIANTS,
    overview: { pos: [0, 1.6, 0], dist: 12.5, yaw: 0.4, pitch: 0.24 },
    labels: ['L1:GEOM.SOLID', 'L2:WICKS.DOF', 'L3:BUNDT.PIPE', 'R1:STAGE.LUMA', 'R2:WIND.GLAZE'],
    readout: (g, i) => [`${g.tiers} TIER${g.tiers > 1 ? 'S' : ''}`, `f/${(1.4 + (1 - g.focus) * 14).toFixed(1)}`, g.bundt > 0.5 ? `BUNDT ${Math.round(g.bundt * 100)}%` : `FLUTE ${Math.round(g.bundt * 100)}%`, g.room < 0.04 ? 'CANDLELIGHT' : `ROOM ${Math.round(g.room * 100)}%`, `GLAZE ${Math.round(g.glaze * 360)}°`][i],
    title: g => (g.name ? `FOR ${g.name.toUpperCase()} · ` : '') + `${g.age} CANDLE${g.age > 1 ? 'S' : ''}`,
    caption: ['PROCEDURAL BIRTHDAY CAKE, FROM CRUMB TO CANDLE,', 'RENDERED LIVE IN YOUR BROWSER.'],
    spec: g => [['FOR', g.name || '—'], ['AGE / CANDLES', String(g.age)], ['TIERS', String(g.tiers)], ['SPONGE', SPONGES[g.sponge][0]], ['ICING', ICINGS[g.icing][0]], ['GLAZE', 'hue ' + Math.round(g.glaze * 360) + '°' + (g.drips > 0.05 ? ' with drips' : '')], ['SHAPE', g.bundt > 0.5 ? 'fluted bundt' : g.bundt > 0.15 ? 'lightly fluted' : 'smooth cylinder'], ['INSCRIPTION', g.text.replace(/\n/g, ' / ') + ' (' + INKS[g.ink][0] + ' piping)'], ['EXTRAS', [g.balloons ? g.balloons + ' balloons' : '', g.smarties ? g.smarties + ' smarties' : '', g.sprinkles ? 'sprinkles' : ''].filter(Boolean).join(', ') || 'none']],
  });
})();

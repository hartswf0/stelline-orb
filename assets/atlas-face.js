// ============================================================================
// CHILD / MEMORY FACE (Protocol III)  -  a child lit from below by one candle.
// What Stelline lingers on: the look of a face in firelight, the flame itself,
// the moment of blowing. Faces materialise (ghost -> solid), focus racks
// between the flame and the face, the expression goes neutral -> smile -> blow.
// L1 GEOM.SOLID ghost->solid   L2 FACE.DOF rack flame<->face   L3 EXPRESSION
// R1 CANDLE.LUMA underlight    R2 SKIN.TINT colour temperature
// ============================================================================
(function () {
  'use strict';
  const A = window.ATLAS, H = A.hero; if (!A || !H) return;
  const T = THREE, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const V3 = (x, y, z) => new T.Vector3(x, y, z); const pick = (r, a) => a[(r() * a.length) | 0];
  const SKINS = [['porcelain', [0.93, 0.78, 0.68]], ['peach', [0.88, 0.66, 0.52]], ['golden', [0.8, 0.58, 0.4]], ['olive', [0.7, 0.5, 0.34]], ['brown', [0.5, 0.32, 0.22]], ['deep', [0.3, 0.19, 0.13]]];
  const HAIRS = [['blond', [0.82, 0.64, 0.3]], ['light brown', [0.45, 0.3, 0.18]], ['dark brown', [0.16, 0.1, 0.07]], ['black', [0.04, 0.035, 0.035]], ['red', [0.55, 0.2, 0.08]], ['auburn', [0.35, 0.12, 0.06]]];
  const STYLES = ['bangs', 'curly', 'short', 'pony', 'bob'];
  A.childOptions = { SKINS, HAIRS, STYLES };
  const FILM_VARIANTS = [
    { code: 'CANONICAL [GIRL WITH FRINGE, MID-BLOW]', patch: { skin: 0, hair: 0, style: 'bangs', iris: 0.09, age: 8, count: 3, glow: 0.8, temp: 0.55, expr: 0.1, focus: 0.95, solid: 1 } },
    { code: 'OTHERWISE I: THE BOY WHO SMILES AT THE FLAME', patch: { skin: 1, hair: 2, style: 'short', iris: 0.07, age: 7, expr: 0.5, count: 2 } },
    { code: 'OTHERWISE II: CURLS, EYES WIDE, ABOUT TO BLOW', patch: { skin: 4, hair: 3, style: 'curly', iris: 0.06, age: 6, expr: 0.8, count: 3 } },
    { code: 'OTHERWISE III: PONYTAIL, COOL MOONLIGHT', patch: { skin: 3, hair: 4, style: 'pony', iris: 0.45, age: 10, expr: 0.3, temp: -0.5, glow: 0.45 } },
  ];
  function makeGenome(seed) {
    const r = H.rng(seed);
    return { kind: 'child', seed, age: 4 + ((r() * 8) | 0), skin: (r() * SKINS.length) | 0, hair: (r() * HAIRS.length) | 0, style: pick(r, STYLES), iris: r() < 0.6 ? 0.04 + r() * 0.08 : r(), expr: r() * 0.9, solid: 1, focus: 0.8 + r() * 0.18, glow: 0.55 + r() * 0.4, temp: 0.2 + r() * 0.5, count: 1 + ((r() * 3) | 0), gaze: 0.3 + r() * 0.5, view: pick(r, ['front', 'front', 'low']), variant: -1 };
  }
  function filmCanon(seed) { const g = makeGenome(seed); Object.assign(g, FILM_VARIANTS[0].patch, { gaze: 0.8, variant: 0, view: 'front' }); return g; }
  const dialOf = v => 20 + 180 * clamp(v, 0, 1); const valOf = a => clamp((((a % 360) + 360) % 360 - 20) / 180, 0, 1);
  const dials = g => [dialOf(g.solid), dialOf(g.focus), dialOf(g.expr), dialOf(g.glow), dialOf((g.temp + 1) / 2)];
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const gau = (x, y, z, c, sig, amp) => { const d = (x - c[0]) ** 2 + (y - c[1]) ** 2 + (z - c[2]) ** 2; return amp * Math.exp(-d / (2 * sig * sig)); };

  function irisTex(hue) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); const col = h => `hsl(${Math.round(h * 360)},55%,${h > 0.3 ? 40 : 30}%)`; g.addColorStop(0, '#050403'); g.addColorStop(0.28, '#050403'); g.addColorStop(0.32, col(hue)); g.addColorStop(0.7, `hsl(${Math.round(hue * 360)},60%,22%)`); g.addColorStop(0.92, '#120c08'); g.addColorStop(1, '#0a0705'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); for (let k = 0; k < 40; k++) { const a = k / 40 * 6.283; x.strokeStyle = `hsla(${Math.round(hue * 360)},60%,${50 + (k % 3) * 8}%,0.25)`; x.beginPath(); x.moveTo(64 + Math.cos(a) * 22, 64 + Math.sin(a) * 22); x.lineTo(64 + Math.cos(a) * 52, 64 + Math.sin(a) * 52); x.stroke(); } const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; }

  function makeFace(g, v, ghost, refs) {
    const grp = new T.Group(); const sk = SKINS[v.skin][1], hc = HAIRS[v.hair][1];
    const skin = new T.MeshPhysicalMaterial({ color: new T.Color(sk[0] * 0.8, sk[1] * 0.78, sk[2] * 0.78), roughness: 0.62, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.5, envMapIntensity: 0.25 });
    skin.userData.sss = { value: 0.55 };
    skin.onBeforeCompile = sh => { sh.uniforms.uSss = skin.userData.sss; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSss;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float fr = 1.0 - abs(dot(normalize(vViewPosition), normal)); totalEmissiveRadiance += uSss * vec3(0.9, 0.22, 0.08) * pow(fr, 2.6) * 0.05;'); };
    const hair = new T.MeshPhysicalMaterial({ color: new T.Color(hc[0] * 0.75, hc[1] * 0.75, hc[2] * 0.75), roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.4, envMapIntensity: 0.4 });
    const lip = new T.MeshPhysicalMaterial({ color: new T.Color(sk[0] * 0.95, sk[1] * 0.45, sk[2] * 0.45), roughness: 0.35, clearcoat: 0.5 });
    const white = new T.MeshPhysicalMaterial({ color: 0xe8ddd0, roughness: 0.25, clearcoat: 0.8, envMapIntensity: 0.6 });
    const mats = [skin, hair, lip, white];
    const geo = new T.SphereGeometry(1, 112, 80); { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); let d = 0; const f = z > -0.1 ? 1 : 0;
      d += gau(x, y, z, [0, -0.12, 1], 0.17, 0.12) + gau(x, y, z, [0, -0.22, 1], 0.09, 0.08) + gau(x, y, z, [0.1, -0.23, 0.97], 0.07, 0.035) + gau(x, y, z, [-0.1, -0.23, 0.97], 0.07, 0.035);
      d += gau(x, y, z, [0.32, 0.34, 0.88], 0.15, 0.05) + gau(x, y, z, [-0.32, 0.34, 0.88], 0.15, 0.05);
      d -= gau(x, y, z, [0.31, 0.2, 0.92], 0.13, 0.075) + gau(x, y, z, [-0.31, 0.2, 0.92], 0.13, 0.075);
      d += gau(x, y, z, [0.5, -0.25, 0.82], 0.22, 0.065) + gau(x, y, z, [-0.5, -0.25, 0.82], 0.22, 0.065) + gau(x, y, z, [0, -0.82, 0.58], 0.2, 0.07) - gau(x, y, z, [0, -0.52, 0.85], 0.1, 0.035);
      const jaw = 1 - 0.2 * sm(-0.1, -1, y); p.setXYZ(i, x * (0.84 * jaw) * (1 + d * 0.82 * 0), y * 1.0, z * 0.92); const nx = x, ny = y, nz = z; p.setXYZ(i, (x + nx * d * f) * 0.84 * jaw, (y + ny * d * f) * 1.0, (z + nz * d * f) * 0.92); } geo.computeVertexNormals(); }
    const head = new T.Mesh(geo, skin); head.castShadow = head.receiveShadow = true; grp.add(head);
    // eyes
    const iris = irisTex(v.iris), eyes = [];
    [1, -1].forEach(s => {
      const eg = new T.Group(); eg.position.set(s * 0.27, 0.2, 0.74); const ball = new T.Mesh(new T.SphereGeometry(0.14, 32, 24), white); eg.add(ball);
      const ir = new T.Mesh(new T.CircleGeometry(0.082, 40), new T.MeshBasicMaterial({ map: iris })); ir.position.set(0, 0, 0.136); eg.add(ir); eg.userData.iris = ir;
      const cor = new T.Mesh(new T.SphereGeometry(0.146, 32, 24), new T.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 })); eg.add(cor);
      const lid = new T.Mesh(new T.SphereGeometry(0.158, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), skin); lid.rotation.x = -0.55; eg.add(lid); eg.userData.lid = lid;
      const lid2 = new T.Mesh(new T.SphereGeometry(0.155, 24, 12, 0, Math.PI * 2, Math.PI * 0.74, Math.PI * 0.26), skin); lid2.rotation.x = -0.1; eg.add(lid2);
      const lashM = new T.MeshStandardMaterial({ color: new T.Color(hc[0] * 0.5, hc[1] * 0.5, hc[2] * 0.5), roughness: 0.7 }); for (let k = 0; k < 14; k++) { const a = -0.9 + k / 13 * 1.8; const l = new T.Mesh(new T.ConeGeometry(0.004, 0.065, 4), lashM); l.position.set(Math.sin(a) * 0.15, 0.085 + Math.cos(a * 1.2) * 0.04, 0.115 + 0.02 * Math.cos(a)); l.rotation.set(-0.9, 0, -a * 0.8); eg.add(l); }
      grp.add(eg); eyes.push(eg);
    });
    // brows
    const bm = new T.MeshStandardMaterial({ color: new T.Color(hc[0] * 0.7, hc[1] * 0.7, hc[2] * 0.7), roughness: 0.7 });
    [1, -1].forEach(s => { const c = new T.CatmullRomCurve3([V3(s * 0.14, 0.43, 0.9), V3(s * 0.29, 0.5, 0.86), V3(s * 0.45, 0.45, 0.78)]); const m = new T.Mesh(H.sweep(c, u => 0.022 * (1 - u * 0.7) + 0.006, 12, 6), bm); grp.add(m); });
    // mouth: closed lips curve + blow ring
    const lipsC = new T.Group(); const lipsO = new T.Group(); grp.add(lipsC, lipsO);
    const mouthY = -0.5; refs.mouth = { lipsC, lipsO, upper: null, lower: null };
    const mk = (s) => { const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10 * 2 - 1; pts.push(V3(t * 0.2, mouthY + s * 0.012 * (1 - t * t), 0.9 - t * t * 0.1 + 0.02)); } return new T.Mesh(H.sweep(new T.CatmullRomCurve3(pts), u => 0.028 * Math.sin(Math.PI * u) + 0.008, 20, 8), lip); };
    const up = mk(1), lo = mk(-1); lo.position.y -= 0.016; lipsC.add(up, lo); refs.mouth.upper = up; refs.mouth.lower = lo;
    const ring = new T.Mesh(new T.TorusGeometry(0.075, 0.036, 14, 32), lip); ring.position.set(0, mouthY, 0.9); lipsO.add(ring); const inner = new T.Mesh(new T.CircleGeometry(0.07, 24), new T.MeshBasicMaterial({ color: 0x1a0505 })); inner.position.set(0, mouthY, 0.89); lipsO.add(inner);
    // ears, neck, shoulders (collar)
    [1, -1].forEach(s => { const e = new T.Mesh(new T.SphereGeometry(1, 20, 16), skin); e.scale.set(0.1, 0.22, 0.15); e.position.set(s * 0.84, 0.02, 0.0); grp.add(e); });
    const neck = new T.Mesh(new T.CylinderGeometry(0.34, 0.4, 0.8, 24), skin); neck.position.set(0, -1.15, -0.05); grp.add(neck);
    const garm = new T.MeshStandardMaterial({ color: new T.Color(0.5, 0.45, 0.36), roughness: 0.8 }); const sh = new T.Mesh(new T.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), garm); sh.scale.set(1.5, 0.75, 0.9); sh.position.set(0, -1.65, -0.1); grp.add(sh); mats.push(garm);
    // hair
    const cap = new T.SphereGeometry(1.05, 64, 40, 0, Math.PI * 2, 0, 2.15); { const p = cap.attributes.position; for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (z > 0.1 && y < 0.55) { const k = 1.05 / Math.hypot(x, 0.55, z); x *= k; z *= k; y = 0.55; } p.setXYZ(i, x * 0.84 * (1 - 0.0), y * 1.02, z * 0.95); } cap.computeVertexNormals(); }
    const capM = new T.Mesh(cap, hair); capM.castShadow = true; grp.add(capM);
    const st = v.style; const hr = H.rng(v.seed || 5);
    const strand = new T.ConeGeometry(0.014, 1, 5, 1); strand.translate(0, -0.5, 0);
    const addStrands = (n, fn) => { const im = new T.InstancedMesh(strand, hair, n); const m4 = new T.Matrix4(), q = new T.Quaternion(), p3 = new T.Vector3(), s3 = new T.Vector3(); for (let i = 0; i < n; i++) { const o = fn(i, n); p3.set(o.p[0], o.p[1], o.p[2]); const d = V3(o.d[0], o.d[1], o.d[2]).normalize(); q.setFromUnitVectors(V3(0, -1, 0), d); s3.set(1, o.l, 1); m4.compose(p3, q, s3); im.setMatrixAt(i, m4); } im.castShadow = true; grp.add(im); };
    if (st === 'bangs') addStrands(170, (i, n) => { const x = -0.78 + 1.56 * (i / (n - 1)) + (hr() - 0.5) * 0.03; const z = Math.sqrt(Math.max(0.05, 1 - x * x / 0.7)) * 0.93; return { p: [x, 0.6 + (hr() - 0.5) * 0.05, z * 1.04], d: [(hr() - 0.5) * 0.25 + x * 0.12, -1, 0.28 + hr() * 0.1], l: 0.2 + 0.12 * Math.cos(x * 1.6) + hr() * 0.07 }; });
    else if (st === 'bob') { addStrands(150, (i, n) => { const x = -0.8 + 1.6 * (i / (n - 1)); const z = Math.sqrt(Math.max(0.05, 1 - x * x / 0.7)) * 0.9; return { p: [x, 0.58, z], d: [x * 0.15, -1, 0.2], l: 0.25 + hr() * 0.08 }; }); [1, -1].forEach(s => { const b = new T.Mesh(new T.SphereGeometry(1, 20, 16), hair); b.scale.set(0.16, 0.7, 0.4); b.position.set(s * 0.88, -0.25, 0.0); grp.add(b); }); }
    else if (st === 'curly') { const n = 150; const im = new T.InstancedMesh(new T.SphereGeometry(0.15, 12, 10), hair, n); const m4 = new T.Matrix4(); for (let i = 0; i < n; i++) { const th = Math.acos(1 - 1.4 * hr()), ph = hr() * 6.283; let x = Math.sin(th) * Math.cos(ph), z = Math.sin(th) * Math.sin(ph) * 0.95, y = Math.cos(th); if (z > 0.2 && y < 0.62) y = 0.62 + hr() * 0.1; m4.makeTranslation(x * 0.95, y * 1.05, z); const sc = 0.8 + hr() * 0.7; m4.scale(V3(sc, sc, sc)); im.setMatrixAt(i, m4); } grp.add(im); }
    else if (st === 'pony') { addStrands(90, (i, n) => { const x = -0.7 + 1.4 * (i / (n - 1)); return { p: [x, 0.58, Math.sqrt(Math.max(0.05, 1 - x * x / 0.7)) * 0.95], d: [x * 0.2, -1, 0.2], l: 0.12 + hr() * 0.05 }; }); const bun = new T.Mesh(new T.SphereGeometry(0.34, 20, 16), hair); bun.position.set(0, 0.85, -0.85); grp.add(bun); const tail = new T.Mesh(H.sweep(new T.CatmullRomCurve3([V3(0, 0.8, -0.85), V3(0, 0.3, -1.25), V3(0.1, -0.5, -1.2)]), u => 0.2 * (1 - u * 0.7) + 0.03, 20, 8), hair); grp.add(tail); }
    else { addStrands(60, (i, n) => { const x = -0.7 + 1.4 * (i / (n - 1)); return { p: [x, 0.6, Math.sqrt(Math.max(0.05, 1 - x * x / 0.7)) * 0.95], d: [x * 0.4, -1, 0.1], l: 0.08 + hr() * 0.05 }; }); }
    // age: younger = rounder, larger eyes
    const age = (v.age - 4) / 8; grp.scale.set(1 + (0.1 - age * 0.1), 1, 1 + (0.06 - age * 0.06)); eyes.forEach(e => e.scale.setScalar(1.12 - age * 0.18));
    grp.userData = { mats, skin, eyes, refs };
    return grp;
  }

  function build(g, ctx) {
    const root = ctx.root, scene = ctx.scene; H.updaters = []; H.parts = [];
    const rr = H.rng(g.seed ^ 0xface);
    // dome: dark, with the pale horizon strip, and the table edge of the cake at the bottom of frame
    const bgm = new T.MeshBasicMaterial({ color: 0x020101, side: T.BackSide }); root.add(new T.Mesh(new T.SphereGeometry(40, 24, 16), bgm));
    const strip = new T.Mesh(new T.TorusGeometry(26, 0.06, 8, 160, Math.PI * 1.2), new T.MeshBasicMaterial({ color: new T.Color(0.5, 0.52, 0.5), toneMapped: false })); strip.rotation.x = Math.PI / 2; strip.rotation.z = Math.PI * 0.9; strip.position.y = -0.2; root.add(strip);
    const table = new T.Mesh(new T.CylinderGeometry(7, 7, 0.2, 6), new T.MeshStandardMaterial({ color: 0xcdb27a, roughness: 0.8 })); table.position.set(0, -2.45, 1.0); table.rotation.y = 0.5; table.receiveShadow = true; root.add(table);
    const cake = new T.Mesh(new T.CylinderGeometry(2.6, 2.6, 1.1, 96), new T.MeshStandardMaterial({ color: 0xe6c98e, roughness: 0.6 })); cake.position.set(0.2, -1.8, 2.2); cake.castShadow = true; root.add(cake);
    // the faces
    const faces = []; const refs = {}; const main = makeFace(g, { skin: g.skin, hair: g.hair, style: g.style, iris: g.iris, age: g.age, seed: g.seed }, false, refs); main.position.set(0, 0.0, 0.9); root.add(main); faces.push(main);
    if (g.count > 1) { const r2 = {}; const f2 = makeFace(g, { skin: (g.skin + 3) % 6, hair: (g.hair + 2) % 6, style: STYLES[(STYLES.indexOf(g.style) + 2) % 5], iris: 0.07, age: g.age + 1, seed: g.seed + 3 }, true, r2); f2.position.set(-2.4, -0.15, -0.6); f2.rotation.y = 0.45; f2.scale.multiplyScalar(0.98); root.add(f2); faces.push(f2); }
    if (g.count > 2) { const r3 = {}; const f3 = makeFace(g, { skin: (g.skin + 1) % 6, hair: (g.hair + 4) % 6, style: STYLES[(STYLES.indexOf(g.style) + 3) % 5], iris: 0.55, age: g.age - 1, seed: g.seed + 9 }, true, r3); f3.position.set(2.6, -0.5, -0.2); f3.rotation.y = -0.5; f3.scale.multiplyScalar(0.9); root.add(f3); faces.push(f3); }
    // the foreground candle and its flame (the rack-focus partner of the face)
    const glow = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,230,170,1)'); gr.addColorStop(0.2, 'rgba(255,170,70,0.5)'); gr.addColorStop(1, 'rgba(255,100,20,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
    const candle = new T.Group(); candle.position.set(-1.35, -1.25, 3.0); const wax = new T.Mesh(new T.CylinderGeometry(0.06, 0.065, 1.1, 20), new T.MeshPhysicalMaterial({ color: 0xe9c04a, roughness: 0.4, clearcoat: 0.3 })); wax.position.y = 0.55; candle.add(wax);
    const pts = []; for (let k = 0; k <= 20; k++) { const t = k / 20; pts.push(new T.Vector2(0.06 * Math.sin(Math.PI * Math.pow(t, 0.62)) * (1 - 0.35 * t), t * 0.3)); } const fg = new T.LatheGeometry(pts, 18);
    const fm = new T.MeshBasicMaterial({ color: new T.Color(4.0, 2.6, 1.0), toneMapped: false }), fc = new T.MeshBasicMaterial({ color: new T.Color(3.0, 3.2, 4.0), toneMapped: false });
    const flame = new T.Group(); flame.position.y = 1.16; const f1 = new T.Mesh(fg, fm), f2 = new T.Mesh(fg, fc); f2.scale.set(0.45, 0.4, 0.45); flame.add(f1, f2); const halo = new T.Sprite(new T.SpriteMaterial({ map: glow, color: 0xffb060, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9, toneMapped: false })); halo.scale.set(1.3, 1.3, 1); halo.position.y = 0.15; flame.add(halo); candle.add(flame); root.add(candle);
    // light: the candle below the face + a low fill
    const L1 = new T.PointLight(0xff9440, 1, 20, 1.5); L1.position.set(-0.4, -1.3, 2.4); L1.userData.heroLight = true; scene.add(L1); const L2 = new T.PointLight(0xff8030, 1, 16, 1.6); L2.position.set(0.3, -1.6, 1.8); L2.userData.heroLight = true; scene.add(L2);
    H.focusRack = { a: candle.position.clone().add(V3(0, 1.2, 0)), b: V3(0, 0.15, 1.7), t: g.focus };
    const VIEWS = { front: { y: 0.0, p: -0.08 }, low: { y: 0.18, p: -0.28 } }; const vw = VIEWS[g.view] || VIEWS.front;
    H.overviewFrame = { pos: [0.2, -0.1, 0.9], dist: 7.2, yaw: vw.y, pitch: vw.p };
    H.parts = [
      { id: 'FACE', name: 'THE FACE IN CANDLELIGHT', focus: { pos: [0, 0.05, 1.1], dist: 4.6, yaw: 0.0, pitch: -0.1 }, ring: 1 },
      { id: 'EYES', name: 'THE EYES CATCH THE FLAME', focus: { pos: [0, 0.2, 1.65], dist: 2.2, yaw: 0.0, pitch: -0.06 }, ring: 3 },
      { id: 'MOUTH', name: 'THE BREATH BEFORE THE WISH', focus: { pos: [0, -0.5, 1.8], dist: 2.4, yaw: 0.0, pitch: -0.12 }, ring: 2 },
      { id: 'HAIR', name: 'THE FRINGE', focus: { pos: [0, 0.6, 1.5], dist: 3.2, yaw: 0.3, pitch: 0.1 }, ring: 4 },
      { id: 'FLAME', name: 'THE FLAME ITSELF', focus: { pos: [-1.35, -0.05, 3.0], dist: 1.5, yaw: 0.2, pitch: 0.02 }, ring: 3 },
      { id: 'COMPANY', name: 'THE OTHERS, HALF-REMEMBERED', focus: { pos: [-1.2, -0.2, 0.0], dist: 7.5, yaw: 0.4, pitch: 0.0 }, ring: 0 },
    ];
    const allMats = new Set(); faces.forEach(f => f.userData.mats.forEach(m => allMats.add(m)));
    // life
    H.blown = H.blown || 0; H.blowT = 0;
    H.updaters.push((dt, t) => {
      const lit = H.blown ? Math.max(0, 1 - H.blowT) : 1; if (H.blown) H.blowT = Math.min(2, H.blowT + dt * 0.8);
      const fl = 0.85 + 0.18 * Math.sin(t * 11) + 0.1 * Math.sin(t * 23) + 0.06 * Math.sin(t * 47); const k = lit < 0.02 ? 0.0001 : fl * (0.4 + 0.6 * lit);
      flame.scale.set(k, k * (0.9 + 0.25 * Math.sin(t * 8)), k); flame.rotation.z = Math.sin(t * 3.3) * 0.12 + (H.blown ? Math.min(1, H.blowT * 1.6) * 1.0 : 0); halo.material.opacity = 0.5 * lit; flame.visible = lit > 0.02;
      const I = (0.1 + 1.5 * g.glow * g.glow) * lit * (0.92 + 0.08 * Math.sin(t * 13) + 0.05 * Math.sin(t * 29)); L1.intensity = I; L2.intensity = I * 0.55;
      const tmp = g.temp; const tint = H.post.uniforms.tintA.value; tint.set(1 - 0.28 * Math.max(0, -tmp) + 0.1 * Math.max(0, tmp), 1 + 0.02 * Math.max(0, -tmp) - 0.06 * Math.max(0, tmp), 1 + 0.14 * Math.max(0, -tmp) - 0.22 * Math.max(0, tmp)); [L1, L2].forEach(L => L.color.setRGB(1 - 0.45 * Math.max(0, -tmp), 0.58 + 0.2 * Math.max(0, -tmp), 0.25 + 0.7 * Math.max(0, -tmp)));
      H.post.uniforms.exposure.value = 0.62 + 0.25 * g.glow; H.focusRack.t = g.focus; H.aperture = 0.9 + 0.5 * (1 - Math.abs(g.focus - 0.5) * 0.4); H.lensBias = 0;
      // ghost -> solid
      const sol = g.solid; allMats.forEach(m => { if (sol < 0.985) { m.transparent = true; m.opacity = 0.1 + 0.9 * sol; m.depthWrite = sol > 0.7; } else { m.opacity = 1; m.transparent = false; m.depthWrite = true; } });
      // expression: neutral -> smile -> blow
      const e = g.expr; const smile = e < 0.5 ? e / 0.5 : clamp(1 - (e - 0.5) / 0.3, 0, 1); const blowK = clamp((e - 0.55) / 0.4, 0, 1); const lq = H.blown ? 1 : 0;
      faces.forEach((f, i) => { const R = f.userData.refs; if (!R.mouth) return; const my = i === 0 ? 1 : 0.3 + 0.7 * smile; R.mouth.lipsC.visible = blowK < 0.5; R.mouth.lipsO.visible = blowK >= 0.5; R.mouth.lipsC.position.y = 0.012 * smile; R.mouth.lipsC.scale.set(1 + 0.12 * smile, 1 + 0.1 * smile, 1); const sO = 0.5 + 0.9 * blowK; R.mouth.lipsO.scale.set(sO, sO, 1 + blowK); R.mouth.lipsO.position.z = 0.02 * blowK; f.userData.eyes.forEach(eg => { eg.userData.iris.position.y = -0.03 * g.gaze - 0.012 * blowK; eg.userData.lid.rotation.x = -0.55 + 0.18 * (1 - blowK) - 0.2 * smile + 0.1 * Math.sin(t * 0.6 + i) * 0.1; }); f.rotation.x = -0.04 - 0.05 * g.gaze + 0.02 * Math.sin(t * 0.8 + i); });
      faces.forEach((f, i) => { if (i === 0) { f.position.y = 0.01 * Math.sin(t * 1.2); } });
    });
    H.focusPoint = V3(0, 0.1, 1.6); H.faceRefs = { faces, flame, candle };
  }
  function onDial(ring, ang) { const g = H.genome, v = valOf(ang); if (ring === 0) g.solid = v; else if (ring === 1) g.focus = v; else if (ring === 2) g.expr = v; else if (ring === 3) g.glow = v; else if (ring === 4) g.temp = v * 2 - 1; g.variant = -1; }
  H.register('child', {
    ref: { sec: 172, frame: { pos: [0.2, -0.1, 0.9], dist: 5.2, yaw: 0, pitch: -0.1 } },
    mood: () => 'amber', makeGenome, build, filmCanon, dials, onDial, variants: FILM_VARIANTS,
    get overview() { return H.overviewFrame || { pos: [0.2, -0.1, 0.9], dist: 7.2, yaw: 0, pitch: -0.08 }; },
    mutate(g, r, k) { const c = Object.assign({}, g); if (r() < 0.6 * k) c.skin = (r() * SKINS.length) | 0; if (r() < 0.6 * k) c.hair = (r() * HAIRS.length) | 0; if (r() < 0.55 * k) c.style = pick(r, STYLES); if (r() < 0.4 * k) c.iris = r(); c.age = clamp(Math.round(c.age + (r() - 0.5) * 6 * k), 4, 12); c.expr = clamp(c.expr + (r() - 0.5) * 0.9 * k, 0, 1); c.glow = clamp(c.glow + (r() - 0.5) * 0.4 * k, 0.3, 1); c.temp = clamp(c.temp + (r() - 0.5) * 0.7 * k, -0.7, 0.9); if (r() < 0.4 * k) c.count = 1 + ((r() * 3) | 0); c.solid = 1; c.focus = clamp(0.75 + r() * 0.25, 0, 1); c.variant = -1; c.seed = (r() * 4294967295) >>> 0; return c; },
    labels: ['L1:GEOM.SOLID', 'L2:FACE.DOF', 'L3:EXPRESSION', 'R1:CANDLE.LUMA', 'R2:SKIN.TINT'],
    readout: (g, i) => [g.solid > 0.97 ? 'SOLID' : g.solid < 0.05 ? 'GHOST' : `SOLID ${Math.round(g.solid * 100)}%`, g.focus < 0.3 ? 'ON THE FLAME' : g.focus > 0.8 ? 'ON THE FACE' : `RACK ${Math.round(g.focus * 100)}%`, g.expr < 0.2 ? 'NEUTRAL' : g.expr < 0.55 ? 'SMILE' : g.expr < 0.8 ? 'PURSING' : 'BLOWING', `CANDLE ${Math.round(g.glow * 100)}%`, `${Math.round(4800 - 3000 * g.temp)}K`][i],
    title: g => `CHILD · ${g.age} YEARS · ${g.count} ${g.count > 1 ? 'FACES' : 'FACE'}`,
    caption: ['PROCEDURAL CHILD, LIT BY ONE CANDLE,', 'RENDERED LIVE IN YOUR BROWSER.'],
    spec: g => [['CHILD', g.age + ' years old'], ['SKIN', SKINS[g.skin][0]], ['HAIR', HAIRS[g.hair][0] + ', ' + g.style], ['EYES', 'hue ' + Math.round(g.iris * 360) + '°'], ['EXPRESSION', g.expr < 0.2 ? 'neutral' : g.expr < 0.55 ? 'smiling' : g.expr < 0.8 ? 'about to blow' : 'blowing'], ['LIGHT', 'one candle from below, ' + Math.round(g.glow * 100) + '%, ' + Math.round(4800 - 3000 * g.temp) + 'K'], ['COMPANY', g.count + (g.count > 1 ? ' faces, the others half-remembered' : ' face')]],
  });
})();

// ============================================================================
// BUG DESIGNER (Protocol I) v2  -  a morphological family, not a recolour.
// Body plans (carabid, longhorn, weevil, stag, scarab, fly, jumper) x seven eye
// types (compound, dome, stalk, spider, mantis, simple, notched) x antennae,
// jaws, wings, leg counts, patterns, staging. The five rings still edit it:
// L1 HEX.FACET  facet density / eye size   L2 OPTIC.DOME focus + eye bulge
// L3 SETAE      bristle count + length     R1 MAND.GAIT  jaw + leg motion
// R2 CHITIN.NM  structural-colour hue
// ============================================================================
(function () {
  'use strict';
  const A = window.ATLAS, H = A.hero; if (!A || !H) return;
  const T = THREE, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  const pick = (r, arr) => arr[(r() * arr.length) | 0];

  const FILM_VARIANTS = [
    { code: 'CANONICAL [LONGHORN / 520nm / 165_HEX]', patch: { facets: 0.48, chitin: 0.26, setae: 0.6, focus: 0.7, gait: 0.35, split: 0 } },
    { code: 'OTHERWISE I: SCARAB.AURUM [585nm / 280_HEX / LONG SETAE]', patch: { facets: 0.92, chitin: 0.47, setae: 1.0, focus: 0.8, gait: 0.55, split: 0, dull: 0.0, plan: 'scarab', eyeType: 'compound' } },
    { code: 'OTHERWISE II: OBSIDIAN.VOID [455nm / 52_HEX / BALD]', patch: { facets: 0.05, chitin: 0.04, setae: 0.0, focus: 0.7, gait: 0.85, split: 0, dull: 0.1, plan: 'stag', eyeType: 'notched' } },
    { code: 'OTHERWISE III: HETEROCERA.SPLIT [DX:260_GOLD / SN:58_CYAN]', patch: { facets: 0.85, chitin: 0.40, setae: 0.75, focus: 0.75, gait: 0.5, split: 1, plan: 'fly', eyeType: 'dome' } },
  ];
  const LATIN_A = ['Carabus', 'Scarabaeus', 'Chrysina', 'Cicindela', 'Lucanus', 'Cerambyx', 'Rhynchites', 'Phidippus', 'Calliphora', 'Aurora', 'Memoria', 'Stelline'];
  const LATIN_B = ['stellinae', 'imaginata', 'oculata', 'viridis', 'nocturna', 'memorialis', 'aurumque', 'lucida', 'regalis', 'umbrosa', 'cristata', 'fulgens'];

  // ---- body plans: the starting points of the family ---------------------------------
  const PLANS = {
    carabid:  { head: 0.95, thorax: [0.95, 0.62, 0.85], body: 'elytra', bodyLen: 1.75, bodyWid: 0.5, bodyH: 0.58, legs: 6, legLen: 1.0, legThick: 1.4, stance: 1.0, jaw: 'pincer', jawLen: 0.9, ant: 'filiform', antLen: 1.0, eyes: ['compound', 'notched', 'dome'], wings: 'none' },
    longhorn: { head: 1.1, thorax: [0.9, 0.85, 0.95], body: 'elytra', bodyLen: 1.9, bodyWid: 0.5, bodyH: 0.5, legs: 6, legLen: 1.2, legThick: 1.3, stance: 1.1, jaw: 'pincer', jawLen: 0.6, ant: 'filiform', antLen: 2.2, eyes: ['compound', 'notched'], wings: 'none' },
    weevil:   { head: 0.8, thorax: [0.8, 0.8, 0.75], body: 'elytra', bodyLen: 1.2, bodyWid: 0.62, bodyH: 0.75, legs: 6, legLen: 0.9, legThick: 1.5, stance: 0.9, jaw: 'snout', jawLen: 1.4, ant: 'clubbed', antLen: 1.0, eyes: ['simple', 'compound'], wings: 'none' },
    stag:     { head: 1.2, thorax: [1.0, 0.7, 0.9], body: 'elytra', bodyLen: 1.6, bodyWid: 0.55, bodyH: 0.52, legs: 6, legLen: 1.05, legThick: 1.6, stance: 1.0, jaw: 'stag', jawLen: 1.6, ant: 'clubbed', antLen: 0.8, eyes: ['notched', 'compound'], wings: 'none' },
    scarab:   { head: 0.7, thorax: [1.1, 0.8, 0.8], body: 'elytra', bodyLen: 1.1, bodyWid: 0.66, bodyH: 0.95, legs: 6, legLen: 0.75, legThick: 2.0, stance: 0.7, jaw: 'none', jawLen: 0.5, ant: 'comb', antLen: 0.7, eyes: ['compound', 'notched'], wings: 'none' },
    fly:      { head: 1.1, thorax: [0.8, 0.75, 0.8], body: 'membrane', bodyLen: 1.5, bodyWid: 0.5, bodyH: 0.5, legs: 6, legLen: 1.3, legThick: 0.8, stance: 1.0, jaw: 'none', jawLen: 0.4, ant: 'clubbed', antLen: 0.5, eyes: ['dome'], wings: 'membrane' },
    jumper:   { head: 1.0, thorax: [0.9, 0.62, 0.9], body: 'abdomen', bodyLen: 1.2, bodyWid: 0.8, bodyH: 0.75, legs: 8, legLen: 0.95, legThick: 1.2, stance: 1.15, jaw: 'none', jawLen: 0.4, ant: 'none', antLen: 0, eyes: ['spider'], wings: 'none' },
    mantis:   { head: 0.9, thorax: [0.45, 0.4, 1.5], body: 'abdomen', bodyLen: 1.6, bodyWid: 0.4, bodyH: 0.4, legs: 6, legLen: 1.3, legThick: 1.0, stance: 1.3, jaw: 'none', jawLen: 0.4, ant: 'filiform', antLen: 0.7, eyes: ['mantis'], wings: 'none' },
  };
  const EYE_TYPES = ['compound', 'dome', 'stalk', 'spider', 'mantis', 'simple', 'notched'];
  const PATTERNS = ['plain', 'stripes', 'bands', 'spots', 'marble'];
  const STAGES = ['bokeh', 'dusk', 'studio', 'paper', 'moss', 'leaf'];

  function makeGenome(seed) {
    const r = H.rng(seed); const plan = pick(r, Object.keys(PLANS)); const P = PLANS[plan];
    const j = (v, k) => v * (1 + (r() - 0.5) * k);
    const g = { kind: 'bug', seed, plan, eyeType: pick(r, P.eyes.concat(r() < 0.25 ? EYE_TYPES : [])),
      facets: 0.15 + r() * 0.8, focus: 0.5 + r() * 0.4, setae: r() < 0.3 ? 0 : r() * 0.9, gait: 0.2 + r() * 0.6, chitin: r(), split: 0, dull: r() < 0.45 ? 0.5 + r() * 0.45 : r() * 0.25, metal: r() < 0.3 ? 0.5 + 0.4 * r() : 0.1,
      head: j(P.head, 0.3), thorax: P.thorax.map(v => j(v, 0.25)), body: P.body, bodyLen: j(P.bodyLen, 0.3), bodyWid: j(P.bodyWid, 0.25), bodyH: j(P.bodyH, 0.3),
      legs: P.legs, legLen: j(P.legLen, 0.35), legThick: j(P.legThick, 0.35), stance: j(P.stance, 0.25), jaw: P.jaw, jawLen: j(P.jawLen, 0.4), ant: P.ant, antLen: j(P.antLen, 0.4), wings: P.wings,
      eyeSize: 0.8 + r() * 0.5, eyeHue: r(), pattern: pick(r, PATTERNS), patHue: r(), stage: pick(r, STAGES), view: pick(r, ['front', 'tq', 'tq', 'side', 'high']), mm: Math.round(4 + r() * 40), variant: -1 };
    g.name = pick(r, LATIN_A) + ' ' + pick(r, LATIN_B);
    return g;
  }
  function filmCanon(seed) {
    const g = makeGenome(seed); const P = PLANS.longhorn;
    Object.assign(g, FILM_VARIANTS[0].patch, { plan: 'longhorn', eyeType: 'compound', head: 1.15, thorax: P.thorax, body: 'elytra', bodyLen: 1.9, bodyWid: 0.5, bodyH: 0.5, legs: 6, legLen: 1.15, legThick: 0.95, stance: 1.1, jaw: 'pincer', jawLen: 0.75, ant: 'filiform', antLen: 2.0, wings: 'none', dull: 0.85, metal: 0.05, pattern: 'plain', stage: 'bokeh', view: 'front', eyeSize: 1.0, eyeHue: 0.25, name: 'Cerambyx stellinae', mm: 22, variant: 0 });
    return g;
  }

  const dialOf = v => 20 + 180 * clamp(v, 0, 1);
  const valOf = a => clamp((((a % 360) + 360) % 360 - 20) / 180, 0, 1);
  const dials = g => [dialOf(g.facets), dialOf(g.focus), dialOf(g.setae), dialOf(g.gait), dialOf(g.chitin)];
  const chitinColor = (g, k) => new T.Color().setHSL((0.55 - 0.9 * g.chitin + 2) % 1, clamp(0.85 * (k || 1) * (1 - 0.82 * g.dull), 0.04, 0.95), 0.06 * (k || 1) + 0.012 + 0.012 * g.dull);

  // ---- procedural maps --------------------------------------------------------------------
  function hexBump(density) {
    return (() => { const tex = H.noiseTex(512, (u, v) => { const s = 10, yy = v * s * 1.1547, rr = Math.floor(yy / 1.1547), off = rr % 2 ? 0.5 : 0; const fx = ((u * s + off) % 1 + 1) % 1 - 0.5, fy = (yy / 1.1547 % 1 + 1) % 1 - 0.5; const d = Math.hypot(fx, fy * 0.92) / 0.54; const h = d < 1 ? Math.sqrt(1 - d * d) : 0; const c = Math.round(60 + 195 * h); return [c, c, c]; }, false); tex.repeat.set(density, density * 0.8); return tex; })();
  }
  const mottle = () => H.noiseTex(512, (u, v) => { const n = H.fbm(u * 14, v * 14, 5), p = H.vnoise(u * 120, v * 120); const m = 0.55 + 0.9 * n - 0.18 * (p > 0.8 ? 1 : 0) + 0.12 * H.vnoise(u * 60, v * 60); const c = Math.round(clamp(m, 0.3, 1.4) * 190); return [c, c, c]; }, true, 2);
  function patternMap(g) {
    const col = chitinColor(g, 1), alt = new T.Color().setHSL((0.55 - 0.9 * g.patHue + 2) % 1, clamp(0.6 * (1 - 0.6 * g.dull), 0.1, 0.8), 0.28 + 0.1 * g.dull);
    return H.noiseTex(256, (u, v) => { let m = 0; const P = g.pattern;
      if (P === 'stripes') m = Math.abs(Math.sin(u * Math.PI * 2 * 3)) > 0.8 ? 1 : 0; else if (P === 'bands') m = (Math.sin(v * Math.PI * 12) > 0.65 && Math.abs(u - 0.5) < 0.4) ? 1 : 0; else if (P === 'spots') m = H.vnoise(u * 9, v * 9) > 0.72 ? 1 : 0; else if (P === 'marble') m = clamp(H.fbm(u * 6, v * 6, 4) * 2 - 0.7, 0, 1);
      const c = col.clone().lerp(alt, m); const n = 0.9 + 0.2 * H.fbm(u * 30, v * 30, 2); return [c.r * 255 * n * 2.0, c.g * 255 * n * 2.0, c.b * 255 * n * 2.0]; }, true);
  }

  // ---- stage (backdrop + ground) -------------------------------------------------------------
  function buildStage(g, root) {
    const st = g.stage; let floorCol = 0x0a1208, rough = 0.9;
    const gradTex = (fn) => H.noiseTex(256, fn, true);
    const bp = (tex, sc, y, z) => { const m = new T.MeshBasicMaterial({ map: tex, toneMapped: false, side: T.BackSide }); m.color.setScalar(sc); const p = new T.Mesh(new T.SphereGeometry(48, 48, 32), m); p.position.set(0, 0, 0); p.rotation.y = Math.PI; root.add(p); return p; };
    if (st === 'bokeh') { bp(gradTex((u, v) => { const n = H.fbm(u * 3, v * 3, 3); return [100 + 50 * (1 - v) + 30 * n, 135 + 50 * (1 - v) + 25 * n, 70 + 30 * n]; }), 0.36, 6, -9); floorCol = 0x0d1a08; }
    else if (st === 'dusk') { bp(gradTex((u, v) => [190 + 50 * v, 110 + 50 * v, 50 + 20 * v]), 0.22, 6, -11); const lr = H.rng(g.seed ^ 91); const dm = new T.MeshBasicMaterial({ color: new T.Color(3.2, 2.0, 0.9), toneMapped: false }); for (let i = 0; i < 46; i++) { const d = new T.Mesh(new T.CircleGeometry(0.05 + lr() * 0.12, 16), dm); d.position.set((lr() - 0.5) * 26, 0.5 + lr() * 9, -9 - lr() * 3); root.add(d); } floorCol = 0x1a0f08; }
    else if (st === 'studio') { bp(gradTex((u, v) => [18 + 40 * v, 20 + 36 * v, 26 + 30 * v]), 0.8, 6, -10); floorCol = 0x050607; rough = 0.35; }
    else if (st === 'paper') { bp(gradTex((u, v) => [225 + 20 * v, 214 + 18 * v, 190 + 14 * v]), 0.62, 6, -10); floorCol = 0xd8cdb4; rough = 0.8; }
    else if (st === 'moss') { bp(gradTex((u, v) => { const n = H.fbm(u * 4, v * 4, 4); return [20 + 40 * n, 50 + 70 * n, 20 + 30 * n]; }), 0.7, 6, -10); floorCol = 0x16240d; }
    // ground
    const geo = new T.PlaneGeometry(26, 26, 100, 100); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); let y = 0; if (st === 'leaf') y = 0.045 * Math.pow(Math.abs(Math.sin((z * 0.9 - Math.abs(x) * 1.1) * 1.6)), 6) - 0.06 * Math.exp(-x * x * 8) + 0.04 * H.fbm(x * 0.7, z * 0.7, 3); else if (st === 'moss') y = 0.16 * H.fbm(x * 1.4, z * 1.4, 5); else if (st !== 'paper' && st !== 'studio') y = 0.05 * H.fbm(x * 0.8, z * 0.8, 3); p.setY(i, y); }
    geo.computeVertexNormals();
    const col = st === 'leaf' ? new T.Color(0.022, 0.075, 0.02) : new T.Color(floorCol);
    const m = new T.MeshStandardMaterial({ color: col, roughness: st === 'leaf' ? 0.68 : rough, metalness: st === 'studio' ? 0.2 : 0, envMapIntensity: st === 'studio' ? 0.9 : 0.4, bumpMap: H.noiseTex(512, (u, v) => { const c = Math.round(110 + 70 * H.fbm(u * 8, v * 8, 3)); return [c, c, c]; }, false, 2), bumpScale: st === 'moss' ? 1.5 : 0.25 });
    const mesh = new T.Mesh(geo, m); mesh.receiveShadow = true; root.add(mesh);
    if (st === 'leaf' || st === 'moss') { const dewMat = new T.MeshPhysicalMaterial({ color: 0x18262c, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 1.1 }); const dr = H.rng(g.seed ^ 77); for (let i = 0; i < 14; i++) { const r = 0.07 + dr() * 0.2; const d = new T.Mesh(new T.SphereGeometry(r, 20, 14), dewMat); const a = dr() * 6.28, rad = 1.8 + dr() * 5; d.position.set(Math.cos(a) * rad, r * 0.45, Math.sin(a) * rad); d.scale.y = 0.55; root.add(d); } }
  }

  // ---- eyes -----------------------------------------------------------------------------------
  function facetMat(g, side, hueShift) {
    const split = g.split && side < 0; const f = split ? 0.06 : g.facets; const dens = 7 + f * 30;
    const col = split ? new T.Color().setHSL(0.52, 0.5, 0.2) : new T.Color().setHSL((g.eyeHue + (hueShift || 0)) % 1, 0.85 * (1 - 0.97 * g.dull), 0.05 - 0.02 * g.dull);
    const m = new T.MeshPhysicalMaterial({ color: col, roughness: 0.3 + 0.35 * g.dull, metalness: 0.05, clearcoat: 0.55 - 0.4 * g.dull, clearcoatRoughness: 0.06, bumpMap: hexBump(dens), bumpScale: 1.1 + f * 0.8, envMapIntensity: 0.4 * (1 - 0.8 * g.dull) });
    m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n float pp = dot(normalize(vViewPosition), normal); diffuseColor.rgb *= mix(1.0, 0.12, smoothstep(0.80, 0.96, pp)); diffuseColor.rgb += vec3(0.05,0.025,0.0) * smoothstep(0.35,0.7,pp) * (1.0 - smoothstep(0.7,0.95,pp));'); };
    return m;
  }
  function glossBead(g, hue, sat, light) { return new T.MeshPhysicalMaterial({ color: new T.Color().setHSL(hue, sat, light), roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.4 }); }

  function build(g, ctx) {
    const root = ctx.root; H.updaters = []; H.parts = [];
    buildStage(g, root);
    const LH = g.plan === 'longhorn';
    const chitin = H.iridescent(new T.MeshPhysicalMaterial({ color: chitinColor(g), map: mottle(), roughness: 0.3 + 0.4 * g.dull, metalness: g.metal, clearcoat: 1 - 0.85 * g.dull, clearcoatRoughness: 0.08 + 0.3 * g.dull }), 0.14 * (1 - g.dull) + 0.08 * g.metal);
    chitin.envMapIntensity *= (1 - 0.65 * g.dull);
    const elyMat = H.iridescent(new T.MeshPhysicalMaterial({ color: 0xffffff, map: patternMap(g), roughness: 0.28 + 0.4 * g.dull, metalness: g.metal, clearcoat: 1 - 0.85 * g.dull, clearcoatRoughness: 0.06 + 0.3 * g.dull }), 0.16 * (1 - g.dull) + 0.08 * g.metal); elyMat.envMapIntensity *= (1 - 0.65 * g.dull);
    const dark = new T.MeshPhysicalMaterial({ color: new T.Color(0.03, 0.02, 0.014), roughness: 0.32, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.2, envMapIntensity: 0.6 });
    const bug = new T.Group(); root.add(bug); H.mats = { chitin, elyMat, dark };
    const ell = (mat, r, c, seg) => { const m = new T.Mesh(new T.SphereGeometry(1, seg || 64, 40), mat); m.scale.set(r[0], r[1], r[2]); m.position.set(c[0], c[1], c[2]); m.castShadow = m.receiveShadow = true; return m; };
    const legH = g.stance; const bodyY = 1.0 + 0.35 * legH;
    // thorax + head
    const th = g.thorax; const thorax = ell(chitin, [th[0], th[1], th[2]], [0, bodyY + 0.1, -0.15]); bug.add(thorax);
    { const gp = thorax.geometry.attributes.position; for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), y = gp.getY(i), z = gp.getZ(i); const k = 1 - 0.06 * Math.exp(-x * x * 40) * (y > 0 ? 1 : 0) + 0.025 * Math.sin(z * 9) * (y > 0 ? 1 : 0); gp.setXYZ(i, x * k, y, z); } thorax.geometry.computeVertexNormals(); }
    const hs = g.head, headC = [0, bodyY + 0.02, 0.95 + 0.25 * hs];
    const headR = g.plan === 'jumper' ? [0.62 * hs, 0.55 * hs, 0.55 * hs] : g.plan === 'fly' ? [0.6 * hs, 0.62 * hs, 0.5 * hs] : LH ? [0.72 * hs, 0.7 * hs, 0.6 * hs] : [0.62 * hs, 0.55 * hs, 0.6 * hs];
    const head = ell(chitin, headR, headC); bug.add(head);
    // body (elytra / abdomen / wings)
    const elytra = [], wings = [];
    if (g.body === 'elytra') {
      const eg = new T.SphereGeometry(1, 64, 40); { const p = eg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setXYZ(i, x, y + 0.025 * Math.sin(x * 22) * Math.max(0, y), z); } eg.computeVertexNormals(); }
      [-1, 1].forEach(s => { const e = new T.Mesh(eg, elyMat); e.scale.set(g.bodyWid, g.bodyH, 1.75 * g.bodyLen * 0.9); e.position.set(s * g.bodyWid * 0.94, bodyY + 0.2, -1.5 * g.bodyLen + 0.15); e.rotation.z = s * -0.05; e.castShadow = e.receiveShadow = true; bug.add(e); elytra.push(e); });
    } else if (g.body === 'abdomen') {
      const a = ell(elyMat, [g.bodyWid * 1.1, g.bodyH * 1.05, g.bodyLen * 1.25], [0, bodyY + 0.05, -1.15 * g.bodyLen - 0.2]); a.rotation.x = -0.12; bug.add(a); elytra.push(a);
    } else { // membrane: segmented abdomen + two veined wings
      const a = ell(elyMat, [g.bodyWid * 0.9, g.bodyH * 0.95, g.bodyLen * 1.0], [0, bodyY, -1.0 * g.bodyLen - 0.1]); a.rotation.x = -0.1; bug.add(a); elytra.push(a);
      const wt = H.noiseTex(256, (u, v) => { const vein = Math.abs(Math.sin((u * 6 + v * 1.5) * Math.PI)) < 0.07 || Math.abs(Math.sin(v * 18)) < 0.035; const c = vein ? 80 : 210; return [c, c, c * 0.95]; }, false);
      const wm = new T.MeshPhysicalMaterial({ color: 0xdde6ee, map: wt, alphaMap: wt, transparent: true, opacity: 0.55, roughness: 0.1, clearcoat: 1, side: T.DoubleSide, envMapIntensity: 1.2, depthWrite: false });
      [-1, 1].forEach(s => { const w = new T.Mesh(new T.PlaneGeometry(2.6 * g.bodyLen, 0.9), wm); w.position.set(s * 0.75, bodyY + 0.55, -1.7 * g.bodyLen); w.rotation.set(-Math.PI / 2 + 0.12, 0, s * 0.35); bug.add(w); wings.push({ w, s }); });
    }
    // eyes
    const eyes = []; const eyeHolder = [];
    const addEye = (mesh, side) => { bug.add(mesh); eyes.push({ mesh, side, facet: true }); return mesh; };
    const ES = g.eyeSize, bul = 0.8 + 0.5 * g.focus;
    switch (g.eyeType) {
      case 'dome': [1, -1].forEach(s => { const e = new T.Mesh(new T.SphereGeometry(1, 96, 64), facetMat(g, s)); e.scale.set(0.5 * ES * hs * bul, 0.62 * ES * hs, 0.5 * ES * hs); e.position.set(s * 0.46 * hs, headC[1] + 0.12, headC[2] + 0.2); e.castShadow = true; addEye(e, s); }); break;
      case 'stalk': [1, -1].forEach(s => { const stalk = H.sweep(new T.CatmullRomCurve3([V3(s * 0.3 * hs, headC[1] + 0.1, headC[2] + 0.25), V3(s * 0.65 * hs, headC[1] + 0.3, headC[2] + 0.35), V3(s * 1.0 * hs, headC[1] + 0.35, headC[2] + 0.3)]), u => 0.07 - 0.02 * u, 16, 8); const sm = new T.Mesh(stalk, chitin); bug.add(sm); const e = new T.Mesh(new T.SphereGeometry(1, 72, 48), facetMat(g, s)); e.scale.setScalar(0.3 * ES * bul); e.position.set(s * 1.08 * hs, headC[1] + 0.36, headC[2] + 0.3); addEye(e, s); }); break;
      case 'mantis': [1, -1].forEach(s => { const e = new T.Mesh(new T.SphereGeometry(1, 80, 56), facetMat(g, s, 0.25)); e.scale.set(0.3 * ES * bul, 0.52 * ES, 0.3 * ES); e.position.set(s * 0.52 * hs, headC[1] + 0.18, headC[2] + 0.1); e.rotation.z = s * -0.25; addEye(e, s); }); break;
      case 'spider': {
        const iris = new T.Color().setHSL(g.eyeHue, 0.6, 0.16);
        const mk = (rad, x, y, z) => { const mat = new T.MeshPhysicalMaterial({ color: iris, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.01, envMapIntensity: 1.5, emissive: new T.Color().setHSL(g.eyeHue, 0.8, 0.05) }); const e = new T.Mesh(new T.SphereGeometry(1, 48, 32), mat); e.scale.setScalar(rad); e.position.set(x, y, z); e.castShadow = true; bug.add(e); eyes.push({ mesh: e, side: x > 0 ? 1 : -1, bead: true, base: rad }); };
        mk(0.2 * ES, 0.17 * hs, headC[1] + 0.04, headC[2] + 0.55 * hs); mk(0.2 * ES, -0.17 * hs, headC[1] + 0.04, headC[2] + 0.55 * hs);
        mk(0.11 * ES, 0.36 * hs, headC[1] + 0.11, headC[2] + 0.5 * hs); mk(0.11 * ES, -0.36 * hs, headC[1] + 0.11, headC[2] + 0.5 * hs);
        mk(0.09 * ES, 0.43 * hs, headC[1] + 0.3, headC[2] + 0.12 * hs); mk(0.09 * ES, -0.43 * hs, headC[1] + 0.3, headC[2] + 0.12 * hs);
        mk(0.08 * ES, 0.22 * hs, headC[1] + 0.4, headC[2] + 0.2 * hs); mk(0.08 * ES, -0.22 * hs, headC[1] + 0.4, headC[2] + 0.2 * hs); break; }
      case 'simple': [1, -1].forEach(s => { const e = new T.Mesh(new T.SphereGeometry(1, 48, 32), glossBead(g, g.eyeHue, 0.4, 0.015)); e.scale.setScalar(0.17 * ES * hs); e.position.set(s * 0.4 * hs, headC[1] + 0.1, headC[2] + 0.42 * hs); eyes.push({ mesh: e, side: s, bead: true, base: 0.17 * hs }); bug.add(e); }); [0, 1, -1].forEach((k, i) => { const o = new T.Mesh(new T.SphereGeometry(0.05, 20, 14), glossBead(g, g.eyeHue, 0.3, 0.02)); o.position.set(k * 0.12, headC[1] + 0.42 * hs, headC[2] + 0.1 + (i ? 0 : 0.08)); bug.add(o); }); break;
      default: // compound / notched
        [1, -1].forEach(s => { const e = new T.Mesh(new T.SphereGeometry(1, 96, 64), facetMat(g, s)); if (LH) { e.scale.set(0.27 * ES * bul, 0.4 * ES * bul, 0.15 * ES * bul); e.position.set(s * 0.5 * hs, headC[1] + 0.1, headC[2] + 0.55); e.rotation.y = s * 0.5; } else if (g.eyeType === 'notched') { e.scale.set(0.22 * ES * bul * hs, 0.36 * ES * bul * hs, 0.3 * ES * bul * hs); e.position.set(s * 0.56 * hs, headC[1] + 0.05, headC[2] + 0.1); } else { e.scale.set(0.25 * ES * bul * hs, 0.31 * ES * bul * hs, 0.28 * ES * bul * hs); e.position.set(s * 0.5 * hs, headC[1] + 0.1, headC[2] + 0.28); } e.castShadow = true; addEye(e, s); });
    }
    // jaws
    const mand = [];
    if (g.jaw === 'pincer' || g.jaw === 'stag') {
      const big = g.jaw === 'stag';
      [1, -1].forEach(side => { const L = g.jawLen; const z0 = headC[2] + 0.55 * hs;
        const pts = big ? [V3(side * 0.3, headC[1] - 0.05, z0), V3(side * 0.75, headC[1] + 0.05, z0 + 0.6 * L), V3(side * 0.9, headC[1] + 0.12, z0 + 1.5 * L), V3(side * 0.3, headC[1] + 0.2, z0 + 2.2 * L)] : [V3(side * 0.24, headC[1] - 0.15, z0), V3(side * 0.34, headC[1] - 0.22, z0 + 0.4), V3(side * 0.2, headC[1] - 0.25, z0 + 0.8 * L), V3(side * 0.02, headC[1] - 0.2, z0 + 1.0 * L)];
        const geo = H.sweep(new T.CatmullRomCurve3(pts), u => (big ? 0.2 : 0.115) * (1 - u) * (1 - u * 0.4) + 0.014, 36, 12); const m = new T.Mesh(geo, dark); m.castShadow = true; const pv = new T.Group(); pv.position.set(side * 0.24, headC[1], z0); m.position.set(-side * 0.24, -headC[1], -z0); pv.add(m);
        if (big) for (let k = 0; k < 3; k++) { const c = new T.Mesh(new T.ConeGeometry(0.05, 0.22, 8), dark); const q = pts[1].clone().lerp(pts[3], 0.3 + k * 0.22); c.position.set(q.x - side * 0.24 + side * -0.02, q.y - headC[1] + 0.07, q.z - z0 + 0.05); c.rotation.z = side * 0.6; pv.add(c); }
        bug.add(pv); mand.push({ pivot: pv, side }); });
    } else if (g.jaw === 'snout') {
      const L = g.jawLen; const geo = H.sweep(new T.CatmullRomCurve3([V3(0, headC[1] - 0.05, headC[2] + 0.4 * hs), V3(0, headC[1] - 0.1, headC[2] + 1.0 * L), V3(0, headC[1] - 0.5, headC[2] + 1.7 * L), V3(0, headC[1] - 0.95, headC[2] + 1.85 * L)]), u => 0.16 - 0.08 * u, 36, 12); const sn = new T.Mesh(geo, chitin); sn.castShadow = true; bug.add(sn);
      [1, -1].forEach(side => { const j = new T.Mesh(new T.ConeGeometry(0.035, 0.2, 8), dark); j.position.set(side * 0.04, headC[1] - 0.98, headC[2] + 1.85 * L); j.rotation.x = Math.PI * 0.9; bug.add(j); mand.push({ pivot: j, side, tiny: true }); });
    } else { const l = ell(dark, [0.2, 0.08, 0.16], [0, headC[1] - 0.25, headC[2] + 0.5 * hs], 24); bug.add(l); if (g.plan === 'fly') { const pr = new T.Mesh(H.sweep(new T.CatmullRomCurve3([V3(0, headC[1] - 0.3, headC[2] + 0.5), V3(0, headC[1] - 0.6, headC[2] + 0.8)]), u => 0.06 - 0.03 * u, 8, 8), dark); bug.add(pr); } }
    // antennae / palps
    const ants = [];
    if (g.ant !== 'none') [1, -1].forEach(side => {
      const L = g.antLen; const base = V3(side * 0.28 * hs, headC[1] + 0.22, headC[2] + 0.42 * hs);
      const pts = LH ? [V3(side * 0.3, bodyY + 0.5, 1.3), V3(side * 0.75, bodyY + 1.2, 1.5), V3(side * 1.45 * L * 0.7, bodyY + 1.65, 1.75), V3(side * 2.4 * L * 0.7, bodyY + 1.75, 2.0)] : [base, base.clone().add(V3(side * 0.35, 0.45, 0.45)), base.clone().add(V3(side * 0.7 * L, 0.7, 0.9 * L + 0.4)), base.clone().add(V3(side * 1.1 * L, 0.55, 1.6 * L + 0.5))];
      const curve = new T.CatmullRomCurve3(pts); const clubbed = g.ant === 'clubbed';
      const geo = H.sweep(curve, u => (g.ant === 'comb' ? 0.04 : 0.045) * (1 - u * 0.5) * (clubbed ? (u > 0.8 ? 3.0 : 0.8) : 0.82 + 0.28 * Math.pow(Math.abs(Math.sin(u * Math.PI * 11)), 0.5)), 96, 10);
      const m = new T.Mesh(geo, chitin); m.castShadow = true; const pv = new T.Group(); pv.add(m); bug.add(pv); ants.push({ pv, side });
      if (g.ant === 'comb') for (let k = 0; k < 7; k++) { const q = curve.getPointAt(0.45 + k * 0.08); const c = new T.Mesh(new T.ConeGeometry(0.03, 0.55 * (1 - k * 0.08), 6), chitin); c.position.copy(q); c.rotation.z = side * 1.2; pv.add(c); }
    });
    // legs
    const legs = []; const pairs = g.legs / 2; const dark2 = dark;
    for (let li = 0; li < pairs; li++) [1, -1].forEach(side => {
      const spider = g.legs === 8; const t = pairs === 1 ? 0 : li / (pairs - 1);
      const az = spider ? 0.55 - t * 1.0 : 0.6 - t * 1.4, ax = (spider ? 0.5 : 0.5 + (1 - Math.abs(t - 0.4)) * 0.4) * side;
      const reach = g.legLen * (spider ? 1.0 : 0.9 + 0.25 * t), thick = g.legThick;
      const hip = V3(ax, bodyY - 0.15, az);
      const kneeH = (spider ? 2.2 : 1.7) * legH + (g.plan === 'mantis' ? 0.6 : 0) - 0.1; const out = (spider ? 1.1 : 0.95) * reach;
      const knee = V3(ax + side * out, kneeH, az + (spider ? (0.9 - t * 1.9) * 0.9 : (0.5 - t) * 0.7));
      const foot = V3(ax + side * out * (spider ? 2.0 : 2.05), 0.03, az + (spider ? (1.1 - t * 2.4) * 1.2 : (0.9 - t * 1.6) * reach * 0.9));
      const grp = new T.Group(); grp.position.copy(hip); const L = v => v.clone().sub(hip);
      const femur = H.sweep(new T.CatmullRomCurve3([V3(0, 0, 0), L(knee).multiplyScalar(0.5).add(V3(0, 0.12, 0)), L(knee)]), u => (0.15 - 0.05 * u + 0.015 * Math.sin(u * 8)) * thick, 14, 10);
      const tibia = H.sweep(new T.CatmullRomCurve3([L(knee), L(knee).lerp(L(foot), 0.5), L(foot)]), u => (0.1 * (1 - u * 0.62) + 0.014) * thick * (g.plan === 'scarab' ? 1.5 - u * 0.4 : 1), 18, 8);
      const fm = new T.Mesh(femur, chitin), tm = new T.Mesh(tibia, chitin); fm.castShadow = tm.castShadow = true; grp.add(fm, tm);
      const kn = new T.Mesh(new T.SphereGeometry(0.1 * thick, 20, 14), chitin); kn.position.copy(L(knee)); kn.castShadow = true; grp.add(kn);
      const claw = new T.Mesh(new T.ConeGeometry(0.03, 0.2, 8), dark); claw.position.copy(L(foot)).add(V3(side * 0.05, 0.03, 0.08)); claw.rotation.z = side * -1.2; grp.add(claw);
      const nsp = g.plan === 'scarab' ? 6 : g.plan === 'jumper' ? 9 : 5; for (let k = 0; k < nsp; k++) { const u = 0.2 + k * (0.7 / nsp); const p = L(knee).lerp(L(foot), u); const sp = new T.Mesh(new T.ConeGeometry(g.plan === 'jumper' ? 0.01 : 0.014, g.plan === 'jumper' ? 0.2 : 0.16, 6), dark); sp.position.copy(p).add(V3(0, 0.03, 0.06)); sp.rotation.x = 1.0; grp.add(sp); }
      bug.add(grp); legs.push({ grp, side, li, phase: ((li + (side > 0 ? 0 : 1)) % 2) * Math.PI, y0: hip.y });
    });

    // setae (instanced, swaying)
    const seGeo = new T.ConeGeometry(0.0042, 1, 5, 1); seGeo.translate(0, 0.5, 0);
    const seMat = new T.MeshStandardMaterial({ color: new T.Color(0.14, 0.09, 0.05).lerp(chitinColor(g, 2), 0.35), roughness: 0.5 }); seMat.userData.time = { value: 0 };
    seMat.onBeforeCompile = sh => { sh.uniforms.uT = seMat.userData.time; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <begin_vertex>', '#include <begin_vertex>\n float sw = sin(uT*1.6 + instanceMatrix[3].x*7.0 + instanceMatrix[3].z*5.0); transformed.x += sw*0.5*position.y*position.y; transformed.z += cos(uT*1.3+instanceMatrix[3].y*6.0)*0.35*position.y*position.y;'); };
    const MAXS = 2200; const setae = new T.InstancedMesh(seGeo, seMat, MAXS); setae.frustumCulled = false; bug.add(setae);
    const regions = [[headC, headR, 3, 1.0], [[0, bodyY + 0.1, -0.15], th, 2.5, 0.8], [[0, bodyY + 0.2, -1.2 * g.bodyLen], [g.bodyWid * 1.4, g.bodyH, 1.2 * g.bodyLen], g.body === 'elytra' ? 0.6 : 1.4, 0.7]];
    const _m = new T.Matrix4(), _q = new T.Quaternion(), _s = new T.Vector3(), _p = new T.Vector3(), _d = new T.Vector3(), _up = V3(0, 1, 0);
    function layoutSetae() {
      const rr = H.rng(g.seed ^ 4242); const n = Math.floor(g.setae * g.setae * 1900 + (g.setae > 0.02 ? 60 : 0)); setae.count = n; const wsum = regions.reduce((a, r) => a + r[2], 0);
      for (let i = 0; i < n; i++) { let pk = rr() * wsum, rg = regions[0]; for (const r of regions) { if ((pk -= r[2]) <= 0) { rg = r; break; } }
        let dx, dy, dz; do { dx = rr() * 2 - 1; dy = rr() * 2 - 1; dz = rr() * 2 - 1; } while (dx * dx + dy * dy + dz * dz > 1 || dx * dx + dy * dy + dz * dz < 0.05);
        const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l; if (dy < -0.35) dy = -dy * 0.3;
        _p.set(rg[0][0] + dx * rg[1][0], rg[0][1] + dy * rg[1][1], rg[0][2] + dz * rg[1][2]);
        _d.set(dx / rg[1][0], dy / rg[1][1], dz / rg[1][2]).normalize().add(V3((rr() - 0.5) * 0.7, (rr() - 0.5) * 0.7 + 0.2, (rr() - 0.5) * 0.7 + 0.35)).normalize();
        _q.setFromUnitVectors(_up, _d); const len = (0.1 + 0.26 * g.setae) * rg[3] * (0.6 + rr() * 0.8); _s.set(1, len, 1); _m.compose(_p, _q, _s); setae.setMatrixAt(i, _m); }
      setae.instanceMatrix.needsUpdate = true;
    }
    layoutSetae();

    // ---- parts (selection + macro framing) ------------------------------------------------
    const e0 = eyes[0] ? eyes[0].mesh.position : V3(0.5, headC[1], headC[2] + 0.3), e1 = eyes[1] ? eyes[1].mesh.position : V3(-0.5, headC[1], headC[2] + 0.3);
    const eyeDist = (g.eyeType === 'spider' ? 1.5 : g.eyeType === 'stalk' ? 2.0 : 1.7) * Math.max(0.7, g.eyeSize);
    H.parts = [
      { id: 'OCULUS.DX', name: (g.eyeType.toUpperCase() + ' EYE · RIGHT'), obj: eyes[0] && eyes[0].mesh, focus: { pos: g.eyeType === 'spider' ? [0.17 * hs, headC[1] + 0.05, headC[2] + 0.55 * hs] : [e0.x, e0.y, e0.z], dist: eyeDist, yaw: g.eyeType === 'spider' ? 0.1 : 1.0, pitch: 0.1 }, ring: 0 },
      { id: 'OCULUS.SN', name: (g.eyeType.toUpperCase() + ' EYE · LEFT'), obj: eyes[1] && eyes[1].mesh, focus: { pos: g.eyeType === 'spider' ? [-0.17 * hs, headC[1] + 0.05, headC[2] + 0.55 * hs] : [e1.x, e1.y, e1.z], dist: eyeDist, yaw: g.eyeType === 'spider' ? -0.1 : -1.0, pitch: 0.1 }, ring: 0 },
      { id: 'LABRUM.RIG', name: g.jaw === 'none' ? 'MOUTHPARTS' : g.jaw === 'snout' ? 'ROSTRUM' : g.jaw === 'stag' ? 'MANDIBLES · STAG' : 'MANDIBLES', obj: mand[0] && mand[0].pivot, focus: { pos: [0, headC[1] - 0.25, headC[2] + 1.0 * Math.max(0.6, g.jawLen)], dist: 1.4 + g.jawLen, yaw: 0.38, pitch: 0.12 }, ring: 3 },
      { id: 'SETAE.SPROUT', name: 'SENSORY BRISTLES', obj: setae, focus: { pos: [0, headC[1] + 0.4, headC[2]], dist: 2.0, yaw: 0.75, pitch: 0.45 }, ring: 2 },
      { id: g.ant === 'none' ? 'PALPS' : 'ANTENNA', name: g.ant === 'none' ? 'PEDIPALPS' : (g.ant.toUpperCase() + ' ANTENNAE'), obj: ants[0] && ants[0].pv, focus: { pos: [0.7, bodyY + 1.0, 1.9], dist: 2.8 + g.antLen, yaw: 0.9, pitch: 0.2 }, ring: 4 },
      { id: 'THORAX', name: 'THORAX', obj: thorax, focus: { pos: [0, bodyY + 0.2, -0.1], dist: 3.5, yaw: 0.75, pitch: 0.38 }, ring: 4 },
      { id: g.body === 'elytra' ? 'ELYTRA' : g.body === 'membrane' ? 'WINGS' : 'ABDOMEN', name: g.body === 'elytra' ? 'WING CASES' : g.body === 'membrane' ? 'MEMBRANE WINGS' : 'ABDOMEN', obj: elytra[0], focus: { pos: [0, bodyY + 0.5, -1.6 * g.bodyLen], dist: 4.4, yaw: 0.6, pitch: 0.55 }, ring: 4 },
      { id: 'LEG.FORE', name: 'FORELEG', obj: legs[0] && legs[0].grp, focus: { pos: [1.1, 0.95, 0.6], dist: 3.0, yaw: 1.25, pitch: 0.15 }, ring: 2 },
    ];
    const VIEWS = { front: [0.0, 0.1], tq: [0.72, 0.3], side: [1.45, 0.12], high: [0.55, 0.85] };
    const vw = VIEWS[g.view] || VIEWS.tq; const sz = 6.5 + Math.max(g.bodyLen, 1) * 1.4 + (g.legs === 8 ? 1.5 : 0);
    H.overviewFrame = { pos: [0, bodyY * 0.8, -0.2 - 0.5 * g.bodyLen], dist: sz, yaw: vw[0], pitch: vw[1] };

    // ---- life -------------------------------------------------------------------------------
    H.updaters.push((dt, t) => {
      seMat.userData.time.value = t; const gait = g.gait;
      mand.forEach(m => { if (m.tiny) { m.pivot.rotation.z = Math.sin(t * 3 + m.side) * 0.2 * gait; return; } m.pivot.rotation.y = m.side * (0.1 + 0.32 * gait * (0.5 + 0.5 * Math.sin(t * (1.1 + gait * 1.4) + (m.side > 0 ? 0 : 0.5)))); });
      ants.forEach(a => { a.pv.rotation.y = a.side * 0.04 * Math.sin(t * 1.3 + a.side) + 0.02 * Math.sin(t * 2.7); a.pv.rotation.x = 0.03 * Math.sin(t * 1.7 + a.side * 2); });
      legs.forEach(l => { const ph = t * (0.8 + gait * 1.5) + l.phase; const lift = Math.max(0, Math.sin(ph)); l.grp.rotation.y = l.side * 0.1 * Math.sin(ph) * gait * 1.6; l.grp.position.y = l.y0 + lift * 0.06 * gait; });
      wings.forEach(w => { w.w.rotation.z = w.s * (0.35 + 0.04 * Math.sin(t * 1.5)); });
      bug.position.y = 0.012 * Math.sin(t * 1.9); elytra.forEach((e, i) => { e.rotation.x += 0.0002 * Math.sin(t * 1.9 + i); });
      eyes.forEach(e => { if (e.bead) e.mesh.scale.setScalar((e.base || 0.2) * (g.eyeSize) * (1 + 0.01 * Math.sin(t * 2.3))); });
      H.focusBias = H.focusBias || 0; H.lensBias = (1 - g.focus) * (H.orbit.dist * 0.45); H.aperture = 0.5 + 0.9 * (1 - g.focus) + 0.3;
      eyes.forEach(e => { if (!e.bead) { const f = (g.split && e.side < 0) ? 0.06 : g.facets; e.mesh.material.bumpScale = (0.15 + 1.9 * g.focus * g.focus) * (0.55 + f * 0.7); } });
    });
    H.focusPoint = new T.Vector3(headC[0], headC[1], headC[2] + 0.3);
    H.bugRefs = { chitin, elyMat, eyes, setae, layoutSetae, regions, g };
    H.lights.fill.intensity = 0.05;
  }

  function onDial(ring, ang) {
    const g = H.genome, v = valOf(ang), R = H.bugRefs; if (!R) return;
    if (ring === 0) { g.facets = v; clearTimeout(onDial.t); onDial.t = setTimeout(() => R.eyes.forEach(e => { if (e.bead) { g.eyeSize = 0.6 + 0.9 * v; return; } const split = g.split && e.side < 0; const f = split ? 0.06 : g.facets; if (e.mesh.material.bumpMap) e.mesh.material.bumpMap.dispose(); e.mesh.material.bumpMap = hexBump(7 + f * 30); e.mesh.material.bumpScale = 1.1 + f * 0.8; e.mesh.material.needsUpdate = true; }), 90); }
    else if (ring === 1) { g.focus = v; const bul = 0.8 + 0.5 * g.focus; /* eyes re-scale on rebuild; aperture is live */ }
    else if (ring === 2) { g.setae = v; R.layoutSetae(); }
    else if (ring === 3) { g.gait = v; }
    else if (ring === 4) { g.chitin = v; R.chitin.color.copy(chitinColor(g)); if (R.chitin.userData.hue) R.chitin.userData.hue.value = v; if (R.elyMat.map) R.elyMat.map.dispose(); R.elyMat.map = patternMap(g); R.elyMat.needsUpdate = true; }
    g.variant = -1;
  }

  H.register('bug', {
    ref: { sec: 33, frame: { pos: [0, 1.9, 1.2], dist: 5.0, yaw: 0.0, pitch: -0.03, focusK: 0.9 } },
    mood: g => ({ bokeh: 'forest', moss: 'forest', dusk: 'amber', studio: 'studio', paper: 'dome', leaf: 'forest' }[g.stage] || 'studio'), makeGenome, build, filmCanon, dials, onDial, variants: FILM_VARIANTS,
    get overview() { return H.overviewFrame || { pos: [0, 1.1, 0.2], dist: 9, yaw: 0.7, pitch: 0.3 }; },
    mutate(g, r, k) { const c = Object.assign({}, g); const m = (v, s) => clamp(v + (r() - 0.5) * s * k, 0, 1); c.facets = m(c.facets, 0.5); c.focus = m(c.focus, 0.3); c.setae = m(c.setae, 0.5); c.gait = m(c.gait, 0.4); c.chitin = (c.chitin + (r() - 0.5) * 0.4 * k + 1) % 1; c.dull = m(c.dull, 0.5); c.metal = m(c.metal, 0.4); c.eyeHue = (c.eyeHue + (r() - 0.5) * 0.4 * k + 1) % 1; c.eyeSize = clamp(c.eyeSize + (r() - 0.5) * 0.4 * k, 0.6, 1.5);
      ['head', 'bodyLen', 'bodyWid', 'bodyH', 'legLen', 'legThick', 'stance', 'jawLen', 'antLen'].forEach(f => { c[f] = clamp(c[f] * (1 + (r() - 0.5) * 0.5 * k), 0.3, 2.6); }); c.thorax = c.thorax.map(v => clamp(v * (1 + (r() - 0.5) * 0.4 * k), 0.3, 1.8));
      if (r() < 0.3 * k) c.eyeType = pick(r, EYE_TYPES); if (r() < 0.2 * k) c.pattern = pick(r, PATTERNS); if (r() < 0.2 * k) c.stage = pick(r, STAGES); if (r() < 0.12 * k) { const pl = pick(r, Object.keys(PLANS)), P = PLANS[pl]; Object.assign(c, { plan: pl, body: P.body, legs: P.legs, jaw: P.jaw, ant: P.ant, wings: P.wings }); }
      c.variant = -1; c.seed = (r() * 4294967295) >>> 0; return c; },
    labels: ['L1:HEX.FACET', 'L2:OPTIC.DOME', 'L3:SETAE', 'R1:MAND.GAIT', 'R2:CHITIN.NM'],
    readout: (g, i) => [g.eyeType === 'spider' || g.eyeType === 'simple' ? `${g.eyeType.toUpperCase()} ×${g.eyeSize.toFixed(1)}` : `${Math.round(40 + g.facets * 260)} HEX`, `f/${(1.4 + (1 - g.focus) * 14).toFixed(1)}`, `${Math.round(g.setae * g.setae * 1900)} BRISTLES`, `${Math.round(g.gait * 100)}% GAIT`, `${Math.round(380 + ((0.55 - 0.9 * g.chitin + 2) % 1) * 400)}nm`][i],
    title: g => `${g.name.toUpperCase()} · ${g.mm}MM`,
    caption: ['PROCEDURAL BUG, FROM OMMATIDIA TO SETAE,', 'RENDERED LIVE IN YOUR BROWSER.'],
    spec: g => [['SPECIES', g.name], ['BODY PLAN', g.plan + ' · ' + g.legs + ' legs'], ['LENGTH', g.mm + ' mm'], ['EYES', g.eyeType + (['compound', 'dome', 'stalk', 'mantis', 'notched'].includes(g.eyeType) ? ' · ' + Math.round(40 + g.facets * 260) + ' hex facets' + (g.split ? ' (asymmetric)' : '') : '')], ['SETAE', Math.round(g.setae * g.setae * 1900) + ' bristles'], ['SURFACE', Math.round(380 + ((0.55 - 0.9 * g.chitin + 2) % 1) * 400) + ' nm · ' + g.pattern + (g.dull > 0.5 ? ' · matte' : g.metal > 0.4 ? ' · metallic' : ' · glossy')], ['MOUTH / ANTENNA', g.jaw + ' / ' + g.ant], ['STAGE', g.stage]],
  });
})();

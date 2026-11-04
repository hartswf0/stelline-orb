// ============================================================================
// BUG DESIGNER  (Protocol I)   genome -> procedural macro specimen
// L1 HEX.FACET  ommatidia density      L2 OPTIC.DOME focus / aperture / eye bulge
// L3 SETAE      bristle length+count   R1 MAND.GAIT  jaw + leg motion
// R2 CHITIN.NM  structural-colour hue
// ============================================================================
(function () {
  'use strict';
  const A = window.ATLAS, H = A.hero; if (!A || !H) return;
  const T = THREE, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const V3 = (x, y, z) => new T.Vector3(x, y, z);

  const FILM_VARIANTS = [
    { code: 'CANONICAL [520nm EMERALD / 165_HEX]', patch: { facets: 0.48, chitin: 0.26, setae: 0.6, focus: 0.62, gait: 0.35, split: 0 } },
    { code: 'OTHERWISE I: SCARAB.AURUM [585nm / 280_HEX / LONG SETAE]', patch: { facets: 0.92, chitin: 0.47, setae: 1.0, focus: 0.8, gait: 0.55, split: 0 } },
    { code: 'OTHERWISE II: OBSIDIAN.VOID [455nm / 52_HEX / BALD]', patch: { facets: 0.05, chitin: 0.04, setae: 0.0, focus: 0.7, gait: 0.85, split: 0 } },
    { code: 'OTHERWISE III: HETEROCERA.SPLIT [DX:260_GOLD / SN:58_CYAN]', patch: { facets: 0.85, chitin: 0.40, setae: 0.75, focus: 0.75, gait: 0.5, split: 1 } },
  ];
  const NAMES_A = ['Carabus', 'Scarabaeus', 'Chrysina', 'Cicindela', 'Lucanus', 'Stelline', 'Aurora', 'Memoria'];
  const NAMES_B = ['stellinae', 'imaginata', 'oculata', 'viridis', 'nocturna', 'memorialis', 'aurumque', 'lucida'];

  function makeGenome(seed) {
    const r = H.rng(seed);
    const g = { kind: 'bug', seed, facets: 0.2 + r() * 0.75, focus: 0.5 + r() * 0.4, setae: r() * 0.9, gait: 0.2 + r() * 0.6, chitin: r(), split: 0,
      thorax: [0.85 + r() * 0.3, 0.55 + r() * 0.2, 0.75 + r() * 0.3], head: 0.9 + r() * 0.25, elytra: 0.85 + r() * 0.5, leg: 0.85 + r() * 0.5, ant: 0.8 + r() * 0.7, jaw: 0.5 + r() * 0.8,
      stripes: r() < 0.5 ? Math.floor(r() * 3) + 1 : 0, habitat: r() < 0.7 ? 'leaf' : 'bark', mm: Math.round(8 + r() * 28), variant: -1 };
    g.name = NAMES_A[(r() * NAMES_A.length) | 0] + ' ' + NAMES_B[(r() * NAMES_B.length) | 0];
    return g;
  }
  function filmCanon(seed) { const g = makeGenome(seed); Object.assign(g, FILM_VARIANTS[0].patch, { thorax: [0.95, 0.62, 0.85], head: 1, elytra: 1, leg: 1, ant: 1, jaw: 0.9, stripes: 0, habitat: 'leaf', name: 'Carabus stellinae', mm: 14, variant: 0 }); return g; }

  const dialOf = v => 20 + 180 * clamp(v, 0, 1);
  const valOf = a => clamp((((a % 360) + 360) % 360 - 20) / 180, 0, 1);
  function dials(g) { return [dialOf(g.facets), dialOf(g.focus), dialOf(g.setae), dialOf(g.gait), dialOf(g.chitin)]; }
  const chitinColor = (g, k) => new T.Color().setHSL((0.55 - 0.9 * g.chitin + 2) % 1, 0.62 * (k || 1), 0.05 * (k || 1) + 0.012);

  function hexBump(density) {
    const S = 512;
    const tex = H.noiseTex(S, (u, v) => {
      const s = 10; const x = u * s * 1.0, y = v * s / 0.866 * 0.866 * 1.1547; const row = Math.floor(y / 1.1547 * 0.866 * 1 + 0); // lattice
      const yy = v * s * 1.1547, rr = Math.floor(yy / 1.1547); const off = rr % 2 ? 0.5 : 0;
      const fx = ((u * s + off) % 1 + 1) % 1 - 0.5, fy = (yy / 1.1547 % 1 + 1) % 1 - 0.5;
      const d = Math.hypot(fx, fy * 0.92) / 0.54; const h = d < 1 ? Math.sqrt(1 - d * d) : 0; const c = Math.round(60 + 195 * h); return [c, c, c];
    }, false);
    tex.repeat.set(density, density * 0.8); return tex;
  }
  function pitBump() { return H.noiseTex(256, (u, v) => { const n = H.fbm(u * 40, v * 40, 3), p = H.vnoise(u * 90, v * 90); const c = Math.round(90 + 90 * n + 60 * p); return [c, c, c]; }, false, 3); }
  function mottle(g) { return H.noiseTex(512, (u, v) => { const n = H.fbm(u * 14, v * 14, 5), p = H.vnoise(u * 120, v * 120); const m = 0.55 + 0.9 * n - 0.18 * (p > 0.8 ? 1 : 0) + 0.12 * H.vnoise(u * 60, v * 60); const c = Math.round(clamp(m, 0.3, 1.4) * 190); return [c, c, c]; }, true, 2); }
  function stripeMap(g, base) {
    const col = chitinColor(g, 1), pale = col.clone().offsetHSL(0.0, -0.1, 0.18);
    return H.noiseTex(256, (u, v) => { let m = 0; if (g.stripes === 1) m = Math.abs(Math.sin(u * Math.PI * 2 * 3)) > 0.82 ? 1 : 0; else if (g.stripes === 2) m = (Math.sin(v * Math.PI * 14) > 0.7 && Math.abs(u - 0.5) < 0.38) ? 1 : 0; else if (g.stripes === 3) m = H.vnoise(u * 9, v * 9) > 0.7 ? 1 : 0; const c = m ? pale : col; const n = 0.9 + 0.2 * H.fbm(u * 30, v * 30, 2); return [c.r * 255 * n * 1.9, c.g * 255 * n * 1.9, c.b * 255 * n * 1.9]; }, true);
  }

  function build(g, ctx) {
    const root = ctx.root, S = g;
    const mats = {}; H.updaters = []; H.parts = [];
    const color = chitinColor(g);
    const chitin = H.iridescent(new T.MeshPhysicalMaterial({ color, map: mottle(g), roughness: 0.34, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 }), 0.22);
    const elyMat = H.iridescent(new T.MeshPhysicalMaterial({ color: 0xffffff, map: stripeMap(g), roughness: 0.26, metalness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06 }), 0.25);
    const dark = new T.MeshPhysicalMaterial({ color: new T.Color(0.03, 0.02, 0.014), roughness: 0.32, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.2, envMapIntensity: 0.6 });
    function eyeMat(side) {
      const split = g.split && side < 0; const f = split ? 0.06 : g.facets; const dens = 14 + f * 70;
      const col = split ? new T.Color().setHSL(0.52, 0.5, 0.2) : new T.Color().setHSL((0.10 + 0.05 * g.chitin) % 1, 0.85, 0.05);
      const m = new T.MeshPhysicalMaterial({ color: col, roughness: 0.3, metalness: 0.05, clearcoat: 0.55, clearcoatRoughness: 0.06, bumpMap: hexBump(dens), bumpScale: 1.1 + f * 0.8, envMapIntensity: 0.4 });
      m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n float pp = dot(normalize(vViewPosition), normal); diffuseColor.rgb *= mix(1.0, 0.12, smoothstep(0.80, 0.96, pp)); diffuseColor.rgb += vec3(0.05,0.025,0.0) * smoothstep(0.35,0.7,pp) * (1.0 - smoothstep(0.7,0.95,pp));'); };
      return m;
    }
    mats.chitin = chitin; mats.ely = elyMat; mats.dark = dark; H.mats = mats;

    // ---- habitat ----------------------------------------------------------------
    const ground = (() => {
      const geo = new T.PlaneGeometry(22, 22, 120, 120); geo.rotateX(-Math.PI / 2);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); let y;
        if (g.habitat === 'leaf') { y = -0.03 * Math.abs(Math.sin(z * 1.1 + x * 0.3)) * 0 + 0.045 * Math.pow(Math.abs(Math.sin((z * 0.9 - Math.abs(x) * 1.1) * 1.6)), 6) - 0.06 * Math.exp(-x * x * 8) + 0.04 * H.fbm(x * 0.7, z * 0.7, 3); }
        else y = 0.18 * H.fbm(x * 1.2, z * 1.2, 5) + 0.05 * H.fbm(x * 6, z * 6, 2);
        p.setY(i, y); }
      geo.computeVertexNormals();
      const lc = g.habitat === 'leaf' ? new T.Color(0.022, 0.075, 0.02) : new T.Color(0.07, 0.045, 0.03);
      const m = new T.MeshStandardMaterial({ color: lc, roughness: g.habitat === 'leaf' ? 0.68 : 0.9, metalness: 0, bumpMap: H.noiseTex(512, (u, v) => { const c = Math.round(110 + 70 * H.fbm(u * 8, v * 8, 3)); return [c, c, c]; }, false, 2), bumpScale: 0.25, envMapIntensity: 0.28 });
      const mesh = new T.Mesh(geo, m); mesh.receiveShadow = true; return mesh;
    })();
    root.add(ground);
    // dew
    const dewMat = new T.MeshPhysicalMaterial({ color: 0x18262c, roughness: 0.02, metalness: 0, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 1.1, reflectivity: 0.9 });
    const dr = H.rng(g.seed ^ 77);
    for (let i = 0; i < 16; i++) { const r = 0.07 + dr() * 0.22; const d = new T.Mesh(new T.SphereGeometry(r, 24, 16), dewMat); const a = dr() * 6.28, rad = 1.6 + dr() * 5; d.position.set(Math.cos(a) * rad, r * 0.45, Math.sin(a) * rad); d.scale.y = 0.55; d.castShadow = true; root.add(d); }

    // ---- body ------------------------------------------------------------------
    const bug = new T.Group(); root.add(bug); bug.position.y = 0.0;
    const ell = (mat, r, c, seg) => { const m = new T.Mesh(new T.SphereGeometry(1, seg || 64, 40), mat); m.scale.set(r[0], r[1], r[2]); m.position.set(c[0], c[1], c[2]); m.castShadow = true; m.receiveShadow = true; return m; };
    // thorax (pronotum) with a groove
    const thorax = ell(chitin, [0.95 * S.thorax[0], 0.62 * S.thorax[1], 0.85 * S.thorax[2]], [0, 1.35, -0.15]); bug.add(thorax);
    { const gp = thorax.geometry.attributes.position; for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), y = gp.getY(i), z = gp.getZ(i); const k = 1 - 0.06 * Math.exp(-x * x * 40) * (y > 0 ? 1 : 0) + 0.025 * Math.sin(z * 9) * (y > 0 ? 1 : 0); gp.setXYZ(i, x * k, y * (1 - 0.0), z); } thorax.geometry.computeVertexNormals(); }
    const head = ell(chitin, [0.62 * S.head, 0.5 * S.head, 0.6 * S.head], [0, 1.22, 1.15]); bug.add(head);
    // elytra (two wing cases)
    const elyGeo = new T.SphereGeometry(1, 64, 40);
    { const p = elyGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const ridge = 0.025 * Math.sin(x * 22) * Math.max(0, y); p.setXYZ(i, x, y + ridge, z); } elyGeo.computeVertexNormals(); }
    const elytra = [];
    [-1, 1].forEach(s => { const e = new T.Mesh(elyGeo, elyMat); e.scale.set(0.5, 0.58, 1.75 * S.elytra); e.position.set(s * 0.47, 1.42, -1.65 * S.elytra + 0.15); e.rotation.z = s * -0.05; e.castShadow = true; e.receiveShadow = true; bug.add(e); elytra.push(e); });
    // eyes
    const eyes = [];
    [1, -1].forEach(side => { const m = eyeMat(side); const e = new T.Mesh(new T.SphereGeometry(1, 96, 64), m); const bulge = 0.8 + 0.5 * g.focus; e.scale.set(0.25 * bulge, 0.31 * bulge, 0.28 * bulge); e.position.set(side * 0.47 * S.head, 1.33, 1.3); e.castShadow = true; bug.add(e); eyes.push({ mesh: e, side }); });
    // mandibles
    const mand = [];
    [1, -1].forEach(side => { const curve = new T.CatmullRomCurve3([V3(side * 0.24, 1.1, 1.58), V3(side * 0.34, 1.02, 1.95), V3(side * 0.2, 0.98, 2.3 * S.jaw), V3(side * 0.02, 1.02, 2.46 * S.jaw)]);
      const geo = H.sweep(curve, u => 0.115 * (1 - u) * (1 - u * 0.4) + 0.012, 32, 12); const m = new T.Mesh(geo, dark); m.castShadow = true; const pivot = new T.Group(); pivot.position.set(side * 0.24, 1.1, 1.58); m.position.set(-side * 0.24, -1.1, -1.58); pivot.add(m); bug.add(pivot); mand.push({ pivot, side }); });
    // labrum
    { const l = ell(dark, [0.2, 0.08, 0.16], [0, 1.06, 1.68], 24); bug.add(l); }
    // antennae: beaded
    const ants = [];
    [1, -1].forEach(side => { const pts = [V3(side * 0.2, 1.55, 1.45), V3(side * 0.55, 2.0, 1.9), V3(side * 1.0, 2.15, 2.5 * S.ant), V3(side * 1.5, 1.95, 3.1 * S.ant)]; const curve = new T.CatmullRomCurve3(pts);
      const geo = H.sweep(curve, u => 0.045 * (1 - u * 0.5) * (0.82 + 0.28 * Math.pow(Math.abs(Math.sin(u * Math.PI * 11)), 0.5)), 96, 10); const m = new T.Mesh(geo, chitin); m.castShadow = true; const pv = new T.Group(); pv.add(m); pv.position.set(side * 0.2, 1.55, 1.45); m.position.set(-side * 0.2, -1.55, -1.45); bug.add(pv); ants.push({ pv, side }); });
    // legs (3 per side)
    const legs = [];
    const legDef = [[0.55, 0.38, 0.9], [0.9, -0.35, 0.3], [0.85, -1.15, -0.5]];
    legDef.forEach((ld, li) => [1, -1].forEach(side => {
      const ax = side * ld[0], az = ld[1], reach = S.leg;
      const hip = V3(ax, 1.05, az), knee = V3(ax + side * 0.95 * reach, 1.95 + li * 0.05, az + ld[2] * 0.7), foot = V3(ax + side * 1.95 * reach, 0.03, az + ld[2] * 1.5);
      const grp = new T.Group(); grp.position.copy(hip);
      const toLocal = v => v.clone().sub(hip);
      const femur = H.sweep(new T.CatmullRomCurve3([V3(0, 0, 0), toLocal(knee).multiplyScalar(0.5).add(V3(0, 0.12, 0)), toLocal(knee)]), u => 0.115 - 0.04 * u + 0.012 * Math.sin(u * 8), 14, 10);
      const tibia = H.sweep(new T.CatmullRomCurve3([toLocal(knee), toLocal(knee).lerp(toLocal(foot), 0.5), toLocal(foot)]), u => 0.075 * (1 - u * 0.62) + 0.01, 18, 8);
      const fm = new T.Mesh(femur, chitin), tm = new T.Mesh(tibia, chitin); fm.castShadow = tm.castShadow = true; grp.add(fm, tm);
      // joint + spines + claw
      const kn = new T.Mesh(new T.SphereGeometry(0.1, 20, 14), chitin); kn.position.copy(toLocal(knee)); kn.castShadow = true; grp.add(kn);
      const claw = new T.Mesh(new T.ConeGeometry(0.03, 0.2, 8), dark); claw.position.copy(toLocal(foot)).add(V3(side * 0.05, 0.03, 0.08)); claw.rotation.z = side * -1.2; grp.add(claw);
      for (let k = 0; k < 5; k++) { const u = 0.2 + k * 0.15; const p = toLocal(knee).lerp(toLocal(foot), u); const sp = new T.Mesh(new T.ConeGeometry(0.014, 0.16, 6), dark); sp.position.copy(p).add(V3(0, 0.03, 0.06)); sp.rotation.x = 1.0; grp.add(sp); }
      bug.add(grp); legs.push({ grp, side, li, phase: ((li + (side > 0 ? 0 : 1)) % 2) * Math.PI });
    }));

    // ---- setae (instanced, swaying) ------------------------------------------------
    const seGeo = new T.ConeGeometry(0.0042, 1, 5, 1); seGeo.translate(0, 0.5, 0);
    const seMat = new T.MeshStandardMaterial({ color: new T.Color(0.14, 0.09, 0.05), roughness: 0.5, metalness: 0 });
    seMat.userData.time = { value: 0 };
    seMat.onBeforeCompile = sh => { sh.uniforms.uT = seMat.userData.time; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <begin_vertex>', '#include <begin_vertex>\n float sw = sin(uT*1.6 + instanceMatrix[3].x*7.0 + instanceMatrix[3].z*5.0); transformed.x += sw*0.5*position.y*position.y; transformed.z += cos(uT*1.3+instanceMatrix[3].y*6.0)*0.35*position.y*position.y;'); };
    const MAXS = 2200; const setae = new T.InstancedMesh(seGeo, seMat, MAXS); setae.frustumCulled = false; setae.castShadow = false; bug.add(setae);
    const regions = [ // [center, radii, weight, lenScale]
      [[0, 1.22, 1.15], [0.62 * S.head, 0.5 * S.head, 0.6 * S.head], 3, 1.0], [[0, 1.35, -0.15], [0.95 * S.thorax[0], 0.62 * S.thorax[1], 0.85 * S.thorax[2]], 2.5, 0.8], [[0, 1.42, -1.2], [0.98, 0.6, 1.2], 0.6, 0.7],
    ];
    const _m = new T.Matrix4(), _q = new T.Quaternion(), _s = new T.Vector3(), _p = new T.Vector3(), _d = new T.Vector3(), _up = V3(0, 1, 0);
    function layoutSetae() {
      const rr = H.rng(g.seed ^ 4242); const n = Math.floor(g.setae * g.setae * 1900 + (g.setae > 0.02 ? 60 : 0)); setae.count = n; const wsum = regions.reduce((a, r) => a + r[2], 0);
      for (let i = 0; i < n; i++) {
        let pick = rr() * wsum, rg = regions[0]; for (const r of regions) { if ((pick -= r[2]) <= 0) { rg = r; break; } }
        let dx, dy, dz; do { dx = rr() * 2 - 1; dy = rr() * 2 - 1; dz = rr() * 2 - 1; } while (dx * dx + dy * dy + dz * dz > 1 || dx * dx + dy * dy + dz * dz < 0.05);
        const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l; if (dy < -0.35) { dy = -dy * 0.3; }
        _p.set(rg[0][0] + dx * rg[1][0], rg[0][1] + dy * rg[1][1], rg[0][2] + dz * rg[1][2]);
        _d.set(dx / rg[1][0], dy / rg[1][1], dz / rg[1][2]).normalize().add(V3((rr() - 0.5) * 0.7, (rr() - 0.5) * 0.7 + 0.2, (rr() - 0.5) * 0.7 + 0.35)).normalize();
        _q.setFromUnitVectors(_up, _d); const len = (0.1 + 0.26 * g.setae) * rg[3] * (0.6 + rr() * 0.8); _s.set(1, len, 1); _m.compose(_p, _q, _s); setae.setMatrixAt(i, _m);
      }
      setae.instanceMatrix.needsUpdate = true;
    }
    layoutSetae();

    // ---- parts for selection & macro framing -----------------------------------------
    H.parts = [
      { id: 'OCULUS.DX', name: 'RIGHT COMPOUND EYE', obj: eyes[0].mesh, focus: { pos: [0.5 * S.head, 1.35, 1.3], dist: 1.55, yaw: 1.05, pitch: 0.1 }, ring: 0 },
      { id: 'OCULUS.SN', name: 'LEFT COMPOUND EYE', obj: eyes[1].mesh, focus: { pos: [-0.5 * S.head, 1.35, 1.3], dist: 1.55, yaw: -1.05, pitch: 0.1 }, ring: 0 },
      { id: 'LABRUM.RIG', name: 'MANDIBLES & LABRUM', obj: mand[0].pivot, focus: { pos: [0, 1.05, 2.0], dist: 1.9, yaw: 0.38, pitch: 0.12 }, ring: 3 },
      { id: 'SETAE.SPROUT', name: 'SENSORY BRISTLES', obj: setae, focus: { pos: [0, 1.62, 1.1], dist: 1.9, yaw: 0.75, pitch: 0.45 }, ring: 2 },
      { id: 'ANTENNA', name: 'BEADED ANTENNAE', obj: ants[0].pv, focus: { pos: [0.6, 2.0, 2.1], dist: 2.6, yaw: 0.9, pitch: 0.2 }, ring: 4 },
      { id: 'THORAX', name: 'PRONOTUM', obj: thorax, focus: { pos: [0, 1.5, -0.1], dist: 3.3, yaw: 0.75, pitch: 0.38 }, ring: 4 },
      { id: 'ELYTRA', name: 'WING CASES', obj: elytra[0], focus: { pos: [0, 1.7, -1.8], dist: 4.2, yaw: 0.6, pitch: 0.55 }, ring: 4 },
      { id: 'LEG.FORE', name: 'FORELEG', obj: legs[0].grp, focus: { pos: [1.1, 0.95, 0.6], dist: 2.9, yaw: 1.25, pitch: 0.15 }, ring: 2 },
    ];

    // ---- life --------------------------------------------------------------------
    H.updaters.push((dt, t) => {
      seMat.userData.time.value = t;
      const gait = g.gait;
      mand.forEach(m => { m.pivot.rotation.y = m.side * (0.1 + 0.32 * gait * (0.5 + 0.5 * Math.sin(t * (1.1 + gait * 1.4) + (m.side > 0 ? 0 : 0.5)))); });
      ants.forEach(a => { a.pv.rotation.y = a.side * 0.04 * Math.sin(t * 1.3 + a.side) + 0.02 * Math.sin(t * 2.7); a.pv.rotation.x = 0.03 * Math.sin(t * 1.7 + a.side * 2); });
      legs.forEach(l => { const ph = t * (0.8 + gait * 1.5) + l.phase; const lift = Math.max(0, Math.sin(ph)); l.grp.rotation.y = l.side * 0.1 * Math.sin(ph) * gait * 1.6; l.grp.position.y = 1.05 + lift * 0.06 * gait; });
      bug.position.y = 0.012 * Math.sin(t * 1.9); elytra.forEach((e, i) => { e.rotation.x = 0.012 * Math.sin(t * 1.9 + i); });
      H.focusBias = 0; H.aperture = 0.28 + 0.9 * (1 - g.focus) + 0.35;
    });
    H.bugRefs = { chitin, elyMat, eyes, setae, layoutSetae, thorax, head, regions };
    // key light colour follows habitat
    H.lights.fill.intensity = 0.05;
  }

  // dial edits that don't need a full rebuild
  function onDial(ring, ang) {
    const g = H.genome, v = valOf(ang), R = H.bugRefs; if (!R) return;
    if (ring === 0) { g.facets = v; clearTimeout(onDial.t); onDial.t = setTimeout(() => R.eyes.forEach(e => { const split = g.split && e.side < 0; const f = split ? 0.06 : g.facets; if (e.mesh.material.bumpMap) e.mesh.material.bumpMap.dispose(); e.mesh.material.bumpMap = hexBump(14 + f * 70); e.mesh.material.bumpScale = 1.1 + f * 0.8; e.mesh.material.needsUpdate = true; }), 90); }
    else if (ring === 1) { g.focus = v; const bulge = 0.8 + 0.5 * g.focus; R.eyes.forEach(e => { e.mesh.scale.set(0.25 * bulge, 0.31 * bulge, 0.28 * bulge); }); }
    else if (ring === 2) { g.setae = v; R.layoutSetae(); }
    else if (ring === 3) { g.gait = v; }
    else if (ring === 4) { g.chitin = v; R.chitin.color.copy(chitinColor(g)); if (R.chitin.userData.hue) R.chitin.userData.hue.value = v; if (R.elyMat.map) R.elyMat.map.dispose(); R.elyMat.map = stripeMap(g); R.elyMat.needsUpdate = true; R.eyes.forEach(e => { if (!(g.split && e.side < 0)) e.mesh.material.color.setHSL((0.10 + 0.05 * g.chitin) % 1, 0.8, 0.075); }); }
    g.variant = -1;
  }

  H.register('bug', {
    mood: g => (g.habitat === 'leaf' ? 'forest' : 'studio'), makeGenome, build, filmCanon, dials, onDial, variants: FILM_VARIANTS,
    overview: { pos: [0, 1.15, 0.5], dist: 8.2, yaw: 0.72, pitch: 0.3 },
    labels: ['L1:HEX.FACET', 'L2:OPTIC.DOME', 'L3:SETAE', 'R1:MAND.GAIT', 'R2:CHITIN.NM'],
    readout: (g, i) => [`${Math.round(40 + g.facets * 260)} HEX`, `f/${(1.4 + (1 - g.focus) * 14).toFixed(1)}`, `${Math.round(g.setae * g.setae * 1900)} BRISTLES`, `${Math.round(g.gait * 100)}% GAIT`, `${Math.round(380 + ((0.55 - 0.9 * g.chitin + 2) % 1) * 400)}nm`][i],
    title: g => `${g.name.toUpperCase()} · ${g.mm}MM`,
    caption: ['PROCEDURAL BUG, FROM OMMATIDIA TO SETAE,', 'RENDERED LIVE IN YOUR BROWSER.'],
    spec: g => [['SPECIES', g.name], ['LENGTH', g.mm + ' mm'], ['OMMATIDIA', Math.round(40 + g.facets * 260) + ' hex facets' + (g.split ? ' (asymmetric)' : '')], ['SETAE', Math.round(g.setae * g.setae * 1900) + ' bristles'], ['CHITIN', Math.round(380 + ((0.55 - 0.9 * g.chitin + 2) % 1) * 400) + ' nm structural colour'], ['HABITAT', g.habitat], ['JAW GAIT', Math.round(g.gait * 100) + '%']],
  });
})();

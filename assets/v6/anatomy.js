/* Anatomy for the made things, built part by named part, as random-eyes builds an eye (sclera, cornea, crypts, lashes).
   The beetle of the macro shot (a longhorn's head, seen from the front): head capsule with a frontal groove and pitted chitin,
   kidney-shaped compound eyes of hexagonal facets with the dark pseudopupil that follows the viewer, eleven-jointed antennae
   from sockets notched into the eyes, sickle mandibles and palps, jointed legs ending in tarsi and claws, and setae.
   The cake of the birthday: crumb, crust, a cream top with a dripping rim, flutes when it turns bundt, striped candles with
   wax runs, flames with a blue root, smoke when blown out.
   Each builder returns a group in its own frame (base at y = 0, facing +z); group.userData.tick(t) moves it without rebuilding. */
(function () {
  const T = THREE;
  function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
  function vnoise(x, y, z) { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const L = (a, b, t) => a + (b - a) * t, h = (i, j, k) => hash(xi + i, yi + j, zi + k);
    return L(L(L(h(0, 0, 0), h(1, 0, 0), u), L(h(0, 1, 0), h(1, 1, 0), u), v), L(L(h(0, 0, 1), h(1, 0, 1), u), L(h(0, 1, 1), h(1, 1, 1), u), v), w); }
  const fbm = (x, y, z) => vnoise(x, y, z) * .5 + vnoise(x * 2.1, y * 2.1, z * 2.1) * .25 + vnoise(x * 4.3, y * 4.3, z * 4.3) * .125;
  // push each vertex along its normal by f(position)
  function sculpt(geo, f) { geo.computeVertexNormals(); const P = geo.attributes.position, N = geo.attributes.normal, p = new T.Vector3(), n = new T.Vector3();
    for (let i = 0; i < P.count; i++) { p.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i); const d = f(p, n); P.setXYZ(i, p.x + n.x * d, p.y + n.y * d, p.z + n.z * d); } geo.computeVertexNormals(); return geo; }
  // a tube whose radius runs from r0 to r1 along its length (mandibles, leg segments, antennal joints)
  function taper(pts, r0, r1, seg, rad) { const c = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), g = new T.TubeGeometry(c, seg || 16, 1, rad || 10, false), P = g.attributes.position, s = seg || 16, R = (rad || 10) + 1;
    for (let i = 0; i <= s; i++) { const t = i / s, r = r0 + (r1 - r0) * t, ctr = c.getPointAt(t); for (let j = 0; j < R; j++) { const k = i * R + j; const x = P.getX(k) - ctr.x, y = P.getY(k) - ctr.y, z = P.getZ(k) - ctr.z; P.setXYZ(k, ctr.x + x * r, ctr.y + y * r, ctr.z + z * r); } }
    g.computeVertexNormals(); return g; }
  function canvasTex(w, h, f, srgb) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = srgb === false ? T.LinearEncoding : T.sRGBEncoding; t.wrapS = t.wrapT = T.RepeatWrapping; return t; }
  const TX = {};
  // facet normal map: a hexagonal lattice of domed lenses, as a normal map (linear)
  function facetNormal() { return TX.fn || (TX.fn = canvasTex(512, 512, (x, w, h) => { const id = x.createImageData(w, h), r = 8.5, hx = r * Math.sqrt(3);
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) { let best = 1e9, bx = 0, by = 0; const row = Math.round(py / (r * 1.5));
        for (let jr = row - 1; jr <= row + 1; jr++) { const cy = jr * r * 1.5, off = (jr & 1) * hx / 2, col = Math.round((px - off) / hx); for (let ic = col - 1; ic <= col + 1; ic++) { const cx = ic * hx + off, d = (px - cx) ** 2 + (py - cy) ** 2; if (d < best) { best = d; bx = px - cx; by = py - cy; } } }
        const d = Math.sqrt(best) / (r * .95), dome = Math.min(1, d); let nx = bx / (r * .95) * .9, ny = by / (r * .95) * .9; if (d > .92) { nx *= -1.6; ny *= -1.6; } const nz = Math.sqrt(Math.max(.05, 1 - nx * nx - ny * ny));
        const i = (py * w + px) * 4; id.data[i] = (nx * .5 + .5) * 255; id.data[i + 1] = (-ny * .5 + .5) * 255; id.data[i + 2] = nz * 255; id.data[i + 3] = 255; } x.putImageData(id, 0, 0); }, false)); }
  // pitted chitin: fine pits and scratches as a bump map
  function chitinBump() { return TX.cb || (TX.cb = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#808080'; x.fillRect(0, 0, w, h); const R = rng(5);
      for (let i = 0; i < 2600; i++) { const a = R() * w, b = R() * h, r = .6 + R() * 2.2; const g = x.createRadialGradient(a, b, 0, a, b, r); g.addColorStop(0, 'rgba(30,30,30,.9)'); g.addColorStop(1, 'rgba(128,128,128,0)'); x.fillStyle = g; x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); }
      x.strokeStyle = 'rgba(160,160,160,.35)'; for (let i = 0; i < 160; i++) { x.beginPath(); const a = R() * w, b = R() * h; x.moveTo(a, b); x.lineTo(a + (R() - .5) * 60, b + (R() - .5) * 20); x.stroke(); } }, false)); }
  function crumbTex() { return TX.cr || (TX.cr = canvasTex(512, 256, (x, w, h) => { x.fillStyle = '#3a2210'; x.fillRect(0, 0, w, h); const R = rng(9);
      for (let i = 0; i < 9000; i++) { const l = 18 + R() * 30; x.fillStyle = `hsl(${24 + R() * 10},${45 + R() * 20}%,${l}%)`; x.fillRect(R() * w, R() * h, 1 + R() * 3, 1 + R() * 3); }
      for (let i = 0; i < 500; i++) { x.fillStyle = 'rgba(10,5,2,.6)'; x.beginPath(); x.arc(R() * w, R() * h, .5 + R() * 2, 0, 7); x.fill(); } })); }
  function creamTex() { return TX.cm || (TX.cm = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#efdcb4'; x.fillRect(0, 0, w, h); const R = rng(3); x.lineWidth = 3;
      for (let i = 0; i < 220; i++) { x.strokeStyle = `rgba(${200 + R() * 40},${170 + R() * 40},${120 + R() * 40},.35)`; x.beginPath(); x.arc(R() * w, R() * h, 10 + R() * 60, R() * 6, R() * 6 + 1.5 + R() * 2); x.stroke(); }
      for (let i = 0; i < 300; i++) { x.fillStyle = ['#d1342b', '#3b8f3a', '#e7c22e', '#2b62c4', '#f2f2f2'][i % 5]; x.fillRect(R() * w, R() * h, 2 + R() * 3, 1.5); } })); }
  function stripeTex() { return TX.st || (TX.st = canvasTex(64, 256, (x, w, h) => { x.fillStyle = '#f4efe2'; x.fillRect(0, 0, w, h); x.fillStyle = '#c9493b'; for (let i = -4; i < 12; i++) { x.beginPath(); x.moveTo(0, i * 32); x.lineTo(w, i * 32 + 22); x.lineTo(w, i * 32 + 32); x.lineTo(0, i * 32 + 10); x.fill(); } })); }
  function glowTex(c0, c1) { const k = 'g' + c0 + c1; return TX[k] || (TX[k] = canvasTex(128, 128, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, c0); g.addColorStop(.35, c1); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); })); }
  function flameTex() { return TX.fl || (TX.fl = canvasTex(64, 160, (x, w, h) => { let g = x.createRadialGradient(w / 2, h * .66, 1, w / 2, h * .6, h * .48); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(.2, 'rgba(255,226,140,.98)'); g.addColorStop(.55, 'rgba(255,150,40,.55)'); g.addColorStop(1, 'rgba(255,90,0,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(w / 2, h * .06); x.bezierCurveTo(w * .95, h * .5, w * .85, h * .9, w / 2, h * .92); x.bezierCurveTo(w * .15, h * .9, w * .05, h * .5, w / 2, h * .06); x.fill();
      g = x.createRadialGradient(w / 2, h * .84, 1, w / 2, h * .84, w * .3); g.addColorStop(0, 'rgba(90,140,255,.75)'); g.addColorStop(1, 'rgba(90,140,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); })); }
  function smokeTex() { return TX.sm || (TX.sm = canvasTex(64, 256, (x, w, h) => { const R = rng(2); for (let i = 0; i < 40; i++) { const y = h - i * 6, a = .25 * (1 - i / 40); x.fillStyle = `rgba(200,200,200,${a})`; x.beginPath(); x.ellipse(w / 2 + Math.sin(i * .5) * 10 * (i / 40) + (R() - .5) * 4, y, 4 + i * .35, 6, 0, 0, 7); x.fill(); } })); }

  /* ---------------- the beetle ---------------- */
  function beetle(it, now) {
    const g = new T.Group(), R = rng(17), hue = .26 + (it.sheen - .5) * .12;
    const chitin = new T.MeshPhysicalMaterial({ color: new T.Color().setHSL(hue, .25, .028), roughness: .42, metalness: .2, clearcoat: .7, clearcoatRoughness: .3, bumpMap: chitinBump(), bumpScale: .004, envMapIntensity: .45 });
    chitin.bumpMap.repeat.set(3, 3);
    const add = (geo, mat, name, parent) => { const m = new T.Mesh(geo, mat); m.userData.sk = name; (parent || g).add(m); return m; };
    // head capsule: broad, a groove down the front, pitted; mouth region narrows below
    const head = sculpt(new T.SphereGeometry(.3, 112, 80), (p) => { let d = (fbm(p.x * 22, p.y * 22, p.z * 22) - .5) * .008;
        if (p.z > 0 && p.y > -.05) d -= .03 * Math.exp(-Math.pow(p.x / .045, 2)) * Math.min(1, p.z / .2);
        if (p.y < -.12) d -= (-.12 - p.y) * .5 * Math.max(0, 1 - Math.abs(p.x) / .3); return d; });
    const H = add(head, chitin, 'head'); H.scale.set(1.28, .98, .82); H.position.set(0, .34, 0);
    // compound eyes: kidney shapes of facets, notched where the antenna rises
    const eyeM = new T.MeshPhysicalMaterial({ color: 0x0b0d0a, roughness: .14, metalness: .05, clearcoat: 1, clearcoatRoughness: .05, normalMap: facetNormal(), normalScale: new T.Vector2(1, 1), envMapIntensity: .35 });
    eyeM.normalMap.repeat.set(44, 22); const focus = ((it.focusR || 0) + (it.focusL || 0)) / 2;
    eyeM.onBeforeCompile = sh => { sh.uniforms.focusK = { value: focus };
      sh.fragmentShader = 'uniform float focusK;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float fac = dot(normalize(normal), normalize(vViewPosition)); diffuseColor.rgb *= mix(1.0, .08, smoothstep(.955, .995, fac)); diffuseColor.rgb += vec3(.05,.06,.045) * (1.0 - smoothstep(.2, .7, fac)); }`); };
    eyeM.customProgramCacheKey = () => 'ommatidia';
    for (const s of [-1, 1]) { const eg = sculpt(new T.SphereGeometry(.16, 128, 96), p => { const a = Math.atan2(p.y, p.x * s); return -.05 * Math.exp(-Math.pow((a - 1.1) / .35, 2)) * Math.max(0, p.z) / .16; });
      const E = add(eg, eyeM, s < 0 ? 'eyeL' : 'eyeR'); E.scale.set(.62, 1.18, .92); E.position.set(s * .3, .36, .06); E.rotation.y = s * .55; }
    // antennae: scape, pedicel, nine flagellomeres; a chain of joints so each can twitch
    const antennae = [];
    for (const s of [-1, 1]) { let parent = new T.Group(); parent.position.set(s * .19, .55, .13); g.add(parent); const joints = [parent];
      for (let k = 0; k < 11; k++) { const L = k === 0 ? .2 : k === 1 ? .07 : .17 - k * .004, r = k === 0 ? .03 : .022 - k * .0011;
        const seg = add(new T.CylinderGeometry(r * .8, r, L, 14, 4), chitin, 'ant' + s + k, parent); seg.position.y = L / 2;
        const knob = add(new T.SphereGeometry(r * .95, 12, 8), chitin, 'kb' + s + k, parent); knob.position.y = L;
        const j = new T.Group(); j.position.y = L; parent.add(j); j.rotation.z = -s * (k === 0 ? .55 : .06); j.rotation.x = k === 0 ? -.25 : .09; joints.push(j); parent = j; }
      joints[0].rotation.z = -s * .35; antennae.push(joints); }
    // mandibles and palps
    for (const s of [-1, 1]) { add(taper([[s * .12, .1, .17], [s * .13, .05, .25], [s * .07, .02, .3], [s * .02, .03, .31]], .035, .006, 24, 12), chitin, 'mand' + s);
      for (const [dx, dy] of [[.05, -.02], [.09, .0]]) add(taper([[s * dx, .1 + dy, .2], [s * (dx + .03), .0 + dy, .3], [s * (dx + .02), -.07 + dy, .33]], .016, .01, 12, 8), chitin, 'palp' + s + dx); }
    // pronotum and the body behind
    const pro = add(sculpt(new T.SphereGeometry(.34, 64, 48), p => (fbm(p.x * 18, p.y * 18, p.z * 18) - .5) * .01), chitin, 'pronotum'); pro.scale.set(1.15, .8, 1); pro.position.set(0, .33, -.42);
    const ely = add(new T.SphereGeometry(.42, 64, 48), chitin, 'elytra'); ely.scale.set(1.05, .7, 1.9); ely.position.set(0, .34, -1.2);
    // legs: coxa, femur, tibia, five tarsomeres, claws; the forelegs long and reaching forward as in the shot
    const legs = [];
    for (let j = 0; j < 3; j++) for (const s of [-1, 1]) { const piv = new T.Group(); piv.position.set(s * .26, .2, -.3 - j * .4); g.add(piv); const L = j === 0 ? 1.25 : 1;
      const knee = [s * .55 * L, .3, (j === 0 ? .25 : .05)], ankle = [s * 1.0 * L, -.1, (j === 0 ? .6 : .15)];
      const fem = add(taper([[0, 0, 0], [s * .2, .22, .06], knee], .055, .035, 18, 12), chitin, 'fem' + j + s, piv); const kn = add(new T.SphereGeometry(.036, 12, 8), chitin, 'kn' + j + s, piv); kn.position.set(...knee);
      add(taper([knee, [s * .8 * L, .15, (j === 0 ? .45 : .1)], ankle], .032, .022, 18, 10), chitin, 'tib' + j + s, piv);
      let p = ankle; for (let k = 0; k < 5; k++) { const q = [p[0] + s * .05, p[1] - .035, p[2] + .03]; add(taper([p, q], .022, .016, 4, 8), chitin, 'tar' + j + s + k, piv); p = q; }
      for (const c of [-1, 1]) add(taper([p, [p[0] + s * .04, p[1] - .03, p[2] + c * .02]], .01, .002, 4, 6), chitin, 'claw' + j + s + c, piv);
      legs.push({ piv, j, s }); }
    // setae: hairs on the head's rim, the mouthparts and the legs, grown by SETAE
    if (it.setae > .02) { const n = 2400, geo = new T.ConeGeometry(.0012, 1, 4, 1), mat = new T.MeshStandardMaterial({ color: 0x23221a, roughness: 1, metalness: 0, transparent: true, opacity: .85, envMapIntensity: 0 }), im = new T.InstancedMesh(geo, mat, n);
      const srcs = []; g.updateMatrixWorld(true); g.traverse(m => { if (m.isMesh && /head|fem|tib|mand|palp|tar/.test(m.userData.sk)) srcs.push(m); });
      const m4 = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), P = new T.Vector3(), N = new T.Vector3();
      for (let k = 0; k < n; k++) { const m = srcs[Math.floor(R() * srcs.length)], A = m.geometry.attributes, i = Math.floor(R() * A.position.count);
        P.fromBufferAttribute(A.position, i).applyMatrix4(m.matrixWorld); N.fromBufferAttribute(A.normal, i).transformDirection(m.matrixWorld);
        if (m.userData.sk === 'head' && N.z > .55) { k--; continue; } N.add(new T.Vector3((R() - .5) * .6, -.25, .25)).normalize();
        const len = (.03 + R() * .08) * it.setae; q.setFromUnitVectors(up, N); m4.compose(P.clone().add(N.clone().multiplyScalar(len / 2)), q, new T.Vector3(1, len, 1)); im.setMatrixAt(k, m4); }
      im.userData.add = it.setae > ((it.canon || {}).setae || 0) + .02; g.add(im); }
    g.userData.tick = t => { antennae.forEach((J, a) => J.forEach((j, k) => { if (k) j.rotation.x = (k === 1 ? -.25 : .09) + Math.sin(t * 1.7 + k * .6 + a * 2) * .02 * (1 + k * .15); }));
      legs.forEach(L => { const ph = t * 4 * it.gait + L.j * 2.1 + (L.s > 0 ? Math.PI : 0); L.piv.rotation.y = Math.sin(ph) * .22 * it.gait; L.piv.rotation.z = Math.max(0, Math.cos(ph)) * .12 * it.gait * L.s; }); };
    g.userData.tick(now / 1000); return g;
  }

  /* ---------------- the cake ---------------- */
  function cake(it, now) {
    const g = new T.Group(), Rr = .72, Hh = .55, seg = 144, rows = 28, R = rng(4);
    const geo = new T.CylinderGeometry(Rr, Rr, Hh, seg, rows, false), P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); if (r < 1e-4) continue; const v = (y + Hh / 2) / Hh;
      let rr = r * (1 + it.bundt * (.08 * Math.cos(a * 12) * (1 - .25 * v))) + (fbm(Math.cos(a) * 6, v * 5, Math.sin(a) * 6) - .5) * .02; rr += it.bundt * .05 * Math.sin(v * Math.PI); P.setX(i, Math.cos(a) * rr); P.setZ(i, Math.sin(a) * rr); }
    geo.computeVertexNormals();
    const crumb = crumbTex(); crumb.repeat.set(3, 1);
    const body = new T.Mesh(geo, new T.MeshStandardMaterial({ map: crumb, roughness: .85, bumpMap: crumb, bumpScale: .01, color: new T.Color().setHSL(.07, .35, .5 + it.bundt * .2) })); body.position.y = Hh / 2; body.userData.sk = 'body'; g.add(body);
    // cream top with a dripping rim
    const topG = new T.CylinderGeometry(Rr * 1.01, Rr * 1.01, .07, seg, 3), TP = topG.attributes.position;
    for (let i = 0; i < TP.count; i++) { const x = TP.getX(i), y = TP.getY(i), z = TP.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); if (y < 0 && r > Rr * .9) { const drip = Math.max(0, Math.sin(a * 9 + 1.3) * Math.sin(a * 5)) * .09; TP.setY(i, y - drip); } if (y > 0) TP.setY(i, y + (fbm(x * 9, 0, z * 9) - .5) * .02); }
    topG.computeVertexNormals(); const top = new T.Mesh(topG, new T.MeshPhysicalMaterial({ map: creamTex(), roughness: .45, clearcoat: .3, clearcoatRoughness: .5 })); top.position.y = Hh + .015; top.userData.sk = 'top'; g.add(top);
    if (it.bundt > .3) { const hole = new T.Mesh(new T.CylinderGeometry(Rr * .22 * it.bundt, Rr * .2 * it.bundt, .1, 32), new T.MeshBasicMaterial({ color: 0x050302 })); hole.position.y = Hh + .03; hole.userData.add = true; g.add(hole); }
    if (it.icing > .01) { const band = new T.Mesh(new T.CylinderGeometry(Rr * 1.02 * (1 + it.bundt * .08), Rr * 1.02 * (1 + it.bundt * .08), .2, seg, 1, true), new T.MeshBasicMaterial({ map: icingTex(it.icing), transparent: true, opacity: Math.min(1, it.icing * 4), depthWrite: false })); band.position.y = Hh * .55; band.rotation.y = -Math.PI / 2; band.userData.add = true; g.add(band); }
    const C = it.canon || {}, filmHas = it.skin > .5 && it.candles === C.candles && it.bundt < .05 && it.flames > (C.flames || 1) - .05 && it.fit, n = filmHas ? 0 : Math.round(it.candles);
    const wax = new T.MeshPhysicalMaterial({ map: stripeTex(), roughness: .35, clearcoat: .4, transmission: .0 }), flames = [];
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + .3, rr = n === 1 ? 0 : Rr * .55, cg = new T.CylinderGeometry(.028, .03, .34, 16, 6), CP = cg.attributes.position;
      for (let i = 0; i < CP.count; i++) { const y = CP.getY(i), ang = Math.atan2(CP.getZ(i), CP.getX(i)); if (y > .1) { const run = Math.max(0, Math.sin(ang * 3 + k)) * .006; CP.setX(i, CP.getX(i) * (1 + run * 20)); CP.setZ(i, CP.getZ(i) * (1 + run * 20)); } }
      cg.computeVertexNormals(); const c = new T.Mesh(cg, wax); c.position.set(Math.cos(a) * rr, Hh + .2, Math.sin(a) * rr); c.userData.add = true; g.add(c);
      const wick = new T.Mesh(new T.CylinderGeometry(.004, .004, .04, 6), new T.MeshBasicMaterial({ color: 0x1a120a })); wick.position.set(c.position.x, Hh + .39, c.position.z); wick.userData.add = true; g.add(wick);
      if (it.flames > .02) { const f = new T.Sprite(new T.SpriteMaterial({ map: flameTex(), blending: T.AdditiveBlending, depthWrite: false, opacity: it.flames, toneMapped: false })); f.position.set(c.position.x, Hh + .47, c.position.z); f.userData.k = k; f.userData.add = true; g.add(f); flames.push(f); }
      else { const sm = new T.Sprite(new T.SpriteMaterial({ map: smokeTex(), transparent: true, depthWrite: false, opacity: .5 * (1 - it.flames / .02) })); sm.scale.set(.12, .5, 1); sm.position.set(c.position.x, Hh + .65, c.position.z); sm.userData.add = true; g.add(sm); } }
    let L = null, glow = null; if (it.flames > .02 && n) { L = new T.PointLight(0xffb060, 2.2 * it.flames * Math.sqrt(n / 3), 6, 2); L.position.set(0, Hh + .7, 0); g.add(L);
      glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex('rgba(255,215,140,.9)', 'rgba(255,160,60,.3)'), blending: T.AdditiveBlending, depthWrite: false, opacity: .45 * it.flames, toneMapped: false })); glow.scale.set(1.9, 1.4, 1); glow.position.y = Hh + .48; glow.userData.add = true; g.add(glow); }
    g.userData.tick = t => { for (const f of flames) { const k = f.userData.k, fk = 1 + .1 * Math.sin(t * 11 + k * 1.7) + .05 * Math.sin(t * 23 + k); f.scale.set(.085 * (2 - fk), .21 * fk * it.flames, 1); }
      if (L) L.intensity = 2.2 * it.flames * Math.sqrt(n / 3) * (1 + .06 * Math.sin(t * 13)); };
    g.userData.tick(now / 1000); return g;
  }
  // the writing is piped in the order the film shows (02:24.9-02:27.65): 生, 日, 快, 樂, then the underline flourish
  function icingTex(v) { const q = Math.round((v == null ? 1 : v) * 20) / 20, key = 'ic' + q; return TX[key] || (TX[key] = canvasTex(1024, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#c4161c'; x.strokeStyle = '#c4161c';
      x.font = 'bold 74px "Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.shadowColor = 'rgba(80,0,0,.6)'; x.shadowBlur = 3; const chars = '生日快樂', per = .9 / 4;
      for (const cx0 of [w * .25, w * .75]) { const tw = x.measureText(chars).width, left = cx0 - tw / 2; let xx = left;
        for (let i = 0; i < 4; i++) { const f = Math.max(0, Math.min(1, (q - i * per) / per)), cw = x.measureText(chars[i]).width; if (f > 0) { x.save(); x.beginPath(); x.rect(xx, 0, cw * f, h); x.clip(); x.fillText(chars[i], xx, h / 2); x.restore(); } xx += cw; }
        if (q > .9) { x.lineWidth = 5; x.beginPath(); x.moveTo(left, h * .86); x.quadraticCurveTo(cx0, h * .98, left + tw * Math.min(1, (q - .9) / .1), h * .8); x.stroke(); } } })); }
  window.ANATOMY = { beetle, cake, fbm, sculpt, taper };
})();

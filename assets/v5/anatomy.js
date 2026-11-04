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
  function sculpt(geo, f) { geo.computeVertexNormals(); const P = geo.attributes.position, N = geo.attributes.normal, p = new T.Vector3(), n = new T.Vector3();
    for (let i = 0; i < P.count; i++) { p.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i); const d = f(p, n); P.setXYZ(i, p.x + n.x * d, p.y + n.y * d, p.z + n.z * d); } geo.computeVertexNormals(); return geo; }
  function taper(pts, r0, r1, seg, rad) { const c = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), g = new T.TubeGeometry(c, seg || 16, 1, rad || 10, false), P = g.attributes.position, s = seg || 16, R = (rad || 10) + 1;
    for (let i = 0; i <= s; i++) { const t = i / s, r = r0 + (r1 - r0) * t, ctr = c.getPointAt(t); for (let j = 0; j < R; j++) { const k = i * R + j; const x = P.getX(k) - ctr.x, y = P.getY(k) - ctr.y, z = P.getZ(k) - ctr.z; P.setXYZ(k, ctr.x + x * r, ctr.y + y * r, ctr.z + z * r); } }
    g.computeVertexNormals(); return g; }
  function canvasTex(w, h, f, srgb) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = srgb === false ? T.LinearEncoding : T.sRGBEncoding; t.wrapS = t.wrapT = T.RepeatWrapping; return t; }
  const TX = {};
  function facetNormal() { return TX.fn || (TX.fn = canvasTex(512, 512, (x, w, h) => { const id = x.createImageData(w, h), r = 8.5, hx = r * Math.sqrt(3);
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) { let best = 1e9, bx = 0, by = 0; const row = Math.round(py / (r * 1.5));
        for (let jr = row - 1; jr <= row + 1; jr++) { const cy = jr * r * 1.5, off = (jr & 1) * hx / 2, col = Math.round((px - off) / hx); for (let ic = col - 1; ic <= col + 1; ic++) { const cx = ic * hx + off, d = (px - cx) ** 2 + (py - cy) ** 2; if (d < best) { best = d; bx = px - cx; by = py - cy; } } }
        const d = Math.sqrt(best) / (r * .95); let nx = bx / (r * .95) * .9, ny = by / (r * .95) * .9; if (d > .92) { nx *= -1.6; ny *= -1.6; } const nz = Math.sqrt(Math.max(.05, 1 - nx * nx - ny * ny));
        const i = (py * w + px) * 4; id.data[i] = (nx * .5 + .5) * 255; id.data[i + 1] = (-ny * .5 + .5) * 255; id.data[i + 2] = nz * 255; id.data[i + 3] = 255; } x.putImageData(id, 0, 0); }, false)); }
  function chitinBump() { return TX.cb || (TX.cb = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#808080'; x.fillRect(0, 0, w, h); const R = rng(5);
      for (let i = 0; i < 2600; i++) { const a = R() * w, b = R() * h, r = .6 + R() * 2.2; const g = x.createRadialGradient(a, b, 0, a, b, r); g.addColorStop(0, 'rgba(30,30,30,.9)'); g.addColorStop(1, 'rgba(128,128,128,0)'); x.fillStyle = g; x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); }
      x.strokeStyle = 'rgba(160,160,160,.35)'; for (let i = 0; i < 160; i++) { x.beginPath(); const a = R() * w, b = R() * h; x.moveTo(a, b); x.lineTo(a + (R() - .5) * 60, b + (R() - .5) * 20); x.stroke(); } }, false)); }
  function crumbTex() { return TX.cr || (TX.cr = canvasTex(512, 256, (x, w, h) => { x.fillStyle = '#3a2210'; x.fillRect(0, 0, w, h); const R = rng(9);
      for (let i = 0; i < 9000; i++) { const l = 18 + R() * 30; x.fillStyle = `hsl(${24 + R() * 10},${45 + R() * 20}%,${l}%)`; x.fillRect(R() * w, R() * h, 1 + R() * 3, 1 + R() * 3); }
      for (let i = 0; i < 500; i++) { x.fillStyle = 'rgba(10,5,2,.6)'; x.beginPath(); x.arc(R() * w, R() * h, .5 + R() * 2, 0, 7); x.fill(); } })); }
  function creamTex() { return TX.cm || (TX.cm = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#efdcb4'; x.fillRect(0, 0, w, h); const R = rng(3); x.lineWidth = 3;
      for (let i = 0; i < 220; i++) { x.strokeStyle = `rgba(${200 + R() * 40},${170 + R() * 40},${120 + R() * 40},.35)`; x.beginPath(); x.arc(R() * w, R() * h, 10 + R() * 60, R() * 6, R() * 6 + 1.5 + R() * 2); x.stroke(); }
      for (let i = 0; i < 300; i++) { x.fillStyle = ['#d1342b', '#3b8f3a', '#e7c22e', '#2b62c4', '#f2f2f2'][i % 5]; x.fillRect(R() * w, R() * h, 2 + R() * 3, 1.5); } })); }
  function stripeTex(idx) {
    const k = 'st' + (idx % 3);
    if (TX[k]) return TX[k];
    const cols = ['#c83e32', '#d8a838', '#345e98'];
    return (TX[k] = canvasTex(64, 256, (x, w, h) => {
      const grd = x.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#fff7dc');
      grd.addColorStop(0.45, '#f2e2b6');
      grd.addColorStop(1, '#c8a868');
      x.fillStyle = grd;
      x.fillRect(0, 0, w, h);
      x.fillStyle = cols[idx % 3];
      x.globalAlpha = 0.72;
      for (let i = -4; i < 12; i++) {
        x.beginPath();
        x.moveTo(0, i * 32);
        x.lineTo(w, i * 32 + 22);
        x.lineTo(w, i * 32 + 29);
        x.lineTo(0, i * 32 + 7);
        x.fill();
      }
      x.globalAlpha = 1.0;
    }));
  }
  function glowTex(c0, c1) { const k = 'g' + c0 + c1; return TX[k] || (TX[k] = canvasTex(128, 128, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, c0); g.addColorStop(.35, c1); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); })); }
  function flameTex() { return TX.fl || (TX.fl = canvasTex(64, 128, (x, w, h) => { let g = x.createRadialGradient(w / 2, h * .62, 1, w / 2, h * .56, h * .46); g.addColorStop(0, 'rgba(255,255,245,1)'); g.addColorStop(.25, 'rgba(255,234,160,.98)'); g.addColorStop(.58, 'rgba(255,162,45,.62)'); g.addColorStop(1, 'rgba(255,90,0,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(w / 2, h * .06); x.bezierCurveTo(w * .95, h * .5, w * .85, h * .9, w / 2, h * .92); x.bezierCurveTo(w * .15, h * .9, w * .05, h * .5, w / 2, h * .06); x.fill();
      g = x.createRadialGradient(w / 2, h * .84, 1, w / 2, h * .84, w * .28); g.addColorStop(0, 'rgba(110,155,255,.65)'); g.addColorStop(1, 'rgba(90,140,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); })); }
  function smokeTex() { return TX.sm || (TX.sm = canvasTex(64, 256, (x, w, h) => { const R = rng(2); for (let i = 0; i < 40; i++) { const y = h - i * 6, a = .16 * (1 - i / 40); x.fillStyle = `rgba(185,192,205,${a})`; x.beginPath(); x.ellipse(w / 2 + Math.sin(i * .45) * 8 * (i / 40) + (R() - .5) * 3, y, 3.5 + i * .3, 5.5, 0, 0, 7); x.fill(); } })); }

  /* ---------------- the beetle ---------------- */
  function beetle(it, now) {
    const g = new T.Group(), R = rng(17), hue = .26 + (it.sheen - .5) * .12;
    const chitin = new T.MeshPhysicalMaterial({ color: new T.Color().setHSL(hue, .25, .028), roughness: .42, metalness: .2, clearcoat: .7, clearcoatRoughness: .3, bumpMap: chitinBump(), bumpScale: .004, envMapIntensity: .45 });
    chitin.bumpMap.repeat.set(3, 3);
    const add = (geo, mat, name, parent) => { const m = new T.Mesh(geo, mat); m.userData.sk = name; (parent || g).add(m); return m; };
    const head = sculpt(new T.SphereGeometry(.3, 112, 80), (p) => { let d = (fbm(p.x * 22, p.y * 22, p.z * 22) - .5) * .008;
        if (p.z > 0 && p.y > -.05) d -= .03 * Math.exp(-Math.pow(p.x / .045, 2)) * Math.min(1, p.z / .2);
        if (p.y < -.12) d -= (-.12 - p.y) * .5 * Math.max(0, 1 - Math.abs(p.x) / .3); return d; });
    const H = add(head, chitin, 'head'); H.scale.set(1.28, .98, .82); H.position.set(0, .34, 0);
    // compound eyes: both eyes have crisp hexagonal ommatidia facets
    const eyeM = new T.MeshPhysicalMaterial({ color: 0x0b0d0a, roughness: .14, metalness: .05, clearcoat: 1, clearcoatRoughness: .05, normalMap: facetNormal(), normalScale: new T.Vector2(1.15, 1.15), envMapIntensity: .42 });
    eyeM.normalMap.repeat.set(44, 22); const focus = it.focus;
    eyeM.onBeforeCompile = sh => { sh.uniforms.focusK = { value: focus };
      sh.fragmentShader = 'uniform float focusK;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float fac = dot(normalize(normal), normalize(vViewPosition)); diffuseColor.rgb *= mix(1.0, .08, smoothstep(.955, .995, fac)); diffuseColor.rgb += vec3(.05,.06,.045) * (1.0 - smoothstep(.2, .7, fac)); }`); };
    eyeM.customProgramCacheKey = () => 'ommatidia';
    for (const s of [-1, 1]) { const eg = sculpt(new T.SphereGeometry(.16, 128, 96), p => { const a = Math.atan2(p.y, p.x * s); return -.05 * Math.exp(-Math.pow((a - 1.1) / .35, 2)) * Math.max(0, p.z) / .16; });
      const E = add(eg, eyeM, s < 0 ? 'eyeL' : 'eyeR'); E.scale.set(.62, 1.18, .92); E.position.set(s * .3, .36, .06); E.rotation.y = s * .55; }
    const antennae = [];
    for (const s of [-1, 1]) { let parent = new T.Group(); parent.position.set(s * .19, .55, .13); g.add(parent); const joints = [parent];
      for (let k = 0; k < 11; k++) { const L = k === 0 ? .2 : k === 1 ? .07 : .17 - k * .004, r = k === 0 ? .03 : .022 - k * .0011;
        const seg = add(new T.CylinderGeometry(r * .8, r, L, 14, 4), chitin, 'ant' + s + k, parent); seg.position.y = L / 2;
        const knob = add(new T.SphereGeometry(r * .95, 12, 8), chitin, 'kb' + s + k, parent); knob.position.y = L;
        const j = new T.Group(); j.position.y = L; parent.add(j); j.rotation.z = -s * (k === 0 ? .55 : .06); j.rotation.x = k === 0 ? -.25 : .09; joints.push(j); parent = j; }
      joints[0].rotation.z = -s * .35; antennae.push(joints); }
    for (const s of [-1, 1]) { add(taper([[s * .12, .1, .17], [s * .13, .05, .25], [s * .07, .02, .3], [s * .02, .03, .31]], .035, .006, 24, 12), chitin, 'mand' + s);
      for (const [dx, dy] of [[.05, -.02], [.09, .0]]) add(taper([[s * dx, .1 + dy, .2], [s * (dx + .03), .0 + dy, .3], [s * (dx + .02), -.07 + dy, .33]], .016, .01, 12, 8), chitin, 'palp' + s + dx); }
    const pro = add(sculpt(new T.SphereGeometry(.34, 64, 48), p => (fbm(p.x * 18, p.y * 18, p.z * 18) - .5) * .01), chitin, 'pronotum'); pro.scale.set(1.15, .8, 1); pro.position.set(0, .33, -.42);
    const ely = add(new T.SphereGeometry(.42, 64, 48), chitin, 'elytra'); ely.scale.set(1.05, .7, 1.9); ely.position.set(0, .34, -1.2);
    const legs = [];
    for (let j = 0; j < 3; j++) for (const s of [-1, 1]) { const piv = new T.Group(); piv.position.set(s * .26, .2, -.3 - j * .4); g.add(piv); const L = j === 0 ? 1.25 : 1;
      const knee = [s * .55 * L, .3, (j === 0 ? .25 : .05)], ankle = [s * 1.0 * L, -.1, (j === 0 ? .6 : .15)];
      add(taper([[0, 0, 0], [s * .2, .22, .06], knee], .055, .035, 18, 12), chitin, 'fem' + j + s, piv); const kn = add(new T.SphereGeometry(.036, 12, 8), chitin, 'kn' + j + s, piv); kn.position.set(...knee);
      add(taper([knee, [s * .8 * L, .15, (j === 0 ? .45 : .1)], ankle], .032, .022, 18, 10), chitin, 'tib' + j + s, piv);
      let p = ankle; for (let k = 0; k < 5; k++) { const q = [p[0] + s * .05, p[1] - .035, p[2] + .03]; add(taper([p, q], .022, .016, 4, 8), chitin, 'tar' + j + s + k, piv); p = q; }
      for (const c of [-1, 1]) add(taper([p, [p[0] + s * .04, p[1] - .03, p[2] + c * .02]], .01, .002, 4, 6), chitin, 'claw' + j + s + c, piv);
      legs.push({ piv, j, s }); }
    // setae: curved, tapered dark-olive sensory bristles rooted strictly along the sub-ocular cheek rim (genae)
    // and dorsal brow collar — never scattered as white flecks across the forelegs or head center
    if (it.setae > .02) {
      const setaMat = new T.MeshStandardMaterial({
        color: 0x2a331d,
        roughness: 0.85,
        metalness: 0.05,
        transparent: true,
        opacity: 0.68,
        envMapIntensity: 0.15
      });
      const lenS = 0.038 + it.setae * 0.048;
      const setaGroup = new T.Group();
      setaGroup.userData.add = (it.skin == null || it.skin < 0.85) && (it.setae > ((it.canon || {}).setae || 0) + .02);
      for (const s of [-1, 1]) {
        for (let i = 0; i < 14; i++) {
          const t = i / 13;
          const y0 = 0.39 - t * 0.12 + (R() - 0.5) * 0.018;
          const x0 = s * (0.32 - t * 0.04 + (R() - 0.5) * 0.015);
          const z0 = 0.05 + t * 0.06;
          const pts = [
            [x0, y0, z0],
            [x0 + s * lenS * (0.45 + R() * 0.2), y0 - lenS * (0.15 + R() * 0.15), z0 + lenS * 0.1],
            [x0 + s * lenS * (0.85 + R() * 0.3), y0 - lenS * (0.35 + R() * 0.25), z0 + lenS * 0.04]
          ];
          const br = new T.Mesh(taper(pts, 0.0028, 0.0004, 8, 6), setaMat);
          br.userData.add = setaGroup.userData.add;
          setaGroup.add(br);
        }
      }
      g.add(setaGroup);
    }
    g.userData.tick = t => { antennae.forEach((J, a) => J.forEach((j, k) => { if (k) j.rotation.x = (k === 1 ? -.25 : .09) + Math.sin(t * 1.7 + k * .6 + a * 2) * .02 * (1 + k * .15); }));
      legs.forEach(L => { const ph = t * 4 * it.gait + L.j * 2.1 + (L.s > 0 ? Math.PI : 0); L.piv.rotation.y = Math.sin(ph) * .22 * it.gait; L.piv.rotation.z = Math.max(0, Math.cos(ph)) * .12 * it.gait * L.s; }); };
    g.userData.tick(now / 1000); return g;
  }

  /* ---------------- the cake ---------------- */
  function cake(it, now) {
    const g = new T.Group(), Rr = .72, Hh = .55, seg = 144, rows = 28;
    const geo = new T.CylinderGeometry(Rr, Rr, Hh, seg, rows, false), P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); if (r < 1e-4) continue; const v = (y + Hh / 2) / Hh;
      let rr = r * (1 + it.bundt * (.085 * Math.cos(a * 12) * Math.sin(v * Math.PI))) + (fbm(Math.cos(a) * 6, v * 5, Math.sin(a) * 6) - .5) * .016;
      rr += it.bundt * .055 * Math.sin(v * Math.PI);
      P.setX(i, Math.cos(a) * rr); P.setZ(i, Math.sin(a) * rr); }
    geo.computeVertexNormals();
    const crumb = crumbTex(); crumb.repeat.set(3, 1);
    const body = new T.Mesh(geo, new T.MeshStandardMaterial({ map: crumb, roughness: .82, bumpMap: crumb, bumpScale: .01, color: new T.Color().setHSL(.08, .42, .48 + it.bundt * .16) }));
    body.position.y = Hh / 2; body.userData.sk = 'body'; body.userData.bundt = it.bundt || 0; g.add(body);

    // Cream top with organic fluted crown ridge & concave central Bundt dimple (no flat black cylinder sticking out!)
    const topG = new T.CylinderGeometry(Rr * 1.01, Rr * 1.01, .07, seg, 8), TP = topG.attributes.position;
    for (let i = 0; i < TP.count; i++) {
      let x = TP.getX(i), y = TP.getY(i), z = TP.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
      const nr = r / Rr;
      if (it.bundt > 0.01) {
        const flute = Math.cos(a * 12) * 0.045 * it.bundt * smoothstep(0.25, 0.95, nr);
        x *= (1 + flute); z *= (1 + flute);
        if (y > 0) {
          const well = Math.exp(-nr * nr * 9.5) * 0.11 * it.bundt;
          const ridge = Math.sin(Math.min(1, Math.max(0, (nr - 0.22) / 0.72)) * Math.PI) * 0.032 * it.bundt;
          y = y - well + ridge;
        }
      }
      if (y < 0 && r > Rr * .9) {
        const drip = Math.max(0, Math.sin(a * 9 + 1.3) * Math.sin(a * 5)) * .07;
        y -= drip;
      }
      if (y > 0) y += (fbm(x * 9, 0, z * 9) - .5) * .014;
      TP.setXYZ(i, x, y, z);
    }
    topG.computeVertexNormals();
    const top = new T.Mesh(topG, new T.MeshPhysicalMaterial({ map: creamTex(), roughness: .45, clearcoat: .3, clearcoatRoughness: .5 }));
    top.position.y = Hh + .015; top.userData.sk = 'top'; top.userData.bundt = it.bundt || 0; g.add(top);

    // Top-crown piped crimson buttercream calligraphy (生日快樂) inside the candle ring (only added as extra 3D overlay when skin < 0.5)
    if (it.icing > .05 && (it.skin == null || it.skin < 0.5)) {
      const topIcingG = new T.CircleGeometry(Rr * 0.68, 48);
      topIcingG.rotateX(-Math.PI / 2 + 0.08);
      const topIcing = new T.Mesh(topIcingG, new T.MeshBasicMaterial({ map: icingTex(), transparent: true, opacity: it.icing * 0.92, depthWrite: false }));
      topIcing.position.set(0, Hh + 0.056, 0.06);
      topIcing.userData.add = true;
      g.add(topIcing);
    }

    const C = it.canon || {}, filmHas = it.skin > .5 && it.candles === C.candles && it.bundt < .05 && it.flames > (C.flames || 1) - .05 && it.fit, n = filmHas ? 0 : Math.round(it.candles);
    const flames = [];
    for (let k = 0; k < n; k++) {
      // Natural crown placement matching the real film cake (sec_148 / sec_156): all candles sit firmly on the upper/mid buttercream crown
      const t = n === 1 ? 0.5 : k / (n - 1);
      const cx = n === 1 ? 0 : (t - 0.5) * Rr * 1.18 + Math.sin(k * 2.7 + 0.5) * 0.022;
      const cz = n === 1 ? -0.05 : -0.04 - 0.15 * Math.sin(t * Math.PI) + ((k % 2) ? 0.065 : -0.055);
      const ch = 0.27 * (0.92 + 0.13 * Math.sin(k * 1.7 + 0.4));
      const cg = new T.CylinderGeometry(.021, .024, ch, 16, 6), CP = cg.attributes.position;
      for (let i = 0; i < CP.count; i++) {
        const y = CP.getY(i), ang = Math.atan2(CP.getZ(i), CP.getX(i));
        if (y > .05) {
          const run = Math.max(0, Math.sin(ang * 3 + k)) * .0035;
          CP.setX(i, CP.getX(i) * (1 + run * 16));
          CP.setZ(i, CP.getZ(i) * (1 + run * 16));
        }
      }
      cg.computeVertexNormals();
      const litBoost = Math.max(0.0, Math.min(1.0, it.flames));
      const waxMat = new T.MeshStandardMaterial({
        map: stripeTex(k),
        roughness: 0.42,
        metalness: 0.02,
        color: litBoost > 0.05 ? new T.Color(0xf4dec0) : new T.Color(0x181a20),
        emissive: litBoost > 0.05 ? new T.Color(0xb8721e) : new T.Color(0x040507),
        emissiveIntensity: litBoost > 0.05 ? 0.32 * litBoost : 0.04
      });
      const baseCrownY = Hh + 0.025;
      const c = new T.Mesh(cg, waxMat);
      c.position.set(cx, baseCrownY + ch * 0.5, cz);
      c.rotation.set(Math.sin(k * 2.3) * 0.028, 0, Math.cos(k * 1.9) * 0.028);
      c.userData.add = true;
      g.add(c);

      const wick = new T.Mesh(new T.CylinderGeometry(.0032, .0032, .034, 6), new T.MeshBasicMaterial({ color: 0x181008 }));
      wick.position.set(cx, baseCrownY + ch + 0.015, cz);
      wick.userData.add = true;
      g.add(wick);

      if (it.flames > .02) {
        // Warm golden candle bounce pool on the frosting around each candle base
        const pool = new T.Sprite(new T.SpriteMaterial({
          map: glowTex('rgba(255,215,120,.85)', 'rgba(255,155,40,.25)'),
          blending: T.AdditiveBlending,
          depthWrite: false,
          opacity: 0.42 * it.flames,
          toneMapped: false
        }));
        pool.scale.set(0.24, 0.14, 1);
        pool.position.set(cx, baseCrownY + 0.02, cz);
        pool.userData.add = true;
        g.add(pool);

        // 3D teardrop flame core so the flame is visible from every angle
        const fCoreG = new T.ConeGeometry(0.018, 0.075, 12);
        const fCore = new T.Mesh(fCoreG, new T.MeshBasicMaterial({ color: 0xfff8e2, transparent: true, opacity: 0.95 * it.flames, toneMapped: false }));
        fCore.position.set(cx, baseCrownY + ch + 0.058, cz);
        fCore.userData.add = true;
        g.add(fCore);

        const f = new T.Sprite(new T.SpriteMaterial({
          map: flameTex(),
          blending: T.AdditiveBlending,
          depthWrite: false,
          opacity: Math.min(1, it.flames * 1.15),
          toneMapped: false
        }));
        f.position.set(cx, baseCrownY + ch + 0.085, cz);
        f.userData.k = k;
        f.userData.add = true;
        g.add(f);
        flames.push(f);
      } else {
        // Dying red ember at the wick tip + delicate rising wax smoke wisp
        const ember = new T.Sprite(new T.SpriteMaterial({
          map: glowTex('rgba(255,95,20,.95)', 'rgba(200,30,0,.2)'),
          blending: T.AdditiveBlending,
          depthWrite: false,
          opacity: 0.72,
          toneMapped: false
        }));
        ember.scale.set(0.036, 0.036, 1);
        ember.position.set(cx, baseCrownY + ch + 0.028, cz);
        ember.userData.add = true;
        g.add(ember);

        const sm = new T.Sprite(new T.SpriteMaterial({
          map: smokeTex(),
          transparent: true,
          depthWrite: false,
          opacity: .24 * (1 - it.flames / .02)
        }));
        sm.scale.set(.08, .34, 1);
        sm.position.set(cx, baseCrownY + ch + .19, cz);
        sm.userData.add = true;
        g.add(sm);
      }
    }
    let L = null, glow = null;
    if (it.flames > .02 && n) {
      L = new T.PointLight(0xffb060, 2.2 * it.flames * Math.sqrt(n / 3), 6, 2);
      L.position.set(0, Hh + .7, 0);
      g.add(L);
      glow = new T.Sprite(new T.SpriteMaterial({
        map: glowTex('rgba(255,215,140,.85)', 'rgba(255,160,60,.28)'),
        blending: T.AdditiveBlending,
        depthWrite: false,
        opacity: .38 * it.flames,
        toneMapped: false
      }));
      glow.scale.set(1.75, 1.25, 1);
      glow.position.y = Hh + .44;
      glow.userData.add = true;
      g.add(glow);
    }
    g.userData.tick = t => {
      for (const f of flames) {
        const k = f.userData.k, fk = 1 + .08 * Math.sin(t * 11 + k * 1.7) + .04 * Math.sin(t * 23 + k);
        f.scale.set(.105 * (2 - fk), .24 * fk * it.flames, 1);
      }
      if (L) L.intensity = 2.2 * it.flames * Math.sqrt(n / 3) * (1 + .06 * Math.sin(t * 13));
    };
    g.userData.tick(now / 1000);
    return g;
  }

  function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function icingTex() {
    return TX.ic || (TX.ic = canvasTex(512, 512, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      x.save();
      x.translate(w / 2, h * 0.64);
      x.font = 'bold 54px "Songti SC","Kaiti SC","Noto Serif CJK SC",serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillStyle = 'rgba(45,8,4,0.65)';
      x.fillText('生日快樂', 2, 4);
      x.fillStyle = 'rgba(172,22,18,0.95)';
      x.fillText('生日快樂', 0, 0);
      x.strokeStyle = 'rgba(165,20,16,0.92)';
      x.lineWidth = 6;
      x.lineCap = 'round';
      x.beginPath();
      x.moveTo(-88, 34);
      x.lineTo(68, 26);
      x.lineTo(-42, 48);
      x.lineTo(84, 42);
      x.stroke();
      x.restore();
    }));
  }

  window.ANATOMY = { beetle, cake, fbm, sculpt, taper, facetNormal };
})();

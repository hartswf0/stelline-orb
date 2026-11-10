#!/usr/bin/env node
/* One level per kept clip, for games/breath: the cake as a real 3D model, and what the game needs to know about it.
   The model is not downloaded or drawn: the Memory Weaver (field-orb-05.html) builds the clip's recipe by its rings, unseen, and the finished
   clay, piping and toppings are exported as GLB (candles and flames left out: the game stands its own, so it can blow them out).
     node tools/games/srv.cjs &      (or any static server on :8095 from the repository root)
     node tools/games/export_levels.cjs        -> games/breath/levels/<id>/cake.glb, games/breath/levels/index.json (+ index.js) */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..'), N = path.join(ROOT, 'assets/normalized'), OUT = path.join(ROOT, 'games/breath/levels');
const I = JSON.parse(fs.readFileSync(path.join(N, 'index.json'))), CAST = JSON.parse(fs.readFileSync(path.join(N, 'cast/index.json'))), TR = JSON.parse(fs.readFileSync(path.join(N, 'triads.json'))).features;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const p = await b.newPage({ viewport: { width: 480, height: 300 } });
  p.on('pageerror', e => console.error('PAGE', String(e.stack || e).slice(0, 300)));
  await p.goto('http://localhost:8095/field-orb-05.html', { waitUntil: 'load' }); await p.waitForTimeout(1500); await p.evaluate(() => window.FORGE.manual());
  const levels = [];
  for (const c of I.clips.filter(c => c.keep)) {
    const r = await p.evaluate(async id => { const F = window.FORGE, B = F.BOOK, T = window.THREE, hit = B.find(id); if (!hit) return null; B.shelf = hit[0]; B.idx = hit[1]; B.pace = 12; F.S.mode = 'RECIPE'; B.load(); B.start(); let t = 0; while (B.run && t < 600) { F.step(1 / 24); t += 1 / 24; }
      const f = F.DOC.frames[0], candles = f.items.filter(i => i.t === 'CANDLE').map(i => i.p.map(v => +v.toFixed(4))), tr = f.tr || { p: [0, 0, 0], r: [0, 0, 0], s: [1, 1, 1] };
      // a copy of the cake without candles or flames, plain materials (the orb's hologram shader does not export), vertex colours kept
      const root = new T.Group(); F.CAKE.updateMatrixWorld(true);
      F.CAKE.traverse(o => { if (!o.isMesh || !o.visible) return; let q = o, skip = false; while (q && q !== F.CAKE) { if (q.userData && q.userData.flame) skip = true; q = q.parent; } const isCandle = o.geometry.type === 'CylinderGeometry' && o.geometry.parameters && o.geometry.parameters.height > .04 && o.geometry.parameters.radiusTop < .006; if (skip || isCandle || (o.geometry.type === 'CylinderGeometry' && o.geometry.parameters.radiusTop < .001)) return;
        const g = o.geometry.clone(); g.applyMatrix4(new T.Matrix4().copy(F.CAKE.matrixWorld).invert().multiply(o.matrixWorld)); const vc = !!g.attributes.color; const col = o.material && o.material.color ? o.material.color.getHex() : 0xffffff;
        root.add(new T.Mesh(g, new T.MeshStandardMaterial({ color: vc ? 0xffffff : col, vertexColors: vc, roughness: .7, metalness: 0 }))); });
      const bb = new T.Box3().setFromObject(root), glb = await new Promise((res, rej) => new T.GLTFExporter().parse(root, res, { binary: true }));
      let s = ''; const u = new Uint8Array(glb); for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
      return { glb: btoa(s), candles, box: [bb.min.toArray(), bb.max.toArray()].map(a => a.map(v => +v.toFixed(4))), scale: tr.s, tilt: tr.r, title: B.cur().title, steps: B.steps ? 0 : 0, meshes: root.children.length }; }, c.id);
    if (!r) { console.log('no recipe', c.id); continue; }
    const dir = path.join(OUT, c.id); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'cake.glb'), Buffer.from(r.glb, 'base64'));
    const f = TR[c.id] || {}, cast = CAST[c.id] || null;
    levels.push({ id: c.id, title: r.title, era: c.era, event: c.event.kind, candles: r.candles, box: r.box, scale: r.scale, tilt: r.tilt, swatch: f.swatch || '#3a2a1c', light: f.light == null ? .25 : +f.light.toFixed(3), hue: f.hue == null ? .08 : +f.hue.toFixed(3),
      cast: cast ? { file: '../../' + cast.file, frames: cast.frames, w: cast.w, h: cast.h, box: cast.box } : null, plate: '../../assets/normalized/bars/' + c.id + '.mp4' });
    console.log(c.id, r.candles.length, 'candles', r.meshes, 'meshes', (Buffer.from(r.glb, 'base64').length / 1024).toFixed(0) + ' KB');
  }
  const idx = { grid: I.grid, beat_s: I.beat_s, levels }; fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(idx, null, 1)); fs.writeFileSync(path.join(OUT, 'index.js'), 'window.LEVELS = ' + JSON.stringify(idx) + ';\n');
  console.log(levels.length, 'levels'); await b.close();
})();

#!/usr/bin/env node
/* A multi-view capture of a clip's coded scene, for Video2Game (github.com/video2game/video2game).
   Video2Game needs many views with known camera poses. The archive's clips are locked-camera, so they cannot give that; the Memory Weaver can.
   It builds the clip's recipe, then its camera goes round the cake on two rings (36 views each, 12 and 34 degrees up). The cast is left out: it is
   a flat sheet that turns to face the camera, so it is not the same from two places. Depth of field is off and time is held, so every view shows
   one unchanging scene. For each view it writes the picture, a mask of the cake (instance 1) against everything else (0), and the exact camera.
     node tools/games/srv.cjs &
     node tools/games/v2g/capture.cjs bday_35 [...]     -> datasets/v2g/<id>/images/*.png, instance_png/*.png, capture.json
   then  python3 tools/games/v2g/to_colmap.py <id>      -> sparse/0/*.bin, instance/*.npy, transforms.json */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'); const ROOT = path.resolve(__dirname, '../../..'), W = 960, H = 540;
(async () => { const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const id of process.argv.slice(2)) { const out = path.join(ROOT, 'datasets/v2g', id); fs.mkdirSync(path.join(out, 'images'), { recursive: true }); fs.mkdirSync(path.join(out, 'instance_png'), { recursive: true });
    const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }); p.on('pageerror', e => console.error('PAGE', String(e.stack || e).slice(0, 300)));
    await p.goto('http://localhost:8095/field-orb-05.html', { waitUntil: 'load' }); await p.waitForTimeout(1500); await p.addStyleTag({ content: '.app{grid-template-rows:1fr 0px !important} #orb{height:0 !important;border:0 !important;overflow:hidden}' });
    const setup = await p.evaluate(id => { window.dispatchEvent(new Event('resize')); const F = window.FORGE, B = F.BOOK, T = window.THREE, hit = B.find(id); if (!hit) return null; F.manual(); B.shelf = hit[0]; B.idx = hit[1]; B.pace = 12; F.S.mode = 'RECIPE'; B.load(); B.start(); let t = 0; while (B.run && t < 600) { F.step(1 / 24); t += 1 / 24; }
      F.DOC.cast.length = 0; F.DOC.frames.forEach(f => { f.cast = []; }); F.showFrame(); F.setMode('LOOK'); F.pickTo('cake'); F.S.shotIdx = 1; F.S.noDof = true; F.S.reticleAside = null; F.S.turntable = false; for (let i = 0; i < 30; i++) { F.S.ease = null; F.step(1 / 24); }
      const mesh = F.CAKE.children.filter(m => m.isMesh && m.geometry.attributes.color)[0], bb = new T.Box3().setFromObject(mesh), c = bb.getCenter(new T.Vector3()), P = mesh.geometry.attributes.position, C = mesh.geometry.attributes.color, pts = [], v = new T.Vector3(); mesh.updateMatrixWorld(true);
      for (let i = 0; i < P.count; i += Math.max(1, Math.floor(P.count / 2500))) { v.fromBufferAttribute(P, i).applyMatrix4(mesh.matrixWorld); pts.push([+v.x.toFixed(5), +v.y.toFixed(5), +v.z.toFixed(5), Math.round(Math.min(1, C.getX(i)) ** (1 / 2.2) * 255), Math.round(Math.min(1, C.getY(i)) ** (1 / 2.2) * 255), Math.round(Math.min(1, C.getZ(i)) ** (1 / 2.2) * 255)]); }
      window.__c = { centre: c.toArray(), bb: [bb.min.toArray(), bb.max.toArray()] }; return { centre: c.toArray(), box: [bb.min.toArray(), bb.max.toArray()], points: pts, title: B.cur().title }; }, id);
    if (!setup) { console.log('no recipe', id); continue; }
    const views = []; let k = 0;
    for (const [pitch, dist] of [[-0.21, 0.78], [-0.6, 0.82]]) for (let a = 0; a < 36; a++) { const name = 'frame_' + String(k).padStart(5, '0') + '.png';
      const r = await p.evaluate(([yaw, pitch, dist]) => { const F = window.FORGE, T = window.THREE, o = F.S.orbit, c = window.__c; o.yaw = yaw; o.pitch = pitch; o.dist = dist; o.tgt.set(c.centre[0], c.centre[1], c.centre[2]); F.S.ease = null; F.advance(0); const cv = document.querySelector('#room canvas'), img = cv.toDataURL('image/png').slice(22); F.cam.updateMatrixWorld(true);
        // the mask: the cake's own meshes white, everything else black, no fog, no tone curve
        const keep = [], sc = F.scene, white = new T.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false }), black = new T.MeshBasicMaterial({ color: 0x000000, fog: false, toneMapped: false }), inCake = o2 => { for (let q = o2; q; q = q.parent) if (q === F.CAKE) return true; return false; };
        sc.traverse(o2 => { if (o2.isMesh || o2.isPoints || o2.isSprite || o2.isLine) { keep.push([o2, o2.material, o2.visible]); if (o2.isMesh) o2.material = inCake(o2) && !o2.userData.flame ? white : black; else o2.visible = false; } }); const bg = sc.background; sc.background = new T.Color(0);      /* the two flat materials ignore fog */
        F.advance(0); const mask = cv.toDataURL('image/png').slice(22); keep.forEach(([o2, m, v]) => { o2.material = m; o2.visible = v; }); sc.background = bg;
        return { img, mask, c2w: F.cam.matrixWorld.toArray(), fov: F.cam.fov, aspect: F.cam.aspect, view: F.cam.view }; }, [a / 36 * Math.PI * 2, pitch, dist]);
      fs.writeFileSync(path.join(out, 'images', name), Buffer.from(r.img, 'base64')); fs.writeFileSync(path.join(out, 'instance_png', name), Buffer.from(r.mask, 'base64')); views.push({ name, c2w: r.c2w, fov_y_deg: r.fov, view_offset: r.view }); k++; }
    fs.writeFileSync(path.join(out, 'capture.json'), JSON.stringify({ id, title: setup.title, width: W, height: H, convention: 'c2w is three.js camera matrixWorld, column-major: camera looks down -Z, +Y up; metres', centre: setup.centre, box: setup.box, views, points: setup.points }));
    console.log('captured', id, views.length, 'views', setup.points.length, 'points'); await p.close(); }
  await b.close(); })();

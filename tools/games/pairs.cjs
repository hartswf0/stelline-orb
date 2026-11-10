#!/usr/bin/env node
/* Side by side: a frame of the plate and a frame of the game at the same spot in the bar, for the look check the video-to-game loop asks for.
   The game's camera stands on the archive's grid, so the two halves should show a cake of the same size in the same place.
     node tools/games/pairs.cjs bday_35 bday_69 bday_28     -> games/breath/pairs/<id>.jpg */
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..'), OUT = path.join(ROOT, 'games/breath/pairs'); fs.mkdirSync(OUT, { recursive: true });
(async () => { const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const id of process.argv.slice(2)) { const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await p.goto(`http://localhost:8095/games/breath/index.html?clip=${id}&autostart&manual&look=clean`, { waitUntil: 'load' }); await p.waitForFunction(() => window.__game && window.__game.state.phase === 'play', null, { timeout: 40000 });
    for (let i = 0; i < 30; i++) await p.evaluate(() => window.__game.advance(1 / 30));      // one second in: bar-beat 1.2
    const png = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 1280; c.height = 576; const x = c.getContext('2d'); x.drawImage(document.getElementById('gl'), 0, 72, 1280, 576, 0, 0, 1280, 576); x.drawImage(document.getElementById('hud'), 0, 72, 1280, 576, 0, 0, 1280, 576); return c.toDataURL('image/png').slice(22); });
    const g = path.join(OUT, id + '_game.png'); fs.writeFileSync(g, Buffer.from(png, 'base64'));
    execSync(`ffmpeg -v error -y -ss 1.0 -i "${path.join(ROOT, 'assets/normalized/bars', id + '.mp4')}" -i "${g}" -filter_complex "[0:v]scale=960:432[a];[1:v]scale=960:432[b];[a][b]hstack,drawbox=x=958:y=0:w=4:h=432:color=black:t=fill" -frames:v 1 -q:v 3 "${path.join(OUT, id + '.jpg')}"`); fs.unlinkSync(g); console.log('pair', id); await p.close(); }
  await b.close(); })();

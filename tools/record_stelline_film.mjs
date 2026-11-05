#!/usr/bin/env node
/**
 * Records the 45-second Stelline Field Orb 05 Director Film (1280x720 @ 24fps)
 * using GPU-accelerated Headless Chrome (Metal/ANGLE) via CDP WebSocket,
 * then muxes the synchronized mechanical foley + Blade Runner chamber soundtrack
 * (/tmp/stelline_orb_audio.wav) into assets/stelline-orb-film.mp4.
 */
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9234;
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 24;
const DURATION = 45.0;
const TOTAL_FRAMES = Math.round(FPS * DURATION);
const FRAMES_DIR = '/tmp/stelline_film_frames';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const pages = await res.json();
      const page = pages.find(p => p.type === 'page' && p.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(150);
  }
  throw new Error('Could not connect to Chrome CDP endpoint');
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
  }
  async connect() {
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = ev => {
      const msg = JSON.parse(ev.data.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }
  close() {
    this.ws.close();
  }
}

async function main() {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  console.log('1. Synthesizing 45.0s synchronized foley + chamber audio...');
  execSync('/Users/gaia/anaconda3/bin/python3 tools/synth_stelline_audio.py', { stdio: 'inherit' });

  console.log('2. Launching GPU Headless Chrome (Metal/ANGLE)...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--use-gl=angle',
    '--use-angle=metal',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--hide-scrollbars',
    `--window-size=${WIDTH},${HEIGHT}`,
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-stelline-recorder',
    'http://localhost:8095/field-orb-05.html'
  ], { stdio: 'ignore' });

  try {
    const wsUrl = await getWsUrl();
    const cdp = new CDPClient(wsUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: WIDTH,
      height: HEIGHT,
      deviceScaleFactor: 1,
      mobile: false
    });

    await cdp.send('Page.navigate', { url: 'http://localhost:8095/field-orb-05.html' });
    // Wait for Three.js scene and textures (kids.webp, ana.webp) to finish loading
    await sleep(1600);

    await cdp.send('Runtime.evaluate', {
      expression: `
        window.FIELD_ORB_05.manual();
        window.FIELD_ORB_05.startDirectorReel();
      `
    });

    const dt = 1.0 / FPS;
    console.log(`3. Capturing ${TOTAL_FRAMES} deterministic GPU frames (${DURATION}s @ ${FPS}fps)...`);
    for (let f = 0; f < TOTAL_FRAMES; f++) {
      await cdp.send('Runtime.evaluate', {
        expression: `window.FIELD_ORB_05.advance(${dt});`
      });
      const shot = await cdp.send('Page.captureScreenshot', {
        format: 'jpeg',
        quality: 92
      });
      const pad = String(f).padStart(5, '0');
      fs.writeFileSync(path.join(FRAMES_DIR, `frame_${pad}.jpg`), Buffer.from(shot.data, 'base64'));
      if (f % 120 === 0 || f === TOTAL_FRAMES - 1) {
        console.log(`   Frame ${f + 1}/${TOTAL_FRAMES} (t=${(f * dt).toFixed(2)}s)`);
      }
    }

    cdp.close();
  } finally {
    chrome.kill('SIGTERM');
  }

  console.log('4. Encoding H.264 + AAC MP4 via ffmpeg...');
  const outMp4 = path.resolve('assets/stelline-orb-film.mp4');
  execSync(
    `/Users/gaia/anaconda3/bin/ffmpeg -y -framerate ${FPS} -i "${FRAMES_DIR}/frame_%05d.jpg" -i /tmp/stelline_orb_audio.wav -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -shortest "${outMp4}"`,
    { stdio: 'inherit' }
  );

  const stat = fs.statSync(outMp4);
  console.log(`5. Completed: ${outMp4} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

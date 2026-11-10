import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const FPS = 24;
const DT = 1 / FPS;
const WIDTH = 1280;
const HEIGHT = 720;
const BASE_URL = process.env.BASE_URL || 'http://localhost:8095/orb-film-studio.html';
const AUDIO_SRC = 'assets/stelline-orb-film.mp4';

export const BATCH_MODES = {
  'grounded-no-reticle': {
    query: '?ground=1&reticle=off',
    mp4: 'assets/orbfilm/orb-film-no-reticle.mp4',
    poster: 'assets/orbfilm/orb-film-no-reticle.jpg',
    label: 'Grounded · No Reticle (Controller + Caption)'
  },
  'grounded-side-reticle': {
    query: '?ground=1&reticle=aside',
    mp4: 'assets/orbfilm/orb-film-reticle-aside.mp4',
    poster: 'assets/orbfilm/orb-film-reticle-aside.jpg',
    label: 'Grounded · Reference Side Reticle ) (Controller + Caption)'
  },
  'no-text-no-reticle': {
    query: '?ground=1&notext=1&reticle=off',
    mp4: 'assets/orbfilm/orb-film-no-text.mp4',
    poster: 'assets/orbfilm/orb-film-no-text.jpg',
    label: 'Batch: No Text · Grounded · No Reticle'
  },
  'no-text-side-reticle': {
    query: '?ground=1&notext=1&reticle=aside',
    mp4: 'assets/orbfilm/orb-film-no-text-side-reticle.mp4',
    poster: 'assets/orbfilm/orb-film-no-text-side-reticle.jpg',
    label: 'Batch: No Text · Grounded · Reference Side Reticle )'
  },
  'museum-no-screen': {
    query: '?ground=1&museum=1&reticle=off',
    mp4: 'assets/orbfilm/orb-film-museum-no-screen.mp4',
    poster: 'assets/orbfilm/orb-film-museum-no-screen.jpg',
    label: 'Batch: Museum-Grade · No Screen Above Orb · No Text · No Reticle'
  },
  'museum-side-reticle': {
    query: '?ground=1&museum=1&reticle=aside',
    mp4: 'assets/orbfilm/orb-film-museum-side-reticle.mp4',
    poster: 'assets/orbfilm/orb-film-museum-side-reticle.jpg',
    label: 'Batch: Museum-Grade · No Screen Above Orb · No Text · Reference Side Reticle )'
  },
  'stage-grounded-no-reticle': {
    query: '?ground=1&stage=1&notext=1&reticle=off',
    mp4: 'assets/orbfilm/orb-film-stage-grounded.mp4',
    poster: 'assets/orbfilm/orb-film-stage-grounded.jpg',
    label: 'Stage-Only · Grounded · No Reticle · Zero Hardware'
  },
  'stage-grounded-side-reticle': {
    query: '?ground=1&stage=1&notext=1&reticle=aside',
    mp4: 'assets/orbfilm/orb-film-stage-side-reticle.mp4',
    poster: 'assets/orbfilm/orb-film-stage-side-reticle.jpg',
    label: 'Stage-Only · Grounded · Reference Side Reticle ) · Zero Hardware'
  }
};

async function runMode(browser, modeKey, previewOnly = false) {
  const cfg = BATCH_MODES[modeKey];
  if (!cfg) throw new Error('Unknown mode: ' + modeKey);

  const framesDir = `/tmp/orb_suite_${modeKey}_frames`;
  const previewDir = `/Users/gaia/.gemini/antigravity/brain/76f6396c-1481-400a-ab04-e3b585c9e339/scratch/orb_preview/${modeKey}`;
  if (previewOnly) {
    fs.rmSync(previewDir, { recursive: true, force: true });
    fs.mkdirSync(previewDir, { recursive: true });
  } else {
    fs.rmSync(framesDir, { recursive: true, force: true });
    fs.mkdirSync(framesDir, { recursive: true });
    fs.mkdirSync(path.dirname(cfg.mp4), { recursive: true });
  }

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await page.goto(BASE_URL + cfg.query, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 650));

  await page.evaluate((dt) => {
    const F = window.FORGE;
    const T = window.THREE;
    F.manual();

    const keyframes = [];
    let frameIdx = 0;

    function stepOneFrame() {
      F.advance(dt);
      frameIdx++;
    }
    function* captureKeyframe(name) {
      stepOneFrame();
      keyframes.push({ frame: frameIdx, name });
      yield frameIdx;
    }
    function* waitFrames(n) {
      for (let i = 0; i < n; i++) { stepOneFrame(); yield frameIdx; }
    }
    function* dialRing(ringIdx, steps, framesPerStep = 2) {
      const dir = Math.sign(steps);
      const count = Math.abs(steps);
      for (let k = 0; k < count; k++) {
        F.turn(ringIdx, dir);
        for (let f = 0; f < framesPerStep; f++) { stepOneFrame(); yield frameIdx; }
      }
    }
    function* dialToDiscrete(ringIdx, targetIdx, framesPerStep = 2) {
      for (let guard = 0; guard < 80; guard++) {
        const rObj = F.rings()[ringIdx];
        if (!rObj) break;
        const cur = Math.round(rObj.v());
        if (cur === targetIdx) break;
        const rem = Math.abs(targetIdx - cur);
        const step = (ringIdx === 1 && rem > 5) ? Math.min(5, rem - 3) : 1;
        const dir = (targetIdx > cur ? 1 : -1) * step;
        F.turn(ringIdx, dir);
        for (let f = 0; f < framesPerStep; f++) { stepOneFrame(); yield frameIdx; }
      }
    }
    function* dialHeightTo(targetH, framesPerStep = 1) {
      for (let guard = 0; guard < 30; guard++) {
        const cur = F.S.aimH;
        const diff = targetH - cur;
        if (Math.abs(diff) < 0.025) break;
        const dir = diff > 0 ? 1 : -1;
        F.turn(3, dir);
        for (let f = 0; f < framesPerStep; f++) { stepOneFrame(); yield frameIdx; }
      }
    }
    function* dialMode(modeName, framesPerStep = 2) {
      const idx = F.MODES.indexOf(modeName);
      if (idx >= 0) yield* dialToDiscrete(0, idx, framesPerStep);
    }
    function* dialVerb(verbLabel, framesPerStep = 1) {
      const idx = F.VERBS.findIndex(v => v[0] === verbLabel);
      if (idx >= 0) yield* dialToDiscrete(2, idx, framesPerStep);
    }
    function* dialPick(keyOrPrefix, framesPerStep = 2) {
      const L = F.nodes();
      const idx = L.findIndex(n => n.key === keyOrPrefix || n.name === keyOrPrefix || n.key.startsWith(keyOrPrefix));
      if (idx >= 0) yield* dialToDiscrete(1, idx, framesPerStep);
    }
    function* pressBtn(btnName, long = false, postFrames = 6) {
      F.ORB.push(btnName);
      for (let i = 0; i < 2; i++) { stepOneFrame(); yield frameIdx; }
      F.press(btnName, long);
      for (let i = 0; i < postFrames; i++) { stepOneFrame(); yield frameIdx; }
    }
    function aimCakeFront(r, y, da = 0) {
      const ac = Math.PI / 2 - F.S.orbit.yaw + da;
      const vLocal = new T.Vector3(Math.cos(ac) * r, y, Math.sin(ac) * r);
      const vWorld = F.local(vLocal);
      const [sx, sy] = F.worldToRoom(vWorld);
      F.setAim(sx, sy);
    }

    function* directorScript() {
      F.setAim(null);
      F.S.orbit.dist = 0.64;
      F.S.orbit.pitch = -0.20;
      F.S.orbit.yaw = 0.45;
      yield* waitFrames(6);

      // ACT I: THE 4 CAKE EVOLUTIONS
      yield* dialVerb('BASE · BUNDT', 2);
      yield* dialRing(4, 1, 3);
      yield* dialVerb('FROST · CHOCOLATE', 1);
      yield* dialHeightTo(0.55, 1);
      yield* dialRing(4, 3, 2);
      yield* captureKeyframe('01_cake1_bundt');

      yield* dialVerb('BASE · DRUM', 1);
      yield* dialRing(4, 1, 3);
      yield* dialVerb('FROST · WHITE', 1);
      yield* dialHeightTo(0.50, 1);
      yield* dialRing(4, 3, 2);
      yield* captureKeyframe('02_cake2_drum');

      yield* dialVerb('BASE · DOME', 1);
      yield* dialRing(4, 1, 3);
      yield* dialVerb('FROST · LEMON', 1);
      yield* dialHeightTo(0.60, 1);
      yield* dialRing(4, 3, 2);
      yield* captureKeyframe('03_cake3_dome');

      yield* dialVerb('BASE · TIERS', 1);
      yield* dialRing(4, 1, 4);
      F.GUIDE.begin(1);

      // ACT II: LOOK ORBIT + MAKE SCULPT & MULTI-TIER FROST
      yield* dialMode('LOOK', 2);
      yield* dialRing(2, 10, 1);
      yield* dialRing(3, 2, 1);
      yield* dialRing(4, -2, 1);

      yield* dialMode('MAKE', 2);
      F.GUIDE.begin(2);
      yield* dialVerb('PULL OUT', 1);
      yield* dialHeightTo(0.44, 1);
      yield* dialRing(4, 3, 2);
      yield* dialHeightTo(0.92, 1);
      yield* dialRing(4, 3, 2);

      F.S.opt.PULL = 2;
      aimCakeFront(0.13, 0.036, 0);
      F.S.lastRing = 4;
      yield* captureKeyframe('04_sculpt_tiers');
      F.setAim(null);
      F.S.opt.PULL = 3;

      F.GUIDE.begin(3);
      yield* dialVerb('FROST · ROSE', 1);
      yield* dialHeightTo(0.28, 1);
      yield* dialRing(4, 3, 1);
      yield* dialHeightTo(0.42, 1);
      yield* dialRing(4, 2, 1);

      yield* dialVerb('FROST · CHOCOLATE', 1);
      yield* dialHeightTo(0.06, 1);
      yield* dialRing(4, 2, 1);

      yield* dialVerb('FROST · WHITE', 1);
      yield* dialHeightTo(0.76, 1);
      yield* dialRing(4, 3, 1);
      yield* dialHeightTo(0.96, 1);
      yield* dialRing(4, 3, 1);

      // ACT III: PIPING BORDERS + ROSETTES, CHERRIES, BERRIES, SPRINKLES, 7 CANDLES
      F.GUIDE.begin(4);
      yield* dialVerb('PIPE · WHITE', 1);
      yield* dialHeightTo(0.50, 1);
      yield* dialRing(4, 28, 1);

      yield* dialVerb('PIPE · ROSE', 1);
      yield* dialHeightTo(0.80, 1);
      yield* dialRing(4, 28, 1);

      yield* dialVerb('PIPE · GOLD', 1);
      yield* dialHeightTo(0.58, 1);
      yield* dialRing(4, 28, 1);
      yield* captureKeyframe('05_piping_borders');

      yield* dialVerb('ROSETTES', 1);
      yield* dialHeightTo(0.48, 1);
      yield* dialRing(4, 10, 1);

      yield* dialVerb('CHERRIES', 1);
      yield* dialHeightTo(0.52, 1);
      yield* dialRing(4, 8, 1);

      F.GUIDE.begin(6);
      yield* dialVerb('BERRIES', 1);
      yield* dialHeightTo(0.08, 1);
      yield* dialRing(4, 12, 1);

      yield* dialVerb('SPRINKLES', 1);
      yield* dialHeightTo(0.92, 1);
      yield* dialRing(4, 2, 2);

      F.GUIDE.begin(5);
      yield* dialVerb('CANDLES', 1);
      yield* dialHeightTo(0.78, 1);
      yield* dialRing(4, 7, 2);
      yield* captureKeyframe('06_cake4_candles_lit');

      // ACT IV: PICK, 3 CHILDREN & DOF FOCUS
      F.GUIDE.begin(7);
      yield* dialMode('MOVE', 2);
      yield* dialPick('CANDLE 4', 1);
      yield* dialRing(3, 4, 2);
      yield* dialRing(3, -3, 1);

      F.GUIDE.begin(9);
      yield* dialMode('SIZE', 2);
      yield* dialPick('CAKE', 1);
      yield* dialRing(2, 2, 2);
      yield* dialRing(3, 1, 2);

      F.GUIDE.begin(10);
      yield* dialMode('MAKE', 2);
      yield* dialVerb('A CHILD', 1);
      for (let c = 0; c < 3; c++) {
        yield* dialRing(4, 1, 8);
      }
      yield* waitFrames(8);

      F.GUIDE.begin(11);
      yield* dialMode('TURN', 2);
      yield* dialPick('CHILD 2', 2);
      yield* dialRing(3, -3, 2);
      yield* captureKeyframe('07_children_table');

      F.GUIDE.begin(12);
      yield* dialMode('LOOK', 2);
      yield* dialPick('CHILD 1', 2);
      yield* dialRing(2, -6, 2);
      F.S.focus.auto = false;
      for (let k = 0; k < 10; k++) {
        F.S.focus.d = 0.52 + (k / 10) * 0.15;
        stepOneFrame();
        yield frameIdx;
      }
      yield* captureKeyframe('08_focus_pull');
      F.S.focus.d = null;
      F.S.focus.auto = true;
      yield* dialPick('CAKE', 1);
      F.S.ease = { t: 0.9, y: 0.88, d: 1.12, p: -0.17, yaw: 0.35 };
      yield* waitFrames(12);

      // ACT V: TIME, BLOW OUT CANDLES & TWEEN 24
      F.GUIDE.begin(13);
      yield* dialMode('TIME', 2);
      yield* dialRing(3, 1, 2);
      yield* pressBtn('CAPTURE', false, 6);

      yield* dialMode('TURN', 1);
      yield* dialPick('CAKE', 1);
      yield* dialRing(3, 5, 2);
      yield* dialMode('TIME', 1);

      yield* dialMode('MAKE', 2);
      yield* dialVerb('BLOW OUT', 1);
      yield* dialRing(4, 7, 2);
      yield* waitFrames(6);
      yield* captureKeyframe('09_blow_out');

      yield* dialRing(4, -7, 1);
      yield* dialMode('TIME', 2);
      yield* dialToDiscrete(4, 3, 2);
      yield* pressBtn('PLAY', false, 20);

      // ACT VI: WEAVE MIST & KEEP
      F.GUIDE.begin(14);
      yield* dialMode('WEAVE', 2);
      yield* pressBtn('CAPTURE', false, 4);
      yield* pressBtn('PLAY', false, 4);
      yield* dialRing(4, 15, 2);
      yield* dialRing(3, -9, 2);
      yield* waitFrames(6);
      yield* captureKeyframe('10_weave_mist');

      yield* dialRing(3, 6, 2);
      yield* dialRing(4, -4, 2);
      yield* dialRing(2, 6, 1);
      yield* pressBtn('CAPTURE', false, 6);
      if (!F.CFG.noText && !F.CFG.museum && !F.CFG.stageOnly) {
        yield* pressBtn('KEEP', false, 12);
      } else {
        yield* waitFrames(14);
      }
      yield* captureKeyframe('11_finale');
    }

    window.__DIRECTOR__ = {
      gen: directorScript(),
      keyframes,
      getFrameIdx: () => frameIdx
    };
  }, DT);

  let done = false;
  let lastKf = 0;

  while (!done) {
    const st = await page.evaluate(() => {
      const D = window.__DIRECTOR__;
      const res = D.gen.next();
      const kfs = D.keyframes;
      return {
        done: res.done,
        frame: D.getFrameIdx(),
        kfCount: kfs.length,
        latestKf: kfs[kfs.length - 1] || null
      };
    });
    done = st.done;
    const f = st.frame;

    if (previewOnly) {
      if (st.kfCount > lastKf && st.latestKf) {
        lastKf = st.kfCount;
        const pPath = path.join(previewDir, `${st.latestKf.name}.jpg`);
        await page.screenshot({ path: pPath, type: 'jpeg', quality: 92 });
        console.log(`[PREVIEW ${modeKey}] frame=${f} -> ${st.latestKf.name}.jpg`);
      }
    } else {
      const fPath = path.join(framesDir, `frame_${String(f).padStart(5, '0')}.jpg`);
      await page.screenshot({ path: fPath, type: 'jpeg', quality: 93 });
      if (f === 405) {
        // Save poster at rich 2-tier berries + candles hero moment
        fs.copyFileSync(fPath, cfg.poster);
      }
      if (f % 160 === 0) console.log(`[RECORD ${modeKey}] frame=${f} (${(f / FPS).toFixed(1)}s)`);
    }
  }

  await page.close();

  if (!previewOnly) {
    const hasAudio = fs.existsSync(AUDIO_SRC);
    const args = ['-y', '-framerate', String(FPS), '-i', path.join(framesDir, 'frame_%05d.jpg')];
    if (hasAudio) {
      args.push('-i', AUDIO_SRC, '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '160k', '-shortest');
    }
    args.push('-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', cfg.mp4);
    execFileSync('ffmpeg', args, { stdio: 'ignore' });
    if (!fs.existsSync(cfg.poster)) {
      execFileSync('ffmpeg', ['-y', '-ss', '16.5', '-i', cfg.mp4, '-frames:v', '1', cfg.poster], { stdio: 'ignore' });
    }
    fs.rmSync(framesDir, { recursive: true, force: true });
    const sz = (fs.statSync(cfg.mp4).size / 1048576).toFixed(2);
    console.log(`[ENCODED ${modeKey}] -> ${cfg.mp4} (${sz} MB)`);
  }
}

(async () => {
  const args = process.argv.slice(2);
  const preview = args.includes('--preview');
  const requested = args.filter(a => !a.startsWith('--'));
  const modes = requested.length ? requested : Object.keys(BATCH_MODES);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--use-gl=angle',
      '--use-angle=metal',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      `--window-size=${WIDTH},${HEIGHT}`
    ],
    defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 }
  });

  for (const m of modes) {
    await runMode(browser, m, preview);
  }

  await browser.close();
})();

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const PREVIEW = process.argv.includes('--preview');
const FPS = 24;
const DT = 1 / FPS;
const WIDTH = 1280;
const HEIGHT = 720;
const URL = 'http://localhost:8095/weaver.html';
const FRAMES_DIR = '/tmp/stelline_film_frames';
const EVENTS_PATH = '/tmp/stelline_film_events.json';
const PREVIEW_DIR = '/tmp/stelline_film_preview';

if (!PREVIEW) {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
} else {
  fs.rmSync(PREVIEW_DIR, { recursive: true, force: true });
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
}

(async () => {
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

  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 900));

  await page.evaluate((dt) => {
    const F = window.FORGE;
    const T = window.THREE;
    F.manual();

    const events = [];
    const keyframes = [];
    let frameIdx = 0;

    const nowSec = () => +(frameIdx * dt).toFixed(4);
    const logEvent = (type, detail = {}) => {
      events.push({ frame: frameIdx, t: nowSec(), type, ...detail });
    };

    function stepOneFrame() {
      F.advance(dt);
      frameIdx++;
    }

    function* captureKeyframe(name, label) {
      stepOneFrame();
      keyframes.push({ frame: frameIdx, t: nowSec(), name, label });
      yield frameIdx;
    }

    function* waitFrames(n) {
      for (let i = 0; i < n; i++) {
        stepOneFrame();
        yield frameIdx;
      }
    }

    function* dialRing(ringIdx, steps, framesPerStep = 2) {
      const dir = Math.sign(steps);
      const count = Math.abs(steps);
      for (let k = 0; k < count; k++) {
        F.turn(ringIdx, dir);
        const rObj = F.rings()[ringIdx];
        logEvent('ring', {
          ring: ringIdx,
          dir,
          name: rObj ? rObj.n : '',
          val: rObj ? String(rObj.f(rObj.v())) : ''
        });
        for (let f = 0; f < framesPerStep; f++) {
          stepOneFrame();
          yield frameIdx;
        }
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
        logEvent('ring', {
          ring: ringIdx,
          dir: Math.sign(dir),
          name: rObj.n,
          val: String(rObj.f(rObj.v()))
        });
        for (let f = 0; f < framesPerStep; f++) {
          stepOneFrame();
          yield frameIdx;
        }
      }
    }

    function* dialHeightTo(targetH, framesPerStep = 1) {
      for (let guard = 0; guard < 30; guard++) {
        const cur = F.S.aimH;
        const diff = targetH - cur;
        if (Math.abs(diff) < 0.025) break;
        const dir = diff > 0 ? 1 : -1;
        F.turn(3, dir);
        const rObj = F.rings()[3];
        logEvent('ring', {
          ring: 3,
          dir,
          name: 'HEIGHT',
          val: rObj ? String(rObj.f(rObj.v())) : ''
        });
        for (let f = 0; f < framesPerStep; f++) {
          stepOneFrame();
          yield frameIdx;
        }
      }
    }

    function* dialMode(modeName, framesPerStep = 2) {
      const idx = F.MODES.indexOf(modeName);
      if (idx >= 0) {
        yield* dialToDiscrete(0, idx, framesPerStep);
        logEvent('lock_chime', { target: modeName });
      }
    }

    function* dialVerb(verbLabel, framesPerStep = 1) {
      const idx = F.VERBS.findIndex(v => v[0] === verbLabel);
      if (idx >= 0) {
        yield* dialToDiscrete(2, idx, framesPerStep);
      }
    }

    function* dialPick(keyOrPrefix, framesPerStep = 2) {
      const L = F.nodes();
      const idx = L.findIndex(n => n.key === keyOrPrefix || n.name === keyOrPrefix || n.key.startsWith(keyOrPrefix));
      if (idx >= 0) {
        yield* dialToDiscrete(1, idx, framesPerStep);
        logEvent('lock_chime', { target: L[idx].name });
      }
    }

    function* pressBtn(btnName, long = false, postFrames = 6) {
      F.ORB.push(btnName);
      logEvent('press', { btn: btnName, long });
      for (let i = 0; i < 2; i++) {
        stepOneFrame();
        yield frameIdx;
      }
      F.press(btnName, long);
      for (let i = 0; i < postFrames; i++) {
        stepOneFrame();
        yield frameIdx;
      }
    }

    function aimCakeFront(r, y, da = 0) {
      const ac = Math.PI / 2 - F.S.orbit.yaw + da;
      const vLocal = new T.Vector3(Math.cos(ac) * r, y, Math.sin(ac) * r);
      const vWorld = F.local(vLocal);
      const [sx, sy] = F.worldToRoom(vWorld);
      F.setAim(sx, sy);
      return { sx, sy, ac, h: F.hitAt(sx, sy) };
    }

    // Master 6-Act Director Script driving the 3D Horizontal 5-Ring Scroll Engine (7bdb303)
    function* directorScript() {
      F.setAim(null);
      F.S.orbit.dist = 0.88;
      F.S.orbit.pitch = -0.30;
      F.S.orbit.yaw = 0.45;
      yield* waitFrames(6);

      // =========================================================================
      // ACT I (0:00 - 0:08.5): THE 4 CAKE EVOLUTIONS VIA RING 3 (VERB) & RING 5 (PUT DOWN)
      // =========================================================================
      // Evolution 1: BASE · BUNDT + FROST · CHOCOLATE
      yield* dialVerb('BASE · BUNDT', 2);
      yield* dialRing(4, 1, 3); // PUT DOWN BUNDT
      yield* dialVerb('FROST · CHOCOLATE', 1);
      yield* dialHeightTo(0.55, 1);
      yield* dialRing(4, 3, 2); // Frost chocolate all around
      yield* captureKeyframe('01_act1_bundt_cake', 'Act I (Cake 1 of 4): Fluted BUNDT base put down and frosted dark chocolate via Rings 3-5');

      // Evolution 2: BASE · DRUM + FROST · WHITE
      yield* dialVerb('BASE · DRUM', 1);
      yield* dialRing(4, 1, 3); // Replace with DRUM
      yield* dialVerb('FROST · WHITE', 1);
      yield* dialHeightTo(0.50, 1);
      yield* dialRing(4, 3, 2);
      yield* captureKeyframe('02_act1_drum_cake', 'Act I (Cake 2 of 4): Single-tier white DRUM sponge with 5-arc Data Reticle');

      // Evolution 3: BASE · DOME + FROST · LEMON
      yield* dialVerb('BASE · DOME', 1);
      yield* dialRing(4, 1, 3); // Replace with DOME
      yield* dialVerb('FROST · LEMON', 1);
      yield* dialHeightTo(0.60, 1);
      yield* dialRing(4, 3, 2);
      yield* captureKeyframe('03_act1_dome_cake', 'Act I (Cake 3 of 4): Golden lemon-glazed DOME patisserie sponge');

      // Evolution 4: BASE · TIERS (The Hero 2-Tier Cake!)
      yield* dialVerb('BASE · TIERS', 1);
      yield* dialRing(4, 1, 4); // Put down hero TIERS cake!
      F.GUIDE.begin(1); // Advance guide to step 2 (WALK AROUND IT)

      // =========================================================================
      // ACT II (0:08.5 - 0:16.5): LOOK ORBIT + MAKE (PULL OUT, SPIN-12 FLUTES & MULTI-TIER FROSTING)
      // =========================================================================
      // Switch Ring 1 (MODE) -> LOOK (0) and orbit/tilt/dolly around the 2-tier cake
      yield* dialMode('LOOK', 2);
      yield* dialRing(2, 10, 1); // ORBIT
      yield* dialRing(3, 2, 1);  // TILT
      yield* dialRing(4, -2, 1); // DOLLY closer

      // Switch Ring 1 (MODE) -> MAKE (1)
      yield* dialMode('MAKE', 2);
      F.GUIDE.begin(2); // RAISE THE TOP

      // Dial VERB -> PULL OUT, swell lower tier cushion (HEIGHT 44%) and upper crown (HEIGHT 92%)
      yield* dialVerb('PULL OUT', 1);
      yield* dialHeightTo(0.44, 1);
      yield* dialRing(4, 3, 2);
      yield* dialHeightTo(0.92, 1);
      yield* dialRing(4, 3, 2);

      // Show SPIN 12 radial symmetry footprints on lower tier wall
      F.S.opt.PULL = 2; // SPIN 12
      aimCakeFront(0.13, 0.036, 0);
      F.S.lastRing = 4;
      yield* captureKeyframe('04_act2_sculpt_spin12', 'Act II (MAKE · PULL OUT): 12-fold radial symmetry footprints and lathe shaping on the 2-tier cake');
      F.setAim(null);
      F.S.opt.PULL = 3; // back to TURNED

      // Multi-tier Frosting: FROST · ROSE on lower tier, FROST · CHOCOLATE at foot, FROST · WHITE on upper tier
      F.GUIDE.begin(3); // FROST IT ROSE
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

      // =========================================================================
      // ACT III (0:16.5 - 0:26.5): PIPE BORDERS (WHITE, ROSE, GOLD) + PLACE (ROSETTES, CHERRIES, BERRIES, CANDLES)
      // =========================================================================
      F.GUIDE.begin(4); // PIPE A BORDER
      // 1) Pipe closed 360-degree WHITE beaded border around the lower tier step ledge (HEIGHT 50%)
      yield* dialVerb('PIPE · WHITE', 1);
      yield* dialHeightTo(0.50, 1);
      yield* dialRing(4, 28, 1); // 28 clicks closes the 112-column ring!

      // 2) Pipe closed 360-degree ROSE beaded border around the upper crown edge (HEIGHT 80%)
      yield* dialVerb('PIPE · ROSE', 1);
      yield* dialHeightTo(0.80, 1);
      yield* dialRing(4, 28, 1);

      // 3) Pipe GOLD accent border around the inner tier collar (HEIGHT 58%)
      yield* dialVerb('PIPE · GOLD', 1);
      yield* dialHeightTo(0.58, 1);
      yield* dialRing(4, 28, 1);
      yield* captureKeyframe('05_act3_piping_borders', 'Act III (MAKE · PIPE): Closed 360-degree beaded icing borders piped around both tiers via Ring 5 LENGTH');

      // 4) Place 10 ROSETTES around the lower tier ledge (HEIGHT 48%)
      yield* dialVerb('ROSETTES', 1);
      yield* dialHeightTo(0.48, 1);
      yield* dialRing(4, 10, 1);
      logEvent('place', { item: 'ROSETTES' });

      // 5) Place 8 glossy CHERRIES on the lower tier step (HEIGHT 52%)
      yield* dialVerb('CHERRIES', 1);
      yield* dialHeightTo(0.52, 1);
      yield* dialRing(4, 8, 1);
      logEvent('place', { item: 'CHERRIES' });

      // 6) Place 12 BERRIES around the foot of the cake (HEIGHT 08%)
      F.GUIDE.begin(6); // BERRIES ROUND THE FOOT
      yield* dialVerb('BERRIES', 1);
      yield* dialHeightTo(0.08, 1);
      yield* dialRing(4, 12, 1);
      logEvent('place', { item: 'BERRIES' });

      // 7) Scatter SPRINKLES across the top crown (HEIGHT 92%)
      yield* dialVerb('SPRINKLES', 1);
      yield* dialHeightTo(0.92, 1);
      yield* dialRing(4, 2, 2);
      logEvent('place', { item: 'SPRINKLES' });

      // 8) Place 7 striped birthday CANDLES around the upper crown rim (HEIGHT 78%)
      F.GUIDE.begin(5); // SEVEN CANDLES
      yield* dialVerb('CANDLES', 1);
      yield* dialHeightTo(0.78, 1);
      yield* dialRing(4, 7, 2);
      logEvent('place', { item: 'CANDLES' });
      yield* captureKeyframe('06_act3_candles_lit', 'Act III (MAKE · CANDLES): 7 lit striped candles, 10 rosettes, 8 cherries, 12 berries, and rainbow sprinkles');

      // =========================================================================
      // ACT IV (0:26.5 - 0:36.5): SCENE-GRAPH PICK + 3D RGB GIZMO (MOVE, TURN, SIZE) + THE 3 CHILDREN & DOF FOCUS
      // =========================================================================
      // Step 8 in Guide: MODE -> MOVE, PICK -> CANDLE 4, lift it with the green Y ring & 3D RGB Gizmo!
      F.GUIDE.begin(7); // LIFT ONE CANDLE
      yield* dialMode('MOVE', 2);
      yield* dialPick('CANDLE 4', 1);
      yield* dialRing(3, 4, 2);  // Green Y ring lifts CANDLE 4 (+16 MM)
      yield* captureKeyframe('07_act4_gizmo_move_candle', 'Act IV (MOVE · PICK CANDLE 4): Walking the scene graph with Ring 2 and lifting Candle 4 via the 3D RGB Gizmo');
      yield* dialRing(3, -3, 1); // Settle Candle 4 back down

      // Step 9 & 10 in Guide: MODE -> SIZE, PICK -> CAKE, grow it slightly
      F.GUIDE.begin(9); // MAKE IT GRANDER
      yield* dialMode('SIZE', 2);
      yield* dialPick('CAKE', 1);
      yield* dialRing(2, 2, 2); // ALL x1.10
      yield* dialRing(3, 1, 2); // HEIGHT x1.05

      // Step 11 in Guide: Bring in all 3 film children (MAKE -> A CHILD -> 3 clicks)!
      F.GUIDE.begin(10); // THE CHILDREN COME
      yield* dialMode('MAKE', 2);
      yield* dialVerb('A CHILD', 1);
      for (let c = 0; c < 3; c++) {
        yield* dialRing(4, 1, 8);
        logEvent('shimmer', { castCount: c + 1 });
      }
      yield* waitFrames(8);

      // Step 12 in Guide: MODE -> TURN, PICK -> CHILD 2, turn Child 2 toward the cake with the 3D RGB Rotation Ring Gizmo!
      F.GUIDE.begin(11); // TURN A CHILD TO THE CAKE
      yield* dialMode('TURN', 2);
      yield* dialPick('CHILD 2', 2);
      yield* dialRing(3, -3, 2); // Spin Y on Child 2
      yield* captureKeyframe('08_act4_stage_children_gizmo', 'Act IV (TURN · PICK CHILD 2): All 3 film children staged around the cake with the 3D RGB Rotation Gizmo & Data Reticle');

      // Step 13 in Guide: MODE -> LOOK, PICK -> CHILD 1, orbit & pull optical DOF focus!
      F.GUIDE.begin(12); // LOOK AT THEM
      yield* dialMode('LOOK', 2);
      yield* dialPick('CHILD 1', 2);
      yield* dialRing(2, -6, 2); // Orbit gently
      // Perform a dramatic 28-tap optical DOF focus pull!
      F.S.focus.auto = false;
      for (let k = 0; k < 10; k++) {
        F.S.focus.d = 0.52 + (k / 10) * 0.15;
        logEvent('servo', { focus: F.S.focus.d });
        stepOneFrame();
        yield frameIdx;
      }
      yield* captureKeyframe('09_act4_optical_focus_pull', 'Act IV (LOOK · DOF FOCUS): 28-tap optical Circle-of-Confusion focus rack between the foreground cake and the children');
      F.S.focus.d = null;
      F.S.focus.auto = true;
      yield* dialPick('CAKE', 1);
      F.S.ease = { t: 0.9, y: 0.96, d: 1.32, p: -0.18, yaw: 0.35 };
      yield* waitFrames(12);

      // =========================================================================
      // ACT V (0:36.5 - 0:42.5): TIME STOP-MOTION, ONION SKIN, BLOW OUT CANDLES & TWEEN 24 PLAYBACK
      // =========================================================================
      F.GUIDE.begin(13); // KEEP A FRAME · BLOW THEM OUT
      yield* dialMode('TIME', 2);
      yield* dialRing(3, 1, 2); // HOLD -> 2 BEATS
      yield* pressBtn('CAPTURE', false, 6); // Frame 2 added!

      // Turn cake on Frame 2 so cyan wireframe onion-skin ghost of Frame 1 shows!
      yield* dialMode('TURN', 1);
      yield* dialPick('CAKE', 1);
      yield* dialRing(3, 5, 2); // SPIN Y +25°
      yield* dialMode('TIME', 1);
      yield* captureKeyframe('10_act5_time_onion_skin', 'Act V (TIME): Stop-motion frame sequencing with cyan wireframe onion-skin ghost and HOLD beats');

      // Blow out the 7 candles one by one (MAKE -> BLOW OUT -> 7 clicks -> "ALL OUT · MAKE A WISH")!
      yield* dialMode('MAKE', 2);
      yield* dialVerb('BLOW OUT', 1);
      yield* dialRing(4, 7, 2);
      logEvent('shimmer', { wish: true });
      yield* waitFrames(6);

      // Relight 5 candles so the weave finale glows with warm candlelight, or add Frame 3 and play TWEEN 24!
      yield* dialRing(4, -7, 1); // Relight flames for the luminous weave finale
      yield* dialMode('TIME', 2);
      yield* dialToDiscrete(4, 3, 2); // PLAYBACK -> TWEEN 24
      yield* pressBtn('PLAY', false, 20);

      // =========================================================================
      // ACT VI (0:42.5 - 0:49.5): WEAVE MODE — 6,000-PARTICLE MIST TRAILS, MATERIALIZE & KEEP GLB
      // =========================================================================
      F.GUIDE.begin(14); // WEAVE IT
      yield* dialMode('WEAVE', 2);
      yield* pressBtn('CAPTURE', false, 4); // Start recording ring take
      yield* pressBtn('PLAY', false, 4);    // Play loop while weaving

      // Turn Ring 5 (MIST) up to 75% (15 clicks) so 6,000 additive particles + 7 trailing echoes hang in space!
      yield* dialRing(4, 15, 2);
      // Turn Ring 4 (MATERIALIZE) down to 55% (-9 clicks)
      yield* dialRing(3, -9, 2);
      yield* waitFrames(6);
      yield* captureKeyframe('11_act6_weave_particle_mist', 'Act VI (WEAVE · MIST 75%): 6,000-particle point mist and 7 temporal trail echoes hanging behind the turning cake');

      // Re-condense MATERIALIZE to 85% (+6 clicks) and MIST to 55% (-4 clicks), scrub TIME
      yield* dialRing(3, 6, 2);
      yield* dialRing(4, -4, 2);
      yield* dialRing(2, 6, 1);

      // Finish take & open KEEP (GLB · SCENE) export on the angled glass OLED!
      yield* pressBtn('CAPTURE', false, 6);
      yield* pressBtn('KEEP', false, 12);
      yield* captureKeyframe('12_act6_keep_export_glb', 'Act VI (KEEP · GLB): Completed birthday memory woven into light with GLB · SCENE export on the 3D Orb OLED');
    }

    window.__DIRECTOR__ = {
      gen: directorScript(),
      events,
      keyframes,
      getFrameIdx: () => frameIdx
    };
  }, DT);

  let done = false;
  let lastPreviewCount = 0;

  while (!done) {
    const state = await page.evaluate(() => {
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

    done = state.done;
    const f = state.frame;

    if (PREVIEW) {
      if (state.kfCount > lastPreviewCount && state.latestKf) {
        lastPreviewCount = state.kfCount;
        const kfPath = path.join(PREVIEW_DIR, `${state.latestKf.name}.jpg`);
        await page.screenshot({ path: kfPath, type: 'jpeg', quality: 92 });
        console.log(`[PREVIEW KF ${lastPreviewCount}] frame=${f} (${(f / FPS).toFixed(2)}s) -> ${kfPath}`);
      }
    } else {
      const framePath = path.join(FRAMES_DIR, `frame_${String(f).padStart(5, '0')}.jpg`);
      await page.screenshot({ path: framePath, type: 'jpeg', quality: 94 });
      if (f % 96 === 0) {
        console.log(`[RECORD] frame=${f} (${(f / FPS).toFixed(1)}s)`);
      }
    }
  }

  const meta = await page.evaluate(() => ({
    totalFrames: window.__DIRECTOR__.getFrameIdx(),
    events: window.__DIRECTOR__.events,
    keyframes: window.__DIRECTOR__.keyframes
  }));

  fs.writeFileSync(EVENTS_PATH, JSON.stringify(meta, null, 2));
  console.log(`Completed ${meta.totalFrames} frames (${(meta.totalFrames / FPS).toFixed(2)}s). Events saved to ${EVENTS_PATH}`);

  await browser.close();
})();

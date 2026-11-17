// One memory for every age from 1 to 100, each made on Field Orb 06 through its rings, each checked.
//   node tools/orb06/make100.mjs [from to]     -> assets/memories/NNN.jpg, assets/memories/memories.json (+ .js)
// For each person the page is opened with ?name=&age=&design=&v=&room=, FORGE.sequence() runs every step of that
// person's guide on the rings and keeps a frame after each, and the result is checked against the plan:
//   pieces   as many pieces of clay as the guide has PIECE steps (or one)
//   name     written to the end, if the guide has a WRITE step
//   candles  min(age, 12) standing and lit in the frame before the blow, none lit in the last frame
//   guests   all of the room's own people (one to three), arriving after the making
//   frames   one kept per step
// A memory passes only if all hold and the page raised no error. The still is a clean 16:9 film frame (no orb, no
// text) of the moment before the blow: lit, with its guests, when the whole memory holds solid. The room is an
// archive birthday with its people and cake taken out (assets/rooms); its own people, cut out, are the guests.
// Needs a static server on the repo root (PORT, default 8765).
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), PORT = process.env.PORT || 8765, OUT = path.join(ROOT, 'assets/memories');
const NAMES = 'ADA LEO MIA SAM NOOR ZOE KAI IVY TOMAS RUTH OMAR LINA HUGO NIA EZRA YUKI ARLO INES JUDE MAYA OTIS ROSA FINN ANYA COLE DARA EMIL FERN GABE HANA IDRIS JUNE KOFI LUCY MILO NORA OWEN PIA QUINN REMY SARA THEO UMA VERA WREN XAVI YARA ZAID ALMA BENO CLEO DION ELSA FARID GRETA HASAN IRIS JONAH KEIRA LARS MEI NICO OLGA PABLO RAFA SELMA TARIQ ULLA VIKRAM WANDA YOSEF ZELDA ABEBE BRUNO CARMEN DAWIT ESTHER FELIX GLORIA HENRIK IMANI JORGE KAMALA LEON MARTA NASIR ODETTE PETRA RAMON SOFIA TOBIAS URSULA VIOLA WALTER XENIA YUSUF ZORA AGNES BORIS CELIA EDITH'.split(' ');
const KID = ['CATERPILLAR', 'LADYBIRD', 'TRAIN', 'BEAR', 'CASTLE', 'ROCKET', 'HEDGEHOG', 'ROBOT', 'CAT', 'SNOWMAN', 'HOUSE', 'TORTOISE'], GROWN = ['CLASSIC', 'BOOKS', 'STACK', 'CAR', 'GIFT', 'SHEET', 'CAMERA', 'MUSICDRUM', 'BUNDT', 'RECORD', 'LIGHTHOUSE', 'CROWN', 'TREE', 'TOPHAT', 'MOUNTAIN', 'SAILBOAT', 'ROOK', 'TEAPOT', 'GARDEN', 'HORSE'];
const PEOPLE = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/people/people.json')));
// the room: an archive birthday of the right kind (children's for a child, a grown party for the grown), by a seed. Its own people,
// cut out of it, are the guests; the room itself is shown with them and its cake taken out, so there is one picture.
const ROOMSOF = kids => Object.values(PEOPLE).filter(c => c.era !== 'studio_craft' && c.kids === kids && c.people.some(q => q.w / q.h <= 2.4)).map(c => c.id).sort();
const RK = ROOMSOF(true), RG = ROOMSOF(false);
function roomFor(age, seed) { const L = age <= 13 ? RK : age >= 18 ? RG : RK.concat(RG); return L[(seed * 2654435761 >>> 0) % L.length]; }
const lift = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/eye/lift.json'))).items, ROOMS = Object.keys(lift).filter(k => lift[k].family === 'party_celebration_eras').sort();
const people = Array.from({ length: 100 }, (_, i) => { const age = i + 1; return { n: age, name: NAMES[i], age, design: age === 1 ? 'SMASH' : age <= 13 ? KID[(age - 2) % KID.length] : GROWN[(age - 14) % GROWN.length], v: 1000 + age * 37, room: roomFor(age, 7000 + age * 97) }; });
const [from, to] = [+(process.argv[2] || 1), +(process.argv[3] || 100)];
const mpath = path.join(OUT, 'memories.json'), db = fs.existsSync(mpath) ? JSON.parse(fs.readFileSync(mpath)) : {};
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const P of people.filter(p => p.n >= from && p.n <= to)) {
  const q = `name=${P.name}&age=${P.age}&design=${P.design}&v=${P.v}&room=${P.room}`, page = await b.newPage({ viewport: { width: 1280, height: 720 } }), errs = [];
  page.on('pageerror', e => errs.push(e.message));
  let r;
  try {
    await page.goto(`http://127.0.0.1:${PORT}/orb-06.html?${q}&stage=1&notext=1`); await page.waitForFunction('window.FORGE', null, { timeout: 30000 }); await page.waitForTimeout(500);
    r = await page.evaluate(() => { const F = window.FORGE; try { const steps = F.GLIST(); F.sequence(4); const D = F.DOC, fr = D.frames, lit = fr[fr.length - 2], end = fr[fr.length - 1];
        const all = f => [f].concat(f.others || []), cand = f => all(f).flatMap(x => x.clay ? x.items.filter(i => i.t === 'CANDLE') : []), nm = all(end).find(x => x.nameFull);
        D.cur = fr.length - 2; F.showFrame(); F.setMode('TIME'); F.frameIt();
        return { steps: steps.length, planPieces: Math.max(1, steps.filter(t => /^PIECE /.test(t)).length), planName: steps.some(t => /^WRITE /.test(t)), frames: fr.length, pieces: all(lit).filter(x => x.clay).length, candles: cand(lit).length, lit: cand(lit).filter(i => !i.out).length, litEnd: cand(end).filter(i => !i.out).length,
          nameDone: nm ? nm.nameR >= nm.nameFull.reduce((a, p) => a + p.length, 0) : false, children: D.cast.length, guests: F.KIDS.length, arrive: Math.min(...D.cast.map(c => c.f0)), want: F.WHO.candles }; } catch (e) { return { threw: e.message }; } });
    await page.waitForTimeout(2600); await page.screenshot({ path: path.join(OUT, String(P.n).padStart(3, '0') + '.jpg'), type: 'jpeg', quality: 82 });
  } catch (e) { r = { threw: 'runner: ' + e.message.split('\n')[0] }; }
  await page.close();
  const why = []; if (errs.length) why.push('page error: ' + errs[0]); if (r.threw) why.push('threw: ' + r.threw);
  else { if (r.pieces !== r.planPieces) why.push(`pieces ${r.pieces} of ${r.planPieces}`); if (r.planName && !r.nameDone) why.push('name not finished'); if (r.candles !== r.want || r.lit !== r.want) why.push(`candles ${r.lit}/${r.candles} of ${r.want}`); if (r.litEnd !== 0) why.push(`${r.litEnd} still lit at the end`); if (r.children !== r.guests || r.guests < 1) why.push(`guests ${r.children} of ${r.guests}`); if (r.frames < r.steps - 2) why.push(`frames ${r.frames} for ${r.steps} steps`); }
  db[P.n] = { ...P, q, ...r, hasName: !!r.planName, pass: why.length === 0, why };
  console.log(String(P.n).padStart(3), P.name.padEnd(8), P.design.padEnd(12), why.length ? 'FAIL ' + why.join('; ') : `PASS  pieces ${r.pieces} frames ${r.frames} candles ${r.lit}${r.planName ? ' name' : ''}`);
  fs.writeFileSync(mpath, JSON.stringify(db)); fs.writeFileSync(path.join(OUT, 'memories.js'), 'window.MEMORIES=' + JSON.stringify(db) + ';');
}
await b.close();
const v = Object.values(db); console.log(`${v.filter(x => x.pass).length} of ${v.length} pass`);

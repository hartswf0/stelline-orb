/* mix.js: the proof's soundtrack from the page's sound log. Device grains are cut from ana/device-sounds.wav (the real device
   recording, gitignored) at the same offsets the page uses; every other sound is made by sound.js, the same function the page
   plays live.  node mix.js <log.json> <out.wav> <seconds> */
const fs = require('fs'), path = require('path'), SOUND = require('./sound.js');
const [, , logPath, outPath, durS] = process.argv, SR = 48000, N = Math.round(SR * +durS), out = new Float32Array(N);
let G = null; const wav = path.join(__dirname, '../../../ana/device-sounds.wav');
if (fs.existsSync(wav)) { const src = fs.readFileSync(wav); let off = 12; while (src.toString('ascii', off, off + 4) !== 'data') off += 8 + src.readUInt32LE(off + 4); const dlen = src.readUInt32LE(off + 4), d0 = off + 8; G = new Float32Array(dlen / 2); for (let i = 0; i < G.length; i++) G[i] = src.readInt16LE(d0 + i * 2) / 32768; }
let grains = 0, synths = 0;
for (const e of JSON.parse(fs.readFileSync(logPath))) { const s0 = Math.round(e.t * SR);
  if (e.type === 'grain' && G) { const set = SOUND.GRAINS[e.kind], [o, d] = set[e.seed % set.length], a = o * SR, len = d * SR; grains++;
    for (let i = 0; i < len / e.rate; i++) { const si = a + i * e.rate, k = Math.floor(si), fr = si - k, v = G[k] * (1 - fr) + (G[k + 1] || 0) * fr; if (s0 + i < N) out[s0 + i] += v * e.vol; } continue; }
  const x = SOUND.synth(e.type === 'grain' ? 'click' : e.type, e, SR); synths++; for (let i = 0; i < x.length && s0 + i < N; i++) out[s0 + i] += x[i]; }
let pk = 0; for (const v of out) pk = Math.max(pk, Math.abs(v)); const g = pk > .89 ? .89 / pk : 1;
const buf = Buffer.alloc(44 + N * 2); buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(out[i] * g * 32767))), 44 + i * 2);
fs.writeFileSync(outPath, buf); console.log(`mixed: ${grains} device grains (${G ? 'real recording' : 'missing: synthesized'}), ${synths} synthesized, peak ${pk.toFixed(3)}, gain ${g.toFixed(3)}`);

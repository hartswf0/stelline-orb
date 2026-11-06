/* Mixes the proof's sound log into a wav: grains cut from ana/device-sounds.wav (the device's real clicks) at
   the logged offsets, rates and volumes; washes and the select chirp synthesized as the page does. */
const fs = require('fs'), path = require('path');
const [, , logPath, outPath, durS] = process.argv, SR = 48000, N = Math.round(SR * +durS);
const src = fs.readFileSync(path.join(__dirname, '../../../ana/device-sounds.wav'));
let off = 12; while (src.toString('ascii', off, off + 4) !== 'data') off += 8 + src.readUInt32LE(off + 4); const dlen = src.readUInt32LE(off + 4), d0 = off + 8;
const G = new Float32Array(dlen / 2); for (let i = 0; i < G.length; i++) G[i] = src.readInt16LE(d0 + i * 2) / 32768;
const out = new Float32Array(N); let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 * 2 - 1;
for (const e of JSON.parse(fs.readFileSync(logPath))) {
  const s0 = Math.round(e.t * SR);
  if (e.type === 'grain') { const a = e.o * SR, len = e.d * SR; for (let i = 0; i < len / e.rate; i++) { const si = a + i * e.rate, k = Math.floor(si), fr = si - k, v = G[k] * (1 - fr) + (G[k + 1] || 0) * fr; if (s0 + i < N) out[s0 + i] += v * e.vol; } }
  else if (e.type === 'wash') { let hp = 0, prev = 0; for (let i = 0; i < .6 * SR && s0 + i < N; i++) { const x = rnd(); hp = .75 * (hp + x - prev); prev = x; const t = i / SR, env = t < .06 ? t / .06 : Math.exp(-(t - .06) / .12); out[s0 + i] += hp * .22 * e.v * env; } }
  else if (e.type === 'select') { for (let k = 0; k < 5; k++) { const b = s0 + Math.round(k * .055 * SR); for (let i = 0; i < .03 * SR && b + i < N; i++) { const t = i / SR, env = t < .004 ? t / .004 : 1 - (t - .004) / .026; out[b + i] += Math.sin(2 * Math.PI * 12000 * t) * .03 * env; } } }
}
let pk = 0; for (const v of out) pk = Math.max(pk, Math.abs(v)); const g = pk > .89 ? .89 / pk : 1;
const buf = Buffer.alloc(44 + N * 2); buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(out[i] * g * 32767))), 44 + i * 2);
fs.writeFileSync(outPath, buf); console.log('mixed peak', pk.toFixed(3), 'gain', g.toFixed(3));

/* The trained reader. A small convolutional network (tools/cupnet/train.py) that looks at the unwrapped patch
   CUP.detect makes and says which angle of the cup faces the camera and which end of the patch is the lid.
   Plain JavaScript: five 3x3 stride-2 convolutions, pooled, one linear layer. No library.

   CUPNET.load(base) -> promise;  CUPNET.ready;  CUPNET.read(U) -> { face, conf, lidAtTop, pLid }
   U is CUP.NA x CUP.MV grey values (0..255), exactly as CUP.detect returns in .raw */
(function () {
  let M = null;
  async function load(base) { const j = await (await fetch(base + 'cupnet.json')).json(), buf = new Float32Array(await (await fetch(base + 'cupnet.bin')).arrayBuffer()); let o = 0;
    j.layers.forEach(L => { L.w = buf.subarray(o, o += L.cout * L.cin * 9); L.b = buf.subarray(o, o += L.cout); }); const C = j.layers[j.layers.length - 1].cout; j.hw = buf.subarray(o, o += (j.bins + 1) * 2 * C); j.hb = buf.subarray(o, o += j.bins + 1); M = j; api.ready = true; api.report = j.report; return j; }
  function conv(x, cin, h, w, L) { const ho = (h + 1) >> 1, wo = (w + 1) >> 1, co = L.cout, y = new Float32Array(co * ho * wo), W = L.w, B = L.b;
    for (let c = 0; c < co; c++) { const yo = c * ho * wo; y.fill(B[c], yo, yo + ho * wo);
      for (let ci = 0; ci < cin; ci++) { const xo = ci * h * w, wb = (c * cin + ci) * 9;
        for (let ky = 0; ky < 3; ky++) for (let kx = 0; kx < 3; kx++) { const wt = W[wb + ky * 3 + kx]; if (wt === 0) continue;
          for (let oy = 0; oy < ho; oy++) { const iy = oy * 2 + ky - 1; if (iy < 0 || iy >= h) continue; const xr = xo + iy * w + kx - 1, yr = yo + oy * wo; let ox = 0; if (kx === 0) ox = 1; const oxe = (kx === 2 && (wo - 1) * 2 + 1 >= w) ? wo - 1 : wo;
            for (; ox < oxe; ox++) y[yr + ox] += wt * x[xr + ox * 2]; } } } }
    for (let i = 0; i < y.length; i++) if (y[i] < 0) y[i] = 0; return { y, h: ho, w: wo }; }
  function read(U) { if (!M) return null; const NA = window.CUP.NA, w = M.w, h = M.h, x0 = (NA - w) >> 1; let x = new Float32Array(w * h), s = 0, s2 = 0;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const v = U[j * NA + i + x0] / 255; x[j * w + i] = v; s += v; s2 += v * v; } const mu = s / (w * h), sd = Math.sqrt(Math.max(0, s2 / (w * h) - mu * mu)) + 1e-4; for (let i = 0; i < x.length; i++) x[i] = (x[i] - mu) / sd;
    let cin = 1, hh = h, ww = w; for (const L of M.layers) { const r = conv(x, cin, hh, ww, L); x = r.y; hh = r.h; ww = r.w; cin = L.cout; }
    const C = cin, f = new Float32Array(2 * C); for (let c = 0; c < C; c++) { let mean = 0, mx = -1e9; for (let i = 0; i < ww; i++) { let col = 0; for (let j = 0; j < hh; j++) col += x[c * hh * ww + j * ww + i]; col /= hh; mean += col; if (col > mx) mx = col; } f[c] = mean / ww; f[C + c] = mx; }
    const nb = M.bins, o = new Float32Array(nb + 1); for (let k = 0; k <= nb; k++) { let a = M.hb[k]; for (let c = 0; c < 2 * C; c++) a += M.hw[k * 2 * C + c] * f[c]; o[k] = a; }
    let mx = -1e9, km = 0; for (let k = 0; k < nb; k++) if (o[k] > mx) { mx = o[k]; km = k; } let Z = 0; const p = new Float32Array(nb); for (let k = 0; k < nb; k++) { p[k] = Math.exp(o[k] - mx); Z += p[k]; }
    let ws = 0, off = 0; for (let d = -3; d <= 3; d++) { const q = p[((km + d) % nb + nb) % nb] / Z; ws += q; off += q * d; }
    const pBase = 1 / (1 + Math.exp(-o[nb])); return { face: (km + .5 + off / ws) / nb * 360 - 180, conf: ws, lidAtTop: pBase < .5, pLid: 1 - pBase }; }
  const api = { load, read, ready: false, report: null }; window.CUPNET = api;
})();

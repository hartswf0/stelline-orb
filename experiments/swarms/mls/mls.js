/* MLS image deformation, written by hand after Schaefer, McPhail & Warren, "Image Deformation Using Moving Least Squares"
   (SIGGRAPH 2006). Three families: affine, similarity, rigid. Two handle kinds: point handles and line-segment handles.

   Point handles follow the paper exactly: w_i = 1 / |p_i - v|^(2*alpha).
   Line handles: the paper integrates the weight along each segment in closed form. Here the integral is taken numerically
   (adaptive midpoint rule: more samples when the vertex is close to the segment, 2..64 per segment). Each sample carries
   weight ds / LINE_UNIT so that one LINE_UNIT of segment counts like one point handle. This is a stated approximation,
   not the paper's closed form.

   Coordinates: 2D, any units (the scene uses px of a 600 x 1000 page). Row-vector convention as in the paper. */
(function (root) {
  const LINE_UNIT = 8;

  // handles: { P: Float64Array [x0,y0,...] rest points, Q: targets, L: Float64Array [ax,ay,bx,by,...] rest lines, M: target lines }
  // verts: Float64Array [x,y,...] rest mesh; out: Float64Array same length; family: 'affine'|'similarity'|'rigid'
  function solve(h, verts, out, family, alpha) {
    alpha = alpha || 1;
    const P = h.P, Q = h.Q, L = h.L || [], M = h.M || [], np = P.length / 2, nl = L.length / 4;
    const fam = family === 'affine' ? 0 : family === 'similarity' ? 1 : 2;
    const nv = verts.length / 2;
    // scratch for samples of this vertex
    const cap = np + nl * 64;
    const SX = new Float64Array(cap), SY = new Float64Array(cap), TX = new Float64Array(cap), TY = new Float64Array(cap), W = new Float64Array(cap);
    for (let k = 0; k < nv; k++) {
      const vx = verts[2 * k], vy = verts[2 * k + 1];
      let n = 0, exact = -1;
      for (let i = 0; i < np; i++) {
        const dx = P[2 * i] - vx, dy = P[2 * i + 1] - vy, d2 = dx * dx + dy * dy;
        if (d2 < 1e-12) { exact = i; break; }
        SX[n] = P[2 * i]; SY[n] = P[2 * i + 1]; TX[n] = Q[2 * i]; TY[n] = Q[2 * i + 1];
        W[n] = alpha === 1 ? 1 / d2 : 1 / Math.pow(d2, alpha); n++;
      }
      if (exact >= 0) { out[2 * k] = Q[2 * exact]; out[2 * k + 1] = Q[2 * exact + 1]; continue; }
      for (let j = 0; j < nl; j++) {
        const ax = L[4 * j], ay = L[4 * j + 1], bx = L[4 * j + 2], by = L[4 * j + 3];
        const cx = M[4 * j], cy = M[4 * j + 1], ex = M[4 * j + 2], ey = M[4 * j + 3];
        const sx = bx - ax, sy = by - ay, len = Math.hypot(sx, sy);
        if (len < 1e-9) continue;
        let t = ((vx - ax) * sx + (vy - ay) * sy) / (len * len); t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dist = Math.hypot(ax + sx * t - vx, ay + sy * t - vy);
        const m = Math.max(2, Math.min(64, Math.ceil(2 * len / Math.max(dist, 1))));
        const ds = len / m / LINE_UNIT;
        for (let s = 0; s < m; s++) {
          const u = (s + .5) / m, px = ax + sx * u, py = ay + sy * u, dx = px - vx, dy = py - vy;
          const d2 = Math.max(dx * dx + dy * dy, 1e-6);
          SX[n] = px; SY[n] = py; TX[n] = cx + (ex - cx) * u; TY[n] = cy + (ey - cy) * u;
          W[n] = ds * (alpha === 1 ? 1 / d2 : 1 / Math.pow(d2, alpha)); n++;
        }
      }
      // weighted centroids
      let sw = 0, psx = 0, psy = 0, qsx = 0, qsy = 0;
      for (let i = 0; i < n; i++) { const w = W[i]; sw += w; psx += w * SX[i]; psy += w * SY[i]; qsx += w * TX[i]; qsy += w * TY[i]; }
      psx /= sw; psy /= sw; qsx /= sw; qsy /= sw;
      const rx = vx - psx, ry = vy - psy;
      if (fam === 0) {
        // affine: M = (sum w p^T p)^-1 (sum w p^T q)
        let a00 = 0, a01 = 0, a11 = 0, b00 = 0, b01 = 0, b10 = 0, b11 = 0;
        for (let i = 0; i < n; i++) {
          const w = W[i], px = SX[i] - psx, py = SY[i] - psy, qx = TX[i] - qsx, qy = TY[i] - qsy;
          a00 += w * px * px; a01 += w * px * py; a11 += w * py * py;
          b00 += w * px * qx; b01 += w * px * qy; b10 += w * py * qx; b11 += w * py * qy;
        }
        const det = a00 * a11 - a01 * a01;
        if (Math.abs(det) < 1e-12) { out[2 * k] = vx - psx + qsx; out[2 * k + 1] = vy - psy + qsy; continue; }
        const i00 = a11 / det, i01 = -a01 / det, i11 = a00 / det;
        const m00 = i00 * b00 + i01 * b10, m01 = i00 * b01 + i01 * b11, m10 = i01 * b00 + i11 * b10, m11 = i01 * b01 + i11 * b11;
        out[2 * k] = rx * m00 + ry * m10 + qsx; out[2 * k + 1] = rx * m01 + ry * m11 + qsy;
      } else {
        // similarity as a complex number c = sum w conj(p^) q^ / sum w |p^|^2 ; rigid = c / |c|
        let cr = 0, ci = 0, mu = 0;
        for (let i = 0; i < n; i++) {
          const w = W[i], px = SX[i] - psx, py = SY[i] - psy, qx = TX[i] - qsx, qy = TY[i] - qsy;
          cr += w * (px * qx + py * qy); ci += w * (px * qy - py * qx); mu += w * (px * px + py * py);
        }
        if (fam === 1) { cr /= mu; ci /= mu; } else { const r = Math.hypot(cr, ci) || 1; cr /= r; ci /= r; }
        out[2 * k] = cr * rx - ci * ry + qsx; out[2 * k + 1] = ci * rx + cr * ry + qsy;
      }
    }
    return out;
  }

  // a regular grid over a rect; returns { verts, uv, idx, lines, cols, rows }
  function grid(x0, y0, w, h, cols, rows) {
    const verts = new Float64Array((cols + 1) * (rows + 1) * 2), uv = new Float32Array((cols + 1) * (rows + 1) * 2);
    for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
      const k = r * (cols + 1) + c; verts[2 * k] = x0 + w * c / cols; verts[2 * k + 1] = y0 + h * r / rows; uv[2 * k] = c / cols; uv[2 * k + 1] = r / rows;
    }
    const idx = [], lines = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c, b = a + 1, d = a + cols + 1, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
    for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
      const a = r * (cols + 1) + c; if (c < cols) lines.push(a, a + 1); if (r < rows) lines.push(a, a + cols + 1);
    }
    return { verts, uv, idx: new Uint16Array(idx), lines: new Uint16Array(lines), cols, rows };
  }

  // signed area of every triangle, deformed / rest. Negative = fold-over.
  function jacobians(rest, def, idx) {
    const n = idx.length / 3, J = new Float64Array(n);
    for (let t = 0; t < n; t++) {
      const a = idx[3 * t], b = idx[3 * t + 1], c = idx[3 * t + 2];
      const r = (rest[2 * b] - rest[2 * a]) * (rest[2 * c + 1] - rest[2 * a + 1]) - (rest[2 * b + 1] - rest[2 * a + 1]) * (rest[2 * c] - rest[2 * a]);
      const d = (def[2 * b] - def[2 * a]) * (def[2 * c + 1] - def[2 * a + 1]) - (def[2 * b + 1] - def[2 * a + 1]) * (def[2 * c] - def[2 * a]);
      J[t] = d / r;
    }
    return J;
  }

  const api = { solve, grid, jacobians, LINE_UNIT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MLS = api;
})(typeof self !== 'undefined' ? self : this);

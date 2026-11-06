"""match.py — v6 M32: bring a rendered crop to the decoy frame's measured image statistics before the shared H.264 finish.
Usage: python3 -I match.py <in.png> <out.png> <A|B>
Targets were measured on the decoy crops (146.0 s and 152.25 s, cropped like the candidates, before any finishing) in a dark
background region: mean RGB of the blacks, and the fine (pixel minus 3x3 mean) and middle (3x3 mean minus 9x9 mean) luma spread.
  A: blacks (8.0, 9.8, 6.3), fine 0.06, middle 0.08     B: blacks (7.3, 7.6, 3.6), fine 0.33, middle 0.74
Steps: (1) the blacks (darkest 30 % of pixels) are moved to the target colour by a per-channel affine map that keeps white;
(2) noise in the blacks: if the render's dark region is busier than the decoy's, it is smoothed there; if quieter, matched noise is added;
(3) mild haze: 5 % of a wide (sigma 25 px) blur added; (4) shallow focus on the lower cake wall: a vertical ramp blends to a 1.6 px blur.
Prints the dark-region statistics before and after. No film pixels are written by this script."""
import sys, json
import numpy as np
from PIL import Image
from scipy.ndimage import uniform_filter, gaussian_filter

src, dst, shot = sys.argv[1], sys.argv[2], sys.argv[3]
T = {'A': dict(black=(8.0, 9.8, 6.3), hf=0.06, mf=0.08, ramp=(230, 320)), 'B': dict(black=(7.3, 7.6, 3.6), hf=0.33, mf=0.74, ramp=(140, 205))}[shot]
a = np.asarray(Image.open(src).convert('RGB')).astype(np.float64)
lum = lambda x: x @ np.array([0.2126, 0.7152, 0.0722])
def dark_stats(x):
    L = lum(x); m = L <= np.percentile(L, 30); b3 = uniform_filter(L, 3); b9 = uniform_filter(L, 9)
    return m, dict(black=[round(float(x[..., c][m].mean()), 2) for c in range(3)], hf=round(float((L - b3)[m].std()), 3), mf=round(float((b3 - b9)[m].std()), 3))
m, before = dark_stats(a)
# (1) black level and tint
for c in range(3):
    cur, t = before['black'][c], T['black'][c]
    a[..., c] = t + (a[..., c] - cur) * (255 - t) / max(1.0, 255 - cur)
# (2) noise in the blacks
L = lum(a); dk = np.clip((40 - L) / 25, 0, 1)[..., None]   # 1 in the blacks, 0 above luma 40
_, mid = dark_stats(np.clip(a, 0, 255))
if mid['hf'] > T['hf'] * 1.5 or mid['mf'] > T['mf'] * 1.5:
    sm = np.stack([gaussian_filter(a[..., c], 1.2) for c in range(3)], -1); a = a * (1 - dk) + sm * dk
_, mid = dark_stats(np.clip(a, 0, 255))
if mid['hf'] < T['hf'] * 0.7:
    rng = np.random.default_rng(7); n = rng.normal(0, 1, a.shape[:2]); n = n - uniform_filter(n, 3)
    a += (dk[..., 0] * n * (T['hf'] - mid['hf']) / max(1e-6, n.std()))[..., None]
# (3) haze
a += 0.05 * np.stack([gaussian_filter(a[..., c], 25) for c in range(3)], -1)
# (4) focus falloff on the lower wall
y0, y1 = T['ramp']; w = np.clip((np.arange(a.shape[0]) - y0) / (y1 - y0), 0, 1)[:, None, None]
bl = np.stack([gaussian_filter(a[..., c], 1.6) for c in range(3)], -1); a = a * (1 - w) + bl * w
a = np.clip(a, 0, 255)
_, after = dark_stats(a)
Image.fromarray(a.round().astype(np.uint8)).save(dst)
print(json.dumps({'before': before, 'after': after, 'target': {k: T[k] for k in ('black', 'hf', 'mf')}}))

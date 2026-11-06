"""extract-refs.py: derives the runtime targets in refs.json from two frames of the film clip.
The frame itself stays in /home/claude/stelline-work/evolve-refs/ (never in the repo).
What goes into refs.json: one hand-traced cake outline (20 points, normalised), a 6x6x6 RGB colour histogram (216 numbers)
and three 32-bin per-channel histograms of the cake region. None of these is a picture. No face data is taken.
Usage: python3 -I extract-refs.py <film.mp4> <workdir> <out refs.json>"""
import sys, json, subprocess, os
from PIL import Image, ImageDraw
film, work, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(os.path.join(work, 'frames'), exist_ok=True)
def frame(t, name):
    p = os.path.join(work, 'frames', name)
    subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', film, '-frames:v', '1', p, '-y'], check=True)
    return Image.open(p).convert('RGB')
# ---- CAKE: the wide shot at the table, 2:35.0 (155.0 s). Traced on a 4x enlargement of crop (520,390)-(800,550); candles excluded.
c = frame(155.0, 'cake_155.png')
def cpt(x, y): return (520 + x / 4, 390 + y / 4)
cake_outline = [cpt(*p) for p in [(100,135),(200,105),(400,92),(560,90),(750,95),(900,110),(955,135),(965,200),(965,400),(975,460),(1010,510),(960,560),(800,595),(500,605),(200,590),(70,560),(50,510),(80,460),(100,400),(95,200)]]
def norm(poly, lm=None, by='h'):
    xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
    cx = (min(xs) + max(xs)) / 2; top = min(ys); s = (max(ys) - min(ys)) if by == 'h' else (max(xs) - min(xs))
    f = lambda p: [round((p[0] - cx) / s, 4), round((p[1] - top) / s, 4)]
    return [f(p) for p in poly], ({k: f(v) for k, v in lm.items()} if lm else None)
co, _ = norm(cake_outline, None, 'w')
def mask(img, poly):
    m = Image.new('L', img.size, 0); ImageDraw.Draw(m).polygon(poly, fill=255); return m
# cake colour histogram: 6 bins per sRGB channel over the pixels inside the traced cake outline
B = 6; hist = [0.0] * (B ** 3); cm = mask(c, cake_outline); n = 0
for p, m in zip(c.getdata(), cm.getdata()):
    if not m: continue
    # soft (trilinear) binning: bin centres at (k + 0.5) * 256 / B; each pixel splits its weight between the two nearest centres per channel
    f = [min(B - 1.0, max(0.0, v * B / 256 - .5)) for v in p]; lo = [min(B - 2, int(x)) for x in f]; t = [x - l for x, l in zip(f, lo)]
    for dr in (0, 1):
        for dg in (0, 1):
            for db in (0, 1):
                w = (t[0] if dr else 1 - t[0]) * (t[1] if dg else 1 - t[1]) * (t[2] if db else 1 - t[2])
                hist[((lo[0] + dr) * B + lo[1] + dg) * B + lo[2] + db] += w
    n += 1
hist = [round(h / n, 5) for h in hist]
# per-channel marginals, 32 bins each (what the fitness uses: their 1-D earth mover's distance has a slope everywhere)
M = 32; marg = [[0] * M for _ in range(3)]
for p, m in zip(c.getdata(), cm.getdata()):
    if m:
        for ch in range(3): marg[ch][p[ch] * M // 256] += 1
marg = [[round(v / n, 5) for v in ch] for ch in marg]
# check overlays (stay in the work dir)
for img, poly, name, lm in [(c, cake_outline, 'check_cake.png', None)]:
    o = img.copy(); d = ImageDraw.Draw(o); d.line(poly + [poly[0]], fill=(0, 255, 255), width=1)
    for v in (lm or {}).values(): d.ellipse([v[0] - 2, v[1] - 2, v[0] + 2, v[1] + 2], outline=(255, 0, 255))
    o.save(os.path.join(work, name))
json.dump({
  'provenance': {'film': 'Blade Runner 2049, the memory-maker scene (clip memory.mp4, 1280x720, 24 fps)',
    'cake': 'frame at 155.0 s: the birthday cake on the hexagonal table, wide shot, camera about 7 degrees above the cake; outline (cake and board, candles excluded) hand-traced; normalised by its width',
    'cakeHist': '6x6x6 sRGB histogram (trilinear soft binning) of pixels inside the traced cake outline, frame 155.0 s, fractions summing to 1',
    'cakeMarginals': 'per-channel sRGB histograms, 32 bins each, same pixels as cakeHist',
    'note': 'derived numbers only; the frames are not in the repo'},
  'cake': {'outline': co, 'elevationDeg': 7, 'hist': hist, 'bins': B, 'marginals': marg}}, open(out, 'w'))
print('cake px', n, 'top bins', sorted(((h, i) for i, h in enumerate(hist)), reverse=True)[:6])

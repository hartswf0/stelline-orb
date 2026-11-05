"""Segment the memory (1:49 on) into tracked regions with a feeling weight.
Usage: python3 segment.py VIDEO OUT.json [ranges="137-166,172-186,213-228"] [fps=4] [K=24]
Only the memory: the cake, the children, her hands on the orb, the face lit by the candles. Dialogue and reaction shots are left out.
Each frame is clustered in (Lab colour, position) with k-means seeded from the previous frame, so a region keeps its id over time.
Per region and frame we keep only what a mist needs: where it is, how big, what colour, how much feeling it carries, a loose outline."""
import sys, json, subprocess, os, tempfile, glob
import numpy as np, cv2
from ai_edge_litert.interpreter import Interpreter
V, OUT = sys.argv[1], sys.argv[2]
RANGES = [tuple(float(x) for x in r.split('-')) for r in (sys.argv[3] if len(sys.argv) > 3 else '137-166,172-186,213-228').split(',')]
FPS = int(sys.argv[4]) if len(sys.argv) > 4 else 4; K = int(sys.argv[5]) if len(sys.argv) > 5 else 24
MODEL = os.environ.get('SELFIE', '/home/user/work/wheels/x/mediapipe/modules/selfie_segmentation/selfie_segmentation.tflite')
it = Interpreter(model_path=MODEL); it.allocate_tensors(); i0 = it.get_input_details()[0]; o0 = it.get_output_details()[0]
def person(bgr):
    b = (255 * ((bgr / 255.0) ** .5)).astype(np.uint8)
    x = cv2.resize(cv2.cvtColor(b, cv2.COLOR_BGR2RGB), (256, 256), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    it.set_tensor(i0['index'], x[None]); it.invoke(); return it.get_tensor(o0['index'])[0, :, :, 0]
d = tempfile.mkdtemp()
starts = []; files = []
for ri, (a0, a1) in enumerate(RANGES):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a0), '-t', str(a1 - a0), '-i', V, '-vf', f'fps={FPS},scale=320:180', f'{d}/r{ri}_%04d.png'], check=True)
    fs = sorted(glob.glob(f'{d}/r{ri}_*.png')); starts.append(len(files)); files += fs; GW, GH = 128, 72
cent = None; out = []; prevlab = None; COLS = 24; ROWS = (len(files) + COLS - 1) // COLS
mos = np.zeros((ROWS * GH, COLS * GW, 3), np.uint8); salsheet = np.zeros((ROWS * GH, COLS * GW), np.uint8)
for fi, f in enumerate(files):
    if fi in starts: cent = None; prevlab = None
    im = cv2.imread(f); small = cv2.resize(im, (GW, GH), interpolation=cv2.INTER_AREA); lab = cv2.cvtColor(small, cv2.COLOR_BGR2LAB).astype(np.float32)
    yy, xx = np.mgrid[0:GH, 0:GW]; feat = np.dstack([lab[..., 0] * 1.0, lab[..., 1] * 1.4, lab[..., 2] * 1.4, xx * 1.1, yy * 1.1]).reshape(-1, 5).astype(np.float32)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 12, .5)
    if cent is None: _, lbl, cent = cv2.kmeans(feat, K, None, crit, 3, cv2.KMEANS_PP_CENTERS)
    else:
        d2 = ((feat[:, None, :] - cent[None]) ** 2).sum(2); lbl0 = d2.argmin(1).astype(np.int32).reshape(-1, 1)
        _, lbl, cent = cv2.kmeans(feat, K, lbl0, crit, 1, cv2.KMEANS_USE_INITIAL_LABELS)
    lbl = lbl.reshape(GH, GW)
    pm = cv2.resize(person(im), (GW, GH)); rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB).astype(np.float32)
    lum = rgb.mean(2) / 255; gx = cv2.Sobel(lum, cv2.CV_32F, 1, 0); gy = cv2.Sobel(lum, cv2.CV_32F, 0, 1); edge = np.hypot(gx, gy)
    frame = []; mosaic = np.zeros((GH, GW, 3), np.uint8); salmap = np.zeros((GH, GW), np.float32)
    for k in range(K):
        m = lbl == k; a = int(m.sum())
        if a < 4: continue
        c = rgb[m].mean(0); pp = float(pm[m].mean()); warm = float((c[0] - c[2]) / 255)
        flame = float(((lum > .72) & (rgb[..., 0] > rgb[..., 2] + 25) & m).sum() / max(1, a)) * (1 if a < 200 else .25)
        con = float(edge[m].mean()); sal = float(np.clip(.6 * pp + .4 * min(1, flame * 2.5) + .2 * min(1, con * 2.2), 0, 1))
        mosaic[m] = c.astype(np.uint8); salmap[m] = sal
        ys, xs = np.nonzero(m); frame.append([k, round(float(xs.mean()) / GW, 3), round(float(ys.mean()) / GH, 3), round(a / (GW * GH), 4), round(sal, 2), round(warm, 2)])
    r, cidx = divmod(fi, COLS); mos[r * GH:(r + 1) * GH, cidx * GW:(cidx + 1) * GW] = mosaic; salsheet[r * GH:(r + 1) * GH, cidx * GW:(cidx + 1) * GW] = (salmap * 255).astype(np.uint8)
    # a frame-level feeling: faces and flames carried, warmth, change
    feel = float(np.clip(.5 * pm.mean() * 2 + .3 * ((lum > .7) & (rgb[..., 0] > rgb[..., 2])).mean() * 12 + .2 * (0 if prevlab is None else np.abs(lum - prevlab).mean() * 10), 0, 1)); prevlab = lum
    out.append({'f': frame, 'feel': round(feel, 3), 'lum': round(float(lum.mean()), 3)})
    if fi % 40 == 0: print(fi, len(files), flush=True)
json.dump({'ranges': [[a, b, st] for (a, b), st in zip(RANGES, starts)], 'fps': FPS, 'K': K, 'gw': GW, 'gh': GH, 'cols': COLS, 'frames': out}, open(OUT, 'w'), separators=(',', ':'))
base = OUT[:-5]
cv2.imwrite(base + '_mosaic.jpg', cv2.cvtColor(mos, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 86]); cv2.imwrite(base + '_sal.png', salsheet, [cv2.IMWRITE_PNG_COMPRESSION, 9])
print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB')

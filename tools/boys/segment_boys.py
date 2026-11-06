"""Cut each boy out of the orphanage flashback, one clip per good moment.
A boy is a face box at a start time; it is tracked forward, and each frame is cut out with a person mask refined by GrabCut inside a region around his head and shoulders.
Output per clip: a strip of RGBA WebP frames (assets/boys/<id>.webp) and boys.json."""
import sys, json, os, numpy as np, cv2
from PIL import Image
from ai_edge_litert.interpreter import Interpreter
V = sys.argv[1]; OUT = sys.argv[2]; FPS = 12
it = Interpreter(model_path=os.environ.get('SELFIE', '/home/user/work/wheels/x/mediapipe/modules/selfie_segmentation/selfie_segmentation.tflite')); it.allocate_tensors(); i0 = it.get_input_details()[0]; o0 = it.get_output_details()[0]
def person(bgr):
    b = (255 * ((bgr / 255.0) ** .5)).astype(np.uint8); x = cv2.resize(cv2.cvtColor(b, cv2.COLOR_BGR2RGB), (256, 256), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    it.set_tensor(i0['index'], x[None]); it.invoke(); return cv2.resize(it.get_tensor(o0['index'])[0, :, :, 0], (bgr.shape[1], bgr.shape[0]))
# boy, clip id, start s, end s, face box (x, y, w, h) at start in 1280x720
GROUP = {'small_a', 'left_a', 'dark_a', 'right_a', 'tall_b'}   # a boy standing among others: person mask limited to his own head and shoulders
CLIPS = [
 ('hair',  'hair_a',  145.9, 147.0, (320, 130, 260, 270)),
 ('hair',  'hair_b',  173.9, 177.3, (250, 100, 340, 380)),
 ('tall',  'tall_a',  178.0, 179.1, (180, 100, 330, 380)),
 ('tall',  'tall_b',  179.3, 182.4, (600, 130, 190, 190)),
 ('small', 'small_a', 177.9, 179.1, (640, 160, 260, 300)),
 ('left',  'left_a',  179.3, 182.4, (330, 200, 150, 190)),
 ('dark',  'dark_a',  179.6, 182.4, (1100, 340, 140, 190)),
 ('right', 'right_a', 179.3, 182.4, (900, 220, 120, 180)),
]
if os.environ.get('CLIPS_JSON'):
    J = json.load(open(os.environ['CLIPS_JSON'])); CLIPS = [tuple(c[:4]) + (tuple(c[4]),) for c in J['clips']]; GROUP = set(J.get('group', []))
cap = cv2.VideoCapture(V); fps_src = cap.get(cv2.CAP_PROP_FPS); res = []
def frame_at(t):
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(t * fps_src))); ok, f = cap.read(); return f if ok else None
for boy, cid, t0, t1, box in CLIPS:
    frames = []; tt = t0; trk = cv2.TrackerCSRT_create(); f0 = frame_at(t0); trk.init(f0, tuple(int(v) for v in box)); cur = list(box)
    while tt <= t1:
        f = frame_at(tt)
        if f is None: break
        ok, b = trk.update(f)
        if ok: cur = [int(v) for v in b]
        x, y, w, h = cur; H, W = f.shape[:2]
        rx0, rx1 = max(0, int(x - .9 * w)), min(W, int(x + 1.9 * w)); ry0, ry1 = max(92, int(y - .35 * h)), min(628, int(y + 3.0 * h))
        roi = f[ry0:ry1, rx0:rx1]; pm = person(f)[ry0:ry1, rx0:rx1]
        gm = np.full(roi.shape[:2], cv2.GC_PR_BGD, np.uint8); gm[pm > .35] = cv2.GC_PR_FGD; gm[pm > .8] = cv2.GC_FGD
        fx0, fy0 = x - rx0, y - ry0; gm[max(0, int(fy0 + .2 * h)):int(fy0 + .85 * h), max(0, int(fx0 + .2 * w)):int(fx0 + .8 * w)] = cv2.GC_FGD
        gm[0, :] = cv2.GC_BGD; gm[:, 0] = cv2.GC_BGD; gm[:, -1] = cv2.GC_BGD
        if cid in GROUP: m = (pm > .5).astype(np.uint8)
        else:
          try:
            small = cv2.resize(roi, None, fx=.5, fy=.5); gms = cv2.resize(gm, None, fx=.5, fy=.5, interpolation=cv2.INTER_NEAREST)
            bg = np.zeros((1, 65)); fg = np.zeros((1, 65)); cv2.grabCut(small, gms, None, bg, fg, 4, cv2.GC_INIT_WITH_MASK)
            m = cv2.resize(((gms == cv2.GC_FGD) | (gms == cv2.GC_PR_FGD)).astype(np.uint8), (roi.shape[1], roi.shape[0]), interpolation=cv2.INTER_NEAREST)
          except Exception:
            m = (pm > .5).astype(np.uint8)
        # keep the component that holds his face
        n, lab = cv2.connectedComponents(m); cx, cy = int(fx0 + w / 2), int(fy0 + h / 2); cl = lab[min(lab.shape[0] - 1, max(0, cy)), min(lab.shape[1] - 1, max(0, cx))]
        keep = (lab == cl).astype(np.float32) if cl else m.astype(np.float32)
        yy, xx = np.mgrid[0:roi.shape[0], 0:roi.shape[1]]; ex, ey = (1.05 * w, 1.55 * h) if cid in GROUP else (1.5 * w, 2.1 * h)
        if cid in GROUP:   # a bust: his head, and his shoulders, so the boys beside him fall away
            el = ((((xx - (fx0 + w / 2)) / (.66 * w)) ** 2 + ((yy - (fy0 + .5 * h)) / (.78 * h)) ** 2 < 1) | (((xx - (fx0 + w / 2)) / (1.0 * w)) ** 2 + ((yy - (fy0 + 1.6 * h)) / (.55 * h)) ** 2 < 1)).astype(np.float32)
        else: el = (((xx - (fx0 + w / 2)) / ex) ** 2 + ((yy - (fy0 + 1.0 * h)) / ey) ** 2 < 1).astype(np.float32)
        keep = cv2.GaussianBlur(keep * cv2.GaussianBlur(el, (0, 0), 6), (0, 0), 1.4)
        a = np.zeros((H, W), np.float32); a[ry0:ry1, rx0:rx1] = keep
        rgba = np.dstack([f, (a * 255).astype(np.uint8)]); frames.append((rgba, (rx0, ry0, rx1, ry1))); tt += 1.0 / FPS
    # union crop
    xs0 = min(b[0] for _, b in frames); ys0 = min(b[1] for _, b in frames); xs1 = max(b[2] for _, b in frames); ys1 = max(b[3] for _, b in frames)
    ys, xs = [], []
    for r, _ in frames:
        yy, xx = np.where(r[..., 3] > 30)
        if len(yy): ys += [yy.min(), yy.max()]; xs += [xx.min(), xx.max()]
    x0, x1, y0, y1 = max(xs0, min(xs) - 6), min(xs1, max(xs) + 6), max(ys0, min(ys) - 6), min(ys1, max(ys) + 6)
    ch = 240; sc = ch / (y1 - y0); cw = int((x1 - x0) * sc)
    crops = [cv2.resize(r[y0:y1, x0:x1], (cw, ch), interpolation=cv2.INTER_AREA) for r, _ in frames]
    COLS = 6; ROWS = (len(crops) + COLS - 1) // COLS; strip = np.zeros((ROWS * ch, COLS * cw, 4), np.uint8)
    for i, c in enumerate(crops): strip[(i // COLS) * ch:(i // COLS + 1) * ch, (i % COLS) * cw:(i % COLS + 1) * cw] = c
    rgba = np.dstack([strip[..., 2], strip[..., 1], strip[..., 0], strip[..., 3]])
    Image.fromarray(rgba, 'RGBA').save(f'{OUT}/{cid}.webp', 'WEBP', quality=82, alpha_quality=90, method=5)
    res.append({'boy': boy, 'id': cid, 't0': t0, 't1': t1, 'n': len(crops), 'w': cw, 'h': ch, 'cols': COLS, 'fps': FPS}); print(cid, len(crops), cw, 'x', ch, flush=True)
json.dump({'clips': res}, open(f'{OUT}/boys.json', 'w'))

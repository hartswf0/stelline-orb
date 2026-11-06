"""Cut the children of the birthday wide shot into full-body slabs, one per child, each a clip of RGBA frames placed in the shot's own 1280x720 coordinates.
Usage: python3 segment_slabs.py VIDEO OUT_DIR   (213.0-216.4 s of the Memory Maker clip)"""
import sys, json, os, numpy as np, cv2
from PIL import Image
from ai_edge_litert.interpreter import Interpreter
V, OUT = sys.argv[1], sys.argv[2]; FPS = 12; T0, T1 = 213.0, 216.4
it = Interpreter(model_path=os.environ.get('SELFIE', '/home/user/work/wheels/x/mediapipe/modules/selfie_segmentation/selfie_segmentation.tflite')); it.allocate_tensors(); i0 = it.get_input_details()[0]; o0 = it.get_output_details()[0]
def person(bgr):
    b = (255 * ((bgr / 255.0) ** .45)).astype(np.uint8); x = cv2.resize(cv2.cvtColor(b, cv2.COLOR_BGR2RGB), (256, 256), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    it.set_tensor(i0['index'], x[None]); it.invoke(); return cv2.resize(it.get_tensor(o0['index'])[0, :, :, 0], (bgr.shape[1], bgr.shape[0]), interpolation=cv2.INTER_CUBIC)
# id, name, x range in the shot, y top
SLABS = [('left', 0, 130), ('small', 62, 238), ('back', 232, 372), ('girl', 305, 545), ('asian', 530, 705), ('boy', 695, 870)]
cap = cv2.VideoCapture(V); fps = cap.get(cv2.CAP_PROP_FPS); frames = []; t = T0
while t <= T1:
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(t * fps))); ok, f = cap.read()
    if not ok: break
    f = cv2.resize(f, (1280, 720)); frames.append(f); t += 1 / FPS
print(len(frames), 'frames')
masks = []
for f in frames:
    m = person(f); a = np.clip((m - .25) / .4, 0, 1); lum = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255; lum = cv2.GaussianBlur(lum, (0, 0), 2); a *= np.clip((lum - .008) / .035, 0, 1)
    X = np.arange(1280, dtype=np.float32)[None, :]; Y = np.arange(720, dtype=np.float32)[:, None]; a *= np.clip((880 - X) / 70, 0, 1) * np.clip((575 - Y) / 70, 0, 1); masks.append(cv2.GaussianBlur(cv2.erode(a, np.ones((3, 3), np.uint8)), (0, 0), 3.0))
res = []
for sid, x0, x1 in SLABS:
    w = np.zeros(1280, np.float32); fe = 30
    for x in range(1280): w[x] = np.clip(min((x - x0 + fe) / fe if x < x0 + fe else 1, (x1 + fe - x) / fe if x > x1 - fe else 1), 0, 1) if x0 - fe <= x <= x1 + fe else 0
    rgba = []
    for f, m in zip(frames, masks):
        a = m * w[None, :]; rgba.append(np.dstack([f, (a * 255).astype(np.uint8)]))
    ys, xs = [], []
    for r in rgba:
        yy, xx = np.where(r[..., 3] > 40)
        if len(yy): ys += [yy.min(), yy.max()]; xs += [xx.min(), xx.max()]
    X0, X1, Y0, Y1 = max(0, min(xs) - 4), min(1280, max(xs) + 4), max(0, min(ys) - 4), min(720, max(ys) + 4)
    cw, ch = X1 - X0, Y1 - Y0; COLS = 6; ROWS = (len(rgba) + COLS - 1) // COLS; strip = np.zeros((ROWS * ch, COLS * cw, 4), np.uint8)
    for i, r in enumerate(rgba): strip[(i // COLS) * ch:(i // COLS + 1) * ch, (i % COLS) * cw:(i % COLS + 1) * cw] = r[Y0:Y1, X0:X1]
    img = np.dstack([strip[..., 2], strip[..., 1], strip[..., 0], strip[..., 3]]); Image.fromarray(img, 'RGBA').save(f'{OUT}/slab_{sid}.webp', 'WEBP', quality=84, alpha_quality=90, method=5)
    res.append({'id': sid, 'x': int(X0), 'y': int(Y0), 'w': int(cw), 'h': int(ch), 'n': len(rgba), 'cols': COLS, 'fps': FPS}); print(sid, cw, ch, flush=True)
# the film's own cake: body, candles with flames, and the dark contact shadow, cut from the same frames by geometry (the pixels match the frame behind, so seams cannot show)
yy, xx = np.mgrid[0:720, 0:1280].astype(np.float32)
body = (((xx - 370) / 165) ** 2 + ((yy - 540) / 108) ** 2 < 1); shadow = (((xx - 370) / 205) ** 2 + ((yy - 608) / 50) ** 2 < 1); cand = (xx > 255) & (xx < 475) & (yy > 372) & (yy < 470)
ca = cv2.GaussianBlur((body | shadow | cand).astype(np.float32), (0, 0), 7)
rgba = [np.dstack([f, (ca * 255).astype(np.uint8)]) for f in frames]
X0, X1, Y0, Y1 = 140, 600, 360, 670; cw, ch = X1 - X0, Y1 - Y0; COLS = 6; ROWS = (len(rgba) + COLS - 1) // COLS; strip = np.zeros((ROWS * ch, COLS * cw, 4), np.uint8)
for i, r in enumerate(rgba): strip[(i // COLS) * ch:(i // COLS + 1) * ch, (i % COLS) * cw:(i % COLS + 1) * cw] = r[Y0:Y1, X0:X1]
img = np.dstack([strip[..., 2], strip[..., 1], strip[..., 0], strip[..., 3]]); Image.fromarray(img, 'RGBA').save(f'{OUT}/slab_cake.webp', 'WEBP', quality=86, alpha_quality=90, method=5)
res.append({'id': 'cake', 'x': X0, 'y': Y0, 'w': cw, 'h': ch, 'n': len(rgba), 'cols': COLS, 'fps': FPS}); print('cake', cw, ch)
json.dump({'slabs': res, 'w': 1280, 'h': 720}, open(f'{OUT}/slabs.json', 'w'))

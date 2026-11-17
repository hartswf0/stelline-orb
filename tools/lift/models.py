"""Local models for the lift pipeline. No cloud calls; every weight file is a public release.

  depth      Depth Anything V2 (ONNX)      github.com/fabio-sim/Depth-Anything-ONNX releases v2.0.0
  detect     EfficientDet-Lite2 (COCO)     storage.googleapis.com/mediapipe-models
  touch      MediaPipe magic_touch         point-prompted segmentation
  people     MediaPipe selfie multiclass

Set LIFT_MODELS to the folder that holds the weight files (default ~/models or /home/user/models).
"""
import os, numpy as np, cv2, onnxruntime as ort
from ai_edge_litert.interpreter import Interpreter

MODELS = os.environ.get('LIFT_MODELS') or next((p for p in (os.path.expanduser('~/models'), '/home/user/models') if os.path.isdir(p)), '.')
URLS = {
    'depth_anything_v2_vitl.onnx': 'https://github.com/fabio-sim/Depth-Anything-ONNX/releases/download/v2.0.0/depth_anything_v2_vitl.onnx',
    'efficientdet_lite2.tflite': 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/float32/latest/efficientdet_lite2.tflite',
    'magic_touch.tflite': 'https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/latest/magic_touch.tflite',
    'selfie_multiclass_256x256.tflite': 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
}
_c = {}

def _path(name):
    p = os.path.join(MODELS, name)
    if not os.path.exists(p):
        raise FileNotFoundError('%s missing. Download: curl -L -o %s %s' % (p, p, URLS[name]))
    return p

def _depth518(bgr, name):
    if 'd' not in _c:
        so = ort.SessionOptions(); so.intra_op_num_threads = os.cpu_count()
        _c['d'] = ort.InferenceSession(_path(name), so, providers=['CPUExecutionProvider'])
    s = _c['d']
    H, W = bgr.shape[:2]
    x = cv2.cvtColor(cv2.resize(bgr, (518, 518), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    x = ((x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]).transpose(2, 0, 1)[None].astype(np.float32)
    d = s.run(None, {s.get_inputs()[0].name: x})[0].squeeze()
    return cv2.resize(d, (W, H), interpolation=cv2.INTER_CUBIC)

def depth(bgr, name='depth_anything_v2_vitl.onnx', tiles=True):
    """Relative inverse depth (larger = nearer), float32, image size.
    The released graph takes 518 x 518 only, so a wide frame is read once whole (squashed, for the global layout)
    and again as square tiles at full height; each tile is fitted to the whole-frame read (scale and shift, least
    squares) and blended in with a raised-cosine weight. The tiles carry the detail, the whole frame the agreement."""
    H, W = bgr.shape[:2]
    g = _depth518(bgr, name)
    if not tiles or W < 1.3 * H:
        return g
    n = int(np.ceil((W - H) / (H * 0.98))) + 1
    acc = np.zeros((H, W), np.float32); wsum = np.zeros((H, W), np.float32)
    for k in range(n):
        x0 = int(round(k * (W - H) / max(1, n - 1)))
        t = _depth518(bgr[:, x0:x0 + H], name)
        A = np.stack([t.ravel(), np.ones(t.size, np.float32)], 1)
        a, b = np.linalg.lstsq(A, g[:, x0:x0 + H].ravel(), rcond=None)[0]
        w = (0.5 - 0.5 * np.cos(2 * np.pi * (np.arange(H) + 0.5) / H)).astype(np.float32)[None, :] + 1e-3
        acc[:, x0:x0 + H] += (a * t + b) * w; wsum[:, x0:x0 + H] += w
    return acc / wsum

def _tfl(name):
    if name not in _c:
        it = Interpreter(model_path=_path(name), num_threads=os.cpu_count()); it.allocate_tensors(); _c[name] = it
    return _c[name]

def detect(bgr, want=(60,), thresh=0.2):
    """COCO boxes [(score, cls, x0, y0, x1, y1)]; class 60 is cake in the 0-based 90-label map."""
    it = _tfl('efficientdet_lite2.tflite')
    inp = it.get_input_details()[0]; n = inp['shape'][1]
    H, W = bgr.shape[:2]
    x = cv2.cvtColor(cv2.resize(bgr, (n, n)), cv2.COLOR_BGR2RGB).astype(np.float32)
    x = (x - 127.5) / 127.5
    it.set_tensor(inp['index'], x[None]); it.invoke()
    outs = {tuple(o['shape']): it.get_tensor(o['index']) for o in it.get_output_details()}
    raw_boxes = next(v for k, v in outs.items() if k[-1] == 4)[0]
    raw_scores = next(v for k, v in outs.items() if k[-1] == 90)[0]
    anchors = _anchors(n)
    sc = raw_scores  # this graph already outputs probabilities
    res = []
    for c in want:
        idx = np.where(sc[:, c] > thresh)[0]
        for i in idx:
            ya, xa, ha, wa = anchors[i]
            ty, tx, th, tw = raw_boxes[i]
            cy, cx = ty * ha + ya, tx * wa + xa
            h, w = np.exp(th) * ha, np.exp(tw) * wa
            res.append((float(sc[i, c]), c, (cx - w / 2) * W, (cy - h / 2) * H, (cx + w / 2) * W, (cy + h / 2) * H))
    res.sort(reverse=True)
    keep = []
    for r in res:
        if all(_iou(r[2:], k[2:]) < 0.5 for k in keep): keep.append(r)
    return keep

def _iou(a, b):
    x0, y0, x1, y1 = max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3])
    i = max(0, x1 - x0) * max(0, y1 - y0)
    return i / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - i + 1e-9)

def _anchors(n, min_level=3, max_level=7, num_scales=3, ratios=(1.0, 2.0, 0.5), anchor_scale=4.0):
    out = []
    for level in range(min_level, max_level + 1):
        stride = 2 ** level
        fs = int(np.ceil(n / stride))
        for y in range(fs):
            for x in range(fs):
                for so in range(num_scales):
                    for r in ratios:
                        base = anchor_scale * stride * 2 ** (so / num_scales)
                        w, h = base * np.sqrt(r), base / np.sqrt(r)
                        out.append(((y + 0.5) * stride / n, (x + 0.5) * stride / n, h / n, w / n))
    return np.array(out, np.float32)

def touch(bgr, pts):
    """Point-prompted mask (0..1 float, image size). pts = [(x, y)] in pixels."""
    it = _tfl('magic_touch.tflite')
    inp = it.get_input_details()[0]; n = inp['shape'][1]
    H, W = bgr.shape[:2]
    rgb = cv2.cvtColor(cv2.resize(bgr, (n, n)), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    a = np.zeros((n, n), np.float32)
    for x, y in pts:
        cv2.circle(a, (int(x / W * n), int(y / H * n)), 9, 1.0, -1)
    it.set_tensor(inp['index'], np.dstack([rgb, a])[None]); it.invoke()
    m = it.get_tensor(it.get_output_details()[0]['index']).squeeze()
    return cv2.resize(m, (W, H), interpolation=cv2.INTER_LINEAR)

def people(bgr):
    """Probability that a pixel is a person (hair, skin, clothes), image size."""
    it = _tfl('selfie_multiclass_256x256.tflite')
    inp = it.get_input_details()[0]
    H, W = bgr.shape[:2]
    x = cv2.cvtColor(cv2.resize(bgr, (256, 256)), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    it.set_tensor(inp['index'], x[None]); it.invoke()
    o = it.get_tensor(it.get_output_details()[0]['index'])[0]
    e = np.exp(o - o.max(-1, keepdims=True)); p = e / e.sum(-1, keepdims=True)
    return cv2.resize(1 - p[..., 0], (W, H), interpolation=cv2.INTER_LINEAR)

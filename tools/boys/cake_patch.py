"""A clean-plate patch where the film's cake stood (body, candles, shadow inpainted from the first frame), used when a 3D cake replaces it.
Usage: python3 cake_patch.py VIDEO OUT_DIR"""
import sys, json, numpy as np, cv2
from PIL import Image
V, OUT = sys.argv[1], sys.argv[2]; cap = cv2.VideoCapture(V); fps = cap.get(cv2.CAP_PROP_FPS); cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(213.0 * fps))); ok, f = cap.read(); f = cv2.resize(f, (1280, 720))
yy, xx = np.mgrid[0:720, 0:1280].astype(np.float32)
body = (((xx - 370) / 165) ** 2 + ((yy - 540) / 108) ** 2 < 1); shadow = (((xx - 370) / 205) ** 2 + ((yy - 608) / 50) ** 2 < 1); cand = (xx > 255) & (xx < 475) & (yy > 372) & (yy < 470)
m = (body | shadow | cand).astype(np.uint8) * 255; m = cv2.dilate(m, np.ones((9, 9), np.uint8))
# fill the cake with the dark table/room: telea from the neighbours, then settle with a blur so no cake detail survives
inp = cv2.inpaint(f, m, 11, cv2.INPAINT_TELEA); blur = cv2.GaussianBlur(inp, (0, 0), 14); mk = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 5)[..., None]; out = (inp * (1 - .8 * mk) + blur * (.8 * mk)).astype(np.uint8)
a = cv2.GaussianBlur((m > 0).astype(np.float32), (0, 0), 7)
X0, X1, Y0, Y1 = 120, 620, 350, 690; rgba = np.dstack([out, (a * 255).astype(np.uint8)])[Y0:Y1, X0:X1]
Image.fromarray(np.dstack([rgba[..., 2], rgba[..., 1], rgba[..., 0], rgba[..., 3]]), 'RGBA').save(f'{OUT}/patch.webp', 'WEBP', quality=88, alpha_quality=92)
json.dump({'x': X0, 'y': Y0, 'w': X1 - X0, 'h': Y1 - Y0}, open(f'{OUT}/patch.json', 'w')); print('ok')

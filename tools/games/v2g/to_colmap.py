#!/usr/bin/env python3
"""Turn a capture (tools/games/v2g/capture.cjs) into the dataset Video2Game reads: a COLMAP binary model with exact poses, images, instance labels.

  python3 tools/games/v2g/to_colmap.py bday_35 [--npy] [--check /path/to/video2game]

Writes into datasets/v2g/<id>/:
  sparse/0/cameras.bin, images.bin, points3D.bin   one PINHOLE camera; world-to-camera poses in COLMAP's frame (x right, y down, z forward);
                                                   the points are vertices of the cake's own mesh, so the cloud is exact, not triangulated
  images/*.jpg                                     the views (PNG captures re-saved at quality 95 to keep the repository small)
  instance/*.npy  (with --npy)                     (H, W) integers, 0 = everything else, 1 = the cake; Video2Game's format. Left as PNG
                                                   (instance_png/) in the repository because 72 uncompressed arrays are 37 MB.
  transforms.json                                  the same cameras in nerfstudio's layout
--check reads the model back with Video2Game's own datasets/colmap_utils.py and projects the cloud into every view against the masks.
"""
import json, os, struct, sys, glob
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
def rot2q(R):
    t = np.trace(R)
    if t > 0: s = np.sqrt(t + 1) * 2; return np.array([s / 4, (R[2, 1] - R[1, 2]) / s, (R[0, 2] - R[2, 0]) / s, (R[1, 0] - R[0, 1]) / s])
    i = int(np.argmax(np.diag(R))); j, k = (i + 1) % 3, (i + 2) % 3; s = np.sqrt(1 + R[i, i] - R[j, j] - R[k, k]) * 2; q = np.zeros(4); q[0] = (R[k, j] - R[j, k]) / s; q[1 + i] = s / 4; q[1 + j] = (R[j, i] + R[i, j]) / s; q[1 + k] = (R[k, i] + R[i, k]) / s; return q
def main(cid, npy=False, check=None):
    D = os.path.join(ROOT, 'datasets/v2g', cid); cap = json.load(open(os.path.join(D, 'capture.json'))); W, H = cap['width'], cap['height']; os.makedirs(os.path.join(D, 'sparse/0'), exist_ok=True)
    fy = (H / 2) / np.tan(np.radians(cap['views'][0]['fov_y_deg']) / 2); fx = fy; cx, cy = W / 2, H / 2; flip = np.diag([1.0, -1.0, -1.0]); poses = []; frames = []
    for i, v in enumerate(cap['views']):
        M = np.array(v['c2w'], float).reshape(4, 4).T; Rc2w, C = M[:3, :3], M[:3, 3]; R = flip @ Rc2w.T; t = -R @ C; name = v['name'].replace('.png', '.jpg'); poses.append((i + 1, rot2q(R), t, name))
        src = os.path.join(D, 'images', v['name'])
        if os.path.exists(src): Image.open(src).convert('RGB').save(os.path.join(D, 'images', name), quality=95); os.remove(src)
        frames.append({'file_path': 'images/' + name, 'transform_matrix': M.tolist()})
        if npy:
            os.makedirs(os.path.join(D, 'instance'), exist_ok=True); m = np.asarray(Image.open(os.path.join(D, 'instance_png', v['name'])).convert('L')) > 127; np.save(os.path.join(D, 'instance', name.replace('.jpg', '.npy')), m.astype(np.int64))
    with open(os.path.join(D, 'sparse/0/cameras.bin'), 'wb') as f: f.write(struct.pack('<Q', 1)); f.write(struct.pack('<iiQQ', 1, 1, W, H)); f.write(struct.pack('<4d', fx, fy, cx, cy))      # model 1 = PINHOLE
    with open(os.path.join(D, 'sparse/0/images.bin'), 'wb') as f:
        f.write(struct.pack('<Q', len(poses)))
        for iid, q, t, name in poses: f.write(struct.pack('<i4d3di', iid, *q, *t, 1)); f.write(name.encode() + b'\x00'); f.write(struct.pack('<Q', 0))
    with open(os.path.join(D, 'sparse/0/points3D.bin'), 'wb') as f:
        f.write(struct.pack('<Q', len(cap['points'])))
        for k, p in enumerate(cap['points']): f.write(struct.pack('<Q3d3BdQ', k + 1, p[0], p[1], p[2], int(p[3]), int(p[4]), int(p[5]), 0.0, 0))
    json.dump({'camera_model': 'OPENCV', 'fl_x': fx, 'fl_y': fy, 'cx': cx, 'cy': cy, 'w': W, 'h': H, 'k1': 0, 'k2': 0, 'p1': 0, 'p2': 0, 'frames': frames}, open(os.path.join(D, 'transforms.json'), 'w'), indent=1)
    print(cid, len(poses), 'views', len(cap['points']), 'points', 'f = %.1f px' % fx)
    if check:
        sys.path.insert(0, os.path.join(check, 'datasets')); import colmap_utils as cu
        cams = cu.read_cameras_binary(os.path.join(D, 'sparse/0/cameras.bin')); ims = cu.read_images_binary(os.path.join(D, 'sparse/0/images.bin')); pts = cu.read_points3d_binary(os.path.join(D, 'sparse/0/points3D.bin'))
        X = np.array([p.xyz for p in pts.values()]); cam = cams[1]; fx2, fy2, cx2, cy2 = cam.params; inside = []; onframe = []
        for im in ims.values():
            R = cu.qvec2rotmat(im.qvec); Xc = X @ R.T + im.tvec; u = fx2 * Xc[:, 0] / Xc[:, 2] + cx2; v = fy2 * Xc[:, 1] / Xc[:, 2] + cy2; ok = (Xc[:, 2] > 0) & (u >= 0) & (u < W) & (v >= 0) & (v < H); onframe.append(ok.mean())
            m = np.asarray(Image.open(os.path.join(D, 'instance_png', im.name.replace('.jpg', '.png'))).convert('L')) > 127; inside.append(m[v[ok].astype(int), u[ok].astype(int)].mean())
        print('read back with Video2Game colmap_utils:', len(cams), 'camera', cam.model, len(ims), 'images', len(pts), 'points')
        print('cake points that project inside their own mask: mean %.1f%%, worst view %.1f%% (on frame: %.1f%%)' % (100 * np.mean(inside), 100 * np.min(inside), 100 * np.mean(onframe)))
if __name__ == '__main__':
    a = sys.argv[1:]; chk = a[a.index('--check') + 1] if '--check' in a else None
    for cid in [x for x in a if not x.startswith('--') and x != chk]: main(cid, '--npy' in a, chk)

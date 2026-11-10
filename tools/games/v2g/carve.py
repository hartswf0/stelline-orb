#!/usr/bin/env python3
"""A mesh from the views alone, on a CPU: space carving (a visual hull), not Video2Game's NeRF.

Video2Game needs a CUDA GPU. This needs none, and uses only what the dataset gives a reconstruction: the pictures' masks and the cameras.
A block of space round the cake is cut into voxels; a voxel survives only if it falls inside the cake's mask in every view. The surface of what
survives is the mesh; each vertex takes its colour from the view that sees it most squarely. It then measures itself against the mesh the orb
actually built, which the carving never saw.

  python3 tools/games/v2g/carve.py bday_35 [--n 160]   -> datasets/v2g/<id>/carved.glb, carved.json

A visual hull cannot see hollows (the top of a cake between its candles, a bundt's hole from the side), so it is always a little fat.
"""
import json, os, struct, sys
import numpy as np
from PIL import Image
from skimage import measure
import trimesh
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
def main(cid, n=160):
    D = os.path.join(ROOT, 'datasets/v2g', cid); cap = json.load(open(os.path.join(D, 'capture.json'))); W, H = cap['width'], cap['height']
    fy = (H / 2) / np.tan(np.radians(cap['views'][0]['fov_y_deg']) / 2); fx = fy; cx, cy = W / 2, H / 2
    lo, hi = np.array(cap['box'][0]), np.array(cap['box'][1]); pad = 0.035; lo = lo - pad; hi = hi + np.array([pad, 0.09, pad])       # room above for the candles
    ax = [np.linspace(lo[i], hi[i], n) for i in range(3)]; X = np.stack(np.meshgrid(*ax, indexing='ij'), -1).reshape(-1, 3); keep = np.ones(len(X), bool); views = []
    for v in cap['views']:
        M = np.array(v['c2w'], float).reshape(4, 4).T; R = np.diag([1.0, -1.0, -1.0]) @ M[:3, :3].T; t = -R @ M[:3, 3]; m = np.asarray(Image.open(os.path.join(D, 'instance_png', v['name'])).convert('L')) > 127
        Xc = X @ R.T + t; u = np.round(fx * Xc[:, 0] / Xc[:, 2] + cx).astype(int); w = np.round(fy * Xc[:, 1] / Xc[:, 2] + cy).astype(int); inside = (Xc[:, 2] > 0) & (u >= 0) & (u < W) & (w >= 0) & (w < H)
        ok = np.zeros(len(X), bool); ok[inside] = m[w[inside], u[inside]]; keep &= ok | ~inside; views.append((R, t, M[:3, 3], np.asarray(Image.open(os.path.join(D, 'images', v['name'].replace('.png', '.jpg'))).convert('RGB'))))
    vol = keep.reshape(n, n, n).astype(np.float32); sp = [(hi[i] - lo[i]) / (n - 1) for i in range(3)]
    verts, faces, normals, _ = measure.marching_cubes(vol, 0.5, spacing=sp); verts = verts + lo
    # colour: for each vertex, the view whose direction is most opposed to the normal (it sees that face most squarely)
    col = np.zeros((len(verts), 3), np.uint8); best = np.full(len(verts), -2.0); nn = normals / np.maximum(1e-9, np.linalg.norm(normals, axis=1, keepdims=True))
    for R, t, C, img in views:
        d = C - verts; d /= np.linalg.norm(d, axis=1, keepdims=True); s = -(nn * d).sum(1); Xc = verts @ R.T + t; u = np.clip(np.round(fx * Xc[:, 0] / Xc[:, 2] + cx).astype(int), 0, W - 1); w = np.clip(np.round(fy * Xc[:, 1] / Xc[:, 2] + cy).astype(int), 0, H - 1)
        sel = s > best; col[sel] = img[w[sel], u[sel]]; best[sel] = s[sel]
    mesh = trimesh.Trimesh(verts, faces[:, ::-1], vertex_colors=np.c_[col, np.full(len(col), 255, np.uint8)], process=False); mesh.export(os.path.join(D, 'carved.glb'))
    # against the truth the carving never saw: the cake's own vertices (capture.json points)
    P = np.array([p[:3] for p in cap['points']]); from scipy.spatial import cKDTree
    d_truth_to_carved = cKDTree(verts).query(P)[0]; d_carved_to_truth = cKDTree(P).query(verts)[0]; size = float(np.linalg.norm(hi - lo))
    res = {'id': cid, 'method': 'visual hull (space carving) from 72 masks and exact cameras; CPU only; not Video2Game', 'voxels': n, 'voxel_mm': round(1000 * max(sp), 2), 'vertices': int(len(verts)), 'faces': int(len(faces)),
           'true_surface_to_carved_mm': {'median': round(1000 * float(np.median(d_truth_to_carved)), 2), 'p95': round(1000 * float(np.percentile(d_truth_to_carved, 95)), 2)},
           'carved_to_true_surface_mm': {'median': round(1000 * float(np.median(d_carved_to_truth)), 2), 'p95': round(1000 * float(np.percentile(d_carved_to_truth, 95)), 2)},
           'carved_box_m': [[round(float(x), 4) for x in verts.min(0)], [round(float(x), 4) for x in verts.max(0)]], 'true_box_m': cap['box'], 'note': 'carved-to-true distances include the candles and plate rim, which are in the masks but not in the truth cloud (clay only)'}
    json.dump(res, open(os.path.join(D, 'carved.json'), 'w'), indent=1); print(json.dumps(res, indent=1))
if __name__ == '__main__':
    a = sys.argv[1:]; main(a[0], int(a[a.index('--n') + 1]) if '--n' in a else 160)

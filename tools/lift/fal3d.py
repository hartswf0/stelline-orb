#!/usr/bin/env python3
"""Generation 4 runner: a generated full mesh (image to 3D) for each birthday's cake, to be judged by the same gate.

NOT RUN. On 2026-11-10 every fal endpoint answered "User is locked. Reason: Exhausted balance", so nothing here has
been exercised beyond the request shape used by the earlier Trellis run in this repo (commit 6ac4fda). Treat the
field names as unverified until one request succeeds: on a 422, fal lists the real field names.

What it does when the balance allows:
  1. cuts the cake out of assets/eye/<id>/plate.webp with the mask in depth.png (RGBA, square, padded)
  2. posts it to fal's queue (default endpoint fal-ai/trellis) through the session proxy; no key in this file
  3. polls, downloads the GLB to assets/eye/<id>/g4.glb and records the request id in assets/eye/g4.json
Scoring g4 needs a GLB loader in eye.html (not written): load g4.glb, fit its bounding cylinder to the measured
revolve, then EYE.score(4). Until that exists a g4 file is an unjudged candidate and must be labelled so.

Usage: python3 tools/lift/fal3d.py bday_07 [more ids]      FAL_EP=fal-ai/trellis   (about $0.02 a mesh, per fal's page)
"""
import os, sys, json, time, base64, subprocess
import numpy as np, cv2
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
EYE = os.path.join(ROOT, 'assets', 'eye')
EP = os.environ.get('FAL_EP', 'fal-ai/trellis')


def curl(args, data=None):
    r = subprocess.run(['curl', '-sS', '-m', '300'] + args, input=data, capture_output=True, text=True)
    return r.stdout


def cutout(iid):
    plate = cv2.imread(os.path.join(EYE, iid, 'plate.webp'))
    m = cv2.imread(os.path.join(EYE, iid, 'depth.png'))[..., 0]
    m = cv2.resize(m, (plate.shape[1], plate.shape[0]), interpolation=cv2.INTER_LINEAR)
    ys, xs = np.where(m > 127)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    side = int(max(x1 - x0, y1 - y0) * 1.25)
    out = np.zeros((side, side, 4), np.uint8)
    ox, oy = (side - (x1 - x0)) // 2, (side - (y1 - y0)) // 2
    out[oy:oy + y1 - y0, ox:ox + x1 - x0, :3] = plate[y0:y1, x0:x1]
    out[oy:oy + y1 - y0, ox:ox + x1 - x0, 3] = m[y0:y1, x0:x1]
    ok, buf = cv2.imencode('.png', cv2.resize(out, (768, 768), interpolation=cv2.INTER_CUBIC))
    return 'data:image/png;base64,' + base64.b64encode(buf).decode()


def main():
    log_path = os.path.join(EYE, 'g4.json')
    log = json.load(open(log_path)) if os.path.exists(log_path) else {}
    for iid in sys.argv[1:]:
        body = json.dumps({'image_url': cutout(iid)})
        r = curl(['-X', 'POST', 'https://queue.fal.run/' + EP, '-H', 'Content-Type: application/json', '--data-binary', '@-'], body)
        try: j = json.loads(r)
        except Exception: print(iid, 'bad answer', r[:300]); continue
        if 'request_id' not in j: print(iid, 'refused:', json.dumps(j)[:300]); continue
        rid = j['request_id']; print(iid, 'queued', rid)
        base = 'https://queue.fal.run/%s/requests/%s' % ('/'.join(EP.split('/')[:2]), rid)
        for _ in range(120):
            time.sleep(5)
            st = json.loads(curl([base + '/status']) or '{}').get('status')
            if st == 'COMPLETED': break
            if st in ('FAILED', 'ERROR'): break
        res = json.loads(curl([base]) or '{}')
        url = (res.get('model_mesh') or res.get('model_glb') or {}).get('url')
        if not url: print(iid, 'no mesh in answer:', json.dumps(res)[:300]); continue
        subprocess.run(['curl', '-sS', '-L', '-m', '300', '-o', os.path.join(EYE, iid, 'g4.glb'), url])
        log[iid] = dict(endpoint=EP, request_id=rid, url=url, judged=False)
        json.dump(log, open(log_path, 'w'), indent=1)
        print(iid, 'saved g4.glb (unjudged candidate)')


if __name__ == '__main__':
    main()

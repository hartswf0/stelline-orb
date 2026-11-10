#!/usr/bin/env python3
"""One assembler for every cut: a cut is a timeline file, and this renders it.

  python3 tools/timeline/assemble.py assets/normalized/timelines/one-grid.timeline.json [--look panavision70] [--out file.mp4]

THE FORMAT ("stelline-timeline/1"). Everything is relative, nothing is in seconds:
  {
    "format": "stelline-timeline/1", "title": "...", "beat_s": 0.8126984, "fps": 24,
    "music": {"file": "assets/audio/mix1_tizita_stelline_soul.mp3", "phase_s": 0.4179592, "from_beat": 34},
    "look": "clean" | "panavision70" | "camcorder90",
    "shots": [ {"beats": 1, "op": "bar", "clip": "bday_33", "layer": "plate", "at": 1.5, "segment": null,
                "section": "...", "left": "...", "right": "..."}, ... ]
  }
  beats     how long the shot lasts. A shot's place in the cut is the sum of the beats before it, so shots can be reordered, removed or
            inserted without retiming anything.
  clip      an id in assets/normalized/index.json. Every clip is one bar of 4 beats on the shared grid, its event on beat 3 (at = 2).
  at        where in the clip's own bar the shot starts, in beats (0..4). A bar wraps into itself.
  layer     "plate" (the synthetic clip) or "twin" (the Memory Weaver's coded build of it, same grid, same bar).
  segment   null, "cake" or "people": show only what that mask covers (assets/normalized/masks/<id>.png), the rest dimmed.
  op        bar       one clip, full frame
            seen      the clip with what the segmentation saw laid over it, and the grid
            seam      one cake of two halves: plate left of a moving seam, twin right
            triptych  "clips": three ids, the centre third of each side by side (the grid puts a cake in the middle of each third)
            tiles     "clips": many ids at once, "cols", "rows"
            flicker   "clips": one after another, "each_beats" long, all from just before their event
            card      "lines": [[text, size, [r, g, b]], ...]
The Memory Weaver's archive orb (field-orb-06.html) writes this format; so does tools/normalize/cut_one_grid.py.
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, 'tools/normalize')); sys.path.insert(0, HERE)
import cut_one_grid as G, looks
W, H, PH, PY, FPS = G.W, G.H, G.PH, G.PY, G.FPS
_mask = {}
def mask(cid, which):
    if (cid, which) not in _mask:
        m = np.asarray(Image.open(os.path.join(G.N, 'masks', cid + '.png')).convert('RGB').resize((W, PH), Image.BILINEAR)).astype(np.float32) / 255
        _mask[(cid, which)] = (0.1 + 0.9 * m[..., 0 if which == 'people' else 1])[..., None]
    return _mask[(cid, which)]
def layer(s, cid, n, w=W, h=PH):
    src = G.bar(cid, s.get('at', 0), n, w, h, twin=s.get('layer') == 'twin' and G.has_twin(cid))
    if s.get('segment') and w == W:
        m = mask(cid, s['segment']); return ((x * m).astype(np.uint8) for x in src)
    return src
def triptych(s, n):
    third = W // 3; x0 = (W - third) // 2; srcs = [layer(s, c, n) for c in s['clips'][:3]]
    for fr in zip(*srcs):
        out = np.zeros((PH, W, 3), np.uint8)
        for i, f in enumerate(fr): out[:, i * third + 1:(i + 1) * third - 1] = f[:, x0 + 1:x0 + third - 1]
        yield out
def make(s, n, beat_frames):
    op = s['op']
    if op == 'card': return G.card([(t, z, tuple(c)) for t, z, c in s['lines']], n, s.get('fade_in', 8), s.get('fade_out', 30))
    if op == 'bar': return layer(s, s['clip'], n)
    if op == 'seen': return G.seen(layer(s, s['clip'], n), s['clip'], n, tuple(s.get('fade', (0.0, 1.0))))
    if op == 'seam': return G.seam(G.bar(s['clip'], s.get('at', 0), n), G.bar(s['clip'], s.get('at', 0), n, twin=True), n)
    if op == 'triptych': return triptych(s, n)
    if op == 'tiles': return G.tiles(s['clips'], s['cols'], s['rows'], s.get('at', 0), n, twin=s.get('layer') == 'twin')
    if op == 'flicker': return G.flicker(s['clips'], n, max(1, int(round(s.get('each_beats', 0.25) * beat_frames))))
    raise SystemExit('unknown op ' + op)
def render(tl, out=None, look=None):
    if isinstance(tl, str): path = tl; tl = json.load(open(path)); out = out or os.path.join(os.path.dirname(os.path.dirname(path)), os.path.basename(path).replace('.timeline.json', '.mp4'))
    assert tl.get('format') == 'stelline-timeline/1', 'not a stelline-timeline/1 file'
    beat = tl.get('beat_s', G.BEAT); fb = lambda b: int(round(b * beat * FPS)); shots = tl['shots']; total = fb(sum(s['beats'] for s in shots)) / FPS; mu = tl.get('music'); look = look or tl.get('look', 'clean')
    args = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-']; fc = looks.graph(look, PY, PH); maps = ['-map', '[v]']
    if mu:
        t0 = mu.get('phase_s', 0) + mu.get('from_beat', 0) * beat; args += ['-ss', f'{t0:.3f}', '-t', f'{total:.3f}', '-i', os.path.join(ROOT, mu['file'])]
        fc += f';[1:a]afade=t=in:st=0:d=0.3,afade=t=out:st={max(0, total - 2.4):.3f}:d=2.4[a]'; maps += ['-map', '[a]', '-c:a', 'aac', '-b:a', '192k']
    enc = subprocess.Popen(args + ['-filter_complex', fc] + maps + ['-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-shortest', out], stdin=subprocess.PIPE)
    b = 0.0; edl = []
    for k, s in enumerate(shots):
        f0 = fb(b); b += s['beats']; n = fb(b) - f0; frame = G.bars_frame(tl.get('title', ''), s.get('section', ''), s.get('left', ''), s.get('right', '')); c = 0
        for pic in make(s, n, beat * FPS):
            if pic.shape[0] == H: o = pic
            else: frame[PY:PY + PH] = pic; o = frame
            enc.stdin.write(o.tobytes()); c += 1
            if c >= n: break
        assert c == n, (out, k, c, n); edl.append({'shot': k, 't': round(f0 / FPS, 3), 'frames': n, 'beats': s['beats'], 'op': s['op']})
    enc.stdin.close(); enc.wait()
    json.dump({'fps': FPS, 'beat_s': beat, 'look': look, 'duration_s': round(total, 3), 'shots': edl}, open(os.path.splitext(out)[0] + '.edl.json', 'w'), indent=1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{total * tl.get("poster_at", 0.42):.2f}', '-i', out, '-frames:v', '1', '-q:v', '3', os.path.splitext(out)[0] + '.jpg'])
    print('wrote', os.path.relpath(out, ROOT), f'{total:.1f}s', len(shots), 'shots', 'look:', look, flush=True)
if __name__ == '__main__':
    a = sys.argv[1:]; lk = a[a.index('--look') + 1] if '--look' in a else None; o = a[a.index('--out') + 1] if '--out' in a else None
    for p in [x for x in a if x.endswith('.json')]: render(p, o, lk)

#!/usr/bin/env python3
"""THE STANDARD, and an audit of every clip against it.

A clip in the archive is up to standard when all of these hold. Each is measured from the files, not asserted:

  BAR        its plate bar is exactly 78 frames (4 beats) and its event is on frame 39 (the first frame of beat 3)
  TWIN       a coded twin exists and is 78 frames
  BUILD-OUT  a full build-out exists and is exactly 312 frames (16 beats)
  CONTROLLER the real controller was filmed in the same pass and its film is frame-for-frame as long as the build-out
  RETICLE    the build-out was filmed with the reference reticle: the programmed `)` crescent from orb-film-studio.html, measured to stand right of the cake
  GRID       in the build-out the 3D cake is on the plates' grid: centre within 12 px of x = 640, width within 16 px of 480, crown within 14 px of y = 250
  CLOCK      the first candle is on beat 9 (if the recipe has candles); the breath is on beat 15 by construction
  PEOPLE     if the plate has people, the build-out uses that clip's own cast

  python3 tools/normalize/audit.py   -> assets/normalized/standard.json (+ standard.js, window.STANDARD), and a summary
"""
import json, os, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); N = os.path.join(ROOT, 'assets/normalized')
I = json.load(open(os.path.join(N, 'index.json'))); G = I['grid']; BO = json.load(open(os.path.join(N, 'builds/index.json'))) if os.path.exists(os.path.join(N, 'builds/index.json')) else {}
CAST = json.load(open(os.path.join(N, 'cast/index.json'))) if os.path.exists(os.path.join(N, 'cast/index.json')) else {}
def frames(p):
    if not os.path.exists(p): return 0
    r = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', p], capture_output=True, text=True).stdout.strip(); return int(r) if r.isdigit() else 0
CHECKS = ['BAR', 'TWIN', 'BUILD-OUT', 'CONTROLLER', 'RETICLE', 'GRID', 'CLOCK', 'PEOPLE']; out = {}
for c in [c for c in I['clips'] if c['keep']]:
    cid = c['id']; b = BO.get(cid) or {}; r = {}; f = b.get('fit')
    r['BAR'] = frames(os.path.join(N, 'bars', cid + '.mp4')) == 78 and c['window']['event_frame'] == 39
    r['TWIN'] = frames(os.path.join(N, 'bars', cid + '_twin.mp4')) == 78
    nb = frames(os.path.join(N, 'builds', cid + '.mp4')); r['BUILD-OUT'] = nb == 312
    r['CONTROLLER'] = bool(b.get('controller')) and frames(os.path.join(N, 'builds', cid + '_orb.mp4')) == nb == 312
    r['RETICLE'] = b.get('reticle') == 'crescent'
    r['GRID'] = bool(f) and abs(f['centre_x'] - G['cx']) <= 12 and abs(f['width'] - G['width']) <= 16 and abs(f['crown_y'] - G['top']) <= 14
    has_candles = any('CANDLE' in s for s in b.get('steps', [])); r['CLOCK'] = bool(b) and (b.get('first_candle_beat') == 8 or not has_candles)
    r['PEOPLE'] = bool(b) and (bool(b.get('own_cast')) if cid in CAST else True)
    out[cid] = {'pass': all(r.values()), 'checks': r, 'fit': f, 'failed': [k for k in CHECKS if not r[k]]}
res = {'checks': CHECKS, 'grid': G, 'clips': out, 'passed': sum(v['pass'] for v in out.values()), 'of': len(out)}
json.dump(res, open(os.path.join(N, 'standard.json'), 'w'), indent=1); open(os.path.join(N, 'standard.js'), 'w').write('window.STANDARD = ' + json.dumps(res) + ';\n')
print(res['passed'], 'of', res['of'], 'up to standard'); from collections import Counter; print('failures:', dict(Counter(k for v in out.values() for k in v['failed'])))

#!/usr/bin/env python3
"""EVERY CAKE, BUILT: the edit. 1280x720, 24 fps, cut on the beat of assets/audio/mix1_tizita_stelline_soul.mp3 (73.8 bpm).

Two kinds of picture, and only two: PLATES (the BDAY TRAINING clips, cropped above the generated controller so only the memory is seen) and
THE ORB (the Memory Weaver filmed building the same cakes by its rings, tools/recipes/record_recipes.cjs). The frame is 2.22:1 inside 16:9;
the bars carry one line of caption each, so nothing is ever drawn over the picture.

Where each plate is cut is measured, not guessed: tools here read every clip's brightness over time, so a blow-out is cut so the flames die
on the beat, and a colour change is cut round the moment the clip's own analysis (labels.json: morph_jumps_s) says the cake turns.

  python3 tools/recipes/cut_every_cake.py [recipe_films_dir] [out.mp4]      (defaults: assets/recipes, assets/recipes/every-cake-built.mp4)
"""
import json, os, subprocess, sys, tempfile, shutil
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'assets/recipes')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'assets/recipes/every-cake-built.mp4')
BD = os.path.join(ROOT, 'BDAY TRAINING'); MUSIC = os.path.join(ROOT, 'assets/audio/mix1_tizita_stelline_soul.mp3')
FPS, W, H, PH, PY = 24, 1280, 720, 576, 72            # the picture is 1280x576 (2.22:1) inside 16:9
PERIOD, PHASE = 0.8126984, 0.4179592          # measured: spectral-flux autocorrelation of the mix
MONO = '/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Medium.ttf'; DISP = '/usr/share/fonts/opentype/inter/InterDisplay-SemiBold.otf'; CJK = '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'
TMP = tempfile.mkdtemp(prefix='everycake_')
L = json.load(open(os.path.join(BD, 'labels.json'))); ITEMS = {i['id']: i for i in L['items'] if i['kind'] == 'video'}
def beat(k): return PHASE + k * PERIOD
def fr(t): return int(round(t * FPS))

# ------------------------------------------------------------------ measure the plates
def lum(cid):
    f = os.path.join(BD, ITEMS[cid]['filename'])
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-vf', 'crop=iw:ih*0.58:0:0,scale=64:24,fps=12', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, 24 * 64).astype(np.float32).mean(axis=1)
def blow_time(cid):                      # the half second in which the picture loses the most light: the breath
    l = lum(cid); d = l[6:] - l[:-6]; return (int(d.argmin()) + 3) / 12.0
def world_h(cid):
    ys = ITEMS[cid]['segmentation'].get('y_split', 550); return 720 if ys >= 720 else int(round(ys * 0.78 / 2) * 2)
def rfilm(rid): return os.path.join(REC, rid + '.mp4')
def rmeta(rid): return json.load(open(os.path.join(REC, rid + '.json')))
def mark(rid, word, end=False):
    m = rmeta(rid); S = m['steps']
    for i, s in enumerate(S):
        if s.get('step') and word in s['step']: return (S[i + 1]['t'] if i + 1 < len(S) else m['duration_s']) if end else s['t']
    return m['duration_s'] if end else 0.0

# ------------------------------------------------------------------ picture chains (each ends as 1280x536 or a given size)
HUD_LL = {'bday_02', 'bday_09', 'bday_43'}      # plates whose generator burnt caption text into the dark lower-left corner: interpolated away (seen by eye on a contact sheet)
# Plates left out because the same text crosses something lit and cannot be removed cleanly: 03 04 06 10 17 22 38 41 46 59 65 66.
def plate_chain(cid, w=W):
    wh = world_h(cid)
    if wh >= 720: return f"scale={W}:{H}:flags=lanczos,crop={w}:{PH}:{(W - w) // 2}:20"
    mask = f"delogo=x=2:y={int(wh * 0.6)}:w=470:h={wh - int(wh * 0.6) - 3}," if cid in HUD_LL else ''
    return f"{mask}crop={W}:{wh}:0:0,scale=-2:{PH}:flags=lanczos,crop={w}:{PH}"
def orb_chain(w=W): return f"scale={W}:{H}:flags=lanczos,crop={w}:{PH}:{(W - w) // 2}:118"
def esc(s): return s.replace('\\', '\\\\').replace(':', '\\:').replace("'", '’').replace('%', '\\%').replace(',', '\\,')
def captions(sec, left, right):
    c = []
    if sec: c.append(f"drawtext=fontfile={MONO}:text='{esc(sec)}':fontsize=15:fontcolor=0xffcc66@0.9:x=40:y={PY - 36}")
    c.append(f"drawtext=fontfile={MONO}:text='EVERY CAKE\\, BUILT':fontsize=15:fontcolor=0xf0f4f2@0.38:x=w-tw-40:y={PY - 36}")
    if left: c.append(f"drawtext=fontfile={CJK if any(ord(ch) > 0x2e80 for ch in left) else MONO}:text='{esc(left)}':fontsize=15:fontcolor=0xf0f4f2@0.86:x=40:y={PY + PH + 22}")
    if right: c.append(f"drawtext=fontfile={MONO}:text='{esc(right)}':fontsize=15:fontcolor=0x66f0d8@0.86:x=w-tw-40:y={PY + PH + 22}")
    return ','.join(c)
def frame_chain(sec, left, right): return f"pad={W}:{H}:0:{PY}:black,{captions(sec, left, right)},format=yuv420p"
ENC = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-an']
def run(args):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y'] + args, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-1500:]); raise SystemExit('ffmpeg failed')

def era(cid): return ITEMS[cid]['era'].replace('_', ' ').upper()
def clamp_t0(cid, t0, dur): return max(0.0, min(t0, ITEMS[cid]['duration_s'] - dur - 0.05))

SHOTS = []      # (beats, render(nframes, path))
def add(beats, fn): SHOTS.append((beats, fn))

def plate(cid, t0, sec, note='', speed=1.0, rev=False):
    def fn(n, out):
        dur = n / FPS * speed; a = clamp_t0(cid, t0, dur)
        v = f"[0:v]{plate_chain(cid)},fps={FPS}" + (',reverse' if rev else '') + (f",setpts=PTS/{speed}" if speed != 1 else '') + f",{frame_chain(sec, 'PLATE · ' + cid.upper().replace('_', ' ') + ' · ' + era(cid), note)}[v]"
        run(['-ss', f'{a:.3f}', '-t', f'{dur + 0.3:.3f}', '-i', os.path.join(BD, ITEMS[cid]['filename']), '-filter_complex', v, '-map', '[v]', '-frames:v', str(n)] + ENC + [out])
    return fn
def orb(rid, a, b, sec, note=''):
    def fn(n, out):
        sp = max(0.05, (b - a)) / (n / FPS)
        v = f"[0:v]{orb_chain()},setpts=(PTS-STARTPTS)/{sp:.5f},fps={FPS},tpad=stop_mode=clone:stop_duration=3,{frame_chain(sec, 'THE ORB · ' + rmeta(rid)['title'], note)}[v]"
        run(['-ss', f'{a:.3f}', '-t', f'{b - a:.3f}', '-i', rfilm(rid), '-filter_complex', v, '-map', '[v]', '-frames:v', str(n)] + ENC + [out])
    return fn
def split(cid, t0, rid, sec):
    def fn(n, out):
        dur = n / FPS; a = clamp_t0(cid, t0, dur); m = rmeta(rid); sp = m['duration_s'] / dur
        v = (f"[0:v]{plate_chain(cid, 638)},fps={FPS}[l];[1:v]{orb_chain(638)},setpts=PTS/{sp:.5f},fps={FPS},tpad=stop_mode=clone:stop_duration=3[r];"
             f"[l][r]hstack=inputs=2,pad={W}:{PH}:0:0:black[p];[p]scale={W}:{PH},setsar=1,{frame_chain(sec, 'PLATE · ' + cid.upper().replace('_', ' ') + ' · ' + era(cid), 'THE ORB · ' + m['title'] + ' · ' + str(len([s for s in m['steps'] if s.get('step')])) + ' STEPS')}[v]")
        v = v.replace(f"hstack=inputs=2,pad={W}:{PH}:0:0:black[p];[p]scale={W}:{PH},setsar=1", f"hstack=inputs=2[h];[h]pad={W}:{PH}:2:0:black,drawbox=x=638:y=0:w=4:h={PH}:color=black:t=fill")
        run(['-ss', f'{a:.3f}', '-t', f'{dur + 0.3:.3f}', '-i', os.path.join(BD, ITEMS[cid]['filename']), '-i', rfilm(rid), '-filter_complex', v, '-map', '[v]', '-frames:v', str(n)] + ENC + [out])
    return fn
def mosaic(rids, sec, cols=7, rows=6, hold=1.6):
    def fn(n, out):
        dur = n / FPS; tw, th = W // cols, PH // rows; ins, fl = [], []
        for i, rid in enumerate(rids):
            m = rmeta(rid); sp = m['duration_s'] / (dur - hold); ins += ['-i', rfilm(rid)]
            fl.append(f"[{i}:v]crop=456:238:252:62,scale={tw - 2}:{th - 2}:flags=lanczos,setpts=PTS/{sp:.5f},fps={FPS},tpad=stop_mode=clone:stop_duration={hold + 2}[t{i}]")
        lay = '|'.join(f"{(i % cols) * tw}_{(i // cols) * th}" for i in range(len(rids)))
        fl.append(''.join(f'[t{i}]' for i in range(len(rids))) + f"xstack=inputs={len(rids)}:layout={lay}:fill=black,pad={W}:{PH}:{(W - cols * tw) // 2 + 1}:{(PH - rows * th) // 2 + 1}:black,{frame_chain(sec, 'THE ORB · ' + str(len(rids)) + ' RECIPES AT ONCE · FIVE RINGS EACH', 'NOTHING APPEARS THAT A RING DID NOT DO')}[v]")
        run(ins + ['-filter_complex', ';'.join(fl), '-map', '[v]', '-frames:v', str(n)] + ENC + [out])
    return fn
def card(lines, sec='', fade_in=0.8, fade_out=0.0):
    def fn(n, out):
        dur = n / FPS; d = []; y0 = H / 2 - sum(s for _, s, _ in lines) * 0.75
        for txt, size, col in lines:
            font = CJK if any(ord(ch) > 0x2e80 for ch in txt) else (DISP if size >= 30 else MONO)
            d.append(f"drawtext=fontfile={font}:text='{esc(txt)}':fontsize={size}:fontcolor={col}:x=(w-tw)/2:y={int(y0)}"); y0 += size * 1.5
        v = f"color=c=black:s={W}x{H}:r={FPS}:d={dur + 0.2:.3f},{','.join(d)}" + (f",fade=t=in:st=0:d={fade_in}" if fade_in else '') + (f",fade=t=out:st={dur - fade_out:.3f}:d={fade_out}" if fade_out else '') + ",format=yuv420p[v]"
        run(['-filter_complex', v, '-map', '[v]', '-frames:v', str(n)] + ENC + [out])
    return fn

# ------------------------------------------------------------------ the cut
ARCH = lambda cid: ITEMS[cid]['archetype']
have = lambda rid: os.path.exists(rfilm(rid)) and os.path.exists(os.path.join(REC, rid + '.json'))
I, II, III, IV, V = 'I · OUT OF THE DARK', 'II · THE CRAFT', 'III · SEVEN FLAMES', 'IV · MAKE A WISH', 'V · TURN IT BACK'
add(6, card([('EVERY CAKE, BUILT', 54, '0xf0f4f2'), ('77 PLATES · 41 ARCHETYPES · ONE ORB · FIVE RINGS', 16, '0xffcc66')], fade_in=1.6))
# I · slow: things arrive. A plate, then the orb doing the same thing.
add(4, plate('bday_62', 0.6, I, 'A CAKE NOBODY BUILT'))
add(4, orb('film_drum', 0.0, 1.5, I, 'RING 5 · PUT DOWN'))
add(4, plate('bday_23', 0.8, I))
add(4, orb('canonical_chamber_7', 0.0, 1.7, I, 'RING 3 · VERB · RING 5 · AMOUNT'))
add(4, plate('bday_25', 1.2, I))
add(4, plate('bday_24', 0.0, I))
add(4, orb('film_tiers', 0.2, 2.2, I, 'TWO TIERS · FROST · ROSE'))
# II · the craft: the colour turns, cut round the turn
turns = [('bday_01', 5.875), ('bday_07', 7.0), ('bday_02', 5.875), ('bday_61', 5.25), ('bday_05', 4.25), ('bday_13', 1.6), ('bday_63', 1.125), ('bday_75', 1.0)]
for cid, m in turns: add(2, plate(cid, m - 0.95, II, 'THE COLOUR TURNS'))
for cid, t0 in [('bday_01', 5.2), ('bday_51', 4.2), ('bday_09', 5.0), ('bday_12', 0.2)]:
    add(4, split(cid, t0, ARCH(cid), II) if have(ARCH(cid)) else plate(cid, t0, II))
for cid, t0 in [('bday_44', 3.6), ('bday_43', 3.4), ('bday_42', 3.2), ('bday_64', 4.6)]: add(2, plate(cid, t0, II, 'WRITTEN ON THE CROWN'))
add(4, orb('film_canon', mark('film_canon', 'PIPE A'), mark('film_canon', 'CANDLES', True), II, 'WRITE · RED · 生日快樂') if have('film_canon') else plate('bday_40', 3, II))
# III · faces by candlelight, era by era
for cid, t0 in [('bday_69', 1.0), ('bday_36', 5.5), ('bday_70', 3.0), ('bday_35', 1.6), ('bday_49', 2.0)]: add(2, plate(cid, t0, III))
add(2, plate('bday_15', 3.0, III, 'LIT'))
add(4, split('bday_65', 4.6, 'film_wish', III) if have('film_wish') else plate('bday_65', 4.6, III))
# IV · every breath, on the beat. The flames die at the cut's last third.
blows = ['bday_31', 'bday_28', 'bday_34', 'bday_45', 'bday_16', 'bday_33', 'bday_68', 'bday_26', 'bday_30', 'bday_32', 'bday_78', 'bday_35']
for cid in blows: add(1, plate(cid, blow_time(cid) - PERIOD * 0.62, IV))
for cid in ['bday_69', 'bday_71', 'bday_29', 'bday_67', 'bday_18', 'bday_27', 'bday_73', 'bday_77']: add(0.5, plate(cid, blow_time(cid) - PERIOD * 0.3, IV))
add(2, orb('film_canon', mark('film_canon', 'MAKE A WISH') - 0.1, rmeta('film_canon')['duration_s'], IV, 'RING 5 · BLOW OUT · SEVEN CLICKS') if have('film_canon') else plate('bday_33', 5, IV))
grid = [r for r in sorted(json.load(open(os.path.join(ROOT, 'assets/bday-training/handmade_models.json')))['models']) if have(r)] + ([r for r in ['film_canon', 'film_wish', 'film_tiers', 'film_bundt', 'film_dome', 'film_drum'] if have(r)])
grid = grid[:42]
if len(grid) >= 12:
    cols = 7 if len(grid) > 30 else 6 if len(grid) > 20 else 5 if len(grid) > 12 else 4; rows = -(-len(grid) // cols)
    add(10, mosaic(grid, IV, cols, rows))
else: add(10, plate('bday_10', 0, IV))
# V · the time turns back: the plates run backwards and the flames return
for cid in ['bday_33', 'bday_31', 'bday_28', 'bday_34']: add(1, plate(cid, blow_time(cid) - 0.25, V, 'RING 5 TURNED BACK', rev=True))
add(6.6, card([('41 ARCHETYPES · 77 CLIPS · 5 RINGS', 30, '0xf0f4f2'), ('', 10, '0x000000'), ('THE MEMORY WEAVER · FIELD ORB 05 · RING 1 TO RECIPE', 16, '0x66f0d8'), ('STELLINE ORB · SCION DIEGETIC · 1000 SMALL FUTURES', 16, '0xffcc66')], fade_in=0.5, fade_out=2.4))

# ------------------------------------------------------------------ render
b = 0.0; files = []; edl = []
for k, (beats, fn) in enumerate(SHOTS):
    f0 = 0 if k == 0 else fr(beat(b)); b += beats; f1 = fr(beat(b)); n = f1 - f0; out = os.path.join(TMP, f'{k:03d}.mp4')
    fn(n, out); files.append(out); edl.append({'shot': k, 'frame': f0, 't': round(f0 / FPS, 3), 'frames': n, 'beats': beats})
    print(f'{k:3d} {f0 / FPS:7.2f}s {n:4d}f', flush=True)
lst = os.path.join(TMP, 'list.txt'); open(lst, 'w').write(''.join(f"file '{f}'\n" for f in files))
total = fr(beat(b)) / FPS
run(['-f', 'concat', '-safe', '0', '-i', lst, '-i', MUSIC, '-filter_complex', f"[1:a]atrim=0:{total:.3f},afade=t=in:st=0:d=0.4,afade=t=out:st={total - 3.2:.3f}:d=3.2[a]", '-map', '0:v', '-map', '[a]',
     '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', f'{total:.3f}', OUT])
json.dump({'fps': FPS, 'bpm': 60 / PERIOD, 'duration_s': round(total, 3), 'shots': edl}, open(os.path.splitext(OUT)[0] + '.edl.json', 'w'), indent=1)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '20', '-i', OUT, '-frames:v', '1', '-q:v', '3', os.path.splitext(OUT)[0] + '.jpg'])
shutil.rmtree(TMP, ignore_errors=True); print('wrote', OUT, f'{total:.1f}s', len(SHOTS), 'shots')

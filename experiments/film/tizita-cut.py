# Cuts the Tizita music video: the song is the clock. Real film where the song breathes or where her lines are; the orb everywhere else.
# Two mixes: song + her lines + the device's own clicks from the take; song + her lines only. Film audio and footage stay on this machine.
import json, subprocess, os, numpy as np
from scipy.io import wavfile
from scipy.signal import resample
W = os.environ.get('W', '/home/claude/stelline-work/mv/'); M = '/home/claude/stelline-work/film/memory.mp4'; SR = 48000; FPS = 30; END = 209.8
# [song start, song end, source start, keep her voice]
REAL = [(0.0, 5.6, 128.4, 0), (5.6, 11.6, 137.5, 0), (11.6, 13.7, 167.3, 0),
        (24.6, 28.1, 190.8, 1), (44.5, 46.6, 145.0, 0), (57.6, 61.0, 223.3, 1), (84.2, 88.2, 152.0, 0), (98.1, 100.4, 256.2, 1),
        (133.5, 146.3, 256.0, 1), (146.3, 150.05, 213.25, 0)]
def run(a): subprocess.run(a, check=True)
ENC = ['-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-r', '30', '-an']
segs = []; t = 0.0; k = 0; os.makedirs(W + 'seg', exist_ok=True)
for a, b, src, _ in REAL + [(END, END, 0, 0)]:
    if a > t + 1e-6:                                    # the orb from t to a
        n0, n1 = round(t * FPS), round(a * FPS); name = W + f'seg/{k:02d}.mp4'; fade = ',fade=in:st=0:d=0.25' if k else ''
        if a >= END: fade += f',fade=out:st={(n1 - n0) / FPS - 4:.2f}:d=4'
        run(['ffmpeg', '-loglevel', 'error', '-y', '-framerate', '30', '-start_number', str(n0), '-i', W + 'f/%05d.jpg', '-frames:v', str(n1 - n0), '-vf', 'format=yuv420p' + fade] + ENC + [name + '.tmp.mp4'])
        os.replace(name + '.tmp.mp4', name); segs.append(name); k += 1
    if b > a:
        name = W + f'seg/{k:02d}.mp4'; n = round(b * FPS) - round(a * FPS)
        run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(src), '-i', M, '-frames:v', str(n), '-vf', 'scale=1280:720,fps=30,format=yuv420p' + (',fade=in:st=0:d=1.2' if a == 0 else '')] + ENC + [name + '.tmp.mp4'])
        os.replace(name + '.tmp.mp4', name); segs.append(name); k += 1
    t = max(t, b)
open(W + 'cat.txt', 'w').write(''.join(f"file '{s}'\n" for s in segs))
run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', W + 'cat.txt', '-c', 'copy', W + 'video.mp4'])
# ---- sound
def dec(path, ss=None, dur=None):
    a = ['ffmpeg', '-loglevel', 'error'] + (['-ss', str(ss), '-t', str(dur)] if ss is not None else []) + ['-i', path, '-vn', '-ac', '2', '-ar', str(SR), '-f', 's16le', '-']
    return np.frombuffer(subprocess.run(a, capture_output=True, check=True).stdout, np.int16).reshape(-1, 2).astype(float) / 32768
L = int(END * SR); song = dec(W + 'song.ogg')[:L]; song = np.pad(song, ((0, L - len(song)), (0, 0)))
voice = np.zeros((L, 2)); duck = np.ones(L)
for a, b, src, v in REAL:
    if not v: continue
    x = dec(M, src, b - a); i = int(a * SR); n = min(len(x), L - i); e = np.ones(n); r = int(.15 * SR); e[:r] = np.linspace(0, 1, r); e[-r:] = np.linspace(1, 0, r)
    voice[i:i + n] += x[:n] * e[:, None] * 1.35
    d = np.ones(n) * .3; rr = int(.35 * SR); d[:rr] = np.linspace(1, .3, rr); d[-rr:] = np.linspace(.3, 1, rr); duck[i:i + n] = np.minimum(duck[i:i + n], d)
# the device: clicks at each detent the orb's rings crossed in the take, its tick on presses, its comb when a birthday lands
D = json.load(open(W + 'take.json')); st = D['st']; DV = json.load(open('/home/claude/stelline-work/film2/grains/device.json'))
G = {k: [np.array(g) / max(1e-9, np.abs(np.array(g)).max()) for g in v] for k, v in DV['g'].items()}; rng = np.random.default_rng(5)
dev = np.zeros((L, 2)); DET = 2 * np.pi / 36
def put(sig, t, pan, g):
    i = int(t * SR)
    if i < 0 or i >= L: return
    n = min(len(sig), L - i); dev[i:i + n, 0] += sig[:n] * g * np.cos((pan + 1) * np.pi / 4) * 1.41; dev[i:i + n, 1] += sig[:n] * g * np.sin((pan + 1) * np.pi / 4) * 1.41
cutaway = lambda tt: any(a <= tt < b for a, b, _, _ in REAL)
ang = np.array([s['ang'] for s in st]); song_t = np.array([s['song'] for s in st])
for i in range(ang.shape[1]):
    w = np.gradient(ang[:, i]) * 30; pan = -.5 + i * .25
    for f in range(1, len(st)):
        a0, a1 = ang[f - 1, i], ang[f, i]
        for kk in range(int(np.floor(min(a0, a1) / DET)) + 1, int(np.floor(max(a0, a1) / DET)) + 1):
            u = (kk * DET - a0) / (a1 - a0); tt = song_t[f - 1] + u / 30
            if cutaway(tt): continue
            g = G['ratchet' if abs(w[f]) > 9 else 'click'][rng.integers(len(G['ratchet' if abs(w[f]) > 9 else 'click']))]
            put(resample(g, int(len(g) / (1 + (i - 2) * .045))), tt, pan, .5 * min(1.3, .4 + abs(w[f]) / 6))
for f in range(1, len(st)):
    if st[f]['title'] != st[f - 1]['title'] and not cutaway(song_t[f]): put(G['comb'][0], song_t[f] - .04, 0, .3)
for ev in D['log']:
    if ev['k'] == 'press':
        tt = song_t[0] + (ev['t'] - st[0]['now']) + 1 / 30
        if not cutaway(tt): put(G['tick'][rng.integers(len(G['tick']))], tt, .4, .3)
def write(name, x):
    x = x / max(1e-9, np.abs(x).max()) * .95; e = np.ones(L); r = int(4 * SR); e[-r:] = np.linspace(1, 0, r); x = x * e[:, None]
    wavfile.write(W + name + '.wav', SR, (x * 32767).astype(np.int16))
    run(['ffmpeg', '-loglevel', 'error', '-y', '-i', W + 'video.mp4', '-i', W + name + '.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', W + 'tizita-' + name + '.mp4'])
    print(name, os.path.getsize(W + 'tizita-' + name + '.mp4') // 1e6, 'MB')
write('with-the-device', song * duck[:, None] + voice + dev * .55)
write('song-and-her', song * duck[:, None] + voice)
# the whole scene underneath: the original clip's sound from her walk onward runs beneath the song the whole way, low, so the room is always there
bed = dec(M, 128.4, END)[:L]; bed = np.pad(bed, ((0, L - len(bed)), (0, 0)))
write('song-and-the-scene', song * duck[:, None] + voice + bed * .32 * ((duck - .3) / .7)[:, None] + dev * .45)

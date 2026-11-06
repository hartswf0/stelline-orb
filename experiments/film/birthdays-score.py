# The sound for the birthdays film, built from what the orb did in the take, frame by frame:
#   each ring clicks at the moment its knurl passes a detent (interpolated inside the frame), louder the faster it turns,
#   and purrs with a filtered whirr while it spins; presses thump; the page's own tones play;
#   the camera's drift moves air; each era has its machine (projector flutter for film, tape hiss for video);
#   a breath and a low swell when a birthday lands; candle crackle while flames burn.
# Writes three mixes of the whole film: voice (her words forward), memory (her words far away), machine (the orb alone between the real clips).
# Film audio is read from the original clip and never leaves this machine.
import json, numpy as np, subprocess
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile
SR = 48000; rng = np.random.default_rng(11); W = '/home/claude/stelline-work/film2/'
d = json.load(open(W + 'take.json')); st = d['st']; log = d['log']; nF = len(st); now0 = st[0]['now'] - 1 / 30
# the edit: [film start, source, src start, length]
A1 = (0.0, 'film', 128.4, 5.6); A2 = (5.6, 'film', 137.5, 4.0); A = (0.0, 'film', 0, 9.6); B = (9.6, 'take', 0.0, 30.0); C = (39.6, 'film', 152.0, 4.0); D = (43.6, 'take', 30.0, nF / 30 - 30.0)
EDIT = [A1, A2, B, C, D]; TOT = D[0] + D[3]; L = int(TOT * SR)
def take2film(t): return B[0] + t if t < 30 else D[0] + (t - 30)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'highpass', fs=SR, output='sos'), x)
def env(n, tau): return np.exp(-np.arange(n) / (tau * SR))
def mk(): return np.zeros((L, 2))
def put(buf, sig, t, pan=0.):
    i = int(t * SR)
    if i < 0 or i >= L: return
    n = min(len(sig), L - i); g = np.array([np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)]) * 1.41
    buf[i:i + n] += sig[:n, None] * g[None, :]
def film(t0, dur):
    r = subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(t0), '-t', str(dur), '-i', W + '../film/memory.mp4', '-vn', '-ac', '2', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True)
    return np.frombuffer(r.stdout, np.int16).reshape(-1, 2).astype(float) / 32768
def place(buf, x, t, g=1.):
    i = int(t * SR); n = min(len(x), L - i); buf[i:i + n] += x[:n] * g
def fades(x, a=.25, b=.25):
    n = len(x); e = np.ones(n); na, nb = int(a * SR), int(b * SR); e[:na] = np.linspace(0, 1, na); e[n - nb:] = np.linspace(1, 0, nb); return x * e[:, None]
MECH, AMB, VOICE, REAL = mk(), mk(), mk(), mk()
# the device's own sounds, cut from the scene where she turns it (136-170 s): detent clicks, a ratchet, ticks, a whirr, a comb
from scipy.signal import resample
DV = json.load(open(W + 'grains/device.json')); assert DV['sr'] == SR; GR = {k: [np.array(g) for g in v] for k, v in DV['g'].items()}
def grain(kind, pitch=1.):
    g = GR[kind][rng.integers(len(GR[kind]))]; return resample(g, max(8, int(len(g) / pitch))) if pitch != 1 else g
def norm1(x): return x / max(1e-9, np.abs(x).max())
# ---- the real clips, with their own sound
place(REAL, fades(film(A1[2], A1[3] + .1), .02, .1), A1[0]); place(REAL, fades(film(A2[2], A2[3]), .1, .35), A2[0]); place(REAL, fades(film(C[2], C[3]), .3, .3), C[0])
# ---- her voice under the orb: the same seconds the little screen shows
place(VOICE, fades(film(192.0, 30.0), .6, .8), B[0]); place(VOICE, fades(film(256.0, 11.0), .5, 1.2), D[0])
# ---- the rings: detent crossings from the logged angles
TAU = 2 * np.pi; DET = TAU / 36; RF = [2700, 2300, 1900, 2500, 3100]; NR = len(st[0]['ang'])
for i in range(NR):
    ang = np.array([s['ang'][i] for s in st]); w = np.gradient(ang) * 30           # rad/s
    pan = -.55 + 1.1 * i / max(1, NR - 1)
    for f in range(1, nF):
        a0, a1 = ang[f - 1], ang[f]; k0, k1 = np.floor(a0 / DET), np.floor(a1 / DET)
        if k0 == k1: continue
        for k in range(int(min(k0, k1)) + 1, int(max(k0, k1)) + 1):
            u = (k * DET - a0) / (a1 - a0) if a1 != a0 else 0; t = (f - 1 + u) / 30
            if 29.95 < t < 30.05: continue
            v = min(1.4, .35 + abs(w[f]) / 6); n = int(.045 * SR); tt = np.arange(n) / SR
            g = norm1(grain('ratchet' if abs(w[f]) > 9 else 'click', 1 + (i - 2) * .045 + rng.uniform(-.015, .015)))
            put(MECH, g * .5 * v, take2film(t), pan)
    # whirr: friction noise that follows the ring's speed
    sp = np.abs(w); spS = np.interp(np.arange(L) / SR, [take2film(f / 30) for f in range(nF)], sp, left=0, right=0)
    wh = norm1(GR['whirr'][0]); loop = np.tile(np.concatenate([wh, wh[::-1]]), L // (2 * len(wh)) + 1)[:L]
    nz = np.roll(loop, i * 7919) * np.minimum(1, spS / 9) ** 1.3 * .09
    MECH[:, 0] += nz * np.cos((pan + 1) * np.pi / 4) * 1.41; MECH[:, 1] += nz * np.sin((pan + 1) * np.pi / 4) * 1.41
# presses and the page's tones
for ev in log:
    t = ev['t'] - now0
    if t < 0 or t > nF / 30: continue
    ft = take2film(t)
    if ev['k'] in ('press', 'dead'):
        n = int(.14 * SR); tt = np.arange(n) / SR; put(MECH, norm1(grain('tick')) * .35 + 0 * tt[:1].sum(), ft, .45)
        put(MECH, np.sin(2 * np.pi * 82 * tt) * env(n, .035) * .3, ft, .45)
    elif ev['k'] == 'tone':
        n = int(ev['dur'] * SR) + 1; tt = np.arange(n) / SR; fr = ev['f0'] * (ev['f1'] / ev['f0']) ** (tt / ev['dur']); ph = 2 * np.pi * np.cumsum(fr) / SR
        s = np.sin(ph) if ev.get('type', 'sine') == 'sine' else (2 / np.pi) * np.arcsin(np.sin(ph)); a = np.minimum(1, tt / .005) * np.exp(-tt / max(.02, ev['dur'] / 3))
        put(MECH, s * a * ev['vol'] * 1.6, ft, 0)
# ---- the room, per frame of the take
tt = np.arange(L) / SR; ft_of_frame = np.array([take2film(f / 30) for f in range(nF)])
def track(key, fn=lambda v: v):
    v = np.array([fn(s[key]) for s in st], float); return np.interp(tt, ft_of_frame, v, left=0, right=0)
inTake = ((tt >= B[0]) & (tt < B[0] + B[3])) | (tt >= D[0]); inTakeS = lp(inTake.astype(float), 3, 1)
era = track('era'); yaw = track('yaw'); dist = track('dist'); fl = track('flames'); placed = track('place', lambda p: 1 if p else 0)
camv = lp(np.abs(np.gradient(yaw) * SR) + np.abs(np.gradient(np.log(np.maximum(dist, .1))) * SR), 2, 1)
AMB[:, 0] += bp(rng.standard_normal(L), 300, 2400) * np.minimum(1, camv * 6) * .05 * inTakeS
AMB[:, 1] += bp(rng.standard_normal(L), 300, 2400) * np.minimum(1, camv * 6) * .05 * inTakeS
def saw(f, det=1): return ((tt * f * det) % 1) * 2 - 1
dome = (lp(sum(saw(f) + saw(f, 1.004) for f in (55, 82.41, 110)) / 6, 360) * .16 + np.sin(2 * np.pi * 41.2 * tt) * .06) * (1 - .6 * placed)
warm = lp((saw(138.59) + saw(164.81, 1.003) + saw(207.65, .997)) / 3, 800) * .07 * placed
for dr in (dome, warm): AMB[:, 0] += dr * inTakeS * (.8 + .2 * np.sin(2 * np.pi * .07 * tt)); AMB[:, 1] += dr * inTakeS * (.8 + .2 * np.sin(2 * np.pi * .07 * tt + 1))
film_era = lp(((era >= 1) & (era <= 4)).astype(float), 4, 1) * inTakeS; tape = lp((era == 5).astype(float), 4, 1) * inTakeS
proj = np.zeros(L); step = int(SR / 24)
for i in range(0, L, step): n = min(400, L - i); proj[i:i + n] += rng.standard_normal(n) * env(n, .0012)
proj = bp(proj, 600, 3800) * .05 + lp(rng.standard_normal(L), 140) * .02
hiss = hp(rng.standard_normal(L), 5000) * .012 + np.sin(2 * np.pi * 15734 * tt) * .002
for ch in (0, 1): AMB[:, ch] += proj * film_era + hiss * tape
cr = np.zeros(L); dens = np.minimum(fl, 12) / 7.0 * inTake; ix = np.nonzero(rng.random(L) < dens * 16 / SR)[0]
for i in ix: n = min(L - i, 500); cr[i:i + n] += rng.standard_normal(n) * env(n, .0014) * rng.uniform(.2, 1)
AMB[:, 0] += bp(cr, 900, 6000) * .05; AMB[:, 1] += bp(cr, 900, 6000) * .05
# a breath and a low swell each time a birthday lands
titles = [s['title'] for s in st]
for f in range(1, nF):
    if titles[f] != titles[f - 1]:
        t = ft_of_frame[f]; n = int(1.6 * SR); x = rng.standard_normal(n) * np.sin(np.linspace(0, np.pi, n)) ** 2
        put(AMB, bp(x, 250, 1500) * .05, t - .2, 0); s = np.sin(2 * np.pi * 65.4 * np.arange(n) / SR) * np.sin(np.linspace(0, np.pi, n)) * .12; put(AMB, s, t - .1, 0)
        put(MECH, norm1(GR['comb'][0]) * .3, t - .05, 0)
# ---- the end: everything lets go
end = np.clip((TOT - tt) / 3.0, 0, 1)[:, None]
def room(x, seed, wet):
    r = np.random.default_rng(seed); n = int(2.8 * SR); irL = r.standard_normal(n) * np.exp(-np.arange(n) / (.6 * SR)) * .03; irR = r.standard_normal(n) * np.exp(-np.arange(n) / (.6 * SR)) * .03
    return x + np.stack([fftconvolve(x[:, 0], irL)[:L], fftconvolve(x[:, 1], irR)[:L]], 1) * wet
def norm(x, pk=.89): return x / max(1e-9, np.abs(x).max()) * pk
def write(name, x): wavfile.write(W + name, SR, (norm(x * end) * 32767).astype(np.int16)); print(name, round(L / SR, 2), 's')
mech = room(MECH + AMB, 1, .7)
far = room(np.stack([lp(VOICE[:, 0], 2600), lp(VOICE[:, 1], 2600)], 1), 3, 1.6)
duck = 1 - .45 * lp((np.abs(VOICE).max(1) > .02).astype(float), 2, 1)[:, None]
write('mix-voice.wav', REAL + VOICE * 1.0 + mech * .55 * duck)
write('mix-memory.wav', REAL + far * .6 + mech * .9)
write('mix-machine.wav', REAL + mech * 1.0)
json.dump({'edit': EDIT, 'total': TOT}, open(W + 'edit.json', 'w'))

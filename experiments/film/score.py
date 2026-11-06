# The score for the cinema film, synthesized from what happened on the orb: every detent a click, every press a thump,
# the page's own tones, a low drone for the dome, candle crackle while flames burn, a breath when they go out, all in a long dark room.
import json, numpy as np, sys
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile
SR = 48000; rng = np.random.default_rng(7)
d = json.load(open('/home/claude/stelline-work/cine/score.json')); st = d['st']; log = d['log']
pre, post = float(sys.argv[1]), float(sys.argv[2])          # seconds of title before, end card after
nF = len(st); now0 = st[0]['now'] - 1 / 30; L = int((pre + nF / 30 + post) * SR); out = np.zeros(L)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'lowpass', fs=SR, output='sos'), x)
def put(sig, t):
    i = int(t * SR); 
    if i < 0 or i >= L: return
    n = min(len(sig), L - i); out[i:i + n] += sig[:n]
def env(n, tau): return np.exp(-np.arange(n) / (tau * SR))
T = lambda ev: pre + (ev['t'] - now0)
RF = [2700, 2300, 1900, 2500, 3100]
for ev in log:
    k = ev['k']; t = T(ev)
    if k == 'ring':
        n = int(.05 * SR); nz = rng.standard_normal(n) * env(n, .0035); c = bp(nz, RF[ev['i']] * .7, RF[ev['i']] * 1.4) * 1.6
        tt = np.arange(n) / SR; ping = np.sin(2 * np.pi * (3300 + ev['i'] * 260) * tt) * env(n, .012) * .12; thump = np.sin(2 * np.pi * 170 * tt) * env(n, .008) * .25
        put((c + ping + thump) * .5, t)
    elif k in ('press', 'dead'):
        n = int(.12 * SR); tt = np.arange(n) / SR; nz = rng.standard_normal(n) * env(n, .006); c = bp(nz, 700, 1600) * (1.4 if k == 'press' else .5)
        th = np.sin(2 * np.pi * 85 * tt) * env(n, .03) * (.6 if k == 'press' else .15); put((c + th) * .6, t)
    elif k == 'tone':
        n = int(ev['dur'] * SR) + 1; tt = np.arange(n) / SR; f = ev['f0'] * (ev['f1'] / ev['f0']) ** (tt / ev['dur']); ph = 2 * np.pi * np.cumsum(f) / SR
        w = ev.get('type', 'sine'); s = np.sin(ph) if w == 'sine' else (2 / np.pi) * np.arcsin(np.sin(ph)) if w == 'triangle' else (((ph / (2 * np.pi)) % 1) * 2 - 1) * .5
        a = np.minimum(1, tt / .005) * np.exp(-tt / max(.02, ev['dur'] / 3)); put(s * a * ev['vol'] * 2.2, t)
# the dome: a low drone, warmer when the children come, opening into high light when the memory is woven
tt = np.arange(L) / SR; fr = np.clip(((tt - pre) * 30).astype(int), 0, nF - 1)
kids = np.array([s['kids'] for s in st])[fr]; mist = np.array([s['mist'] for s in st])[fr]; flames = np.array([s['flames'] for s in st])[fr]
kidsm = lp(np.minimum(kids, 1).astype(float), 1.2, 1); mistm = lp(mist, 1.5, 1)
fade = np.minimum(1, tt / 4) * np.minimum(1, (L / SR - tt) / 3)
def saw(f, det): return ((tt * f * det) % 1) * 2 - 1
dr = sum(saw(f, 1) + saw(f, 1.004) + saw(f, .996) for f in (55, 82.41, 110)) / 9
dr = lp(dr, 380, 2) * .22 + np.sin(2 * np.pi * 41.2 * tt) * .08
warm = lp((saw(138.59, 1) + saw(164.81, 1.003) + saw(220, .997)) / 3, 900, 2) * .12 * kidsm
air = bp(rng.standard_normal(L), 2500, 5200, 2) * (.006 + .03 * mistm)
glass = sum(np.sin(2 * np.pi * f * tt + p) for f, p in ((880, 0), (1318.5, 1), (1760, 2))) * .02 * mistm * (.6 + .4 * np.sin(2 * np.pi * .25 * tt))
lfo = .75 + .25 * np.sin(2 * np.pi * .07 * tt)
out += (dr * lfo + warm + air + glass) * fade
# candles: a soft crackle while they burn; a breath when they go out
cr = np.zeros(L); dens = flames / 7.0; ix = np.nonzero(rng.random(L) < dens * 18 / SR)[0]
for i in ix: n = min(L - i, 600); cr[i:i + n] += rng.standard_normal(n) * env(n, .0015) * rng.uniform(.2, 1)
out += bp(cr, 900, 6000) * .05
fl = [s['flames'] for s in st]
for f in range(1, nF):
    if fl[f] < fl[f - 1]:
        n = int(.55 * SR); x = rng.standard_normal(n) * np.sin(np.linspace(0, np.pi, n)) ** 1.5; put(bp(x, 300, 1800) * .07, pre + f / 30)
# a dome's reverb, a little different on each side
def ir(seed): r = np.random.default_rng(seed); n = int(2.6 * SR); return r.standard_normal(n) * np.exp(-np.arange(n) / (.55 * SR)) * .03
dry = out.copy(); Lc = dry + fftconvolve(dry, ir(1))[:L] * .9; Rc = dry + fftconvolve(dry, ir(2))[:L] * .9
st2 = np.stack([Lc, Rc], 1); st2 /= max(1e-9, np.abs(st2).max()) / .89
wavfile.write('/home/claude/stelline-work/cine/score.wav', SR, (st2 * 32767).astype(np.int16)); print('score', L / SR, 's')

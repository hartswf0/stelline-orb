#!/usr/bin/env python3
"""
Synthesize frame-accurate mechanical Orb foley + atmospheric CS-80 pad
from /tmp/stelline_film_events.json into /tmp/stelline_film_audio.wav.
"""
import json
import math
import struct
import wave
import random

SR = 44100
EVENTS_PATH = '/tmp/stelline_film_events.json'
OUT_WAV = '/tmp/stelline_film_audio.wav'
FPS = 24.0

RING_FREQS = [2700.0, 2300.0, 1900.0, 2500.0, 3100.0]

def biquad_bandpass(samples, f0, q, sr=SR):
    w0 = 2.0 * math.pi * f0 / sr
    alpha = math.sin(w0) / (2.0 * q)
    b0 = alpha
    b1 = 0.0
    b2 = -alpha
    a0 = 1.0 + alpha
    a1 = -2.0 * math.cos(w0)
    a2 = 1.0 - alpha
    b0 /= a0; b1 /= a0; b2 /= a0
    a1 /= a0; a2 /= a0
    out = [0.0] * len(samples)
    x1 = x2 = y1 = y2 = 0.0
    for i, x0 in enumerate(samples):
        y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        out[i] = y0
        x2 = x1; x1 = x0
        y2 = y1; y1 = y0
    return out

def add_buf(mix_l, mix_r, start_idx, mono_buf, gain_l=1.0, gain_r=1.0):
    n = len( mix_l )
    for i, val in enumerate(mono_buf):
        idx = start_idx + i
        if 0 <= idx < n:
            mix_l[idx] += val * gain_l
            mix_r[idx] += val * gain_r

def make_ring_click(ring_idx):
    rng = random.Random(1000 + ring_idx * 97)
    L = 420
    raw = [(rng.random() * 2.0 - 1.0) * math.exp(-k / 52.0) for k in range(L)]
    f0 = RING_FREQS[ring_idx % 5]
    filt = biquad_bandpass(raw, f0, 2.6)
    # Add subtle machined aluminum body resonance
    for k in range(L):
        body = math.sin(2.0 * math.pi * (340.0 + ring_idx * 35.0) * (k / SR)) * math.exp(-k / 75.0) * 0.25
        filt[k] = filt[k] * 1.45 + body
    return filt

def make_press_thud(long_press=False):
    rng = random.Random(4242 + (1 if long_press else 0))
    L = 1100
    raw = [(rng.random() * 2.0 - 1.0) * math.exp(-k / 145.0) for k in range(L)]
    filt = biquad_bandpass(raw, 1100.0, 2.4)
    for k in range(L):
        thud = math.sin(2.0 * math.pi * (165.0 if not long_press else 135.0) * (k / SR)) * math.exp(-k / 190.0) * 0.45
        filt[k] = filt[k] * 1.35 + thud
    return filt

def make_tone_sweep(f0, f1, dur, vol, wave_type='sine'):
    L = int(dur * SR)
    out = [0.0] * L
    phase = 0.0
    attack = int(0.012 * SR)
    for k in range(L):
        u = k / max(1, L - 1)
        freq = f0 * ((f1 / f0) ** u)
        phase += 2.0 * math.pi * freq / SR
        if wave_type == 'triangle':
            s = (2.0 / math.pi) * math.asin(math.sin(phase))
        elif wave_type == 'sawtooth':
            p_norm = (phase / (2.0 * math.pi)) % 1.0
            s = (2.0 * p_norm - 1.0) * 0.55
        else:
            s = math.sin(phase)
        if k < attack:
            env = (k / max(1, attack)) * vol
        else:
            env = vol * ((0.0008 / max(0.0008, vol)) ** ((k - attack) / max(1, L - attack)))
        out[k] = s * env
    return out

def main():
    with open(EVENTS_PATH, 'r') as f:
        meta = json.load(f)

    total_frames = meta.get('totalFrames', 1152)
    events = meta.get('events', [])
    duration = total_frames / FPS + 0.5
    n_samples = int(duration * SR)

    mix_l = [0.0] * n_samples
    mix_r = [0.0] * n_samples

    # 1. Warm Blade Runner 2049 CS-80 low ambient pad + chamber air
    chords = [146.83, 220.00, 293.66, 349.23, 440.00, 523.25] # D3, A3, D4, F4, A4, C5
    phases = [0.0] * len(chords)
    rng_air = random.Random(77)
    for i in range(n_samples):
        t = i / SR
        # Smooth envelope across the 6 Acts
        env = min(1.0, t / 2.5) * min(1.0, max(0.0, (duration - t) / 1.5))
        # Swell during STAGE (26s-35s) and WEAVE (41s-48s)
        swell = 0.045 + 0.025 * math.exp(-((t - 29.5) / 5.5) ** 2) + 0.032 * math.exp(-((t - 44.0) / 4.5) ** 2)
        pad_l = 0.0
        pad_r = 0.0
        for c_idx, freq in enumerate(chords):
            detune = 1.0 + math.sin(t * (0.23 + c_idx * 0.07) + c_idx) * 0.0018
            phases[c_idx] += 2.0 * math.pi * (freq * detune) / SR
            # Soft filtered CS-80 brass/pad harmonic
            sig = (math.sin(phases[c_idx]) + 0.28 * math.sin(phases[c_idx] * 2.0)) * (0.35 / (1.0 + c_idx * 0.35))
            if c_idx % 2 == 0:
                pad_l += sig
                pad_r += sig * 0.75
            else:
                pad_l += sig * 0.75
                pad_r += sig
        air = (rng_air.random() * 2.0 - 1.0) * 0.0018
        mix_l[i] = (pad_l * swell + air) * env
        mix_r[i] = (pad_r * swell + air) * env

    # Precompute ring clicks
    ring_clicks = [make_ring_click(i) for i in range(5)]
    press_short = make_press_thud(False)
    press_long = make_press_thud(True)

    # 2. Layer exact frame-synced foley events
    for ev in events:
        t = float(ev.get('t', 0.0))
        idx = int(t * SR)
        etype = ev.get('type', '')

        if etype == 'ring':
            r_idx = int(ev.get('ring', 0)) % 5
            # Slight stereo pan matching horizontal position RX on the Orb (-0.46 to +0.46)
            pan = (r_idx - 2) * 0.16
            gl = 0.52 * (1.0 - max(0.0, pan))
            gr = 0.52 * (1.0 + min(0.0, pan))
            add_buf(mix_l, mix_r, idx, ring_clicks[r_idx], gl, gr)

        elif etype == 'press':
            is_long = bool(ev.get('btn_long', ev.get('long', False)))
            btn = ev.get('btn', 'MODE')
            pan = -0.25 if btn in ('MODE', 'UNDO') else 0.25
            gl = 0.65 * (1.0 - max(0.0, pan))
            gr = 0.65 * (1.0 + min(0.0, pan))
            add_buf(mix_l, mix_r, idx, press_long if is_long else press_short, gl, gr)

        elif etype == 'place':
            # Subtle patisserie placement tap + crystal harmonic
            tap = make_tone_sweep(980.0, 620.0, 0.055, 0.08, 'triangle')
            add_buf(mix_l, mix_r, idx, tap, 0.5, 0.5)

        elif etype == 'shimmer':
            s1 = make_tone_sweep(440.0, 880.0, 0.9, 0.09, 'triangle')
            s2 = make_tone_sweep(660.0, 1320.0, 0.8, 0.07, 'triangle')
            add_buf(mix_l, mix_r, idx, s1, 0.55, 0.45)
            add_buf(mix_l, mix_r, idx + int(0.12 * SR), s2, 0.45, 0.55)

        elif etype == 'lock_chime':
            c1 = make_tone_sweep(1320.0, 1310.0, 0.09, 0.13, 'sine')
            c2 = make_tone_sweep(1760.0, 1750.0, 0.14, 0.10, 'sine')
            add_buf(mix_l, mix_r, idx, c1, 0.5, 0.5)
            add_buf(mix_l, mix_r, idx + int(0.07 * SR), c2, 0.5, 0.5)

        elif etype == 'servo':
            foc = float(ev.get('focus') or 1.0)
            sv = make_tone_sweep(180.0 + foc * 160.0, 200.0 + foc * 160.0, 0.07, 0.055, 'sawtooth')
            add_buf(mix_l, mix_r, idx, sv, 0.48, 0.52)

    # Soft limiter & write 16-bit stereo WAV
    with wave.open(OUT_WAV, 'w') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        frames = bytearray()
        for l, r in zip(mix_l, mix_r):
            cl = math.tanh(l * 1.15)
            cr = math.tanh(r * 1.15)
            il = max(-32767, min(32767, int(cl * 32767)))
            ir = max(-32767, min(32767, int(cr * 32767)))
            frames += struct.pack('<hh', il, ir)
        wf.writeframes(frames)

    print(f"Synthesized {duration:.2f}s stereo soundtrack ({len(events)} foley events) -> {OUT_WAV}")

if __name__ == '__main__':
    main()

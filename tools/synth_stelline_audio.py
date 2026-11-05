#!/usr/bin/env python3
"""
Synthesizes the 45.0-second stereo soundtrack (/tmp/stelline_orb_audio.wav)
synchronized to the exact mechanical clicks, ring detents, piping strokes,
candle ignition, thumb-hold latch, and chamber pad of Field Orb 05's Director Reel.
"""
import math
import struct
import wave

SAMPLE_RATE = 44100
DURATION = 45.0
NUM_SAMPLES = int(SAMPLE_RATE * DURATION)


def main():
    left = [0.0] * NUM_SAMPLES
    right = [0.0] * NUM_SAMPLES

    # 1. Warm Blade Runner 2049 Chamber Atmospheric Drone (A1=55Hz, E2=82.4Hz, A2=110Hz, C#3=138.6Hz, E3=164.8Hz)
    for i in range(NUM_SAMPLES):
        t = i / SAMPLE_RATE
        # Smooth fade in & fade out
        env = min(1.0, t / 1.5) * min(1.0, (DURATION - t) / 1.8)
        # Slow breathing LFO
        lfo1 = 0.55 + 0.45 * math.sin(2.0 * math.pi * 0.11 * t)
        lfo2 = 0.60 + 0.40 * math.cos(2.0 * math.pi * 0.07 * t + 0.8)

        sub = 0.055 * math.sin(2.0 * math.pi * 55.0 * t)
        fifth = 0.032 * math.sin(2.0 * math.pi * 82.41 * t + 0.3 * math.sin(2.0 * math.pi * 0.19 * t))
        octv = 0.028 * math.sin(2.0 * math.pi * 110.0 * t + 0.4 * math.sin(2.0 * math.pi * 0.23 * t))
        shimmer = 0.014 * lfo1 * math.sin(2.0 * math.pi * 220.0 * t + math.sin(2.0 * math.pi * 110.0 * t) * 0.6)

        # Warm swell when 3200K candles & children appear (t >= 24.0)
        warmth = 0.0
        if t > 24.0:
            w_env = min(1.0, (t - 24.0) / 3.0)
            warmth = w_env * 0.024 * (
                math.sin(2.0 * math.pi * 277.18 * t) * 0.6 +
                math.sin(2.0 * math.pi * 329.63 * t) * 0.5
            )

        # Scanline hologram modulation during Act VII (37.5s - 42.0s)
        scan_mod = 0.0
        if 37.5 <= t <= 42.0:
            u = (t - 37.5) / 4.5
            depth = math.sin(u * math.pi)
            scan_mod = depth * 0.025 * math.sin(2.0 * math.pi * (180.0 + 90.0 * depth) * t)

        pad_l = env * (sub + fifth * lfo1 + octv + shimmer + warmth + scan_mod)
        pad_r = env * (sub + fifth * lfo2 + octv * 0.95 + shimmer * 0.85 + warmth * 1.05 - scan_mod * 0.7)
        left[i] += pad_l
        right[i] += pad_r

    def add_click(t_sec, freq=1800.0, dur=0.032, amp=0.38, pan=0.0, kind="detent"):
        start = int(t_sec * SAMPLE_RATE)
        length = int(dur * SAMPLE_RATE)
        pan_l = math.sqrt(0.5 * (1.0 - max(-1.0, min(1.0, pan))))
        pan_r = math.sqrt(0.5 * (1.0 + max(-1.0, min(1.0, pan))))
        for j in range(length):
            idx = start + j
            if idx < 0 or idx >= NUM_SAMPLES:
                break
            dt = j / SAMPLE_RATE
            # Crisp machined metallic impulse + low-end brass housing thud
            fast_env = math.exp(-dt * 115.0)
            body_env = math.exp(-dt * 48.0)
            sig = (
                0.65 * fast_env * math.sin(2.0 * math.pi * freq * dt) +
                0.35 * fast_env * math.sin(2.0 * math.pi * (freq * 1.62) * dt) +
                0.45 * body_env * math.sin(2.0 * math.pi * 185.0 * dt)
            )
            if kind == "press":
                sig += 0.40 * body_env * math.sin(2.0 * math.pi * 128.0 * dt)
            left[idx] += amp * sig * pan_l
            right[idx] += amp * sig * pan_r

    def add_chime(t_sec, freqs, dur=0.9, amp=0.14):
        start = int(t_sec * SAMPLE_RATE)
        length = int(dur * SAMPLE_RATE)
        for j in range(length):
            idx = start + j
            if idx < 0 or idx >= NUM_SAMPLES:
                break
            dt = j / SAMPLE_RATE
            env = math.exp(-dt * 4.2) * min(1.0, dt / 0.015)
            s = sum(math.sin(2.0 * math.pi * f * dt) for f in freqs) / max(1, len(freqs))
            left[idx] += amp * env * s
            right[idx] += amp * env * s * 0.96

    # 2. Exact Choreographed Foley Events matching updateDirectorReel(t, L)
    # Act I: Start & Cast Sponge
    add_click(0.05, 1800, 0.045, 0.36, -0.35, "press")
    add_click(1.40, 920, 0.055, 0.45, -0.35, "press")
    add_chime(1.42, [220.0, 329.63, 440.0], 0.85, 0.12)

    # Act II: Drag R2 (BUNDT 12-Flute Morph) [3.5s - 10.0s, every 0.22s]
    t = 3.52
    while t < 9.90:
        add_click(t, 1780 + (t - 3.5) * 35, 0.030, 0.34, -0.18, "detent")
        t += 0.22

    # Act III: Drag R3 (ICING & 44 SHELL ROSETTES) [10.0s - 16.5s, every 0.18s]
    t = 10.04
    while t < 16.40:
        add_click(t, 2020 + (t - 10.0) * 30, 0.028, 0.32, -0.05, "detent")
        t += 0.18

    # Act IV: Etch-a-Sketch Pipe Red Inscription (生日快樂) [16.5s - 23.0s, every 0.16s]
    t = 16.54
    while t < 22.90:
        add_click(t, 2320 + math.sin(t * 4.0) * 140, 0.024, 0.30, 0.02, "detent")
        t += 0.16

    # Act V: Drag R4 (CANDLES 1..7 & 3200K IGNITION) [23.0s - 29.5s, every 0.24s]
    t = 23.05
    while t < 29.40:
        add_click(t, 2150, 0.030, 0.34, 0.10, "detent")
        t += 0.24
    # Candle ignition shimmer at t=24.2s & Children materialization chord at t=25.0s
    add_chime(24.20, [329.63, 440.0, 554.37, 659.25], 1.2, 0.14)
    add_chime(25.20, [220.0, 277.18, 329.63, 440.0], 1.5, 0.15)

    # Act VI: THE HERO PROOF — Click THUMB HOLD (t=30.2s) & Drag R5 TIME (30.7s - 37.5s, every 0.18s)
    add_click(30.20, 1320, 0.060, 0.48, 0.35, "press")
    add_click(30.28, 980, 0.050, 0.42, 0.35, "press")
    add_chime(30.25, [110.0, 220.0, 329.63], 1.1, 0.16)
    t = 30.72
    while t < 37.40:
        add_click(t, 2480, 0.026, 0.33, 0.22, "detent")
        t += 0.18

    # Act VII: Capacitive Squeeze Scanline Hologram Weave [37.5s - 42.0s, every 0.22s]
    t = 37.55
    while t < 41.90:
        add_click(t, 1540, 0.026, 0.28, -0.45, "detent")
        t += 0.22

    # Act VIII: Click BAKE & COMMIT MEMORY (<100MB FixFlip=ON) at t=43.05s
    add_click(43.05, 2240, 0.060, 0.46, 0.45, "press")
    add_chime(43.08, [220.0, 277.18, 329.63, 440.0, 659.25], 1.8, 0.18)

    # Write 16-bit stereo WAV
    out_path = "/tmp/stelline_orb_audio.wav"
    with wave.open(out_path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        frames = bytearray(NUM_SAMPLES * 4)
        for i in range(NUM_SAMPLES):
            l_val = int(max(-0.98, min(0.98, left[i])) * 32767)
            r_val = int(max(-0.98, min(0.98, right[i])) * 32767)
            struct.pack_into("<hh", frames, i * 4, l_val, r_val)
        wf.writeframes(frames)
    print(f"Wrote {out_path} ({DURATION}s stereo WAV)")


if __name__ == "__main__":
    main()

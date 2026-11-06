/* ORB TOOL core: the device's sounds. The real grains cut from the film (ana/device-sounds.wav) when they load, synthesized
   clicks otherwise. Same grain map as ana/index.html. Browser global CORE_SOUND. */
(function (root) {
  'use strict';
  let AC = null, BUF = null, muted = false;
  const SPR = { click: [[0, .065], [.115, .065], [.23, .065], [.345, .065], [.46, .065], [.575, .065], [.69, .065], [.805, .065], [.92, .065]], ratchet: [[1.035, .05], [1.135, .05], [1.235, .05], [1.335, .05]], tick: [[1.435, .04], [1.525, .04]], comb: [[1.615, .37]], whirr: [[2.035, .62]] };
  const URLS = ['../../ana/device-sounds.wav', '../../cineosis-orb/cut/device-sounds.wav'];
  function ac() { if (!AC) { const C = root.AudioContext || root.webkitAudioContext; if (!C) return null; AC = new C(); load(0); } if (AC.state === 'suspended') AC.resume(); return AC; }
  function load(i) { if (i >= URLS.length) return; fetch(URLS[i]).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(b => AC.decodeAudioData(b)).then(b => { BUF = b; }).catch(() => load(i + 1)); }
  function out(g) { g.connect(AC.destination); return g; }
  function noise(len) { const b = AC.createBuffer(1, Math.floor(AC.sampleRate * len), AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = AC.createBufferSource(); s.buffer = b; return s; }
  function grain(kind, rate, vol) { if (muted || !AC) return;
    if (BUF) { const set = SPR[kind], [o, d] = set[Math.floor(Math.random() * set.length)], s = AC.createBufferSource(); s.buffer = BUF; s.playbackRate.value = rate || 1; const g = AC.createGain(); g.gain.value = vol == null ? .8 : vol; s.connect(g); out(g); s.start(0, o, d); return; }
    const s = noise(.05), f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = kind === 'tick' ? 6000 : 2600 * (rate || 1); f.Q.value = 2.2; const g = AC.createGain(), t = AC.currentTime; g.gain.setValueAtTime(vol == null ? .7 : vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .04); s.connect(f).connect(g); out(g); s.start(); }
  const safe = f => function () { try { if (AC && !muted) f.apply(null, arguments); } catch (e) { } };
  const SND = {
    wake() { try { ac(); } catch (e) { } },
    get ready() { return !!BUF; },
    mute(v) { muted = !!v; }, get muted() { return muted; },
    step: safe((fast, ring) => grain(fast ? 'ratchet' : 'click', 1 + ((ring || 0) - 1) * .045 + (Math.random() - .5) * .02, .75)),
    hand: safe(ring => grain('click', 1.25 + (ring || 0) * .03, .22)),
    tick: safe(() => grain('tick', 1, .5)),
    wash: safe(v => { const s = noise(.6), f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2200; const g = AC.createGain(), t = AC.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.22 * (v || 1), t + .06); g.gain.exponentialRampToValueAtTime(.001, t + .55); s.connect(f).connect(g); out(g); s.start(); if (BUF && Math.random() < .6) grain('comb', 1, .25); }),
    whirr: safe(() => grain('whirr', 1, .35)),
    sweep: safe(() => { const t = AC.currentTime; [0, .18, .36].forEach((d, i) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(6000 + i * 300, t + d); o.frequency.exponentialRampToValueAtTime(11500 + i * 200, t + d + 1.1); g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(.025, t + d + .08); g.gain.linearRampToValueAtTime(0, t + d + 1.1); o.connect(g); out(g); o.start(t + d); o.stop(t + d + 1.2); }); }),
    select: safe(() => { const t = AC.currentTime; for (let k = 0; k < 5; k++) { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = 12000; g.gain.setValueAtTime(0, t + k * .055); g.gain.linearRampToValueAtTime(.03, t + k * .055 + .004); g.gain.linearRampToValueAtTime(0, t + k * .055 + .03); o.connect(g); out(g); o.start(t + k * .055); o.stop(t + k * .055 + .04); } })
  };
  root.CORE_SOUND = SND;
})(typeof window !== 'undefined' ? window : globalThis);

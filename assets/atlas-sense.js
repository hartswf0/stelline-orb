// ============================================================================
// STELLINE ATLAS SENSE - the film for a listener.
//  SONIC  : each segment is a voice. pan = x, pitch = height (and warmth), level = area,
//           brightness = luma, depth = filter + reverb send, timbre = class.
//  NARRATE: aria-live + speech synthesis describe the frame, the part, the critic.
//  Truth chime: any ring within +-4 deg of the film's truth rings a soft bell.
// Uses the orb's own AudioContext so everything shares one acoustic space.
// ============================================================================
(function () {
  'use strict';
  const A = window.ATLAS; if (!A) return;
  const D = A.data;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  let ctx = null, master = null, verb = null, bed = null;

  function ac() {
    if (typeof ensureAudio !== 'function') return null;
    ctx = ensureAudio(); if (!ctx) return null;
    if (!master) {
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      // small synthetic room (decaying noise impulse) shared by every voice
      const len = ctx.sampleRate * 1.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      verb = ctx.createConvolver(); verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = 0.55; verb.connect(vg); vg.connect(master);
    }
    return ctx;
  }

  const TIMBRE = {
    FACE: ['sine', 1.0, 0.0], SKIN: ['sine', 0.9, 0], HAIR: ['triangle', 0.8, 0.2], GARMENT: ['triangle', 0.7, 0.1], 'WHITE.GARMENT': ['sine', 0.8, 0.1], 'DARK.COAT': ['sawtooth', 0.35, 0.5],
    WALL: ['sine', 0.5, 0.0], CEILING: ['sine', 0.5, 0.1], FLOOR: ['triangle', 0.45, 0.2], VOID: ['sine', 0.25, 0.0], FOLIAGE: ['sawtooth', 0.4, 0.6], GREENERY: ['sawtooth', 0.4, 0.5],
    FLAME: ['square', 0.45, 0.7], LIGHT: ['sine', 0.6, 0.0], 'WARM.OBJECT': ['triangle', 0.7, 0.2], SURFACE: ['sine', 0.45, 0.1], FORM: ['triangle', 0.5, 0.2], FIGURE: ['triangle', 0.7, 0.1],
  };

  // one segment voice
  function voice(seg, when, dur, panOverride) {
    const c = ac(); if (!c) return;
    const [wave, gain, noiseMix] = TIMBRE[seg.cls] || TIMBRE.FORM;
    const f0 = 110 * Math.pow(2, (1 - seg.cy) * 3.0 + (seg.L / 100) * 0.8);          // height + brightness -> pitch
    const o = c.createOscillator(); o.type = wave; o.frequency.value = f0;
    const g = c.createGain(); const peak = gain * clamp(0.05 + seg.a * 1.4, 0.04, 0.5) * 0.7;
    g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(peak, when + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500 + (1 - seg.rel) * 700 + seg.L * 30; f.Q.value = 0.7;
    const p = c.createStereoPanner ? c.createStereoPanner() : null; if (p) p.pan.value = panOverride != null ? panOverride : clamp((seg.cx - 0.5) * 2, -1, 1);
    o.connect(f); f.connect(g); if (p) { g.connect(p); p.connect(master); const s = c.createGain(); s.gain.value = clamp(0.2 + (1 - seg.rel) * 0.9, 0, 1); p.connect(s); s.connect(verb); } else g.connect(master);
    o.start(when); o.stop(when + dur + 0.05);
    if (noiseMix > 0 && typeof noiseBuffer !== 'undefined' && noiseBuffer) {
      const n = c.createBufferSource(); n.buffer = noiseBuffer; const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = f0 * 2; nf.Q.value = 3;
      const ng = c.createGain(); ng.gain.setValueAtTime(0.0001, when); ng.gain.linearRampToValueAtTime(peak * noiseMix * 1.4, when + 0.03); ng.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      n.connect(nf); nf.connect(ng); ng.connect(p || master); if (p) p.connect(master); n.start(when, Math.random()); n.stop(when + dur + 0.05);
    }
  }
  // sweep left->right so the listener hears the frame's layout as time
  A.sweep = function () {
    const c = ac(); if (!c) return; const S = D.sec[A.sec]; const t0 = c.currentTime + 0.05; const T = 2.4;
    S.segs.slice().sort((a, b) => a.cx - b.cx).forEach(seg => voice(seg, t0 + seg.cx * T, 0.55 + seg.a * 1.2));
    return T;
  };
  A.sonic = false;
  A.toggleSonic = function () {
    A.sonic = !A.sonic;
    if (A.sonic) { if (A.mode === 'film') A.sweep(); bedStart(); } else bedStop(); crackleSet();
    A.say(A.sonic ? (A.mode === 'film' ? 'Sound on. It pans left to right with the frame.' : 'Sound on.') : 'Sound off.');
  };
  // ambient bed from the frame as a whole
  function bedStart() {
    const c = ac(); if (!c || bed) return;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o1.type = 'sawtooth'; o2.type = 'sine'; f.type = 'lowpass'; g.gain.value = 0.0001; lfo.frequency.value = 0.18; lg.gain.value = 80;
    lfo.connect(lg); lg.connect(f.frequency); o1.connect(f); o2.connect(f); f.connect(g); g.connect(master); g.connect(verb);
    o1.start(); o2.start(); lfo.start(); bed = { o1, o2, f, g, lfo }; bedUpdate();
  }
  function bedStop() { if (!bed) return; const c = ctx; bed.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.15); const b = bed; bed = null; setTimeout(() => { try { b.o1.stop(); b.o2.stop(); b.lfo.stop(); } catch (e) { } }, 600); }
  function bedUpdate() {
    if (!bed) return; const hero = A.hero && A.hero.active && A.mode !== 'film'; const S = hero ? ({ forest: { warm: -0.2, luma: 0.25, contrast: 0.3 }, amber: { warm: 0.8, luma: 0.12, contrast: 0.5 }, studio: { warm: 0.3, luma: 0.3, contrast: 0.3 } }[A.hero.mood] || { warm: 0, luma: 0.2, contrast: 0.3 }) : D.sec[A.sec], c = ctx;
    const root = 55 * Math.pow(2, (S.warm + 1) * 0.5);            // warm light -> higher root
    bed.o1.frequency.setTargetAtTime(root, c.currentTime, 0.4); bed.o2.frequency.setTargetAtTime(root * 1.5, c.currentTime, 0.4);
    bed.f.frequency.setTargetAtTime(160 + S.luma * 1400, c.currentTime, 0.4);   // bright frame -> open filter
    bed.g.gain.setTargetAtTime(0.012 + S.contrast * 0.05, c.currentTime, 0.4);
  }
  A.on('mode', () => { if (A.sonic) { bedStop(); setTimeout(bedStart, 700); } crackleSet(); });
  // candle crackle & small mechanical sounds for the builders
  let crackle = 0;
  function crackleSet() { clearInterval(crackle); crackle = 0; if (A.mode === 'cake' && A.sonic) crackle = setInterval(() => { const c = ac(); if (!c || typeof noiseBuffer === 'undefined' || !noiseBuffer || (A.hero.blown && A.hero.blowT > 1)) return; const n = c.createBufferSource(); n.buffer = noiseBuffer; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500 + Math.random() * 4000; const g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.linearRampToValueAtTime(0.03 + Math.random() * 0.05, c.currentTime + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.03 + Math.random() * 0.04); n.connect(f); f.connect(g); g.connect(master); n.start(c.currentTime, Math.random()); n.stop(c.currentTime + 0.1); }, 140); }
  function burst(freq, dur, gain, type) { const c = ac(); if (!c || typeof noiseBuffer === 'undefined' || !noiseBuffer) return; const n = c.createBufferSource(); n.buffer = noiseBuffer; const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2; const g = c.createGain(); g.gain.setValueAtTime(gain, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur); n.connect(f); f.connect(g); g.connect(master); g.connect(verb); n.start(c.currentTime, Math.random()); n.stop(c.currentTime + dur + 0.05); }
  A.tick1 = () => burst(A.mode === 'bug' ? 3200 : 1400, 0.05, 0.25);
  A.shutter = () => { burst(5200, 0.03, 0.5); setTimeout(() => burst(900, 0.09, 0.4, 'lowpass'), 70); };
  A.chime = () => { const c = ac(); if (!c) return; [660, 990].forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, c.currentTime + i * 0.08); g.gain.linearRampToValueAtTime(0.1, c.currentTime + i * 0.08 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.08 + 0.7); o.connect(g); g.connect(master); g.connect(verb); o.start(c.currentTime + i * 0.08); o.stop(c.currentTime + 1); }); };
  A.on('blow', on => { if (on) burst(900, 0.9, 0.5, 'lowpass'); else A.chime(); });
  A.on('sec', (s, newShot) => { if (A.sonic) { bedUpdate(); if (newShot) A.sweep(); } narrateSec(newShot); });
  A.on('select', (seg, quiet) => { if (seg && ac() && (A.sonic || !quiet)) { voice(seg, ctx.currentTime + 0.02, 0.9); } });
  A.on('hover', seg => { if (seg && A.sonic && ac()) voice(seg, ctx.currentTime + 0.01, 0.35); });

  // truth chime
  let lastChime = [0, 0, 0, 0, 0];
  A.on('dial', (ring, ang) => {
    const t = A.truth[ring]; const d = Math.abs(((ang % 360) + 360) % 360 - t); const now = performance.now();
    if (d < 4 && now - lastChime[ring] > 500) {
      lastChime[ring] = now; const c = ac(); if (!c) return;
      const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = 660 * Math.pow(2, ring / 5);
      g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.linearRampToValueAtTime(0.12, c.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5);
      o.connect(g); g.connect(master); g.connect(verb); o.start(); o.stop(c.currentTime + 0.55);
    }
  });
  A.on('fit', (k, seg, lv, q) => { if (k === 'done' && seg) A.say(`${seg.id} needs ${A.LEVEL_NAMES[lv].toLowerCase()} to be indistinguishable. Orb remembers.`); });

  // ---------------------------------------------------------------- narration
  const synth = window.speechSynthesis;
  A.narrate = false;
  A.toggleNarrate = function () {
    A.narrate = !A.narrate;
    if (!A.narrate && synth) synth.cancel();
    A.say(A.narrate ? 'Narration on.' : 'Narration off.');
  };
  A.speak = function (msg) {
    if (!A.narrate || !synth) return; try { synth.cancel(); const u = new SpeechSynthesisUtterance(msg); u.rate = 1.08; synth.speak(u); } catch (e) { }
  };
  const SCALE = { ECU: 'extreme close-up', CU: 'close-up', MS: 'medium shot', WS: 'wide shot', DETAIL: 'detail shot' };
  A.describeFrame = function (sec) {
    const S = D.sec[sec]; const ch = A.chapterAt(sec);
    const light = S.luma < 0.2 ? 'very dark' : S.luma < 0.4 ? 'dim' : S.luma < 0.62 ? 'softly lit' : 'bright';
    const tone = S.warm > 0.25 ? 'warm amber' : S.warm < -0.1 ? 'cool green-grey' : 'neutral';
    const big = S.segs.slice().sort((a, b) => b.a - a.a);
    const faces = S.segs.filter(g => g.cls === 'FACE');
    const who = faces.length ? `${faces.length} face${faces.length > 1 ? 's' : ''}` : (S.person > 0.05 ? 'a figure' : 'no people');
    const parts = big.slice(0, 3).map(g => `${g.id.replace(/\.\d+$/, '').toLowerCase()} in ${g.cn} at ${g.cx < .34 ? 'left' : g.cx > .66 ? 'right' : 'centre'}`).join('; ');
    return `${ch.name}, ${SCALE[S.scale] || S.scale}. ${light}, ${tone}. ${who}. ${S.segs.length} parts. Largest: ${parts}.`;
  };
  A.describeHero = function () { const H = A.hero, b = H.builders[H.kind], g = H.genome, p = H.parts[H.sel]; return `${b.title(g)}. Looking at ${p.name.toLowerCase()}. ` + b.spec(g).slice(0, 5).map(([k, v]) => `${k.toLowerCase()}: ${v}`).join('. ') + '.'; };
  A.readFrame = function () { const t = (A.hero && A.hero.active && A.mode !== 'film') ? A.describeHero() : A.describeFrame(A.sec); A.say(t); if (!A.narrate && synth) { try { synth.cancel(); synth.speak(new SpeechSynthesisUtterance(t)); } catch (e) { } } };
  let lastNarr = 0;
  function narrateSec(newShot) {
    if (!newShot || performance.now() - lastNarr < 900) return; lastNarr = performance.now();
    const live = document.getElementById('v5Live'); if (live) { live.textContent = ''; setTimeout(() => { live.textContent = A.describeFrame(A.sec); }, 30); }
    if (A.narrate && synth) A.speak(A.describeFrame(A.sec));
  }
})();

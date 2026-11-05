/* The pairing: the laptop holds the scene, the phone holds the orb. In one browser they talk over a BroadcastChannel; across
   devices over public MQTT relays on WebSocket, in a room named by four letters (the same link as Butter Pair's).
   The scene is the true state: the phone sends what its hands did (turn, press, set, tilt) and the scene sends back the state,
   so the phone's rings carry the film's labels. */
(function () {
  const { ST } = window.CORE; const ORB = window.ORB;
  const uid = () => Math.random().toString(36).slice(2, 10);
  const L = window.LINK = { role: 'scene', dev: uid(), peers: new Map(), room: null };
  let BC = null; try { BC = new BroadcastChannel('stelline-orb'); } catch (e) { }
  const RELAYS = (new URLSearchParams(location.search).get('relay') || 'wss://broker.emqx.io:8084/mqtt,wss://broker.hivemq.com:8884/mqtt,wss://test.mosquitto.org:8081/mqtt').split(',');
  const MQ = { socks: [], urls: new Set() }, TE = new TextEncoder(), TD = new TextDecoder(), SEEN = new Map(); let MID = 0;
  const cat = (...ps) => { const o = new Uint8Array(ps.reduce((a, p) => a + p.length, 0)); let i = 0; for (const p of ps) { o.set(p, i); i += p.length; } return o; };
  const mqStr = s => { const b = TE.encode(s); return cat(new Uint8Array([b.length >> 8, b.length & 255]), b); };
  const mqPkt = (h, body) => { const r = []; let n = body.length; do { let d = n % 128; n = Math.floor(n / 128); if (n) d |= 128; r.push(d); } while (n); return cat(new Uint8Array([h, ...r]), body); };
  const topic = () => 'stelline-orb/v5/' + L.room;
  function mqOpen(url) { if (MQ.urls.has(url)) return; MQ.urls.add(url); let ws; try { ws = new WebSocket(url, 'mqtt'); } catch (e) { MQ.urls.delete(url); return; } ws.binaryType = 'arraybuffer'; const S = { ws, ok: false, buf: new Uint8Array(0) }; MQ.socks.push(S);
    ws.onopen = () => ws.send(mqPkt(0x10, cat(mqStr('MQTT'), new Uint8Array([4, 2, 0, 60]), mqStr('so-' + L.dev + '-' + uid().slice(0, 4)))));
    ws.onmessage = e => { S.buf = cat(S.buf, new Uint8Array(e.data)); for (; ;) { const b = S.buf; if (b.length < 2) return; let m = 1, len = 0, i = 1, d; do { if (i >= b.length) return; d = b[i++]; len += (d & 127) * m; m *= 128; } while (d & 128); if (b.length < i + len) return; const h = b[0], body = b.subarray(i, i + len); S.buf = b.slice(i + len);
        if (h >> 4 === 2) { S.ok = true; ws.send(mqPkt(0x82, cat(new Uint8Array([0, 1]), mqStr(topic()), new Uint8Array([0])))); hello(); } else if (h >> 4 === 3) { const tl = (body[0] << 8) | body[1], off = 2 + tl + (((h >> 1) & 3) ? 2 : 0); try { recv(JSON.parse(TD.decode(body.subarray(off)))); } catch (x) { } } } };
    ws.onclose = () => { MQ.socks = MQ.socks.filter(x => x !== S); MQ.urls.delete(url); if (L.room) setTimeout(() => mqOpen(url), 3000); }; ws.onerror = () => { }; }
  setInterval(() => { for (const S of MQ.socks) if (S.ok) try { S.ws.send(new Uint8Array([0xC0, 0])); } catch (e) { } }, 25000);
  function send(m) { m.from = L.dev; m.mid = L.dev + ':' + (++MID); try { BC && BC.postMessage(m); } catch (e) { } if (L.room && MQ.socks.length) { const p = mqPkt(0x30, cat(mqStr(topic()), TE.encode(JSON.stringify(m)))); for (const S of MQ.socks) if (S.ok) try { S.ws.send(p); } catch (e) { } } }
  function recv(m) { if (!m || !m.type || m.from === L.dev || SEEN.has(m.mid)) return; SEEN.set(m.mid, 1); if (SEEN.size > 500) SEEN.delete(SEEN.keys().next().value); L.peers.set(m.from, { role: m.role || (L.peers.get(m.from) || {}).role, at: performance.now() }); onMsg(m); }
  if (BC) BC.onmessage = e => recv(e.data);
  const hello = () => send({ type: 'hello', role: L.role });
  L.join = code => { L.room = code; for (const u of RELAYS) mqOpen(u); };
  L.relayOn = () => MQ.socks.some(s => s.ok);
  L.orbs = () => [...L.peers.values()].filter(p => p.role === 'orb' && performance.now() - p.at < 7000).length;
  L.scenes = () => [...L.peers.values()].filter(p => p.role === 'scene' && performance.now() - p.at < 7000).length;
  // the state the phone needs to draw the same rings
  const snap = () => ({ t: ST.t, part: ST.part, mode: ST.mode, spread: ST.spread, view: ST.view, light: ST.light, playing: ST.playing, proto: ST.proto, build: { items: ST.build.items, sel: ST.build.sel, ref: ST.build.ref, grade: ST.build.grade },
    TL: ST.TL.map(e => e.kind === 'film' ? { kind: 'film', n: e.n } : { kind: 'mem', id: e.id, ref: e.ref, score: e.score }), step: ST.step, score: ST.score, mems: ST.mems, edits: ST.edits, ring: ST.ring, note: ST.lcd.note });
  let lastRev = -1, lastSent = 0;
  function onMsg(m) {
    if (m.type === 'hello') { if (L.role === 'scene' && m.role === 'orb') { lastRev = -1; } return; }
    if (L.role === 'scene' && m.type === 'act') { const { k, a } = m; window.CORE.log('phone', k + ' ' + JSON.stringify(a));
      if (k === 'turn') window.CORE.turn(a[0], a[1], 'phone'); else if (k === 'press') { ORB.flash[a[0]] = performance.now(); window.CORE.press(a[0], a[1]); } else if (k === 'set') window.CORE.setRing(a[0], a[1]);
      else if (k === 'tilt') { window.SCENE.handOrbit = [a[0], a[1]]; if (ST.mode === 'build') window.SCENE.benchOrbit = [a[0] * 1.6, a[1]]; } else if (k === 'ring') { ST.ring = a[0]; window.CORE.touch('phone ring'); } return; }
    if (L.role === 'orb' && m.type === 'state') { const s = m.s; L.sceneAt = performance.now();
      const keepRing = performance.now() - (L.myTurnAt || 0) < 400; Object.assign(ST, { t: s.t, part: s.part, mode: s.mode, spread: s.spread, view: s.view, light: s.light, playing: s.playing, proto: s.proto, step: s.step, score: s.score, mems: s.mems, edits: s.edits });
      if (!keepRing) ST.ring = s.ring; ST.lcd.note = s.note || ''; ST.build.items = s.build.items; ST.build.sel = s.build.sel; ST.build.ref = s.build.ref; ST.build.grade = s.build.grade; ST.TL = s.TL; ST.steps = s.proto ? window.CORE.PROTO_STEPS[s.proto] : null; ST.rev++; }
  }
  L.start = function (role) { L.role = role; hello(); setInterval(hello, 2500);
    if (role === 'scene') setInterval(() => { const now = performance.now(); if (!L.orbs()) return; if (ST.rev !== lastRev || now - lastSent > 1500) { lastRev = ST.rev; lastSent = now; send({ type: 'state', s: snap() }); } }, 90);
    else ORB.remote = a => { L.myTurnAt = performance.now(); send(Object.assign({ type: 'act' }, a)); if (a.k === 'turn' || a.k === 'press') { } };
  };
  L.send = send;
})();

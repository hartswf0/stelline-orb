/* Pair: stage (second screen) <-> pad (the handheld orb). One room of four letters.
   Same browser: BroadcastChannel. Across devices: public MQTT relays over WebSocket, several at once; whichever answers carries the traffic.
   Messages carry a per-sender sequence number. Streams (imu) keep only the newest; commands (ring, key, spread) are never dropped or reordered,
   and the stage acknowledges the last sequence it applied, so the pad can show 'linked' only while acks are coming back. */
(function () {
  const dev = Math.random().toString(36).slice(2, 10);
  const P = window.PAIR = { dev, role: null, room: null, onmsg: null, peerAt: 0, ackAt: 0, rtt: 0, relays: 0 };
  const TE = new TextEncoder(), TD = new TextDecoder();
  let BC = null; try { BC = new BroadcastChannel('stelline-stage'); } catch (e) { }
  const RELAYS = (new URLSearchParams(location.search).get('relay') || 'wss://broker.emqx.io:8084/mqtt,wss://broker.hivemq.com:8884/mqtt,wss://test.mosquitto.org:8081/mqtt').split(',');
  const socks = [], urls = new Set(), SEEN = new Map(); let SEQ = 0;
  const cat = (...ps) => { const o = new Uint8Array(ps.reduce((a, p) => a + p.length, 0)); let i = 0; for (const p of ps) { o.set(p, i); i += p.length; } return o; };
  const str = s => { const b = TE.encode(s); return cat(new Uint8Array([b.length >> 8, b.length & 255]), b); };
  const pkt = (h, body) => { const r = []; let n = body.length; do { let d = n % 128; n = Math.floor(n / 128); if (n) d |= 128; r.push(d); } while (n); return cat(new Uint8Array([h, ...r]), body); };
  const topic = () => 'stelline-stage/v1/' + P.room;
  function open(url) {
    if (urls.has(url)) return; urls.add(url); let ws; try { ws = new WebSocket(url, 'mqtt'); } catch (e) { urls.delete(url); return; }
    ws.binaryType = 'arraybuffer'; const S = { ws, ok: false, buf: new Uint8Array(0) }; socks.push(S);
    ws.onopen = () => ws.send(pkt(0x10, cat(str('MQTT'), new Uint8Array([4, 2, 0, 30]), str('stg-' + dev + '-' + Math.random().toString(36).slice(2, 6)))));
    ws.onmessage = e => {
      S.buf = cat(S.buf, new Uint8Array(e.data));
      for (;;) {
        const b = S.buf; if (b.length < 2) return; let m = 1, len = 0, i = 1, d;
        do { if (i >= b.length) return; d = b[i++]; len += (d & 127) * m; m *= 128; } while (d & 128);
        if (b.length < i + len) return; const h = b[0], body = b.subarray(i, i + len); S.buf = b.slice(i + len);
        if (h >> 4 === 2) { S.ok = true; P.relays = socks.filter(x => x.ok).length; ws.send(pkt(0x82, cat(new Uint8Array([0, 1]), str(topic()), new Uint8Array([0])))); hello(); }
        else if (h >> 4 === 3) { const tl = (body[0] << 8) | body[1], off = 2 + tl; try { recv(JSON.parse(TD.decode(body.subarray(off)))); } catch (x) { } }
      }
    };
    ws.onclose = () => { const k = socks.indexOf(S); if (k >= 0) socks.splice(k, 1); urls.delete(url); P.relays = socks.filter(x => x.ok).length; if (P.room) setTimeout(() => open(url), 2500); };
    ws.onerror = () => { };
  }
  setInterval(() => { for (const S of socks) if (S.ok) try { S.ws.send(new Uint8Array([0xC0, 0])); } catch (e) { } }, 20000);
  function send(m) {
    m.from = dev; m.role = P.role; m.q = ++SEQ; m.mid = dev + ':' + m.q;
    try { BC && BC.postMessage(m); } catch (e) { }
    if (P.room && socks.length) { const p = pkt(0x30, cat(str(topic()), TE.encode(JSON.stringify(m)))); for (const S of socks) if (S.ok) try { S.ws.send(p); } catch (e) { } }
    return m.q;
  }
  function recv(m) {
    if (!m || !m.k || m.from === dev || m.room && m.room !== P.room || SEEN.has(m.mid)) return;
    SEEN.set(m.mid, 1); if (SEEN.size > 800) SEEN.delete(SEEN.keys().next().value);
    if (m.role !== P.role) P.peerAt = performance.now();
    if (m.k === 'hello') { if (m.role !== P.role) { if (P.onpeer) P.onpeer(m); } return; }
    if (P.onmsg) P.onmsg(m);
  }
  const hello = () => send({ k: 'hello', room: P.room });
  if (BC) BC.onmessage = e => recv(e.data);
  P.start = (role, room) => { P.role = role; P.room = room; for (const u of RELAYS) open(u); hello(); setInterval(hello, 2000); };
  P.send = (m) => { m.room = P.room; return send(m); };
  P.linked = () => performance.now() - P.peerAt < 5000;
  P.code = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random() * 24 | 0]).join('');
})();

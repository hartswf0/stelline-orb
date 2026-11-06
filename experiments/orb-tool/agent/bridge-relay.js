#!/usr/bin/env node
/* ORB TOOL agent: the relay between an MCP client (Claude, over stdio, newline-delimited JSON-RPC) and the orb page
   (over a local WebSocket). No dependencies.
     node experiments/orb-tool/agent/bridge-relay.js            relay to the page; open the tool with ?bridge=ws://localhost:8787
     node experiments/orb-tool/agent/bridge-relay.js --local    no page: answer from an orb kept in this process (core/bus.js)
     --port N   (default 8787)
   Register with an MCP client as a stdio server, e.g. { "command": "node", "args": ["<repo>/experiments/orb-tool/agent/bridge-relay.js"] }.
   Requests that arrive before a page connects wait up to 15 s, then fail with a message saying to open the page.
   Logging goes to stderr; stdout carries only JSON-RPC. */
'use strict';
const http = require('http'), crypto = require('crypto'), path = require('path');
const args = process.argv.slice(2), LOCAL = args.includes('--local');
const PORT = +(args[args.indexOf('--port') + 1] || 0) || 8787;
const say = m => process.stderr.write('[orb-relay] ' + m + '\n');
const out = msg => process.stdout.write(JSON.stringify(msg) + '\n');

let local = null;
if (LOCAL) { const BUS = require('../core/bus.js'), D = require('./describe.js'), B = require('./bridge.js');
  const orb = BUS.createOrb(); D.install(orb); local = B.createServer(orb, { name: 'stelline-orb-tool (local)' }); say('local orb, no page'); }

// ---- the WebSocket side (one page at a time) ----
let sock = null; const waiting = [], inflight = new Map();
function frame(data) { const p = Buffer.from(data); const n = p.length;
  const h = n < 126 ? Buffer.from([0x81, n]) : n < 65536 ? Buffer.from([0x81, 126, n >> 8, n & 255]) : (() => { const b = Buffer.alloc(10); b[0] = 0x81; b[1] = 127; b.writeBigUInt64BE(BigInt(n), 2); return b; })();
  return Buffer.concat([h, p]); }
function reader(onText) { let buf = Buffer.alloc(0);
  return chunk => { buf = Buffer.concat([buf, chunk]);
    for (;;) { if (buf.length < 2) return; const op = buf[0] & 15, masked = buf[1] & 128; let n = buf[1] & 127, o = 2;
      if (n === 126) { if (buf.length < 4) return; n = buf.readUInt16BE(2); o = 4; } else if (n === 127) { if (buf.length < 10) return; n = Number(buf.readBigUInt64BE(2)); o = 10; }
      const need = o + (masked ? 4 : 0) + n; if (buf.length < need) return;
      let p = buf.slice(o + (masked ? 4 : 0), need); if (masked) { const k = buf.slice(o, o + 4); p = Buffer.from(p.map((b, i) => b ^ k[i & 3])); }
      buf = buf.slice(need);
      if (op === 8) return onText(null); if (op === 1) onText(p.toString('utf8')); } }; }
if (!LOCAL) {
  const server = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/plain' }); r.end('orb relay: open the tool page with ?bridge=ws://localhost:' + PORT + '\n'); });
  server.on('upgrade', (req, s) => {
    const key = req.headers['sec-websocket-key']; if (!key) return s.destroy();
    const acc = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC11B65').digest('base64');
    s.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + acc + '\r\n\r\n');
    if (sock) sock.destroy(); sock = s; say('page connected');
    s.on('data', reader(t => { if (t == null) { s.end(); return; } let m; try { m = JSON.parse(t); } catch (e) { return; }
      if (m.method === 'orb/hello') { say('page ' + ((m.params && m.params.page) || '')); while (waiting.length) send(waiting.shift()); return; }
      if (m.id != null && inflight.has(m.id)) { const orig = inflight.get(m.id); inflight.delete(m.id); m.id = orig; out(m); } }));
    s.on('close', () => { if (sock === s) { sock = null; say('page gone'); } }); s.on('error', () => { });
  });
  server.listen(PORT, '127.0.0.1', () => say('listening on ws://localhost:' + PORT));
}
let n = 0;
function send(req) { if (req.id == null) { sock.write(frame(JSON.stringify(req))); return; }
  const rid = 'r' + (++n); inflight.set(rid, req.id); sock.write(frame(JSON.stringify(Object.assign({}, req, { id: rid })))); }

// ---- the stdio side ----
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', async d => { buf += d; let i;
  while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue;
    let req; try { req = JSON.parse(line); } catch (e) { out({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }); continue; }
    if (local) { const r = await local.handle(req); if (r) out(r); continue; }
    if (sock) { send(req); continue; }
    waiting.push(req);
    if (req.id != null) setTimeout(() => { const k = waiting.indexOf(req); if (k >= 0) { waiting.splice(k, 1); out({ jsonrpc: '2.0', id: req.id, error: { code: -32000, message: 'no orb page is connected: open the tool with ?bridge=ws://localhost:' + PORT } }); } }, 15000); } });
process.stdin.on('end', () => process.exit(0));

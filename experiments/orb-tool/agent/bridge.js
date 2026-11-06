/* ORB TOOL agent: an MCP-style JSON-RPC 2.0 bridge so an outside agent (Claude, a script, another window) can drive the orb.
   The method names and result shapes follow the Model Context Protocol: initialize, tools/list, tools/call
   (results are { content: [{ type: 'text', text }], isError }). Transports:
     - postMessage: any window may post { jsonrpc: '2.0', id, method, params } to the page; the reply is posted back to
       event.source. (The core's own { orb: ... } messages are separate and still work.)
     - WebSocket (optional): open the page with ?bridge=ws://localhost:8787 and it connects out to agent/bridge-relay.js,
       which speaks MCP over stdio to the agent on one side and this bridge on the other.
   createServer(orb, { commands, describe, name }) -> { handle(request) -> response | Promise<response> | null, tools }
   attach(orb, opts) (browser) wires the transports. Browser: window.ORB_BRIDGE. Node: module.exports. */
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const PROTOCOL = '2024-11-05';

  const TOOLS = [
    { name: 'orb_describe', description: 'A plain-text account of the current memory: what exists, its making stage, what is missing before the blow (with the command for each), pending proposals, what the person did last, and NEXT. Read this first and after each change.',
      inputSchema: { type: 'object', properties: {} } },
    { name: 'orb_command', description: 'Run one or more lines of the orb command language (separate with ; or newlines), e.g. "cake target brown-dome; make sponge", "write 生日快乐", "candles 7", "kneel 0.4", "turn -20", "child 2 later 0.5", "hold", "blow", "undo". Applied at once as one undoable step. Use "help" for the list. Prefer orb_propose when the person is working too.',
      inputSchema: { type: 'object', properties: { line: { type: 'string' }, author: { type: 'string', description: 'agent:<name>; default agent:mcp' } }, required: ['line'] } },
    { name: 'orb_propose', description: 'Suggest a change as a ghost the person sees on the device. They accept it (ACCEPT), turn a ring to adjust it, or dismiss it. Nothing changes until they do. Give a short note saying why. Returns the proposal ids; follow with orb_await_decision.',
      inputSchema: { type: 'object', properties: { line: { type: 'string', description: 'a command, e.g. "candles 7" or "make; make"' }, note: { type: 'string' }, author: { type: 'string' } }, required: ['line'] } },
    { name: 'orb_await_decision', description: 'Wait until the person answers a proposal (accepted, amended then accepted, or dismissed) or the timeout passes. Returns what happened and the value that was applied.',
      inputSchema: { type: 'object', properties: { id: { type: 'string' }, timeout_ms: { type: 'number', description: 'default 30000, at most 120000' } }, required: ['id'] } },
    { name: 'orb_do', description: 'Apply raw core ops (see core/SCHEMA.md): one {op,args} or a list (one undoable step). For things the command language does not cover.',
      inputSchema: { type: 'object', properties: { ops: {}, author: { type: 'string' } }, required: ['ops'] } },
    { name: 'orb_state', description: 'The memory state as JSON (core/SCHEMA.md section 1).', inputSchema: { type: 'object', properties: {} } },
    { name: 'orb_history', description: 'The undoable history, newest last: who did what (author hand or agent:<name>), and how many entries are applied.',
      inputSchema: { type: 'object', properties: { last: { type: 'number', description: 'how many of the newest to return; default 12' } } } },
    { name: 'orb_paths', description: 'Every settable path with its range and step, for set/nudge.', inputSchema: { type: 'object', properties: {} } }];

  function createServer(orb, opts) {
    opts = opts || {};
    const C = opts.commands || (node ? require('./commands.js') : root.ORB_COMMANDS);
    const name = opts.name || 'stelline-orb-tool';
    const text = (t, isError) => ({ content: [{ type: 'text', text: String(t) }], isError: !!isError });
    const authorOf = a => (a && /^agent:[\w.-]{1,32}$/.test(a.author || '')) ? a.author : 'agent:mcp';
    function applyLine(line, author, asProposal, note) {
      if (typeof line !== 'string' || !line.trim()) return text('line is required', true);
      const st = orb.state();
      let r = C.parse(asProposal && !/^\s*propose\s/i.test(line) ? 'propose ' + line + (note ? ' -- ' + note : '') : line, st);
      if (r.error) return text(r.error, true);
      if (r.help) return text(r.help);
      if (r.describe) return text(orb.describe());
      if (r.wait != null) return text('wait is for scripts; the bridge does not wait', true);
      const before = st.proposals.map(p => p.id);
      const res = orb.do(r, { author });
      if (!res.ok) return text('refused: ' + res.error, true);
      const now = orb.state();
      const made = now.proposals.filter(p => !before.includes(p.id)).map(p => p.id);
      const said = (Array.isArray(r) ? r : [r]).map(o => C.say ? C.say(o, st) : o.op).join('; ');
      return text((res.same ? 'no change: ' : 'done: ') + said + (made.length ? '\nproposed: ' + made.join(', ') : '') + '\n\n' + orb.describe().split('\n')[0]); }
    // every proposal ever seen, with its last args, so a decision can be reported after the ghost is gone
    const seen = {};
    const watch = st => { for (const p of st.proposals) seen[p.id] = { op: p.op, args: JSON.parse(JSON.stringify(p.args)), first: seen[p.id] ? seen[p.id].first : JSON.stringify(p.args) }; };
    watch(orb.state()); orb.on('change', st => watch(st));
    function awaitDecision(id, timeout) {
      timeout = Math.max(0, Math.min(120000, timeout == null ? 30000 : timeout));
      const pending = () => orb.state().proposals.some(p => p.id === id);
      if (!seen[id]) return Promise.resolve(text('no proposal ' + id + ' was ever made', true));
      const what = () => { const p = seen[id], st = orb.state(); return C.say ? C.say({ op: p.op, args: p.args }, st) : p.op + ' ' + JSON.stringify(p.args); };
      const amended = () => JSON.stringify(seen[id].args) !== seen[id].first ? ' (the person turned it from ' + seen[id].first + ' to ' + JSON.stringify(seen[id].args) + ')' : '';
      return new Promise(resolve => {
        let off = null, timer = null;
        const finish = () => { if (off) off(); if (timer) clearTimeout(timer);
          const h = orb.history().slice(0, orb.cursor()).reverse().find(e => e.via === id);
          if (h) resolve(text('accepted ' + id + ' by ' + (h.author === 'hand' ? 'the person' : h.author) + ': ' + what() + amended()));
          else if (pending()) resolve(text('no answer yet: ' + id + ' is still pending'));
          else resolve(text('dismissed ' + id + ': ' + what() + ' (or undone)')); };
        if (!pending()) return finish();
        off = orb.on('change', () => { if (!pending()) finish(); });
        timer = setTimeout(finish, timeout); }); }
    const CALL = {
      orb_describe: () => text(orb.describe()),
      orb_command: a => applyLine(a.line, authorOf(a), false),
      orb_propose: a => applyLine(a.line, authorOf(a), true, a.note),
      orb_await_decision: a => awaitDecision(a.id, a.timeout_ms),
      orb_do: a => { let ops = a.ops; if (typeof ops === 'string') { try { ops = JSON.parse(ops); } catch (e) { return text('ops is not JSON', true); } }
        const r = orb.do(ops, { author: authorOf(a) }); return r.ok ? text('done' + (r.same ? ' (no change)' : '') + '\n\n' + orb.describe().split('\n')[0]) : text('refused: ' + r.error, true); },
      orb_state: () => text(JSON.stringify(orb.state())),
      orb_history: a => { const h = orb.history(), n = Math.max(1, Math.min(200, (a && a.last) || 12));
        return text('applied ' + orb.cursor() + ' of ' + h.length + '\n' + h.slice(-n).map(e => e.i + ' ' + e.author + ': ' + e.label + (e.via ? ' (accepted ' + e.via + ')' : '') + (e.i >= orb.cursor() ? ' [undone]' : '')).join('\n')); },
      orb_paths: () => text(orb.paths().map(p => p.path + ' ' + p.kind + (p.min != null && typeof p.min !== 'object' ? ' ' + p.min + '..' + p.max : '') + (p.step ? ' step ' + p.step : '')).join('\n')) };
    function handle(req) {
      if (!req || req.jsonrpc !== '2.0' || typeof req.method !== 'string') return req && req.id != null ? err(req.id, -32600, 'invalid request') : null;
      const id = req.id, p = req.params || {};
      const ok = result => id == null ? null : { jsonrpc: '2.0', id, result };
      switch (req.method) {
        case 'initialize': return ok({ protocolVersion: PROTOCOL, capabilities: { tools: {} }, serverInfo: { name, version: '1.0.0' },
          instructions: 'You are working on one memory (a birthday in the Blade Runner 2049 memory orb) with a person who holds the device. Call orb_describe first. Use orb_propose for changes while the person is working; orb_command when you are building alone. The memory is complete when the candles are blown.' });
        case 'notifications/initialized': case 'initialized': return null;
        case 'ping': return ok({});
        case 'tools/list': return ok({ tools: TOOLS });
        case 'tools/call': { const f = CALL[p.name]; if (!f) return err(id, -32602, 'unknown tool ' + p.name);
          let r; try { r = f(p.arguments || {}); } catch (e) { r = text('failed: ' + e.message, true); }
          return r && typeof r.then === 'function' ? r.then(ok) : ok(r); }
        default: return id == null ? null : err(id, -32601, 'method not found: ' + req.method); } }
    const err = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
    return { handle, tools: TOOLS }; }

  // browser transports
  function attach(orb, opts) {
    opts = opts || {};
    const srv = createServer(orb, opts), status = { ws: 'off', calls: 0 };
    const reply = async (req, send) => { status.calls++; const r = await srv.handle(req); if (r) send(r); };
    root.addEventListener('message', e => { const d = e.data; if (!d || d.jsonrpc !== '2.0' || !d.method) return; const src = e.source || root;
      reply(d, r => { try { src.postMessage(r, '*'); } catch (x) { } }); });
    const url = opts.ws || (root.location && new URLSearchParams(root.location.search).get('bridge'));
    if (url && /^wss?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(url)) {
      let ws = null, tries = 0;
      const open = () => { try { ws = new WebSocket(url); } catch (e) { status.ws = 'failed'; return; } status.ws = 'connecting';
        ws.onopen = () => { status.ws = 'open'; tries = 0; ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'orb/hello', params: { page: root.location ? root.location.pathname : '' } })); };
        ws.onmessage = ev => { let d; try { d = JSON.parse(ev.data); } catch (e) { return; } reply(d, r => ws.send(JSON.stringify(r))); };
        ws.onclose = () => { status.ws = 'closed'; if (tries++ < 20) setTimeout(open, Math.min(8000, 500 * tries)); }; };
      open(); }
    root.ORB_BRIDGE.status = status; root.ORB_BRIDGE.server = srv;
    return srv; }

  const API = { createServer, attach, TOOLS, PROTOCOL };
  if (node) module.exports = API; else root.ORB_BRIDGE = API;
})(typeof window !== 'undefined' ? window : globalThis);

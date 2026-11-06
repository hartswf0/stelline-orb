/* ORB TOOL agent: the command drawer. A pull-up sheet the shell mounts behind (i) or the ASK button.
   It shows a running account of every change (who did it: the person or an agent), the pending ghosts,
   and a command line in the language of agent/commands.js. Typed lines are the person's (author 'hand').
     const con = ORB_CONSOLE.mount(ORB, { parent: document.body, author: 'hand' });
     con.open(); con.close(); con.toggle(); con.run('candles 7'); con.isOpen()
   Keys in the line: Enter runs, Up/Down walk the line history, Tab completes a command word, Escape closes.
   Needs agent/commands.js (ORB_COMMANDS) and, for describe, agent/describe.js (installed here if present). */
(function (root) {
  'use strict';
  const CSS = `
.orbc{position:fixed;left:0;right:0;bottom:0;height:var(--orbc-h,min(62dvh,560px));transform:translateY(102%);transition:transform .18s ease-out;z-index:50;
  display:flex;flex-direction:column;background:var(--orbc-bg,#0b0c0b);color:var(--orbc-ink,#d8d2c4);border-top:1px solid #3a3a34;
  font:500 13px/1.45 'IBM Plex Mono',ui-monospace,Menlo,monospace;box-shadow:0 -12px 40px rgba(0,0,0,.6);touch-action:auto;-webkit-user-select:text;user-select:text}
.orbc.open{transform:none}
.orbc-head{display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid #26261f;letter-spacing:.08em;font-weight:700;font-size:11px;color:#a49c88}
.orbc-head b{color:#e9c27a;font-weight:700}
.orbc-head .sp{flex:1}
.orbc-x{background:none;border:1px solid #3a3a34;color:#d8d2c4;font:inherit;padding:3px 10px;border-radius:3px;cursor:pointer}
.orbc-log{flex:1;overflow-y:auto;padding:8px 14px;white-space:pre-wrap;word-break:break-word;overscroll-behavior:contain}
.orbc-log div{margin:1px 0}
.orbc-log .in{color:#f1ead8}
.orbc-log .in::before{content:'> ';color:#6f6a5c}
.orbc-log .ok{color:#9fc79a}
.orbc-log .err{color:#e8a35c}
.orbc-log .ag{color:#8fb7d8}
.orbc-log .hd{color:#c9c2b0}
.orbc-log .dim{color:#7b7565}
.orbc-ghosts{padding:0 14px;border-top:1px solid #26261f}
.orbc-ghost{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px dashed #2c2c26;color:#8fb7d8}
.orbc-ghost span{flex:1}
.orbc-ghost button{background:none;border:1px solid #3a3a34;color:#d8d2c4;font:inherit;font-size:11px;padding:2px 8px;border-radius:3px;cursor:pointer}
.orbc-line{display:flex;gap:8px;padding:8px 14px calc(8px + env(safe-area-inset-bottom));border-top:1px solid #26261f;align-items:center}
.orbc-line label{color:#6f6a5c}
.orbc-line input{flex:1;min-width:0;background:#141512;color:#f1ead8;border:1px solid #3a3a34;border-radius:3px;padding:8px 10px;font:inherit;font-size:16px;outline:none}
.orbc-line input:focus{border-color:#e9c27a}`;

  function mount(ORB, opts) {
    opts = opts || {};
    const C = opts.commands || root.ORB_COMMANDS, author = opts.author || 'hand';
    if (!C) throw new Error('ORB_CONSOLE needs agent/commands.js loaded first');
    if (root.ORB_DESCRIBE && opts.describe !== false) root.ORB_DESCRIBE.install(ORB);
    const doc = root.document;
    if (!doc.getElementById('orbc-css')) { const st = doc.createElement('style'); st.id = 'orbc-css'; st.textContent = CSS; doc.head.appendChild(st); }
    const el = doc.createElement('section'); el.className = 'orbc'; el.setAttribute('aria-label', 'Command line');
    el.innerHTML = '<div class="orbc-head"><b>COMMANDS</b><span class="orbc-st"></span><span class="sp"></span><button class="orbc-x" type="button">CLOSE</button></div>' +
      '<div class="orbc-log" role="log" aria-live="polite"></div><div class="orbc-ghosts"></div>' +
      '<form class="orbc-line" autocomplete="off"><label for="orbc-in">&gt;</label><input id="orbc-in" enterkeyhint="go" spellcheck="false" autocapitalize="off" placeholder="type help, or: candles 7"></form>';
    (opts.parent || doc.body).appendChild(el);
    const log = el.querySelector('.orbc-log'), input = el.querySelector('input'), ghosts = el.querySelector('.orbc-ghosts'), stl = el.querySelector('.orbc-st');
    // keep the device's keyboard shortcuts out of the line
    for (const ev of ['keydown', 'keyup', 'pointerdown', 'wheel']) el.addEventListener(ev, e => e.stopPropagation());
    const lines = []; let at = 0, typing = false;
    function out(text, cls) { const d = doc.createElement('div'); d.className = cls || ''; d.textContent = text; log.appendChild(d);
      while (log.childNodes.length > 400) log.removeChild(log.firstChild); log.scrollTop = log.scrollHeight; }
    function status() { const s = ORB.state(); stl.textContent = (ORB.describe().split('\n')[0] || '').replace(/^MEMORY /, '');
      ghosts.innerHTML = '';
      for (const p of s.proposals) { const g = doc.createElement('div'); g.className = 'orbc-ghost';
        const t = doc.createElement('span'); t.textContent = p.id + '  ' + (C.say ? C.say({ op: p.op, args: p.args }, s) : p.op) + (p.note ? '  -- ' + p.note : '') + '  (' + p.author + ')';
        const a = doc.createElement('button'); a.type = 'button'; a.textContent = 'ACCEPT'; a.onclick = () => run('accept ' + p.id);
        const r = doc.createElement('button'); r.type = 'button'; r.textContent = 'DISMISS'; r.onclick = () => run('reject ' + p.id);
        g.append(t, a, r); ghosts.appendChild(g); } }
    // every change, whoever made it, is written in the account; the console's own lines are already echoed
    ORB.on('change', (s, entry) => { if (!entry || typing) { status(); return; }
      const who = entry.author === 'hand' ? 'the person' : entry.author;
      out(who + ': ' + entry.label + (entry.via ? ' (accepted ' + entry.via + ')' : ''), entry.author === 'hand' ? 'hd' : 'ag'); status(); });
    ORB.on('refuse', (op, error) => { if (!typing) out('refused: ' + error, 'err'); });
    function run(line, who) {
      line = String(line || '').trim(); if (!line) return null;
      out(line, 'in'); lines.push(line); at = lines.length;
      const r = C.parse(line, ORB.state());
      if (r.error) { out(r.error, 'err'); return r; }
      if (r.help) { out(r.help, 'dim'); return r; }
      if (r.describe) { out(ORB.describe(), 'dim'); return r; }
      if (r.wait != null) { out('wait is for scripts', 'dim'); return r; }
      typing = true; let res;
      try { res = ORB.do(r, { author: who || author }); } finally { typing = false; }
      if (!res.ok) out('refused: ' + res.error, 'err');
      else out(res.same ? 'no change' : (Array.isArray(r) ? r : [r]).map(o => C.say ? C.say(o, ORB.state()) : o.op).join('; '), 'ok');
      status(); return res; }
    el.querySelector('form').addEventListener('submit', e => { e.preventDefault(); const v = input.value; input.value = ''; run(v); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp') { if (at > 0) { at--; input.value = lines[at]; } e.preventDefault(); }
      else if (e.key === 'ArrowDown') { at = Math.min(lines.length, at + 1); input.value = lines[at] || ''; e.preventDefault(); }
      else if (e.key === 'Escape') close();
      else if (e.key === 'Tab') { const w = input.value.trim(); if (w && !/\s/.test(w)) { const m = C.verbs().filter(v => v.startsWith(w.toLowerCase()));
        if (m.length === 1) input.value = m[0] + ' '; else if (m.length) out(m.join('  '), 'dim'); e.preventDefault(); } } });
    el.querySelector('.orbc-x').onclick = () => close();
    let isOpen = false;
    function open() { isOpen = true; el.classList.add('open'); status(); if (opts.focus !== false) setTimeout(() => input.focus(), 30); if (!log.childNodes.length) out('Type a command. help lists them; describe says where the memory is.', 'dim'); }
    function close() { isOpen = false; el.classList.remove('open'); input.blur(); if (opts.onClose) opts.onClose(); }
    status();
    return { el, open, close, toggle: () => (isOpen ? close() : open()), isOpen: () => isOpen, run, out, input }; }

  root.ORB_CONSOLE = { mount };
})(typeof window !== 'undefined' ? window : globalThis);

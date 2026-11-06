/* chart.js — draws state-chart.svg from the machine's own declared tables (memory.js) and the transitions test.js saw taken (coverage.json + traces.json). Run after test.js. */
'use strict';
const fs = require('fs'), path = require('path'), M = require('./memory.js');
const cov = JSON.parse(fs.readFileSync(path.join(__dirname, 'coverage.json'))), tr = JSON.parse(fs.readFileSync(path.join(__dirname, 'traces.json')));
const scen = {}; ['earned', 'impatient', 'callOnly', 'callInGoodRoom', 'pushOnly', 'waitOnly'].forEach(k => tr[k].transitions.forEach(t => { const a = t.from.split('.')[0], b = t.to.split('.')[0]; if (a !== b) scen[a + '>' + b] = (scen[a + '>' + b] || 0) + 1; }));
const POS = { watch: [380, 250], approach: [620, 120], blow: [640, 380], retreat: [140, 110], refuse: [120, 390], hide: [380, 470] };
const COL = { watch: '#8fa39c', approach: '#4fae7a', retreat: '#c98a3c', hide: '#6a7cc0', refuse: '#c9504a', blow: '#c9a43a' };
let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 600" font-family="Arial, sans-serif" font-size="11">
<rect width="760" height="600" fill="#0b0d0d"/><defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#9aa6a2"/></marker>
<marker id="m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#4a5250"/></marker></defs>
<text x="16" y="24" fill="#e8b264" font-size="14" letter-spacing="1.5">HER BIRTHDAY · THE GIRL'S DECLARED STATE CHART</text>
<text x="16" y="42" fill="#7f8b87">Generated from memory.js (ALLOWED, SUBS, GUARDS, DWELL). </text><text x="16" y="56" fill="#7f8b87">Line weight and number: times taken in 200 random runs + 6 scripted scenarios (test.js). Grey dashed: declared, never taken.</text>`;
Object.entries(M.ALLOWED).forEach(([a, bs]) => bs.forEach(b => { const n = (cov.transitionsTaken[a + '>' + b] || 0) + (scen[a + '>' + b] || 0), [x1, y1] = POS[a], [x2, y2] = POS[b];
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ox = -dy / L * 10, oy = dx / L * 10, sx = x1 + dx / L * 62 + ox, sy = y1 + dy / L * 34 + oy, ex = x2 - dx / L * 62 + ox, ey = y2 - dy / L * 34 + oy;
  s += `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${n ? '#9aa6a2' : '#4a5250'}" stroke-width="${n ? Math.min(5, 1 + Math.log2(1 + n) * .6).toFixed(1) : 1}" ${n ? '' : 'stroke-dasharray="4 4"'} marker-end="url(#${n ? 'a' : 'm'})"/>`;
  s += `<text x="${((sx + ex) / 2 + ox * 1.2).toFixed(1)}" y="${((sy + ey) / 2 + oy * 1.2).toFixed(1)}" fill="#6f7c77" font-size="9" text-anchor="middle">${n}</text>`; }));
M.STATES.forEach(st => { const [x, y] = POS[st]; s += `<rect x="${x - 60}" y="${y - 32}" width="120" height="64" rx="10" fill="#121514" stroke="${COL[st]}" stroke-width="2"/>
<text x="${x}" y="${y - 12}" fill="${COL[st]}" font-size="14" text-anchor="middle" font-weight="bold">${st}</text><text x="${x}" y="${y + 4}" fill="#9aa6a2" font-size="9.5" text-anchor="middle">${M.SUBS[st].join(' · ')}</text>
<text x="${x}" y="${y + 18}" fill="#6f7c77" font-size="9" text-anchor="middle">${st === 'blow' ? 'window 0.8 + 1.1 + 1.3 s' : 'dwell ' + M.DWELL[st] + ' s' + (st === 'retreat' || st === 'refuse' ? ' · danger' : '')}</text>`; });
let gy = 520; s += `<text x="16" y="${gy}" fill="#e8b264" font-size="11">GUARDS</text>`;
['approach', 'blow', 'retreat'].forEach((k, i) => { s += `<text x="16" y="${gy + 16 + i * 14}" fill="#9aa6a2"><tspan fill="${COL[k]}">${k}</tspan>: ${M.GUARDS[k].replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`; });
s += `<text x="16" y="${gy + 62}" fill="#6f7c77" font-size="9.5">Choice: the highest utility among the current state (+0.12 hysteresis) and its declared successors whose guards pass; a danger state may cut a calm state's dwell when 0.25 higher.</text></svg>`;
fs.writeFileSync(path.join(__dirname, 'state-chart.svg'), s); console.log('state-chart.svg written');

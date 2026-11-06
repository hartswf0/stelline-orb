p='src/body.js'; s=open(p,encoding='utf8').read()
def rep(a,b):
    global s
    assert s.count(a)==1,(a[:80],s.count(a)); s=s.replace(a,b)
rep("room: { mist: 0, mess: 0 } });","room: { mist: 0, mess: 0, place: null, era: 0 }, title: '', line: '' });")
rep("let DOC = DOC0();","let DOC = DOC0(); const ERAS = ['THE DOME', 'SILVER', 'SEPIA', 'KODACHROME', 'FADED', 'VIDEOTAPE', 'PHONE'];")
rep("  if (p.key === 'room') return [num('MIST', () => Rm.mist, v => Rm.mist = v, 0, 1, .05, v => Math.round(v * 100) + '%'), num('MESS', () => Rm.mess, v => { Rm.mess = v; dirty.mess = true; }, 0, 1, .05, v => Math.round(v * 100) + '%')];",
"  if (p.key === 'room') { const PL = [null, ...CAT.filter(c => c.kind === 'place').map(c => c.id)]; return [list('PLACE', () => Math.max(0, PL.indexOf(Rm.place || null)), v => { Rm.place = PL[v]; }, PL.map(id => id ? CATBY[id].name : 'THE DOME')), list('ERA', () => Rm.era || 0, v => Rm.era = v, ERAS),\n    num('MIST', () => Rm.mist, v => Rm.mist = v, 0, 1, .05, v => Math.round(v * 100) + '%'), num('MESS', () => Rm.mess, v => { Rm.mess = v; dirty.mess = true; }, 0, 1, .05, v => Math.round(v * 100) + '%')]; }")
rep("grade.uniforms.mist.value = DOC.room.mist;","grade.uniforms.mist.value = DOC.room.mist; grade.uniforms.era.value = DOC.room.era || 0; buildPlace(DOC.room.place);")
rep("  const L = [{ n: 'CAKES', items: PRESETS.map((p, i) => ({ key: 'cake:' + i, name: p[0] })) }];","  const L = [{ n: 'BIRTHDAYS', items: BIRTHDAYS.map((b, i) => ({ key: 'bday:' + i, name: b.title, from: b.line })) }, { n: 'CAKES', items: PRESETS.map((p, i) => ({ key: 'cake:' + i, name: p[0] })) }];")
rep("function create(key) { const [k, r] = key.split(':');","function create(key) { const [k, r] = key.split(':'); if (k === 'bday') { setDoc(makeBirthday(BIRTHDAYS[+r])); S.pick = 'cake'; say(DOC.title); return; }")
rep("snap(true); create(x.key); S.add = null; ghostDirty = true; chime(); say(x.name + ' · IN'); } }","snap(true); create(x.key); S.add = null; ghostDirty = true; chime(); if (!x.key.startsWith('bday')) say(x.name + ' · IN'); } }")
rep("S.add = { s: DOC.cake ? 1 : 0, i: 0 };","S.add = { s: DOC.cake ? 2 : 0, i: 0 };")
rep("/* =============================================================== THE SHELVES", open('tools/birthdays.js',encoding='utf8').read()+"/* =============================================================== THE SHELVES")
rep("else if (!PHONE && !DOC.cake && !DOC.items.length) x.fillText('PRESS ADD', W / 2, 280);","else if (!PHONE && !DOC.cake && !DOC.items.length) x.fillText('PRESS ADD', W / 2, 280); else if (!PHONE && DOC.title) { x.fillStyle = '#f0d9a8'; x.fillText(DOC.title, W / 2, 262); x.fillStyle = DIM; x.font = '500 22px ui-monospace, Menlo, monospace'; x.fillText(DOC.line.slice(0, 92), W / 2, 300); }")
open(p,'w',encoding='utf8').write(s); print('ok')

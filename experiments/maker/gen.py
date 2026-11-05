# Builds maker.html: the lean memory maker. Reuses the weaver's orb model, dial labels, icons and pairing; everything else is new.
import re
W=open('/home/claude/stelline-orb/weaver.html').read().split('\n')
def lines(a,b): return '\n'.join(W[a-1:b])
def find(prefix, start=0):
    for i,l in enumerate(W):
        if i>=start and l.startswith(prefix): return i+1
    raise Exception(prefix)
L_orb=find("const orbEl = document.getElementById('orb');"); L_btn=find("// buttons: two on the grip housing"); L_fit=find("function fitOrb()")
orb_block=lines(L_orb, L_btn-1)
icons=lines(find("function drawIcon("), find("function labelOld(")-1)
fit=lines(L_fit, L_fit+2)
tick=lines(find("function tick(kind, i)"), find("function tick(kind, i)")+3)
tone=lines(find("function tone(f0"), find("function tone(f0"))
pair=lines(find("const PHONE = "), find("function drawPairQR(")+3)
# orb block edits
orb_block=orb_block.replace("const lensG = new T.Group(); lensG.position.x = 1.02; ORB.add(lensG);","const lensG = new T.Group(); lensG.position.x = 1.02; lensG.userData.lens = true; ORB.add(lensG);")
orb_block=orb_block.replace("cap.userData.grip = true;","cap.userData.grip = true;")
assert "userData.grip = true" in orb_block
# the dial label: inert rings say nothing
orb_block=orb_block.replace("if (!r) { x.fillStyle = '#2e4a45'; x.font = '600 34px ui-monospace, Menlo, monospace'; x.fillText('—', W / 2, 84); }","if (!r) { R0.lp.visible = false; R0.lt.needsUpdate = true; return; } else if (!(R0.lp.visible = true)) { }")
assert "R0.lp.visible = false" in orb_block
icons=icons.replace("const WORD = { MODE: 'MODE', UNDO: 'UNDO', CAPTURE: 'DO', PLAY: 'PLAY', KEEP: 'KEEP' };","const WORD = { UNDO: 'UNDO', CAPTURE: 'DO', PLAY: 'RECALL', KEEP: 'KEEP' };")
pair=pair.replace("step: GSTEPS[GUIDE.i] ? GSTEPS[GUIDE.i].t : ''","step: nextAct() ? nextAct().t : ''").replace("'stelline-weaver/v1/'","'stelline-maker/v1/'").replace("new BroadcastChannel('stelline-weaver')","new BroadcastChannel('stelline-maker')")
pair=pair.replace("'https://hartswf0.github.io/stelline-orb/weaver.html'","'https://hartswf0.github.io/stelline-orb/maker.html'").replace("'SCAN, OR OPEN WEAVER.HTML?ORB&ROOM='","'SCAN, OR OPEN MAKER.HTML?ORB&ROOM='")
pair=pair.replace("say(S.pairShow ? 'SCAN WITH YOUR PHONE · OR OPEN WEAVER?ORB AND TYPE ' + room : 'PAIRING HIDDEN');","say(S.pairShow ? 'SCAN THE CODE WITH YOUR PHONE' : '');")
pair=pair.replace("else if (m.k === 'press') press(m.b, m.long); }","else if (m.k === 'press') press(m.b, m.long); else if (m.k === 'view') viewBy(m.dx, m.dy, m.dc); }").replace('mode: S.mode,', "mode: (picked() || {}).name || '',")
assert "m.k === 'view'" in pair and 'picked()' in pair
assert "nextAct()" in pair and "maker.html" in pair
head=open('/home/claude/stelline-work/maker/head.html').read(); body=open('/home/claude/stelline-work/maker/body.js').read()
out=head.replace('/*BODY*/', body).replace('/*ORB*/', orb_block).replace('/*ICONS*/', icons).replace('/*FIT*/', fit).replace('/*TICK*/', tick+'\n'+tone).replace('/*PAIR*/', pair)
open('/home/claude/stelline-orb/maker.html','w').write(out); print('maker.html', len(out))

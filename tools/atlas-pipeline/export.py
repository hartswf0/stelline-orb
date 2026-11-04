import json, numpy as np
D=json.load(open('atlas.json'))
cls={}
for s in D['sec']:
    for g in s['segs']:
        cls.setdefault(g['cls'],[]).append(g)
pri={}
for c,v in cls.items():
    w=np.array([g['a'] for g in v])+1e-6
    wm=lambda k: float(np.average([g[k] for g in v],weights=w))
    q=np.array([g['lq'] for g in v]).mean(0)
    pri[c]=dict(n=len(v),lv=round(wm('lv'),2),q=[round(float(x),3) for x in q],L=round(wm('L'),1),rel=round(wm('rel'),2),fo=round(wm('fo'),2),tex=round(wm('tex'),1),sd=round(wm('sd'),1))
D['priors']=pri
D['levels']=['FLAT','GRADIENT','RELIEF','MOSAIC','FILM']
D['chapters']=[
 dict(t=0,name='THE ROOM',note='A dim room. Two figures, close, low light.'),
 dict(t=14,name='THE FOREST',note='Green canopy, light shafts, a wet leaf, a beetle, a woman with a camera.'),
 dict(t=57,name='THE WHITE DOME',note='Pale curved chamber. Two people talk; haze and soft light strips.'),
 dict(t=130,name='THE BIRTHDAY',note='Darkness. A glowing cake, candles, children as cut-outs, amber light.'),
 dict(t=200,name='THE WATCHER',note='A man in shadow, then the dome again, cold and quiet.'),
 dict(t=250,name='THE LAB',note='White laboratory, a console, two faces, held tears.'),
]
open('/home/user/stelline-orb/assets/atlas/atlas-data.js','w').write('// Footage-wide segmentation atlas: 407 s @ 1 Hz, classical CV (SLIC + region merge + person/face priors)\nwindow.STELLINE_ATLAS='+json.dumps(D,separators=(',',':'))+';\n')
import os; print(os.path.getsize('/home/user/stelline-orb/assets/atlas/atlas-data.js')//1024,'KB'); print(len(D['shots']))

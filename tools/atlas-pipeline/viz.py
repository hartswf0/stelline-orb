import cv2,numpy as np,json,sys
D=json.load(open('atlas.json')); A='/home/user/stelline-orb/assets/atlas'
secs=[int(x) for x in sys.argv[2].split(',')]
import hashlib
def col(tid):
    h=int(hashlib.md5(tid.encode()).hexdigest()[:6],16); return np.array([(h>>16)&255,(h>>8)&255,h&255],np.uint8)//2+90
tiles=[]
for s in secs:
    f=cv2.imread(f'{A}/f/{s:04d}.jpg'); L=cv2.imread(f'{A}/l/{s:04d}.png',0); d=cv2.imread(f'{A}/d/{s:04d}.jpg',0)
    pal=np.zeros((256,3),np.uint8)
    for g in D['sec'][s]['segs']: pal[g['i']]=col(g['tid'])
    ov=cv2.addWeighted(f,0.5,pal[L],0.5,0)
    ov[cv2.Canny(L,0,1)>0]=255
    for g in D['sec'][s]['segs']:
        cv2.putText(ov,g['id'],(int(g['cx']*480)-20,int(g['cy']*270)),0,0.36,(255,255,255),1,cv2.LINE_AA)
    dd=cv2.applyColorMap(cv2.resize(d,(480,270)),cv2.COLORMAP_TURBO)
    cv2.putText(ov,f"{s}s sh{D['sec'][s]['shot']} {D['sec'][s]['scale']}",(5,14),0,0.45,(0,255,255),1)
    tiles.append(np.hstack([ov,dd]) if sys.argv[3]=='d' else ov)
cols=2 if sys.argv[3]=='d' else 3
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles)-len(tiles)%cols,cols)]
cv2.imwrite(sys.argv[1],np.vstack(rows))

# Offline "critic": reconstruct each segment from progressively richer parameter sets and measure fidelity.
import numpy as np, cv2, json
from skimage.metrics import structural_similarity as ssim
A='/home/user/stelline-orb/assets/atlas'; D=json.load(open('atlas.json'))
FW,FH=480,270
LEVELS=['FLAT','GRADIENT','RELIEF-SHADE','TONAL-MOSAIC','FILM']
res={}
def recon(level,seg,m,bgr,rel):
    base=np.array([int(seg['rgb'][5:7],16),int(seg['rgb'][3:5],16),int(seg['rgb'][1:3],16)],np.float32) # BGR
    out=np.zeros((FH,FW,3),np.float32)+base
    if level>=1:
        yy,xx=np.mgrid[0:FH,0:FW]; xx=xx/FW-seg['cx']; yy=yy/FH-seg['cy']
        g=seg['gr']  # R,G,B pairs
        for k,ch in enumerate((2,1,0)): out[...,ch]+=g[2*k]*xx+g[2*k+1]*yy
    if level>=2:
        out+= seg['kr']*(rel-seg['rel'])[...,None]
    if level>=3:
        mos=cv2.blur(bgr.astype(np.float32),(11,11))
        out=np.where(True,mos+0*out,out) if level==3 else out
    if level>=4: out=bgr.astype(np.float32)
    return np.clip(out,0,255)
stats={}
for s in range(407):
    bgr=cv2.imread(f'{A}/f/{s:04d}.jpg'); L=cv2.imread(f'{A}/l/{s:04d}.png',0)
    rel=cv2.resize(cv2.imread(f'{A}/d/{s:04d}.jpg',0),(FW,FH)).astype(np.float32)/255
    gray=cv2.cvtColor(bgr,cv2.COLOR_BGR2GRAY).astype(np.float32)
    for seg in D['sec'][s]['segs']:
        m=L==seg['i']
        if m.sum()<80: seg['lq']=[1,1,1,1,1]; seg['lv']=0; continue
        # composite image where outside the segment is actual, so ssim windows are meaningful
        qs=[]
        for lv in range(5):
            rc=recon(lv,seg,m,bgr,rel)
            comp=np.where(m[...,None],rc,bgr.astype(np.float32))
            gc=cv2.cvtColor(comp.astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32)
            _,smap=ssim(gray,gc,data_range=255,full=True,win_size=7)
            q=float(smap[m].mean()); dE=float(np.abs(comp-bgr)[m].mean()/255)
            qs.append(round(max(0,q),3))
        seg['lq']=qs
        seg['lv']=next((i for i,q in enumerate(qs) if q>=0.90),4)
        stats.setdefault(seg['cls'],[]).append((seg['lv'],qs,seg['a']))
json.dump(D,open('atlas.json','w'),separators=(',',':'))
pri={}
for c,v in stats.items():
    lv=np.array([x[0] for x in v]); q=np.array([x[1] for x in v])
    pri[c]=dict(n=len(v),lv=float(np.average(lv,weights=[x[2] for x in v])),q=[round(float(x),3) for x in q.mean(0)])
for c in sorted(pri,key=lambda k:-pri[k]['n']): print(c,pri[c])

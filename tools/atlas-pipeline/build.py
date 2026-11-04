import numpy as np, cv2, json, os, sys, math
from multiprocessing import Pool
from scipy.optimize import linear_sum_assignment
import seg as S

OUT='/home/user/stelline-orb/assets/atlas'
for d in ('f','l','d'): os.makedirs(f'{OUT}/{d}',exist_ok=True)
N=407; FW,FH=480,270

def hue_name(a,b,L,C):
    if C<7:
        return 'black' if L<12 else 'charcoal' if L<28 else 'grey' if L<62 else 'silver' if L<86 else 'white'
    ang=(math.degrees(math.atan2(b,a))+360)%360
    # a>0 red, b>0 yellow
    if ang<20 or ang>=345: n='crimson' if L<45 else 'rose'
    elif ang<50: n='orange' if C>30 else 'tan' if L>45 else 'brown'
    elif ang<80: n='amber' if C>35 else 'khaki' if L>45 else 'olive-brown'
    elif ang<110: n='olive' if L<55 else 'lime'
    elif ang<165: n='green'
    elif ang<215: n='teal'
    elif ang<265: n='blue'
    elif ang<315: n='violet'
    else: n='magenta'
    return n
def color_name(L,a,b):
    C=math.hypot(a,b); h=hue_name(a,b,L,C)
    if h in ('black','charcoal','grey','silver','white'): return h
    lt='deep' if L<22 else 'dark' if L<40 else 'mid' if L<62 else 'pale' if L<82 else 'bright'
    sat='muted ' if C<16 else ''
    return f'{lt} {sat}{h}'

def refine(lm240,img480,lab480):
    k=int(lm240.max())+1
    # soft one-hot upsample
    p=np.stack([cv2.resize(cv2.GaussianBlur((lm240==c).astype(np.float32),(0,0),1.6),(FW,FH),interpolation=cv2.INTER_LINEAR) for c in range(k)],0)
    means=[]
    big0=cv2.resize(lm240,(FW,FH),interpolation=cv2.INTER_NEAREST)
    for c in range(k):
        m=big0==c; means.append(lab480[m].mean(0) if m.any() else np.zeros(3))
    means=np.array(means,np.float32)
    dist=np.stack([np.sqrt(((lab480-means[c])**2).sum(-1)) for c in range(k)],0)
    energy=np.log(p+0.03)*1.0-dist/9.0
    L=energy.argmax(0).astype(np.uint8)
    L=cv2.medianBlur(L,5)
    # remove tiny islands: reassign by nearest big neighbour via dilation votes
    for c in range(k):
        m=(L==c).astype(np.uint8)
        n,cc,st,_=cv2.connectedComponentsWithStats(m,connectivity=4)
        for i in range(1,n):
            if st[i,4]<60:
                mm=cc==i; dil=cv2.dilate(mm.astype(np.uint8),np.ones((3,3),np.uint8))>0
                ring=L[dil&~mm]
                if ring.size: L[mm]=np.bincount(ring).argmax()
    return L

def process(s):
    bgr=cv2.imread(f'frames/f_{s+1:04d}.jpg')
    lm,smooth,pm240,faces,lab240,gray240=S.segment_frame(bgr)
    lab480=S.lab_of(cv2.bilateralFilter(bgr,5,18,5))
    L=refine(lm,bgr,lab480)
    # compact renumber by area
    ids,cnt=np.unique(L,return_counts=True); order=ids[np.argsort(-cnt)]
    remap=np.zeros(256,np.uint8)
    for n,o in enumerate(order): remap[o]=n
    L=remap[L]
    k=len(order)
    pm=cv2.resize(S.person_mask(bgr),(FW,FH))
    gray=cv2.cvtColor(bgr,cv2.COLOR_BGR2GRAY)
    focus=S.focus_map(gray)
    ys=np.repeat(np.linspace(0,1,FH)[:,None],FW,1)
    xs=np.repeat(np.linspace(0,1,FW)[None,:],FH,0)
    gx=cv2.Sobel(gray.astype(np.float32),cv2.CV_32F,1,0); gy=cv2.Sobel(gray.astype(np.float32),cv2.CV_32F,0,1)
    grad=cv2.GaussianBlur(np.sqrt(gx*gx+gy*gy),(0,0),1.5)
    person_area=float((pm>0.5).mean())
    wide=float(np.clip(1-person_area*3.2,0,1))
    # relief proxy: 1 = nearest camera
    fb=cv2.GaussianBlur(focus,(0,0),5)
    relief=0.34*fb+0.30*np.clip(pm,0,1)+0.36*(ys**1.15)*(0.25+0.75*wide)
    for f in faces:
        x0,y0,x1,y1,_=f; r=np.zeros((FH,FW),np.float32)
        cv2.ellipse(r,(int((x0+x1)/2*FW),int((y0+y1)/2*FH)),(max(2,int((x1-x0)*FW*0.75)),max(2,int((y1-y0)*FH*0.8))),0,0,360,1,-1)
        relief=relief+0.18*cv2.GaussianBlur(r,(0,0),6)
    relief=(relief-np.percentile(relief,2))/(np.percentile(relief,99)-np.percentile(relief,2)+1e-6)
    relief=np.clip(relief,0,1)
    # flatten inside segments: seg mean + 0.55 local detail
    out=np.zeros_like(relief); segs=[]
    lum=lab480[...,0]
    for c in range(k):
        m=L==c
        a=float(m.mean())
        ysx,xsx=np.where(m)
        mean_rel=float(relief[m].mean())
        out[m]=mean_rel+0.55*(relief[m]-mean_rel)
        Lm,am,bm=[float(lab480[...,j][m].mean()) for j in range(3)]
        bgrm=bgr[m].mean(0)
        pmean=float(pm[m].mean())
        tex=float(grad[m].mean())
        fo=float(focus[m].mean())
        # face overlap
        fo_face=0.0
        for f in faces:
            x0,y0,x1,y1,_=f
            bx=np.zeros((FH,FW),bool); bx[int(y0*FH):int(y1*FH),int(x0*FW):int(x1*FW)]=True
            if bx.sum()>0: fo_face=max(fo_face,float((m&bx).sum()/bx.sum()))
        yy=ysx/FH; xx=xsx/FW
        X=np.stack([np.ones_like(xx),xx-xx.mean(),yy-yy.mean()],1)
        gr=[]
        for ch in (2,1,0):   # R,G,B from BGR
            v=bgr[...,ch][m].astype(np.float64)
            co,_,_,_=np.linalg.lstsq(X,v,rcond=None); gr+= [float(co[1]),float(co[2])]
        lv=bgr[...,1][m].astype(np.float64)
        rd=relief[m]-mean_rel
        # luminance residual after gradient, regressed on relief detail
        res=lv-(X@np.linalg.lstsq(X,lv,rcond=None)[0])
        kr=float((res*rd).sum()/((rd*rd).sum()+1e-6)) if rd.std()>1e-4 else 0.0
        sd=float(lv.std())
        segs.append(dict(gr=gr,kr=kr,sd=sd,i=c,a=a,cx=float(xsx.mean()/FW),cy=float(ysx.mean()/FH),
            bb=[float(xsx.min()/FW),float(ysx.min()/FH),float((xsx.max()+1)/FW),float((ysx.max()+1)/FH)],
            L=Lm,A=am,B=bm,rgb='#%02x%02x%02x'%(int(bgrm[2]),int(bgrm[1]),int(bgrm[0])),
            p=pmean,tex=tex,fo=fo,ff=fo_face,rel=mean_rel))
    out=cv2.GaussianBlur(out,(0,0),1.2)
    d240=cv2.resize(np.clip(out,0,1),(240,135),interpolation=cv2.INTER_AREA)
    # classify
    face_top=min([f[1] for f in faces],default=None)
    pys=np.where((pm>0.5).any(1))[0]
    ptop=float(pys.min()/FH) if len(pys) else 0.0; pbot=float((pys.max()+1)/FH) if len(pys) else 1.0
    for g in segs: g['cls']=classify(g,faces,ptop,pbot)
    stats=dict(luma=float(lab480[...,0].mean()/100),warm=float(np.clip(lab480[...,2].mean()/40+lab480[...,1].mean()/60,-1,1)),
               sat=float(np.hypot(lab480[...,1],lab480[...,2]).mean()/50),
               contrast=float(lab480[...,0].std()/100),person=person_area,
               faces=[[float(v) for v in f[:4]] for f in faces],
               scale=scale_of(person_area,faces,wide))
    return s,L,d240,segs,stats,bgr,pm

def classify(g,faces,ptop=0.0,pbot=1.0):
    L,a,b=g['L'],g['A'],g['B']; C=math.hypot(a,b); A=g['a']; cy=g['cy']; cx=g['cx']; bb=g['bb']
    ang=(math.degrees(math.atan2(b,a))+360)%360
    skin=(4<a<34 and 6<b<44 and L>16 and 15<ang<75)
    wspan=bb[2]-bb[0]; hspan=bb[3]-bb[1]
    if g['p']>0.5 and A>0.004:
        if g['ff']>0.22 and A<0.14 and (skin or L>38 or A<0.05): return 'FACE'
        near=None
        for f in faces:
            if f[0]-0.5*(f[2]-f[0])<cx<f[2]+0.5*(f[2]-f[0]) and cy<f[3]+0.02 and f[1]-0.25<cy: near=f
        rel=(cy-ptop)/max(pbot-ptop,0.05)
        if skin and L>22 and rel<0.75 and A<0.2: return 'SKIN'
        if (near and L<55 and tex_ok(g)) or (not faces and rel<0.22 and L<55): return 'HAIR'
        if near and L<55 and A<0.05: return 'HAIR'
        if L>66 and C<16: return 'WHITE.GARMENT'
        if L<28: return 'DARK.COAT'
        return 'GARMENT'
    if g['p']>0.5: return 'FIGURE'
    if L>60 and b>26 and a>-2 and A<0.04: return 'FLAME'
    if L>90 and A<0.06: return 'LIGHT'
    if L<14 and A>0.05: return 'VOID'
    if a<-6 and b>6 and A>0.04 and g['tex']>9 and C>14: return 'FOLIAGE'
    if a<-6 and b>6 and A>0.015 and g['tex']>7 and C>14: return 'GREENERY'
    if cy<0.30 and wspan>0.45 and A>0.04: return 'CEILING'
    if cy>0.66 and wspan>0.5 and A>0.05: return 'FLOOR'
    if L<24 and A>0.08 and C<14: return 'VOID'
    if A>0.09 and g['tex']<10: return 'WALL'
    if b>18 and a>2 and L>25 and A<0.12: return 'WARM.OBJECT'
    if A>0.1: return 'SURFACE'
    return 'FORM'
def tex_ok(g): return True

def scale_of(person_area,faces,wide):
    if faces:
        fh=max(f[3]-f[1] for f in faces)
        return 'ECU' if fh>0.62 else 'CU' if fh>0.38 else 'MS' if fh>0.2 else 'WS'
    if person_area>0.35: return 'CU'
    if person_area>0.12: return 'MS'
    return 'WS' if wide>0.6 else 'DETAIL'

def track(results,cuts,fps):
    cut_t=[c/fps for c in cuts]
    shot_of=[sum(1 for t in cut_t if t<=s+0.5) for s in range(N)]
    prev=None; counters={}; shot_prev=-1
    for s in range(N):
        _,L,d,segs,stats,bgr,pm=results[s]; sh=shot_of[s]
        if prev is None or sh!=shot_prev: prev=None; counters={}
        used=set()
        if prev is not None:
            pL,pseg=prev
            k=len(segs); pk=len(pseg)
            iou=np.zeros((k,pk))
            hist=np.zeros((k,pk))
            H,_,_=np.histogram2d(L.ravel(),pL.ravel(),bins=[np.arange(k+1)-.5,np.arange(pk+1)-.5])
            ar=H.sum(1); br=H.sum(0)
            for i in range(k):
                for j in range(pk):
                    iou[i,j]=H[i,j]/(ar[i]+br[j]-H[i,j]+1e-9)
            ri,ci=linear_sum_assignment(-iou)
            for i,j in zip(ri,ci):
                if iou[i,j]>0.28 and segs[i]['cls']==pseg[j]['cls'] or iou[i,j]>0.55:
                    segs[i]['tid']=pseg[j]['tid']; segs[i]['id']=pseg[j]['id']; used.add(i)
        for i,g in enumerate(segs):
            if i in used: continue
            n=counters.get(g['cls'],0)+1; counters[g['cls']]=n
            # ensure unique id within shot
            g['tid']=f"{sh}.{g['cls']}.{n}"; g['id']=f"{g['cls']}.{n}"
        # unique-ify duplicate ids in same frame
        seen={}
        for g in segs:
            if g['id'] in seen:
                counters[g['cls']]=counters.get(g['cls'],0)+1; n=counters[g['cls']]
                g['id']=f"{g['cls']}.{n}"; g['tid']=f"{sh}.{g['cls']}.{n}"
            seen[g['id']]=1
        for g in segs: g['cn']=color_name(g['L'],g['A'],g['B'])
        prev=(L,segs); shot_prev=sh
        stats['shot']=sh
    return shot_of

if __name__=='__main__':
    meta=json.load(open('cuts.json')); cuts=meta['cuts']; fps=meta['fps']
    with Pool(4) as p: res=p.map(process,range(N),chunksize=4)
    res.sort(key=lambda r:r[0])
    shot_of=track(res,cuts,fps)
    sec=[]
    for s,L,d,segs,stats,bgr,pm in res:
        cv2.imwrite(f'{OUT}/f/{s:04d}.jpg',bgr,[cv2.IMWRITE_JPEG_QUALITY,72])
        cv2.imwrite(f'{OUT}/l/{s:04d}.png',L,[cv2.IMWRITE_PNG_COMPRESSION,9])
        cv2.imwrite(f'{OUT}/d/{s:04d}.jpg',(d*255).astype(np.uint8),[cv2.IMWRITE_JPEG_QUALITY,88])
        def r(v,n=3): return round(float(v),n)
        sg=[dict(i=g['i'],tid=g['tid'],id=g['id'],cls=g['cls'],a=r(g['a'],4),cx=r(g['cx']),cy=r(g['cy']),bb=[r(x) for x in g['bb']],
                 rgb=g['rgb'],cn=g['cn'],rel=r(g['rel'],2),gr=[r(x,1) for x in g['gr']],kr=r(g['kr'],1),sd=r(g['sd'],1),fo=r(g['fo'],2),L=r(g['L'],1),p=r(g['p'],2),tex=r(g['tex'],1)) for g in segs]
        sec.append(dict(s=s,shot=stats['shot'],scale=stats['scale'],luma=r(stats['luma'],2),warm=r(stats['warm'],2),sat=r(stats['sat'],2),
                        contrast=r(stats['contrast'],2),person=r(stats['person'],2),faces=[[r(x,2) for x in f] for f in stats['faces']],segs=sg))
    shots=[]; cut_t=[0.0]+[c/fps for c in cuts]+[407.37]
    for i in range(len(cut_t)-1): shots.append([round(cut_t[i],2),round(cut_t[i+1],2)])
    data=dict(fps=fps,dur=407.37,n=N,w=FW,h=FH,dw=240,dh=135,shots=shots,sec=sec)
    json.dump(data,open('atlas.json','w'),separators=(',',':'))
    print('ok',os.path.getsize('atlas.json')//1024,'KB')

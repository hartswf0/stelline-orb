import numpy as np, cv2, heapq
from skimage.segmentation import slic
from selfie import person_mask
from faces import detect_faces

W,H=240,135
def lab_of(bgr):
    l=cv2.cvtColor(bgr,cv2.COLOR_BGR2LAB).astype(np.float32)
    l[...,0]*=100/255; l[...,1]-=128; l[...,2]-=128
    return l   # L 0..100, a,b ~ -100..100

def focus_map(gray):
    lap=cv2.Laplacian(cv2.GaussianBlur(gray,(0,0),1.0),cv2.CV_32F)
    e=cv2.GaussianBlur(lap*lap,(0,0),7)
    e=np.sqrt(e)
    lo,hi=np.percentile(e,[5,97]); return np.clip((e-lo)/(hi-lo+1e-6),0,1)

def segment_frame(bgr480, kmax=11, tmax=26.0):
    small=cv2.resize(bgr480,(W,H),interpolation=cv2.INTER_AREA)
    smooth=cv2.bilateralFilter(small,5,18,5)
    rgb=cv2.cvtColor(smooth,cv2.COLOR_BGR2RGB)
    pm=cv2.resize(person_mask(bgr480),(W,H),interpolation=cv2.INTER_AREA)
    faces=detect_faces(bgr480)
    lab=lab_of(smooth)
    gray=cv2.cvtColor(small,cv2.COLOR_BGR2GRAY)
    gx=cv2.Sobel(lab[...,0],cv2.CV_32F,1,0); gy=cv2.Sobel(lab[...,0],cv2.CV_32F,0,1)
    grad=np.sqrt(gx*gx+gy*gy)
    # colour gradient too
    for c in (1,2):
        gx=cv2.Sobel(lab[...,c],cv2.CV_32F,1,0); gy=cv2.Sobel(lab[...,c],cv2.CV_32F,0,1)
        grad=np.maximum(grad,np.sqrt(gx*gx+gy*gy)*0.8)
    sp=slic(rgb,n_segments=520,compactness=9,sigma=0.8,start_label=0,enforce_connectivity=True,convert2lab=True)
    n=sp.max()+1
    flat=sp.ravel()
    cnt=np.bincount(flat,minlength=n).astype(np.float64)
    def mean(ch): return np.bincount(flat,ch.ravel(),minlength=n)/np.maximum(cnt,1)
    feat=np.stack([mean(lab[...,0]),mean(lab[...,1]),mean(lab[...,2]),mean(pm)],1)  # L a b p
    ys,xs=np.mgrid[0:H,0:W]
    # adjacency + boundary strength
    bs={}
    for a,b,g in ((sp[:,:-1],sp[:,1:],(grad[:,:-1]+grad[:,1:])/2),(sp[:-1],sp[1:],(grad[:-1]+grad[1:])/2)):
        m=a!=b
        for i,j,gv in zip(a[m],b[m],g[m]):
            k=(i,j) if i<j else (j,i)
            s=bs.get(k); 
            if s is None: bs[k]=[gv,1]
            else: s[0]+=gv; s[1]+=1
    nbr=[set() for _ in range(n)]
    bstr={}
    for (i,j),(sg,c) in bs.items():
        nbr[i].add(j); nbr[j].add(i); bstr[(i,j)]=(sg,c)
    # union-find regions with running stats
    reg=list(range(n)); size=cnt.copy(); F=feat.copy()
    bnd={k:[v[0],v[1]] for k,v in bstr.items()}
    def key(i,j): return (i,j) if i<j else (j,i)
    def cost(i,j):
        fi,fj=F[i],F[j]
        dl=abs(fi[0]-fj[0])*0.85; dab=np.hypot(fi[1]-fj[1],fi[2]-fj[2])*1.5
        dp=abs(fi[3]-fj[3])*70
        s,c=bnd[key(i,j)]; db=(s/c)*0.55
        sz=min(size[i],size[j])
        small=1.0/(1+sz/160.0)   # prefer swallowing small bits
        return (dl+dab+dp+db)*(0.55+0.9*(1-small))* (1.0)
    alive=set(range(n)); ver=[0]*n
    heap=[]
    for (i,j) in bnd: heapq.heappush(heap,(cost(i,j),i,j,ver[i],ver[j]))
    ncur=n
    while heap and ncur>2:
        c,i,j,vi,vj=heapq.heappop(heap)
        if i not in alive or j not in alive or ver[i]!=vi or ver[j]!=vj: continue
        if c>tmax and ncur<=kmax*3: break
        if c>tmax*1.8: break
        # merge j into i
        tot=size[i]+size[j]
        F[i]=(F[i]*size[i]+F[j]*size[j])/tot; size[i]=tot
        alive.discard(j); reg[j]=i
        for k in list(nbr[j]):
            if k==i: continue
            kj=key(j,k); ki=key(i,k)
            s,cc=bnd.pop(kj)
            if ki in bnd: bnd[ki][0]+=s; bnd[ki][1]+=cc
            else: bnd[ki]=[s,cc]
            nbr[k].discard(j); nbr[k].add(i); nbr[i].add(k)
        bnd.pop(key(i,j),None); nbr[i].discard(j)
        ver[i]+=1; ncur-=1
        for k in nbr[i]: heapq.heappush(heap,(cost(i,k),i,k,ver[i],ver[k]) if i<k else (cost(i,k),k,i,ver[k],ver[i]))
    # resolve union-find
    def find(x):
        while reg[x]!=x:
            reg[x]=reg[reg[x]]; x=reg[x]
        return x
    root=np.array([find(i) for i in range(n)])
    lab_map=root[sp]
    # merge tiny regions; cap count
    def regions(lm):
        ids,counts=np.unique(lm,return_counts=True); return dict(zip(ids,counts))
    minpix=0.006*W*H
    for _ in range(40):
        rs=regions(lab_map); small=[i for i,c in rs.items() if c<minpix]
        if not small and len(rs)<=kmax: break
        if small: tgt=min(small,key=lambda i:rs[i])
        else: tgt=min(rs,key=lambda i:rs[i])
        m=lab_map==tgt
        dil=cv2.dilate(m.astype(np.uint8),np.ones((3,3),np.uint8))>0
        ring=lab_map[dil&~m]
        if ring.size==0: break
        # prefer similar colour among touching
        cands=np.unique(ring)
        mt=lab[m].mean(0)
        best=min(cands,key=lambda c:np.linalg.norm(lab[lab_map==c].mean(0)-mt))
        lab_map[m]=best
    # smooth label boundaries (mode filter)
    ids=np.unique(lab_map); idx={v:k for k,v in enumerate(ids)}
    lm=np.vectorize(idx.get)(lab_map).astype(np.uint8)
    k=len(ids)
    oh=np.stack([cv2.GaussianBlur((lm==c).astype(np.float32),(0,0),1.1) for c in range(k)],0)
    lm=oh.argmax(0).astype(np.uint8)
    # drop empties & renumber, order by area desc
    cnts=np.bincount(lm.ravel(),minlength=k); order=[c for c in np.argsort(-cnts) if cnts[c]>0]
    remap=np.zeros(k,np.uint8)
    for new,old in enumerate(order): remap[old]=new
    lm=remap[lm]
    return lm,smooth,pm,faces,lab,gray

if __name__=='__main__':
    import sys,time
    rng=np.random.RandomState(3); pal=(rng.rand(32,3)*200+40).astype(np.uint8)
    out=[]
    for s in [11,43,59,95,179,198,307,325,150,226,30,35]:
        f=cv2.imread(f'frames/f_{s:04d}.jpg'); t=time.time()
        lm,*_=segment_frame(f)
        big=cv2.resize(lm,(480,270),interpolation=cv2.INTER_NEAREST)
        col=pal[big]; ov=cv2.addWeighted(f,0.45,col,0.55,0)
        edge=cv2.Canny(big,0,1)>0; ov[edge]=(255,255,255)
        cv2.putText(ov,f'{s} k={lm.max()+1} {time.time()-t:.1f}s',(6,18),0,0.5,(255,255,0),1)
        out.append(ov)
    rows=[np.hstack(out[i:i+3]) for i in range(0,12,3)]
    cv2.imwrite('/tmp/claude-0/-home-user/0d7aa3b0-8475-5522-b6e2-3b2987e83c7a/scratchpad/shots/seg1.jpg',np.vstack(rows))

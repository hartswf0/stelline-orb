# beat 27: the cake while she pipes the writing. Per frame, from the film's own pixels:
#   A = flames out (wicks left), writing taken off;  B = candles taken off, writing taken off
#   L = labels: R candle id*30, G candle light on the cake, B writing region
import cv2,numpy as np,json
A='/home/claude/stelline-orb/assets/v6/atlas/';O='/home/claude/stelline-orb/assets/v6/design/';import os;os.makedirs(O,exist_ok=True)
T=44;X0,Y0,X1,Y1=110,125,300,300
F=[cv2.imread(A+'f27_%02d.jpg'%j) for j in range(T)]
C=json.load(open('cand27.json'));FL={int(k):np.float32(v) for k,v in C['flame'].items()};BA={int(k):np.float32(v) for k,v in C['base'].items()}
def strokes(f):
  b,g,r=[f[...,i].astype(np.float32) for i in range(3)];rg=r-g
  lrg=cv2.medianBlur(np.clip(rg+128,0,255).astype(np.uint8),31).astype(np.float32)-128;lg=cv2.medianBlur(f[...,1],31).astype(np.float32)
  m=(((rg-lrg)>10)&((lg-g)>8)).astype(np.uint8);m[:,:120]=0;m[:,300:]=0;m[:180]=0;m[250:]=0;return m
def candle_masks(j,shape):
  ids=np.zeros(shape[:2],np.uint8);fl=np.zeros(shape[:2],np.uint8);bo=np.zeros(shape[:2],np.uint8)
  for i,((fx,fy),(bx,by)) in enumerate(zip(FL[j],BA[j])):
    d=np.float32([bx-fx,by-fy]);L=np.linalg.norm(d);d/=L
    p=lambda t:(int(round(fx+d[0]*t)),int(round(fy+d[1]*t)))
    cv2.line(fl,p(-9),p(2),1,5);cv2.line(bo,p(2),p(L+1),1,6);cv2.line(ids,p(-7),p(L+2),i+1,7)
  return ids,fl,bo

def rowfill(img,mask,seed=0):
  # fill masked pixels along each row between the nearest clear pixels left and right, with a little of the frame's grain
  out=img.astype(np.float32).copy();H,W=mask.shape;rng=np.random.default_rng(seed)
  for y in range(H):
    m=mask[y]>0
    if not m.any(): continue
    x=0
    while x<W:
      if m[x]:
        x0=x
        while x<W and m[x]: x+=1
        L=out[y,x0-1] if x0>0 else (out[y,x] if x<W else 0);R=out[y,x] if x<W else L
        n=x-x0;t=(np.arange(1,n+1)/(n+1))[:,None];out[y,x0:x]=L*(1-t)+R*t
      else: x+=1
  g=rng.normal(0,2.2,out.shape).astype(np.float32);g=cv2.GaussianBlur(g,(0,0),.6)
  out[mask>0]+=g[mask>0]
  sm=cv2.GaussianBlur(out,(0,0),.7);a=cv2.GaussianBlur((mask>0).astype(np.float32),(0,0),.8)[...,None]
  return np.clip(out*(1-a*.5)+sm*(a*.5),0,255).astype(np.uint8)
def openfill(img,mask,w):
  # thin bright upright things (flames, candles) are what a horizontal opening takes away; only inside the mask
  k=np.ones((1,w),np.uint8);o=cv2.morphologyEx(img,cv2.MORPH_OPEN,k);o=cv2.GaussianBlur(o,(0,0),.6)
  a=cv2.GaussianBlur(mask.astype(np.float32),(0,0),.9)[...,None];a=np.clip(a*1.5,0,1)
  return (img*(1-a)+o*a).astype(np.uint8)
# the cake top region (for the plane fit): the cake's mask on the frame
M=[cv2.imread(A+'m27_%02d.png'%j,0) for j in range(T)]
for j in range(T):
  g=cv2.GaussianBlur(cv2.cvtColor(F[j],cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),.8)
  for i in range(len(FL[j])):
    x,y=FL[j][i];x0,y0=int(x)-4,int(y)-6;w=g[y0:y0+12,x0:x0+9]
    if w.size and w.max()>150: yy,xx=np.unravel_index(np.argmax(w),w.shape);FL[j][i]=(x0+xx,y0+yy)
ref=0;sref=strokes(F[0]);_s=cv2.dilate(sref,np.ones((5,5)));_s[205:217,190:199]=1;F0c=cv2.inpaint(F[0],_s*255,4,cv2.INPAINT_TELEA);CLEAN={};HS={}
def plate_for(j,src=None):
  # warp the frame before any writing onto frame j: the top of the cake is a plane, so one homography carries it
  src=src if src is not None else (F0c if j<38 else F[j-1]);g0=cv2.cvtColor(src,cv2.COLOR_BGR2GRAY);g1=cv2.cvtColor(F[j],cv2.COLOR_BGR2GRAY)
  ids,_,_=candle_masks(j,F[j].shape);w=strokes(F[j])
  mk=((M[j]==0)&(ids==0)&(cv2.dilate(w,np.ones((7,7)))==0)).astype(np.uint8);mk[:150]=0;mk[260:]=0
  H=np.eye(3,dtype=np.float32)
  try: _,H=cv2.findTransformECC(g0,g1,H,cv2.MOTION_HOMOGRAPHY,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-5),mk,5)
  except cv2.error as e: print('ecc fail',j)
  P=cv2.warpPerspective(src,H,(640,360),flags=cv2.INTER_LINEAR+cv2.WARP_INVERSE_MAP)
  HS[j]=H
  return P
meta={'box':[X0,Y0,X1,Y1],'cand':[],'write':[]}
PL={}
for j in range(T):
  if strokes(F[j]).sum()>20: PL[j]=plate_for(j)
import os
QUADS=json.load(open(O+'d27.json'))['quad'] if os.environ.get('Q2') else None
prev=None
for j in range(T):
  f=F[j].copy();ids,fl,bo=candle_masks(j,f.shape);w=strokes(f)
  if QUADS is not None:
    q=np.float32(QUADS[j]);c=q.mean(0);qq=c+(q-c)*np.float32([1.12,1.0]);qq[2:]+= (q[3]-q[0])*1.6;zz=np.zeros_like(w);cv2.fillPoly(zz,[np.int32(np.round(qq))],1);w=w&cv2.dilate(zz,np.ones((5,5)))
  # writing off: the plate where the strokes are, matched in level to the ring around them
  reg=cv2.dilate(w,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
  ys,xs=np.nonzero(w)
  if len(xs)>20:
    P=PL[j].copy() if j<38 or (j-1) not in CLEAN else plate_for(j,CLEAN[j-1])
    ring=(cv2.dilate(reg,np.ones((9,9)))>0)&(reg==0)&(ids==0)
    gain=np.clip((f[ring].astype(np.float32).mean(0)+1)/(P[ring].astype(np.float32).mean(0)+1),.85,1.15)
    P=np.clip(P.astype(np.float32)*gain,0,255).astype(np.uint8)
    a=cv2.GaussianBlur(reg.astype(np.float32),(0,0),1.6)[...,None];a=np.clip(a*1.6,0,1)
    a[ids>0]=0
    clean=(f*(1-a)+P*a).astype(np.uint8)
    rect=cv2.minAreaRect(np.float32(np.c_[xs,ys]));CLEAN[j]=clean
  else:
    clean=f.copy();rect=None;a=np.zeros(f.shape[:2]+(1,),np.float32);CLEAN[j]=clean if j else F0c
  # the writing's place: the last frame's writing carried back by the cake's motion
  meta['write'].append(None if rect is None else [round(rect[0][0],1),round(rect[0][1],1),round(rect[1][0],1),round(rect[1][1],1),round(rect[2],1)])
  # flames out: the flame painted over from around it, a dark wick left at the candle's top
  # the flame's glow reaches past the flame: fill a wider band, and blend it in with a soft edge so no grey halo is left
  wide=cv2.dilate(fl,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,9)));Bg=rowfill(clean,wide,j).astype(np.float32)
  sa=np.clip(cv2.GaussianBlur(wide.astype(np.float32),(0,0),2.2)*1.3,0,1)[...,None];Af=np.minimum(clean.astype(np.float32),clean*(1-sa)+Bg*sa).astype(np.uint8)
  for i,((fx,fy),(bx,by)) in enumerate(zip(FL[j],BA[j])):
    d=np.float32([bx-fx,by-fy]);d/=np.linalg.norm(d);p=lambda t:(int(round(fx+d[0]*t)),int(round(fy+d[1]*t)))
    pass
  Bc=openfill(clean,cv2.dilate(fl|bo,np.ones((2,2))),13)
  # candle light on the cake: what each flame lights, falling off from it, only on the cake
  lg=np.zeros(f.shape[:2],np.float32)
  for fx,fy in FL[j]: lg+=np.exp(-((np.arange(640)[None]-fx)**2+(np.arange(360)[:,None]-fy-14)**2)/(2*22**2))
  lg=np.clip(lg/2.5,0,1)*(cv2.GaussianBlur((M[j]==0).astype(np.float32),(0,0),3))
  Lab=np.dstack([np.clip(cv2.GaussianBlur(a[...,0],(0,0),.5)*255,0,255),lg*255,ids.astype(np.float32)*30]).astype(np.uint8)
  cv2.imwrite(O+'d27a_%02d.jpg'%j,Af[Y0:Y1,X0:X1],[cv2.IMWRITE_JPEG_QUALITY,90]);cv2.imwrite(O+'d27b_%02d.jpg'%j,Bc[Y0:Y1,X0:X1],[cv2.IMWRITE_JPEG_QUALITY,90]);cv2.imwrite(O+'d27l_%02d.png'%j,Lab[Y0:Y1,X0:X1])
  meta['cand'].append([[round(float(v),1) for v in FL[j][i]]+[round(float(v),1) for v in BA[j][i]] for i in range(len(FL[j]))])
# a homography for every frame from frame 0 (chained over the turn upright)
Hc={}
for j in range(T):
  if j not in HS: Hc[j]=None;continue
  Hc[j]=HS[j] if j<38 or (j-1) not in Hc or Hc[j-1] is None else Hc[j-1]@HS[j]
# the writing's quad on frame 30, carried to frame 0 and from there to each frame
Q30=np.float32([[191,205],[253,199],[254,211],[192,219]])
inv=np.linalg.inv(Hc[30]);
def ap(H,q): p=np.c_[q,np.ones(len(q))]@H.T;return p[:,:2]/p[:,2:]
# ECC maps frame j coords -> frame 0 (warp with inverse map): x0 = H x_j, so frame0 = H30 @ q30, frame j = inv(Hj) @ q0
Q0=ap(Hc[30],Q30)
def corners(r):
  P=cv2.boxPoints(r);sm=P.sum(1);df=P[:,1]-P[:,0]
  return np.float32([P[np.argmin(sm)],P[np.argmin(df)],P[np.argmax(sm)],P[np.argmax(df)]])
def srect(j):
  w=strokes(F[j]);n,l,st,_=cv2.connectedComponentsWithStats(w);keep=np.isin(l,[i for i in range(1,n) if st[i][4]>=3])
  ys,xs=np.nonzero(keep);return cv2.minAreaRect(np.float32(np.c_[xs,ys]))
R30=corners(srect(30));Aff=cv2.getAffineTransform(R30[:3],Q30[:3]*0+Q30[:3]) if False else None
# Q30 written in the frame of the full writing's rectangle, so later frames can carry it by their own rectangle
M30=cv2.getAffineTransform(R30[:3],np.float32([[0,0],[1,0],[1,1]]));Qn=np.c_[Q30,np.ones(4)]@M30.T
last=None;meta['quad']=[]
for j in range(T):
  if j>30:
    Rj=corners(srect(j));Mj=cv2.getAffineTransform(np.float32([[0,0],[1,0],[1,1]]),Rj[:3]);q=np.c_[Qn,np.ones(4)]@Mj.T
    w=strokes(F[j])
    for it in range(3):
      qm=np.zeros((360,640),np.uint8);cv2.fillPoly(qm,[np.int32(np.round(q))],1);qm=cv2.dilate(qm,np.ones((7,3)))
      ys,xs=np.nonzero(w&qm)
      if len(ys)>10: q[:,1]+=.7*(ys.mean()-q[:,1].mean())
  elif Hc[j] is None: q=last
  else: q=ap(np.linalg.inv(Hc[j]),Q0)
  if q is None: q=Q0
  last=q;meta['quad'].append(np.round(q,1).tolist())
json.dump(meta,open(O+'d27.json','w'))
sh=[]
for j in (5,22,30,40):
  z=F[j].copy();cv2.polylines(z,[np.int32(np.round(np.float32(meta['quad'][j])))],True,(0,255,0),1);sh.append(cv2.resize(z[170:240,160:280],None,fx=4,fy=4))
cv2.imwrite('quad.jpg',np.vstack([np.hstack(sh[:2]),np.hstack(sh[2:])]))
# check
rows=[]
for j in (5,22,30,42):
  a=cv2.imread(O+'d27a_%02d.jpg'%j);b=cv2.imread(O+'d27b_%02d.jpg'%j);f=F[j][Y0:Y1,X0:X1];rows.append(np.hstack([f,a,b]))
cv2.imwrite('chk27.jpg',cv2.resize(np.vstack(rows),None,fx=2,fy=2))

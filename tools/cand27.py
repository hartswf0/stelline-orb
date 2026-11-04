import cv2,numpy as np,json
A='/home/claude/stelline-orb/assets/v6/atlas/'
T=44;K=22
F=[cv2.imread(A+'f27_%02d.jpg'%j) for j in range(T)];G=[cv2.cvtColor(f,cv2.COLOR_BGR2GRAY) for f in F]
flame0=[(176,144),(187,161),(205,153),(210,166),(231,158),(254,173),(181,175)]
base0=[(171,172),(184,188),(202,178),(206,193),(223,185),(247,198),(173,203)]
def blobs(j):
  g=G[j].astype(float);bg=cv2.GaussianBlur(g,(0,0),3);m=(((g-bg)>18)&(g>160)).astype(np.uint8);m[:,300:]=0;m[215:]=0
  n,l,st,c=cv2.connectedComponentsWithStats(m);return [(c[i][0],c[i][1],st[i][4]) for i in range(1,n) if st[i][4]>=3]
def track(pts,order):
  out={K:np.float32(pts)}
  for a,b in zip(order[:-1],order[1:]):
    p0=out[a].reshape(-1,1,2);p1,s,e=cv2.calcOpticalFlowPyrLK(G[a],G[b],p0,None,winSize=(9,9),maxLevel=2);out[b]=p1.reshape(-1,2)
  return out
fw=track(flame0,list(range(K,T)));bw=track(flame0,list(range(K,-1,-1)));FL={**bw,**fw}
fw=track(base0,list(range(K,T)));bw=track(base0,list(range(K,-1,-1)));BA={**bw,**fw}
# flames: the base plus the candle's vector, snapped to the nearest flame blob, walking out from the key frame
V={K:np.float32(flame0)-np.float32(base0)}
for order in (list(range(K,T)),list(range(K,-1,-1))):
  for a,j in zip(order[:-1],order[1:]):
    bl=blobs(j);v=V[a].copy()
    for i in range(len(flame0)):
      px,py=BA[j][i]+v[i];c=[b for b in bl if (b[0]-px)**2+(b[1]-py)**2<30 and b[1]<BA[j][i][1]-12]
      if c: b=min(c,key=lambda b:(b[0]-px)**2+(b[1]-py)**2-b[2]*.5);v[i]=.5*v[i]+.5*(np.float32([b[0],b[1]])-BA[j][i])
    V[j]=v
for j in range(T): FL[j]=BA[j]+V[j]
json.dump({'flame':{j:FL[j].round(1).tolist() for j in range(T)},'base':{j:BA[j].round(1).tolist() for j in range(T)}},open('cand27.json','w'))
# check sheet
sh=[]
for j in (0,11,22,33,40,43):
  z=cv2.resize(F[j][130:220,150:270],None,fx=4,fy=4,interpolation=cv2.INTER_CUBIC)
  for (fx,fy),(bx,by) in zip(FL[j],BA[j]): cv2.circle(z,(int((fx-150)*4),int((fy-130)*4)),5,(0,255,0),1);cv2.circle(z,(int((bx-150)*4),int((by-130)*4)),5,(255,0,255),1)
  sh.append(z)
cv2.imwrite('cand27.jpg',np.vstack([np.hstack(sh[:3]),np.hstack(sh[3:])]))

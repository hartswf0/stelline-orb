import cv2,numpy as np,json
A='/home/claude/stelline-orb/assets/v6/atlas/'
T=47;K=23
F=[cv2.imread(A+'f07_%02d.jpg'%j) for j in range(T)];G=[cv2.cvtColor(f,cv2.COLOR_BGR2GRAY) for f in F]
EY={'R':(439,160,32,58),'L':(286,156,40,58)}
def ring(cx,cy,rx,ry,k=16):
  a=np.linspace(0,2*np.pi,k,endpoint=False);return np.float32(np.c_[cx+rx*1.25*np.cos(a),cy+ry*1.15*np.sin(a)])
out={}
for e,(cx,cy,rx,ry) in EY.items():
  P0=ring(cx,cy,rx,ry);tr={K:np.eye(2,3,dtype=np.float32)}
  for order in (range(K,T),range(K,-1,-1)):
    order=list(order);pts=P0.copy();Mc=np.eye(2,3,dtype=np.float32)
    for a,b in zip(order[:-1],order[1:]):
      p1,st,_=cv2.calcOpticalFlowPyrLK(G[a],G[b],pts.reshape(-1,1,2),None,winSize=(21,21),maxLevel=3);p1=p1.reshape(-1,2);ok=st.ravel()==1
      M,inl=cv2.estimateAffinePartial2D(pts[ok],p1[ok],ransacReprojThreshold=3)
      if M is None: M=np.eye(2,3,dtype=np.float32)
      M3=np.vstack([M,[0,0,1]]);Mc=(M3@np.vstack([Mc,[0,0,1]]))[:2];tr[b]=Mc.astype(np.float32)
      pts=(np.c_[P0,np.ones(len(P0))]@Mc.T).astype(np.float32)
  out[e]=tr
# sharpness of each eye per frame: high-frequency energy inside the eye ellipse
def emask(e,j,shape):
  cx,cy,rx,ry=EY[e];m=np.zeros(shape,np.uint8);cv2.ellipse(m,(cx,cy),(rx,ry),0,0,360,1,-1)
  return cv2.warpAffine(m,out[e][j],(shape[1],shape[0]),flags=cv2.INTER_NEAREST)
sharp={e:[] for e in EY}
for j in range(T):
  lap=np.abs(cv2.Laplacian(cv2.GaussianBlur(G[j],(0,0),.6).astype(np.float32),cv2.CV_32F))
  for e in EY: m=emask(e,j,G[j].shape)>0;sharp[e].append(float(lap[m].mean()))
print({e:[round(v,1) for v in sharp[e]] for e in EY})
json.dump({'EY':EY,'M':{e:{j:out[e][j].tolist() for j in range(T)} for e in EY},'sharp':sharp},open('eyes07.json','w'))
sh=[]
for j in (0,12,23,35,46):
  z=F[j].copy()
  for e in EY: c,_=cv2.findContours(emask(e,j,G[j].shape),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE);cv2.drawContours(z,c,-1,(0,255,255) if e=='R' else (255,0,255),1)
  sh.append(cv2.resize(z,(320,180)))
cv2.imwrite('eyes07.jpg',np.hstack(sh))

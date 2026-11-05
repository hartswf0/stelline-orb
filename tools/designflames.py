# flames in a beat: found on every frame (bright, taller than wide), followed by nearness; a flames-out frame made by a
# horizontal opening over each flame with a wick left; the candle light read from the frame itself at run time
import cv2,numpy as np,json,sys
A='/home/claude/stelline-orb/assets/v6/atlas/';O='/home/claude/stelline-orb/assets/v6/design/'
atlas=json.load(open(A+'atlas.json'));S={s['n']:s for s in atlas['shots']}
CFG={36:dict(box=(0,40,140,200),thr=30,w=31,up=16,down=14,th=19,ip=1),44:dict(box=(110,170,260,240),thr=30,w=11,up=12,down=3,th=8),29:dict(box=(260,160,380,240),thr=28,w=7,up=10,down=2,th=5)}
def find(g,c):
  x0,y0,x1,y1=c['box'];bg=cv2.GaussianBlur(g,(0,0),4);m=(((g-bg)>c['thr'])&(g>190)).astype(np.uint8);z=np.zeros_like(m);z[y0:y1,x0:x1]=m[y0:y1,x0:x1]
  k,l,st,cc=cv2.connectedComponentsWithStats(z);out=[]
  for i in range(1,k):
    x,y,w,h,a=st[i]
    if a>=3 and h>=w*.9: out.append((float(cc[i][0]),float(y),float(y+h),a))
  return out
def openfill(img,mask,w):
  o=cv2.morphologyEx(img,cv2.MORPH_OPEN,np.ones((1,w),np.uint8));o=cv2.GaussianBlur(o,(0,0),.7)
  a=np.clip(cv2.GaussianBlur(mask.astype(np.float32),(0,0),1.0)*1.5,0,1)[...,None];return (img*(1-a)+o*a).astype(np.uint8)
for n in [int(a) for a in sys.argv[1:]]:
  c=CFG[n];sh=S[n];T=sh['T'];F=[cv2.imread(A+'f%02d_%02d.jpg'%(n,j)) for j in range(T)]
  K=sh['key'];G=[cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32) for f in F]
  base=find(G[K],c);print(n,'flames on key',[(round(b[0]),round(b[1])) for b in base])
  tracks={K:[list(b) for b in base]}
  for order in (range(K,T),range(K,-1,-1)):
    order=list(order)
    for a,b in zip(order[:-1],order[1:]):
      fl=find(G[b],c);cur=[]
      for p in tracks[a]:
        cand=[q for q in fl if abs(q[0]-p[0])<6 and abs(q[1]-p[1])<8]
        cur.append(list(min(cand,key=lambda q:abs(q[0]-p[0])+abs(q[1]-p[1]))) if cand else p+[])
        if not cand: cur[-1][3]=0
      tracks[b]=cur
  meta={'box':list(c['box']),'flames':[]}
  x0,y0,x1,y1=c['box']
  for j in range(T):
    f=F[j];mk=np.zeros(f.shape[:2],np.uint8);ids=np.zeros(f.shape[:2],np.uint8)
    for i,(x,yt,yb,a) in enumerate(tracks[j]):
      cv2.rectangle(mk,(int(x-c['th']/2),int(yt-c['up']/3)),(int(x+c['th']/2),int(yb+c['down']/3)),1,-1)
      cv2.rectangle(ids,(int(x-c['th']),int(yt-c['up'])),(int(x+c['th']),int(yb+c['down'])),i+1,-1)
    if c.get('ip'):
      mm=cv2.dilate(mk,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)));Ai=cv2.inpaint(f,mm*255,6,cv2.INPAINT_NS)
      a=np.clip(cv2.GaussianBlur(mm.astype(np.float32),(0,0),1.5)*1.4,0,1)[...,None];Af=(f*(1-a)+Ai*a).astype(np.uint8)
    else:
      Af=openfill(f,mk,c['w']).astype(np.float32);wide=cv2.dilate(mk,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,11)));Bg=cv2.morphologyEx(f,cv2.MORPH_OPEN,np.ones((1,c['w']+6),np.uint8)).astype(np.float32)
      sa=np.clip(cv2.GaussianBlur(wide.astype(np.float32),(0,0),2.5)*1.2,0,1)[...,None];Af=np.minimum(Af,f*(1-sa)+Bg*sa).astype(np.uint8)
    for i,(x,yt,yb,a) in enumerate(tracks[j]):
      L=max(2,int((yb-yt)*.22));cv2.line(Af,(int(round(x)),int(yb)),(int(round(x+.6)),int(yb-L)),(26,30,36),1,cv2.LINE_AA);Af[int(yb-L),int(round(x+.6))]=(Af[int(yb-L),int(round(x+.6))]*.4+np.array([40,90,190])*.6).astype(np.uint8)
    cv2.imwrite(O+'d%02da_%02d.jpg'%(n,j),Af[y0:y1,x0:x1],[cv2.IMWRITE_JPEG_QUALITY,92])
    lab=np.dstack([np.zeros_like(ids),np.zeros_like(ids),ids*30]);cv2.imwrite(O+'d%02dl_%02d.png'%(n,j),lab[y0:y1,x0:x1])
    meta['flames'].append([[round(x,1),round(yt,1),round(yb,1)] for x,yt,yb,a in tracks[j]])
  json.dump(meta,open(O+'d%02d.json'%n,'w'))
  j=K;f=F[j];a=cv2.imread(O+'d%02da_%02d.jpg'%(n,j));cv2.imwrite('chk%02d.jpg'%n,cv2.resize(np.hstack([f[y0:y1,x0:x1],a]),None,fx=4,fy=4,interpolation=cv2.INTER_CUBIC))

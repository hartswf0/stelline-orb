# beat 7: each of the beetle's eyes, sharp and soft, on every frame. The sharp eye is the frame's own eye with the fine
# detail of the nearest frame where that eye was in focus laid in (only the detail: the frame's own light and shape stay)
import cv2,numpy as np,json
A='/home/claude/stelline-orb/assets/v6/atlas/';O='/home/claude/stelline-orb/assets/v6/design/'
J=json.load(open('eyes07.json'));EY=J['EY'];T=47
M={e:{int(j):np.float32(v) for j,v in J['M'][e].items()} for e in EY};S={e:np.float32(J['sharp'][e]) for e in EY}
F=[cv2.imread(A+'f07_%02d.jpg'%j).astype(np.float32) for j in range(T)]
X0,Y0,X1,Y1=170,50,570,310
def emask(e,j,sh=1.0,feather=4):
  cx,cy,rx,ry=EY[e];m=np.zeros((360,640),np.float32);cv2.ellipse(m,(cx,cy),(int(rx*sh),int(ry*sh)),0,0,360,1,-1)
  m=cv2.warpAffine(m,M[e][j],(640,360));return cv2.GaussianBlur(m,(0,0),feather)
def inv(m): m3=np.vstack([m,[0,0,1]]);return np.linalg.inv(m3)[:2]
meta={'box':[X0,Y0,X1,Y1],'focus':{}}
for e in EY: meta['focus'][e]=[round(float(v/S[e].max()),3) for v in S[e]]
for j in range(T):
  Sh=F[j].copy();So=F[j].copy();lab=np.zeros((360,640,3),np.float32)
  for e in EY:
    sc=S[e]-0.4*np.abs(np.arange(T)-j)*S[e].max()/T;d=int(np.argmax(sc))
    W=np.vstack([M[e][j],[0,0,1]])@np.vstack([inv(M[e][d]),[0,0,1]]);Dw=cv2.warpAffine(F[d],W[:2],(640,360),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_REFLECT)
    s=2.2;hi=Dw-cv2.GaussianBlur(Dw,(0,0),s);lo=cv2.GaussianBlur(F[j],(0,0),s)
    # how much detail the frame already has, so the sharp eye is the in-focus one, not the current one doubled
    gain=1.0
    sharp=lo+hi*gain
    m=emask(e,j,1.18,7)[...,None];Sh=Sh*(1-m)+sharp*m
    soft=cv2.GaussianBlur(F[j],(0,0),2.6);m2=emask(e,j,1.9,18)[...,None];So=So*(1-m2)+soft*m2
    lab[...,2 if e=='R' else 1]=np.maximum(lab[...,2 if e=='R' else 1],emask(e,j,1.9,18)*255)
  cv2.imwrite(O+'d07s_%02d.jpg'%j,np.clip(Sh,0,255)[Y0:Y1,X0:X1].astype(np.uint8),[cv2.IMWRITE_JPEG_QUALITY,92])
  cv2.imwrite(O+'d07b_%02d.jpg'%j,np.clip(So,0,255)[Y0:Y1,X0:X1].astype(np.uint8),[cv2.IMWRITE_JPEG_QUALITY,88])
  cv2.imwrite(O+'d07l_%02d.png'%j,np.clip(lab,0,255)[Y0:Y1,X0:X1].astype(np.uint8))
json.dump(meta,open(O+'d07.json','w'))
r=[]
for j in (10,23,30):
  f=F[j][Y0:Y1,X0:X1];s=cv2.imread(O+'d07s_%02d.jpg'%j);b=cv2.imread(O+'d07b_%02d.jpg'%j);r.append(np.hstack([f,s,b]))
cv2.imwrite('chk07.jpg',np.vstack(r).astype(np.uint8))

import cv2, numpy as np, json
cap=cv2.VideoCapture('src.mp4'); fps=cap.get(cv2.CAP_PROP_FPS)
prev=None; i=0; d=[]
while True:
    ok,f=cap.read()
    if not ok: break
    s=cv2.resize(f,(64,36),interpolation=cv2.INTER_AREA)
    h=cv2.calcHist([cv2.cvtColor(s,cv2.COLOR_BGR2HSV)],[0,1,2],None,[8,4,4],[0,180,0,256,0,256]); h=cv2.normalize(h,h).flatten()
    if prev is not None:
        hd=cv2.compareHist(prev[1],h,cv2.HISTCMP_BHATTACHARYYA)
        pd=np.abs(prev[0].astype(float)-s.astype(float)).mean()/255
        d.append((i,hd,pd))
    prev=(s,h); i+=1
d=np.array(d); np.save('diff.npy',d); print(i,fps)
# adaptive: cut if pd large relative to local median
pd=d[:,2]; hd=d[:,1]
cuts=[]
for k in range(len(d)):
    lo=max(0,k-12); hi=min(len(d),k+13)
    loc=np.median(np.r_[pd[lo:k],pd[k+1:hi]]) if hi-lo>2 else 0
    if pd[k]>0.10 and pd[k]>4*loc+0.03 or hd[k]>0.55:
        if not cuts or d[k,0]-cuts[-1]>8: cuts.append(int(d[k,0])+1)
print(len(cuts)); print([round(c/fps,2) for c in cuts])
json.dump({'fps':fps,'cuts':cuts},open('cuts.json','w'))

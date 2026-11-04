import numpy as np, cv2
from ai_edge_litert.interpreter import Interpreter
_it=Interpreter(model_path='wheels/x/mediapipe/modules/face_detection/face_detection_short_range.tflite'); _it.allocate_tensors()
_inp=_it.get_input_details()[0]['index']
_outs={d['name']:d['index'] for d in _it.get_output_details()}
def _anchors():
    a=[]
    for stride,per in ((8,2),(16,6)):
        g=128//stride
        for y in range(g):
            for x in range(g):
                for _ in range(per): a.append(((x+.5)/g,(y+.5)/g))
    return np.array(a,np.float32)
ANCH=_anchors()
def detect_faces(bgr,thr=0.55):
    h,w=bgr.shape[:2]
    # letterbox to square
    s=max(h,w); pad=np.zeros((s,s,3),np.uint8); oy=(s-h)//2; ox=(s-w)//2; pad[oy:oy+h,ox:ox+w]=bgr
    x=cv2.resize(cv2.cvtColor(pad,cv2.COLOR_BGR2RGB),(128,128),interpolation=cv2.INTER_AREA).astype(np.float32)/127.5-1
    _it.set_tensor(_inp,x[None]); _it.invoke()
    reg=_it.get_tensor(_outs['regressors'])[0]; sc=_it.get_tensor(_outs['classificators'])[0,:,0]
    sc=1/(1+np.exp(-np.clip(sc,-100,100)))
    idx=np.where(sc>thr)[0]; boxes=[]
    for i in idx:
        cx=reg[i,0]/128+ANCH[i,0]; cy=reg[i,1]/128+ANCH[i,1]; bw=reg[i,2]/128; bh=reg[i,3]/128
        x0=(cx-bw/2)*s-ox; y0=(cy-bh/2)*s-oy; x1=(cx+bw/2)*s-ox; y1=(cy+bh/2)*s-oy
        boxes.append([x0/w,y0/h,x1/w,y1/h,float(sc[i])])
    boxes.sort(key=lambda b:-b[4]); keep=[]
    for b in boxes:
        ok=True
        for k in keep:
            ix=max(0,min(b[2],k[2])-max(b[0],k[0])); iy=max(0,min(b[3],k[3])-max(b[1],k[1])); inter=ix*iy
            u=(b[2]-b[0])*(b[3]-b[1])+(k[2]-k[0])*(k[3]-k[1])-inter
            if inter/max(u,1e-9)>0.3: ok=False;break
        if ok: keep.append(b)
    return keep
if __name__=='__main__':
    import sys
    for s in [11,43,59,95,179,198,307,325,150,226]:
        f=cv2.imread(f'frames/f_{s:04d}.jpg'); fs=detect_faces(f)
        print(s,[[round(v,2) for v in b] for b in fs])

# the film's own piped characters, lifted off the cake: frame 30 minus the same frame with the writing taken off gives each
# stroke's colour and how much icing covers each pixel; rectified onto the writing's plane (the quad), 8x, with room below for the Z
import cv2,numpy as np,json
A='/home/claude/stelline-orb/assets/v6/atlas/';O='/home/claude/stelline-orb/assets/v6/design/'
m=json.load(open(O+'d27.json'));J=30
f=cv2.imread(A+'f27_%02d.jpg'%J).astype(np.float32);clean=f.copy()
a=cv2.imread(O+'d27a_%02d.jpg'%J).astype(np.float32);X0,Y0,X1,Y1=m['box'];clean[Y0:Y1,X0:X1]=a
lab=cv2.imread(O+'d27l_%02d.png'%J);wmask=np.zeros(f.shape[:2],np.float32);wmask[Y0:Y1,X0:X1]=lab[...,0]/255.  # BGR: writing in B
IC=np.float32([10,48,116])  # icing, BGR
d=f-clean;v=IC-clean;al=np.clip((d*v).sum(2)/np.maximum(1,(v*v).sum(2)),0,1)*np.clip(wmask*1.5,0,1)
al=np.where(al>.18,al,0);un=(f-(1-al[...,None])*clean)/np.maximum(al[...,None],.05);col=np.where(al[...,None]>.35,un,IC*(clean.mean(2,keepdims=True)/150))
col=np.clip(col,0,255)
q=np.float32(m['quad'][J]);u=q[1]-q[0];vv=q[3]-q[0]
S=8;W=int(np.hypot(*u)*S);H=int(np.hypot(*vv)*S);HH=int(H*1.8)
dst=np.float32([[0,0],[W,0],[W,HH],[0,HH]]);src=np.float32([q[0],q[1],q[1]+vv*1.8,q[0]+vv*1.8])
M=cv2.getPerspectiveTransform(src,dst)
R=cv2.warpPerspective(np.dstack([col,al*255]),M,(W,HH),flags=cv2.INTER_CUBIC)
cv2.imwrite(O+'glyphs27.png',np.clip(R,0,255).astype(np.uint8))
# the characters' extents along the line (columns with icing in the top band), and the underline below
colsum=(R[:H,:,3]>40).sum(0);xs=np.nonzero(colsum>0)[0]
print('W,H,HH',W,H,HH,'ink x',xs.min(),xs.max())
# split into four by the gaps nearest the quarter points
x0,x1=xs.min(),xs.max();cuts=[x0]
for k in (1,2,3):
  t=x0+(x1-x0)*k/4;win=np.arange(int(t-(x1-x0)*.08),int(t+(x1-x0)*.08));cuts.append(int(win[np.argmin(colsum[win])]))
cuts.append(x1+1);cuts=[int(c) for c in cuts];print('cuts',cuts)
json.dump({'W':W,'H':H,'HH':HH,'S':S,'cuts':cuts,'chars':['生','日','快','乐']},open(O+'glyphs27.json','w'))
v=R.copy();bg=np.full(v.shape[:2]+(3,),200,np.float32);a4=v[...,3:]/255.;cv2.imwrite('glyphs.png',(bg*(1-a4)+v[...,:3]*a4).astype(np.uint8))

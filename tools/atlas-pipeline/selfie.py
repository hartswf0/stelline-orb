import numpy as np, cv2
from ai_edge_litert.interpreter import Interpreter
_it=Interpreter(model_path='models/selfie_segmentation.tflite'); _it.allocate_tensors()
_i=_it.get_input_details()[0]; _o=_it.get_output_details()[0]
def person_mask(bgr):
    h,w=bgr.shape[:2]
    x=cv2.resize(cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB),(256,256),interpolation=cv2.INTER_AREA).astype(np.float32)/255
    _it.set_tensor(_i['index'],x[None]); _it.invoke()
    m=_it.get_tensor(_o['index'])[0,:,:,0]
    return cv2.resize(m,(w,h),interpolation=cv2.INTER_LINEAR)

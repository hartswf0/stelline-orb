# Atlas pipeline (reproduces `assets/atlas/`)

Input: the film clip (not in this repo). Output: `assets/atlas/{f,l,d}/NNNN.*` and `atlas-data.js`.

```bash
pip install opencv-python-headless scikit-image scipy numpy pillow ai-edge-litert
# Models: take the .tflite files from the mediapipe 0.10.14 wheel (unzip it):
#   mediapipe/modules/selfie_segmentation/selfie_segmentation.tflite
#   mediapipe/modules/face_detection/face_detection_short_range.tflite
# and point selfie.py / faces.py at them.
ffmpeg -ss 0.5 -i clip.mp4 -vf "fps=1,scale=480:270" -q:v 3 frames/f_%04d.jpg   # analysis frames (1 per second)
python3 shots.py     # shot cuts -> cuts.json
python3 build.py     # segment, relief, classify, track -> atlas.json (+ writes assets/atlas/{f,l,d})
python3 ladder.py    # per-segment model-ladder fidelity (SSIM) -> adds lq/lv
python3 export.py    # -> assets/atlas/atlas-data.js (with class priors and chapters)
ffmpeg -ss 0.5 -i clip.mp4 -vf "fps=1,scale=768:432" -q:v 4 hd/%04d.jpg          # display frames copied to assets/atlas/f/
```
Paths inside the scripts are those of the original working machine; adjust `OUT` and model paths.

# Datasets for Video2Game

[Video2Game](https://github.com/video2game/video2game) (CVPR 2024, MIT) turns one video into a browser game by training a NeRF, extracting a mesh, baking textures and generating collision models. It reads a COLMAP dataset: many views with known camera poses.

**Do we already have the videos it needs?** We have the videos, and they were never what was missing. What Video2Game needs from a video, and whether ours give it:

| It needs | Our 77 birthday clips | The Memory Weaver's own scenes |
| :--- | :--- | :--- |
| The camera to move round the subject, so poses can be solved | 3 of 77 orbit at all; 63 are locked or drift. The clips are generated, so a cake is not the same object from frame to frame | Any orbit we ask for, poses known exactly |
| A CUDA GPU to train on | None on the machine this was made on | Same |

So the clips cannot feed it, but the coded scene made *from* each clip can. `bday_35/` is that: 72 views on two rings round the 3D cake the orb built from clip 35, with exact cameras, the cake's own vertices as the point cloud, and a mask of the cake in every view.

```
bday_35/
  images/frame_000NN.jpg     72 views, 960 x 540
  instance_png/              the cake (white) against everything else; to_colmap.py --npy writes the .npy Video2Game wants
  sparse/0/*.bin             COLMAP binary model: 1 PINHOLE camera, 72 poses, 2801 points
  transforms.json            the same cameras in nerfstudio layout
  capture.json               the raw capture
```

**Checked:** read back with Video2Game's own `datasets/colmap_utils.py`; 99.7% of the cake's points project inside the cake's mask in every view (worst view 99.5%), so the poses agree with the pictures.

**Not done:** the training itself. `tools/games/v2g/run_on_gpu.sh` holds Video2Game's own commands pointed at this dataset, for a machine with a GPU. The people are left out of the capture on purpose: they are a flat sheet that turns to face the camera, so they are not the same from two places.

Make another: `node tools/games/v2g/capture.cjs <id>` then `python3 tools/games/v2g/to_colmap.py <id> --check /path/to/video2game`.

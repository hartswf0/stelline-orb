#!/usr/bin/env bash
# Video2Game on one of this repository's scenes. NOT RUN HERE: it needs a CUDA GPU (tiny-cuda-nn, nvdiffrast and the project's own CUDA extension),
# and the machine this was written on has none. On a machine that does:
#
#   git clone https://github.com/video2game/video2game && cd video2game      # then its readme's "Environment" section
#   bash /path/to/stelline-orb/tools/games/v2g/run_on_gpu.sh /path/to/stelline-orb bday_35
#
# The commands are Video2Game's own garden-scene scripts (scripts/nerf, extract_mesh, baking, collisions) with this dataset in place of theirs.
# Differences from theirs, and why:
#   - no --normal_mono / --depth_mono: no Omnidata priors were generated for this scene. The poses are exact and the views are a clean orbit, so
#     try without first; generate them with scripts/priors/*.sh if the mesh comes out rough.
#   - --render_semantic --num_classes 2 is kept: instance/ marks the cake (1) against everything else (0), as their Gardenvase marks the vase.
#   - the extract_mesh scale and partition numbers are theirs for a garden and will want changing for a table 1.5 m across. They are a starting point.
set -euo pipefail
REPO="${1:?path to the stelline-orb checkout}"; ID="${2:-bday_35}"; ROOT_DIR="$REPO/datasets/v2g/$ID"; exp_name="stelline_$ID"; label="orb"
python3 "$REPO/tools/games/v2g/to_colmap.py" "$ID" --npy                     # instance_png/*.png -> instance/*.npy, as Video2Game wants them
python train.py --config configs/release/garden.txt --root_dir "$ROOT_DIR" --exp_name "$exp_name" --ray_sampling_strategy same_image \
  --lr 2e-3 --render_semantic --num_classes 2 --ngp_gridsize 128 --scale_factor 1.0 --ngp_F 8 --ngp_F_ 8 --ngp_log2_T 19 --ngp_log2_T_ 21 --lr_decay 100
python extract_mesh.py --config configs/release/garden.txt --exp_name "$exp_name" --ngp_gridsize 128 \
  --extract_mesh_scale_x_min 0. --extract_mesh_scale_x_max 1. --extract_mesh_scale_y_min 0. --extract_mesh_scale_y_max 1. --extract_mesh_scale_z_min 0.4 --extract_mesh_scale_z_max 0.7 \
  --extract_mesh_partition_x 3 --extract_mesh_partition_y 3 --extract_mesh_partition_z 3 --ngp_F 8 --ngp_F_ 8 --ngp_log2_T 19 --ngp_log2_T_ 21 \
  --ckpt_load "ckpts/colmap/$exp_name/last.ckpt" --mesh_output_label "$label" --center_extract_mesh --mesh_post_process --center_decimate --center_decimate_target 5000000 \
  --filter_box 8 --center_level 50 --num_classes 2 --level 1 --extract_mesh_partition_offset 0.01 --mesh_postprocess_clean_f 1000 --extract_mesh_post_contract
python baking_pretrain.py --config configs/release/garden.txt --ckpt_load "ckpts/colmap/$exp_name/last.ckpt" --lr 0.005 --baking_iters 20000 --workspace "$label" \
  --load_mesh_path "results/colmap/$exp_name/${exp_name}_${label}.ply" --ray_sampling_strategy single_image --ssaa 1 --exp_name "$exp_name" --batch_size 1 --ngp_gridsize 128 \
  --baking_specular_dim_mlp 32 --baking_specular_dim 3 --tcngp_F 8 --tcngp_log2_T 21 --baking_antialias --baking_per_level_scale 1024 --diffuse_step 1000
python baking_pretrain_export.py --config configs/release/garden.txt --exp_name "$exp_name" --tcngp_F 8 --tcngp_log2_T 21 --texture_size 4096 --texture_dilate 32 --texture_erode 3 \
  --xatlas_pad 1 --workspace "$label" --baking_specular_dim_mlp 32 --baking_specular_dim 3 --baking_output uv4096 --baking_per_level_scale 1024
python collision_model_generate.py --vhacd_path v-hacd/app/build/TestVHACD --file_path "results/colmap/$exp_name/baking/$label/uv4096/mesh_0.obj" --collision_type convex --slice 3
echo "mesh and collision model: results/colmap/$exp_name/baking/$label/uv4096/  ->  load into video2game/game_dev (npm run dev)"

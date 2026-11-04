# Stelline Memory Orb (`stelline-orb`)

Diegetic 3D reality-modeling engine and coaxial 5-ring memory orb interface inspired by Dr. Ana Stelline's laboratory in *Blade Runner 2049*.

## Features
- **Coaxial 5-Ring Memory Orb Controller (`L1`–`L3`, `R1`–`R2`)**: Tactile rotary rings, 4-node SAM target selector (`1`–`4`), and 6-button shot bank (`Q`–`Y`).
- **Per-Object SAM Segmentation & DPT-MiDaS 3D Depth Relief**: Addressable 5-dial control per segmented scene element (`L1:SOLID`, `L2:FOCUS`, `L3:MORPH`, `R1:LUMA`, `R2:TINT`) across 200x140 3D displaced relief meshes.
- **Diegetic Translucent White C-Arc (`arch`)**: 5-sector radial menu graphing the 5 coaxial dials for the active SAM target, with inverse-bootstrap click-to-adjust.
- **Operator Protocols**:
  - **Protocol I (`BUG DESIGNER`)**: Compound eye ommatidia focus rack (`OCULUS.DX` / `OCULUS.SN`), 180-bristle setae growth (`SETAE.180`), mandible articulation (`LABRUM.RIG`), and counterfactual variants (`OTHERWISE`).
  - **Protocol II (`CAKE BIRTHDAY`)**: Multi-frame temporal sculpting from 3->7 candles (`02:17`), cylinder-to-scalloped-bundt morph (`02:23`), red icing calligraphy (`生日快樂`, `02:26`), child cutout placement & per-person relighting (`02:33`), and candle-extinguishing sequence (`02:53`).

## Running Locally
```bash
python3 -m http.server 8095
# Open http://localhost:8095/
```

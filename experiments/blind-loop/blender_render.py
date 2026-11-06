"""blender_render.py — branch C of the blind loop (round 05): the same genome built as a Blender scene and path traced with Cycles.
Usage: python3.13 blender_render.py <genome.json> <out.png> [samples]
The genome is a maker.js candidate genome ({scene, cake, candles, inscription, table, look}); scene.shot is 'A' (146 s) or 'B' (152.25 s).
Only the crop region of the 1280x720 frame is rendered (Cycles border + crop), so the output is already cropped like the decoy:
A 608x342 at (20, 250), B 640x360 at (300, 345). The camera is solved from the decoy frame exactly as in render.html (v5 M25).
Coordinates: Blender is z-up; the cake stands at the origin on the table top (z = 0)."""
import sys, json, math, random
import bpy, bmesh
from mathutils import Vector, Matrix, Quaternion

gpath, out = sys.argv[1], sys.argv[2]
samples = int(sys.argv[3]) if len(sys.argv) > 3 else 64
Gn = json.load(open(gpath)); S = Gn['scene']; CK = Gn.get('cake', {})
shot = S.get('shot', 'B'); rnd = random.Random(int(S.get('seed', 7)))
def d(k, v): return S.get(k, v) if S.get(k) is not None else v

def lab2srgb(L, a, b):
    fy = (L + 16) / 116; fx = fy + a / 500; fz = fy - b / 200; e, k = 216 / 24389, 24389 / 27
    xr = fx ** 3 if fx ** 3 > e else (116 * fx - 16) / k; yr = ((L + 16) / 116) ** 3 if L > k * e else L / k; zr = fz ** 3 if fz ** 3 > e else (116 * fz - 16) / k
    X, Y, Z = xr * 0.95047, yr, zr * 1.08883
    r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z; g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z; bb = 0.0557 * X - 0.2040 * Y + 1.0570 * Z
    return [max(0, min(1, c)) for c in (r, g, bb)]   # linear
# waves for surface noise (seeded), same idea as render.html
W = [(Vector((rnd.random() - .5, rnd.random() - .5, rnd.random() - .5)).normalized(), 180 + rnd.random() * 220, rnd.random() * 6.28) for _ in range(9)]
def noise(p): return sum(math.sin(w[0].dot(p) * w[1] + w[2]) for w in W) / 3

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.cycles.use_denoising = True
try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception: pass
sc.cycles.max_bounces = 6; sc.render.threads_mode = 'FIXED'; sc.render.threads = 2
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1280, 720, 100
crop = {'A': (20, 250, 608, 342), 'B': (300, 345, 640, 360)}[shot]
sc.render.use_border = True; sc.render.use_crop_to_border = True
sc.render.border_min_x = crop[0] / 1280; sc.render.border_max_x = (crop[0] + crop[2]) / 1280
sc.render.border_min_y = 1 - (crop[1] + crop[3]) / 720; sc.render.border_max_y = 1 - crop[1] / 720
sc.view_settings.view_transform = 'AgX'; sc.view_settings.exposure = float(d('cyExposure', 0.0))
world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True; world.node_tree.nodes['Background'].inputs[0].default_value = (0.0015, 0.0016, 0.0015, 1)

def mat(name, col, rough=0.5, metal=0.0, sss=0.0, emit=None, estr=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if sss: b.inputs['Subsurface Weight'].default_value = sss; b.inputs['Subsurface Radius'].default_value = (1.0, 0.6, 0.3); b.inputs['Subsurface Scale'].default_value = 0.004
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = estr
    return m
def obj(name, me, m=None):
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
    if m: o.data.materials.append(m)
    return o

R0 = 0.12; Hc = 2 * R0 * .43 * d('hRatio', 1.0)
icing = mat('icing', lab2srgb(CK.get('topL', 78), CK.get('topA', 3) + d('warmA', 4), CK.get('topB', 35) + d('warmB', 18)), rough=d('rough5', .55), sss=0.35)
# ---- the body: one lathe, displaced at several scales (as render.html M21)
prof = []; rr0 = .006
for i in range(61): prof.append((R0, Hc * .02 + (Hc - rr0 - Hc * .02) * i / 60))
for i in range(1, 13): a = i / 12 * math.pi / 2; prof.append((R0 - rr0 + rr0 * math.cos(a), Hc - rr0 + rr0 * math.sin(a)))
for i in range(1, 51): u = i / 50; prof.append((max((R0 - rr0) * (1 - u), 1e-5), Hc - .002 * math.sin(u * math.pi / 2)))
NS = 384; rd, sag, fn = d('ridge5', .0007), d('sag', .0016), d('fine', .0004)
bm = bmesh.new(); rows = []
for (r, y) in prof:
    row = []
    for j in range(NS):
        ang = j / NS * 2 * math.pi; p = Vector((r * math.cos(ang), r * math.sin(ang), y)); n = noise(p); n2 = noise(p * 2.7)
        if y < Hc - rr0 * .6:
            dd = rd * math.sin(y / .011 * 6.283 + 1.8 * n) * (.55 + .45 * math.sin(ang * 2.3 + n)) + sag * math.exp(-((y - (Hc - .016)) / .007) ** 2) * (.6 + .4 * n) + fn * n2 + d('undul', .0012) * math.sin(ang * 3 + 2.1 * math.sin(y * 40)) * math.sin(ang * 5 + 1.3)
            p.x += math.cos(ang) * dd; p.y += math.sin(ang) * dd
        else:
            p.z += .7 * rd * math.sin(r / .016 * 6.283 + ang * 1.5 + 1.6 * n) * min(1, (R0 - r) / .01) + fn * n2
        row.append(bm.verts.new(p))
    rows.append(row)
for i in range(len(rows) - 1):
    for j in range(NS):
        bm.faces.new((rows[i][j], rows[i][(j + 1) % NS], rows[i + 1][(j + 1) % NS], rows[i + 1][j]))
me = bpy.data.meshes.new('body'); bm.to_mesh(me); bm.free()
for f in me.polygons: f.use_smooth = True
obj('body', me, icing)

def ring(name, radius, z, minor, m, amp):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=minor, major_segments=256, minor_segments=12, location=(0, 0, z))
    o = bpy.context.active_object; o.name = name; o.data.materials.append(m)
    for v in o.data.vertices:
        p = v.co.copy(); v.co += p.normalized() * amp * noise(p) if p.length > 0 else Vector()
        v.co.z += .5 * amp * noise(p * 2.1)
    for f in o.data.polygons: f.use_smooth = True
    return o
ring('rim', R0 - .004, Hc + .0012, .0034, icing, .0012)        # piped top rim, crumbly
ring('foot', R0 + .002, .004, .0042, icing, .0012)             # piped bottom border
# ---- dots pressed into the side
dot = mat('dot', (0.025, 0.014, 0.008), rough=0.3)
for i in range(int(d('dots', 34))):
    a = rnd.random() * 2 * math.pi; z = .012 + rnd.random() * (Hc - .022); s = d('dotS', .0048) * (.7 + .6 * rnd.random())
    bpy.ops.mesh.primitive_uv_sphere_add(radius=s, segments=12, ring_count=8, location=(math.cos(a) * (R0 + s * .1), math.sin(a) * (R0 + s * .1), z))
    o = bpy.context.active_object; o.data.materials.append(dot); o.rotation_euler = (0, 0, a); o.scale = (.55, 1, .85)
# ---- the board and the table
bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=R0 * 1.12, depth=.003, location=(0, 0, -.0015)); bpy.context.active_object.data.materials.append(mat('board', (0.55, 0.53, 0.5), rough=.35, metal=1))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -.3, -.013)); t = bpy.context.active_object; t.scale = (1.6, 1.8, .02); t.data.materials.append(mat('table', (0.06, 0.045, 0.032), rough=.6))
# ---- the inscription: 生日快乐 as piped relief (extruded, bevelled text), red
fonts = ['/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc']
try:
    cu = bpy.data.curves.new('ins', 'FONT'); cu.body = '生日快乐'; cu.font = bpy.data.fonts.load(fonts[0]); cu.size = .026; cu.extrude = .0008; cu.bevel_depth = .0007; cu.align_x = 'CENTER'
    o = obj('ins', cu, mat('red', (0.55, 0.05, 0.02), rough=.35)); o.location = (0.03, -0.035, Hc + .0012); o.rotation_euler = (0, 0, math.radians(27))
except Exception as e: print('inscription', e)
# ---- seven candles scattered over the top (clear of the writing), mixed, tilted; flames are the lights
seats = []; g = 0
while len(seats) < 7 and g < 4000:
    g += 1; r = math.sqrt(rnd.random()) * .74 * R0; a = rnd.random() * 2 * math.pi; x, y = math.cos(a) * r, math.sin(a) * r
    if abs(x - .03) < .42 * R0 and abs(y + .035) < .2 * R0: continue
    if any(math.hypot(q[0] - x, q[1] - y) < .17 * R0 for q in seats): continue
    seats.append((x, y))
kinds = ['red', None, 'red', 'blue', None, 'red', None]; lean = math.radians(d('lean', 7))
flame = mat('flame', (1, .8, .5), emit=(1.0, 0.62, 0.25), estr=d('cyFlameE', 14))
for k, (x, y) in enumerate(seats):
    h = .05 * d('candleLen4', 1) * (.7 + .5 * rnd.random()); sink = .003 + .008 * rnd.random()
    m = bpy.data.materials.new('wax%d' % k); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = .45
    b.inputs['Subsurface Weight'].default_value = .2; b.inputs['Subsurface Scale'].default_value = .002
    if kinds[k]:
        tc = nt.nodes.new('ShaderNodeTexCoord'); sx = nt.nodes.new('ShaderNodeSeparateXYZ'); at = nt.nodes.new('ShaderNodeMath'); at.operation = 'ARCTAN2'
        mz = nt.nodes.new('ShaderNodeMath'); mz.operation = 'MULTIPLY'; mz.inputs[1].default_value = 900
        ad = nt.nodes.new('ShaderNodeMath'); ad.operation = 'ADD'; sn = nt.nodes.new('ShaderNodeMath'); sn.operation = 'SINE'
        ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position = .45; ramp.color_ramp.elements[1].position = .55
        ramp.color_ramp.elements[0].color = (0.8, 0.78, 0.7, 1); ramp.color_ramp.elements[1].color = (0.6, 0.04, 0.02, 1) if kinds[k] == 'red' else (0.08, 0.15, 0.55, 1)
        sc2 = nt.nodes.new('ShaderNodeMath'); sc2.operation = 'MULTIPLY_ADD'; sc2.inputs[1].default_value = .5; sc2.inputs[2].default_value = .5
        L = nt.links.new; L(tc.outputs['Object'], sx.inputs[0]); L(sx.outputs['Y'], at.inputs[0]); L(sx.outputs['X'], at.inputs[1]); L(sx.outputs['Z'], mz.inputs[0])
        L(mz.outputs[0], ad.inputs[0]); L(at.outputs[0], ad.inputs[1]); L(ad.outputs[0], sn.inputs[0]); L(sn.outputs[0], sc2.inputs[0]); L(sc2.outputs[0], ramp.inputs[0]); L(ramp.outputs[0], b.inputs['Base Color'])
    else: b.inputs['Base Color'].default_value = (0.85, 0.62, 0.18, 1)
    piv = bpy.data.objects.new('candle%d' % k, None); sc.collection.objects.link(piv); piv.location = (x, y, Hc - sink)
    piv.rotation_euler = ((rnd.random() - .5) * 2 * lean, (rnd.random() - .5) * 2 * lean, rnd.random() * 6.28)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=.003, depth=h, location=(0, 0, h / 2)); c = bpy.context.active_object; c.data.materials.append(m); c.parent = piv
    for f in c.data.polygons: f.use_smooth = True
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=.0004, depth=.005, location=(0, 0, h + .0025)); w = bpy.context.active_object; w.data.materials.append(mat('wick%d' % k, (0.02, 0.015, 0.01))); w.parent = piv
    fh = .013 * d('flameH', 1)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=16, ring_count=12, location=(0, 0, h + .002 + fh * .35)); f = bpy.context.active_object; f.parent = piv; f.data.materials.append(flame)
    for v in f.data.vertices:   # teardrop: narrow to a tip at the top
        z = v.co.z; t = (z + 1) / 2; v.co.x *= .9 * (1 - t ** 1.6) + .05; v.co.y *= .9 * (1 - t ** 1.6) + .05
    f.scale = (fh * .2, fh * .2, fh * .5); f.visible_shadow = False
    ld = bpy.data.lights.new('fl%d' % k, 'POINT'); ld.energy = d('cyFlameW', .5); ld.color = (1, .62, .3); ld.shadow_soft_size = .003
    lo = bpy.data.objects.new('fl%d' % k, ld); sc.collection.objects.link(lo); lo.parent = piv; lo.location = (0, 0, h + .009)
# ---- the low, soft frontal fill (as M19)
ad_ = bpy.data.lights.new('fill', 'AREA'); ad_.energy = d('cyFill', 6.0); ad_.size = 1.0; ad_.color = (1, .7, .45)
fo = bpy.data.objects.new('fill', ad_); sc.collection.objects.link(fo); fo.location = (0.9, -1.3, .3)
fo.rotation_euler = (Vector((0, 0, .06)) - fo.location).to_track_quat('-Z', 'Y').to_euler()
# ---- the camera, solved as in render.html M25
SOL = {'A': dict(major=277, elev=31, roll=10.4, cx=411, cy=403), 'B': dict(major=217, elev=6, roll=0, cx=651, cy=424)}[shot]
cd = bpy.data.cameras.new('cam'); cd.sensor_fit = 'VERTICAL'; cd.angle_y = math.radians(30)
fpx = 360 / math.tan(math.radians(15)); dist = 2 * R0 * fpx / (SOL['major'] * d('camScale', 1)); e = math.radians(SOL['elev'] + d('elevD', 0))
co = bpy.data.objects.new('cam', cd); sc.collection.objects.link(co); sc.camera = co
tgt = Vector((0, 0, Hc)); co.location = Vector((0, -math.cos(e) * dist, Hc + math.sin(e) * dist))
q = (tgt - co.location).to_track_quat('-Z', 'Y'); q = q @ Quaternion((0, 0, 1), math.radians(SOL['roll'])); co.rotation_euler = q.to_euler()
cd.shift_x = -(SOL['cx'] - 640) / 1280; cd.shift_y = (SOL['cy'] - 360) / 1280
sc.render.filepath = out; sc.render.image_settings.file_format = 'PNG'
bpy.ops.render.render(write_still=True)
print('rendered', out)

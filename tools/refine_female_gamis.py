"""Rebuild only the female gamis, fitted to the project's original Rocketbox body.

Run in background Blender. Existing wardrobe/rigs are retained in a backup.
The connected bodice and sleeves inherit the actual body's topology; the lower
panels extend its waist boundary. Offline cloth is baked before skin binding.
"""
import bpy, bmesh, math, json, shutil, sys, hashlib
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'tools'))
from pilgrim_cloth import Draper
ASSETS = ROOT/'src/VRHaji.Web/wwwroot/assets/characters'
OUT = ROOT/'artifacts/female-gamis'
OUT.mkdir(parents=True, exist_ok=True)
if not bpy.app.background:
    raise RuntimeError('Use an isolated background Blender process.')
backup = OUT/'before'
backup.mkdir(exist_ok=True)
for source in [ROOT/'artifacts/pilgrim-woman.blend', ASSETS/'woman.glb', ASSETS/'outfits/woman-gamis.glb']:
    dest = backup/source.name
    if not dest.exists(): shutil.copy2(source, dest)
preserved_paths=[ASSETS/'man.glb']+[p for p in (ASSETS/'outfits').glob('*.glb') if p.name!='woman-gamis.glb']
if not (OUT/'preserved-assets.json').exists():
    (OUT/'preserved-assets.json').write_text(json.dumps({str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in preserved_paths},indent=2))
bpy.ops.wm.open_mainfile(filepath=str(backup/'pilgrim-woman.blend'))
scene = bpy.context.scene
def preserved_signature():
    return hashlib.sha256(repr([(o.name,[tuple(v.co) for v in o.data.vertices],[[tuple((g.group,g.weight)) for g in v.groups] for v in o.data.vertices]) for o in sorted(scene.objects,key=lambda o:o.name) if o.type=='MESH' and not o.name.startswith(('Robe','New_Gamis')) and o.name!='Skin_Head']).encode()).hexdigest()
original_signature=preserved_signature()
rig = next(o for o in scene.objects if o.type == 'ARMATURE')
rig.animation_data.action = None
for track in rig.animation_data.nla_tracks: track.mute = True
rig.data.pose_position = 'REST'
scene.frame_set(0)
bpy.context.view_layer.update()
template = bpy.data.objects['Robe_Dress']
target_matrix = template.matrix_world.copy()
parent_inverse = template.matrix_parent_inverse.copy()
# Import a pristine copy solely as the fitting/collision reference.
previous = set(bpy.data.objects)
previous_actions = set(bpy.data.actions)
bpy.ops.import_scene.gltf(filepath=str(ASSETS/'source/rocketbox-woman.glb'))
imported = set(bpy.data.objects)-previous
body = next(o for o in imported if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers))
source_rig = next(m.object for m in body.modifiers if m.type == 'ARMATURE')
source_rig.animation_data.action = None
for track in source_rig.animation_data.nla_tracks: track.mute = True
source_rig.data.pose_position = 'REST'
scene.frame_set(0)
bpy.context.view_layer.update()
canonical = Matrix.Rotation(math.pi/2, 4, 'Z')@body.matrix_world
inverse = canonical.inverted()
body_vertices = [canonical@v.co for v in body.data.vertices]
body_faces = [tuple(p.vertices) for p in body.data.polygons]
body_tree = BVHTree.FromPolygons(body_vertices, body_faces)
bone_points = {b.name: Matrix.Rotation(math.pi/2,4,'Z')@source_rig.matrix_world@b.head_local for b in source_rig.data.bones}
source_names = {g.index:g.name for g in body.vertex_groups}
source_weights = [{source_names[g.group]:g.weight for g in v.groups} for v in body.data.vertices]
body_kd = KDTree(len(body_vertices))
for i,v in enumerate(body_vertices): body_kd.insert(v,i)
body_kd.balance()

def smooth(t):
    t = max(0., min(1., t))
    return t*t*(3-2*t)

def body_weights(v):
    nearby = body_kd.find_n(v, 10)
    result = {}
    total = sum(1/max(d,.002)**2 for _,_,d in nearby)
    for _,index,distance in nearby:
        influence = (1/max(distance,.002)**2)/total
        for name,w in source_weights[index].items():
            result[name] = result.get(name,0)+w*influence
    return result

def weights(v):
    if v.z > 1.18: return body_weights(v)
    # A long sewn garment must not follow either thigh at full strength.
    # Pelvis support plus blended leg motion avoids a split trouser silhouette.
    amount = 0.0
    left = smooth(.5+v.x/.26)
    calf = 0.0
    lower = {'Bip01 Pelvis':1-amount,
            'Bip01 L Thigh':amount*left*(1-calf),
            'Bip01 R Thigh':amount*(1-left)*(1-calf),
            'Bip01 L Calf':amount*left*calf,
            'Bip01 R Calf':amount*(1-left)*calf}
    blend=smooth((v.z-.98)/.20)
    result={name:w*(1-blend) for name,w in lower.items()}
    if blend:
        for name,w in body_weights(v).items():result[name]=result.get(name,0)+w*blend
    return result

# Copy the anatomical surface, trim neck / both cuffs / waist, and weld UV seams.
bm = bmesh.new()
bm.from_mesh(body.data)
for v in bm.verts: v.co = canonical@v.co
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00015)

def clip(point, normal, torso_only=False):
    geom=list(bm.verts)+list(bm.edges)+list(bm.faces)
    if torso_only:
        geom=[item for item in geom if all(abs(v.co.x)<.28 for v in ([item] if isinstance(item,bmesh.types.BMVert) else item.verts))]
    bmesh.ops.bisect_plane(bm, geom=geom,
                          plane_co=point, plane_no=normal, dist=.00001,
                          clear_outer=True, clear_inner=False)

clip((0,0,1.515),(0,0,1))
clip((0,0,1.08),(0,0,-1),torso_only=True)
for side in ['L','R']:
    wrist = bone_points[f'Bip01 {side} Hand']
    elbow = bone_points[f'Bip01 {side} Forearm']
    axis = (wrist-elbow).normalized()
    clip(wrist-axis*.012, axis)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.normal_update()
# Measured female anatomy supplies the shoulder and armholes. Tailoring ease
# keeps the bust and waist loose; sleeve fullness gathers towards the wrists.
for v in bm.verts:
    p=v.co.copy()
    sleeve=smooth((abs(p.x)-.18)/.10)
    shoulder=smooth((p.z-1.40)/.105)
    cuff=smooth((abs(p.x)-.43)/.09)
    ease=(.035*(1-sleeve)+(.035-.023*cuff)*sleeve)*(1-.70*shoulder)
    v.co+=v.normal*ease
    if abs(p.x)<.22 and p.z<1.40:
        t=smooth((1.40-p.z)/.28)
        a=math.atan2(v.co.y+.015,v.co.x)
        rx=.169+.021*t;ry=.156-.004*t
        target=Vector((rx*math.cos(a),-.015+ry*math.sin(a),v.co.z))
        # Continuous modest drape across the bust/waist, retaining armholes.
        blend=.88*smooth((.235-abs(p.x))/.075)*smooth((1.43-p.z)/.12)
        v.co.x=v.co.x*(1-blend)+target.x*blend
        v.co.y=v.co.y*(1-blend)+target.y*blend
data = bpy.data.meshes.new('Gamis anatomical pattern')
bm.to_mesh(data);bm.free()
pattern = bpy.data.objects.new('Gamis anatomical pattern',data)
scene.collection.objects.link(pattern)
bpy.context.view_layer.objects.active = pattern
bpy.ops.object.select_all(action='DESELECT');pattern.select_set(True)
sub = pattern.modifiers.new('Refine anatomical panels','SUBSURF');sub.levels=1
bpy.ops.object.modifier_apply(modifier=sub.name)

# Trace the actual waist boundary, then extend sewn front/back/side panels.
bm=bmesh.new();bm.from_mesh(pattern.data)
bm.verts.ensure_lookup_table()
edges=[e for e in bm.edges if e.is_boundary]
loops=[]
while edges:
    edge=edges.pop();loop=[edge.verts[0],edge.verts[1]]
    while True:
        e=next((e for e in edges if loop[-1] in e.verts),None)
        if e is None: break
        edges.remove(e);v=e.other_vert(loop[-1])
        if v==loop[0]: break
        loop.append(v)
    loops.append(loop)
waist=min(loops,key=lambda loop:sum(v.co.z for v in loop)/len(loop))
assert max(v.co.z for v in waist)<1.13, 'Waist boundary missing'
waist.sort(key=lambda v:math.atan2(v.co.y+.015,v.co.x))
cols=len(waist)
waist_start=[v.co.copy() for v in waist]
previous_ring=waist
for row in range(1,49):
    t=row/48
    z=1.08-(1.08-.065)*t
    ring=[]
    for j,start in enumerate(waist_start):
        a=math.atan2(start.y+.015,start.x)
        # Modest hip ease; almost straight lower panels, with nonuniform folds
        # concentrated beside panel seams rather than concentric ripple noise.
        rx=.190+.142*t**.82
        ry=.152+.095*t**.9
        fold=0
        for centre,amp,width,phase in [(-2.62,.009,.15,.2),(-2.03,.006,.11,-.4),(-1.12,.009,.14,.1),(-.45,.007,.12,.5),(.37,.010,.17,-.3),(1.12,.008,.13,.3),(1.90,.011,.15,-.2),(2.55,.006,.10,.4)]:
            d=(a-centre-.045*math.sin(t*2+phase)+math.pi)%math.tau-math.pi
            fold+=amp*(math.exp(-(d/width)**2)-.48*math.exp(-((d-width*1.3)/(width*.7))**2))
        fold*=smooth(t/.36)
        target=Vector(((rx+fold)*math.cos(a),-.015+(ry+fold)*math.sin(a),z))
        blend=smooth(t/.18)
        target.x=start.x*(1-blend)+target.x*blend
        target.y=start.y*(1-blend)+target.y*blend
        target.z += .003*t*t*math.sin(3*a+.6)
        ring.append(bm.verts.new(target))
    for j in range(cols):
        k=(j+1)%cols
        bm.faces.new((previous_ring[j],previous_ring[k],ring[k],ring[j]))
    previous_ring=ring
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
bm.to_mesh(pattern.data);bm.free()
vertices=[v.co.copy() for v in pattern.data.vertices]
faces=[tuple(p.vertices) for p in pattern.data.polygons]
(OUT/'body-measurements.json').write_text(json.dumps({'source':'rocketbox-woman.glb','bones':{k:list(v) for k,v in bone_points.items() if any(n in k for n in ['Spine','Pelvis','Neck','UpperArm','Forearm','Hand','Foot']) and 'Finger' not in k},'rest_bounds':[[min(v[i] for v in body_vertices),max(v[i] for v in body_vertices)] for i in range(3)]},indent=2))
print('CONNECTED PATTERN',len(vertices),'vertices',len(faces),'faces; waist',cols,flush=True)

# True offline cloth solve on the connected garment, using the actual source body.
def pins(v,i):
    if v.z>1.485: return 1.
    if v.z>1.39 and abs(v.x)<.255: return .85*smooth((v.z-1.39)/.095)
    for side in ['L','R']:
        wrist=bone_points[f'Bip01 {side} Hand']
        if (v-wrist).length<.073: return .9
    return 0.

draper=Draper(body_vertices,body_faces,OUT/'cloth-cache')
settled=draper.settle('Female_Gamis_Connected_v1',vertices,faces,pins,frames=40)
# Art-directed rest-shape refinement retains tailored ease after gravity settles
# the cloth. The solver alone can collapse a narrow waist into harsh creases.
for i,(rest,solved) in enumerate(zip(vertices,settled)):
    sleeve=smooth((abs(rest.x)-.24)/.08)
    blend=.24+.38*smooth((rest.z-1.04)/.28)
    blend=blend*(1-sleeve)+.65*sleeve
    settled[i]=rest.lerp(solved,blend)
neighbors=[set() for _ in settled]
for f in faces:
    for a,b in zip(f,f[1:]+f[:1]):neighbors[a].add(b);neighbors[b].add(a)
boundary_counts={}
for f in faces:
    for a,b in zip(f,f[1:]+f[:1]):
        e=tuple(sorted((a,b)));boundary_counts[e]=boundary_counts.get(e,0)+1
fixed={i for e,n in boundary_counts.items() if n==1 for i in e}
for _ in range(7):
    refined=[]
    for i,p in enumerate(settled):
        amount=.15 if i in fixed else .48
        refined.append(p.lerp(sum((settled[j] for j in neighbors[i]),Vector())/len(neighbors[i]),amount))
    settled=refined
# Refine broad tension folds along the side panels, continuously across the waist.
# These model extra fabric between support points, not equally spaced radial noise.
for i,p in enumerate(settled):
    if p.z>1.39 or (abs(p.x)>.27 and p.z>.9):continue
    a=math.atan2(p.y-.025,p.x)
    fall=smooth((1.39-p.z)/.5)
    fold=0.
    for centre,amp,width,lean in [(-2.78,.012,.19,.06),(-2.20,.014,.17,-.04),(-.87,.011,.20,.07),(-.30,.016,.18,-.06),(.35,.013,.19,.05),(1.0,.015,.22,-.04),(1.82,.012,.19,.06),(2.50,.014,.18,-.05)]:
        d=(a-centre-lean*(1.15-p.z)+math.pi)%math.tau-math.pi
        fold+=amp*(math.exp(-(d/width)**2)-.55*math.exp(-((d-width*1.25)/(width*.72))**2))
    p+=Vector((math.cos(a),math.sin(a),0))*fold*fall

for _ in range(3):
    for i,p in enumerate(settled):
        q,n,_,distance=body_tree.find_nearest(p)
        signed=(p-q).dot(n)
        if distance<.055 and signed<.007:settled[i]=p+n*(.007-signed)

# Remove the source sports-top undercut from the garment surface. Fair the
# vertical parameter, then restore a loose chest-to-waist envelope; retain the
# anatomical armholes and shoulder supports above this region.
for _ in range(32):
    zs=[p.z for p in settled]
    for i,p in enumerate(settled):
        strength=smooth((p.z-1.10)/.12)*smooth((1.45-p.z)/.10)*smooth((.25-abs(p.x))/.08)
        if strength and i not in fixed:
            p.z += .5*strength*(sum(zs[j] for j in neighbors[i])/len(neighbors[i])-p.z)
for i,p in enumerate(settled):
    strength=smooth((p.z-1.08)/.08)*smooth((1.45-p.z)/.08)*smooth((.25-abs(p.x))/.055)
    if not strength:continue
    a=math.atan2(p.y+.015,p.x)
    t=smooth((1.40-p.z)/.28)
    target=Vector(((.180+.015*t)*math.cos(a),-.015+(.170-.010*t)*math.sin(a),p.z))
    settled[i]=p.lerp(target,strength)

# Retopologize the already verified drape, rather than simulating the voxel
# mesh (that trial collapsed the skirt). This removes folded source topology
# while retaining the relaxed outline, sleeve volume and gravity folds.
retopo_data=bpy.data.meshes.new('Settled gamis retopology')
retopo_data.from_pydata(settled,[],faces);retopo_data.update()
bm=bmesh.new();bm.from_mesh(retopo_data)
bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary],sides=0)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(retopo_data);bm.free()
retopo=bpy.data.objects.new('Settled gamis retopology',retopo_data);scene.collection.objects.link(retopo)
bpy.ops.object.select_all(action='DESELECT');retopo.select_set(True);bpy.context.view_layer.objects.active=retopo
mod=retopo.modifiers.new('Rebuild continuous fabric surface','REMESH');mod.mode='VOXEL';mod.voxel_size=.012
bpy.ops.object.modifier_apply(modifier=mod.name)
mod=retopo.modifiers.new('Soft fabric surface','SMOOTH');mod.factor=.65;mod.iterations=5
bpy.ops.object.modifier_apply(modifier=mod.name)
bm=bmesh.new();bm.from_mesh(retopo.data)
clip((0,0,1.497),(0,0,1))
clip((0,0,.085),(0,0,-1))
for side,sign in [('L',1),('R',-1)]:
    wrist=bone_points[f'Bip01 {side} Hand'];elbow=bone_points[f'Bip01 {side} Forearm']
    axis=(wrist-elbow).normalized()
    geometry=list(bm.verts)+list(bm.edges)+list(bm.faces)
    geometry=[item for item in geometry if all(sign*v.co.x>.18 and v.co.z>1.01 for v in ([item] if isinstance(item,bmesh.types.BMVert) else item.verts))]
    bmesh.ops.bisect_plane(bm,geom=geometry,plane_co=wrist-axis*.035,plane_no=axis,dist=.00001,clear_outer=True,clear_inner=False)
bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(retopo.data);bm.free()
settled=[v.co.copy() for v in retopo.data.vertices]
faces=[tuple(f.vertices) for f in retopo.data.polygons]
vertices=[p.copy() for p in settled]
bpy.data.objects.remove(retopo,do_unlink=True)
neighbors=[set() for _ in settled];boundary_counts={}
for f in faces:
    for a,b in zip(f,f[1:]+f[:1]):
        neighbors[a].add(b);neighbors[b].add(a)
        e=tuple(sorted((a,b)));boundary_counts[e]=boundary_counts.get(e,0)+1
fixed={i for e,n in boundary_counts.items() if n==1 for i in e}

pending=set(range(len(settled)));components=[]
while pending:
    stack=[pending.pop()];count=0
    while stack:
        i=stack.pop();count+=1
        for j in neighbors[i]:
            if j in pending:pending.remove(j);stack.append(j)
    components.append(count)
if len(components)>1:
    assert max(components)>len(settled)*.95, f'Unexpected disconnected garment panels: {components}'
    keep=set()
    pending=set(range(len(settled)))
    component_sets=[]
    while pending:
        stack=[pending.pop()];group=set(stack)
        while stack:
            i=stack.pop()
            for j in neighbors[i]:
                if j in pending:pending.remove(j);group.add(j);stack.append(j)
        component_sets.append(group)
    keep=max(component_sets,key=len)
    remap={old:new for new,old in enumerate(sorted(keep))}
    faces=[tuple(remap[i] for i in f) for f in faces if all(i in keep for i in f)]
    settled=[settled[i] for i in sorted(keep)]
    vertices=[vertices[i] for i in sorted(keep)]
    neighbors=[set() for _ in settled];boundary_counts={}
    for f in faces:
        for a,b in zip(f,f[1:]+f[:1]):
            neighbors[a].add(b);neighbors[b].add(a)
            e=tuple(sorted((a,b)));boundary_counts[e]=boundary_counts.get(e,0)+1
    fixed={i for e,n in boundary_counts.items() if n==1 for i in e}
    components=[len(settled)]
assert len(components)==1, f'Disconnected garment panels: {components}'
assert max(boundary_counts.values())==2,'Non-manifold garment surface'
# The voxel cleanup can pull a few points back through the body. Restore a
# small garment clearance against the measured human surface before binding.
for _ in range(3):
    for i,p in enumerate(settled):
        q,n,_,distance=body_tree.find_nearest(p)
        signed=(p-q).dot(n)
        if distance<.05 and signed<.008:settled[i]=p+n*(.008-signed)
clearances=[]
for p in settled:
    q,n,_,distance=body_tree.find_nearest(p)
    if distance<.06:clearances.append((p-q).dot(n))
audit=dict(connected_components=components,pattern_vertices=len(settled),
           pattern_faces=len(faces),boundary_vertices=len(fixed),
           close_body_samples=len(clearances),
           minimum_signed_nearest_distance=min(clearances),
           samples_more_than_3mm_inside=sum(d<-.003 for d in clearances),
           note='Nearest-normal distances are a rest-pose diagnostic, not a continuous collision proof.')
(OUT/'mesh-audit.json').write_text(json.dumps(audit,indent=2))
print('MESH AUDIT',audit,flush=True)

# Keep the relaxed skirt's gravity-fitted outline. The original bound rig drives
# its mild sway; this avoids introducing translation at the waist or hem.
dress_weights=[dict(sorted(weights(v).items(),key=lambda item:-item[1])[:4]) for v in settled]
dress_weights=[{k:v/sum(ws.values()) for k,v in ws.items()} for ws in dress_weights]

bpy.data.objects.remove(pattern,do_unlink=True)
for o in imported: bpy.data.objects.remove(o,do_unlink=True)
for action in set(bpy.data.actions)-previous_actions:bpy.data.actions.remove(action)
for o in list(scene.objects):
    if o.name.startswith('Robe'): bpy.data.objects.remove(o,do_unlink=True)
# The source body atlas contains a pink sports top at the shoulder edge directly
# above the gamis neckline. Remove only those tiny shoulder-edge triangles from
# the gamis character copy; the original wardrobe source remains untouched.
head_skin=bpy.data.objects['Skin_Head']
turn=Matrix.Rotation(math.pi/2,4,'Z')@head_skin.matrix_world
mask=bmesh.new();mask.from_mesh(head_skin.data)
remove=[]
for face in mask.faces:
    center=sum((turn@v.co for v in face.verts),Vector())/len(face.verts)
    if center.z<1.56 and abs(center.x)>.04:
        remove.append(face)
if remove:
    bmesh.ops.delete(mask,geom=remove,context='FACES_ONLY')
    mask.to_mesh(head_skin.data);head_skin.data.update()
mask.free()
collection=bpy.data.collections.new('HAJJ_FEMALE_GAMIS');scene.collection.children.link(collection)
cloth=bpy.data.materials['Cloth_White'].copy();cloth.name='Female_Gamis_White_Woven_Cotton'
shader=next(n for n in cloth.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
shader.inputs['Base Color'].default_value=(.91,.905,.89,1)
shader.inputs['Roughness'].default_value=.86
shader.inputs['Sheen Weight'].default_value=.20
seam=cloth.copy();seam.name='Female_Gamis_Topstitch_Cotton'
next(n for n in seam.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'].default_value=(.86,.855,.84,1)

def make(name,vs,fs,material=cloth,subdivision=0,thickness=0,binding=None):
    data=bpy.data.meshes.new(name);data.from_pydata([inverse@v for v in vs],[],fs);data.update()
    obj=bpy.data.objects.new(name,data);collection.objects.link(obj)
    obj.parent=rig;obj.matrix_parent_inverse=parent_inverse.copy();obj.matrix_world=target_matrix.copy()
    data.materials.append(material)
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    for p in data.polygons:p.use_smooth=True
    uv=data.uv_layers.new(name='FabricUV')
    for polygon in data.polygons:
        for li in polygon.loop_indices:
            v=vs[data.loops[li].vertex_index]
            uv.data[li].uv=(math.atan2(v.y-.025,v.x)*3,v.z*8)
    for name in rig.data.bones.keys():obj.vertex_groups.new(name=name)
    for i,v in enumerate(vs):
        influences=binding or dress_weights[i]
        influences=dict(sorted(influences.items(),key=lambda x:-x[1])[:4])
        total=sum(influences.values())
        for name,w in influences.items():
            if w>0:obj.vertex_groups[name].add([i],w/total,'REPLACE')
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    if subdivision:
        mod=obj.modifiers.new('Tailored surface refinement','SUBSURF');mod.levels=subdivision
        bpy.ops.object.modifier_apply(modifier=mod.name)
    if thickness:
        mod=obj.modifiers.new('Cotton cloth thickness','SOLIDIFY');mod.thickness=thickness;mod.offset=-.5
        bpy.ops.object.modifier_apply(modifier=mod.name)
    arm=obj.modifiers.new('Original Rocketbox rig','ARMATURE');arm.object=rig
    return obj

dress=make('Robe_Dress',settled,faces,subdivision=0,thickness=.0012)
dress['construction']='Connected anatomical bodice, sleeves and extended sewn lower panels'
dress['cloth_simulation_frames']=40
check=bmesh.new();check.from_mesh(dress.data)
assert all(e.is_manifold for e in check.edges),'The finished cloth shell must be closed'
check.free()
dress['fitting_source']='source/rocketbox-woman.glb; original body and rig retained'

# Folded edges belong to the garment surface, so they cannot drift away during
# animation. Subtle material changes identify the cuffs and bottom hem.
dress.data.materials.append(seam)
for face in dress.data.polygons:
    ids=[i % len(settled) for i in face.vertices]
    reference=sum((vertices[i] for i in ids),Vector())/len(ids)
    if reference.z<.09 or any((reference-bone_points[f'Bip01 {side} Hand']).length<.065 for side in ['L','R']):
        face.material_index=1

rig.data.pose_position='POSE'
for track in rig.animation_data.nla_tracks:track.mute=False
scene.frame_set(0);bpy.context.view_layer.update()
# Keep the edited source, alternate female clothes and original clips editable.
project=OUT/'female-gamis.blend'
for track in rig.animation_data.nla_tracks:track.mute=True
idle=bpy.data.actions.get('idle');rig.animation_data.action=idle
if idle and idle.slots:rig.animation_data.action_slot=idle.slots[0]
scene.frame_set(0)
for obj in scene.objects:
    obj.select_set(False)
    if obj.type=='MESH':obj.hide_set(not obj.name.startswith(('Robe','Skin_Head','Skin_Hands','Skin_Feet','Sandal','Hijab')))
    if obj.type=='ARMATURE':obj.hide_set(True)
bpy.context.view_layer.objects.active=dress;dress.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(project))
rig.animation_data.action=None
for track in rig.animation_data.nla_tracks:track.mute=False
scene.frame_set(0)

def export(path,standalone=False):
    bpy.ops.object.select_all(action='DESELECT')
    for o in scene.objects:
        include=o.type!='MESH' or not standalone or o.name.startswith(('Robe','Skin_Head','Skin_Hands','Skin_Feet','Sandal','Hijab'))
        o.hide_set(False);o.select_set(include)
    temp=path.with_name('.building-'+path.name)
    bpy.ops.export_scene.gltf(filepath=str(temp),export_format='GLB',use_selection=True,export_animations=True,export_image_format='JPEG',export_jpeg_quality=90,export_yup=True,export_extras=True)
    temp.replace(path)

export(OUT/'woman.glb')
export(OUT/'woman-gamis.glb',True)
assert preserved_signature()==original_signature,'Unrelated female meshes changed'
(OUT/'preserved-meshes.json').write_text(json.dumps({'before':original_signature,'after':preserved_signature()},indent=2))
(OUT/'cloth-report.json').write_text(json.dumps(draper.report,indent=2))
print('GAMIS READY FOR REVIEW',project,flush=True)

"""Rebuild only the male gamis, fitted to the project's original Rocketbox body.

Run in background Blender. Existing wardrobe/rigs are retained in a backup.
The connected bodice and sleeves inherit the actual body's topology; the lower
panels extend its waist boundary. Offline cloth is baked before skin binding.
"""
import bpy, bmesh, math, json, shutil, sys
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'tools'))
from pilgrim_cloth import Draper
ASSETS = ROOT/'src/VRHaji.Web/wwwroot/assets/characters'
OUT = ROOT/'artifacts/male-gamis'
OUT.mkdir(parents=True, exist_ok=True)
if not bpy.app.background:
    raise RuntimeError('Use an isolated background Blender process.')
backup = OUT/'before'
backup.mkdir(exist_ok=True)
for source in [ROOT/'artifacts/pilgrim-man.blend', ASSETS/'man.glb', ASSETS/'outfits/man-gamis.glb']:
    dest = backup/source.name
    if not dest.exists(): shutil.copy2(source, dest)
bpy.ops.wm.open_mainfile(filepath=str(backup/'pilgrim-man.blend'))
scene = bpy.context.scene
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
bpy.ops.import_scene.gltf(filepath=str(ASSETS/'source/rocketbox-man.glb'))
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
    if v.z > 1.18 or (abs(v.x)>.27 and v.z>.87): return body_weights(v)
    # A long sewn garment must not follow either thigh at full strength.
    # Pelvis support plus blended leg motion avoids a split trouser silhouette.
    amount = .96*smooth((1.02-v.z)/.60)
    left = smooth(.5+v.x/.26)
    calf = .95*smooth((.62-v.z)/.18)
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
clip((0,0,1.025),(0,0,-1),torso_only=True)
for side in ['L','R']:
    wrist = bone_points[f'Bip01 {side} Hand']
    elbow = bone_points[f'Bip01 {side} Forearm']
    axis = (wrist-elbow).normalized()
    clip(wrist-axis*.012, axis)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.normal_update()
# Tailoring ease: shoulders are supported, chest and sleeves have breathing room.
for v in bm.verts:
    p = v.co.copy()
    sleeve = smooth((abs(p.x)-.18)/.11)
    shoulder = smooth((p.z-1.39)/.105)
    ease = (.028*(1-sleeve)+.021*sleeve)*(1-.60*shoulder)
    v.co += v.normal*ease
    if sleeve < .6 and p.z < 1.40:
        v.co.x += math.copysign(.016*smooth((1.4-p.z)/.25),p.x)
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
assert max(v.co.z for v in waist)<1.08, 'Waist boundary missing'
waist.sort(key=lambda v:math.atan2(v.co.y-.025,v.co.x))
cols=len(waist)
waist_start=[v.co.copy() for v in waist]
previous_ring=waist
for row in range(1,49):
    t=row/48
    z=1.025-(1.025-.115)*t
    ring=[]
    for j,start in enumerate(waist_start):
        a=math.atan2(start.y-.025,start.x)
        # Modest hip ease; almost straight lower panels, with nonuniform folds
        # concentrated beside panel seams rather than concentric ripple noise.
        rx=.196+.035*smooth(t/.48)+.012*t
        ry=.145+.018*smooth(t/.5)
        fold=0
        for centre,amp,width,phase in [(-2.62,.009,.15,.2),(-2.03,.006,.11,-.4),(-1.12,.009,.14,.1),(-.45,.007,.12,.5),(.37,.010,.17,-.3),(1.12,.008,.13,.3),(1.90,.011,.15,-.2),(2.55,.006,.10,.4)]:
            d=(a-centre-.045*math.sin(t*2+phase)+math.pi)%math.tau-math.pi
            fold+=amp*(math.exp(-(d/width)**2)-.48*math.exp(-((d-width*1.3)/(width*.7))**2))
        fold*=smooth(t/.36)
        target=Vector(((rx+fold)*math.cos(a),.025+(ry+fold)*math.sin(a),z))
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
settled=draper.settle('Male_Gamis_Connected_v2',vertices,faces,pins,frames=40)
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

pending=set(range(len(settled)));components=[]
while pending:
    stack=[pending.pop()];count=0
    while stack:
        i=stack.pop();count+=1
        for j in neighbors[i]:
            if j in pending:pending.remove(j);stack.append(j)
    components.append(count)
assert len(components)==1, f'Disconnected garment panels: {components}'
assert max(boundary_counts.values())==2,'Non-manifold garment surface'
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

# Keep the source calves available inside the robe. During a run the lifted heel
# exposes part of the shin; the old feet-only body mask leaves an empty ankle.
leg_data=body.data.copy()
bm=bmesh.new();bm.from_mesh(leg_data)
bmesh.ops.delete(bm,geom=[f for f in bm.faces if not .145<(canonical@f.calc_center_median()).z<.43],context='FACES')
bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
bm.to_mesh(leg_data);bm.free()
leg_obj=body.copy();leg_obj.data=leg_data;leg_obj.name='New_Gamis_LowerLegs';scene.collection.objects.link(leg_obj)
leg_obj.parent=rig;leg_obj.matrix_parent_inverse=parent_inverse.copy();leg_obj.matrix_world=target_matrix.copy()
for mod in leg_obj.modifiers:
    if mod.type=='ARMATURE':mod.object=rig
leg_material_indices=[p.material_index for p in leg_obj.data.polygons]
leg_obj.data.materials.clear()
for mat in bpy.data.objects['Skin_Feet'].data.materials:leg_obj.data.materials.append(mat)
for p,index in zip(leg_obj.data.polygons,leg_material_indices):p.material_index=index
bpy.data.objects.remove(pattern,do_unlink=True)
for o in imported: bpy.data.objects.remove(o,do_unlink=True)
for action in set(bpy.data.actions)-previous_actions:bpy.data.actions.remove(action)
for o in list(scene.objects):
    if o.name.startswith('Robe'): bpy.data.objects.remove(o,do_unlink=True)
collection=bpy.data.collections.new('HAJJ_MALE_GAMIS');scene.collection.children.link(collection)
for c in list(leg_obj.users_collection):c.objects.unlink(leg_obj)
collection.objects.link(leg_obj);leg_obj.name='Robe_LowerLegs'
cloth=bpy.data.materials['Cloth_White'].copy();cloth.name='Gamis_White_Woven_Cotton'
shader=next(n for n in cloth.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
shader.inputs['Base Color'].default_value=(.88,.875,.86,1)
shader.inputs['Roughness'].default_value=.86
shader.inputs['Sheen Weight'].default_value=.20
seam=cloth.copy();seam.name='Gamis_Topstitch_Cotton'
next(n for n in seam.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'].default_value=(.78,.775,.76,1)

def fitted_detail_weights(v):
    """Interpolate the actual cloth's weights so stitched details cannot drift."""
    point,_,face_index,_=surface.find_nearest(v)
    polygon=faces[face_index]
    candidates=[]
    for j in range(1,len(polygon)-1):
        ids=(polygon[0],polygon[j],polygon[j+1])
        a,b,c=[settled[k] for k in ids]
        u=b-a;w=c-a;q=point-a
        d00=u.dot(u);d01=u.dot(w);d11=w.dot(w);d20=q.dot(u);d21=q.dot(w)
        denominator=d00*d11-d01*d01
        if abs(denominator)<1e-16:continue
        beta=(d11*d20-d01*d21)/denominator;gamma=(d00*d21-d01*d20)/denominator
        bary=(1-beta-gamma,beta,gamma)
        candidates.append((sum(max(0,-x) for x in bary),ids,bary))
    if not candidates:return weights(v)
    _,ids,bary=min(candidates,key=lambda item:item[0])
    bary=[max(0,x) for x in bary];total=sum(bary);result={}
    for index,factor in zip(ids,bary):
        influences=dict(sorted(weights(settled[index]).items(),key=lambda x:-x[1])[:4])
        amount=sum(influences.values())
        for name,value in influences.items():result[name]=result.get(name,0)+value/amount*factor/total
    return result

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
        influences=binding or (weights(v) if obj.name=='Robe_Dress' else fitted_detail_weights(v))
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
dress['fitting_source']='source/rocketbox-man.glb; original body and rig retained'
surface=BVHTree.FromPolygons(settled,faces)

def front(x,z,offset=.002):
    p,_,_,_=surface.ray_cast(Vector((x,-.6,z)),Vector((0,1,0)),1.2)
    if p is None: raise RuntimeError('Front detail outside bodice: '+str((x,z)))
    return p+Vector((0,-offset,0))

# Connected neckline ring as the reference for a stand collar (not a floating tube).
bm=bmesh.new();bm.from_mesh(dress.data)
neck=[v for v in bm.verts if any(e.is_boundary for e in v.link_edges) and (canonical@v.co).z>1.47]
# Solidify closes the boundary; read the original single-layer pattern instead.
bm.free()
edge_use={}
for f in faces:
    for a,b in zip(f,f[1:]+f[:1]):
        edge=tuple(sorted((a,b)));edge_use[edge]=edge_use.get(edge,0)+1
neck_indices={i for e,n in edge_use.items() if n==1 for i in e if settled[i].z>1.47}
neck_ring=sorted((settled[i] for i in neck_indices),key=lambda v:math.atan2(v.y-.05,v.x))
assert len(neck_ring)>16,'Neck opening missing'
n=len(neck_ring);vs=[];fs=[]
for row in range(5):
    t=row/4
    for p in neck_ring:
        vs.append(Vector((p.x*(1.035-.025*t),.05+(p.y-.05)*(1.035-.025*t),(p.z-.006)*(1-t)+1.548*t)))
for row in range(4):
    for j in range(n):fs.append((row*n+j,row*n+(j+1)%n,(row+1)*n+(j+1)%n,(row+1)*n+j))
make('Robe_StandCollar',vs,fs,thickness=.0018,binding={'Bip01 Neck':.7,'Bip01 Spine2':.3})

# Placket and pocket are fitted to the settled cloth, including every interior vertex.
vs=[];fs=[]
for row in range(25):
    z=1.503-row/24*.295
    for col in range(5):vs.append(front(-.011+col*.0055,z,.0022))
for row in range(24):
    for col in range(4):
        a=row*5+col;fs.append((a,a+1,a+6,a+5))
make('Robe_ButtonPlacket',vs,fs,thickness=.0008)
for i in range(6):
    z=1.479-i*.048
    centre=front(0,z,.0042)
    vs=[centre]+[centre+Vector((.0028*math.cos(j*math.tau/16),0,.0028*math.sin(j*math.tau/16))) for j in range(16)]
    make('Robe_Button_'+str(i),vs,[(0,j+1,(j+1)%16+1) for j in range(16)],thickness=.001)
vs=[];fs=[]
for row in range(13):
    t=row/12
    for col in range(13):
        u=col/12;x=.074+u*.071
        z=1.365-.088*t-.013*t**5*(1-abs(2*u-1))
        vs.append(front(x,z,.0025+.0014*math.sin(u*math.pi)*math.sin(t*math.pi)))
for row in range(12):
    for col in range(12):
        a=row*13+col;fs.append((a,a+1,a+14,a+13))
make('Robe_ChestPocket',vs,fs,thickness=.0009)

def stitched_curve(name,points,width=.0007):
    vs=[]
    for i,p in enumerate(points):
        q,normal,_,_=surface.find_nearest(p)
        tangent=points[min(i+1,len(points)-1)]-points[max(i-1,0)]
        cross=normal.cross(tangent).normalized()*width/2
        vs.extend([q+normal*.0014-cross,q+normal*.0014+cross])
    return make(name,vs,[(i,i+1,i+3,i+2) for i in range(0,len(vs)-2,2)],seam)

# Tailoring lines: shoulder seams and a gently curved rear yoke.
for side,sign in [('L',1),('R',-1)]:
    points=[]
    for j in range(33):
        x=sign*(.078+j/32*.17)
        p,_,_,_=surface.ray_cast(Vector((x,.047,1.8)),Vector((0,0,-1)),.5)
        if p is not None:points.append(p)
    stitched_curve('Robe_ShoulderSeam_'+side,points)
points=[]
for j in range(65):
    x=-.195+j/64*.39;z=1.415-.018*(abs(x)/.195)**2
    p,_,_,_=surface.ray_cast(Vector((x,.6,z)),Vector((0,-1,0)),1)
    if p is not None:points.append(p)
stitched_curve('Robe_BackYokeSeam',points)

def ribbon(name,points,width=.001,mat=seam):
    # Thin fabric topstitch strips, following the settled cloth surface.
    vs=[]
    for p in points:vs.extend([p+Vector((-width/2,0,0)),p+Vector((width/2,0,0))])
    make(name,vs,[(i,i+1,i+3,i+2) for i in range(0,len(vs)-2,2)],mat)

for sign in [-1,1]:ribbon('Robe_PlacketStitch_'+str(sign),[front(sign*.009,1.488-j*.28/48,.0032) for j in range(49)],.00045)
for side in [0,1]:ribbon('Robe_PocketStitch_'+str(side),[front(.076+side*.067,1.363-j*.088/32,.0038) for j in range(33)],.00045)
# Folded hem and cuffs follow each original boundary; they share the same skinning.
boundary={i for e,n in edge_use.items() if n==1 for i in e}
for label,indices,width in [('Hem',[i for i in boundary if settled[i].z<.2],.018)]+[(f'Cuff_{side}',[i for i in boundary if sign*settled[i].x>.45],.035) for side,sign in [('L',1),('R',-1)]]:
    points=[settled[i] for i in indices]
    if label=='Hem':
        points.sort(key=lambda p:math.atan2(p.y-.025,p.x));direction=Vector((0,0,1))
    else:
        side=label[-1];wrist=bone_points[f'Bip01 {side} Hand'];elbow=bone_points[f'Bip01 {side} Forearm']
        direction=(elbow-wrist).normalized();a=direction.cross(Vector((0,1,0))).normalized();b=direction.cross(a)
        points.sort(key=lambda p:math.atan2((p-wrist).dot(b),(p-wrist).dot(a)))
    vs=[];fs=[];n=len(points)
    for row in range(3):
        for p in points:
            q=p+direction*width*row/2
            hit,normal,_,_=surface.find_nearest(q)
            # A folded edge extends over the cut boundary, with enough clearance
            # for the 1.2 mm cloth shell after skeletal deformation.
            extra=-direction*.010*(1-row/2) if label!='Hem' else Vector((0,0,-.002*(1-row/2)))
            vs.append(hit+normal*.003+extra)
    for row in range(2):
        for j in range(n):fs.append((row*n+j,row*n+(j+1)%n,(row+1)*n+(j+1)%n,(row+1)*n+j))
    make('Robe_'+label,vs,fs,thickness=.0008)

rig.data.pose_position='POSE'
for track in rig.animation_data.nla_tracks:track.mute=False
scene.frame_set(0);bpy.context.view_layer.update()
# Keep the edited source, all alternate male clothes and original clips editable.
project=OUT/'male-gamis.blend'
for track in rig.animation_data.nla_tracks:track.mute=True
idle=bpy.data.actions.get('idle');rig.animation_data.action=idle
if idle and idle.slots:rig.animation_data.action_slot=idle.slots[0]
scene.frame_set(0)
for obj in scene.objects:
    obj.select_set(False)
    if obj.type=='MESH':obj.hide_set(not obj.name.startswith(('Robe','Skin_Head','Skin_Hands','Skin_Feet','Sandal')))
    if obj.type=='ARMATURE':obj.hide_set(True)
bpy.context.view_layer.objects.active=dress;dress.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(project))
rig.animation_data.action=None
for track in rig.animation_data.nla_tracks:track.mute=False
scene.frame_set(0)

def export(path,standalone=False):
    bpy.ops.object.select_all(action='DESELECT')
    for o in scene.objects:
        include=o.type!='MESH' or not standalone or o.name.startswith(('Robe','Skin_Head','Skin_Hands','Skin_Feet','Sandal'))
        o.hide_set(False);o.select_set(include)
    temp=path.with_name('.building-'+path.name)
    bpy.ops.export_scene.gltf(filepath=str(temp),export_format='GLB',use_selection=True,export_animations=True,export_image_format='JPEG',export_jpeg_quality=90,export_yup=True,export_extras=True)
    temp.replace(path)

export(OUT/'man.glb')
export(OUT/'man-gamis.glb',True)
(OUT/'cloth-report.json').write_text(json.dumps(draper.report,indent=2))
print('GAMIS READY FOR REVIEW',project,flush=True)

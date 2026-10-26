"""Selective two-piece ihram revision on the existing male Rocketbox rig.

Build in an isolated Blender process. Fit and settle open cloth panels in the
source idle pose, then inverse-bind them to the original skeleton. Output is
staged for visual review; installed gamis/female assets are not rewritten.
"""
import bpy, bmesh, math, json, shutil, sys, hashlib
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from pilgrim_cloth import Draper
ASSETS=ROOT/'src/VRHaji.Web/wwwroot/assets/characters'
OUT=ROOT/'artifacts/male-ihram';OUT.mkdir(parents=True,exist_ok=True)
BACKUP=OUT/'before';BACKUP.mkdir(exist_ok=True)
if not bpy.app.background:raise RuntimeError('Use background Blender to preserve the live scene.')
for path in [ROOT/'artifacts/male-gamis/male-gamis.blend',ASSETS/'man.glb',ASSETS/'outfits/man-ihram.glb',ASSETS/'outfits/man-ihram-covered.glb']:
    if not (BACKUP/path.name).exists():shutil.copy2(path,BACKUP/path.name)
preserved_paths=[ASSETS/'woman.glb',ASSETS/'outfits/man-gamis.glb']+list((ASSETS/'outfits').glob('woman-*.glb'))
if not (OUT/'preserved-assets.json').exists():
    (OUT/'preserved-assets.json').write_text(json.dumps({str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in preserved_paths},indent=2))
bpy.ops.wm.open_mainfile(filepath=str(BACKUP/'male-gamis.blend'))
scene=bpy.context.scene;rig=next(o for o in scene.objects if o.type=='ARMATURE')
rig.hide_set(False);rig.animation_data.action=None
for t in rig.animation_data.nla_tracks:t.mute=True
rig.data.pose_position='REST';scene.frame_set(0);bpy.context.view_layer.update()
template=bpy.data.objects['Ihram_Izar'];target_matrix=template.matrix_world.copy();parent_inverse=template.matrix_parent_inverse.copy()

def gamis_signature():
    return hashlib.sha256(repr([(o.name,[tuple(v.co) for v in o.data.vertices],
                [(g.name,g.index) for g in o.vertex_groups],
                [[(g.group,g.weight) for g in v.groups] for v in o.data.vertices])
                for o in sorted(scene.objects,key=lambda o:o.name) if o.type=='MESH' and o.name.startswith('Robe')]).encode()).hexdigest()
old_gamis=gamis_signature()
old_objects=set(bpy.data.objects);old_actions=set(bpy.data.actions)
bpy.ops.import_scene.gltf(filepath=str(ASSETS/'source/rocketbox-man.glb'))
imported=set(bpy.data.objects)-old_objects
body=next(o for o in imported if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers))
source_rig=next(m.object for m in body.modifiers if m.type=='ARMATURE')
for t in source_rig.animation_data.nla_tracks:t.mute=True
source_rig.animation_data.action=None;source_rig.data.pose_position='REST';scene.frame_set(0);bpy.context.view_layer.update()
turn=Matrix.Rotation(math.pi/2,4,'Z');canonical=turn@body.matrix_world;inverse=canonical.inverted()
basis=turn@source_rig.matrix_world
rest_body=[canonical@v.co for v in body.data.vertices]
body_faces=[tuple(p.vertices) for p in body.data.polygons]
group_names={g.index:g.name for g in body.vertex_groups}
body_weights=[{group_names[g.group]:g.weight for g in v.groups if g.weight>0} for v in body.data.vertices]
idle=next(a for a in set(bpy.data.actions)-old_actions if a.name.startswith('idle'))
source_rig.animation_data.action=idle;source_rig.animation_data.action_slot=idle.slots[0]
source_rig.data.pose_position='POSE';scene.frame_set(0);bpy.context.view_layer.update()
# The imported idle clip rotates its root by a quarter-turn. Use the posed
# shoulder axis to keep the modelling frame X=left/right and -Y=front.
pose_basis=Matrix.Rotation(-math.pi/2,4,'Z')@turn@source_rig.matrix_world
matrices={b.name:pose_basis@b.matrix@b.bone.matrix_local.inverted()@basis.inverted() for b in source_rig.pose.bones}

def normalize(weights):
    ws=dict(sorted(((k,v) for k,v in weights.items() if v>1e-6),key=lambda item:-item[1])[:4]);total=sum(ws.values())
    return {k:v/total for k,v in ws.items()}

def skin_matrix(ws):
    m=Matrix(((0,0,0,0),)*4);total=sum(ws.values())
    for name,value in ws.items():m+=matrices[name]*(value/total)
    return m

posed_body=[skin_matrix(w)@v for w,v in zip(body_weights,rest_body)]
tree=BVHTree.FromPolygons(posed_body,body_faces)
torso_faces=[f for f in body_faces if sum(sum(w for n,w in body_weights[i].items() if any(k in n for k in ['UpperArm','Forearm','Hand','Finger'])) for i in f)/len(f)<.55]
torso_tree=BVHTree.FromPolygons(posed_body,torso_faces)
kd=KDTree(len(posed_body))
for i,v in enumerate(posed_body):kd.insert(v,i)
kd.balance()
measurements={}
for z in [.95,1.04,1.2,1.35,1.45]:
    pts=[v for v in posed_body if abs(v.z-z)<.025 and abs(v.x)<.23]
    measurements[str(z)]={a:[min(p[k] for p in pts),max(p[k] for p in pts)] for k,a in enumerate(['x','y','z'])} if pts else None
(OUT/'body-measurements.json').write_text(json.dumps(measurements,indent=2))
print('FITTING: source body, idle pose; torso sections',measurements,flush=True)

def smooth(t):
    t=max(0,min(1,t));return t*t*(3-2*t)

def nearest_weights(v):
    result={};near=kd.find_n(v,8);total=sum(1/max(d,.004)**2 for _,_,d in near)
    for _,i,d in near:
        factor=(1/max(d,.004)**2)/total
        for name,w in body_weights[i].items():result[name]=result.get(name,0)+w*factor
    return result

def lower_weights(v):
    amount=.96*smooth((1.02-v.z)/.60);left=smooth(.5+v.x/.26);calf=.95*smooth((.62-v.z)/.18)
    return normalize({'Bip01 Pelvis':1-amount,'Bip01 L Thigh':amount*left*(1-calf),'Bip01 R Thigh':amount*(1-left)*(1-calf),'Bip01 L Calf':amount*left*calf,'Bip01 R Calf':amount*(1-left)*calf})

def upper_weights(v,covered):
    anchors=[(.94,'Bip01 Pelvis'),(1.08,'Bip01 Spine'),(1.22,'Bip01 Spine1'),(1.40,'Bip01 Spine2'),(1.56,'Bip01 Neck')]
    base={'Bip01 Pelvis':1}
    for (a,na),(b,nb) in zip(anchors,anchors[1:]):
        if a<=v.z<=b:
            t=smooth((v.z-a)/(b-a));base={na:1-t,nb:t};break
    # Shoulder fabric follows the supporting arm gradually; front and back
    # hanging panels remain attached to the torso rather than the nearest elbow.
    side='L' if v.x>0 else 'R'
    amount=.96*smooth((abs(v.x)-.10)/.12)*smooth((.30-abs(v.y-.025))/.14)
    if not covered and side=='R':amount=0
    result={n:w*(1-amount) for n,w in base.items()}
    elbow=smooth((1.40-v.z)/.30)
    result[f'Bip01 {side} UpperArm']=amount*(1-elbow)
    result[f'Bip01 {side} Forearm']=amount*elbow
    return normalize(result)

def grid_faces(rows,cols):
    return [(r*cols+j,r*cols+j+1,(r+1)*cols+j+1,(r+1)*cols+j) for r in range(rows-1) for j in range(cols-1)]

def radial_body(a,z,default):
    centre=Vector((0,.032,z));direction=Vector((math.cos(a),math.sin(a),0))
    hit,_,_,_=torso_tree.ray_cast(centre+direction*.45,-direction,.6)
    return (hit-centre).length if hit is not None else default

def folds(a,t):
    result=0.
    for center,amp,width,lean in [(-2.70,.009,.18,.05),(-2.04,.012,.14,-.04),(-1.10,.008,.18,.03),(-.35,.010,.16,-.05),(.40,.009,.15,.04),(1.13,.011,.19,-.03),(1.98,.008,.14,.07),(2.58,.013,.17,-.04)]:
        d=(a-center-lean*t+math.pi)%math.tau-math.pi
        result+=amp*(math.exp(-(d/width)**2)-.5*math.exp(-((d-width*1.2)/(.72*width))**2))
    return result

draper=Draper(posed_body,body_faces,OUT/'cloth-cache')
surfaces={};audit=[]
collections={}
for name in ['HAJJ_MALE_IHRAM_IZAR','HAJJ_MALE_IHRAM_RIDA']:
    collections[name]=bpy.data.collections.new(name);scene.collection.children.link(collections[name])
cloth=bpy.data.materials['Cloth_Ihram_Cotton'].copy();cloth.name='Ihram_White_Cotton_Terry'
shader=next(n for n in cloth.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
shader.inputs['Base Color'].default_value=(.89,.885,.87,1);shader.inputs['Roughness'].default_value=.94;shader.inputs['Sheen Weight'].default_value=.25
border=cloth.copy();border.name='Ihram_Woven_Selvedge'
next(n for n in border.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'].default_value=(.84,.835,.82,1)
for o in list(scene.objects):
    if o.name.startswith('Ihram'):bpy.data.objects.remove(o,do_unlink=True)

def make(name,vertices,rows,cols,pins,upper=False,covered=False,extras=()):
    faces=grid_faces(rows,cols)
    bindings=[upper_weights(v,covered) if upper else lower_weights(v) for v in vertices]
    solved=draper.settle(name+'_IdleDrape',vertices,faces,pins,extras=extras,frames=32)
    result=[a.lerp(b,.66 if upper else .62) for a,b in zip(vertices,solved)]
    # Remove solver chatter without erasing the nonuniform primary folds.
    for _ in range(3):
        previous=result;result=[]
        for i,p in enumerate(previous):
            r,c=divmod(i,cols)
            neighbors=[previous[j] for j in [i-cols if r else i,i+cols if r<rows-1 else i,i-1 if c else i,i+1 if c<cols-1 else i]]
            amount=.10 if r in [0,rows-1] or c in [0,cols-1] else .30
            result.append(p.lerp(sum(neighbors,Vector())/4,amount))
    # Separate the duplicated wrap interval explicitly after settling. This
    # preserves two free textile edges without thin intersecting slivers.
    wrap=.70 if upper else .85
    repeat=(cols-1)*math.tau/(math.tau+wrap)
    for r in range(rows):
        for j in range(math.ceil(repeat),cols):
            source=j-repeat;k=int(source);u=source-k
            q=result[r*cols+k].lerp(result[r*cols+k+1],u)
            normal=Vector((q.x,q.y-.032,0)).normalized()
            result[r*cols+j]=q+normal*(.014 if upper else .012)
    for _ in range(2):
        for i,p in enumerate(result):
            hit,normal,_,distance=tree.find_nearest(p)
            clearance=.018 if upper and p.z>1.32 else (.012 if upper else .006)
            if hit is not None and distance<.045 and (p-hit).dot(normal)<clearance:
                result[i]=p+normal*(clearance-(p-hit).dot(normal))
    for ev,ef in extras:
        layer=BVHTree.FromPolygons(ev,ef);push=[]
        for p in result:
            direction=Vector((p.x,p.y-.032,0)).normalized()
            centre=Vector((0,.032,min(p.z,1.025)))
            hit,_,_,_=layer.ray_cast(centre+direction*.6,-direction,1.1)
            required=0 if hit is None or p.z>1.14 else max(0,(hit-centre).length+.012-Vector((p.x,p.y-.032,0)).length)
            push.append(required*(1-smooth((p.z-1.04)/.10)))
        # Spread the clearance correction over neighbouring rows rather than
        # projecting vertices upwards onto the izar's folded top edge.
        for _ in range(3):
            previous=push[:]
            for i in range(len(push)):
                r,c=divmod(i,cols)
                push[i]=max(previous[i],previous[i-cols]*.78 if r else 0,previous[i+cols]*.78 if r<rows-1 else 0)
        for i,p in enumerate(result):result[i]=p+Vector((p.x,p.y-.032,0)).normalized()*push[i]
    bindings=[upper_weights(v,covered) if upper else lower_weights(v) for v in result]
    # Bind the overlaid textile edge to the same underlying influences as its
    # neighbouring sheet, so the overlap remains separated during leg/arm motion.
    for r in range(rows):
        for j in range(math.ceil(repeat),cols):
            source=j-repeat;k=int(source);u=source-k
            a=r*cols+k;b=a+1;q=result[a].lerp(result[b],u)
            tangent=result[b]-result[a]
            vertical=result[min(rows-1,r+1)*cols+k]-result[max(0,r-1)*cols+k]
            normal=tangent.cross(vertical).normalized()
            if normal.dot(Vector((q.x,q.y-.032,0)))<0:normal=-normal
            result[r*cols+j]=q+normal*(.016 if upper else .014)
            keys=bindings[a].keys()|bindings[b].keys()
            bindings[r*cols+j]=normalize({key:bindings[a].get(key,0)*(1-u)+bindings[b].get(key,0)*u for key in keys})
    surfaces[name]=(result,faces)
    rest=[skin_matrix(w).inverted()@p for p,w in zip(result,bindings)]
    data=bpy.data.meshes.new(name);data.from_pydata([inverse@v for v in rest],[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);collections['HAJJ_MALE_IHRAM_RIDA' if upper else 'HAJJ_MALE_IHRAM_IZAR'].objects.link(obj)
    obj.parent=rig;obj.matrix_parent_inverse=parent_inverse.copy();obj.matrix_world=target_matrix.copy()
    data.materials.append(cloth);data.materials.append(border)
    uv=data.uv_layers.new(name='UnstitchedSheetUV')
    for face in data.polygons:
        row,col=divmod(face.index,cols-1)
        face.use_smooth=True
        face.material_index=1 if row==rows-2 or col in [0,cols-2] else 0
        for li in face.loop_indices:
            r,c=divmod(data.loops[li].vertex_index,cols);uv.data[li].uv=(c/(cols-1)*8,r/(rows-1)*5)
    groups={b.name:obj.vertex_groups.new(name=b.name) for b in rig.data.bones}
    for i,w in enumerate(bindings):
        for name,value in w.items():groups[name].add([i],value,'REPLACE')
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    solid=obj.modifiers.new('Cotton sheet 1.4 mm','SOLIDIFY');solid.thickness=.0014;solid.offset=0
    bpy.ops.object.modifier_apply(modifier=solid.name)
    arm=obj.modifiers.new('Original male skeleton','ARMATURE');arm.object=rig
    obj['construction']='Open rectangular textile with unwelded overlapping edges; idle-pose drape inverse-bound to source rig'
    obj['cloth_simulation_frames']=32
    distances=[]
    for p in result:
        hit,n,_,d=tree.find_nearest(p)
        if d<.05:distances.append((p-hit).dot(n))
    edges={}
    for face in faces:
        for a,b in zip(face,face[1:]+face[:1]):
            edge=tuple(sorted((a,b)));edges[edge]=edges.get(edge,0)+1
    boundary=sum(n==1 for n in edges.values())
    assert max(edges.values())==2 and boundary==2*(rows+cols-2),'Invalid sheet topology'
    assert len(result)-len(edges)+len(faces)==1,'Sheet must remain a single rectangular panel'
    audit.append(dict(name=obj.name,vertices=len(result),faces=len(faces),open_edges=boundary,
                      min_signed_body_distance=min(distances),body_samples_inside_3mm=sum(d<-.003 for d in distances)))
    print('BUILT',obj.name,audit[-1],flush=True)
    return obj

# Izar: one open sheet, including its rolled waist edge, with a separated overlap.
rows=45;cols=97;vs=[]
for r in range(rows):
    t=max(0,(r-3)/(rows-4))
    for j in range(cols):
        u=j/(cols-1);a=-.80+u*(math.tau+.85)
        waist=radial_body(a,1.035,.17)+.016
        direction=Vector((math.cos(a),math.sin(a),0))
        top=Vector((direction.x*waist,.032+direction.y*waist,1.045))
        rx=.208+.029*smooth(t/.7);ry=.157+.016*t
        f=folds(a,t)*smooth(t/.35)
        target=Vector(((rx+f)*math.cos(a),.032+(ry+f)*math.sin(a),1.035-.90*t))
        blend=smooth(t/.22);p=top.lerp(target,blend);p.z=target.z
        if r<4:
            z,extra=[(1.050,.002),(1.057,.008),(1.049,.014),(1.035,.009)][r]
            p=top+direction*extra;p.z=z
        separation=.014*smooth((u-.84)/.16)
        p+=direction*separation
        p.z+=.008*t*t*math.sin(a+.4)-.016*t*t*smooth((u-.87)/.13)
        vs.append(p)
izar=make('Ihram_Izar',vs,rows,cols,lambda v,i:1 if i//cols<4 else 0)

# Rida: a diagonal supported upper edge, hanging past the waist instead of a belt.
for covered in [False,True]:
    rows=37;cols=97;vs=[]
    for r in range(rows):
        t=r/(rows-1)
        for j in range(cols):
            u=j/(cols-1);a=-.50+u*(math.tau+.70)
            c=math.cos(a);s=math.sin(a)
            if covered:
                top_z=1.43+.085*abs(c)+.015*max(0,s)
                rx=.190+.050*smooth(t/.23)+.025*t
                ry=.115+.040*smooth(t/.25)+.028*t
                z=top_z+(.83+.20*abs(c)+.035*c-.025*s-top_z)*t
            else:
                top_z=1.38+.125*c
                top_radius=radial_body(a,top_z,.17)+.012
                rx=(top_radius*(1-smooth(t/.23))+.224*smooth(t/.23))+.075*max(0,c)*smooth(t/.45)
                ry=top_radius*(1-smooth(t/.23))+.151*smooth(t/.23)+.025*t
                z=top_z+(.85+.155*c-.025*s-top_z)*t
            f=folds(a,t)*(.35+.65*t)
            # Shallow tension folds fan from the supporting left shoulder.
            tension=.0035*math.sin(19*(t-.12*s))*(1-t)*smooth(t/.12)
            layer=.017*smooth((u-.85)/.15)
            vs.append(Vector(((rx+f+tension+layer)*c,.032+(ry+f+tension+layer)*s,z)))
    # Supported edge is fitted to the real torso/shoulder, with continuous overlap.
    for j in range(cols):
        p=vs[j];hit,normal,_,distance=torso_tree.find_nearest(p)
        if hit is not None and distance<.10:
            delta=hit+normal*(.010+.017*smooth((j/(cols-1)-.85)/.15))-p
            for r in range(5):vs[r*cols+j]+=delta*(1-r/5)**2
    name='Ihram_Rida_'+('Covered' if covered else 'Tawaf')
    make(name,vs,rows,cols,lambda v,i:1 if i<cols else 0,upper=True,covered=covered,extras=[surfaces['Ihram_Izar']])

# Extend the existing body mask using the source calves retained by the gamis.
old_lower=bpy.data.objects.get('Skin_IhramBody')
if old_lower:bpy.data.objects.remove(old_lower,do_unlink=True)
legs=bpy.data.objects['Robe_LowerLegs'].copy();legs.data=legs.data.copy();legs.name='Skin_IhramBody_LowerLegs'
scene.collection.objects.link(legs)
bm=bmesh.new();bm.from_mesh(legs.data)
bmesh.ops.delete(bm,geom=[f for f in bm.faces if (canonical@f.calc_center_median()).z>.18],context='FACES')
bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
bm.to_mesh(legs.data);bm.free()
# Exposed torso/arms retain the original source UVs and skin atlas. The old mask
# replaced these with a flat material, leaving an artificial seam at the neck.
face_kd=KDTree(len(body.data.polygons))
for face in body.data.polygons:face_kd.insert(face.center,face.index)
face_kd.balance()
normal_kd=KDTree(len(body.data.vertices))
for v in body.data.vertices:normal_kd.insert(v.co,v.index)
normal_kd.balance()
for name in ['Skin_IhramBody_Torso','Skin_IhramBody_Arms']:
    obj=bpy.data.objects.get(name)
    if obj is None:continue
    obj.data=obj.data.copy()
    slots=list(bpy.data.objects['Skin_Feet'].data.materials)
    indices=[body.data.polygons[face_kd.find(p.center)[1]].material_index for p in obj.data.polygons]
    obj.data.materials.clear()
    for mat in slots:obj.data.materials.append(mat)
    for p,index in zip(obj.data.polygons,indices):p.material_index=index;p.use_smooth=True
    normals=[body.data.vertices[normal_kd.find(v.co)[1]].normal for v in obj.data.vertices]
    obj.data.normals_split_custom_set_from_vertices(normals)

# Apparel masks retain the original rig/weights, while omitting skin fully hidden
# by the cloth. Keep the bare right shoulder only in the reference arrangement.
def posed_center(obj,face):
    p=canonical@face.calc_center_median()
    indices=[normal_kd.find(v.co)[1] for v in face.verts]
    return sum((posed_body[i] for i in indices),Vector())/len(indices)

def filtered_copy(source,name,predicate):
    obj=source.copy();obj.data=source.data.copy();obj.name=name;scene.collection.objects.link(obj)
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.delete(bm,geom=[f for f in bm.faces if not predicate(posed_center(obj,f))],context='FACES')
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
    bm.to_mesh(obj.data);bm.free()
    return obj

arms=bpy.data.objects['Skin_IhramBody_Arms']
filtered_copy(arms,'Skin_IhramBody_RightArmTawaf',lambda p:p.x<-.13 and p.z>1.13)
# The legacy Arms object also contains the small exposed strip below the neck.
common=filtered_copy(arms,'New_Ihram_Forearms',lambda p:p.z<=1.13 or (p.z>1.44 and abs(p.x)<.14))
bpy.data.objects.remove(arms,do_unlink=True);common.name='Skin_IhramBody_Arms'
torso=bpy.data.objects['Skin_IhramBody_Torso']
filtered_copy(torso,'Skin_IhramBody_TorsoCovered',lambda p:p.z<1.22 or (p.z>1.44 and abs(p.x)<.14))
reference_torso=filtered_copy(torso,'New_Ihram_TorsoTawaf',lambda p:p.x<.17 or p.z<1.30)
bpy.data.objects.remove(torso,do_unlink=True);reference_torso.name='Skin_IhramBody_TorsoTawaf'
for obj in imported:bpy.data.objects.remove(obj,do_unlink=True)
for action in set(bpy.data.actions)-old_actions:bpy.data.actions.remove(action)
assert gamis_signature()==old_gamis,'The gamis must remain unchanged'
(OUT/'mesh-audit.json').write_text(json.dumps(audit,indent=2))
(OUT/'cloth-report.json').write_text(json.dumps(draper.report,indent=2))
(OUT/'preserved-gamis.json').write_text(json.dumps({'before':old_gamis,'after':gamis_signature()},indent=2))
rig.data.pose_position='POSE';idle=bpy.data.actions['idle'];rig.animation_data.action=idle;rig.animation_data.action_slot=idle.slots[0]
for t in rig.animation_data.nla_tracks:t.mute=True
scene.frame_set(0)
for obj in scene.objects:
    obj.select_set(False)
    if obj.type=='MESH':obj.hide_set(not obj.name.startswith(('Ihram_Izar','Ihram_Rida_Tawaf','Skin_','Sandal')))
    if obj.name=='Skin_IhramBody_TorsoCovered':obj.hide_set(True)
    if obj.type=='ARMATURE':obj.hide_set(True)
bpy.context.view_layer.objects.active=izar;izar.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'male-ihram.blend'))
rig.animation_data.action=None
for t in rig.animation_data.nla_tracks:t.mute=False
scene.frame_set(0)

def export(path,variant=None):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in scene.objects:
        obj.hide_set(False)
        include=variant is None or obj.type!='MESH' or obj.name.startswith(('Skin_','Sandal','Ihram_Izar')) or obj.name=='Ihram_Rida_'+variant
        if variant and obj.name.startswith('Skin_IhramBody'):
            if obj.name.endswith('Tawaf'):include=variant=='Tawaf'
            if obj.name.endswith('Covered'):include=variant=='Covered'
        obj.select_set(include)
    temp=path.with_name('.building-'+path.name)
    bpy.ops.export_scene.gltf(filepath=str(temp),export_format='GLB',use_selection=True,export_animations=True,export_image_format='JPEG',export_jpeg_quality=90,export_yup=True,export_extras=True)
    temp.replace(path)
export(OUT/'man.glb')
export(OUT/'man-ihram.glb','Tawaf')
export(OUT/'man-ihram-covered.glb','Covered')
print('IHRAM STAGED FOR REVIEW',OUT,flush=True)

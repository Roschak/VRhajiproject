"""Tailor the female reference outfit on the original Rocketbox skeleton.

Independent background build: sewn bodice/armholes, gathered sleeves and cuffs,
flared dress panels, and a gamis-only fitted scarf. Writes review artifacts first.
"""
import bpy, bmesh, math, json, hashlib, shutil, sys
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from pilgrim_cloth import Draper
IS_ABAYA=globals().get('GARMENT_MODE')=='abaya'
PREFIX='Abaya' if IS_ABAYA else 'Robe'
HEADWEAR='Khimar' if IS_ABAYA else 'Hijab_Gamis'
VARIANT='female-abaya-khimar' if IS_ABAYA else 'female-gamis-v2'
OUT=ROOT/'artifacts'/VARIANT
SOURCE=ROOT/('artifacts/female-gamis-v2/female-gamis-v2.blend' if IS_ABAYA else 'artifacts/female-gamis/before/pilgrim-woman.blend')
if not IS_ABAYA and not SOURCE.exists():SOURCE=ROOT/'artifacts/pilgrim-woman.blend'
OUTFIT='woman-abaya-khimar.glb' if IS_ABAYA else 'woman-gamis.glb'
ASSETS=ROOT/'src/VRHaji.Web/wwwroot/assets/characters'
OUT.mkdir(parents=True,exist_ok=True)
assert bpy.app.background, 'Build in a separate background process.'
backup=OUT/'before';backup.mkdir(exist_ok=True)
for p in [ASSETS/'woman.glb',ASSETS/'outfits'/OUTFIT,SOURCE]:
    if p.exists() and not (backup/p.name).exists():shutil.copy2(p,backup/p.name)
unchanged=[ASSETS/'man.glb']+[p for p in (ASSETS/'outfits').glob('*.glb') if p.name!=OUTFIT]
hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in unchanged}
(OUT/'preserved-assets.json').write_text(json.dumps(hashes,indent=2))
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene=bpy.context.scene
rig=next(o for o in scene.objects if o.type=='ARMATURE')
template=bpy.data.objects[PREFIX+'_Dress']
world=template.matrix_world.copy();parent_inverse=template.matrix_parent_inverse.copy()
turn=Matrix.Rotation(math.pi/2,4,'Z')
canonical=turn@world;local=canonical.inverted()
rig.animation_data.action=None
for t in rig.animation_data.nla_tracks:t.mute=True
rig.data.pose_position='REST';scene.frame_set(0);bpy.context.view_layer.update()
bone={b.name:turn@rig.matrix_world@b.head_local for b in rig.data.bones}
def signature():
    return hashlib.sha256(repr([(o.name,[tuple(v.co) for v in o.data.vertices],[[tuple((g.group,g.weight)) for g in v.groups] for v in o.data.vertices]) for o in sorted(scene.objects,key=lambda o:o.name) if o.type=='MESH' and not o.name.startswith((PREFIX,HEADWEAR))]).encode()).hexdigest()
before_signature=signature()
before=set(bpy.data.objects);actions=set(bpy.data.actions)
bpy.ops.import_scene.gltf(filepath=str(ASSETS/'source/rocketbox-woman.glb'))
imported=set(bpy.data.objects)-before
body=next(o for o in imported if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers))
source_rig=next(m.object for m in body.modifiers if m.type=='ARMATURE')
source_rig.animation_data.action=None
for t in source_rig.animation_data.nla_tracks:t.mute=True
source_rig.data.pose_position='REST';scene.frame_set(0);bpy.context.view_layer.update()
bc=turn@body.matrix_world
bodyv=[bc@v.co for v in body.data.vertices];bodyf=[tuple(p.vertices) for p in body.data.polygons]
tree=BVHTree.FromPolygons(bodyv,bodyf)
body_names={g.index:g.name for g in body.vertex_groups}
bodyw=[{body_names[g.group]:g.weight for g in v.groups if g.weight>0} for v in body.data.vertices]

def smooth(x):
    x=max(0.,min(1.,x));return x*x*(3-2*x)
def normalized(ws):
    ws=dict(sorted(((k,v) for k,v in ws.items() if v>1e-6),key=lambda kv:-kv[1])[:4]);total=sum(ws.values())
    return {k:v/total for k,v in ws.items()}
def torso_weight(v):
    z=v.z
    anchors=[(.99,'Bip01 Pelvis'),(1.115,'Bip01 Spine'),(1.24,'Bip01 Spine1'),(1.38,'Bip01 Spine2'),(1.55,'Bip01 Neck')]
    if z>=1.55:return {'Bip01 Neck':1.}
    if z>=.99:
        for (a,na),(b,nb) in zip(anchors,anchors[1:]):
            if a<=z<=b:
                t=smooth((z-a)/(b-a));return {na:1-t,nb:t}
    motion=.82*smooth((.99-z)/.46)
    left=smooth(.5+v.x/.32)
    calf=.55*smooth((.67-z)/.50)
    return {'Bip01 Pelvis':1-motion,'Bip01 L Thigh':motion*left*(1-calf),
            'Bip01 R Thigh':motion*(1-left)*(1-calf),'Bip01 L Calf':motion*left*calf,
            'Bip01 R Calf':motion*(1-left)*calf}
def sleeve_weight(side,t):
    if t<.42:return {f'Bip01 {side} UpperArm':1.}
    if t<.60:
        q=smooth((t-.42)/.18);return {f'Bip01 {side} UpperArm':1-q,f'Bip01 {side} Forearm':q}
    return {f'Bip01 {side} Forearm':1.}

# The upper rows describe a shoulder yoke, then measured chest/waist ease. Two
# side openings are reserved for stitched sleeve caps; lower rows are dress panels.
profiles=[(1.55,.064,.065,.062,.026),(1.541,.070,.069,.066,.026),
          (1.523,.102,.086,.080,.025),(1.500,.145,.099,.091,.023),
          (1.480,.175,.111,.099,.020),(1.455,.195,.125,.110,.016),
          (1.425,.208,.147,.121,.013),(1.395,.214,.171,.130,.010),
          (1.360,.213,.187,.137,.008),(1.325,.207,.190,.139,.006),
          (1.290,.202,.181,.140,.004),(1.255,.199,.173,.140,.002),
          (1.220,.199,.168,.141,.000),(1.185,.199,.165,.142,-.001),
          (1.150,.200,.163,.143,-.002),(1.115,.201,.161,.145,-.003)]
if IS_ABAYA:
    profiles=[(z,rx+(.011 if z<1.4 else 0),rf+(.008 if z<1.4 else 0),rb+(.009 if z<1.4 else 0),cy) for z,rx,rf,rb,cy in profiles]
for j in range(1,53):
    t=j/52
    if IS_ABAYA:profiles.append((1.115-1.05*t,.212+.160*t**.94,.169+.093*t**.95,.154+.098*t**.95,-.003))
    else:profiles.append((1.115-1.058*t,.201+.199*t**.92,.161+.101*t**.95,.145+.103*t**.95,-.003))
COLS=64
vs=[];fs=[];ws=[];pin=[];tags=[]
def fold(a,z):
    # Unequal seam allowances hanging from different chest/shoulder supports.
    value=0.
    for center,width,amp,start,lean in [(-2.88,.16,.017,1.37,.045),(-2.35,.21,.024,1.42,-.045),(-1.86,.16,.022,1.30,.03),(-1.25,.20,.026,1.36,-.028),(-.67,.18,.022,1.40,.04),(-.18,.14,.015,1.34,-.025),(.40,.20,.023,1.34,.05),(1.0,.18,.021,1.30,-.04),(1.63,.24,.027,1.37,.035),(2.3,.18,.022,1.42,-.04),(2.82,.16,.019,1.34,.03)]:
        d=(a-center-lean*(1.15-z)+math.pi)%math.tau-math.pi
        q=d/width
        fall=smooth((start-z)/.55)
        value+=amp*fall*(math.exp(-q*q)-.58*math.exp(-((q-1.45)/.80)**2))
    return value
for row,(z,rx,rf,rb,cy) in enumerate(profiles):
    for j in range(COLS):
        a=j/COLS*math.tau
        f=fold(a,z)
        v=Vector(((rx+f)*math.cos(a),cy+((rf if math.sin(a)<0 else rb)+f)*math.sin(a),z))
        v.z+=.003*smooth((.25-z)/.2)*(math.sin(3*a+.3)+.45*math.sin(7*a-.4))
        vs.append(v);ws.append(torso_weight(v));pin.append(1. if row<4 else 0.);tags.append('bodice' if z>1.1 else 'skirt')
TOP,BOTTOM,HALF=3,10,6
def in_armhole(j):
    return j<HALF or j>=COLS-HALF or COLS//2-HALF<=j<COLS//2+HALF
for r in range(len(profiles)-1):
    for j in range(COLS):
        if TOP<=r<BOTTOM and in_armhole(j):continue
        k=(j+1)%COLS;fs.append((r*COLS+j,(r+1)*COLS+j,(r+1)*COLS+k,r*COLS+k))

# Sew each sleeve to the actual opening. Explicit arc-length binding follows
# the arm joints and keeps the wrist opening at the hand in all animations.
for side,sign,mid in [('L',1,0),('R',-1,COLS//2)]:
    idx=lambda r,j:r*COLS+(j%COLS)
    loop=[idx(TOP,j) for j in range(mid-HALF,mid+HALF+1)]
    loop += [idx(r,mid+HALF) for r in range(TOP+1,BOTTOM+1)]
    loop += [idx(BOTTOM,j) for j in range(mid+HALF-1,mid-HALF-1,-1)]
    loop += [idx(r,mid-HALF) for r in range(BOTTOM-1,TOP,-1)]
    shoulder=bone[f'Bip01 {side} UpperArm'];elbow=bone[f'Bip01 {side} Forearm'];wrist=bone[f'Bip01 {side} Hand']
    axis=(elbow-shoulder).normalized();ey=Vector((0,1,0));ex=ey.cross(axis).normalized();ey=axis.cross(ex).normalized()
    center=sum((vs[i] for i in loop),Vector())/len(loop)
    angles=[math.atan2((vs[i]-center).dot(ey),(vs[i]-center).dot(ex)) for i in loop]
    for i in loop:
        upper=smooth((vs[i].z-1.29)/.19)
        amount=.55+.4*upper
        w={k:v*(1-amount) for k,v in ws[i].items()};w[f'Bip01 {side} UpperArm']=amount;ws[i]=normalized(w)
        pin[i]=max(pin[i],.7*upper)
    prior=loop
    for r in range(1,39):
        t=r/38
        # Long full sleeve, a gathered section, and a narrow 48 mm cuff.
        if t<=.5:c=shoulder.lerp(elbow,t*2);axis=(elbow-shoulder).normalized()
        else:c=elbow.lerp(wrist,(t-.5)*2);axis=(wrist-elbow).normalized()
        ex=Vector((0,1,0)).cross(axis).normalized();ey=axis.cross(ex).normalized()
        radius=(.073 if IS_ABAYA else .070)+.006*math.sin(t*math.pi)
        radius-=.033*smooth((t-.80)/.105)
        cuff_start=.96 if IS_ABAYA else .905
        cuff=t>cuff_start
        if cuff:radius=.039-.0015*smooth((t-cuff_start)/(1-cuff_start))
        ring=[]
        for j,a in enumerate(angles):
            gather=.005*math.exp(-((t-.855)/.065)**2)*(math.sin(7*a+.3)+.35*math.sin(11*a-.7))
            elbow_fold=.0035*math.exp(-((t-.53)/.15)**2)*math.sin(37*t+1.6*math.cos(a))
            longitudinal=.0025*math.sin(3*a+.25*t)*math.sin(math.pi*t)
            rr=radius+(0 if cuff else gather+elbow_fold+longitudinal)
            p=c+ex*math.cos(a)*rr+ey*math.sin(a)*rr
            transition=smooth(t/.14)
            p=vs[loop[j]].lerp(p,transition)
            ring.append(len(vs));vs.append(p);ws.append(sleeve_weight(side,t));pin.append(1. if cuff else .75*smooth((t-.80)/.1));tags.append('cuff' if cuff else 'sleeve')
        for j in range(len(ring)):
            k=(j+1)%len(ring);fs.append((prior[j],prior[k],ring[k],ring[j]))
        prior=ring

# Remove the unused grid vertices inside the two armholes and keep one surface.
used=sorted({i for f in fs for i in f});remap={old:new for new,old in enumerate(used)}
vs=[vs[i] for i in used];ws=[normalized(ws[i]) for i in used];pin=[pin[i] for i in used];tags=[tags[i] for i in used]
fs=[tuple(remap[i] for i in f) for f in fs]
bm=bmesh.new()
verts=[bm.verts.new(v) for v in vs]
for f in fs:bm.faces.new([verts[i] for i in f])
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.verts.index_update()
fs=[tuple(v.index for v in f.verts) for f in bm.faces];bm.free()
print('TAILORED PATTERN',len(vs),'vertices',len(fs),'faces',flush=True)
draper=Draper(bodyv,bodyf,OUT/'cloth-cache')
solved=draper.settle('Female_Abaya_Sewn_Panels_v1' if IS_ABAYA else 'Female_Gamis_Sewn_Panels_v2',vs,fs,lambda v,i:pin[i],frames=36)
final=[]
for i,(a,b) in enumerate(zip(vs,solved)):
    # Preserve the reference's pattern fullness after gravity; solver wrinkles
    # supplement the panel allowances rather than erasing the flared silhouette.
    blend=.38 if tags[i]=='skirt' else (.35 if tags[i]=='sleeve' else .55)
    if tags[i]=='cuff':blend=.2
    p=a.lerp(b,blend)
    if tags[i] in ('bodice','sleeve'):
        q,n,_,d=tree.find_nearest(p)
        signed=(p-q).dot(n)
        if d<.055 and signed<.008:p+=n*(.008-signed)
    final.append(p)

cloth=bpy.data.materials['Cloth_White'].copy();cloth.name='Female_'+('Abaya' if IS_ABAYA else 'Gamis')+'_Ivory_Woven'
shader=next(n for n in cloth.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
shader.inputs['Base Color'].default_value=(.91,.905,.89,1)
shader.inputs['Roughness'].default_value=.78;shader.inputs['Sheen Weight'].default_value=.26
for n in cloth.node_tree.nodes:
    if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=.085
trim=cloth.copy();trim.name=PREFIX+'_Cuff_and_Hem'
next(n for n in trim.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Roughness'].default_value=.81
collection=bpy.data.collections.new('HAJJ_FEMALE_ABAYA' if IS_ABAYA else 'HAJJ_FEMALE_GAMIS');scene.collection.children.link(collection)
for o in list(scene.objects):
    if o.name.startswith((PREFIX,HEADWEAR)):bpy.data.objects.remove(o,do_unlink=True)

def make(name,points,faces,weights,thickness=.0009,subdiv=1,materials=None):
    data=bpy.data.meshes.new(name);data.from_pydata([local@p for p in points],[],faces);data.update()
    obj=bpy.data.objects.new(name,data);collection.objects.link(obj)
    obj.parent=rig;obj.matrix_parent_inverse=parent_inverse.copy();obj.matrix_world=world.copy()
    for m in (materials or [cloth]):data.materials.append(m)
    for p in data.polygons:p.use_smooth=True
    uv=data.uv_layers.new(name='FabricUV')
    for polygon in data.polygons:
        for li in polygon.loop_indices:
            p=points[data.loops[li].vertex_index];uv.data[li].uv=(p.x*6,p.z*6+p.y*.6)
    for name in rig.data.bones.keys():obj.vertex_groups.new(name=name)
    for i,w in enumerate(weights):
        for name,weight in normalized(w).items():obj.vertex_groups[name].add([i],weight,'REPLACE')
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    if subdiv:
        mod=obj.modifiers.new('Sewn panel curvature','SUBSURF');mod.levels=subdiv
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=obj.modifiers.new('Runtime cloth mesh budget','DECIMATE');mod.ratio=.52
        bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=obj.modifiers.new('Fabric thickness','SOLIDIFY');mod.thickness=thickness;mod.offset=0.
    bpy.ops.object.modifier_apply(modifier=mod.name)
    arm=obj.modifiers.new('Original Rocketbox skeleton','ARMATURE');arm.object=rig
    return obj

dress=make(PREFIX+'_Dress',final,fs,ws,subdiv=1,materials=[cloth,trim])
# Re-evaluate the smooth skirt weights after reduction, so export does not pick
# different fifth influences on adjacent triangles around the moving hem.
for vertex in dress.data.vertices:
    p=canonical@vertex.co
    if p.z<.99:
        for group_index in [g.group for g in vertex.groups]:dress.vertex_groups[group_index].remove([vertex.index])
        for name,value in normalized(torso_weight(p)).items():dress.vertex_groups[name].add([vertex.index],value,'REPLACE')
dress['construction']='Sewn shoulder yoke, connected armholes, full gathered sleeves, cuffs and flared panels'
dress['cloth_simulation_frames']=36
# The material band is subtle; its geometric gather is modelled into the sleeve.
for p in dress.data.polygons:
    c=sum((canonical@dress.data.vertices[i].co for i in p.vertices),Vector())/len(p.vertices)
    if c.z<.075 or any((c-bone[f'Bip01 {s} Hand']).length<.057 for s in ['L','R']):p.material_index=1

# The original wardrobe only keeps feet below 225 mm. A modest white underlayer
# reconstructed from the same source legs prevents detached ankle stubs when a
# fast stride lifts the dress. It is fully hidden in the reference standing pose.
lining_faces=[f for f in bodyf if .225<=sum(bodyv[i].z for i in f)/len(f)<.72]
lining_used=sorted({i for f in lining_faces for i in f})
lining_remap={old:new for new,old in enumerate(lining_used)}
lining=make(PREFIX+'_Lining_Legs',[bodyv[i] for i in lining_used],
            [tuple(lining_remap[i] for i in f) for f in lining_faces],
            [bodyw[i] for i in lining_used],thickness=.0006,subdiv=0)
lining['construction']='White underlayer on the original lower-leg geometry; visible only below a lifted hem'

# A dedicated scarf accompanies the gamis. The tunic's existing Hijab and the
# abaya's Khimar remain intact; the runtime selects this scarf only with Robe.
scarf=cloth.copy();scarf.name='Female_Khimar_Soft_White' if IS_ABAYA else 'Female_Gamis_Soft_White_Scarf'
sh=next(n for n in scarf.node_tree.nodes if n.type=='BSDF_PRINCIPLED');sh.inputs['Roughness'].default_value=.74;sh.inputs['Sheen Weight'].default_value=.30
# Pose the dress/body, then model the shoulder wrap in the lowered-arm pose.
rig.data.pose_position='POSE'
idle=bpy.data.actions['idle'];rig.animation_data.action=idle
if idle.slots:rig.animation_data.action_slot=idle.slots[0]
scene.frame_set(0);bpy.context.view_layer.update()
basis=turn@rig.matrix_world
matrices={b.name:basis@b.matrix@b.bone.matrix_local.inverted()@basis.inverted() for b in rig.pose.bones}
def skin(w):
    m=Matrix(((0,0,0,0),)*4)
    for name,value in normalized(w).items():m+=matrices[name]*value
    return m
posed_dress=[skin(w)@p for p,w in zip(final,ws)]
dress_tree=BVHTree.FromPolygons(posed_dress,fs)
scarf_collision=[]
for p in bodyv:
    q=p.copy()
    if p.z>1.59 and p.y>.018:
        center=Vector((0,.018,1.674));delta=p-center
        ellipsoid=Vector((delta.x/.094,delta.y/.108,delta.z/.126))
        if ellipsoid.length>0:
            ellipsoid.normalize()
            target=center+Vector((ellipsoid.x*.094,ellipsoid.y*.108,ellipsoid.z*.126))
            q=p.lerp(target,smooth((p.z-1.59)/.045)*smooth((p.y-.018)/.025))
    scarf_collision.append(q)
posed_body=[skin(w)@p for p,w in zip(scarf_collision,bodyw)]
posed_tree=BVHTree.FromPolygons(posed_body,bodyf)
cv=[];cf=[];cw=[];posed_wrap=[];scarf_pins=[];N=96;R=49
def catmull(points,t):
    q=t*(len(points)-1);i=min(int(q),len(points)-2);u=q-i
    p0=points[max(0,i-1)];p1=points[i];p2=points[i+1];p3=points[min(len(points)-1,i+2)]
    return .5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u)
for r in range(R):
    t=r/(R-1)
    for j in range(N):
        a=j/N*math.tau;s=math.sin(a);c=math.cos(a);back=max(0,c);front=max(0,-c)
        start=.76-.39*back*back
        # A single annular cloth panel: face oval -> crown/temple -> neck ->
        # shoulder hem. The forehead path passes over the crown to the back.
        controls=[Vector((.104*math.sin(start)*s,.020-.126*math.cos(start),1.668+.141*math.sin(start)*c)),
                  Vector((.106*s,.015-.095*front**1.5,1.656+.148*back-.087*front)),
                  Vector((.108*s,.026+.104*back-.120*front,1.630+.104*back-.085*front)),
                  Vector((.090*s,.026+.090*back-.155*front,1.570+.025*back-.075*front)),
                  Vector((.232*s,.026+.168*back-.214*front,1.442-.075*front**1.8-.190*back**2.4))]
        if IS_ABAYA:
            controls[1]=Vector((.108*s,.015-.105*front**1.5,1.656+.148*back-.118*front))
            controls[2]=Vector((.192*s,.026+.120*back-.198*front,1.480+.255*back-.120*front+.040*s*s))
            controls[3]=Vector((.260*s,.026+.170*back-.230*front,1.300+.145*back-.170*front))
            controls[4]=Vector((.327*s,.026+.210*back-.255*front,1.115-.255*front**1.8-.305*back**1.8))
        rest=catmull(controls,t)
        folds=.006*math.sin((t-.57)*math.pi*12+.55*s)*smooth((t-.50)/.20)*(1-.45*abs(s))
        if IS_ABAYA:
            folds=0.
            for center,width,amp,lean in [(.25,.15,.012,.06),(.80,.17,.016,-.03),(1.42,.16,.010,.04),(2.18,.21,.019,-.06),(2.73,.18,.021,.025),(3.35,.19,.019,-.04),(3.96,.17,.017,.05),(4.65,.14,.011,-.04),(5.35,.21,.017,.04),(5.9,.15,.012,-.03)]:
                d=(a-center-lean*t+math.pi)%math.tau-math.pi
                folds+=amp*(math.exp(-(d/width)**2)-.45*math.exp(-((d-width*1.3)/(width*.8))**2))*smooth((t-.25)/.65)
        rest+=Vector((s*folds,c*folds,.25*folds))
        head_amount=1-smooth((t-.47)/.38)
        neck_amount=(1-head_amount)*(1-smooth((t-.76)/.24))*.7
        w=normalized({'Bip01 Head':head_amount,'Bip01 Neck':neck_amount,'Bip01 Spine2':1-head_amount-neck_amount})
        if IS_ABAYA:
            head_amount=1-smooth((t-.22)/.36)
            w={k:v*(1-head_amount) for k,v in torso_weight(rest).items()}
            w['Bip01 Head']=head_amount
            w=normalized(w)
        p=skin(w)@rest
        if IS_ABAYA:
            arm_amount=.60*smooth((abs(rest.x)-.17)/.13)*smooth((rest.z-.93)/.25)*(1-smooth((rest.z-1.40)/.12))
            side='L' if rest.x>=0 else 'R'
            w={k:v*(1-arm_amount) for k,v in w.items()};w[f'Bip01 {side} UpperArm']=arm_amount
            w=normalized(w)
        for surface in [posed_tree,dress_tree]:
            q,n,_,d=surface.find_nearest(p)
            if d<.05 and (p-q).dot(n)<.007:p+=n*(.007-(p-q).dot(n))
        posed_wrap.append(p);cw.append(w)
        scarf_pins.append(1. if r<2 else .96*(1-smooth((t-(.23 if IS_ABAYA else .40))/(.25 if IS_ABAYA else .28))))
for r in range(R-1):
    for j in range(N):
        k=(j+1)%N;cf.append((r*N+j,r*N+k,(r+1)*N+k,(r+1)*N+j))
scarf_draper=Draper(posed_body,bodyf,OUT/'cloth-cache')
scarf_frames=36 if IS_ABAYA else 28
settled_wrap=scarf_draper.settle('Khimar_Continuous_v1' if IS_ABAYA else 'Hijab_Gamis_Continuous_v2',posed_wrap,cf,lambda v,i:scarf_pins[i],extras=[(posed_dress,fs)],frames=scarf_frames,solver={'self_distance_min':.0013,'distance_min':.002,'bending_stiffness':.35})
draper.report.extend(scarf_draper.report)
refined_wrap=[]
for i,(original,settled,w) in enumerate(zip(posed_wrap,settled_wrap,cw)):
    blend=.18+.52*smooth((i//N/(R-1)-.45)/.40)
    refined_wrap.append(original.lerp(settled,blend))
for _ in range(4):
    previous=[v.copy() for v in refined_wrap]
    for r in range(1,R):
        for j in range(N):
            i=r*N+j;neighbors=[r*N+(j-1)%N,r*N+(j+1)%N,(r-1)*N+j]
            if r<R-1:neighbors.append((r+1)*N+j)
            average=sum((previous[k] for k in neighbors),Vector())/len(neighbors)
            refined_wrap[i]=previous[i].lerp(average,.28)
if IS_ABAYA:
    # Resolve against the actual subdivided gown, not only its simulation cage.
    gown_weights=[normalized({dress.vertex_groups[g.group].name:g.weight for g in v.groups}) for v in dress.data.vertices]
    gown_points=[skin(w)@(canonical@v.co) for v,w in zip(dress.data.vertices,gown_weights)]
    # Solidify's second shell has inward normals; exclude it from collision.
    gown_faces=[tuple(f.vertices) for f in dress.data.polygons if all(k<len(gown_points)//2 for k in f.vertices)]
    gown_tree=BVHTree.FromPolygons(gown_points,gown_faces)
    for i,p in enumerate(refined_wrap):
        t=i//N/(R-1);a=(i%N)/N*math.tau
        if t<.30:continue
        q,n,face,d=gown_tree.find_nearest(p)
        if d<.10 and (p-q).dot(n)<.022:
            p+=n*(.022-(p-q).dot(n))
        # The cloth resting over a sleeve inherits that sleeve's motion, while
        # the front and back panels continue to hang from the torso.
        amount=smooth((abs(math.sin(a))-.48)/.38)*smooth((t-.34)/.22)*(1-smooth((p.z-1.40)/.12))
        if amount:
            near={}
            ids=gown_faces[face]
            factors=[1/max((gown_points[k]-q).length,.001)**2 for k in ids]
            for k,factor in zip(ids,factors):
                for name,value in gown_weights[k].items():near[name]=near.get(name,0)+value*factor/sum(factors)
            w={name:value*(1-amount) for name,value in cw[i].items()}
            for name,value in near.items():w[name]=w.get(name,0)+value*amount
            cw[i]=normalized(w)
    # Relax local collision bumps into the surrounding cloth while retaining
    # clearance from the sleeve and the sewn face opening.
    for _ in range(8):
        previous=[p.copy() for p in refined_wrap]
        for r in range(2,R-1):
            for j in range(N):
                i=r*N+j
                near=[r*N+(j-1)%N,r*N+(j+1)%N,(r-1)*N+j,(r+1)*N+j]
                p=previous[i].lerp(sum((previous[k] for k in near),Vector())/4,.35)
                if r/(R-1)>.30:
                    q,n,_,d=gown_tree.find_nearest(p)
                    if d<.10 and (p-q).dot(n)<.018:p+=n*(.018-(p-q).dot(n))
                refined_wrap[i]=p
    for i,p in enumerate(refined_wrap):
        if i//N/(R-1)>.52:continue
        q,n,_,d=posed_tree.find_nearest(p)
        if d<.045 and (p-q).dot(n)<.006:p+=n*(.006-(p-q).dot(n))
    # Smooth skin fields across the panel, including the shoulder transition.
    for _ in range(16):
        prior=[dict(w) for w in cw]
        for r in range(2,R):
            for j in range(N):
                i=r*N+j;near=[r*N+(j-1)%N,r*N+(j+1)%N,(r-1)*N+j]
                if r<R-1:near.append((r+1)*N+j)
                w={k:v*.5 for k,v in prior[i].items()}
                for k in near:
                    for name,value in prior[k].items():w[name]=w.get(name,0)+value*.5/len(near)
                cw[i]=normalized(w)
    for i,p in enumerate(refined_wrap):
        head=smooth((p.z-1.56)/.09)
        if head:
            w={k:v*(1-head) for k,v in cw[i].items()}
            w['Bip01 Head']=w.get('Bip01 Head',0)+head
            cw[i]=normalized(w)
for p,w in zip(refined_wrap,cw):cv.append(skin(w).inverted()@p)
wrap=make(HEADWEAR+'_Drape',cv,cf,cw,subdiv=0,thickness=.0007,materials=[scarf])
if IS_ABAYA:
    khimar_collection=bpy.data.collections.new('HAJJ_FEMALE_KHIMAR');scene.collection.children.link(khimar_collection)
    collection.objects.unlink(wrap);khimar_collection.objects.link(wrap)
wrap['construction']='Continuous face-to-hem cloth, simulated in idle pose against body and gown'

# Make Blender's preview and GLB's four-influence limit agree after subdivision
# and reduction; inspect actual closed shells rather than relying on names.
audit={}
for obj in [dress,wrap]:
    for vertex in obj.data.vertices:
        weights={obj.vertex_groups[g.group].name:g.weight for g in vertex.groups}
        group_indices=[g.group for g in vertex.groups]
        for group_index in group_indices:obj.vertex_groups[group_index].remove([vertex.index])
        for name,value in normalized(weights).items():obj.vertex_groups[name].add([vertex.index],value,'REPLACE')
    bm=bmesh.new();bm.from_mesh(obj.data)
    bad=sum(not e.is_manifold for e in bm.edges)
    loose=sum(not v.link_faces for v in bm.verts)
    audit[obj.name]={'vertices':len(bm.verts),'faces':len(bm.faces),'non_manifold_edges':bad,'loose_vertices':loose,'maximum_influences':max(len(v.groups) for v in obj.data.vertices)}
    bm.free()
    assert bad==0 and loose==0, f'Invalid cloth shell: {obj.name}: {audit[obj.name]}'
(OUT/'mesh-audit.json').write_text(json.dumps(audit,indent=2))

# Remove imported fitting helpers, retain original character, skin and all clips.
for o in imported:bpy.data.objects.remove(o,do_unlink=True)
for a in set(bpy.data.actions)-actions:bpy.data.actions.remove(a)
assert signature()==before_signature,'Original skin or unrelated wardrobe was altered'
(OUT/'preserved-meshes.json').write_text(json.dumps({'before':before_signature,'after':signature()},indent=2))
(OUT/'cloth-report.json').write_text(json.dumps(draper.report,indent=2))
(OUT/'construction.json').write_text(json.dumps({'pattern_vertices':len(vs),'pattern_faces':len(fs),'dress_vertices':len(dress.data.vertices),'dress_faces':len(dress.data.polygons),'source_body':'rocketbox-woman.glb','scarf_method':f'Continuous head-to-hem cloth, {scarf_frames}-frame idle-pose simulation with a smooth scalp collision proxy','body_bounds':[[min(v[i] for v in bodyv),max(v[i] for v in bodyv)] for i in range(3)],'bones':{k:list(v) for k,v in bone.items() if k in ['Bip01 Neck','Bip01 L UpperArm','Bip01 L Forearm','Bip01 L Hand']}},indent=2))

def is_gamis(o):return o.name.startswith((PREFIX,HEADWEAR,'Skin_Head','Skin_Hands','Skin_Feet','Sandal'))
rig.animation_data.action=idle
if idle.slots:rig.animation_data.action_slot=idle.slots[0]
scene.frame_set(0)
for obj in scene.objects:
    obj.select_set(False)
    if obj.type=='MESH':obj.hide_set(not is_gamis(obj))
    elif obj.type=='ARMATURE':obj.hide_set(True)
bpy.context.view_layer.objects.active=dress;dress.hide_set(False);dress.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(VARIANT+'.blend')))
rig.animation_data.action=None
for track in rig.animation_data.nla_tracks:track.mute=False
scene.frame_set(0)
def export(path,standalone):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in scene.objects:
        obj.hide_set(False);obj.select_set(obj.type!='MESH' or not standalone or is_gamis(obj))
    tmp=path.with_name('.building-'+path.name)
    bpy.ops.export_scene.gltf(filepath=str(tmp),export_format='GLB',use_selection=True,export_animations=True,export_image_format='JPEG',export_jpeg_quality=90,export_yup=True,export_extras=True)
    tmp.replace(path)
export(OUT/'woman.glb',False)
export(OUT/OUTFIT,True)
print('REFERENCE OUTFIT READY',OUT,flush=True)

"""Build the white, skinned pilgrimage wardrobe on MIT Microsoft Rocketbox humans.
Run in an isolated Blender process; never replace the user's open Blender scene.
"""
import bpy,bmesh,math,sys,json
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from pilgrim_cloth import Draper
ASSETS=ROOT/'src/VRHaji.Web/wwwroot/assets/characters'
gender=sys.argv[-1] if sys.argv[-1] in ['man','woman'] else 'man'
if not bpy.app.background: raise RuntimeError('Use background Blender; do not clear the live user scene.')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.render.fps=24  # Keep import/export timing consistent with the existing rig pipeline.
bpy.ops.import_scene.gltf(filepath=str(ASSETS/'source'/f'rocketbox-{gender}.glb'))
bpy.context.view_layer.update()
body=next(o for o in bpy.context.scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers))
rig=next(m.object for m in body.modifiers if m.type=='ARMATURE')
rig.animation_data.action=None
rig.data.pose_position='REST'
bpy.context.view_layer.update()
# Canonical modelling space: X left/right, -Y face, Z up.
turn=Matrix.Rotation(math.pi/2,4,'Z')
to_canonical=turn@body.matrix_world
to_local=to_canonical.inverted()
height_offset=.065 if gender=='woman' else 0
def pt(x,y,z): return Vector((x,y,z+height_offset))
draper=Draper([to_canonical@v.co for v in body.data.vertices],
              [tuple(p.vertices) for p in body.data.polygons],
              ROOT/'artifacts'/'cloth-cache'/gender)
def material(name,color,roughness=.82):
 m=bpy.data.materials.new(name);m.use_nodes=True
 s=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 s.inputs['Base Color'].default_value=(*color,1);s.inputs['Roughness'].default_value=roughness
 return m
cloth=material('Cloth_White',(.92,.915,.90));seam=material('Cloth_Seam',(.80,.795,.78));hair=material('Hair_Black',(.012,.009,.007))
terry=material('Cloth_Ihram_Cotton',(.93,.925,.91),.94)
# Portable woven normal maps are embedded in GLB instead of relying on Blender-only nodes.
from array import array
for mat,strength in [(cloth,.13),(terry,.25)]:
 image=bpy.data.images.new(mat.name+'_Weave',width=256,height=256)
 image.colorspace_settings.name='Non-Color'
 pixels=array('f')
 for y in range(256):
  for x in range(256):
   nx=.11*math.sin(x*math.pi/2)*(.65+.35*math.cos(y*math.pi/2))
   ny=.11*math.sin(y*math.pi/2)*(.65+.35*math.cos(x*math.pi/2))
   pixels.extend((.5+nx,.5+ny,1,1))
 image.pixels.foreach_set(pixels);image.pack()
 nodes=mat.node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=image
 normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=strength
 shader=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
 mat.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);mat.node_tree.links.new(normal.outputs['Normal'],shader.inputs['Normal'])
skin=material('Skin_Scalp',(.72,.47,.29));solemat=material('Sandal',(.11,.075,.045))
for m in body.data.materials:
 m.name='Skin_'+m.name
 for n in m.node_tree.nodes:
  if n.type=='TEX_IMAGE' and n.image and max(n.image.size)>1024:n.image.scale(1024,1024)
def weight(v):
 x,y,z=v;z-=height_offset
 anchors=[(.94,'Bip01 Pelvis'),(1.08,'Bip01 Spine'),(1.21,'Bip01 Spine1'),(1.37,'Bip01 Spine2'),(1.55,'Bip01 Neck')]
 if z>=1.55:return {'Bip01 Neck':1}
 if z>=.94:
  for (a,bone_a),(b,bone_b) in zip(anchors,anchors[1:]):
   if a<=z<=b:
    t=(z-a)/(b-a);return {bone_a:1-t,bone_b:t}
 amount=min(.72,max(0,(.94-z)/.6))
 left=max(0,min(1,.5+x/0.22))
 calf=max(0,min(.65,(.5-z)/.5))
 return {'Bip01 Pelvis':1-amount,'Bip01 L Thigh':amount*left*(1-calf),'Bip01 R Thigh':amount*(1-left)*(1-calf),'Bip01 L Calf':amount*left*calf,'Bip01 R Calf':amount*(1-left)*calf}

shoulder_segments={side:[turn@rig.matrix_world@rig.data.bones[f'Bip01 {side} '+part].head_local for part in ['UpperArm','Forearm']] for side in ['L','R']}
def garment_weight(v,i=0):
 # A cape draped in the source A-pose must follow the upper arm near its
 # shoulders. Spine-only weights leave a floating wing when the arms lower.
 base=weight(v)
 if v.z-height_offset<1.10:return base
 side='L' if v.x>=0 else 'R';a,b=shoulder_segments[side]
 along=max(0,min(1,(v-a).dot(b-a)/(b-a).length_squared))
 distance=(v-a.lerp(b,along)).length
 def smooth(t):
  t=max(0,min(1,t));return t*t*(3-2*t)
 amount=.92*smooth((.19-distance)/.13)*smooth((abs(v.x)-(abs(a.x)-.02))/.13)
 result={name:w*(1-amount) for name,w in base.items()}
 result[f'Bip01 {side} UpperArm']=amount
 return result
simulation_surfaces={}
simulation_weights={}
def mesh(name,vertices,faces,mat=cloth,weights=None,subdiv=1):
 simulation_surfaces[name]=([Vector(v) for v in vertices],faces)
 simulation_weights[name]=[(weights(v,i) if weights else weight(v)) for i,v in enumerate(vertices)]
 data=bpy.data.meshes.new(name);data.from_pydata([to_local@Vector(v) for v in vertices],[],faces);data.update()
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
 obj.matrix_world=body.matrix_world.copy();obj.parent=rig;obj.matrix_parent_inverse=rig.matrix_world.inverted()
 # Parenting must preserve the original body transform, including its coordinate basis.
 obj.matrix_world=body.matrix_world.copy();data.materials.append(mat)
 uv=data.uv_layers.new(name='FabricUV')
 for polygon in data.polygons:
  for li in polygon.loop_indices:
   v=Vector(vertices[data.loops[li].vertex_index])
   uv.data[li].uv=(math.atan2(v.y-.015,v.x)/math.tau*6,v.z*6)
 groups={b.name:obj.vertex_groups.new(name=b.name) for b in rig.data.bones}
 for i,v in enumerate(vertices):
  for bone_name,w in simulation_weights[name][i].items():
   if w>0:groups[bone_name].add([i],w,'REPLACE')
 for p in data.polygons:p.use_smooth=True
 arm=obj.modifiers.new('Pilgrim rig','ARMATURE');arm.object=rig
 if subdiv:
  sub=obj.modifiers.new('Soft fabric surface','SUBSURF');sub.levels=subdiv
  bpy.context.view_layer.objects.active=obj;obj.select_set(True)
  # Evaluate subdivision before the rig, preserving interpolated skin weights.
  bpy.ops.object.modifier_move_up(modifier=sub.name)
  bpy.ops.object.modifier_apply(modifier=sub.name);obj.select_set(False)
 return obj
def loft(name,profiles,fold=.006,mat=cloth,weights=None,closed=True,hem_shape=0):
 # Profiles: z, radius X, radius Y, centre Y. Gentle irregular folds avoid rigid cones.
 verts=[];faces=[];segments=64
 for row,(z,rx,ry,cy) in enumerate(profiles):
  for j in range(segments+(0 if closed else 1)):
   a=j/segments*(math.tau+(0 if closed else .28))
   fall=max(.12,min(1,(1.48-z)/.85))
   f=fold*(math.sin(11*a+.2*math.sin(z*5+a))+.38*math.sin(19*a+z*.8)+.22*math.sin(5*a-z*3))*fall
   bottom=max(0,(row/(len(profiles)-1)-.7)/.3)
   zz=z+hem_shape*bottom*(.45+.55*math.sin(a))+.003*bottom*math.cos(9*a)
   verts.append(pt((rx+f)*math.cos(a),cy+(ry+f)*math.sin(a),zz))
 cols=segments+(0 if closed else 1)
 for row in range(len(profiles)-1):
  for j in range(segments):
   k=(j+1)%cols;faces.append((row*cols+j,(row+1)*cols+j,(row+1)*cols+k,row*cols+k))
 return mesh(name,verts,faces,mat,weights)
def dense(profiles):
 result=[]
 for a,b in zip(profiles,profiles[1:]):
  for j in range(4):result.append(tuple(x+(y-x)*j/4 for x,y in zip(a,b)))
 return result+[profiles[-1]]

def draped_mesh(name,vertices,faces,pins,mat=cloth,weights=None,extras=(),frames=64):
 settled=draper.settle(name,vertices,faces,pins,extras,frames)
 obj=mesh(name,settled,faces,mat,weights)
 obj['cloth_construction']='Gravity drape baked into rest mesh; skeletal runtime animation'
 obj['cloth_simulation_frames']=frames
 return obj

def obstacle(obj):
 return simulation_surfaces.get(obj.name) or ([to_canonical@v.co for v in obj.data.vertices],[tuple(p.vertices) for p in obj.data.polygons])

def settle_cape_in_idle(name,vertices,faces,columns,layer_names):
 # Finish capes with the arms lowered, then inverse-bind the settled surface.
 # This avoids baking an A-pose sleeve pocket permanently into a hanging scarf.
 weights=[garment_weight(v,i) for i,v in enumerate(vertices)]
 old_action=rig.animation_data.action
 muted=[(track,track.mute) for track in rig.animation_data.nla_tracks]
 try:
  for track,_ in muted:track.mute=True
  action=bpy.data.actions['idle'];rig.animation_data.action=action
  rig.animation_data.action_slot=action.slots[0]
  rig.data.pose_position='POSE';bpy.context.scene.frame_set(0);bpy.context.view_layer.update()
  basis=turn@rig.matrix_world;inverse_basis=to_canonical.inverted()
  matrices={b.name:basis@b.matrix@b.bone.matrix_local.inverted()@inverse_basis for b in rig.pose.bones}
  def skin_matrix(influences):
   result=Matrix(((0,0,0,0),)*4)
   total=sum(influences.values())
   for key,value in influences.items():result+=matrices[key]*(value/total)
   return result
  transforms=[skin_matrix(w) for w in weights]
  posed=[m@v for m,v in zip(transforms,vertices)]
  group_names={g.index:g.name for g in body.vertex_groups}
  body_posed=[]
  for v,canonical in zip(body.data.vertices,draper.vertices):
   influences={group_names[g.group]:g.weight for g in v.groups if g.weight>0}
   body_posed.append(skin_matrix(influences)@canonical)
  extras=[]
  for layer in layer_names:
   vs,fs=simulation_surfaces[layer]
   extras.append(([skin_matrix(w)@v for v,w in zip(vs,simulation_weights[layer])],fs))
  idle_draper=Draper(body_posed,draper.faces,ROOT/'artifacts'/'cloth-cache'/gender/'idle')
  result=idle_draper.settle(name+'_IdleFinish',posed,faces,lambda v,i:1 if i<columns else 0,extras,frames=48)
  draper.report.extend(idle_draper.report)
  finished=[]
  def smooth(t):
   t=max(0,min(1,t));return t*t*(3-2*t)
  for original,transform,settled in zip(vertices,transforms,result):
   # Use the lowered-arm correction on the side panels. Preserve the hanging
   # front/back cut: compressing those panels again can bunch them at the bust.
   side=smooth((abs(original.x)-.12)/.16)*smooth((.19-abs(original.y-.02))/.10)
   finished.append(original.lerp(transform.inverted()@settled,side))
  return finished,weights
 finally:
  rig.animation_data.action=old_action
  for track,value in muted:track.mute=value
  rig.data.pose_position='REST';bpy.context.scene.frame_set(0);bpy.context.view_layer.update()

def draped_skirt(name,profiles,mat=cloth):
 # Unequal gathers distributed between panel seams, with extra ease below the hips.
 verts=[];faces=[];cols=96;rows=38
 for row in range(rows):
  t=row/(rows-1);u=t*(len(profiles)-1);k=min(int(u),len(profiles)-2);f=u-k
  z,rx,ry,cy=[a+(b-a)*f for a,b in zip(profiles[k],profiles[k+1])]
  for j in range(cols):
   a=j/cols*math.tau
   pleat=(.003+.012*math.sin(t*math.pi/2))*(math.sin(9*a+.4*math.sin(3*a)+.3*t)+.45*math.sin(17*a-.9*t))
   verts.append(pt((rx+pleat)*math.cos(a),cy+(ry+pleat)*math.sin(a),z+.006*t*t*math.sin(5*a)))
 for row in range(rows-1):
  for j in range(cols):
   k=(j+1)%cols;faces.append((row*cols+j,(row+1)*cols+j,(row+1)*cols+k,row*cols+k))
 return draped_mesh(name,verts,faces,lambda v,i:1 if i<cols else 0,mat,weights=garment_weight)
def sleeves(prefix):
 for side,sign in [('L',1),('R',-1)]:
  points=[turn@rig.matrix_world@rig.data.bones[f'Bip01 {side} '+n].head_local for n in ['UpperArm','Forearm','Hand']]
  inner=points[0].copy();inner.x*=.43;inner.z+=.01
  points.insert(0,inner)
  verts=[];faces=[];rows=25;cols=32
  for i in range(rows):
   t=i/(rows-1)*3.06;seg=min(2,int(t));u=t-seg
   center=points[seg].lerp(points[seg+1],u);axis=(points[seg+1]-points[seg]).normalized()
   b=axis.cross(Vector((0,1,0))).normalized();c=axis.cross(b).normalized()
   fullness=.017 if gender=='woman' else .006
   if prefix=='Abaya':fullness=.028
   radius=(.069+.019*u) if seg==0 else (.088+fullness-.013*u if seg==1 else .075+fullness-(.028+fullness)*min(1,u)**3)
   for j in range(cols):
    a=j/cols*math.tau;r=radius+.0028*math.cos(7*a+t*2)+.0015*math.cos(t*24)*max(0,1-abs(t-2))
    verts.append(center+r*(math.cos(a)*b+math.sin(a)*c))
  for i in range(rows-1):
   for j in range(cols):k=(j+1)%cols;faces.append((i*cols+j,i*cols+k,(i+1)*cols+k,(i+1)*cols+j))
  def sw(v,i):
   t=i//cols/(rows-1)*3.06
   if t<1:return {f'Bip01 {side} Clavicle':1-t,f'Bip01 {side} UpperArm':t}
   blend=max(0,min(1,(t-1.8)/.4))
   return {f'Bip01 {side} UpperArm':1-blend,f'Bip01 {side} Forearm':blend}
  settled=draper.settle(prefix+'_Sleeve_'+side,verts,faces,lambda v,i:1 if i//cols in [0,1,rows-1] else 0,frames=48)
  mesh(prefix+'_Sleeve_'+side,settled,faces,weights=sw)
  verts=settled
  cuffverts=[]
  for row in range(rows-3,rows):
   ring=verts[row*cols:(row+1)*cols];center=sum(ring,Vector())/cols
   cuffverts.extend(center+(v-center)*1.025 for v in ring)
  cufffaces=[(j,j+1,j+1+cols,j+cols) for row in range(2) for j in range(row*cols,(row+1)*cols-1)]
  mesh(prefix+'_Cuff_'+side,cuffverts,cufffaces,seam,lambda v,i,s=side:{f'Bip01 {s} Forearm':1},subdiv=0)
def gown(prefix,hem=.105,wide=0):
 profiles=[(1.505,.073,.071,.025),(1.48,.115,.086,.025),(1.435,.218,.133,.025),(1.36,.212+wide*.3,.15,.025),(1.22,.195+wide*.4,.14,.025),(1.04,.19+wide*.6,.143,.025),(.88,.221+wide*.65,.16,.022),(.60,.252+wide*.8,.18,.022)]
 hem_width=.275 if gender=='man' else (.29 if hem>.4 else .325)+wide
 profiles=[p for p in profiles if p[0]>hem]+[(hem,hem_width,.20 if gender=='man' or hem>.4 else .235,.022)]
 # The shoulder is a continuous piece of the bodice, not a second stiff yoke.
 dress=draped_skirt(prefix+'_Dress',profiles)
 sleeves(prefix)
 if gender=='man':
  loft(prefix+'_StandCollar',dense([(1.495,.073,.070,.022),(1.55,.070,.067,.022)]),.0005)
  verts=[]
  for z,yy in [(1.49,-.065),(1.46,-.097),(1.41,-.15),(1.36,-.148),(1.28,-.143),(1.20,-.14)]:
   for x in [-.011,.011]:verts.append(pt(x,yy-.004,z))
  mesh(prefix+'_ButtonPlacket',verts,[(i,i+1,i+3,i+2) for i in range(0,10,2)],seam)
  for i,z in enumerate([1.475,1.42,1.365,1.31,1.255]):
   yy=-.086 if i==0 else (-.15 if i==1 else -.153)
   verts=[pt(.0045*math.cos(j*math.tau/12),yy,z+.0045*math.sin(j*math.tau/12)) for j in range(12)]
   mesh(prefix+'_Button_'+str(i),verts,[tuple(range(12))],cloth,subdiv=0)
  verts=[pt(x,-.151,z) for x,z in [( .075,1.34),(.145,1.34),(.145,1.25),(.11,1.235),(.075,1.25)]]
  mesh(prefix+'_ChestPocket',verts,[(0,1,2,3,4)],cloth,subdiv=0)
  # Sew the details onto the settled bodice, instead of leaving them at the
  # old cylindrical chest depth where they float or disappear into a fold.
  dv,df=obstacle(dress);surface=BVHTree.FromPolygons(dv,df)
  for detail in list(bpy.context.scene.objects):
   if detail.type!='MESH' or not detail.name.startswith((prefix+'_Button',prefix+'_ChestPocket')):continue
   for vertex in detail.data.vertices:
    p=to_canonical@vertex.co
    hit,_,_,_=surface.ray_cast(Vector((p.x,-.5,p.z)),Vector((0,1,0)),1)
    if hit is not None:
     p.y=hit.y-.0025
     vertex.co=to_local@p
def hijab(prefix,long=False):
 # Oval face opening. The back is closed; hair never protrudes through a missing cap.
 verts=[];faces=[];rows=24;cols=64
 for i in range(rows):
  for j in range(cols):
   a=j/cols*math.tau;rx=.105;rz=.148
   start=.87-.50*max(0,math.cos(a))
   theta=start+(math.pi-start)*i/(rows-1)
   verts.append(pt(rx*math.sin(theta)*math.sin(a),.018-.148*math.cos(theta),1.60+rz*math.sin(theta)*math.cos(a)))
 for i in range(rows-1):
  for j in range(cols):k=(j+1)%cols;faces.append((i*cols+j,i*cols+k,(i+1)*cols+k,(i+1)*cols+j))
 mesh(prefix+'_Hood',verts,faces,weights=lambda v,i:{'Bip01 Head':1})
 # A pointed front and rounded dipped back replace the old straight cylindrical hem.
 verts=[];faces=[];rows=30;cols=96
 for row in range(rows):
  t=row/(rows-1)
  for j in range(cols):
   a=j/cols*math.tau
   front=max(0,-math.sin(a));back=max(0,math.sin(a))
   end=(1.20-.25*front**2-.22*back**2) if long else (1.35-.20*front**2-.10*back**2)
   z=1.515+(end-1.515)*t
   spread=math.sin(min(1,t/.52)*math.pi/2)
   rx=.086+(.248 if long else .192)*spread
   ry=.086+(.135 if long else .10)*spread
   ripple=(.002+.005*t)*math.sin(13*a+t*.7)+.003*t*math.sin(7*a-t)
   verts.append(pt((rx+ripple)*math.cos(a),.015+(ry+ripple)*math.sin(a),z+.003*t*math.sin(15*a)))
 for row in range(rows-1):
  for j in range(cols):
   k=(j+1)%cols;faces.append((row*cols+j,(row+1)*cols+j,(row+1)*cols+k,row*cols+k))
 base='Abaya' if long else 'Robe'
 extras=[obstacle(o) for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith((base+'_Dress',base+'_Sleeve'))]
 verts=draper.settle(prefix+'_Drape',verts,faces,lambda v,i:1 if i<cols else 0,extras=extras,frames=80)
 layers=[o.name for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith((base+'_Dress',base+'_Sleeve'))]
 verts,bindings=settle_cape_in_idle(prefix+'_Drape',verts,faces,cols,layers)
 mesh(prefix+'_Drape',verts,faces,weights=lambda v,i:bindings[i])
 # Narrow sewn border follows the shaped hem instead of a contrasting hard band.
 border=verts[-cols:]+[v+Vector((0,0,.008)) for v in verts[-cols:]]
 mesh(prefix+'_Hem',border,[(j,(j+1)%cols,(j+1)%cols+cols,j+cols) for j in range(cols)],seam,weights=lambda v,i:bindings[-cols+i%cols],subdiv=0)

def ihram():
 # Open overlapping lower sheet, with the wrap edge placed on the front left.
 profiles=dense(dense([(1.055,.185,.142,.035),(1.02,.191,.146,.035),(.88,.207,.153,.03),(.64,.207,.152,.03),(.33,.215,.16,.03)]))
 verts=[];faces=[];cols=97
 for row,(z,rx,ry,cy) in enumerate(profiles):
  for j in range(cols):
   a=-1.0+j/(cols-1)*(math.tau+.65)
   fall=row/(len(profiles)-1)
   f=(.002+.005*fall)*(math.sin(7*a+.9*z)+.4*math.sin(13*a-z*3))
   overlap=.008*max(0,(j/(cols-1)-.86)/.14)
   zz=z+.022*fall**3*math.sin(a+.3)-.045*fall**3*max(0,(j/(cols-1)-.85)/.15)
   verts.append(pt((rx+f+overlap)*math.cos(a),cy+(ry+f+overlap)*math.sin(a),zz))
 for row in range(len(profiles)-1):
  for j in range(cols-1):
   n=row*cols+j;faces.append((n,n+1,n+cols+1,n+cols))
 izar=draped_mesh('Ihram_Izar',verts,faces,lambda v,i:1 if i<cols else 0,terry,frames=80)
 loft('Ihram_WaistFold',dense([(1.055,.188,.145,.035),(1.035,.197,.153,.035)]),.002,mat=terry)
 for uncovered in [False,True]:
  verts=[];faces=[];rows=32;cols=97
  for row in range(rows):
   t=row/(rows-1)
   for j in range(cols):
    a=-.85+j/(cols-1)*(math.tau+.48)
    if uncovered:
     top=1.355+.105*math.cos(a)
     rx=.214+.045*t;ry=.151+.04*t
    else:
     # The two-shoulder wrap settles around the neckline and spreads over the shoulders.
     top=1.515
     spread=math.sin(min(1,t/.25)*math.pi/2)
     rx=.078+.172*spread+.022*t;ry=.078+.093*spread+.035*t
    bottom=.75+.14*math.cos(a+.45)+.035*math.sin(2*a)
    z=top+(bottom-top)*t
    f=(.002+.004*t)*math.sin(7*a+t*1.7)+.002*math.sin(13*a-t)
    # Curved cross-body folds gather towards the left shoulder.
    gather=.003*math.sin(18*(t-.21*math.sin(a)))*(1-t)
    edge=max(0,min(1,(j/(cols-1)-.85)/.12))
    overlap=.016*edge*edge*(3-2*edge) if uncovered else .009*max(0,(j/(cols-1)-.9)/.1)
    verts.append(pt((rx+f+gather+overlap)*math.cos(a),.025+(ry+f+gather+overlap)*math.sin(a),z))
  for row in range(rows-1):
   for j in range(cols-1):
    n=row*cols+j;faces.append((n,n+1,n+cols+1,n+cols))
  # Seat the supported upper edge on the actual shoulder/chest surface. A ring
  # pinned in empty space preserves the old floating-tube silhouette forever.
  bodytree=BVHTree.FromPolygons(draper.vertices,draper.faces)
  for j in range(cols):
   hit,normal,_,distance=bodytree.find_nearest(verts[j])
   edge=max(0,min(1,(j/(cols-1)-.85)/.12))
   separation=.016*edge*edge*(3-2*edge) if uncovered else 0
   if not uncovered and hit is not None and distance<.13:verts[j]=hit+normal*(.012+separation)
  if uncovered:
   # Keep the supported edge continuous during the solve; projecting adjacent
   # pins onto different shoulder/torso surfaces creates unsatisfiable contacts.
   settled=draper.settle('Ihram_Rida_Tawaf',verts,faces,lambda v,i:1 if i<cols else 0,extras=[obstacle(izar)],frames=64)
   for j in range(cols):
    hit,normal,_,distance=bodytree.find_nearest(settled[j])
    if hit is None or distance>.09:continue
    edge=max(0,min(1,(j/(cols-1)-.85)/.12));separation=.016*edge*edge*(3-2*edge)
    delta=hit+normal*(.012+separation)-settled[j]
    if delta.length>.025:delta=delta.normalized()*.025
    for row in range(5):settled[row*cols+j]+=delta*(1-row/5)**2
   obj=mesh('Ihram_Rida_Tawaf',settled,faces,terry,weights=garment_weight)
   obj['cloth_construction']='Gravity drape with tailored shoulder contact and separated wrap edge'
   obj['cloth_simulation_frames']=64
  else:
   draped_mesh('Ihram_Rida_Covered',verts,faces,lambda v,i:1 if i<cols else 0,terry,weights=garment_weight,extras=[obstacle(izar)],frames=80)
def patch(name,predicate,mat=None,expand=0):
 obj=body.copy();obj.data=body.data.copy();obj.name=name;bpy.context.collection.objects.link(obj)
 bm=bmesh.new();bm.from_mesh(obj.data)
 kill=[f for f in bm.faces if not predicate(to_canonical@f.calc_center_median(),f)]
 bmesh.ops.delete(bm,geom=kill,context='FACES');bm.to_mesh(obj.data);bm.free()
 if mat:
  obj.data.materials.clear();obj.data.materials.append(mat)
  for p in obj.data.polygons:p.material_index=0
 if expand:
  for v in obj.data.vertices:v.co+=v.normal*expand
 return obj
# Separate hidden body regions so fabric never reveals the underlying swimwear.
handgroups={g.index for g in body.vertex_groups if 'Hand' in g.name or 'Finger' in g.name}
def ishand(f):
 return sum(sum(g.weight for g in body.data.vertices[v.index].groups if g.group in handgroups) for v in f.verts)/len(f.verts)>.35
cuthead=1.50
patch('Skin_Head',lambda c,f:c.z>cuthead)
patch('Skin_Hands',lambda c,f:c.z<=cuthead and ishand(f))
patch('Skin_Feet',lambda c,f:c.z<.16+height_offset)
armgroups={g.index for g in body.vertex_groups if 'UpperArm' in g.name or 'Forearm' in g.name}
def exposed(c,f):
 arms=sum(sum(g.weight for g in body.data.vertices[v.index].groups if g.group in armgroups) for v in f.verts)/len(f.verts)>.45
 return .16+height_offset<=c.z<=cuthead and not ishand(f) and ((arms and c.z<1.40) or c.z<.31 or (c.z>1.48 and abs(c.x)<.10))
patch('Skin_IhramBody',lambda c,f:exposed(c,f) and c.z<.4)
if gender=='man':patch('Skin_IhramBody_Arms',lambda c,f:exposed(c,f) and c.z>=.4,skin)
if gender=='man':
 def upper_skin(c,f):
  # Keep the entire hidden torso, so the new draped neckline cannot expose
  # jagged missing triangles from the previous cylindrical garment's mask.
  return .90<c.z<=cuthead and not exposed(c,f) and not ishand(f)
 patch('Skin_IhramBody_Torso',upper_skin,skin)
# Clean, short scalp; its separate material becomes skin after tahallul.
def scalp(c,f):return c.z>(1.715 if gender=='woman' else 1.735) or (c.z>1.675 and c.y>.005)
scalp_material=hair.copy();scalp_material.name='Hair_Scalp'
head=bpy.data.objects['Skin_Head'];head.data.materials.append(scalp_material)
if gender=='woman':
 bm=bmesh.new();bm.from_mesh(head.data)
 hide=[f for f in bm.faces if (to_canonical@f.calc_center_median()).z>1.73 or ((to_canonical@f.calc_center_median()).y>.015 and (to_canonical@f.calc_center_median()).z>1.58)]
 bmesh.ops.delete(bm,geom=hide,context='FACES');bm.to_mesh(head.data);bm.free()
for p in head.data.polygons:
 c=sum((to_canonical@head.data.vertices[i].co for i in p.vertices),Vector())/len(p.vertices)
 if gender=='man' and scalp(c,None):p.material_index=len(head.data.materials)-1
if gender=='man':
 for name,amount in [('BeardShort',.001),('BeardFull',.009)]:
  patch(name,lambda c,f:1.545<c.z<1.615 and c.y<-.065 and abs(c.x)<.073,hair,amount)
 gown('Robe')
 ihram()
else:
 gown('Robe')
 gown('Tunic',hem=.65)
 draped_skirt('Tunic_Skirt',[(1.0,.205,.15,.02),(.75,.24,.17,.02),(.40,.29,.21,.02),(.095,.345,.24,.02)])
 gown('Abaya',hem=.085,wide=.045)
 hijab('Hijab');hijab('Khimar',long=True)
# Footwear weighted to each foot. Neutral straps remain below the ankle.
for side,sign in [('L',1),('R',-1)]:
 center=turn@rig.matrix_world@rig.data.bones[f'Bip01 {side} Foot'].head_local
 z=.004;x=center.x;y=-.045
 profiles=[(z,.061,.145,y),(z+.015,.061,.145,y)]
 shoe=loft('Sandal_'+side,profiles,fold=0,mat=solemat,weights=lambda v,i,s=side:{f'Bip01 {s} Foot':1})
 # Move the loft from the centre line to the foot.
 delta=to_local.to_3x3()@Vector((x,0,0))
 for v in shoe.data.vertices:v.co+=delta
 # Flat strap over the toes.
 verts=[]
 for yy in [-.13,-.065]:
  for j in range(17):
   a=math.pi*j/16;verts.append(pt(x+.058*math.cos(a),yy,.04+.035*math.sin(a)))
 mesh('Sandal_Strap_'+side,verts,[(j,j+1,j+18,j+17) for j in range(16)],solemat,lambda v,i,s=side:{f'Bip01 {s} Foot':1})
bpy.data.objects.remove(body,do_unlink=True)
# Clean untouched helpers imported from the source.
for o in list(bpy.context.scene.objects):
 if o.type=='MESH' and o.name.startswith('Icosphere'):bpy.data.objects.remove(o,do_unlink=True)
# Rotate the source hierarchy as one unit; original clips retain correct bind transforms.
root=next(o for o in bpy.context.scene.objects if o.parent is None and o.type=='EMPTY')
root.rotation_euler.z+=math.pi/2
rig.data.pose_position='POSE'
bpy.context.scene.frame_set(0);bpy.context.view_layer.update()
bpy.ops.object.select_all(action='SELECT')
def export_glb(target):
 # A running dev server must never serve a partially written GLB.
 temporary=target.with_name('.building-'+target.name)
 bpy.ops.export_scene.gltf(filepath=str(temporary),export_format='GLB',use_selection=True,export_animations=True,export_image_format='JPEG',export_jpeg_quality=90,export_yup=True,export_extras=True)
 temporary.replace(target)

target=ASSETS/f'{gender}.glb'
export_glb(target)
print('EXPORTED',target,target.stat().st_size,flush=True)
print('ACTIONS',[(a.name,len(a.slots)) for a in bpy.data.actions],flush=True)
outfits=ASSETS/'outfits';outfits.mkdir(exist_ok=True)
variants=[('gamis','Robe',None),('ihram','Ihram','Tawaf'),('ihram-covered','Ihram','Covered')] if gender=='man' else [('gamis','Robe','Hijab'),('tunik-rok','Tunic','Hijab'),('abaya-khimar','Abaya','Khimar')]
for filename,prefix,cover in variants:
 bpy.ops.object.select_all(action='DESELECT')
 for obj in bpy.context.scene.objects:
  name=obj.name
  include=obj.type!='MESH' or name.startswith(('Skin_Head','Skin_Hands','Skin_Feet','Sandal')) or name.startswith(prefix)
  if gender=='woman' and name.startswith(cover):include=True
  if prefix=='Ihram' and name.startswith('Skin_IhramBody'):include=True
  if name.startswith('Ihram_Rida_'):include=prefix=='Ihram' and name.endswith(cover)
  obj.select_set(include)
 output=outfits/f'{gender}-{filename}.glb'
 export_glb(output)
 print('OUTFIT',output,output.stat().st_size,flush=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'artifacts'/f'pilgrim-{gender}.blend'))
(ROOT/'artifacts'/f'cloth-drape-{gender}.json').write_text(json.dumps(draper.report,indent=2))

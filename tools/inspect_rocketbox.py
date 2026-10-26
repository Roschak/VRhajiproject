import bpy,json
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for gender in ['man','woman']:
 bpy.ops.import_scene.gltf(filepath=f'C:/VRhajiproject/artifacts/rocketbox-{gender}.glb')
 bpy.context.view_layer.update()
 body=next(o for o in bpy.context.selected_objects if o.type=='MESH')
 rig=next(m.object for m in body.modifiers if m.type=='ARMATURE')
 print(gender,'body',body.name,'matrix',body.matrix_world,'rigmatrix',rig.matrix_world,flush=True)
 print('BONES',[(b.name,tuple(round(x,3) for x in rig.matrix_world@b.head_local)) for b in rig.data.bones if any(t in b.name for t in ['Head','Neck','Spine','UpperArm','Forearm','Hand','Thigh','Calf','Foot','Pelvis'])],flush=True)
 print('bounds',[(min((body.matrix_world@v.co)[i] for v in body.data.vertices),max((body.matrix_world@v.co)[i] for v in body.data.vertices)) for i in range(3)],flush=True)
 print('materials',[m.name for m in body.data.materials],flush=True)
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath='C:/VRhajiproject/artifacts/m-walk.glb')
for a in bpy.data.actions: print('ACTION',a.name,[(s.identifier,s.target_id_type) for s in a.slots],a.frame_range[:],flush=True)
for o in bpy.context.scene.objects: print('OBJ',o.name,o.type,o.animation_data.action.name if o.animation_data and o.animation_data.action else '-',flush=True)

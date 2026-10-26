import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'artifacts/female-abaya-khimar/female-abaya-khimar.blend'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
hands=bpy.data.objects['Skin_Hands']
counts={s:sum(any(hands.vertex_groups[g.group].name.startswith('Bip01 '+s+' ') and g.weight>.1 for g in v.groups) for v in hands.data.vertices) for s in ['L','R']}
print('HAND VERTICES',counts,flush=True)
for t in rig.animation_data.nla_tracks:t.mute=True
for action in bpy.data.actions:
 if action.name not in ['idle','walk','run']:continue
 rig.animation_data.action=action
 if action.slots:rig.animation_data.action_slot=action.slots[0]
 for phase in [0,.25,.5,.75]:
  frame=action.frame_range[0]+phase*(action.frame_range[1]-action.frame_range[0]);bpy.context.scene.frame_set(int(frame),subframe=frame%1)
  print(action.name,phase,{s:{bone:list(rig.matrix_world@rig.pose.bones['Bip01 '+s+' '+bone].head) for bone in ['UpperArm','Forearm','Hand']} for s in ['L','R']},flush=True)

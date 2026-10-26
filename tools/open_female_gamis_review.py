"""Import a reviewed female outfit in its own scene without replacing open work."""
import bpy
from pathlib import Path
from mathutils import Vector

root=Path(__file__).resolve().parents[1] if '__file__' in globals() else Path('C:/VRhajiproject')
variant=globals().get('GAMIS_PREVIEW_VARIANT','female-gamis-v2')
scene=bpy.data.scenes.new('HAJJ - Reference '+variant)
bpy.context.window.scene=scene
old_actions=set(bpy.data.actions)
outfit='woman-abaya-khimar.glb' if variant=='female-abaya-khimar' else 'woman-gamis.glb'
bpy.ops.import_scene.gltf(filepath=str(root/'artifacts'/variant/outfit))
idle=next((a for a in set(bpy.data.actions)-old_actions if a.name.split('.')[0]=='idle'),None)
if idle:
    for rig in [o for o in scene.objects if o.type=='ARMATURE']:
        for track in rig.animation_data.nla_tracks:track.mute=True
        rig.animation_data.action=idle
        if idle.slots:rig.animation_data.action_slot=idle.slots[0]
scene.frame_set(1)
for obj in scene.objects:
    obj.select_set(False)
    if obj.type=='ARMATURE':obj.hide_set(True)
    if obj.name.startswith('Icosphere') and not any(m.type=='ARMATURE' for m in obj.modifiers):obj.hide_set(True)
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        space=area.spaces.active
        space.overlay.show_overlays=False
        shading_types={i.identifier for i in space.shading.bl_rna.properties['type'].enum_items}
        if 'MATERIAL' in shading_types:space.shading.type='MATERIAL'
        space.region_3d.view_location=(0,0,.91)
        space.region_3d.view_distance=2.7
        space.region_3d.view_rotation=(Vector((0,0,.91))-Vector((.7,-3,1.2))).to_track_quat('-Z','Y')
print('Opened female outfit:',scene.name)

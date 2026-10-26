"""Run via Blender MCP: show the reviewed gamis without replacing existing scenes."""
import bpy
from pathlib import Path
from mathutils import Vector

root=Path('C:/VRhajiproject')
scene=bpy.data.scenes.new('HAJJ - Male gamis final review')
bpy.context.window.scene=scene
bpy.ops.import_scene.gltf(filepath=str(root/'artifacts/male-gamis/man-gamis.glb'))
for obj in scene.objects:
    obj.select_set(False)
    if obj.type=='ARMATURE':
        obj.hide_set(True)
        obj.data.pose_position='POSE'
scene.frame_set(1)
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        space=area.spaces.active
        space.overlay.show_overlays=False
        space.shading.type='MATERIAL'
        space.region_3d.view_location=(0,0,.94)
        space.region_3d.view_distance=2.7
        space.region_3d.view_rotation=(Vector((0,0,.94))-Vector((.7,-3,1.2))).to_track_quat('-Z','Y')
print('Opened only the male gamis in a new scene; existing scenes preserved:',scene.name)

"""Open revised ihram in a new live Blender scene, preserving existing work."""
import bpy
from pathlib import Path
from mathutils import Vector

root=Path('C:/VRhajiproject')
variant=globals().get('IHRAM_REVIEW_VARIANT','Tawaf')
scene=bpy.data.scenes.new('HAJJ - Ihram '+variant+' review')
bpy.context.window.scene=scene
filename='man-ihram-covered.glb' if variant=='Covered' else 'man-ihram.glb'
bpy.ops.import_scene.gltf(filepath=str(root/'artifacts/male-ihram'/filename))
for obj in scene.objects:
    obj.select_set(False)
    if obj.type=='ARMATURE':obj.hide_set(True)
scene.frame_set(1)
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        space=area.spaces.active;space.overlay.show_overlays=False
        space.shading.type='MATERIAL'
        space.region_3d.view_location=(0,0,.94);space.region_3d.view_distance=2.7
        space.region_3d.view_rotation=(Vector((0,0,.94))-Vector((.7,-3,1.2))).to_track_quat('-Z','Y')
print('Opened',filename,'in a new scene:',scene.name)

"""Open the finished GLBs in a NEW interactive Blender review scene.

Run through Blender MCP after rebuilding. Existing scenes are retained.
"""
import bpy, math
from pathlib import Path
from mathutils import Vector

root = Path('C:/VRhajiproject')
scene = bpy.data.scenes.new('Labbaik - draped wardrobe 20261025')
bpy.context.window.scene = scene
names = ['man-gamis', 'man-ihram', 'woman-gamis', 'woman-tunik-rok', 'woman-abaya-khimar', 'man-ihram-covered']
for index, name in enumerate(names):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(root/'src/VRHaji.Web/wwwroot/assets/characters/outfits'/f'{name}.glb'))
    added = set(bpy.data.objects)-before
    holder = bpy.data.objects.new('Draped '+name, None)
    scene.collection.objects.link(holder)
    for obj in added:
        if obj.parent is None:
            transform = obj.matrix_world.copy()
            obj.parent = holder
            obj.matrix_world = transform
    holder.location.x = (index-2.5)*1.05

world = bpy.data.worlds.new('Wardrobe review soft studio')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (.35,.35,.35,1)
world.node_tree.nodes['Background'].inputs[1].default_value = .65
scene.world = world
for location, power, size in [((-4,-5,6),900,5), ((4,1,4),700,4)]:
    data = bpy.data.lights.new('Wardrobe softbox', 'AREA')
    data.energy = power
    data.shape = 'DISK'
    data.size = size
    obj = bpy.data.objects.new(data.name,data)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0,0,1))-obj.location).to_track_quat('-Z','Y').to_euler()

bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
    if obj.type=='MESH':
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.shading.type = 'MATERIAL'
        area.spaces.active.region_3d.view_distance = 7
        area.spaces.active.region_3d.view_location = (0,0,.9)
        area.spaces.active.region_3d.view_rotation = (Vector((0,0,.9))-Vector((0,-8,2))).to_track_quat('-Z','Y')
scene.frame_set(0)
print('Opened six draped wardrobe assets in', scene.name)

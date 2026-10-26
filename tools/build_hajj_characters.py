"""Run through Blender MCP. Builds isolated, CC0-based animated wardrobe assets."""
import bpy, math, os, sys
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src', 'VRHaji.Web', 'wwwroot', 'assets', 'characters'))
original_scene = bpy.context.window.scene

def fabric(name, color):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    shader = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = .84
    return m

def build(gender, scene):
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'source', gender + '-rigged.glb'))
    body = next(o for o in scene.objects if o.type == 'MESH' and len(o.data.vertices)>10000 and any(m.type=='ARMATURE' for m in o.modifiers))
    rig = next(m.object for m in body.modifiers if m.type=='ARMATURE')
    bpy.context.view_layer.update()
    rig.name = 'Hajj_' + gender
    body.name = 'Character'
    rig.animation_data.action = None
    rig.data.pose_position = 'REST'
    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    dec = body.modifiers.new('Mobile budget', 'DECIMATE')
    dec.ratio = .10
    result = bpy.ops.object.modifier_apply(modifier=dec.name)
    assert 'FINISHED' in result, str(result)
    bpy.context.view_layer.update()
    print('Reduced vertices:',len(body.data.vertices),flush=True)
    assert 10000 < len(body.data.vertices) < 60000, 'Unexpected character topology'
    h = max(v.co.z for v in body.data.vertices)
    scale = h / 180
    cloth = fabric('Clothing', (.78,.74,.65))
    scarf = fabric('Scarf', (.30,.39,.38))
    hair = fabric('Hair', (.075,.035,.018))
    beard = fabric('Beard', (.075,.035,.018))
    trousers = fabric('Trousers', (.78,.74,.65))
    body.data.materials.append(cloth)
    body.data.materials.append(hair)
    body.data.materials.append(beard)
    body.data.materials.append(trousers)
    hand_groups = {g.index for g in body.vertex_groups if 'Hand' in g.name}
    # The supplied base mesh has one atlas. Give clothing and hair independent channels.
    for p in body.data.polygons:
        c = sum((body.data.vertices[i].co for i in p.vertices), Vector()) / len(p.vertices) / scale
        hand_weight = sum(sum(g.weight for g in body.data.vertices[i].groups if g.group in hand_groups) for i in p.vertices)/len(p.vertices)
        if 12 < c.z < 151 and hand_weight < .45: p.material_index = 1
        if 12 < c.z < 92 and abs(c.x) < 35: p.material_index = 4
        if c.z > (172 if gender == 'man' else 170): p.material_index = 2
        if gender == 'woman' and c.z > 147 and (abs(c.x)>9 or c.y>1): p.material_index = 2
        if gender == 'man' and 152 < c.z < 160 and c.y < -5: p.material_index = 3
        p.use_smooth = True
    body.shape_key_add(name='Basis')
    crop = body.shape_key_add(name='HairCrop')
    for v in crop.data:
        if v.co.z > 172*scale:
            v.co.z = 172*scale + (v.co.z-172*scale)*.45
            v.co.x *= .94
    # Downsample embedded maps; original downloads are retained separately.
    for m in body.data.materials:
        if m and m.use_nodes:
            for node in m.node_tree.nodes:
                if node.type == 'TEX_IMAGE' and node.image:
                    im = node.image
                    if max(im.size) > 1024: im.scale(1024,1024)

    def rings(name, profiles, mat, bone, sectors=48):
        verts=[]; faces=[]
        for z,rx,ry,cy in profiles:
            for j in range(sectors):
                angle=2*math.pi*j/sectors
                fold=1+.018*math.cos(angle*12)
                verts.append((rx*math.cos(angle)*fold*scale,(cy+ry*math.sin(angle)*fold)*scale,z*scale))
        for k in range(len(profiles)-1):
            for j in range(sectors):
                a=k*sectors+j; b=k*sectors+(j+1)%sectors
                faces.append((a,b,b+sectors,a+sectors))
        mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
        obj=bpy.data.objects.new(name,mesh); scene.collection.objects.link(obj)
        obj.parent=rig; obj.matrix_parent_inverse.identity()
        obj.data.materials.append(mat)
        vg=obj.vertex_groups.new(name=bone); vg.add(list(range(len(verts))),1,'REPLACE')
        mod=obj.modifiers.new('Follow character','ARMATURE'); mod.object=rig
        for p in mesh.polygons: p.use_smooth=True
        return obj

    robe = rings('Robe',[(12,29,19,1),(35,29,18,1),(65,26,17,1),(92,23,16,2),(115,22,16,1),(138,22,15,1),(148,9,8,0)],cloth,'Hips')
    spine = robe.vertex_groups.new(name='Spine')
    for v in robe.data.vertices:
        weight=max(0,min(1,(v.co.z/scale-95)/45))
        robe.vertex_groups['Hips'].add([v.index],1-weight,'REPLACE')
        spine.add([v.index],weight,'REPLACE')
    rings('Tunic',[(72,26,17,1),(100,24,17,1),(138,22,15,1),(148,9,8,0)],cloth,'Spine')
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=(0,0,0))
    beard_obj=bpy.context.object;beard_obj.name='BeardFull'
    for v in beard_obj.data.vertices:
        v.co=Vector((v.co.x*8*scale,(v.co.y*3-10)*scale,(v.co.z*7+153)*scale))
    beard_obj.parent=rig
    beard_obj.data.materials.append(beard)
    vg=beard_obj.vertex_groups.new(name='Head');vg.add(list(range(len(beard_obj.data.vertices))),1,'REPLACE')
    mod=beard_obj.modifiers.new('Follow head','ARMATURE');mod.object=rig
    for p in beard_obj.data.polygons:p.use_smooth=True
    rings('Kufi',[(172,10.5,10,0),(178,10,9.5,0),(180,0.1,.1,0)],scarf,'Head')
    # Open face: a horseshoe drape covers the back and sides, leaving the face visible.
    verts=[]; faces=[]; n=48
    hood_profiles=[(133,26,18,3,-math.pi/2),(145,23,18,2,-math.pi/2),(153,18,17,0,-.9),(170,18,17,0,-.9),(178,16,15,0,-.9),(184,9,10,0,-1.4),(187,.1,.1,0,-math.pi/2)]
    for z,rx,ry,cy,start in hood_profiles:
        for j in range(n):
            a=start+(math.pi-2*start)*j/(n-1)
            verts.append((rx*math.cos(a)*scale,(cy+ry*math.sin(a))*scale,z*scale))
    for k in range(len(hood_profiles)-1):
        for j in range(n-1):
            a=k*n+j; faces.append((a,a+1,a+n+1,a+n))
    mesh=bpy.data.meshes.new('Hijab'); mesh.from_pydata(verts,[],faces); mesh.update()
    obj=bpy.data.objects.new('Hijab',mesh); scene.collection.objects.link(obj); obj.parent=rig
    obj.data.materials.append(scarf)
    vg=obj.vertex_groups.new(name='Head'); vg.add(list(range(len(verts))),1,'REPLACE')
    mod=obj.modifiers.new('Follow head','ARMATURE'); mod.object=rig
    for p in mesh.polygons:p.use_smooth=True
    rings('Scarf',[(130,13,11,0),(143,12,10,0),(149,9,8,0)],scarf,'neck')
    rig.data.pose_position='POSE'
    # Export imported animations belonging to this rig via NLA tracks.
    if rig.animation_data:
        for track in rig.animation_data.nla_tracks: track.mute=False
    bpy.ops.object.select_all(action='DESELECT')
    for obj in scene.objects:
        if obj == rig or obj.parent == rig: obj.select_set(True)
    body.data.update()
    bpy.context.view_layer.update()
    output=os.path.join(ROOT,gender+'.glb')
    bpy.ops.export_scene.gltf(filepath=output,export_format='GLB',use_selection=True,export_animations=True,export_image_format='JPEG',export_jpeg_quality=85)
    print(gender,'vertices',sum(len(o.data.vertices) for o in scene.objects if o.type=='MESH'),'bytes',os.path.getsize(output))
    return scene

if bpy.app.background:
    gender = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'man'
    build(gender, bpy.context.scene)
else:
    raise RuntimeError('Run in a separate background Blender process to preserve the current scene.')
print('Wardrobe export complete')

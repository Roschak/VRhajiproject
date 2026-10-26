"""Offline cloth draping in metre/Z-up space. No cloth solver is shipped to VR.

The cache includes geometry, pins, obstacles and solver revision, so a rebuild
cannot silently reuse a drape from a different pattern or body.
"""
import bpy, bmesh, hashlib, json, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

REVISION = 'drape-1'


class Draper:
    def __init__(self, vertices, faces, directory):
        self.vertices = [Vector(v) for v in vertices]
        self.faces = faces
        self.directory = directory
        directory.mkdir(parents=True, exist_ok=True)
        self.report = []

    @staticmethod
    def object(name, vertices, faces):
        data = bpy.data.meshes.new(name)
        data.from_pydata(vertices, [], faces)
        data.update()
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        bm = bmesh.new()
        bm.from_mesh(data)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(data)
        bm.free()
        return obj

    def settle(self, name, vertices, faces, pins, extras=(), frames=64, solver=None):
        vertices = [Vector(v) for v in vertices]
        obstacles = [(self.vertices, self.faces)] + list(extras)
        pin_values = [float(pins(v, i)) for i, v in enumerate(vertices)]
        free_wrap = name == 'Ihram_Rida_Tawaf'
        revision = REVISION + ('-free-wrap-3' if free_wrap else '')
        signature_values = [revision, name, [list(v) for v in vertices], faces,
                              pin_values, frames,
                              [[[list(v) for v in vs], fs] for vs, fs in obstacles]]
        if solver:
            signature_values.append(solver)
        signature = json.dumps(signature_values, separators=(',', ':'))
        solver = solver or {}
        key = hashlib.sha256(signature.encode()).hexdigest()[:20]
        cache = self.directory / (name + '-' + key + '.json')
        if cache.exists():
            result = json.loads(cache.read_text())
            self.report.append(result['report'])
            print('DRAPE CACHE', name, flush=True)
            return [Vector(v) for v in result['vertices']]

        colliders = bpy.data.collections.new('Drape obstacles ' + name)
        bpy.context.scene.collection.children.link(colliders)
        temporary = []
        for index, (vs, fs) in enumerate(obstacles):
            obstacle = self.object('Drape obstacle ' + str(index), vs, fs)
            for collection in list(obstacle.users_collection):
                collection.objects.unlink(obstacle)
            colliders.objects.link(obstacle)
            obstacle.modifiers.new('Cloth contact', 'COLLISION')
            obstacle.collision.thickness_outer = .004
            obstacle.collision.thickness_inner = .001
            obstacle.collision.cloth_friction = 8
            temporary.append(obstacle)

        # Start outside the body. Starting with penetrating faces causes explosive
        # impulses, especially at the armpits, and is not a useful drape.
        tree = BVHTree.FromPolygons(self.vertices, self.faces, all_triangles=False)
        for i, v in enumerate(vertices):
            point, normal, _, distance = tree.find_nearest(v)
            if point is not None and distance < .055:
                signed = (v - point).dot(normal)
                if signed < .009:
                    vertices[i] = v + normal * (.009 - signed)

        # A scarf must start outside the dress and sleeves as well as the skin.
        # Otherwise the first step traps it between two collision surfaces.
        for vs, fs in (extras if name.startswith(('Hijab', 'Khimar')) else ()):
            layer = BVHTree.FromPolygons(vs, fs, all_triangles=False)
            for i, v in enumerate(vertices):
                point, normal, _, distance = layer.find_nearest(v)
                if point is not None and distance < .06:
                    signed = (v-point).dot(normal)
                    if signed < .01:
                        vertices[i] = v + normal*(.01-signed)

        obj = self.object('Drape pattern ' + name, vertices, faces)
        temporary.append(obj)
        group = obj.vertex_groups.new(name='Tailored supports')
        for i, value in enumerate(pin_values):
            if value:
                group.add([i], value, 'REPLACE')
        mod = obj.modifiers.new('Gravity drape', 'CLOTH')
        s = mod.settings
        s.quality = 10 if free_wrap else 12
        s.mass = .18
        s.time_scale = .75
        s.tension_stiffness = 35
        s.compression_stiffness = 35
        s.shear_stiffness = 18
        s.bending_stiffness = solver.get('bending_stiffness', .12)
        s.tension_damping = 10
        s.compression_damping = 10
        s.shear_damping = 10
        s.bending_damping = 1
        s.air_damping = 3
        s.vertex_group_mass = group.name
        s.pin_stiffness = 1
        c = mod.collision_settings
        c.collection = colliders
        c.collision_quality = 3 if free_wrap else 5
        c.distance_min = solver.get('distance_min', .004)
        c.use_self_collision = not free_wrap
        c.self_distance_min = solver.get('self_distance_min', .002 if free_wrap else .004)
        c.self_friction = 5
        mod.point_cache.frame_start = 1
        mod.point_cache.frame_end = frames
        scene = bpy.context.scene
        previous_fps, previous_fps_base = scene.render.fps, scene.render.fps_base
        scene.render.fps = 30
        scene.render.fps_base = 1
        scene.gravity = (0, 0, -9.81)
        try:
            for frame in range(1, frames + 1):
                scene.frame_set(frame)
                bpy.context.view_layer.update()
                obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
                if frame % 16 == 0:
                    print('DRAPING', name, frame, '/', frames, flush=True)
            evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
            result = [v.co.copy() for v in evaluated.data.vertices]
            if len(result) != len(vertices) or any(not all(math.isfinite(x) for x in v) for v in result):
                raise RuntimeError('Invalid cloth result: ' + name)
            movement = [(a-b).length for a,b in zip(result, vertices)]
            if max(movement) > .6 or min(v.z for v in result) < -.06:
                print('UNSTABLE DRAPE',name,'max movement',max(movement),'minimum z',min(v.z for v in result),flush=True)
                (self.directory/(name+'-failed.json')).write_text(json.dumps(dict(vertices=[list(v) for v in result],faces=faces)))
                raise RuntimeError('Unstable cloth result: ' + name)
            report = dict(name=name, vertices=len(vertices), frames=frames,
                          max_displacement=round(max(movement), 5),
                          mean_displacement=round(sum(movement)/len(movement), 5),
                          cache_key=key)
            cache.write_text(json.dumps(dict(vertices=[list(v) for v in result], report=report)))
            self.report.append(report)
            print('DRAPED', report, flush=True)
            return result
        finally:
            for item in temporary:
                data = item.data
                bpy.data.objects.remove(item, do_unlink=True)
                bpy.data.meshes.remove(data)
            bpy.data.collections.remove(colliders)
            scene.render.fps, scene.render.fps_base = previous_fps, previous_fps_base
            scene.frame_set(0)

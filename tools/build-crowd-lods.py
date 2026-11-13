"""Derive lightweight animated crowd assets; never modify the wardrobe originals."""
import bpy, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'src/VRHaji.Web/wwwroot/assets/characters'
OUT=ASSETS/'crowd'; OUT.mkdir(exist_ok=True)
report=[]
for gender in ['man','woman']:
 for lod,ratio in [('near',.12),('far',.006)]:
  bpy.ops.wm.read_factory_settings(use_empty=True)
  bpy.ops.import_scene.gltf(filepath=str(ASSETS/(gender+'.glb')))
  for o in list(bpy.context.scene.objects):
   if o.type!='MESH': continue
   name=o.name
   common=name.startswith(('Skin_Head','Skin_Hands','Skin_Feet','Sandal'))
   keep=common or (gender=='man' and name.startswith(('BeardFull','Ihram_Izar','Ihram_Rida_Tawaf','Skin_IhramBody_Arms','Skin_IhramBody_LowerLegs','Skin_IhramBody_RightArmTawaf','Skin_IhramBody_TorsoTawaf'))) or (gender=='woman' and name.startswith(('Robe_Dress','Robe_Lining','Hijab_Gamis')))
   if not keep: bpy.data.objects.remove(o,do_unlink=True);continue
   bpy.context.view_layer.objects.active=o;o.select_set(True)
   mod=o.modifiers.new('Crowd silhouette simplification','DECIMATE')
   mod.ratio=ratio if name.startswith(('Ihram','Robe','Hijab')) else (.6 if lod=='near' else .05)
   # Apply before the armature to keep weights and the original walk animation.
   bpy.ops.object.modifier_move_up(modifier=mod.name)
   bpy.ops.object.modifier_apply(modifier=mod.name)
   o.select_set(False)
  bpy.ops.export_scene.gltf(filepath=str(OUT/f'{gender}-{lod}.glb'),export_format='GLB',export_animations=True,export_skins=True,export_yup=True)
  report.append({'gender':gender,'lod':lod,'vertices':sum(len(o.data.vertices) for o in bpy.context.scene.objects if o.type=='MESH'),'polygons':sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')})
(OUT/'build-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))

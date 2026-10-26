# Baked cloth drape — 25 October 2026

The previous wardrobe had rigid, almost circular cross sections and floating
shoulder layers. This revision changes the garment geometry, with an offline
Blender cloth solve before subdivision and skinning. It is not a texture-only
change and does not add a cloth physics solver to the browser.

## Construction

- Gamis and abaya: continuous shoulder/bodice surface, narrower waist, ease in
  the skirt, gravity-settled folds, separately settled sleeves and fitted cuffs.
  The old rigid overlaid shoulder yoke was removed.
- Ihram: independent overlapping izar and rida sheets. The waist and upper
  wrapping edge support the fabric; the rest settles under gravity with body
  and cloth collisions. Both the one-shoulder and covered variants are retained.
- Tunic: separate upper garment and long skirt.
- Hijab/khimar: fabric settles over the body and the underlying dress/sleeves;
  the head covering and face opening remain intact.
- Cloth near the upper arms blends into the shoulder/arm bones, so draping in
  the source A-pose does not leave rigid wings when the arms lower in idle or
  swing in walking/running. Front panels keep their torso/hip influences.
- Capes receive a second 48-frame settle with the arms lowered in idle. Its
  result is inverse-bound to the original skeleton with the same skin weights,
  removing the sleeve-shaped pockets left by draping over an A-pose alone.
- The male torso behind the neckline is retained instead of being cut to the
  old garment silhouette, avoiding missing triangles when the neckline moves.

`tools/pilgrim_cloth.py` runs Blender's cloth solver on an isolated, static body
in metres. Collision thickness is 4 mm. Garments use 48–80 solver frames with
10–12 quality steps. Closed garments and capes use self collision. The
single-shoulder wrap instead uses an explicitly separated overlap, body/inner
garment collisions and a limited shoulder fitting adjustment after settling;
coincident pinned edges must not fight self-collision constraints.
Each successful solve records displacement
statistics in `artifacts/cloth-drape-{man,woman}.json`. Content-addressed caches
include the pattern, support weights, collision meshes and solver revision.
Changing solver settings requires updating `REVISION` in that module.
Underlying garments use their simulation mesh as a collision proxy rather than
the subdivided display surface. Successful GLBs replace their runtime files
atomically, so the dev server cannot read a partially exported asset.
The cloth solver restores the original animation frame rate. Regression checks
allow at most one final sample of rounding in the existing 24 Hz rig exporter,
and reject a wholesale change to the source clip's speed.

Blender references:

- https://docs.blender.org/api/5.2/bpy.types.ClothSettings.html
- https://docs.blender.org/manual/en/4.3/physics/cloth/settings/collisions.html

## Rebuild and deliverables

Run `tools/build_pilgrim_wardrobe.py` in background Blender with `-- man` and
`-- woman`. Run them separately or in separate processes. The build refuses to
clear the user's interactive Blender scene. Outputs use the same runtime and
standalone GLB paths documented in `WARDROBE-REFERENCE-V2.md`. They retain the
Microsoft Rocketbox MIT notice and idle/walk/run clips.

The browser asset revision is `cloth-drape-20261025-v3`. The editable Blender
files are `artifacts/pilgrim-man.blend` and `artifacts/pilgrim-woman.blend`.

Validation commands (set `BASE_URL` to the running application):

- `node tests/wardrobe-assets.cjs`: all six GLBs, skin weights, clips, sampled
  deformed vertices throughout each motion and front/back/side/motion renders.
- `npm.cmd run test:characters`: wardrobe switches, skin selection, animation
  and ritual appearance.
- `npm.cmd run test:menu`: integration with the character menu and preferences.
- `dotnet build src/VRHaji.Web/VRHaji.Web.csproj --no-restore`.

Review images use `artifacts/wardrobe-v3-*.png`; the earlier v2 images remain for
comparison. The automated checks complement visual review; they do not prove
that every possible pose is intersection-free. Cloth has a physically settled
rest shape and follows the skeleton in the app, rather than simulating wind or
fabric contact in real time. Physical-headset performance needs headset testing.

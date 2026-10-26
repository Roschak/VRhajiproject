# Character revision and game menu

The app opens directly into the menu. On desktop the welcome headline is on the left, navigation is in the centre, and journey cards plus Character/Ziarah tiles are on the right. Selecting any navigation item slides the same menu column to the left; the brand button returns to the centred layout. Small screens stack the content with horizontal navigation, and reduced-motion preferences disable the animation. All character choices work on desktop and are reused by the continuous VR journey.

## Wardrobe

- Male: white gamis or two-piece white ihram preview; no additional beard option; fixed neat black hair.
- Female: white gamis or white abaya with a longer khimar. Hair and neck remain covered. Older saved tunic/skirt selections fall back to gamis; the unused asset remains archived in the wardrobe files.
- Six skin-tone swatches, with numbered accessible labels and no visible colour names.
- Fabric colours, hair colours/styles and optional headwear are removed. Old preferences are sanitized on read and write using the existing `vrhaji_preferences_v1` key; names, graphics, audio and progress survive migration.
- Idle, walk and run preview clips. The first-person body chooses locomotion animations from actual movement speed and ignores teleports.

## Ritual appearance

Choosing ihram in the editor previews it; the journey overrides male clothing to match its current step. Missions 1–3 begin in gamis. The miqat clothing interaction in mission 3 puts on ihram. Tahallul at the end of mission 6 restores gamis and shows a shaved scalp. The ihram confirmation in mission 7 puts on ihram again; tahallul in mission 9 restores gamis. Female clothing keeps the selected covered outfit throughout. Direct resume initializes the same appearance before the asynchronous model load completes. Hair changes at tahallul, not on entering ihram.

The scalp uses the short source head silhouette with a skin material after tahallul. This is a visual simulation, not hair-growth modelling. Female hair shortening is not shown beneath the fixed hijab.

## Sources

Runtime humans and skeletal animations are adapted from **Microsoft Rocketbox**, MIT, copyright (c) 2020 Microsoft:

- Original project: https://github.com/microsoft/Microsoft-Rocketbox
- GLB distribution: https://models.codelove.in/models/sports-male-01/ and https://models.codelove.in/models/sports-female-01/
- Motion files: `m_` / `f_` `idle_neutral_01`, `walk_neutral_01`, `run_neutral_01`, from https://models.codelove.in/animations/
- The official license is distributed in `wwwroot/assets/characters/ROCKETBOX-LICENSE.txt`.

The source bodies are anatomically proportioned, textured human game models. They replace the prior AI-generated Grab3D bodies. They are not newly scanned Arab people or a claim of photographic realism. White clothing, hijab/khimar, body masks, beard/scalp materials and sandals were adapted or modelled in Blender for this project. Clothes use skeletal deformation, without real-time cloth physics. XR hands remain controller-driven; full-body tracking and arm IK are not implemented.

Only the selected gender GLB is loaded. Runtime files are approximately 4.2 MB (male) and 9.6 MB (female), with embedded textures capped at 1024px. Alternative clothes share the rig and materials; inactive pieces are hidden. Source GLBs are excluded from web publication by the project file. Earlier Grab3D source files and their licenses are retained as historical inputs and are no longer used to build the runtime avatars.

## Rebuild

The male gamis has a separate, body-fitted revision. See
[`CHARACTERS/MALE-GAMIS-REVIEW.md`](CHARACTERS/MALE-GAMIS-REVIEW.md) for its reference
analysis, editable Blender file, selective rebuild, previews, and limitations.
`tools/refine_male_gamis.py` rebuilds only that garment; the full wardrobe command
below creates the older baseline and must be followed by the selective revision
when rebuilding the current male asset. Female and ihram assets are unchanged by
the selective revision.

The subsequent male ihram revision is documented in
[`CHARACTERS/MALE-IHRAM-REVIEW.md`](CHARACTERS/MALE-IHRAM-REVIEW.md).
`tools/refine_male_ihram.py` starts from the revised gamis Blender project,
preserves the gamis, and stages the combined male GLB plus both ihram variants.
For a complete male rebuild, the order is baseline, gamis revision, then ihram
revision; inspect the staged files before replacing runtime assets.

The female gamis revision is documented in
[`CHARACTERS/FEMALE-GAMIS-REVIEW.md`](CHARACTERS/FEMALE-GAMIS-REVIEW.md).
`tools/tailor_female_gamis.py` replaces the earlier `refine_female_gamis.py`
attempt. It starts from the preserved female baseline (or `artifacts/pilgrim-woman.blend`
on a fresh rebuild), constructs the gamis and its dedicated `Hijab_Gamis_*`, and
stages files in `artifacts/female-gamis-v2/`. The runtime selects this head covering
only with the gamis; the tunic keeps its own hijab.

The abaya/khimar revision follows in `tools/tailor_female_abaya.py`, using the
revised gamis Blender project and preserving its meshes and skin weights.
See [`CHARACTERS/FEMALE-ABAYA-KHIMAR-REVIEW.md`](CHARACTERS/FEMALE-ABAYA-KHIMAR-REVIEW.md).
For the current female wardrobe, run the baseline, `tailor_female_gamis.py`, then
`tailor_female_abaya.py`. Review the staged files before installing the final
combined `woman.glb`, the gamis standalone from `female-gamis-v2`, and the abaya
standalone from `female-abaya-khimar`. The baseline command alone produces the
older clothing and replaces runtime files.

The combined source rigs and all three clips are already in `wwwroot/assets/characters/source/rocketbox-{man,woman}.glb`. Rebuild with:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python tools/build_pilgrim_wardrobe.py -- man
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python tools/build_pilgrim_wardrobe.py -- woman
```

Use isolated background Blender to preserve the user's open scene. Source inspection uses Blender MCP. `decode-character.mjs` and `prepare_rocketbox.py` document the one-time preparation of downloaded source GLBs: decode meshopt, map matching motion-channel node names, and then let Blender convert the complete rig and clips together. They use downloaded inputs in ignored `artifacts/`; they are not required for the normal rebuild above. `build_hajj_characters.py` is the superseded Grab3D pipeline.

## Verification

```powershell
dotnet build src/VRHaji.Web/VRHaji.Web.csproj --no-restore
# Start a separate test server; avoid taking the user's development port.
dotnet run --project src/VRHaji.Web/VRHaji.Web.csproj --no-build --no-launch-profile --urls http://127.0.0.1:5117
# In another terminal:
$env:BASE_URL='http://127.0.0.1:5117'
npm.cmd run test:characters
npm.cmd run test:menu
npm.cmd test
```

Character checks cover migration, all outfits, animated bones, ritual transitions and direct-resume appearance. Menu checks cover loading, rapid gender switches, saved skin/outfit/profile/settings, mobile layout, disposal and simulation integration. Journey tests cover the connected map, ritual counters, all 12 missions and one persistent renderer/page. `tools/review-wardrobe.cjs` captures each outfit at idle and run for visual review. Stop the test server afterwards. Real Oculus/Quest tracking, comfort and frame-rate checks require target hardware.

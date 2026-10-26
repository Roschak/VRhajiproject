# Reference-based white wardrobe revision — 24 October 2026

The clothing was remodelled in Blender on the existing Microsoft Rocketbox human rigs. No downloaded product photographs or commercial fabric patterns are embedded in the assets. The user's three photographs guide the silhouettes and drape.

This describes the previous v2 wardrobe. The current geometry and offline cloth
pipeline are documented in [WARDROBE-DRAPE-V3.md](WARDROBE-DRAPE-V3.md).

## References researched

- Men's thobe: stand collar, long sleeves, placket and chest pocket. https://simplydeen.com/products/al-aseel-thobe-1 and https://rifaahdubai.com/en/product/classic-white-plain-thobe-with-band-collar-clean-placket-design
- Two independent ihram cloths, izar and rida: https://muslimhands.org.uk/islamic-resources/your-guide-to-wearing-the-ihram-for-hajj-and-umrah
- Tunic and separate maxi skirt: https://lozy.id/products/hanira-abaya-tunik-set-khimar-broken-white
- Abaya and khimar: https://lozy.id/products/mida-khimar-set-in-broken-white-lozy-x-hamidah and https://www.tasnim-collections.com/product/two-layer-chiffon-khimar-niqab-amirah-large/

The third supplied photograph has trousers; this revision follows the user's requested **skirt** and uses the photograph as a head-covering/drape reference.

## Deliverables

All files are self-contained binary glTF 2.0 (GLB), with embedded materials, textures, skeleton and idle/walk/run clips. They are in `src/VRHaji.Web/wwwroot/assets/characters/outfits/`:

- `man-gamis.glb`: ankle-length thobe, stand collar, front placket, buttons, pocket and cuffs.
- `man-ihram.glb`: overlapping izar and asymmetric rida, matching the exposed-right-shoulder reference.
- `man-ihram-covered.glb`: additional rida covering both shoulders for ordinary journey use.
- `woman-gamis.glb`: long A-line gamis with sleeves and white hijab.
- `woman-tunik-rok.glb`: knee-length tunic, separate long skirt, white hijab.
- `woman-abaya-khimar.glb`: broader abaya and longer khimar with a shaped front/back hem.

`man.glb` and `woman.glb` remain the combined runtime wardrobes. `hajj-character.js` selects the pieces without overlapping alternative outfits. The menu ihram preview uses the asymmetric reference variant; ordinary ritual appearance uses the covered-shoulder variant. A caller can explicitly set `ritual.idtiba` for the exposed-shoulder variant. A bare shoulder is not treated as a universal requirement of ihram.

Changes include irregular folds, cloth weave normal maps, separate cuffs, shaped scarf hems, corrected overlap between rida/izar, garment silhouettes and sandal height. Skin swatches remain available. Images are not a claim of photorealism. Clothes follow skeletal animation; they do not run a physical cloth simulation, so extreme poses can still cause contact/intersection.

## Rebuild and checks

Run `tools/build_pilgrim_wardrobe.py` in **background Blender**, once with `-- man` and once with `-- woman`. It refuses to clear a live interactive scene. Source rigs are retained in `assets/characters/source/`. Editable build results are in `artifacts/pilgrim-man.blend` and `artifacts/pilgrim-woman.blend`.

- `node tests/wardrobe-assets.cjs`: loads every standalone asset, checks normalized skin weights and finite idle/walk/run transforms, captures front/back/motion renders.
- `npm.cmd run test:characters`: runtime wardrobe visibility, customization, animation and ritual transitions.
- `npm.cmd run test:menu`: character menu and preferences.
- `dotnet build src/VRHaji.Web/VRHaji.Web.csproj --no-restore`.

Set `BASE_URL` to the running project before browser tests. Review renders are `artifacts/wardrobe-v2-{front,back,walk,run}.png`.

Base humans and motion data retain the Microsoft Rocketbox MIT license in `assets/characters/ROCKETBOX-LICENSE.txt`; include that notice when redistributing the derived GLBs.

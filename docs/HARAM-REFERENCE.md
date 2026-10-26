# Masjidil Haram reference revision

The Makkah environment uses a continuous eight-wing, two-storey gallery around the existing Kaaba and ritual destinations. Ground-floor galleries can be entered from the courtyard. Repeated columns, arches, ceiling details, and lanterns use instanced geometry. Twin escalators in the north gallery lead to the walkable upper gallery; the rooftop remains scenery.

Exterior reference supplied by the user:
https://static.vecteezy.com/system/resources/thumbnails/054/439/990/small_2x/aerial-view-of-masjid-al-haram-in-mecca-at-night-photo.jpg

Interior reference supplied by the user:
https://images.pond5.com/muslims-stay-indoor-al-masjid-129531622_prevstill.jpeg

The references guide the enclosure, illuminated roofline, tiered minarets, white marble columns with dark bases, gold hanging lanterns, geometric relief, ceiling coffers and green carpets. This remains a simplified architectural interpretation on the compressed learning map, not a surveyed reconstruction. The photographs are reference-only and are not shipped as textures. Geometric ornament textures are drawn locally in canvas.

`haram-architecture.js` builds the galleries and lights. `builders.js` retains the Kaaba, Maqam Ibrahim, clock tower and surrounding city. The non-clock-tower hotels are lowered to keep the mosque dominant. `JourneyWorld.update` applies night lighting in the connected Makkah area and restores the previous environment when leaving; the same behavior applies to walking arrivals.

Review commands (with the local server running):

```powershell
node tools/review-haram.cjs
node tests/journey-map.cjs
node tests/journey-browser.cjs
node tests/haram-facilities.cjs
node tests/umrah-browser.cjs
```

The review tool renders courtyard, interior and aerial views into `artifacts/haram-reference/`. Open `/simulasi/haji?tahap=8` for a direct visit. Browser checks cover the connected navigation and journey lifecycle; physical Quest performance and headset appearance need separate device review. Existing detailed Kaaba/character assets still contribute substantial draw calls; instancing the new architecture does not establish a headset frame-rate guarantee.

## Gate, flooring and access revision

White tiles have no emissive contribution, and local bloom is reduced to .025. Prayer-carpet geometry spans each entire interior wedge on both levels, with tiled approaches at the gates and escalators. Outer walls include a triple-arched central entrance and side portals; folded timber doors leave the openings usable.

`haram-facilities.js` adds the moving escalator treads, metal balustrades, upper-floor railings and floor-dependent navigation. The ascending lane is on the left when facing north. Desktop and XR use the same height profile; upper-floor teleport retains the floor level, and crowd height remains on the ground floor. Walking onto the escalator permits gradual ascent/descent. The dedicated browser test exercises walking up, upper boundary rejection, teleport and walking down.

A covered L-shaped passage follows `(103,-30) → (130,-30) → (130,-6)` into the existing Safa/Marwah gallery. Decorative pillars, pendants and green markers follow the corridor reference. East-side background hotels were moved out of this corridor. These coordinates belong to the compressed teaching map.

Additional user references:

- Gate: https://i.ytimg.com/vi/OG625vVIhTk/oar2.jpg
- Escalators: https://media.istockphoto.com/id/2182982809/photo/beautiful-interior-view-of-the-escalators-at-masjid-al-haram.jpg
- Sa'i corridor: https://c1.staticflickr.com/1/160/355413028_c75854858d_b.jpg

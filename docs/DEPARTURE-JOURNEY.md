# Departure journey: home, car, terminal and flight

Start `/simulasi/umrah` or `/simulasi/haji` from stage 1. The reference-inspired home has a furnished cream living/dining room, a preparation console, a front doorway and a silver SUV outside. Collect the passport, ticket, ihram clothing, pouch and cabin suitcase in any order with mouse/controller interaction. Collected objects disappear and the packing indicator updates. The suitcase appears beside the player after collection.

The journey then leads outside to the car, arrives at the terminal drop-off `(0,36)`, and continues on foot through check-in and document inspection to the boarding gate. A sliding glass door at `(44.8,18)` opens on proximity and disables its collider only once open. Outside, the stairway at `(85,22)` climbs to the aircraft entrance at `(85,9)`, about 4.2 m above the apron. Cabin entry transitions to the aircraft interior while retaining the renderer and XR session.

The cabin includes warm trim, overhead bins, seat-back monitors, seated passengers and an animated map screen. The route choice has two working branches:

- Madinah, followed by a bus trip to Miqat Bir Ali and preparation/niat there.
- Jeddah, with preparation and niat in the cabin before the simulated miqat crossing, followed by ground travel to Makkah.

Both Hajj and Umrah use these choices. The Hajj arrival and hotel preparation steps preserve ihram already started on the inbound journey. The choice and inventory are stored under `vrhaji-departure-v1-{route}` for later-stage resume; starting stage 1 begins a fresh packing sequence. Return flights also update the map direction.

The map is an explicitly labelled simulation with schematic land outlines, interpolated coordinates and compressed flight progress, not GPS or a live aircraft feed. Vehicle travel uses short seated transitions rather than a driving simulator. Buildings and vehicles are procedural interpretations of the references, not exact production models. Browser checks do not establish physical headset performance.

## Code

- `departure-scenes.js`: home, luggage, SUV, terminal extension, sliding doors, aircraft/stairs, companions and cabin/map details.
- `departure-flow.js`: packing interactions, departure sequence and the miqat branches.
- `journey-world.js`: zone integration, passengers, luggage crowds, car travel view and disposal.
- `player-avatar.js`: the player's visible luggage.

Companions include the existing detailed male/female avatar assets and lightweight instanced crowds. Airport walkers pull luggage; cabin passengers have smaller luggage beside their seats. Companions are disposed with their zone. The existing 12 Hajj / 6 Umrah completion flow remains in place.

## Checks

```powershell
node tests/departure-mechanics.cjs
node tests/umrah-browser.cjs
node tests/journey-browser.cjs
$env:MIQAT_CHOICE='air'
node tests/umrah-browser.cjs
node tests/journey-browser.cjs
node tools/review-departure.cjs
```

The mechanics check uses controller ray picks to collect items out of order, walks through the proximity door, checks it closes again, and walks up the aircraft stairs. Full browser journeys exercise both miqat branches, inventory persistence, progress, scene continuity and return home. Review images are saved in `artifacts/departure-reference/`.

## User-provided references

- Home: https://tse1.mm.bing.net/th/id/OIP.FJsZbEvAfmfDDCFDjqIekAHaE8
- Silver SUV: https://cloud.jpnn.com/photo/arsip/normal/2024/09/12/geely-ex5-baru-saja-dirilis-di-jerman-foto-geely-wjlfk-eocn.jpg
- Terminal drop-off: https://i.pinimg.com/736x/b0/57/dc/b057dcad69eb89751852385996e80d4b.jpg
- Aircraft: https://3.bp.blogspot.com/-LMdnf9zCpI4/WOXnc80URNI/AAAAAAAAG00/eZfG__KtcZof-LJUBblqIjP9JxGm7FGjQCPcB/s1600/2017-04-06_13-58-01.png
- Cabin: https://i.ytimg.com/vi/mzcvo1gQAUE/maxresdefault.jpg

Downloaded photographs are kept as local review references and are not used as runtime textures.

## Connected routes and updated scenery

Navigation arrows now follow a walkable route around static obstacles and replan when the player leaves the route. Unreachable destinations return no route rather than an incomplete line. Roadside signs mark the Miqat–Makkah road and the Safa entrance. The Jeddah arrival branch uses ground transport; walking is offered on connected roads from Miqat and from the Haram to the Safa entrance. The seven sai legs remain walking inside the gallery.

The entire Safa–Marwah hall, including both hills, has a 34 m roof and suspended hill labels. Makkah has additional Arabian buildings and 180 animated pilgrims around the mataf; the gallery has 32 walkers. Shared male/female character assets are used throughout, with independent animation phases, gradual turns and idle blending at walking endpoints. The supplied character screenshots are now reflected in the shared NPC appearance: white gamis and draped hijab for women, white one-shoulder ihram and a full dark beard for men. Gender-specific supported skin tones replace the previous unsupported color. A rendered pair was reviewed in artifacts/npc-reference/pair.png using tools/review-npc-reference.cjs.

The modern neighborhood, bus interior and boarding stairs use the photographs in `artifacts/route-reference` as visual references. Bus travel includes a 45-second skippable scenery segment. Aircraft seating is assigned to 11C; the schematic flight map appears on the seatback screen and the ordinary minimap is hidden in the cabin. Saudi arrival and return departure go through the service counter before the document/SOP steps. Resuming Hajj at stage two also performs the arrival procedure.

Checks: `node tests/walking-route.cjs`, `node tests/route-guidance.cjs`, `node tests/journey-mechanics.cjs`, and the full Hajj/Umrah browser journeys. Set `BASE_URL` to use another local server port.

Validation on 2026-10-26: all five sampled walking routes had zero blocked samples; the route review loaded 386 detailed NPCs across prepared areas. The 12-stage Hajj air-miqat branch and six-stage Umrah land-miqat branch completed, including progress persistence and Hajj disposal/resume. Browser journey tests disable external narration: the existing Google TTS endpoint rejects cross-origin audio requests in this environment. Subtitles and journey progression remain available. Physical VR headset performance has not been measured.

## Entrance and crowd revision

Haram spawns now start at `(30,124)` in front of the entrance. The mission first guides the player directly to the security officer to check the lodging card, then through the entrance before continuing the itinerary. Walking arrivals use the same checkpoint. The card check is a scripted training interaction; there is no inspection desk.

NPC luggage is opt-in and enabled only at home and airports. Each airport now has 72 walkers following a collision-aware continuous circuit. The mataf contains 420 orbiting pilgrims; 64 sai walkers move east on the negative-Z lane and west on the positive-Z lane, changing lanes only at X = ±70 beyond the central divider. Player sai objectives likewise move to the correct return lane at each endpoint.

The low connector roof and decorative beams were raised to 33–34 m, above the 27 m hills. Side decorative pillars moved to the outside edges to preserve views of the hills. `tests/crowd-flow.cjs` checks entrance spawns and paths, luggage counts, all 72 airport walkers moving, and all 64 sai walkers following the expected direction. Visual captures are in `artifacts/crowd-flow/`.

Validation completed on 2026-10-27: crowd/entrance checks passed, including the reachable hotel approach; the full 12-stage Hajj and six-stage Umrah land routes completed and returned home. Hajj disposal and resume also passed. Run browser journeys sequentially with `BASE_URL=http://localhost:5102` and `JOURNEY_TIMEOUT_MS=600000` on software-rendered test machines; simultaneous runs exceeded the original four-minute test budget. Umrah now returns from Marwah along the return lane before leaving at Safa for tahallul.

## Makkah density and Mina reference revision

The earlier mataf counts are superseded by 3,000 moving tawaf pilgrims and 4,000 moving exterior pilgrims. All have continuous analytic routes. Rendering uses four GPU instanced batches with baked walking animation, reduced distant geometry, at most 96 detailed nearby people, and distance culling. Offscreen people retain route progress; the population is not reduced when culled. `tools/build-crowd-lods.py` builds the four derivative GLBs from the original male/female character assets using Blender. Original character files remain unchanged.

The exterior plaza has white tile paving. Hotels are set back roughly 390 units from the center, matching the clock tower district, while hotel mission destinations and collision boundaries follow the relocated building. The clock tower uses blue-green glazing, beige ribs, four clock faces, Arabic signage, a spire and crescent. The directly approachable security officer has a camouflage uniform, beret and crossed arms based on the supplied reference.

Mina has a concrete covered Jamarat hall, three elongated stone walls and oval basins, ceiling lights/fans, 300 moving pilgrims and 1,484 instanced white tents surrounding the hall. Main roads and ritual approaches stay open. Reference photos are stored for local review in `artifacts/makkah-reference`; the runtime scenery is a procedural interpretation, not a photogrammetric reconstruction.

Static architecture is combined by material and spatial cell. Collision queries use a spatial index instead of scanning thousands of tent/facade blockers on every step. Makkah temporarily disables bloom and dynamic shadows and allows adaptive resolution, restoring the previous settings on leaving. Headset frame rate has not been measured.

Checks: `tests/makkah-scale.cjs` validates all 7,000 moving pilgrims, zero blocked sampled positions, four actual crowd draw calls, direct officer interaction, hotel/Jamarat routes and landmark presence. `tests/blocker-index.cjs` compares indexed collisions against exhaustive checks including dynamic doors. `tests/crowd-flow.cjs` checks all 72 airport walkers and all 64 opposing-lane sai walkers. Review images are in `artifacts/makkah-scale/`. The single local project entry is `http://localhost:5102/`.

Final validation on 2026-10-27: the revised 12-stage Hajj and six-stage Umrah land journeys completed sequentially, including return home, persisted progress, Hajj disposal and direct resume. Collision-index, departure mechanics, tawaf/sai/jumrah mechanics and crowd-flow checks passed. `dotnet build src/VRHaji.Web --no-restore` passed with zero warnings and errors. Browser validation uses software rendering; these checks establish behavior and batching rather than a physical-headset FPS guarantee.

## Local voice guide and detailed Abraj skyline

`guide-voice.js` replaces the failing cross-origin Google Translate playback. Indonesian Gadis neural speech is generated ahead of time at a slightly slower pace and served from `wwwroot/audio/guide`, with a text-to-file manifest. The source is synthetic speech, not a human voice recording. `guide-scenes.js` contains conversational introductions for eleven locations and the bus/car. Navigation instructions, interaction prompts and dialog guidance also speak. Uncatalogued dynamic text falls back to an Indonesian browser voice. Captions remain visible if audio is unavailable. Replay and mute controls appear throughout the journey; advancing or cancelling a step stops its speech.

Rebuild audio with `python -m pip install --target tools/tts-deps edge-tts==7.3.1`, then `python tools/build-guide-audio.py`. Generation needs network access; normal prerecorded playback does not contact an external TTS endpoint. Dependencies under `tools/tts-deps` are ignored. `tests/guide-voice.cjs` checks cancellation and fallback; `tests/guide-audio-browser.cjs` decodes each location introduction and verifies non-silent local playback.

`abraj-skyline.js` interprets the latest photographs using a green illuminated four-sided clock, Arabic crest, ribbed emerald facades, ornamental gold spire/crescent, a layered podium and six companion hotel towers. Four rings of varied hotel buildings increase city density while preserving the spacious white plaza. The approach road passes east of the enlarged podium, with a reserved corridor through the city blocks. Window geometry is instanced and static architecture remains spatially batched. Reference photos are in `artifacts/latest-reference`; the rendered scene is a procedural approximation, not an exact reconstruction of the photographs.

## Prayer cards and narration without automatic repetition

`data/prayers.json` contains 13 sourced readings with Arabic, Latin transliteration, Indonesian meaning, timing and usage notes. Cards appear at the relevant journey steps, once per reading during a journey. The optional library is available through **Bacaan & doa**. Cards also use the existing 3D controller interface in VR. **Dengarkan bacaan** reads the Arabic using prerecorded `ar-SA-ZariyahNeural` audio; **Lanjutkan** stops audio and continues the mission. Arabic voice is synthetic reading, not a recorded reciter. The complete local catalog now contains 303 clips.

Sources are linked on each card: the official [Al-Haramain umrah guide](https://risala.prh.gov.sa/id/content/63), [MUI guidance for Arafah](https://mui.or.id/public/baca/bimbingan/doa-dan-dzikir-terbaik-jamaah-haji-saat-di-arafah-69fea3980065f), [Muslim 713 on entering/leaving a mosque](https://hadeethenc.com/id/browse/hadith/65092), Quran verses and the Saudi ministry Hajj guide. Notes distinguish optional general prayers from specific ritual readings; the travel verse is labeled an excerpt, intention remains in the heart, and no obligatory prayer is invented for each tawaf lap or for tahallul.

Each automatic narration text is heard at most once per engine/journey lifetime. Location introductions are separately tracked across mission contexts, so returning to Haram or starting its next stage does not repeat its welcome. Explicit replay remains available. This governs application narration; it does not change repetitions prescribed within the acts of worship. Stopping/skipping speech resolves the waiting step, and duplicate speech does not restart audio or block progression. `tests/guide-voice.cjs` covers active and completed duplicates plus explicit replay; `tests/prayer-guide-browser.cjs` exercises Arabic playback, the library, prayer cards and once-only introductions.

Validation on 2026-10-28: all 13 Arabic recordings decoded successfully and local prayer playback advanced; RTL Arabic, Latin, meaning and source links were reviewed in `artifacts/prayer-guide/talbiyah.png`. A Unicode normalization mismatch for Arabic combining marks was fixed and covered by a regression check. Duplicate automatic narration and manual replay passed. Both complete browser journeys passed again with prayer cards integrated (six Umrah stages, twelve Hajj stages, return home, progress persistence, disposal and resume). The final .NET build passed without warnings or errors.

## Continue or restart on re-entry

`journey-session.js` stores an unfinished session separately for Hajj and Umrah. The simulation entry checks this before allocating a renderer, offering **Lanjutkan perjalanan** and **Mulai dari awal** with the saved stage title. Resume begins at the start of the unfinished stage, retaining inventory, miqat choice, ihram state and already-heard guidance/prayer cards. It does not restore an exact walking position or an unfinished tawaf lap. This boundary is stated in the choice screen.

Snapshots are written when starting, every five seconds, when hiding/leaving the page and on disposal. An already-completed stage waiting for Continue saves the next stage. Finishing the journey removes the unfinished-session marker. Restart clears only that route's session, departure state and completed-stage progress; preferences and the other route remain intact. Existing completed-stage records without a session can still offer continuation at the next stage. Home route links now open this entry flow instead of silently selecting a stage.

`tests/journey-session.cjs` covers route isolation, invalid records, restart cleanup and unavailable storage. `tests/journey-resume-browser.cjs` verifies a real passport pickup survives a reload, selection appears before loading the world, resume preserves prior narration, fresh start clears inventory, and Hajj can resume stage 8. The entry screenshot is `artifacts/journey-resume-choice/choice.png`.

Final re-entry validation on 2026-10-28: storage and browser resume/restart checks passed with the compact entry screen. The full six-stage Umrah journey passed, including return home and removal of the unfinished-session marker after completion. The .NET build passed with zero warnings and errors.

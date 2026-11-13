# Player activity poses

The active Hajj and Umrah routes, departure flow, travel, dialogs and player avatar were audited. Existing rigged male/female assets and walk/run clips are preserved; contextual bone poses are layered after the animation mixer and restored before its next update. Upper-body bends use Spine1 to avoid rotating the leg attachment hierarchy.

| Activity | Integration |
|---|---|
| Private car | Existing seat anchor retained; hips raised to the actual cushion; seated legs and resting hands |
| Bus | Reserved seat at local (0, .9), eye height 1.65m matches elevated cushion; NPC excluded from this seat |
| Aircraft outbound and return | Explicit passengerSeat state at assigned 11C seat, retained through route/miqat dialogs and cleared on landing/abort |
| Carry suitcase | Right arm holding pose; handle anchored to hand world transform. Hidden while seated/praying and outside travel locations; ownership remains in inventory |
| Pick up documents/items / show documents | Short reach gesture on accepted interaction |
| Pick up pebbles | Bend gesture on accepted pickup |
| Throw pebbles | Timed right-arm throwing gesture on each valid throw; original seven-throw counter retained |
| Dua / wukuf / post-jumrah dua | Raised hands; can combine with seated legs. Ordinary intention/recitation cards retain current posture |
| Mabit | Kneeling rest pose during rest dialog |
| Tahallul | Actual center barber-chair anchor; seated during haircut dialog; return to prior location afterward |
| Two-rakah Umrah prayer | 15 explicit practice stages: takbir, qiyam, ruku, standing, two sujud with sitting per cycle, final sitting. Avatar faces Kaaba; each stage requires continuation |
| Walking / tawaf / sai | Existing idle/walk/run clips retained; poses and suitcase are restored/hidden by activity context |

JourneyUI now restores its prior movement lock instead of always enabling movement, which previously allowed standing/walking after a seated dialog. Activity ownership prevents old dialogs/drawers from reviving stale poses. Scoped camera heights restore on close. Desktop camera lowers for floor prayer poses; XR head tracking is not forced into physical bowing/prostration.

Validation:
- tests/avatar-activities.cjs: both rigs, ruku foot stability, pose restoration, raised hands, seated knees, suitcase handle contact, seated prayer/dialog lock, exit restoration, nested cleanup, 15-step prayer sequence, cancellation.
- tests/jakarta-vehicles.cjs: existing car/traffic/interior regression passed.
- tests/journey-mechanics.cjs: tawaf, sai, Tasyrik and cancellation regression passed.
- tests/departure-mechanics.cjs: doors, stairs, pickups, aircraft map and crowds passed.
- Visual pose grids: artifacts/activity-poses/poses.png and poses-woman.png.

Limits: authored skeletal poses, not motion-capture or cloth simulation; deep bending may still compress long garments. Headset hardware validation is pending. Gesture illustrations are not a replacement for the existing ritual guidance.

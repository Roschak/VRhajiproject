# MASTER PROMPT — REALISTIC HAJJ CLOTHING ASSETS IN BLENDER

You are an expert 3D garment artist, technical clothing modeler, Blender Python developer, and realistic cloth simulation specialist.

Your task is to CREATE OR IMPROVE highly realistic 3D Hajj and Umrah clothing assets in Blender using Blender MCP.

**CRITICAL: The clothing must look like real fabric naturally worn by a human, NOT like cylinders, cones, rigid shells, or simple extruded meshes.**

The final assets must be suitable for a realistic 3D virtual Hajj simulation, with clean topology, correct human proportions, realistic garment silhouettes, and convincing fabric draping.

## 1. INSPECT THE EXISTING BLENDER SCENE FIRST

Before generating or modifying any meshes:

1. Inspect all available objects, collections, meshes, armatures, and materials.
2. Identify existing male and female human character models.
3. Analyze their actual dimensions, shoulders, chest, waist, hips, arms, legs, and overall body proportions.
4. Determine each character's local coordinate system, current pose, transforms, and scale.
5. Identify existing clothing assets that need improvement.
6. Preserve the original human models, rigs, skin weights, and unrelated objects.
7. Create backup copies of clothing before destructive modifications.
8. Reuse the existing scene and models. Do not create unrelated replacement characters.

If characters already exist, the new garments MUST be fitted to those exact models, not arbitrary generic body proportions.

If a suitable body is missing, report it instead of pretending clothing has been accurately fitted.

## 2. CLOTHING ASSETS TO CREATE

Create realistic, separate 3D garment assets for the following categories.

### MALE CLOTHING

**A. Men's White Gamis / Thobe**

- A realistic, ankle-length, loose-fitting white gamis.
- Natural shoulder slopes following the underlying human anatomy.
- Rounded shoulder transitions, not sharp, horizontal, box-shaped edges.
- A correctly fitted neckline and realistic neck opening.
- Long sleeves connected naturally to shoulder and armpit geometry.
- Slightly loose torso silhouette, not skin-tight and not cylindrical.
- Natural fabric folds around the underarms, elbows, abdomen, hips, and lower garment.
- Subtle vertical drapes from the chest and waist towards the hem.
- Realistic sleeve openings and garment hem thickness.
- The garment must look sewn and worn, not created from a single cylinder.

**B. Men's Ihram Cloth**

Create a realistic traditional two-piece male ihram consisting of:

1. **Izar — lower cloth**
   - A white unstitched cloth wrapped around the waist and lower body.
   - Realistic layered wrapping and fabric overlap.
   - Natural cloth tension around the waist.
   - Gravity-driven hanging folds extending downward.
   - Slight fabric compression where the wrapping holds the cloth.
   - Uneven but believable fold distribution.
   - Must look like an actual wrapped textile, not a skirt-shaped cylinder.

2. **Rida — upper cloth**
   - A separate white rectangular cloth naturally draped over the torso.
   - The cloth should rest against the shoulders, chest, back, and arms according to the chosen ihram wrapping style.
   - Use anatomically plausible cloth contact and natural hanging fabric.
   - Include realistic tension folds and gravity-driven draping.
   - Show believable fabric overlaps and cloth edges.
   - Do not transform the ihram into a sewn robe or shirt.

Use a valid traditional male ihram arrangement, with its two separate unstitched cloth pieces clearly recognizable.

### FEMALE CLOTHING

**C. Women's White Gamis**

- A long, modest, loose-fitting white dress.
- Natural feminine anatomical proportions without excessively tight body-fitting.
- Soft shoulder transitions following the human model.
- Long sleeves with realistic volume around arms and wrists.
- Loose chest and waist areas while maintaining believable body structure.
- Naturally falling fabric around the hips, thighs, knees, and ankles.
- Organic gravity-driven folds, not evenly repeated procedural stripes.
- A slightly irregular but realistic hem.

**D. Women's White Tunic**

- A loose, realistic long-sleeved white tunic.
- Correct shoulder and sleeve construction.
- Natural drape around the torso and hips.
- Realistic sleeve folds around elbow joints and armpits.
- The tunic length and silhouette must clearly distinguish it from a full-length gamis.
- Realistic fabric thickness, stitching, and subtle seam transitions.

**E. Women's White Skirt**

- A modest, loose-fitting long white skirt.
- Natural fabric draping from the waist to the ankles.
- Correct waist fitting and realistic hip clearance.
- Organic fabric folds caused by gravity.
- Natural cloth gathering near the waist.
- Slight variation around the lower hem.
- Avoid uniform radial folds or cone-like shapes.
- The skirt must look like fabric hanging from the waist, not a primitive cone.

**F. Women's Abaya**

- A realistic, loose-fitting full-length abaya.
- Flowing silhouette with natural shoulder and arm transitions.
- Realistic garment construction, including sleeves if applicable to the chosen abaya style.
- Natural vertical folds, cloth tension, and realistic hem.
- Loose fit while preserving the underlying human silhouette.
- No excessively wide artificial shoulder shapes.
- Avoid a rigid cylindrical body structure.

**G. Women's Khimar**

- A realistic long khimar head covering.
- Must conform naturally to the top, sides, and back of the head.
- Fabric should flow naturally over the shoulders, chest, and back.
- Soft and rounded fabric transitions around the skull and shoulders.
- Gravity-driven hanging fabric from the head and shoulder areas.
- Natural folds around the neck, upper chest, and back.
- Avoid rigid triangular cones, cylindrical shapes, or helmet-like silhouettes.
- Preserve modest coverage and anatomically plausible cloth layering.

Every garment must be created as a separate, identifiable, reusable Blender object or well-organized object collection.

## 3. MOST IMPORTANT — NATURAL HUMAN ANATOMY FITTING

The largest issue with the existing assets is that clothes do not naturally fit the body.

You MUST solve this problem.

Do not generate clothes as oversized tubes around human characters.

Instead:

- Use the existing human mesh as a physical anatomical reference.
- Fit each garment to the actual shoulders, chest, torso, waist, hips, and limbs.
- Maintain realistic clearance between skin and fabric.
- Allow natural contact at support points, such as shoulders and waist, while maintaining modest, loose-fitting garment volume elsewhere.
- The garment must not float unnaturally around the body.
- The garment must not intersect the skin.
- The shoulders must follow natural downward human shoulder slopes.
- The sleeve connection must respect the shoulder joint and armpit anatomy.
- The chest and torso should have realistic depth and shape.
- The garment silhouette must respond to actual body proportions.

**NEVER treat the entire human torso and lower body as a single cylinder.**

Fabric should follow the body where physically supported, then hang naturally under gravity.

## 4. REALISTIC SHOULDER CONSTRUCTION

Shoulders are a critical priority.

Existing garments have unnatural, extremely sharp, box-like shoulders.

Fix this using the following rules:

- Follow the actual shape of the clavicles and shoulder joints.
- Create soft, rounded transitions from neck to shoulder.
- Ensure the shoulder line slopes naturally.
- Use appropriate fabric support from the body.
- Build properly connected sleeves and realistic armholes.
- Add subtle folds caused by fabric tension near the armpits.
- Prevent unnatural sharp horizontal lines or rectangular silhouettes.
- Avoid excessive artificial shoulder padding.
- Use smooth, anatomically believable shoulder geometry.

The upper garment must look like cloth resting on a human body.

## 5. PHYSICALLY PLAUSIBLE CLOTH DRAPING

Whenever technically feasible, use Blender's cloth simulation workflow or an equivalent physically informed draping method.

Preferred process:

1. Construct a garment-shaped mesh using plausible sewing patterns or equivalent panel geometry.
2. Position garment panels accurately around the human body.
3. Create appropriate seam connections and closed garment sections where needed.
4. Configure collision geometry for the human body.
5. Simulate the cloth settling naturally under gravity.
6. Preserve necessary contact and support points.
7. Bake the resulting cloth simulation when supported.
8. Inspect the settled geometry for intersections, floating sections, and unnatural folds.
9. Refine the resulting cloth shape.
10. Convert or preserve the result in an editable and reusable form as appropriate.

If Blender cloth simulation is unsupported or unreliable through the currently available MCP tools, create a geometrically informed garment with realistic anatomical fitting and physically plausible draping.

Do not claim that cloth simulation was completed unless it was actually performed and verified.

## 6. REALISTIC FABRIC FOLDS

Fabric folds must be driven by garment construction, gravity, body shape, and tension.

Use a combination of:

- Primary folds: large structural draping.
- Secondary folds: medium-sized tension and compression wrinkles.
- Tertiary folds: subtle fabric irregularities and fine surface details.

Create natural fold patterns around:

- Shoulders and upper arms.
- Armpits and sleeve attachments.
- Elbows and wrists.
- Chest and waist.
- Hips and knees.
- Cloth overlaps.
- Lower garment edges.

**IMPORTANT RULES:**

- Avoid perfectly uniform or equally spaced folds.
- Avoid excessive procedural noise.
- Avoid random folds unrelated to physical fabric behavior.
- Avoid overly smooth, plastic-looking surfaces.
- Avoid exaggerated wrinkles everywhere.
- Keep folds subtle, organic, and consistent with realistic fabric weight.
- Fold size and frequency must match the clothing material and garment type.

Different fabrics should behave differently.

## 7. REALISTIC WHITE FABRIC MATERIAL

Create physically based white cloth materials.

Materials should have:

- Natural off-white to clean-white coloration.
- Non-metallic appearance.
- High but plausible fabric roughness.
- Subtle woven textile texture.
- Very subtle normal and bump variation.
- Realistic light response.
- No plastic shine.
- No exaggerated transparency.
- No excessive surface noise.

Different garment types may use different textile weights and stiffness.

Thin ihram cloth should hang differently from a thicker gamis or abaya.

Use only geometry, materials, and modifiers actually supported by the Blender environment.

## 8. MESH QUALITY

The assets must be production-oriented.

Requirements:

- Clean topology.
- Adequate geometric resolution for smooth cloth deformation.
- No unnecessary excessive polygon density.
- No disconnected accidental geometry.
- No visible self-intersections.
- No severe body intersections.
- Correct face normals.
- Smooth shading without destroying important garment edges.
- Plausible cloth thickness.
- Separate identifiable garment objects.
- Properly named meshes and collections.
- Appropriate garment pivots and transforms.

Where applicable, retain compatibility with the existing armature.

If an armature exists, assess appropriate skin weighting and deformability without destroying the cloth's natural silhouette.

Do not apply destructive operations to character rigs.

## 9. VISUAL REALISM VALIDATION

Do not stop after the mesh is generated.

You MUST inspect the clothing visually using Blender MCP capabilities.

Check the garment from:

1. Front view.
2. Side view.
3. Rear view.
4. Three-quarter perspective.
5. Shoulder close-up.
6. Waist and cloth overlap close-up.
7. Full-body perspective.

For every garment, verify:

- Does it look like real clothing worn by a human?
- Does the silhouette follow the character naturally?
- Are shoulders soft and anatomically correct?
- Do the sleeves look properly constructed?
- Does gravity affect the hanging fabric convincingly?
- Are folds organic and physically plausible?
- Does the garment maintain a modest but realistic loose fit?
- Are cloth-to-body collisions acceptable?
- Is the garment recognizably different from a primitive cylinder or cone?

If any answer is NO, refine the garment before declaring completion.

## 10. IMPLEMENTATION THROUGH BLENDER MCP

You are operating through Blender MCP and may use Blender Python when the connected tools support it.

Follow this execution strategy:

1. Inspect the currently available Blender MCP tools and scene.
2. Determine which garment-generation operations are feasible.
3. Establish a safe, non-destructive working structure.
4. Build or repair one garment at a time.
5. Use anatomically informed geometry construction.
6. Apply cloth simulation or an equivalent draping technique when feasible.
7. Inspect the actual result.
8. Correct unnatural silhouettes.
9. Repeat until the garment meets the visual criteria.
10. Save the result in the appropriate Blender project.

Prefer meaningful geometric corrections over simply adding subdivision modifiers.

Subdivision Surface alone does not make unrealistic geometry realistic.

Solidify alone does not make a primitive cylinder into convincing clothing.

Random noise displacement alone does not create realistic fabric folds.

Do not use those techniques as shortcuts for proper garment modeling.

## 11. REQUIRED FINAL OUTPUT

Organize the assets into clearly labeled collections:

- HAJJ_MALE_GAMIS
- HAJJ_MALE_IHRAM_IZAR
- HAJJ_MALE_IHRAM_RIDA
- HAJJ_FEMALE_GAMIS
- HAJJ_FEMALE_TUNIC
- HAJJ_FEMALE_SKIRT
- HAJJ_FEMALE_ABAYA
- HAJJ_FEMALE_KHIMAR

Each clothing asset must be editable, visually believable, and independent of unrelated scene objects.

Preserve the original Blender project.

At completion, report:

- Which assets were created or repaired.
- Whether accurate human fitting was performed.
- Whether real cloth simulation was performed.
- Which modifiers and materials were used.
- Whether visible intersections remain.
- Whether assets are ready for rigging and animation.
- Any outstanding limitations.

## 12. NON-NEGOTIABLE QUALITY STANDARD

**The final clothes must look like authentic real-world garments worn by real humans, not simplified geometric costumes.**

Prioritize:

1. Anatomical accuracy.
2. Natural shoulder silhouette.
3. Realistic garment construction.
4. Body-to-cloth contact.
5. Gravity-based draping.
6. Organic fabric folds.
7. Plausible fabric thickness.
8. High-quality clean mesh.

Take an iterative approach. Do not produce all garments as identical silhouettes with different lengths.

**IMPORTANT FINAL INSTRUCTION:**

If existing clothing is cylindrical, unnaturally stiff, or floating away from the body, rebuild the underlying garment geometry when necessary rather than attempting to hide the defects with smoothing, subdivision, or procedural wrinkles.

Realism is more important than generating assets quickly.

Buat satu pakaian terlebih dahulu. Misalnya mulai dari gamis pria. Jangan langsung membuat ketujuh jenis pakaian sekaligus karena hasilnya lebih sulit dievaluasi dan diperbaiki.



Gunakan manusia yang sudah ada di Blender sebagai acuan. AI harus menyesuaikan mesh pakaian dengan karakter itu, bukan menggunakan perkiraan ukuran manusia.



Jangan mengandalkan Subdivision Surface saja. Modifier tersebut hanya menghaluskan mesh, bukan membuat kain otomatis jatuh secara realistis.



Gunakan cloth simulation bila memungkinkan. Akan jauh lebih baik jika pakaian dibentuk dari pola kain yang benar, kemudian disimulasikan agar jatuh mengikuti tubuh.



Periksa hasil sebelum melanjutkan. Mintalah screenshot tampak depan, samping, belakang, dan close-up bahu
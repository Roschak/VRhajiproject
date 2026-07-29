import re

file_path = r'D:\sertifikat\VRhajisource\src\VRHaji.Web\wwwroot\js\vr\builders.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace miqatGroup.add(bld) inside addArabHouse with root.add(bld)
# Actually, it's easier to change addArabHouse to accept a parent group
old_house_func = '''    function addArabHouse(x, z, facingX, isDistant) {
        const h = isDistant ? (5 + Math.random() * 10) : (6 + Math.random() * 6);'''

new_house_func = '''    function addArabHouse(parent, x, z, facingX, isDistant) {
        const h = isDistant ? (5 + Math.random() * 10) : (6 + Math.random() * 6);'''

content = content.replace(old_house_func, new_house_func)
content = content.replace("miqatGroup.add(bld);", "parent.add(bld);")

# Find the section to replace the loops
target_start = "    // ================================================================\n    // 4a. BARIS PERTAMA"
target_end = "    }\n\n    // ================================================================"
# Wait, the distant horizon is the end of the residential blocks.
target_end_full = "miqatGroup.add(mesh(new THREE.BoxGeometry(10, h2, 8), dMat, x, h2/2, -290 - Math.random() * 20, { cast: false }));\n    }"

pattern = re.compile(re.escape(target_start) + r".*?" + re.escape(target_end_full), re.DOTALL)

replacement = '''    // ================================================================
    // 4a-d. PEMUKIMAN KHAS ARAB (Dioptimasi dengan ChunkManager VR)
    // ================================================================
    
    // Chunk Utara (Depan Jauh)
    engine.chunkManager.registerChunk('miqat-utara', new THREE.Vector3(0, 0, 180), 200, 250, (root) => {
        for(let x = -180; x <= 180; x += 16) if(Math.abs(x) > 20) addArabHouse(root, x, 115, false, false);
        for(let x = -200; x <= 200; x += 14) addArabHouse(root, x, 140, false, false);
        for(let x = -250; x <= 250; x += 16) {
            addArabHouse(root, x, 195, false, true);
            addArabHouse(root, x, 230, false, true);
        }
        const distantMat = new THREE.MeshStandardMaterial({ color: 0xccc4b4, roughness: 1.0 });
        for (let x = -320; x <= 320; x += 12) {
            const h = 8 + Math.random() * 16;
            root.add(mesh(new THREE.BoxGeometry(10, h, 8), distantMat, x, h/2, 280 + Math.random() * 20, { cast: false }));
        }
    });

    // Chunk Selatan (Belakang Jauh)
    engine.chunkManager.registerChunk('miqat-selatan', new THREE.Vector3(0, 0, -180), 200, 250, (root) => {
        for(let x = -180; x <= 180; x += 16) if(Math.abs(x) > 20) addArabHouse(root, x, -145, false, false);
        for(let x = -200; x <= 200; x += 14) addArabHouse(root, x, -170, false, false);
        for(let x = -250; x <= 250; x += 16) {
            addArabHouse(root, x, -210, false, true);
            addArabHouse(root, x, -245, false, true);
        }
        const distantMat2 = new THREE.MeshStandardMaterial({ color: 0xd4cfc5, roughness: 1.0 });
        for (let x = -320; x <= 320; x += 12) {
            const h = 8 + Math.random() * 16;
            root.add(mesh(new THREE.BoxGeometry(10, h, 8), distantMat2, x, h/2, -290 - Math.random() * 20, { cast: false }));
        }
    });

    // Chunk Timur (Kanan Jauh)
    engine.chunkManager.registerChunk('miqat-timur', new THREE.Vector3(180, 0, 0), 200, 250, (root) => {
        for(let z = -120; z <= 90; z += 16) if(Math.abs(z) > 20) addArabHouse(root, 115, z, true, false);
        for(let z = -160; z <= 130; z += 14) addArabHouse(root, 140, z, true, false);
        for(let z = -230; z <= 220; z += 16) {
            addArabHouse(root, 195, z, true, true);
            addArabHouse(root, 230, z, true, true);
        }
    });

    // Chunk Barat (Kiri Jauh)
    engine.chunkManager.registerChunk('miqat-barat', new THREE.Vector3(-180, 0, 0), 200, 250, (root) => {
        for(let z = -120; z <= 90; z += 16) if(Math.abs(z) > 20) addArabHouse(root, -115, z, true, false);
        for(let z = -160; z <= 130; z += 14) addArabHouse(root, -140, z, true, false);
        for(let z = -230; z <= 220; z += 16) {
            addArabHouse(root, -195, z, true, true);
            addArabHouse(root, -230, z, true, true);
        }
    });'''

new_content, count = pattern.subn(replacement, content)

if count > 0:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully patched Miqat buildings to use ChunkManager!")
else:
    print("Could not find the Miqat building loops to replace.")


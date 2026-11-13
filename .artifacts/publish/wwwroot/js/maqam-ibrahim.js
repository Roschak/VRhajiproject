window.renderMaqamIbrahim3D = (canvas) => {
    if (!canvas) return;

    // 1. Inisialisasi Scene, Camera, & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a); // Latar belakang malam yang gelap dan elegan

    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 5, 12);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Wajib: Mengaktifkan Shadow dengan kualitas Soft Shadow
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Handle Resize
    window.addEventListener('resize', () => {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });

    // 2. Pencahayaan (Studio Lighting)
    // Fill Light lembut
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Key Light (Matahari / Lampu Utama Emas) dari sudut atas
    const mainLight = new THREE.DirectionalLight(0xffdfaa, 2.5);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 25;
    scene.add(mainLight);

    // Back Light untuk memberikan rim light dramatis
    const backLight = new THREE.DirectionalLight(0x7aa5ff, 1.0);
    backLight.position.set(-5, 6, -5);
    scene.add(backLight);

    // Grup Utama
    const maqamGroup = new THREE.Group();
    scene.add(maqamGroup);

    // 3. Material Premium (MeshPhysicalMaterial)
    const goldMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xd4af37, // Emas mewah
        metalness: 1.0,
        roughness: 0.15,
        clearcoat: 0.5,
        clearcoatRoughness: 0.2,
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.95, // Kaca tembus pandang
        ior: 1.5,           // Index of Refraction kaca
        opacity: 1.0,
        transparent: true,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        side: THREE.DoubleSide
    });

    const stoneMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x9a9a9a, // Perak keabuan pudar
        metalness: 0.0,
        roughness: 1.0,
        bumpScale: 0.02
    });

    const baseMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xf0f0f0, // Putih marmer
        metalness: 0.1,
        roughness: 0.8
    });

    // 4. Pemodelan (Sculpting)

    // a. Alas (Base) - Silinder berundak
    const base1Geom = new THREE.CylinderGeometry(2.4, 2.4, 0.4, 64);
    const base1 = new THREE.Mesh(base1Geom, baseMaterial);
    base1.position.y = 0.2;
    base1.castShadow = true;
    base1.receiveShadow = true;
    maqamGroup.add(base1);

    const base2Geom = new THREE.CylinderGeometry(2.1, 2.1, 0.3, 64);
    const base2 = new THREE.Mesh(base2Geom, baseMaterial);
    base2.position.y = 0.55;
    base2.castShadow = true;
    base2.receiveShadow = true;
    maqamGroup.add(base2);

    // b. Kerangka Utama (Sangkar oktagonal/segi delapan)
    const sides = 8;
    const radius = 1.8;
    const height = 3.5;
    const cageBaseY = 0.7;

    // Ring bawah & atas
    const ringGeom = new THREE.TorusGeometry(radius, 0.08, 16, sides);
    const bottomRing = new THREE.Mesh(ringGeom, goldMaterial);
    bottomRing.position.y = cageBaseY;
    bottomRing.rotation.x = Math.PI / 2;
    bottomRing.castShadow = true;
    bottomRing.receiveShadow = true;
    maqamGroup.add(bottomRing);

    const topRing = bottomRing.clone();
    topRing.position.y = cageBaseY + height;
    maqamGroup.add(topRing);

    // Pilar & Kaca Pelindung
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        
        // Pilar Emas
        const pillarGeom = new THREE.CylinderGeometry(0.08, 0.08, height, 32);
        const pillar = new THREE.Mesh(pillarGeom, goldMaterial);
        pillar.position.set(Math.cos(angle) * radius, cageBaseY + height / 2, Math.sin(angle) * radius);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        maqamGroup.add(pillar);

        // Kaca Pelindung di antara pilar
        const nextAngle = ((i + 1) / sides) * Math.PI * 2;
        const midAngle = (angle + nextAngle) / 2;
        const apothem = radius * Math.cos(Math.PI / sides);
        const panelWidth = 2 * radius * Math.sin(Math.PI / sides) - 0.1; // Sedikit gap untuk pilar
        
        const glassGeom = new THREE.PlaneGeometry(panelWidth, height);
        const glass = new THREE.Mesh(glassGeom, glassMaterial);
        glass.position.set(Math.cos(midAngle) * apothem, cageBaseY + height / 2, Math.sin(midAngle) * apothem);
        glass.rotation.y = -midAngle + Math.PI / 2;
        glass.castShadow = true;
        glass.receiveShadow = true;
        maqamGroup.add(glass);
    }

    // c. Kubah (Dome) menggunakan LatheGeometry
    const points = [];
    const domeHeight = 2.0;
    // Profil membubut melengkung elegan ke atas
    for (let i = 0; i <= 32; i++) {
        const t = i / 32;
        // Rumus eksponensial/kuadratik untuk melengkungkan kubah khas Timur Tengah
        const x = (1 - Math.pow(t, 1.5)) * radius * 0.95; 
        const y = t * domeHeight;
        points.push(new THREE.Vector2(x, y));
    }
    const domeGeom = new THREE.LatheGeometry(points, 64);
    const dome = new THREE.Mesh(domeGeom, goldMaterial);
    dome.position.y = cageBaseY + height;
    dome.castShadow = true;
    dome.receiveShadow = true;
    maqamGroup.add(dome);

    // Ornamen bulan sabit/bola di puncak kubah
    const finialGeom = new THREE.SphereGeometry(0.2, 32, 32);
    const finial = new THREE.Mesh(finialGeom, goldMaterial);
    finial.position.y = cageBaseY + height + domeHeight;
    finial.castShadow = true;
    finial.receiveShadow = true;
    maqamGroup.add(finial);

    // d. Batu Suci (Inner Stone)
    const stoneGeom = new THREE.DodecahedronGeometry(0.6, 1);
    
    // Manipulasi vertex agar lebih terlihat organik seperti batu pahatan asli
    const positions = stoneGeom.attributes.position;
    for(let i = 0; i < positions.count; i++) {
        const vx = positions.getX(i);
        const vy = positions.getY(i);
        const vz = positions.getZ(i);
        // Menambahkan sedikit "noise" asimetris
        positions.setXYZ(
            i, 
            vx + (Math.random() - 0.5) * 0.08, 
            vy + (Math.random() - 0.5) * 0.08, 
            vz + (Math.random() - 0.5) * 0.08
        );
    }
    stoneGeom.computeVertexNormals();

    const stone = new THREE.Mesh(stoneGeom, stoneMaterial);
    stone.position.y = cageBaseY + (height / 2);
    stone.castShadow = true;
    stone.receiveShadow = true;
    maqamGroup.add(stone);

    // Pusatkan seluruh grup sedikit ke bawah agar pas di kamera
    maqamGroup.position.y = -2;

    // 5. Animasi (Staging)
    const animate = () => {
        requestAnimationFrame(animate);
        // Rotasi perlahan untuk pameran 360 derajat
        maqamGroup.rotation.y += 0.003;
        renderer.render(scene, camera);
    };

    animate();
}

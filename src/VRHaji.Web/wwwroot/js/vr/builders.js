/**
 * VR Education Haji & Umrah — Environment Builders
 * Semua lingkungan dibangun prosedural (PBR material + instancing)
 * agar tanpa dependensi asset eksternal namun tetap berkualitas tinggi.
 */
import { THREE, Tex } from './engine.js';

const DEG = Math.PI / 180;

function mesh(geo, mat, x = 0, y = 0, z = 0, { cast = true, receive = true, ry = 0 } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.castShadow = cast;
    m.receiveShadow = receive;
    return m;
}

/* ============ Elemen umum ============ */

export function palmTree(mats, scale = 1) {
    const g = new THREE.Group();
    const trunk = mesh(new THREE.CylinderGeometry(0.12 * scale, 0.2 * scale, 4 * scale, 7), mats.wood, 0, 2 * scale, 0);
    g.add(trunk);
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x2e7d3a, roughness: 0.85, side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
        const frond = mesh(new THREE.ConeGeometry(0.1 * scale, 2.4 * scale, 4), frondMat, 0, 4.1 * scale, 0, { cast: false });
        frond.rotation.z = 55 * DEG;
        frond.rotation.y = i * (Math.PI * 2 / 7);
        frond.geometry.translate(0, 1.1 * scale, 0);
        g.add(frond);
    }
    return g;
}

export function neemTree(mats, scale = 1) {
    const g = new THREE.Group();
    // Batang pohon cokelat tua bertekstur
    const trunkGeo = new THREE.CylinderGeometry(0.25 * scale, 0.4 * scale, 3.5 * scale, 9);
    const trunk = mesh(trunkGeo, mats.wood, 0, 1.75 * scale, 0);
    g.add(trunk);
    
    // Tajuk daun lebat khas pohon mimba/Soekarno di Arafah (hijau gelap, spherical cluster)
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1f5c35, roughness: 0.95 });
    const leafBase = mesh(new THREE.DodecahedronGeometry(1.8 * scale, 1), leafMat, 0, 4.2 * scale, 0);
    g.add(leafBase);
    
    // Tambahkan beberapa gumpalan daun di sekitar tajuk utama agar lebih organik
    for(let i=0; i<4; i++) {
        const ang = i * (Math.PI/2);
        const cluster = mesh(new THREE.DodecahedronGeometry(1.2 * scale, 1), leafMat, 
            Math.cos(ang) * 0.9 * scale, 
            3.8 * scale + Math.random() * 0.6 * scale, 
            Math.sin(ang) * 0.9 * scale);
        g.add(cluster);
    }
    return g;
}

export function lampPost(mats, h = 6) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.08, 0.12, h, 8), mats.darkGrey, 0, h / 2, 0));
    g.add(mesh(new THREE.SphereGeometry(0.28, 12, 10), mats.emissiveWarm, 0, h + 0.2, 0, { cast: false }));
    return g;
}

export function minaret(mats, h = 40, r = 1.6) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(r * 0.75, r, h * 0.62, 12), mats.cream, 0, h * 0.31, 0));
    g.add(mesh(new THREE.CylinderGeometry(r * 0.95, r * 0.95, h * 0.05, 12), mats.white, 0, h * 0.64, 0)); // balkon
    g.add(mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.62, h * 0.24, 12), mats.cream, 0, h * 0.78, 0));
    g.add(mesh(new THREE.ConeGeometry(r * 0.55, h * 0.14, 12), mats.gold, 0, h * 0.97, 0));
    g.add(mesh(new THREE.SphereGeometry(0.35, 10, 8), mats.gold, 0, h * 1.05, 0, { cast: false }));
    return g;
}

/** Deret lengkungan (arcade) sebagai InstancedMesh — gaya masjid. */
export function arcade(mats, { count, spacing = 6, height = 9, depth = 2.5 }) {
    const g = new THREE.Group();
    const colGeo = new THREE.CylinderGeometry(0.45, 0.5, height * 0.7, 10);
    const archGeo = new THREE.TorusGeometry(spacing * 0.32, 0.35, 8, 16, Math.PI);
    const cols = new THREE.InstancedMesh(colGeo, mats.marbleTile, count + 1);
    const arches = new THREE.InstancedMesh(archGeo, mats.cream, count);
    cols.castShadow = arches.castShadow = true;
    cols.receiveShadow = arches.receiveShadow = true;
    const m = new THREE.Matrix4();
    for (let i = 0; i <= count; i++) {
        m.makeTranslation(i * spacing - (count * spacing) / 2, height * 0.35, 0);
        cols.setMatrixAt(i, m);
        if (i < count) {
            m.makeTranslation(i * spacing - (count * spacing) / 2 + spacing / 2, height * 0.7, 0);
            arches.setMatrixAt(i, m);
        }
    }
    // atap balok di atas arcade
    const roof = mesh(new THREE.BoxGeometry(count * spacing + 2, 0.8, depth), mats.cream, 0, height * 0.7 + spacing * 0.32 + 0.5, 0);
    g.add(cols, arches, roof);
    return g;
}

/* ============ KA'BAH & MASJIDIL HARAM ============ */

export function kaaba(mats) {
    // Skala nyata (§6): tinggi 13.1 m; sisi 12.86 m (sumbu X, sisi Hajar Aswad & pintu)
    // dan 11.03 m (sumbu Z). Sumber: Wikipedia "Kaaba" & data resmi Masjidil Haram.
    const W = 12.86, D = 11.03, H = 13.1;
    const hw = W / 2, hd = D / 2;
    const g = new THREE.Group();
    const body = mesh(new THREE.BoxGeometry(W, H, D), mats.kiswah, 0, H / 2, 0);
    g.add(body);
    // Pintu emas (Bab) — tinggi ± 3.3 m, terangkat ± 2.2 m dari lantai, dekat sudut timur
    const door = mesh(new THREE.BoxGeometry(1.9, 3.3, 0.15), mats.gold, 2.2, 2.2 + 1.65, hd + 0.08, { cast: false });
    g.add(door);
    // Hajar Aswad — sudut timur (frame perak), ± 1.5 m di atas lantai
    const hajar = new THREE.Group();
    hajar.add(mesh(new THREE.TorusGeometry(0.45, 0.14, 10, 20), mats.steel, 0, 0, 0, { cast: false }));
    hajar.add(mesh(new THREE.SphereGeometry(0.26, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.3 }), 0, 0, 0, { cast: false }));
    hajar.position.set(hw - 0.1, 1.5, hd - 0.1);
    g.add(hajar);
    g.userData.hajarAswad = hajar;
    // Talang emas (mizab) di puncak dinding barat laut
    g.add(mesh(new THREE.BoxGeometry(0.6, 0.3, 2.4), mats.gold, 0, H + 0.2, -hd - 0.6, { cast: false }));
    // Hijr Ismail — dinding setengah lingkaran (Hatim) di sisi barat laut
    const hijr = mesh(new THREE.CylinderGeometry(4.6, 4.6, 1.32, 32, 1, true, 0, Math.PI), mats.marble, 0, 0.66, -hd - 4, { cast: false });
    hijr.rotation.y = Math.PI;
    g.add(hijr);
    // Shadharwan (alas miring) sedikit lebih lebar dari denah Ka'bah
    g.add(mesh(new THREE.BoxGeometry(W + 0.9, 0.5, D + 0.9), mats.grey, 0, 0.25, 0));
    g.userData.footprint = { hw, hd };
    return g;
}

export function maqamIbrahim(mats) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.5, 12), mats.gold, 0, 0.25, 0));
    const dome = mesh(new THREE.SphereGeometry(1.0, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshPhysicalMaterial({
            color: 0xf7e7b0, metalness: 0.6, roughness: 0.1,
            transmission: 0.5, transparent: true, opacity: 0.85
        }), 0, 0.5, 0, { cast: false });
    g.add(dome);
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 8), mats.gold, 0, 1.2, 0, { cast: false }));
    g.add(mesh(new THREE.SphereGeometry(0.22, 10, 8), mats.gold, 0, 2.0, 0, { cast: false }));
    return g;
}

/**
 * Masjidil Haram: lantai mataf, Ka'bah, arcade keliling, minaret, garis start tawaf.
 * @returns {object} referensi objek penting
 */
export function masjidilHaram(engine, { crowdInMataf = false } = {}) {
    const { scene, mats } = engine;
    // Lantai mataf marmer putih (dingin — sesuai marmer asli)
    const floor = engine.ground(220, mats.marble);
    floor.name = 'mataf-floor';

    const kb = kaaba(mats);
    scene.add(kb);

    // Garis coklat mulai tawaf — dari sudut Hajar Aswad ke arah luar
    const line = mesh(new THREE.BoxGeometry(0.5, 0.02, 34),
        new THREE.MeshStandardMaterial({ color: 0x6b4a1f, roughness: 0.9 }), 14, 0.02, 5.3, { cast: false });
    line.rotation.y = Math.PI / 2;
    line.position.set(24, 0.02, 5.3);
    scene.add(line);

    const maqam = maqamIbrahim(mats);
    maqam.position.set(11, 0, 8.5);
    scene.add(maqam);

    // Arcade dua lantai mengelilingi mataf (4 sisi)
    const R = 78;
    for (let side = 0; side < 4; side++) {
        for (let lvl = 0; lvl < 2; lvl++) {
            const a = arcade(mats, { count: 24, spacing: 6.6, height: 9 });
            a.position.y = lvl * 8.2;
            const ang = side * Math.PI / 2;
            a.rotation.y = ang;
            a.position.x += Math.sin(ang) * R * (side % 2 === 0 ? 0 : 1);
            // posisi per sisi
            if (side === 0) a.position.z = -R;
            if (side === 1) a.position.x = -R;
            if (side === 2) a.position.z = R;
            if (side === 3) a.position.x = R;
            scene.add(a);
        }
    }

    // Penambahan Detail: Karpet Merah, Rak Mushaf Al-Qur'an, dan Dispenser Zamzam
    const quranRack = new THREE.Group();
    quranRack.add(mesh(new THREE.BoxGeometry(0.8, 1.2, 0.4), mats.wood, 0, 0.6, 0));
    quranRack.add(mesh(new THREE.BoxGeometry(0.7, 0.05, 0.35), mats.steel, 0, 0.4, 0, {cast: false}));
    quranRack.add(mesh(new THREE.BoxGeometry(0.7, 0.05, 0.35), mats.steel, 0, 0.8, 0, {cast: false}));
    
    const zamzam = new THREE.Group();
    zamzam.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.9, 12), mats.cream, 0, 0.45, 0));
    zamzam.add(mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 12), mats.grey, 0, 0.95, 0));
    zamzam.add(mesh(new THREE.BoxGeometry(0.05, 0.05, 0.1), mats.steel, 0, 0.3, 0.28));
    
    const carpetMat = new THREE.MeshStandardMaterial({ color: 0x8a2424, roughness: 0.9 });
    for (let side = 0; side < 4; side++) {
        const ang = side * Math.PI / 2;
        // Karpet sholat membentang di bawah arcade
        const carpet = mesh(new THREE.BoxGeometry(140, 0.02, 12), carpetMat, 0, 0.01, 0, { cast: false });
        carpet.rotation.y = ang;
        if (side === 0) carpet.position.z = -R + 6;
        if (side === 1) carpet.position.x = -R + 6;
        if (side === 2) carpet.position.z = R - 6;
        if (side === 3) carpet.position.x = R - 6;
        scene.add(carpet);
        
        // Letakkan deretan rak Qur'an dan Zamzam
        for (let i = -7; i <= 7; i += 2.5) {
            if (Math.abs(i) < 2) continue; // Area tengah kosong untuk gerbang masuk
            const px = i * 8;
            const pz = -R + 2;
            const v1 = new THREE.Vector3(px, 0, pz).applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
            const v2 = new THREE.Vector3(px + 1.2, 0, pz).applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
            
            const r1 = quranRack.clone();
            r1.position.copy(v1); r1.rotation.y = ang;
            const z1 = zamzam.clone();
            z1.position.copy(v2); z1.rotation.y = ang;
            
            scene.add(r1, z1);
        }
    }
    // Minaret di 4 sudut
    for (const [mx, mz] of [[-R, -R], [R, -R], [-R, R], [R, R]]) {
        const mn = minaret(mats, 52, 2);
        mn.position.set(mx, 0, mz);
        scene.add(mn);
    }
    // Menara jam (Abraj Al-Bait) siluet di kejauhan
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x8a7f6d, roughness: 0.8 });
    const tower = mesh(new THREE.BoxGeometry(34, 180, 34), towerMat, 40, 90, 190);
    scene.add(tower);
    const clock = mesh(new THREE.BoxGeometry(20, 20, 1.5), mats.emissiveWarm, 40, 150, 172.5, { cast: false });
    scene.add(clock);
    const spire = mesh(new THREE.ConeGeometry(6, 40, 6), towerMat, 40, 200, 190);
    scene.add(spire);

    // Lampu sorot mataf (malam)
    if (engine.envPreset === 'night' || engine.envPreset === 'dawn') {
        for (const [lx, lz] of [[-40, -40], [40, -40], [-40, 40], [40, 40]]) {
            engine.addPointLamp(lx, 18, lz, { intensity: 160, distance: 130 });
        }
        engine.addPointLamp(0, 22, 0, { color: 0xfff6dd, intensity: 200, distance: 90 });
    }

    // Area jalan: mataf berbentuk cincin di sekitar Ka'bah + pelataran
    engine.addWalkCircle(0, 0, 70, 0);
    // badan Ka'bah (skala nyata 12.86 × 11.03 m) + sedikit margin shadharwan
    engine.addBlocker(-7.0, -6.1, 7.0, 6.1);
    engine.addBlocker(9.6, 7.2, 12.4, 9.9);       // maqam ibrahim

    engine.configureMinimap({
        scale: 1.0, center: { x: 0, z: 0 },
        features: [
            { type: 'square', x: 0, z: 0, color: '#111111' },
            { type: 'point', x: 11, z: 8.5, color: '#e8c96a' },
            { type: 'point', x: 24, z: 5.3, color: '#8a5a2a' }
        ]
    });

    return { kaaba: kb, maqam, startLine: line, hajarAswad: kb.userData.hajarAswad };
}

/* ============ MAS'A (SHAFA–MARWAH) ============ */

export function masaa(engine) {
    const { scene, mats } = engine;
    const L = 140, W = 18; // Diperpanjang & diperlebar agar proporsional
    engine.ground(400, mats.marbleTile);

    const masaaGroup = new THREE.Group();

    // Lantai koridor marmer putih mengkilap
    const floor = mesh(new THREE.BoxGeometry(L + 34, 0.1, W + 6), mats.marbleTile, 0, 0.05, 0, { cast: false });
    masaaGroup.add(floor);
    
    // Garis lantai pembatas jalur (hitam/gelap)
    masaaGroup.add(mesh(new THREE.BoxGeometry(L + 20, 0.12, 0.4), mats.darkGrey, 0, 0.05, 2, { cast: false }));
    masaaGroup.add(mesh(new THREE.BoxGeometry(L + 20, 0.12, 0.4), mats.darkGrey, 0, 0.05, -2, { cast: false }));

    const wallH = 12;
    // Atap utama dengan dekorasi
    masaaGroup.add(mesh(new THREE.BoxGeometry(L + 34, 0.8, W + 8), mats.cream, 0, wallH + 0.4, 0));
    
    // Panel dekorasi atap (coffered ceiling ilusi)
    for (let i = -L/2; i <= L/2; i += 8) {
        masaaGroup.add(mesh(new THREE.BoxGeometry(7, 0.2, W + 4), mats.white, i, wallH - 0.1, 0, { cast: false }));
    }

    // Dinding samping & Jendela lengkung
    for (const s of [-1, 1]) {
        const wall = mesh(new THREE.BoxGeometry(L + 34, wallH, 0.8), mats.cream, 0, wallH / 2, s * (W / 2 + 3.4));
        masaaGroup.add(wall);
        
        // Dekorasi pilar tempel di dinding
        for (let i = -L/2; i <= L/2; i += 8) {
            masaaGroup.add(mesh(new THREE.BoxGeometry(0.8, wallH, 1.0), mats.marble, i, wallH/2, s * (W / 2 + 3.2)));
            // Jendela emissive lengkung
            masaaGroup.add(mesh(new THREE.BoxGeometry(2.8, 4.0, 0.2), mats.emissiveWarm, i + 4, 6.0, s * (W / 2 + 3.0), { cast: false }));
        }
    }

    // Kolom/Pilar tengah tebal bergaya Masjidil Haram (Marmer kotak + Emas)
    const colGroup = new THREE.Group();
    colGroup.add(mesh(new THREE.BoxGeometry(1.2, wallH, 1.2), mats.marble, 0, wallH/2, 0)); // Badan pilar
    colGroup.add(mesh(new THREE.BoxGeometry(1.3, 0.4, 1.3), mats.gold, 0, 0.2, 0, {cast: false})); // Basis emas
    colGroup.add(mesh(new THREE.BoxGeometry(1.25, 0.3, 1.25), mats.gold, 0, wallH/2, 0, {cast: false})); // Pita emas tengah
    colGroup.add(mesh(new THREE.BoxGeometry(1.4, 0.6, 1.4), mats.gold, 0, wallH - 0.3, 0, {cast: false})); // Mahkota atas
    
    // Pagar pemisah jalur di tengah (Tinggi sepinggang)
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5, metalness: 0.8 });
    masaaGroup.add(mesh(new THREE.BoxGeometry(L - 10, 1.2, 0.6), mats.marble, 0, 0.6, 0)); // Tembok bawah pagar
    masaaGroup.add(mesh(new THREE.BoxGeometry(L - 10, 0.1, 0.8), mats.gold, 0, 1.25, 0)); // List emas
    
    // Teralis pagar
    for(let i = -L/2 + 6; i <= L/2 - 6; i += 2) {
        masaaGroup.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), fenceMat, i, 1.6, 0));
    }
    masaaGroup.add(mesh(new THREE.BoxGeometry(L - 10, 0.1, 0.1), fenceMat, 0, 1.9, 0)); // Pegangan atas

    for (let i = 0; i < 16; i++) {
        const px = -L / 2 + 10 + i * (L - 20) / 15;
        const col = colGroup.clone();
        col.position.set(px, 0, 0);
        masaaGroup.add(col);
        // Blocker untuk pilar dan pagar tengah
        engine.addBlocker(px - 0.7, -0.7, px + 0.7, 0.7);
    }
    // Blocker pemisah lintasan memanjang
    engine.addBlocker(-L/2 + 5, -0.4, L/2 - 5, 0.4);

    // Bukit Shafa & Marwah — bongkahan batu granit berlapis yang kasar
    const buildHill = (cx, cz) => {
        const hill = new THREE.Group();
        // Base landai agar terlihat menyatu dengan lantai
        const baseGeo = new THREE.IcosahedronGeometry(7, 1);
        const bp = baseGeo.attributes.position;
        for (let i = 0; i < bp.count; i++) {
            bp.setXYZ(i, bp.getX(i), Math.max(0, bp.getY(i)) * 0.35, bp.getZ(i));
        }
        baseGeo.computeVertexNormals();
        hill.add(mesh(baseGeo, mats.rock, 0, -0.2, 0));
        
        // Tumpukan bongkahan batu bergerigi di atasnya
        for(let i=0; i<18; i++) {
            const r = 1.2 + Math.random() * 2.8;
            const hx = (Math.random() - 0.5) * 9;
            const hz = (Math.random() - 0.5) * 9;
            const dist = Math.hypot(hx, hz);
            if (dist > 5) continue; // Fokuskan ke tengah
            const hy = (1 - (dist / 5)) * 4.5 + Math.random() * 1.5;
            const boulder = mesh(new THREE.DodecahedronGeometry(r, 0), mats.rock, hx, Math.max(0.2, hy), hz);
            boulder.rotation.set(Math.random(), Math.random(), Math.random());
            hill.add(boulder);
        }
        hill.position.set(cx, 0, cz);
        return hill;
    };
    const shafa = buildHill(-L / 2 - 8, 0);
    const marwah = buildHill(L / 2 + 8, 0);
    
    // Pagar kaca dengan rangka besi (Stainless Steel Handrail) mengelilingi batu
    const glassFenceGroup = new THREE.Group();
    const rF = 7.5; // Radius pagar
    
    const buildFence = (cx, ryOffset) => {
        const fGrp = new THREE.Group();
        // Kaca tebal melengkung
        const glassGeo = new THREE.CylinderGeometry(rF, rF, 1.2, 32, 1, true, 0, Math.PI);
        fGrp.add(mesh(glassGeo, mats.glass, 0, 0.7, 0, { cast: false }));
        // Tiang besi vertikal (Stanchion)
        for(let a=0; a<=Math.PI; a+=Math.PI/10) {
            fGrp.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8), mats.steel, Math.cos(a)*rF, 0.7, Math.sin(a)*rF));
        }
        // Pegangan atas melengkung (Handrail)
        const railGeo = new THREE.TorusGeometry(rF, 0.08, 8, 32, Math.PI);
        const rail = mesh(railGeo, mats.steel, 0, 1.4, 0);
        rail.rotation.x = Math.PI/2;
        fGrp.add(rail);
        
        fGrp.position.set(cx, 0, 0);
        fGrp.rotation.y = ryOffset;
        glassFenceGroup.add(fGrp);
    };
    buildFence(-L / 2 - 8, Math.PI/2); // Menghadap timur
    buildFence(L / 2 + 8, -Math.PI/2); // Menghadap barat
    masaaGroup.add(shafa, marwah, glassFenceGroup);

    // Zona lampu hijau (Milain Akhdharain - area lari kecil)
    const greenLightMat = new THREE.MeshStandardMaterial({
        color: 0x27c96a, emissive: 0x27c96a, emissiveIntensity: 2.5
    });
    const greenFloorMat = new THREE.MeshStandardMaterial({ color: 0x1a5c39, emissive: 0x114d2c, emissiveIntensity: 0.4 });
    
    for (const gx of [-16, 16]) {
        // Lampu neon hijau memanjang di plafon
        masaaGroup.add(mesh(new THREE.BoxGeometry(6, 0.2, W + 6), greenLightMat, gx, wallH - 0.2, 0, { cast: false }));
        // Lampu vertikal di dinding
        masaaGroup.add(mesh(new THREE.BoxGeometry(6, wallH - 4, 0.2), greenLightMat, gx, wallH/2, -(W / 2 + 3.2), { cast: false }));
        masaaGroup.add(mesh(new THREE.BoxGeometry(6, wallH - 4, 0.2), greenLightMat, gx, wallH/2, (W / 2 + 3.2), { cast: false }));
        // Ambient light hijau
        engine.addPointLamp(gx, wallH - 2, 0, { color: 0x27c96a, intensity: 100, distance: 30 });
    }
    
    // Lantai hijau
    const greenFloor = mesh(new THREE.BoxGeometry(38, 0.02, W + 6), greenFloorMat, 0, 0.11, 0, { cast: false });
    masaaGroup.add(greenFloor);

    // Detail Tambahan: Galon Zamzam & Rak Al-Qur'an di sisi dinding
    const zamzam = new THREE.Group();
    zamzam.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.9, 12), mats.cream, 0, 0.45, 0));
    zamzam.add(mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 12), mats.grey, 0, 0.95, 0));
    zamzam.add(mesh(new THREE.BoxGeometry(0.05, 0.05, 0.1), mats.steel, 0, 0.3, 0.28));
    
    for (const zSide of [-1, 1]) {
        for (let i = -L/2 + 15; i <= L/2 - 15; i += 12) {
            const zz = zamzam.clone();
            zz.position.set(i, 0, zSide * (W/2 + 2.5));
            zz.rotation.y = zSide > 0 ? Math.PI : 0;
            masaaGroup.add(zz);
        }
    }

    // Lampu interior reguler
    for (let i = -4; i <= 4; i++) {
        engine.addPointLamp(i * 18, wallH - 1, W/4, { intensity: 70, distance: 30 });
        engine.addPointLamp(i * 18, wallH - 1, -W/4, { intensity: 70, distance: 30 });
    }

    scene.add(masaaGroup);

    engine.addWalkRect(-L / 2 - 11, -W / 2 - 3, L / 2 + 11, W / 2 + 3);
    engine.configureMinimap({
        scale: 0.9, center: { x: 0, z: 0 },
        features: [
            { type: 'point', x: -L / 2 - 8, z: 0, color: '#37c978' },
            { type: 'point', x: L / 2 + 8, z: 0, color: '#37c978' }
        ]
    });
    return { shafaX: -L / 2 - 4, marwahX: L / 2 + 4, length: L, shafa, marwah };
}

/* ============ BANDARA ============ */

export function airport(engine, { nameSign = 'BANDARA SOEKARNO-HATTA — TERMINAL 2U', arabic = false } = {}) {
    const { scene, mats } = engine;
    engine.ground(500, mats.tarmac, -0.02);

    // Lantai terminal — marmer mengkilap khas bandara
    const floorMat = mats.marble.clone();
    floorMat.roughness = 0.16;
    floorMat.metalness = 0.06;
    const floor = mesh(new THREE.BoxGeometry(90, 0.1, 60), floorMat, 0, 0.05, 0, { cast: false });
    scene.add(floor);

    const H = 12;
    // Dinding kaca keliling
    for (const [w, d, x, z, ry] of [
        [90, 0.4, 0, -30, 0], [90, 0.4, 0, 30, 0], [0.4, 60, -45, 0, 0], [0.4, 60, 45, 0, 0]
    ]) {
        const wall = mesh(new THREE.BoxGeometry(w || 0.4, H, d || 0.4), mats.glass, x, H / 2, z, { cast: false });
        scene.add(wall);
    }
    // Mullion (rangka vertikal) dinding kaca
    const mullGeo = new THREE.BoxGeometry(0.16, H, 0.16);
    const nMullX = 19, nMullZ = 13;
    const mulls = new THREE.InstancedMesh(mullGeo, mats.steel, nMullX * 2 + nMullZ * 2);
    const m4 = new THREE.Matrix4();
    const q4 = new THREE.Quaternion();
    const ONE = new THREE.Vector3(1, 1, 1);
    const UPV = new THREE.Vector3(0, 1, 0);
    const setInst = (im, idx, x, y, z, ry = 0) => {
        q4.setFromAxisAngle(UPV, ry);
        m4.compose(new THREE.Vector3(x, y, z), q4, ONE);
        im.setMatrixAt(idx, m4);
    };
    let mi = 0;
    for (let i = 0; i < nMullX; i++) {
        const x = -45 + i * 5;
        setInst(mulls, mi++, x, H / 2, -30);
        setInst(mulls, mi++, x, H / 2, 30);
    }
    for (let i = 0; i < nMullZ; i++) {
        const z = -30 + i * 5;
        setInst(mulls, mi++, -45, H / 2, z);
        setInst(mulls, mi++, 45, H / 2, z);
    }
    scene.add(mulls);

    // Kolom & plafon
    const colGeo = new THREE.CylinderGeometry(0.55, 0.55, H, 12);
    const cols = new THREE.InstancedMesh(colGeo, mats.steel, 10);
    let ci = 0;
    for (const cx of [-30, -10, 10, 30]) {
        for (const cz of [-15, 15]) {
            if (ci < 10) { m4.makeTranslation(cx, H / 2, cz); cols.setMatrixAt(ci++, m4); }
        }
    }
    while (ci < 10) { m4.makeTranslation(0, -50, 0); cols.setMatrixAt(ci++, m4); }
    cols.castShadow = true;
    scene.add(cols);
    scene.add(mesh(new THREE.BoxGeometry(92, 0.8, 62), mats.white, 0, H + 0.4, 0, { cast: false }));
    // Rangka atap (truss) melintang
    const trussGeo = new THREE.BoxGeometry(0.28, 0.55, 59);
    const trusses = new THREE.InstancedMesh(trussGeo, mats.steel, 9);
    for (let i = 0; i < 9; i++) setInst(trusses, i, -40 + i * 10, H - 0.45, 0);
    scene.add(trusses);
    // Skylight strip emissive
    for (let i = -3; i <= 3; i++) {
        scene.add(mesh(new THREE.BoxGeometry(86, 0.1, 2.2), mats.emissiveCool, 0, H - 0.1, i * 8, { cast: false }));
    }

    // Papan nama besar
    const signTex = Tex.sign(nameSign, { w: 2048, h: 160, bg: '#0d2b4d', font: 'bold 72px "Segoe UI", sans-serif' });
    const sign = mesh(new THREE.BoxGeometry(40, 3, 0.4),
        new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.8 }),
        0, 9, -29.5, { cast: false });
    scene.add(sign);

    // Papan jadwal penerbangan (FIDS) menggantung di tengah hall
    const fidsTex = Tex.fids(arabic ? 'DEPARTURES — المغادرة' : 'KEBERANGKATAN — DEPARTURES');
    const fids = mesh(new THREE.BoxGeometry(6.4, 4, 0.3),
        new THREE.MeshStandardMaterial({ map: fidsTex, emissive: 0xffffff, emissiveMap: fidsTex, emissiveIntensity: 1.1 }),
        0, 5.2, -6, { cast: false });
    scene.add(fids);
    for (const hx of [-2.6, 2.6]) {
        scene.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 4.8, 6), mats.steel, hx, 9.6, -6, { cast: false }));
    }

    // Signage arah menggantung
    const hangSign = (text, x, z, ry = 0, w = 5) => {
        const t = Tex.sign(text, { bg: '#13203a', fg: '#ffd75e', w: 1024, h: 128, font: 'bold 60px "Segoe UI", sans-serif' });
        const s = mesh(new THREE.BoxGeometry(w, 0.95, 0.14),
            new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.0 }),
            x, 4.6, z, { cast: false, ry });
        scene.add(s);
        const rod = mesh(new THREE.CylinderGeometry(0.03, 0.03, H - 5.1, 6), mats.steel, x, (H + 5.1) / 2, z, { cast: false });
        scene.add(rod);
    };
    hangSign('⬅ CHECK-IN A–D', -12, -12);
    hangSign(arabic ? 'الجوازات — PASSPORT ➡' : 'IMIGRASI ➡', 14, -12);
    hangSign('GATE 11–14 ➡', 26, 8, -0.5);
    hangSign('RUANG TUNGGU — WAITING', 0, 4, 0, 6);

    /* --- Petugas yang berjaga di tiap booth ---
     * Titik dikumpulkan di sini lalu dijadikan Crowd mode 'post' oleh scene.
     * Konvensi arah: ry = 0 menghadap +z, PI menghadap −z, PI/2 menghadap +x.
     * Tiap petugas berdiri di sisi belakang meja, menghadap sisi antrian. */
    const STAFF_AIRLINE = 0x1b3a6b; // seragam maskapai — biru navy
    const STAFF_OFFICER = 0x2f3b2a; // petugas imigrasi — hijau zaitun tua
    const STAFF_BARISTA = 0x6b3f22; // barista kafe — cokelat
    const staffSpots = [];

    // Counter check-in (4 buah)
    const counters = new THREE.Group();
    for (let i = 0; i < 4; i++) {
        const c = new THREE.Group();
        c.add(mesh(new THREE.BoxGeometry(5, 1.15, 1.6), mats.wood, 0, 0.575, 0));
        c.add(mesh(new THREE.BoxGeometry(5, 0.08, 1.9), mats.steel, 0, 1.2, 0, { cast: false }));
        const scrTex = Tex.sign(`CHECK-IN ${String.fromCharCode(65 + i)}`, { bg: '#123c1e', fg: '#7dffa5', w: 512, h: 96 });
        c.add(mesh(new THREE.BoxGeometry(3.6, 0.9, 0.12),
            new THREE.MeshStandardMaterial({ map: scrTex, emissive: 0xffffff, emissiveMap: scrTex, emissiveIntensity: 1.4 }),
            0, 3.0, 0, { cast: false }));
        c.add(mesh(new THREE.BoxGeometry(0.15, 2.4, 0.15), mats.steel, -1.6, 1.8, 0));
        c.add(mesh(new THREE.BoxGeometry(0.15, 2.4, 0.15), mats.steel, 1.6, 1.8, 0));
        // timbangan bagasi di samping counter
        c.add(mesh(new THREE.BoxGeometry(0.9, 0.32, 1.2), mats.darkGrey, 3.0, 0.16, 0.2));
        const cx = -24 + i * 8.5;
        c.position.set(cx, 0, -24);
        counters.add(c);
        engine.addBlocker(cx - 2.6, -24.9, cx + 2.6, -23.1);
        // Petugas berdiri di belakang meja (meja: z −24.8…−23.2), menghadap antrian
        staffSpots.push({ x: cx - 0.9, z: -25.5, ry: 0, color: STAFF_AIRLINE });
    }
    scene.add(counters);
    // Conveyor bagasi
    scene.add(mesh(new THREE.BoxGeometry(26, 0.5, 2), mats.darkGrey, -12, 0.25, -27));
    engine.addBlocker(-25, -28.2, 1, -25.9);

    // Tiang antrian bertali (stanchion) di depan check-in
    const postGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.95, 8);
    const ropeGeo = new THREE.BoxGeometry(2.16, 0.035, 0.035);
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x7a1f2b, roughness: 0.6 });
    const posts = new THREE.InstancedMesh(postGeo, mats.steel, 14);
    const ropes = new THREE.InstancedMesh(ropeGeo, ropeMat, 12);
    let pi = 0, ri = 0;
    for (const qz of [-21.3, -19.2]) {
        for (let i = 0; i < 7; i++) {
            const qx = -30 + i * 2.2;
            setInst(posts, pi++, qx, 0.48, qz);
            if (i < 6) setInst(ropes, ri++, qx + 1.1, 0.82, qz);
        }
        engine.addBlocker(-30.2, qz - 0.18, -16.6, qz + 0.18);
    }
    posts.castShadow = true;
    scene.add(posts, ropes);

    /* --- Ruang tunggu: bangku sofa bandara (dudukan + sandaran + armrest + rangka) --- */
    const benchRows = [
        { z: 7, ry: Math.PI }, { z: 12, ry: 0 }, { z: 17, ry: Math.PI }
    ];
    const benchXs = [-13.5, -4.5, 4.5, 13.5];
    const nBench = benchRows.length * benchXs.length;
    const cushGeo = new THREE.BoxGeometry(0.58, 0.12, 0.54);
    const backGeo = new THREE.BoxGeometry(0.58, 0.56, 0.09);
    const armGeo2 = new THREE.BoxGeometry(0.07, 0.24, 0.5);
    const beamGeo = new THREE.BoxGeometry(3.34, 0.09, 0.16);
    const legGeo2 = new THREE.BoxGeometry(0.1, 0.3, 0.52);
    const fabricMat = new THREE.MeshStandardMaterial({ color: 0x2e5170, roughness: 0.62, metalness: 0.08 });
    const cush = new THREE.InstancedMesh(cushGeo, fabricMat, nBench * 5);
    const back = new THREE.InstancedMesh(backGeo, fabricMat, nBench * 5);
    const arms = new THREE.InstancedMesh(armGeo2, mats.steel, nBench * 6);
    const beams = new THREE.InstancedMesh(beamGeo, mats.steel, nBench);
    const legs = new THREE.InstancedMesh(legGeo2, mats.steel, nBench * 2);
    const qTilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.17);
    const qTmp = new THREE.Quaternion();
    const seatSpots = [];
    let bi = 0, cuI = 0, arI = 0, lgI = 0;
    for (const row of benchRows) {
        for (const bx of benchXs) {
            const c = Math.cos(row.ry), s = Math.sin(row.ry);
            const world = (lx, lz) => [bx + lx * c + lz * s, row.z - lx * s + lz * c];
            for (let k = 0; k < 5; k++) {
                const lx = (k - 2) * 0.62;
                let [wx, wz] = world(lx, 0);
                setInst(cush, cuI, wx, 0.42, wz, row.ry);
                // sandaran miring ke belakang
                [wx, wz] = world(lx, -0.28);
                q4.setFromAxisAngle(UPV, row.ry);
                qTmp.copy(q4).multiply(qTilt);
                m4.compose(new THREE.Vector3(wx, 0.74, wz), qTmp, ONE);
                back.setMatrixAt(cuI, m4);
                cuI++;
                const [sx2, sz2] = world(lx, -0.04);
                seatSpots.push({ x: sx2, z: sz2, ry: row.ry });
            }
            for (let k = 0; k < 6; k++) {
                const [wx, wz] = world((k - 2.5) * 0.62, 0);
                setInst(arms, arI++, wx, 0.56, wz, row.ry);
            }
            setInst(beams, bi, bx, 0.3, row.z, row.ry);
            for (const lxx of [-1.35, 1.35]) {
                const [wx, wz] = world(lxx, 0);
                setInst(legs, lgI++, wx, 0.15, wz, row.ry);
            }
            bi++;
            engine.addBlocker(bx - 1.75, row.z - 0.55, bx + 1.75, row.z + 0.55);
        }
    }
    cush.castShadow = back.castShadow = arms.castShadow = true;
    cush.receiveShadow = back.receiveShadow = true;
    scene.add(cush, back, arms, beams, legs);
    // acak urutan kursi agar penumpang duduk menyebar
    for (let i = seatSpots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [seatSpots[i], seatSpots[j]] = [seatSpots[j], seatSpots[i]];
    }

    // Troli bagasi
    const trolley = (x, z, ry, withBags = true) => {
        const g = new THREE.Group();
        g.add(mesh(new THREE.BoxGeometry(0.85, 0.06, 0.62), mats.steel, 0, 0.26, 0));
        g.add(mesh(new THREE.BoxGeometry(0.06, 0.95, 0.62), mats.steel, -0.42, 0.72, 0));
        const handle = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 6), mats.steel, -0.46, 1.18, 0);
        handle.rotation.x = Math.PI / 2;
        g.add(handle);
        for (const [wx2, wz2] of [[-0.34, -0.24], [-0.34, 0.24], [0.34, -0.24], [0.34, 0.24]]) {
            g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 8), mats.darkGrey, wx2, 0.07, wz2, { cast: false }));
        }
        if (withBags) {
            g.add(mesh(new THREE.BoxGeometry(0.62, 0.4, 0.42),
                new THREE.MeshStandardMaterial({ color: 0x7a3b2e, roughness: 0.8 }), 0.05, 0.5, 0));
            g.add(mesh(new THREE.BoxGeometry(0.5, 0.3, 0.36),
                new THREE.MeshStandardMaterial({ color: 0x33415c, roughness: 0.8 }), 0.05, 0.86, 0));
        }
        g.position.set(x, 0, z);
        g.rotation.y = ry;
        scene.add(g);
        engine.addBlocker(x - 0.55, z - 0.45, x + 0.55, z + 0.45);
    };
    trolley(-33, -14, 0.4);
    trolley(-9, -6, -1.1);
    trolley(11, 1, 2.3, false);
    trolley(30, 2, 0.9);

    // Koper penumpang di ruang tunggu
    const bagColors = [0x8a2f2f, 0x2f4d8a, 0x3d3d44, 0x76552e, 0x2e6650];
    for (const [bx2, bz2, bry] of [[-11.2, 9.1, 0.3], [-1.8, 13.2, -0.6], [6.6, 15.9, 1.2], [14.8, 8.2, 0.1], [-6.4, 18.3, 2.1]]) {
        const bag = new THREE.Group();
        const bc = bagColors[Math.floor(Math.random() * bagColors.length)];
        bag.add(mesh(new THREE.BoxGeometry(0.44, 0.66, 0.26), new THREE.MeshStandardMaterial({ color: bc, roughness: 0.75 }), 0, 0.33, 0));
        bag.add(mesh(new THREE.BoxGeometry(0.05, 0.24, 0.05), mats.steel, -0.1, 0.78, 0, { cast: false }));
        bag.add(mesh(new THREE.BoxGeometry(0.05, 0.24, 0.05), mats.steel, 0.1, 0.78, 0, { cast: false }));
        bag.add(mesh(new THREE.BoxGeometry(0.26, 0.05, 0.05), mats.steel, 0, 0.88, 0, { cast: false }));
        bag.position.set(bx2, 0, bz2);
        bag.rotation.y = bry;
        scene.add(bag);
    }

    // Kios kafe di sisi barat
    const kiosk = new THREE.Group();
    kiosk.add(mesh(new THREE.BoxGeometry(1.1, 1.1, 3.4), mats.wood, 0, 0.55, 0));
    kiosk.add(mesh(new THREE.BoxGeometry(1.3, 0.06, 3.6), mats.steel, 0, 1.13, 0, { cast: false }));
    kiosk.add(mesh(new THREE.BoxGeometry(0.5, 0.45, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.3, metalness: 0.7 }), 0, 1.4, -0.9));
    const kioskBack = mesh(new THREE.BoxGeometry(0.5, 2.4, 3.4), mats.darkGrey, -1.6, 1.2, 0);
    kiosk.add(kioskBack);
    const kt = Tex.sign('☕ KAFE & SNACK', { bg: '#3b2413', fg: '#ffd9a0', w: 640, h: 100 });
    kiosk.add(mesh(new THREE.BoxGeometry(0.2, 0.7, 3.0),
        new THREE.MeshStandardMaterial({ map: kt, emissive: 0xffffff, emissiveMap: kt, emissiveIntensity: 1.2 }),
        -1.55, 2.75, 0, { cast: false }));
    kiosk.position.set(-41.5, 0, 8);
    scene.add(kiosk);
    engine.addBlocker(-43.5, 6, -40.6, 10);
    // Barista di celah antara dinding belakang (x −42.85) dan meja (x −42.05), menghadap pembeli (+x)
    staffSpots.push({ x: -42.45, z: 8, ry: Math.PI / 2, color: STAFF_BARISTA });

    // Mesin penjual otomatis di dinding selatan
    for (const vx of [-3, -1.2]) {
        const vend = new THREE.Group();
        vend.add(mesh(new THREE.BoxGeometry(1.5, 2, 0.85), mats.darkGrey, 0, 1, 0));
        vend.add(mesh(new THREE.BoxGeometry(1.1, 1.5, 0.06), mats.emissiveCool, -0.08, 1.15, 0.44, { cast: false }));
        vend.position.set(vx * 3, 0, 28.9);
        scene.add(vend);
        engine.addBlocker(vx * 3 - 0.85, 28.4, vx * 3 + 0.85, 29.4);
    }

    // Booth imigrasi
    const imigrasi = new THREE.Group();
    for (let i = 0; i < 2; i++) {
        const b = new THREE.Group();
        b.add(mesh(new THREE.BoxGeometry(2.2, 1.2, 2.2), mats.wood, 0, 0.6, 0));
        b.add(mesh(new THREE.BoxGeometry(2.4, 0.1, 2.4), mats.steel, 0, 2.6, 0, { cast: false }));
        b.add(mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), mats.steel, -1.1, 1.85, -1.1));
        b.add(mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), mats.steel, 1.1, 1.85, 1.1));
        const it = Tex.sign(arabic ? 'الجوازات — PASSPORT' : 'IMIGRASI', { bg: '#4d130d', fg: '#ffd7a0', w: 512, h: 96 });
        b.add(mesh(new THREE.BoxGeometry(2.2, 0.6, 0.1),
            new THREE.MeshStandardMaterial({ map: it, emissive: 0xffffff, emissiveMap: it, emissiveIntensity: 1.2 }),
            0, 3.1, 0, { cast: false }));
        const bz = -18 + i * 8;
        b.position.set(24, 0, bz);
        imigrasi.add(b);
        engine.addBlocker(24 - 1.3, bz - 1.3, 24 + 1.3, bz + 1.3);
        // Petugas berdiri di sisi booth yang membelakangi koridor antrian (z −16.5…−11.5),
        // menghadap ke koridor: booth utara menghadap +z, booth selatan menghadap −z.
        const queueSide = i === 0 ? 1 : -1;
        staffSpots.push({ x: 24, z: bz - queueSide * 1.8, ry: i === 0 ? 0 : Math.PI, color: STAFF_OFFICER });
    }
    scene.add(imigrasi);
    // Koridor antrian imigrasi (tali pembatas dua sisi)
    const posts2 = new THREE.InstancedMesh(postGeo, mats.steel, 10);
    const ropes2 = new THREE.InstancedMesh(ropeGeo, ropeMat, 8);
    let p2 = 0, r2 = 0;
    for (const qz of [-16.5, -11.5]) {
        for (let i = 0; i < 5; i++) {
            const qx = 18 + i * 2.2;
            setInst(posts2, p2++, qx, 0.48, qz);
            if (i < 4) setInst(ropes2, r2++, qx + 1.1, 0.82, qz);
        }
        engine.addBlocker(17.8, qz - 0.18, 26.8, qz + 0.18);
    }
    posts2.castShadow = true;
    scene.add(posts2, ropes2);

    // Gate
    const gate = new THREE.Group();
    const gateTex = Tex.sign(arabic ? 'BAGGAGE — EXIT' : 'GATE 12 — MADINAH', { bg: '#0d2b4d', fg: '#ffe9a8', w: 640, h: 110 });
    gate.add(mesh(new THREE.BoxGeometry(6, 1, 0.25),
        new THREE.MeshStandardMaterial({ map: gateTex, emissive: 0xffffff, emissiveMap: gateTex, emissiveIntensity: 1.3 }),
        0, 3.4, 0, { cast: false }));
    gate.add(mesh(new THREE.BoxGeometry(0.4, 3, 0.4), mats.steel, -2.6, 1.5, 0));
    gate.add(mesh(new THREE.BoxGeometry(0.4, 3, 0.4), mats.steel, 2.6, 1.5, 0));
    gate.add(mesh(new THREE.BoxGeometry(4.4, 2.6, 0.15), mats.glass, 0, 1.4, 0, { cast: false }));
    gate.position.set(36, 0, 18);
    gate.rotation.y = -Math.PI / 2;
    scene.add(gate);
    // Petugas boarding berdiri di samping pintu gate (bentang z 15.4…20.6), menghadap hall (−x)
    staffSpots.push({ x: 33.8, z: 15.2, ry: -Math.PI / 2, color: STAFF_AIRLINE });

    // Pesawat di luar kaca (Realistik, skala besar)
    const plane = new THREE.Group();
    const pMat = mats.white;
    const pLen = 42, pR = 3.2;
    
    // Fuselage utama
    const fusGeo = new THREE.CylinderGeometry(pR, pR, pLen, 24);
    fusGeo.rotateZ(Math.PI / 2);
    plane.add(new THREE.Mesh(fusGeo, pMat));
    
    // Hidung aerodinamis (Nose)
    const noseGeo = new THREE.SphereGeometry(pR, 24, 16);
    noseGeo.scale(1.8, 1, 1);
    const nose = new THREE.Mesh(noseGeo, pMat);
    nose.position.set(pLen/2, 0, 0);
    plane.add(nose);
    
    // Ekor meruncing (Tail Cone)
    const tailConeGeo = new THREE.SphereGeometry(pR, 24, 16);
    tailConeGeo.scale(2.2, 1, 1);
    const tailCone = new THREE.Mesh(tailConeGeo, pMat);
    tailCone.position.set(-pLen/2, 0, 0);
    plane.add(tailCone);

    // Kaca Cockpit (Hitam melengkung di hidung)
    const winMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
    const cpWin = new THREE.Mesh(new THREE.CylinderGeometry(pR+0.05, pR+0.05, 1.8, 16, 1, false, -1.0, 2.0), winMat);
    cpWin.rotation.z = Math.PI / 2 - 0.25;
    cpWin.position.set(pLen/2 + 2, 0.4, 0);
    plane.add(cpWin);

    // Sayap (Swept wings)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0); wingShape.lineTo(-12, 20); wingShape.lineTo(-16, 20); wingShape.lineTo(-8, 0); wingShape.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.1 });
    wingGeo.rotateX(Math.PI / 2);
    const wings1 = new THREE.Mesh(wingGeo, pMat);
    wings1.position.set(2, -1.0, 0);
    plane.add(wings1);
    const wings2 = new THREE.Mesh(wingGeo, pMat);
    wings2.position.set(2, -1.0, 0);
    wings2.rotation.x = Math.PI;
    plane.add(wings2);

    // Mesin Jet (Turbofans di bawah sayap)
    for (const s of [-1, 1]) {
        const pylon = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.5, 0.4), pMat);
        pylon.position.set(-2, -1.5, s * 7);
        plane.add(pylon);
        const engGeo = new THREE.CylinderGeometry(1.6, 1.6, 5.0, 20);
        engGeo.rotateZ(Math.PI / 2);
        const eng = new THREE.Mesh(engGeo, pMat);
        eng.position.set(-2.5, -2.2, s * 7);
        plane.add(eng);
        const fan = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 5.1, 16), winMat);
        fan.rotation.z = Math.PI / 2;
        fan.position.set(-2.5, -2.2, s * 7);
        plane.add(fan);
    }

    // Vertical Stabilizer (Ekor vertikal - Hijau Zamrud)
    const tailShape = new THREE.Shape();
    tailShape.moveTo(0, 0); tailShape.lineTo(-6, 8.5); tailShape.lineTo(-9, 8.5); tailShape.lineTo(-7, 0); tailShape.closePath();
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x0f5c35, roughness: 0.4 });
    const tailV = new THREE.Mesh(new THREE.ExtrudeGeometry(tailShape, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1 }), tailMat);
    tailV.position.set(-pLen/2 + 2, 2.5, -0.3);
    plane.add(tailV);
    
    // Garis Emas di Ekor
    const tailGoldShape = new THREE.Shape();
    tailGoldShape.moveTo(-3, 2); tailGoldShape.lineTo(-7.5, 6); tailGoldShape.lineTo(-8.5, 6); tailGoldShape.lineTo(-4, 2); tailGoldShape.closePath();
    const tGold = new THREE.Mesh(new THREE.ExtrudeGeometry(tailGoldShape, { depth: 0.7 }), mats.gold);
    tGold.position.set(-pLen/2 + 2, 2.5, -0.35);
    plane.add(tGold);

    // Horizontal Stabilizers (Sayap ekor)
    const hStabShape = new THREE.Shape();
    hStabShape.moveTo(0, 0); hStabShape.lineTo(-5, 8); hStabShape.lineTo(-7, 8); hStabShape.lineTo(-4, 0); hStabShape.closePath();
    const hStabGeo = new THREE.ExtrudeGeometry(hStabShape, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.05 });
    hStabGeo.rotateX(Math.PI / 2);
    const hStab = new THREE.Mesh(hStabGeo, pMat);
    hStab.position.set(-pLen/2 - 1, 0.5, 0);
    plane.add(hStab);
    const hStab2 = hStab.clone();
    hStab2.rotation.x = Math.PI;
    plane.add(hStab2);

    // Jendela Penumpang (Deretan kotak hitam)
    const winStripe = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.5, pR * 2 + 0.1), winMat, 30);
    const wM = new THREE.Matrix4();
    for(let i=0; i<30; i++) {
        wM.makeTranslation(-12 + i * 1.2, 0.6, 0);
        winStripe.setMatrixAt(i, wM);
    }
    plane.add(winStripe);

    // Angkat pesawat ke ketinggian roda & atur posisi akhir
    plane.position.set(78, 6, 8);
    plane.rotation.y = 30 * DEG;
    scene.add(plane);

    // Tanaman pot (palem + pot tanah liat)
    const potMat = new THREE.MeshStandardMaterial({ color: 0x9a5b3c, roughness: 0.85 });
    for (const [px2, pz2] of [[-40, -24], [-40, 24], [40, 24], [-20, 26], [20, 26], [-30, 14], [-36, -2], [33, -6]]) {
        const pot = mesh(new THREE.CylinderGeometry(0.5, 0.64, 0.55, 12), potMat, px2, 0.275, pz2);
        scene.add(pot);
        const t = palmTree(mats, 0.55);
        t.position.set(px2, 0.45, pz2);
        scene.add(t);
        engine.addBlocker(px2 - 0.65, pz2 - 0.65, px2 + 0.65, pz2 + 0.65);
    }

    engine.addWalkRect(-42, -27, 42, 27);
    engine.addWalkRect(30, 10, 44, 26); // area gate
    engine.configureMinimap({
        scale: 1.6, center: { x: 0, z: 0 },
        features: [
            { type: 'square', x: -24, z: -24, color: '#57d987' },
            { type: 'square', x: 24, z: -14, color: '#d98a57' },
            { type: 'square', x: 36, z: 18, color: '#e8c96a' }
        ]
    });

    return { counters, imigrasi, gate, plane, seatSpots, staffSpots };
}

/** Kabin pesawat (Ekonomi) & Ruang Pilot (Cockpit) — Sangat Realistik. */
export function airplaneCabin(engine, origin = { x: 0, z: 400 }) {
    const { scene, mats } = engine;
    const g = new THREE.Group();
    const L = 34, R = 3.6;
    
    // Dinding silinder (kabin bagian dalam)
    const tubeGeo = new THREE.CylinderGeometry(R, R, L, 32, 1, false);
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.8, side: THREE.BackSide });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.rotation.z = Math.PI / 2;
    tube.position.y = R - 0.6;
    g.add(tube);
    
    // Lantai kabin dengan motif karpet
    const floor = new THREE.Mesh(new THREE.BoxGeometry(L, 0.15, R * 1.8), new THREE.MeshStandardMaterial({ color: 0x1a2233, roughness: 0.9 }));
    floor.position.y = 0.05;
    g.add(floor);
    
    // Overhead Bins (Laci kabin di atas kursi)
    const binGeo = new THREE.BoxGeometry(L, 1.2, 1.4);
    const binMat = new THREE.MeshStandardMaterial({ color: 0xe0e5ea, roughness: 0.6 });
    for(const sz of [-R + 1.2, R - 1.2]) {
        const bin = new THREE.Mesh(binGeo, binMat);
        bin.position.set(0, R * 1.5, sz);
        bin.rotation.x = sz > 0 ? 0.35 : -0.35;
        g.add(bin);
    }
    
    // Lampu LED strip di langit-langit kabin
    const strip = new THREE.Mesh(new THREE.BoxGeometry(L, 0.1, 0.5), mats.emissiveCool);
    strip.position.set(0, R * 1.75, 0);
    g.add(strip);

    // Setup material kursi penumpang (Economy Class)
    const seatMat = new THREE.MeshStandardMaterial({ color: 0xf0f4f5, roughness: 0.8 }); // Clean white fabrics
    const armMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4 });
    const hdMat = new THREE.MeshStandardMaterial({ color: 0x0f5c35, roughness: 0.6 }); // Emerald headrest
    
    const nSeats = 12 * 4;
    const cush = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.15, 0.5), seatMat, nSeats);
    const bk = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.85, 0.5), seatMat, nSeats);
    const hd = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.25, 0.51), hdMat, nSeats);
    const arm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 0.04, 0.06), armMat, nSeats * 2);
    const leg = new THREE.InstancedMesh(new THREE.BoxGeometry(0.25, 0.4, 0.35), armMat, nSeats);

    const m4 = new THREE.Matrix4();
    let i = 0, j = 0;
    const seatSpots = [];
    
    // Baris kursi penumpang
    for (let row = 0; row < 12; row++) {
        for (const sz of [-1.5, -0.85, 0.85, 1.5]) {
            const sx = -L / 2 + 6 + row * 1.8;
            
            engine.addBlocker(origin.x + sx - 0.35, origin.z + sz - 0.35, origin.x + sx + 0.35, origin.z + sz + 0.35);
            m4.makeTranslation(sx, 0.45, sz); cush.setMatrixAt(i, m4);
            m4.makeTranslation(sx, 0.2, sz); leg.setMatrixAt(i, m4);
            m4.makeRotationZ(-0.15); m4.setPosition(sx - 0.25, 0.9, sz); bk.setMatrixAt(i, m4);
            m4.setPosition(sx - 0.35, 1.3, sz); hd.setMatrixAt(i, m4);
            
            m4.makeTranslation(sx + 0.05, 0.65, sz - 0.28); arm.setMatrixAt(j++, m4);
            m4.makeTranslation(sx + 0.05, 0.65, sz + 0.28); arm.setMatrixAt(j++, m4);
            
            seatSpots.push({ x: sx + origin.x, z: sz + origin.z, ry: Math.PI / 2 });
            i++;
        }
    }
    g.add(cush, bk, hd, arm, leg);
    
    // Jendela kabin emissive (memancarkan cahaya biru terang)
    for (let w = 0; w < 12; w++) {
        for (const s of [-1, 1]) {
            g.add(mesh(new THREE.BoxGeometry(0.35, 0.55, 0.05), new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x88ccff, emissiveIntensity: 0.6 }),
                -L / 2 + 6 + w * 1.8, 1.3, s * (R - 0.1), { cast: false }));
        }
    }

    // ==========================================
    // RUANG PILOT (COCKPIT) DI BAGIAN DEPAN (+X)
    // ==========================================
    const cockpitX = L / 2 - 3.5;
    
    // Dinding pembatas kokpit (Bulkhead) dengan pintu sedikit terbuka
    const bulkhead1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, R*2, R*2 - 0.9), tubeMat);
    bulkhead1.position.set(cockpitX, R-0.6, 0.45);
    g.add(bulkhead1);
    const bulkhead2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, R*2 - 2.2, 0.9), tubeMat);
    bulkhead2.position.set(cockpitX, R*2 - 1.1, -R + 0.45);
    g.add(bulkhead2);
    
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.85), new THREE.MeshStandardMaterial({ color: 0x8c9399, roughness: 0.4 }));
    door.position.set(cockpitX + 0.35, 1.1, -0.05);
    door.rotation.y = Math.PI / 3; // Terbuka agar pemain bisa melihat/masuk
    g.add(door);

    // Kursi Pilot (Captain & First Officer)
    const pSeatMat = new THREE.MeshStandardMaterial({ color: 0x11151a, roughness: 0.9 });
    for (const pz of [-0.8, 0.8]) {
        const px = cockpitX + 1.8;
        // Dudukan & sandaran pilot
        const ps = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.7), pSeatMat);
        ps.position.set(px, 0.6, pz);
        g.add(ps);
        const pb = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 0.7), pSeatMat);
        pb.position.set(px - 0.25, 1.1, pz);
        pb.rotation.z = -0.1;
        g.add(pb);
        
        // Panel instrumen & Layar Monitor (menyala hijau/biru ala glass cockpit)
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 1.0), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        dash.position.set(px + 1.2, 0.8, pz);
        dash.rotation.z = -0.3;
        g.add(dash);
        
        const scr = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.8), new THREE.MeshStandardMaterial({ color: 0x22ff99, emissive: 0x22ff99, emissiveIntensity: 0.7 }));
        scr.position.set(px + 0.95, 1.25, pz);
        scr.rotation.z = -0.3;
        g.add(scr);
    }
    
    // Konsol tengah (Center Pedestal) & Tuas Gas (Throttle)
    const consoleM = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    consoleM.position.set(cockpitX + 2.0, 0.5, 0);
    g.add(consoleM);
    const throttle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.3), mats.steel);
    throttle.position.set(cockpitX + 1.5, 0.9, 0);
    g.add(throttle);

    // Kaca Depan Kokpit (Windshield)
    const windGeom = new THREE.SphereGeometry(R-0.1, 24, 12, 0, Math.PI);
    const windMat = new THREE.MeshStandardMaterial({ color: 0x050a14, roughness: 0.1, side: THREE.BackSide });
    const wind = new THREE.Mesh(windGeom, windMat);
    wind.rotation.z = Math.PI / 2;
    wind.rotation.y = Math.PI / 2;
    wind.position.set(cockpitX + 3.0, R-0.6, 0);
    g.add(wind);

    g.position.set(origin.x, 0, origin.z);
    scene.add(g);
    
    // Warm calming ambient LED lighting di kabin penumpang
    engine.addPointLamp(origin.x, 2.4, origin.z, { color: 0xffe8cc, intensity: 45, distance: 30 });
    engine.addPointLamp(origin.x - 10, 2.4, origin.z, { color: 0xffe8cc, intensity: 35, distance: 22 });
    engine.addPointLamp(origin.x + 10, 2.4, origin.z, { color: 0xffe8cc, intensity: 35, distance: 22 });
    
    // Lampu redup berwarna biru di dalam kokpit
    engine.addPointLamp(origin.x + cockpitX + 2.0, 2.2, origin.z, { color: 0x55aaff, intensity: 25, distance: 10 });
    
    // Area bebas berjalan (sampai ke pintu kokpit)
    engine.addWalkRect(origin.x - L / 2 + 1, origin.z - R + 0.5, origin.x + cockpitX + 2, origin.z + R - 0.5);
    
    return { origin, length: L, seatSpots };
}

/* ============ MASJID NABAWI ============ */

/**
 * Tinggi membran payung pada koordinat persegi u,v ∈ [-1,1].
 * Bentuk tenda 4-sudut khas payung Nabawi (SL-Rasch): hub tertinggi di tiang,
 * empat rusuk diagonal menahan sudut, kain melengkung turun di antara rusuk
 * sehingga tepinya bergelombang — bukan kerucut lurus.
 */
function canopyHeight(u, v, { hub, corner, dip }) {
    const au = Math.abs(u), av = Math.abs(v);
    const m = Math.max(au, av);              // 0 di pusat → 1 di tepi persegi
    if (m < 1e-6) return hub;
    const n = Math.min(au, av) / m;          // 0 di tengah sisi → 1 di sudut
    const edge = dip + (corner - dip) * Math.pow(n, 1.3);
    return hub + (edge - hub) * Math.pow(m, 1.5);
}

/** Membran persegi dengan UV planar — motif ikut sejajar sisi payung. */
function canopyGeometry(half, prof, seg = 26) {
    const geo = new THREE.PlaneGeometry(half * 2, half * 2, seg, seg);
    geo.rotateX(-Math.PI / 2);               // bidang XZ, normal menghadap +Y
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
        p.setY(i, canopyHeight(p.getX(i) / half, p.getZ(i) / half, prof));
    }
    geo.computeVertexNormals();
    return geo;
}

/** Rusuk diagonal yang mengikuti lengkung membran dari hub ke sudut. */
function canopyRibGeometry(half, prof) {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        pts.push(new THREE.Vector3(t * half, canopyHeight(t, t, prof) - 0.16, t * half));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.13, 5, false);
}

/**
 * Payung raksasa pelataran Nabawi. Semua payung berbagi geometri dan
 * ditempatkan lewat InstancedMesh — 21 payung tetap ±8 draw call.
 * Sisi atas polos krem, sisi bawah bermotif (FrontSide/BackSide pada geometri
 * yang sama), persis seperti aslinya.
 */
function nabawiUmbrellas(engine, parent, origin, spots) {
    const { mats } = engine;
    const half = 11.4, mastH = 13.6;
    const prof = { hub: 15.9, corner: 13.7, dip: 12.5 };

    const motif = Tex.canopyMotif();
    const underMat = new THREE.MeshStandardMaterial({
        map: motif, roughness: 0.82, metalness: 0.02, side: THREE.BackSide,
        emissive: 0xffffff, emissiveMap: motif, emissiveIntensity: 0.12
    });
    const topMat = new THREE.MeshStandardMaterial({
        color: 0xf3efe4, roughness: 0.74, side: THREE.FrontSide
    });
    const canopyGeo = canopyGeometry(half, prof);
    const ribGeo = canopyRibGeometry(half, prof);

    const N = spots.length;
    const add = (geo, mat, cast = true) => {
        const im = new THREE.InstancedMesh(geo, mat, N);
        im.castShadow = cast; im.receiveShadow = true;
        parent.add(im);
        return im;
    };
    const under = add(canopyGeo, underMat, false);
    const top = add(canopyGeo, topMat);
    const mast = add(new THREE.CylinderGeometry(0.34, 0.62, mastH, 12), mats.steel);
    const capital = add(new THREE.ConeGeometry(1.5, 2.4, 12), mats.gold);
    const collar = add(new THREE.CylinderGeometry(0.9, 1.5, 1.1, 12), mats.steel);
    const plinth = add(new THREE.CylinderGeometry(1.5, 1.9, 1.0, 8), mats.marbleTile);
    // Rusuk: satu InstancedMesh per diagonal → 4 draw call untuk seluruh pelataran
    const ribs = [0, 1, 2, 3].map(() => add(ribGeo, mats.steel));

    const m = new THREE.Matrix4(), q = new THREE.Quaternion(),
        pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    const put = (im, i, x, y, z, ry = 0) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
        im.setMatrixAt(i, m.compose(pos.set(x, y, z), q, one));
    };
    spots.forEach(({ x: px, z: pz, lit }, i) => {
        put(under, i, px, 0, pz);
        put(top, i, px, 0, pz);
        put(mast, i, px, mastH / 2, pz);
        put(collar, i, px, mastH + 0.2, pz);
        put(capital, i, px, mastH + 1.7, pz);
        put(plinth, i, px, 0.5, pz);
        ribs.forEach((r, d) => put(r, i, px, 0, pz, d * Math.PI / 2));
        // Lampu memantul ke motif — khas menjelang maghrib. Hanya barisan yang
        // dilewati pemain diberi lampu nyata: tiap point light menambah beban
        // shader untuk seluruh scene, dan emissiveMap sudah membuat motif
        // terbaca pada payung selebihnya.
        if (lit && engine.envPreset !== 'day') {
            engine.addPointLamp(origin.x + px, mastH - 1.6, origin.z + pz,
                { intensity: 38, distance: 26 });
        }
    });
}

/**
 * Minaret Nabawi: dasar persegi berpanel, transisi oktagonal, dua balkon
 * muazin, lalu mahkota emas berbulan sabit — profil bertingkat yang membedakan
 * minaret Nabawi dari minaret silinder biasa.
 */
export function nabawiMinaret(mats, h = 64) {
    const g = new THREE.Group();
    const w = h * 0.082;
    g.add(mesh(new THREE.BoxGeometry(w, h * 0.33, w), mats.cream, 0, h * 0.165, 0));
    // panel vertikal ceruk pada empat sisi dasar
    for (let s = 0; s < 4; s++) {
        const a = s * Math.PI / 2;
        const panel = mesh(new THREE.BoxGeometry(w * 0.52, h * 0.24, 0.25), mats.white,
            Math.sin(a) * (w / 2 + 0.1), h * 0.17, Math.cos(a) * (w / 2 + 0.1), { cast: false });
        panel.rotation.y = a;
        g.add(panel);
    }
    g.add(mesh(new THREE.BoxGeometry(w * 1.16, h * 0.022, w * 1.16), mats.white, 0, h * 0.342, 0));
    g.add(mesh(new THREE.CylinderGeometry(w * 0.44, w * 0.5, h * 0.21, 8), mats.cream, 0, h * 0.458, 0));
    g.add(mesh(new THREE.CylinderGeometry(w * 0.62, w * 0.62, h * 0.018, 8), mats.white, 0, h * 0.572, 0));
    g.add(mesh(new THREE.CylinderGeometry(w * 0.32, w * 0.38, h * 0.2, 14), mats.cream, 0, h * 0.681, 0));
    g.add(mesh(new THREE.CylinderGeometry(w * 0.46, w * 0.46, h * 0.016, 14), mats.white, 0, h * 0.789, 0));
    g.add(mesh(new THREE.CylinderGeometry(w * 0.24, w * 0.3, h * 0.1, 12), mats.cream, 0, h * 0.848, 0));
    // mahkota emas
    g.add(mesh(new THREE.SphereGeometry(w * 0.32, 14, 10), mats.gold, 0, h * 0.916, 0, { cast: false }));
    g.add(mesh(new THREE.ConeGeometry(w * 0.2, h * 0.075, 12), mats.gold, 0, h * 0.968, 0, { cast: false }));
    const cres = mesh(new THREE.TorusGeometry(w * 0.17, w * 0.035, 6, 14, Math.PI * 1.35),
        mats.gold, 0, h * 1.03, 0, { cast: false });
    cres.rotation.z = -Math.PI * 0.35;
    g.add(cres);
    return g;
}

/** Profil kubah bawang ringan (LatheGeometry) — bahu penuh, puncak lancip. */
function domeGeometry(r, h, seg = 32) {
    const pts = [];
    for (let i = 0; i <= 22; i++) {
        const t = i / 22;
        const rad = r * Math.sqrt(Math.max(0, 1 - Math.pow(t, 1.9))) * (1 + 0.07 * Math.sin(t * Math.PI));
        pts.push(new THREE.Vector2(Math.max(rad, 0.0015), t * h));
    }
    return new THREE.LatheGeometry(pts, seg);
}

/** Lubang lengkung lancip (pointed arch) untuk dipotong dari bidang fasad. */
function pointedArch(cx, w, h) {
    const p = new THREE.Path(), half = w / 2, spring = h - half * 1.2;
    p.moveTo(cx - half, 0);
    p.lineTo(cx - half, spring);
    p.quadraticCurveTo(cx - half, h * 0.93, cx, h);
    p.quadraticCurveTo(cx + half, h * 0.93, cx + half, spring);
    p.lineTo(cx + half, 0);
    p.closePath();
    return p;
}

export function nabawi(engine, origin = { x: 0, z: 0 }) {
    const { scene, mats } = engine;
    const g = new THREE.Group();
    const FZ = -46;                 // bidang fasad menghadap pelataran
    const stone = new THREE.MeshStandardMaterial({ color: 0xe4dac0, roughness: 0.82 });
    const stoneL = new THREE.MeshStandardMaterial({ color: 0xefe7d2, roughness: 0.78 });

    g.add(mesh(new THREE.BoxGeometry(520, 0.2, 520), mats.marbleTile, 0, -0.1, 0, { cast: false }));

    /* ---- Fasad: satu ExtrudeGeometry berlubang lengkung lancip (1 draw call) ---- */
    const FW = 210, FH = 19;
    const face = new THREE.Shape();
    face.moveTo(-FW / 2, 0); face.lineTo(FW / 2, 0);
    face.lineTo(FW / 2, FH); face.lineTo(-FW / 2, FH);
    face.closePath();
    const bays = 15, bayW = FW / bays;
    for (let i = 0; i < bays; i++) {
        const cx = -FW / 2 + bayW * (i + 0.5);
        if (Math.abs(cx) < bayW * 0.9) continue;      // sisakan bidang untuk portal utama
        face.holes.push(pointedArch(cx, bayW * 0.5, 12.5));
    }
    const facade = mesh(new THREE.ExtrudeGeometry(face, { depth: 3, bevelEnabled: false }), stone, 0, 0, FZ - 3);
    g.add(facade);

    // Portal utama (Bab as-Salam) — lebih tinggi, berbingkai emas
    const portal = new THREE.Shape();
    portal.moveTo(-11, 0); portal.lineTo(11, 0); portal.lineTo(11, 24); portal.lineTo(-11, 24);
    portal.closePath();
    portal.holes.push(pointedArch(0, 11, 17.5));
    g.add(mesh(new THREE.ExtrudeGeometry(portal, { depth: 4.2, bevelEnabled: false }), stoneL, 0, 0, FZ - 4.2));
    g.add(mesh(new THREE.BoxGeometry(23.4, 1.1, 0.5), mats.gold, 0, 24.6, FZ - 4.4, { cast: false }));
    const gateTex = Tex.sign('المسجد النبوي — MASJID NABAWI', { bg: '#0e3b26', fg: '#ffe9a8', w: 1024, h: 120 });
    g.add(mesh(new THREE.BoxGeometry(17, 2.1, 0.4),
        new THREE.MeshStandardMaterial({ map: gateTex, emissive: 0xffffff, emissiveMap: gateTex, emissiveIntensity: 0.9 }),
        0, 21.4, FZ - 4.5, { cast: false }));

    // Daun pintu kayu berukir emas
    const door = mesh(new THREE.BoxGeometry(9.6, 12, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x4a3a22, roughness: 0.7 }), 0, 6, FZ - 4.6);
    g.add(door);
    for (const dx of [-2.5, 2.5]) {
        g.add(mesh(new THREE.BoxGeometry(3.6, 11, 0.25), mats.gold, dx, 6, FZ - 5.1, { cast: false }));
    }

    // Parapet bergerigi di puncak fasad
    const merlon = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 1.6, 1.5), stoneL, 68);
    merlon.castShadow = true;
    const mm = new THREE.Matrix4();
    for (let i = 0; i < 68; i++) {
        mm.makeTranslation(-FW / 2 + 1.5 + i * (FW - 3) / 67, FH + 0.8, FZ - 1.5);
        merlon.setMatrixAt(i, mm);
    }
    g.add(merlon);

    /* ---- Ruang sholat di belakang fasad + kubah-kubah atap ---- */
    g.add(mesh(new THREE.BoxGeometry(FW, FH, 78), stone, 0, FH / 2, FZ - 42, { cast: false }));
    const roofDome = new THREE.InstancedMesh(domeGeometry(3.4, 2.8, 16), stoneL, 7 * 5);
    roofDome.castShadow = true;
    let di = 0;
    for (let ix = 0; ix < 7; ix++) {
        for (let iz = 0; iz < 5; iz++) {
            mm.makeTranslation(-72 + ix * 24, FH, FZ - 12 - iz * 15);
            roofDome.setMatrixAt(di++, mm);
        }
    }
    g.add(roofDome);

    /* ---- Kubah Hijau di atas makam Rasulullah ﷺ ---- */
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x1d6b45, roughness: 0.45, metalness: 0.12 });
    const DX = -30, DZ = FZ - 20;
    g.add(mesh(new THREE.BoxGeometry(17, 7, 17), stoneL, DX, FH + 3.5, DZ, { cast: false }));
    g.add(mesh(new THREE.CylinderGeometry(7.6, 8.4, 5.5, 8), stoneL, DX, FH + 9.7, DZ));
    const dome = mesh(domeGeometry(7.6, 10.5), greenMat, DX, FH + 12.4, DZ, { cast: false });
    g.add(dome);
    g.add(mesh(new THREE.SphereGeometry(0.6, 10, 8), mats.gold, DX, FH + 23.2, DZ, { cast: false }));
    const dCres = mesh(new THREE.TorusGeometry(0.9, 0.17, 6, 14, Math.PI * 1.35), mats.gold,
        DX, FH + 24.7, DZ, { cast: false });
    dCres.rotation.z = -Math.PI * 0.35;
    g.add(dCres);

    /* ---- Minaret ---- */
    for (const [mx, mz, mh] of [[-102, FZ - 1, 66], [102, FZ - 1, 66],
    [-102, FZ - 78, 62], [102, FZ - 78, 62], [-26, FZ - 2, 58], [26, FZ - 2, 58]]) {
        const mn = nabawiMinaret(mats, mh);
        mn.position.set(mx, 0, mz);
        g.add(mn);
    }

    /* ---- Payung raksasa di pelataran ---- */
    // Tiga baris di dalam pelataran (z -34..+14); tepi payung nyaris bersentuhan
    // seperti aslinya. Kolom digeser setengah petak agar sumbu x=0 menuju gerbang
    // utama bebas tiang — naungan kain tetap menutupi lorong itu, persis aslinya.
    const spots = [];
    for (let gx = -4; gx <= 3; gx++) {
        for (let gz = 0; gz < 3; gz++) {
            spots.push({ x: (gx + 0.5) * 24, z: -34 + gz * 24, lit: gz === 1 });
        }
    }
    nabawiUmbrellas(engine, g, origin, spots);

    /* ---- Suasana pelataran: palem, lampu, dispenser Zamzam, rak sandal ---- */
    for (let i = -4; i <= 4; i++) {
        const t = palmTree(mats, 1.15);
        t.position.set(i * 22, 0, 34);
        g.add(t);
        g.add(mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.7, 10), stoneL, i * 22, 0.35, 34, { cast: false }));
        // Bola lampu sudah emissive; tak perlu point light nyata di tiap tiang.
        const lp = lampPost(mats, 7.5);
        lp.position.set(i * 22 + 11, 0, 28);
        g.add(lp);
    }
    // Dispenser Zamzam berjajar di tepi pelataran — pemandangan sehari-hari di Nabawi
    const zam = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.42, 1.3, 12),
        new THREE.MeshStandardMaterial({ color: 0xdfe6ec, roughness: 0.5 }), 16);
    zam.castShadow = true;
    for (let i = 0; i < 16; i++) {
        mm.makeTranslation(-60 + (i % 8) * 17, 0.65, i < 8 ? -38 : 14);
        zam.setMatrixAt(i, mm);
    }
    g.add(zam);

    g.position.set(origin.x, 0, origin.z);
    scene.add(g);

    engine.addWalkRect(origin.x - 100, origin.z - 44, origin.x + 100, origin.z + 40);
    engine.configureMinimap({
        scale: 0.9, center: { x: origin.x, z: origin.z - 10 },
        features: [
            { type: 'square', x: origin.x, z: origin.z + FZ, color: '#e8c96a' },
            { type: 'point', x: origin.x + DX, z: origin.z + DZ, color: '#37c978' },
            ...spots.map(s => ({ type: 'point', x: origin.x + s.x, z: origin.z + s.z, color: '#6f8fb0' }))
        ]
    });
    return { origin, gatePos: { x: origin.x, z: origin.z - 40 }, door, dome };
}

export function busModel(mats) {
    const bus = new THREE.Group();
    // Warna dominan bus: putih elegan dengan aksen
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.3, metalness: 0.1 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.4, metalness: 0.8 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x0f5c35, roughness: 0.4 }); // Hijau Zamrud
    const goldMat = mats.gold;
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x050a14, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.7 });

    const L = 12.5, W = 2.8, H = 3.6;

    // 1. Badan Utama (Main Body)
    const mainBody = mesh(new THREE.BoxGeometry(L, H - 0.7, W), bodyMat, 0, 1.85, 0);
    bus.add(mainBody);
    
    // Atap melengkung aerodinamis
    const roofGeo = new THREE.CylinderGeometry(W/2, W/2, L, 20, 1, false, 0, Math.PI);
    roofGeo.rotateZ(Math.PI / 2);
    const roof = mesh(roofGeo, bodyMat, 0, 3.3, 0);
    bus.add(roof);

    // Kaca depan (Windshield) miring bergaya coach modern
    const windGeo = new THREE.BoxGeometry(0.2, 1.9, W - 0.1);
    const wind = mesh(windGeo, glassMat, L/2 - 0.35, 2.45, 0);
    wind.rotation.z = -0.28;
    bus.add(wind);

    // Kaca belakang
    const rearGlass = mesh(new THREE.BoxGeometry(0.2, 1.2, W - 0.2), glassMat, -L/2 + 0.1, 2.5, 0);
    rearGlass.rotation.z = 0.05;
    bus.add(rearGlass);

    // Jendela Samping memanjang (Panoramic)
    const sideWin = mesh(new THREE.BoxGeometry(L - 1.8, 1.25, W + 0.06), glassMat, 0.1, 2.5, 0);
    bus.add(sideWin);
    
    // Pilar-pilar jendela (Mullions)
    for (let x = -4.5; x <= 4.5; x += 1.5) {
        bus.add(mesh(new THREE.BoxGeometry(0.12, 1.25, W + 0.08), darkMat, x, 2.5, 0));
    }

    // Unit AC di atap
    const ac = mesh(new THREE.BoxGeometry(3.6, 0.45, 1.8), bodyMat, -1.5, 3.8, 0);
    bus.add(ac);
    for(let i=0; i<5; i++) {
        bus.add(mesh(new THREE.BoxGeometry(0.5, 0.46, 1.4), darkMat, -2.7 + i*0.6, 3.8, 0));
    }

    // Livery (Garis Aksen Samping)
    bus.add(mesh(new THREE.BoxGeometry(L + 0.02, 0.25, W + 0.02), accentMat, 0, 1.4, 0));
    bus.add(mesh(new THREE.BoxGeometry(L + 0.02, 0.08, W + 0.02), goldMat, 0, 1.15, 0));

    // Bumper Depan & Belakang
    bus.add(mesh(new THREE.BoxGeometry(0.4, 0.6, W + 0.04), darkMat, L/2 - 0.1, 0.6, 0));
    bus.add(mesh(new THREE.BoxGeometry(0.4, 0.6, W + 0.04), darkMat, -L/2 + 0.1, 0.6, 0));
    
    // Grille Depan
    bus.add(mesh(new THREE.BoxGeometry(0.45, 0.5, W - 0.8), darkMat, L/2 - 0.1, 1.1, 0));

    // Headlights (Lampu Depan) LED
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.5 });
    const signMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 1.2 });
    for(const sz of [-1, 1]) {
        bus.add(mesh(new THREE.BoxGeometry(0.45, 0.22, 0.35), hlMat, L/2 - 0.1, 0.9, sz * (W/2 - 0.35)));
        bus.add(mesh(new THREE.BoxGeometry(0.45, 0.08, 0.35), signMat, L/2 - 0.1, 1.05, sz * (W/2 - 0.35))); // Turn signal
    }

    // Taillights (Lampu Belakang)
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.5 });
    for(const sz of [-1, 1]) {
        bus.add(mesh(new THREE.BoxGeometry(0.45, 0.45, 0.25), tlMat, -L/2 + 0.1, 1.1, sz * (W/2 - 0.35)));
    }

    // Roda (Wheels) dengan detail
    const wheelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.45, 24);
    wheelGeo.rotateX(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.47, 16);
    rimGeo.rotateX(Math.PI / 2);
    const addWheel = (x, z) => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(wheelGeo, rubberMat));
        g.add(new THREE.Mesh(rimGeo, rimMat));
        g.position.set(x, 0.52, z);
        bus.add(g);
        // Fender cutout (Lengkungan hitam di atas roda)
        bus.add(mesh(new THREE.BoxGeometry(1.7, 0.6, 0.5), darkMat, x, 0.8, z > 0 ? W/2 : -W/2));
    };
    addWheel(3.8, W/2); addWheel(3.8, -W/2);     // Front axle
    addWheel(-2.8, W/2); addWheel(-2.8, -W/2);   // Rear axle 1
    addWheel(-4.2, W/2); addWheel(-4.2, -W/2);   // Rear axle 2 (Bus besar sering 3 axle)

    // Kaca Spion (Tanduk/Mantis mirrors khas bus besar)
    for(const sz of [-1, 1]) {
        const mArm = mesh(new THREE.BoxGeometry(0.12, 0.08, 0.7), darkMat, L/2 - 0.1, 2.8, sz * (W/2 + 0.25));
        mArm.rotation.y = sz * 0.4;
        bus.add(mArm);
        bus.add(mesh(new THREE.BoxGeometry(0.15, 0.6, 0.25), darkMat, L/2 + 0.1, 2.5, sz * (W/2 + 0.5)));
    }
    
    // Wiper blades
    bus.add(mesh(new THREE.BoxGeometry(0.04, 0.8, 0.04), darkMat, L/2 - 0.1, 1.8, 0.5, { ry: 0.5, rz: -0.28 }));
    bus.add(mesh(new THREE.BoxGeometry(0.04, 0.8, 0.04), darkMat, L/2 - 0.1, 1.8, -0.5, { ry: 0.5, rz: -0.28 }));

    // Pintu (Posisi tetap disesuaikan dengan interaksi scene_3)
    const busDoor = mesh(new THREE.BoxGeometry(1.2, 2.3, 0.2), glassMat, 4.4, 1.6, W/2 + 0.02);
    bus.add(busDoor);
    
    // Interior (Kursi & Lantai)
    const intMat = new THREE.MeshStandardMaterial({ color: 0x1f2429, roughness: 0.9 });
    bus.add(mesh(new THREE.BoxGeometry(L - 0.4, 0.2, W - 0.2), intMat, 0, 0.6, 0)); // Lantai
    
    // Kursi Penumpang (Layout disamakan dengan scene_3 agar sinkron dengan seatSpots)
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x224466, roughness: 0.7 });
    const seatHeadMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8 });
    for (let r = -4; r <= 4; r++) {
        for (const sx of [-1, 1]) {
            if (r === 4 && sx === 1) continue; 
            const cx = r * 1.1;
            const cz = sx * 0.9;
            bus.add(mesh(new THREE.BoxGeometry(0.6, 0.2, 0.9), seatMat, cx, 0.8, cz));
            bus.add(mesh(new THREE.BoxGeometry(0.15, 0.7, 0.9), seatMat, cx - 0.25, 1.2, cz));
            bus.add(mesh(new THREE.BoxGeometry(0.12, 0.2, 0.9), seatHeadMat, cx - 0.27, 1.6, cz)); // sandaran kepala
            bus.add(mesh(new THREE.BoxGeometry(0.5, 0.05, 0.1), mats.darkGrey, cx, 1.1, cz - 0.45)); // armrest
            bus.add(mesh(new THREE.BoxGeometry(0.5, 0.05, 0.1), mats.darkGrey, cx, 1.1, cz + 0.45));
        }
    }

    // Area Kemudi (Dashboard & Setir)
    bus.add(mesh(new THREE.BoxGeometry(0.8, 0.8, W-0.2), darkMat, L/2 - 0.6, 1.0, 0));
    const steer = mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 16), darkMat, L/2 - 0.8, 1.4, 0.7);
    steer.rotation.z = Math.PI / 4;
    bus.add(steer);
    // Kursi Supir
    bus.add(mesh(new THREE.BoxGeometry(0.6, 0.2, 0.7), darkMat, L/2 - 1.5, 0.8, 0.7));
    bus.add(mesh(new THREE.BoxGeometry(0.15, 0.8, 0.7), darkMat, L/2 - 1.8, 1.2, 0.7));

    return { bus, busDoor };
}

/**
 * VR Education Haji & Umrah ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Environment Builders
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

/** Deret lengkungan (arcade) sebagai InstancedMesh ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â gaya masjid. */
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


export function kaaba(mats) {
    // Skala nyata (ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§6): tinggi 13.1 m; sisi 12.86 m (sumbu X, sisi Hajar Aswad & pintu)
    // dan 11.03 m (sumbu Z). Sumber: Wikipedia "Kaaba" & data resmi Masjidil Haram.
    const W = 12.86, D = 11.03, H = 13.1;
    const hw = W / 2, hd = D / 2;
    const g = new THREE.Group();
    const body = mesh(new THREE.BoxGeometry(W, H, D), mats.kiswah, 0, H / 2, 0);
    g.add(body);
    // Pintu emas (Bab) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â tinggi ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â± 3.3 m, terangkat ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â± 2.2 m dari lantai, dekat sudut timur
    const door = mesh(new THREE.BoxGeometry(1.9, 3.3, 0.15), mats.gold, 2.2, 2.2 + 1.65, hd + 0.08, { cast: false });
    g.add(door);
    // Hajar Aswad ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â sudut timur (frame perak), ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â± 1.5 m di atas lantai
    const hajar = new THREE.Group();
    hajar.add(mesh(new THREE.TorusGeometry(0.45, 0.14, 10, 20), mats.steel, 0, 0, 0, { cast: false }));
    hajar.add(mesh(new THREE.SphereGeometry(0.26, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.3 }), 0, 0, 0, { cast: false }));
    hajar.position.set(hw - 0.1, 1.5, hd - 0.1);
    g.add(hajar);
    g.userData.hajarAswad = hajar;
    // Talang emas (mizab) di puncak dinding barat laut
    g.add(mesh(new THREE.BoxGeometry(0.6, 0.3, 2.4), mats.gold, 0, H + 0.2, -hd - 0.6, { cast: false }));
    // Hijr Ismail ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â dinding setengah lingkaran (Hatim) di sisi barat laut
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
    const goldBrass = new THREE.MeshStandardMaterial({ color: 0xd4a520, roughness: 0.12, metalness: 0.92, emissive: 0xc8980a, emissiveIntensity: 0.18 });
    const darkBrass = new THREE.MeshStandardMaterial({ color: 0x8a6010, roughness: 0.22, metalness: 0.85 });
    const glassMat  = new THREE.MeshPhysicalMaterial({ color: 0xd4c870, roughness: 0.04, metalness: 0.1, transmission: 0.55, transparent: true, opacity: 0.70 });
    const marbleMat = new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.28, metalness: 0.02 });
    const SIDES = 6, R = 1.35, BODY_H = 1.9, BASE_H = 0.35;
    
    const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.22, R + 0.30, BASE_H, SIDES), marbleMat);
    baseCyl.position.set(0, BASE_H / 2, 0); g.add(baseCyl);
    const baseStep = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.06, R + 0.22, 0.18, SIDES), marbleMat);
    baseStep.position.set(0, BASE_H + 0.09, 0); g.add(baseStep);
    
    const PANEL_Y0 = BASE_H + 0.18;
    const panelW = 2 * R * Math.sin(Math.PI / SIDES) - 0.08;
    for (let i = 0; i < SIDES; i++) {
        const ang = (i / SIDES) * Math.PI * 2 + Math.PI / 6;
        const px = Math.cos(ang) * R, pz = Math.sin(ang) * R;
        const gp = new THREE.Mesh(new THREE.BoxGeometry(panelW - 0.18, BODY_H - 0.12, 0.06), glassMat);
        gp.position.set(px * 0.96, PANEL_Y0 + BODY_H / 2, pz * 0.96);
        gp.rotation.y = ang + Math.PI / 2; g.add(gp);
        
        for (const s of [-1, 1]) {
            const fb = new THREE.Mesh(new THREE.BoxGeometry(0.08, BODY_H, 0.14), goldBrass);
            fb.position.set(px * 0.97 + Math.cos(ang) * s * (panelW / 2 - 0.06), PANEL_Y0 + BODY_H / 2, pz * 0.97 + Math.sin(ang) * s * (panelW / 2 - 0.06));
            fb.rotation.y = ang + Math.PI / 2; g.add(fb);
        }
        for (const yOff of [PANEL_Y0 + 0.04, PANEL_Y0 + BODY_H - 0.04]) {
            const hb = new THREE.Mesh(new THREE.BoxGeometry(panelW, 0.07, 0.12), goldBrass);
            hb.position.set(px * 0.97, yOff, pz * 0.97); hb.rotation.y = ang + Math.PI / 2; g.add(hb);
        }
        
        const aGeo = new THREE.TorusGeometry((panelW - 0.24) / 2 * 0.75, 0.04, 6, 22, Math.PI);
        const aM = new THREE.Mesh(aGeo, goldBrass);
        aM.position.set(px * 0.95, PANEL_Y0 + BODY_H * 0.68, pz * 0.95);
        aM.rotation.y = ang + Math.PI / 2; g.add(aM);
        
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 2; col++) {
                const ov = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 6, 16), goldBrass);
                const ox = (col - 0.5) * 0.28;
                ov.position.set(px * 0.94 + Math.cos(ang + Math.PI / 2) * ox, PANEL_Y0 + 0.28 + row * 0.32, pz * 0.94 + Math.sin(ang + Math.PI / 2) * ox);
                ov.rotation.y = ang + Math.PI / 2; g.add(ov);
            }
        }
        
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, BODY_H + 0.06, 0.1), goldBrass);
        post.position.set(Math.cos(ang) * (R + 0.02), PANEL_Y0 + BODY_H / 2, Math.sin(ang) * (R + 0.02));
        post.rotation.y = ang; g.add(post);
    }
    
    const CROWN_Y = PANEL_Y0 + BODY_H;
    [[R+0.18, R+0.12, 0.22, 0.11], [R+0.08, R+0.18, 0.18, 0.33], [R+0.14, R+0.08, 0.14, 0.47]].forEach(([rt, rb, h, yo]) => {
        const cr = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, SIDES), yo === 0.33 ? darkBrass : goldBrass);
        cr.position.set(0, CROWN_Y + yo, 0); g.add(cr);
    });
    
    const DOME_Y = CROWN_Y + 0.56, DOME_R = R * 0.80;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(DOME_R, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.58), goldBrass);
    dome.position.set(0, DOME_Y, 0); g.add(dome);
    const dRing = new THREE.Mesh(new THREE.TorusGeometry(DOME_R - 0.02, 0.06, 8, 32), goldBrass);
    dRing.position.set(0, DOME_Y, 0); dRing.rotation.x = Math.PI / 2; g.add(dRing);
    
    const SPIRE_Y = DOME_Y + DOME_R * 0.54;
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8), goldBrass);
    sp.position.set(0, SPIRE_Y + 0.27, 0); g.add(sp);
    [{ r: 0.11, y: 0.62 }, { r: 0.07, y: 0.79 }].forEach(({ r, y }) => {
        const b = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), goldBrass);
        b.position.set(0, SPIRE_Y + y, 0); g.add(b);
    });
    const cGeo = new THREE.TorusGeometry(0.10, 0.025, 8, 20, Math.PI * 1.35);
    const cMesh = new THREE.Mesh(cGeo, goldBrass);
    cMesh.position.set(0, SPIRE_Y + 0.95, 0); cMesh.rotation.z = -Math.PI * 0.1; g.add(cMesh);
    
    const iLight = new THREE.PointLight(0xffe090, 3, 8);
    iLight.position.set(0, PANEL_Y0 + 0.8, 0); g.add(iLight);
    
    return g;
}

/**
 * Masjidil Haram: lantai mataf, Ka'bah, arcade keliling, minaret, garis start tawaf.
 * @returns {object} referensi objek penting
 */
export function masjidilHaram(engine, { crowdInMataf = false } = {}) {
    const { scene, mats } = engine;
    // Lantai mataf marmer putih (dingin ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â sesuai marmer asli)
    const floor = engine.ground(220, mats.marble);
    floor.name = 'mataf-floor';

    const kb = kaaba(mats);
    scene.add(kb);

    // Garis coklat mulai tawaf ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â dari sudut Hajar Aswad ke arah luar
    const line = mesh(new THREE.BoxGeometry(0.5, 0.02, 34),
        new THREE.MeshStandardMaterial({ color: 0x6b4a1f, roughness: 0.9 }), 14, 0.02, 5.3, { cast: false });
    line.rotation.y = Math.PI / 2;
    line.position.set(24, 0.02, 5.3);
    scene.add(line);

    const maqam = maqamIbrahim(mats);
    maqam.position.set(11, 0, 8.5);
    scene.add(maqam);

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Arcade keliling: dinding dengan relung menjorok ke dalam + arch ÃƒÂ¢Ã‹â€ Ã‚Â© ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    const ARCADE_R = 78;
    const NUM_BAYS = 12, BAY_W = 6.5, BAY_H = 9, WALL_D = 3.5, COL_W = 0.9;
    const NICHE_W  = BAY_W - COL_W;
    const TOTAL_W  = NUM_BAYS * BAY_W;
    const LEVELS   = 2;
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc4, roughness: 0.72 });
    const goldMat  = new THREE.MeshStandardMaterial({ color: 0xc8a84b, roughness: 0.25, metalness: 0.85 });
    const darkMat  = new THREE.MeshStandardMaterial({ color: 0x3a2c1a, roughness: 0.85 });
    const buildArcadeWall = (posX, posZ, rotY) => {
        const g = new THREE.Group();
        for (let lvl = 0; lvl < LEVELS; lvl++) {
            const baseY = lvl * (BAY_H + 0.8);
            for (let bay = 0; bay < NUM_BAYS; bay++) {
                const bayX = bay * BAY_W - TOTAL_W / 2 + BAY_W / 2;
                const back = new THREE.Mesh(new THREE.BoxGeometry(NICHE_W - 0.1, BAY_H - 0.3, 0.22), darkMat);
                back.position.set(bayX, baseY + BAY_H / 2, -WALL_D / 2 + 0.11);
                g.add(back);
                const pilL = new THREE.Mesh(new THREE.BoxGeometry(COL_W, BAY_H, WALL_D), creamMat);
                pilL.position.set(bayX - BAY_W / 2 + COL_W / 2, baseY + BAY_H / 2, 0);
                g.add(pilL);
                const arch = new THREE.Mesh(new THREE.TorusGeometry((NICHE_W - 0.3) / 2, 0.28, 8, 28, Math.PI), goldMat);
                arch.position.set(bayX, baseY + BAY_H * 0.82, -WALL_D / 2 + 0.35);
                g.add(arch);
            }
            const pilR = new THREE.Mesh(new THREE.BoxGeometry(COL_W, BAY_H, WALL_D), creamMat);
            pilR.position.set(NUM_BAYS * BAY_W / 2 - COL_W / 2, baseY + BAY_H / 2, 0);
            g.add(pilR);
        }
        const topY = LEVELS * (BAY_H + 0.8);
        const topCap = new THREE.Mesh(new THREE.BoxGeometry(TOTAL_W + COL_W + 2, 2.5, WALL_D + 1), creamMat);
        topCap.position.set(0, topY + 1.25, 0);
        g.add(topCap);
        for (let mi = 0; mi <= NUM_BAYS * 2; mi += 2) {
            const merlon = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.4, WALL_D + 1), creamMat);
            merlon.position.set(-TOTAL_W / 2 + mi * BAY_W / 2, topY + 3.8, 0);
            g.add(merlon);
        }
        g.position.set(posX, 0, posZ); g.rotation.y = rotY; scene.add(g);
    };
    buildArcadeWall(0, -(ARCADE_R + 1), 0);
    buildArcadeWall(0,  (ARCADE_R + 1), Math.PI);
    buildArcadeWall(-(ARCADE_R + 1), 0,  Math.PI / 2);
    buildArcadeWall( (ARCADE_R + 1), 0, -Math.PI / 2);

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
        if (side === 0) carpet.position.z = -ARCADE_R + 6;
        if (side === 1) carpet.position.x = -ARCADE_R + 6;
        if (side === 2) carpet.position.z = ARCADE_R - 6;
        if (side === 3) carpet.position.x = ARCADE_R - 6;
        scene.add(carpet);
        
        // Letakkan deretan rak Qur'an dan Zamzam
        for (let i = -7; i <= 7; i += 2.5) {
            if (Math.abs(i) < 2) continue; // Area tengah kosong untuk gerbang masuk
            const px = i * 8;
            const pz = -ARCADE_R + 2;
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
    for (const [mx, mz] of [[-ARCADE_R, -ARCADE_R], [ARCADE_R, -ARCADE_R], [-ARCADE_R, ARCADE_R], [ARCADE_R, ARCADE_R]]) {
        const mn = minaret(mats, 52, 2);
        mn.position.set(mx, 0, mz);
        scene.add(mn);
    }
        // Menara jam (Abraj Al-Bait) siluet di kejauhan dengan jam detail
    const TX = 40, TZ = 190, TW = 34;
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x8a7f6d, roughness: 0.8 });
    const darkTowerMat = new THREE.MeshStandardMaterial({ color: 0x3a362f, roughness: 0.9 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x0a2a1a, emissive: 0x0a4a2a, emissiveIntensity: 0.3 });
    const goldEmit = new THREE.MeshStandardMaterial({ color: 0xffdf80, emissive: 0xffdf80, emissiveIntensity: 2.8 });

    // Main shaft (Bawah jam)
    scene.add(mesh(new THREE.BoxGeometry(TW, 140, TW), towerMat, TX, 70, TZ));
    
    // Clock section (Kubus tempat jam berada)
    const CLOCK_W = TW * 0.8;
    const CLOCK_H = 32;
    const CLOCK_Y = 140 + CLOCK_H / 2;
    scene.add(mesh(new THREE.BoxGeometry(CLOCK_W, CLOCK_H, CLOCK_W), darkTowerMat, TX, CLOCK_Y, TZ));

    // 4 Sisi Jam (menempel flush di permukaan kubus)
    for (let side = 0; side < 4; side++) {
        const ang = side * Math.PI / 2;
        // Normal face direction
        const nx = Math.sin(ang);
        const nz = Math.cos(ang);
        
        // Posisikan face sedikit keluar dari kubus clock section
        const faceR = (CLOCK_W / 2) + 0.1; 
        const fx = TX + nx * faceR;
        const fz = TZ + nz * faceR;

        const cg = new THREE.Group();
        cg.position.set(fx, CLOCK_Y, fz);
        
        // Karena CircleGeometry defaultnya menghadap +Z, 
        // kita tinggal rotate Y sesuai ang
        cg.rotation.y = ang;
        
        // Lingkaran dasar hijau
        const dial = mesh(new THREE.CircleGeometry(11, 32), greenMat, 0, 0, 0, { cast: false });
        cg.add(dial);
        
        // Frame melingkar jam emas
        const frame = mesh(new THREE.TorusGeometry(11, 0.4, 6, 32), goldEmit, 0, 0, 0.2, { cast: false });
        cg.add(frame);
        
        // Marker angka emas (12 titik)
        for (let i = 0; i < 12; i++) {
            const hAng = i * Math.PI / 6;
            const hx = Math.sin(hAng) * 9.5;
            const hy = Math.cos(hAng) * 9.5;
            const mk = mesh(new THREE.BoxGeometry(0.8, 1.8, 0.4), goldEmit, hx, hy, 0.2, { cast: false });
            mk.rotation.z = -hAng; 
            cg.add(mk);
        }
        // Jarum menit & jam
        const mHand = mesh(new THREE.BoxGeometry(0.6, 9, 0.5), goldEmit, 0, 4.5, 0.3, { cast: false });
        const hHand = mesh(new THREE.BoxGeometry(0.8, 6, 0.6), goldEmit, 0, 3, 0.4, { cast: false });
        mHand.rotation.z = -Math.PI / 6; 
        hHand.rotation.z = -Math.PI / 2;
        cg.add(mHand, hHand);
        
        scene.add(cg);
    }

    // Spire (Puncak runcing) + Bulan Sabit
    const SPIRE_Y = CLOCK_Y + CLOCK_H/2 + 20;
    scene.add(mesh(new THREE.ConeGeometry(8, 40, 8), towerMat, TX, SPIRE_Y, TZ));
    
    // Tiang akhir dan bulan sabit besar
    const FINIAL_Y = SPIRE_Y + 20;
    scene.add(mesh(new THREE.CylinderGeometry(0.6, 0.6, 20, 8), goldEmit, TX, FINIAL_Y + 10, TZ));
    const cres = mesh(new THREE.TorusGeometry(2.5, 0.5, 8, 20, Math.PI * 1.4), goldEmit, TX, FINIAL_Y + 22, TZ);
    cres.rotation.z = -Math.PI * 0.1;
    scene.add(cres);

    // Lampu sorot mataf (malam)
    if (engine.envPreset === 'night' || engine.envPreset === 'dawn') {
        for (const [lx, lz] of [[-40, -40], [40, -40], [-40, 40], [40, 40]]) {
            engine.addPointLamp(lx, 18, lz, { intensity: 160, distance: 130 });
        }
        engine.addPointLamp(0, 22, 0, { color: 0xfff6dd, intensity: 200, distance: 90 });
    }

    // Area jalan: mataf berbentuk cincin di sekitar Ka'bah + pelataran
    engine.addWalkCircle(0, 0, 70, 0);
    // badan Ka'bah (skala nyata 12.86 ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 11.03 m) + sedikit margin shadharwan
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

    // Bukit Shafa & Marwah ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â bongkahan batu granit berlapis yang kasar
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


export function airport(engine, { nameSign = 'BANDARA SOEKARNO-HATTA ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â TERMINAL 2U', arabic = false } = {}) {
    const { scene, mats } = engine;
    engine.ground(500, mats.tarmac, -0.02);

    // Lantai terminal ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â marmer mengkilap khas bandara
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
    const fidsTex = Tex.fids(arabic ? 'DEPARTURES ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚ÂºÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â©' : 'KEBERANGKATAN ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â DEPARTURES');
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
    hangSign('ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ CHECK-IN AÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œD', -12, -12);
    hangSign(arabic ? 'ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Âª ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â PASSPORT ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¾Ãƒâ€šÃ‚Â¡' : 'IMIGRASI ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¾Ãƒâ€šÃ‚Â¡', 14, -12);
    hangSign('GATE 11ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ14 ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¾Ãƒâ€šÃ‚Â¡', 26, 8, -0.5);
    hangSign('RUANG TUNGGU ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â WAITING', 0, 4, 0, 6);

    /* --- Petugas yang berjaga di tiap booth ---
     * Titik dikumpulkan di sini lalu dijadikan Crowd mode 'post' oleh scene.
     * Konvensi arah: ry = 0 menghadap +z, PI menghadap ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢z, PI/2 menghadap +x.
     * Tiap petugas berdiri di sisi belakang meja, menghadap sisi antrian. */
    const STAFF_AIRLINE = 0x1b3a6b; // seragam maskapai ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â biru navy
    const STAFF_OFFICER = 0x2f3b2a; // petugas imigrasi ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â hijau zaitun tua
    const STAFF_BARISTA = 0x6b3f22; // barista kafe ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â cokelat
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
        // Petugas berdiri di belakang meja (meja: z ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢24.8ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢23.2), menghadap antrian
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
    const kt = Tex.sign('ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã…â€œÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ KAFE & SNACK', { bg: '#3b2413', fg: '#ffd9a0', w: 640, h: 100 });
    kiosk.add(mesh(new THREE.BoxGeometry(0.2, 0.7, 3.0),
        new THREE.MeshStandardMaterial({ map: kt, emissive: 0xffffff, emissiveMap: kt, emissiveIntensity: 1.2 }),
        -1.55, 2.75, 0, { cast: false }));
    kiosk.position.set(-41.5, 0, 8);
    scene.add(kiosk);
    engine.addBlocker(-43.5, 6, -40.6, 10);
    // Barista di celah antara dinding belakang (x ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢42.85) dan meja (x ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢42.05), menghadap pembeli (+x)
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
        const it = Tex.sign(arabic ? 'ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Âª ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â PASSPORT' : 'IMIGRASI', { bg: '#4d130d', fg: '#ffd7a0', w: 512, h: 96 });
        b.add(mesh(new THREE.BoxGeometry(2.2, 0.6, 0.1),
            new THREE.MeshStandardMaterial({ map: it, emissive: 0xffffff, emissiveMap: it, emissiveIntensity: 1.2 }),
            0, 3.1, 0, { cast: false }));
        const bz = -18 + i * 8;
        b.position.set(24, 0, bz);
        imigrasi.add(b);
        engine.addBlocker(24 - 1.3, bz - 1.3, 24 + 1.3, bz + 1.3);
        // Petugas berdiri di sisi booth yang membelakangi koridor antrian (z ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢16.5ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢11.5),
        // menghadap ke koridor: booth utara menghadap +z, booth selatan menghadap ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢z.
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
    const gateTex = Tex.sign(arabic ? 'BAGGAGE ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â EXIT' : 'GATE 12 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â MADINAH', { bg: '#0d2b4d', fg: '#ffe9a8', w: 640, h: 110 });
    gate.add(mesh(new THREE.BoxGeometry(6, 1, 0.25),
        new THREE.MeshStandardMaterial({ map: gateTex, emissive: 0xffffff, emissiveMap: gateTex, emissiveIntensity: 1.3 }),
        0, 3.4, 0, { cast: false }));
    gate.add(mesh(new THREE.BoxGeometry(0.4, 3, 0.4), mats.steel, -2.6, 1.5, 0));
    gate.add(mesh(new THREE.BoxGeometry(0.4, 3, 0.4), mats.steel, 2.6, 1.5, 0));
    gate.add(mesh(new THREE.BoxGeometry(4.4, 2.6, 0.15), mats.glass, 0, 1.4, 0, { cast: false }));
    gate.position.set(36, 0, 18);
    gate.rotation.y = -Math.PI / 2;
    scene.add(gate);
    // Petugas boarding berdiri di samping pintu gate (bentang z 15.4ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦20.6), menghadap hall (ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢x)
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

/** Kabin pesawat (Ekonomi) & Ruang Pilot (Cockpit) Ã¢â‚¬â€ Sangat Realistik. */
/** Kabin pesawat ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â area terpisah jauh dari terminal. */
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

    // RUANG PILOT (COCKPIT) DI BAGIAN DEPAN (+X)
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


/**
 * Tinggi membran payung pada koordinat persegi u,v ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã¢â‚¬Â Ãƒâ€¹Ã¢â‚¬Â  [-1,1].
 * Bentuk tenda 4-sudut khas payung Nabawi (SL-Rasch): hub tertinggi di tiang,
 * empat rusuk diagonal menahan sudut, kain melengkung turun di antara rusuk
 * sehingga tepinya bergelombang ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â bukan kerucut lurus.
 */
function canopyHeight(u, v, { hub, corner, dip }) {
    const au = Math.abs(u), av = Math.abs(v);
    const m = Math.max(au, av);              // 0 di pusat ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ 1 di tepi persegi
    if (m < 1e-6) return hub;
    const n = Math.min(au, av) / m;          // 0 di tengah sisi ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ 1 di sudut
    const edge = dip + (corner - dip) * Math.pow(n, 1.3);
    return hub + (edge - hub) * Math.pow(m, 1.5);
}

/** Membran persegi dengan UV planar ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â motif ikut sejajar sisi payung. */
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
 * ditempatkan lewat InstancedMesh ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â 21 payung tetap ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â±8 draw call.
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
    // Rusuk: satu InstancedMesh per diagonal ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ 4 draw call untuk seluruh pelataran
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
        // Lampu memantul ke motif ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â khas menjelang maghrib. Hanya barisan yang
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
 * muazin, lalu mahkota emas berbulan sabit ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â profil bertingkat yang membedakan
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

/** Profil kubah bawang ringan (LatheGeometry) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â bahu penuh, puncak lancip. */
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

    // Portal utama (Bab as-Salam) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â lebih tinggi, berbingkai emas
    const portal = new THREE.Shape();
    portal.moveTo(-11, 0); portal.lineTo(11, 0); portal.lineTo(11, 24); portal.lineTo(-11, 24);
    portal.closePath();
    portal.holes.push(pointedArch(0, 11, 17.5));
    g.add(mesh(new THREE.ExtrudeGeometry(portal, { depth: 4.2, bevelEnabled: false }), stoneL, 0, 0, FZ - 4.2));
    g.add(mesh(new THREE.BoxGeometry(23.4, 1.1, 0.5), mats.gold, 0, 24.6, FZ - 4.4, { cast: false }));
    const gateTex = Tex.sign('ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â§ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã¢â€žÂ¢Ãƒâ€¦Ã‚Â  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â MASJID NABAWI', { bg: '#0e3b26', fg: '#ffe9a8', w: 1024, h: 120 });
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

    /* ---- Kubah Hijau di atas makam Rasulullah ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â·Ãƒâ€šÃ‚Âº ---- */
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
    // utama bebas tiang ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â naungan kain tetap menutupi lorong itu, persis aslinya.
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
    // Dispenser Zamzam berjajar di tepi pelataran ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â pemandangan sehari-hari di Nabawi
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


export function miqat(engine) {
    const { scene, mats } = engine;

    // Lantai dasar pasir di luar
    engine.ground(500, mats.sand);

    const miqatGroup = new THREE.Group();

    // 1. PELATARAN DALAM (COURTYARD) MASJID
    // Pelataran marmer 80x80m
    const courtyard = mesh(new THREE.BoxGeometry(80, 0.2, 80), mats.marbleTile, 0, 0.1, 0, { cast: false });
    miqatGroup.add(courtyard);

    // 2. DINDING BENTENG KELILING
    const wallH = 7;
    const wallThick = 1.2;
    // Tembok belakang (Utara) - Ruang Shalat Utama
    miqatGroup.add(mesh(new THREE.BoxGeometry(80, wallH + 4, wallThick), mats.creamWall, 0, (wallH + 4)/2, -40));
    engine.addBlocker(-40, -41, 40, -39); // Solid
    
    // Tembok Depan (Selatan) berlubang gerbang utama
    miqatGroup.add(mesh(new THREE.BoxGeometry(32, wallH, wallThick), mats.creamWall, -24, wallH/2, 40));
    miqatGroup.add(mesh(new THREE.BoxGeometry(32, wallH, wallThick), mats.creamWall, 24, wallH/2, 40));
    miqatGroup.add(mesh(new THREE.BoxGeometry(16, wallH - 5, wallThick), mats.creamWall, 0, wallH - 2.5, 40)); // Atas gerbang
    engine.addBlocker(-40, 39, -8, 41);
    engine.addBlocker(8, 39, 40, 41);
    
    // Tembok Samping Kiri (Barat) & Kanan (Timur)
    for (const sx of [-1, 1]) {
        miqatGroup.add(mesh(new THREE.BoxGeometry(wallThick, wallH, 80), mats.creamWall, sx * 40, wallH/2, 0));
        engine.addBlocker(sx * 40 - 1, -40, sx * 40 + 1, 40);
    }

    // 3. MENARA KHAS BIR ALI (5 MENARA SILINDER)
    // 1 Menara utama raksasa persegi bawah, silinder atas
    const mainTower = new THREE.Group();
    mainTower.add(mesh(new THREE.BoxGeometry(6, 18, 6), mats.creamWall, 0, 9, 0));
    mainTower.add(mesh(new THREE.CylinderGeometry(2.4, 2.4, 20, 16), mats.creamWall, 0, 28, 0));
    mainTower.add(mesh(new THREE.CylinderGeometry(2.8, 2.8, 1.5, 16), mats.darkGrey, 0, 19, 0)); // Balkon 1
    mainTower.add(mesh(new THREE.CylinderGeometry(1.8, 1.8, 12, 16), mats.creamWall, 0, 44, 0));
    mainTower.add(mesh(new THREE.CylinderGeometry(2.2, 2.2, 1.2, 16), mats.darkGrey, 0, 39, 0)); // Balkon 2
    const mtDome = mesh(new THREE.ConeGeometry(2, 6, 16), mats.gold, 0, 53, 0); // Mahkota runcing
    mainTower.add(mtDome);
    // Lampu hijau di menara
    mainTower.add(mesh(new THREE.CylinderGeometry(1.9, 1.9, 4, 16), new THREE.MeshBasicMaterial({color: 0x00ff88}), 0, 48, 0, {cast:false}));
    const mtLight = new THREE.PointLight(0x00ff88, 5, 100);
    mtLight.position.set(0, 48, 0); mainTower.add(mtLight);
    
    mainTower.position.set(-35, 0, -35); // Sudut kiri belakang
    miqatGroup.add(mainTower);

    // 4 Menara Sudut lebih kecil
    const cornerTowers = [ [40, -40], [-40, 40], [40, 40] ];
    for (const [tx, tz] of cornerTowers) {
        const ct = new THREE.Group();
        ct.add(mesh(new THREE.BoxGeometry(4, 12, 4), mats.creamWall, 0, 6, 0));
        ct.add(mesh(new THREE.CylinderGeometry(1.6, 1.6, 14, 16), mats.creamWall, 0, 19, 0));
        ct.add(mesh(new THREE.CylinderGeometry(2, 2, 1, 16), mats.darkGrey, 0, 12.5, 0));
        ct.add(mesh(new THREE.ConeGeometry(1.8, 4, 16), mats.gold, 0, 28, 0));
        ct.position.set(tx, 0, tz);
        miqatGroup.add(ct);
    }

    // 4. ARCADE LENGKUNG (RIWAK) DI KIRI KANAN COURTYARD
    // Khas lengkungan bata merah
    const redBrick = new THREE.MeshStandardMaterial({ color: 0x8b3a2b, roughness: 0.95 });
    for (const sx of [-1, 1]) {
        for (let i = 0; i < 9; i++) {
            const zPos = -28 + i * 7;
            const px = sx * 30;
            // Pilar
            miqatGroup.add(mesh(new THREE.BoxGeometry(1.2, 5, 1.2), mats.white, px, 2.5, zPos));
            // Lengkungan bata merah
            const arch = mesh(new THREE.TorusGeometry(3.5, 0.6, 8, 16, Math.PI), redBrick, px, 5.2, zPos + 3.5, { cast: false });
            arch.rotation.y = Math.PI / 2;
            miqatGroup.add(arch);
        }
        // Atap riwak
        miqatGroup.add(mesh(new THREE.BoxGeometry(20, 1, 72), mats.creamWall, sx * 30, 6.5, 4));
    }

    // 5. KELOMPOK 13 KUBAH KECIL (Khas Bir Ali)
    for (const sx of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
            const dome = mesh(new THREE.SphereGeometry(3.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.white, sx * 30, 7, -25 + i * 11, {cast:false});
            miqatGroup.add(dome);
            miqatGroup.add(mesh(new THREE.SphereGeometry(0.3, 8, 6), mats.gold, sx * 30, 10.8, -25 + i * 11, {cast:false}));
        }
    }
    // Kubah Utama besar di tengah ruang shalat
    miqatGroup.add(mesh(new THREE.SphereGeometry(8, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mats.white, 0, 11, -30, {cast:false}));
    miqatGroup.add(mesh(new THREE.SphereGeometry(0.5, 8, 6), mats.gold, 0, 19.5, -30, {cast:false}));

    // 6. AREA FASILITAS (WUDHU, MANDI, KAIN IHRAM)
    const bilik = new THREE.Group();
    bilik.add(mesh(new THREE.BoxGeometry(14, 4.5, 8), mats.creamWall, 0, 2.25, 0));
    const bt = Tex.sign('TEMPAT MANDI & WUDHU\nBATHS & ABLUTION', { bg: '#0d3b4d', fg: '#ffffff', w: 1024, h: 200, font: 'bold 50px sans-serif' });
    bilik.add(mesh(new THREE.BoxGeometry(10, 1.2, 0.15),
        new THREE.MeshStandardMaterial({ map: bt, emissive: 0xffffff, emissiveMap: bt, emissiveIntensity: 1 }),
        0, 5, 4.05, { cast: false }));
    bilik.position.set(-20, 0, -10);
    miqatGroup.add(bilik);
    engine.addBlocker(-27, -14, -13, -6); // Blocker solid bilik wudhu

    // Rak kain ihram
    const rak = new THREE.Group();
    for(let y=1.2; y<=2.8; y+=0.8) rak.add(mesh(new THREE.BoxGeometry(6, 0.1, 1.6), mats.wood, 0, y, 0));
    for (let i = 0; i < 7; i++) {
        rak.add(mesh(new THREE.BoxGeometry(0.7, 0.6, 1.2), new THREE.MeshStandardMaterial({ color: 0xf8f6ef, roughness: 0.95 }), -2.5 + i*0.8, 1.55, 0, { cast: false }));
        rak.add(mesh(new THREE.BoxGeometry(0.7, 0.6, 1.2), new THREE.MeshStandardMaterial({ color: 0xf8f6ef, roughness: 0.95 }), -2.5 + i*0.8, 2.35, 0, { cast: false }));
    }
    rak.add(mesh(new THREE.BoxGeometry(0.15, 3, 0.15), mats.wood, -2.9, 1.5, 0.7));
    rak.add(mesh(new THREE.BoxGeometry(0.15, 3, 0.15), mats.wood, 2.9, 1.5, 0.7));
    const rt = Tex.sign('KAIN IHRAM', { bg: '#3b2a0d', fg: '#ffe9a8', w: 512, h: 100, font: 'bold 44px sans-serif' });
    rak.add(mesh(new THREE.BoxGeometry(4.5, 0.8, 0.12), new THREE.MeshStandardMaterial({ map: rt, emissive: 0xffffff, emissiveMap: rt, emissiveIntensity: 1 }), 0, 3.4, 0, { cast: false }));
    rak.position.set(0, 0, -15);
    miqatGroup.add(rak);
    engine.addBlocker(-3.5, -16, 3.5, -14); // Blocker rak ihram

    // Sajadah sholat sunnah berderet di ruang shalat utama
    const sajadahGroup = new THREE.Group();
    for(let i=0; i<3; i++) sajadahGroup.add(mesh(new THREE.BoxGeometry(1.2, 0.04, 2), mats.carpetGreen, i*2, 0.02, 0, { cast: false }));
    sajadahGroup.position.set(16, 0, -25);
    miqatGroup.add(sajadahGroup);

    // 7. TAMAN & POHON KURMA DI HALAMAN
    const palmPositions = [ [-15, 15], [15, 15], [-20, 25], [20, 25], [0, 20] ];
    for (const [tx, tz] of palmPositions) {
        const t = palmTree(mats, 1.2 + Math.random() * 0.4);
        t.position.set(tx, 0, tz);
        miqatGroup.add(t);
        engine.addBlocker(tx - 0.6, tz - 0.6, tx + 0.6, tz + 0.6); // Pohon solid
    }

    // Tiang lampu antik
    for (let i = -1; i <= 1; i+=2) {
        const lp = lampPost(mats, 6);
        lp.position.set(i * 12, 0, 5);
        miqatGroup.add(lp);
    }

    // 8. BUS JAMAAH PARKIR DI DEPAN GERBANG
    const { bus, busDoor } = busModel(mats);
    const busM4 = new THREE.Matrix4().makeRotationY(Math.PI / 2);
    // Parkir melintang di depan gerbang utama luar (z = 48)
    busM4.setPosition(0, 0, 54);
    bus.position.set(0, 0, 54);
    bus.rotation.y = Math.PI / 2;
    scene.add(bus);

    const seatSpots = [];
    const tmpV = new THREE.Vector3();
    for (let r = -4; r <= 4; r++) {
        for (const sx of [-1, 1]) {
            if (r === 4 && sx === 1) continue; 
            tmpV.set(r * 1.1, 0, sx * 0.9).applyMatrix4(busM4);
            seatSpots.push({ x: tmpV.x, z: tmpV.z, ry: Math.PI / 2 - Math.PI / 2 });
        }
    }
    
    // Blocker fisik bus
    const addB = (cx, cz, rx, rz) => {
        let v = new THREE.Vector3(cx, 0, cz).applyMatrix4(busM4);
        engine.blockers.push({ x1: v.x - rx, z1: v.z - rz, x2: v.x + rx, z2: v.z + rz });
    };
    for (let x = -5.5; x <= 5.5; x += 1.5) {
        addB(x, -1.6, 0.8, 0.8); addB(x, 1.6, 0.8, 0.8);
    }
    for (let z = -1.5; z <= 1.5; z += 1.5) {
        addB(-6, z, 0.8, 0.8); addB(6, z, 0.8, 0.8);
    }

    scene.add(miqatGroup);

    engine.configureMinimap({
        scale: 1.5, center: { x: 0, z: 0 },
        features: [
            { type: 'square', x: -20, z: -10, color: '#57a9d9' }, // Bilik Wudhu
            { type: 'square', x: 0, z: -15, color: '#e8e2d2' }, // Rak Ihram
            { type: 'point', x: 16, z: -25, color: '#37c978' }, // Sajadah Sholat
            { type: 'square', x: 0, z: 54, color: '#d9d957' } // Bus
        ]
    });

    return { bilik, rak, sajadah: sajadahGroup, bus, busDoor, seatSpots };
}


/**
 * Padang Arafah: dataran luas, Jabal Rahmah dengan tugu putih, Masjid Namirah,
 * tenda-tenda putih, dan pepohonan. Puncak ibadah haji (9 Dzulhijjah).
 */
export function arafah(engine) {
    const { scene, mats } = engine;
    engine.ground(800, mats.sand);

    // Bukit-bukit kecoklatan di cakrawala (Vast Desert Feel)
    for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        const hill = mesh(new THREE.ConeGeometry(34 + Math.random() * 50, 15 + Math.random() * 25, 8), mats.rock,
            Math.cos(ang) * (220 + Math.random() * 80), 5, Math.sin(ang) * (220 + Math.random() * 80), { cast: false });
        scene.add(hill);
    }

    // Jabal Rahmah ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Tumpukan bongkahan granit besar
    const jabalPos = { x: -58, z: -66 };
    const jabal = new THREE.Group();
    
    // Base gundukan besar
    const baseGeo = new THREE.IcosahedronGeometry(18, 1);
    const bp = baseGeo.attributes.position;
    for (let i = 0; i < bp.count; i++) {
        bp.setXYZ(i, bp.getX(i), Math.max(0, bp.getY(i)) * 0.7, bp.getZ(i));
    }
    baseGeo.computeVertexNormals();
    jabal.add(mesh(baseGeo, mats.rock, 0, 0, 0));
    
    // Batu-batu raksasa menumpuk di atas base
    for(let i=0; i<15; i++) {
        const r = 3 + Math.random() * 5;
        const hx = (Math.random() - 0.5) * 16;
        const hz = (Math.random() - 0.5) * 16;
        const hy = 4 + (1 - (Math.hypot(hx, hz) / 12)) * 10 + Math.random() * 3;
        const rGeo = new THREE.DodecahedronGeometry(r, 0);
        const boulder = mesh(rGeo, mats.rock, hx, hy, hz);
        boulder.rotation.set(Math.random(), Math.random(), Math.random());
        jabal.add(boulder);
    }
    jabal.position.set(jabalPos.x, 0, jabalPos.z);
    scene.add(jabal);

    // Tugu putih (Monumen Jabal Rahmah) di puncak tertinggi
    const pillar = mesh(new THREE.BoxGeometry(2.0, 7.5, 2.0), mats.white, jabalPos.x, 18.5, jabalPos.z);
    scene.add(pillar);
    // Plat pelataran di bawah tugu
    scene.add(mesh(new THREE.BoxGeometry(4.0, 0.4, 4.0), mats.cream, jabalPos.x, 14.8, jabalPos.z, { cast: false }));
    // Pagar keliling plat tugu
    const platFenceGeo = new THREE.BoxGeometry(4.0, 1.2, 0.1);
    scene.add(mesh(platFenceGeo, mats.white, jabalPos.x, 15.4, jabalPos.z - 2.0));
    scene.add(mesh(platFenceGeo, mats.white, jabalPos.x, 15.4, jabalPos.z + 2.0));
    const platFenceZ = new THREE.BoxGeometry(0.1, 1.2, 4.0);
    scene.add(mesh(platFenceZ, mats.white, jabalPos.x - 2.0, 15.4, jabalPos.z));
    scene.add(mesh(platFenceZ, mats.white, jabalPos.x + 2.0, 15.4, jabalPos.z));

    // Masjid Namirah ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Fasade khas bercat kuning gading / krem terang
    const namirahMat = new THREE.MeshStandardMaterial({ color: 0xebd9a2, roughness: 0.95 });
    const wall = mesh(new THREE.BoxGeometry(120, 14, 4), namirahMat, 40, 7, -96);
    scene.add(wall);
    
    // Lengkungan khas masjid namirah
    const arc = arcade(mats, { count: 16, spacing: 6.5, height: 11, depth: 4.2 });
    // Override material arcade ke warna namirah
    arc.children.forEach(c => c.material = namirahMat);
    arc.position.set(40, 0, -94);
    scene.add(arc);
    
    const dome = mesh(new THREE.SphereGeometry(9, 22, 16, 0, Math.PI * 2, 0, Math.PI / 2), mats.white, 40, 14, -98, { cast: false });
    scene.add(dome);
    for (const mx of [-14, 94]) {
        const mn = minaret(mats, 44, 1.8);
        mn.position.set(mx, 0, -98);
        scene.add(mn);
    }
    const nt = Tex.sign('ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â³ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â¯ ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‹Å“Ãƒâ€šÃ‚Â© ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â MASJID NAMIRAH', { bg: '#0b2b1a', fg: '#ffe9a8', w: 1024, h: 110 });
    scene.add(mesh(new THREE.BoxGeometry(18, 2, 0.4),
        new THREE.MeshStandardMaterial({ map: nt, emissive: 0xffffff, emissiveMap: nt, emissiveIntensity: 0.6 }),
        40, 12.5, -93.8, { cast: false }));

    // Tenda-tenda Arafah (Kotak putih besar khas wukuf)
    const tentBodyGeo = new THREE.BoxGeometry(6.4, 3.2, 6.4);
    // Atap piramida
    const tentRoofGeo = new THREE.ConeGeometry(4.8, 1.8, 4);
    const tentMat = new THREE.MeshStandardMaterial({ color: 0xf9f7f1, roughness: 0.9, side: THREE.DoubleSide });
    const tentFrameMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.6, metalness: 0.5 });
    
    const tents = new THREE.Group();
    // Tiang penyangga teras tenda
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.2, 6);
    
    for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 11; col++) {
            // Beri sedikit celah tak beraturan agar terlihat alami
            if (Math.random() > 0.85) continue;
            
            const tx = 25 + col * 9 + (row % 2) * 2;
            const tz = 25 + row * 9;
            
            const tBody = mesh(tentBodyGeo, tentMat, tx, 1.6, tz);
            const tRoof = mesh(tentRoofGeo, tentMat, tx, 4.1, tz);
            tRoof.rotation.y = Math.PI/4;
            
            // Tambah teras/kanopi kecil di depan tenda
            const canopy = mesh(new THREE.PlaneGeometry(3, 2), tentMat, tx, 3.2, tz - 3.6, { ry: Math.PI });
            canopy.rotation.x = -Math.PI / 4;
            const p1 = mesh(poleGeo, tentFrameMat, tx - 1.4, 1.6, tz - 4.2);
            const p2 = mesh(poleGeo, tentFrameMat, tx + 1.4, 1.6, tz - 4.2);
            
            tents.add(tBody, tRoof, canopy, p1, p2);
            engine.addBlocker(tx - 3.2, tz - 3.2, tx + 3.2, tz + 3.2); // Tenda Arafah solid
        }
    }
    scene.add(tents);

    // Area tempat duduk dengan karpet (sebelumnya ada pepohonan di sini)
    for (const [tx, tz] of [[-30, 6], [-14, -14], [10, 10], [-40, -30], [24, -8], [-6, 20], [16, 26], [-20, 25], [12, -22], [-5, -35]]) {
        // Gelar ambal / karpet di bawah pohon untuk tempat duduk wukuf
        const carpet = mesh(new THREE.BoxGeometry(4.5, 0.05, 3.5), mats.carpetGreen, tx + (Math.random()-0.5)*2, 0.02, tz + (Math.random()-0.5)*2, { ry: Math.random() * 2 });
        scene.add(carpet);
    }
    
    // Gelar tikar/karpet di sekitar jamaah NPC duduk (dekat titik start)
    for (const cx of [-22, -18, -14]) {
        for (const cz of [26, 30, 34]) {
            scene.add(mesh(new THREE.BoxGeometry(3, 0.04, 3.5), mats.carpetGreen, cx + Math.random(), 0.02, cz + Math.random(), { ry: Math.random()*0.2 }));
        }
    }

    for (let i = 0; i < 4; i++) {
        const lp = lampPost(mats, 7.5);
        lp.position.set(-40 + i * 26, 0, -6);
        scene.add(lp);
    }
    
    // Bus-bus pengangkut jamaah parkir di tepi area wukuf
    for (let i = 0; i < 3; i++) {
        const b = busModel(mats).bus;
        b.position.set(-20 + i * 16, 0, -110);
        scene.add(b);
        engine.addBlocker(-26 + i * 16, -112, -14 + i * 16, -108);
    }

    // Solid Colliders
    engine.addBlocker(jabalPos.x - 18, jabalPos.z - 18, jabalPos.x + 18, jabalPos.z + 18);
    engine.addWalkRect(-70, -60, 90, 80);
    engine.configureMinimap({
        scale: 0.7, center: { x: 0, z: 0 },
        features: [
            { type: 'point', x: jabalPos.x, z: jabalPos.z, color: '#e8e2d2' },
            { type: 'square', x: 40, z: -96, color: '#ebd9a2' },
            { type: 'square', x: 70, z: 55, color: '#f9f7f1' }
        ]
    });
    return { jabal, pillar, jabalPos };
}


export function muzdalifah(engine) {
    const { scene, mats } = engine;
    engine.ground(600, mats.rock);

    // Bukit-bukit gelap di kejauhan
    for (let i = 0; i < 10; i++) {
        const hillGeo = new THREE.ConeGeometry(30 + Math.random() * 40, 18 + Math.random() * 22, 7);
        const hill = mesh(hillGeo, mats.darkGrey,
            Math.cos(i / 10 * Math.PI * 2) * (150 + Math.random() * 60), 0,
            Math.sin(i / 10 * Math.PI * 2) * (150 + Math.random() * 60), { cast: false });
        hill.position.y = 5;
        scene.add(hill);
    }

    // Lampu Sorot Jalan Raya (Ciri khas Muzdalifah: lampu kuning terang di malam hari)
    for (const lx of [-40, 40]) {
        for (const lz of [-50, 0, 50]) {
            const lp = lampPost(mats, 12);
            lp.position.set(lx, 0, lz);
            scene.add(lp);
            engine.addPointLamp(lx, 11.5, lz, { intensity: 100, distance: 70, color: 0xffd78a });
        }
    }

    // Karpet/Tikar tempat jamaah mabit (tidur/istirahat di tanah)
    const matColors = [mats.carpetGreen, mats.carpetRed, mats.darkGrey, mats.cream];
    for (let i = 0; i < 30; i++) {
        const matMesh = mesh(new THREE.BoxGeometry(2.2, 0.04, 1.2), 
            matColors[Math.floor(Math.random() * matColors.length)], 
            (Math.random() - 0.5) * 60, 0.02, (Math.random() - 0.5) * 40, 
            { ry: Math.random() * Math.PI, cast: false });
        scene.add(matMesh);
    }

    // Bus Parkir di pinggir jalan
    for (let i = 0; i < 4; i++) {
        const b = busModel(mats).bus;
        b.position.set(-50, 0, -40 + i * 25);
        b.rotation.y = Math.PI / 2;
        scene.add(b);
        engine.addBlocker(-52, -45 + i * 25, -48, -35 + i * 25);
    }

    // Batu kerikil interaktif ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â tersebar secara tunggal maupun mengelompok
    const pebbleGeo = new THREE.DodecahedronGeometry(0.09, 0);
    const pebbleMat = new THREE.MeshStandardMaterial({ color: 0xa89c8a, roughness: 0.95, emissive: 0x333333 }); 
    const clusters = [];
    
    // Buat 250 titik kerikil murni interaktif (TIDAK ADA batu palsu/dekoratif lagi)
    for (let i = 0; i < 250; i++) {
        const grp = new THREE.Group();
        // 85% peluang hanya 1 batu tunggal, 15% peluang mengelompok 2-4 batu
        const n = Math.random() > 0.15 ? 1 : 2 + Math.floor(Math.random() * 3);
        grp.userData.stoneCount = n; // Simpan jumlah batu untuk logika pengambilan
        
        for (let k = 0; k < n; k++) {
            const p = mesh(pebbleGeo, pebbleMat,
                (Math.random() - 0.5) * 0.4, 0.07, (Math.random() - 0.5) * 0.4);
            p.scale.setScalar(0.7 + Math.random() * 1.0);
            grp.add(p);
        }
        
        const r = 2 + Math.random() * 60; // Tersebar luas hingga radius 60 meter
        const ang = Math.random() * Math.PI * 2;
        grp.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
        scene.add(grp);
        clusters.push(grp);
    }

    // Lampu jalan jauh & bus
    for (let i = 0; i < 5; i++) {
        const lp = lampPost(mats, 8);
        lp.position.set(-50 + i * 25, 0, -46);
        scene.add(lp);
        engine.addPointLamp(-50 + i * 25, 8, -46, { intensity: 60, distance: 40 });
    }

    // Tikar jamaah beristirahat
    for (let i = 0; i < 6; i++) {
        const tikar = mesh(new THREE.BoxGeometry(2.4, 0.03, 1.6), mats.carpetGreen,
            -16 + (i % 3) * 6, 0.02, 14 + Math.floor(i / 3) * 4, { cast: false });
        scene.add(tikar);
    }

    engine.addWalkRect(-60, -50, 60, 40);
    engine.configureMinimap({
        scale: 1.4, center: { x: 0, z: 0 },
        features: clusters.map(c => ({ type: 'point', x: c.position.x, z: c.position.z, color: '#c9bda8' }))
    });
    return { clusters };
}


export function jamratPillar(mats, { height = 16 } = {}) {
    const g = new THREE.Group();
    // Dinding elips abu-abu (jamarat modern)
    const wallGeo = new THREE.CylinderGeometry(1.6, 2.2, height, 24);
    wallGeo.scale(2.6, 1, 1);
    const wall = mesh(wallGeo, mats.darkGrey, 0, height / 2, 0);
    g.add(wall);
    // Kolam penampung (basin)
    const basinGeo = new THREE.CylinderGeometry(6.5, 6.5, 1.4, 28, 1, true);
    basinGeo.scale(1.7, 1, 1);
    const basin = mesh(basinGeo, mats.grey, 0, 0.7, 0, { cast: false });
    g.add(basin);
    const basinFloor = mesh(new THREE.CylinderGeometry(6.5, 6.5, 0.1, 28), mats.rock, 0, 0.08, 0, { cast: false });
    basinFloor.scale.x = 1.7;
    g.add(basinFloor);
    g.userData.wall = wall;
    return g;
}

export function mina(engine, { withAllJamarat = false } = {}) {
    const { scene, mats } = engine;
    engine.ground(700, mats.sand);

    // Kota tenda putih ikonik ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â instanced
    const tentBody = new THREE.BoxGeometry(4, 2.2, 4);
    const tentRoof = new THREE.ConeGeometry(3.1, 1.6, 4);
    const tentMat = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.85 });
    const count = 220;
    const bodies = new THREE.InstancedMesh(tentBody, tentMat, count);
    const roofs = new THREE.InstancedMesh(tentRoof, tentMat, count);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
    const s1 = new THREE.Vector3(1, 1, 1);
    let idx = 0;
    for (let row = 0; row < 11 && idx < count; row++) {
        for (let col = 0; col < 20 && idx < count; col++) {
            const x = -95 + col * 10 + (row % 2) * 3;
            const z = 26 + row * 9;
            m4.makeTranslation(x, 1.1, z);
            bodies.setMatrixAt(idx, m4);
            m4.compose(new THREE.Vector3(x, 3.0, z), q, s1);
            engine.addBlocker(x - 2, z - 2, x + 2, z + 2); // Tenda solid
            roofs.setMatrixAt(idx, m4);
            idx++;
        }
    }
    bodies.castShadow = roofs.castShadow = true;
    bodies.receiveShadow = true;
    scene.add(bodies, roofs);

    // Bukit di kejauhan
    for (let i = 0; i < 8; i++) {
        const hill = mesh(new THREE.ConeGeometry(40 + Math.random() * 50, 24 + Math.random() * 20, 7), mats.rock,
            -200 + i * 60, 8, -160 - Math.random() * 60, { cast: false });
        scene.add(hill);
    }

    // Jembatan Jamarat Megah (Struktur Bangunan Modern bertingkat)
    // Lantai Pelataran Jamarat (Marmer/Beton)
    scene.add(mesh(new THREE.BoxGeometry(220, 1.2, 100), mats.marbleTile, 0, -0.55, -30, { cast: false }));
    
    // Atap Beton Jembatan (menandakan kita berada di salah satu lantai)
    scene.add(mesh(new THREE.BoxGeometry(220, 2.5, 100), mats.cream, 0, 18, -30, { cast: false }));
    
    // Pilar-Pilar Raksasa Penyangga Jembatan
    for (let px = -90; px <= 90; px += 30) {
        for (let pz = -70; pz <= 10; pz += 25) {
            // Kosongkan area tengah agar tiang Jumrah dan arus jamaah tidak terhalang
            if (Math.abs(px) < 25 && Math.abs(pz + 40) < 20) continue; 
            scene.add(mesh(new THREE.CylinderGeometry(2, 2, 18, 16), mats.grey, px, 9, pz));
            engine.addBlocker(px - 2, pz - 2, px + 2, pz + 2); // Pilar jembatan solid
        }
    }

    // Lampu Neon Terang di Langit-Langit (Ciri khas pencahayaan Jamarat yang sangat terang)
    for (let lx = -80; lx <= 80; lx += 40) {
        for (let lz = -60; lz <= 0; lz += 30) {
            scene.add(mesh(new THREE.BoxGeometry(14, 0.3, 2.5), mats.emissiveCool, lx, 16.7, lz));
            engine.addPointLamp(lx, 15, lz, { intensity: 120, distance: 60 });
        }
    }

    const jamarat = {};
    if (withAllJamarat) {
        const positions = [
            ['ula', -50, -40], ['wustha', 0, -40], ['aqabah', 50, -40]
        ];
        for (const [name, jx, jz] of positions) {
            const p = jamratPillar(mats);
            p.position.set(jx, 0, jz);
            scene.add(p);
            engine.addBlocker(jx - 3, jz - 3, jx + 3, jz + 3); // Tiang Jamrah solid
            jamarat[name] = p;
            const st = Tex.sign(
                name === 'ula' ? 'JUMRAH ULA' : name === 'wustha' ? 'JUMRAH WUSTHA' : 'JUMRAH AQABAH',
                { bg: '#333d33', fg: '#c8ffc8', w: 640, h: 100 });
            scene.add(mesh(new THREE.BoxGeometry(7, 1.1, 0.2),
                new THREE.MeshStandardMaterial({ map: st, emissive: 0xffffff, emissiveMap: st, emissiveIntensity: 1.1 }),
                jx, 12, jz + 14, { cast: false }));
        }
    } else {
        const p = jamratPillar(mats);
        p.position.set(0, 0, -40);
        scene.add(p);
        engine.addBlocker(-3, -43, 3, -37); // Tiang Jamrah solid
        jamarat.aqabah = p;
        const st = Tex.sign('JUMRAH AQABAH', { bg: '#0e3b26', fg: '#c8ffc8', w: 640, h: 100, font: 'bold 48px sans-serif' });
        scene.add(mesh(new THREE.BoxGeometry(8, 1.4, 0.2),
            new THREE.MeshStandardMaterial({ map: st, emissive: 0xffffff, emissiveMap: st, emissiveIntensity: 1.2 }),
            0, 12, -26, { cast: false }));
    }

    // Papan Petunjuk Jalan Imersif (Immersive UI)
    const signEntry = Tex.sign('ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ JALUR MELONTAR (TO JAMARAT) ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡', { bg: '#0e3b26', fg: '#ffe9a8', w: 1024, h: 120 });
    scene.add(mesh(new THREE.BoxGeometry(16, 2.5, 0.4),
        new THREE.MeshStandardMaterial({ map: signEntry, emissive: 0xffffff, emissiveMap: signEntry, emissiveIntensity: 1.1 }),
        0, 15, 18, { cast: false }));
        
    const signExit = Tex.sign('KELUAR / EXIT ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦', { bg: '#8b1c1c', fg: '#ffffff', w: 600, h: 120 });
    scene.add(mesh(new THREE.BoxGeometry(10, 2, 0.4),
        new THREE.MeshStandardMaterial({ map: signExit, emissive: 0xffffff, emissiveMap: signExit, emissiveIntensity: 1.1 }),
        -35, 10, -40, { cast: false }));

    // Tenda fasilitas dekat jalan
    for (let i = 0; i < 4; i++) {
        const lp = lampPost(mats, 7);
        lp.position.set(-45 + i * 30, 0, -18);
        scene.add(lp);
    }

    engine.addWalkRect(-100, -58, 100, 130);
    const features = [{ type: 'square', x: 0, z: 60, color: '#f2f0ea' }];
    if (withAllJamarat) {
        features.push(
            { type: 'point', x: -50, z: -40, color: '#d95757' },
            { type: 'point', x: 0, z: -40, color: '#d99a57' },
            { type: 'point', x: 50, z: -40, color: '#d9d957' });
    } else {
        features.push({ type: 'point', x: 0, z: -40, color: '#d95757' });
    }
    engine.configureMinimap({ scale: 0.75, center: { x: 0, z: 10 }, features });
    return { jamarat };
}


export function barberChair(mats) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), new THREE.MeshStandardMaterial({ color: 0x7c2d2d, roughness: 0.6 }), 0, 0.5, 0));
    g.add(mesh(new THREE.BoxGeometry(0.7, 0.8, 0.15), new THREE.MeshStandardMaterial({ color: 0x7c2d2d, roughness: 0.6 }), 0, 1.1, -0.28));
    g.add(mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.3, 10), mats.steel, 0, 0.15, 0));
    return g;
}

export function prayerMat(mats, x, z, ry = 0) {
    return mesh(new THREE.BoxGeometry(1.2, 0.04, 2), mats.carpetGreen, x, 0.02, z, { cast: false, ry });
}

export function slaughterArea(mats) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(10, 3.2, 6), mats.cream, 0, 1.6, 0));
    const t = Tex.sign('RUMAH PEMOTONGAN HADYU (DAM)', { bg: '#4d2a0d', fg: '#ffe0b8', w: 1024, h: 100 });
    g.add(mesh(new THREE.BoxGeometry(8, 0.9, 0.16),
        new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1 }),
        0, 3.8, 3.1, { cast: false }));
    return g;
}




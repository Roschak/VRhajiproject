/**
 * VR Education Haji & Umrah — Environment Builders
 * Semua lingkungan dibangun prosedural (PBR material + instancing)
 * agar tanpa dependensi asset eksternal namun tetap berkualitas tinggi.
 */
import { THREE, Tex } from './engine.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const DEG = Math.PI / 180;

function mesh(geo, mat, x = 0, y = 0, z = 0, { cast = true, receive = true, ry = 0 } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.castShadow = cast;
    m.receiveShadow = receive;
    return m;
}


/* Loader glTF generik: tiap URL di-load sekali (di-cache) lalu di-clone per
 * pemakaian. Prototype dinormalisasi — dasar di y=0, terpusat di sumbu XZ —
 * dengan ukuran asli tersimpan di userData.size. */
const _gltfCache = {};
function loadGltf(url) {
    if (!_gltfCache[url]) {
        _gltfCache[url] = new GLTFLoader().loadAsync(url).then(gltf => {
            const s = gltf.scene;
            s.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
            const box = new THREE.Box3().setFromObject(s);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            s.position.x -= center.x;
            s.position.z -= center.z;
            s.position.y -= box.min.y;
            const wrap = new THREE.Group();
            wrap.add(s);
            wrap.userData.size = size;
            return wrap;
        });
    }
    return _gltfCache[url];
}

function _proceduralPalm(mats, scale) {
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

export function palmTree(mats, scale = 1) {
    const g = new THREE.Group();
    loadGltf('/assets/date_palm/scene.gltf').then(proto => {
        const c = proto.clone(true);
        // samakan tinggi dengan versi prosedural (~6.4 m pada scale 1)
        c.scale.setScalar(6.4 * scale / proto.userData.size.y);
        c.rotation.y = Math.random() * Math.PI * 2; // variasi arah pelepah
        g.add(c);
    }).catch(err => {
        console.warn('Gagal memuat model pohon kurma, memakai versi prosedural:', err);
        g.add(_proceduralPalm(mats, scale));
    });
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


export function kaaba(mats) {
    // Skala nyata (§6): tinggi 13.1 m; sisi 12.86 m (sumbu X, sisi Hajar Aswad & pintu)
    // dan 11.03 m (sumbu Z). Visual memakai model glTF (wwwroot/assets/kaaba);
    // bila gagal dimuat, jatuh kembali ke versi prosedural lama.
    const W = 12.86, D = 11.03, H = 13.1;
    const hw = W / 2, hd = D / 2;
    const g = new THREE.Group();
    loadGltf('/assets/kaaba/scene.gltf').then(proto => {
        // Efek "lampu sorot" seperti aslinya: material dicerahkan dan diberi
        // pendar lembut mengikuti teksturnya agar hizam & kaligrafi emas
        // tetap terbaca di scene malam (tawaf).
        proto.traverse(o => {
            if (o.isMesh && o.material) {
                o.material.envMapIntensity = 1.4;
                if (o.material.map) {
                    // Hizam, kaligrafi, pintu: berpendar mengikuti teksturnya
                    o.material.emissiveMap = o.material.map;
                    o.material.emissive = new THREE.Color(0xffffff);
                    o.material.emissiveIntensity = 0.4;
                } else if (o.material.color.r + o.material.color.g + o.material.color.b < 0.25) {
                    // Kain kiswah hitam pekat → arang gelap + pendar tipis agar
                    // tetap tampak hitam namun terbaca di scene malam
                    o.material.color.setHex(0x26262c);
                    o.material.emissive = new THREE.Color(0x0b0b10);
                    o.material.emissiveIntensity = 1;
                }
                o.material.needsUpdate = true;
            }
        });
        const c = proto.clone(true);
        c.scale.setScalar(H / proto.userData.size.y);
        g.add(c);
    }).catch(err => {
        console.warn("Gagal memuat model Ka'bah, memakai versi prosedural:", err);
        g.add(_proceduralKaaba(mats));
    });

    // Hajar Aswad — sudut timur (frame perak), ± 1.5 m — tetap prosedural
    // karena jadi penanda arah/interaksi tawaf di scene.
    const hajar = new THREE.Group();
    hajar.add(mesh(new THREE.TorusGeometry(0.45, 0.14, 10, 20), mats.steel, 0, 0, 0, { cast: false }));
    hajar.add(mesh(new THREE.SphereGeometry(0.26, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.3 }), 0, 0, 0, { cast: false }));
    hajar.position.set(hw - 0.1, 1.5, hd - 0.1);
    g.add(hajar);
    g.userData.hajarAswad = hajar;
    g.userData.footprint = { hw, hd };
    return g;
}

function _proceduralKaaba(mats) {
    const W = 12.86, D = 11.03, H = 13.1;
    const hw = W / 2, hd = D / 2;
    const g = new THREE.Group();
    const body = mesh(new THREE.BoxGeometry(W, H, D), mats.kiswah, 0, H / 2, 0);
    g.add(body);

    // Material emas
    const goldEmb  = new THREE.MeshStandardMaterial({ color: 0xcaa74e, roughness: 0.34, metalness: 0.95, emissive: 0x7a5c18, emissiveIntensity: 0.6 });
    const goldDeep = new THREE.MeshStandardMaterial({ color: 0x8a6a1e, roughness: 0.42, metalness: 0.85, emissive: 0x3a2c08, emissiveIntensity: 0.42 });
    const bandMat  = new THREE.MeshStandardMaterial({ map: Tex.kiswahBand(), roughness: 0.34, metalness: 0.9, emissive: 0x6a5216, emissiveIntensity: 0.55 });
    bandMat.map.repeat.set(4, 1);

    const BELT_Y = H * 0.66, BELT_H = 1.15, BELT_BOT = BELT_Y - BELT_H / 2;

    // Qanadil: teardrop emas menggantung di bawah hizam
    const teardrop = () => {
        const d = new THREE.Group();
        d.add(mesh(new THREE.SphereGeometry(0.13, 10, 8), goldEmb, 0, 0, 0, { cast: false }));
        const cone = mesh(new THREE.ConeGeometry(0.13, 0.44, 10), goldEmb, 0, -0.24, 0, { cast: false });
        cone.rotation.x = Math.PI; // ujung runcing ke bawah
        d.add(cone);
        return d;
    };

    // Ornamen satu sisi (koordinat lokal: x mendatar, y tinggi, +z ke luar dari kain)
    const buildFace = (halfW, isDoor) => {
        const f = new THREE.Group();
        // Hizam (pita kaligrafi emas) + rel tipis atas-bawah
        f.add(mesh(new THREE.BoxGeometry(2 * halfW + 0.06, BELT_H, 0.16), bandMat, 0, BELT_Y, 0.05, { cast: false }));
        f.add(mesh(new THREE.BoxGeometry(2 * halfW + 0.06, 0.07, 0.18), goldDeep, 0, BELT_Y + BELT_H / 2, 0.06, { cast: false }));
        f.add(mesh(new THREE.BoxGeometry(2 * halfW + 0.06, 0.07, 0.18), goldDeep, 0, BELT_BOT, 0.06, { cast: false }));

        // Teardrop berderet
        const nDrop = Math.max(2, Math.round(halfW * 1.3));
        for (let i = 0; i < nDrop; i++) {
            const dx = -halfW + 0.7 + i * (2 * halfW - 1.4) / (nDrop - 1);
            const d = teardrop(); d.position.set(dx, BELT_BOT - 0.4, 0.1); f.add(d);
        }

        // Kartuş kaligrafi emas di bawah hizam
        const cartX = isDoor ? [-halfW * 0.62, -halfW * 0.22] : [-halfW * 0.6, 0, halfW * 0.6];
        for (const cx of cartX) {
            f.add(mesh(new THREE.BoxGeometry(2.1, 0.95, 0.05), goldDeep, cx, BELT_BOT - 1.5, 0.05, { cast: false }));
            f.add(mesh(new THREE.BoxGeometry(1.8, 0.66, 0.07), bandMat, cx, BELT_BOT - 1.5, 0.07, { cast: false }));
        }

        // Trim emas + baut cincin di dasar
        f.add(mesh(new THREE.BoxGeometry(2 * halfW + 0.06, 0.34, 0.18), goldDeep, 0, 0.5, 0.05, { cast: false }));
        const nBolt = Math.max(2, Math.round(halfW * 1.1));
        for (let i = 0; i < nBolt; i++) {
            const bx = -halfW + 0.6 + i * (2 * halfW - 1.2) / (nBolt - 1);
            f.add(mesh(new THREE.TorusGeometry(0.12, 0.04, 6, 12), goldEmb, bx, 0.5, 0.16, { cast: false }));
        }

        if (isDoor) {
            // Pintu emas (Bab) berukir — terangkat ± 2.2 m
            const door = new THREE.Group();
            door.add(mesh(new THREE.BoxGeometry(2.8, 3.8, 0.12), goldDeep, 0, 0, 0.02, { cast: false }));    // bingkai
            door.add(mesh(new THREE.BoxGeometry(2.3, 3.3, 0.14), goldEmb, 0, -0.06, 0.05, { cast: false }));  // daun pintu
            for (const s of [-1, 1]) door.add(mesh(new THREE.BoxGeometry(0.95, 3.0, 0.16), goldDeep, s * 0.55, -0.1, 0.07, { cast: false }));
            door.add(mesh(new THREE.BoxGeometry(2.5, 0.2, 0.16), goldDeep, 0, 1.72, 0.07, { cast: false }));   // ambang atas
            door.position.set(2.2, 2.2 + 1.9, 0.06); f.add(door);
            // Pita emas vertikal dari atas pintu menuju hizam
            const vTop = BELT_BOT, vBot = 6.05;
            f.add(mesh(new THREE.BoxGeometry(1.2, vTop - vBot, 0.09), goldEmb, 2.2, (vTop + vBot) / 2, 0.05, { cast: false }));
        }
        return f;
    };

    const doorFace = buildFace(hw, true);  doorFace.position.set(0, 0, hd); g.add(doorFace);
    const backFace = buildFace(hw, false); backFace.position.set(0, 0, -hd); backFace.rotation.y = Math.PI; g.add(backFace);
    const rFace = buildFace(hd, false); rFace.position.set(hw, 0, 0);  rFace.rotation.y =  Math.PI / 2; g.add(rFace);
    const lFace = buildFace(hd, false); lFace.position.set(-hw, 0, 0); lFace.rotation.y = -Math.PI / 2; g.add(lFace);

    // Talang emas (mizab) di puncak dinding barat laut
    g.add(mesh(new THREE.BoxGeometry(0.6, 0.3, 2.4), goldEmb, 0, H + 0.2, -hd - 0.6, { cast: false }));
    // Hijr Ismail — dinding setengah lingkaran (Hatim) di sisi barat laut
    const hijr = mesh(new THREE.CylinderGeometry(4.6, 4.6, 1.32, 32, 1, true, 0, Math.PI), mats.marble, 0, 0.66, -hd - 4, { cast: false });
    hijr.rotation.y = Math.PI;
    g.add(hijr);
    // Shadharwan (alas marmer miring) sedikit lebih lebar dari denah Ka'bah
    g.add(mesh(new THREE.BoxGeometry(W + 1.0, 0.5, D + 1.0), mats.marble, 0, 0.25, 0));
    return g;
}

export function maqamIbrahim(mats) {
    const g = new THREE.Group();

    // 1. Material Premium (MeshPhysicalMaterial)
    const goldBrass = new THREE.MeshPhysicalMaterial({
        color: 0xd4af37, // Emas mewah
        metalness: 1.0,
        roughness: 0.15,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2,
    });
    
    // Emas sedikit lebih gelap untuk rangka agar kontras
    const darkGold = new THREE.MeshPhysicalMaterial({
        color: 0xb8942b, 
        metalness: 1.0,
        roughness: 0.2,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.95, // Kaca tembus pandang
        ior: 1.5,
        opacity: 1.0,
        transparent: true,
        side: THREE.DoubleSide
    });

    const marbleMat = new THREE.MeshPhysicalMaterial({
        color: 0xf4f1ea, // Putih tulang/marmer
        metalness: 0.05,
        roughness: 0.3,
        clearcoat: 0.3
    });

    // 2. Dimensi Utama (Hexagon)
    const SIDES = 6;
    const RADIUS = 1.6; // Jari-jari luar ke vertex
    const APOTHEM = RADIUS * Math.cos(Math.PI / SIDES);
    const SIDE_LEN = 2 * RADIUS * Math.sin(Math.PI / SIDES);
    const BASE_H = 0.6;
    const CAGE_H = 2.6;
    
    // a. Alas Marmer Berundak (Hexagon)
    const base1 = new THREE.Mesh(new THREE.CylinderGeometry(RADIUS + 0.3, RADIUS + 0.35, 0.2, SIDES), marbleMat);
    base1.position.y = 0.1;
    base1.rotation.y = Math.PI / 2;
    base1.castShadow = true; base1.receiveShadow = true;
    g.add(base1);

    const base2 = new THREE.Mesh(new THREE.CylinderGeometry(RADIUS + 0.15, RADIUS + 0.25, 0.4, SIDES), marbleMat);
    base2.position.y = 0.4;
    base2.rotation.y = Math.PI / 2;
    base2.castShadow = true; base2.receiveShadow = true;
    g.add(base2);
    
    const cageStartY = BASE_H;

    // b. Sabuk Bawah Emas
    const bottomBelt = new THREE.Mesh(new THREE.CylinderGeometry(RADIUS + 0.05, RADIUS + 0.05, 0.15, SIDES), goldBrass);
    bottomBelt.position.y = cageStartY + 0.075;
    bottomBelt.rotation.y = Math.PI / 2;
    bottomBelt.castShadow = true; bottomBelt.receiveShadow = true;
    g.add(bottomBelt);

    // c. Pilar Sudut (Corner Posts)
    for (let i = 0; i < SIDES; i++) {
        const angle = (i / SIDES) * Math.PI * 2;
        const vx = Math.cos(angle) * RADIUS;
        const vz = Math.sin(angle) * RADIUS;

        const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, CAGE_H, 0.2), goldBrass);
        post.position.set(vx, cageStartY + CAGE_H / 2, vz);
        post.rotation.y = -angle; // Menghadap keluar
        post.castShadow = true; post.receiveShadow = true;
        g.add(post);
    }

    // d. Fasad per Sisi (Kaca, Lengkung Arch, Kisi-kisi, Ornamen)
    const faceW = SIDE_LEN - 0.2; // Lebar dalam antar pilar

    for (let i = 0; i < SIDES; i++) {
        const faceAng = (i / SIDES) * Math.PI * 2 + Math.PI / SIDES;
        const px = Math.cos(faceAng) * APOTHEM;
        const pz = Math.sin(faceAng) * APOTHEM;

        const face = new THREE.Group();
        face.position.set(px, cageStartY + 0.15, pz);
        face.rotation.y = -faceAng + Math.PI/2;

        // Kaca Pelindung
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(faceW, CAGE_H - 0.3), glassMat);
        glass.position.set(0, (CAGE_H - 0.3) / 2, -0.02);
        face.add(glass);

        // Kisi-kisi Emas (Lattice) dengan pemotongan matematis yang presisi
        const lattice = new THREE.Group();
        const ringRadius = 0.045;
        const ringTube = 0.008;
        const ringGeo = new THREE.TorusGeometry(ringRadius, ringTube, 8, 20);
        
        const spacingX = ringRadius * 1.5;
        const spacingY = ringRadius * 1.2;
        const cols = Math.floor(faceW / spacingX);
        const rows = Math.floor(CAGE_H / spacingY);
        
        const archH = faceW * 0.866; // Tinggi untuk equilateral pointed arch
        const archBaseY = CAGE_H - 0.3 - archH;

        for (let r = 0; r < rows; r++) {
            const xOffset = (r % 2 === 0) ? 0 : spacingX / 2;
            for (let c = 0; c < cols; c++) {
                const rx = -((cols-1)*spacingX)/2 + c * spacingX + xOffset;
                const ry = 0.05 + r * spacingY;
                
                // Batasan bentuk: Cincin terpotong rapi mengikuti bentuk Pointed Arch
                let isInside = true;
                
                // Jangan melebihi bingkai bawah dan atas
                if (ry < 0.1 || ry > CAGE_H - 0.3) isInside = false;

                if (ry > archBaseY) {
                    // Cek jarak ke pusat lingkaran lengkung kiri dan kanan
                    const distL = Math.hypot(rx - faceW/2, ry - archBaseY);
                    const distR = Math.hypot(rx - (-faceW/2), ry - archBaseY);
                    
                    // Harus berada di dalam irisan kedua lingkaran
                    if (distL > faceW - ringRadius || distR > faceW - ringRadius) {
                        isInside = false;
                    }
                }
                
                if (isInside) {
                    const ring = new THREE.Mesh(ringGeo, darkGold);
                    ring.position.set(rx, ry, 0);
                    // Miringkan sedikit pada sumbu X saja agar rapi
                    ring.rotation.x = (c % 2 === 0) ? 0.15 : -0.15;
                    lattice.add(ring);
                }
            }
        }
        face.add(lattice);

        // Lengkung Arch (Pointed Arch bergaya Islam) yang MATEMATIS SEMPURNA
        // Tidak akan mengambang atau keluar karena hanya menggunakan rotasi Z
        const archThickness = 0.015;
        
        // Arch Kiri (Menggunakan pusat di kanan bawah)
        const archGeo = new THREE.TorusGeometry(faceW, archThickness, 8, 32, Math.PI/3); // Busur 60 derajat
        
        const archL = new THREE.Mesh(archGeo, goldBrass);
        archL.position.set(faceW/2, archBaseY, 0.01);
        archL.rotation.z = Math.PI * (2/3); // Putar 120 derajat ke atas kiri
        face.add(archL);

        // Arch Kanan (Menggunakan pusat di kiri bawah)
        const archR = new THREE.Mesh(archGeo, goldBrass);
        archR.position.set(-faceW/2, archBaseY, 0.01);
        archR.rotation.z = 0; // Busur dari 0 ke 60 derajat (atas kanan)
        face.add(archR);
        
        // Bingkai Atas & Bawah Arch
        const archBaseLine = new THREE.Mesh(new THREE.BoxGeometry(faceW, archThickness*2, archThickness*2), goldBrass);
        archBaseLine.position.set(0, archBaseY, 0.01);
        face.add(archBaseLine);

        const topFrame = new THREE.Mesh(new THREE.BoxGeometry(faceW, archThickness*2, archThickness*2), goldBrass);
        topFrame.position.set(0, CAGE_H - 0.3, 0.01);
        face.add(topFrame);

        // Ornamen Spandrel (Sudut antara lengkung arch dan bingkai kotak atas)
        const spandrelRadius = 0.05;
        const spandrelCircle = new THREE.TorusGeometry(spandrelRadius, archThickness, 8, 16);
        for(const sign of [-1, 1]) {
            const circle = new THREE.Mesh(spandrelCircle, goldBrass);
            // Posisikan pas di tengah area spandrel
            circle.position.set(sign * (faceW/2 - spandrelRadius - 0.03), archBaseY + archH - spandrelRadius - 0.02, 0.01);
            face.add(circle);
            
            const dot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), goldBrass);
            dot.position.set(sign * (faceW/2 - spandrelRadius - 0.03), archBaseY + archH - spandrelRadius - 0.02, 0.01);
            face.add(dot);
        }

        g.add(face);
    }

    // e. Atap Segi Enam (Sloping Roof)
    const roofBaseY = cageStartY + CAGE_H;
    
    // Sabuk atas
    const topBelt = new THREE.Mesh(new THREE.CylinderGeometry(RADIUS + 0.05, RADIUS + 0.05, 0.15, SIDES), goldBrass);
    topBelt.position.y = roofBaseY;
    topBelt.rotation.y = Math.PI / 2;
    g.add(topBelt);

    // Atap miring piramida heksagonal
    const roofHeight = 1.0;
    const roofTopRadius = 0.6; // Mengerucut ke tabung tengah
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(roofTopRadius, RADIUS + 0.05, roofHeight, SIDES), darkGold);
    roof.position.y = roofBaseY + roofHeight/2 + 0.075;
    roof.rotation.y = Math.PI / 2;
    g.add(roof);

    // f. Tabung Silinder Tengah (Drum)
    const drumH = 0.4;
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(roofTopRadius, roofTopRadius, drumH, 32), goldBrass);
    drum.position.y = roofBaseY + roofHeight + drumH/2;
    g.add(drum);

    // Ornamen garis vertikal di drum
    for(let i=0; i<16; i++) {
        const ang = (i/16) * Math.PI * 2;
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.02, drumH, 0.04), darkGold);
        rib.position.set(Math.cos(ang) * roofTopRadius, roofBaseY + roofHeight + drumH/2, Math.sin(ang) * roofTopRadius);
        rib.rotation.y = -ang;
        g.add(rib);
    }

    // g. Kubah Utama (Dome) Emas
    const domeRadius = roofTopRadius + 0.05;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(domeRadius, 32, 32, 0, Math.PI*2, 0, Math.PI/2), goldBrass);
    // Skala Y untuk membuat kubah agak lonjong ke atas
    dome.scale.y = 1.2;
    dome.position.y = roofBaseY + roofHeight + drumH;
    g.add(dome);

    // h. Bulan Sabit (Crescent Finial)
    const spireY = roofBaseY + roofHeight + drumH + domeRadius * 1.2;
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.5, 16), goldBrass);
    spire.position.y = spireY + 0.25;
    g.add(spire);
    
    const ball1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), goldBrass);
    ball1.position.y = spireY + 0.15;
    g.add(ball1);
    
    const ball2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), goldBrass);
    ball2.position.y = spireY + 0.35;
    g.add(ball2);

    const crescentGeo = new THREE.TorusGeometry(0.15, 0.03, 16, 32, Math.PI * 1.5);
    const crescent = new THREE.Mesh(crescentGeo, goldBrass);
    crescent.position.y = spireY + 0.6;
    crescent.rotation.z = -Math.PI / 4;
    crescent.rotation.y = Math.PI / 2;
    g.add(crescent);

    // i. Batu Pijakan Dalam (Hajar Maqam)
    const stoneGeom = new THREE.DodecahedronGeometry(0.5, 1);
    const positions = stoneGeom.attributes.position;
    for(let i = 0; i < positions.count; i++) {
        const vx = positions.getX(i);
        const vy = positions.getY(i);
        const vz = positions.getZ(i);
        positions.setXYZ(i, vx + (Math.random()-0.5)*0.08, vy + (Math.random()-0.5)*0.08, vz + (Math.random()-0.5)*0.08);
    }
    stoneGeom.computeVertexNormals();

    const stone = new THREE.Mesh(stoneGeom, new THREE.MeshPhysicalMaterial({ color: 0x888888, roughness: 1.0, bumpScale: 0.05 }));
    stone.position.y = cageStartY + CAGE_H / 2 - 0.2;
    g.add(stone);

    // Pencahayaan internal
    const innerLight = new THREE.PointLight(0xffdfaa, 2.0, 5);
    innerLight.position.set(0, cageStartY + CAGE_H / 2, 0);
    g.add(innerLight);

    // Sesuaikan skala keseluruhan
    g.scale.setScalar(0.7);

    // Enable shadows
    g.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

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
    // OPTIMASI PERFORM: Kurangi dari 4 PointLight menjadi 1 PointLight di tengah atas Ka'bah
    // Menghitung 4 PointLight untuk ratusan karakter menyebabkan penurunan FPS yang parah. 1 lampu sudah cukup terang.
    engine.addPointLamp(0, 16, 0, { color: 0xfff2d8, intensity: 140, distance: 80 });

    // Garis coklat mulai tawaf — dari sudut Hajar Aswad ke arah luar
    const line = mesh(new THREE.BoxGeometry(0.5, 0.02, 34),
        new THREE.MeshStandardMaterial({ color: 0x6b4a1f, roughness: 0.9 }), 14, 0.02, 5.3, { cast: false });
    line.rotation.y = Math.PI / 2;
    line.position.set(24, 0.02, 5.3);
    scene.add(line);

    const maqam = maqamIbrahim(mats);
    maqam.position.set(11, 0, 8.5);
    scene.add(maqam);

    // ── Arcade keliling bergaya Masjidil Haram ─────────────────────────────────
    // Fasad batu krem berlubang lengkung runcing (pointed arch) 2 tingkat, membentuk
    // cincin menerus mengelilingi mataf — mengikuti foto referensi Masjidil Haram.
    const ARCADE_R = 78;
    const WALL_Z   = ARCADE_R + 1;           
    const SIDE     = 2 * WALL_Z + 6;         
    const NUM_BAYS = 24;
    const BAY_W    = SIDE / NUM_BAYS;
    const WALL_D   = 1.5; // Dinding fasad dibuat lebih tipis agar berkesan seperti gerbang masuk
    const GROUND_H = 9.5, UPPER_H = 6.4, BAND_H = 1.1;
    const TOTAL_H  = GROUND_H + BAND_H + UPPER_H;

    const creamMat = new THREE.MeshStandardMaterial({ color: 0xe9dec6, roughness: 0.7 });
    const creamHi  = new THREE.MeshStandardMaterial({ color: 0xf2ead6, roughness: 0.6 });
    const goldInteriorMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.85 }); // Emas mengkilap
    const darkInteriorMat = new THREE.MeshStandardMaterial({ color: 0x030303, roughness: 0.95 }); // Sangat gelap untuk kesan ruangan dalam

    // Geometri fasad berlubang lengkung runcing (dibuat sekali, dipakai untuk 4 sisi)
    const makeArchFacade = (panelH, openFrac) => {
        const shape = new THREE.Shape();
        shape.moveTo(-SIDE / 2, 0); shape.lineTo(SIDE / 2, 0);
        shape.lineTo(SIDE / 2, panelH); shape.lineTo(-SIDE / 2, panelH); shape.lineTo(-SIDE / 2, 0);
        const openW = BAY_W * openFrac;
        const rise  = openW * Math.sqrt(3) / 2;      // lengkung runcing sama-sisi (equilateral pointed arch)
        const springY = panelH - rise - 0.7;
        const footY = 0.5;
        for (let b = 0; b < NUM_BAYS; b++) {
            const cx = -SIDE / 2 + BAY_W * (b + 0.5);
            const l = cx - openW / 2, r = cx + openW / 2;
            const hole = new THREE.Path();
            hole.moveTo(l, footY);
            hole.lineTo(l, springY);
            hole.absarc(r, springY, openW, Math.PI, Math.PI * 2 / 3, true);  // kaki kiri → puncak
            hole.absarc(l, springY, openW, Math.PI / 3, 0, true);            // puncak → kaki kanan
            hole.lineTo(r, footY);
            hole.lineTo(l, footY);
            shape.holes.push(hole);
        }
        const geo = new THREE.ExtrudeGeometry(shape, { depth: WALL_D, bevelEnabled: false, curveSegments: 8 });
        geo.computeVertexNormals();
        return geo;
    };
    const groundGeo = makeArchFacade(GROUND_H, 0.66);
    const upperGeo  = makeArchFacade(UPPER_H, 0.60);

    const buildArcadeWall = (posX, posZ, rotY) => {
        const g = new THREE.Group();
        const ground = new THREE.Mesh(groundGeo, creamMat);
        // OPTIMASI PERFORM: Matikan bayangan pada dinding arsitektur yang poligonnya padat
        ground.castShadow = false; ground.receiveShadow = true;
        g.add(ground);
        // Pita lantai antar-tingkat
        g.add(mesh(new THREE.BoxGeometry(SIDE, BAND_H, WALL_D + 0.5), creamHi, 0, GROUND_H + BAND_H / 2, WALL_D / 2));
        // Tingkat atas (galeri)
        const upper = new THREE.Mesh(upperGeo, creamMat);
        upper.position.y = GROUND_H + BAND_H;
        upper.castShadow = false; upper.receiveShadow = true;
        g.add(upper);
        // Parapet + merlon bergigi
        g.add(mesh(new THREE.BoxGeometry(SIDE, 1.4, WALL_D + 0.6), creamHi, 0, TOTAL_H + 0.7, WALL_D / 2));
        for (let m = 0; m < NUM_BAYS; m++) {
            const mx = -SIDE / 2 + BAY_W * (m + 0.5);
            g.add(mesh(new THREE.BoxGeometry(BAY_W * 0.5, 1.6, WALL_D + 0.6), creamMat, mx, TOTAL_H + 2.1, WALL_D / 2, { cast: false }));
        }
        
        // INTERIOR BANGUNAN EMAS YANG BISA DIMASUKI (Menggantikan dinding gelap)
        const INTERIOR_D = 25; // Kedalaman ruangan (menjorok ke dalam)
        const BACK_W = SIDE + (2 * INTERIOR_D) + 10; // Dibuat jauh lebih lebar untuk menutup celah (gap) di sudut
        
        // Lantai interior gelap
        g.add(mesh(new THREE.BoxGeometry(BACK_W, 0.2, INTERIOR_D), darkInteriorMat, 0, 0.1, -INTERIOR_D / 2, { cast: false }));
        // Atap interior gelap
        g.add(mesh(new THREE.BoxGeometry(BACK_W, 0.5, INTERIOR_D), darkInteriorMat, 0, TOTAL_H, -INTERIOR_D / 2, { cast: false }));
        // Dinding belakang tertutup rapat dan gelap gulita
        g.add(mesh(new THREE.BoxGeometry(BACK_W, TOTAL_H, 1.0), darkInteriorMat, 0, TOTAL_H / 2, -INTERIOR_D - 0.5, { cast: false }));
        
        g.position.set(posX, 0, posZ); g.rotation.y = rotY; scene.add(g);
    };
    buildArcadeWall(0, -WALL_Z, 0);
    buildArcadeWall(0,  WALL_Z, Math.PI);
    buildArcadeWall(-WALL_Z, 0,  Math.PI / 2);
    buildArcadeWall( WALL_Z, 0, -Math.PI / 2);

    // Tenda peneduh putih meruncing berderet di tepi pelataran (seperti foto)
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xf6f3ea, roughness: 0.85, side: THREE.DoubleSide });
    const CANOPY_R = 74;
    for (let side = 0; side < 4; side++) {
        const ang = side * Math.PI / 2;
        for (let t = -6; t <= 6; t++) {
            const lx = t * 11;
            if (Math.abs(lx) > SIDE / 2 - 10) continue;
            const c = new THREE.Group();
            c.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.4, 8), mats.grey, 0, 2.2, 0, { cast: false }));
            c.add(mesh(new THREE.ConeGeometry(3.4, 2.7, 4), canopyMat, 0, 5.7, 0, { cast: false }));
            c.position.copy(new THREE.Vector3(lx, 0, -CANOPY_R).applyAxisAngle(new THREE.Vector3(0, 1, 0), ang));
            c.rotation.y = ang + Math.PI / 4;
            scene.add(c);
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
    // Minaret putih ramping berkubah hijau + bulan sabit (seperti foto referensi)
    const whiteM = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.55 });
    const greenM = new THREE.MeshStandardMaterial({ color: 0x1d5b3a, roughness: 0.5, metalness: 0.2 });
    const buildHaramMinaret = (x, z, h) => {
        const g = new THREE.Group();
        g.add(mesh(new THREE.BoxGeometry(3.2, h * 0.10, 3.2), whiteM, 0, h * 0.05, 0));                       // dasar persegi
        g.add(mesh(new THREE.CylinderGeometry(1.15, 1.4, h * 0.48, 16), whiteM, 0, h * 0.10 + h * 0.24, 0));  // batang bawah
        g.add(mesh(new THREE.CylinderGeometry(1.55, 1.55, h * 0.04, 16), greenM, 0, h * 0.58, 0));            // balkon 1
        g.add(mesh(new THREE.CylinderGeometry(0.85, 1.08, h * 0.22, 16), whiteM, 0, h * 0.71, 0));            // batang atas
        g.add(mesh(new THREE.CylinderGeometry(1.15, 1.15, h * 0.03, 16), greenM, 0, h * 0.83, 0));            // balkon 2
        g.add(mesh(new THREE.CylinderGeometry(0.68, 0.85, h * 0.09, 12), whiteM, 0, h * 0.89, 0));            // ruang muadzin
        g.add(mesh(new THREE.SphereGeometry(0.9, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), greenM, 0, h * 0.94, 0, { cast: false })); // kubah hijau
        g.add(mesh(new THREE.ConeGeometry(0.5, h * 0.06, 12), greenM, 0, h * 0.985, 0, { cast: false }));
        g.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, h * 0.05, 8), mats.gold, 0, h * 1.02, 0, { cast: false })); // pucuk
        const cr = mesh(new THREE.TorusGeometry(0.55, 0.12, 8, 18, Math.PI * 1.4), mats.gold, 0, h * 1.06, 0, { cast: false });
        cr.rotation.z = -Math.PI * 0.1; g.add(cr);                                                            // bulan sabit
        g.position.set(x, 0, z); scene.add(g);
    };
    // Pasangan menonjol membingkai gerbang utara dipindah ke luar bangunan baru
    const OUTER_Z = WALL_Z + 27; // Dipindah ke luar agar tidak terlihat dari dalam ruangan/pelataran
    buildHaramMinaret(-16, -OUTER_Z, 66);
    buildHaramMinaret( 16, -OUTER_Z, 66);
    // Minaret di 4 sudut kompleks (Dipindah ke luar dinding ruangan gelap)
    for (const [mx, mz] of [[-OUTER_Z, -OUTER_Z], [OUTER_Z, -OUTER_Z], [-OUTER_Z, OUTER_Z], [OUTER_Z, OUTER_Z]])
        buildHaramMinaret(mx, mz, 56);
        // Menara jam (Abraj Al-Bait) siluet di kejauhan dengan jam detail
    const TX = 40, TZ = 190, TW = 34;
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x8a7f6d, roughness: 0.8 });
    const darkTowerMat = new THREE.MeshStandardMaterial({ color: 0x3a362f, roughness: 0.9 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x0a2a1a, emissive: 0x0a4a2a, emissiveIntensity: 0.3 });
    const goldEmit = new THREE.MeshStandardMaterial({ color: 0xffdf80, emissive: 0xffdf80, emissiveIntensity: 2.8 });

    // Efek menyala malam hari untuk gedung-gedung tinggi
    const isNight = engine.envPreset === 'night' || engine.envPreset === 'dawn';
    const hotelWinMat = new THREE.MeshStandardMaterial({ 
        color: 0x112233, 
        emissive: 0xffd080, 
        emissiveIntensity: isNight ? 1.0 : 0.0,
        roughness: 0.2
    });

    // Main shaft (Bawah jam) - Dengan Jendela Menyala
    const clockTowerMain = new THREE.Group();
    clockTowerMain.add(mesh(new THREE.BoxGeometry(TW, 140, TW), towerMat, 0, 70, 0));
    for(let wy = 15; wy < 130; wy += 4.5) {
        for(let wx = -TW/2 + 3; wx <= TW/2 - 3; wx += 4) {
            clockTowerMain.add(mesh(new THREE.BoxGeometry(1.5, 2.5, 0.2), hotelWinMat, wx, wy, TW/2 + 0.05));
            clockTowerMain.add(mesh(new THREE.BoxGeometry(1.5, 2.5, 0.2), hotelWinMat, wx, wy, -TW/2 - 0.05));
        }
        for(let wz = -TW/2 + 3; wz <= TW/2 - 3; wz += 4) {
            clockTowerMain.add(mesh(new THREE.BoxGeometry(0.2, 2.5, 1.5), hotelWinMat, TW/2 + 0.05, wy, wz));
            clockTowerMain.add(mesh(new THREE.BoxGeometry(0.2, 2.5, 1.5), hotelWinMat, -TW/2 - 0.05, wy, wz));
        }
    }
    clockTowerMain.position.set(TX, 0, TZ);
    scene.add(clockTowerMain);
    
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

    // ── GEDUNG-GEDUNG PENCAKAR LANGIT PENGELILING MAKKAH ──
    const whiteTowerMat = new THREE.MeshStandardMaterial({ color: 0xe5e5e5, roughness: 0.6 });
    const whiteDarkTowerMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });

    function addHotelTower(x, z, w, h, d, mat = towerMat, roofMat = darkTowerMat) {
        const bld = new THREE.Group();
        bld.add(mesh(new THREE.BoxGeometry(w, h, d), mat, 0, h/2, 0));
        // Jendela bercahaya malam
        for(let wy = 15; wy < h - 10; wy += 4.5) {
            for(let wx = -w/2 + 2; wx <= w/2 - 2; wx += 3.5) {
                bld.add(mesh(new THREE.BoxGeometry(1.2, 2.5, 0.2), hotelWinMat, wx, wy, d/2 + 0.05));
                bld.add(mesh(new THREE.BoxGeometry(1.2, 2.5, 0.2), hotelWinMat, wx, wy, -d/2 - 0.05));
            }
            for(let wz = -d/2 + 2; wz <= d/2 - 2; wz += 3.5) {
                bld.add(mesh(new THREE.BoxGeometry(0.2, 2.5, 1.2), hotelWinMat, w/2 + 0.05, wy, wz));
                bld.add(mesh(new THREE.BoxGeometry(0.2, 2.5, 1.2), hotelWinMat, -w/2 - 0.05, wy, wz));
            }
        }
        // Atap / mahkota hotel
        bld.add(mesh(new THREE.BoxGeometry(w * 0.8, 8, d * 0.8), roofMat, 0, h + 4, 0));
        bld.position.set(x, 0, z);
        scene.add(bld);
    }

    // Tower pengapit Clock Tower (Kompleks Abraj Al-Bait) sejajar di Z=190
    addHotelTower(TX - 45, TZ, 32, 120, 32); // Hajar Tower
    addHotelTower(TX + 45, TZ, 32, 120, 32); // ZamZam Tower
    addHotelTower(TX - 85, TZ, 28, 100, 28); // Safa
    addHotelTower(TX + 85, TZ, 28, 100, 28); // Marwa

    // Hotel-hotel raksasa yang mengelilingi radius Makkah
    // Area Utara
    addHotelTower(0, -170, 50, 110, 35);
    addHotelTower(-60, -160, 40, 95, 30);
    addHotelTower(60, -160, 40, 130, 30);
    // Area Timur
    addHotelTower(160, 20, 35, 140, 45);
    addHotelTower(150, -40, 30, 100, 40);
    // Area Barat
    addHotelTower(-160, 10, 35, 125, 50);
    addHotelTower(-150, 70, 30, 90, 35);

    // Gedung-gedung tambahan (warna putih bersih, lebih pendek dari Clock Tower)
    // Area Utara (belakang)
    addHotelTower(110, -150, 35, 115, 30, whiteTowerMat, whiteDarkTowerMat);
    addHotelTower(-110, -150, 35, 120, 30, whiteTowerMat, whiteDarkTowerMat);
    addHotelTower(30, -190, 45, 140, 35, whiteTowerMat, whiteDarkTowerMat);
    addHotelTower(-30, -190, 45, 140, 35, whiteTowerMat, whiteDarkTowerMat);
    // Area Timur
    addHotelTower(160, 80, 40, 130, 40, whiteTowerMat, whiteDarkTowerMat);
    addHotelTower(180, -20, 35, 110, 35, whiteTowerMat, whiteDarkTowerMat);
    // Area Barat
    addHotelTower(-180, -30, 35, 115, 35, whiteTowerMat, whiteDarkTowerMat);
    addHotelTower(-170, 40, 30, 105, 35, whiteTowerMat, whiteDarkTowerMat);
    addHotelTower(-140, -90, 35, 135, 35, whiteTowerMat, whiteDarkTowerMat);
    // Area Selatan (pengapit terluar Abraj Al-Bait)
    addHotelTower(TX - 120, TZ - 10, 30, 95, 30, whiteTowerMat, whiteDarkTowerMat);
    addHotelTower(TX + 120, TZ - 10, 30, 95, 30, whiteTowerMat, whiteDarkTowerMat);

    // Lampu sorot mataf (malam)
    if (engine.envPreset === 'night' || engine.envPreset === 'dawn') {
        for (const [lx, lz] of [[-40, -40], [40, -40], [-40, 40], [40, 40]]) {
            engine.addPointLamp(lx, 18, lz, { intensity: 160, distance: 130 });
        }
        engine.addPointLamp(0, 22, 0, { color: 0xfff6dd, intensity: 200, distance: 90 });
    }

    // Area jalan diperluas hingga radius 97 meter, sehingga jamaah BISA MASUK ke dalam ruangan emas!
    engine.addWalkCircle(0, 0, 97, 0);
    // badan Ka'bah (skala nyata 12.86 × 11.03 m) + sedikit margin shadharwan
    engine.addBlocker(-7.0, -6.1, 7.0, 6.1);
    engine.addBlocker(9.6, 7.2, 12.4, 9.9);       // maqam ibrahim
    engine.addBlocker(-5.0, -14.5, 5.0, -5.0);    // Hijr Ismail (agar tidak ditabrak tawaf)

    // ── BURUNG MERPATI BERTERBANGAN DI ATAS KA'BAH ──
    const PIGEON_COUNT = 150; 
    // Warna putih agak abu-abu sesuai permintaan
    const pigeonMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.9, side: THREE.DoubleSide });
    
    // Geometri burung merpati diperbesar agar lebih jelas terlihat
    const bodyG = new THREE.ConeGeometry(0.25, 0.9, 5);
    bodyG.rotateX(Math.PI / 2); 
    const wingG = new THREE.PlaneGeometry(0.6, 0.4);
    wingG.translate(0.3, 0, 0); 

    const instBody = new THREE.InstancedMesh(bodyG, pigeonMat, PIGEON_COUNT);
    const instWingL = new THREE.InstancedMesh(wingG, pigeonMat, PIGEON_COUNT);
    const instWingR = new THREE.InstancedMesh(wingG, pigeonMat, PIGEON_COUNT);
    
    // MATIKAN FRUSTUM CULLING (Sangat Penting! Jika tidak, burung akan hilang dari pandangan)
    instBody.frustumCulled = false; 
    instWingL.frustumCulled = false; 
    instWingR.frustumCulled = false;
    instBody.castShadow = false; instWingL.castShadow = false; instWingR.castShadow = false;

    const pigeons = [];
    for (let i = 0; i < PIGEON_COUNT; i++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = 5 + Math.random() * 10; // Terkonsentrasi hanya berputar di atas Ka'bah (radius 5 - 15 meter)
        pigeons.push({
            pos: new THREE.Vector3(Math.cos(ang) * rad, 18 + Math.random() * 10, Math.sin(ang) * rad),
            // Kecepatan awal sudah diarahkan searah jarum jam (Clockwise tangent)
            vel: new THREE.Vector3(Math.sin(ang), 0, -Math.cos(ang)).multiplyScalar(12),
            flapOffset: Math.random() * Math.PI * 2,
            flapSpeed: 18 + Math.random() * 10,
            orbitRadius: rad
        });
    }
    scene.add(instBody, instWingL, instWingR);

    const _dBody = new THREE.Object3D();
    const _dWingL = new THREE.Object3D();
    const _dWingR = new THREE.Object3D();

    engine.onUpdate((dt, t) => {
        for (let i = 0; i < PIGEON_COUNT; i++) {
            const p = pigeons[i];
            
            const centerDist = Math.hypot(p.pos.x, p.pos.z) || 1;
            
            // Tarikan lembut untuk menjaga radius orbit masing-masing merpati
            if (centerDist > p.orbitRadius + 5) {
                p.vel.x -= (p.pos.x / centerDist) * 3 * dt;
                p.vel.z -= (p.pos.z / centerDist) * 3 * dt;
            } else if (centerDist < p.orbitRadius - 5) {
                p.vel.x += (p.pos.x / centerDist) * 3 * dt;
                p.vel.z += (p.pos.z / centerDist) * 3 * dt;
            }
            
            // Gaya dorong memutar SEARAH JARUM JAM (Clockwise: +Z ke +X ke -Z ke -X)
            // Vektor tangensial searah jarum jam adalah (Z, -X)
            const cwX = p.pos.z / centerDist;
            const cwZ = -p.pos.x / centerDist;
            p.vel.x += cwX * 12 * dt;
            p.vel.z += cwZ * 12 * dt;
            
            // Atur ketinggian burung persis di atas Ka'bah (Tinggi Ka'bah ~14m)
            if (p.pos.y > 30) p.vel.y -= 3 * dt;
            else if (p.pos.y < 18) p.vel.y += 3 * dt;
            
            // Gerakan organik acak (noise)
            p.vel.x += (Math.random() - 0.5) * dt * 2;
            p.vel.z += (Math.random() - 0.5) * dt * 2;
            p.vel.y += (Math.random() - 0.5) * dt * 1.5;
            
            // Jaga kecepatan terbang konstan
            const speed = p.vel.length();
            const targetSpeed = 10; // Terbang sedikit lebih santai karena radius putaran kecil
            p.vel.multiplyScalar((speed + (targetSpeed - speed) * dt * 2.0) / speed);
            
            p.pos.addScaledVector(p.vel, dt);
            
            // Orientasi Badan
            _dBody.position.copy(p.pos);
            const target = p.pos.clone().add(p.vel);
            _dBody.lookAt(target);
            _dBody.updateMatrix();
            instBody.setMatrixAt(i, _dBody.matrix);
            
            // Sayap mengepak
            const flap = Math.sin(t * p.flapSpeed + p.flapOffset) * 0.8; 
            
            _dWingL.position.copy(p.pos);
            _dWingL.quaternion.copy(_dBody.quaternion);
            _dWingL.translateX(-0.1);
            _dWingL.rotateY(Math.PI); 
            _dWingL.rotateZ(flap);
            _dWingL.updateMatrix();
            instWingL.setMatrixAt(i, _dWingL.matrix);
            
            _dWingR.position.copy(p.pos);
            _dWingR.quaternion.copy(_dBody.quaternion);
            _dWingR.translateX(0.1);
            _dWingR.rotateZ(flap);
            _dWingR.updateMatrix();
            instWingR.setMatrixAt(i, _dWingR.matrix);
        }
        instBody.instanceMatrix.needsUpdate = true;
        instWingL.instanceMatrix.needsUpdate = true;
        instWingR.instanceMatrix.needsUpdate = true;
    });


    engine.configureMinimap({
        scale: 1.0, center: { x: 0, z: 0 },
        features: [
            { type: 'square', x: 0, z: 0, color: '#111111', label: 'Ka\'bah' },
            { type: 'point', x: 11, z: 8.5, color: '#e8c96a', label: 'Maqam' },
            { type: 'point', x: 24, z: 5.3, color: '#8a5a2a', label: 'Start' }
        ]
    });

    return { kaaba: kb, maqam, startLine: line, hajarAswad: kb.userData.hajarAswad };
}


export function masaa(engine, origin = { x: 0, z: 0 }) {
    const { scene, mats } = engine;
    const ox = origin.x || 0;
    const oz = origin.z || 0;
    const L = 140, W = 18; // Diperpanjang & diperlebar agar proporsional
    const GAL = 64;        // setengah panjang galeri beratap — ujung dibiarkan terbuka ke arah bukit
    const sand = engine.ground(400, mats.sand);
    sand.position.set(ox, 0, oz);

    const masaaGroup = new THREE.Group();
    masaaGroup.position.set(ox, 0, oz);

    // Lantai koridor marmer putih mengkilap
    const floor = mesh(new THREE.BoxGeometry(2 * GAL + 12, 0.1, W + 6), mats.marbleTile, 0, 0.05, 0, { cast: false });
    masaaGroup.add(floor);

    // Garis lantai pembatas jalur (hitam/gelap)
    masaaGroup.add(mesh(new THREE.BoxGeometry(2 * GAL, 0.12, 0.4), mats.darkGrey, 0, 0.05, 2, { cast: false }));
    masaaGroup.add(mesh(new THREE.BoxGeometry(2 * GAL, 0.12, 0.4), mats.darkGrey, 0, 0.05, -2, { cast: false }));

    const wallH = 12;
    // Atap utama dengan dekorasi (hanya menutupi galeri tengah; ujung terbuka ke langit)
    masaaGroup.add(mesh(new THREE.BoxGeometry(2 * GAL, 0.8, W + 8), mats.cream, 0, wallH + 0.4, 0));

    // Panel dekorasi atap (coffered ceiling ilusi)
    for (let i = -GAL + 4; i <= GAL - 4; i += 8) {
        masaaGroup.add(mesh(new THREE.BoxGeometry(7, 0.2, W + 4), mats.white, i, wallH - 0.1, 0, { cast: false }));
    }

    // Dinding samping & Jendela lengkung
    for (const s of [-1, 1]) {
        const wall = mesh(new THREE.BoxGeometry(2 * GAL, wallH, 0.8), mats.cream, 0, wallH / 2, s * (W / 2 + 3.4));
        masaaGroup.add(wall);

        // Dekorasi pilar tempel di dinding
        for (let i = -GAL + 4; i <= GAL - 4; i += 8) {
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
        engine.addBlocker(px - 0.7 + ox, -0.7 + oz, px + 0.7 + ox, 0.7 + oz);
    }
    // Blocker pemisah lintasan memanjang
    engine.addBlocker(-L/2 + 5 + ox, -0.4 + oz, L/2 - 5 + ox, 0.4 + oz);

    // Mengembalikan material bukit batu
    const rockA = new THREE.MeshStandardMaterial({ color: 0x907555, roughness: 1, metalness: 0, flatShading: true });
    const _tv = new THREE.Vector3();

    // Fungsi baru yang menggabungkan bukit UTAMA dengan pagar
    const buildMountainFenced = (cx, name, isShafa) => {
        const g = new THREE.Group();
        
        // 1. Puncak Terjal (Bukit Utama)
        const R = 16, Hm = 27;
        const geo = new THREE.ConeGeometry(R, Hm, 22, 11);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            _tv.fromBufferAttribute(pos, i);
            const yN = (_tv.y + Hm / 2) / Hm;
            const rad = Math.hypot(_tv.x, _tv.z);
            if (rad > 0.01) {
                const jitter = (Math.random() - 0.35) * 3.6 * (0.35 + yN);
                const s = 1 + jitter / rad;
                _tv.x *= s; _tv.z *= s;
            }
            _tv.y += (Math.random() - 0.5) * 2.6;
            pos.setXYZ(i, _tv.x, _tv.y, _tv.z);
        }
        geo.computeVertexNormals();
        const peak = mesh(geo, rockA);
        peak.position.y = Hm / 2 - 1.2; 
        peak.castShadow = peak.receiveShadow = true;
        g.add(peak);
        
        // BEBATUAN KECIL DI PINGGIR (DEBRIS) TELAH DIHAPUS DARI SINI
        
        // 2. Pagar Kaca mengelilingi Bukit (Radius 17)
        const fenceR = 17;
        const glassMat = new THREE.MeshStandardMaterial({ 
            color: 0x88ccff, transparent: true, opacity: 0.4, roughness: 0.1, metalness: 0.8, side: THREE.DoubleSide 
        });
        const fence = mesh(new THREE.CylinderGeometry(fenceR, fenceR, 2.5, 48), glassMat);
        fence.position.y = 1.25;
        g.add(fence);
        
        // Bingkai Pagar (Emas/Brass)
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xd9b340, metalness: 0.9, roughness: 0.2 });
        const frameBottom = mesh(new THREE.TorusGeometry(fenceR, 0.15, 8, 48), frameMat);
        frameBottom.rotation.x = Math.PI / 2;
        const frameTop = mesh(new THREE.TorusGeometry(fenceR, 0.15, 8, 48), frameMat);
        frameTop.rotation.x = Math.PI / 2;
        frameTop.position.y = 2.5;
        g.add(frameBottom, frameTop);

        // 3. Papan Nama / Label
        const t = Tex.sign(name, { bg: '#13203a', fg: '#ffd75e', w: 1024, h: 256, font: 'bold 100px "Segoe UI", sans-serif' });
        // Taruh papan di batas depan pagar
        const signOffset = isShafa ? fenceR : -fenceR; 
        const sign = mesh(new THREE.BoxGeometry(10, 2.5, 0.4),
            new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.8 }),
            signOffset, 5, 0, { cast: false });
        
        // Tiang penopang (2 tiang di bawah papan nama)
        const pole1 = mesh(new THREE.CylinderGeometry(0.15, 0.15, 5, 8), frameMat, signOffset, 2.5, -4);
        const pole2 = mesh(new THREE.CylinderGeometry(0.15, 0.15, 5, 8), frameMat, signOffset, 2.5, 4);
        g.add(sign, pole1, pole2);

        sign.rotation.y = isShafa ? Math.PI / 2 : -Math.PI / 2;

        g.position.set(cx, 0, 0);
        return g;
    };
    
    // Kembalikan posisi gunung ke posisi semula yaitu GAL + 26
    const shafa = buildMountainFenced(-(GAL + 26), 'BUKIT SHAFA', true);
    const marwah = buildMountainFenced(GAL + 26, 'BUKIT MARWAH', false);
    masaaGroup.add(shafa, marwah);
    // Penerangan bukit agar tetap terlihat di malam hari
    engine.addPointLamp(-(GAL + 13) + ox, 17, oz, { color: 0xfff0d0, intensity: 160, distance: 95 });
    engine.addPointLamp(GAL + 13 + ox, 17, oz, { color: 0xfff0d0, intensity: 160, distance: 95 });
    // Blocker: pemain berhenti di kaki bukit (titik Shafa/Marwah)
    engine.addBlocker(-400 + ox, -60 + oz, -(GAL + 9) + ox, 60 + oz);
    engine.addBlocker(GAL + 9 + ox, -60 + oz, 400 + ox, 60 + oz);

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
        engine.addPointLamp(gx + ox, wallH - 2, oz, { color: 0x27c96a, intensity: 100, distance: 30 });
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
        engine.addPointLamp(i * 18 + ox, wallH - 1, W/4 + oz, { intensity: 70, distance: 30 });
        engine.addPointLamp(i * 18 + ox, wallH - 1, -W/4 + oz, { intensity: 70, distance: 30 });
    }

    scene.add(masaaGroup);

    engine.addWalkRect(-L / 2 - 11 + ox, -W / 2 - 3 + oz, L / 2 + 11 + ox, W / 2 + 3 + oz);
    engine.configureMinimap({
        scale: 0.9, center: { x: ox, z: oz },
        features: [
            { type: 'point', x: -L / 2 - 8 + ox, z: oz, color: '#37c978', label: 'Shafa' },
            { type: 'point', x: L / 2 + 8 + ox, z: oz, color: '#37c978', label: 'Marwah' }
        ]
    });
    return { shafaX: -L / 2 - 4 + ox, marwahX: L / 2 + 4 + ox, length: L, shafa, marwah };
}


export function airport(engine, { nameSign = 'BANDARA SOEKARNO-HATTA — TERMINAL 2U', arabic = false, madinah = false } = {}) {
    const { scene, mats } = engine;
    engine.ground(500, mats.tarmac, -0.02);

    // Lantai terminal — marmer mengkilap khas bandara
    const floorMat = mats.marble.clone();
    floorMat.roughness = 0.16;
    floorMat.metalness = 0.06;
    const floor = mesh(new THREE.BoxGeometry(90, 0.1, 60), floorMat, 0, 0.05, 0, { cast: false });
    scene.add(floor);

    const H = 12;
    // Struktur Madinah serba putih (kolom pohon + kisi atap); bandara generik memakai baja
    const structMat = madinah
        ? new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.45, metalness: 0.2 })
        : mats.steel;
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
    const mulls = new THREE.InstancedMesh(mullGeo, structMat, nMullX * 2 + nMullZ * 2);
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
    if (madinah) {
        /* Kolom "pohon" putih khas Terminal Madinah: batang kluster 4 pipa,
         * mahkota kipas lengkung dua tingkat (rusuk utama + rusuk tipis di sela
         * + tingkat dalam dari puncak menara kecil) yang merekah ke plafon. */
        const colXs = [-30, -10, 10, 30], colZs = [-15, 15];
        const nCol = colXs.length * colZs.length;
        const R1 = 6, R2 = 4.5, yTop = H - R1;
        const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.26, yTop - 0.5, 10), structMat, nCol * 4);
        const cores = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.5, yTop, 12), structMat, nCol);
        const caps = new THREE.InstancedMesh(new THREE.BoxGeometry(1.25, 0.6, 1.25), structMat, nCol);
        const bases = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.5, 1.5), structMat, nCol);
        const spires = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.3, R1 - R2, 10), structMat, nCol);
        const mains = new THREE.InstancedMesh(new THREE.TorusGeometry(R1, 0.13, 8, 18, Math.PI / 2), structMat, nCol * 8);
        const thins = new THREE.InstancedMesh(new THREE.TorusGeometry(R1, 0.055, 6, 16, Math.PI / 2), structMat, nCol * 8);
        const mids = new THREE.InstancedMesh(new THREE.TorusGeometry(R2, 0.065, 6, 14, Math.PI / 2), structMat, nCol * 8);
        let ti = 0, coI = 0, arcI = 0;
        for (const cx of colXs) {
            for (const cz of colZs) {
                setInst(cores, coI, cx, yTop / 2, cz);
                setInst(caps, coI, cx, yTop - 0.15, cz);
                setInst(bases, coI, cx, 0.25, cz);
                setInst(spires, coI, cx, yTop + (R1 - R2) / 2, cz);
                coI++;
                for (const [ox, oz] of [[-0.3, -0.3], [-0.3, 0.3], [0.3, -0.3], [0.3, 0.3]]) {
                    setInst(trunks, ti++, cx + ox, (yTop - 0.5) / 2, cz + oz);
                }
                for (let k = 0; k < 8; k++) {
                    const th = k * Math.PI / 4, th2 = th + Math.PI / 8;
                    // Lengkung: torus seperempat — ujung bawah menempel kolom, ujung atas rata plafon
                    setInst(mains, arcI, cx - R1 * Math.cos(th), yTop, cz + R1 * Math.sin(th), th);
                    setInst(thins, arcI, cx - R1 * Math.cos(th2), yTop, cz + R1 * Math.sin(th2), th2);
                    setInst(mids, arcI, cx - R2 * Math.cos(th), H - R2, cz + R2 * Math.sin(th), th);
                    arcI++;
                }
                engine.addBlocker(cx - 0.8, cz - 0.8, cx + 0.8, cz + 0.8);
            }
        }
        trunks.castShadow = cores.castShadow = mains.castShadow = true;
        scene.add(trunks, cores, caps, bases, spires, mains, thins, mids);
    } else {
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
    }
    scene.add(mesh(new THREE.BoxGeometry(92, 0.8, 62), mats.white, 0, H + 0.4, 0, { cast: false }));
    if (madinah) {
        // Plafon kisi (coffer) putih dua arah + downlight bulat, seperti atap terminal Madinah
        const beamX = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.5, 59), structMat, 17);
        for (let i = 0; i < 17; i++) setInst(beamX, i, -40 + i * 5, H - 0.35, 0);
        const beamZ = new THREE.InstancedMesh(new THREE.BoxGeometry(86, 0.5, 0.22), structMat, 11);
        for (let i = 0; i < 11; i++) setInst(beamZ, i, 0, H - 0.35, -25 + i * 5);
        scene.add(beamX, beamZ);
        const lamps = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 10), mats.emissiveCool, 60);
        let li = 0;
        for (let ix = 0; ix < 10; ix++) {
            for (let iz = 0; iz < 6; iz++) setInst(lamps, li++, -38 + ix * 8.5, H - 0.14, -22.5 + iz * 9);
        }
        scene.add(lamps);
        for (const lx of [-20, 20]) {
            engine.addPointLamp(lx, H - 2, -10, { intensity: 60, distance: 40 });
            engine.addPointLamp(lx, H - 2, 10, { intensity: 60, distance: 40 });
        }
    } else {
        // Rangka atap (truss) melintang
        const trussGeo = new THREE.BoxGeometry(0.28, 0.55, 59);
        const trusses = new THREE.InstancedMesh(trussGeo, mats.steel, 9);
        for (let i = 0; i < 9; i++) setInst(trusses, i, -40 + i * 10, H - 0.45, 0);
        scene.add(trusses);
        // Skylight strip emissive
        for (let i = -3; i <= 3; i++) {
            scene.add(mesh(new THREE.BoxGeometry(86, 0.1, 2.2), mats.emissiveCool, 0, H - 0.1, i * 8, { cast: false }));
        }
    }

    // Papan nama besar
    const signTex = Tex.sign(nameSign, { w: 2048, h: 160, bg: madinah ? '#12352a' : '#0d2b4d', font: 'bold 72px "Segoe UI", sans-serif' });
    const sign = mesh(new THREE.BoxGeometry(40, 3, 0.4),
        new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.8 }),
        0, 9, -29.5, { cast: false });
    scene.add(sign);

    if (madinah) {
        // Frisa motif geometris (lengkung runcing + lingkaran emas) di sepanjang dinding atas
        const fc = document.createElement('canvas');
        fc.width = 1024; fc.height = 64;
        const fg2 = fc.getContext('2d');
        fg2.fillStyle = '#efe9dc'; fg2.fillRect(0, 0, 1024, 64);
        fg2.strokeStyle = '#b99a4f'; fg2.lineWidth = 3;
        for (let x = 0; x < 1024; x += 64) {
            fg2.beginPath();
            fg2.moveTo(x, 56);
            fg2.quadraticCurveTo(x + 8, 12, x + 32, 8);
            fg2.quadraticCurveTo(x + 56, 12, x + 64, 56);
            fg2.stroke();
            fg2.beginPath(); fg2.arc(x + 32, 38, 9, 0, Math.PI * 2); fg2.stroke();
        }
        const ft = new THREE.CanvasTexture(fc);
        ft.wrapS = THREE.RepeatWrapping;
        ft.repeat.set(12, 1);
        ft.colorSpace = THREE.SRGBColorSpace;
        const friezeMat = new THREE.MeshStandardMaterial({ map: ft, roughness: 0.7 });
        for (const [fw, fx, fz, fry] of [[90, 0, -29.7, 0], [90, 0, 29.7, 0], [60, -44.7, 0, Math.PI / 2], [60, 44.7, 0, Math.PI / 2]]) {
            scene.add(mesh(new THREE.BoxGeometry(fw, 0.9, 0.12), friezeMat, fx, H - 1.2, fz, { cast: false, ry: fry }));
        }
    }

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

    // Counter check-in (4 buah) — gaya Madinah: meja gelap SAUDIA + totem layar biru "C6…C9"
    const counters = new THREE.Group();
    const deskMat = madinah ? new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.6, metalness: 0.2 }) : mats.wood;
    const totemScreenMat = madinah
        ? new THREE.MeshStandardMaterial({ color: 0x9cc8ff, emissive: 0x2f8bff, emissiveIntensity: 1.5 })
        : null;
    for (let i = 0; i < 4; i++) {
        const c = new THREE.Group();
        c.add(mesh(new THREE.BoxGeometry(5, 1.15, 1.6), deskMat, 0, 0.575, 0));
        c.add(mesh(new THREE.BoxGeometry(5, 0.08, 1.9), mats.steel, 0, 1.2, 0, { cast: false }));
        if (madinah) {
            const st = Tex.sign('السعودية — SAUDIA', { bg: '#f5f2e9', fg: '#1c5c34', w: 512, h: 96 });
            c.add(mesh(new THREE.BoxGeometry(3.6, 0.7, 0.06),
                new THREE.MeshStandardMaterial({ map: st, roughness: 0.6 }), 0, 0.62, 0.82, { cast: false }));
            c.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.95, 8), mats.steel, 0, 1.66, 0, { cast: false }));
            c.add(mesh(new THREE.BoxGeometry(0.85, 1.5, 0.1), totemScreenMat, 0, 2.85, 0, { cast: false }));
            const ht = Tex.sign(`C${6 + i}`, { bg: '#0b0e13', fg: '#f2f5f9', w: 256, h: 128, font: 'bold 88px "Segoe UI", sans-serif' });
            c.add(mesh(new THREE.BoxGeometry(0.95, 0.5, 0.12),
                new THREE.MeshStandardMaterial({ map: ht, emissive: 0xffffff, emissiveMap: ht, emissiveIntensity: 0.9 }),
                0, 3.85, 0, { cast: false }));
        } else {
            const scrTex = Tex.sign(`CHECK-IN ${String.fromCharCode(65 + i)}`, { bg: '#123c1e', fg: '#7dffa5', w: 512, h: 96 });
            c.add(mesh(new THREE.BoxGeometry(3.6, 0.9, 0.12),
                new THREE.MeshStandardMaterial({ map: scrTex, emissive: 0xffffff, emissiveMap: scrTex, emissiveIntensity: 1.4 }),
                0, 3.0, 0, { cast: false }));
            c.add(mesh(new THREE.BoxGeometry(0.15, 2.4, 0.15), mats.steel, -1.6, 1.8, 0));
            c.add(mesh(new THREE.BoxGeometry(0.15, 2.4, 0.15), mats.steel, 1.6, 1.8, 0));
        }
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

    engine.addWalkRect(-42, -27, 42, 27);
    engine.addWalkRect(30, 10, 44, 26); // area gate
    engine.configureMinimap({
        scale: 1.6, center: { x: 0, z: 0 },
        features: [
            { type: 'square', x: -24, z: -24, color: '#57d987', label: 'Pintu Masuk' },
            { type: 'square', x: 24, z: -14, color: '#d98a57', label: 'Check-in' },
            { type: 'square', x: 36, z: 18, color: '#e8c96a', label: 'Pesawat' }
        ]
    });

    return { counters, imigrasi, gate, plane, seatSpots, staffSpots };
}

/** Kabin pesawat (Ekonomi) & Ruang Pilot (Cockpit) — Sangat Realistik. */
/** Kabin pesawat — area terpisah jauh dari terminal. */
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
            { type: 'square', x: origin.x, z: origin.z + FZ, color: '#e8c96a', label: 'Masjid Miqat' },
            { type: 'point', x: origin.x + DX, z: origin.z + DZ, color: '#37c978', label: 'Mihrab' },
            ...spots.map(s => ({ type: 'point', x: origin.x + s.x, z: origin.z + s.z, color: '#6f8fb0' }))
        ]
    });
    return { origin, gatePos: { x: origin.x, z: origin.z - 40 }, door, dome };
}

export function busModel(mats) {
    const bus = new THREE.Group();
    // Material Setup matching Jetbus 3+ 27 TRANS
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff8c00, roughness: 0.3, metalness: 0.1, side: THREE.DoubleSide }); 
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.4, metalness: 0.2, side: THREE.DoubleSide }); 
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.85, side: THREE.DoubleSide }); 
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.9 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.2, metalness: 0.9 }); 

    const L = 12.5, W = 2.8, H = 3.6;

    // --- EKSTERIOR KOTAK (PERSEGI PANJANG) ---
    
    // 1. Badan Bawah (Orange) - Dinding lurus
    bus.add(mesh(new THREE.BoxGeometry(L, 1.4, 0.1), orangeMat, 0, 1.1, W/2));
    bus.add(mesh(new THREE.BoxGeometry(L, 1.4, 0.1), orangeMat, 0, 1.1, -W/2));
    bus.add(mesh(new THREE.BoxGeometry(0.1, 1.4, W), orangeMat, -L/2, 1.1, 0)); // Belakang bawah
    bus.add(mesh(new THREE.BoxGeometry(0.1, 1.4, W), orangeMat, L/2, 1.1, 0));  // Depan bawah
    
    // Logo 27 TRANS Samping (Lurus)
    const logoTex = Tex.sign('27 TRANS', { bg: '#111111', fg: '#ffffff', w: 1024, h: 256, font: 'bold 180px sans-serif' });
    const logoMat = new THREE.MeshStandardMaterial({ map: logoTex });
    bus.add(mesh(new THREE.BoxGeometry(4.0, 0.8, 0.15), logoMat, 0, 1.1, W/2 + 0.01));
    bus.add(mesh(new THREE.BoxGeometry(4.0, 0.8, 0.15), logoMat, 0, 1.1, -W/2 - 0.01, { ry: Math.PI }));

    // 2. Badan Atas & Atap (Hitam) - Dinding lurus
    // Atap Kotak Datar
    bus.add(mesh(new THREE.BoxGeometry(L, 0.2, W), darkMat, 0, 3.5, 0));

    // Pilar Atas (Batas antara jendela dan atap)
    bus.add(mesh(new THREE.BoxGeometry(L, 0.4, 0.1), darkMat, 0, 3.2, W/2));
    bus.add(mesh(new THREE.BoxGeometry(L, 0.4, 0.1), darkMat, 0, 3.2, -W/2));
    bus.add(mesh(new THREE.BoxGeometry(0.1, 0.4, W), darkMat, L/2, 3.2, 0));
    bus.add(mesh(new THREE.BoxGeometry(0.1, 0.4, W), darkMat, -L/2, 3.2, 0));

    // Pilar-pilar jendela tegak lurus
    for (let x = -4.5; x <= 4.5; x += 1.5) {
        bus.add(mesh(new THREE.BoxGeometry(0.2, 1.2, 0.1), darkMat, x, 2.4, W/2));
        bus.add(mesh(new THREE.BoxGeometry(0.2, 1.2, 0.1), darkMat, x, 2.4, -W/2));
    }
    
    // Pilar sudut depan & belakang
    bus.add(mesh(new THREE.BoxGeometry(0.2, 1.2, 0.1), darkMat, L/2 - 0.1, 2.4, W/2));
    bus.add(mesh(new THREE.BoxGeometry(0.2, 1.2, 0.1), darkMat, L/2 - 0.1, 2.4, -W/2));
    bus.add(mesh(new THREE.BoxGeometry(0.2, 1.2, 0.1), darkMat, -L/2 + 0.1, 2.4, W/2));
    bus.add(mesh(new THREE.BoxGeometry(0.2, 1.2, 0.1), darkMat, -L/2 + 0.1, 2.4, -W/2));

    // Unit AC di atap kotak
    bus.add(mesh(new THREE.BoxGeometry(3.6, 0.4, 1.8), darkMat, -1.5, 3.8, 0));

    // 3. Wajah Depan Kotak
    // Bumper
    bus.add(mesh(new THREE.BoxGeometry(0.2, 0.5, W + 0.04), orangeMat, L/2 + 0.05, 0.65, 0));
    
    // Grille Depan (Hitam rata)
    bus.add(mesh(new THREE.BoxGeometry(0.2, 0.8, W - 0.2), darkMat, L/2 + 0.06, 1.25, 0));
    
    // Garis Chrome lurus
    bus.add(mesh(new THREE.BoxGeometry(0.2, 0.05, W - 0.4), chromeMat, L/2 + 0.07, 1.0, 0));

    // Headlights Kotak lurus
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 });
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xff5500, emissive: 0xff5500, emissiveIntensity: 2 });
    for(const sz of [-1, 1]) {
        bus.add(mesh(new THREE.BoxGeometry(0.2, 0.15, 0.35), hlMat, L/2 + 0.07, 1.15, sz * (W/2 - 0.4)));
        bus.add(mesh(new THREE.BoxGeometry(0.22, 0.18, 0.05), ringMat, L/2 + 0.07, 1.15, sz * (W/2 - 0.2)));
    }

    // 4. Kaca-kaca (Lurus tegak)
    // Windshield Tegak
    const wind = mesh(new THREE.BoxGeometry(0.1, 1.2, W - 0.2), glassMat, L/2 + 0.05, 2.4, 0);
    bus.add(wind);

    // Stiker Top Kaca JETBUS 3+
    const jetbusTex = Tex.sign('JETBUS 3+', { bg: '#111111', fg: '#ffffff', w: 1024, h: 128, font: 'bold 100px sans-serif' });
    const jetbusMat = new THREE.MeshStandardMaterial({ map: jetbusTex });
    bus.add(mesh(new THREE.BoxGeometry(0.12, 0.25, W - 0.2), jetbusMat, L/2 + 0.06, 2.85, 0));

    // Kaca Belakang Tegak
    bus.add(mesh(new THREE.BoxGeometry(0.1, 1.2, W - 0.2), glassMat, -L/2 - 0.05, 2.4, 0));

    // Kaca Samping Kotak
    bus.add(mesh(new THREE.BoxGeometry(L - 0.4, 1.2, 0.05), glassMat, 0, 2.4, W/2 + 0.02));
    bus.add(mesh(new THREE.BoxGeometry(L - 0.4, 1.2, 0.05), glassMat, 0, 2.4, -W/2 - 0.02));

    // 5. Spion Kotak (Orange)
    for(const sz of [-1, 1]) {
        // Lengan tegak lurus
        bus.add(mesh(new THREE.BoxGeometry(0.1, 0.08, 0.6), darkMat, L/2 + 0.1, 2.6, sz * (W/2 + 0.3)));
        // Batok kotak
        bus.add(mesh(new THREE.BoxGeometry(0.15, 0.6, 0.2), orangeMat, L/2 + 0.15, 2.3, sz * (W/2 + 0.6)));
    }

    // Pintu Kaca Lurus
    const busDoor = mesh(new THREE.BoxGeometry(1.2, 2.3, 0.15), glassMat, 4.4, 1.6, W/2 + 0.03);
    bus.add(busDoor);

    // 6. Roda (Wheels) - Alcoa Rims Chrome
    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 24);
    wheelGeo.rotateX(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.42, 16);
    rimGeo.rotateX(Math.PI / 2);
    const addWheel = (x, z) => {
        const g = new THREE.Group();
        g.add(mesh(wheelGeo, rubberMat, 0,0,0));
        g.add(mesh(rimGeo, rimMat, 0,0,0));
        g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.45, 8).rotateX(Math.PI/2), darkMat, 0,0,0));
        g.position.set(x, 0.5, z);
        bus.add(g);
        // Fender (Kotak pelindung roda)
        bus.add(mesh(new THREE.BoxGeometry(1.6, 0.5, 0.5), darkMat, x, 0.75, z > 0 ? W/2 + 0.01 : -W/2 - 0.01));
    };
    addWheel(3.8, W/2); addWheel(3.8, -W/2);     // Front axle
    addWheel(-2.8, W/2); addWheel(-2.8, -W/2);   // Rear axle 1
    addWheel(-4.2, W/2); addWheel(-4.2, -W/2);   // Rear axle 2

    // --- INTERIOR --- (Mewah, Kulit Hitam, Kayu)
    
    // Lantai Kayu (Coklat)
    const intMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.9, side: THREE.DoubleSide }); 
    bus.add(mesh(new THREE.BoxGeometry(L - 0.4, 0.2, W - 0.2), intMat, 0, 0.6, 0)); 
    
    // Kursi Penumpang - Hitam Elegan (Kulit)
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3 }); 
    
    // Bantal sandaran kepala dengan logo 27 TRANS
    const pillowTex = Tex.sign('27 TRANS', { bg: '#151515', fg: '#aaaaaa', w: 256, h: 256, font: 'bold 45px sans-serif' });
    const pillowMat = new THREE.MeshStandardMaterial({ map: pillowTex, roughness: 0.6 });

    // Blanket di paha (navy)
    const blanketMat = new THREE.MeshStandardMaterial({ color: 0x1f2a3a, roughness: 0.9 });

    for (let r = -4; r <= 4; r++) {
        for (const sx of [-1, 1]) {
            if (r === 4 && sx === 1) continue; 
            const cx = r * 1.1;
            const cz = sx * 0.9;
            bus.add(mesh(new THREE.BoxGeometry(0.6, 0.2, 0.9), seatMat, cx, 0.8, cz));
            bus.add(mesh(new THREE.BoxGeometry(0.4, 0.05, 0.8), blanketMat, cx, 0.92, cz));
            bus.add(mesh(new THREE.BoxGeometry(0.15, 0.7, 0.9), seatMat, cx - 0.25, 1.2, cz));
            bus.add(mesh(new THREE.BoxGeometry(0.12, 0.2, 0.9), seatMat, cx - 0.27, 1.6, cz));
            
            const pillow = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 16), pillowMat, cx - 0.2, 1.45, cz);
            pillow.rotation.z = Math.PI / 2;
            pillow.rotation.y = Math.PI / 2;
            bus.add(pillow);

            // Armrest mewah dengan aksen silver/chrome
            bus.add(mesh(new THREE.BoxGeometry(0.5, 0.05, 0.1), rimMat, cx, 1.1, cz - 0.45)); 
            bus.add(mesh(new THREE.BoxGeometry(0.5, 0.05, 0.1), rimMat, cx, 1.1, cz + 0.45));
        }
    }

    // Area Kemudi (Dashboard & Setir)
    bus.add(mesh(new THREE.BoxGeometry(0.8, 0.8, W-0.2), darkMat, L/2 - 0.6, 1.0, 0));
    const steer = mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 16), darkMat, L/2 - 0.8, 1.4, 0.7);
    steer.rotation.z = Math.PI / 4;
    bus.add(steer);
    // Kursi Supir (Kulit Hitam)
    bus.add(mesh(new THREE.BoxGeometry(0.6, 0.2, 0.7), seatMat, L/2 - 1.5, 0.8, 0.7));
    bus.add(mesh(new THREE.BoxGeometry(0.15, 0.8, 0.7), seatMat, L/2 - 1.8, 1.2, 0.7));

    return { bus, busDoor };
}


export function miqat(engine) {
    const { scene, mats } = engine;

    // Lantai dasar pasir di luar
    engine.ground(800, mats.sand);

    const miqatGroup = new THREE.Group();

    // ================================================================
    // MATERIAL GLOBAL AREA LUAR
    // ================================================================
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.95 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xd4cec4, roughness: 0.92 }); // Trotoar beton abu krem
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xbab4a8, roughness: 0.9 }); // Pinggir trotoar lebih gelap
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x2d4c1e, roughness: 0.95 });
    const winMat = new THREE.MeshStandardMaterial({ color: 0x111c24, roughness: 0.3 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3a2810, roughness: 0.8 });
    const acMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 });
    const balconyMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.85 });
    // Warna bangunan khas Arab: krem, putih gading, coklat pasir, oranye muda
    const bColors = [0xebd5b3, 0xfffcf5, 0xd4c2a5, 0xc2a67e, 0xe8d5a8, 0xf0e6d0, 0xdbc9a0, 0xc8b48a];
    const bMats = bColors.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1.0 }));

    // ================================================================
    // 1. ASPAL UTAMA — JALAN RAYA + AREA PARKIR
    // ================================================================
    // Hamparan aspal mengelilingi masjid — area parkir + jalan utama
    miqatGroup.add(mesh(new THREE.BoxGeometry(400, 0.02, 400), asphaltMat, 0, 0.01, 0, { cast: false }));

    // Jalan raya lebar (12m) yang menghubungkan ke pemukiman di keempat arah
    // Jalan Utara-Selatan (depan-belakang)
    miqatGroup.add(mesh(new THREE.BoxGeometry(14, 0.025, 600), asphaltMat, 0, 0.013, 0, { cast: false }));
    // Jalan Timur-Barat (kiri-kanan)
    miqatGroup.add(mesh(new THREE.BoxGeometry(600, 0.025, 14), asphaltMat, 0, 0.013, 0, { cast: false }));

    // Jalan gang-gang di antara blok pemukiman (arah X, paralel di berbagai Z)
    for (const gz of [-165, -130, 150, 185]) {
        miqatGroup.add(mesh(new THREE.BoxGeometry(700, 0.025, 8), asphaltMat, 0, 0.012, gz, { cast: false }));
    }
    // Jalan gang-gang arah Z di berbagai X
    for (const gx of [-150, -185, 150, 185]) {
        miqatGroup.add(mesh(new THREE.BoxGeometry(8, 0.025, 700), asphaltMat, gx, 0.012, 0, { cast: false }));
    }
    
    const parkSignTex = Tex.sign('P\nBUS PARKING', { bg: '#1c3b8a', fg: '#ffffff', w: 256, h: 256, font: 'bold 60px sans-serif' });
    const pSignMat = new THREE.MeshStandardMaterial({ map: parkSignTex, emissive: 0xffffff, emissiveMap: parkSignTex, emissiveIntensity: 0.8 });
    
    function isInsideMosque(x, z) {
        return (x > -50 && x < 50 && z > -80 && z < 50);
    }

    // Grid Garis Parkir (Kotak-kotak parkir bus) dan Palang Pemberitahuan
    for(let zCenter of [65, -100]) {
        for(let bx = -150; bx <= 150; bx += 20) {
            if (isInsideMosque(bx, zCenter)) continue;
            miqatGroup.add(mesh(new THREE.BoxGeometry(0.3, 0.03, 12), lineMat, bx, 0.015, zCenter, { cast: false }));
            if(Math.abs(bx) % 60 === 10) {
                miqatGroup.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 4), mats.darkGrey, bx, 2, zCenter - 6));
                miqatGroup.add(mesh(new THREE.BoxGeometry(1.5, 1.5, 0.1), pSignMat, bx, 4.5, zCenter - 6));
                engine.addBlocker(bx - 0.5, zCenter - 6.5, bx + 0.5, zCenter - 5.5);
            }
        }
    }
    for(let xCenter of [65, -65]) {
        for(let bz = -150; bz <= 150; bz += 20) {
            if (isInsideMosque(xCenter, bz)) continue;
            miqatGroup.add(mesh(new THREE.BoxGeometry(12, 0.03, 0.3), lineMat, xCenter, 0.015, bz, { cast: false }));
            if(Math.abs(bz) % 60 === 10) {
                miqatGroup.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 4), mats.darkGrey, xCenter - 6, 2, bz));
                miqatGroup.add(mesh(new THREE.BoxGeometry(0.1, 1.5, 1.5), pSignMat, xCenter - 6, 4.5, bz));
                engine.addBlocker(xCenter - 6.5, bz - 0.5, xCenter - 5.5, bz + 0.5);
            }
        }
    }

    // ================================================================
    // 2. TROTOAR (SIDEWALK) — Jalur pejalan kaki terangkat di sepanjang jalan
    // ================================================================
    // Trotoar sepanjang jalan Utara-Selatan (kedua sisi jalan, lebar 3m, tinggi 0.15m)
    for (const sx of [-1, 1]) {
        // Trotoar utama sepanjang jalan NS (dari Z=-300 sampai Z=300)
        miqatGroup.add(mesh(new THREE.BoxGeometry(3, 0.15, 600), sidewalkMat, sx * 10, 0.075, 0, { cast: false }));
        // Pinggir trotoar (curb) — strip beton gelap 0.15m x 0.2m
        miqatGroup.add(mesh(new THREE.BoxGeometry(0.15, 0.2, 600), curbMat, sx * 8.5, 0.1, 0, { cast: false }));
        miqatGroup.add(mesh(new THREE.BoxGeometry(0.15, 0.2, 600), curbMat, sx * 11.5, 0.1, 0, { cast: false }));
    }
    // Trotoar sepanjang jalan Timur-Barat
    for (const sz of [-1, 1]) {
        miqatGroup.add(mesh(new THREE.BoxGeometry(600, 0.15, 3), sidewalkMat, 0, 0.075, sz * 10, { cast: false }));
        miqatGroup.add(mesh(new THREE.BoxGeometry(600, 0.2, 0.15), curbMat, 0, 0.1, sz * 8.5, { cast: false }));
        miqatGroup.add(mesh(new THREE.BoxGeometry(600, 0.2, 0.15), curbMat, 0, 0.1, sz * 11.5, { cast: false }));
    }

    // Trotoar di gang-gang pemukiman
    for (const gz of [-165, -130, 150, 185]) {
        for (const sz of [-1, 1]) {
            miqatGroup.add(mesh(new THREE.BoxGeometry(700, 0.12, 2), sidewalkMat, 0, 0.06, gz + sz * 6, { cast: false }));
            miqatGroup.add(mesh(new THREE.BoxGeometry(700, 0.16, 0.12), curbMat, 0, 0.08, gz + sz * 5, { cast: false }));
        }
    }
    for (const gx of [-150, -185, 150, 185]) {
        for (const sx of [-1, 1]) {
            miqatGroup.add(mesh(new THREE.BoxGeometry(2, 0.12, 700), sidewalkMat, gx + sx * 6, 0.06, 0, { cast: false }));
            miqatGroup.add(mesh(new THREE.BoxGeometry(0.12, 0.16, 700), curbMat, gx + sx * 5, 0.08, 0, { cast: false }));
        }
    }

    // ================================================================
    // 3. ZEBRA CROSS — Penyeberangan di setiap persimpangan utama
    // ================================================================
    function addZebraCross(cx, cz, isHorizontal, len) {
        // Zebra cross terdiri dari strip putih berselang-seling
        const stripeW = 0.5;   // Lebar per strip
        const stripeGap = 0.6; // Jarak antar strip
        const stripeLen = len || 10; // Panjang strip (= lebar jalan)
        const numStripes = 10;
        for (let i = 0; i < numStripes; i++) {
            const offset = (i - numStripes / 2) * (stripeW + stripeGap);
            if (isHorizontal) {
                miqatGroup.add(mesh(new THREE.BoxGeometry(stripeLen, 0.035, stripeW), lineMat, cx, 0.018, cz + offset, { cast: false }));
            } else {
                miqatGroup.add(mesh(new THREE.BoxGeometry(stripeW, 0.035, stripeLen), lineMat, cx + offset, 0.018, cz, { cast: false }));
            }
        }
        // Garis batas zebra cross (2 garis tebal di kedua ujung)
        if (isHorizontal) {
            const halfSpan = (numStripes / 2) * (stripeW + stripeGap);
            miqatGroup.add(mesh(new THREE.BoxGeometry(stripeLen, 0.036, 0.2), lineMat, cx, 0.019, cz - halfSpan - 0.3, { cast: false }));
            miqatGroup.add(mesh(new THREE.BoxGeometry(stripeLen, 0.036, 0.2), lineMat, cx, 0.019, cz + halfSpan + 0.3, { cast: false }));
        } else {
            const halfSpan = (numStripes / 2) * (stripeW + stripeGap);
            miqatGroup.add(mesh(new THREE.BoxGeometry(0.2, 0.036, stripeLen), lineMat, cx - halfSpan - 0.3, 0.019, cz, { cast: false }));
            miqatGroup.add(mesh(new THREE.BoxGeometry(0.2, 0.036, stripeLen), lineMat, cx + halfSpan + 0.3, 0.019, cz, { cast: false }));
        }
    }

    // Zebra cross utama di depan gerbang masjid (melintasi jalan EW)
    addZebraCross(0, 60, true, 14);
    // Zebra cross di samping kiri masjid
    addZebraCross(-65, 0, false, 14);
    // Zebra cross di samping kanan masjid
    addZebraCross(65, 0, false, 14);
    // Zebra cross di belakang masjid
    addZebraCross(0, -100, true, 14);

    // Zebra cross di persimpangan jalan gang pemukiman
    for (const gz of [-165, -130, 150, 185]) {
        addZebraCross(0, gz, true, 8);
        for (const gx of [-150, -185, 150, 185]) {
            addZebraCross(gx, gz, true, 8);
            addZebraCross(gx, gz, false, 8);
        }
    }

    // ================================================================
    // 4. PEMUKIMAN KHAS ARAB — Sepanjang mata memandang
    // ================================================================
    // Fungsi bangunan Arab detail: jendela mashrabiya, parapet atap, pintu, AC unit
    function addArabHouse(parent, x, z, facingX, isDistant) {
        const h = isDistant ? (5 + Math.random() * 10) : (6 + Math.random() * 6);
        const w = isDistant ? (8 + Math.random() * 6) : (12 + Math.random() * 4); 
        const d = isDistant ? (7 + Math.random() * 5) : (10 + Math.random() * 6); 
        const mat = bMats[Math.floor(Math.random() * bMats.length)];
        const bld = new THREE.Group();
        
        const bW = facingX ? d : w;
        const bD = facingX ? w : d;

        // Blocker agar tidak bisa ditembus
        engine.addBlocker(x - bW/2 - 0.5, z - bD/2 - 0.5, x + bW/2 + 0.5, z + bD/2 + 0.5);

        // === Struktur dasar rumah ===
        bld.add(mesh(new THREE.BoxGeometry(bW, h, bD), mat, 0, h/2, 0));
        
        // === PARAPET ATAP (Benteng kecil di atap khas Arab) ===
        const parapetH = 0.8 + Math.random() * 0.6;
        bld.add(mesh(new THREE.BoxGeometry(bW, parapetH, 0.3), mat, 0, h + parapetH/2, bD/2 - 0.15));
        bld.add(mesh(new THREE.BoxGeometry(bW, parapetH, 0.3), mat, 0, h + parapetH/2, -bD/2 + 0.15));
        bld.add(mesh(new THREE.BoxGeometry(0.3, parapetH, bD - 0.6), mat, bW/2 - 0.15, h + parapetH/2, 0));
        bld.add(mesh(new THREE.BoxGeometry(0.3, parapetH, bD - 0.6), mat, -bW/2 + 0.15, h + parapetH/2, 0));
        
        // Gerigi crenellation pada parapet (khas arsitektur Arab)
        if (!isDistant) {
            for (let cx = -bW/2 + 0.5; cx <= bW/2 - 0.5; cx += 1.2) {
                bld.add(mesh(new THREE.BoxGeometry(0.4, 0.35, 0.35), mat, cx, h + parapetH + 0.17, bD/2 - 0.15, { cast: false }));
                bld.add(mesh(new THREE.BoxGeometry(0.4, 0.35, 0.35), mat, cx, h + parapetH + 0.17, -bD/2 + 0.15, { cast: false }));
            }
        }

        // === JENDELA (Mashrabiya style — frame lebih kaya) ===
        const winW = isDistant ? 1.0 : 1.2;
        const winH = isDistant ? 1.2 : 1.6;
        for(let wy = 3; wy < h - 2; wy += 3.5) {
            if (!facingX) { 
                for(let wx = -bW/2 + 2.5; wx <= bW/2 - 2.5; wx += 3.5) {
                    // Jendela gelap
                    bld.add(mesh(new THREE.BoxGeometry(winW, winH, 0.12), winMat, wx, wy, bD/2 + 0.01));
                    bld.add(mesh(new THREE.BoxGeometry(winW, winH, 0.12), winMat, wx, wy, -bD/2 - 0.01));
                    if (!isDistant) {
                        // Frame jendela (kusen) — warna sedikit lebih gelap dari dinding
                        bld.add(mesh(new THREE.BoxGeometry(winW + 0.3, 0.12, 0.15), mat, wx, wy + winH/2, bD/2 + 0.02, { cast: false }));
                        bld.add(mesh(new THREE.BoxGeometry(winW + 0.3, 0.12, 0.15), mat, wx, wy - winH/2, bD/2 + 0.02, { cast: false }));
                        // Ambang jendela bawah (sill)
                        bld.add(mesh(new THREE.BoxGeometry(winW + 0.4, 0.08, 0.25), mat, wx, wy - winH/2 - 0.04, bD/2 + 0.05, { cast: false }));
                    }
                }
            } else { 
                for(let wz = -bD/2 + 2.5; wz <= bD/2 - 2.5; wz += 3.5) {
                    bld.add(mesh(new THREE.BoxGeometry(0.12, winH, winW), winMat, bW/2 + 0.01, wy, wz));
                    bld.add(mesh(new THREE.BoxGeometry(0.12, winH, winW), winMat, -bW/2 - 0.01, wy, wz));
                    if (!isDistant) {
                        bld.add(mesh(new THREE.BoxGeometry(0.15, 0.12, winW + 0.3), mat, bW/2 + 0.02, wy + winH/2, wz, { cast: false }));
                        bld.add(mesh(new THREE.BoxGeometry(0.15, 0.12, winW + 0.3), mat, bW/2 + 0.02, wy - winH/2, wz, { cast: false }));
                    }
                }
            }
        }

        // === PINTU MASUK (hanya bangunan dekat) ===
        if (!isDistant) {
            if (!facingX) {
                bld.add(mesh(new THREE.BoxGeometry(1.2, 2.4, 0.12), doorMat, 0, 1.2, bD/2 + 0.02));
                // Arch di atas pintu
                bld.add(mesh(new THREE.BoxGeometry(1.6, 0.3, 0.15), mat, 0, 2.55, bD/2 + 0.02, { cast: false }));
            } else {
                bld.add(mesh(new THREE.BoxGeometry(0.12, 2.4, 1.2), doorMat, bW/2 + 0.02, 1.2, 0));
                bld.add(mesh(new THREE.BoxGeometry(0.15, 0.3, 1.6), mat, bW/2 + 0.02, 2.55, 0, { cast: false }));
            }
        }

        // === UNIT AC DI DINDING (khas bangunan Arab modern) ===
        if (!isDistant && Math.random() > 0.4) {
            const acSide = Math.random() > 0.5 ? 1 : -1;
            if (!facingX) {
                bld.add(mesh(new THREE.BoxGeometry(0.8, 0.5, 0.4), acMat, acSide * (bW/2 - 2), h - 1.5, bD/2 + 0.2, { cast: false }));
            } else {
                bld.add(mesh(new THREE.BoxGeometry(0.4, 0.5, 0.8), acMat, bW/2 + 0.2, h - 1.5, acSide * (bD/2 - 2), { cast: false }));
            }
        }

        // === BALKON KECIL (beberapa bangunan punya balkon) ===
        if (!isDistant && h > 8 && Math.random() > 0.5) {
            const balcY = 5 + Math.random() * 2;
            if (!facingX) {
                bld.add(mesh(new THREE.BoxGeometry(3, 0.15, 1.2), mat, 0, balcY, bD/2 + 0.6, { cast: false }));
                bld.add(mesh(new THREE.BoxGeometry(3, 0.8, 0.1), balconyMat, 0, balcY + 0.4, bD/2 + 1.15, { cast: false }));
                bld.add(mesh(new THREE.BoxGeometry(0.1, 0.8, 1.2), balconyMat, -1.45, balcY + 0.4, bD/2 + 0.6, { cast: false }));
                bld.add(mesh(new THREE.BoxGeometry(0.1, 0.8, 1.2), balconyMat, 1.45, balcY + 0.4, bD/2 + 0.6, { cast: false }));
            }
        }
        
        // === TANAMAN HIAS di depan rumah ===
        if (!isDistant) {
            if (!facingX) {
                bld.add(mesh(new THREE.SphereGeometry(0.8, 6, 6), bushMat, -bW/2 + 2.0, 0.4, bD/2 + 1.2, { cast: false }));
                bld.add(mesh(new THREE.SphereGeometry(0.8, 6, 6), bushMat, bW/2 - 2.0, 0.4, bD/2 + 1.2, { cast: false }));
            } else {
                bld.add(mesh(new THREE.SphereGeometry(0.8, 6, 6), bushMat, bW/2 + 1.2, 0.4, -bD/2 + 2.0, { cast: false }));
                bld.add(mesh(new THREE.SphereGeometry(0.8, 6, 6), bushMat, bW/2 + 1.2, 0.4, bD/2 - 2.0, { cast: false }));
            }
        }

        // === TEMBOK PEMBATAS HALAMAN (courtyard wall khas Arab) ===
        if (!isDistant && Math.random() > 0.6) {
            const wallH2 = 2 + Math.random();
            if (!facingX) {
                bld.add(mesh(new THREE.BoxGeometry(bW + 2, wallH2, 0.2), mat, 0, wallH2/2, bD/2 + 3, { cast: false }));
            }
        }

        bld.position.set(x, 0, z);
        parent.add(bld);
    }
    
    // ================================================================
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
    });
    const dMat1 = new THREE.MeshStandardMaterial({ color: 0xccc4b4, roughness: 1.0 });
    const dMat2 = new THREE.MeshStandardMaterial({ color: 0xd4cfc5, roughness: 1.0 });
    for (let z = -280; z <= 280; z += 12) {
        const h1 = 8 + Math.random() * 16;
        const h2 = 8 + Math.random() * 16;
        const dMat = Math.random() > 0.5 ? dMat1 : dMat2;
        // Baris kiri jauh
        miqatGroup.add(mesh(new THREE.BoxGeometry(8, h1, 10), dMat, -280 - Math.random() * 20, h1/2, z, { cast: false }));
        // Baris kanan jauh
        miqatGroup.add(mesh(new THREE.BoxGeometry(8, h2, 10), dMat, 280 + Math.random() * 20, h2/2, z, { cast: false }));
    }

    // ================================================================
    // 4e. MENARA MASJID KECIL DI PEMUKIMAN (beberapa masjid lingkungan)
    // ================================================================
    function addSmallMosqueTower(x, z) {
        const tw = new THREE.Group();
        tw.add(mesh(new THREE.BoxGeometry(3, 15, 3), bMats[0], 0, 7.5, 0));
        tw.add(mesh(new THREE.BoxGeometry(3.5, 0.5, 3.5), bMats[0], 0, 15.25, 0, { cast: false }));
        tw.add(mesh(new THREE.CylinderGeometry(1.3, 1.3, 3, 8), bMats[0], 0, 17, 0));
        tw.add(mesh(new THREE.SphereGeometry(1.5, 12, 8, 0, Math.PI*2, 0, Math.PI/2), bMats[0], 0, 18.5, 0, { cast: false }));
        tw.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 2), mats.gold, 0, 20, 0, { cast: false }));
        tw.add(mesh(new THREE.SphereGeometry(0.25, 8, 8), mats.gold, 0, 21, 0, { cast: false }));
        tw.position.set(x, 0, z);
        miqatGroup.add(tw);
        engine.addBlocker(x - 2, z - 2, x + 2, z + 2);
    }
    addSmallMosqueTower(-160, 140);
    addSmallMosqueTower(170, -180);
    addSmallMosqueTower(-200, -200);
    addSmallMosqueTower(210, 195);

    // ================================================================
    // 5. TIANG LAMPU JALAN DI TROTOAR
    // ================================================================
    for (const lz of [-60, -30, 30, 60, 90, -90]) {
        for (const sx of [-1, 1]) {
            const lp = lampPost(mats, 5);
            lp.position.set(sx * 9.5, 0, lz);
            miqatGroup.add(lp);
        }
    }
    for (const lx of [-60, -30, 30, 60, 90, -90]) {
        for (const sz of [-1, 1]) {
            const lp = lampPost(mats, 5);
            lp.position.set(lx, 0, sz * 9.5);
            miqatGroup.add(lp);
        }
    }

    // 1. PELATARAN DALAM (COURTYARD) MASJID
    // Pelataran marmer 80x80m dengan grid ornamen lantai yang elegan
    miqatGroup.add(mesh(new THREE.BoxGeometry(80, 0.2, 80), mats.marbleTile, 0, 0.1, 0, { cast: false }));
    const floorDark = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.8 });
    for(let i=-1; i<=1; i++) {
        if(i !== 0) {
            miqatGroup.add(mesh(new THREE.BoxGeometry(0.5, 0.22, 60), floorDark, i*25, 0.11, -5));
            miqatGroup.add(mesh(new THREE.BoxGeometry(50, 0.22, 0.5), floorDark, 0, 0.11, i*20 - 5));
        }
    }

    // MATERIAL TAMBAHAN
    const brownStone = new THREE.MeshStandardMaterial({ color: 0x8a634b, roughness: 0.95 }); // Batu coklat
    const darkArch = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 }); // Gelap dalam arch
    // Material relief gerbang: tampil identik dg mats.cream namun ditarik sedikit ke depan
    // pada uji-kedalaman (polygonOffset) agar tak berkedip (z-fighting) di bidang gerbang.
    const creamRelief = mats.cream.clone();
    creamRelief.polygonOffset = true;
    creamRelief.polygonOffsetFactor = -2;
    creamRelief.polygonOffsetUnits = -2;

    // 2. DINDING BENTENG KELILING
    const wallH = 7;
    const wallThick = 1.2;
    // Tembok belakang (Utara)
    // Dimundurkan ke -70 agar tidak memotong ruang dalam masjid yang tembus sampai -68
    miqatGroup.add(mesh(new THREE.BoxGeometry(80, wallH + 4, wallThick), mats.cream, 0, (wallH + 4)/2, -70));
    // Blocker belakang global dihapus agar jemaah bisa masuk ke dalam masjid
    // Tembok Samping Kiri (Barat) & Kanan (Timur)
    for (const sx of [-1, 1]) {
        // Dinding bawah coklat (panjang 110 dari -70 sampai 40, tengah di -15)
        miqatGroup.add(mesh(new THREE.BoxGeometry(wallThick, 3, 110), brownStone, sx * 40, 1.5, -15));
        // Dinding atas putih
        miqatGroup.add(mesh(new THREE.BoxGeometry(wallThick, wallH - 3, 110), mats.cream, sx * 40, 3 + (wallH - 3)/2, -15));
        // Gigi-gigi benteng (Crenellations)
        for(let z=-69; z<=39; z+=2) {
            miqatGroup.add(mesh(new THREE.BoxGeometry(wallThick, 0.8, 1), mats.cream, sx * 40, wallH + 0.4, z));
        }
        engine.addBlocker(sx * 40 - 1, -70, sx * 40 + 1, 40);
    }

    // 3. GERBANG UTAMA BIR ALI (Selatan) - Sesuai Gambar 1
    const gateZ = 40;
    const gateDepth = 6;
    // Sisi Kiri & Kanan Gerbang (menyambung ke tembok keliling)
    for (const sx of [-1, 1]) {
        // Tembok jauh samping gerbang
        miqatGroup.add(mesh(new THREE.BoxGeometry(10, 3, wallThick), brownStone, sx * 35, 1.5, gateZ));
        miqatGroup.add(mesh(new THREE.BoxGeometry(10, wallH - 3, wallThick), mats.cream, sx * 35, 3 + (wallH - 3)/2, gateZ));
        for(let x=31; x<=39; x+=2) miqatGroup.add(mesh(new THREE.BoxGeometry(1, 0.8, wallThick), mats.cream, sx * x, wallH + 0.4, gateZ));
        
        // Struktur Utama Gerbang (Main Mass)
        miqatGroup.add(mesh(new THREE.BoxGeometry(16, 5, gateDepth), brownStone, sx * 14, 2.5, gateZ)); // Bawah coklat
        miqatGroup.add(mesh(new THREE.BoxGeometry(16, 12, gateDepth), mats.cream, sx * 14, 11, gateZ)); // Atas putih
        // Pilar tengah gerbang (relief agar tak z-fighting dg massa utama)
        miqatGroup.add(mesh(new THREE.BoxGeometry(4, 10, gateDepth), creamRelief, sx * 5, 5, gateZ));

        // Arch tangga (Stepped Arch) untuk gerbang utama
        miqatGroup.add(mesh(new THREE.BoxGeometry(5.5, 0.6, gateDepth), creamRelief, sx * 4.25, 10.3, gateZ));
        miqatGroup.add(mesh(new THREE.BoxGeometry(7, 0.6, gateDepth), creamRelief, sx * 3.5, 10.9, gateZ));
        miqatGroup.add(mesh(new THREE.BoxGeometry(8.5, 0.6, gateDepth), creamRelief, sx * 2.75, 11.5, gateZ));
        miqatGroup.add(mesh(new THREE.BoxGeometry(10, 1.0, gateDepth), creamRelief, sx * 2.0, 12.3, gateZ));

        // Arch tangga untuk gerbang kecil
        miqatGroup.add(mesh(new THREE.BoxGeometry(6, 0.5, gateDepth), creamRelief, sx * 11, 4.25, gateZ));
        miqatGroup.add(mesh(new THREE.BoxGeometry(7, 0.5, gateDepth), creamRelief, sx * 11, 4.75, gateZ));
        // Pintu gelap di lengkungan kecil
        miqatGroup.add(mesh(new THREE.BoxGeometry(4, 4, 0.1), darkArch, sx * 11, 2, gateZ - 2.9));
        // Jendela kecil di atas arch samping
        miqatGroup.add(mesh(new THREE.BoxGeometry(1.5, 2, 0.2), darkArch, sx * 11, 8, gateZ - 3));

        // Pola dekorasi (bintang/lingkaran) di dinding putih
        miqatGroup.add(mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.2, 16), mats.darkGrey, sx * 18, 10, gateZ - 3.25, {rx: Math.PI/2}));
        
        // Menara Kembar di Atas Gerbang
        const gTower = new THREE.Group();
        gTower.add(mesh(new THREE.BoxGeometry(6, 6, 6), mats.cream, 0, 19.5, 0)); // Base kotak
        gTower.add(mesh(new THREE.BoxGeometry(6.4, 0.5, 6.4), mats.cream, 0, 22.75, 0)); // Balkon
        gTower.add(mesh(new THREE.CylinderGeometry(2.2, 2.2, 5, 8), mats.cream, 0, 25.5, 0)); // Segi delapan
        gTower.add(mesh(new THREE.CylinderGeometry(2.25, 2.25, 2, 8), darkArch, 0, 25.5, 0)); // Jendela segi delapan
        gTower.add(mesh(new THREE.SphereGeometry(2.4, 16, 12, 0, Math.PI*2, 0, Math.PI/2), mats.cream, 0, 28, 0)); // Kubah
        gTower.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.5), mats.gold, 0, 30, 0)); // Ornamen pucuk
        gTower.position.set(sx * 9, 0, gateZ);
        miqatGroup.add(gTower);
    }
    // Balok penutup arch utama paling atas (relief agar tak z-fighting)
    miqatGroup.add(mesh(new THREE.BoxGeometry(20, 5, gateDepth), creamRelief, 0, 15, gateZ));
    for(let x of [-2, 0, 2]) miqatGroup.add(mesh(new THREE.BoxGeometry(1.2, 2.5, 0.2), darkArch, x, 14, gateZ - 3)); // 3 Jendela tengah atas

    engine.addBlocker(-40, gateZ-3.1, -4, gateZ+3.1);
    engine.addBlocker(4, gateZ-3.1, 40, gateZ+3.1);

    // 4. MENARA TINGGI KOTAK DI DALAM COURTYARD (Detail Ornamen)
    const tallTower = new THREE.Group();
    tallTower.add(mesh(new THREE.BoxGeometry(5.5, 30, 5.5), mats.cream, 0, 15, 0)); // Badan lebih besar
    // Sabuk ornamen dan jendela memanjang di badan menara
    for(let y=10; y<=26; y+=8) {
        tallTower.add(mesh(new THREE.BoxGeometry(5.7, 0.6, 5.7), brownStone, 0, y, 0)); // Sabuk coklat
        tallTower.add(mesh(new THREE.BoxGeometry(1.5, 5, 5.7), darkArch, 0, y - 4, 0)); // Jendela gelap
        tallTower.add(mesh(new THREE.BoxGeometry(5.7, 5, 1.5), darkArch, 0, y - 4, 0));
    }
    // Balkon menara bertingkat
    tallTower.add(mesh(new THREE.BoxGeometry(7, 0.8, 7), brownStone, 0, 30, 0)); 
    tallTower.add(mesh(new THREE.BoxGeometry(6.5, 1.5, 6.5), mats.cream, 0, 31.1, 0)); // Pagar balkon
    tallTower.add(mesh(new THREE.BoxGeometry(4.5, 2, 4.5), mats.cream, 0, 30.5, 0)); // Inner base
    // Lantern hijau bersinar
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    tallTower.add(mesh(new THREE.BoxGeometry(4, 5, 4), lanternMat, 0, 34, 0, {cast:false}));
    for(const lx of [-2.1, 2.1]) {
        for(const lz of [-2.1, 2.1]) tallTower.add(mesh(new THREE.BoxGeometry(0.8, 5, 0.8), mats.cream, lx, 34, lz));
    }
    // Atap kubah lantern
    tallTower.add(mesh(new THREE.BoxGeometry(5.5, 1, 5.5), brownStone, 0, 36.5, 0)); 
    tallTower.add(mesh(new THREE.SphereGeometry(2.5, 16, 12, 0, Math.PI*2, 0, Math.PI/2), mats.cream, 0, 37, 0));
    tallTower.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 2), mats.gold, 0, 39, 0));
    tallTower.add(mesh(new THREE.SphereGeometry(0.3, 8, 8), mats.gold, 0, 40, 0)); // Finial ball

    const mtLight = new THREE.PointLight(0x00ff88, 6, 120);
    mtLight.position.set(0, 34, 0); tallTower.add(mtLight);
    tallTower.position.set(-28, 0, -28); // Sedikit digeser agar tidak tabrakan dinding
    miqatGroup.add(tallTower);
    engine.addBlocker(-31.5, -31.5, -24.5, -24.5); // Menara solid — cegah tembus (tanpa perlu batas zona)

    // 5. GUARDHOUSE / POS PENJAGA (Sesuai Gambar 2)
    const guardHouse = new THREE.Group();
    guardHouse.add(mesh(new THREE.CylinderGeometry(2, 2, 3, 8), mats.cream, 0, 1.5, 0));
    guardHouse.add(mesh(new THREE.CylinderGeometry(2.2, 2.5, 1.2, 8), new THREE.MeshStandardMaterial({color: 0x5a6350, roughness: 0.9}), 0, 3.6, 0)); // Atap hijau
    guardHouse.add(mesh(new THREE.BoxGeometry(1.5, 1, 4.1), darkArch, 0, 1.8, 0)); // Jendela
    guardHouse.add(mesh(new THREE.BoxGeometry(4.1, 1, 1.5), darkArch, 0, 1.8, 0));
    guardHouse.position.set(20, 0, 15);
    miqatGroup.add(guardHouse);
    engine.addBlocker(18, 13, 22, 17);

    // 6. RUANG SHALAT UTAMA (PRAYER HALL) & KELOMPOK KUBAH
    const hallZ = -34;
    // Bangunan luar utama (cangkang) ruang shalat (Blok berongga) menopang kubah
    // Atap luas (kedalaman 40 dari z=-28 sampai z=-68)
    miqatGroup.add(mesh(new THREE.BoxGeometry(60, 2, 40), mats.cream, 0, 11, hallZ - 14)); 
    // Dinding luar Kiri (lebar 10)
    miqatGroup.add(mesh(new THREE.BoxGeometry(10, 12, 40), mats.cream, -25, 6, hallZ - 14)); 
    // Dinding luar Kanan (lebar 10)
    miqatGroup.add(mesh(new THREE.BoxGeometry(10, 12, 40), mats.cream, 25, 6, hallZ - 14)); 
    // Dinding luar Belakang (lebar 60) menutupi belakang interior
    miqatGroup.add(mesh(new THREE.BoxGeometry(60, 12, 2), mats.cream, 0, 6, hallZ - 35));

    // Blocker hanya pada bagian solid pilar fasad
    for (const px of [-21, -14, -7, 0, 7, 14, 21]) {
        engine.addBlocker(px - 1.1, -29.1, px + 1.1, -27); // Pilar fasad solid
    }
    engine.addBlocker(-31, -70, -19.5, -27); // Dinding Kiri padat (dari luar ke ujung interior)
    engine.addBlocker(19.5, -70, 31, -27);  // Dinding Kanan padat
    engine.addBlocker(-31, -70, 31, -68); // Dinding Qibla (belakang)
    
    // Drum (Tambur) Kubah Utama agar tidak mengambang
    miqatGroup.add(mesh(new THREE.CylinderGeometry(8.2, 8.2, 2.5, 32), mats.cream, 0, 12, hallZ));
    // Kubah Utama
    miqatGroup.add(mesh(new THREE.SphereGeometry(8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mats.cream, 0, 13.25, hallZ, {cast:false}));
    miqatGroup.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.5), mats.gold, 0, 22.5, hallZ, {cast:false}));
    miqatGroup.add(mesh(new THREE.SphereGeometry(0.4, 16, 16), mats.gold, 0, 23.5, hallZ, {cast:false}));

    // Fasad Depan Ruang Shalat (Arcade Melintang)
    for(let x=-21; x<=21; x+=7) {
        miqatGroup.add(mesh(new THREE.BoxGeometry(2, 8, 2), mats.cream, x, 4, hallZ + 6)); // Pilar
        if(x < 21) {
            const archCX = x + 3.5;
            miqatGroup.add(mesh(new THREE.BoxGeometry(3.5, 0.5, 2), mats.cream, archCX, 8.25, hallZ + 6));
            miqatGroup.add(mesh(new THREE.BoxGeometry(5.0, 0.5, 2), mats.cream, archCX, 8.75, hallZ + 6));
            miqatGroup.add(mesh(new THREE.BoxGeometry(7.1, 0.5, 2), mats.cream, archCX, 9.25, hallZ + 6));
            // Fasad sekarang menjadi baris pertama ruang shalat yang sepenuhnya terbuka!
        }
    }
    miqatGroup.add(mesh(new THREE.BoxGeometry(50, 1.5, 4), mats.cream, 0, 10.25, hallZ + 6)); // Atap fasad utama

    // 7. ARCADE LENGKUNG (RIWAK) DI KIRI KANAN COURTYARD
    for (const sx of [-1, 1]) {
        for (let i = 0; i < 9; i++) {
            const zPos = -21 + i * 7;
            const px = sx * 30;
            if (zPos > 38) continue; // Jangan tembus gerbang utama
            
            // Pilar besar putih
            miqatGroup.add(mesh(new THREE.BoxGeometry(2, 6, 2), mats.cream, px, 3, zPos));
            engine.addBlocker(px - 1.1, zPos - 1.1, px + 1.1, zPos + 1.1); // Pilar solid — cegah tembus
            // Lengkungan (Arch) dengan model step block dari pilar
            miqatGroup.add(mesh(new THREE.BoxGeometry(2, 0.5, 3.5), mats.cream, px, 6.25, zPos));
            miqatGroup.add(mesh(new THREE.BoxGeometry(2, 0.5, 5), mats.cream, px, 6.75, zPos));
            miqatGroup.add(mesh(new THREE.BoxGeometry(2, 0.5, 7.1), mats.cream, px, 7.25, zPos));
        }
        // Atap riwak lorong dalam
        miqatGroup.add(mesh(new THREE.BoxGeometry(20, 1.5, 62), mats.cream, sx * 30, 8.25, 7));
    }

    // 6. AREA FASILITAS (WUDHU, MANDI, KAIN IHRAM)
    const bilik = new THREE.Group();
    // Lantai
    bilik.add(mesh(new THREE.BoxGeometry(16, 0.1, 10), mats.sand, 0, 0.05, 0));
    // Dinding Belakang
    bilik.add(mesh(new THREE.BoxGeometry(16, 4.5, 0.5), mats.cream, 0, 2.25, -4.75));
    // Dinding Kiri & Kanan
    bilik.add(mesh(new THREE.BoxGeometry(0.5, 4.5, 10), mats.cream, -7.75, 2.25, 0));
    bilik.add(mesh(new THREE.BoxGeometry(0.5, 4.5, 10), mats.cream, 7.75, 2.25, 0));
    // Atap
    bilik.add(mesh(new THREE.BoxGeometry(16, 0.5, 10), mats.cream, 0, 4.5, 0));

    // Sekat Kamar Mandi Ihram (Cubicles) di dinding belakang
    for(let cx = -6; cx <= 6; cx += 3) {
        bilik.add(mesh(new THREE.BoxGeometry(0.2, 3, 3), mats.cream, cx - 1.5, 1.5, -3.25));
        // Shower head
        bilik.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3), new THREE.MeshStandardMaterial({color:0x888888}), cx, 2.5, -4.5, {rx: Math.PI/4}));
    }
    bilik.add(mesh(new THREE.BoxGeometry(0.2, 3, 3), mats.cream, 7.5, 1.5, -3.25)); // Sekat paling kanan

    // Area Wudhu (Tengah)
    const wudhuMat = new THREE.MeshStandardMaterial({ color: 0xa9c3d4, roughness: 0.2 }); // Keramik biru muda
    bilik.add(mesh(new THREE.BoxGeometry(10, 0.8, 1.5), wudhuMat, 0, 0.4, 1.5)); // Bak air
    for(let tx = -4; tx <= 4; tx += 2) {
        // Keran
        bilik.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3), new THREE.MeshStandardMaterial({color:0xaaaaaa}), tx, 1.0, 1.5, {rx: Math.PI/2}));
        // Tempat duduk beton
        bilik.add(mesh(new THREE.BoxGeometry(0.6, 0.4, 0.6), wudhuMat, tx, 0.2, 2.5));
    }

    const bt = Tex.sign('TEMPAT MANDI & WUDHU\nBATHS & ABLUTION', { bg: '#0d3b4d', fg: '#ffffff', w: 1024, h: 200, font: 'bold 50px sans-serif' });
    bilik.add(mesh(new THREE.BoxGeometry(10, 1.2, 0.15),
        new THREE.MeshStandardMaterial({ map: bt, emissive: 0xffffff, emissiveMap: bt, emissiveIntensity: 1 }),
        0, 5, 5.05, { cast: false }));
    bilik.position.set(-20, 0, -10);
    miqatGroup.add(bilik);
    
    // Blocker diubah menjadi blocker dinding (hollow), agar player BISA MASUK ke dalam ruangan!
    engine.addBlocker(-28, -15, -12, -14.5); // Belakang
    engine.addBlocker(-28, -15, -27.5, -5);  // Kiri
    engine.addBlocker(-12.5, -15, -12, -5);  // Kanan

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
        engine.addBlocker(i * 12 - 0.5, 4.5, i * 12 + 0.5, 5.5); // Tiang lampu solid
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
            seatSpots.push({ x: tmpV.x, z: tmpV.z, ry: Math.PI });
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

    // 9. INTERIOR MASJID (Ruang Shalat Dalam)
    // Letakkan interior di depan bangunan fasad (hallZ = -34)
    // Dibuat sebagai group terpisah, tersembunyi awal, visible setelah pintu dibuka
    const mosqueInterior = new THREE.Group();
    mosqueInterior.name = 'mosqueInterior';
    
    const iFloor  = new THREE.MeshStandardMaterial({ color: 0xbdb3a8, roughness: 0.9 });
    const iWall   = new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.9 });
    const iPillar = new THREE.MeshStandardMaterial({ color: 0xf5eedc, roughness: 0.9 }); // Krem terang Bir Ali
    const iCeil   = new THREE.MeshStandardMaterial({ color: 0xbc7063, roughness: 0.9, side: THREE.DoubleSide }); // Salmon/Merah bata atap
    const iStrip  = new THREE.MeshBasicMaterial({ color: 0xfff0b3 }); // Lampu strip LED kuning terang
    const iMihrab = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.3, roughness: 0.5 });
    
    // Dimensi ruangan
    const wW = 40, wZ = 40, cY = 8.5; // Lebih luas dan tinggi

    // Lantai dasar
    mosqueInterior.add(mesh(new THREE.BoxGeometry(wW, 0.05, wZ), iFloor, 0, 0.025, 0, { cast: false }));
    
    // Karpet merah HD (menggunakan Procedural CanvasTexture agar mirip referensi Bir Ali asli)
    function createBirAliCarpetTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512; 
        const ctx = canvas.getContext('2d');

        // 1. Latar Belakang Merah Karpet Cerah
        ctx.fillStyle = '#b32428'; 
        ctx.fillRect(0, 0, 512, 512);

        // 2. Motif Geometris Bintang di area sajadah
        ctx.save();
        ctx.translate(256, 200); 
        function drawStar(radius, color, strokeColor, lineWidth) {
            ctx.fillStyle = color || 'transparent';
            ctx.strokeStyle = strokeColor || 'transparent';
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            for(let i=0; i<8; i++) {
                const angle = i * Math.PI / 4;
                ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                const innerAngle = angle + Math.PI / 8;
                ctx.lineTo(Math.cos(innerAngle) * (radius * 0.7), Math.sin(innerAngle) * (radius * 0.7));
            }
            ctx.closePath();
            if(color) ctx.fill();
            if(strokeColor) ctx.stroke();
        }
        drawStar(140, null, 'rgba(0,0,0,0.2)', 6);
        drawStar(100, '#a11c20', 'rgba(255,255,255,0.3)', 2);
        drawStar(40, '#8c1619', null, 0);
        ctx.restore();

        // 3. Garis Pembatas Shaf (Pita biru abu-abu dengan corak bintang putih)
        ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0, 420, 512, 8);
        ctx.fillStyle = '#40526b'; ctx.fillRect(0, 428, 512, 76);
        ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0, 504, 512, 8);
        
        ctx.save();
        ctx.translate(0, 466);
        for(let x = 32; x < 512; x += 64) {
            ctx.save(); ctx.translate(x, 0);
            drawStar(24, null, '#ffffff', 4);
            drawStar(10, '#ffffff', null, 0);
            ctx.restore();
        }
        ctx.restore();

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 4;
        return tex;
    }

    const carpetTex = createBirAliCarpetTexture();
    carpetTex.repeat.set((wW - 1) / 1.2, (wZ - 1) / 1.4); // Tepat menyesuaikan rasio sajadah 1.2m x 1.4m
    const carpetMat = new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 1.0 });
    
    // Single mesh Karpet Dasar (Top Y = 0.060), menggantikan ribuan box mesh manual
    mosqueInterior.add(mesh(new THREE.BoxGeometry(wW - 1, 0.060, wZ - 1), carpetMat, 0, 0.030, 0, { cast: false }));

    // Dinding keliling (Tembok Kiblat DIBOLONGI untuk Mihrab)
    const mZ = -wZ/2;
    const mihrabW = 6;
    // === RE-DESIGN MIHRAB (SESUAI REFERENSI GAMBAR BARU) ===
    const mihrabDepth = 2.0;
    const frameW = 8.0;
    const frameH = 7.5;
    
    const matGreen = new THREE.MeshStandardMaterial({ color: 0x157538 }); // Hijau border luar
    const matYellow = new THREE.MeshStandardMaterial({ color: 0xc49d29 }); // Kuning border dalam
    const matWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }); // Dinding dalam putih
    const matMarble = new THREE.MeshStandardMaterial({ color: 0xe8e4db, roughness: 0.2 }); // Dinding luar marmer
    const matWood = new THREE.MeshStandardMaterial({ color: 0x5e3a21, roughness: 0.8 }); // Kayu arch & plafon
    
    // Tembok Kiblat Kiri & Kanan (Marmer)
    mosqueInterior.add(mesh(new THREE.BoxGeometry((wW - frameW)/2, cY, 0.5), matMarble, -(wW + frameW)/4, cY/2, mZ));
    mosqueInterior.add(mesh(new THREE.BoxGeometry((wW - frameW)/2, cY, 0.5), matMarble,  (wW + frameW)/4, cY/2, mZ));
    // Tembok Kiblat Atas
    mosqueInterior.add(mesh(new THREE.BoxGeometry(frameW, cY - frameH, 0.5), matMarble, 0, frameH + (cY - frameH)/2, mZ));

    // RUANGAN DALAM MIHRAB
    // Lantai (Naik 1 anak tangga)
    mosqueInterior.add(mesh(new THREE.BoxGeometry(mihrabW, 0.2, mihrabDepth), mats.cream, 0, 0.1, mZ - mihrabDepth/2));
    // Dinding Kiri (Putih)
    mosqueInterior.add(mesh(new THREE.BoxGeometry(0.5, frameH, mihrabDepth), matWhite, -mihrabW/2 + 0.25, frameH/2, mZ - mihrabDepth/2));
    // Dinding Kanan (Putih)
    mosqueInterior.add(mesh(new THREE.BoxGeometry(0.5, frameH, mihrabDepth), matWhite, mihrabW/2 - 0.25, frameH/2, mZ - mihrabDepth/2));
    // Dinding Belakang (Putih)
    mosqueInterior.add(mesh(new THREE.BoxGeometry(mihrabW - 1, frameH, 0.5), matWhite, 0, frameH/2, mZ - mihrabDepth));
    // Plafon Kayu
    mosqueInterior.add(mesh(new THREE.BoxGeometry(mihrabW, 0.2, mihrabDepth), matWood, 0, frameH - 0.1, mZ - mihrabDepth/2));
    // Lampu gantung kecil
    mosqueInterior.add(mesh(new THREE.CylinderGeometry(0.1, 0.3, 0.6, 8), mats.gold, 0, frameH - 0.5, mZ - mihrabDepth/2));

    // BINGKAI DEPAN (FRAME)
    // 1. Frame Luar (Hijau) - Lebar 1 m
    mosqueInterior.add(mesh(new THREE.BoxGeometry(1.0, frameH, 0.1), matGreen, -frameW/2 + 0.5, frameH/2, mZ + 0.25));
    mosqueInterior.add(mesh(new THREE.BoxGeometry(1.0, frameH, 0.1), matGreen, frameW/2 - 0.5, frameH/2, mZ + 0.25));
    mosqueInterior.add(mesh(new THREE.BoxGeometry(frameW - 2, 1.0, 0.1), matGreen, 0, frameH - 0.5, mZ + 0.25));
    
    // 2. Frame Dalam (Kuning) - Lebar 0.6 m
    mosqueInterior.add(mesh(new THREE.BoxGeometry(0.6, frameH - 1, 0.1), matYellow, -frameW/2 + 1.3, (frameH-1)/2, mZ + 0.26));
    mosqueInterior.add(mesh(new THREE.BoxGeometry(0.6, frameH - 1, 0.1), matYellow, frameW/2 - 1.3, (frameH-1)/2, mZ + 0.26));
    mosqueInterior.add(mesh(new THREE.BoxGeometry(frameW - 3.2, 0.6, 0.1), matYellow, 0, frameH - 1.3, mZ + 0.26));

    // PILAR MARMER (2 Pilar bundar besar di sisi bukaan)
    // Pilar Kiri
    mosqueInterior.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 5.5, 16), matMarble, -mihrabW/2 + 0.5, 2.75, mZ + 0.5));
    // Base/Capital Kiri
    mosqueInterior.add(mesh(new THREE.BoxGeometry(1.0, 0.4, 1.0), mats.cream, -mihrabW/2 + 0.5, 0.2, mZ + 0.5));
    mosqueInterior.add(mesh(new THREE.BoxGeometry(1.2, 0.3, 1.2), mats.cream, -mihrabW/2 + 0.5, 5.65, mZ + 0.5));
    
    // Pilar Kanan
    mosqueInterior.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 5.5, 16), matMarble, mihrabW/2 - 0.5, 2.75, mZ + 0.5));
    // Base/Capital Kanan
    mosqueInterior.add(mesh(new THREE.BoxGeometry(1.0, 0.4, 1.0), mats.cream, mihrabW/2 - 0.5, 0.2, mZ + 0.5));
    mosqueInterior.add(mesh(new THREE.BoxGeometry(1.2, 0.3, 1.2), mats.cream, mihrabW/2 - 0.5, 5.65, mZ + 0.5));

    // ARCH KAYU MELENGKUNG DI ATAS BUKAAN
    mosqueInterior.add(mesh(new THREE.CylinderGeometry(mihrabW/2 - 0.5, mihrabW/2 - 0.5, 0.6, 24, 1, false, 0, Math.PI), 
        matWood, 0, 5.8, mZ + 0.4));
    
    // JAM DIGITAL DI ATAS ARCH
    mosqueInterior.add(mesh(new THREE.BoxGeometry(2.0, 0.6, 0.1), new THREE.MeshStandardMaterial({ color: 0x111111 }), 0, frameH + 0.5, mZ + 0.3));

    // ORNAMEN KALIGRAFI KANAN KIRI
    mosqueInterior.add(mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x222222 }), -frameW/2 - 2, 4.5, mZ + 0.26, { rx: Math.PI/2 }));
    mosqueInterior.add(mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x222222 }), frameW/2 + 2, 4.5, mZ + 0.26, { rx: Math.PI/2 }));

    // MIMBAR (Di dalam mihrab, sisi kanan seperti di referensi)
    mosqueInterior.add(mesh(new THREE.BoxGeometry(1.2, 1.8, 1.5), matWood, mihrabW/2 - 1.0, 0.9 + 0.2, mZ - 1.0));

    // Tiang besar khas Bir Ali (berbaris) - RONGGA MENJOROK KE DALAM 3D (Z-FIGHTING FREE)
    const pxList = [-14, -7, 0, 7, 14]; // Disejajarkan persis di belakang pilar fasad luar (lorong jadi plong!)
    const pzList = [-12, -4, 4, 12]; // Jarak antar tiang Z = 8
    const pH = 7.0; // Tinggi tiang
    const iCore = new THREE.MeshStandardMaterial({ color: 0xdbd4c0, roughness: 1.0 }); // Bayangan di dalam ceruk

    for (const px of pxList) {
        for (const pz of pzList) {
            // HILANGKAN pilar tengah paling depan (X = 0, Z = -12) agar sajadah jamaah tidak terhalang tiang!
            if (px === 0 && pz === -12) continue;
            
            // 1. Plinth / Base Tiang (Lebar 2.0 x 2.0)
            mosqueInterior.add(mesh(new THREE.BoxGeometry(2.0, 0.3, 2.0), iFloor, px, 0.15, pz));
            
            // 2. Inti Tiang (Lebar 1.4 x 1.4) - Warna lebih gelap untuk dalam ceruk
            mosqueInterior.add(mesh(new THREE.BoxGeometry(1.4, pH, 1.4), iCore, px, pH/2, pz));
            
            // 3. 4 Pilar Sudut (Frame corners) (Lebar 0.2 x 0.2)
            // Diposisikan menempel pas di luar sudut Inti Tiang. Jarak pusat ke pusat inti = 0.8
            mosqueInterior.add(mesh(new THREE.BoxGeometry(0.2, pH, 0.2), iPillar, px - 0.8, pH/2, pz - 0.8)); // Kiri Blk
            mosqueInterior.add(mesh(new THREE.BoxGeometry(0.2, pH, 0.2), iPillar, px + 0.8, pH/2, pz - 0.8)); // Kanan Blk
            mosqueInterior.add(mesh(new THREE.BoxGeometry(0.2, pH, 0.2), iPillar, px - 0.8, pH/2, pz + 0.8)); // Kiri Dpn
            mosqueInterior.add(mesh(new THREE.BoxGeometry(0.2, pH, 0.2), iPillar, px + 0.8, pH/2, pz + 0.8)); // Kanan Dpn
            
            // 4. Panel Penutup Bawah Ceruk (Y = 0.3 sampai 1.2 -> Center Y = 0.75, Tinggi = 0.9)
            // Depan & Belakang (Tebal Z=0.2, Panjang X=1.4)
            mosqueInterior.add(mesh(new THREE.BoxGeometry(1.4, 0.9, 0.2), iPillar, px, 0.75, pz + 0.8)); // Depan
            mosqueInterior.add(mesh(new THREE.BoxGeometry(1.4, 0.9, 0.2), iPillar, px, 0.75, pz - 0.8)); // Belakang
            // Kiri & Kanan (Tebal X=0.2, Panjang Z=1.4)
            mosqueInterior.add(mesh(new THREE.BoxGeometry(0.2, 0.9, 1.4), iPillar, px - 0.8, 0.75, pz)); // Kiri
            mosqueInterior.add(mesh(new THREE.BoxGeometry(0.2, 0.9, 1.4), iPillar, px + 0.8, 0.75, pz)); // Kanan
            
            // 5. Panel Penutup Atas Ceruk (Y = 3.0 sampai pH -> Center Y = 5.0, Tinggi = 4.0)
            mosqueInterior.add(mesh(new THREE.BoxGeometry(1.4, 4.0, 0.2), iPillar, px, 5.0, pz + 0.8)); // Depan
            mosqueInterior.add(mesh(new THREE.BoxGeometry(1.4, 4.0, 0.2), iPillar, px, 5.0, pz - 0.8)); // Belakang
            mosqueInterior.add(mesh(new THREE.BoxGeometry(0.2, 4.0, 1.4), iPillar, px - 0.8, 5.0, pz)); // Kiri
            mosqueInterior.add(mesh(new THREE.BoxGeometry(0.2, 4.0, 1.4), iPillar, px + 0.8, 5.0, pz)); // Kanan

            // Ornamen Arch Lengkung di Puncak Ceruk (Y = 3.0)
            // Depan & Belakang
            mosqueInterior.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 16), iPillar, px, 3.0, pz + 0.8, { rx: Math.PI/2 }));
            mosqueInterior.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 16), iPillar, px, 3.0, pz - 0.8, { rx: Math.PI/2 }));
            // Kiri & Kanan
            mosqueInterior.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 16), iPillar, px - 0.8, 3.0, pz, { rz: Math.PI/2 }));
            mosqueInterior.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 16), iPillar, px + 0.8, 3.0, pz, { rz: Math.PI/2 }));

            // 6. Kepala Tiang (Capital) - Bagian tebal yang menopang atap lengkung
            mosqueInterior.add(mesh(new THREE.BoxGeometry(2.4, 0.8, 2.4), iPillar, px, 7.4, pz));
            mosqueInterior.add(mesh(new THREE.BoxGeometry(2.8, 0.6, 2.8), iPillar, px, 8.1, pz)); // Step 2 membesar
        }
    }

    // ==== ATAP (CEILING) ====
    // Plafon dasar hitam / blok penutup luar ruangan (melindungi dari view luar awan)
    mosqueInterior.add(mesh(new THREE.BoxGeometry(wW + 10, 2.0, wZ + 10), new THREE.MeshBasicMaterial({ color: 0x050505 }), 0, 11.0, 0, { cast: false }));
    // Plafon atap merah (vault langit-langit tinggi)
    mosqueInterior.add(mesh(new THREE.BoxGeometry(wW, 0.5, wZ), iCeil, 0, 9.8, 0, { cast: false }));

    // Lorong-lorong Lengkung Atap (Vaulted Archways Merah Bata)
    for (const px of pxList) {
        // Balok memanjang arah Z menopang atap
        mosqueInterior.add(mesh(new THREE.BoxGeometry(2.8, 1.4, wZ), iCeil, px, 9.1, 0));
        
        // Lampu panjang kuning menyala di lorong
        mosqueInterior.add(mesh(new THREE.BoxGeometry(1.2, 0.1, wZ), iStrip, px, 8.4, 0));
        // Kap rumah lampu hitam
        mosqueInterior.add(mesh(new THREE.BoxGeometry(1.4, 0.15, wZ), new THREE.MeshStandardMaterial({ color: 0x111111 }), px, 8.5, 0));
    }
    for (const pz of pzList) {
        // Balok melintang arah X
        mosqueInterior.add(mesh(new THREE.BoxGeometry(wW, 1.4, 2.8), iCeil, 0, 9.1, pz));
    }

    // Pencahayaan Atap yang kuat agar interior terang
    const ambientIn = new THREE.AmbientLight(0xfff8e7, 1.3);
    mosqueInterior.add(ambientIn);
    for (const px of pxList) {
        for (const pz of pzList) {
            const pLight = new THREE.PointLight(0xffebb3, 0.6, 25);
            pLight.position.set(px, 7.5, pz);
            mosqueInterior.add(pLight);
        }
    }

    
    // Posisikan seluruh interior tepat di belakang fasad
    // Kedalaman interior wZ = 40. Ujung depannya (wZ/2 = 20) dipaskan dengan muka fasad (z = -28)
    // Sehingga posisi center interior Z = -28 - 20 = -48.
    mosqueInterior.position.set(0, 0, -48);
    scene.add(mosqueInterior);
    
    // Sajadah khusus posisi pemain di dalam masjid (Kembali ke X = 0)
    // Pilar tengah depan sudah dihilangkan sehingga X=0 sangat aman dan merupakan shaf paling ideal!
    const playerSajadah = mesh(new THREE.BoxGeometry(1.0, 0.05, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x2d6b4a, roughness: 0.9 }), 0, 0.05, 0, { cast: false });
    playerSajadah.position.set(0, 0, -62); // Di shaf pertama persis di tengah
    scene.add(playerSajadah);

    scene.add(miqatGroup);

    engine.configureMinimap({
        scale: 1.5, center: { x: 0, z: 0 },
        features: [
            { type: 'square', x: -20, z: -10, color: '#57a9d9', label: 'Wudhu' },
            { type: 'square', x: 0, z: -15, color: '#e8e2d2', label: 'Ihram' },
            { type: 'point', x: 16, z: -25, color: '#37c978', label: 'Sholat' },
            { type: 'square', x: 0, z: 54, color: '#d9d957', label: 'Bus' }
        ]
    });

    return { bilik, rak, sajadah: sajadahGroup, bus, busDoor, seatSpots, mosqueInterior, playerSajadah };
}


/**
 * Padang Arafah: dataran luas, Jabal Rahmah dengan tugu putih, Masjid Namirah,
 * tenda-tenda putih, dan pepohonan. Puncak ibadah haji (9 Dzulhijjah).
 */
export function arafah(engine) {
    const { scene, mats } = engine;
    engine.ground(800, mats.sand);

    // Pegunungan coklat berbatu di cakrawala (latar Arafah/Namirah) — lebih tinggi & padat di belakang masjid
    const mtnMat  = new THREE.MeshStandardMaterial({ color: 0x8a6f4e, roughness: 1, flatShading: true });
    const mtnMat2 = new THREE.MeshStandardMaterial({ color: 0x6f593c, roughness: 1, flatShading: true });
    const _mv = new THREE.Vector3();
    const makeRidge = (cx, cz, R, Hm, mat) => {
        const geo = new THREE.ConeGeometry(R, Hm, 16, 6);
        const p = geo.attributes.position;
        for (let k = 0; k < p.count; k++) {
            _mv.fromBufferAttribute(p, k);
            const yN = (_mv.y + Hm / 2) / Hm;
            const rad = Math.hypot(_mv.x, _mv.z);
            if (rad > 0.01) { const j = (Math.random() - 0.35) * R * 0.28 * (0.4 + yN); const s = 1 + j / rad; _mv.x *= s; _mv.z *= s; }
            _mv.y += (Math.random() - 0.5) * Hm * 0.12;
            p.setXYZ(k, _mv.x, _mv.y, _mv.z);
        }
        geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, mat); m.position.set(cx, Hm / 2 - 3, cz); m.castShadow = false; scene.add(m);
    };
    for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2;
        const behind = Math.cos(ang) < -0.15;                 // sisi -x/-z: latar di belakang masjid
        const dist = 230 + Math.random() * 70;
        const R = (behind ? 75 : 45) + Math.random() * 40;
        const Hm = (behind ? 62 : 28) + Math.random() * 34;
        makeRidge(Math.cos(ang) * dist + (Math.random() - 0.5) * 40, Math.sin(ang) * dist, R, Hm, i % 2 ? mtnMat : mtnMat2);
    }

    // ── Jabal Rahmah — GUNUNG REALISTIS YANG BISA DINAIKI ─────────────────
    const jabalPos = { x: -58, z: -66 };
    const jabal = new THREE.Group();
    const graniteA = new THREE.MeshStandardMaterial({ color: 0xbeb5a4, roughness: 0.92 });
    const graniteB = new THREE.MeshStandardMaterial({ color: 0xa89d89, roughness: 0.95 });
    const graniteC = new THREE.MeshStandardMaterial({ color: 0xccc4b4, roughness: 0.9 });
    const graniteD = new THREE.MeshStandardMaterial({ color: 0x9a8e78, roughness: 0.97 });
    const graniteE = new THREE.MeshStandardMaterial({ color: 0x8c8068, roughness: 0.98 });
    const grn = [graniteA, graniteB, graniteC, graniteD, graniteE];
    const _jv = new THREE.Vector3();

    // Helper: buat bongkahan batu bulat realistis (granit terkikis)
    const makeBoulder = (r, mat) => {
        const g = new THREE.IcosahedronGeometry(r, 2);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
            _jv.fromBufferAttribute(p, i).normalize();
            const n = 1 + Math.sin(_jv.x * 3) * Math.cos(_jv.y * 3) * 0.06 + (Math.random() - 0.5) * 0.08;
            p.setXYZ(i, _jv.x * r * n, _jv.y * r * n * 0.85, _jv.z * r * n);
        }
        g.computeVertexNormals();
        const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
    };

    // ── PARAMETER GUNUNG ──
    const JABAL_RADIUS = 35;   // Radius dasar gunung (lebih besar agar landai)
    const JABAL_HEIGHT = 22;   // Ketinggian puncak

    // Fungsi ketinggian gunung: cone yang halus dengan noise
    function jabalHeightAt(wx, wz) {
        const dx = wx - jabalPos.x;
        const dz = wz - jabalPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > JABAL_RADIUS) return 0;
        // Profil lereng: lereng landai di bawah, makin curam di atas
        const t = 1 - dist / JABAL_RADIUS; // 0 di tepi, 1 di puncak
        const h = JABAL_HEIGHT * Math.pow(t, 1.3); // Kurva sedikit cekung agar landai
        // Tambah sedikit noise agar tak rata sempurna
        const noise = Math.sin(dx * 0.3) * Math.cos(dz * 0.4) * 0.5;
        return Math.max(0, h + noise);
    }

    // Daftarkan height zone agar pemain naik saat berjalan ke gunung
    engine.addHeightZone(jabalPos.x, jabalPos.z, JABAL_RADIUS + 5, jabalHeightAt);

    // ── VISUAL: Badan gunung bertingkat (terraced rocky hill) ──
    // Layer 1: Base/dasar — gundukan besar dan lebar
    const jbase = makeBoulder(28, graniteA);
    jbase.scale.set(1.3, 0.35, 1.2);
    jbase.position.set(0, 1.5, 0);
    jabal.add(jbase);

    // Layer dasar tambahan dari berbagai sisi agar terlihat lebar alami
    for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
        const r = 22 + Math.random() * 8;
        const b = makeBoulder(8 + Math.random() * 5, grn[i % 5]);
        b.scale.set(1.2, 0.4 + Math.random() * 0.2, 1.1);
        b.position.set(Math.cos(ang) * r, 0.5, Math.sin(ang) * r);
        b.rotation.set(Math.random() * 0.3, Math.random() * 6, Math.random() * 0.3);
        jabal.add(b);
    }

    // Layer 2-6: Tumpukan batu bertingkat makin ke atas makin kecil
    const layers = [
        { y: 2,  r: 22, boulderR: [5, 9],  count: 14 },
        { y: 5,  r: 18, boulderR: [4, 7],  count: 13 },
        { y: 8,  r: 14, boulderR: [3.5, 6], count: 11 },
        { y: 11, r: 10, boulderR: [3, 5.5], count: 10 },
        { y: 14, r: 7,  boulderR: [2.5, 4.5], count: 8 },
        { y: 17, r: 4,  boulderR: [2, 3.5], count: 6 },
        { y: 19, r: 2.5, boulderR: [1.5, 3], count: 4 },
    ];
    for (const L of layers) {
        for (let i = 0; i < L.count; i++) {
            const ang = (i / L.count) * Math.PI * 2 + Math.random() * 0.4;
            const rr = L.r * (0.3 + Math.random() * 0.65);
            const bR = L.boulderR[0] + Math.random() * (L.boulderR[1] - L.boulderR[0]);
            const b = makeBoulder(bR, grn[Math.floor(Math.random() * 5)]);
            b.position.set(Math.cos(ang) * rr, L.y + (Math.random() - 0.4) * 1.8, Math.sin(ang) * rr);
            b.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
            jabal.add(b);
        }
    }

    // Puncak: bongkahan besar rata
    const jtop = makeBoulder(6, graniteC);
    jtop.scale.set(1.6, 0.6, 1.6);
    jtop.position.set(0, 20, 0);
    jabal.add(jtop);

    // Batu-batu kecil tersebar di lereng untuk detail
    for (let i = 0; i < 40; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 5 + Math.random() * (JABAL_RADIUS - 5);
        const wx = Math.cos(ang) * dist;
        const wz = Math.sin(ang) * dist;
        const h = jabalHeightAt(jabalPos.x + wx, jabalPos.z + wz);
        const smallR = 0.3 + Math.random() * 1.2;
        const rock = makeBoulder(smallR, grn[Math.floor(Math.random() * 5)]);
        rock.position.set(wx, h - 0.1, wz);
        rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        jabal.add(rock);
    }

    // ── JALAN SETAPAK NAIK (visible path) ──
    // Tangga/ramp yang terlihat dari batu pipih agar player tahu bisa naik
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xb5a890, roughness: 0.95 });
    const pathSteps = 30;
    for (let i = 0; i < pathSteps; i++) {
        const t = i / pathSteps;
        // Jalur spiral dari depan (Z+) berputar ke puncak
        const ang = Math.PI * 0.5 + t * Math.PI * 1.8; // 3/4 putaran
        const dist = JABAL_RADIUS * (1 - t * 0.85); // dari tepi ke dekat puncak
        const sx = Math.cos(ang) * dist;
        const sz = Math.sin(ang) * dist;
        const h = jabalHeightAt(jabalPos.x + sx, jabalPos.z + sz);
        // Pijakan batu pipih
        const stepW = 3.5 - t * 1.5; // Makin ke atas makin sempit
        const step = mesh(new THREE.BoxGeometry(stepW, 0.3, 2), pathMat, sx, h - 0.1, sz, { cast: false });
        step.rotation.y = ang + Math.PI / 2;
        jabal.add(step);
    }

    jabal.position.set(jabalPos.x, 0, jabalPos.z);
    scene.add(jabal);

    // Tugu putih (Monumen Jabal Rahmah) di puncak
    scene.add(mesh(new THREE.BoxGeometry(4.2, 1.0, 4.2), mats.cream, jabalPos.x, JABAL_HEIGHT + 1.0, jabalPos.z, { cast: false }));
    const pillar = mesh(new THREE.BoxGeometry(2.7, 9, 2.7), mats.white, jabalPos.x, JABAL_HEIGHT + 6.0, jabalPos.z);
    scene.add(pillar);
    scene.add(mesh(new THREE.BoxGeometry(3.0, 0.6, 3.0), mats.cream, jabalPos.x, JABAL_HEIGHT + 10.8, jabalPos.z, { cast: false }));

    // Pelataran batu + tangga & bollard pagar di kaki bukit (sisi depan menghadap pelataran wukuf)
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xcac2b2, roughness: 0.9 });
    scene.add(mesh(new THREE.CylinderGeometry(38, 42, 0.3, 36), stoneMat, jabalPos.x, 0.15, jabalPos.z, { cast: false }));
    // Tangga batu di sisi depan (arah +Z) — pintu masuk jalur pendakian
    for (let s = 0; s < 12; s++)
        scene.add(mesh(new THREE.BoxGeometry(8, 0.4, 1.5), stoneMat, jabalPos.x, 0.3 + s * 0.5, jabalPos.z + JABAL_RADIUS - 2 - s * 1.5, { cast: false }));
    // Bollard pagar di pintu masuk jalur pendakian
    for (let i = -4; i <= 4; i++) {
        const bx = jabalPos.x + i * 3.2, bz = jabalPos.z + JABAL_RADIUS + 2;
        scene.add(mesh(new THREE.BoxGeometry(0.5, 1.5, 0.5), stoneMat, bx, 0.9, bz, { cast: false }));
        scene.add(mesh(new THREE.ConeGeometry(0.35, 0.5, 4), stoneMat, bx, 1.9, bz, { cast: false }));
    }

    // ── Masjid Namirah — masjid putih berkubah perak berusuk (DIPERPANJANG ke belakang) ──
    const mosque   = new THREE.Group();
    const wallMat  = new THREE.MeshStandardMaterial({ color: 0xf2ecdf, roughness: 0.85 });
    const trimMat  = new THREE.MeshStandardMaterial({ color: 0xe6d9bd, roughness: 0.8 });
    const goldMat2 = new THREE.MeshStandardMaterial({ color: 0xc7a64a, roughness: 0.5, metalness: 0.5 });
    const darkNiche= new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.95 });
    const domeMat  = new THREE.MeshStandardMaterial({ color: 0xb4b2a8, roughness: 0.5, metalness: 0.3 });
    const MW = 110, MH = 15, MD = 50; // MD diperpanjang dari 20 ke 50

    // Massa utama + parapet & merlon bergigi
    mosque.add(mesh(new THREE.BoxGeometry(MW, MH, MD), wallMat, 0, MH / 2, 0));
    mosque.add(mesh(new THREE.BoxGeometry(MW + 1, 1.2, MD + 1), wallMat, 0, MH + 0.6, 0, { cast: false }));
    for (let x = -MW / 2 + 2; x <= MW / 2 - 2; x += 4)
        mosque.add(mesh(new THREE.BoxGeometry(1.8, 1.6, MD + 1.4), wallMat, x, MH + 1.8, 0, { cast: false }));

    // Dua pita emas horizontal rendah pada dinding depan
    for (const gy of [1.8, 2.5]) mosque.add(mesh(new THREE.BoxGeometry(MW + 0.1, 0.35, 0.4), goldMat2, 0, gy, MD / 2 + 0.05, { cast: false }));

    // Relung lengkung runcing gelap di sepanjang fasad depan
    for (let x = -MW / 2 + 12; x <= MW / 2 - 8; x += 9) {
        mosque.add(mesh(new THREE.BoxGeometry(3.4, 7.0, 0.5), trimMat, x, 6.0, MD / 2 + 0.1, { cast: false }));
        mosque.add(mesh(new THREE.BoxGeometry(2.4, 5.2, 0.6), darkNiche, x, 5.5, MD / 2 + 0.22, { cast: false }));
        mosque.add(mesh(new THREE.ConeGeometry(1.35, 1.9, 3), darkNiche, x, 9.0, MD / 2 + 0.22, { cast: false }));
    }

    // Relung di dinding belakang juga (desain konsisten)
    for (let x = -MW / 2 + 12; x <= MW / 2 - 8; x += 9) {
        mosque.add(mesh(new THREE.BoxGeometry(3.4, 7.0, 0.5), trimMat, x, 6.0, -MD / 2 - 0.1, { cast: false }));
        mosque.add(mesh(new THREE.BoxGeometry(2.4, 5.2, 0.6), darkNiche, x, 5.5, -MD / 2 - 0.22, { cast: false }));
        mosque.add(mesh(new THREE.ConeGeometry(1.35, 1.9, 3), darkNiche, x, 9.0, -MD / 2 - 0.22, { cast: false }));
    }

    // Relung di dinding samping kiri & kanan (desain sama)
    for (const sx of [-1, 1]) {
        for (let z = -MD / 2 + 8; z <= MD / 2 - 8; z += 9) {
            mosque.add(mesh(new THREE.BoxGeometry(0.5, 7.0, 3.4), trimMat, sx * (MW / 2 + 0.1), 6.0, z, { cast: false }));
            mosque.add(mesh(new THREE.BoxGeometry(0.6, 5.2, 2.4), darkNiche, sx * (MW / 2 + 0.22), 5.5, z, { cast: false }));
        }
    }

    // Gerbang utama (iwan) menonjol di kiri
    const iwanX = -MW / 2 + 15;
    mosque.add(mesh(new THREE.BoxGeometry(17, MH + 5, MD + 2), wallMat, iwanX, (MH + 5) / 2, 0, { cast: false }));
    for (let x = -7; x <= 7; x += 3.5) mosque.add(mesh(new THREE.BoxGeometry(1.8, 1.8, MD + 2.4), wallMat, iwanX + x, MH + 5 + 0.9, 0, { cast: false }));
    mosque.add(mesh(new THREE.BoxGeometry(7.5, 12, 1.0), darkNiche, iwanX, 6.5, MD / 2 + 0.3, { cast: false }));
    mosque.add(mesh(new THREE.ConeGeometry(3.9, 4.4, 3), darkNiche, iwanX, 14.2, MD / 2 + 0.3, { cast: false }));
    mosque.add(mesh(new THREE.BoxGeometry(9, 0.4, 1.1), goldMat2, iwanX, 12.6, MD / 2 + 0.36, { cast: false }));

    // Kubah perak berusuk (ribbed) di atas drum
    const domeX = 10, domeY = MH + 3;
    mosque.add(mesh(new THREE.CylinderGeometry(9, 9.6, 3.4, 24), wallMat, domeX, MH + 1.1, 0, { cast: false }));
    mosque.add(mesh(new THREE.SphereGeometry(9, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.56), domeMat, domeX, domeY, 0, { cast: false }));
    for (let i = 0; i < 22; i++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(9.06, 0.14, 6, 24, Math.PI * 0.52), trimMat);
        rib.position.set(domeX, domeY, 0); rib.rotation.y = (i / 22) * Math.PI * 2; rib.castShadow = false;
        mosque.add(rib);
    }
    mosque.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 8), goldMat2, domeX, domeY + 9.4, 0, { cast: false }));
    mosque.add(mesh(new THREE.SphereGeometry(0.55, 12, 10), goldMat2, domeX, domeY + 10.6, 0, { cast: false }));

    // Kubah tambahan di bagian belakang yang diperpanjang (desain konsisten)
    const domeX2 = -15, domeY2 = MH + 2;
    mosque.add(mesh(new THREE.CylinderGeometry(7, 7.4, 2.8, 20), wallMat, domeX2, MH + 0.8, -12, { cast: false }));
    mosque.add(mesh(new THREE.SphereGeometry(7, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.56), domeMat, domeX2, domeY2, -12, { cast: false }));
    for (let i = 0; i < 16; i++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(7.06, 0.12, 6, 20, Math.PI * 0.52), trimMat);
        rib.position.set(domeX2, domeY2, -12); rib.rotation.y = (i / 16) * Math.PI * 2; rib.castShadow = false;
        mosque.add(rib);
    }
    mosque.add(mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.8, 8), goldMat2, domeX2, domeY2 + 7.2, -12, { cast: false }));
    mosque.add(mesh(new THREE.SphereGeometry(0.45, 10, 8), goldMat2, domeX2, domeY2 + 8.2, -12, { cast: false }));

    // Kubah kecil ketiga
    const domeX3 = 30, domeY3 = MH + 1.5;
    mosque.add(mesh(new THREE.CylinderGeometry(5.5, 5.8, 2.2, 16), wallMat, domeX3, MH + 0.5, -8, { cast: false }));
    mosque.add(mesh(new THREE.SphereGeometry(5.5, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), domeMat, domeX3, domeY3, -8, { cast: false }));
    mosque.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.5, 8), goldMat2, domeX3, domeY3 + 5.8, -8, { cast: false }));
    mosque.add(mesh(new THREE.SphereGeometry(0.35, 8, 8), goldMat2, domeX3, domeY3 + 6.6, -8, { cast: false }));

    // Dua minaret putih (khas referensi)
    const buildNamirahMinaret = (x, z, h) => {
        const g = new THREE.Group();
        g.add(mesh(new THREE.BoxGeometry(3, h * 0.08, 3), wallMat, 0, h * 0.04, 0));
        g.add(mesh(new THREE.CylinderGeometry(1.0, 1.3, h * 0.5, 16), wallMat, 0, h * 0.08 + h * 0.25, 0));
        g.add(mesh(new THREE.CylinderGeometry(1.35, 1.35, h * 0.03, 16), trimMat, 0, h * 0.58, 0));
        g.add(mesh(new THREE.CylinderGeometry(0.8, 1.0, h * 0.22, 16), wallMat, 0, h * 0.71, 0));
        g.add(mesh(new THREE.CylinderGeometry(1.05, 1.05, h * 0.025, 16), trimMat, 0, h * 0.83, 0));
        g.add(mesh(new THREE.CylinderGeometry(0.6, 0.78, h * 0.08, 12), wallMat, 0, h * 0.88, 0));
        g.add(mesh(new THREE.SphereGeometry(0.85, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), wallMat, 0, h * 0.93, 0, { cast: false }));
        g.add(mesh(new THREE.ConeGeometry(0.5, h * 0.05, 12), wallMat, 0, h * 0.975, 0, { cast: false }));
        g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, h * 0.06, 8), goldMat2, 0, h * 1.01, 0, { cast: false }));
        const cr = mesh(new THREE.TorusGeometry(0.5, 0.11, 8, 16, Math.PI * 1.4), goldMat2, 0, h * 1.05, 0, { cast: false });
        cr.rotation.z = -Math.PI * 0.1; g.add(cr);
        g.position.set(x, 0, z); mosque.add(g);
    };
    buildNamirahMinaret(-MW / 2 - 3, 8, 46);
    buildNamirahMinaret(MW / 2 - 10, 6, 42);

    // Papan nama masjid di atas iwan
    const nt = Tex.sign('مسجد نمرة — MASJID NAMIRAH', { bg: '#0b2b1a', fg: '#ffe9a8', w: 1024, h: 110 });
    mosque.add(mesh(new THREE.BoxGeometry(14, 1.8, 0.4),
        new THREE.MeshStandardMaterial({ map: nt, emissive: 0xffffff, emissiveMap: nt, emissiveIntensity: 0.6 }),
        iwanX, 17.5, MD / 2 + 0.3, { cast: false }));

    mosque.position.set(40, 0, -98);
    scene.add(mosque);

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

    // Solid Colliders — TANPA blocker di Jabal Rahmah (kini bisa dinaiki!)
    // Blocker masjid yang diperpanjang
    engine.addBlocker(40 - MW/2 - 4, -98 - MD/2 - 2, 40 + MW/2 + 4, -98 + MD/2 + 2);
    engine.addWalkRect(-100, -130, 130, 100);
    engine.configureMinimap({
        scale: 0.7, center: { x: 0, z: 0 },
        features: [
            { type: 'point', x: jabalPos.x, z: jabalPos.z, color: '#e8e2d2', label: 'Jabal Rahmah' },
            { type: 'square', x: 40, z: -96, color: '#ebd9a2', label: 'Masjid Namirah' },
            { type: 'square', x: 70, z: 55, color: '#f9f7f1', label: 'Tenda' }
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

    // Lampu Sorot Jalan Raya dan LAMPU GANTUNG (Festoon lights) yang diperbanyak
    const wireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd78a, emissiveIntensity: 2.0 });
    
    const postPositions = [];
    for (let lx = -120; lx <= 120; lx += 30) {
        for (let lz = -140; lz <= 140; lz += 35) {
            const lp = lampPost(mats, 12);
            lp.position.set(lx, 0, lz);
            scene.add(lp);
            engine.addPointLamp(lx, 11.5, lz, { intensity: 120, distance: 80, color: 0xffd78a });
            postPositions.push(new THREE.Vector3(lx, 11, lz));
        }
    }
    
    // Tarik kabel lampu gantung antar tiang
    for (let i = 0; i < postPositions.length - 1; i++) {
        const p1 = postPositions[i];
        const p2 = postPositions[i+1];
        if (p1.distanceTo(p2) <= 40) {
            const dist = p1.distanceTo(p2);
            const mid = p1.clone().lerp(p2, 0.5);
            mid.y -= 2; // Lengkungan kabel turun ke bawah
            
            // Kabel hitam membentang
            const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, dist, 4), wireMat);
            wire.position.copy(mid);
            wire.lookAt(p2);
            wire.rotateX(Math.PI/2);
            scene.add(wire);
            
            // Pasang bohlam gantung berjejer di kabel
            for (let b = 0.1; b < 0.9; b += 0.1) {
                const bPos = p1.clone().lerp(p2, b);
                // Simulasi lengkungan (parabola)
                const arc = Math.sin(b * Math.PI) * 2;
                bPos.y -= arc;
                const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), bulbMat);
                bulb.position.copy(bPos);
                scene.add(bulb);
            }
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

    // Separuh area (sebelah kanan/timur) diisi dengan TENDA PUTIH untuk berteduh
    const tentBodyGeo = new THREE.BoxGeometry(6.4, 3.2, 6.4);
    const tentRoofGeo = new THREE.ConeGeometry(4.8, 1.8, 4);
    const tentMat = new THREE.MeshStandardMaterial({ color: 0xf9f7f1, roughness: 0.9, side: THREE.DoubleSide });
    const tents = new THREE.Group();
    
    for (let row = -15; row < 15; row++) {
        for (let col = 2; col < 15; col++) { // Mengisi X positif (separuh area) secara masif sejauh mata memandang
            if (Math.random() > 0.8) continue;
            const tx = col * 9;
            const tz = row * 9;
            
            const tBody = mesh(tentBodyGeo, tentMat, tx, 1.6, tz);
            const tRoof = mesh(tentRoofGeo, tentMat, tx, 4.1, tz);
            tRoof.rotation.y = Math.PI/4;
            tents.add(tBody, tRoof);
            engine.addBlocker(tx - 3.2, tz - 3.2, tx + 3.2, tz + 3.2);
        }
    }
    scene.add(tents);
    // (Bus telah dihilangkan sepenuhnya)

    // Batu kerikil interaktif — tersebar secara tunggal maupun mengelompok
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

    // Hilangkan batas zona (batas berjalan) agar jamaah bebas menjelajah
    engine.addWalkRect(-300, -300, 300, 300);
    engine.configureMinimap({
        scale: 1.4, center: { x: 0, z: 0 },
        features: clusters.map(c => ({ type: 'point', x: c.position.x, z: c.position.z, color: '#c9bda8' }))
    });
    return { clusters };
}


export function jamratPillar(mats, { height = 18 } = {}) {
    const g = new THREE.Group();
    // Dinding elips raksasa (jamarat modern mirip aslinya, panjang ~28m)
    const wallGeo = new THREE.CylinderGeometry(1.2, 1.2, height, 32);
    wallGeo.scale(12, 1, 1); // Panjang 28.8 meter, tebal 2.4 meter
    const wall = mesh(wallGeo, mats.darkGrey, 0, height / 2, 0);
    g.add(wall);
    
    // Kolam penampung elips raksasa (basin)
    // Dinding basin (cincin luar)
    const basinGeo = new THREE.CylinderGeometry(4.5, 4.5, 1.6, 32, 1, true);
    basinGeo.scale(3.5, 1, 1); // Panjang 31.5 meter, lebar 9 meter
    const basin = mesh(basinGeo, mats.grey, 0, 0.8, 0, { cast: false });
    
    // Pinggiran atas basin (rim)
    const rimGeo = new THREE.TorusGeometry(4.5, 0.2, 8, 32);
    rimGeo.scale(3.5, 1, 1);
    const rim = mesh(rimGeo, mats.grey, 0, 1.6, 0, { cast: false });
    rim.rotation.x = Math.PI / 2;

    g.add(basin, rim);
    
    // Lantai kolam tempat jatuhnya batu kerikil
    const basinFloorGeo = new THREE.CylinderGeometry(4.5, 4.5, 0.1, 32);
    basinFloorGeo.scale(3.5, 1, 1);
    const basinFloor = mesh(basinFloorGeo, mats.rock, 0, 0.05, 0, { cast: false });
    g.add(basinFloor);
    
    g.userData.wall = wall;
    return g;
}

export function mina(engine, { withAllJamarat = false } = {}) {
    const { scene, mats } = engine;
    engine.ground(700, mats.sand);

    // Kota tenda putih ikonik — instanced
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
    // Lantai Pelataran Dalam Jamarat (Marmer/Beton) HANYA untuk Ula & Wustha (-110 s/d 25)
    scene.add(mesh(new THREE.BoxGeometry(135, 1.2, 100), mats.marbleTile, -42.5, -0.55, -30, { cast: false }));
    
    // =========================================================================
    // BANGUNAN JAMARAT KHAS ARAB (Hanya menutupi Jumrah Ula & Wustha)
    // Jumrah Aqabah (x = 50) berada di luar ruangan!
    // =========================================================================
    
    // Atap Bangunan Jamarat
    scene.add(mesh(new THREE.BoxGeometry(105, 2.5, 80), mats.cream, -27.5, 18, -30, { cast: false }));
    // Lantai Karpet Merah Khas Interior Arab (Hanya di dalam ruangan)
    scene.add(mesh(new THREE.BoxGeometry(105, 1.3, 80), mats.carpetRed, -27.5, -0.5, -30, { cast: false }));
    
    const wallH = 18;
    const wThick = 2;
    // Dinding Belakang (Z = -70) - Full Solid
    scene.add(mesh(new THREE.BoxGeometry(105, wallH, wThick), mats.cream, -27.5, wallH/2, -70));
    engine.addBlocker(-80, -71, 25, -69);

    // Dinding Kiri (X = -80) - Full Solid
    scene.add(mesh(new THREE.BoxGeometry(wThick, wallH, 80), mats.cream, -80, wallH/2, -30));
    engine.addBlocker(-81, -70, -79, 10);

    // Dinding Depan (Z = 10) - Solid dengan Gerbang Masuk Raksasa di tengah (X=-40 to 10)
    scene.add(mesh(new THREE.BoxGeometry(40, wallH, wThick), mats.cream, -60, wallH/2, 10)); // Kiri
    engine.addBlocker(-80, 9, -40, 11);
    scene.add(mesh(new THREE.BoxGeometry(15, wallH, wThick), mats.cream, 17.5, wallH/2, 10)); // Kanan
    engine.addBlocker(10, 9, 25, 11);

    // Dinding Kanan (X = 25) - Solid dengan Gerbang Keluar ke Jumrah Aqabah (Z=-55 to -25)
    scene.add(mesh(new THREE.BoxGeometry(wThick, wallH, 15), mats.cream, 25, wallH/2, -62.5)); // Belakang
    engine.addBlocker(24, -70, 26, -55);
    scene.add(mesh(new THREE.BoxGeometry(wThick, wallH, 35), mats.cream, 25, wallH/2, -7.5)); // Depan
    engine.addBlocker(24, -25, 26, 10);
    
    // Pilar-Pilar Interior Khas Arab (Marmer & Emas)
    for (let px = -60; px <= 10; px += 30) {
        for (let pz = -60; pz <= 0; pz += 30) {
            let skip = false;
            for (const jx of [-50, 0, 50]) {
                if (Math.abs(px - jx) < 25 && Math.abs(pz - (-40)) < 15) skip = true;
            }
            if (skip) continue; 
            
            const pillar = new THREE.Group();
            pillar.add(mesh(new THREE.CylinderGeometry(1.5, 1.5, 16, 24), mats.marbleTile, 0, 8, 0));
            pillar.add(mesh(new THREE.CylinderGeometry(1.8, 1.5, 2, 24), mats.gold, 0, 17, 0)); // Mahkota
            pillar.add(mesh(new THREE.CylinderGeometry(1.7, 1.7, 1, 24), mats.gold, 0, 0.5, 0)); // Basis
            pillar.position.set(px, 0, pz);
            scene.add(pillar);
            engine.addBlocker(px - 1.5, pz - 1.5, px + 1.5, pz + 1.5);
        }
    }

    // Lampu Gantung Mewah (Chandelier Emas)
    for (let lx = -60; lx <= 10; lx += 30) {
        for (let lz = -50; lz <= 0; lz += 25) {
            const ch = new THREE.Group();
            ch.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 4), mats.gold, 0, 16, 0)); // Rantai
            ch.add(mesh(new THREE.TorusGeometry(3, 0.1, 8, 24), mats.gold, 0, 14, 0, { rx: Math.PI/2 })); // Cincin
            for(let ang=0; ang<Math.PI*2; ang+=Math.PI/4) {
                ch.add(mesh(new THREE.SphereGeometry(0.4, 8, 8), mats.emissiveCool, Math.cos(ang)*3, 14, Math.sin(ang)*3));
            }
            ch.position.set(lx, 0, lz);
            scene.add(ch);
            engine.addPointLamp(lx, 13.5, lz, { intensity: 100, distance: 50, color: 0xffeedd });
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
            engine.addBlocker(jx - 16, jz - 5, jx + 16, jz + 5); // Tiang Jamrah elips solid
            jamarat[name] = p;
            const st = Tex.sign(
                name === 'ula' ? 'JUMRAH ULA' : name === 'wustha' ? 'JUMRAH WUSTHA' : 'JUMRAH AQABAH',
                { bg: '#333d33', fg: '#c8ffc8', w: 640, h: 100 });
            // Papan nama ditempel langsung ke dinding elips tiang Jumrah
            scene.add(mesh(new THREE.BoxGeometry(7, 1.1, 0.2),
                new THREE.MeshStandardMaterial({ map: st, emissive: 0xffffff, emissiveMap: st, emissiveIntensity: 1.1 }),
                jx, 8, jz + 1.3, { cast: false }));
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
            0, 8, -38.7, { cast: false }));
    }

    // Papan Petunjuk Jalan Imersif (Immersive UI)
    const signEntry = Tex.sign('⬇ JALUR MELONTAR (TO JAMARAT) ⬇', { bg: '#0e3b26', fg: '#ffe9a8', w: 1024, h: 120 });
    scene.add(mesh(new THREE.BoxGeometry(16, 2.5, 0.4),
        new THREE.MeshStandardMaterial({ map: signEntry, emissive: 0xffffff, emissiveMap: signEntry, emissiveIntensity: 1.1 }),
        0, 15, 18, { cast: false }));
        
    // (Papan EXIT dihapus sesuai permintaan)

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
    // Papan Nama Barbershop
    const t = Tex.sign('BARBERSHOP TAHALLUL', { bg: '#1a1a1a', fg: '#ffaa00', w: 1024, h: 100 });
    g.add(mesh(new THREE.BoxGeometry(6, 0.8, 0.1),
        new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1 }),
        0, 3.8, 3.5, { cast: false }));
        
    // Kaca cermin panjang menempel di dinding belakang
    g.add(mesh(new THREE.BoxGeometry(8, 2, 0.1), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.1 }), 0, 1.8, -1.9));
    
    // Meja cukur
    g.add(mesh(new THREE.BoxGeometry(8, 0.8, 0.8), mats.wood, 0, 0.4, -1.5));
    
    // 3 Set Kursi Cukur Berjejer
    for(let i = -3; i <= 3; i += 3) {
        g.add(mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), new THREE.MeshStandardMaterial({ color: 0x7c2d2d, roughness: 0.6 }), i, 0.5, -0.5));
        g.add(mesh(new THREE.BoxGeometry(0.7, 0.8, 0.15), new THREE.MeshStandardMaterial({ color: 0x7c2d2d, roughness: 0.6 }), i, 1.1, -0.78));
        g.add(mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.3, 10), mats.steel, i, 0.15, -0.5));
    }
    
    // Tiang Barber (Barber pole merah putih)
    const poleMat = new THREE.MeshStandardMaterial({color: 0xff3333});
    g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.5, 16), poleMat, -4, 1.5, -1.5));
    g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.5, 16), poleMat, 4, 1.5, -1.5));
    
    return g;
}

export function prayerMat(mats, x, z, ry = 0) {
    return mesh(new THREE.BoxGeometry(1.2, 0.04, 2), mats.carpetGreen, x, 0.02, z, { cast: false, ry });
}

export function slaughterArea(mats) {
    const g = new THREE.Group();
    // Pagar Kayu Kandang Hewan Qurban
    const fenceMat = mats.wood;
    for(let x of [-5, 5]) g.add(mesh(new THREE.BoxGeometry(0.2, 1.5, 6), fenceMat, x, 0.75, 0));
    for(let z of [-3, 3]) g.add(mesh(new THREE.BoxGeometry(10, 1.5, 0.2), fenceMat, 0, 0.75, z));
    
    // Papan Nama
    const t = Tex.sign('RUMAH PEMOTONGAN HADYU (DAM)', { bg: '#4d2a0d', fg: '#ffe0b8', w: 1024, h: 100 });
    g.add(mesh(new THREE.BoxGeometry(8, 0.9, 0.16),
        new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1 }),
        0, 3.8, 3.1, { cast: false }));
        
    // Hewan Qurban (Kambing & Sapi)
    const goatBody = new THREE.BoxGeometry(0.8, 0.4, 0.4);
    const goatHead = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const legGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    
    for (let i=0; i<8; i++) {
        const goat = new THREE.Group();
        const fur = new THREE.MeshStandardMaterial({color: Math.random() > 0.5 ? 0xffffff : 0x8b5a2b});
        goat.add(mesh(goatBody, fur, 0, 0.6, 0));
        goat.add(mesh(goatHead, fur, 0.4, 0.8, 0));
        goat.add(mesh(legGeo, mats.darkGrey, -0.3, 0.2, -0.15));
        goat.add(mesh(legGeo, mats.darkGrey, -0.3, 0.2, 0.15));
        goat.add(mesh(legGeo, mats.darkGrey, 0.3, 0.2, -0.15));
        goat.add(mesh(legGeo, mats.darkGrey, 0.3, 0.2, 0.15));
        
        goat.position.set((Math.random()-0.5)*8, 0, (Math.random()-0.5)*4);
        goat.rotation.y = Math.random() * Math.PI * 2;
        g.add(goat);
    }
    
    // Sapi
    const cowBody = new THREE.BoxGeometry(1.6, 0.8, 0.7);
    const cowHead = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const cowLeg = new THREE.BoxGeometry(0.15, 0.8, 0.15);
    for (let i=0; i<3; i++) {
        const cow = new THREE.Group();
        const hide = new THREE.MeshStandardMaterial({color: 0x4a3219}); // coklat tua
        cow.add(mesh(cowBody, hide, 0, 1.2, 0));
        cow.add(mesh(cowHead, hide, 0.8, 1.5, 0));
        cow.add(mesh(cowLeg, mats.darkGrey, -0.6, 0.4, -0.25));
        cow.add(mesh(cowLeg, mats.darkGrey, -0.6, 0.4, 0.25));
        cow.add(mesh(cowLeg, mats.darkGrey, 0.6, 0.4, -0.25));
        cow.add(mesh(cowLeg, mats.darkGrey, 0.6, 0.4, 0.25));
        
        cow.position.set((Math.random()-0.5)*8, 0, (Math.random()-0.5)*4);
        cow.rotation.y = Math.random() * Math.PI * 2;
        g.add(cow);
    }

    return g;
}

/** Tenda fasilitas putih (marquee) — depan (+z) terbuka; untuk menaungi fasilitas seperti dam/cukur. */
export function facilityTent(mats, size = 16, h = 6) {
    const g = new THREE.Group();
    const hw = size / 2;
    const fabric = new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.9, side: THREE.DoubleSide });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xbfbfbf, roughness: 0.5, metalness: 0.6 });
    // Tiang sudut
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
        g.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, h, 8), poleMat, sx * hw, h / 2, sz * hw));
    // Dinding kain: belakang (-z) & dua samping; depan (+z) dibiarkan terbuka
    g.add(mesh(new THREE.BoxGeometry(size, h, 0.12), fabric, 0, h / 2, -hw, { cast: false }));
    g.add(mesh(new THREE.BoxGeometry(0.12, h, size), fabric, -hw, h / 2, 0, { cast: false }));
    g.add(mesh(new THREE.BoxGeometry(0.12, h, size), fabric, hw, h / 2, 0, { cast: false }));
    // Header di atas bukaan depan
    g.add(mesh(new THREE.BoxGeometry(size, 0.7, 0.14), fabric, 0, h + 0.35, hw, { cast: false }));
    // Atap piramida 4 sisi
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 3, 4), fabric);
    roof.rotation.y = Math.PI / 4; roof.scale.set(hw * 1.44, 1, hw * 1.44); roof.position.y = h + 1.5;
    roof.castShadow = false; g.add(roof);
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6), poleMat, 0, h + 3.3, 0, { cast: false }));
    return g;
}




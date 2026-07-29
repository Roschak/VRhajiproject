import re

file_path = r'D:\sertifikat\VRhajisource\src\VRHaji.Web\wwwroot\js\vr\builders.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_bus_model = '''export function busModel(mats) {
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
}'''

pattern = re.compile(r'export function busModel\(mats\).*?return { bus, busDoor };\n}', re.DOTALL)
new_content, count = pattern.subn(new_bus_model, content)

if count > 0:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced busModel with boxy shape.")
else:
    print("Could not find busModel to replace.")


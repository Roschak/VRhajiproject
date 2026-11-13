/* ============================================================
 * CONTOH INTEGRASI END-TO-END — VR Optimizer (ChunkManager)
 * ============================================================
 * FILE INI HANYA CONTOH — tidak di-import oleh aplikasi.
 * Salin pola pemakaiannya ke proyek Anda.
 *
 * Modul inti: ./chunkManager.js (ChunkManager + CONFIG).
 * Modul ini TIDAK perlu di-import langsung — engine.js sudah membuat
 * `engine.chunkManager` secara otomatis. Contoh di bawah menunjukkan
 * cara memakai API-nya dari dalam builder scene Anda.
 *
 * Kebutuhan runtime: Three.js (r0.185+) + WebXR. Tanpa dependency lain.
 * ============================================================ */
import * as THREE from 'three';
import { ChunkManager, CONFIG } from './chunkManager.js';

/**
 * LANGKAH 1 — Instansiasi.
 * Bila Anda memakai engine dari engine.js, ChunkManager SUDAH dibuat
 * (engine.chunkManager). Untuk integrasi mandiri dengan Three.js murni:
 *
 * const renderer = new THREE.WebGLRenderer({ antialias: true });
 * const scene = new THREE.Scene();
 * const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
 * renderer.xr.enabled = true;                    // wajib untuk WebXR
 * const optimizer = new ChunkManager({ scene, camera, renderer }, {
 *     throttleMs: 250,          // override interval culling
 *     maxInstancesPerPool: 1000 // override plafon instance
 * });
 */
export function setupExample(engine) {
    // engine.chunkManager sudah ada — dapatkan referensinya.
    const cm = engine.chunkManager;

    // --- Tier otomatis (mobile standalone vs PC-tethered) ---
    // Menyesuaikan foveation & plafon instance sendiri. Boleh dipanggil
    // kapan saja; logika inti tidak berubah.
    const tier = cm.applyQualityTier();
    console.log(`[VR Optimizer] tier=${tier} refreshRate=${cm.getRefreshRate()}Hz`);

    // --- Foveated rendering ---
    // Otomatis diterapkan saat 'sessionstart' (lihat CONFIG.foveation).
    // Manual override bila perlu:
    cm.enableFoveation(CONFIG.foveation.level);

    // ==========================================================
    // A. DISTANCE-BASED CULLING — chunk (build lambat, dispose penuh)
    // ==========================================================
    // Chunk di-build hanya saat kamera < loadRadius, dan DIHANCURKAN
    // (scene.remove + geometry/material/texture dispose) saat > unloadRadius.
    // Gunakan radius sesuai skala scene Anda (contoh: pemukiman miqat).
    cm.registerChunk('kota-utara', new THREE.Vector3(0, 0, 180), 200, 250, (root) => {
        const mat = new THREE.MeshStandardMaterial({ color: 0xcbbfa8 });
        for (let x = -180; x <= 180; x += 16) {
            const h = 6 + Math.random() * 8;
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(8, h, 6), mat);
            mesh.position.set(x, h / 2, 150 + Math.random() * 20);
            root.add(mesh);
        }
        // Catatan: material dibuat DI DALAM buildFn sehingga ikut di-dispose
        // saat chunk di-unload — tidak bocor di antara load/unload.
    });

    // ==========================================================
    // B. OCCLUSION CULLING — daftarkan occluder statis
    // ==========================================================
    // Dinding/lantai besar didaftarkan sebagai occluder. Objek di belakangnya
    // (yang lolos frustum) ditandai visible=false bila ray kamera tertembok.
    sceneWalkthrough(engine).forEach(wall => cm.addOccluder(wall));
    // Saat tidak dibutuhkan lagi:
    // cm.removeOccluder(wall);

    // ==========================================================
    // C. INSTANCED MESH BATCHING — ribuan objek, 1 draw call
    // ==========================================================
    const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8f9aa8 });
    // maxInstances dibatasi otomatis oleh config.maxInstancesPerPool.
    cm.createInstancedGroup('batu', geo, mat);

    for (let i = 0; i < 500; i++) {
        cm.addInstance('batu',
            new THREE.Vector3((Math.random() - 0.5) * 80, 0.4, (Math.random() - 0.5) * 80));
    }

    // --- Hapus satu instance (swap-and-pop O(1), bukan geser array) ---
    const removed = cm.removeInstance('batu', 7);
    console.assert(removed === true);

    // ==========================================================
    // D. CULLING OBJEK INDIVIDUAL (non-chunk)
    // ==========================================================
    cm.registerObject('menara-1', {
        position: new THREE.Vector3(300, 0, 0),
        // Radius eksplisit WAJIB dipertimbangkan: dengan default loadRadius=200,
        // objek berjarak 300 tidak akan pernah di-load saat kamera di origin.
        loadRadius: 400,
        unloadRadius: 450,
        buildFn: (root) => {
            const m = new THREE.Mesh(
                new THREE.CylinderGeometry(3, 4, 40, 8),
                new THREE.MeshStandardMaterial({ color: 0xe7e0cf }));
            m.position.y = 20;
            root.add(m);
        }
    });
    // Saat scene berganti (hot-swap), kosongkan registry agar chunk/objek lama
    // tidak menumpuk: engine.chunkManager.clearChunks(); engine.chunkManager.clearObjects();

    // ==========================================================
    // E. RENDER LOOP — setAnimationLoop (bukan requestAnimationFrame)
    // ==========================================================
    // Render loop harus memakai renderer.setAnimationLoop(): loop disinkronkan
    // langsung dengan device XR sehingga head-tracking tidak pernah diblokir
    // proses JS lain, pada refresh rate apa pun (72/90/120 Hz).
    // Urutan tiap frame: update culling → (pekerjaan ringan lain) → render.
    // (engine.js sudah melakukan ini — contoh untuk integrasi mandiri:)
    engine.renderer.xr.enabled = true;
    engine.renderer.setAnimationLoop(() => {
        cm.update();                     // culling ter-throttle (250ms), ringan
        engine.renderer.render(engine.scene, engine.camera); // render SELALU terakhir
    });
}

/* Helper ilustratif — cari dinding scene Anda sendiri. */
function sceneWalkthrough(engine) {
    const walls = [];
    engine.scene.traverse(o => {
        if (o.isMesh && o.geometry && o.geometry.boundingBox &&
            o.geometry.boundingBox.getSize(new THREE.Vector3()).length() > 8) {
            walls.push(o);
        }
    });
    return walls;
}

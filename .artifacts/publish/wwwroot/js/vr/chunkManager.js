import { THREE } from './engine.js';

/* ============================================================
 * VR OPTIMIZER — Pipeline Rendering WebXR (Semua Perangkat VR)
 * ============================================================
 * Modul ES tunggal yang mengoptimalkan pipeline rendering Three.js agar
 * stabil di refresh rate native perangkat (72/90/120 Hz) tanpa lag /
 * frame drop, bergaya "Minecraft" (chunk-based) + foveated rendering.
 *
 * PRINSIP KOM PATIBILITAS LINTAS PERANGKAT:
 * - Tidak ada asumsi headset spesifik di-hardcode. Nilai yang bergantung
 *   perangkat (refresh rate, foveation, tier GPU) dideteksi dinamis dari
 *   WebXR API saat runtime.
 * - Fitur non-universal (mis. `setFoveation`) SELALU melalui feature-
 *   detection + try/catch: bila tidak didukung, modul tetap berjalan
 *   normal (degrade aman, tanpa error).
 * - Logika inti (culling, instancing, render loop) tidak bergantung pada
 *   kelas GPU tertentu: GPU mobile standalone yang lemah mendapat kualitas
 *   lebih rendah secara otomatis, GPU PC-tethered yang kuat memanfaatkan
 *   headroom-nya — tanpa mengubah kode pemanggil.
 *
 * API lama (registerChunk, removeChunk, addOccluder, createInstancedGroup,
 * addInstance, clearInstances, update) DIPERTAHANKAN 100% kompatibel —
 * engine.js & builders.js yang sudah ada TIDAK perlu diubah.
 *
 * Referensi versi Three.js: 0.185 (stable, WebGL 2.0).
 * Satu-satunya dependency eksternal: `three` (diimpor lewat ./engine.js).
 * ============================================================ */

/* ------------------------------------------------------------------
 * KONFIGURASI — satu titik tuning. Nilai default dipilih aman untuk
 * SELURUH kelas perangkat VR (mobile standalone & PC-tethered).
 * Bagian bertanda "tuning per proyek" silakan disesuaikan.
 * ------------------------------------------------------------------ */
export const CONFIG = {
    culling: {
        // Interval evaluasi jarak/oklusi (ms). Throttle penting: kalkulasi
        // culling TIDAK boleh tiap frame karena ongkos CPU-nya bisa membuat
        // frame time melonjak dan memicu reprojection/judder di headset.
        // (200–300ms sesuai spec — makin kecil makin responsif, makin besar
        //  makin ringan; tuning per proyek.)
        throttleMs: 250,
        // Frustum culling adalah tes paling murah — selalu dijalankan lebih
        // dulu sebagai penyaring lapis-1 sebelum occlusion test.
        frustumCulling: true,
        // Occlusion culling hanya untuk objek yang lolos frustum (lapis-2).
        occlusionCulling: true,
        // Radius load/unload default chunk (dapat di-override per chunk).
        defaultLoadRadius: 200,
        defaultUnloadRadius: 250,
        // Faktor radius bounding-sphere untuk uji frustum/raycast chunk.
        boundsRadiusFactor: 0.5
    },
    instancing: {
        // Plafon instance per pool (VRAM). 1000 aman untuk GPU mobile
        // standalone kelas terendah; naikkan untuk PC-tethered via
        // applyQualityTier()/konfigurasi (tuning per perangkat target).
        maxInstancesPerPool: 1000,
        // Instance statis (tidak berpindah posisi) memakai StaticDrawUsage —
        // memberi tahu driver WebGL bahwa buffer tidak berubah, sehingga
        // driver bisa mengoptimalkan penempatan memori & upload.
        staticUsage: true
    },
    foveation: {
        // 0 = tanpa foveation, 1 = maksimum. Nilai tengah aman untuk
        // sebagian besar headset (tuning per proyek/perangkat).
        level: 0.5,
        // Terapkan otomatis saat event 'sessionstart' (setFoveation baru
        // efektif ketika XR session sudah berjalan).
        applyOnSessionStart: true
    },
    occluders: {
        // Maksimum jarak raycast occlusion (jangan tembak ke tak hingga).
        raycastFar: 400
    },
    quality: {
        // Foveation & instance pool saat tier terdeteksi 'mobile' vs 'desktop'.
        mobileFoveation: 0.65,
        desktopFoveation: 0.35,
        mobileMaxInstances: 1000,
        desktopMaxInstances: 4000
    }
};

// Property material yang membawa Texture dan HARUS di-dispose bersama
// material. envMap sengaja TIDAK masuk daftar: envMap biasanya dibagikan
// secara global (mis. scene.environment) — melepasnya akan merusak material
// lain yang masih hidup.
const TEXTURE_PROPS = [
    'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap',
    'emissiveMap', 'bumpMap', 'displacementMap', 'alphaMap', 'lightMap',
    'specularMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
    'sheenColorMap', 'transmissionMap', 'thicknessMap', 'iridescenceMap',
    'iridescenceThicknessMap'
];

/** Disposal penuh satu Object3D: geometry + material + semua texture miliknya. */
function disposeObject(obj) {
    const textures = new Set();
    obj.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        const mats = child.material
            ? (Array.isArray(child.material) ? child.material : [child.material])
            : [];
        for (const m of mats) {
            if (!m) continue;
            for (const key of TEXTURE_PROPS) {
                const t = m[key];
                // Set mencegah texture yang dipakai bersama di-dispose ganda.
                if (t && t.isTexture) textures.add(t);
            }
            m.dispose();
        }
    });
    textures.forEach(t => t.dispose());
}

/**
 * Minecraft-style chunk optimizer + foveated rendering adaptif.
 * Mengelola: distance-based culling (chunk & objek), occlusion culling
 * (frustum → raycast), InstancedMesh batching, dan foveation WebXR.
 */
export class ChunkManager {
    constructor(engine, options = {}) {
        this.engine = engine;
        this.scene = engine.scene;
        this.camera = engine.camera;

        this.chunks = new Map();       // id -> chunkData
        this.objects = new Map();      // id -> objek individual (culling non-chunk)
        this.occluders = [];           // mesh dinding/lantai statis untuk occlusion test
        this.instancedGroups = new Map(); // key -> { mesh, maxInstances }

        // Konfigurasi instance — default aman dari CONFIG, bisa di-override
        // lewat options saat konstruksi (tanpa menyentuh logic inti).
        this.config = {
            // ?? (bukan ||) agar nilai 0 valid = nonaktifkan throttle (untuk test/debug).
            throttleMs: options.throttleMs ?? CONFIG.culling.throttleMs,
            frustumCulling: options.frustumCulling !== false && CONFIG.culling.frustumCulling,
            occlusionCulling: options.occlusionCulling !== false && CONFIG.culling.occlusionCulling,
            defaultLoadRadius: options.loadRadius || CONFIG.culling.defaultLoadRadius,
            defaultUnloadRadius: options.unloadRadius || CONFIG.culling.defaultUnloadRadius,
            boundsRadiusFactor: CONFIG.culling.boundsRadiusFactor,
            maxInstancesPerPool: options.maxInstancesPerPool || CONFIG.instancing.maxInstancesPerPool,
            staticUsage: options.staticUsage !== false && CONFIG.instancing.staticUsage
        };

        this.lastCheckTime = 0;
        this.tier = 'unknown';
        this.foveation = options.foveation ?? CONFIG.foveation.level;
        this._foveationSupported = null; // null = belum diuji

        // Cache objek matematika — di-reuse agar update() tidak mengalokasi
        // memori tiap tick (alokasi = tekanan GC = micro-stutter di headset).
        this.frustum = new THREE.Frustum();
        this.projScreenMatrix = new THREE.Matrix4();
        this.raycaster = new THREE.Raycaster();
        this._dirCache = new THREE.Vector3();
        this._sphereCache = new THREE.Sphere();
        // Posisi DUNIA kamera (cache). Penting: di sesi WebXR, kamera menjadi anak
        // rig/dolly dan lokomosi menggeser dolly, bukan camera.position (local) —
        // lihat update(). Selalu hitung dari matrix dunia agar benar di headset.
        this._camPosCache = new THREE.Vector3();

        // Bind event WebXR standar (sama di semua browser/headset WebXR —
        // bukan API proprietary vendor). 'sessionstart' adalah saat yang
        // tepat menerapkan foveation: setFoveation baru efektif ketika
        // XR session sudah berjalan.
        this._xr = engine?.renderer?.xr || null;
        this._onSessionStart = () => this._applyFoveation();
        this._onSessionEnd = () => this._resetFoveationState();
        if (this._xr && typeof this._xr.addEventListener === 'function') {
            this._xr.addEventListener('sessionstart', this._onSessionStart);
            this._xr.addEventListener('sessionend', this._onSessionEnd);
        }
    }

    /* ============================================================
     * A. DISTANCE-BASED CULLING — Chunk
     * ============================================================ */

    /**
     * Daftarkan area/chunk baru.
     * @param {string} id ID unik chunk
     * @param {THREE.Vector3} position Titik tengah chunk
     * @param {number} loadRadius Jarak di mana chunk di-build
     * @param {number} unloadRadius Jarak (lebih jauh) untuk membuang chunk
     * @param {function} buildFn (rootGroup) => { } mengisi mesh ke root
     */
    registerChunk(id, position, loadRadius, unloadRadius, buildFn) {
        // ?? (bukan ||) — nilai eksplisit dipertahankan; tanpa argumen, pakai
        // default CONFIG (sama seperti registerObject). Tanpa default ini, radius
        // undefined membuat `dist <= undefined` selalu false → chunk TIDAK PERNAH
        // di-load secara diam-diam.
        const lr = loadRadius ?? this.config.defaultLoadRadius;
        const ur = unloadRadius ?? this.config.defaultUnloadRadius;
        this.chunks.set(id, {
            id, position, loadRadius: lr, unloadRadius: ur, buildFn,
            root: null, isLoaded: false,
            // Bounding sphere untuk frustum/raycast test — perkiraan dari
            // radius load (bukan ukuran sebenarnya) karena hitung eksak mahal.
            boundsRadius: lr * this.config.boundsRadiusFactor
        });
    }

    /** Lepas chunk dari registry + bebankan GPU memory-nya sepenuhnya. */
    removeChunk(id) {
        const c = this.chunks.get(id);
        if (c) {
            if (c.isLoaded) this._unloadChunk(c);
            this.chunks.delete(id);
        }
    }

    /**
     * Build chunk (lazy factory). Chunk yang di-unload TIDAK disimpan di
     * memori — dibangun ulang dari nol saat kamera mendekat kembali.
     */
    _loadChunk(chunk) {
        if (chunk.isLoaded) return;
        chunk.root = new THREE.Group();
        chunk.root.position.copy(chunk.position);
        chunk.buildFn(chunk.root);
        this.scene.add(chunk.root);
        chunk.isLoaded = true;
    }

    /**
     * Lepas chunk dari scene graph VIA scene.remove() DAN bebaskan GPU memory
     * penuh: geometry, material, dan SEMUA texture pada material. Tidak
     * sekadar visible=false — objek yang di-unload benar-benar tidak makan
     * VRAM (ini inti pendekatan "Minecraft").
     */
    _unloadChunk(chunk) {
        if (!chunk.isLoaded || !chunk.root) return;
        this.scene.remove(chunk.root);
        // PERHATIAN: disposeObject melepas semua texture material milik chunk ini.
        // Pastikan material/texture chunk dibuat DI DALAM buildFn (lazy) — bila
        // sebuah chunk berbagi material/texture dengan objek di luar chunk yang
        // masih hidup, unload akan merusak mesh tersebut. Lihat file contoh.
        disposeObject(chunk.root);
        chunk.root = null;
        chunk.isLoaded = false;
    }

    /**
     * Kosongkan registry chunk TANPA dispose (untuk hot-swap scene, di mana
     * scene lama sudah dibersihkan oleh pemanggil). Mencegah chunk mati
     * tertinggal dan dievaluasi terus oleh update() di scene baru.
     */
    clearChunks() {
        for (const c of this.chunks.values()) {
            // root yang masih ter-pasang di scene (mis. isLoaded) dilepas dulu;
            // pemanggil umumnya sudah melepasnya — guard tetap menjaga konsistensi.
            if (c.isLoaded && c.root && c.root.parent === this.scene) {
                this.scene.remove(c.root);
            }
            c.isLoaded = false;
            c.root = null;
        }
        this.chunks.clear();
    }

    /* ============================================================
     * A2. DISTANCE-BASED CULLING — Objek individual
     * (melengkapi spec "chunk/objek yang melewati radius ambang")
     * ============================================================ */

    /**
     * Daftarkan objek individual yang dicull berdasarkan jarak dari kamera.
     * Berguna untuk prop/prop statis yang berdiri sendiri tanpa grouping
     * chunk. Dilepas penuh (scene.remove + dispose) saat di luar radius,
     * dibangun ulang (lazy) saat kamera kembali dekat.
     * @param {string} id ID unik
     * @param {object} opts { position:Vector3, buildFn:(group)=>void,
     *                        loadRadius?, unloadRadius?, boundsRadius? }
     */
    registerObject(id, opts) {
        if (!opts?.position) throw new Error('registerObject memerlukan opts.position (THREE.Vector3)');
        this.objects.set(id, {
            id,
            position: opts.position,
            loadRadius: opts.loadRadius ?? this.config.defaultLoadRadius,
            unloadRadius: opts.unloadRadius ?? this.config.defaultUnloadRadius,
            buildFn: opts.buildFn,
            boundsRadius: opts.boundsRadius ?? 5,
            root: null, isLoaded: false
        });
    }

    /** Lepas objek individual + bebaskan GPU memory. */
    unregisterObject(id) {
        const o = this.objects.get(id);
        if (o) {
            if (o.isLoaded) this._unloadObject(o);
            this.objects.delete(id);
        }
    }

    _loadObject(o) {
        if (o.isLoaded) return;
        o.root = new THREE.Group();
        o.buildFn(o.root);
        this.scene.add(o.root);
        o.isLoaded = true;
    }

    _unloadObject(o) {
        if (!o.isLoaded || !o.root) return;
        this.scene.remove(o.root);
        // Sama seperti _unloadChunk: material/texture harus dibuat di dalam
        // buildFn agar tidak merusak objek lain yang berbagi sumber daya.
        disposeObject(o.root);
        o.root = null;
        o.isLoaded = false;
    }

    /** Kosongkan registry objek individual TANPA dispose (hot-swap scene). */
    clearObjects() {
        for (const o of this.objects.values()) {
            if (o.isLoaded && o.root && o.root.parent === this.scene) {
                this.scene.remove(o.root);
            }
            o.isLoaded = false;
            o.root = null;
        }
        this.objects.clear();
    }

    /* ============================================================
     * B. OCCLUSION CULLING
     * ============================================================ */

    /** Daftarkan mesh statis (dinding/lantai) sebagai occluder eksplisit. */
    addOccluder(mesh) {
        if (mesh && !this.occluders.includes(mesh)) this.occluders.push(mesh);
    }

    /** Cabut occluder (mis. saat scene di-dispose). */
    removeOccluder(mesh) {
        const i = this.occluders.indexOf(mesh);
        if (i !== -1) this.occluders.splice(i, 1);
    }

    /**
     * Uji dua lapis berurutan (efisien untuk GPU mobile):
     *  1. Frustum culling (murah) — buang yang di luar frustum.
     *  2. Raycast occlusion (hanya yang lolos frustum) — ray dari kamera
     *     ke bounding sphere; bila occluder solid menghalangi → visible=false.
     * @param {THREE.Vector3} camPos Posisi DUNIA kamera (lihat update()) —
     *        default: cache yang diisi update(); di WebXR kamera lokal ≠ dunia.
     * @returns {boolean} visible
     */
    _testVisibility(pos, boundsRadius, camPos = this._camPosCache) {
        if (!this.config.frustumCulling) return true;
        this._sphereCache.set(pos, boundsRadius);
        if (!this.frustum.intersectsSphere(this._sphereCache)) return false;
        // Lapis-2 hanya bila ada occluder terdaftar.
        if (!this.config.occlusionCulling || this.occluders.length === 0) return true;
        const dist = camPos.distanceTo(pos);
        // Kamera berada DI DALAM bounding sphere → pasti terlihat. Guard ini juga
        // mencegah ray degenerate (arah (0,0,0) bila kamera tepat di target).
        if (dist < boundsRadius) return true;
        this._dirCache.subVectors(pos, camPos).normalize();
        this.raycaster.set(camPos, this._dirCache);
        this.raycaster.far = dist + CONFIG.occluders.raycastFar;
        // false = recursive: hanya mesh occluder itu sendiri (occluders
        // seharusnya mesh statis sederhana, bukan group kompleks).
        const hits = this.raycaster.intersectObjects(this.occluders, false);
        if (hits.length > 0 && hits[0].distance < dist) {
            // Ray tertembok SEBELUM mencapai target → target sepenuhnya tertutup.
            return false;
        }
        return true;
    }

    /* ============================================================
     * C. BATCHING DRAW CALL — InstancedMesh
     * ============================================================ */

    /**
     * Buat satu InstancedMesh pool untuk blok statis ber-geometry & material
     * identik. Satu InstancedMesh = satu draw call untuk ribuan instance —
     * inilah penghemat draw call terbesar untuk scene yang penuh pengulangan.
     */
    createInstancedGroup(key, geometry, material, maxInstances = 1000) {
        const cap = Math.min(maxInstances, this.config.maxInstancesPerPool);
        const mesh = new THREE.InstancedMesh(geometry, material, cap);
        // Instance statis memakai StaticDrawUsage; crowd/objek bergerak yang
        // memakai API ini bisa minta dynamic lewat addInstance({dynamic:true}).
        mesh.instanceMatrix.setUsage(
            this.config.staticUsage ? THREE.StaticDrawUsage : THREE.DynamicDrawUsage
        );
        mesh.count = 0;
        this.scene.add(mesh);
        this.instancedGroups.set(key, { mesh, maxInstances: cap });
        return mesh;
    }

    /**
     * Tambah instance ke pool. Mengembalikan index, atau null bila pool penuh
     * (plafon dijaga agar tidak meledakkan VRAM perangkat kelas terendah).
     */
    addInstance(key, position, rotation = new THREE.Euler(), scale = new THREE.Vector3(1, 1, 1), color = null, { dynamic = false } = {}) {
        const group = this.instancedGroups.get(key);
        if (!group || group.mesh.count >= group.maxInstances) return null;

        const matrix = new THREE.Matrix4();
        const q = new THREE.Quaternion().setFromEuler(rotation);
        matrix.compose(position, q, scale);

        const index = group.mesh.count;
        group.mesh.setMatrixAt(index, matrix);

        if (color) {
            if (!group.mesh.instanceColor) {
                group.mesh.instanceColor = new THREE.InstancedBufferAttribute(
                    new Float32Array(group.maxInstances * 3), 3);
            }
            group.mesh.setColorAt(index, color);
            group.mesh.instanceColor.needsUpdate = true;
        }

        group.mesh.instanceMatrix.needsUpdate = true;
        group.mesh.count++;
        group.mesh.computeBoundingSphere(); // agar frustum culling renderer akurat
        if (dynamic) group.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        return index;
    }

    /**
     * Hapus instance dengan teknik SWAP-AND-POP (O(1)): instance terakhir
     * dipindah ke slot yang dikosongkan, lalu count--. Tidak menggeser
     * seluruh array — penting saat penghapusan sering terjadi di runtime.
     * @returns {boolean} true bila berhasil
     */
    removeInstance(key, index) {
        const group = this.instancedGroups.get(key);
        if (!group || index < 0 || index >= group.mesh.count) return false;
        const mesh = group.mesh;
        const last = mesh.count - 1;
        if (index !== last) {
            const m = new THREE.Matrix4();
            mesh.getMatrixAt(last, m);
            mesh.setMatrixAt(index, m);
            if (mesh.instanceColor) {
                const c = new THREE.Color();
                mesh.getColorAt(last, c);
                mesh.setColorAt(index, c);
                mesh.instanceColor.needsUpdate = true;
            }
        }
        mesh.count--;
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        return true;
    }

    /** Kosongkan semua instance pada pool (count=0). */
    clearInstances(key) {
        const group = this.instancedGroups.get(key);
        if (group) {
            group.mesh.count = 0;
            group.mesh.instanceMatrix.needsUpdate = true;
        }
    }

    /** Statistik debug singkat: berapa chunk/objek aktif & instance terpakai. */
    getStats() {
        let loadedChunks = 0, loadedObjects = 0, instances = 0;
        for (const c of this.chunks.values()) if (c.isLoaded) loadedChunks++;
        for (const o of this.objects.values()) if (o.isLoaded) loadedObjects++;
        for (const g of this.instancedGroups.values()) instances += g.mesh.count;
        return { chunks: this.chunks.size, loadedChunks, objects: this.objects.size, loadedObjects, instances };
    }

    /* ============================================================
     * D. FOVEATED RENDERING (adaptif, feature-detected)
     * ============================================================ */

    /**
     * Setel fixed foveated rendering lewat renderer.xr.setFoveation(0..1).
     * Kenapa: foveation menurunkan resolusi render di tepi bidang pandang
     * (peripheral) sambil mempertahankan resolusi penuh di titik fokus
     * tengah — menghemat beban GPU tanpa terasa karena penglihatan tepi
     * mata manusia memang beresolusi rendah.
     *
     * setFoveation belum universal (didukung sebagian runtime WebXR) maka:
     * feature-detection eksplisit + try/catch → perangkat tanpa dukungan
     * tetap berjalan normal tanpa error (degrade aman).
     */
    enableFoveation(level = CONFIG.foveation.level) {
        this.foveation = Math.max(0, Math.min(1, level));
        if (!this._xr || typeof this._xr.setFoveation !== 'function') {
            this._foveationSupported = false;
            return false;
        }
        try {
            this._xr.setFoveation(this.foveation);
            this._foveationSupported = true;
            return true;
        } catch (e) {
            // Runtime tertentu melempar exception untuk nilai yang tak didukung
            // — jangan sampai merusak render loop.
            this._foveationSupported = false;
            return false;
        }
    }

    /** Terapkan foveation tepat setelah XR session aktif (event sessionstart). */
    _applyFoveation() {
        if (!CONFIG.foveation.applyOnSessionStart) return;
        this.enableFoveation(this.foveation);
    }

    _resetFoveationState() {
        // Sesi berakhir — tidak perlu reset renderer (three menanganinya),
        // cukup jaga state internal tetap konsisten.
        this._foveationSupported = null;
    }

    /* ============================================================
     * DETEKSI PERANGKAT DINAMIS (bukan hardcode headset tertentu)
     * ============================================================ */

    /**
     * Baca refresh rate aktual headset dari WebXR API saat runtime.
     * `session.frameRate` tersedia di sebagian besar runtime modern
     * (dan `displayRefreshRate` di WebVR legacy). Fallback aman: 72 Hz
     * — nilai terendah umum di kelas mobile standalone, aman untuk semua.
     */
    getRefreshRate() {
        try {
            const session = this._xr?.getSession?.();
            if (session) {
                if (typeof session.frameRate === 'number') return session.frameRate;
                if (session.displayRefreshRate) return session.displayRefreshRate;
            }
            // Beberapa browser menyediakan informasi via devicechange event;
            // jika tak ada, jatuh ke fallback.
        } catch { /* abaikan — fallback di bawah */ }
        return 72;
    }

    /**
     * Tebak tier GPU: 'mobile' (standalone SoC — Quest/Pico/Vive Focus) vs
     * 'desktop' (PC-tethered — Index/Vive Pro/WMR). Berbasis kombinasi UA +
     * nama renderer WebGL (tanpa hardcode satu vendor pun — hanya deteksi
     * kelas). Hasilnya dipakai applyQualityTier() untuk menyesuaikan
     * kualitas secara otomatis.
     */
    detectTier() {
        try {
            const ua = (navigator.userAgent || '').toLowerCase();
            if (/quest|pico|focus|magic.?leap|lynx|reality.?pro|vive.?focus|standalone/i.test(ua)) {
                return 'mobile';
            }
            const gl = this.engine?.renderer?.getContext?.();
            const ext = gl?.getExtension?.('WEBGL_debug_renderer_info');
            const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') : '';
            if (/android|mobile/i.test(ua) && /adreno|mali|powervr|apple gpu/i.test(name)) {
                return 'mobile';
            }
            return 'desktop';
        } catch {
            return 'desktop'; // gagal deteksi → asumsi paling aman (PC kuat)
        }
    }

    /**
     * Sesuaikan kualitas otomatis dengan tier perangkat TANPA mengubah kode
     * pemanggil: mobile standalone → foveation lebih agresif + pool instance
     * dibatasi; PC-tethered → foveation lebih ringan (kualitas maksimal) +
     * pool instance lebih besar. Logika inti tetap identik.
     */
    applyQualityTier(tier = this.detectTier()) {
        this.tier = tier;
        if (tier === 'mobile') {
            this.config.maxInstancesPerPool = Math.min(
                this.config.maxInstancesPerPool, CONFIG.quality.mobileMaxInstances);
            this.enableFoveation(Math.max(this.foveation, CONFIG.quality.mobileFoveation));
        } else {
            this.config.maxInstancesPerPool = Math.max(
                this.config.maxInstancesPerPool, CONFIG.quality.desktopMaxInstances);
            this.enableFoveation(Math.min(this.foveation, CONFIG.quality.desktopFoveation));
        }
        return tier;
    }

    /* ============================================================
     * E. UPDATE LOOP (di-throttle — dipanggil dari engine._tick)
     * ============================================================ */

    /**
     * Panggil di dalam render loop (engine._tick). Semua kerja berat
     * di-throttle agar frame time tidak melonjak: urutan per evaluasi:
     *  1. update frustum (dari proyeksi × view matrix kamera)
     *  2. distance-based load/unload chunk + objek
     *  3. occlusion culling untuk yang sedang loaded
     */
    update() {
        const now = performance.now();
        // Throttle: evaluasi culling hanya tiap config.throttleMs — jarak
        // kamera tidak berubah drastis antar-tick, dan menghitung tiap frame
        // membuang anggaran frame di headset 90/120 Hz.
        if (now - this.lastCheckTime < this.config.throttleMs) return;
        this.lastCheckTime = now;

        // POSISI DUNIA kamera — WAJIB, bukan camera.position (local). Di desktop
        // dolly identity (local == dunia), tapi di sesi WebXR lokomosi menggeser
        // dolly (parent kamera) dan pose headset diterapkan via matrix, sehingga
        // camera.position (local) hampir tidak berubah. Distance culling + ray
        // occlusion yang memakai local position akan salah total di headset.
        this.camera.getWorldPosition(this._camPosCache);
        const camPos = this._camPosCache;

        if (this.config.frustumCulling) {
            // updateMatrixWorld dibutuhkan agar matrixWorldInverse segar
            // (pose XR memindahkan dolly/kamera tiap frame).
            this.camera.updateMatrixWorld();
            this.projScreenMatrix.multiplyMatrices(
                this.camera.projectionMatrix, this.camera.matrixWorldInverse);
            this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
        }

        // --- Chunk: distance load/unload + occlusion ---
        for (const chunk of this.chunks.values()) {
            const dist = camPos.distanceTo(chunk.position);

            if (!chunk.isLoaded && dist <= chunk.loadRadius) {
                this._loadChunk(chunk);
            } else if (chunk.isLoaded && dist > chunk.unloadRadius) {
                this._unloadChunk(chunk);
                continue; // sudah lepas dari scene — tak perlu uji visible
            }

            if (chunk.isLoaded && chunk.root) {
                chunk.root.visible = this._testVisibility(chunk.position, chunk.boundsRadius, camPos);
            }
        }

        // --- Objek individual: distance load/unload + occlusion ---
        for (const o of this.objects.values()) {
            const dist = camPos.distanceTo(o.position);
            if (!o.isLoaded && dist <= o.loadRadius) {
                this._loadObject(o);
            } else if (o.isLoaded && dist > o.unloadRadius) {
                this._unloadObject(o);
                continue;
            }
            if (o.isLoaded && o.root) {
                o.root.visible = this._testVisibility(o.position, o.boundsRadius, camPos);
            }
        }
    }

    /** Bersihkan semua sumber daya & lepas listener WebXR (dipanggil saat dispose engine). */
    dispose() {
        for (const c of this.chunks.values()) if (c.isLoaded) this._unloadChunk(c);
        this.chunks.clear();
        for (const o of this.objects.values()) if (o.isLoaded) this._unloadObject(o);
        this.objects.clear();
        // Instanced mesh pools ikut dilepas dari scene + GPU memory.
        for (const { mesh } of this.instancedGroups.values()) {
            if (mesh.parent) mesh.parent.remove(mesh);
            mesh.geometry?.dispose?.();
            if (mesh.material) {
                (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
                    .forEach(m => m.dispose?.());
            }
        }
        this.instancedGroups.clear();
        this.occluders.length = 0;
        if (this._xr && typeof this._xr.removeEventListener === 'function') {
            this._xr.removeEventListener('sessionstart', this._onSessionStart);
            this._xr.removeEventListener('sessionend', this._onSessionEnd);
        }
    }
}

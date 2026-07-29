import { THREE } from './engine.js';

/**
 * VR Chunk Manager - Minecraft-style optimization pipeline for Meta Quest 2.
 * Fitur:
 * 1. Distance-based Load/Unload (Benar-benar membebaskan GPU Memory dengan dispose())
 * 2. Occlusion Culling (Frustum + Raycaster check terhadap occluders)
 * 3. InstancedMesh Batching (Menggabungkan objek statis untuk menekan draw calls)
 */
export class ChunkManager {
    constructor(engine, options = {}) {
        this.engine = engine;
        this.scene = engine.scene;
        this.camera = engine.camera;
        
        this.chunks = new Map(); // id -> chunkData
        this.occluders = [];     // Mesh walls/floors untuk menutupi objek di baliknya
        this.instancedGroups = new Map(); // key -> InstancedMesh data
        
        this.config = {
            throttleMs: options.throttleMs || 250, // Cek tiap 250ms agar tidak berat
            frustumCulling: options.frustumCulling !== false
        };
        
        this.lastCheckTime = 0;
        
        // Setup cache memori untuk frustum & raycast agar tidak dialokasi tiap frame
        this.frustum = new THREE.Frustum();
        this.projScreenMatrix = new THREE.Matrix4();
        this.raycaster = new THREE.Raycaster();
        this._dirCache = new THREE.Vector3();
        this._sphereCache = new THREE.Sphere();
    }

    /**
     * Daftarkan area/chunk baru.
     * @param {string} id ID unik chunk
     * @param {THREE.Vector3} position Titik tengah chunk
     * @param {number} loadRadius Jarak dimana chunk akan di-build
     * @param {number} unloadRadius Jarak (lebih jauh dari loadRadius) untuk membuang chunk
     * @param {function} buildFn Fungsi (rootGroup) => { ... } untuk membuat mesh
     */
    registerChunk(id, position, loadRadius, unloadRadius, buildFn) {
        this.chunks.set(id, {
            id, position, loadRadius, unloadRadius, buildFn,
            root: null, isLoaded: false, boundsRadius: loadRadius / 2
        });
    }

    /**
     * Membebaskan (dispose) chunk secara manual
     */
    removeChunk(id) {
        const c = this.chunks.get(id);
        if (c) {
            if (c.isLoaded) this._unloadChunk(c);
            this.chunks.delete(id);
        }
    }

    _loadChunk(chunk) {
        if (chunk.isLoaded) return;
        chunk.root = new THREE.Group();
        chunk.root.position.copy(chunk.position);
        
        // Memanggil fungsi eksternal untuk mengisi mesh ke dalam root
        chunk.buildFn(chunk.root);
        
        this.scene.add(chunk.root);
        chunk.isLoaded = true;
    }

    _unloadChunk(chunk) {
        if (!chunk.isLoaded || !chunk.root) return;
        
        this.scene.remove(chunk.root);
        
        // Traversal untuk MENYAPU BERSIH memory GPU (Minecraft style drop)
        chunk.root.traverse(child => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
        
        chunk.root = null;
        chunk.isLoaded = false;
    }

    /**
     * Menambahkan dinding statis untuk menutupi chunk di belakangnya (Occlusion)
     */
    addOccluder(mesh) {
        this.occluders.push(mesh);
    }

    /**
     * Batching API: Membuat Grup InstancedMesh
     */
    createInstancedGroup(key, geometry, material, maxInstances = 1000) {
        const mesh = new THREE.InstancedMesh(geometry, material, maxInstances);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.count = 0;
        this.scene.add(mesh);
        this.instancedGroups.set(key, { mesh, maxInstances });
        return mesh;
    }

    /**
     * Batching API: Menambahkan instance ke dalam grup
     */
    addInstance(key, position, rotation = new THREE.Euler(), scale = new THREE.Vector3(1,1,1), color = null) {
        const group = this.instancedGroups.get(key);
        if (!group || group.mesh.count >= group.maxInstances) return null;
        
        const matrix = new THREE.Matrix4();
        const q = new THREE.Quaternion().setFromEuler(rotation);
        matrix.compose(position, q, scale);
        
        const index = group.mesh.count;
        group.mesh.setMatrixAt(index, matrix);
        
        if (color) {
            if (!group.mesh.instanceColor) {
                group.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(group.maxInstances * 3), 3);
            }
            group.mesh.setColorAt(index, color);
            group.mesh.instanceColor.needsUpdate = true;
        }
        
        group.mesh.instanceMatrix.needsUpdate = true;
        group.mesh.count++;
        group.mesh.computeBoundingSphere(); // update bounds untuk frustum culling
        return index;
    }

    clearInstances(key) {
        const group = this.instancedGroups.get(key);
        if (group) {
            group.mesh.count = 0;
            group.mesh.instanceMatrix.needsUpdate = true;
        }
    }

    /**
     * Panggil ini di dalam render loop (engine._tick)
     */
    update() {
        const now = performance.now();
        // Throttling agar kalkulasi jarak dan raycast tidak membebani frame rate XR (90fps)
        if (now - this.lastCheckTime < this.config.throttleMs) return;
        this.lastCheckTime = now;

        const camPos = this.camera.position;

        // 1. Update Frustum Matrix
        if (this.config.frustumCulling) {
            this.camera.updateMatrixWorld();
            this.projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
            this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
        }

        // 2. Evaluasi tiap Chunk
        for (const chunk of this.chunks.values()) {
            const dist = camPos.distanceTo(chunk.position);
            
            // A. Distance-based Loading/Unloading
            if (!chunk.isLoaded && dist <= chunk.loadRadius) {
                this._loadChunk(chunk);
            } else if (chunk.isLoaded && dist > chunk.unloadRadius) {
                this._unloadChunk(chunk);
                continue; // Jangan lanjut occlusion test jika sudah di-unload
            }

            // B. Occlusion Culling (Untuk chunk yang sedang loaded)
            if (chunk.isLoaded && chunk.root && this.config.frustumCulling) {
                this._sphereCache.set(chunk.position, chunk.boundsRadius);
                
                // Uji Cepat: Frustum Culling
                const inFrustum = this.frustum.intersectsSphere(this._sphereCache);
                let visible = inFrustum;

                // Uji Akurat: Raycast Occlusion (jika lolos frustum tapi ada occluder)
                if (inFrustum && this.occluders.length > 0) {
                    this._dirCache.subVectors(chunk.position, camPos).normalize();
                    this.raycaster.set(camPos, this._dirCache);
                    // Cek tabrakan sinar dari kamera ke chunk terhadap occluders
                    const hits = this.raycaster.intersectObjects(this.occluders, false);
                    if (hits.length > 0 && hits[0].distance < dist) {
                        // Tertutup tembok/occluder sepenuhnya
                        visible = false; 
                    }
                }

                chunk.root.visible = visible;
            }
        }
    }
}

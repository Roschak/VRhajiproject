import sys

with open(r'C:\VRhajiproject\src\VRHaji.Web\wwwroot\js\vr\engine.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Disable Crowd Shadows
code = code.replace(
"""        const im = (geo, mat) => {
            const m = new THREE.InstancedMesh(geo, mat, count);
            m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            m.castShadow = true;
            return m;
        };""",
"""        const im = (geo, mat) => {
            const m = new THREE.InstancedMesh(geo, mat, count);
            m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            m.castShadow = false; // OPTIMASI PERFORM: Matikan bayangan asli untuk kerumunan
            return m;
        };""")

# 2. Add Culling inside Crowd update()
code = code.replace(
"""    update(dt, time) {
        const o = this.opts, L = this.L, qYaw = this._qYaw;
        for (let i = 0; i < this.agents.length; i++) {
            const a = this.agents[i];
            let x, z, heading = a.heading ?? 0, moving = false;""",
"""    update(dt, time) {
        const o = this.opts, L = this.L, qYaw = this._qYaw;
        
        let camPos = null, camDir = null;
        if (ACTIVE_ENGINE && ACTIVE_ENGINE.camera) {
            camPos = ACTIVE_ENGINE.camera.getWorldPosition(new THREE.Vector3());
            camDir = ACTIVE_ENGINE.camera.getWorldDirection(new THREE.Vector3());
        }

        for (let i = 0; i < this.agents.length; i++) {
            const a = this.agents[i];
            let x, z, heading = a.heading ?? 0, moving = false;""")

code = code.replace(
"""            } else {
                x = a.x; z = a.z;
            }
            a.wx = x; a.wz = z;

            const sc = a.s;
            const wp = time * 5.5 * a.speed + a.phase;
            qYaw.setFromAxisAngle(this._up, heading);

            if (a.sit) {""",
"""            } else {
                x = a.x; z = a.z;
            }
            a.wx = x; a.wz = z;

            let sc = a.s;

            // --- OPTIMASI PERFORM: Frustum Culling & Distance LOD ---
            if (camPos && camDir) {
                const dx = x - camPos.x;
                const dz = z - camPos.z;
                const distSq = dx * dx + dz * dz;
                
                if (distSq > 2025) {
                    sc = 0;
                } else if (distSq > 16) {
                    const dot = (dx * camDir.x + dz * camDir.z) / Math.sqrt(distSq);
                    if (dot < -0.2) sc = 0; 
                }
            }

            const wp = time * 5.5 * a.speed + a.phase;
            qYaw.setFromAxisAngle(this._up, heading);
            
            if (sc === 0) {
                for (let pIdx = 0; pIdx < this.parts.length; pIdx++) {
                    this._compose(this.parts[pIdx], i, x, -10, z, qYaw, 0);
                }
                continue; 
            }

            if (a.sit) {""")

# 3. Lower shadow map resolution
code = code.replace(
"""        dir.castShadow = true;
        dir.shadow.mapSize.set(4096, 4096);""",
"""        dir.castShadow = true;
        dir.shadow.mapSize.set(2048, 2048);""")

# 4. Add FPS Limiter in _tick()
code = code.replace(
"""    _tick() {
        const now = performance.now();
        const dt = Math.min((now - this._lastTime) / 1000, 0.05);""",
"""    _tick() {
        if (this._targetFps && !this.renderer.xr.isPresenting) {
            const rawNow = performance.now();
            const minDelay = 1000 / this._targetFps;
            if (rawNow - (this._lastFrameTime || 0) < minDelay) return;
            this._lastFrameTime = rawNow;
        }

        const now = performance.now();
        const dt = Math.min((now - this._lastTime) / 1000, 0.05);""")

# 5. Fix _adaptResolution to respect manual UI resolution
code = code.replace(
"""    _adaptResolution(dt) {
        // rata-rata bergerak; satu frame tersendat tak boleh memicu perubahan""",
"""    _adaptResolution(dt) {
        if (this._lockResolution) return;
        // rata-rata bergerak; satu frame tersendat tak boleh memicu perubahan""")

# 6. Add setGraphicsOptions
code = code.replace(
"""        this.renderer.dispose();
        this.renderer.domElement.remove();
        this.fadeEl.remove();
    }
}""",
"""        this.renderer.dispose();
        this.renderer.domElement.remove();
        this.fadeEl.remove();
    }

    setGraphicsOptions(opts) {
        if (opts.resolution !== undefined) {
            this._lockResolution = true;
            this._prMax = opts.resolution;
            this._pr = opts.resolution;
            this.renderer.setPixelRatio(this._pr);
            this.composer.setPixelRatio(this._pr);
            this.resize();
        }
        if (opts.shadows !== undefined) {
            this.renderer.shadowMap.enabled = opts.shadows;
            this.scene.traverse((child) => {
                if (child.isLight && child.type === 'DirectionalLight') {
                    child.castShadow = opts.shadows;
                }
                if (child.material) {
                    child.material.needsUpdate = true;
                }
            });
        }
        if (opts.fps !== undefined) {
            this._targetFps = opts.fps;
        }
    }
}""")

with open(r'C:\VRhajiproject\src\VRHaji.Web\wwwroot\js\vr\engine.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done")

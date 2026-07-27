/**
 * VR Education Haji & Umrah — Entry point / JavaScript Interop
 * Dipanggil dari SceneView.razor (Blazor Server).
 */
import { Engine } from './engine.js';
import { SCENES } from './scenes.js';

let engine = null;
let sceneDef = null;
let started = false;

/** Lepas tombol-tombol skip (skip scene & lewati langkah) dari DOM. */
function removeSkipButtons() {
    for (const id of ['vr-skip-scene-btn', 'vr-skip-step-btn']) {
        document.getElementById(id)?.remove();
    }
}

/** Muat scene (tanpa memulai alur) agar 3D siap saat intro tampil. */
export function preload(containerId, sceneNo, dotnetRef) {
    try {
        const container = document.getElementById(containerId);
        if (!container) throw new Error('Container tidak ditemukan: ' + containerId);
        dispose();
        engine = new Engine(container);
        engine.dotnet = dotnetRef;
        sceneDef = SCENES[sceneNo];
        if (!sceneDef) throw new Error('Scene tidak dikenal: ' + sceneNo);
        engine.setEnvironment(sceneDef.env);
        engine._sceneRefs = sceneDef.build(engine);
        engine.setProgress(0);
        started = false;
        
        initVRButton(engine);
    } catch (e) {
        console.error("JS Error in preload:", e);
        throw e;
    }
}

async function initVRButton(engine) {
    const btn = document.getElementById('btn-enter-vr');
    if (!btn) return;
    
    if (!navigator.xr) {
        btn.hidden = true;
        return;
    }
    
    try {
        const supported = await navigator.xr.isSessionSupported('immersive-vr');
        if (supported) {
            btn.hidden = false;
            btn.disabled = false;
            btn.style.display = 'inline-block';
        } else {
            btn.hidden = true;
            return;
        }
        
        // Ganti elemen untuk menghapus listener lama (jika ada sisa navigasi Blazor)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', async () => {
            try {
                const session = await navigator.xr.requestSession('immersive-vr', {
                    optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
                });
                await engine.renderer.xr.setSession(session);
                engine.renderer.xr.enabled = true;
                
                if (engine.dotnet) {
                    engine.dotnet.invokeMethodAsync('OnVRSessionStarted');
                }
                
                session.addEventListener('end', () => {
                    if (engine && engine.dotnet) {
                        engine.dotnet.invokeMethodAsync('OnVRSessionEnded');
                    }
                });
            } catch (err) {
                console.error("Gagal masuk ke sesi VR:", err);
                const fallback = document.getElementById('vr-fallback-message');
                if (fallback) {
                    fallback.textContent = "Gagal memulai VR. Pastikan menggunakan Meta Browser dan koneksi HTTPS aktif.";
                    fallback.hidden = false;
                    fallback.style.display = 'block';
                    setTimeout(() => { fallback.hidden = true; }, 5000);
                } else {
                    alert("Gagal memulai VR. Pastikan menggunakan Meta Browser dan HTTPS aktif.");
                }
            }
        });
    } catch (e) {
        btn.hidden = true;
        console.error("Error checking XR support:", e);
    }
}

/** Mulai alur scene (dipanggil dari tombol "Mulai Simulasi"). */
export async function start() {
    if (!engine || started) return;
    started = true;
    engine.audio.ensure();
    if (sceneDef.ambient) engine.audio.ambient(sceneDef.ambient, 0.32);
    await engine.fadeIn(1400);
    engine.setHint('Tahan klik + geser untuk melihat sekeliling · WASD berjalan · klik objek untuk interaksi');

    const ctx = {
        // Sistem kuis pilihan ganda (ABCD) dihapus — checkpoint kini lanjut
        // otomatis tanpa interupsi (alur netral). Lihat protokol §4.
        checkpoint(_n) {
            return Promise.resolve();
        },
        async complete() {
            removeSkipButtons();
            engine.narrator.stop();
            engine.setObjective('');
            await engine.dotnet.invokeMethodAsync('OnSceneCompleted');
        },
        progress(pct) { engine.setProgress(pct); }
    };

    try {
        const skipSceneBtn = document.createElement('button');
        skipSceneBtn.id = 'vr-skip-scene-btn';
        skipSceneBtn.className = 'btn btn--gold btn--small';
        skipSceneBtn.innerHTML = `⏭ Skip Scene`;
        skipSceneBtn.style.position = 'absolute';
        skipSceneBtn.style.top = '70px';
        skipSceneBtn.style.right = '20px';
        skipSceneBtn.style.zIndex = '9999';
        skipSceneBtn.style.pointerEvents = 'auto';
        skipSceneBtn.onclick = () => {
            if (engine) {
                engine.audio.sfx('click');
                ctx.complete();
            }
        };
        document.getElementById('vr-root').appendChild(skipSceneBtn);

        // Lewati hanya langkah yang sedang ditunggu (narasi / berjalan / interaksi /
        // mekanik tawaf-sa'i-lontar batu). Sisa scene tetap berjalan normal.
        const skipStepBtn = document.createElement('button');
        skipStepBtn.id = 'vr-skip-step-btn';
        skipStepBtn.className = 'btn btn--ghost btn--small vr-skip-btn';
        skipStepBtn.innerHTML = `⏩ Lewati Langkah`;
        skipStepBtn.title = 'Selesaikan langkah yang sedang berjalan dan lanjut ke langkah berikutnya';
        skipStepBtn.onclick = () => {
            if (!engine) return;
            engine.audio.sfx('click');
            engine.skipStep();
        };
        document.getElementById('vr-root').appendChild(skipStepBtn);

        await sceneDef.run(engine, ctx);
    } catch (e) {
        if (engine) console.error('Scene runner error:', e);
    }
}

/** Buka/tutup UI Blazor — pause input & pointer lock. */
export function setUiOpen(open) {
    engine?.setUiOpen(open);
}

export function dispose() {
    removeSkipButtons();
    if (engine) {
        try { engine.dispose(); } catch { }
        engine = null;
    }
    sceneDef = null;
    started = false;
}

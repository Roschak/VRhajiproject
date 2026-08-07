/**
 * VR Education Haji & Umrah — Entry point / JavaScript Interop
 * Dipanggil dari SceneView.razor (Blazor Server).
 */
import { Engine } from './engine.js';
import { SCENES } from './scenes.js';
import * as THREE from 'three';

let engine = null;
let sceneDef = null;
let started = false;
let currentSceneIndex = 1;

const SCENE_META = {
    1: { title: 'Berangkat dari Indonesia', desc: 'Memulai perjalanan haji dari tanah air menuju Tanah Suci.', loc: 'Bandara Soekarno-Hatta', time: 'Pagi Hari' },
    2: { title: 'Tiba di Madinah', desc: 'Tiba di Bandara Prince Mohammad Bin Abdulaziz, Madinah.', loc: 'Bandara Madinah', time: 'Siang Hari' },
    3: { title: 'Miqat dan Niat Umrah', desc: 'Mengambil miqat di Bir Ali dan melafazkan niat umrah.', loc: 'Zulhulaifah (Bir Ali)', time: 'Sore Hari' },
    4: { title: 'Masuk Masjidil Haram', desc: 'Pengalaman pertama memasuki Masjidil Haram: adab masuk masjid, doa, dan melihat Ka\'bah untuk pertama kalinya.', loc: 'Masjidil Haram, Makkah', time: 'Menjelang senja' },
    5: { title: 'Tawaf Umrah', desc: 'Melaksanakan Tawaf mengelilingi Ka\'bah sebanyak 7 putaran.', loc: 'Mataf, Masjidil Haram', time: 'Malam Hari' },
    6: { title: 'Sa\'i Umrah', desc: 'Melaksanakan Sa\'i antara bukit Shafa dan Marwah sebanyak 7 kali perjalanan.', loc: 'Masa\'a, Masjidil Haram', time: 'Malam Hari' },
    7: { title: 'Wukuf di Arafah', desc: 'Puncak ibadah haji. Berdiam diri di padang Arafah untuk berdoa dan berzikir.', loc: 'Padang Arafah', time: 'Siang Hari (9 Dzulhijjah)' },
    8: { title: 'Muzdalifah', desc: 'Mabit di Muzdalifah dan mengumpulkan batu kerikil untuk lontar jumrah.', loc: 'Muzdalifah', time: 'Malam Hari (9 Dzulhijjah)' },
    9: { title: 'Jumrah Aqabah', desc: 'Melontar Jumrah Aqabah dengan 7 batu kerikil.', loc: 'Jamarat, Mina', time: 'Pagi Hari (10 Dzulhijjah)' },
    10: { title: 'Tawaf Ifadhah & Sa\'i Haji', desc: 'Melaksanakan Tawaf Ifadhah dan dilanjutkan dengan Sa\'i Haji.', loc: 'Masjidil Haram', time: 'Siang Hari (10 Dzulhijjah)' },
    11: { title: 'Mabit di Mina', desc: 'Mabit di Mina pada hari tasyrik dan melontar tiga jumrah.', loc: 'Tenda Mina & Jamarat', time: 'Hari Tasyrik' },
    12: { title: 'Tawaf Wada\'', desc: 'Tawaf perpisahan sebelum meninggalkan kota Makkah.', loc: 'Masjidil Haram', time: 'Berbagai Waktu' }
};

function fillTextWrap(g, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        if (g.measureText(testLine).width > maxWidth && n > 0) {
            g.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    g.fillText(line, x, currentY);
}

/** Lepas tombol-tombol skip (skip scene & lewati langkah) dari DOM. */
function removeSkipButtons() {
    for (const id of ['vr-skip-scene-btn', 'vr-skip-step-btn', 'vr-settings-btn', 'vr-settings-modal']) {
        document.getElementById(id)?.remove();
    }
}

/** Muat scene (tanpa memulai alur) agar 3D siap saat intro tampil. */
export async function preload(containerId, sceneNo, dotnetRef) {
    if (engine) return;
    
    currentSceneIndex = sceneNo;
    
    // Konfigurasi scene berdasarkan urutan
    const totalScenes = SCENES.length;
    try {
        const container = document.getElementById(containerId);
        if (!container) throw new Error('Container tidak ditemukan: ' + containerId);
        dispose();
        engine = new Engine(container);
        engine.dotnet = dotnetRef;
        
        // Memuat Pengaturan Tersimpan (Jika Ada), jika tidak gunakan default ringan
        const savedSettings = localStorage.getItem('vr-graphics-settings');
        if (savedSettings) {
            try { engine.setGraphicsOptions(JSON.parse(savedSettings)); } catch(e) {}
        } else {
            // Default ringan untuk performa awal yang stabil
            engine.setGraphicsOptions({ resolution: 0.75, shadows: false, fps: 30 });
        }

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
            
            const totalScenes = Object.keys(SCENES).length;
            const isLast = currentSceneIndex >= totalScenes;
            
            // Simpan progress secara asinkron (beri true agar Blazor tidak nge-lock UI dengan overlay)
            if (engine.dotnet) {
                engine.dotnet.invokeMethodAsync('OnSceneCompleted', !isLast);
            }
            
            if (engine.renderer.xr.isPresenting) {
                engine.setHint('');
                
                if (!isLast) {
                    engine.audio.sfx('success');
                    engine.setHint('Tahap Selesai! Memuat tahap selanjutnya...');
                    await engine.fadeOut(1000);
                    
                    // Langsung hot swap ke scene selanjutnya tanpa keluar VR
                    await hotSwapScene(currentSceneIndex + 1);
                    
                    // Beritahu Blazor untuk sinkronisasi map & UI (tanpa me-reload halaman)
                    if (engine.dotnet) {
                        engine.dotnet.invokeMethodAsync('OnSceneHotSwapped', currentSceneIndex);
                    }
                } else {
                    // Jika ini scene terakhir, biarkan mereka melihat pesan selesai sejenak lalu keluar
                    engine.audio.sfx('success');
                    engine.setHint('Seluruh Simulasi Selesai!');
                    await new Promise(r => setTimeout(r, 4000));
                    await engine.fadeOut(1000);
                    window.location.assign('/');
                }
            } else { 
                // === Web Mode ===
                if (!isLast) {
                    engine.audio.sfx('success');
                    engine.setHint('Tahap Selesai! Memuat tahap selanjutnya...');
                    await engine.fadeOut(1000);
                    window.location.assign('/scene/' + (currentSceneIndex + 1));
                } else {
                    engine.audio.sfx('success');
                    engine.setHint('Seluruh Simulasi Selesai! Kembali ke menu utama...');
                    await new Promise(r => setTimeout(r, 3000));
                    await engine.fadeOut(1000);
                    window.location.assign('/');
                }
            }
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
        skipStepBtn.style.position = 'absolute';
        skipStepBtn.style.top = '110px';
        skipStepBtn.style.right = '20px';
        skipStepBtn.style.zIndex = '9999';
        skipStepBtn.style.pointerEvents = 'auto';
        skipStepBtn.onclick = () => {
            if (!engine) return;
            engine.audio.sfx('click');
            engine.skipStep();
        };
        document.getElementById('vr-root').appendChild(skipStepBtn);

        // --- Fitur Settings (Grafis & FPS) ---
        function showSettingsModal() {
            if (document.getElementById('vr-settings-modal')) return;
            
            const modal = document.createElement('div');
            modal.id = 'vr-settings-modal';
            modal.innerHTML = `
                <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a1a;color:white;padding:20px;border-radius:10px;z-index:10000;font-family:sans-serif;width:300px;box-shadow:0 10px 30px rgba(0,0,0,0.5);border:1px solid #444;">
                    <button id="set-close-x" style="position:absolute;top:15px;right:15px;background:transparent;border:none;color:#aaa;font-size:24px;cursor:pointer;line-height:1;padding:0;margin:0;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#aaa'">&times;</button>
                    <h3 style="margin-top:0;color:#f2c94c;border-bottom:1px solid #333;padding-bottom:10px;padding-right:20px;">⚙️ Pengaturan Grafis</h3>
                    
                    <div style="margin-bottom:15px;">
                        <label style="display:block;margin-bottom:5px;font-size:14px;">Kualitas Resolusi</label>
                        <select id="set-res" style="width:100%;padding:8px;background:#333;color:white;border:1px solid #555;border-radius:5px;cursor:pointer;">
                            <option value="1.5">Tinggi (High)</option>
                            <option value="1.0" selected>Normal</option>
                            <option value="0.75">Rendah (Low) - Ringan</option>
                            <option value="0.5">Sangat Rendah (Potato)</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom:15px;">
                        <label style="display:block;margin-bottom:5px;font-size:14px;">Bayangan (Shadows)</label>
                        <select id="set-shadow" style="width:100%;padding:8px;background:#333;color:white;border:1px solid #555;border-radius:5px;cursor:pointer;">
                            <option value="true">Aktif (Lebih Nyata)</option>
                            <option value="false">Mati (Lebih Ringan)</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom:20px;">
                        <label style="display:block;margin-bottom:5px;font-size:14px;">Batas Frame (FPS)</label>
                        <select id="set-fps" style="width:100%;padding:8px;background:#333;color:white;border:1px solid #555;border-radius:5px;cursor:pointer;">
                            <option value="0">Tidak Dibatasi (Maks)</option>
                            <option value="60">Maks 60 FPS</option>
                            <option value="30">Maks 30 FPS</option>
                        </select>
                    </div>
                    
                    <button id="set-apply" style="width:100%;padding:10px;background:#f2c94c;color:black;border:none;border-radius:5px;font-weight:bold;cursor:pointer;transition:transform 0.1s;">Terapkan & Tutup</button>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Event Tutup Silang
            document.getElementById('set-close-x').onclick = () => {
                if (engine) engine.audio.sfx('click');
                modal.remove();
            };

            // Set value dropdown sesuai kondisi engine saat ini
            document.getElementById('set-shadow').value = engine.renderer.shadowMap.enabled ? 'true' : 'false';
            document.getElementById('set-fps').value = engine._targetFps || '0';
            document.getElementById('set-res').value = engine._lockResolution ? engine._prMax.toString() : '1.0';
            
            // Event klik
            const applyBtn = document.getElementById('set-apply');
            applyBtn.onmousedown = () => applyBtn.style.transform = 'scale(0.97)';
            applyBtn.onmouseup = () => applyBtn.style.transform = 'scale(1)';
            applyBtn.onclick = () => {
                if (engine) {
                    const opts = {
                        resolution: parseFloat(document.getElementById('set-res').value),
                        shadows: document.getElementById('set-shadow').value === 'true',
                        fps: parseInt(document.getElementById('set-fps').value)
                    };
                    engine.setGraphicsOptions(opts);
                    localStorage.setItem('vr-graphics-settings', JSON.stringify(opts)); // SIMPAN PERMANEN
                }
                modal.remove();
            };
        }

        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'vr-settings-btn';
        settingsBtn.className = 'btn btn--ghost btn--small';
        settingsBtn.innerHTML = '⚙️ Pengaturan Grafis';
        settingsBtn.style.position = 'absolute';
        settingsBtn.style.top = '150px'; // Posisi di bawah tombol Lewati Langkah
        settingsBtn.style.right = '20px';
        settingsBtn.style.zIndex = '9999';
        settingsBtn.style.pointerEvents = 'auto';
        settingsBtn.onclick = () => {
            if (engine) {
                engine.audio.sfx('click');
                showSettingsModal();
            }
        };
        document.getElementById('vr-root').appendChild(settingsBtn);

        await sceneDef.run(engine, ctx);
    } catch (e) {
        if (engine) console.error('Scene runner error:', e);
    }
}

/** Buka/tutup UI Blazor — pause input & pointer lock. */
export function setUiOpen(open) {
    engine?.setUiOpen(open);
}

async function hotSwapScene(nextIndex) {
    try {
        console.log('[VR HotSwap] Starting transition to scene', nextIndex);
        
        currentSceneIndex = nextIndex;
        sceneDef = SCENES[nextIndex];
        if (!sceneDef) {
            console.error('[VR HotSwap] Scene not found:', nextIndex);
            return;
        }
        started = false;
        
        // 1. Batalkan semua langkah yang sedang ditunggu (walk/interact/narrate)
        //    agar promise lama tidak menggantung
        engine.skipStep();
        
        // 2. Hentikan narasi
        if (engine.narrator) engine.narrator.stop();
        
        // 3. Hentikan audio ambient (AudioBed tidak punya stopAll, gunakan cara ini)
        if (engine.audio && engine.audio.bedNodes) {
            engine.audio.bedNodes.forEach(n => { try { n.stop(); } catch(e) {} });
            engine.audio.bedNodes = [];
            if (engine.audio.bedGain) {
                engine.audio.bedGain.gain.cancelScheduledValues(engine.audio.ctx?.currentTime || 0);
                engine.audio.bedGain.gain.value = 0;
            }
        }
        
        // 4. Bersihkan state scene lama
        engine.updaters = [];
        engine.interactables = [];
        engine.walkRects = [];
        engine.walkCircles = [];
        engine.blockers = [];
        engine.heightZones = [];
        engine._skipHandlers.clear();
        engine._hover = null;
        engine._pendingResolve = null;
        
        // 5. Hapus semua waypoint
        if (engine.waypoint) { engine.hideWaypoint(); }
        
        // 6. Hapus semua objek 3D kecuali yang esensial
        const toRemove = [];
        engine.scene.traverse(c => {
            if (c.parent === engine.scene && c !== engine.dolly && !c.isLight && c !== engine._guide && c !== engine._vrHud) {
                toRemove.push(c);
            }
        });
        for (const c of toRemove) {
            engine.scene.remove(c);
            c.traverse(child => {
                child.geometry?.dispose?.();
                if (child.material) {
                    const mats = Array.isArray(child.material) ? child.material : [child.material];
                    mats.forEach(m => { m.map?.dispose?.(); m.dispose?.(); });
                }
            });
        }
        
        // 6b. Kosongkan registry chunk/objek ChunkManager — scene lama sudah
        //     dibersihkan & di-dispose di atas, jadi cukup clear registry agar
        //     chunk mati tidak menumpuk dan tidak dievaluasi di scene baru.
        engine.chunkManager?.clearChunks?.();
        engine.chunkManager?.clearObjects?.();
        
        // 7. Bersihkan crowds (hindari memory leak dan bug tabrakan ghost)
        if (engine.clearCrowds) engine.clearCrowds();
        
        // 8. Reset posisi pemain
        engine.movePlayerTo(0, 0);
        
        // 9. Reset HUD
        engine.setObjective('');
        engine.setHint('');
        engine.setProgress(0);
        
        // 10. Update environment (skybox/lighting)
        engine.setEnvironment(sceneDef.env);
        
        // 11. Build scene baru
        engine._sceneRefs = sceneDef.build(engine);
        
        // 12. Update URL
        window.history.replaceState(null, '', '/scene/' + nextIndex);
        
        // 13. Fade in dan mulai scene baru
        await engine.fadeIn(800);
        
        console.log('[VR HotSwap] Scene', nextIndex, 'ready, starting...');
        await start();
        
    } catch (err) {
        console.error('[VR HotSwap] Error:', err);
        // Fallback: jika hot swap gagal, paksa redirect
        window.location.assign('/scene/' + nextIndex);
    }
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

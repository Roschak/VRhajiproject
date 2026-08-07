/* Verifikasi LIVE (deterministik): chunk miqat asli (scene 3).
 * SwiftShader lambat (frame berdetik) — memindahkan kamera + menunggu frame
 * tidak deterministik. Maka: (a) uji load/unload/reload lewat cm.update() yang
 * DIPAKSA (lastCheckTime=0, tidak bergantung render loop), (b) uji integrasi
 * render loop via advance lastCheckTime (update() dipanggil _tick). */
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9334;
const URL = 'http://127.0.0.1:5199/scene/3';
const PROFILE = process.env.TEMP + '\\vrchrome_cdp3';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--disable-background-networking', '--no-first-run', '--disable-default-apps',
    '--window-size=1280,720', URL
], { stdio: 'ignore' });

let ws = null, seq = 0;
const pending = new Map();
const errors = [];
const handlers = {};

function send(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = ++seq;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
    });
}

async function connect() {
    for (let i = 0; i < 40; i++) {
        try {
            const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
            const page = (await res.json()).find(t => t.type === 'page');
            if (page?.webSocketDebuggerUrl) {
                ws = new WebSocket(page.webSocketDebuggerUrl);
                await new Promise((res2, rej) => { ws.onopen = res2; ws.onerror = rej; });
                ws.onmessage = (ev) => {
                    const msg = JSON.parse(ev.data);
                    if (msg.id && pending.has(msg.id)) {
                        const { resolve, reject } = pending.get(msg.id);
                        pending.delete(msg.id);
                        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
                    } else if (handlers[msg.method]) handlers[msg.method](msg.params);
                };
                return;
            }
        } catch { }
        await sleep(500);
    }
    throw new Error('Gagal connect CDP');
}

handlers['Runtime.exceptionThrown'] = (p) =>
    errors.push('EXCEPTION: ' + (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || '').split('\n')[0]);
handlers['Runtime.consoleAPICalled'] = (p) => {
    if (p.type === 'error') errors.push('CONSOLE.ERROR: ' + p.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300));
};

async function evalJs(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('eval gagal: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result?.value;
}

const PROBE = `(async () => {
    const out = { steps: [], diag: [] };
    const log = (s) => out.steps.push(s);
    const cm = window.__vrEngine?.chunkManager;
    if (!cm) throw new Error('hook debug window.__vrEngine.chunkManager tidak aktif');
    const camera = window.__vrEngine.camera;

    const chunkRoots = () => cm.scene.children.filter(c =>
        c.isGroup && c.children.length > 10 &&
        (Math.abs(c.position.x) === 180 || Math.abs(c.position.z) === 180));
    const meshCount = () => { let n = 0; cm.scene.traverse(o => { if (o.isMesh) n++; }); return n; };
    const loadedCount = () => [...cm.chunks.values()].filter(c => c.isLoaded).length;
    const forceUpdate = () => {
        try { cm.lastCheckTime = 0; cm.update(); return 'ok'; }
        catch (e) { return 'THROW: ' + (e?.message || e); }
    };

    // --- A. INTEGRASI RENDER LOOP: update() harus dipanggil _tick (bukan manual) ---
    // SwiftShader lambat (frame berdetik) → polling hingga 30s, tidak cukup 1 jendela.
    const t0 = cm.lastCheckTime;
    let advanced = false;
    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 1000));
        if (cm.lastCheckTime !== t0) { advanced = true; break; }
    }
    log('A1 update() dipanggil oleh render loop (_tick): ' + (advanced ? 'PASS' : 'FAIL'));

    // --- B. LOAD (dipaksa, deterministik) — kamera origin → 4 chunk jarak 180 < 200 ---
    camera.position.set(0, 1.7, 0);
    await new Promise(r => setTimeout(r, 300));
    const uB = forceUpdate();
    const rootsB = chunkRoots();
    log('B1 force-update di origin tidak melempar: ' + (uB === 'ok' ? 'PASS' : 'FAIL (' + uB + ')'));
    log('B2 semua 4 chunk ter-load: ' + (loadedCount() === 4 ? 'PASS (' + loadedCount() + ')' : 'FAIL (' + loadedCount() + ')'));
    log('B3 root chunk ada di scene graph: ' + (rootsB.length === 4 ? 'PASS (' + rootsB.length + ')' : 'FAIL (' + rootsB.length + ')'));

    // --- C. UNLOAD (dipaksa) — kamera z=500 → semua chunk > 250 ---
    camera.position.set(0, 1.7, 500);
    await new Promise(r => setTimeout(r, 300));
    const uC = forceUpdate();
    const mBefore = meshCount();
    log('C1 force-unload tidak melempar: ' + (uC === 'ok' ? 'PASS' : 'FAIL (' + uC + ')'));
    log('C2 semua chunk ter-unload (0 loaded): ' + (loadedCount() === 0 ? 'PASS' : 'FAIL (' + loadedCount() + ')'));
    log('C3 root chunk dilepas dari scene: ' + (chunkRoots().length === 0 ? 'PASS' : 'FAIL (' + chunkRoots().length + ')'));
    out.diag.push('C_mesh_main_only=' + mBefore);

    // --- D. RELOAD (dipaksa) — kamera kembali origin → 4 chunk di-build ulang ---
    camera.position.set(0, 1.7, 0);
    await new Promise(r => setTimeout(r, 300));
    const uD = forceUpdate();
    log('D1 force-reload tidak melempar: ' + (uD === 'ok' ? 'PASS' : 'FAIL (' + uD + ')'));
    log('D2 chunk ter-build ulang (4 loaded): ' + (loadedCount() === 4 ? 'PASS (' + loadedCount() + ')' : 'FAIL (' + loadedCount() + ')'));
    log('D3 mesh kembali setelah reload: ' + (meshCount() > mBefore ? 'PASS (' + mBefore + ' -> ' + meshCount() + ')' : 'FAIL (' + mBefore + ' -> ' + meshCount() + ')'));
    out.diag.push('D_mesh_after_reload=' + meshCount());

    // --- E. BLOCKER TIDAK MELEDAK: addBlocker dipanggil buildFn tiap reload → cek duplikat wajar ---
    out.diag.push('E_blockers=' + window.__vrEngine.blockers.length);

    out.result = out.steps.every(s => s.includes('PASS')) ? 'ALL PASS' : 'SOME FAIL';
    return out;
})()`;

try {
    await connect();
    await send('Runtime.enable');
    await send('Log.enable');

    let ready = false;
    for (let i = 0; i < 24; i++) {
        await sleep(5000);
        try {
            const state = await evalJs(`({ canvas: !!document.querySelector('canvas'), mulai: document.body.innerText.includes('Mulai'), hook: !!window.__vrEngine?.chunkManager })`);
            if (state.canvas && state.mulai && state.hook) { ready = true; break; }
        } catch { }
    }

    const smoke = await evalJs(PROBE);
    console.log('=== LIVE TEST (deterministik, chunk miqat asli) ===');
    for (const s of smoke.steps) console.log('  ' + s);
    for (const d of smoke.diag) console.log('  [diag] ' + d);
    console.log('RESULT: ' + smoke.result);
    console.log('SCENE READY: ' + ready);
    console.log('=== ERRORS (' + errors.length + ') ===');
    if (errors.length === 0) console.log('  (tidak ada)');
    for (const e of errors.slice(0, 20)) console.log('  ' + e);
    const bad = errors.filter(e => /JS Error in preload|Scene runner error|ChunkManager|SyntaxError|TypeError|is not a function|Cannot read|dispose/i.test(e));
    console.log('=== KESIMPULAN ===');
    console.log(bad.length === 0 ? 'OK' : 'PERLU DITINJAU: ' + bad.length);
} catch (e) {
    console.error('VERIFIKASI GAGAL: ' + e.message);
    process.exitCode = 1;
} finally {
    try { ws && send('Browser.close'); } catch { }
    await sleep(1200);
    try { chrome.kill(); } catch { }
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch { }
    process.exit(process.exitCode || 0);
}

/* Verifikasi ulang ChunkManager setelah perbaikan review (CDP + Chrome headless). */
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const URL = 'http://127.0.0.1:5199/scene/3';
const PROFILE = process.env.TEMP + '\\vrchrome_cdp2';

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

const TEST = `(async () => {
    const out = { steps: [] };
    const log = (s) => out.steps.push(s);
    const engineMod = await import('/js/vr/engine.js');
    const cmMod = await import('/js/vr/chunkManager.js');
    const THREE = engineMod.THREE;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 0, 0);
    const xr = { setFoveation: () => {}, addEventListener: () => {}, removeEventListener: () => {}, getSession: () => null };
    const cm = new cmMod.ChunkManager({ scene, camera, renderer: { xr } }, { throttleMs: 0 });

    cm.registerChunk('c1', new THREE.Vector3(0, 0, 0), 50, 80, (r) => r.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial())));
    cm.registerObject('o1', { position: new THREE.Vector3(0, 0, 20), buildFn: (r) => r.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial())) });
    cm.update();
    log('I1 loaded sebelum clear: ' + (cm.getStats().loadedChunks === 1 && cm.getStats().loadedObjects === 1 ? 'PASS' : 'FAIL'));

    // clearChunks/clearObjects: root dilepas dari scene, registry kosong
    cm.clearChunks();
    cm.clearObjects();
    const st = cm.getStats();
    const detached = scene.children.length === 0;
    log('I2 clearChunks registry=0: ' + (st.chunks === 0 ? 'PASS' : 'FAIL'));
    log('I3 clearObjects registry=0: ' + (st.objects === 0 ? 'PASS' : 'FAIL'));
    log('I4 root dilepas dari scene: ' + (detached ? 'PASS' : 'FAIL'));

    // registerObject tanpa position harus throw (guard)
    let threw = false;
    try { cm.registerObject('bad', { buildFn: () => {} }); } catch { threw = true; }
    log('I5 guard position: ' + (threw ? 'PASS' : 'FAIL'));

    // update() setelah clear harus aman (no-op)
    cm.update();
    log('I6 update setelah clear aman: PASS');

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
            const state = await evalJs(`({ canvas: !!document.querySelector('canvas'), mulai: document.body.innerText.includes('Mulai') })`);
            if (state.canvas && state.mulai) { ready = true; break; }
        } catch { }
    }

    const smoke = await evalJs(TEST);
    console.log('=== SMOKE TEST (review fixes) ===');
    for (const s of smoke.steps) console.log('  ' + s);
    console.log('RESULT: ' + smoke.result);
    console.log('SCENE READY: ' + ready);
    console.log('=== ERRORS (' + errors.length + ') ===');
    if (errors.length === 0) console.log('  (tidak ada)');
    for (const e of errors.slice(0, 20)) console.log('  ' + e);
    const bad = errors.filter(e => /JS Error in preload|Scene runner error|ChunkManager|SyntaxError|TypeError|is not a function|Cannot read/i.test(e));
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

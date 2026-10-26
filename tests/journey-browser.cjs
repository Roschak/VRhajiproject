const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        headless: true, args: ['--enable-unsafe-swiftshader', '--disable-gpu-sandbox']
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const route = process.env.ROUTE || 'haji';
    const expectedStages = route === 'umrah' ? 6 : 12;
    const errors = [];
    page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
    page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('net::ERR')) { errors.push(msg.text()); console.error(msg.text()); } });
    try {
        await page.goto((process.env.BASE_URL || 'http://localhost:5101')+`/simulasi/${route}`);
        await page.getByRole('button', { name: 'Mulai Simulasi', exact: true }).waitFor({ timeout: 120000 });
        await page.evaluate(() => {
            const e = window.__vrEngine;
            window.testEngine = e; window.testCanvas = e.renderer.domElement;
            const originalGoto = e.goto.bind(e);
            e.goto = (x, z, opts) => {
                if (!e._walkableStatic(x, z, .2)) throw new Error(`Blocked mission destination: ${x}, ${z}: ${opts.label}; rects=${JSON.stringify(e.walkRects.filter(r => x >= r.x1 - 2 && x <= r.x2 + 2 && z >= r.z1 - 2 && z <= r.z2 + 2))}; blockers=${JSON.stringify(e.blockers.filter(r => x >= r.x1 - 2 && x <= r.x2 + 2 && z >= r.z1 - 2 && z <= r.z2 + 2))}`);
                return originalGoto(x, z, opts);
            };
        });
        await page.getByRole('button', { name: 'Mulai Simulasi', exact: true }).click();
        const url = page.url();
        const seen = new Set();
        const deadline = Date.now() + 240000;
        while (Date.now() < deadline) {
            const state = await page.evaluate(async () => {
                const main = await import('/js/vr/main.js');
                const state = main.getJourneyState();
                if (window.testEngine !== window.__vrEngine || window.testCanvas !== window.__vrEngine.renderer.domElement) throw new Error('Renderer replaced');
                return state;
            });
            if (!seen.has(state.index)) { seen.add(state.index); console.log('Mission', state.index, state.status); }
            assert.notEqual(state.status, 'error', 'Runner entered error state');
            assert.equal(page.url(), url, 'Journey navigated to another URL');
            if (state.status === 'complete') break;
            const dialog = page.locator('.journey-dialog');
            if (await dialog.count()) {
                // Exercise the same ray-pick and trigger handler used by WebXR controllers.
                await page.evaluate(async () => {
                    const THREE = await import('three');
                    const e = window.__vrEngine;
                    const root = e.scene.getObjectByName('journey-dialog');
                    const button = root.children.find(child => child.userData.interact?.enabled);
                    const controller = new THREE.PerspectiveCamera();
                    controller.position.copy(e.playerPos(new THREE.Vector3()));
                    controller.lookAt(button.getWorldPosition(new THREE.Vector3()));
                    controller.updateMatrixWorld(true);
                    e._onVRSelect(controller);
                });
            } else {
                await page.evaluate(() => window.__vrEngine.skipStep());
            }
            await page.waitForTimeout(100);
        }
        const final = await page.evaluate(async () => (await import('/js/vr/main.js')).getJourneyState());
        assert.equal(final.status, 'complete', JSON.stringify(final));
        assert.equal(seen.size, expectedStages);
        if (route === 'umrah') assert.equal(await page.evaluate(() => localStorage.getItem('labbaik-progress-v1-umrah')), '6');
        else {
            const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('vr_haji_progress')));
            assert.equal(saved.filter(p => p.Completed && p.CheckpointId === 0).length, 12);
        }
        const position = await page.evaluate(() => { const p = window.__vrEngine.playerPos(); return { x: p.x, z: p.z }; });
        assert.ok(Math.abs(position.x + 6000) < 10, 'Journey did not return home');
        assert.deepEqual(errors, [], 'Browser errors');
        fs.mkdirSync('artifacts', { recursive: true });
        await page.screenshot({ path: 'artifacts/journey-complete.png' });
        console.log(`PASS: ${expectedStages} ${route} stages, same renderer/page, 3D trigger dialogs, reachable destinations, progress, return home.`);
        await page.getByRole('button', { name: 'Tetap di rumah', exact: true }).click();
        await page.getByRole('link', { name: 'Keluar ke menu', exact: true }).click();
        await page.waitForURL((process.env.BASE_URL || 'http://localhost:5101')+'/');
        assert.equal(await page.evaluate(() => window.__vrEngine), null, 'Engine not disposed');
        if (route === 'haji') {
            await page.goto((process.env.BASE_URL || 'http://localhost:5101')+'/simulasi/haji?tahap=6');
            await page.getByRole('button', { name: 'Mulai Simulasi', exact: true }).waitFor({ timeout: 120000 });
            const resumed = await page.evaluate(async () => (await import('/js/vr/main.js')).getJourneyState());
            assert.equal(resumed.index, 6);
            assert.ok(resumed.areas.includes('mina'), 'Resumed destination area was not loaded');
            await page.screenshot({ path: 'artifacts/journey-resume.png' });
            assert.deepEqual(errors, [], 'Errors after disposing and resuming');
            console.log('PASS: disposal and direct resume with connected areas loaded on demand.');
        }
    } catch (error) {
        fs.mkdirSync('artifacts', { recursive: true });
        await page.screenshot({ path: 'artifacts/journey-failure.png' }).catch(() => {});
        console.error((await page.locator('body').innerText()).slice(0, 1800));
        throw error;
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

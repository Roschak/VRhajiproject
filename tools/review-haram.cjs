const { chromium } = require('playwright-core');
const fs = require('node:fs');
(async () => {
    const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('http://localhost:5101/simulasi/haji?tahap=8');
        await page.getByRole('button', { name: 'Mulai Simulasi', exact: true }).waitFor({ timeout: 120000 });
        await page.waitForTimeout(6000);
        await page.evaluate(async () => { await (await import('/js/vr/main.js')).prepareSaudiMap(); });
        for (const [name, position, target] of [
            ['courtyard', [0, 1.7, 55], [0, 10, 0]],
            ['interior', [3.8, 1.7, -84], [20, 4.8, -99]],
            ['gate', [14,1.7,-89], [0,6,-103]],
            ['escalators', [0,1.7,-74], [0,6,-95]],
            ['upper-floor', [12,11.35,-90], [20,11,-78]],
            ['connector', [106,1.7,-30], [132,3,-30]],
            ['masaa', [133,1.7,-6], [255,5,-6]],
            ['aerial', [160, 175, 190], [0, 0, 0]]
        ]) {
            const result = await page.evaluate(({ position, target }) => {
                const e = window.__vrEngine;
                e.renderer.setAnimationLoop(null);
                e.scene.traverse(o => { if (o.name.startsWith('area-')) o.visible = ['area-haram','area-masaa'].includes(o.name); });
                e.scene.traverse(o => { if (o.name === 'player-avatar') o.visible = false; });
                e.camera.position.set(...position); e.camera.lookAt(...target);
                e.camera.updateMatrixWorld();
                e.composer.render();
                return { image: e.renderer.domElement.toDataURL('image/png'), calls: e.renderer.info.render.calls, triangles: e.renderer.info.render.triangles };
            }, { position, target });
            fs.mkdirSync('artifacts/haram-reference', { recursive: true });
            fs.writeFileSync(`artifacts/haram-reference/${name}.png`, Buffer.from(result.image.split(',')[1], 'base64'));
            console.log(name, { calls: result.calls, triangles: result.triangles });
        }
        if (errors.length) throw new Error(errors.join('\n'));
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

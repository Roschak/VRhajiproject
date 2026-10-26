const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
    const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.goto((process.env.BASE_URL || 'http://127.0.0.1:5102') + '/simulasi/haji');
        await page.getByRole('button', { name: 'Mulai Simulasi', exact: true }).waitFor({ timeout: 60000 });
        const result = await page.evaluate(async () => {
            const { airport } = await import('/js/vr/builders.js');
            const engine = window.__vrEngine;
            engine.setGraphicsOptions({ resolution: 1 });
            const refs = airport(engine);
            engine.spawn(-31, -3, -28);
            engine.setUiOpen(true);
            await engine.fadeIn(0);
            return {
                destinations: [[0,10],[-24,-20],[22,-14],[36,18]].map(([x,z]) => engine._walkableStatic(x,z,.2)),
                desks: refs.counters.children.length,
                scanner: refs.imigrasi.children[0]?.name,
                gate: refs.gate.name
            };
        });
        assert.deepEqual(result.destinations, [true,true,true,true]);
        assert.equal(result.desks, 6); assert.equal(result.scanner, 'boarding-pass-scanner');
        assert.equal(result.gate, 'boarding-gate-reference');
        await page.addStyleTag({content: '.overlay,.hud,.journey-skip{display:none!important}'});
        fs.mkdirSync('artifacts', { recursive: true });
        await page.waitForTimeout(1500);
        await page.screenshot({path:'artifacts/airport-checkin.png'});
        await page.evaluate(() => window.__vrEngine.spawn(12,-14,-90));
        await page.waitForTimeout(500);
        await page.screenshot({path:'artifacts/airport-ticket-gates.png'});
        assert.deepEqual(errors, []);
        console.log('PASS: reference terminal renders; check-in, passport and boarding targets remain reachable.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

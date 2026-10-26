const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
(async () => {
    const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true,
        args: ['--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
    try {
        const page = await browser.newPage();
        await page.goto((process.env.BASE_URL || 'http://localhost:5101')+'/');
        const result = await page.evaluate(async () => {
            const THREE = await import('three');
            const { MissionContext, runMission } = await import('/js/vr/journey-missions.js');
            const controller = new AbortController();
            let position = new THREE.Vector3(24, 1.7, 0), updater, counter = '';
            const engine = {
                playerPos: out => out.copy(position), teleportSerial: 0,
                setCounter: value => { counter = value; }, setObjective() {}, audio: { sfx() {} },
                onUpdate: fn => (updater = { fn, done: false }), skippable: promise => promise
            };
            const context = new MissionContext(engine, {}, {}, controller.signal);
            context.go = async () => {}; context.say = async () => {}; context.confirm = async () => {};
            let finished = false;
            const run = context.tawaf('Test').then(() => { finished = true; });
            for (let i = 0; i < 10; i++) await Promise.resolve();
            const walk = (turns, direction, teleport = false) => {
                for (let i = 1; i <= turns * 128; i++) {
                    const angle = direction * i * Math.PI * 2 / 128;
                    position.set(24 * Math.cos(angle), 1.7, 24 * Math.sin(angle));
                    if (teleport) engine.teleportSerial++;
                    updater.fn(1 / 60, 0, updater);
                    if (updater.done) break;
                }
            };
            walk(1, 1); const wrongDirection = counter;
            walk(1, -1, true); const teleportCounter = counter;
            walk(7.05, -1);
            await run;
            const routes = [];
            context.go = async (key, x, z) => routes.push({ key, x, z });
            await context.sai('Test');
            const throws = [];
            await runMission(10, { engine: { setEnvironment() {} }, world: {}, travel: async () => {}, confirm: async () => {}, stones: async key => throws.push(key) });
            controller.abort(new DOMException('Closed', 'AbortError'));
            let aborted = false;
            try { await context.wait(Promise.resolve()); } catch (e) { aborted = e.name === 'AbortError'; }
            return { wrongDirection, teleportCounter, finished, routes, throws, aborted };
        });
        assert.equal(result.wrongDirection, 'Putaran 0 / 7');
        assert.equal(result.teleportCounter, 'Putaran 0 / 7');
        assert.equal(result.finished, true);
        assert.deepEqual(result.routes.slice(-7).map(p => p.x), [70, -70, 70, -70, 70, -70, 70]);
        assert.deepEqual(result.throws, ['ula', 'wustha', 'aqabah', 'ula', 'wustha', 'aqabah', 'ula', 'wustha', 'aqabah']);
        assert.equal(result.aborted, true);
        console.log('PASS: tawaf direction and teleport exclusion, seven sai legs, all three Tasyrik days, lifetime cancellation.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

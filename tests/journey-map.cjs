const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
(async () => {
    const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true,
        args: ['--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
    try {
        const page = await browser.newPage();
        await page.goto((process.env.BASE_URL || 'http://localhost:5101')+'/simulasi/haji?tahap=4');
        await page.getByRole('button', { name: 'Mulai Simulasi', exact: true }).waitFor({ timeout: 120000 });
        const data = await page.evaluate(async () => {
            const main = await import('/js/vr/main.js');
            await main.prepareSaudiMap();
            const e = window.__vrEngine;
            return { rects: e.walkRects, circles: e.walkCircles, blockers: e.blockers };
        });
        const minX = -110, minZ = -180, step = 2, width = 1081, height = 351;
        const grid = new Uint8Array(width * height);
        const index = (x, z) => Math.round((z - minZ) / step) * width + Math.round((x - minX) / step);
        const fill = (r, value, pad = 0) => {
            const x1 = Math.max(0, Math.ceil((r.x1 - pad - minX) / step));
            const z1 = Math.max(0, Math.ceil((r.z1 - pad - minZ) / step));
            const x2 = Math.min(width - 1, Math.floor((r.x2 + pad - minX) / step));
            const z2 = Math.min(height - 1, Math.floor((r.z2 + pad - minZ) / step));
            for (let z = z1; z <= z2; z++) for (let x = x1; x <= x2; x++) grid[z * width + x] = value;
        };
        data.rects.forEach(r => fill(r, 1, -.25));
        for (const c of data.circles) {
            for (let z = 0; z < height; z++) for (let x = 0; x < width; x++) {
                const d = Math.hypot(minX + x * step - c.x, minZ + z * step - c.z);
                if (d < c.rOuter - .25 && d >= c.rInner + .25) grid[z * width + x] = 1;
            }
        }
        data.blockers.forEach(r => fill(r, 0, .25));
        const queue = [index(24, 20)], visited = new Uint8Array(grid.length);
        visited[queue[0]] = 1;
        for (let i = 0; i < queue.length; i++) {
            const id = queue[i], x = id % width;
            for (const next of [x > 0 ? id - 1 : -1, x < width - 1 ? id + 1 : -1, id - width, id + width]) {
                if (next >= 0 && next < grid.length && grid[next] && !visited[next]) { visited[next] = 1; queue.push(next); }
            }
        }
        for (const [name, x, z] of [['Safa', 130, -6], ['Marwah', 270, -6], ['Mina', 700, -70], ['Muzdalifah', 1250, 80], ['Arafah', 1914, 176]]) {
            assert.equal(visited[index(x, z)], 1, `No walkable connection from Haram to ${name}`);
        }
        console.log('PASS: Haram, Safa, Marwah, Mina, Muzdalifah and Arafah share a connected walkable map.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

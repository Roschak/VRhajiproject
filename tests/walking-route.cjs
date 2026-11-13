const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
    const source = fs.readFileSync('src/VRHaji.Web/wwwroot/js/vr/walking-route.js', 'utf8');
    const { walkingRoute } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
    const engine = {
        walkRects: [{ x1: -10, z1: -10, x2: 10, z2: 10 }], walkCircles: [],
        blockers: [{ x1: -.5, z1: -4, x2: .5, z2: 4 }]
    };
    const start = { x: -5, z: 0 }, goal = { x: 5, z: 0 };
    const path = walkingRoute(engine, start, goal);
    assert.deepEqual(path.at(-1), goal);
    assert.ok(path.some(p => Math.abs(p.z) > 4), 'Must go around the wall');
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i];
        for (let j = 0; j <= 100; j++) {
            const x = a.x + (b.x - a.x) * j / 100, z = a.z + (b.z - a.z) * j / 100;
            assert.ok(!(Math.abs(x) < .73 && Math.abs(z) < 4.23), 'Path crosses wall');
        }
    }
    engine.blockers = [{ x1: -.5, z1: -10, x2: .5, z2: 10 }];
    assert.deepEqual(walkingRoute(engine, start, goal), [], 'Disconnected destination must not produce a partial route');
    engine.blockers = [{ x1: 4.5, z1: -.5, x2: 5.5, z2: .5 }];
    assert.deepEqual(walkingRoute(engine, start, goal), [], 'Blocked endpoint must not produce a partial route');
    console.log('PASS: obstacle clearance, connected destination and blocked endpoint.');
})().catch(error => { console.error(error); process.exitCode = 1; });

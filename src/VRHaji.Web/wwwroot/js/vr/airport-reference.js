import { THREE, Tex } from './engine.js';

/** Terminal 1C check-in palette and the supplied Soekarno-Hatta checkpoint reference.
 * Repeated details use instancing; all textures are generated locally at small sizes. */
export function referenceAirport(engine) {
    const root = new THREE.Group(); root.name = 'soekarno-hatta-reference'; engine.scene.add(root);
    root.add(new THREE.AmbientLight(0xfff6e7, 1.35));
    const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .55, ...extra });
    const wood = material(0xc88b54), dark = material(0x252c30), silver = material(0xbfc9ca, { metalness: .25, roughness: .35 });
    const chrome = material(0xcbd3d3, { metalness: .8, roughness: .2 }), brown = material(0x71504b);
    const ivory = material(0xe9e4d4), blue = material(0x2446ad), black = material(0x17202a);
    const glow = material(0xfff7e6, { emissive: 0xfff4de, emissiveIntensity: .8 });
    const glass = material(0xaacbd0, { transparent: true, opacity: .17, roughness: .15, depthWrite: false });
    function box(parent, size, pos, mat, name) {
        const obj = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
        obj.position.set(...pos); obj.receiveShadow = true; obj.name = name || '';
        parent.add(obj); return obj;
    }
    function instances(parent, geometry, mat, points) {
        const obj = new THREE.InstancedMesh(geometry, mat, points.length), matrix = new THREE.Matrix4();
        points.forEach((p, i) => { matrix.makeTranslation(...p); obj.setMatrixAt(i, matrix); });
        parent.add(obj); return obj;
    }
    function pattern(draw, repeatX = 1, repeatY = 1) {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
        draw(canvas.getContext('2d'));
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeatX, repeatY);
        return texture;
    }
    const weave = pattern(c => {
        c.fillStyle = '#c6ac7c'; c.fillRect(0, 0, 256, 256);
        for (let y = -256; y < 512; y += 12) for (let x = -256; x < 512; x += 12) {
            c.save(); c.translate(x, y); c.rotate(Math.PI / 4);
            c.fillStyle = ((x + y) / 12) % 2 ? '#e6d5ab' : '#b89e70'; c.fillRect(0, 0, 9, 30); c.restore();
        }
    }, 3, 1);
    wood.map = pattern(c => {
        c.fillStyle = '#ddb380'; c.fillRect(0, 0, 256, 256);
        for (let x = 0; x < 256; x += 3) {
            c.strokeStyle = `rgba(115,66,22,${.035 + (x % 13) / 120})`;
            c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 4, 80, x - 3, 180, x, 256); c.stroke();
        }
    }, 8, 1);
    const woven = material(0xffffff, { map: weave });
    const tile = pattern(c => {
        c.fillStyle = '#e9e5d9'; c.fillRect(0, 0, 256, 256);
        c.fillStyle = '#eeece3'; c.fillRect(1, 1, 126, 126); c.fillRect(129, 129, 126, 126);
        c.strokeStyle = '#bfc1b8'; c.lineWidth = 1;
        for (const n of [0, 128, 256]) { c.beginPath(); c.moveTo(n, 0); c.lineTo(n, 256); c.moveTo(0, n); c.lineTo(256, n); c.stroke(); }
    }, 24, 16);
    const floor = material(0xffffff, { map: tile, roughness: .23, metalness: .12 });
    const triangles = pattern(c => {
        c.fillStyle = '#e2d8b6'; c.fillRect(0, 0, 256, 256);
        for (let x = 0; x < 256; x += 64) for (let y = 0; y < 256; y += 128) {
            c.fillStyle = (x / 64) % 2 ? '#788589' : '#b2aca0'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 64, y + 128); c.lineTo(x, y + 128); c.fill();
        }
    }, 5, 7);
    const lattice = pattern(c => {
        c.fillStyle = '#694a20'; c.fillRect(0, 0, 256, 256); c.strokeStyle = '#efb957'; c.lineWidth = 5;
        for (let x = -64; x < 320; x += 32) for (let y = -64; y < 320; y += 32) {
            c.beginPath(); c.moveTo(x, y + 16); c.lineTo(x + 16, y); c.lineTo(x + 32, y + 16); c.lineTo(x + 16, y + 32); c.closePath(); c.stroke();
        }
    });
    const ornament = material(0xffffff, { map: lattice, emissive: 0xd49a37, emissiveMap: lattice, emissiveIntensity: .5 });
    function sign(parent, text, size, pos, bg = '#232a2d', fg = '#fff6a5') {
        const height = Math.max(64, Math.min(1024, Math.round(1024 * size[1] / size[0])));
        const fontSize = Math.floor(Math.min(height * .67, 940 / Math.max(1, text.length * .62)));
        const texture = Tex.sign(text, { w: 1024, h: height, bg, fg, font: `bold ${fontSize}px "Segoe UI", sans-serif` });
        return box(parent, size, pos, material(0xffffff, { map: texture, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: .35 }), text);
    }
    // Bright, low check-in hall with warm timber walls and continuous white light bars.
    engine.ground(360, engine.mats.tarmac, -.12);
    box(root, [90, .12, 60], [0, -.06, 0], floor, 'polished-terminal-floor');
    box(root, [90, 8.6, .4], [0, 4.3, -30], wood);
    box(root, [90, .3, 60], [0, 8.8, 0], wood);
    const slats = [], lights = [];
    for (let x = -44; x <= 44; x += 1.2) slats.push([x, 8.61, 0]);
    for (let x = -42; x <= 42; x += 5.25) lights.push([x, 8.4, 0]);
    instances(root, new THREE.BoxGeometry(.045, .05, 60), dark, slats);
    instances(root, new THREE.BoxGeometry(.22, .16, 59), glow, lights);
    for (const z of [-29.6, 29.6]) box(root, [90, .24, .45], [0, 6.6, z], silver);
    for (const x of [-44.8, 44.8]) box(root, [.15, 8.5, 60], [x, 4.25, 0], glass);
    box(root, [90, 8.5, .12], [0, 4.25, 29.8], glass);
    const mullions = [];
    for (let z = -28; z <= 28; z += 4) for (const x of [-44.8, 44.8]) mullions.push([x, 4.3, z]);
    for (let x = -44; x <= 44; x += 4) mullions.push([x, 4.3, 29.8]);
    instances(root, new THREE.BoxGeometry(.14, 8.6, .14), silver, mullions);
    box(root, [57, 1.25, .4], [-13, 5.8, -27], dark);
    sign(root, 'SOEKARNO–HATTA  /  TERMINAL 1C', [24, 1, .12], [-15, 7.55, -29.7]);
    const counters = new THREE.Group(); counters.name = 'check-in-counters'; root.add(counters);
    const staffSpots = [], seatSpots = [];
    // First desk deliberately stays at the existing mission coordinate.
    for (const [i, x] of [-24, -32, -16, -8, 0, 8].entries()) {
        const desk = new THREE.Group(); desk.position.set(x, 0, -24); counters.add(desk);
        box(desk, [4.2, .85, 1.3], [0, .8, 0], woven);
        box(desk, [4.3, .38, 1.45], [0, 1.4, 0], dark);
        box(desk, [4.3, .06, 1.5], [0, 1.62, 0], chrome);
        box(desk, [.7, .5, .1], [.8, 1.95, 0], black);
        box(desk, [.1, .4, .1], [.8, 1.65, 0], chrome);
        box(desk, [.6, .04, .24], [.75, 1.67, .5], black);
        box(desk, [.3, .22, .32], [-1.4, 1.75, .1], silver);
        box(root, [.42, 4.5, .48], [x - 3.8, 2.25, -27], silver);
        box(root, [8.1, .25, .7], [x, 4.5, -27], silver);
        box(desk, [1.3, .45, 3.4], [2.8, .25, -.5], silver);
        box(desk, [1.05, .04, 3.3], [2.8, .5, -.5], black);
        sign(root, `${31 + i}`, [1, .95, .12], [x - 1.8, 5.8, -26.7], '#252c30', '#ffffff');
        sign(root, 'CHECK-IN', [2.6, .95, .12], [x + .5, 5.8, -26.7], '#77b587', '#ffffff');
        const vent = new THREE.Mesh(new THREE.TorusGeometry(.29, .08, 8, 20), dark); vent.position.set(x, 7.25, -29.72); root.add(vent);
        for (const px of [x - 1.7, x + 1.7]) box(desk, [.08, .45, .08], [px, .23, 0], chrome);
        engine.addBlocker(x - 2.2, -24.8, x + 2.2, -23.2);
        engine.addBlocker(x + 2.15, -26.2, x + 3.45, -22.7);
        staffSpots.push({ x, z: -25.3, ry: 0, color: 0x668246 });
    }
    function queue(x1, x2, z) {
        const points = []; for (let x = x1; x <= x2; x += 3) points.push([x, .5, z]);
        instances(root, new THREE.CylinderGeometry(.045, .045, 1, 8), chrome, points);
        instances(root, new THREE.CylinderGeometry(.18, .22, .05, 12), chrome, points.map(p => [p[0], .025, p[2]]));
        box(root, [x2 - x1, .12, .025], [(x1 + x2) / 2, .91, z], blue);
        engine.addBlocker(x1 - .12, z - .1, x2 + .12, z + .1);
    }
    for (const z of [-17, -13, -9]) { queue(-39, -27, z); queue(-21, 9, z); }
    sign(root, '↑  CHECK-IN     |     PEMERIKSAAN TIKET  →', [16, 1.2, .2], [-12, 5.5, -5]);

    function checkpoint(x, z, lanes, name) {
        const bank = new THREE.Group(); bank.name = name; bank.position.set(x, 0, z); bank.rotation.y = -Math.PI / 2; root.add(bank);
        // The scanner is first, providing a stable mission target before decoration is added.
        const scanner = box(bank, [.48, .35, .65], [.65, 1.1, .9], dark, 'boarding-pass-scanner');
        box(bank, [.4, .95, .55], [.65, .475, .9], silver);
        sign(bank, 'SCAN TIKET', [.42, .15, .02], [.65, 1.3, 1.23], '#1e5c48', '#ffffff');
        for (let i = 0; i <= lanes; i++) {
            const u = (i - lanes / 2) * 3.6;
            box(bank, [1.05, 4.4, 1.5], [u, 2.2, 0], silver);
            box(bank, [.82, 2.2, .08], [u, 1.35, .79], brown);
            box(bank, [.88, .8, .08], [u, 3.5, .8], dark);
            sign(bank, 'BOARDING PASS', [.82, .42, .04], [u, 3.52, .86], '#254990', '#f0faff');
            box(bank, [1.05, .08, 1.55], [u, .2, 0], chrome);
            engine.addBlocker(x - .8, z + u - .54, x + .8, z + u + .54);
        }
        box(bank, [lanes * 3.6 + 1.1, .85, 1.7], [0, 4.75, 0], silver);
        for (let i = 0; i < lanes; i++) {
            const u = (i - (lanes - 1) / 2) * 3.6;
            box(bank, [1.1, .7, .08], [u, 4.75, .88], ornament);
            box(bank, [1, .8, .08], [u - .63, .7, .25], glass);
            box(bank, [1, .8, .08], [u + .63, .7, .25], glass);
        }
        return { bank, scanner };
    }
    const immigration = checkpoint(25, -14, 5, 'ticket-checkpoint-reference');
    const imigrasi = new THREE.Group(); root.add(imigrasi);
    root.updateMatrixWorld(true); imigrasi.attach(immigration.scanner);
    const boarding = checkpoint(36, 18, 1, 'boarding-gate-reference');
    const gate = boarding.bank;
    for (const z of [-22, -18, -10, -6]) queue(13, 22, z);
    box(root, [26, .14, 28], [30, 8.55, -12], material(0xffffff, { map: triangles }));
    sign(root, 'PEMERIKSAAN TIKET   /   BOARDING PASS', [14, .9, .15], [22, 5.8, -25.5]);
    sign(root, 'GATE 12   /   KEBERANGKATAN', [13, .85, .15], [30, 5.7, 24]);
    for (const z of [-24, -4]) {
        box(root, [4, 1.05, 3.4], [27, 6.4, z], brown);
        for (let i = 0; i < 4; i++) {
            const vent = new THREE.Mesh(new THREE.TorusGeometry(.18, .065, 8, 16), dark);
            vent.rotation.y = -Math.PI / 2; vent.position.set(24.96, 6.4, z - 1.05 + i * .7); root.add(vent);
        }
    }
    // Coordinated lounge, courtyard planting, and apron beyond the glazing.
    for (const z of [8, 15, 22]) for (let x = -34; x < 15; x += 3) {
        box(root, [2.1, .12, .8], [x, .55, z], silver);
        box(root, [2.1, .7, .1], [x, .92, z - .4], silver);
        for (const dx of [-.8, .8]) box(root, [.07, .55, .6], [x + dx, .28, z], dark);
        engine.addBlocker(x - 1.1, z - .5, x + 1.1, z + .5);
        seatSpots.push({ x, z: z + .2, ry: 0 });
    }
    for (let x = -36; x <= 30; x += 11) {
        box(root, [6, .45, 3.5], [x, .15, 35], ivory);
        instances(root, new THREE.SphereGeometry(.85, 8, 6), material(0x48704a), [[x - 1.6, .85, 35], [x, .85, 35], [x + 1.6, .85, 35]]);
    }
    const plane = new THREE.Group(); plane.name = 'apron-aircraft'; plane.position.set(76, 4.5, 6); root.add(plane);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.8, 23, 6, 16), ivory); body.rotation.z = Math.PI / 2; plane.add(body);
    box(plane, [8, .2, 26], [-3, -.3, 0], silver);
    box(plane, [5, .15, 10], [-11, .4, 0], ivory);
    box(plane, [3.5, 5, .24], [-11, 2.4, 0], material(0x40774d));
    for (const z of [-5, 5]) { const jet = new THREE.Mesh(new THREE.CylinderGeometry(.85, .85, 3, 12), ivory); jet.rotation.z = Math.PI / 2; jet.position.set(-1, -1.2, z); plane.add(jet); }
    engine.addWalkRect(-43, -22, 43, 27);
    engine.addWalkRect(-43, -28, 43, -18);
    engine.addPointLamp(-20, 7, -12, { intensity: 110, distance: 55 });
    engine.addPointLamp(22, 7, 4, { intensity: 110, distance: 55 });
    root.updateMatrixWorld(true);
    return { counters, imigrasi, gate, plane, seatSpots, staffSpots };
}

import * as THREE from 'three';
import { addHaramFacilities, addGateFacade, addPrayerCarpet, tileMaterial } from './haram-facilities.js';

// Architectural interpretation of the supplied exterior/interior references.
// The compressed teaching map keeps the Kaaba and ritual destinations in place.
export function buildHaramArchitecture(engine) {
    const root = new THREE.Group();
    root.name = 'haram-reference-architecture';
    engine.scene.add(root);
    // Broad floodlight fill without dozens of per-lantern shadow lights in VR.
    const sanctuaryFill = new THREE.HemisphereLight(0xffefd5, 0xaab5c5, .85);
    sanctuaryFill.name = 'haram-floodlight-fill'; root.add(sanctuaryFill);
    const stone = new THREE.MeshStandardMaterial({ color: 0xe8e2d5, roughness: .64, emissive: 0xc9bda4, emissiveIntensity: .06 });
    const marble = new THREE.MeshStandardMaterial({ color: 0xf5f2eb, roughness: .28, metalness: .04, emissive: 0xd4d3c6, emissiveIntensity: .04 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x20272b, roughness: .32 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xb59048, roughness: .3, metalness: .65, emissive: 0x96651f, emissiveIntensity: .3 });
    const light = new THREE.MeshBasicMaterial({ color: 0xffe6ab, toneMapped: false });
    const whiteLight = new THREE.MeshBasicMaterial({ color: 0xfff4df, toneMapped: false });
    const shadow = new THREE.MeshStandardMaterial({ color: 0x443f36, roughness: .9 });
    const carpet = new THREE.MeshStandardMaterial({ color: 0x8a9b7b, roughness: 1, map: ornamentTexture('carpet'), emissive: 0x657257, emissiveIntensity: 0 });
    const lattice = new THREE.MeshStandardMaterial({ map: ornamentTexture('lattice'), color: 0xeae3d2, roughness: .8, emissive: 0x8e8164, emissiveIntensity: .2 });
    const box = new THREE.BoxGeometry(1, 1, 1);
    const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
    const lanternBody = new THREE.CylinderGeometry(1, 1, 1, 8);
    const dome = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const batches = new Map(), dummy = new THREE.Object3D();
    function put(geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, yaw = 0) {
        const key = `${geo.uuid}/${mat.uuid}`;
        if (!batches.has(key)) batches.set(key, { geo, mat, matrices: [] });
        dummy.position.set(x, y, z); dummy.rotation.set(0, yaw, 0); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
        batches.get(key).matrices.push(dummy.matrix.clone());
    }
    // Eight gently turning wings read as one continuous enclosure from eye level.
    const radius = 78, depth = 25, bays = 8;
    const length = 2 * radius * Math.tan(Math.PI / 8), bay = length / bays;
    const arch = archSpandrel(bay, 8.8, 4.9);
    const upperArch = archSpandrel(bay, 6, 2.5);
    for (let wing = 0; wing < 8; wing++) {
        const angle = wing * Math.PI / 4, c = Math.cos(angle), s = Math.sin(angle);
        const world = (x, z) => [x * c + z * s, -x * s + z * c];
        const local = (geo, mat, x, y, z, sx, sy, sz, turn = 0) => {
            const [wx, wz] = world(x, z); put(geo, mat, wx, y, wz, sx, sy, sz, angle + turn);
        };
        // Wedges meet along radial edges, without dark overlapping corner boxes.
        const outerLength = length * (radius + depth) / radius;
        const floorShape = new THREE.Shape();
        floorShape.moveTo(-length / 2, -radius); floorShape.lineTo(length / 2, -radius);
        floorShape.lineTo(outerLength / 2, -radius - depth); floorShape.lineTo(-outerLength / 2, -radius - depth); floorShape.closePath();
        const slab = new THREE.ShapeGeometry(floorShape);
        slab.rotateX(Math.PI / 2);
        // Shape y becomes world z; normals face upward after reversing.
        slab.rotateZ(Math.PI);
        const floorMesh = new THREE.Mesh(slab, tileMaterial());
        floorMesh.rotation.y = angle; floorMesh.position.y = .025; root.add(floorMesh);
        // Matching wedge roofs close the corners between adjacent galleries.
        for (const y of [9, 16]) {
            const roofShape = floorShape.clone();
            if (wing === 0 && y === 9) {
                const hole = new THREE.Path();
                hole.moveTo(-5, -99); hole.lineTo(5, -99); hole.lineTo(5, -81); hole.lineTo(-5, -81); hole.closePath();
                roofShape.holes.push(hole);
            }
            const roofGeometry = new THREE.ExtrudeGeometry(roofShape, { depth: .65, bevelEnabled: false });
            roofGeometry.rotateX(Math.PI / 2); roofGeometry.rotateZ(Math.PI);
            const roof = new THREE.Mesh(roofGeometry, stone);
            roof.rotation.y = angle; roof.position.y = y; root.add(roof);
        }
        addPrayerCarpet(root, angle, radius, depth, length);
        addGateFacade(engine, root, angle, outerLength);
        for (const z of [-radius, -radius - depth]) {
            local(box, marble, 0, 9.05, z, z === -radius ? length : outerLength, .45, 1.2);
            local(box, gold, 0, 9.45, z, z === -radius ? length : outerLength, .12, 1.3);
            local(box, marble, 0, 16.8, z, z === -radius ? length : outerLength, 1.25, 1.2);
            local(box, whiteLight, 0, 17.5, z, z === -radius ? length : outerLength, .18, 1.3);
        }
        for (let b = 0; b < bays; b++) {
            const x = -length / 2 + (b + .5) * bay;
            for (const z of [-radius, -radius - 12, -radius - 24]) {
                if (z === -radius - 24 && (Math.abs(x) < 6 || Math.abs(x) > 25)) continue;
                local(arch, stone, x, 0, z, 1, 1, 1);
                // White nested arch mouldings, gold geometric panels and lit pendants.
                local(archTrim(bay - 1.35, 4.9), marble, x, 0, z + .42, 1, 1, 1);
                local(box, lattice, x, 8.2, z + .48, bay - .55, .6, .08);
                local(cylinder, gold, x, 7.15, z + 2.5, .035, 2, .035);
                local(lanternBody, light, x, 5.7, z + 2.5, .27, .95, .27);
                local(lanternBody, gold, x, 6.22, z + 2.5, .38, .14, .38);
                local(lanternBody, gold, x, 5.15, z + 2.5, .38, .16, .38);
                local(dome, gold, x, 6.3, z + 2.5, .38, .4, .38);
                for (let bar = 0; bar < 4; bar++) {
                    const a = bar * Math.PI / 2;
                    local(cylinder, gold, x + Math.cos(a) * .28, 5.7, z + 2.5 + Math.sin(a) * .28, .025, 1, .025);
                }
            }
            local(upperArch, stone, x, 10, -radius, 1, 1, 1);
            local(box, lattice, x, 10.5, -radius + .45, bay - 1.3, 1, .12);
            // Coffered ceiling: relief frames, rosettes and inset warm lighting.
            for (const z of [-radius - 6, -radius - 18]) {
                if (wing === 0 && Math.abs(x) < bay) continue;
                local(box, shadow, x, 8.91, z, bay - 1, .06, 8.8);
                local(box, lattice, x, 8.84, z, bay - 1.3, .08, 8.5);
                local(box, gold, x, 8.73, z - 4.3, bay - .8, .12, .12);
                local(box, gold, x, 8.73, z + 4.3, bay - .8, .12, .12);
                local(cylinder, gold, x, 8.65, z, 1.05, .18, 1.05);
                local(cylinder, light, x, 8.53, z, .72, .06, .72);

                local(box, marble, x - bay / 2, 8.7, z, .32, .35, 12);
            }
            local(dome, marble, x, 16.65, -radius - 12, 2.6, 1.7, 2.6);
        }
        for (let p = 0; p <= bays; p++) {
            const x = -length / 2 + p * bay;
            for (const z of [-radius, -radius - 12, -radius - 24]) {
                if (z === -radius - 24 && (Math.abs(x) < 6 || (Math.abs(x) > 25 && Math.abs(x) < 31))) continue;
                if (wing === 0 && Math.abs(x) < .1) continue;
                local(box, dark, x, .3, z, 1.35, .6, 1.35);
                local(cylinder, marble, x, 2.65, z, .45, 4.1, .45);
                local(cylinder, gold, x, 4.58, z, .51, .13, .51);
                local(cylinder, marble, x, 4.85, z, .65, .4, .65);
                local(box, marble, x, 5.2, z, 1.2, .4, 1.2);
                local(box, lattice, x, 5.85, z + .51, .85, .85, .08);
                const [wx, wz] = world(x, z);
                engine.addBlocker(wx - .68, wz - .68, wx + .68, wz + .68);
            }
            local(cylinder, marble, x, 12, -radius, .35, 4, .35);
            local(box, marble, x, 17.8, -radius, .55, .55, 1.25);
        }
        // Walkable interior joins the mataf; outside portals remain open to the route.
    }
    engine.addWalkCircle(0, 0, 112, 0);
    // Tall, tiered ivory minarets with luminous balconies and slender finials.
    for (const angle of [-Math.PI / 4, 0, Math.PI / 4, 3 * Math.PI / 4, Math.PI, 5 * Math.PI / 4]) {
        const x = Math.sin(angle) * 110, z = -Math.cos(angle) * 110;
        put(box, stone, x, 7, z, 4, 14, 4);
        put(cylinder, marble, x, 28, z, 1.5, 31, 1.5);
        put(cylinder, marble, x, 49, z, 1.05, 12, 1.05);
        put(cylinder, marble, x, 59, z, .7, 8, .7);
        for (const [y, r] of [[15, 2.2], [43, 2], [55, 1.6], [63, 1.1]]) {
            put(cylinder, gold, x, y, z, r, .35, r);
            put(cylinder, whiteLight, x, y + .45, z, r, .5, r);
            for (let i = 0; i < 12; i++) {
                const a = i * Math.PI / 6;
                put(cylinder, marble, x + Math.cos(a) * r, y + 1.1, z + Math.sin(a) * r, .09, 1, .09);
            }
        }
        put(dome, gold, x, 64, z, 1, 2, 1);
        put(cylinder, gold, x, 67, z, .08, 3, .08);
        const crescent = new THREE.TorusGeometry(.55, .1, 6, 16, Math.PI * 1.5);
        put(crescent, light, x, 68.5, z);
    }
    for (const { geo, mat, matrices } of batches.values()) {
        const instances = new THREE.InstancedMesh(geo, mat, matrices.length);
        matrices.forEach((matrix, i) => instances.setMatrixAt(i, matrix));
        instances.receiveShadow = true;
        instances.computeBoundingSphere(); root.add(instances);
    }
    addHaramFacilities(engine, root);
    return root;
}

function archSpandrel(width, height, spring) {
    const opening = width - 1.35, half = opening / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, spring); shape.lineTo(-half, spring);
    shape.quadraticCurveTo(-half, spring + 1.7, 0, spring + 3.05);
    shape.quadraticCurveTo(half, spring + 1.7, half, spring);
    shape.lineTo(width / 2, spring); shape.lineTo(width / 2, height);
    shape.lineTo(-width / 2, height); shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: .75, bevelEnabled: false, curveSegments: 10 });
}

const trims = new Map();
function archTrim(width, spring) {
    const key = `${width}/${spring}`;
    if (trims.has(key)) return trims.get(key);
    const curve = new THREE.CurvePath();
    curve.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-width / 2, spring, 0), new THREE.Vector3(-width / 2, spring + 1.7, 0), new THREE.Vector3(0, spring + 3.05, 0)));
    curve.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, spring + 3.05, 0), new THREE.Vector3(width / 2, spring + 1.7, 0), new THREE.Vector3(width / 2, spring, 0)));
    const geo = new THREE.TubeGeometry(curve, 24, .12, 5, false); trims.set(key, geo); return geo;
}

function ornamentTexture(kind) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = kind === 'carpet' ? '#819174' : '#d9d0bb'; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = kind === 'carpet' ? '#d0c69a' : '#645c49'; ctx.lineWidth = 2;
    for (let y = 0; y <= 256; y += 32) for (let x = 0; x <= 256; x += 32) {
        for (const turn of [0, Math.PI / 4]) {
            ctx.save(); ctx.translate(x, y); ctx.rotate(turn); ctx.strokeRect(-10, -10, 20, 20); ctx.restore();
        }
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.stroke();
    }
    if (kind === 'carpet') { ctx.lineWidth = 5; ctx.strokeRect(8, 8, 240, 240); ctx.lineWidth = 2; ctx.strokeRect(15, 15, 226, 226); }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4; return texture;
}

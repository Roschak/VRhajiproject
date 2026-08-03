const fs = require('fs');
const path = require('path');

const filePath = path.join('C:', 'VRhajiproject', 'src', 'VRHaji.Web', 'wwwroot', 'js', 'vr', 'builders.js');
let code = fs.readFileSync(filePath, 'utf8');

const orig_merlon = `        for (let m = 0; m < NUM_BAYS; m++) {
            const mx = -SIDE / 2 + BAY_W * (m + 0.5);
            g.add(mesh(new THREE.BoxGeometry(BAY_W * 0.5, 1.6, WALL_D + 0.6), creamMat, mx, TOTAL_H + 2.1, WALL_D / 2, { cast: false }));
        }`;
const new_merlon = `        // OPTIMASI: InstancedMesh untuk merlon arcade
        const merlonGeo = new THREE.BoxGeometry(BAY_W * 0.5, 1.6, WALL_D + 0.6);
        const merlonIm = new THREE.InstancedMesh(merlonGeo, creamMat, NUM_BAYS);
        merlonIm.castShadow = false;
        const merlonDummy = new THREE.Object3D();
        for (let m = 0; m < NUM_BAYS; m++) {
            const mx = -SIDE / 2 + BAY_W * (m + 0.5);
            merlonDummy.position.set(mx, TOTAL_H + 2.1, WALL_D / 2);
            merlonDummy.updateMatrix();
            merlonIm.setMatrixAt(m, merlonDummy.matrix);
        }
        g.add(merlonIm);`;
code = code.replace(orig_merlon, new_merlon);

const orig_canopy = `    // Tenda peneduh putih meruncing berderet di tepi pelataran (seperti foto)
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xf6f3ea, roughness: 0.85, side: THREE.DoubleSide });
    const CANOPY_R = 74;
    for (let side = 0; side < 4; side++) {
        const ang = side * Math.PI / 2;
        for (let t = -6; t <= 6; t++) {
            const lx = t * 11;
            if (Math.abs(lx) > SIDE / 2 - 10) continue;
            const c = new THREE.Group();
            c.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.4, 8), mats.grey, 0, 2.2, 0, { cast: false }));
            c.add(mesh(new THREE.ConeGeometry(3.4, 2.7, 4), canopyMat, 0, 5.7, 0, { cast: false }));
            c.position.copy(new THREE.Vector3(lx, 0, -CANOPY_R).applyAxisAngle(new THREE.Vector3(0, 1, 0), ang));
            c.rotation.y = ang + Math.PI / 4;
            scene.add(c);
        }
    }`;
const new_canopy = `    // OPTIMASI: InstancedMesh tenda peneduh
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xf6f3ea, roughness: 0.85, side: THREE.DoubleSide });
    const CANOPY_R = 74;
    const canPoleGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.4, 8);
    const canConeGeo = new THREE.ConeGeometry(3.4, 2.7, 4);
    const canDummy = new THREE.Object3D();
    const canPoleIm = new THREE.InstancedMesh(canPoleGeo, mats.grey, 52);
    const canConeIm = new THREE.InstancedMesh(canConeGeo, canopyMat, 52);
    canPoleIm.castShadow = false; canConeIm.castShadow = false;
    
    let canIdx = 0;
    for (let side = 0; side < 4; side++) {
        const ang = side * Math.PI / 2;
        for (let t = -6; t <= 6; t++) {
            const lx = t * 11;
            if (Math.abs(lx) > SIDE / 2 - 10) continue;
            
            canDummy.position.copy(new THREE.Vector3(lx, 0, -CANOPY_R).applyAxisAngle(new THREE.Vector3(0, 1, 0), ang));
            canDummy.rotation.set(0, ang + Math.PI / 4, 0);
            canDummy.updateMatrix();
            
            // local translations applied via matrix multiplication
            const poleM = new THREE.Matrix4().multiplyMatrices(canDummy.matrix, new THREE.Matrix4().makeTranslation(0, 2.2, 0));
            const coneM = new THREE.Matrix4().multiplyMatrices(canDummy.matrix, new THREE.Matrix4().makeTranslation(0, 5.7, 0));
            
            canPoleIm.setMatrixAt(canIdx, poleM);
            canConeIm.setMatrixAt(canIdx, coneM);
            canIdx++;
        }
    }
    scene.add(canPoleIm, canConeIm);`;
code = code.replace(orig_canopy, new_canopy);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Props optimization applied');

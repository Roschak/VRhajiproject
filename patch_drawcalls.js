const fs = require('fs');
const path = require('path');

const filePath = path.join('C:', 'VRhajiproject', 'src', 'VRHaji.Web', 'wwwroot', 'js', 'vr', 'builders.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Optimize Clock Tower Windows
const orig_clock = `    for(let wy = 15; wy < 130; wy += 4.5) {
        for(let wx = -TW/2 + 3; wx <= TW/2 - 3; wx += 4) {
            clockTowerMain.add(mesh(new THREE.BoxGeometry(1.5, 2.5, 0.2), hotelWinMat, wx, wy, TW/2 + 0.05));
            clockTowerMain.add(mesh(new THREE.BoxGeometry(1.5, 2.5, 0.2), hotelWinMat, wx, wy, -TW/2 - 0.05));
        }
        for(let wz = -TW/2 + 3; wz <= TW/2 - 3; wz += 4) {
            clockTowerMain.add(mesh(new THREE.BoxGeometry(0.2, 2.5, 1.5), hotelWinMat, TW/2 + 0.05, wy, wz));
            clockTowerMain.add(mesh(new THREE.BoxGeometry(0.2, 2.5, 1.5), hotelWinMat, -TW/2 - 0.05, wy, wz));
        }
    }`;
const new_clock = `    // OPTIMASI: InstancedMesh untuk menghilangkan ~900 draw calls pada jendela menara jam
    const ctGeoZ = new THREE.BoxGeometry(1.5, 2.5, 0.2);
    const ctGeoX = new THREE.BoxGeometry(0.2, 2.5, 1.5);
    const ctDummy = new THREE.Object3D();
    
    let ctCountZ = 0, ctCountX = 0;
    for(let wy = 15; wy < 130; wy += 4.5) {
        for(let wx = -TW/2 + 3; wx <= TW/2 - 3; wx += 4) ctCountZ += 2;
        for(let wz = -TW/2 + 3; wz <= TW/2 - 3; wz += 4) ctCountX += 2;
    }
    
    const ctImZ = new THREE.InstancedMesh(ctGeoZ, hotelWinMat, ctCountZ);
    const ctImX = new THREE.InstancedMesh(ctGeoX, hotelWinMat, ctCountX);
    ctImZ.castShadow = false; ctImX.castShadow = false;
    ctImZ.receiveShadow = false; ctImX.receiveShadow = false;
    
    let ctIZ = 0, ctIX = 0;
    for(let wy = 15; wy < 130; wy += 4.5) {
        for(let wx = -TW/2 + 3; wx <= TW/2 - 3; wx += 4) {
            ctDummy.position.set(wx, wy, TW/2 + 0.05); ctDummy.updateMatrix(); ctImZ.setMatrixAt(ctIZ++, ctDummy.matrix);
            ctDummy.position.set(wx, wy, -TW/2 - 0.05); ctDummy.updateMatrix(); ctImZ.setMatrixAt(ctIZ++, ctDummy.matrix);
        }
        for(let wz = -TW/2 + 3; wz <= TW/2 - 3; wz += 4) {
            ctDummy.position.set(TW/2 + 0.05, wy, wz); ctDummy.updateMatrix(); ctImX.setMatrixAt(ctIX++, ctDummy.matrix);
            ctDummy.position.set(-TW/2 - 0.05, wy, wz); ctDummy.updateMatrix(); ctImX.setMatrixAt(ctIX++, ctDummy.matrix);
        }
    }
    clockTowerMain.add(ctImZ, ctImX);`;
code = code.replace(orig_clock, new_clock);

// 2. Optimize Hotel Towers Windows
const orig_hotel = `        // Jendela bercahaya malam
        for(let wy = 15; wy < h - 10; wy += 4.5) {
            for(let wx = -w/2 + 2; wx <= w/2 - 2; wx += 3.5) {
                bld.add(mesh(new THREE.BoxGeometry(1.2, 2.5, 0.2), hotelWinMat, wx, wy, d/2 + 0.05));
                bld.add(mesh(new THREE.BoxGeometry(1.2, 2.5, 0.2), hotelWinMat, wx, wy, -d/2 - 0.05));
            }
            for(let wz = -d/2 + 2; wz <= d/2 - 2; wz += 3.5) {
                bld.add(mesh(new THREE.BoxGeometry(0.2, 2.5, 1.2), hotelWinMat, w/2 + 0.05, wy, wz));
                bld.add(mesh(new THREE.BoxGeometry(0.2, 2.5, 1.2), hotelWinMat, -w/2 - 0.05, wy, wz));
            }
        }`;
const new_hotel = `        // OPTIMASI: InstancedMesh untuk menghilangkan ~15.000 draw calls pada jendela hotel
        const winGeoZ = new THREE.BoxGeometry(1.2, 2.5, 0.2);
        const winGeoX = new THREE.BoxGeometry(0.2, 2.5, 1.2);
        const dummy = new THREE.Object3D();
        
        let cZ = 0, cX = 0;
        for(let wy = 15; wy < h - 10; wy += 4.5) {
            for(let wx = -w/2 + 2; wx <= w/2 - 2; wx += 3.5) cZ += 2;
            for(let wz = -d/2 + 2; wz <= d/2 - 2; wz += 3.5) cX += 2;
        }
        
        if (cZ > 0 || cX > 0) {
            const imZ = new THREE.InstancedMesh(winGeoZ, hotelWinMat, cZ);
            const imX = new THREE.InstancedMesh(winGeoX, hotelWinMat, cX);
            imZ.castShadow = false; imX.castShadow = false;
            imZ.receiveShadow = false; imX.receiveShadow = false;
            
            let iZ = 0, iX = 0;
            for(let wy = 15; wy < h - 10; wy += 4.5) {
                for(let wx = -w/2 + 2; wx <= w/2 - 2; wx += 3.5) {
                    dummy.position.set(wx, wy, d/2 + 0.05); dummy.updateMatrix(); imZ.setMatrixAt(iZ++, dummy.matrix);
                    dummy.position.set(wx, wy, -d/2 - 0.05); dummy.updateMatrix(); imZ.setMatrixAt(iZ++, dummy.matrix);
                }
                for(let wz = -d/2 + 2; wz <= d/2 - 2; wz += 3.5) {
                    dummy.position.set(w/2 + 0.05, wy, wz); dummy.updateMatrix(); imX.setMatrixAt(iX++, dummy.matrix);
                    dummy.position.set(-w/2 - 0.05, wy, wz); dummy.updateMatrix(); imX.setMatrixAt(iX++, dummy.matrix);
                }
            }
            bld.add(imZ, imX);
        }`;
code = code.replace(orig_hotel, new_hotel);

// 3. Optimize 4 huge point lights
const orig_lights = `    // Lampu sorot mataf (malam)
    if (engine.envPreset === 'night' || engine.envPreset === 'dawn') {
        for (const [lx, lz] of [[-40, -40], [40, -40], [-40, 40], [40, 40]]) {
            engine.addPointLamp(lx, 18, lz, { intensity: 160, distance: 130 });
        }
        engine.addPointLamp(0, 22, 0, { color: 0xfff6dd, intensity: 200, distance: 90 });
    }`;
const new_lights = `    // Lampu sorot mataf (malam)
    if (engine.envPreset === 'night' || engine.envPreset === 'dawn') {
        // OPTIMASI: Hanya 1 point light. 5 Point lights * ratusan karakter = GPU hang.
        engine.addPointLamp(0, 22, 0, { color: 0xfff6dd, intensity: 300, distance: 150 });
    }`;
code = code.replace(orig_lights, new_lights);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Optimizations applied successfully via node!');

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM();
global.window = window;
global.document = window.document;
global.FileReader = window.FileReader;

const scene = new THREE.Scene();
const L = 34, W = 1.9;

const tubeGeo = new THREE.CylinderGeometry(W, W, L, 32);
tubeGeo.rotateZ(Math.PI / 2);
const tubeMat = new THREE.MeshStandardMaterial({ color: 0xfdfdfd, side: THREE.DoubleSide });
const tube = new THREE.Mesh(tubeGeo, tubeMat);
scene.add(tube);

const floor = new THREE.Mesh(new THREE.BoxGeometry(L, 0.1, W * 2), new THREE.MeshStandardMaterial({ color: 0x1f232b }));
floor.position.y = -0.8;
scene.add(floor);

const seatMat = new THREE.MeshStandardMaterial({ color: 0x888b8d });
const screenMat = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0x1a3344 });

// seats
for(let row = 0; row < 20; row++) {
    for (const sz of [-1.1, -0.6, 0.6, 1.1]) {
        const sx = -10 + row * 1.2;
        const seatGroup = new THREE.Group();
        seatGroup.position.set(sx, -0.4, sz);
        
        // cushion
        const cush = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.15, 0.45), seatMat);
        seatGroup.add(cush);
        
        // backrest
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.45), seatMat);
        back.position.set(-0.2, 0.4, 0);
        back.rotation.z = -0.15;
        seatGroup.add(back);

        // screen
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.3), screenMat);
        screen.position.set(-0.25, 0.5, 0);
        screen.rotation.z = -0.15;
        seatGroup.add(screen);

        scene.add(seatGroup);
    }
}

// Cockpit
const cockpitX = L / 2 - 3.5;
const wall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.0, W*2.1), tubeMat);
wall.position.set(cockpitX, 1.5, 0);
scene.add(wall);

const dash = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 2.0), new THREE.MeshStandardMaterial({ color: 0x111111 }));
dash.position.set(cockpitX + 2.0, 0.7, 0); 
dash.rotation.z = -0.3;
scene.add(dash);

const exporter = new GLTFExporter();
exporter.parse(
    scene,
    function (gltf) {
        fs.writeFileSync('src/VRHaji.Web/wwwroot/assets/pesawat/pesawat_interior.gltf', JSON.stringify(gltf, null, 2));
        console.log('Saved pesawat_interior.glb');
    },
    function (error) {
        console.error(error);
    },
    { binary: false }
);

import {createCarInterior} from './car-interior.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const assets = new Map();
function loadVehicle(kind) {
    if (!assets.has(kind)) assets.set(kind, new GLTFLoader().loadAsync(`/assets/vehicles/${kind}.glb?v=jakarta-2`).then(({scene}) => scene).catch(error => {
        assets.delete(kind); throw error;
    }));
    return assets.get(kind);
}
export const CAR_SEAT = Object.freeze({x:-.43, y:1.05, z:.18, yaw:0, bodyY:-.43});
export function enterPrivateCar(engine, car) {
    engine.vehicleSeat = {...CAR_SEAT, car};
    engine.locomotionLocked = true;
    const p = car.localToWorld(new THREE.Vector3(CAR_SEAT.x, CAR_SEAT.y, CAR_SEAT.z));
    engine.spawn(p.x, p.z, CAR_SEAT.yaw, p.y);
    if(engine.renderer.xr.isPresenting){
        engine.dolly.position.y += p.y-engine.playerPos(new THREE.Vector3()).y;
        engine.dolly.updateMatrixWorld(true);
    }
}
export function leavePrivateCar(engine) { delete engine.vehicleSeat; }

export function createPrivateVehicle(kind = 'shc-sedan') {
    const group = new THREE.Group();
    group.name = `private-${kind}`;
    group.userData.assetStatus = 'loading';
    group.userData.ready = loadVehicle(kind).then(template => {
        const visual = template.clone(true);
        visual.name = 'imported-vehicle-visual';
        visual.traverse(object => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });
        group.add(visual);
        if(kind==='aventador'||kind==='shc-sedan'){
            const cabin=createCarInterior();
            if(kind==='shc-sedan'){cabin.position.set(0,.16,.06);cabin.scale.set(.94,1,.95);}
            group.add(cabin);
            visual.traverse(o=>{if(!o.isMesh)return;const materials=Array.isArray(o.material)?o.material:[o.material];o.material=materials.map(m=>{if(!/main.?glass|windshield|window/i.test(m.name))return m;const glass=m.clone();glass.transparent=true;glass.opacity=.16;glass.depthWrite=false;return glass;});if(o.material.length===1)o.material=o.material[0];});
        }
        group.userData.assetStatus = 'ready';
        return group;
    }).catch(error => {
        group.userData.assetStatus = 'error';
        console.error('Could not load private vehicle', error);
        return group;
    });
    return group;
}

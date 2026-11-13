import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// The supplied model points along -Z, with its fuselage upright after glTF transforms.
export function createAirportAircraft(kind = 'boeing') {
    const aircraft = new THREE.Group();
    aircraft.name = 'airport-aircraft';
    aircraft.userData.ready = new GLTFLoader().loadAsync(kind==='boeing'?'/assets/aircraft/boeing/scene.gltf':'/assets/aircraft/airbus.glb').then(({ scene }) => {
        scene.rotation.y = kind==='boeing'?0:-Math.PI/2;
        scene.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(scene);
        const size = bounds.getSize(new THREE.Vector3());
        scene.scale.setScalar((kind==='boeing'?39.5:46.7) / size.x);
        scene.updateMatrixWorld(true);
        const fitted=new THREE.Box3().setFromObject(scene);
        const center=fitted.getCenter(new THREE.Vector3());
        scene.position.set(-center.x,-fitted.min.y,-center.z);
        // Boeing front passenger door registered to the boarding landing (local 9,-.3,2.12).
        if(kind==='boeing')scene.position.add(new THREE.Vector3(-6.4,-3.8,.42));
        else scene.position.y-=4.5;
        aircraft.userData.kind=kind;
        scene.traverse(object => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });
        aircraft.add(scene);
        aircraft.userData.loaded = true;
        return scene;
    }).catch(error => {
        aircraft.userData.loadError = String(error);
        console.error('Gagal memuat model pesawat', error);
        return null;
    });
    return aircraft;
}

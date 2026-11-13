import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCharacter, releaseCharacter } from './hajj-character.js';
let active = null;
export async function mount(id, preferences) {
    dispose();
    const host = document.getElementById(id);
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e2dfd3');
    const camera = new THREE.PerspectiveCamera(32, 1, .01, 40);
    camera.position.set(.45,1.12,3.65);
    const renderer = new THREE.WebGLRenderer({antialias:true, alpha:false});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    host.replaceChildren(renderer.domElement);
    const status=document.createElement('p'); status.className='hub-model-status'; status.setAttribute('role','status'); host.append(status);
    const controls=new OrbitControls(camera,renderer.domElement);
    controls.target.set(0,.95,0); controls.enablePan=false; controls.minDistance=1.8; controls.maxDistance=6; controls.maxPolarAngle=Math.PI*.55; controls.enableDamping=true;
    scene.add(new THREE.HemisphereLight(0xfffbf4,0x6b7169,1.5));
    const sun=new THREE.DirectionalLight(0xfff8ee,2);sun.position.set(3,5,4);scene.add(sun);
    const rim=new THREE.DirectionalLight(0xffffff,1);rim.position.set(-3,3,-2);scene.add(rim);
    const stage=new THREE.Mesh(new THREE.CylinderGeometry(.67,.73,.08,64),new THREE.MeshStandardMaterial({color:0xbebbad,roughness:.8}));
    stage.position.y=-.045;scene.add(stage);
    const state={host,scene,camera,renderer,controls,status,character:null,gender:null,request:0,animation:'idle',disposed:false,preferences};
    active=state;
    const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
    state.observer=new ResizeObserver(resize);state.observer.observe(host);resize();
    let previous=performance.now();
    renderer.setAnimationLoop(()=>{const now=performance.now(),dt=Math.min((now-previous)/1000,.05);previous=now;state.character?.update(dt);controls.update();renderer.render(scene,camera);});
    await update(preferences);
}
export async function update(preferences) {
    const s=active;if(!s)return;
    s.preferences=preferences;
    if(s.character && s.gender===preferences.gender){s.request++;s.status.textContent='';s.character.apply(preferences);return;}
    const request=++s.request;
    s.status.textContent='Menyiapkan karakter…';
    try {
        const character=await createCharacter(preferences);
        if(s.disposed||request!==s.request){releaseCharacter(character);return;}
        if(s.character){s.scene.remove(s.character.root);releaseCharacter(s.character);}
        s.character=character;s.gender=preferences.gender;
        character.apply(s.preferences);character.play(s.animation);
        s.scene.add(character.root);s.status.textContent='';
        s.host.dataset.loaded=s.gender;
    } catch(error) {
        if(!s.disposed && request===s.request){s.status.textContent='Model belum dapat dimuat. Pilih karakter kembali untuk mencoba.';console.warn('Character preview:',error);}
    }
}
export function animate(name){if(active){active.animation=name;active.character?.play(name);}}
export function dispose(){
    const s=active;if(!s)return;active=null;s.disposed=true;s.request++;
    s.observer.disconnect();s.renderer.setAnimationLoop(null);s.controls.dispose();
    if(s.character){s.scene.remove(s.character.root);releaseCharacter(s.character);}
    s.scene.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});
    s.renderer.dispose();s.host.replaceChildren();
}

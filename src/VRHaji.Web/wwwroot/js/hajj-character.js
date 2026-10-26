import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { sanitize } from './game-preferences.js';
export async function createCharacter(preferences) {
    const p=sanitize(preferences);
    const assetVersion=p.gender==='man'?'ihram-fitted-20261025-v5':'female-wardrobe-reference-20261025-v3';
    const gltf=await new GLTFLoader().loadAsync('/assets/characters/'+p.gender+'.glb?v='+assetVersion);
    const model=gltf.scene, root=new THREE.Group();root.name='JemaahAvatar';root.add(model);
    model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model), size=bounds.getSize(new THREE.Vector3());
    const factor=1.78/Math.max(size.y,.01);model.scale.multiplyScalar(factor);
    model.position.x-=((bounds.min.x+bounds.max.x)/2)*factor;
    model.position.z-=((bounds.min.z+bounds.max.z)/2)*factor;
    model.position.y-=bounds.min.y*factor;
    const mixer=new THREE.AnimationMixer(model);let current=null;
    const materials=new Set();
    let hasGamisHijab=false;
    model.traverse(o=>{if(/^Hijab_Gamis/.test(o.name))hasGamisHijab=true;});
    model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.side=THREE.DoubleSide;materials.add(m);}}});
    const character={root,model,mixer,gender:p.gender,clips:gltf.animations,
        apply(value,ritual){
            const prefs=sanitize(value);
            const outfit=prefs.gender==='man'&&ritual?(ritual.ihram?'ihram':'robe'):prefs.outfit;
            const showTawaf=outfit==='ihram'&&(ritual?ritual.idtiba===true:true);
            root.userData.appearance={outfit,skinTone:prefs.skinTone,shaved:ritual?.shaved===true,gender:prefs.gender};
            model.traverse(o=>{
                if(/^Robe/.test(o.name))o.visible=outfit==='robe';
                if(/^Tunic/.test(o.name))o.visible=false;
                if(/^Abaya/.test(o.name))o.visible=outfit==='abaya';
                if(/^Ihram/.test(o.name))o.visible=outfit==='ihram';
                // Match the reference in the wardrobe preview; ordinary journey ihram covers both shoulders.
                if(/^Ihram_Rida_Tawaf/.test(o.name))o.visible=showTawaf;
                if(/^Ihram_Rida_Covered/.test(o.name))o.visible=outfit==='ihram'&&!showTawaf;
                if(/^Skin_IhramBody/.test(o.name))o.visible=prefs.gender==='man'&&outfit==='ihram';
                if(/^Skin_IhramBody_(RightArmTawaf|TorsoTawaf)/.test(o.name))o.visible=prefs.gender==='man'&&showTawaf;
                if(/^Skin_IhramBody_TorsoCovered/.test(o.name))o.visible=prefs.gender==='man'&&outfit==='ihram'&&!showTawaf;
                if(/^Hijab_Gamis/.test(o.name))o.visible=prefs.gender==='woman'&&outfit==='robe';
                else if(/^Hijab/.test(o.name))o.visible=prefs.gender==='woman'&&outfit!=='abaya'&&(outfit!=='robe'||!hasGamisHijab);
                if(/^Khimar/.test(o.name))o.visible=prefs.gender==='woman'&&outfit==='abaya';
                if(/^Beard/.test(o.name))o.visible=false;
            });
            const tone=new THREE.Color(prefs.skinTone),base=new THREE.Color('#e5bfa5');
            for(const m of materials){
                if(/^Skin_/.test(m.name)) {
                    if(m.map)m.color.setRGB(tone.r/base.r,tone.g/base.g,tone.b/base.b);
                    else m.color.copy(tone);
                }
                if(/^Hair_Scalp/.test(m.name))m.color.copy(prefs.gender==='woman'?new THREE.Color('#f1f0ec'):(ritual?.shaved? tone : new THREE.Color('#17130f')));
            }
        },
        play(name){
            const clip=gltf.animations.find(a=>a.name.toLowerCase().includes(name));
            if(!clip)return;
            const next=mixer.clipAction(clip);if(next===current)return;
            current?.fadeOut(.2);next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).fadeIn(.2).play();current=next;
            root.userData.motion=name;
        },
        update(dt){mixer.update(dt);},
    };
    character.apply(p);character.play('idle');return character;
}
export function releaseCharacter(character){
    character.mixer.stopAllAction();character.mixer.uncacheRoot(character.model);
    const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();
    character.root.traverse(o=>{if(o.skeleton)skeletons.add(o.skeleton);if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});
    for(const m of materials){for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();}
    for(const t of textures)t.dispose();for(const g of geometries)g.dispose();
    for(const s of skeletons)s.dispose();
}

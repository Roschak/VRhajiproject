import * as THREE from 'three';
import {nextAirportRoute} from './airport-wander.js';
import {poseStandingPrayer} from './standing-prayer.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createCharacter,releaseCharacter} from '../hajj-character.js';

// Shared across every journey area: the two supplied character references.
export const TRAVELLER_APPEARANCE = Object.freeze({
 man: Object.freeze({gender:'man',outfit:'ihram',skinTone:'#dca780'}),
 woman: Object.freeze({gender:'woman',outfit:'robe',skinTone:'#f1cfb4'})
});

// One pair of shared wardrobe assets per area; independent skeletons and animation phases.
export function realisticTravellers(local,spots,{animation=null,frozen=false,seated=false,walking=false,orbit=false,luggage=false,continuous=false,wander=null,praying=false,bagFactory}={}){
 const holder=new THREE.Group();holder.name='travellers-with-luggage';local.scene.add(holder);
 local.disposeCallbacks ||= [];
 if(!local.travellerTemplates){
  let closed=false;const loaded=[];
  local.travellerTemplates=Promise.all(['man','woman'].map(async gender=>{
   const appearance=TRAVELLER_APPEARANCE[gender],c=await createCharacter(appearance);
   c.apply(appearance,{ihram:true,idtiba:true});
   // Reference #2 has a full dark beard. Keep the alternative beard hidden.
   c.model.traverse(o=>{if(/^Beard/.test(o.name))o.visible=gender==='man'&&o.name==='BeardFull';});
   if(closed)releaseCharacter(c);else loaded.push(c);
   return c;
  }));
  local.disposeCallbacks.push(()=>{closed=true;for(const c of loaded)releaseCharacter(c);});
  // Shared buffers are released by the engine with the attached clones.
 }
 const agents=[],bags=[];let disposed=false;
 local.disposeCallbacks.push(()=>{disposed=true;for(const a of agents){a.mixer.stopAllAction();a.mixer.uncacheRoot(a.model);a.model.traverse(o=>o.skeleton?.dispose());}});
 local.travellerTemplates.then(templates=>{
  if(disposed)return;
  spots.forEach((p,i)=>{
   const template=templates[i%2],model=clone(template.model),root=new THREE.Group();root.name='realistic-pilgrim';root.userData.gender=template.gender;root.add(model);holder.add(root);
   root.userData.prayerArea=p.prayerArea;root.userData.activity=praying?'prayer':walking?'walking':'idle';
   root.userData.appearance={...TRAVELLER_APPEARANCE[template.gender]};
   if(praying){model.traverse(o=>{if(/^Ihram_Rida_Tawaf|^Skin_IhramBody_(RightArmTawaf|TorsoTawaf)/.test(o.name))o.visible=false;if(/^Ihram_Rida_Covered|^Skin_IhramBody_TorsoCovered/.test(o.name))o.visible=true;});}
   const hidden=[];model.traverse(o=>{if(o.isMesh){o.frustumCulled=true;if(!o.visible)hidden.push(o);}});hidden.forEach(o=>o.removeFromParent());
   root.position.set(p.x,(p.y||0)+(seated?-.43:0),p.z);root.rotation.y=p.ry||0;
   const mixer=new THREE.AnimationMixer(model),motion=animation||(walking||orbit||p.path?'walk':seated?'sit':'idle');
   const clip=template.clips.find(c=>c.name.toLowerCase().includes(motion))||template.clips.find(c=>c.name.toLowerCase().includes('idle'));
   const speed=.75+(i%7)*.06;let action=null;if(clip){action=mixer.clipAction(clip);action.play();action.time=(i*.37)%clip.duration;action.timeScale=speed;}
   if(praying){mixer.stopAllAction();poseStandingPrayer(model);}
   const idleClip=walking?template.clips.find(c=>/idle/i.test(c.name)):null;
   const idle=idleClip&&idleClip!==clip?mixer.clipAction(idleClip):null;
   if(idle)idle.setEffectiveWeight(0).play();
   const legs=[];if(seated&&!template.clips.some(c=>/sit/i.test(c.name)))model.traverse(o=>{if(o.isBone&&/upleg|thigh|leg|calf/i.test(o.name))legs.push(o);});
   const bag=luggage&&bagFactory?bagFactory([0x49616a,0x706157,0x303c4e][i%3]):null;
   if(bag){bag.position.set(.48,seated?.43:0,.25);if(seated)bag.scale.setScalar(.5);root.add(bag);bags.push(bag);}
   if(frozen)mixer.update(0);
   agents.push({root,model,mixer,legs,action,idle,speed,spot:p,target:p.target??0,direction:i%2?1:-1,offset:0,pause:0,phase:i*.67,angle:Math.atan2(p.z,p.x),radius:Math.hypot(p.x,p.z)});
  });
 }).catch(error=>console.error('Gagal memuat model jemaah',error));
 local.onUpdate((dt,t)=>{
  let routeBudget=1;
  for(const a of agents){
   const camera=local.camera,global=!local.camera||local.camera===(local.parentEngine||local).camera;
   const px=camera.position.x-(global?local.scene.position.x:0),pz=camera.position.z-(global?local.scene.position.z:0);
   const distance=Math.hypot(a.root.position.x-px,a.root.position.z-pz);
   a.root.visible=distance<110;
   a.elapsed=(a.elapsed||0)+Math.min(dt,.1);
   if(!frozen&&a.root.visible&&(distance<25||a.elapsed>.12)){a.mixer.update(a.elapsed);a.elapsed=0;}
   for(const bone of a.legs)bone.rotation.x=/upleg|thigh/i.test(bone.name)?-1.35:1.45;
   if(wander&&!a.spot.path){
    a.pause=Math.max(0,a.pause-dt);
    if(a.pause===0&&routeBudget>0){
     routeBudget--;
     const route=nextAirportRoute(local,a.root.position,wander);
     if(route.length){a.spot.path=route;a.target=1;}else a.pause=1;
    }
    if(a.action)a.action.setEffectiveWeight(a.spot.path?1:0);
    if(a.idle)a.idle.setEffectiveWeight(a.spot.path?0:1);
    if(!a.spot.path)continue;
   }
   if(a.spot.path){
    const path=a.spot.path,target=path[a.target],dx=target.x-a.root.position.x,dz=target.z-a.root.position.z;
    const distance=Math.hypot(dx,dz),step=Math.min(distance,Math.min(dt,.1)*a.speed);
    if(distance<.02){if(wander&&a.target===path.length-1){a.spot.path=null;a.pause=.3+Math.random()*1.7;}else a.target=(a.target+1)%path.length;continue;}
    const x=a.root.position.x+dx/distance*step,z=a.root.position.z+dz/distance*step;
    const e=local.parentEngine||local;
    if(e._walkableStatic(x+local.scene.position.x,z+local.scene.position.z,.2)){
     a.root.position.set(x,a.spot.y||0,z);
     const yaw=Math.atan2(dx,dz),delta=THREE.MathUtils.euclideanModulo(yaw-a.root.rotation.y+Math.PI,2*Math.PI)-Math.PI;
     a.root.rotation.y+=delta*Math.min(1,dt*6);
    }else if(wander){a.spot.path=null;a.pause=.5;}
   }
   else if(orbit){a.angle-=dt*a.speed/a.radius;a.root.position.set(Math.cos(a.angle)*a.radius,0,Math.sin(a.angle)*a.radius);a.root.rotation.y=Math.PI-a.angle;}
   else if(walking){
    const p=a.spot,axis=p.axis||'x',range=p.range||5;
    a.pause=Math.max(0,a.pause-dt);
    const v=THREE.MathUtils.clamp(a.offset+(a.pause?0:a.direction*Math.min(dt,.1)*a.speed),-range,range);
    const x=p.x+(axis==='x'?v:0),z=p.z+(axis==='z'?v:0),e=local.parentEngine||local;
    if(a.action&&a.idle){
     const weight=THREE.MathUtils.damp(a.action.getEffectiveWeight(),a.pause?0:1,8,dt);
     a.action.setEffectiveWeight(weight);a.idle.setEffectiveWeight(1-weight);
    }
    if(a.pause)continue;
    if(e._walkableStatic(x+local.scene.position.x,z+local.scene.position.z,.45)){
     const yaw=Math.atan2(x-a.root.position.x,z-a.root.position.z);
     const d=THREE.MathUtils.euclideanModulo(yaw-a.root.rotation.y+Math.PI,2*Math.PI)-Math.PI;
     a.root.rotation.y+=d*Math.min(1,dt*4);a.root.position.set(x,p.y||0,z);a.offset=v;
     if(Math.abs(v)>=range){a.direction*=-1;a.pause=continuous?0:.5+(a.phase%1);}
    }else{a.direction*=-1;a.pause=continuous?0:.8;}
   }
  }
 });
 return {agents,bags,holder};
}

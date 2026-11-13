import * as THREE from 'three';

import {tileMaterial, loadSecurityOfficerGltf, buildSecurityOfficerInstance} from './haram-facilities.js';
import {departureSign} from './departure-scenes.js';

export const HOTEL={x:-390,z:29};
export const CITY_RADIUS=390;

export function buildWhitePlaza(local){
 const material=tileMaterial();material.map.repeat.set(420,420);
 const floor=new THREE.Mesh(new THREE.RingGeometry(111,425,128),material);floor.name='white-makkah-plaza';floor.rotation.x=-Math.PI/2;floor.position.y=.018;local.scene.add(floor);
 local.addWalkCircle(0,0,425,0);
}

export {buildReferenceSkyline as buildMakkahSkyline} from './abraj-skyline.js';

export function createHaramGuard(local){
 const root=new THREE.Group();root.name='haram-security-officer';root.position.set(27,0,118);local.scene.add(root);
 // A persistent full-height ray target is available while the model loads.
 const target=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,1.8,8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));target.position.y=.9;root.add(target);
 const officer=new THREE.Group();
 officer.name='haram-lodging-security-model';
 // Outside officer: faces outward away from Kaaba (0,0), with back to Kaaba.
 officer.rotation.y=Math.atan2(root.position.x,root.position.z);
 root.add(officer);
 let mixer=null,closed=false;
 const ready=loadSecurityOfficerGltf().then(gltf=>{
  if(closed)return;
  const built=buildSecurityOfficerInstance(gltf,0.15);
  officer.add(built.model);
  mixer=built.mixer;
  root.userData.ready=true;
 }).catch(err=>{
  console.warn('Model petugas pemeriksaan penginapan belum tersedia:',err);
  root.userData.ready=true;
 });
 departureSign(root,'PETUGAS · PEMERIKSAAN PENGINAPAN',[0,2.15,0],3.5);
 local.onUpdate(dt=>{if(mixer)mixer.update(dt);});
 local.disposeCallbacks||=[];local.disposeCallbacks.push(()=>{closed=true;if(mixer)mixer.stopAllAction();});
 return {object:root,ready};
}

import * as THREE from 'three';

import {tileMaterial} from './haram-facilities.js';
import {departureSign} from './departure-scenes.js';
import {createCharacter,releaseCharacter} from '../hajj-character.js';

export const HOTEL={x:-390,z:29};
export const CITY_RADIUS=390;
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.75,...extra});
function box(g,size,p,m){const o=new THREE.Mesh(new THREE.BoxGeometry(...size),m);o.position.set(...p);o.castShadow=false;g.add(o);return o;}

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
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#9da7aa';ctx.fillRect(0,0,256,256);
 let seed=17;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<32;i++){ctx.fillStyle=['#364049','#dde1df','#69757c','#202b33'][i%4];const x=random()*256,y=random()*256;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<8;j++)ctx.lineTo(x+(random()-.5)*130,y+(random()-.5)*95);ctx.closePath();ctx.fill();}
 const pattern=new THREE.CanvasTexture(canvas);pattern.colorSpace=THREE.SRGBColorSpace;pattern.wrapS=pattern.wrapT=THREE.RepeatWrapping;
 const uniform=mat(0xffffff,{map:pattern}),black=mat(0x172124),badge=mat(0xe1c064);
 const body=new THREE.Group();root.add(body);
 const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.25,6,16),uniform);torso.scale.set(1.12,1,.68);torso.position.y=1.13;body.add(torso);box(body,[.46,.07,.29],[0,.8,0],black);
 const limb=(a,b,r,m)=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start),o=new THREE.Mesh(new THREE.CapsuleGeometry(r,Math.max(.01,delta.length()-r*2),4,12),m);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());body.add(o);return o;};
 for(const s of [-1,1]){
  limb([s*.12,.78,0],[s*.14,.16,0],.105,uniform);
  const boot=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),black);boot.scale.set(.105,.11,.2);boot.position.set(s*.14,.1,.07);body.add(boot);
  limb([s*.26,1.38,0],[s*.32,1.05,.08],.085,uniform);
  limb([s*.32,1.05,.08],[-s*.1,1.1,.24],.075,uniform);
  limb([-s*.1,1.1,.24],[-s*.19,1.11,.24],.055,mat(0xcba17d));
  box(body,[.18,.2,.035],[s*.13,1.27,.15],black);departureSign(body,s<0?'الأمن':'حرس',[s*.13,1.28,.173],.15,{bg:'#172124',fg:'#dfc46b'});
  box(body,[.09,.07,.04],[s*.13,1.18,.18],badge);
 }
 let head=null,closed=false;
 // Reuse the existing detailed face while dressing the officer in the reference uniform.
 const ready=createCharacter({gender:'man',outfit:'robe',skinTone:'#dca780'}).then(c=>{
  if(closed){releaseCharacter(c);return;}
  c.update(.4);c.model.updateMatrixWorld(true);const source=c.model.getObjectByName('Skin_Head');
  if(source){head=new THREE.Group();source.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone(),p=geometry.attributes.position,v=new THREE.Vector3();o.skeleton?.update();for(let i=0;i<p.count;i++){o.getVertexPosition(i,v);v.applyMatrix4(o.matrixWorld);p.setXYZ(i,v.x,v.y,v.z);}geometry.computeVertexNormals();head.add(new THREE.Mesh(geometry,o.material));});
   const b=new THREE.Box3().setFromObject(head),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());head.scale.setScalar(.26/size.y);head.position.set(-center.x*head.scale.x,1.61-center.y*head.scale.x,-center.z*head.scale.x);root.add(head);
  }
  // The engine releases attached face materials. Original unused textures are disposed below.
  root.userData.character=c;root.userData.ready=true;
 });
 const beret=new THREE.Mesh(new THREE.SphereGeometry(1,16,8),black);beret.scale.set(.14,.045,.13);beret.position.set(.015,1.73,0);beret.rotation.z=-.12;root.add(beret);
 box(root,[.055,.055,.025],[0,1.74,.12],badge);
 departureSign(root,'PETUGAS · PEMERIKSAAN PENGINAPAN',[0,2.15,0],3.5);
 local.onUpdate((_dt,t)=>{body.rotation.z=Math.sin(t*.8)*.006;});
 local.disposeCallbacks||=[];local.disposeCallbacks.push(()=>{closed=true;pattern.dispose();const c=root.userData.character;if(c)releaseCharacter(c);});
 return {object:root,ready};
}

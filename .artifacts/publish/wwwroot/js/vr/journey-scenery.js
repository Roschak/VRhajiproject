import * as THREE from 'three';
import {departureSign} from './departure-scenes.js';
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.78,...extra});
const cream=material(0xd9c5a2),trim=material(0xf3e9d4),wood=material(0x655044),glass=material(0x637d85,{metalness:.2,roughness:.3}),green=material(0x476343);
function box(g,s,p,m){const o=new THREE.Mesh(new THREE.BoxGeometry(...s),m);o.position.set(...p);g.add(o);return o;}
export function datePalm(g,x,z){
 const p=new THREE.Group();p.position.set(x,0,z);g.add(p);
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.18,.34,5.6,8),wood);trunk.position.y=2.8;p.add(trunk);
 for(let i=0;i<9;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,8,5),green);leaf.scale.set(.35,.12,2.1);leaf.position.set(Math.sin(i*2.4)*1.5,5.5,Math.cos(i*2.4)*1.5);leaf.rotation.set(.18,i*2.4,0);p.add(leaf);}
 return p;
}
export function arabHouse(g,x,z,i=0){
 const h=new THREE.Group();h.name='arab-neighborhood-building';h.position.set(x,0,z);g.add(h);const height=8+(i%4)*3;
 box(h,[12,height,10],[0,height/2,0],cream);box(h,[12.5,.5,10.5],[0,height,0],trim);
 for(const sx of [-5.8,5.8])box(h,[.35,1,10.5],[sx,height+.5,0],trim);
 for(const side of [-1,1]){
  box(h,[12.4,1,.35],[0,height+.5,side*5],trim);
  for(let y=3;y<height;y+=3)for(const wx of [-4,0,4]){
   box(h,[1.6,2,.2],[wx,y,side*5.08],wood);box(h,[1.2,1.6,.22],[wx,y,side*5.18],glass);
   for(let k=-2;k<=2;k++)box(h,[.05,1.6,.08],[wx+k*.24,y,side*5.34],wood);
  }
  box(h,[2,2.7,.25],[0,1.35,side*5.15],wood);
 }
 return h;
}
export {buildReferenceNeighborhood as modernNeighborhood} from './indonesia-scenery.js';
export function arabDistrict(local,key){
 const g=new THREE.Group();g.name='arab-city-surroundings';local.scene.add(g);
 if(key==='haram')for(let i=0;i<64;i++){
  const a=(i%32)/32*Math.PI*2,r=i<32?165:195,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(x>90&&Math.abs(z)<65||Math.abs(x-70)<18&&z>0)continue;
  arabHouse(g,x,z,i);local.addBlocker(x-6,z-5,x+6,z+5);
 }
}
export function roadSign(g,text,x,z,yaw=0){
 const sign=new THREE.Group();sign.name='road-direction-sign';sign.position.set(x,0,z);sign.rotation.y=yaw;g.add(sign);
 box(sign,[.14,3.4,.14],[0,1.7,0],wood);
 departureSign(sign,text,[0,3.4,0],6);
 return sign;
}
export function enrichBus(bus){
 bus.name='kendaraan-perjalanan';
 bus.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(m?.transparent){m.opacity=.18;m.color.set(0xabc7d0);m.metalness=.1;}if(m?.color?.getHex()===0x1a1a1a)m.color.set(0x20304c);});
 const navy=material(0x263454),blue=material(0x42adcd),ceiling=material(0xe0d7be);
 box(bus,[11.8,.12,2.5],[0,3.33,0],ceiling);
 for(const z of [-1.1,1.1]){
  box(bus,[11.4,.25,.55],[0,3.04,z],ceiling);
  box(bus,[11.4,.035,.05],[0,2.87,z*.8],material(0x64cafa,{emissive:0x219fee,emissiveIntensity:.5}));
  for(let x=-4.4;x<=4.4;x+=1.1){
   box(bus,[.12,1.06,.09],[x,2.35,Math.sign(z)*1.32],navy);
   for(const dz of [-.22,.22]){
    const cushion=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),navy);cushion.scale.set(.13,.32,.2);cushion.position.set(x-.15,1.35,Math.sign(z)*.9+dz);bus.add(cushion);
    box(bus,[.5,.07,.06],[x,1.12,Math.sign(z)*.9+dz],blue);
   }
  }
 }
 box(bus,[10,.035,.16],[0,3.24,0],material(0xfff4ce,{emissive:0xffd887,emissiveIntensity:.35}));
 departureSign(bus,'ROMBONGAN · SELAMAT DATANG',[5.6,2.7,0],1.6).rotation.y=-Math.PI/2;
 const scenery=new THREE.Group();scenery.name='bus-window-scenery';bus.add(scenery);
 box(scenery,[260,.06,14],[0,-.02,0],material(0x6b6963));
 box(scenery,[260,.03,150],[0,-.07,0],material(0xbba889));
 for(let i=0;i<14;i++)for(const side of [-1,1]){arabHouse(scenery,i*18-120,side*24,i);datePalm(scenery,i*18-115,side*11);}
 bus.userData.scenery=scenery;
}

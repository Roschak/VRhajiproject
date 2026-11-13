import * as THREE from 'three';
import {batchArchitecture} from './static-batches.js';
export function buildReferenceSkyline(local){
 const root=new THREE.Group();root.name='makkah-setback-skyline';local.scene.add(root);
 const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.7,...extra});
 const stone=material(0xa18b66),trim=material(0xd2bd91),glass=material(0x19594e,{metalness:.35,roughness:.28}),dark=material(0x423b2e),gold=material(0xc9a64e,{metalness:.7,roughness:.3});
 const pale=[material(0xd0c0a2),material(0xb5a58a),material(0xe1d4bb),material(0xa9977c)];
 const unit=new THREE.BoxGeometry(1,1,1),batch=new Map(),dummy=new THREE.Object3D();
 function box(g,size,p,m){const o=new THREE.Mesh(unit,m);o.scale.set(...size);o.position.set(...p);g.add(o);return o;}
 function window(g,x,y,z,w,h,side=0,lit=false){
  if(!batch.has(g))batch.set(g,[]);batch.get(g).push({x,y,z,w,h,side,lit});
 }
 function facade(g,w,h,d,m=stone){
  box(g,[w,h,d],[0,h/2,0],m);
  for(const s of [-1,1]){
   for(let x=-w/2+2;x<w/2;x+=3.2){
    box(g,[.42,h-4,.3],[x+1.2,h/2,s*(d/2+.2)],trim);
    for(let y=4;y<h-2;y+=3.8)window(g,x,y,s*(d/2+.25),1.85,2.6,0);
   }
   for(let z=-d/2+2;z<d/2;z+=3.2)for(let y=4;y<h-2;y+=3.8)window(g,s*(w/2+.25),y,z,1.85,2.6,Math.PI/2);
  }
  for(let y=6;y<h;y+=15)box(g,[w+.7,.65,d+.7],[0,y,0],trim);
  for(const y of [h-2,h,h+1.6])box(g,[w+2,.7,d+2],[0,y,0],trim);
 }
 let count=0;
 for(let ring=0;ring<4;ring++)for(let i=0;i<36+ring*8;i++){
  const a=(i+.35*(ring%2))/(36+ring*8)*Math.PI*2,r=390+ring*53,x=Math.cos(a)*r,z=Math.sin(a)*r;
  // Keep the clock complex, hotel approach, and connected bus/walking roads clear.
  if(Math.abs(x-40)<145&&z>300||Math.abs(x+390)<34&&Math.abs(z-29)<48||Math.abs(z-500)<28||Math.abs(x-70)<30&&z>60||Math.abs(x-190)<36&&z>230||x>520&&Math.abs(z+100)<110)continue;
  const g=new THREE.Group();g.name='setback-hotel';g.position.set(x,0,z);g.rotation.y=-a+Math.PI/2;root.add(g);
  const w=22+(i%3)*5,d=22+(i%2)*4,h=ring===0?42+(i%6)*11:28+((i*7+ring)%8)*11;
  facade(g,w,h,d,pale[(i+ring)%4]);box(g,[w*.7,2,d*.65],[0,h+3,0],dark);
  if(ring===0){const extent=Math.hypot(w,d)/2;local.addBlocker(x-extent,z-extent,x+extent,z+extent);}
  count++;
 }
 const clock=new THREE.Group();clock.name='reference-abraj-clock-tower';clock.position.set(40,0,390);root.add(clock);
 // Broad, layered podium and six companion hotel towers form one complex.
 facade(clock,244,42,116,stone);
 for(const s of [-1,1])for(let tier=0;tier<3;tier++){
  const g=new THREE.Group();g.position.set(s*(42+tier*31),42,8+tier*14);clock.add(g);
  const h=[112,140,116][tier],w=29,d=29;facade(g,w,h,d);
  const roof=new THREE.Mesh(new THREE.CylinderGeometry(14,21,6,4),glass);roof.rotation.y=Math.PI/4;roof.position.y=h+5;g.add(roof);
  for(const x of [-16,16])for(const z of [-16,16]){const spike=new THREE.Mesh(new THREE.ConeGeometry(.7,6,8),gold);spike.position.set(x,h+7,z);g.add(spike);}
 }
 const shaft=new THREE.Group();shaft.position.y=42;clock.add(shaft);facade(shaft,43,155,39);
 for(const y of [152,155,158])box(shaft,[48,1.3,44],[0,y,0],trim);
 const lantern=new THREE.Group();lantern.position.y=200;clock.add(lantern);facade(lantern,43,12,39,dark);
 box(clock,[49,3,45],[0,213,0],trim);box(clock,[37,40,37],[0,235,0],stone);
 function dialTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const c=canvas.getContext('2d');
  c.fillStyle='#284d38';c.fillRect(0,0,1024,1024);c.strokeStyle='#d6bd77';c.lineWidth=22;c.strokeRect(18,18,988,988);
  c.save();c.translate(512,512);c.fillStyle='#398957';c.beginPath();c.arc(0,0,455,0,Math.PI*2);c.fill();c.strokeStyle='#e4d397';c.lineWidth=12;c.stroke();
  for(let i=0;i<60;i++){c.save();c.rotate(i*Math.PI/30);c.fillStyle='#fff7d4';c.fillRect(i%5?-3:-10,-429,i%5?6:20,i%5?23:72);c.restore();}
  c.strokeStyle='#fff7d4';c.lineWidth=21;c.lineCap='round';for(const [a,l]of [[Math.PI*.28,240],[-Math.PI*.35,340]]){c.save();c.rotate(a);c.beginPath();c.moveTo(0,28);c.lineTo(0,-l);c.stroke();c.restore();}c.beginPath();c.arc(0,0,20,0,Math.PI*2);c.fill();c.restore();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
 }
 const dial=new THREE.MeshBasicMaterial({map:dialTexture(),toneMapped:false});
 const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=256;const ctx=signCanvas.getContext('2d');ctx.clearRect(0,0,512,256);ctx.fillStyle='#fff7df';ctx.font='bold 200px Amiri, serif';ctx.textAlign='center';ctx.fillText('الله',256,210);const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;
 for(let side=0;side<4;side++){
  const f=new THREE.Group();f.rotation.y=side*Math.PI/2;clock.add(f);
  const face=new THREE.Mesh(new THREE.PlaneGeometry(33,33),dial);face.position.set(0,234,18.6);f.add(face);
  const crest=new THREE.Shape();crest.moveTo(-17,251);crest.lineTo(-17,257);crest.quadraticCurveTo(-9,259,0,267);crest.quadraticCurveTo(9,259,17,257);crest.lineTo(17,251);crest.closePath();const plate=new THREE.Mesh(new THREE.ShapeGeometry(crest),glass);plate.position.z=18.7;f.add(plate);
  const lettering=new THREE.Mesh(new THREE.PlaneGeometry(24,12),new THREE.MeshBasicMaterial({map:signTexture,transparent:true,depthWrite:false}));lettering.position.set(0,258,18.85);f.add(lettering);
  for(const x of [-19,19]){box(f,[2,43,2],[x,236,18.5],dark);const finial=new THREE.Mesh(new THREE.ConeGeometry(1.5,8,8),gold);finial.position.set(x,261,18.5);f.add(finial);}
 }
 const dome=new THREE.Mesh(new THREE.SphereGeometry(9,20,12),glass);dome.scale.y=1.35;dome.position.y=270;clock.add(dome);
 const stem=new THREE.Mesh(new THREE.CylinderGeometry(1.3,4,37,10),gold);stem.position.y=297;clock.add(stem);
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2;box(clock,[.4,28,.4],[Math.cos(a)*2,297,Math.sin(a)*2],trim);}
 for(const y of [282,286,310,314]){const collar=new THREE.Mesh(new THREE.TorusGeometry(y<300?4:2,.5,8,24),gold);collar.rotation.x=Math.PI/2;collar.position.y=y;clock.add(collar);}
 const crescent=new THREE.Mesh(new THREE.TorusGeometry(6,.9,12,40,Math.PI*1.55),gold);crescent.rotation.z=Math.PI*.725;crescent.position.y=322;clock.add(crescent);
 const windowMat=material(0x29796b,{metalness:.25,roughness:.35,emissive:0x13382d,emissiveIntensity:.3});
 for(const [g,windows]of batch){const mesh=new THREE.InstancedMesh(unit,windowMat,windows.length);windows.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.side,0);dummy.scale.set(p.w,p.h,.15);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});g.add(mesh);}
 local.addBlocker(-82,332,162,448);root.userData.buildingCount=count+7;
 batchArchitecture(root,local);
 return root;
}

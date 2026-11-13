import * as THREE from 'three';
import {departureSign} from './departure-scenes.js';
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
function box(g,size,p,m){const o=new THREE.Mesh(new THREE.BoxGeometry(...size),m);o.position.set(...p);o.receiveShadow=true;g.add(o);return o;}
function stoneTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');c.fillStyle='#bab9a4';c.fillRect(0,0,512,512);
 let seed=19;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<3500;i++){const x=random()*512,y=random()*512;c.strokeStyle=['#777968','#e1dfca','#929581'][i%3];c.lineWidth=1+random()*2;c.beginPath();c.moveTo(x,y);c.lineTo(x+random()*6,y+3+random()*9);c.stroke();}
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(6,2);return t;
}
function canopyGeometry(){
 const vertices=[0,3.2,0],indices=[],segments=16,rings=7;
 for(let ring=1;ring<=rings;ring++)for(let i=0;i<segments;i++){
  const a=i/segments*Math.PI*2,r=ring/rings,c=Math.cos(a),s=Math.sin(a),square=3.5*r/Math.max(Math.abs(c),Math.abs(s));
  vertices.push(c*square,3.2*Math.pow(1-r,1.7),s*square);
 }
 for(let i=0;i<segments;i++)indices.push(0,1+(i+1)%segments,1+i);
 for(let ring=0;ring<rings-1;ring++)for(let i=0;i<segments;i++){
  const a=1+ring*segments+i,b=1+ring*segments+(i+1)%segments,c=a+segments,d=b+segments;indices.push(a,b,c,b,d,c);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function buildMinaReference(engine,{withAllJamarat=false}={}){
 const root=new THREE.Group();root.name='reference-jamarat-hall';engine.scene.add(root);
 const concrete=mat(0xd5d7d2),beam=mat(0xb2b7b5),floor=mat(0xe2e2d7),basinMat=mat(0xa7aa96),padding=mat(0xc4b38a),stone=mat(0xffffff,{map:stoneTexture()}),dark=mat(0x414846),white=mat(0xf0eee1);
 const ground=box(root,[650,.1,600],[0,-.15,0],mat(0xb5a88e));ground.name='mina-ground';
 box(root,[196,.15,112],[0,-.02,-40],floor);
 const roof=box(root,[196,.5,112],[0,12.8,-40],concrete);roof.name='jamarat-full-roof';
 box(root,[196,12,.6],[0,6,-96],concrete);engine.addBlocker(-98,-96.3,98,-95.7);
 for(const x of [-90,-65,-35,0,35,65,90])for(const z of [-85,5]){
  const col=new THREE.Mesh(new THREE.CylinderGeometry(.65,.8,12.5,12),concrete);col.position.set(x,6.25,z);root.add(col);engine.addBlocker(x-.8,z-.8,x+.8,z+.8);
 }
 for(let z=-88;z<=8;z+=12){
  box(root,[194,.8,.6],[0,11.9,z],beam);
  for(let x=-90;x<=90;x+=15){const rib=box(root,[15.5,.4,.4],[x,11.1,z],beam);rib.rotation.z=x%30===0?.12:-.12;}
 }
 const lamps=[];for(let x=-84;x<=84;x+=12)for(const z of [-75,-55,-25,-5])lamps.push([x,11.5,z]);
 const lighting=new THREE.InstancedMesh(new THREE.BoxGeometry(5,.08,.25),new THREE.MeshBasicMaterial({color:0xffffed}),lamps.length),dummy=new THREE.Object3D();lamps.forEach((p,i)=>{dummy.position.set(...p);dummy.updateMatrix();lighting.setMatrixAt(i,dummy.matrix);});root.add(lighting);
 const fans=[];for(const x of [-72,-24,24,72])for(const z of [-70,-10]){
  const fan=new THREE.Group();fan.position.set(x,10.6,z);root.add(fan);box(fan,[.08,1.2,.08],[0,.6,0],dark);
  const rotor=new THREE.Group();fan.add(rotor);for(let b=0;b<3;b++){const blade=box(rotor,[2,.04,.2],[Math.cos(b*Math.PI*2/3)*.8,0,Math.sin(b*Math.PI*2/3)*.8],dark);blade.rotation.y=-b*Math.PI*2/3;}fans.push(rotor);
 }
 engine.onUpdate((_dt,t)=>fans.forEach(f=>{f.rotation.y=t*2;}));
 root.add(new THREE.AmbientLight(0xffffff,.6));
 const jamarat={};
 for(const [key,x]of (withAllJamarat?[['ula',-50],['wustha',0],['aqabah',50]]:[['aqabah',0]])){
  const g=new THREE.Group();g.name='jumrah-'+key;g.position.set(x,0,-40);g.rotation.y=Math.PI/2;root.add(g);
  const wallGeo=new THREE.CylinderGeometry(1,1,12,48);wallGeo.scale(14,1,1);const wall=new THREE.Mesh(wallGeo,stone);wall.position.y=6;g.add(wall);
  const shellGeo=new THREE.CylinderGeometry(4.6,4.6,1.25,64,1,true);shellGeo.scale(3.5,1,1);const shell=new THREE.Mesh(shellGeo,basinMat);shell.position.y=.625;shell.material.side=THREE.DoubleSide;g.add(shell);
  const bottomGeo=new THREE.CylinderGeometry(4.6,4.6,.12,64);bottomGeo.scale(3.5,1,1);const bottom=new THREE.Mesh(bottomGeo,dark);bottom.position.y=.08;g.add(bottom);
  const rimGeo=new THREE.TorusGeometry(4.6,.22,8,64);rimGeo.scale(3.5,1,1);const rim=new THREE.Mesh(rimGeo,padding);rim.rotation.x=Math.PI/2;rim.position.y=1.25;g.add(rim);
  engine.addBlocker(x-4.9,-56.3,x+4.9,-23.7);jamarat[key]=g;
  departureSign(root,`JUMRAH ${key.toUpperCase()}`,[x,9,-24],5,{bg:'#375049',fg:'#ffffff'});
 }
 departureSign(root,'JALUR MELONTAR · ULA → WUSTHA → AQABAH',[0,5,15],20);
 // Tent districts on every side, with open axial roads and service access.
 const tents=[];
 for(let z=-235;z<=235;z+=12)for(let x=-265;x<=265;x+=12){
  if(x>-112&&x<112&&z>-112&&z<28||Math.abs(x)<8||Math.abs(z-32)<9||Math.abs(x-80)<10&&z>10)continue;
  tents.push([x,z]);engine.addBlocker(x-3.5,z-3.5,x+3.5,z+3.5);
 }
 const bodies=new THREE.InstancedMesh(new THREE.BoxGeometry(7,2.2,7),white,tents.length),roofs=new THREE.InstancedMesh(canopyGeometry(),white,tents.length),vents=new THREE.InstancedMesh(new THREE.ConeGeometry(.75,1.1,4),white,tents.length),ac=new THREE.InstancedMesh(new THREE.BoxGeometry(1.5,1.1,1.3),dark,tents.length);
 bodies.name='mina-tent-bodies';roofs.name='mina-tent-roofs';
 tents.forEach(([x,z],i)=>{dummy.rotation.set(0,0,0);dummy.position.set(x,1.1,z);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);dummy.position.y=2.2;dummy.updateMatrix();roofs.setMatrixAt(i,dummy.matrix);dummy.rotation.y=Math.PI/4;dummy.position.y=5.4;dummy.updateMatrix();vents.setMatrixAt(i,dummy.matrix);dummy.rotation.y=0;dummy.position.set(x+2,2.6,z+2.6);dummy.updateMatrix();ac.setMatrixAt(i,dummy.matrix);});
 root.add(bodies,roofs,vents,ac);root.userData.tentCount=tents.length;
 for(let i=0;i<12;i++){const hill=new THREE.Mesh(new THREE.ConeGeometry(50,38+(i%4)*8,7),mat(0x8b7e68));hill.position.set(-310+i*57,12,-300);root.add(hill);}
 engine.addWalkRect(-280,-250,280,250);
 engine.configureMinimap({scale:.75,center:{x:0,z:10},features:Object.entries(jamarat).map(([key,g])=>({type:'point',x:g.position.x,z:-40,label:key,color:'#d99a57'}))});
 return {jamarat};
}

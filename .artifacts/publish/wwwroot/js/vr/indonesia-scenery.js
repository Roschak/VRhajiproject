import * as THREE from 'three';
import {departureSign} from './departure-scenes.js';
import {batchArchitecture} from './static-batches.js';

const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.78,...extra});
function box(g,size,pos,m){const o=new THREE.Mesh(new THREE.BoxGeometry(...size),m);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
const white=mat(0xf3f2e9),concrete=mat(0xc3c4b9),timber=mat(0x765039),roof=mat(0x35434b),asphalt=mat(0x42484a),grass=mat(0x66874a),bark=mat(0x655447),leaf=mat(0x487b35),metal=mat(0x444e54),glass=mat(0x8baeb8,{roughness:.25,metalness:.45});
function tree(g,x,z,height=5){
 const t=new THREE.Group();t.position.set(x,0,z);g.add(t);
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.055,.13,height,7),bark);trunk.position.y=height/2;t.add(trunk);
 for(let i=0;i<13;i++){
  const a=i*2.4,r=.25+i%3*.38,c=new THREE.Mesh(new THREE.IcosahedronGeometry(.47,1),leaf);
  c.position.set(Math.sin(a)*r,height-1.35+i*.14,Math.cos(a)*r);c.scale.set(1,.65,1);t.add(c);
 }
}
function lamp(g,x,z){
 box(g,[.13,7,.13],[x,3.5,z],metal);
 box(g,[2.6,.12,.12],[x+1.2,7,z],metal);
 box(g,[.9,.1,.36],[x+2.1,6.94,z],white);
}
function referenceHouse(g,x,z,turn,index){
 const h=new THREE.Group();h.name='reference-neighborhood-house';h.position.set(x,0,z);h.rotation.y=turn;g.add(h);
 box(h,[9,5.6,9],[0,2.8,0],white);
 box(h,[4.6,2.4,8.7],[-2.1,6.7,0],white);
 // Asymmetric shed roofs and a tall timber panel, matching the supplied photograph.
 const upper=box(h,[5.4,.22,10.2],[-2.05,8.05,0],roof);upper.rotation.x=-.16;
 const lower=box(h,[5,.22,10.1],[2.4,5.85,0],roof);lower.rotation.x=-.16;
 box(h,[2.2,4.6,.12],[-1.25,5,4.57],timber);
 for(let y=2.8;y<7.3;y+=.24)box(h,[2.2,.018,.03],[-1.25,y,4.65],bark);
 for(const [wx,wy,ww,wh]of [[-3.2,5.8,1.25,2.3],[-3.2,1.8,1.6,2.7],[2.2,1.8,2.5,2.7]]){
  box(h,[ww+.18,wh+.18,.16],[wx,wy,4.6],white);box(h,[ww,wh,.18],[wx,wy,4.71],glass);
  box(h,[.055,wh,.07],[wx,wy,4.83],white);
 }
 box(h,[1.1,2.7,.18],[-.65,1.35,4.7],timber);
 box(h,[2.5,.16,1.4],[-.65,3,5.1],white);box(h,[.22,3,.22],[.45,1.5,5.65],white);
 box(h,[2,.22,1.6],[-.65,.11,5.3],concrete);
 box(h,[9,.1,6.4],[0,.02,7.7],concrete);box(h,[4,.15,3.7],[2.35,.14,8],grass);
 for(let j=0;j<4;j++)box(h,[3,.08,.86],[-2.6,.1,6.4+j*1.05],white);
 for(const side of [-1,1])box(h,[.18,.42,5.9],[side*4.45,.23,7.6],white);
 box(h,[2.2,.38,.2],[2.8,.21,10.5],white);
 box(h,[.65,.7,.65],[4.05,.35,10.1],white);
 const cover=box(h,[.57,.06,.57],[4.05,.73,10.1],metal);cover.rotation.x=.22;
 tree(h,2.4,9.6,4.1+(index%3)*.3);
 return h;
}

export function buildReferenceNeighborhood(local){
 const g=new THREE.Group();g.name='modern-housing-neighborhood';local.scene.add(g);
 box(g,[240,.08,110],[0,-.13,22],grass);
 box(g,[226,.08,8],[0,.015,23],asphalt);
 for(const z of [18.8,27.2]){
  box(g,[226,.18,.3],[0,.07,z],concrete);
  box(g,[226,.05,.28],[0,-.015,z+(z<23?-.3:.3)],metal);
 }
 for(let i=0;i<19;i++){
  const x=-108+i*12;
  if(Math.abs(x)>17){referenceHouse(g,x,7.5,0,i);local.addBlocker(x-4.6,2.9,x+4.6,12.1);}
  referenceHouse(g,x,39,Math.PI,i);local.addBlocker(x-4.6,34.4,x+4.6,43.6);
 }
 for(let x=-100;x<=100;x+=25){
  if(Math.abs(x)>12)lamp(g,x,18);
  for(const dx of [-.22,.22]){
   const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(x+dx,7,18),new THREE.Vector3(x+12.5+dx,6.3,18),new THREE.Vector3(x+25+dx,7,18));
   g.add(new THREE.Mesh(new THREE.TubeGeometry(curve,12,.022,4,false),metal));
  }
 }
 local.addWalkRect(-112,18.5,112,27.5);
 local.addWalkRect(-112,27.5,112,38.5);
 departureSign(g,'KELUAR  /  BANDARA  →',[105,2.8,28],5);
 batchArchitecture(g,local);
 return g;
}

function tower(g,x,z,height,index){
 const width=12+index%3*4,depth=14+index%2*5;
 box(g,[width,height,depth],[x,height/2,z],glass);
 for(let y=3;y<height;y+=3.2)box(g,[width+.18,.18,depth+.18],[x,y,z],white);
 for(let sx=-width/2;sx<=width/2;sx+=3)for(const side of [-1,1])box(g,[.14,height,.15],[x+sx,height/2,z+side*(depth/2+.12)],metal);
 box(g,[width+2,3,depth+2],[x,1.5,z],concrete);
 box(g,[width*.65,3,depth*.65],[x,height+1.5,z],white);
}
function monas(g){
 const m=new THREE.Group();m.name='jakarta-monas';m.position.set(-68,0,-35);g.add(m);
 box(m,[35,.4,35],[0,.2,0],grass);box(m,[18,2,18],[0,1,0],white);
 box(m,[13,1.6,13],[0,3,0],white);box(m,[7,.6,7],[0,4.1,0],white);
 const shaft=new THREE.Mesh(new THREE.CylinderGeometry(1.15,2.3,40,4),white);shaft.rotation.y=Math.PI/4;shaft.position.y=24;m.add(shaft);
 box(m,[6.6,1.4,6.6],[0,44,0],white);box(m,[4,1.5,4],[0,45,0],white);
 const flame=new THREE.Mesh(new THREE.SphereGeometry(1.6,10,8),mat(0xe4b738,{metalness:.65,roughness:.28}));flame.scale.set(.65,2,.65);flame.position.set(0,48,0);flame.rotation.z=-.16;m.add(flame);
}
function trafficCar(g,x,z,color){
 const c=new THREE.Group();c.name='jakarta-traffic';c.position.set(x,0,z);g.add(c);
 const paint=mat(color);box(c,[1.8,.7,4.1],[0,.65,0],paint);box(c,[1.55,.65,2],[0,1.23,.1],glass);box(c,[1.6,.1,2.1],[0,1.57,.1],paint);
 for(const side of [-1,1])for(const end of [-1.3,1.3]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.17,10),metal);wheel.rotation.z=Math.PI/2;wheel.position.set(side*.88,.34,end);c.add(wheel);}
 for(const side of [-1,1])box(c,[.5,.14,.06],[side*.55,.8,-2.08],white);
 return c;
}

export function createJakartaDrive(car,local){
 const g=new THREE.Group();g.name='jakarta-drive-scenery';car.add(g);
 box(g,[550,.1,1400],[0,-.18,0],grass);
 box(g,[22,.1,1400],[6,-.04,0],asphalt);
 box(g,[1,.22,1400],[6,.05,0],concrete);
 for(const x of [-5.2,17.2])box(g,[.18,.08,1400],[x,.035,0],white);
 const segments=[];
 for(let i=0;i<9;i++){
  const s=new THREE.Group();s.name='jakarta-city-segment';s.position.z=-700+i*100;g.add(s);segments.push(s);
  for(const x of [-1.8,2.4,10,14])for(let z=-48;z<50;z+=12)box(s,[.12,.025,5],[x,.025,z],white);
  for(const side of [-1,1]){
   const x=side<0?-10:22;
   box(s,[5,.3,100],[x,.09,0],concrete);
   for(const z of [-35,0,35]){tree(s,x,z,6);lamp(s,x+2,z);}
   // Keep an open park around Monas so the landmark can be seen from the car.
   if(!(i===3&&side===-1))for(let j=0;j<3;j++)tower(s,side<0?-30-j%2*15:40+j%2*17,-35+j*34,22+((i*13+j*17)%55),i+j);
   for(let j=0;j<2;j++)tower(s,side<0?-100:110,-20+j*55,55+((i*19+j*23)%65),i+j);
  }
  if(i===3)monas(s);
  if(i%3===0){
   for(const x of [-5,17])box(s,[.24,8,.24],[x,4,-35],metal);
   box(s,[22,.2,.25],[6,8,-35],metal);
   departureSign(s,i===6?'BANDARA SOEKARNO-HATTA  ↑':'JAKARTA  ·  TOL BANDARA  ↑',[4,7,-34.8],12,{bg:'#166443'});
  }
  trafficCar(s,3.6,-28,[0xcbd0cc,0x26586f,0xa14539][i%3]);
  trafficCar(s,12,12,[0x287fa0,0xe4e3db,0x50565e][i%3]).rotation.y=Math.PI;
  batchArchitecture(s,local);
 }
 car.userData.jakartaDrive={group:g,segments,distance:0};
 return g;
}

export function updateJakartaDrive(car,dt){
 const drive=car.userData.jakartaDrive;if(!drive)return;
 const step=Math.min(Math.max(dt,0),.1)*18;drive.distance+=step;
 for(const s of drive.segments){s.position.z+=step;if(s.position.z>200)s.position.z-=900;}
}

import * as THREE from 'three';
import {batchArchitecture} from './static-batches.js';

const FLOOR=4.2;
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.6,...extra});
function box(g,size,pos,m,name=''){const o=new THREE.Mesh(new THREE.BoxGeometry(...size),m);o.position.set(...pos);o.name=name;o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function texture(kind){
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');let seed=73;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 x.fillStyle=kind==='wood'?'#795739':kind==='rug'?'#433c32':kind==='grey'?'#8b8981':'#f0efea';x.fillRect(0,0,512,512);
 if(kind==='wood'||kind==='rug')for(let i=0;i<650;i++){x.strokeStyle=kind==='wood'?`rgba(35,20,10,${rand()*.22})`:`rgba(225,210,177,${rand()*.8})`;x.lineWidth=rand()*2+1;x.beginPath();const y=rand()*512;x.moveTo(0,y);x.bezierCurveTo(150,y+rand()*12,300,y-rand()*12,512,y+rand()*5);x.stroke();}
 else for(let i=0;i<32;i++){x.strokeStyle=`rgba(95,90,80,${.05+rand()*.14})`;x.lineWidth=.3+rand()*1.8;x.beginPath();let y=rand()*512;x.moveTo(0,y);for(let a=0;a<=512;a+=18){y+=(rand()-.48)*65;x.lineTo(a,y);}x.stroke();}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='wood'?2:3,kind==='wood'?4:3);t.anisotropy=4;return t;
}

export function buildReferenceHome(local,{suitcase,silverSUV,sign}){
 const g=new THREE.Group();g.name='reference-family-home';local.scene.add(g);
 const white=material(0xf5f1e5),trim=material(0xfffcf2),wood=material(0xffffff,{map:texture('wood')}),marble=material(0xffffff,{map:texture('marble'),roughness:.28}),grey=material(0xffffff,{map:texture('grey'),roughness:.34}),gold=material(0xb9995e,{metalness:.65,roughness:.3}),dark=material(0x34302b),linen=material(0xd7d5ca),teal=material(0x154957),roof=material(0x2c333a),stone=material(0x444b49),glass=material(0xb6cbd2,{transparent:true,opacity:.2,depthWrite:false,roughness:.14}),glow=new THREE.MeshBasicMaterial({color:0xffe7aa});
 g.add(new THREE.HemisphereLight(0xfff5df,0x9e9b8e,2.3));
 g.add(new THREE.AmbientLight(0xffffff,.65));
 local.addPointLamp(-2,6.8,2,{intensity:90,distance:18});
 local.addPointLamp(6,7,0,{intensity:65,distance:12});
 const ground=new THREE.Group();ground.name='home-ground-floor';g.add(ground);
 const upper=new THREE.Group();upper.name='home-upper-floor';upper.position.y=FLOOR;g.add(upper);
 box(ground,[18,.16,16],[0,-.08,0],marble);
 box(g,[18,7.7,.22],[0,3.85,-8],white);
 for(const x of [-9,9]){box(g,[.22,7.7,12.2],[x,3.85,-1.9],white);box(g,[.22,4.6,3.8],[x,2.3,6.1],white);}
 // A genuine gallery overlooks the double-height living room, with a stair opening.
 box(upper,[18,.22,3],[0,-.11,-6.5],grey);
 box(upper,[14.8,.22,2],[1.6,-.11,-4],grey);
 box(upper,[.8,.22,2],[-8.6,-.11,-4],grey);
 box(upper,[6,.22,7.2],[6,-.11,.6],grey);
 box(g,[18,.2,12.2],[0,7.75,-1.9],white);
 // Entry facade: white portal, recessed warm timber doorway, dark stone pier.
 for(const [x,w]of [[-5,8],[5,8]])box(g,[w,4.6,.24],[x,2.3,8],white);
 box(g,[2,1.4,.24],[0,3.9,8],white);
 box(g,[18,3.05,.24],[0,6.15,4.2],white);
 for(const x of [-1.35,1.35]){box(g,[.38,4.1,2],[x,2.05,9],trim);box(g,[.13,3.2,.15],[x*.75,1.6,8.12],wood);}
 box(g,[3.1,.42,2.1],[0,4.1,9],trim);
 const door=box(g,[1.7,3.1,.13],[-1.8,1.55,8.7],wood);door.rotation.y=-Math.PI/2;
 for(let y=.55;y<2.8;y+=.52)box(g,[.07,.22,.11],[-1.72,y,8.5],glow);
 for(const x of [3.7,5.4,7.1]){
  box(g,[1.55,3.2,.16],[x,1.9,8.2],wood);box(g,[1.3,2.9,.17],[x,1.9,8.3],material(0xf1d8a5,{emissive:0xb9974e,emissiveIntensity:.35,transparent:true,opacity:.65}));
  box(g,[.08,3,.2],[x,1.9,8.42],wood);box(g,[1.4,.1,.2],[x,3,8.42],wood);
 }
 box(g,[1.1,4.65,.4],[8.2,2.32,8.25],stone);
 for(let y=.1;y<4.7;y+=.16)for(let x=7.7;x<8.7;x+=.32)box(g,[.29,.12,.06],[x+(Math.floor(y/.16)%2)*.08,y,8.48],stone);
 for(const y of [4.65,4.82])box(g,[18.6,.14,.65],[0,y,8.22],trim);
 // Hip roofs retain the dark tiled silhouette; the taller rear volume houses floor two.
 function hip(x,z,w,d,y,h){
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([-w/2,0,-d/2,w/2,0,-d/2,w/2,0,d/2,-w/2,0,d/2,0,h,0],3));geo.setIndex([0,4,1,1,4,2,2,4,3,3,4,0,0,1,2,0,2,3]);geo.computeVertexNormals();const m=new THREE.Mesh(geo,roof);m.position.set(x,y,z);m.castShadow=true;g.add(m);
  for(let k=1;k<15;k++){const t=k/15;box(g,[w*(1-t),.065,.1],[x,y+h*t,z+d/2*(1-t)],roof);box(g,[w*(1-t),.065,.1],[x,y+h*t,z-d/2*(1-t)],roof);}
 }
 hip(0,-1.9,19,13,7.9,3);hip(-5.8,12.1,6.8,6.5,4.8,1.6);
 // The front roof falls towards the eaves; the second floor is set back behind it.
 const slope=Math.atan2(3.1,4.3),slopeLength=Math.hypot(3.1,4.3);
 const frontRoof=box(g,[19,.16,slopeLength],[0,6.35,6.75],roof);frontRoof.rotation.x=slope;
 const lining=box(g,[18,.08,slopeLength],[0,6.18,6.75],white);lining.rotation.x=slope;
 for(let i=0;i<15;i++)box(g,[19,.065,.1],[0,7.9-i*3.1/14,4.6+i*4.3/14],roof);
 // Recessed upper windows make the added storey legible, keeping the same timber trim.
 for(const x of [3.7,5.4,7.1]){box(g,[1.55,2.1,.16],[x,6.05,4.33],wood);box(g,[1.3,1.85,.17],[x,6.05,4.43],glass);}
 // Covered parking on the left, vehicle nose facing the street as in the reference.
 box(g,[6.4,.28,8],[-5.8,4.6,11.2],trim);
 for(const x of [-9,-2.6])box(g,[.28,4.6,.28],[x,2.3,15],white);
 box(g,[6.5,.12,12],[-5.8,-.02,14],material(0xb6aa99));
 for(let z=9;z<20;z+=.5)box(g,[6.4,.015,.02],[-5.8,.052,z],stone);
 const car=silverSUV();car.position.set(-5.8,0,12.5);car.rotation.y=Math.PI;g.add(car);
 const carDoor=box(g,[.1,1.3,1.2],[-4.7,1,12.1],material(0xffffff,{transparent:true,opacity:0,depthWrite:false}),'home-car-passenger-door');
 for(const x of [-7.5,-4])box(g,[.4,.08,.4],[x,4.42,11],glow);
 box(g,[18,.1,7],[0,-.08,18],material(0xbdb8aa));
 box(g,[10,.15,4.6],[4.1,.05,14.4],material(0x5f7744));
 for(const z of [12,16.8])box(g,[10.2,.28,.18],[4.1,.14,z],white);
 box(g,[.18,.28,4.8],[9.2,.14,14.4],white);
 for(const x of [-9.8,10])box(g,[.2,1.5,12],[x,.75,14],white);
 box(g,[140,.1,140],[0,-.3,20],material(0x708565));box(g,[28,.08,8],[0,-.05,23],material(0x4e5557));
 function plant(parent,x,y,z,scale=1){const p=new THREE.Group();p.position.set(x,y,z);p.scale.setScalar(scale);parent.add(p);const pot=new THREE.Mesh(new THREE.CylinderGeometry(.25,.19,.45,16),white);pot.position.y=.225;p.add(pot);for(let i=0;i<14;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,8,5),material(0x46713d));leaf.scale.set(.13,.6,.045);leaf.position.set(Math.sin(i*2.4)*.25,.65+(i%3)*.13,Math.cos(i*2.4)*.25);leaf.rotation.z=Math.sin(i)*.6;p.add(leaf);}}
 plant(g,1.4,0,10.5,1.4);for(const x of [3,5.8,8])plant(g,x,.13,14.5,1.2);
 // Layer-specific blockers prevent furnishings downstairs blocking the gallery above.
 const blockers=[];
 function block(x1,z1,x2,z2,floor=null){local.addBlocker(x1,z1,x2,z2);const b=local.blockers.at(-1);b.homeFloor=floor;blockers.push(b);return b;}
 block(-9.2,-8.2,9.2,-7.8);block(-9.2,-8,-8.8,8);block(8.8,-8,9.2,8);
 block(-9,7.85,-1.05,8.25);block(1.05,7.85,9,8.25);
 block(-6.8,10,-4.8,15);block(-9.2,14.8,-8.8,15.2);block(-2.8,14.8,-2.4,15.2);
 block(-1,12,9.3,16.9);block(-10,8,-9.6,20);block(9.8,8,10.2,20);
 function sofa(parent,x,z,w,turn=0){
  const s=new THREE.Group();s.position.set(x,0,z);s.rotation.y=turn;parent.add(s);
  box(s,[w,.4,1.1],[0,.4,0],linen);box(s,[w,.68,.2],[0,.88,-.5],linen);
  for(const sx of [-w/2+.12,w/2-.12])box(s,[.24,.65,1.1],[sx,.64,0],linen);
  for(let i=0;i<Math.floor(w/.65);i++){box(s,[.61,.14,.88],[-w/2+.47+i*.66,.67,.05],linen);const pillow=box(s,[.5,.5,.14],[-w/2+.48+i*.66,1,-.3],i%3===0?teal:linen);pillow.rotation.x=.12;}
  for(const sx of [-w/2+.2,w/2-.2])for(const sz of [-.35,.35])box(s,[.07,.22,.07],[sx,.11,sz],dark);
 }
 const rug=material(0xffffff,{map:texture('rug')});box(ground,[6.8,.025,5],[-2.5,.025,2.8],rug);
 sofa(ground,-2.4,1,4.8);sofa(ground,-4.65,2.7,3.4,Math.PI/2);
 block(-4.9,.35,.1,1.7,0);block(-5.3,1,-4,4.5,0);
 box(ground,[2.8,.1,1.4],[-1.8,.55,3.2],dark);for(const x of [-2.8,-.8])box(ground,[.08,.5,.08],[x,.25,3.2],gold);block(-3.2,2.5,-.4,3.9,0);
 plant(ground,-5.3,0,5.1);plant(ground,7.8,0,5.5);
 // Walnut stair wall, glass balustrade and black-framed art gallery.
 box(ground,[.14,7.4,11],[-8.6,3.7,-.2],wood);
 const stairs=new THREE.Group();stairs.name='home-staircase';g.add(stairs);
 for(let i=0;i<28;i++)box(stairs,[2.1,.15,.36],[-7,(i+1)*.15,5-(i+.5)*10/28],wood);
 function rail(parent,a,b){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),o=new THREE.Mesh(new THREE.CylinderGeometry(.032,.032,v.length(),8),gold);o.position.copy(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());parent.add(o);}
 for(const x of [-8.15,-5.85]){
  rail(stairs,[x,1,5],[x,5.2,-5]);
  for(let i=0;i<10;i++){const z=4.5-i;box(stairs,[.045,1,.93],[x,(5-z)*.42+.5,z],glass);}
  block(x-.06,-4.6,x+.06,4.9);
 }
 // Low plinth beneath the staircase closes the empty underside.
 for(let i=0;i<28;i++){const h=(i+1)*.15;box(stairs,[.12,h,.36],[-8.05,h/2,5-(i+.5)*10/28],wood);}
 for(const z of [-1.8,.2,2.2,4.2])for(const y of [4.7,6.2]){
  const frame=box(g,[.08,1.2,1.45],[-8.48,y,z],dark);box(g,[.09,1.05,1.3],[-8.42,y,z],trim);
  for(let j=0;j<4;j++){const art=box(g,[.1,.08+j*.06,.6],[-8.35,y-.35+j*.23,z],j%2?dark:gold);art.rotation.x=j*.4;}
 }
 // Ground-floor dining room: white marble wall, gold grid, illuminated shelving.
 box(ground,[5.3,3.6,.12],[5.4,1.9,-7.82],marble);
 for(const x of [3,5.4,7.8])box(ground,[.025,3.6,.06],[x,1.9,-7.72],gold);
 for(const y of [.2,1.4,2.6,3.7])box(ground,[5.3,.025,.06],[5.4,y,-7.72],gold);
 box(ground,[3.1,.14,1.5],[5.1,.86,-4.5],marble);for(const x of [4,6.2])box(ground,[.13,.8,.8],[x,.4,-4.5],gold);
 for(const x of [4,5.2,6.4])for(const z of [-5.65,-3.35]){box(ground,[.55,.13,.55],[x,.47,z],linen);box(ground,[.55,.7,.12],[x,.8,z+(z<-4?.25:-.25)],linen);}
 block(3.4,-5.9,6.9,-3,0);plant(ground,5.1,.93,-4.5,.55);
 box(ground,[1.8,3.1,.5],[1.9,1.55,-7.4],trim);
 for(let row=0;row<4;row++){box(ground,[1.7,.05,.55],[1.9,.5+row*.7,-7.1],gold);for(let j=0;j<5;j++)box(ground,[.12,.35+(j%2)*.1,.19],[1.35+j*.25,.7+row*.7,-7.05],j%2?wood:teal);}
 // Double-height hanging crystal strands, warm cove lights and gallery mouldings.
 for(let i=0;i<22;i++){
  const a=i*.73,x=-2.7+Math.cos(a)*1.4,z=2.6+Math.sin(a)*1.15,len=1+(i%6)*.32;
  box(g,[.013,len,.013],[x,7.45-len/2,z],gold);
  for(let j=0;j<8;j++){const bead=new THREE.Mesh(new THREE.SphereGeometry(.047,6,5),glow);bead.position.set(x,7.4-len-j*.11,z);g.add(bead);}
 }
 for(const y of [3.75,3.93]){box(g,[11.2,.06,.07],[-2.6,y,-2.45],trim);box(g,[.07,.06,10.3],[2.9,y,2.7],trim);}
 for(const x of [-8.4,8.4])box(g,[.055,.04,11.2],[x,7.52,-1.9],glow);
 for(const z of [-7.4,3.7])box(g,[17,.04,.055],[0,7.52,z],glow);
 for(const x of [3.3,8.6])box(upper,[.04,.04,6.7],[x,3.22,.5],glow);
 // Upper floor reference: grey stone, cream sofa/ottoman, dark wood table, curtains.
 sofa(upper,5.9,-.7,3.7);box(upper,[2,.5,1.25],[5.8,.3,2.9],linen);
 box(upper,[2.3,.13,1.05],[5.9,.6,1.25],wood);box(upper,[2.08,.035,.85],[5.9,.69,1.25],marble);
 for(const x of [5,6.8])box(upper,[.16,.55,.8],[x,.28,1.25],wood);
 block(3.9,-1.35,7.9,-.05,1);block(4.7,.7,7.1,1.8,1);block(4.7,2.25,6.9,3.6,1);
 box(upper,[4.5,2.65,.08],[6,1.65,4.05],glass);
 for(let i=0;i<24;i++)box(upper,[.17,2.7,.18],[3.8+i*.19,1.65,3.92],material(i%2?0x9c988a:0x837f74));
 box(upper,[4.8,.06,.08],[6,3.08,3.8],dark);
 for(const x of [-3.5,.2]){box(upper,[1.3,2.7,.12],[x,1.35,-7.78],wood);for(const y of [.6,1.3,2])box(upper,[1.1,.045,.14],[x,y,-7.68],gold);}
 box(upper,[2.5,.13,1.3],[-1,.85,-5.1],wood);for(const x of [-2,0])for(const z of [-6,-4.2]){box(upper,[.5,.12,.5],[x,.46,z],linen);box(upper,[.5,.6,.08],[x,.8,z+.2],dark);}
 block(-2.8,-6.4,.8,-3.6,1);plant(upper,8,0,3.3,1.4);
 // Continuous glass gallery rails keep the playable upper floor away from the void.
 for(let x=-5.7;x<3;x+=.75)box(upper,[.72,1.05,.04],[x,.55,-2.9],glass);
 rail(upper,[-5.95,1.1,-2.9],[3,1.1,-2.9]);block(-5.95,-3.05,3,-2.75,1);
 for(let z=-2.5;z<4;z+=.75)box(upper,[.04,1.05,.72],[3,.55,z],glass);
 rail(upper,[3,1.1,-2.9],[3,1.1,4.1]);block(2.85,-2.9,3.15,4.1,1);block(-9,4.05,9,4.35,1);
 // Keep the existing packing coordinates, inventory IDs and pickup interactions.
 box(ground,[5.3,.12,.85],[0,1.05,-5.7],wood);block(-2.65,-6.13,2.65,-5.27,0);
 const items=[];for(const [i,[id,label,color]]of [['passport','Paspor',0x234d3d],['ticket','Tiket pesawat',0xe8e6dc],['ihram','Pakaian ihram',0xf2f0e6],['pouch','Tas perlengkapan',0x6c7c82]].entries()){
  const x=-1.9+i*1.2,object=box(ground,[.65,id==='ihram'?.2:.07,.4],[x,1.18,-5.7],material(color),`pickup-${id}`);sign(ground,label,[x,1.65,-5.9],1.05);items.push({id,label,object});
 }
 const bag=suitcase();bag.position.set(2.8,0,-5.5);g.add(bag);items.push({id:'suitcase',label:'Koper kabin',object:bag});
 sign(ground,'PERLENGKAPAN PERJALANAN',[0,1.95,-5.95],3);
 local.addWalkRect(-8.7,-7.7,8.7,19);local.addWalkRect(-9.4,8,9.4,20);local.addWalkRect(-13,19,13,27);
 const active=local.parentEngine||local,head=new THREE.Vector3();
 const isUpper=()=>active.playerPos(head).y>FLOOR+1;
 local.addHeightZone(0,0,14,(x,z)=>{
  if(x>-8.15&&x<-5.85&&z>=-5&&z<=5)return (5-z)/10*FLOOR;
  if(isUpper()&&x>-8.8&&x<8.8&&z>-7.8&&z<4.2&&(z<=-3||x>=3))return FLOOR;
  return 0;
 });
 local.onUpdate(()=>{const floor=isUpper()?1:0;g.userData.floor=floor;for(const b of blockers)if(b.homeFloor!==null){b.disabled=b.homeFloor!==floor;if(b.worldBlocker)b.worldBlocker.disabled=b.disabled;}});
 // Upper furnishings must not obstruct the ground floor before the first update.
 for(const b of blockers)b.disabled=b.homeFloor===1;
 g.userData.upperFloorHeight=FLOOR;g.userData.carPoint={x:-3.9,z:12.1};
 batchArchitecture(ground,local);batchArchitecture(upper,local);batchArchitecture(stairs,local);
 return {checklist:items[0].object,items,car,carDoor,exit:{x:0,z:10},carPoint:{x:-3.9,z:12.1},stairs:{x:-7,startZ:5,endZ:-5,height:FLOOR}};
}

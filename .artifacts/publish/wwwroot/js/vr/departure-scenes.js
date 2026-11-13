import * as THREE from 'three';
import {buildReferenceHome} from './reference-home.js';
import { realisticTravellers } from './realistic-travellers.js';
import { createCharacter, releaseCharacter } from '../hajj-character.js';
import { loadPreferences } from '../game-preferences.js';

const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.65,...extra});
function box(g,size,pos,m,name=''){const o=new THREE.Mesh(new THREE.BoxGeometry(...size),m);o.position.set(...pos);o.name=name;o.receiveShadow=true;g.add(o);return o;}
function round(g,size,pos,m,r=.12){
 const [w,h,d]=size,s=new THREE.Shape(),x=-w/2,y=-h/2;
 s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
 const geo=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2,steps:1,curveSegments:5});geo.translate(0,0,-d/2);
 const o=new THREE.Mesh(geo,m);o.position.set(...pos);g.add(o);return o;
}
export function departureSign(g,text,pos,width=4,{bg='#17343e',fg='#fff6d6'}={}){
 const c=document.createElement('canvas');c.width=1024;c.height=160;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,1024,160);ctx.fillStyle=fg;ctx.font='bold 45px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,80,980);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const o=new THREE.Mesh(new THREE.PlaneGeometry(width,width*160/1024),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));o.position.set(...pos);g.add(o);return o;
}
export function suitcase(color=0x536d79){
 const g=new THREE.Group();g.name='travel-suitcase';const shell=mat(color),dark=mat(0x242b30),metal=mat(0xb6bdc2,{metalness:.65,roughness:.35});
 round(g,[.44,.62,.27],[0,.38,0],shell,.065);
 for(const x of [-.13,-.065,0,.065,.13])box(g,[.012,.49,.015],[x,.39,.146],metal);
 for(const x of [-.14,.14]){box(g,[.025,.4,.025],[x,.88,0],metal);for(const z of [-.1,.1]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.045,8),dark);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.045,z);g.add(wheel);}}
 box(g,[.31,.045,.06],[0,1.08,0],dark);box(g,[.09,.13,.012],[.14,.61,.16],mat(0xf5eed1));return g;
}
export function silverSUV(){
 const g=new THREE.Group();g.name='silver-electric-suv';const paint=mat(0xa8bac3,{metalness:.55,roughness:.3}),glass=mat(0x203344,{metalness:.25,roughness:.16,transparent:true,opacity:.45,depthWrite:false}),rubber=mat(0x171c22),chrome=mat(0xd5dce0,{metalness:.8,roughness:.2});
 round(g,[1.9,.75,4.55],[0,.87,0],paint,.22);
 const cabinGeo=new THREE.BufferGeometry();
 cabinGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.88,1.24,-1.45,.88,1.24,-1.45,.88,1.24,1.7,-.88,1.24,1.7,-.72,1.9,-.8,.72,1.9,-.8,.72,1.9,1.25,-.72,1.9,1.25],3));
 cabinGeo.setIndex([0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0]);cabinGeo.computeVertexNormals();
 const cabinGlass=glass.clone();cabinGlass.opacity=.82;cabinGlass.side=THREE.DoubleSide;g.add(new THREE.Mesh(cabinGeo,cabinGlass));
 round(g,[1.72,.12,2.7],[0,1.93,.25],paint,.1);
 box(g,[1.72,.12,1.2],[0,1.3,-1.63],paint);box(g,[1.76,.15,4.15],[0,.48,0],rubber);
 for(const side of [-1,1]){
  for(const z of [-1.42,1.4]){
   const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.23,24),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(side*.94,.5,z);g.add(wheel);
   const hub=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.235,16),chrome);hub.rotation.z=Math.PI/2;hub.position.copy(wheel.position);g.add(hub);
  }
  for(const z of [.42,1.48])box(g,[.06,.75,.075],[side*.85,1.52,z],paint);
  const pillar=box(g,[.075,.93,.075],[side*.8,1.57,-1.12],paint);pillar.rotation.x=.73;
  for(const z of [-.43,.8])box(g,[.035,.045,.19],[side*.97,1.17,z],chrome);
  round(g,[.22,.16,.3],[side*1.04,1.47,-.9],paint,.05);
  box(g,[.56,.085,.04],[side*.58,1.06,-2.31],new THREE.MeshBasicMaterial({color:0xe1f4ff}));
 }
 box(g,[1.2,.19,.025],[0,.65,-2.32],rubber);departureSign(g,'BANDARA',[0,.9,-2.34],.7).rotation.y=Math.PI;
 box(g,[1.55,.25,.43],[0,1.19,-1.08],rubber);
 const dashboard=box(g,[.38,.21,.025],[0,1.4,-.98],mat(0x1b3440));dashboard.rotation.x=-.2;
 const wheel=new THREE.Mesh(new THREE.TorusGeometry(.17,.025,8,24),rubber);wheel.position.set(.48,1.35,-.85);wheel.rotation.x=.35;g.add(wheel);
 for(const side of [-1,1]){box(g,[.012,.48,.018],[side*.958,.87,.12],rubber);for(let i=0;i<5;i++)box(g,[.12,.018,.02],[side*(.15+i*.12),.7,-2.335],chrome);}
 // A visible passenger seat and dashboard allow an in-car travel viewpoint.
 for(const z of [-.45,.85])for(const x of [-.47,.47]){round(g,[.55,.18,.55],[x,.87,z],mat(0xd4cfc1),.08);round(g,[.55,.65,.15],[x,1.2,z+.28],mat(0xd4cfc1),.08);}
 return g;
}

export function referenceHome(engine){
 return buildReferenceHome(engine,{suitcase,silverSUV,sign:departureSign});
}

export function extendDepartureAirport(engine,refs){
 const g=new THREE.Group();g.name='airport-departure-extension';engine.scene.add(g);
 const white=mat(0xe1e4e0),steel=mat(0x929fa5,{metalness:.5,roughness:.4}),dark=mat(0x3a444b),glass=mat(0xa9d3df,{transparent:true,opacity:.27,depthWrite:false});
 box(g,[90,.12,10],[0,0,35],white);box(g,[110,.08,16],[0,-.08,48],mat(0x495358));
 box(g,[100,.45,23],[0,9,40],white);
 for(let x=-44;x<=44;x+=8){const p=box(g,[1.1,9,1.1],[x,4.5,39],white);p.rotation.z=.07;box(g,[.18,.18,22],[x,8.7,40],steel);for(const z of [32,38])box(g,[.25,.15,4],[x,8.5,z],new THREE.MeshBasicMaterial({color:0xffeac0}));}
 for(let x=-44;x<=44;x+=2){if(Math.abs(x)>4)box(g,[.12,1,.12],[x,.5,39.5],steel);if(x%4===0)box(g,[1.8,.06,.6],[x,.04,40],mat(x%8===0?0xcbb74c:0x343b40));}
 for(const x of [-22,22]){const car=silverSUV();car.position.set(x,0,45);car.rotation.y=Math.PI/2;g.add(car);}
 departureSign(g,'KEBERANGKATAN / DEPARTURES · MASUK TERMINAL',[0,5,30.2],13);
 refs.dropoff={x:0,z:36};engine.addWalkRect(-44,25,44,40);engine.addWalkRect(-5,37,5,48);
 // Replace the old continuous glazing with openings at the entrance and airside gate.
 const terminal=engine.scene.getObjectByName('soekarno-hatta-reference');
 for(const o of [...terminal.children])if(o.isMesh&&o.material===terminal.children.find(q=>q.isMesh&&q.material.transparent)?.material){
  if(Math.abs(o.position.z-29.8)<.2||Math.abs(o.position.x-44.8)<.2)o.visible=false;
 }
 const matrix=new THREE.Matrix4(),p=new THREE.Vector3();
 for(const o of terminal.children)if(o.isInstancedMesh&&o.geometry.parameters?.height===8.6){
  for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);p.setFromMatrixPosition(matrix);if((p.x>44&&p.z>14&&p.z<22)||(Math.abs(p.x)<3&&p.z>29)){matrix.makeScale(0,0,0);o.setMatrixAt(i,matrix);}}
  o.instanceMatrix.needsUpdate=true;
 }
 // Fixed front panes, leaving a six-metre central pedestrian entrance.
 for(const x of [-24,24])box(g,[42,8.5,.1],[x,4.25,29.8],glass);
 for(const [z,len]of [[-8,44],[26,8]])box(g,[.1,8.5,len],[44.8,4.25,z],glass);
 // Sliding glass gate: proximity opens it, and its collider follows the leaves.
 const frame=new THREE.Group();frame.position.set(44.8,0,18);frame.rotation.y=Math.PI/2;g.add(frame);frame.name='automatic-boarding-door';
 box(frame,[7,.4,.45],[0,3.5,0],steel);
 const leaves=[-1,1].map(side=>{const leaf=new THREE.Group();frame.add(leaf);box(leaf,[2.8,3.2,.1],[0,1.6,0],glass);for(const x of [-1.4,1.4])box(leaf,[.055,3.2,.13],[x,1.6,0],steel);box(leaf,[2.8,.08,.12],[0,1.05,0],steel);return {side,leaf};});
 refs.doorState={open:0};const active=engine.parentEngine||engine;
 const blocker={x1:44.55,x2:45.05,z1:15.1,z2:20.9};engine.blockers.push(blocker);
 engine.onUpdate(dt=>{const p=engine.camera.position;const near=Math.hypot(p.x-44.8,p.z-18)<6;refs.doorState.open=THREE.MathUtils.damp(refs.doorState.open,near?1:0,7,dt);for(const {side,leaf}of leaves)leaf.position.x=side*(1.4+refs.doorState.open*2.9);const global=refs.doorCollider;if(global){global.disabled=refs.doorState.open>.82;}frame.userData.open=refs.doorState.open;});
 blocker.dynamicDoor=true;refs.doorBlocker=blocker;
 departureSign(frame,'PINTU OTOMATIS · BOARDING',[0,4.1,0],6);
 engine.addWalkRect(35,14,91,23);engine.addWalkRect(78,7.5,91,23);
 box(g,[46,.12,8],[66,0,18],mat(0xa7adb0));
 for(let x=47;x<81;x+=4)box(g,[2,.02,.14],[x,.08,18],mat(0xddbd4d));
 // Wide-body, four-engine silhouette inspired by the supplied aircraft photo.
 refs.plane.clear();refs.plane.position.set(76,4.5,6);
 const plane=refs.plane,paint=mat(0xe7e8e3,{roughness:.4}),blue=mat(0x125a89),window=mat(0x243b4b);
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(2.1,27,8,24),paint);body.rotation.z=Math.PI/2;plane.add(body);
 const hump=new THREE.Mesh(new THREE.SphereGeometry(1.8,20,12),paint);hump.scale.set(3,1,1);hump.position.set(7,1.1,0);plane.add(hump);
 for(const side of [-1,1]){
  const shape=new THREE.Shape();shape.moveTo(-7,0);shape.lineTo(-12,side*17.5);shape.lineTo(-8,side*17.5);shape.lineTo(3,0);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false});geo.rotateX(Math.PI/2);
  const wing=new THREE.Mesh(geo,paint);wing.position.y=-.4;plane.add(wing);
 }
 box(plane,[6,.15,12],[-13,.1,0],paint);
 box(plane,[4,6,.25],[-13,2.8,0],blue);
 for(const z of [-11,-6,6,11]){const jet=new THREE.Mesh(new THREE.CylinderGeometry(.85,.85,3.4,18),paint);jet.rotation.z=Math.PI/2;jet.position.set(-1,-1.3,z);plane.add(jet);const mouth=new THREE.Mesh(new THREE.CircleGeometry(.72,18),dark);mouth.rotation.y=Math.PI/2;mouth.position.set(.72,-1.3,z);plane.add(mouth);}
 for(const z of [-11,-6,6,11]){const exhaust=new THREE.Mesh(new THREE.CircleGeometry(.68,18),dark);exhaust.rotation.y=-Math.PI/2;exhaust.position.set(-2.72,-1.3,z);plane.add(exhaust);}
 box(plane,[1.9,.55,1.65],[11.8,1.7,0],window);
 for(let x=-11;x<12;x+=.7)for(const side of [-1,1])round(plane,[.23,.34,.04],[x,.3,side*2.08],window,.065);
 for(let x=4;x<12;x+=.7)for(const side of [-1,1])round(plane,[.22,.3,.04],[x,1.8,side*1.4],window,.06);
 for(const x of [-6,6])for(const z of [-1,1]){box(plane,[.12,1.8,.12],[x,-2.8,z],steel);const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.4,12),dark);wheel.rotation.x=Math.PI/2;wheel.position.set(x,-3.9,z);plane.add(wheel);}
 departureSign(plane,'INDONESIA',[1,1,2.11],9,{bg:'#e7e8e3',fg:'#145b83'});
 // Stairway from apron z=22 to the aircraft door at z=9. Cabin entry is an interaction at the landing.
 for(let i=0;i<28;i++)box(g,[2.6,.16,.47],[85,(i+1)*.15,22-i*.46],white);
 for(const x of [83.5,86.5]){const rail=box(g,[.1,.1,13.9],[x,3.1,15.8],steel);rail.rotation.x=Math.atan2(4.2,12.9);engine.addBlocker(x-.08,9.1,x+.08,22.2);}
 box(g,[3,.18,2],[85,4.2,8.8],white);
 // Opaque stair side panels and open doorway at the top landing.
 for(const x of [83.55,86.45]){const panel=box(g,[.1,.8,13.7],[x,2.8,15.6],white);panel.rotation.x=Math.atan2(4.2,12.9);}
 const entry=box(g,[1.15,2.3,.08],[85,5.35,8.12],dark);
 round(g,[1.4,2.5,.08],[86.25,5.35,8.15],white,.2);
 departureSign(g,'EXIT',[85,6.8,8.2],.8);entry.name='aircraft-entry';refs.aircraftEntry=entry;refs.stairStart={x:85,z:22};refs.stairTop={x:85,z:9};
 engine.addHeightZone(85,15,10,(x,z)=>Math.abs(x-85)<1.4&&z>=7.8&&z<=22.5?THREE.MathUtils.clamp((22.5-z)/13.5,0,1)*4.2:0);
 departureSign(g,'NAIK TANGGA · MASUK PESAWAT',[85,2.4,23],5);
 return refs;
}

export function addTravelPeople(local,spots,options={}){
 return realisticTravellers(local,spots,{...options,bagFactory:suitcase});
}

export function enhanceCabin(engine,refs){
 const g=new THREE.Group();g.name='reference-cabin-details';engine.scene.add(g);g.add(new THREE.AmbientLight(0xffe8cf,.6));
 // Warm brown seats, cream monitor surrounds and a row of overhead bins.
 const brown=mat(0x574b3d),cream=mat(0xdcd3ba),dark=mat(0x101b26);
 for(let row=0;row<20;row++)for(const z of [-1.8,-1.3,-.8,.8,1.3,1.8]){
  const x=-12.5+row*1.2;
  round(g,[.09,.66,.46],[x-.21,.82,z],brown,.04);
  box(g,[.025,.28,.36],[x-.29,.94,z],cream);box(g,[.028,.21,.28],[x-.31,.94,z],dark);
  box(g,[.03,.15,.42],[x-.27,1.17,z],mat(0xb5c6cf));
 }
 for(let x=-13;x<13;x+=1.2)for(const z of [-1.75,1.75]){round(g,[1.15,.43,.48],[x,2.13,z],cream,.08);box(g,[.2,.025,.03],[x,1.98,z>0?1.49:-1.49],dark);}
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d');
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(.36,.20),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));screen.position.set(-.83,.98,-.8);screen.rotation.y=-Math.PI/2;screen.name='flight-position-map';g.add(screen);

 const active=engine.parentEngine||engine;let last=-1;
 const route=[[106.65,-6.12],[93,2],[80,8],[65,16],[49,22],[39.6,24.5]];
 const project=(lon,lat)=>[90+(lon-34)/78*840,380-(lat+10)/43*280];
 engine.onUpdate((dt,time)=>{
  const f=active.flightState||(active.flightState={progress:0,target:0,destination:'Madinah',status:'Menunggu keberangkatan'});
  f.progress=THREE.MathUtils.damp(f.progress,f.target||0,1.2,dt);
  if(Math.floor(time*3)===last)return;last=Math.floor(time*3);
  ctx.fillStyle='#122d43';ctx.fillRect(0,0,1024,512);ctx.strokeStyle='#39566a';ctx.lineWidth=1;
  for(let lon=40;lon<=110;lon+=10){const[x]=project(lon,0);ctx.beginPath();ctx.moveTo(x,100);ctx.lineTo(x,400);ctx.stroke();}
  for(let lat=-10;lat<=30;lat+=10){const[,y]=project(40,lat);ctx.beginPath();ctx.moveTo(70,y);ctx.lineTo(950,y);ctx.stroke();}
  ctx.fillStyle='#385e60';
  for(const polygon of [[[34,29],[44,30],[56,24],[52,16],[43,12],[36,22]],[[68,24],[78,30],[89,22],[80,7],[73,12]],[[96,23],[106,22],[110,9],[103,1],[98,4]],[[95,5],[104,-5],[114,-9],[105,-6],[98,0]]]){ctx.beginPath();polygon.forEach(([lon,lat],i)=>{const[x,y]=project(lon,lat);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.fill();}
  const inbound=/Indonesia|Jakarta/.test(f.destination),points=route.map(p=>[...p]);
  if(/Jeddah/.test(f.destination)||/Jeddah/.test(f.origin||''))points[points.length-1]=[39.15,21.67];
  if(inbound)points.reverse();
  ctx.fillStyle='#f7ecd1';ctx.font='bold 28px sans-serif';ctx.fillText('PETA PENERBANGAN · SIMULASI',45,48);ctx.font='21px sans-serif';ctx.fillText(`${f.origin||'Jakarta'} → ${f.destination}   |   ${f.status}`,45,83,930);
  ctx.strokeStyle='#89abb0';ctx.lineWidth=3;ctx.beginPath();points.forEach(([lon,lat],i)=>{const[x,y]=project(lon,lat);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
  const t=THREE.MathUtils.clamp(f.progress,0,1)*(points.length-1),i=Math.min(points.length-2,Math.floor(t)),a=points[i],b=points[i+1],q=t-i;
  const lon=a[0]+(b[0]-a[0])*q,lat=a[1]+(b[1]-a[1])*q;const[x,y]=project(lon,lat);
  ctx.fillStyle='#f6c56b';ctx.beginPath();ctx.moveTo(x-15,y);ctx.lineTo(x+12,y-9);ctx.lineTo(x+6,y);ctx.lineTo(x+12,y+9);ctx.closePath();ctx.fill();
  ctx.fillStyle='#fff';ctx.font='20px sans-serif';for(const[name,lon,lat]of [['Jakarta',106.65,-6.12],['Samudra Hindia',80,-2],[inbound?(f.origin||'Arab Saudi'):f.destination,39.6,24.5]]){const[x,y]=project(lon,lat);ctx.fillText(name,x-35,y+28);}
  ctx.font='22px sans-serif';ctx.fillText(`Posisi simulasi: ${Math.abs(lat).toFixed(1)}° ${lat>=0?'LU':'LS'}  ${lon.toFixed(1)}° BT  ·  ${Math.round(f.progress*100)}%`,45,460);texture.needsUpdate=true;
 });
 refs.assignedSeat={number:'11C',x:-1.7,z:-.8,y:1.25,yaw:-90}; departureSign(g,'11C - KURSI ANDA',[-1.7,1.75,-.8],.65); refs.flightMap=screen;refs.boardingSpawn={x:-14,z:0};return refs;
}

import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

let template;
const paint=(color,roughness=.65,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
function dashboardTexture(){
 const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');
 x.fillStyle='#091219';x.fillRect(0,0,1024,512);
 for(const [cx,label] of [[255,'km/h'],[765,'RPM × 1000']]){
  x.strokeStyle='#b6bcc0';x.lineWidth=5;x.beginPath();x.arc(cx,230,180,.7,Math.PI*2+.4);x.stroke();
  for(let i=0;i<=12;i++){const a=.8+i*.43;x.strokeStyle=i>9?'#d65f39':'#ece8db';x.lineWidth=4;x.beginPath();x.moveTo(cx+Math.cos(a)*150,230+Math.sin(a)*150);x.lineTo(cx+Math.cos(a)*169,230+Math.sin(a)*169);x.stroke();}
  x.fillStyle='#eef1ee';x.font='bold 82px sans-serif';x.textAlign='center';x.fillText(cx===255?'65':'2.4',cx,245);x.font='26px sans-serif';x.fillText(label,cx,288);
  x.strokeStyle='#ed652d';x.lineWidth=7;x.beginPath();x.moveTo(cx,230);x.lineTo(cx-100,130);x.stroke();
 }
 x.fillStyle='#8dc9b8';x.font='25px sans-serif';x.fillText('D   •   JAKARTA ? BANDARA',512,470);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function navigationTexture(){
 const c=document.createElement('canvas');c.width=512;c.height=512;const x=c.getContext('2d');
 x.fillStyle='#15252c';x.fillRect(0,0,512,512);
 x.strokeStyle='#34494d';x.lineWidth=8;for(let i=0;i<8;i++){x.beginPath();x.moveTo(i*85-70,60);x.lineTo(i*85+80,430);x.stroke();x.beginPath();x.moveTo(0,i*55+50);x.lineTo(512,i*55+80);x.stroke();}
 x.strokeStyle='#54cabd';x.lineWidth=14;x.beginPath();x.moveTo(250,415);x.lineTo(250,260);x.lineTo(365,170);x.lineTo(365,70);x.stroke();
 x.fillStyle='#111b23';x.fillRect(0,0,512,65);x.fillRect(0,437,512,75);x.fillStyle='#e8eee9';x.font='bold 29px sans-serif';x.fillText('BANDARA',22,43);x.font='24px sans-serif';x.fillText('JAKARTA    •    24°C',22,480);
 x.fillStyle='#faf3dc';x.beginPath();x.moveTo(250,285);x.lineTo(232,324);x.lineTo(268,324);x.fill();
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function build(){
 const g=new THREE.Group();g.name='private-car-interior';
 const black=paint(0x171b1d,.83),leather=paint(0xa75c2a,.68),insert=paint(0xc18045,.8),stitch=paint(0xe0b27a,.9),metal=paint(0x90999d,.28,.8),rubber=paint(0x090b0c,.92),red=paint(0x9f241d,.4);
 // Subtle leather grain uses one shared 128px bump map rather than extra geometry.
 const grainCanvas=document.createElement('canvas');grainCanvas.width=grainCanvas.height=128;
 const gx=grainCanvas.getContext('2d'),pixels=gx.createImageData(128,128);let seed=73;
 for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const value=105+(seed>>>24)%45;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;}
 gx.putImageData(pixels,0,0);const grain=new THREE.CanvasTexture(grainCanvas);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(5,5);
 for(const material of [leather,insert,black]){material.bumpMap=grain;material.bumpScale=.0007;}
 const add=(geo,mat,p,r)=>{const m=new THREE.Mesh(geo,mat);m.position.set(...p);if(r)m.rotation.set(...r);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
 function panel(w,h,d,p,mat,radius=.025,rot){
  const s=new THREE.Shape(),a=-w/2,b=-h/2,R=Math.min(radius,w/3,h/3);
  s.moveTo(a+R,b);s.lineTo(a+w-R,b);s.quadraticCurveTo(a+w,b,a+w,b+R);s.lineTo(a+w,b+h-R);s.quadraticCurveTo(a+w,b+h,a+w-R,b+h);s.lineTo(a+R,b+h);s.quadraticCurveTo(a,b+h,a,b+h-R);s.lineTo(a,b+R);s.quadraticCurveTo(a,b,a+R,b);
  const geo=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:2,steps:1,curveSegments:4});geo.translate(0,0,-d/2);return add(geo,mat,p,rot);
 }
 function line(points,mat,r=.002){return add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'catmullrom',0),Math.max(4,points.length*3),r,4,false),mat,[0,0,0]);}
 function vent(x,y,z,w=.18){
  panel(w+.025,.09,.025,[x,y,z],metal,.015);panel(w,.068,.03,[x,y,z+.008],rubber,.012);
  for(let i=-2;i<=2;i++)panel(w-.016,.004,.012,[x,y+i*.011,z+.026],black,.001);
  panel(.014,.034,.012,[x,y,z+.034],metal,.003);
 }
 // Low cockpit tub and carpet footwells. Interior faces forward (-Z).
 panel(1.64,.07,1.4,[0,.135,-.04],rubber,.02);
 panel(1.6,.65,.06,[0,.47,.69],black,.025);
 // Swept dash: layered padded top, cognac fascia and silver trim.
 const dash=new THREE.Shape();dash.moveTo(-.83,.45);dash.lineTo(-.78,.70);dash.quadraticCurveTo(-.47,.77,-.16,.70);dash.lineTo(.18,.67);dash.quadraticCurveTo(.56,.72,.80,.67);dash.lineTo(.84,.46);dash.closePath();
 const geo=new THREE.ExtrudeGeometry(dash,{depth:.35,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:3,curveSegments:12});
 add(geo,black,[0,0,-1.0]);
 panel(1.51,.105,.035,[0,.50,-.61],leather,.035);
 line([[-.75,.575,-.60],[-.25,.58,-.60],[.12,.565,-.60],[.73,.565,-.60]],metal,.005);
 panel(.48,.16,.04,[.48,.405,-.63],black,.025);panel(.11,.014,.018,[.48,.47,-.60],metal,.004);
 vent(-.70,.645,-.60,.12);vent(.68,.63,-.60,.16);vent(.02,.64,-.58,.18);
 // Instrument binnacle and recessed emissive gauges.
 panel(.43,.19,.065,[-.43,.695,-.59],black,.045);
 const gauges=new THREE.MeshStandardMaterial({map:dashboardTexture(),emissive:0xffffff,emissiveMap:null,emissiveIntensity:.12,roughness:.5});gauges.emissiveMap=gauges.map;
 add(new THREE.PlaneGeometry(.37,.16),gauges,[-.43,.695,-.535]);
 // Center screen, sloped controls, tunnel, armrest and cup holders.
 panel(.25,.23,.065,[.02,.48,-.54],metal,.02);panel(.235,.215,.07,[.02,.48,-.53],rubber,.018);
 const nav=new THREE.MeshStandardMaterial({map:navigationTexture(),emissive:0xffffff,emissiveIntensity:.18,roughness:.5});nav.emissiveMap=nav.map;
 add(new THREE.PlaneGeometry(.208,.183),nav,[.02,.49,-.475]);
 panel(.23,.065,.58,[0,.30,-.10],black,.035);
 panel(.21,.20,.03,[0,.35,-.34],metal,.02,[-.65,0,0]);
 for(const x of [-.065,0,.065])for(const y of [.32,.37])panel(.035,.025,.018,[x,y,-.303],black,.005);
 panel(.045,.035,.035,[0,.315,-.23],red,.007);
 for(const x of [-.065,.065]){
  const dial=add(new THREE.CylinderGeometry(.023,.023,.017,16),metal,[x,.405,-.335],[Math.PI/2,0,0]);
  panel(.006,.012,.006,[x,.412,-.323],stitch,.001);
 }
 panel(.075,.09,.065,[0,.365,-.07],black,.025);panel(.065,.016,.06,[0,.416,-.07],metal,.015);
 for(const z of [.10,.24]){add(new THREE.CylinderGeometry(.047,.043,.022,20),rubber,[0,.342,z]);add(new THREE.TorusGeometry(.047,.003,5,20),metal,[0,.354,z],[Math.PI/2,0,0]);}
 panel(.19,.085,.28,[0,.39,.46],leather,.035);
 // Leather steering rim with three metallic spokes and inset controls.
 const wheel=new THREE.Group();wheel.position.set(-.43,.66,-.31);wheel.rotation.x=-.18;g.add(wheel);
 const wheelMesh=(geometry,material,p)=>{const m=new THREE.Mesh(geometry,material);m.position.set(...p);wheel.add(m);};
 wheelMesh(new THREE.TorusGeometry(.155,.018,8,40),black,[0,0,0]);
 for(const a of [0,Math.PI,Math.PI*1.5]){const m=new THREE.Mesh(new THREE.BoxGeometry(.125,.026,.02),metal);m.position.set(Math.cos(a)*.075,Math.sin(a)*.075,0);m.rotation.z=a;wheel.add(m);}
 wheelMesh(new THREE.CylinderGeometry(.065,.065,.035,6),black,[0,0,0]);wheel.children[wheel.children.length-1].rotation.x=Math.PI/2;
 wheelMesh(new THREE.CircleGeometry(.018,6),metal,[0,0,.02]);
 for(const x of [-.09,.09])wheelMesh(new THREE.BoxGeometry(.038,.022,.012),rubber,[x,0,.016]);
 // Sculpted bucket seats: low cushion, raised bolsters, tapered back and headrest.
 for(const x of [-.43,.43]){
  panel(.49,.075,.56,[x,.23,.27],black,.04);
  panel(.36,.10,.46,[x,.29,.24],leather,.045);
  panel(.27,.015,.35,[x,.347,.20],insert,.035);
  for(const side of [-1,1]){panel(.075,.13,.43,[x+side*.19,.32,.25],leather,.035);panel(.075,.43,.12,[x+side*.18,.55,.52],leather,.03,[-.12,0,side*-.09]);}
  const back=new THREE.Shape();back.moveTo(-.15,-.235);back.quadraticCurveTo(-.21,-.15,-.18,.09);back.quadraticCurveTo(-.21,.20,-.12,.235);back.lineTo(.12,.235);back.quadraticCurveTo(.21,.20,.18,.09);back.quadraticCurveTo(.21,-.15,.15,-.235);back.closePath();
  const backGeo=new THREE.ExtrudeGeometry(back,{depth:.08,bevelEnabled:true,bevelThickness:.022,bevelSize:.018,bevelSegments:4,curveSegments:8});backGeo.translate(0,0,-.04);add(backGeo,leather,[x,.55,.53],[-.12,0,0]);
  panel(.26,.33,.022,[x,.55,.458],insert,.035,[-.12,0,0]);
  panel(.25,.17,.105,[x,.865,.57],leather,.04);
  panel(.145,.04,.015,[x,.79,.505],metal,.012);panel(.12,.022,.017,[x,.79,.492],rubber,.008);
  // Diamond seams are real geometry and remain visible at oblique VR viewing angles.
  for(let row=0;row<4;row++)for(let col=0;col<3;col++){
   const px=x-.086+col*.086,py=.435+row*.066;
   line([[px,py+.032,.436],[px+.041,py,.436],[px,py-.032,.436],[px-.041,py,.436],[px,py+.032,.436]],stitch,.0009);
  }
  line([[x-.14,.37,.46],[x-.14,.70,.50],[x,.74,.51],[x+.14,.70,.50],[x+.14,.37,.46]],stitch,.0014);
  panel(.034,.055,.045,[x+(x<0?.27:-.27),.32,.43],rubber,.008);panel(.023,.012,.026,[x+(x<0?.27:-.27),.353,.43],red,.004);
 }
 // Door cards, armrests, pull handles and speaker grilles.
 for(const side of [-1,1]){
  panel(.065,.52,1.0,[side*.81,.43,.01],black,.025);
  panel(.075,.14,.82,[side*.77,.46,.01],leather,.03);
  panel(.11,.045,.43,[side*.735,.40,.05],leather,.015);
  panel(.025,.03,.14,[side*.721,.525,-.17],metal,.01);
  panel(.018,.07,.20,[side*.727,.23,-.24],rubber,.02);
  for(let i=0;i<7;i++)line([[side*.713,.207+i*.008,-.32],[side*.713,.207+i*.008,-.17]],metal,.001);
  line([[side*.721,.56,-.45],[side*.721,.55,.35]],stitch,.0015);
 }
 // Batch static cabin parts by material; clone instances share buffers/textures.
 g.updateMatrixWorld(true);const batches=new Map();g.traverse(o=>{if(o.isMesh){const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrixWorld);if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(geo);}});
 const result=new THREE.Group();result.name='private-car-interior';
 for(const [material,geos] of batches){const geometry=mergeGeometries(geos,false);geos.forEach(o=>o.dispose());const m=new THREE.Mesh(geometry,material);m.name='cabin-'+(material===leather?'cognac-leather':material===insert?'quilted-inserts':material===gauges?'instruments':material===nav?'navigation':'trim');m.castShadow=true;m.receiveShadow=true;result.add(m);}
 g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
 result.userData.seats=2;return result;
}
export function createCarInterior(){template??=build();return template.clone(true);}

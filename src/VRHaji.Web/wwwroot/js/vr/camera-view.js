import * as THREE from 'three';

export function attachCameraView(engine){
 const camera=new THREE.PerspectiveCamera(60,1,.1,1200),target=new THREE.Vector3(),offset=new THREE.Vector3(),ray=new THREE.Raycaster();
 const heading=new THREE.Euler(0,0,0,'YXZ');let objects=[],lastScan=-Infinity;
 heading.setFromQuaternion(engine.camera.quaternion,'YXZ');
 const orbit={yaw:heading.y,elevation:Math.atan2(5,8),distance:Math.hypot(5,8)};
 engine.droneOrbit=orbit;
 engine.rotateDrone=(dx,dy)=>{
  heading.setFromQuaternion(engine.camera.quaternion,'YXZ');
  orbit.yaw=heading.y-dx;
  orbit.elevation=THREE.MathUtils.clamp(orbit.elevation+dy,-Math.PI*.44,Math.PI*.47);
  // Movement and avatar facing use the same horizontal heading as the drone.
  engine.camera.rotation.set(0,orbit.yaw,0,'YXZ');
  engine._camTargetYaw=undefined;
 };
 const wheel=event=>{
  if(!engine.droneActive||engine.uiOpen||engine.paused)return;
  event.preventDefault();
  const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?window.innerHeight:1);
  orbit.distance=THREE.MathUtils.clamp(orbit.distance*Math.exp(THREE.MathUtils.clamp(delta,-300,300)*.0015),1.2,30);
 };
 engine.renderer.domElement.addEventListener('wheel',wheel,{passive:false});
 const panel=document.createElement('div');panel.className='camera-view';
 const label=document.createElement('label');label.textContent='Kamera ';label.htmlFor='camera-view-select';
 const select=document.createElement('select');select.id='camera-view-select';
 for(const [value,text]of [['drone','Drone'],['first-person','Orang pertama']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
 try{select.value=localStorage.getItem('vrhaji-camera-view')==='first-person'?'first-person':'drone';}catch{}
 engine.cameraMode=select.value;
 select.onchange=()=>{engine.cameraMode=select.value;try{localStorage.setItem('vrhaji-camera-view',select.value);}catch{}};
 for(const event of ['pointerdown','mousedown','keydown','wheel'])panel.addEventListener(event,e=>e.stopPropagation());
 panel.append(label,select);document.getElementById('vr-root').append(panel);
 engine.updateViewCamera=()=>{
  const xr=engine.renderer.xr.isPresenting;panel.hidden=xr;
  engine.playerPos(target);
  const seated=Math.abs(target.x+7500)<20||Math.abs(target.x+4000)<25;
  engine.droneActive=engine.cameraMode==='drone'&&!xr&&!engine._prayerActive&&!seated;
  engine.viewCamera=engine.droneActive?camera:engine.camera;
  engine.composer.passes[0].camera=engine.viewCamera;
  if(!engine.droneActive)return;
  // Spawns, FPS turns and vehicle exits may change the player's heading.
  heading.setFromQuaternion(engine.camera.quaternion,'YXZ');orbit.yaw=heading.y;
  const horizontal=Math.cos(orbit.elevation)*orbit.distance;
  offset.set(Math.sin(orbit.yaw)*horizontal,Math.sin(orbit.elevation)*orbit.distance,Math.cos(orbit.yaw)*horizontal);
  // Keep the orbit above the player's floor even when looking upwards.
  offset.y=Math.max(offset.y,-1.4);
  const now=performance.now();
  if(now-lastScan>500){
   lastScan=now;objects=[];
   engine.scene.traverseVisible(o=>{if(!o.isMesh||o.isSkinnedMesh||!o.castShadow)return;let p=o;while(p){if(p.name==='JemaahAvatar'||p.name==='player-carried-suitcase'||(engine.vehicleSeat&&p===engine.vehicleSeat.car))return;p=p.parent;}objects.push(o);});
  }
  ray.set(target,offset.clone().normalize());ray.near=.2;ray.far=offset.length();
  const hit=ray.intersectObjects(objects,false)[0];
  if(hit)offset.setLength(Math.max(.35,hit.distance-.25));
  camera.position.copy(target).add(offset);camera.lookAt(target);camera.aspect=engine.camera.aspect;camera.updateProjectionMatrix();camera.updateMatrixWorld();
 };
 engine.updateViewCamera();
 return ()=>{engine.renderer.domElement.removeEventListener('wheel',wheel);engine.rotateDrone=null;delete engine.droneOrbit;panel.remove();engine.updateViewCamera=null;engine.viewCamera=engine.camera;engine.droneActive=false;engine.composer.passes[0].camera=engine.camera;};
}

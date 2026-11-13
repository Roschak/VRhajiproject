import * as THREE from 'three';

// Activity state is scoped to its owner, so closing an older dialog cannot clear a newer action.
export function beginActivity(engine,pose){
 const previous=engine.avatarActivity,token={pose,previous,active:true};engine.avatarActivity=token;
 const cameraY=engine.camera.position.y,serial=engine.teleportSerial;
 const height={ruku:1.0,pickup:1.0,'sit-ground':1.0,'salah-sit':1.0,sujud:.32,haircut:1.25}[pose];
 const adjust=height!==undefined&&!engine.vehicleSeat&&!engine.passengerSeat&&!engine.renderer.xr.isPresenting;
 if(adjust){engine.camera.position.y=engine.getGroundHeight(engine.camera.position.x,engine.camera.position.z)+height;engine._currentY=engine.camera.position.y;}
 return ()=>{token.active=false;if(engine.avatarActivity===token){let restore=previous;while(restore&&!restore.active)restore=restore.previous;engine.avatarActivity=restore;if(adjust&&serial===engine.teleportSerial){engine.camera.position.y=cameraY;engine._currentY=cameraY;}}};
}
export function pulseActivity(engine,pose,duration=.75){const start=performance.now();engine.avatarGesture={pose,start,until:start+duration*1000};}
export function activityFor(engine){
 if(engine.avatarGesture?.until>performance.now())return engine.avatarGesture.pose;
 return engine.avatarActivity?.pose||(engine._prayerActive?engine._avatarPrayerPose||'qiyam':null);
}
export function enterSeat(engine,{x,y,z,yaw=0,kind='seat'}){
 const oldLock=engine.locomotionLocked;
 engine.locomotionLocked=true;engine.spawn(x,z,yaw,y);
 engine.passengerSeat={x,z,eyeY:y,bodyY:y-1.65,yaw:THREE.MathUtils.degToRad(yaw)+Math.PI,kind,oldLock};
 if(engine.renderer.xr.isPresenting){engine.dolly.position.y+=y-engine.playerPos(new THREE.Vector3()).y;engine.dolly.updateMatrixWorld(true);}
}
export function leaveSeat(engine){if(engine.passengerSeat){engine.locomotionLocked=engine.passengerSeat.oldLock;delete engine.passengerSeat;}}
export function wantsLuggage(engine){return engine.departureState?.inventory?.includes('suitcase')===true&&!engine.vehicleSeat&&!engine.passengerSeat&&!activityFor(engine)&&['home','indonesia','madinah','jeddah','cabin'].includes(engine.prayerContext||'home');}

// Aim using the rig's actual bone directions, not assumed Euler axes (male/female rigs differ).
export function createActivityRig(character){
 const root=character.root,byName=new Map(),saved=new Map();
 const key=name=>name.replace(/[^a-z0-9]/gi,'').toLowerCase();
 character.model.traverse(o=>{if(o.isBone)byName.set(key(o.name),o);});
 const bones={get:name=>byName.get(key(name))};
 const pos=name=>{root.updateWorldMatrix(true,true);return root.worldToLocal(bones.get(name).getWorldPosition(new THREE.Vector3()));};
 const aim=(name,child,target)=>{
  const bone=bones.get(name),tip=bones.get(child);if(!bone||!tip)return;
  if(!saved.has(bone))saved.set(bone,bone.quaternion.clone());
  root.updateWorldMatrix(true,true);
  const origin=bone.getWorldPosition(new THREE.Vector3()),from=tip.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
  const to=root.localToWorld(new THREE.Vector3(...target)).sub(origin).normalize();
  const q=new THREE.Quaternion().setFromUnitVectors(from,to).multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
 };
 function arm(side,elbow,hand){aim(`Bip01 ${side} UpperArm`,`Bip01 ${side} Forearm`,elbow);aim(`Bip01 ${side} Forearm`,`Bip01 ${side} Hand`,hand);}
 function legs(mode){
  for(const side of ['L','R']){const sign=side==='L'?1:-1,hip=pos(`Bip01 ${side} Thigh`),x=sign*.12;
   const knee=mode==='kneel'?[x,.55,.30]:[x,hip.y-.06,.43];
   const foot=mode==='kneel'?[x,.52,-.1]:mode==='car'?[x,.82,.78]:[x,.49,.46];
   aim(`Bip01 ${side} Thigh`,`Bip01 ${side} Calf`,knee);aim(`Bip01 ${side} Calf`,`Bip01 ${side} Foot`,foot);
  }
 }
 return {
  restore(){for(const [bone,q]of saved)bone.quaternion.copy(q);saved.clear();},
  handWorld(side='R'){root.updateWorldMatrix(true,true);return bones.get(`Bip01 ${side} Hand`)?.getWorldPosition(new THREE.Vector3());},
  apply({pose,seated=false,car=false,carry=false,phase=.5}){
   if(seated){legs(car?'car':'seat');for(const side of ['L','R']){const s=side==='L'?1:-1;arm(side,[s*.24,1.08,.12],[s*.16,.94,.37]);}}
   if(pose==='sit-ground'||pose==='salah-sit'||pose==='sujud')legs('kneel');
   if(pose==='ruku'||pose==='pickup'){
    aim('Bip01 Spine1','Bip01 Spine2',[0,1.12,.60]);
    for(const side of ['L','R']){const s=side==='L'?1:-1;arm(side,[s*.26,.83,.35],[s*.14,.57,.22]);}
   }else if(pose==='sujud'){
    aim('Bip01 Spine1','Bip01 Spine2',[0,.55,.50]);
    aim('Bip01 Neck','Bip01 Head',[0,.42,.85]);
    for(const side of ['L','R']){const s=side==='L'?1:-1;arm(side,[s*.32,.78,.45],[s*.22,.57,.73]);}
   }else if(['sit-ground','salah-sit','haircut'].includes(pose)){
    for(const side of ['L','R']){const s=side==='L'?1:-1;arm(side,[s*.25,1.05,.08],[s*.14,.92,.35]);}
   }else if(pose==='dua'){
    for(const side of ['L','R']){const s=side==='L'?1:-1;arm(side,[s*.27,1.10,.08],[s*.12,1.36,.35]);}
   }else if(pose==='qiyam'){
    arm('L',[.24,1.02,.12],[-.06,1.12,.23]);arm('R',[-.24,1.02,.12],[.06,1.12,.27]);
   }else if(pose==='takbir'){
    for(const side of ['L','R']){const s=side==='L'?1:-1;arm(side,[s*.34,1.30,.08],[s*.21,1.60,.09]);}
   }else if(pose==='throw'){
    const t=THREE.MathUtils.clamp(phase,0,1);arm('R',[-.30,1.42,.05+.35*t],[-.15,1.65-.30*t,-.25+.95*t]);
   }else if(pose==='reach'){arm('R',[-.23,1.12,.18],[-.14,1.14,.53]);}
   else if(carry){arm('R',[-.29,1.02,-.06],[-.37,.76,-.12]);}
   root.updateWorldMatrix(true,true);
  }
 };
}

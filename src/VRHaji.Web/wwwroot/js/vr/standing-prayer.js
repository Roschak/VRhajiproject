import * as THREE from 'three';

// Qiyam: keep the supplied character, with both hands folded in front of the body.
// Aim in world space so the different bone axes of each rig remain intact.
export function poseStandingPrayer(model) {
 const root=model.parent;
 root.updateWorldMatrix(true,true);
 const bones=new Map();
 model.traverse(o=>{if(o.isBone)bones.set(o.name.replace(/[^a-z0-9]/gi,'').toLowerCase(),o);});
 const find=name=>bones.get(name.replace(/[^a-z0-9]/gi,'').toLowerCase());
 const aim=(boneName,childName,target)=>{
  const bone=find(boneName),child=find(childName);
  if(!bone||!child)return;
  root.updateWorldMatrix(true,true);
  const origin=bone.getWorldPosition(new THREE.Vector3());
  const from=child.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
  const to=root.localToWorld(new THREE.Vector3(...target)).sub(origin).normalize();
  const rotation=new THREE.Quaternion().setFromUnitVectors(from,to).multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));
 };
 for(const side of ['L','R']){
  const sign=side==='L'?1:-1;
  aim(`Bip01 ${side} UpperArm`,`Bip01 ${side} Forearm`,[sign*.24,1.02,.12]);
  aim(`Bip01 ${side} Forearm`,`Bip01 ${side} Hand`,[-sign*.06,1.12,side==='R'?.27:.23]);
 }
 root.updateWorldMatrix(true,true);
}

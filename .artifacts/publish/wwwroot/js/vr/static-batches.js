import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Opt-in for architectural subtrees only: animated actors and ritual targets stay separate.
export function batchArchitecture(root, local) {
 root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert(), groups=new Map(), originals=new Set();
 root.traverse(o=>{
  if(!o.isMesh||o.isInstancedMesh||o.isSkinnedMesh||o.name||Array.isArray(o.material)||o.material.transparent||!o.visible)return;
  const p=new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).applyMatrix4(inverse);
  const key=[o.material.uuid,o.castShadow,o.receiveShadow,Math.floor(p.x/40),Math.floor(p.z/40)].join('/');
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
 });
 let replaced=0,batches=0;
 for(const objects of groups.values()){
  if(objects.length<3)continue;
  const geometries=objects.map(o=>{
   const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
   for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);
   if(!g.attributes.normal)g.computeVertexNormals();
   if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
   g.clearGroups();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));return g;
  });
  const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
  if(!geometry)continue;
  const mesh=new THREE.Mesh(geometry,objects[0].material);mesh.name='static-architecture-batch';
  mesh.castShadow=objects[0].castShadow;mesh.receiveShadow=objects[0].receiveShadow;root.add(mesh);
  for(const o of objects){originals.add(o.geometry);o.removeFromParent();}replaced+=objects.length;batches++;
 }
 local.disposeCallbacks||=[];local.disposeCallbacks.push(()=>originals.forEach(g=>g.dispose()));
 root.userData.batching={replaced,batches};
}

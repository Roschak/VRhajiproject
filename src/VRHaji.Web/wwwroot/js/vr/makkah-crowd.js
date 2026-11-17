import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const FRAMES=24, SAMPLES=256;
const loader=new GLTFLoader();

// The existing character silhouettes and walk clips are baked once, not thousands of times.
async function bakeCharacter(gender,lod){
 const gltf=await loader.loadAsync(`/assets/characters/crowd/${gender}-${lod}.glb?v=6`),model=gltf.scene;
 const sandals=[];model.traverse(o=>{if(/^Sandal/.test(o.name))sandals.push(o);});sandals.forEach(o=>o.removeFromParent());
 model.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(model),scale=1.78/(bounds.max.y-bounds.min.y);
 model.scale.multiplyScalar(scale);model.position.y-=bounds.min.y*scale;model.updateMatrixWorld(true);
 const parts=[];let count=0;model.traverseVisible(o=>{if(o.isMesh){parts.push({mesh:o,start:count});count+=o.geometry.attributes.position.count;}});
 const positions=new Float32Array(count*3),colors=new Float32Array(count*3),indices=[];
 const imageCache=new Map(),c=new THREE.Color();
 for(const {mesh,start}of parts){
  const g=mesh.geometry,m=mesh.material,uv=g.attributes.uv;
  let pixels=null;
  if(m.map?.image){
   if(!imageCache.has(m.map.image)){
    const canvas=document.createElement('canvas');canvas.width=m.map.image.width;canvas.height=m.map.image.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(m.map.image,0,0);
    imageCache.set(m.map.image,ctx.getImageData(0,0,canvas.width,canvas.height));
   }pixels=imageCache.get(m.map.image);
  }
  for(let i=0;i<g.attributes.position.count;i++){
   c.copy(m.color);
   if(pixels&&uv){const x=Math.min(pixels.width-1,Math.max(0,Math.floor(uv.getX(i)*pixels.width))),v=m.map.flipY?1-uv.getY(i):uv.getY(i),y=Math.min(pixels.height-1,Math.max(0,Math.floor(v*pixels.height))),k=(y*pixels.width+x)*4;
    c.multiply(new THREE.Color().setRGB(pixels.data[k]/255,pixels.data[k+1]/255,pixels.data[k+2]/255,THREE.SRGBColorSpace));}
   colors.set([c.r,c.g,c.b],(start+i)*3);
  }
  const index=g.index;for(let i=0;i<(index?.count||g.attributes.position.count);i++)indices.push(start+(index?index.getX(i):i));
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setIndex(indices);
 const width=1024,height=Math.ceil(count*FRAMES*2/width),data=new Float32Array(width*height*4);
 const mixer=new THREE.AnimationMixer(model),clip=gltf.animations.find(c=>/walk/i.test(c.name));
 if(!clip)throw new Error(`Animasi berjalan crowd ${gender} tidak tersedia`);
 mixer.clipAction(clip).play();const v=new THREE.Vector3();
 for(let frame=0;frame<FRAMES;frame++){
  mixer.setTime(clip.duration*frame/FRAMES);model.updateMatrixWorld(true);
  for(const {mesh,start}of parts){mesh.skeleton?.update();for(let i=0;i<mesh.geometry.attributes.position.count;i++){
   mesh.getVertexPosition(i,v);v.applyMatrix4(mesh.matrixWorld);positions.set([v.x,v.y,v.z],(start+i)*3);
  }}
  geometry.computeVertexNormals();const normals=geometry.attributes.normal.array;
  for(let i=0;i<count;i++){
   const p=(frame*count*2+i)*4,n=p+count*4;
   data[p]=positions[i*3];data[p+1]=positions[i*3+1];data[p+2]=positions[i*3+2];
   data[n]=normals[i*3];data[n+1]=normals[i*3+1];data[n+2]=normals[i*3+2];
  }
 }
 const ids=Float32Array.from({length:count},(_,i)=>i);geometry.setAttribute('crowdVertex',new THREE.BufferAttribute(ids,1));
 const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);texture.needsUpdate=true;
 mixer.stopAllAction();mixer.uncacheRoot(model);
 const geometries=new Set(),materials=new Set(),textures=new Set();model.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const t of Object.values(m))if(t?.isTexture)textures.add(t);}o.skeleton?.dispose();});
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
 return {geometry,texture,count,size:new THREE.Vector2(width,height),duration:clip.duration,triangles:indices.length/3};
}

function resample(points){
 const lengths=points.map((p,i)=>p.distanceTo(points[(i+1)%points.length])),length=lengths.reduce((a,b)=>a+b,0),data=new Float32Array(SAMPLES*4);
 for(let i=0;i<SAMPLES;i++){let d=i/SAMPLES*length,j=0;while(d>lengths[j])d-=lengths[j++];const a=points[j],b=points[(j+1)%points.length],u=d/lengths[j],dx=b.x-a.x,dz=b.y-a.y;
  data.set([a.x+dx*u,a.y+dz*u,dx/lengths[j],dz/lengths[j]],i*4);}
 return {data,length};
}

export function createMakkahCrowd(local,{kind='makkah'}={}){
 const group=new THREE.Group();group.name=kind==='mina'?'mina-instanced-crowd':'makkah-instanced-crowd';local.scene.add(group);
 const paths=[],people=[];
 if(kind==='mina'){
  for(const x of [-50,0,50])for(let lane=0;lane<2;lane++){
   const path=paths.length,points=Array.from({length:128},(_,i)=>{const a=-i/128*Math.PI*2;return new THREE.Vector2(x+Math.cos(a)*(8+lane*2),-40+Math.sin(a)*(20+lane*2));});paths.push(resample(points));
   for(let i=0;i<50;i++)people.push({zone:'jumrah',gender:i%2,path,offset:i/50,speed:.65+lane*.08,scale:.96+(i%5)*.02});
  }
 }else{
 // Decreasing angle keeps the Kaaba on the left. All lanes avoid Hijr and Maqam.
 for(let lane=0;lane<30;lane++){
  const radius=18+lane*1.35,points=Array.from({length:256},(_,i)=>new THREE.Vector2(Math.cos(-i/256*Math.PI*2)*radius,Math.sin(-i/256*Math.PI*2)*radius));
  paths.push(resample(points));
  for(let i=0;i<140;i++)people.push({zone:'tawaf',gender:(i+lane)%2,path:lane,offset:(i+.31*(lane%3))/140,speed:.78+(lane%5)*.055,scale:.96+(i%5)*.02});
 }
 // Closed U-shaped circuits leave the east Safa/Marwah building and entrance clear.
 for(let lane=0;lane<40;lane++){
  const inner=138+lane*4,outer=inner+2.1,points=[];
  for(let i=0;i<=96;i++){const a=.56+i/96*(Math.PI*2-1.12);points.push(new THREE.Vector2(Math.cos(a)*inner,Math.sin(a)*inner));}
  for(let i=96;i>=0;i--){const a=.56+i/96*(Math.PI*2-1.12);points.push(new THREE.Vector2(Math.cos(a)*outer,Math.sin(a)*outer));}
  const path=paths.length;paths.push(resample(points));
  for(let i=0;i<140;i++)people.push({zone:'plaza',gender:(i+lane)%2,path,offset:(i+.5*(lane%2))/140,speed:.85+(lane%7)*.045,scale:.96+(i%5)*.02});
 }
 }
 const routeData=new Float32Array(SAMPLES*paths.length*4);paths.forEach((p,i)=>routeData.set(p.data,i*SAMPLES*4));
 const routeTexture=new THREE.DataTexture(routeData,SAMPLES,paths.length,THREE.RGBAFormat,THREE.FloatType);routeTexture.needsUpdate=true;
 people.forEach((p,id)=>{p.invLength=p.speed/paths[p.path].length;p.phase=id*.6180339%1;});
 const time={value:0},batches=[],assets=[];let disposed=false,last=-Infinity;
 const nearByGender=[null,null],farByGender=[null,null],farIds=new Int32Array(people.length);
 function sample(person,t,out){const path=paths[person.path],f=THREE.MathUtils.euclideanModulo(person.offset+t*person.speed/path.length,1)*SAMPLES,i=Math.floor(f),j=(i+1)%SAMPLES,u=f-i;
  return out.set(THREE.MathUtils.lerp(path.data[i*4],path.data[j*4],u),0,THREE.MathUtils.lerp(path.data[i*4+1],path.data[j*4+1],u));}
 group.userData={population:kind==='mina'?{jumrah:300}:{tawaf:4200,plaza:5600},ready:false,sample:(id,t)=>sample(people[id],t,new THREE.Vector3()).toArray(),visibleCount:0};
 const ready=Promise.all(['man','woman'].flatMap((gender,g)=>['near','far'].map(async lod=>{
  const asset=await bakeCharacter(gender,lod);
  if(disposed){asset.geometry.dispose();asset.texture.dispose();return;}
  assets.push(asset);const capacity=lod==='near'?48:Math.ceil(people.length/2),geometry=asset.geometry;
  const routes=new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4),motion=new THREE.InstancedBufferAttribute(new Float32Array(capacity*2),2);
  routes.setUsage(THREE.DynamicDrawUsage);motion.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('crowdRoute',routes);geometry.setAttribute('crowdMotion',motion);
  const material=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  const isFar=lod==='far';
  material.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,{crowdTime:time,crowdPose:{value:asset.texture},crowdPoseSize:{value:asset.size},crowdVertexCount:{value:asset.count},crowdPaths:{value:routeTexture},crowdPathCount:{value:paths.length}});
   shader.vertexShader=shader.vertexShader.replace('void main() {',`
attribute float crowdVertex;
attribute vec4 crowdRoute;
attribute vec2 crowdMotion;
uniform float crowdTime, crowdVertexCount, crowdPathCount;
uniform vec2 crowdPoseSize;
uniform sampler2D crowdPose, crowdPaths;
vec3 poseAt(float frame,float normalOffset){
 float index=frame*crowdVertexCount*2.0+crowdVertex+normalOffset;
 return texture2D(crowdPose,(vec2(mod(index,crowdPoseSize.x),floor(index/crowdPoseSize.x))+.5)/crowdPoseSize).xyz;
}
void main() {
 float phase=fract(crowdTime*crowdMotion.x+crowdMotion.y)*24.0;
 float f0=floor(phase);
 ${isFar ? `
 vec3 gait=poseAt(f0,0.0);
 vec3 gaitNormal=poseAt(f0,crowdVertexCount);
 ` : `
 float f1=mod(f0+1.0,24.0),blend=fract(phase);
 vec3 gait=mix(poseAt(f0,0.0),poseAt(f1,0.0),blend);
 vec3 gaitNormal=normalize(mix(poseAt(f0,crowdVertexCount),poseAt(f1,crowdVertexCount),blend));
 `}
 float travel=fract(crowdRoute.y+crowdTime*crowdRoute.z)*256.0;
 float row=(crowdRoute.x+.5)/crowdPathCount;
 vec4 a=texture2D(crowdPaths,vec2((floor(travel)+.5)/256.0,row));
 vec4 b=texture2D(crowdPaths,vec2((mod(floor(travel)+1.0,256.0)+.5)/256.0,row));
 vec4 route=mix(a,b,fract(travel));vec2 heading=normalize(route.zw);
 mat3 turn=mat3(heading.y,0.0,-heading.x,0.0,1.0,0.0,heading.x,0.0,heading.y);
 `).replace('#include <beginnormal_vertex>','vec3 objectNormal = turn * gaitNormal;').replace('#include <begin_vertex>','vec3 transformed = turn * gait * crowdRoute.w + vec3(route.x, .08, route.y);');
  };
  material.customProgramCacheKey=()=> isFar ? 'makkah-vat-far-v2' : 'makkah-vat-near-v2';
  const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.name=`crowd-${gender}-${lod}`;mesh.frustumCulled=false;mesh.count=0;mesh.castShadow=false;mesh.receiveShadow=false;
  const identity=new THREE.Matrix4();for(let i=0;i<capacity;i++)mesh.setMatrixAt(i,identity);
  const entry={gender:g,lod,mesh,routes,motion,asset,invDuration:1/asset.duration};
  if(lod==='near')nearByGender[g]=entry;else farByGender[g]=entry;
  group.add(mesh);batches.push(entry);
 })) ).then(()=>{if(!disposed){group.userData.ready=true;last=-Infinity;group.userData.geometry=assets.map(a=>({vertices:a.count,triangles:a.triangles}));}}).catch(error=>{group.userData.error=error.message;console.error('Kerumunan Makkah gagal dimuat:',error);});
 const point=new THREE.Vector3(),nearCandidates=[];
 local.onUpdate((_dt,t)=>{
  time.value=t;if(!group.userData.ready||t-last<.35)return;last=t;
  const camera=local.camera,cx=camera.position.x,cz=camera.position.z;
  nearCandidates.length=0;let farCount=0;
  for(let id=0;id<people.length;id++){
   sample(people[id],t,point);
   const dx=point.x-cx,dz=point.z-cz,d2=dx*dx+dz*dz;
   if(d2<256)nearCandidates.push({id,d2});
   else if(d2<32400)farIds[farCount++]=id;
  }
  if(nearCandidates.length>1)nearCandidates.sort((a,b)=>a.d2-b.d2);
  for(const b of batches)b.mesh.count=0;
  for(let k=0;k<nearCandidates.length;k++){
   const id=nearCandidates[k].id,p=people[id],near=nearByGender[p.gender];
   const batch=near.mesh.count<48?near:farByGender[p.gender],i=batch.mesh.count++;
   batch.routes.setXYZW(i,p.path,p.offset,p.invLength,p.scale);batch.motion.setXY(i,p.speed*batch.invDuration,p.phase);
  }
  for(let k=0;k<farCount;k++){
   const id=farIds[k],p=people[id],batch=farByGender[p.gender],i=batch.mesh.count++;
   batch.routes.setXYZW(i,p.path,p.offset,p.invLength,p.scale);batch.motion.setXY(i,p.speed*batch.invDuration,p.phase);
  }
  for(const b of batches){b.routes.needsUpdate=true;b.motion.needsUpdate=true;}
  group.userData.visibleCount=nearCandidates.length+farCount;group.userData.nearCount=nearByGender[0].mesh.count+nearByGender[1].mesh.count;
 });
 local.disposeCallbacks||=[];local.disposeCallbacks.push(()=>{disposed=true;routeTexture.dispose();for(const a of assets)a.texture.dispose();});
 return {group,ready,people,paths,sample};
}

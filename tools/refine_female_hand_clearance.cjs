/* Female posture refinement: upright, symmetric idle stance with both hands clear
 * of the gamis/abaya. Only animation keyframe bytes change; meshes, skin
 * weights and textures are untouched. Always rebuilds from the pre-fix backups,
 * so repeat runs never accumulate rotations.
 *
 * Each entry in POSTURE is a world-space correction applied at the bone pivot:
 *   [degrees about Z (front axis; + swings a hanging limb towards +X = character's left),
 *    degrees about X (side axis)]
 * In idle, IDLE_DAMP also pulls frames towards the upright frame-0 pose to
 * remove the Rocketbox contrapposto hip sway, torso twist and 30-deg head turn
 * while keeping subtle natural breathing.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),T=require('three');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/female-hand-clearance'),assets=path.join(root,'src/VRHaji.Web/wwwroot/assets/characters');
fs.mkdirSync(path.join(out,'before'),{recursive:true});
const POSTURE=process.env.POSTURE_JSON?JSON.parse(process.env.POSTURE_JSON):{
 idle:{
  'Bip01 L Thigh':[2.4,0],'Bip01 R Thigh':[2.4,0],
  'Bip01 Spine2':[2,0],
  'Bip01 L UpperArm':[11,-4],'Bip01 R UpperArm':[-8,-4]
 },
 walk:{'Bip01 L UpperArm':[8,-3],'Bip01 R UpperArm':[-6,-3]},
 run:{'Bip01 L UpperArm':[5,0],'Bip01 R UpperArm':[-4,0]}
};
// Blend factor toward frame-0 upright pose (1 = locked to frame 0, 0 = original motion).
const IDLE_DAMP={
 'Bip01 Pelvis':1,'Bip01 L Thigh':1,'Bip01 R Thigh':1,'Bip01 L Calf':1,'Bip01 R Calf':1,'Bip01 L Foot':1,'Bip01 R Foot':1,
 'Bip01 Spine':.9,'Bip01 Spine1':.9,'Bip01 Spine2':.88,'Bip01 Neck':.9,'Bip01 Head':.9,
 'Bip01 L Clavicle':.9,'Bip01 R Clavicle':.9,
 'Bip01 L UpperArm':.85,'Bip01 R UpperArm':.85,'Bip01 L Forearm':.85,'Bip01 R Forearm':.85,'Bip01 L Hand':.85,'Bip01 R Hand':.85
};
const files=['woman.glb','outfits/woman-gamis.glb','outfits/woman-abaya-khimar.glb','outfits/woman-tunik-rok.glb','crowd/woman-near.glb','crowd/woman-far.glb'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const report=[];
for(const file of files){
 const name=file.replace(/\//g,'_'),backup=path.join(out,'before',name);
 if(!fs.existsSync(backup))fs.copyFileSync(path.join(assets,file),backup);
 const original=fs.readFileSync(backup),result=Buffer.from(original),jsonLength=original.readUInt32LE(12),j=JSON.parse(original.subarray(20,20+jsonLength)),binOffset=28+jsonLength;
 const bone=n=>{const i=j.nodes.findIndex(x=>x.name.replace(/_/g,' ')===n);assert.ok(i>=0,n);return i;};
 const parents=new Map();j.nodes.forEach((n,i)=>(n.children||[]).forEach(child=>parents.set(child,i)));
 function read(index){
  const a=j.accessors[index],v=j.bufferViews[a.bufferView],width={SCALAR:1,VEC3:3,VEC4:4}[a.type];assert.equal(a.componentType,5126);
  const base=binOffset+(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||width*4;
  return Array.from({length:a.count},(_,i)=>Array.from({length:width},(_,k)=>original.readFloatLE(base+i*stride+k*4)));
 }
 const allowed=new Set(),motions=[];
 for(const animation of j.animations){
  const named=POSTURE[animation.name];
  if(!named)continue;
  const channels=animation.channels.map(c=>({node:c.target.node,property:c.target.path,...animation.samplers[c.sampler],times:read(animation.samplers[c.sampler].input).map(v=>v[0]),values:read(animation.samplers[c.sampler].output)}));
  function sample(c,time){
   let hi=c.times.findIndex(t=>t>time);if(hi<0)return c.values.at(-1);if(hi===0)return c.values[0];
   const lo=hi-1,f=(time-c.times[lo])/(c.times[hi]-c.times[lo]);
   if(c.interpolation==='STEP')return c.values[lo];
   if(c.property==='rotation')return new T.Quaternion().fromArray(c.values[lo]).slerp(new T.Quaternion().fromArray(c.values[hi]),f).toArray();
   return c.values[lo].map((v,k)=>v+(c.values[hi][k]-v)*f);
  }
  function worldRotation(index,time){
   if(index===undefined)return new T.Quaternion();
   const n=j.nodes[index],track=channels.find(c=>c.node===index&&c.property==='rotation');
   let q=new T.Quaternion().fromArray(track?sample(track,time):(n.rotation||[0,0,0,1]));
   if(n.matrix&&!track){const p=new T.Vector3(),s=new T.Vector3();new T.Matrix4().fromArray(n.matrix).decompose(p,q,s);}
   return worldRotation(parents.get(index),time).multiply(q);
  }
  if(animation.name==='idle'){
   for(const [boneName,damp] of Object.entries(IDLE_DAMP)){
    const node=j.nodes.findIndex(x=>x.name.replace(/_/g,' ')===boneName);
    if(node<0)continue;
    for(const prop of ['rotation','translation']){
     const track=channels.find(c=>c.node===node&&c.property===prop);
     if(!track||track.times.length<2)continue;
     assert.equal(channels.filter(c=>c.output===track.output).length,1,'Accessor is not shared');
     const accessor=j.accessors[track.output],view=j.bufferViews[accessor.bufferView],base=binOffset+(view.byteOffset||0)+(accessor.byteOffset||0),stride=view.byteStride||(prop==='rotation'?16:12);
     const ref=track.values[0];
     for(let i=0;i<track.times.length;i++){
      let v;
      if(prop==='rotation'){
       v=new T.Quaternion().fromArray(track.values[i]).slerp(new T.Quaternion().fromArray(ref),damp).normalize().toArray();
      }else{
       v=track.values[i].map((x,k)=>x+(ref[k]-x)*damp);
      }
      track.values[i]=v;
      v.forEach((val,k)=>{result.writeFloatLE(val,base+i*stride+k*4);for(let byte=0;byte<4;byte++)allowed.add(base+i*stride+k*4+byte);});
     }
     if(prop==='translation'){
      const mins=[0,1,2].map(k=>Math.min(...track.values.map(v=>v[k])));
      const maxs=[0,1,2].map(k=>Math.max(...track.values.map(v=>v[k])));
      if(accessor.min)accessor.min=mins;if(accessor.max)accessor.max=maxs;
     }
    }
   }
  }
  for(const [boneName,degrees] of Object.entries(named)){
   if(degrees[0]===0&&degrees[1]===0)continue;
   const node=bone(boneName);
   const track=channels.find(c=>c.node===node&&c.property==='rotation');assert.ok(track,boneName+' has no rotation track');
   assert.equal(track.interpolation||'LINEAR','LINEAR');
   assert.equal(channels.filter(c=>c.output===track.output).length,1,'Rotation accessor is not shared');
   const delta=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),T.MathUtils.degToRad(degrees[0])).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),T.MathUtils.degToRad(degrees[1])));
   const accessor=j.accessors[track.output],view=j.bufferViews[accessor.bufferView],base=binOffset+(view.byteOffset||0)+(accessor.byteOffset||0),stride=view.byteStride||16;
   for(let i=0;i<track.times.length;i++){
    const parent=worldRotation(parents.get(node),track.times[i]);
    const q=parent.clone().invert().multiply(delta).multiply(parent).multiply(new T.Quaternion().fromArray(track.values[i])).normalize();
    track.values[i]=q.toArray();
    track.values[i].forEach((v,k)=>{result.writeFloatLE(v,base+i*stride+k*4);for(let byte=0;byte<4;byte++)allowed.add(base+i*stride+k*4+byte);});
   }
   assert.equal(accessor.min,undefined);assert.equal(accessor.max,undefined);
   motions.push({animation:animation.name,bone:boneName,samples:track.times.length,degrees});
  }
 }
 let changed=0;for(let i=0;i<result.length;i++)if(result[i]!==original[i]){assert.ok(allowed.has(i),'Unexpected edit outside keyframe channels');changed++;}
 fs.writeFileSync(path.join(out,name),result);
 if(!process.env.TUNE)fs.writeFileSync(path.join(assets,file),result);
 report.push({file,source_sha256:sha(original),result_sha256:sha(result),changed_bytes:changed,motions});
}
fs.writeFileSync(path.join(out,'animation-audit.json'),JSON.stringify(report,null,2));
console.log(process.env.TUNE?'TUNE: staged in artifacts only.':'PASS: female posture and arm clearance applied.');

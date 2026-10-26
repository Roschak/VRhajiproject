/* Correct the left arm's clothing clearance, preserving every mesh/skin/texture byte.
 * Work from the pre-fix backup so repeat runs never accumulate rotations.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),T=require('three');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/female-hand-clearance'),assets=path.join(root,'src/VRHaji.Web/wwwroot/assets/characters');
fs.mkdirSync(path.join(out,'before'),{recursive:true});
const files=['woman.glb','outfits/woman-gamis.glb','outfits/woman-abaya-khimar.glb'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const report=[];
for(const file of files){
 const name=path.basename(file),backup=path.join(out,'before',name);
 if(!fs.existsSync(backup))fs.copyFileSync(path.join(assets,file),backup);
 const original=fs.readFileSync(backup),result=Buffer.from(original),jsonLength=original.readUInt32LE(12),j=JSON.parse(original.subarray(20,20+jsonLength)),binOffset=28+jsonLength;
 const bone=j.nodes.findIndex(n=>/^Bip01[ _]L[ _]UpperArm$/.test(n.name));assert.ok(bone>=0);
 const parents=new Map();j.nodes.forEach((n,i)=>(n.children||[]).forEach(child=>parents.set(child,i)));
 function read(index){
  const a=j.accessors[index],v=j.bufferViews[a.bufferView],width={SCALAR:1,VEC3:3,VEC4:4}[a.type];assert.equal(a.componentType,5126);
  const base=binOffset+(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||width*4;
  return Array.from({length:a.count},(_,i)=>Array.from({length:width},(_,k)=>original.readFloatLE(base+i*stride+k*4)));
 }
 const allowed=new Set(),motions=[];
 for(const animation of j.animations){
  const degrees={idle:[14,-4],walk:[10,-3],run:[6,0]}[animation.name];assert.ok(degrees,'Unexpected animation');
  const channels=animation.channels.map(c=>({node:c.target.node,property:c.target.path,...animation.samplers[c.sampler],times:read(animation.samplers[c.sampler].input).map(v=>v[0]),values:read(animation.samplers[c.sampler].output)}));
  const arm=channels.find(c=>c.node===bone&&c.property==='rotation');assert.ok(arm);assert.equal(arm.interpolation||'LINEAR','LINEAR');
  assert.equal(channels.filter(c=>c.output===arm.output).length,1,'Rotation accessor is not shared');
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
  const delta=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),T.MathUtils.degToRad(degrees[0])).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),T.MathUtils.degToRad(degrees[1])));
  const accessor=j.accessors[arm.output],view=j.bufferViews[accessor.bufferView],base=binOffset+(view.byteOffset||0)+(accessor.byteOffset||0),stride=view.byteStride||16;
  for(let i=0;i<arm.times.length;i++){
   const parent=worldRotation(parents.get(bone),arm.times[i]);
   const q=parent.clone().invert().multiply(delta).multiply(parent).multiply(new T.Quaternion().fromArray(arm.values[i])).normalize();
   q.toArray().forEach((v,k)=>{result.writeFloatLE(v,base+i*stride+k*4);for(let byte=0;byte<4;byte++)allowed.add(base+i*stride+k*4+byte);});
  }
  // Exported rotation accessors have no bounds requiring a JSON update.
  assert.equal(accessor.min,undefined);assert.equal(accessor.max,undefined);
  motions.push({name:animation.name,samples:arm.times.length,outward_degrees:degrees[0],forward_degrees:-degrees[1]});
 }
 let changed=0;for(let i=0;i<result.length;i++)if(result[i]!==original[i]){assert.ok(allowed.has(i),'Unexpected edit outside left-arm rotation channels');changed++;}
 fs.writeFileSync(path.join(out,name),result);
 report.push({file:name,source_sha256:sha(original),result_sha256:sha(result),changed_bytes:changed,only_left_upper_arm_rotation_changed:true,meshes_materials_skin_weights_and_other_bones_unchanged:true,motions});
}
fs.writeFileSync(path.join(out,'animation-audit.json'),JSON.stringify(report,null,2));
console.log('PASS: staged three female assets; only left upper-arm animation quaternion bytes changed.');

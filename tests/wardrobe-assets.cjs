const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
function sourceDurations(gender){
 const buffer=fs.readFileSync(`src/VRHaji.Web/wwwroot/assets/characters/source/rocketbox-${gender}.glb`);
 const json=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString());
 return Object.fromEntries(json.animations.map(a=>[a.name,Math.max(...a.samplers.map(s=>json.accessors[s.input].max[0]))]));
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1700,height:850}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.BASE_URL||'http://127.0.0.1:5118')+'/');
  const results=await page.evaluate(async()=>{
   const T=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
   const names=['man-gamis','man-ihram','woman-gamis','woman-tunik-rok','woman-abaya-khimar','man-ihram-covered'];
   const scene=new T.Scene();scene.background=new T.Color('#e9e6df');
   scene.add(new T.HemisphereLight(0xffffff,0xaaa394,2));
   for(const [x,z,power] of [[-4,5,2.5],[4,-3,1.5]]){const light=new T.DirectionalLight(0xffffff,power);light.position.set(x,5,z);scene.add(light);}
   const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1700,850);renderer.toneMapping=T.ACESFilmicToneMapping;
   renderer.domElement.id='asset-review';renderer.domElement.style='position:fixed;inset:0;z-index:99999';document.body.append(renderer.domElement);
   const camera=new T.OrthographicCamera(-3.05,3.05,1.525,-1.525,.01,30);camera.position.set(0,1.04,8);camera.lookAt(0,1.04,0);
   const models=[],results=[];
   for(const [index,name] of names.entries()){
    const gltf=await new GLTFLoader().loadAsync('/assets/characters/outfits/'+name+'.glb');
    const model=gltf.scene;model.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y;
    const s=1.78/height;model.scale.multiplyScalar(s);
    const holder=new T.Group();holder.add(model);
    model.position.set(-(bounds.min.x+bounds.max.x)*s/2,-bounds.min.y*s,-(bounds.min.z+bounds.max.z)*s/2);
    holder.position.x=(index-2)*1.12;
    if(index<5)scene.add(holder);
    const mixer=new T.AnimationMixer(model);
    const row={name,clips:gltf.animations.map(c=>c.name),durations:Object.fromEntries(gltf.animations.map(c=>[c.name,c.duration])),height,meshes:0,weighted:true,finite:true};
    model.traverse(o=>{if(o.isMesh){row.meshes++;if(o.isSkinnedMesh){const w=o.geometry.attributes.skinWeight;for(let i=0;i<w.count;i++){const sum=w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i);if(Math.abs(sum-1)>.015)row.weighted=false;}}}});
    for(const clip of gltf.animations){
     const action=mixer.clipAction(clip);action.play();
     for(const phase of [0,.25,.5,.75,.99]){
      mixer.setTime(clip.duration*phase);model.updateMatrixWorld(true);
      model.traverse(o=>{
       if(!o.matrixWorld.elements.every(Number.isFinite))row.finite=false;
       if(o.isSkinnedMesh){
        o.skeleton.update();const position=o.geometry.attributes.position;
        for(let i=0;i<position.count;i+=17){
         const v=new T.Vector3().fromBufferAttribute(position,i);o.applyBoneTransform(i,v);v.applyMatrix4(o.matrixWorld);
         if(!v.toArray().every(Number.isFinite)||v.length()>4)row.finite=false;
        }
       }
      });
     }
     action.stop();
    }
    models.push({holder,model,mixer,clips:gltf.animations});results.push(row);
   }
   const render=(angle,motion='idle',phase=.3)=>{for(const c of models){c.holder.rotation.y=angle;c.mixer.stopAllAction();const clip=c.clips.find(x=>x.name.includes(motion));c.mixer.clipAction(clip).play();c.mixer.setTime(motion==='idle'?.05:clip.duration*phase);}renderer.render(scene,camera);};
   window.reviewWardrobe=render;render(0);
   return results;
  });
  for(const r of results){assert.ok(r.meshes>5,r.name);assert.ok(r.weighted,r.name+' non-normalized skin weights');assert.ok(r.finite,r.name+' invalid motion');for(const clip of ['idle','walk','run'])assert.ok(r.clips.includes(clip),r.name+' missing '+clip);assert.ok(r.height>1&&r.height<2.5,r.name+' scale');}
  for(const r of results){
   const expected=sourceDurations(r.name.startsWith('woman')?'woman':'man');
   // Blender's existing 24 Hz export may round the last sample by one frame;
   // a persistent 30 Hz cloth clock would incorrectly speed up the whole clip.
   for(const [clip,duration] of Object.entries(expected))assert.ok(Math.abs(r.durations[clip]-duration)<=1/24+.001,`${r.name}: ${clip} duration changed during cloth simulation (${r.durations[clip]} vs ${duration})`);
  }
  fs.mkdirSync('artifacts',{recursive:true});
  for(const [name,angle,motion] of [['front',0,'idle'],['back',Math.PI,'idle'],['side',Math.PI/2,'idle'],['three-quarter',Math.PI/5,'idle'],['walk',0,'walk'],['run',0,'run'],['run-side',Math.PI/2,'run']]){
   await page.evaluate(([angle,motion])=>window.reviewWardrobe(angle,motion),[angle,motion]);
   await page.locator('#asset-review').screenshot({path:`artifacts/wardrobe-v3-${name}.png`});
  }
  assert.deepEqual(errors,[]);console.log('PASS: six standalone GLBs load, normalized rig weights, finite idle/walk/run animation, front/back/motion review.');
  console.log(JSON.stringify(results));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

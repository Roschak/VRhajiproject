/* Review the actual staged GLB with the same Three.js renderer used by the app. */
const {chromium}=require('playwright-core');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),asset=process.argv[2]||'male-gamis/man-gamis';
const out=path.join(root,'artifacts',process.argv[2]?asset+'-review':'male-gamis');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><html><head><script type="importmap">{"imports":{"three":"/libs/three/three.module.js","three/addons/":"/libs/three/addons/"}}</script></head><body style="margin:0"></body></html>');}
 const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '');
 const file=path.resolve(relative.startsWith('artifacts/')?root:path.join(root,'src/VRHaji.Web/wwwroot'),relative);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.glb')?'model/gltf-binary':'application/octet-stream');res.end(data);});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1000,height:1200}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  const report=await page.evaluate(async(asset)=>{
   const T=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
   const gltf=await new GLTFLoader().loadAsync('/artifacts/'+asset+'.glb');
   const scene=new T.Scene();scene.background=new T.Color('#b8bdc2');
   const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1000,1200);renderer.setPixelRatio(1);
   renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;document.body.append(renderer.domElement);
   scene.add(new T.HemisphereLight(0xffffff,0x73777f,2.0));
   for(const [x,y,z,p] of [[-3,4,4,2.8],[3,2,-3,2]]){const light=new T.DirectionalLight(0xffffff,p);light.position.set(x,y,z);scene.add(light);}
   const model=gltf.scene;scene.add(model);model.updateMatrixWorld(true);
   const bounds=new T.Box3().setFromObject(model),factor=1.78/(bounds.max.y-bounds.min.y);
   model.scale.multiplyScalar(factor);model.position.set(-(bounds.min.x+bounds.max.x)*factor/2,-bounds.min.y*factor,-(bounds.min.z+bounds.max.z)*factor/2);
   const mixer=new T.AnimationMixer(model),camera=new T.PerspectiveCamera(30,1000/1200,.01,30);
   const report={clips:gltf.animations.map(c=>({name:c.name,duration:c.duration})),meshes:[],finite:true,normalized:true,maxGarmentEdgeStretch:0,poseBounds:[]};
   model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;for(const mat of Array.isArray(o.material)?o.material:[o.material])mat.side=T.DoubleSide;report.meshes.push({name:o.name,vertices:o.geometry.attributes.position.count});if(o.isSkinnedMesh){const w=o.geometry.attributes.skinWeight;for(let i=0;i<w.count;i++){if(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)>.015)report.normalized=false;}}}});
   function pose(motion,phase){mixer.stopAllAction();const c=gltf.animations.find(c=>c.name===motion);mixer.clipAction(c).play();mixer.setTime(c.duration*phase);model.updateMatrixWorld(true);model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});}
   for(const motion of ['idle','walk','run'])for(const phase of [0,.125,.25,.375,.5,.625,.75,.875,.99]){
    pose(motion,phase);const b=new T.Box3();
    model.traverse(o=>{if(o.isSkinnedMesh){const pos=o.geometry.attributes.position;for(let i=0;i<pos.count;i+=7){const v=new T.Vector3().fromBufferAttribute(pos,i);o.applyBoneTransform(i,v);v.applyMatrix4(o.matrixWorld);if(!v.toArray().every(Number.isFinite)||v.length()>3)report.finite=false;b.expandByPoint(v);}
     if(/^(Robe_(Dress|Cuff|Hem)|Abaya|Khimar|Hijab_Gamis|Ihram)/.test(o.name)&&o.geometry.index){const ix=o.geometry.index;for(let i=0;i<ix.count;i+=3){const ai=ix.getX(i),bi=ix.getX(i+1),a=new T.Vector3().fromBufferAttribute(pos,ai),bb=new T.Vector3().fromBufferAttribute(pos,bi),rest=a.distanceTo(bb);if(rest<.001)continue;o.applyBoneTransform(ai,a);o.applyBoneTransform(bi,bb);report.maxGarmentEdgeStretch=Math.max(report.maxGarmentEdgeStretch,a.distanceTo(bb)/rest);}}
    }});
    report.poseBounds.push({motion,phase,min:b.min.toArray(),max:b.max.toArray()});
   }
   window.review=(angle,motion='idle',phase=.05,close=false)=>{
    pose(motion,phase);const target=new T.Vector3(0,close==='waist'?1.0:(close?1.38:.9),0),distance=close?1.25:3.8;
    camera.position.set(Math.sin(angle)*distance,target.y+(close?.03:.05),Math.cos(angle)*distance);camera.lookAt(target);renderer.render(scene,camera);
   };
   window.review(0);return report;
  },asset);
  assert.ok(report.finite,'Finite skeletal deformation');assert.ok(report.normalized,'Normalized skin weights');
  assert.ok(report.maxGarmentEdgeStretch<12,'No explosive cloth/cuff stretches: '+report.maxGarmentEdgeStretch);
  assert.equal(report.clips.length,3,'Only the three original animation clips');
  for(const clip of ['idle','walk','run'])assert.ok(report.clips.some(c=>c.name===clip));
  if(asset.includes('ihram')){
   // glTF splits a cloth mesh into primitives for cotton and woven selvedge.
   const garments=new Set(report.meshes.filter(m=>/^Ihram/.test(m.name)).map(m=>m.name.match(/^Ihram_(Izar|Rida_Tawaf|Rida_Covered)/)?.[0]||m.name));
   assert.equal(garments.size,2,'Exactly two unstitched cloth pieces per outfit');
   assert.ok(garments.has('Ihram_Izar'),'Separate izar');
   assert.ok(garments.has('Ihram_Rida_'+(asset.includes('covered')?'Covered':'Tawaf')),'Correct rida variant');
  }
  for(const [name,angle,motion,phase,close] of [['front',0,'idle',.05,false],['side',Math.PI/2,'idle',.05,false],['back',Math.PI,'idle',.05,false],['three-quarter',Math.PI/5,'idle',.05,false],['shoulder',Math.PI/6,'idle',.05,true],['chest',0,'idle',.05,true],['waist',Math.PI/6,'idle',.05,'waist'],['left',-Math.PI/2,'idle',.05,false],['walk',0,'walk',.3,false],['run',0,'run',.3,false],['run-side',Math.PI/2,'run',.3,false]]){
   await page.evaluate(args=>window.review(...args),[angle,motion,phase,close]);await page.screenshot({path:path.join(out,name+'.png')});
  }
  if(asset.includes('ihram')||asset.includes('female-'))for(const [name,angle,phase] of [['run-left',-Math.PI/2,.3],['run-return',0,.75],['run-return-side',Math.PI/2,.75],['run-return-left',-Math.PI/2,.75]]){
   await page.evaluate(args=>window.review(...args),[angle,'run',phase,false]);await page.screenshot({path:path.join(out,name+'.png')});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'runtime-review.json'),JSON.stringify(report,null,2));
  console.log('PASS: '+asset+'; idle/walk/run across 27 poses, normalized weights, finite deformation, '+(asset.includes('ihram')||asset.includes('female-')?15:11)+' visual captures.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

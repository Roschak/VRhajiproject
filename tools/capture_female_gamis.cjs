/* Capture the staged female gamis in the project's Three.js renderer. */
const {chromium}=require('playwright-core');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const variant=process.argv[2]||'female-gamis';
if(!/^(?:female-gamis(?:-v\d+)?|female-abaya-khimar)$/.test(variant))throw new Error('Expected a staged female outfit directory');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts',variant,'visual');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><html><head><script type="importmap">{"imports":{"three":"/libs/three/three.module.js","three/addons/":"/libs/three/addons/"}}</script></head><body style="margin:0"></body></html>');}
 const rel=decodeURIComponent(url.pathname).replace(/^\/+/,''),file=path.resolve(rel.startsWith('artifacts/')?root:path.join(root,'src/VRHaji.Web/wwwroot'),rel);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'model/gltf-binary');res.end(data);});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1000,height:1200}});
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(async(variant)=>{
   const T=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
   const outfit=variant==='female-abaya-khimar'?'woman-abaya-khimar.glb':'woman-gamis.glb';
   const gltf=await new GLTFLoader().loadAsync('/artifacts/'+variant+'/'+outfit);
   const scene=new T.Scene();scene.background=new T.Color('#b8bdc2');
   const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1000,1200);renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
   scene.add(new T.HemisphereLight(0xffffff,0x73777f,2));for(const [x,y,z,p] of [[-3,4,4,2.8],[3,2,-3,2]]){const l=new T.DirectionalLight(0xffffff,p);l.position.set(x,y,z);scene.add(l);}
   const model=gltf.scene;scene.add(model);const bounds=new T.Box3().setFromObject(model),scale=1.78/(bounds.max.y-bounds.min.y);model.scale.multiplyScalar(scale);model.position.set(-(bounds.min.x+bounds.max.x)*scale/2,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*scale/2);
   model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;for(const m of Array.isArray(o.material)?o.material:[o.material])m.side=T.DoubleSide;}});
   const mixer=new T.AnimationMixer(model),camera=new T.PerspectiveCamera(30,1000/1200,.01,30),motion=gltf.animations.find(a=>a.name==='idle'),walk=gltf.animations.find(a=>a.name==='walk'),run=gltf.animations.find(a=>a.name==='run');
   window.capture=(angle,clip,phase,close)=>{mixer.stopAllAction();mixer.clipAction(clip).play();mixer.setTime(clip.duration*phase);model.updateMatrixWorld(true);const height=close==='waist'?.94:close?1.38:.89,target=new T.Vector3(0,height,0),distance=close?1.1:3.8;camera.position.set(Math.sin(angle)*distance,target.y+(close?.02:.05),Math.cos(angle)*distance);camera.lookAt(target);renderer.render(scene,camera);};
   window.sceneCaptures={motion,walk,run};
  },variant);
  for(const [name,angle,motion,phase,close] of [['front',0,'motion',.05,false],['side',Math.PI/2,'motion',.05,false],['back',Math.PI,'motion',.05,false],['three-quarter',Math.PI/5,'motion',.05,false],['shoulder',Math.PI/6,'motion',.05,true],['chest',0,'motion',.05,true],['waist',Math.PI/6,'motion',.05,'waist'],['walk',0,'walk',.3,false],['run',0,'run',.3,false],['run-side',Math.PI/2,'run',.3,false],['run-return',0,'run',.75,false]]){
   await page.evaluate(args=>{const [a,n,p,c]=args;window.capture(a,window.sceneCaptures[n],p,c);},[angle,motion,phase,close]);await page.screenshot({path:path.join(out,name+'.png')});
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

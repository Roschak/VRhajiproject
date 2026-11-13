const {chromium}=require('playwright-core');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.BASE_URL||'http://localhost:5101')+'/simulasi/haji?tahap=4');await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).waitFor({timeout:120000});
  await page.evaluate(async()=>{const main=await import('/js/vr/main.js');await main.prepareSaudiMap();main.prepareDepartureMap();});
  const routes=await page.evaluate(async()=>{
   const {walkingRoute}=await import('/js/vr/walking-route.js'),e=window.__vrEngine;
   const results=[];
   for(const [name,start,end]of [['Miqat–Haram',{x:-1500,z:44},{x:24,z:20}],['Haram–Safa',{x:80,z:-30},{x:140,z:-5}],['Safa–Marwah',{x:130,z:-5},{x:270,z:-5}],['Around Kaaba',{x:-24,z:0},{x:24,z:0}],['Home exit',{x:-6000,z:-4},{x:-5996,z:12}]]){
    const begin=performance.now(),path=walkingRoute(e,start,end);let blocked=0,length=0,bad=[];
    for(let j=1;j<path.length;j++){const a=path[j-1],b=path[j],d=Math.hypot(b.x-a.x,b.z-a.z);length+=d;for(let k=1;k<=Math.ceil(d/.4);k++){const q=k/Math.ceil(d/.4);if(!e._walkableStatic(a.x+(b.x-a.x)*q,a.z+(b.z-a.z)*q,.2)){blocked++;bad.push([a.x+(b.x-a.x)*q,a.z+(b.z-a.z)*q]);}}}
    results.push({name,points:path.length,blocked,bad,length,ms:Math.round(performance.now()-begin)});
   }return results;
  });console.log(routes);for(const r of routes){assert.ok(r.points>=2,r.name+' route missing');assert.equal(r.blocked,0,r.name+' crosses an obstacle');}
  await page.waitForTimeout(3000);
  const details=await page.evaluate(()=>{const e=window.__vrEngine;return{people:e.scene.getObjectsByProperty('name','realistic-pilgrim').length,map:e.scene.getObjectByName('flight-position-map').position.toArray(),hall:!!e.scene.getObjectByName('enclosed-safa-marwah-gallery')};});console.log(details);assert.ok(details.people>120);assert.ok(details.map[0]<0);assert.ok(details.hall);
  fs.mkdirSync('artifacts/route-review',{recursive:true});
  for(const[name,pos,target]of [['neighborhood',[-6000,1.7,18],[-6030,5,2]],['haram',[45,1.7,35],[0,3,0]],['safa',[145,1.7,-5],[112,15,0]],['seat',[-4001.7,1.25,-.8],[-4000.83,.98,-.8]],['miqat-road',[-1500,1.7,110],[-1500,2,200]]]){
   await page.evaluate(({pos,target})=>{const e=window.__vrEngine;e.spawn(pos[0],pos[2],0,pos[1]);e.camera.lookAt(...target);},{pos,target});await page.waitForTimeout(800);
   const data=await page.evaluate(()=>{const e=window.__vrEngine;e.composer.render();return e.renderer.domElement.toDataURL();});fs.writeFileSync(`artifacts/route-review/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
  }
  assert.deepEqual(errors,[]);console.log('PASS: connected routes avoid obstacles; realistic crowds, enclosed gallery and seatback display.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

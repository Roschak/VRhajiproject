const {chromium}=require('playwright-core');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log(m.text().slice(0,2000));}});
  await page.goto((process.env.BASE_URL||'http://localhost:5102')+'/simulasi/haji?tahap=8');
  await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).waitFor({timeout:120000});
  await page.waitForFunction(()=>{const g=window.__vrEngine?.scene.getObjectByName('makkah-instanced-crowd');if(g?.userData.error)throw Error(g.userData.error);return g?.userData.ready;},{},{timeout:120000});
  await page.evaluate(async()=>{await(await import('/js/vr/main.js')).prepareSaudiMap();});
  await page.waitForFunction(()=>window.__vrEngine.scene.getObjectByName('haram-security-officer')?.userData.ready&&window.__vrEngine.scene.getObjectByName('mina-instanced-crowd')?.userData.ready,{},{timeout:120000});
  const result=await page.evaluate(async()=>{
   const e=window.__vrEngine,g=e.scene.getObjectByName('makkah-instanced-crowd');e.renderer.setAnimationLoop(null);
   const {walkingRoute}=await import('/js/vr/walking-route.js'),{HOTEL}=await import('/js/vr/makkah-landmarks.js');
   const tick=t=>{for(const u of e.updaters)if(!u.done)u.fn(.016,t,u);};e.spawn(40,30);tick(10);
   let moving=0,blocked=0;for(let i=0;i<7000;i++){const a=g.userData.sample(i,10),b=g.userData.sample(i,11);if(Math.hypot(b[0]-a[0],b[2]-a[2])>.1)moving++;if(!e._walkableStatic(a[0],a[2],.2))blocked++;}
   const populations=g.userData.population,meshes=g.children.filter(o=>o.isInstancedMesh);
   const stats={population:populations,moving,blocked,meshCount:meshes.length,visible:g.userData.visibleCount,near:g.userData.nearCount,geometry:g.userData.geometry,
    desk:!!e.scene.getObjectByName('haram-lodging-check'),officer:!!e.scene.getObjectByName('haram-security-officer'),plaza:!!e.scene.getObjectByName('white-makkah-plaza'),clock:!!e.scene.getObjectByName('reference-abraj-clock-tower'),tentCount:e.scene.getObjectByName('reference-jamarat-hall').userData.tentCount,
    hotelRoute:walkingRoute(e,{x:30,z:100},HOTEL).length,
    jumrahRoutes:[-50,0,50].map(x=>walkingRoute(e,{x:700,z:-70},{x:700+x,z:-122}).length)};
   stats.architecture=e.scene.getObjectByName('haram-reference-architecture').userData.batching;
   stats.buildings=e.scene.getObjectByName('makkah-setback-skyline').userData.buildingCount;
   e.camera.lookAt(0,2,0);e.composer.render();e.composer.render();e.renderer.info.autoReset=false;e.renderer.info.reset();e.composer.render();stats.drawCalls=e.renderer.info.render.calls;stats.triangles=e.renderer.info.render.triangles;
   const parent=g.parent;const solo=new (await import('three')).Scene();solo.add(g);solo.add(new (await import('three')).AmbientLight(0xffffff,1));e.renderer.info.reset();e.renderer.render(solo,e.camera);stats.crowdDrawCalls=e.renderer.info.render.calls;stats.crowdTriangles=e.renderer.info.render.triangles;parent.add(g);e.renderer.info.autoReset=true;
   const minacrowd=e.scene.getObjectByName('mina-instanced-crowd');stats.jumrahPeople=minacrowd.userData.population.jumrah;
   const officer=e.scene.getObjectByName('haram-security-officer');e.spawn(27,121);e.narrator.enabled=false;e.addInteractable(officer,{label:'Pemeriksaan petugas',radius:4,onClick:()=>{stats.officerHit=true;}});
   const ray=new (await import('three')).PerspectiveCamera();ray.position.copy(e.camera.position);ray.lookAt(27,1.2,118);ray.updateMatrixWorld(true);e.scene.updateMatrixWorld(true);e._onVRSelect(ray);e.removeInteractable(officer);
   return stats;
  });console.log(JSON.stringify(result,null,2));
  assert.deepEqual(result.population,{tawaf:3000,plaza:4000});assert.equal(result.moving,7000);assert.equal(result.blocked,0);assert.equal(result.meshCount,4);assert.equal(result.crowdDrawCalls,4);assert.ok(result.near<=96);assert.equal(result.desk,false);assert.ok(result.officer&&result.plaza&&result.clock);assert.ok(result.officerHit);assert.equal(result.jumrahPeople,300);assert.ok(result.tentCount>500);assert.ok(result.hotelRoute>1);assert.ok(result.jumrahRoutes.every(n=>n>1));
  assert.ok(result.buildings>=120,'Dense city skyline');
  fs.mkdirSync('artifacts/makkah-scale',{recursive:true});
  for(const [name,pos,target]of [['tawaf',[40,1.7,25],[0,3,0]],['plaza',[60,1.7,150],[40,120,390]],['officer',[27,1.7,121],[27,1.2,118]],['jumrah',[750,1.7,-122],[750,6,-140]],['tents',[700,15,20],[600,4,70]]]){
   const data=await page.evaluate(({pos,target})=>{const e=window.__vrEngine;e.spawn(pos[0],pos[2],0,pos[1]);for(const u of e.updaters)if(!u.done)u.fn(.016,20,u);e.camera.lookAt(...target);e.composer.render();return e.renderer.domElement.toDataURL();},{pos,target});fs.writeFileSync('artifacts/makkah-scale/'+name+'.png',Buffer.from(data.split(',')[1],'base64'));
  }
  assert.deepEqual(errors,[]);console.log('PASS: 7,000 moving GPU pilgrims, four crowd batches, clear routes, direct officer inspection, white plaza and reference landmarks.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

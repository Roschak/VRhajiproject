const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.BASE_URL||'http://localhost:5102';
  await page.goto(base+'/simulasi/umrah?tahap=4');
  await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).waitFor({timeout:120000});
  const spawn=await page.evaluate(()=>({position:window.__vrEngine.camera.position.toArray(),pending:window.__vrEngine.haramEntryPending}));
  assert.equal(spawn.position[0],30);assert.equal(spawn.position[2],124);assert.ok(spawn.pending);
  await page.evaluate(async()=>{const m=await import('/js/vr/main.js');await m.prepareSaudiMap();m.prepareDepartureMap();});
  await page.waitForFunction(()=>window.__vrEngine.scene.getObjectByName('makkah-instanced-crowd')?.userData.ready && window.__vrEngine.scene.getObjectByName('area-indonesia')?.getObjectsByProperty('name','realistic-pilgrim').length===72 && window.__vrEngine.scene.getObjectByName('area-masaa')?.getObjectsByProperty('name','realistic-pilgrim').length===64,{},{timeout:60000});
  const result=await page.evaluate(async()=>{
   const e=window.__vrEngine,THREE=await import('three');e.renderer.setAnimationLoop(null);
   const count=key=>{const g=e.scene.getObjectByName('area-'+key);return {people:g.getObjectsByProperty('name','realistic-pilgrim').length,bags:g.getObjectsByProperty('name','travel-suitcase').length};};
   const masaa=e.scene.getObjectByName('area-masaa'),people=masaa.getObjectsByProperty('name','realistic-pilgrim');
   e.spawn(200,-5);const before=people.map(p=>p.position.clone());
   for(let i=0;i<40;i++)for(const u of e.updaters)if(!u.done)u.fn(.025,i*.025,u);
   let wrong=0,moving=0;
   people.forEach((p,i)=>{const a=before[i],dx=p.position.x-a.x;if(Math.abs(dx)>.1)moving++;if(a.x>-60&&a.x<60&&(a.z<0?dx<=0:dx>=0))wrong++;});
   const airport=e.scene.getObjectByName('area-indonesia'),travellers=airport.getObjectsByProperty('name','realistic-pilgrim');
   e.spawn(-5015,0);const earlier=travellers.map(p=>p.position.clone());
   for(let i=0;i<80;i++)for(const u of e.updaters)if(!u.done)u.fn(.025,i*.025+2,u);
   const airportMoving=travellers.filter((p,i)=>p.position.distanceTo(earlier[i])>.1).length;
   const {walkingRoute}=await import('/js/vr/walking-route.js');
   const entry=walkingRoute(e,{x:30,z:124},{x:27,z:121}),inside=walkingRoute(e,{x:27,z:121},{x:30,z:100});
   const turning=walkingRoute(e,{x:270,z:-5},{x:270,z:5});
   const {HOTEL}=await import('/js/vr/makkah-landmarks.js'); const hotel=walkingRoute(e,{x:30,z:100},HOTEL);
   const prayers=e.scene.getObjectsByProperty('name','realistic-pilgrim').filter(p=>p.userData.activity==='prayer');
   for(const p of prayers){
    p.updateWorldMatrix(true,true);
    const hands=[];p.traverse(o=>{if(o.isBone&&/Bip01[ _][LR][ _]Hand$/.test(o.name))hands.push(p.worldToLocal(o.getWorldPosition(new THREE.Vector3())));});
    if(hands.length!==2||hands.some(h=>Math.abs(h.x)>.32||h.z<.08))throw new Error('Prayer hands must be folded in front of body');
    const facing={x:Math.sin(p.rotation.y),z:Math.cos(p.rotation.y)};
    if(facing.x*(-p.position.x)+facing.z*(-p.position.z)<Math.hypot(p.position.x,p.position.z)-.01)throw new Error('Prayer must face Kaaba');
    if(!e._walkableStatic(p.position.x,p.position.z,.2))throw new Error('Prayer overlaps landmark');
    if(Math.hypot(p.position.x,p.position.z)>17.5)throw new Error('Prayer overlaps tawaf lane');
   }
   const spread={x:Math.max(...travellers.map(p=>p.position.x))-Math.min(...travellers.map(p=>p.position.x)),z:Math.max(...travellers.map(p=>p.position.z))-Math.min(...travellers.map(p=>p.position.z))};
   return {spread,prayers:prayers.length,population:e.scene.getObjectByName('makkah-instanced-crowd').userData.population,counts:Object.fromEntries(['home','indonesia','cabin','haram','masaa','miqat'].map(k=>[k,count(k)])),wrong,moving,airportMoving,entry:entry.length,inside:inside.length,turning:turning.length,hotel:hotel.length};
  });
  console.log(result);assert.equal(result.wrong,0);assert.equal(result.moving,64);assert.equal(result.airportMoving,72);
  assert.ok(result.spread.x>60&&result.spread.z>40);assert.equal(result.prayers,18);assert.deepEqual(result.population,{tawaf:4200,plaza:5600});
  for(const key of ['cabin','haram','masaa','miqat'])assert.equal(result.counts[key].bags,0,key+' must have no NPC luggage');
  assert.ok(result.entry>1&&result.inside>1&&result.turning>1&&result.hotel>1);
  fs.mkdirSync('artifacts/crowd-flow',{recursive:true});
  for(const [name,pos,target]of [['prayers',[5,5,-20],[0,1,-15]],['maqam',[19,4,16],[12,1,10]],['airport',[-5000,3,26],[-5000,1,0]],['entry',[30,1.7,124],[24,1.7,118]],['safa',[140,1.7,-5],[110,22,0]],['lanes',[200,4,-11],[265,2,0]]]){
   const data=await page.evaluate(({pos,target})=>{const e=window.__vrEngine;e.spawn(pos[0],pos[2],0,pos[1]);for(const u of e.updaters)if(!u.done)u.fn(.016,5,u);e.camera.lookAt(...target);e.composer.render();return e.renderer.domElement.toDataURL();},{pos,target});
   fs.writeFileSync('artifacts/crowd-flow/'+name+'.png',Buffer.from(data.split(',')[1],'base64'));
  }
  assert.deepEqual(errors,[]);console.log('PASS: entrance spawn, reachable checkpoint, luggage policy, moving airport crowd and opposing sai lanes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

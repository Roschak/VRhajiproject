const {chromium}=require('playwright-core');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.BASE_URL||'http://localhost:5102')+'/simulasi/haji?tahap=1');
  await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).waitFor({timeout:120000});
  const result=await page.evaluate(async()=>{
   const e=window.__vrEngine;e.renderer.setAnimationLoop(null);e.uiOpen=false;e.locomotionLocked=false;
   const {walkingRoute}=await import('/js/vr/walking-route.js');
   const home=e.scene.getObjectByName('reference-family-home');
   const tick=()=>{e._movePlayer(.025);for(const u of e.updaters)if(!u.done)u.fn(.025,1,u);};
   e.spawn(-6007,6,0);for(let i=0;i<10;i++)tick();e.keys.KeyW=true;
   for(let i=0;i<600&&e.camera.position.z>-6.7;i++)tick();e.keys.KeyW=false;for(let i=0;i<50;i++)tick();
   const upstairs=e.camera.position.toArray(),floor=home.userData.floor;
   // Approach the gallery edge on the upper floor; the railing must stop movement.
   e.spawn(-5995,0,90,5.9);for(let i=0;i<10;i++)tick();e.keys.KeyW=true;for(let i=0;i<140;i++)tick();e.keys.KeyW=false;
   const railStopped=e.camera.position.x>-5997.5;
   // Walk back down the same physical staircase; no floor-selection teleport needed.
   e.spawn(-6007,-5.3,180,5.9);for(let i=0;i<10;i++)tick();e.keys.KeyW=true;
   for(let i=0;i<600&&e.camera.position.z<6;i++)tick();e.keys.KeyW=false;for(let i=0;i<80;i++)tick();
   const downstairs=e.camera.position.toArray();
   const packing=walkingRoute(e,{x:-6000,z:3},{x:-6000,z:-4});
   const carRoute=walkingRoute(e,{x:-6000,z:10},{x:-6003.9,z:12.1});
   const car=home.getObjectByName('silver-electric-suv');
   return {upstairs,downstairs,floor,railStopped,packing:packing.length,carRoute:carRoute.length,carX:car.position.x,carZ:car.position.z,pickups:['passport','ticket','ihram','pouch'].every(id=>!!home.getObjectByName('pickup-'+id))};
  });console.log(result);
  assert.ok(result.upstairs[2]<-6&&result.upstairs[1]>5.8&&result.floor===1,'Stairs must ascend to the actual second floor');
  assert.ok(result.downstairs[2]>5.5&&result.downstairs[1]<1.8,'Stairs must descend to ground level');
  assert.ok(result.railStopped&&result.packing>1&&result.carRoute>1&&result.pickups);assert.ok(result.carX<0&&result.carZ>8);
  fs.mkdirSync('artifacts/reference-home',{recursive:true});
  for(const[name,pos,target]of [
   ['exterior',[-6000,3.6,28],[-6000,3.4,7]],
   ['living',[-5998,1.7,6],[-6004,2.4,0]],
   ['gallery',[-5995,5.9,-6.8],[-6003,4.8,2]],
   ['upstairs',[-5991.6,5.9,3.5],[-5995,5.8,-1.5]]
  ]){
   const data=await page.evaluate(({pos,target})=>{const e=window.__vrEngine;e.spawn(pos[0],pos[2],0,pos[1]);for(const u of e.updaters)if(!u.done)u.fn(0,0,u);e.camera.lookAt(...target);e.camera.updateMatrixWorld();e.composer.render();return e.renderer.domElement.toDataURL();},{pos,target});
   fs.writeFileSync(`artifacts/reference-home/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
  }
  assert.deepEqual(errors,[]);console.log('PASS: two-floor walking, gallery guardrails, accessible packing and new carport, visual captures.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

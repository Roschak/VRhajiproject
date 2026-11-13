const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.BASE_URL||'http://localhost:5102')+'/simulasi/umrah');
  await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).waitFor({timeout:120000});
  const result=await page.evaluate(async()=>{
   const e=window.__vrEngine;e.renderer.setAnimationLoop(null);
   const {walkingRoute}=await import('/js/vr/walking-route.js');
   const path=walkingRoute(e,{x:-6000,z:10},{x:-6003.9,z:12.1});
   const houses=e.scene.getObjectsByProperty('name','reference-neighborhood-house');
   const {JourneyWorld}=await import('/js/vr/journey-world.js');
   window.sceneryTestWorld=new JourneyWorld(e);
   const car=window.sceneryTestWorld.vehicle('Mobil');
   e.spawn(-7599.55,0,0,1.65);
   const camera=e.camera.position.clone(),position=car.position.clone(),drive=car.userData.jakartaDrive;
   const first=drive.segments[3].position.z;
   for(let i=0;i<100;i++)window.sceneryTestWorld.update(.1,i*.1);
   const moved=drive.segments[3].position.z-first;
   const stable=position.equals(car.position)&&camera.equals(e.camera.position);
   for(let i=0;i<1000;i++)window.sceneryTestWorld.update(.1,10+i*.1);
   const wrapped=drive.segments.every(s=>s.position.z<=200&&s.position.z>=-700);
   car.visible=false;
   return {houses:houses.length,path:path.length,moved,stable,wrapped,monas:!!car.getObjectByName('jakarta-monas'),segments:drive.segments.length};
  });
  assert.ok(result.houses>=30&&result.path>1);assert.ok(result.moved>170&&result.stable&&result.wrapped&&result.monas);assert.equal(result.segments,9);
  fs.mkdirSync('artifacts/indonesia-scenery',{recursive:true});
  for(const [name,pos,target,car]of [
   ['neighborhood',[-6016,2.8,23],[-6080,3,23],false],
   ['home-street',[-6000,2,16],[-6018,3,44],false],
   ['jakarta-windshield',[-7599.55,1.65,0],[-7599.55,1.65,-80],true],
   ['jakarta-window',[-7599.55,1.65,0],[-7660,17,-45],true]
  ]){
   const data=await page.evaluate(({pos,target,car})=>{
    const e=window.__vrEngine;e.spawn(pos[0],pos[2],0,pos[1]);
    window.sceneryTestWorld.carTransport.visible=car;
    if(car)window.sceneryTestWorld.carTransport.userData.jakartaDrive.segments.forEach((s,i)=>{s.position.z=-350+i*100;});
    for(const u of e.updaters)if(!u.done)u.fn(0,0,u);
    e.camera.lookAt(...target);e.camera.updateMatrixWorld();e.composer.render();return e.renderer.domElement.toDataURL();
   },{pos,target,car});
   fs.writeFileSync(`artifacts/indonesia-scenery/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
  }
  assert.deepEqual(errors,[]);console.log('PASS',result);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

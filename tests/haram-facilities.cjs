const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 try {
  const page=await browser.newPage();
  await page.goto('http://localhost:5101/simulasi/haji?tahap=8');
  await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).waitFor({timeout:120000});
  const result=await page.evaluate(async()=>{
   await (await import('/js/vr/main.js')).prepareSaudiMap();
   const e=window.__vrEngine;e.renderer.setAnimationLoop(null);e.uiOpen=false;e.locomotionLocked=false;
   const tick=()=>{e._movePlayer(.025);for(const u of e.updaters)if(!u.done)u.fn(.025,0,u);};
   e.spawn(-2.5,-78,0);e.keys.KeyW=true;
   for(let i=0;i<700&&e.camera.position.z>-100;i++)tick();
   e.keys.KeyW=false;for(let i=0;i<40;i++)tick();
   const ascent={x:e.camera.position.x,z:e.camera.position.z,y:e.camera.position.y,level:e.navigationLevel};
   const edgeBlocked=!e._walkableStatic(0,60),galleryWalkable=e._walkableStatic(12,-99);
   await e.teleport(2.5,-100,180,0);
   const teleportLevel=e.navigationLevel;
   e.keys.KeyW=true;
   for(let i=0;i<700&&e.camera.position.z<-78;i++)tick();
   e.keys.KeyW=false;for(let i=0;i<50;i++)tick();
   const descent={z:e.camera.position.z,y:e.camera.position.y,level:e.navigationLevel};
   const floor=e.scene.getObjectByName('mataf-floor');
   const path=[[103,-30,130,-30],[130,-30,130,-6],[130,-6,145,-6]];
   const blocked=[];
   for(const [x1,z1,x2,z2] of path)for(let t=0;t<=1;t+=.02){const x=x1+(x2-x1)*t,z=z1+(z2-z1)*t;if(!e._walkableStatic(x,z,.2))blocked.push([x,z]);}
   return {ascent,descent,edgeBlocked,galleryWalkable,teleportLevel,blocked,emissive:floor.material.emissive.getHex(),carpets:e.scene.getObjectsByProperty('name','continuous-prayer-carpet').length};
  });
  console.log(JSON.stringify(result));
  assert.equal(result.ascent.level,1);assert.ok(result.ascent.y>11&&result.ascent.z<-99);
  assert.equal(result.edgeBlocked,true);assert.equal(result.galleryWalkable,true);assert.equal(result.teleportLevel,1);
  assert.equal(result.descent.level,0);assert.ok(result.descent.y<1.85&&result.descent.z>-80);
  assert.equal(result.emissive,0);assert.equal(result.carpets,8);
  assert.deepEqual(result.blocked,[],'Roofed connector must be walkable throughout');
  console.log('PASS: walking ascent/descent, upper gallery boundaries, teleport preserves floor, non-emissive tiles, continuous carpet wings.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

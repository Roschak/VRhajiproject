const {chromium}=require('playwright-core');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
try{const page=await browser.newPage();await page.goto((process.env.BASE_URL||'http://localhost:5101')+'/simulasi/umrah');await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).waitFor({timeout:120000});
await page.evaluate(async()=>{(await import('/js/vr/main.js')).prepareDepartureMap();});await page.waitForTimeout(1500);
await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).click();
for(let i=0;i<30;i++){
 const ready=await page.evaluate(()=>window.__vrEngine.scene.getObjectByName('pickup-passport')?.userData.interact?.enabled);
 if(ready)break;await page.evaluate(()=>window.__vrEngine.skipStep());await page.waitForTimeout(100);
}
const collected=await page.evaluate(async()=>{
 const THREE=await import('three'),e=window.__vrEngine,order=['suitcase','pouch','passport','ihram','ticket'];
 e.movePlayerTo(-6000,-4);
 for(const id of order){
  const o=id==='suitcase'?e.scene.getObjectByName('reference-family-home').children.find(o=>o.name==='travel-suitcase'):e.scene.getObjectByName(`pickup-${id}`);
  const camera=new THREE.PerspectiveCamera();camera.position.set(-6000,1.7,-4);camera.lookAt(o.getWorldPosition(new THREE.Vector3()));camera.updateMatrixWorld(true);e._onVRSelect(camera);
 }
 return [...e.departureState.inventory];
});assert.deepEqual(collected,['suitcase','pouch','passport','ihram','ticket'],'Pickups must work in arbitrary order using controller rays');
const result=await page.evaluate(async()=>{
 const e=window.__vrEngine;e.renderer.setAnimationLoop(null);e.uiOpen=false;e.locomotionLocked=false;
 const tick=(moving=false)=>{if(moving)e._movePlayer(.025);for(const u of e.updaters)if(!u.done)u.fn(.025,1,u);};
 e.spawn(-5000,36);for(let i=0;i<80;i++)tick();const closed=!e._walkableStatic(-4955.2,18,.2);
 e.spawn(-4958,18,-90);for(let i=0;i<80;i++)tick();const opened=e._walkableStatic(-4955.2,18,.2);
 e.keys.KeyW=true;for(let i=0;i<250&&e.camera.position.x<-4952;i++)tick(true);e.keys.KeyW=false;
 const crossed=e.camera.position.x>-4953;
 e.spawn(-4915,22,0);e.keys.KeyW=true;for(let i=0;i<500&&e.camera.position.z>9;i++)tick(true);e.keys.KeyW=false;for(let i=0;i<60;i++)tick(true);
 const stairs={x:e.camera.position.x,z:e.camera.position.z,y:e.camera.position.y};
 e.spawn(-5000,36);for(let i=0;i<80;i++)tick();const closedAgain=!e._walkableStatic(-4955.2,18,.2);
 const items=e.scene.getObjectsByProperty('name','pickup-passport').length;
 return {closed,opened,crossed,closedAgain,stairs,items,cabinMap:!!e.scene.getObjectByName('flight-position-map'),crowds:e.scene.getObjectsByProperty('name','travellers-with-luggage').length};
});console.log(JSON.stringify(result));assert.ok(result.closed&&result.opened&&result.crossed&&result.closedAgain,'Automatic sliding door must open, allow passage, and close');
assert.ok(result.stairs.z<9.3&&result.stairs.y>5.7&&result.stairs.y<6.1,'Aircraft stairs must be physically climbable');assert.equal(result.items,1);assert.equal(result.cabinMap,true);assert.ok(result.crowds>=3);
console.log('PASS: proximity door collider, actual walking through gate, stair ascent, home pickups, cabin map and luggage crowds.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

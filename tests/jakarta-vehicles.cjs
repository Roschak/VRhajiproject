const {chromium}=require('playwright-core'),fs=require('fs');
fs.mkdirSync('artifacts/jakarta-vehicles',{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader']});try{
const page=await browser.newPage({viewport:{width:1200,height:800}});page.on('pageerror',e=>console.log('PAGE ERROR',e.message));await page.goto((process.env.BASE_URL||'http://localhost:5102')+'/simulasi/umrah');await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).waitFor({timeout:120000});
await page.evaluate(async()=>{const e=window.__vrEngine;const {createPrivateVehicle,enterPrivateCar}=await import('/js/vr/private-vehicle.js');const {createJakartaDrive,updateJakartaDrive}=await import('/js/vr/indonesia-scenery.js');const car=createPrivateVehicle();car.position.x=-7600;e.scene.add(car);createJakartaDrive(car,{});await car.userData.ready;await Promise.all(car.userData.jakartaDrive.traffic.map(c=>c.userData.ready));enterPrivateCar(e,car);e.uiOpen=false;e.cameraMode='first-person';e.onUpdate(dt=>updateJakartaDrive(car,dt));window.testCar=car;e.renderer.setAnimationLoop(null);});
await page.waitForTimeout(2500);fs.writeFileSync('artifacts/jakarta-vehicles/cabin.png',Buffer.from((await page.evaluate(()=>{const e=window.__vrEngine;e.updateViewCamera();for(const u of e.updaters)if(!u.done)u.fn(0,0,u);e.renderer.render(e.scene,e.viewCamera);return e.renderer.domElement.toDataURL();})).split(',')[1],'base64'));
console.log(await page.evaluate(()=>({eye:window.__vrEngine.camera.position.toArray(),seat:!!window.__vrEngine.vehicleSeat,traffic:window.testCar.userData.jakartaDrive.traffic.map(c=>({pos:c.position.toArray(),yaw:c.rotation.y,status:c.userData.assetStatus}))})));
await page.evaluate(()=>{const e=window.__vrEngine;e.cameraMode='drone';e.droneOrbit.distance=8;e.droneOrbit.elevation=.4;});await page.waitForTimeout(1200);fs.writeFileSync('artifacts/jakarta-vehicles/drone.png',Buffer.from((await page.evaluate(()=>{const e=window.__vrEngine;for(const u of e.updaters)if(!u.done)u.fn(0,0,u);e.updateViewCamera();for(const u of e.updaters)if(!u.done)u.fn(0,0,u);e.renderer.render(e.scene,e.viewCamera);return e.renderer.domElement.toDataURL();})).split(',')[1],'base64'));
const checks=await page.evaluate(async()=>{
 const e=window.__vrEngine,car=window.testCar,drive=car.userData.jakartaDrive;
 const {updateJakartaDrive}=await import('/js/vr/indonesia-scenery.js');
 const {leavePrivateCar}=await import('/js/vr/private-vehicle.js');
 const same=drive.traffic[0],opposite=drive.traffic[1],a=same.position.z,b=opposite.position.z;
 const camera=e.camera.position.clone(),origin=car.position.clone();updateJakartaDrive(car,.1);
 const interior=car.getObjectByName('aventador-interior');
 const result={interior:!!interior,seats:interior?.userData.seats,interiorBatches:interior?.children.length,npcExteriorOnly:drive.traffic.every(c=>!c.getObjectByName('aventador-interior')),ready:drive.traffic.every(c=>c.userData.assetStatus==='ready'),sameDelta:same.position.z-a,oppositeDelta:opposite.position.z-b,stable:camera.equals(e.camera.position)&&origin.equals(car.position),eye:e.camera.position.y,drone:e.droneActive,pose:e.scene.getObjectByName('JemaahAvatar')?.userData.motion};
 for(let i=0;i<10000;i++)updateJakartaDrive(car,.1);
 result.wrapped=drive.traffic.every(c=>c.position.z>=-700&&c.position.z<=200);
 leavePrivateCar(e);e.locomotionLocked=false;e.spawn(-6000,3);
 for(const u of e.updaters)if(!u.done)u.fn(.016,0,u);
 result.exited=!e.vehicleSeat&&e.camera.position.y===1.7;
 return result;
});
console.log(checks);
require('node:assert/strict').ok(checks.interior&&checks.seats===2&&checks.interiorBatches<=10&&checks.npcExteriorOnly&&checks.ready&&checks.stable&&checks.wrapped&&checks.exited&&checks.drone&&checks.pose==='sit'&&checks.sameDelta<0&&checks.oppositeDelta>0&&checks.eye<1.16);

}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

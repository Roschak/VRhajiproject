const {chromium}=require('playwright-core');const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
try{const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:5101/simulasi/umrah');await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).waitFor({timeout:120000});
await page.evaluate(async()=>{(await import('/js/vr/main.js')).prepareDepartureMap();});await page.waitForTimeout(4000);
for(const[name,pos,target]of [
 ['home',[-6000,1.7,5],[-5998,1.7,-4]],['packing',[-6000,1.7,-3.4],[-6000,1.1,-5.8]],['car',[-6002,1.7,11],[-5996,1,14]],
 ['dropoff',[-5000,1.7,37],[-5028,4,32]],['gate',[-4959,1.7,18],[-4952,1.8,18]],['aircraft',[-4935,1.7,24],[-4924,7,6]],['stairs',[-4915,1.7,24],[-4915,4,8]],
 ['cabin',[-4012,1.7,0],[-3987,1.7,0]],['flight-map',[-4000,1.7,0],[-4000,1.8,-2]]]){
 await page.evaluate(({pos,target})=>{const e=window.__vrEngine;e.spawn(pos[0],pos[2],0,pos[1]);e.camera.lookAt(...target);e.flightState={progress:.55,target:.55,origin:'Jakarta',destination:'Jeddah',status:'Mendekati wilayah Arab Saudi'};}, {pos,target});
 await page.waitForTimeout(1800);
 const data=await page.evaluate(()=>{const e=window.__vrEngine;e.composer.render();return e.renderer.domElement.toDataURL('image/png');});
 fs.mkdirSync('artifacts/departure-reference',{recursive:true});fs.writeFileSync(`artifacts/departure-reference/${name}-preview.png`,Buffer.from(data.split(',')[1],'base64'));console.log('Captured',name);
}
if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

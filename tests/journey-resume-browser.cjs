const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),base=process.env.BASE_URL||'http://localhost:5102',errors=[];page.on('pageerror',e=>errors.push(e.message));
  const ready=()=>page.getByRole('button',{name:'Mulai Simulasi',exact:true}).waitFor({timeout:120000});
  await page.goto(base+'/simulasi/umrah');await ready();await page.evaluate(()=>window.__vrEngine.narrator.enabled=false);await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).click();
  for(let i=0;i<60;i++){if(await page.evaluate(()=>window.__vrEngine.scene.getObjectByName('pickup-passport')?.userData.interact?.enabled))break;await page.evaluate(()=>window.__vrEngine.skipStep());await page.waitForTimeout(100);}
  const inventory=await page.evaluate(async()=>{const e=window.__vrEngine,T=await import('three'),o=e.scene.getObjectByName('pickup-passport');e.movePlayerTo(-6000,-4);const ray=new T.PerspectiveCamera();ray.position.set(-6000,1.7,-4);ray.lookAt(o.getWorldPosition(new T.Vector3()));ray.updateMatrixWorld(true);e._onVRSelect(ray);return [...e.departureState.inventory];});assert.deepEqual(inventory,['passport']);
  await page.reload();await page.getByRole('button',{name:'Lanjutkan perjalanan',exact:true}).waitFor({timeout:30000});assert.equal(await page.evaluate(()=>!!window.__vrEngine),false,'Choice must appear before creating a new world');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('vrhaji-session-v1-umrah')));assert.equal(saved.index,1);assert.deepEqual(saved.departure.inventory,['passport']);
  fs.mkdirSync('artifacts/journey-resume-choice',{recursive:true});await page.screenshot({path:'artifacts/journey-resume-choice/choice.png'});
  await page.getByRole('button',{name:'Lanjutkan perjalanan',exact:true}).click();await ready();assert.deepEqual(await page.evaluate(()=>window.__vrEngine.departureState.inventory),['passport']);assert.ok(await page.evaluate(()=>window.__vrEngine.guidedLocations.has('home')));
  await page.goto(base+'/');await page.evaluate(async()=>{(await import('/js/journey-session.js')).saveSession('haji',{index:8,departure:{inventory:['passport','ticket','ihram','pouch','suitcase'],miqatChoice:'air',ihram:true},guidedLocations:['haram'],heard:[],readPrayers:['takbir']});});
  await page.goto(base+'/simulasi/umrah');await page.getByRole('button',{name:'Mulai dari awal',exact:true}).click();await ready();assert.deepEqual(await page.evaluate(()=>window.__vrEngine.departureState.inventory),[]);assert.equal(await page.evaluate(()=>localStorage.getItem('vrhaji-session-v1-umrah')),null);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vrhaji-session-v1-haji')).index),8);
  await page.goto(base+'/simulasi/haji');await page.getByRole('button',{name:'Lanjutkan perjalanan',exact:true}).click();await ready();const result=await page.evaluate(async()=>({state:(await import('/js/vr/main.js')).getJourneyState(),guided:[...window.__vrEngine.guidedLocations],prayers:[...window.__vrEngine.readPrayers]}));assert.equal(result.state.index,8);assert.equal(result.state.departure.miqatChoice,'air');assert.ok(result.guided.includes('haram'));assert.ok(result.prayers.includes('takbir'));
  assert.deepEqual(errors,[]);console.log('PASS: reload mid-stage offers resume/restart, real pickup survives, resume keeps narration state, restart clears only selected route, Hajj resumes stage 8.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

const {chromium}=require('playwright-core');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.clear());
  await page.goto((process.env.BASE_URL||'http://localhost:5102')+'/simulasi/umrah?tahap=1');
  await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).waitFor({timeout:120000});
  const sidebar=page.getByRole('complementary',{name:'Lokasi perjalanan'});
  assert.match(await sidebar.textContent(),/SAAT INIRumah di IndonesiaBERIKUTNYABandara Indonesia/);
  await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).click();
  await page.waitForTimeout(500);
  const result=await page.evaluate(()=>{
   const panel=document.querySelector('.location-sidebar').getBoundingClientRect(),map=document.querySelector('#vr-minimap').getBoundingClientRect();
   return {clear:panel.right<map.left&&panel.bottom>innerHeight-25,width:panel.width,current:document.querySelectorAll('.location-sidebar [aria-current=location]').length};
  });assert.ok(result.clear);assert.equal(result.current,1);
  // Isolate the new sidebar for screenshots without advancing or skipping the mission.
  await page.addStyleTag({content:'.journey-dialog,.overlay {visibility:hidden !important;}'});
  fs.mkdirSync('artifacts/location-sidebar',{recursive:true});await page.screenshot({path:'artifacts/location-sidebar/desktop.png'});
  const toggle=sidebar.getByRole('button',{name:/Lokasi perjalanan/});await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');await toggle.click();
  await page.setViewportSize({width:390,height:844});
  await page.reload();await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).waitFor({timeout:120000});
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).click();
  await page.addStyleTag({content:'.journey-dialog,.overlay {visibility:hidden !important;}'});
  await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  const fits=await sidebar.evaluate(el=>{const r=el.getBoundingClientRect();return r.right<=innerWidth&&r.bottom<=innerHeight;});assert.ok(fits);
  await page.screenshot({path:'artifacts/location-sidebar/mobile.png'});
  await page.evaluate(()=>document.getElementById('vr-root').classList.add('xr-presenting'));assert.equal(await sidebar.isVisible(),false);
  await page.evaluate(async()=>{(await import('/js/vr/main.js')).dispose();});assert.equal(await sidebar.count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: sidebar integration, desktop/minimap layout, mobile collapse, XR visibility and cleanup.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

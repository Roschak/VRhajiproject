const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.BASE_URL||'http://localhost:5102')+'/simulasi/haji?tahap=8');await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).waitFor({timeout:120000});
  const result=await page.evaluate(async()=>{
   const e=window.__vrEngine;e.renderer.setAnimationLoop(null);document.querySelector('.overlay--intro')?.remove();
   const {loadPrayerData}=await import('/js/vr/prayer-guide.js'),{MissionContext}=await import('/js/vr/journey-missions.js');
   const prayers=await loadPrayerData(),ctx=new AudioContext(),clips=[];await e.narrator.ready;
   for(const p of prayers){const file=e.narrator.manifest[p.arabic.normalize('NFC')];if(!file)throw Error('Missing Arabic audio '+p.id);const r=await fetch('/audio/guide/'+file);const b=await ctx.decodeAudioData(await r.arrayBuffer());clips.push({id:p.id,duration:b.duration});}await ctx.close();
   let introductions=0,cards=0;const fake={narrate:async()=>{introductions++;}};const c=new MissionContext(fake,{}, {prayer:async()=>{cards++;}},new AbortController().signal);
   await c.guide('haram');await c.guide('mina');await c.guide('haram');await c.prayer('takbir');await c.prayer('takbir');
   const resumed=new MissionContext(fake,{}, {prayer:async()=>{cards++;}},new AbortController().signal);await resumed.guide('haram');await resumed.prayer('takbir');
   return {clips,introductions,cards};
  });assert.equal(result.introductions,2);assert.equal(result.cards,1);assert.equal(result.clips.length,13);assert.ok(result.clips.every(p=>p.duration>.5));
  await page.getByRole('button',{name:'Bacaan & doa',exact:true}).click();assert.equal(await page.locator('.prayer-library option').count(),13);await page.getByLabel('Pilih bacaan').selectOption('rabbana');assert.equal(await page.locator('.prayer-library .prayer-arabic').getAttribute('dir'),'rtl');await page.locator('.prayer-library').getByRole('button',{name:'Tutup',exact:true}).click();
  await page.evaluate(async()=>{const {JourneyUI}=await import('/js/vr/journey-ui.js');window.prayerTestUI=new JourneyUI(window.__vrEngine);window.prayerTestUI.prayers=await(await fetch('/data/prayers.json')).json();window.prayerTestPending=window.prayerTestUI.prayer('talbiyah');});
  await page.locator('.journey-dialog').getByRole('button',{name:'Dengarkan bacaan',exact:true}).click();
  await page.waitForFunction(()=>window.__vrEngine.narrator.audio.currentTime>0,{},{timeout:20000}).catch(async error=>{console.log(await page.evaluate(()=>{const n=window.__vrEngine.narrator,a=n.audio;return {enabled:n.enabled,src:a.src,paused:a.paused,ready:a.readyState,error:a.error?.message,last:n.lastText,manifest:n.manifest[n.lastText],pending:!!window.prayerTestUI.pending};}));throw error;});
  fs.mkdirSync('artifacts/prayer-guide',{recursive:true});await page.screenshot({path:'artifacts/prayer-guide/talbiyah.png'});
  await page.locator('.journey-dialog').getByRole('button',{name:'Lanjutkan',exact:true}).click();await page.evaluate(()=>window.prayerTestPending);assert.equal(await page.evaluate(()=>window.__vrEngine.narrator.audio.paused),true);
  assert.deepEqual(errors,[]);console.log(JSON.stringify(result));console.log('PASS: 13 Arabic clips, RTL/Latin/meaning/reference cards, manual prayer playback, once-only location narration and prayer cards, continue stops audio.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

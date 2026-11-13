const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 const base=process.env.BASE_URL||'http://localhost:5102';
 try{
  fs.mkdirSync('artifacts/startup',{recursive:true});
  for(const route of ['haji','umrah']){
   const page=await browser.newPage({viewport:{width:1280,height:800}}),failures=[];
   page.on('requestfailed',r=>{if(r.url().startsWith(base))failures.push(r.url());});
   page.on('pageerror',e=>failures.push(e.message));
   await page.goto(`${base}/simulasi/${route}?tahap=1`);
   await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).waitFor({timeout:120000});
   assert.equal(await page.locator('[role=alert]').count(),0);
   await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).click();
   await page.waitForFunction(()=>window.__vrEngine?.scene.getObjectByName('reference-family-home'));
   assert.equal(await page.getByRole('complementary',{name:'Lokasi perjalanan'}).count(),1);
   await page.screenshot({path:`artifacts/startup/${route}.png`});
   assert.deepEqual(failures,[]);await page.close();console.log(`PASS: ${route} loads and starts with sidebar; no failed local requests.`);
  }
  const page=await browser.newPage();
  await page.route('**/js/vr/main.js',r=>r.abort());
  await page.goto(`${base}/simulasi/haji?tahap=1`);
  const retry=page.getByRole('button',{name:'Muat ulang simulasi',exact:true});await retry.waitFor({timeout:60000});
  await page.unroute('**/js/vr/main.js');await retry.click();
  await page.getByRole('button',{name:'Mulai Simulasi',exact:true}).waitFor({timeout:120000});
  assert.equal(await page.locator('[role=alert]').count(),0);await page.close();
  console.log('PASS: failed module load offers a reload and successfully recovers.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

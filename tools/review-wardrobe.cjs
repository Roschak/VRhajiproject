const {chromium}=require('playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>console.error(e.message));
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:5117');
  await page.getByRole('button',{name:'Masuk ke menu'}).click({timeout:120000});
  await page.locator('nav').getByRole('button',{name:/Karakter/}).click();
  for(const gender of process.env.REVIEW_GENDER?[process.env.REVIEW_GENDER]:['man','woman']){
   await page.getByLabel('Karakter',{exact:true}).selectOption(gender);
   await page.locator(`#character-preview[data-loaded="${gender}"]`).waitFor({timeout:60000});
   for(const outfit of gender==='man'?['robe','ihram']:['robe','abaya']){
    await page.getByLabel('Pakaian',{exact:true}).selectOption(outfit);
    for(const motion of ['Diam','Berlari']){
     await page.getByRole('button',{name:motion,exact:true}).click();
     await page.waitForTimeout(650);
     await page.locator('#character-preview').screenshot({path:`artifacts/wardrobe-${gender}-${outfit}-${motion}.png`});
    }
   }
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

const {chromium}=require('playwright-core'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const page=await browser.newPage();await page.goto(process.env.BASE_URL||'http://127.0.0.1:5202');
 const result=await page.evaluate(async()=>{
  const T=await import('three'),{Narrator}=await import('/js/vr/guide-voice.js'),{MissionContext}=await import('/js/vr/journey-missions.js'),{JourneyUI}=await import('/js/vr/journey-ui.js'),{Engine}=await import('/js/vr/engine.js');
  const root=document.createElement('div');root.id='vr-root';document.body.replaceChildren(root);
  const subtitle=document.createElement('div');root.append(subtitle);const narrator=new Narrator(subtitle);narrator.enabled=false;narrator.attachControls(root);
  let finishTask;const interactables=[];
  const engine={narrator,narrate:Engine.prototype.narrate,locomotionLocked:false,renderer:{xr:{isPresenting:false}},scene:new T.Scene(),playerPos:()=>new T.Vector3(),playerYaw:()=>0,onUpdate:fn=>({fn}),setObjective(){},setUiOpen(){},subtitle:t=>subtitle.textContent=t,addInteractable:(mesh,opts)=>interactables.push({mesh,...opts}),removeInteractable:mesh=>{const i=interactables.findIndex(o=>o.mesh===mesh);if(i>=0)interactables.splice(i,1)},goto:()=>new Promise(r=>finishTask=r)};
  const controller=new AbortController(),ui=new JourneyUI(engine),ctx=new MissionContext(engine,{ensure(){},point:()=>({x:1,z:2})},ui,controller.signal);
  const full='Ikuti jalur. Siapkan paspor. Penjelasan tambahan tetap tersedia.';
  await ctx.say(full);let done=false;const moving=ctx.go('indonesia',1,2,'Menuju konter').then(()=>done=true);await Promise.resolve();
  const before={done,locked:engine.locomotionLocked,details:root.querySelector('.guide-details-content').textContent};finishTask();await moving;
  const choice=ctx.confirm('Dokumen',full);const brief=ui.pending.dom.querySelector('p').textContent;
  const more=interactables.find(o=>o.label==='Penjelasan lengkap');more.onClick();const expanded=ui.pending.dom.querySelector('p').textContent;
  interactables.find(o=>o.label==='Lanjutkan').onClick();await choice;
  controller.abort();let aborted=false;try{await ctx.say('Tidak boleh diputar');}catch{aborted=true;}
  narrator.stop();return {before,done,brief,expanded,locked:engine.locomotionLocked,pending:!!ui.pending,aborted};
 });assert.equal(result.before.done,false);assert.equal(result.before.locked,false);assert.match(result.before.details,/Penjelasan tambahan/);assert.equal(result.done,true);assert.equal(result.brief,'Ikuti jalur. Siapkan paspor.');assert.match(result.expanded,/Penjelasan tambahan/);assert.equal(result.locked,false);assert.equal(result.pending,false);assert.equal(result.aborted,true);console.log('PASS: mission speech does not gate movement, actual tasks still wait, full text expands through VR interaction, choices remain immediate, lifetime abort works.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});

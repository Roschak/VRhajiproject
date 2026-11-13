const {chromium}=require('playwright-core'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage();await page.goto(process.env.BASE_URL||'http://localhost:5102');
  const result=await page.evaluate(async()=>{
   const {Narrator}=await import('/js/vr/guide-voice.js'),{SCENE_GUIDES,SCENE_BRIEFS}=await import('/js/vr/guide-scenes.js');
   const narrator=new Narrator(document.createElement('div'));await narrator.ready;
   const missing=Object.entries(SCENE_GUIDES).filter(([key,text])=>!narrator.manifest[text]).map(([key])=>key);
   const ctx=new AudioContext(),decoded=[];
   for(const [key,text]of Object.entries(SCENE_GUIDES)){
    const path=narrator.manifest[text];if(!path)continue;
    const response=await fetch('/audio/guide/'+path);const buffer=await ctx.decodeAudioData(await response.arrayBuffer());
    let peak=0;for(const v of buffer.getChannelData(0))peak=Math.max(peak,Math.abs(v));decoded.push({key,duration:buffer.duration,peak});
   }
   const briefDecoded=[];
   for(const [key,text]of Object.entries(SCENE_BRIEFS)){
    const path=narrator.manifest[text];if(!path)throw Error('Missing brief '+key);
    const response=await fetch('/audio/guide/'+path),buffer=await ctx.decodeAudioData(await response.arrayBuffer());
    let peak=0;for(const v of buffer.getChannelData(0))peak=Math.max(peak,Math.abs(v));briefDecoded.push({key,duration:buffer.duration,peak});
   }
   const pending=narrator.guide(SCENE_GUIDES.home,{context:true,brief:SCENE_BRIEFS.home});await new Promise(r=>setTimeout(r,1500));const playing=!narrator.audio.paused&&narrator.audio.currentTime>0;const local=narrator.audio.currentSrc.includes('/audio/guide/');narrator.stop();await pending;await ctx.close();
   return {missing,decoded,briefDecoded,rate:narrator.audio.playbackRate,playing,local,clips:Object.keys(narrator.manifest).length};
  });console.log(JSON.stringify(result,null,2));assert.deepEqual(result.missing,[]);assert.equal(result.decoded.length,13);assert.ok(result.decoded.every(x=>x.duration>3&&x.peak>.01));assert.ok(result.playing&&result.local);assert.equal(result.rate,1.1);assert.equal(result.briefDecoded.length,13);assert.ok(result.briefDecoded.every(x=>x.duration>1&&x.peak>.01));assert.ok(result.clips>200);
  console.log('PASS: all 13 full and brief scene/vehicle guides decode to non-silent audio; 1.1x local brief playback advances without external TTS requests.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 global.Audio=class{constructor(){this.paused=true;}pause(){this.paused=true;}removeAttribute(){this.src='';}play(){this.paused=false;return Promise.resolve();}};
 let finishManifest;global.fetch=()=>new Promise(r=>finishManifest=r);
 const spoken=[];global.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
 global.speechSynthesis={cancel(){},getVoices:()=>[],speak(u){spoken.push(u)}};
 const load=async p=>import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(p,'utf8')).toString('base64'));
 const {Narrator,briefGuide}=await load('src/VRHaji.Web/wwwroot/js/vr/guide-voice.js');
 const {SCENE_GUIDES,SCENE_BRIEFS}=await load('src/VRHaji.Web/wwwroot/js/vr/guide-scenes.js');
 const subtitle={textContent:''},n=new Narrator(subtitle);
 await n.guide(SCENE_GUIDES.home,{context:true,brief:SCENE_BRIEFS.home});
 assert.equal(n.contextText,SCENE_GUIDES.home);assert.equal(subtitle.textContent,SCENE_BRIEFS.home,'Tasks must start even before media manifest is ready');
 await n.guide('Ikuti antrean. Siapkan paspor. Rincian tambahan.');
 finishManifest({ok:true,json:async()=>({clips:{'Ikuti antrean. Siapkan paspor.':'queue.mp3'}})});await n.ready;await Promise.resolve();
 assert.equal(n.audio.src,'/audio/guide/queue.mp3');assert.equal(n.audio.playbackRate,1.1);assert.equal(n.audio.preservesPitch,true);
 n.audio.onended();assert.equal(subtitle.textContent,'Ikuti antrean. Siapkan paspor.','Instruction persists after playback');
 assert.equal(n.stepText,'Ikuti antrean. Siapkan paspor. Rincian tambahan.');
 await n.guide('Instruksi dinamis.');await Promise.resolve();assert.equal(spoken.at(-1).rate,.92*1.1);
 const prayer=n.say('?????',{lang:'ar-SA',repeat:true});await Promise.resolve();assert.equal(spoken.at(-1).rate,.92);n.stop();await prayer;
 assert.equal(briefGuide('Labbaik Allahumma labbaik. Labbaika la syarika laka labbaik. Innal hamda wan nimata laka wal mulk.'),'Labbaik Allahumma labbaik. Labbaika la syarika laka labbaik. Innal hamda wan nimata laka wal mulk.');
 await n.guide('Ikuti antrean. Siapkan paspor. Rincian tambahan.');assert.equal(n.audio.paused,true);assert.equal(subtitle.textContent,'Ikuti antrean. Siapkan paspor.');
 n.enabled=false;await n.guide('Tetap berjalan menuju gate.');assert.equal(subtitle.textContent,'Tetap berjalan menuju gate.');
 for(const key of Object.keys(SCENE_GUIDES)){await n.guide(SCENE_GUIDES[key],{context:true,brief:SCENE_BRIEFS[key]});assert.equal(subtitle.textContent,SCENE_BRIEFS[key]);assert.ok(SCENE_BRIEFS[key].length<SCENE_GUIDES[key].length);}
 n.stop();console.log('PASS: all 13 location/vehicle briefs, non-blocking loading/mute, 1.1x narration, normal prayer, persistent text, replacement and full details.');
})().catch(e=>{console.error(e);process.exitCode=1});

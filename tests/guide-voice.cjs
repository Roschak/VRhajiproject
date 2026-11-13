const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const instances=[];global.Audio=class{constructor(){instances.push(this);this.paused=true;this.plays=0;}pause(){this.paused=true;}removeAttribute(){this.src='';}play(){this.plays++;this.paused=false;return Promise.resolve();}};
 global.fetch=async()=>({ok:true,json:async()=>({clips:{'Selamat datang':'welcome.mp3','Ikuti jalan':'walk.mp3','اللَّهُمَّ':'prayer.mp3'}})});
 const spoken=[];global.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};global.speechSynthesis={cancel(){},getVoices:()=>[{lang:'id-ID',name:'Gadis Natural'}],speak(u){spoken.push(u);}};
 const source=fs.readFileSync('src/VRHaji.Web/wwwroot/js/vr/guide-voice.js','utf8'),{Narrator}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const el={textContent:''},n=new Narrator(el);await n.ready;
 const first=n.say('Selamat datang');await Promise.resolve();assert.equal(n.audio.src,'/audio/guide/welcome.mp3');assert.equal(n.audio.volume,.7);
 const duplicate=n.say('Selamat datang');assert.equal(n.audio.plays,1);
 const second=n.say('Ikuti jalan');await first;await duplicate;await Promise.resolve();assert.equal(el.textContent,'Ikuti jalan');n.audio.onended();await second;assert.equal(el.textContent,'');
 await n.say('Selamat datang');assert.equal(n.audio.plays,2,'Automatic narration must not repeat after leaving and returning');
 const replay=n.say('Selamat datang',{repeat:true});await Promise.resolve();assert.equal(n.audio.plays,3);n.audio.onended();await replay;
 const fallback=n.say('Panduan dinamis');await Promise.resolve();assert.equal(spoken.length,1);assert.equal(spoken[0].voice.name,'Gadis Natural');n.stop();await fallback;
 const arabic=n.say('اللَّهُمَّ',{lang:'ar-SA'});await Promise.resolve();assert.equal(n.audio.src,'/audio/guide/prayer.mp3','Arabic combining marks must match the local manifest');n.audio.onended();await arabic;
 n.enabled=false;const muted=n.say('Selamat datang');n.stop();await muted;assert.equal(n.audio.paused,true);
 console.log('PASS: local audio, fallback, cancellation, one automatic reading, explicit replay, mute and subtitle cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1;});

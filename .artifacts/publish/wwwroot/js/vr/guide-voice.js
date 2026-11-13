const normalize=text=>text.normalize('NFC').replace(/\s+/g,' ').trim();
export class Narrator {
 constructor(el){
  this.el=el;this.audio=new Audio();this.audio.preload='auto';this.enabled=true;this.volume=.7;this.serial=0;this.lastText='';
  this.heard=new Set();this.manifest={};this.ready=fetch('/audio/guide/manifest.json').then(r=>{if(!r.ok)throw Error('Audio manifest');return r.json();}).then(m=>{this.manifest=Object.fromEntries(Object.entries(m.clips).map(([text,path])=>[normalize(text),path]));}).catch(()=>{});
 }
 stop(){this.serial++;this.audio.pause();this.audio.onended=this.audio.onerror=null;this.audio.removeAttribute('src');globalThis.speechSynthesis?.cancel();this.finish?.();this.finish=null;if(this.el)this.el.textContent='';}
 async say(text,{sub=null,rate=1,repeat=false,lang='id-ID'}={}){
  const key=normalize(text);
  if(!repeat&&this.heard.has(key))return this.lastText===text&&this.finish?this.currentPromise:undefined;
  this.heard.add(key);
  this.stop();const serial=this.serial;this.lastText=text;const subtitle=sub??text;if(this.el)this.el.textContent=subtitle;
  const duration=Math.max(2200,subtitle.length*65);
  this.currentPromise=new Promise(resolve=>{
   let timer;let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);if(serial===this.serial){this.finish=null;if(this.el?.textContent===subtitle)this.el.textContent='';}resolve();};
   this.finish=finish;
   if(!this.enabled){timer=setTimeout(finish,duration);return;}
   let fallingBack=false;
   const fallback=()=>{
    if(fallingBack)return;fallingBack=true;
    clearTimeout(timer);
    if(serial!==this.serial)return;
    const synth=globalThis.speechSynthesis;
    if(synth){const utterance=new SpeechSynthesisUtterance(text);utterance.lang=lang;utterance.rate=.92;utterance.volume=this.volume;
     const voices=synth.getVoices().filter(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2).toLowerCase()));utterance.voice=voices.find(v=>/Gadis|Zariyah|Natural|Online/i.test(v.name))||voices[0]||null;
     utterance.onend=finish;utterance.onerror=()=>{clearTimeout(timer);timer=setTimeout(finish,duration);};synth.speak(utterance);
    }
    timer=setTimeout(finish,duration+15000);
   };
   this.ready.then(()=>{
    if(serial!==this.serial||done)return;
    const path=this.manifest[normalize(text)];if(!path){fallback();return;}
    this.audio.src='/audio/guide/'+path;this.audio.volume=this.volume;this.audio.playbackRate=rate;this.audio.onended=finish;this.audio.onerror=fallback;
    timer=setTimeout(finish,duration+30000);this.audio.play().catch(fallback);
   });
  });
  return this.currentPromise;
 }
 attachControls(parent){
  const bar=document.createElement('div');bar.className='guide-audio-controls';
  const replay=document.createElement('button'),mute=document.createElement('button');replay.textContent='Ulangi panduan';replay.type=mute.type='button';
  replay.onclick=()=>{if(!this.lastText)return;if(!this.audio.paused&&this.audio.src){this.audio.currentTime=0;return;}void this.say(this.lastText,{repeat:true,lang:/[\u0600-\u06ff]/.test(this.lastText)?'ar-SA':'id-ID'});};
  const sync=()=>{mute.textContent=this.enabled?'Suara: aktif':'Suara: mati';mute.setAttribute('aria-pressed',String(this.enabled));};
  mute.onclick=()=>{this.enabled=!this.enabled;if(!this.enabled)this.stop();sync();};sync();bar.append(replay,mute);parent.append(bar);
 }
}

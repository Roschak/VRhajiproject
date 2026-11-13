const normalize=text=>text.normalize('NFC').replace(/\s+/g,' ').trim();
const prayerText=text=>/[\u0600-\u06ff]|\b(labbaika?|allahumma|rabbana)\b/i.test(text);
// Keep whole sentences; long explanations remain available in the details panel.
export function briefGuide(text){
 if(prayerText(text))return text;
 const sentences=normalize(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[text];
 const useful=sentences.map(s=>s.trim()).filter(s=>! /^(Assalamualaikum|Selamat datang|Saya akan menemani|Saya akan tetap menemani)/i.test(s));
 return (useful.length?useful:sentences).slice(0,2).join(' ').trim();
}
export class Narrator {
 constructor(el){
  this.el=el;this.audio=new Audio();this.audio.preload='auto';this.enabled=true;this.volume=.7;this.serial=0;this.lastText='';this.contextText='';this.stepText='';this.lastOptions={};
  this.heard=new Set();this.manifest={};this.ready=fetch('/audio/guide/manifest.json').then(r=>{if(!r.ok)throw Error('Audio manifest');return r.json();}).then(m=>{this.manifest=Object.fromEntries(Object.entries(m.clips).map(([text,path])=>[normalize(text),path]));}).catch(()=>{});
 }
 stop(){this.serial++;this.audio.pause();this.audio.onended=this.audio.onerror=null;this.audio.removeAttribute('src');globalThis.speechSynthesis?.cancel();this.finish?.();this.finish=null;if(this.el)this.el.textContent='';}
 guide(text,{context=false,brief=null}={}){
  if(context){this.contextText=text;this.stepText='';}else this.stepText=text;
  this.refreshDetails?.();
  const short=brief||briefGuide(text);
  // Mission progression never waits on media readiness, playback, mute or TTS.
  void this.say(short,{keepSubtitle:true}).catch(error=>console.warn('Panduan suara tidak tersedia',error));
  return Promise.resolve();
 }
 async say(text,{sub=null,rate=null,repeat=false,lang='id-ID',keepSubtitle=false}={}){
  rate=rate??(lang.startsWith('ar')||prayerText(text)?1:1.1);
  const key=normalize(text);
  if(!repeat&&this.heard.has(key)){
   if(this.lastText===text&&this.finish)return this.currentPromise;
   this.stop();this.lastText=text;this.lastOptions={lang,rate,keepSubtitle};
   if(keepSubtitle&&this.el)this.el.textContent=sub??text;
   return;
  }
  this.heard.add(key);
  this.stop();const serial=this.serial;this.lastText=text;this.lastOptions={lang,rate,keepSubtitle};const subtitle=sub??text;if(this.el)this.el.textContent=subtitle;
  const duration=Math.max(2200,subtitle.length*65);
  this.currentPromise=new Promise(resolve=>{
   let timer;let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);if(serial===this.serial){this.finish=null;if(!keepSubtitle&&this.el?.textContent===subtitle)this.el.textContent='';}resolve();};
   this.finish=finish;
   if(!this.enabled){finish();return;}
   let fallingBack=false;
   const fallback=()=>{
    if(fallingBack)return;fallingBack=true;
    clearTimeout(timer);
    if(serial!==this.serial)return;
    const synth=globalThis.speechSynthesis;
    if(synth){const utterance=new SpeechSynthesisUtterance(text);utterance.lang=lang;utterance.rate=.92*rate;utterance.volume=this.volume;
     const voices=synth.getVoices().filter(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2).toLowerCase()));utterance.voice=voices.find(v=>/Gadis|Zariyah|Natural|Online/i.test(v.name))||voices[0]||null;
     utterance.onend=finish;utterance.onerror=()=>{clearTimeout(timer);timer=setTimeout(finish,duration);};synth.speak(utterance);
    }
    timer=setTimeout(finish,duration+15000);
   };
   this.ready.then(()=>{
    if(serial!==this.serial||done)return;
    const path=this.manifest[normalize(text)];if(!path){fallback();return;}
    this.audio.src='/audio/guide/'+path;this.audio.volume=this.volume;this.audio.playbackRate=rate;this.audio.preservesPitch=true;this.audio.onended=finish;this.audio.onerror=fallback;
    timer=setTimeout(finish,duration+30000);this.audio.play().catch(fallback);
   });
  });
  return this.currentPromise;
 }
 attachControls(parent){
  const bar=document.createElement('div');bar.className='guide-audio-controls';
  const replay=document.createElement('button'),mute=document.createElement('button');replay.textContent='Ulangi panduan';replay.type=mute.type='button';
  replay.onclick=()=>{if(!this.lastText)return;if(!this.audio.paused&&this.audio.src){this.audio.currentTime=0;return;}void this.say(this.lastText,{...this.lastOptions,repeat:true});};
  const sync=()=>{mute.textContent=this.enabled?'Suara: aktif':'Suara: mati';mute.setAttribute('aria-pressed',String(this.enabled));};
  mute.onclick=()=>{this.enabled=!this.enabled;if(!this.enabled){const subtitle=this.el?.textContent;this.stop();if(this.el)this.el.textContent=subtitle||'';}sync();};sync();
  const details=document.createElement('details');details.className='guide-details';
  const summary=document.createElement('summary');summary.textContent='Penjelasan lengkap';
  const content=document.createElement('div');content.className='guide-details-content';
  const full=document.createElement('p');full.style.whiteSpace='pre-line';
  const listen=document.createElement('button');listen.type='button';listen.textContent='Dengarkan penjelasan';
  this.refreshDetails=()=>{full.textContent=[this.contextText,this.stepText].filter((t,i,a)=>t&&a.indexOf(t)===i).join('\n\n')||'Panduan akan muncul saat langkah dimulai.';};
  listen.onclick=async()=>{
   const texts=[this.contextText,this.stepText].filter((t,i,a)=>t&&a.indexOf(t)===i);
   for(const text of texts){const pending=this.say(text,{repeat:true,keepSubtitle:true}),serial=this.serial;await pending;if(serial!==this.serial)return;}
  };
  content.append(full,listen);details.append(summary,content);this.refreshDetails();
  bar.append(replay,mute,details);parent.append(bar);
 }
}

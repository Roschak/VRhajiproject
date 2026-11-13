export async function loadPrayerData(){const r=await fetch('/data/prayers.json');if(!r.ok)throw Error('Bacaan belum tersedia');return r.json();}
export function prayerText(p){return `${p.when}\n\n${p.arabic}\n\n${p.latin}\n\nArti: ${p.meaning}\n\n${p.note}`;}
export function prayerBody(p){
 const body=document.createElement('div');body.className='prayer-content';
 for(const [text,cls]of [[p.when,'prayer-when'],[p.arabic,'prayer-arabic'],[p.latin,'prayer-latin'],[p.meaning,'prayer-meaning'],[p.note,'prayer-note']]){
  const el=document.createElement('p');el.textContent=text;el.className=cls;if(cls==='prayer-arabic'){el.lang='ar';el.dir='rtl';}body.append(el);
 }
 const source=document.createElement('a');source.textContent='Rujukan bacaan';source.href=p.source;source.target='_blank';source.rel='noopener noreferrer';body.append(source);return body;
}
export function attachPrayerLibrary(engine,ui,prayers){
 const root=document.getElementById('vr-root'),button=document.createElement('button');button.textContent='Bacaan & doa';button.type='button';
 document.querySelector('.guide-audio-controls').append(button);
 const drawer=document.createElement('aside');drawer.className='prayer-library';drawer.hidden=true;drawer.setAttribute('aria-label','Bacaan dan doa');root.append(drawer);
 const title=document.createElement('h2');title.textContent='Bacaan & doa';const select=document.createElement('select');select.setAttribute('aria-label','Pilih bacaan');
 prayers.forEach(p=>{const option=document.createElement('option');option.value=p.id;option.textContent=p.title;select.append(option);});
 const content=document.createElement('div'),listen=document.createElement('button'),close=document.createElement('button');listen.textContent='Dengarkan bacaan';close.textContent='Tutup';
 const render=()=>{const p=prayers.find(p=>p.id===select.value);content.replaceChildren(prayerBody(p));};select.onchange=()=>{engine.narrator.stop();render();};
 listen.onclick=()=>{const p=prayers.find(p=>p.id===select.value);void engine.narrator.say(p.arabic,{repeat:true,lang:'ar-SA'});};
 const hide=()=>{drawer.hidden=true;button.setAttribute('aria-expanded','false');};close.onclick=()=>{hide();engine.narrator.stop();};
 button.onclick=()=>{
  if(!drawer.hidden){hide();return;}
  const chosen=prayers.find(p=>p.id===engine.currentPrayer)||prayers.find(p=>p.contexts.includes(engine.prayerContext||'home'))||prayers[0];select.value=chosen.id;render();drawer.hidden=false;button.setAttribute('aria-expanded','true');
 };
 drawer.append(title,select,content,listen,close);
 const updater=engine.onUpdate(()=>{button.hidden=!!ui.pending||engine.renderer.xr.isPresenting;if(ui.pending||engine.renderer.xr.isPresenting)hide();});
 return ()=>{updater.done=true;button.remove();drawer.remove();};
}

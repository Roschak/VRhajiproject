const LABELS={home:'Rumah di Indonesia',indonesia:'Bandara Indonesia',cabin:'Kabin pesawat',madinah:'Bandara Madinah',jeddah:'Bandara Jeddah',miqat:'Miqat Bir Ali',haram:'Makkah · Masjidil Haram',masaa:'Safa dan Marwah',arafah:'Arafah',muzdalifah:'Muzdalifah',mina:'Mina'};

export function locationItinerary(route,choice='land'){
 const air=choice==='air',arrival=air?'jeddah':'madinah';
 const stops=[[1,'home'],[1,'indonesia'],[1,'cabin'],[1,arrival]];
 if(!air)stops.push([route==='umrah'?1:2,'miqat']);
 if(route==='umrah')stops.push([2,'haram'],[4,'masaa'],[5,'haram'],[6,'madinah'],[6,'cabin'],[6,'indonesia'],[6,'home']);
 else stops.push([2,'haram'],[4,'arafah'],[5,'muzdalifah'],[6,'mina'],[8,'haram'],[8,'masaa'],[10,'mina'],[11,'haram'],[12,'jeddah'],[12,'cabin'],[12,'indonesia'],[12,'home']);
 return stops.map(([stage,key])=>({stage,key,id:`${stage}-${key}`,label:LABELS[key]}));
}

export class LocationSidebar{
 constructor(state,history=[]){
  this.state=state;this.visited=new Set(history.filter(id=>typeof id==='string'));this.cursor=-1;this.current=null;this.destination=null;
  this.root=document.createElement('aside');this.root.className='location-sidebar';this.root.setAttribute('aria-label','Lokasi perjalanan');
  this.toggle=document.createElement('button');this.toggle.type='button';this.toggle.className='location-sidebar__toggle';
  this.toggle.setAttribute('aria-controls','location-sidebar-content');
  this.body=document.createElement('div');this.body.id='location-sidebar-content';
  this.summary=document.createElement('div');this.summary.className='location-sidebar__summary';this.summary.setAttribute('aria-live','polite');this.summary.setAttribute('aria-atomic','true');
  this.list=document.createElement('ol');this.list.className='location-sidebar__list';this.list.setAttribute('aria-label','Urutan lokasi perjalanan');
  this.body.append(this.summary,this.list);this.root.append(this.toggle,this.body);document.getElementById('vr-root').append(this.root);
  this.collapsed=window.matchMedia('(max-width: 900px), (max-height: 600px)').matches;
  this.toggle.onclick=()=>{this.collapsed=!this.collapsed;this.render();};
  this.root.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){this.collapsed=true;this.render();this.toggle.focus();}});
  for(const event of ['pointerdown','mousedown','touchstart','wheel'])this.root.addEventListener(event,e=>e.stopPropagation());
  this.refresh();
  this.updater=state.engine.onUpdate(()=>this.refresh());
 }
 refresh(){
  const signature=[this.state.index,this.state.engine.departureState.miqatChoice,this.state.status].join(':');
  if(signature===this.signature)return;this.signature=signature;
  this.plan=locationItinerary(this.state.route,this.state.engine.departureState.miqatChoice);
  if(this.current)this.locate(this.current,true);
  this.render();
 }
 locate(key,initial=false){
  const candidates=this.plan.map((p,i)=>({...p,i})).filter(p=>p.key===key);
  let found=initial?candidates.filter(p=>p.stage<=this.state.index).at(-1):candidates.find(p=>p.i>=this.cursor);
  found||=candidates[0];if(found)this.cursor=found.i;
 }
 arrive(key){
  if(!LABELS[key])return;
  this.refresh();
  if(this.current!==key)this.locate(key,this.current===null);
  this.current=key;this.destination=null;this.vehicle=null;
  if(this.plan[this.cursor]?.key===key)this.visited.add(this.plan[this.cursor].id);
  this.render();
 }
 travel(key,vehicle='Berjalan'){
  if(key===this.current)return;
  this.destination=key;this.vehicle=vehicle;this.render();
 }
 render(){
  this.root.dataset.collapsed=String(this.collapsed);
  this.body.hidden=this.collapsed;
  this.toggle.setAttribute('aria-expanded',String(!this.collapsed));
  this.toggle.textContent=`${this.collapsed?'▸':'▾'} Lokasi perjalanan`;
  const next=this.destination||this.plan[this.cursor+1]?.key;
  this.summary.replaceChildren();
  for(const [caption,value]of [
   ['SAAT INI',this.destination?`${this.vehicle} menuju ${LABELS[this.destination]}`:LABELS[this.current]||'Menyiapkan perjalanan'],
   ['BERIKUTNYA',this.state.status==='complete'?'Perjalanan selesai':LABELS[next]||'Kembali di rumah']
  ]){
   const line=document.createElement('p'),label=document.createElement('span'),text=document.createElement('strong');
   label.textContent=caption;text.textContent=value;line.append(label,text);this.summary.append(line);
  }
  const fragment=document.createDocumentFragment();
  this.plan.forEach((stop,i)=>{
   const current=i===this.cursor,visited=this.visited.has(stop.id),nextStop=i===this.cursor+1;
   const item=document.createElement('li');item.dataset.location=stop.key;item.dataset.status=current?'current':visited?'visited':nextStop?'next':'pending';
   if(current)item.setAttribute('aria-current','location');
   const dot=document.createElement('span');dot.className='location-sidebar__dot';dot.textContent=current?'●':visited?'✓':String(i+1);dot.setAttribute('aria-hidden','true');
   const copy=document.createElement('div'),name=document.createElement('strong'),status=document.createElement('small');name.textContent=stop.label;
   status.textContent=current?(this.destination?'Lokasi keberangkatan':'Anda di sini'):visited?'Sudah dikunjungi':nextStop?'Tujuan berikutnya':i<this.cursor?'Tahap sebelumnya':'Akan dikunjungi';
   copy.append(name,status);item.append(dot,copy);fragment.append(item);
  });
  const scroll=this.list.scrollTop;
  this.list.replaceChildren(fragment);this.list.scrollTop=scroll;
  if(!this.collapsed&&this.shownCursor!==this.cursor){
   const active=this.list.querySelector('[aria-current=location]');
   if(active){const a=active.getBoundingClientRect(),b=this.list.getBoundingClientRect();this.list.scrollTop+=a.top-b.top-b.height/2+a.height/2;}
   this.shownCursor=this.cursor;
  }
 }
 dispose(){this.updater.done=true;this.root.remove();}
}

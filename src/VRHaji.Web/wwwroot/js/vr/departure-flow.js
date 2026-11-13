import {enterSeat,leaveSeat,pulseActivity} from '../avatar-activities.js';
import { setRitualAppearance } from '../character-ritual.js';

export const PACKING_ITEMS = ['passport','ticket','ihram','pouch','suitcase'];
const storageKey=route=>`vrhaji-departure-v1-${route}`;
export function initDepartureState(engine,route,index,resumeState=null){
 let saved={};if(index>1)try{saved=JSON.parse(localStorage.getItem(storageKey(route)))||{};}catch{}
 engine.departureState={route,inventory:index===1?[]:PACKING_ITEMS.filter(id=>(Array.isArray(saved.inventory)?saved.inventory:PACKING_ITEMS).includes(id)),miqatChoice:saved.miqatChoice==='air'?'air':'land',ihram:index>1&&saved.ihram===true};
 if(resumeState)engine.departureState={route,inventory:PACKING_ITEMS.filter(id=>Array.isArray(resumeState.inventory)&&resumeState.inventory.includes(id)),miqatChoice:resumeState.miqatChoice==='air'?'air':'land',ihram:resumeState.ihram===true};
 engine.saveDeparture=()=>localStorage.setItem(storageKey(route),JSON.stringify(engine.departureState));
 const panel=document.createElement('div');panel.className='departure-packing';panel.setAttribute('aria-live','polite');
 document.getElementById('vr-root').append(panel);let previous='';
 const updater=engine.onUpdate(()=>{
  const p=engine.playerPos(),s=engine.departureState,count=s.inventory.length;
  panel.hidden=p.x>-4800||p.x<-6100;
  const text=count<5?`Perlengkapan ${count}/5 · Ambil barang di meja`:'✓ Perlengkapan lengkap · Koper dibawa';
  if(text!==previous){panel.textContent=text;previous=text;}
 });
 return ()=>{updater.done=true;panel.remove();};
}

async function flightSegment(c,target,status){
 const e=c.engine;e.flightState.target=target;e.flightState.status=status;
 await c.say(status);
 await c.wait(e.skippable(e.wait(5000),()=>{e.flightState.progress=target;}));
}

export async function departureFromHome(c,route){
 const e=c.engine,w=c.world,home=w.ensure('home').refs;
 await c.say('Perlengkapan sudah ditata di meja. Ambil paspor, tiket, pakaian ihram, tas perlengkapan, dan koper sebelum keluar rumah.');
 await c.go('home',0,-4,'Dekati meja perlengkapan',1.5);
 e.setObjective('Ambil lima perlengkapan di meja dan koper di sampingnya');
 let finish;
 const complete=new Promise(resolve=>{finish=resolve;});
 const pickup=item=>{
  if(c.signal.aborted)return;
  if(!e.departureState.inventory.includes(item.id)){pulseActivity(e,'reach');item.object.visible=false;e.removeInteractable(item.object);e.departureState.inventory.push(item.id);e.saveDeparture();e.audio.sfx('chime');}
  if(home.items.every(item=>e.departureState.inventory.includes(item.id)))finish();
 };
 for(const item of home.items){
  if(e.departureState.inventory.includes(item.id))item.object.visible=false;
  else e.addInteractable(item.object,{label:`Ambil ${item.label}`,radius:4,onClick:()=>pickup(item)});
 }
 if(home.items.every(item=>e.departureState.inventory.includes(item.id)))finish();
 try{await c.wait(e.skippable(complete,()=>home.items.forEach(pickup)));}
 finally{for(const item of home.items)e.removeInteractable(item.object);}
 await c.go('home',0,10,'Keluar melalui pintu depan rumah',1);
 await c.go('home',home.carPoint.x,home.carPoint.z,'Dekati mobil yang siap menuju bandara',1.2);
 await c.touch(home.carDoor,'Naik mobil menuju bandara',3);
 await c.travel('indonesia',0,36,{vehicle:'Mobil'});
 const airport=w.ensure('indonesia').refs;
 await c.say('Anda tiba di lobi penurunan penumpang. Bawa koper melewati pintu masuk terminal menuju konter check-in.');
 await c.go('indonesia',0,27,'Masuk terminal dari area penurunan penumpang',1.2);
 await c.go('indonesia',-24,-9,'Masuk antrean konter 31',1);
 const queue=airport.checkinQueue;
 if(queue){queue.started=true;e.setObjective('Tunggu empat penumpang di depan selesai check-in');while(queue.remaining>0){await c.wait(e.wait(250));}}
 await c.go('indonesia',-24,-21,'Maju ke konter 31 untuk check-in',1);
 await c.touch(airport.counters.children[0],'Check-in, periksa dokumen dan ambil boarding pass');
 await c.go('indonesia',22,-14,'Menuju pemeriksaan dokumen dan imigrasi');
 await c.touch(airport.imigrasi.children[0],'Periksa paspor dan boarding pass');
 await c.go('indonesia',36,18,'Menuju gate keberangkatan',1.2);
 await c.touch(airport.gate,'Pindai boarding pass untuk naik pesawat',4);
 await c.go('indonesia',42,18,'Dekati pintu kaca otomatis',1);
 await c.go('indonesia',48,18,'Lewati pintu kaca menuju apron',1);
 if(airport.boarding)airport.boarding.started=true;
 await c.go('indonesia',85,22,'Ikuti marka menuju tangga pesawat',1);
 await c.go('indonesia',85,9,'Naik tangga hingga pintu pesawat',.7);
 await c.touch(airport.aircraftEntry,'Masuk ke kabin pesawat',4);
 await c.wait(e.fadeOut(250));w.spawn('cabin',14,0,90);await c.wait(e.fadeIn(250));
 await c.guide('cabin');
 const seat=w.ensure('cabin').refs.assignedSeat;
 await c.go('cabin',seat.x,0,`Temukan tempat duduk ${seat.number}`,1);
 await c.confirm(`Tempat duduk ${seat.number}`,'Duduk dan pasang sabuk pengaman. Peta perjalanan tampil di layar belakang kursi di depan Anda.');
 enterSeat(e,{x:-4000+seat.x,z:seat.z,y:seat.y,yaw:seat.yaw,kind:'plane'});
 let choice;try{
 e.flightState={progress:0,target:0,origin:'Jakarta',destination:'Madinah',status:'Menunggu keberangkatan'};
 choice=await c.confirm('Pilih rute dan lokasi miqat',
  'Pilih tiba di Madinah lalu menuju Miqat Bir Ali, atau terbang ke Jeddah untuk melanjutkan ke Makkah dengan niat ihram sebelum melintasi miqat di udara.',
  ['Miqat di Bir Ali melalui Madinah','Ke Makkah · niat di pesawat']);
 e.departureState.miqatChoice=choice===1?'air':'land';e.saveDeparture();
 e.flightState.destination=choice===1?'Jeddah':'Madinah';
 await flightSegment(c,.35,'Pesawat berangkat dari Jakarta dan melintasi Samudra Hindia. Posisi perjalanan tampil pada layar peta kabin.');
 await flightSegment(c,.72,'Penerbangan mendekati wilayah Arab Saudi. Perhatikan arahan petugas dan persiapkan diri sebelum melewati miqat.');
 if(choice===1){
  await c.prayer(route==='umrah'?'niat-umrah':'niat-haji');await c.prayer('talbiyah');
  await c.confirm('Persiapan ihram di pesawat','Siapkan pakaian ihram sebelum batas miqat. Ikuti pengumuman awak pesawat dan bimbingan pembimbing rombongan.');
  setRitualAppearance(e,{ihram:true,shaved:false});
  await c.confirm('Niat sebelum melintasi miqat',route==='umrah'?'Labbaika Allahumma umratan. Berniat umrah sebelum melintasi miqat, kemudian lanjutkan talbiyah.':'Labbaika Allahumma hajjan. Berniat haji sebelum melintasi miqat, kemudian lanjutkan talbiyah.');
  e.departureState.ihram=true;e.saveDeparture();
 }
 await flightSegment(c,1,`Pesawat mendekati ${e.flightState.destination}. Bersiap mendarat dan pastikan koper kabin tidak tertinggal.`);
 }finally{leaveSeat(e);e.locomotionLocked=false;}
 await c.wait(e.fadeOut(250));w.spawn(choice===1?'jeddah':'madinah',0,10);await c.wait(e.fadeIn(250));
 await c.guide(choice===1?'jeddah':'madinah');
 e.flightState.progress=1;e.flightState.status='Sudah mendarat';
 await airportProcedure(c,choice===1?'jeddah':'madinah',false);
 return e.departureState.miqatChoice;
}

export async function landMiqat(c,route){
 const e=c.engine,w=c.world;
 await c.travel('miqat',0,44,{vehicle:'Bus'});
 const miqat=w.ensure('miqat').refs;
 await c.go('miqat',-20,-10,'Persiapan di Miqat Bir Ali');await c.touch(miqat.bilik,'Persiapan kebersihan sebelum ihram');
 await c.go('miqat',-6,-12,'Menuju perlengkapan ihram');await c.touch(miqat.rak,'Kenakan pakaian ihram');
 await c.prayer(route==='umrah'?'niat-umrah':'niat-haji');await c.prayer('talbiyah');
 await c.confirm('Niat di Miqat Bir Ali',route==='umrah'?'Labbaika Allahumma umratan. Mulai ihram umrah di miqat, pahami larangannya, dan lanjutkan talbiyah.':'Labbaika Allahumma hajjan. Mulai ihram haji di miqat, pahami larangannya, dan lanjutkan talbiyah.');
 setRitualAppearance(e,{ihram:true,shaved:false});e.departureState.ihram=true;e.saveDeparture();
}

export async function airportProcedure(c,key,departing=false){
 if(!departing&&c.engine.completedArrival===key)return;
 const refs=c.world.ensure(key).refs;
 if(key==='jeddah'&&!departing){
  await c.go(key,22,-14,'Ikuti jalur imigrasi kedatangan');
  await c.touch(refs.imigrasi.children[0],'Tunjukkan paspor dan visa kepada petugas');
  await c.go(key,8,1,'Menuju pengambilan bagasi',1.5);
  await c.touch(refs.baggage,'Cocokkan label dan ambil koper Anda',4);
  await c.go(key,0,26,'Keluar melalui bea cukai menuju titik kumpul',1.5);
  await c.touch(refs.meeting,'Bergabung dengan rombongan menuju Makkah',4);
  c.engine.completedArrival=key;return;
 }
 if(key==='jeddah'&&refs.checkinQueue){
  await c.go(key,-24,-9,'Masuk antrean check-in 31',1);
  refs.checkinQueue.started=true;
  while(refs.checkinQueue.remaining>0)await c.wait(c.engine.wait(250));
 }

 await c.go(key,-24,-20,'Menuju kasir / konter layanan bandara terlebih dahulu');
 await c.touch(refs.counters.children[0],departing?'Konfirmasi tiket, timbang bagasi dan ambil boarding pass':'Tunjukkan dokumen dan konfirmasi layanan rombongan');
 await c.confirm('Konter layanan bandara',departing?'Siapkan paspor dan tiket. Serahkan bagasi tercatat, simpan barang berharga di tas kabin, dan periksa nomor gate pada boarding pass.':'Konfirmasi identitas dan rombongan kepada petugas. Ikuti antrean dan arahan layanan; pembayaran hanya bila ada layanan yang memang memerlukannya.');
 await c.go(key,22,-14,departing?'Ikuti pemeriksaan keamanan dan imigrasi':'Ikuti pemeriksaan imigrasi kedatangan');
 await c.touch(refs.imigrasi.children[0],'Tunjukkan paspor dan ikuti pemeriksaan petugas');
 if(departing){await c.go(key,36,18,'Menuju gate yang tertera pada boarding pass');await c.touch(refs.gate,'Pindai boarding pass dan bergabung dengan antrean boarding');}
 else {
  await c.confirm('SOP kedatangan selesai','Periksa label bagasi, ambil koper milik sendiri, lalu berkumpul dengan rombongan sebelum keluar terminal.');
  c.engine.completedArrival=key;
 }
}

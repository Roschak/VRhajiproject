import {setRitualAppearance} from '../character-ritual.js';

export const HAJJ_MISSIONS=[
 {title:'Berangkat dari rumah ke Bandara Indonesia',location:'home',spawn:[0,3]},
 {title:'Tiba di Jeddah dan menuju hotel Makkah',location:'jeddah',spawn:[0,10]},
 {title:'Ihram Haji - 8 Dzulhijjah dari hotel Makkah',location:'haram',spawn:[-95,50]},
 {title:'Wukuf di Arafah - 9 Dzulhijjah',location:'arafah',spawn:[14,26]},
 {title:'Mabit dan mengambil kerikil di Muzdalifah',location:'muzdalifah',spawn:[0,0]},
 {title:'Lempar Jumrah Aqabah - 10 Dzulhijjah',location:'mina',spawn:[0,30]},
 {title:'Tahallul Awal di Mina',location:'mina',spawn:[0,30]},
 {title:'Thawaf Ifadhah dan Sa’i Haji',location:'haram',spawn:[24,20]},
 {title:'Tahallul Tsani',location:'masaa',spawn:[70,-5]},
 {title:'Mabit di Mina dan lempar 3 Jumrah',location:'mina',spawn:[0,30]},
 {title:'Thawaf Wada’',location:'haram',spawn:[24,20]},
 {title:'Perjalanan pulang ke Indonesia',location:'haram',spawn:[0,65]},
];

export const UMRAH_MISSIONS=[
 {title:'Ihram dari Miqat - niat dan pakaian ihram',location:'home',spawn:[0,3]},
 {title:'Thawaf Umrah - tujuh putaran',location:'haram',spawn:[24,20]},
 {title:'Shalat Sunnah Thawaf - dua rakaat',location:'haram',spawn:[14,13]},
 {title:'Sa’i Umrah - tujuh perjalanan Safa-Marwah',location:'haram',spawn:[80,-30]},
 {title:'Tahallul Umrah - memotong atau mencukur rambut',location:'masaa',spawn:[70,-5]},
 {title:'Perjalanan pulang setelah Umrah',location:'haram',spawn:[0,65]},
];

export const ROUTES=Object.freeze({haji:HAJJ_MISSIONS,umrah:UMRAH_MISSIONS});
export function routeTitle(route,index){return ROUTES[route]?.[index-1]?.title??'';}

export async function runRouteMission(index,c,route='haji'){
 const e=c.engine,w=c.world;
 if(route==='umrah')return runUmrah(index,c);
 switch(index){
  case 1:{
   await c.say('Perjalanan dimulai di rumah. Periksa dokumen dan perlengkapan, lalu menuju bandara untuk penerbangan ke Jeddah.');
   await c.go('home',0,-1,'Periksa koper dan dokumen perjalanan');
   await c.touch(w.ensure('home').refs.checklist,'Periksa perlengkapan keberangkatan');
   await c.travel('indonesia',0,10,{vehicle:'Mobil'});
   const airport=w.ensure('indonesia').refs;
   await c.go('indonesia',-24,-20,'Menuju konter check-in');
   await c.touch(airport.counters.children[0],'Check-in dan serahkan bagasi');
   await c.go('indonesia',22,-14,'Menuju pemeriksaan imigrasi');
   await c.touch(airport.imigrasi.children[0],'Pemeriksaan dokumen perjalanan');
   await c.go('indonesia',36,18,'Menuju gerbang keberangkatan');
   await c.touch(airport.gate,'Boarding pesawat menuju Jeddah');
   await c.travel('jeddah',0,10,{vehicle:'Pesawat'});
   break;
  }
  case 2:{
   await c.say('Anda tiba di Bandara Jeddah. Selesaikan imigrasi dan berkumpul dengan rombongan sebelum menuju hotel di Makkah.');
   await c.go('jeddah',22,-14,'Menuju pemeriksaan imigrasi Jeddah');
   await c.touch(w.ensure('jeddah').refs.imigrasi.children[0],'Selesaikan pemeriksaan kedatangan');
   await c.travel('haram',-95,50,{vehicle:'Bus'});
   await c.go('haram',-95,42,'Masuk ke hotel dan tempat pemondokan');
   await c.touch(w.ensure('haram').refs.hotel,'Check-in di hotel Makkah dan beristirahat');
   await c.confirm('Persiapan di Makkah','Simpan kartu identitas, kenali lokasi hotel, lalu siapkan diri untuk ihram haji pada 8 Dzulhijjah.');
   break;
  }
  case 3:
   await c.go('haram',-95,42,'Menuju tempat persiapan di hotel');
   await c.touch(w.ensure('haram').refs.hotel,'Persiapan kebersihan dan pakaian ihram haji');
   await c.confirm('Niat haji - 8 Dzulhijjah','Berniat haji dari pemondokan di Makkah: Labbaika Allahumma hajjan. Pakai ihram, mulai talbiyah dan ikuti pembimbing rombongan.');
   setRitualAppearance(e,{ihram:true});
   await c.say('Labbaik Allahumma labbaik. Rombongan bersiap menuju Arafah untuk wukuf pada 9 Dzulhijjah.');
   break;
  case 4:
   e.setEnvironment('day');
   await c.travel('arafah',14,26,{walking:true});
   await c.go('arafah',14,35,'Menuju area wukuf di Arafah');
   await c.confirm('Wukuf - 9 Dzulhijjah','Wukuf berlangsung sejak waktu Dzuhur sampai Maghrib. Perbanyak doa dan dzikir. Simulasi memadatkan waktu; ikuti jadwal dan arahan pembimbing saat ibadah sebenarnya.');
   break;
  case 5:{
   e.setEnvironment('night');
   await c.travel('muzdalifah',0,0,{walking:true});
   await c.confirm('Mabit di Muzdalifah - malam 10 Dzulhijjah','Beristirahat sejenak di Muzdalifah setelah dari Arafah. Siapkan kerikil yang diperlukan untuk melontar Jumrah Aqabah.');
   const rocks=w.ensure('muzdalifah').refs.clusters.slice(0,7);
   for(let i=0;i<rocks.length;i++){
    rocks[i].visible=true;rocks[i].position.set(-3+i,.12,3);
    await c.touch(rocks[i],`Ambil kerikil ${i+1} / 7`,12);rocks[i].visible=false;
   }
   await c.confirm('Menuju Mina','Tujuh kerikil latihan sudah dikumpulkan. Rombongan melanjutkan perjalanan ke Mina pada 10 Dzulhijjah.');
   break;
  }
  case 6:
   e.setEnvironment('day');
   await c.travel('mina',0,30,{walking:true});
   await c.stones('aqabah','Jumrah Aqabah');
   await c.confirm('Lontar Jumrah Aqabah - 10 Dzulhijjah','Lontarkan tujuh kerikil satu per satu. Jaga keselamatan, jangan berdesakan, dan ikuti arahan petugas.');
   break;
  case 7:
   await c.go('mina',100,25,'Menuju tempat tahallul di Mina');
   await c.touch(w.ensure('mina').refs.chair,'Latihan mencukur atau memendekkan rambut');
   await c.confirm('Tahallul Awal','Pelajari mencukur atau memendekkan rambut setelah melontar Jumrah Aqabah. Setelah tahallul awal, jamaah dapat berganti dari ihram sesuai ketentuan.');
   setRitualAppearance(e,{ihram:false,shaved:true});
   break;
  case 8:
   await c.travel('haram',24,20,{walking:true});
   await c.tawaf('Thawaf Ifadhah');
   await c.sai('Sa’i Haji');
   break;
  case 9:
   await c.confirm('Tahallul Tsani','Rangkaian thawaf Ifadhah dan Sa’i selesai. Pelajari penyempurnaan tahallul, lalu bersiap kembali ke Mina untuk hari Tasyrik.');
   break;
  case 10:
   e.setEnvironment('day');
   await c.travel('mina',0,30,{walking:true});
   for(const day of [11,12,13]){
    await c.confirm(`${day} Dzulhijjah - Mabit di Mina`,'Bermalam di Mina. Urutan lontar setiap hari: Jumrah Ula, Wustha, lalu Aqabah; masing-masing tujuh kerikil.');
    for(const [key,name] of [['ula','Jumrah Ula'],['wustha','Jumrah Wustha'],['aqabah','Jumrah Aqabah']]){
     await c.stones(key,name);
     if(key!=='aqabah')await c.confirm('Doa setelah melontar','Berdoa di tempat aman tanpa menghalangi jalur jamaah, lalu lanjutkan ke jumrah berikutnya.');
    }
   }
   break;
  case 11:
   await c.travel('haram',24,20,{walking:true});
   await c.tawaf('Thawaf Wada’');
   await c.confirm('Thawaf Wada’','Thawaf perpisahan menjadi penutup sebelum meninggalkan Makkah. Setelah menyelesaikannya, lanjutkan perjalanan pulang.');
   break;
  case 12:
   await c.travel('jeddah',0,10,{vehicle:'Bus'});
   await c.travel('indonesia',0,10,{vehicle:'Pesawat'});
   await c.confirm('Tiba di Indonesia','Selesaikan pemeriksaan kedatangan dan pastikan bagasi lengkap sebelum menuju rumah.');
   await c.travel('home',0,3,{vehicle:'Mobil'});
   await c.say('Alhamdulillah, perjalanan haji dari rumah hingga kembali ke rumah selesai.');
   break;
  default:throw new Error(`Tahap haji tidak dikenal: ${index}`);
 }
}

async function runUmrah(index,c){
 const e=c.engine,w=c.world;
 switch(index){
  case 1:{
   await c.say('Periksa dokumen dan perlengkapan di rumah. Perjalanan latihan menuju Madinah, lalu ke Miqat Bir Ali.');
   await c.go('home',0,-1,'Periksa koper dan dokumen');
   await c.touch(w.ensure('home').refs.checklist,'Periksa perlengkapan keberangkatan');
   await c.travel('indonesia',0,10,{vehicle:'Mobil'});
   const refs=w.ensure('indonesia').refs;
   await c.go('indonesia',-24,-20,'Menuju konter check-in');
   await c.touch(refs.counters.children[0],'Check-in penerbangan');
   await c.go('indonesia',36,18,'Menuju gerbang keberangkatan');
   await c.touch(refs.gate,'Boarding pesawat menuju Madinah');
   await c.travel('madinah',0,10,{vehicle:'Pesawat'});
   await c.say('Setelah tiba di Madinah, berkumpul dengan rombongan dan melanjutkan perjalanan ke Miqat Bir Ali.');
   await c.travel('miqat',0,44,{vehicle:'Bus'});
   const miqat=w.ensure('miqat').refs;
   await c.go('miqat',-20,-10,'Persiapan di tempat miqat');
   await c.touch(miqat.bilik,'Persiapan kebersihan sebelum ihram');
   await c.go('miqat',-6,-12,'Menuju perlengkapan ihram');
   await c.touch(miqat.rak,'Kenakan pakaian ihram');
   await c.confirm('Niat Umrah di Miqat','Niat umrah: Labbaika Allahumma umratan. Kenakan pakaian ihram, pahami larangannya dan lanjutkan dengan talbiyah.');
   setRitualAppearance(e,{ihram:true,shaved:false});
   await c.say('Labbaik Allahumma labbaik. Miqat Bir Ali adalah tempat memulai ihram untuk perjalanan ini.');
   break;
  }
  case 2:
   await c.travel('haram',24,20,{walking:true});
   await c.tawaf('Thawaf Umrah');
   break;
  case 3:
   await c.go('haram',14,13,'Menuju area shalat di belakang Maqam Ibrahim');
   await c.touch(w.ensure('haram').refs.maqam,'Berdiri untuk shalat sunnah thawaf');
   await c.confirm('Shalat Sunnah Thawaf','Latih dua rakaat di belakang Maqam Ibrahim jika memungkinkan dan tidak mengganggu arus jamaah. Jika padat, shalat di tempat lain dalam Masjidil Haram.');
   await c.confirm('Dua rakaat selesai','Latihan shalat sunnah thawaf dua rakaat selesai. Berikutnya menuju Safa untuk memulai Sa’i.');
   break;
  case 4:
   await c.sai('Sa’i Umrah');
   break;
  case 5:
   await c.go('haram',82,-30,'Menuju tempat tahallul setelah Sa’i');
   await c.touch(w.ensure('haram').refs.halq,'Latihan mencukur atau memendekkan rambut');
   await c.confirm('Tahallul Umrah','Setelah Sa’i, pelajari mencukur atau memendekkan rambut sesuai ketentuan. Umrah selesai dan jamaah keluar dari ihram.');
   setRitualAppearance(e,{ihram:false,shaved:true});
   break;
  case 6:
   await c.travel('madinah',0,10,{vehicle:'Bus'});
   await c.travel('indonesia',0,10,{vehicle:'Pesawat'});
   await c.confirm('Tiba di Indonesia','Pastikan barang bawaan lengkap sebelum melanjutkan perjalanan pulang.');
   await c.travel('home',0,3,{vehicle:'Mobil'});
   await c.say('Alhamdulillah, perjalanan Umrah dari rumah hingga kembali ke rumah selesai.');
   break;
  default:throw new Error(`Tahap Umrah tidak dikenal: ${index}`);
 }
}

"""Build local Indonesian narration. Install edge-tts in tools/tts-deps first."""
import asyncio, hashlib, json, re, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools/tts-deps'))
import edge_tts
OUT=ROOT/'src/VRHaji.Web/wwwroot/audio/guide'
OUT.mkdir(parents=True,exist_ok=True)
texts=set()
if (OUT/'manifest.json').exists():
 texts.update(json.loads((OUT/'manifest.json').read_text(encoding='utf-8')).get('clips',{}))
prayer_texts={p['arabic'] for p in json.loads((ROOT/'src/VRHaji.Web/wwwroot/data/prayers.json').read_text(encoding='utf-8'))}
texts.update(prayer_texts)
for name in ['guide-scenes.js','departure-flow.js','route-missions.js','journey-missions.js']:
 source=(ROOT/'src/VRHaji.Web/wwwroot/js/vr'/name).read_text(encoding='utf-8-sig')
 for m in re.finditer(r"(['\"`])((?:\\.|(?!\1)[^\r\n])*?)\1",source):
  text=m[2]
  if '${' in text or len(text)<18 or len(text)>850 or not re.search(r'[a-zA-Z]{3} [a-zA-Z]{3}',text):continue
  if any(s in text for s in ['=>','./','===','document.','querySelector','{','}']):continue
  text=re.sub(r'\s+',' ',text.replace("\\'","'").replace('\\n',' ')).strip();texts.add(text)
texts.add('Temukan tempat duduk 11C')
for name in ['Thawaf Umrah','Thawaf Ifadhah','Thawaf Ifadhah Haji','Thawaf Wada','Thawaf Wada’','Thawaf Wada\'']:
 texts.add(f'{name}: mulai dengan istilam. Kelilingi Kabah tujuh putaran berlawanan arah jarum jam, dengan Kabah di sebelah kiri.')
for name in ['Sa’i Haji','Sa’i Umrah']:
 texts.add(f'{name}: mulai di Safa, tujuh perjalanan dan berakhir di Marwah. Safa ke Marwah dihitung satu perjalanan.')
 for trip in range(1,8):texts.add(f"{name}: menuju {'Marwah' if trip%2 else 'Safa'} ({trip}/7)")
for name in ['Jumrah Ula','Jumrah Wustha','Jumrah Aqabah']:texts.add(f'Dekati {name}')
for i in range(1,8):texts.add(f'Ambil kerikil {i} / 7')
for dest in ['Madinah','Jeddah']:texts.add(f'Pesawat mendekati {dest}. Bersiap mendarat dan pastikan koper kabin tidak tertinggal.')
for vehicle in ['Bus','Mobil','Pesawat']:
 for dest in ['Rumah di Indonesia','Bandara Indonesia','Bandara Madinah','Bandara Jeddah','Kabin pesawat','Miqat Bir Ali','Masjidil Haram','Safa dan Marwah','Mina','Muzdalifah','Arafah']:
  texts.add(f'{vehicle} menuju {dest}. Perjalanan berlangsung dalam sesi simulasi yang sama.')
for dest in ['Rumah di Indonesia','Bandara Indonesia','Bandara Madinah','Bandara Jeddah','Miqat Bir Ali','Masjidil Haram','Safa dan Marwah','Mina','Muzdalifah','Arafah']:
 texts.add(f'Ikuti jalan penghubung menuju {dest}')
for vehicle in ['Bus','Mobil','Pesawat']:
 texts.add(f'{vehicle} siap berangkat. Waktu perjalanan disingkat dalam simulasi.')

async def main():
 semaphore=asyncio.Semaphore(3);clips={};failures=[]
 async def build(text):
  filename=hashlib.sha256(text.encode()).hexdigest()[:20]+'.mp3';path=OUT/filename
  async with semaphore:
   if not path.exists() or path.stat().st_size<1000:
    spoken=text.replace('11C','sebelas C').replace('SOP','prosedur').replace('WASD','tombol arah')
    for attempt in range(3):
     try:
      voice='ar-SA-ZariyahNeural' if text in prayer_texts else 'id-ID-GadisNeural'
      await edge_tts.Communicate(spoken,voice,rate='-12%' if text in prayer_texts else '-8%',pitch='+0Hz').save(str(path));break
     except Exception as error:
      if attempt==2:failures.append({'text':text,'error':str(error)});return
      await asyncio.sleep(2+attempt)
   clips[text]=filename
   if len(clips)%25==0:print(f'{len(clips)}/{len(texts)} clips ready',flush=True)
 await asyncio.gather(*(build(text) for text in sorted(texts)))
 (OUT/'manifest.json').write_text(json.dumps({'voice':'id-ID-GadisNeural','prayerVoice':'ar-SA-ZariyahNeural','rate':'-8%','clips':clips},ensure_ascii=False,indent=2),encoding='utf-8')
 print(f'Generated {len(clips)} local clips; failures: {len(failures)}',flush=True)
 if failures:
  (ROOT/'artifacts/guide-audio-failures.json').write_text(json.dumps(failures,ensure_ascii=False,indent=2),encoding='utf-8');sys.exit(1)
asyncio.run(main())

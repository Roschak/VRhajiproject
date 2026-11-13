"""Generate only missing brief narration; preserve every existing guide and prayer clip."""
import asyncio
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools/tts-deps'))
import edge_tts

OUT = ROOT / 'src/VRHaji.Web/wwwroot/audio/guide'

async def main():
    manifest = json.loads((OUT / 'manifest.json').read_text(encoding='utf-8'))
    texts = json.loads((ROOT / 'artifacts/brief-audio-texts.json').read_text(encoding='utf-8'))
    semaphore = asyncio.Semaphore(3)
    failures = []
    async def build(text):
        name = hashlib.sha256(text.encode()).hexdigest()[:20] + '.mp3'
        target = OUT / name
        async with semaphore:
            try:
                if not target.exists() or target.stat().st_size < 1000:
                    spoken = text.replace('11C', 'sebelas C')
                    await asyncio.wait_for(edge_tts.Communicate(spoken, 'id-ID-GadisNeural', rate='-8%').save(str(target)), 45)
                manifest['clips'][text] = name
            except Exception as error:
                failures.append({'text': text, 'error': str(error)})
    await asyncio.gather(*(build(text) for text in texts))
    temporary = OUT / 'manifest.brief.tmp'
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    temporary.replace(OUT / 'manifest.json')
    print(f'Brief clips ready: {len(texts)-len(failures)}/{len(texts)}', flush=True)
    if failures:
        (ROOT / 'artifacts/brief-audio-failures.json').write_text(json.dumps(failures, ensure_ascii=False, indent=2), encoding='utf-8')
        sys.exit(1)

asyncio.run(main())

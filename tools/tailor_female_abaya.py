"""Build the reference abaya/long khimar while preserving the revised gamis."""
from pathlib import Path
engine=Path(__file__).with_name('tailor_female_gamis.py')
exec(compile(engine.read_text(encoding='utf-8'),str(engine),'exec'),
     {'__file__':str(engine),'__name__':'__main__','GARMENT_MODE':'abaya'})

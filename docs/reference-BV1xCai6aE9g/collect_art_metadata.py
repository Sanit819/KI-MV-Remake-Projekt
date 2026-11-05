"""Read-only source image metadata for the v4 call audit; no image editing."""
from pathlib import Path
import json, hashlib
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
manifest = json.loads((ROOT/'assets/astra/v08/manifest.json').read_text(encoding='utf-8'))
items = {}
for name, item in manifest['assets'].items():
    file = ROOT/item['path'].lstrip('/')
    with Image.open(file) as im:
        rgba = im.convert('RGBA')
        mask = rgba.getchannel('A').point(lambda v: 255 if v >= 128 else 0)
        l, t, r, b = mask.getbbox()
        items[name] = {**item, 'w':im.width, 'h':im.height,
                       'bounds':item.get('bounds', {'x':l,'y':t,'w':r-l,'h':b-t}),
                       'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
out = Path(__file__).with_name('v4-art-metadata.json')
out.write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Read {len(items)} source images; wrote {out}')

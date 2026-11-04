"""Read-only checks for the reviewed transparent character composition."""
from pathlib import Path
import hashlib
import json
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[2]
output = root / 'assets/astra/v04/standing-review.png'
source = root / 'assets/astra/v04/standing-base.png'
pixels = np.array(Image.open(output).convert('RGBA'))
alpha = pixels[:, :, 3]
ns = {'s': 'http://www.w3.org/2000/svg'}
original = ET.parse(root / 'assets/astra/openai-blossom.svg').getroot()
jewel = ET.parse(root / 'assets/astra/v04/openai-openwork.svg').getroot()
paths = lambda el: [p.attrib['d'] for p in el.findall('.//s:path', ns)]
forbidden = [el.tag.rsplit('}', 1)[-1] for el in jewel.iter()
             if el.tag.rsplit('}', 1)[-1] in ('circle', 'ellipse', 'rect', 'image')]
ys, xs = np.where(alpha > 0)
report = {
    'date': '2026-11-04',
    'output': str(output.relative_to(root)),
    'size': list(Image.open(output).size),
    'alpha_range': [int(alpha.min()), int(alpha.max())],
    'transparent_pixels': int((alpha == 0).sum()),
    'opaque_pixels': int((alpha == 255).sum()),
    'antialiased_pixels': int(((alpha > 0) & (alpha < 255)).sum()),
    'nonzero_rgb_in_zero_alpha': int((pixels[:, :, :3][alpha == 0] != 0).any(axis=1).sum()),
    'transparent_margins_ltrb': [int(xs.min()), int(ys.min()), int(alpha.shape[1]-1-xs.max()), int(alpha.shape[0]-1-ys.max())],
    'official_path_exact_match': bool(paths(original) and paths(original) == paths(jewel)),
    'ornament_path_count': len(paths(jewel)),
    'forbidden_backing_shapes': forbidden,
    'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
    'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'visual_checks': ['dark, ivory and checkerboard backgrounds inspected', 'temple and waist knot closeups inspected'],
    'scope': 'Static character review; no new MV export; not a strict three-ink bitmap or a native 4K illustration.'
}
assert report['official_path_exact_match']
assert not forbidden
assert report['alpha_range'] == [0, 255]
assert report['nonzero_rgb_in_zero_alpha'] == 0
assert min(report['transparent_margins_ltrb']) >= 80
target = root / 'docs/validation/astra-standing-v04.json'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))

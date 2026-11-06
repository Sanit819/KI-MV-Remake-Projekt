"""Preserve user reference bytes and record the new, unadopted style study."""
from pathlib import Path
import hashlib, json, shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = Path('C:/Users/auscar/Documents/Tencent Files/2470641710/nt_qq/nt_data/Pic/2026-11/Ori')
names = ['713c5f07b3cb853a2bf158e69a324890.png', '699ebd417c6f9b9f05c251249f4897d5.png', 'c50fc4234fd75daf24abf0b16fd7f1d2.png', '55c60fa13dc50cc4d20c14f81302f4d2.png']
out = ROOT / 'references/style/source-assets'
out.mkdir(parents=True, exist_ok=True)
assets = []
for i, name in enumerate(names, 1):
    src, dst = BASE/name, out/f'user-reference-{i:02}.png'
    if not dst.exists(): shutil.copy2(src, dst)
    assert hashlib.sha256(src.read_bytes()).digest() == hashlib.sha256(dst.read_bytes()).digest()
    with Image.open(dst) as im: size, mode = im.size, im.mode
    assets.append(dict(path=dst.relative_to(ROOT).as_posix(), original_path=str(src), sha256=hashlib.sha256(dst.read_bytes()).hexdigest(), dimensions=size, mode=mode, source='user supplied, attributed by user to Ryuzaki Ichi; retained locally as reference only'))
(ROOT/'references/style/USER_REFERENCE_SOURCES.json').write_text(json.dumps(dict(date='2026-11-06', adoption_status='trial_only_user_has_not_adopted', assets=assets),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'style-tests/v1').mkdir(parents=True, exist_ok=True)
print(json.dumps(assets,ensure_ascii=False,indent=2))

"""Read-only static inventory of every v3.2 character image-loading/drawing entry."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import struct

ROOT = Path(__file__).resolve().parents[1]
ENGINE = ROOT / 'production/v3.2/engine'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def png_size(path):
    raw = path.read_bytes()[:24]
    if raw[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError(f'Not a PNG: {path}')
    return list(struct.unpack('>II', raw[16:24]))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, help='Optional report path; sources are never changed.')
    args = parser.parse_args()
    files = sorted(ENGINE.glob('*.js'))
    contents = {p.name: p.read_text(encoding='utf-8-sig') for p in files}
    film = contents['film.js']
    expected = ['pose-a', 'pose-b', 'clap', 'reach', 'draw', 'q']
    loader = "['pose-a','pose-b','clap','reach','draw','q'].map(k=>imageFile(k,`../../v1/assets/${k}.png`))"
    assert loader in film, 'Review the changed primary asset loader'
    assert "imageFile('fallback','../../../art/style-tests/astra-ds-mv-style-v5.png')" in film
    assert sum(len(re.findall(r'\bimageFile\(', s)) for s in contents.values()) == 3
    assert sum(len(re.findall(r'\bnew Image\b', s)) for s in contents.values()) == 3
    assert all('drawImage(' not in s for name, s in contents.items() if name != 'film.js')
    assert film.count('ctx.drawImage(') == 2, 'Review a new stage drawing entry'
    assert film.count('ctx.drawImage(a.im,') == 2
    assert all('new Image' not in s for name, s in contents.items() if name != 'film.js')
    patches = [(key, [int(v) for v in rect.split(',')]) for key, rect in
               re.findall(r"applyEarPatch\('([^']+)',\[([0-9,]+)\]\)", film)]
    assert {k for k, _ in patches} == {'pose-a', 'reach', 'clap', 'fallback'} and len(patches) == 4
    assert "const url=`../../v3.1/assets/${key}.png`;" in film
    assert "url='../assets/reach-hands.png'" in film
    hand_config = re.search(r'const handPatchAudit=await applyHandPatches\(\[(.*?)\]\);', film, re.S)
    assert hand_config, 'Review the changed local hand-patch configuration'
    hand_rects = [(name, [int(v) for v in rect.split(',')]) for name, rect in
                  re.findall(r"\{id:'([^']+)',rect:\[([0-9,]+)\]", hand_config.group(1))]
    assert len(hand_rects) == 2 and {name for name,_ in hand_rects} == {'joined-hands', 'astra-outer-hand'}
    preserve_polygon = json.loads(re.search(r'preservePolygon:(\[\[.*?\]\])', hand_config.group(1), re.S).group(1))
    assert preserve_polygon == [[1410,516],[1435,516],[1435,522],[1430,528],[1424,536],[1410,539]]
    originals = {key: ROOT / f'production/v1/assets/{key}.png' for key in expected}
    originals['fallback'] = ROOT / 'art/style-tests/astra-ds-mv-style-v5.png'
    assets = [{'key': key, 'path': str(p.relative_to(ROOT)).replace('\\', '/'),
               'size': png_size(p), 'sha256': sha(p),
               'role': 'fallback only if requested and pose-a assets are unavailable' if key == 'fallback' else 'production pose'}
              for key, p in originals.items()]
    patch_rows = []
    for key, rect in patches:
        p = ROOT / f'production/v3.1/assets/{key}.png'
        assert png_size(p) == png_size(originals[key]), f'Donor size mismatch: {key}'
        patch_rows.append({'key': key, 'path': str(p.relative_to(ROOT)).replace('\\', '/'),
                           'rect': rect, 'size': png_size(p), 'sha256': sha(p),
                           'role': 'local ear pixels only; not an additional production pose'})
    hand_donor = ROOT / 'production/v3.2/assets/reach-hands.png'
    assert png_size(originals['reach']) == [1672,941]
    donor_native_size = png_size(hand_donor)
    assert abs(donor_native_size[0]-1672)<=1 and donor_native_size[1]==941
    hand_rows = []
    for name,rect in hand_rects:
        x,y,w,h = rect
        assert x>=0 and y>=0 and w>0 and h>0 and x+w<=1672 and y+h<=941
        if name == 'joined-hands':
            assert x < 836 < x+w, 'Joined-hands patch must retain the existing source midline'
        hand_rows.append({'id':name,'asset':'reach','path':str(hand_donor.relative_to(ROOT)).replace('\\','/'),
                          'rect':rect,'preserve_polygon':preserve_polygon if name=='astra-outer-hand' else [],'donor_native_size':donor_native_size,'map_size':[1672,941],
                          'scale':[1672/donor_native_size[0],1],'sha256':sha(hand_donor),
                          'role':'only the stated hand rectangle is composited after the existing reach ear patch'})
    entries = []
    pattern = re.compile(r'new Image|imageFile\(|drawImage|\.scale\(|\.transform\(|setTransform\(|\.src\s*=')
    for name, source in contents.items():
        for number, line in enumerate(source.splitlines(), 1):
            if pattern.search(line):
                entries.append({'file': name, 'line': number, 'source': line.strip()})
    report = {'checked_utc': datetime.now(timezone.utc).isoformat(), 'passed': True,
              'scope': 'Static source and PNG-header inventory only; no 6096-frame render or visual acceptance.',
              'production_asset_count': len(assets), 'assets': assets, 'ear_patch_donors': patch_rows,'hand_patch_rectangles':hand_rows,
              'stage_draw_entry': 'film.js sprite(): full sprite or selected half, both draw a.im; original x836 split performance retained',
              'other_image_loading': 'imageFile() seven originals, applyEarPatch() four v3.1 donors, applyHandPatches() one donor for two rectangles',
              'mirror_review': 'No extra mirrored image asset or negative-scale character branch. Stage rap uses a pi rotation. Source scale entries below are text/title/school transforms.',
              'key_frame_coverage_plan_seconds': {'reach': 6, 'pose-a': 8.1, 'pose-b': 8.8, 'clap': 41, 'draw': 112, 'q': 31.5},
              'engine_sha256': {p.name: sha(p) for p in files}, 'loading_drawing_transform_entries': entries}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'passed': True, 'production_assets': len(assets), 'patch_donors': len(patches)+1,'local_patch_rectangles':len(patches)+len(hand_rects),
                      'stage_draw_calls': 2, 'new_image_constructors': 3,
                      'full_frame_render_performed': False}, ensure_ascii=False))


if __name__ == '__main__':
    main()

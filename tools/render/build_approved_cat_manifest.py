"""Build the isolated v5.1 manifest from the user's approved cat artwork."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'assets/astra/v12-approved-cat'
manifest = json.loads((ROOT / 'assets/astra/v09/manifest.json').read_text(encoding='utf-8'))
sources = [
    ('A19-01-anticipate.png', [520, 712], [437, 769], [629, 502], [508, 456, 240, 175], 'A19-01.prompt.txt', 'C:/Users/auscar/.codex/generated_images/01a1ac2c-80cd-7563-9e55-8ed4b1113954/exec-663386b4-664f-4f7c-b19c-d818a896e2b0.png'),
    ('A19-02-approved.png', [426, 636], [385, 735], [650, 500], [525, 464, 239, 173], None, 'C:/Users/auscar/.codex/generated_images/01a1a5ec-245d-7923-8dd6-2a8b6f24c904/exec-c7eb9a88-5549-4649-85b9-56d2575a1c72.png'),
    ('A19-03-listen.png', [440, 609], [433, 704], [650, 500], [525, 464, 239, 173], 'A19-03.prompt.txt', 'C:/Users/auscar/.codex/generated_images/01a1ac2c-80cd-7563-9e55-8ed4b1113954/exec-3c282505-b93e-4404-beed-f97dc2eee3ff.png'),
]
inventory = []
for phase, (name, hands, wrist, eyes, face, prompt, source) in enumerate(sources, 1):
    p = DEST / name
    im = Image.open(p)
    if im.mode != 'RGBA':
        raise ValueError(f'{name}: expected original RGBA image')
    alpha = im.getchannel('A')
    bounds = alpha.point(lambda value: 255 if value >= 128 else 0).getbbox()
    digest = hashlib.sha256(p.read_bytes()).hexdigest()
    entry = {
        'path': '/assets/astra/v12-approved-cat/' + name,
        'anchors': {'hands': hands, 'wrist': wrist, 'eyes': eyes},
        'face': dict(zip(['x', 'y', 'w', 'h'], face)),
        'actionGroup': 'A19', 'phase': phase, 'styleRevision': 4,
        'faceTreatment': 'shadow', 'source_width': im.width, 'source_height': im.height,
        'tonalThresholds': [65, 16, 155, 16],
        'sha256': digest,
        'provenance': {
            'generator': 'user-selected existing ImageGen source' if phase == 2 else 'built-in image_gen',
            'source': source,
            'prompt': ('assets/astra/v12-approved-cat/' + prompt) if prompt else None,
            'designReference': 'assets/astra/v12-approved-cat/A19-02-approved.png',
            'operation': 'byte-for-byte copy of the user-selected artwork' if phase == 2 else 'adjacent arm/hand pose derived from the user-selected artwork',
            'inspected': True,
            'inspection': 'Viewed native upper-body image: approved cat ears, shadow face, two connected arms, source-drawn hair and bodice GPT knots retained visually. No pasted logo, face, hand, or limb. Hands/eyes/wrist coordinates inspected in this source. Native runtime composition is verified separately.',
        },
    }
    manifest['assets'][f'A19_0{phase}'] = entry
    inventory.append({'name': f'A19_0{phase}', 'file': str(p.relative_to(ROOT)).replace('\\', '/'), 'width': im.width, 'height': im.height, 'sha256': digest, 'alpha_extrema': alpha.getextrema(), 'alpha128_bounds': bounds, 'direct_user_source': phase == 2})
reference = Path(sources[1][-1])
if reference.read_bytes() != (DEST / sources[1][0]).read_bytes():
    raise ValueError('The user-selected main pose must remain byte-identical')
(DEST / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(DEST / 'source-inspection.json').write_text(json.dumps({'passed': True, 'scope': 'File identity, RGBA dimensions, transparency bounds and native-source visual inspection; not a pixel equality claim for generated ornaments.', 'user_selected_main_pose_preserved': True, 'rejected_versions_inactive': ['v10-catpatch', 'v11-catredraw'], 'sources': inventory}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'passed': True, 'manifest': str(DEST / 'manifest.json'), 'sources': inventory}, ensure_ascii=False))

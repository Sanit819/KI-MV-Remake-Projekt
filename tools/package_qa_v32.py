"""Keep compact v3.2 QA and selected evidence; never modify production inputs."""
import json
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / 'exports/v3.2'
QA = ROOT / 'production/v3.2/qa'
QA.mkdir(parents=True, exist_ok=True)

def read(path):
    return json.loads(path.read_text(encoding='utf-8'))

def write(name, value):
    (QA / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

media = read(EXPORT / 'media-validation.json')
assert media['status'] == 'passed' and media['all_requested_checks_completed']
media['commands'] = [{k:v for k,v in row.items() if k not in ('stdout','stderr')} for row in media['commands']]
media['raw_command_output'] = 'Full output retained locally in exports/v3.2/media-validation.json'
write('media-validation-summary.json', media)
browser = read(EXPORT / 'review/browser-review.json')
assert not browser['errors'] and not browser['info']['missing'] and not browser['info']['warnings']
assert browser['reach_coverage']['unique_frames'] == 592
write('hand-patch-validation.json', browser['info']['handPatchAudit'])
write('reach-coverage.json', browser['reach_coverage'])
for source, destination in [
    ('review/browser-review.json', 'browser-review.json'),
    ('review/player-validation.json', 'player-validation.json'),
    ('review/asset-hand-review.png', 'asset-hand-review.png'),
    ('encoded-review/key-134.000.png', 'sharding-preview.png'),
    ('encoded-review/key-140.300.png', 'gather-preview.png'),
    ('source-audit.json', 'pose-source-audit.json'),
    ('render-stats.json', 'render-stats.json'),
    ('encoded-review/coverage.json', 'encoded-coverage.json'),
    ('encoded-review/key-006.000.png', 'key-006.000.png'),
    ('encoded-review/key-147.500.png', 'key-147.500.png'),
    ('encoded-review/key-202.500.png', 'key-202.500.png'),
]:
    shutil.copyfile(EXPORT / source, QA / destination)
print(json.dumps({'qa': str(QA), 'media': media['status'], 'reach_frames': 592}))

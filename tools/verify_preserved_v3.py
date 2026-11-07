"""Verify earlier deliveries and source art remain byte-identical during v3 work."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

expected = json.loads((ROOT/'production/v3/protected-inputs.json').read_text(encoding='utf-8-sig'))['unchanged_inputs']
manifest = json.loads((ROOT/'production/v1/assets/generation-manifest.json').read_text(encoding='utf-8-sig'))
assets = manifest['assets']
for asset in assets:
    expected[asset['file']] = asset['sha256']
checks = [{'file': file, 'expected': digest, 'actual': sha(ROOT/file)} for file,digest in expected.items()]
for check in checks:
    check['passed'] = check['actual'] == check['expected']
out = {'status':'passed' if all(c['passed'] for c in checks) else 'failed', 'checks':checks,
       'current_engine_sha256':{str(p.relative_to(ROOT)):sha(p) for p in sorted((ROOT/'production/v3/engine').glob('*')) if p.is_file()}}
target = ROOT/'exports/v3/preservation-validation.json'
target.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'status':out['status'],'checks':len(checks),'report':str(target)}))
raise SystemExit(0 if out['status']=='passed' else 1)

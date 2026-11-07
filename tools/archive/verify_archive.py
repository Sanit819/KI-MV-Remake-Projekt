"""Verify retained archive inputs and delivery bytes without regenerating media."""
from pathlib import Path
import argparse
import hashlib
import json
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'docs/archive/retained-files.json').read_text(encoding='utf-8-sig'))
    results = []
    for item in manifest['files']:
        base = ROOT if item['location'] == 'project' else ROOT.parent / 'vocaloid-style-mv-pipeline'
        path = (base / item['path']).resolve()
        if not path.is_relative_to(base.resolve()):
            raise ValueError('Manifest path outside its declared root')
        exists = path.is_file()
        actual_size = path.stat().st_size if exists else None
        actual_hash = digest(path) if exists else None
        results.append({'location': item['location'], 'path': item['path'],
                        'passed': exists and actual_size == item['bytes'] and actual_hash == item['sha256'],
                        'exists': exists, 'bytes': actual_size, 'sha256': actual_hash})
    report = {'checked_utc': datetime.now(timezone.utc).isoformat(),
              'scope': 'Retained bytes only; not a rerender or new full audiovisual review.',
              'passed': all(x['passed'] for x in results), 'count': len(results), 'files': results}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'passed': report['passed'], 'files': len(results),
                      'failures': [x for x in results if not x['passed']]}, ensure_ascii=False))
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())

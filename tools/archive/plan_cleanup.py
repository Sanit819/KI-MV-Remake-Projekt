"""Build a file-by-file archive cleanup proposal. This program never deletes.

Run after the portable archive reproduction check has passed. Project-authored
source, JSON, notes and licenses in exports stay in place. Small records from
disposable cache/install roots are copied into evidence-source before their
original copies are proposed for removal. Installed third-party runtime code is
reinstallable; its licenses and package identity records are retained.
"""
from __future__ import annotations

import collections
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat


PROJECT = Path(__file__).absolute().parents[2]
WORKSPACE = PROJECT.parent
EXPECTED_WORKSPACE = Path('D:/myskills/updream')
DOCS = PROJECT / 'docs/maintenance/archive-20261106'
EVIDENCE = DOCS / 'evidence-source'
PLAN = PROJECT / 'exports/archive-maintenance/cleanup-plan.json'
SUMMARY = DOCS / 'cleanup-summary.json'
PROTECTED = DOCS / 'protected-files.json'
GENERATED = {PLAN, SUMMARY, PROTECTED}
REPARSE = getattr(stat, 'FILE_ATTRIBUTE_REPARSE_POINT', 0x400)
CODE = {'.py', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.html', '.css',
        '.sh', '.bat', '.cmd', '.ps1', '.ipynb'}
RECORDS = {'.json', '.md', '.txt', '.csv', '.yaml', '.yml', '.toml', '.ini',
           '.cfg', '.srt', '.vtt', '.ass', '.framehash', '.ffconcat'}
MEDIA = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff',
         '.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4a', '.aac', '.wav',
         '.flac', '.mp3', '.ogg', '.s16le', '.f32', '.pcm'}
MASTER = 'exports/astra-world-execute-me-final-v5.2-lighting-artwork-hires-4k60.mp4'
ROLLBACK = 'exports/astra-world-execute-me-final-v5.1-cat-warning-hires-4k60.mp4'
FIXED_IDENTITIES = {
    MASTER: (816343779, 'e76f5208861df5e10f4fc64f515d36b50dd9daf8b6e563f24ac56f99200e8402'),
    ROLLBACK: (390382524, '19f4a76abfc61c1990d056d018e164ec61e93d147af1436f244cfa57261b7407'),
    'assets/publishing/cover-v03/astra-world-execute-me-cat-cover-v03.png':
        (2125508, 'f3670aeeefe5be77203375384b3e678ec7448093e9a4c042c81152536391f53f'),
    'media/audio/user-world-execute-192k24.flac':
        (148549007, '19d5b185fe6cff41ae7d0082ca4f9e7cf2828ef1de99c7f5336177a9761acbbc'),
}


def key(path: Path) -> str:
    return os.path.normcase(os.path.abspath(path))


def contained(path: Path, root: Path = WORKSPACE) -> bool:
    return os.path.commonpath([key(path), key(root)]) == key(root)


def assert_plain_path(path: Path) -> None:
    if not contained(path):
        raise RuntimeError(f'Outside authorized workspace: {path}')
    current = path
    while True:
        if current.exists() or current.is_symlink():
            info = current.lstat()
            if current.is_symlink() or getattr(info, 'st_file_attributes', 0) & REPARSE:
                raise RuntimeError(f'Reparse/symlink path is forbidden: {current}')
        if key(current) == key(WORKSPACE):
            return
        current = current.parent


def sha256(path: Path) -> str:
    assert_plain_path(path)
    before = path.stat()
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b''):
            digest.update(block)
    after = path.stat()
    if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
        raise RuntimeError(f'File changed while hashing: {path}')
    return digest.hexdigest()


def relative(path: Path) -> str:
    return path.relative_to(WORKSPACE).as_posix()


def read_json(path: Path):
    assert_plain_path(path)
    return json.loads(path.read_text(encoding='utf-8-sig'))


def walk(root: Path):
    """lstat every entry and never traverse .git or reparse points."""
    output, skipped = [], []
    def visit(directory):
        with os.scandir(directory) as entries:
            for entry in entries:
                path = Path(entry.path)
                if entry.name == '.git':
                    skipped.append({'path': str(path), 'reason': '.git excluded'})
                    continue
                info = entry.stat(follow_symlinks=False)
                if entry.is_symlink() or getattr(info, 'st_file_attributes', 0) & REPARSE:
                    skipped.append({'path': str(path), 'reason': 'reparse/symlink excluded'})
                    continue
                if entry.is_dir(follow_symlinks=False):
                    visit(path)
                elif entry.is_file(follow_symlinks=False):
                    output.append((path, info.st_size, info.st_mtime_ns))
    assert_plain_path(root)
    visit(root)
    return sorted(output, key=lambda item: relative(item[0])), skipped


def license_file(path: Path) -> bool:
    name = path.name.lower()
    return any(word in name for word in ('license', 'licence', 'copyright', 'notice'))


def copy_evidence(path: Path) -> Path:
    destination = EVIDENCE / path.relative_to(PROJECT)
    assert_plain_path(path)
    assert_plain_path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        if path.stat().st_size != destination.stat().st_size or sha256(path) != sha256(destination):
            raise RuntimeError(f'Existing evidence differs; refusing overwrite: {destination}')
    else:
        shutil.copy2(path, destination)
        if sha256(path) != sha256(destination):
            raise RuntimeError(f'Evidence copy mismatch: {destination}')
    return destination


def write_json(path: Path, data) -> None:
    assert_plain_path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main() -> None:
    if key(WORKSPACE) != key(EXPECTED_WORKSPACE) or PROJECT.name != 'KI-MV-Remake-Projekt':
        raise RuntimeError(f'This plan is restricted to {EXPECTED_WORKSPACE}')
    selected = collections.defaultdict(set)
    for name in FIXED_IDENTITIES:
        selected['required-delivery-and-original-audio'].add(PROJECT / name)
    manifest = read_json(PROJECT / 'data/production-v52final/manifest.json')
    for asset in manifest['assets'].values():
        selected['active-79-artwork'].add(PROJECT / asset['path'].lstrip('/\\'))
    if len(selected['active-79-artwork']) != 79:
        raise RuntimeError('Expected exactly 79 active artwork paths')
    encoded = read_json(PROJECT / 'exports/final-v5.2/encoded-stills/index.json')
    if encoded['source_sha256'] != FIXED_IDENTITIES[MASTER][1] or len(encoded['records']) != 28:
        raise RuntimeError('Encoded-still source identity/count mismatch')
    selected['final-28-encoded-stills'].update(Path(row['file']) for row in encoded['records'])
    runtime_root = PROJECT / 'exports/qa-v52-final'
    review = read_json(runtime_root / 'independent-visual.json')
    selected['runtime-20-reviewed-stills'].update(runtime_root / row['path'] for row in review['items'])
    root_review = read_json(runtime_root / 'root-visual-review.json')
    selected['runtime-6-contact-sheets'].update(runtime_root / name for name in root_review['contact_sheets'])
    if len(selected['runtime-20-reviewed-stills']) != 20 or len(selected['runtime-6-contact-sheets']) != 6:
        raise RuntimeError('Unexpected runtime sample count')
    sample_rules = []
    for token in ['BV1xCai6aE9g', 'BV1Jwhy6BEMJ']:
        source_index = PROJECT / f'docs/reference-{token}/frame-index.json'
        source = read_json(source_index)
        for kind in ['reference', 'astra']:
            directory = PROJECT / f'exports/reference-{token}-review/{kind}'
            count = source['decoded_frames'][kind]
            frames = {0, count - 1}
            for shot in source['shots']:
                frames.update(point[kind + '_frame'] for point in shot['points']
                              if isinstance(point.get(kind + '_frame'), int))
                if kind == 'reference' and isinstance(shot.get('motion', {}).get('peak_frame'), int):
                    frames.add(shot['motion']['peak_frame'])
            group = f'reference-samples/{token}/{kind}'
            selected[group].update(directory / f'{n:06}.jpg' for n in frames if 0 <= n < count)
            sample_rules.append({'group': group, 'source_index': relative(source_index),
                                 'directory': relative(directory), 'frames': sorted(frames),
                                 'rule': 'first,last,each-shot three points' + (',motion peak' if kind == 'reference' else '')})
    source_index = PROJECT / 'exports/shot-review-20261105/manifest.json'
    source = read_json(source_index)
    for kind, field in [('ref', 'keyframes'), ('ours', 'astra_keyframes')]:
        directory = PROJECT / f'exports/shot-review-20261105/{kind}'
        # The verified original extraction is zero-based and ends at these exact frames.
        count = 6509 if kind == 'ref' else 12740
        frames = {0, count - 1}
        for shot in source['shots']:
            frames.update(n for n in shot.get(field, []) if isinstance(n, int))
            if kind == 'ref' and isinstance(shot.get('max_change_frame'), int):
                frames.add(shot['max_change_frame'])
        group = f'reference-samples/shot-review-20261105/{kind}'
        selected[group].update(directory / f'{n:06}.jpg' for n in frames if 0 <= n < count)
        sample_rules.append({'group': group, 'source_index': relative(source_index),
                             'directory': relative(directory), 'frames': sorted(frames),
                             'rule': 'first,last,each-shot keyframes' + (',max-change frame' if kind == 'ref' else '')})
    selected_paths = set().union(*selected.values())
    for path in selected_paths:
        assert_plain_path(path)
        if not path.is_file():
            raise RuntimeError(f'Protected sample missing: {path}')

    # Collect archival records before selecting any disposable original in these roots.
    inventory, skipped = walk(WORKSPACE)
    copies = []
    for path, size, _ in inventory:
        if not contained(path, PROJECT):
            continue
        rel = path.relative_to(PROJECT).as_posix()
        installed = rel.startswith('.cache/python/') or rel.startswith('node_modules/')
        cache = rel.startswith('.cache/')
        collect = ((cache and not installed and (path.suffix.lower() in CODE | RECORDS or license_file(path)))
                   or (installed and (license_file(path) or path.suffix.lower() == '.json'
                                      or path.name.lower() in {'readme.md', 'readme.rst', 'metadata'})))
        if collect:
            destination = copy_evidence(path)
            copies.append({'original': str(path), 'retained_copy': str(destination), 'bytes': size,
                           'sha256': sha256(destination)})
    copy_by_original = {row['original']: row for row in copies}
    inventory, skipped = walk(WORKSPACE)
    proposal, protected = [], []
    categories = collections.defaultdict(lambda: {'files': 0, 'bytes': 0})
    retain_reasons = collections.Counter()
    for path, size, mtime in inventory:
        if path in GENERATED:
            continue  # Generated manifests cannot hash themselves; they are never deletion candidates.
        rel = path.relative_to(PROJECT).as_posix() if contained(path, PROJECT) else None
        category = None
        reason = 'preserved outside disposable output/cache roots'
        if path in selected_paths:
            reason = 'explicitly selected delivery, original audio, active artwork or review sample'
        elif rel is not None and rel.startswith('.cache/'):
            category = 'reinstallable-cache-runtime' if rel.startswith('.cache/python/') else 'rebuildable-render-analysis-cache'
        elif rel is not None and rel.startswith('node_modules/'):
            category = 'reinstallable-node-modules'
        elif rel is not None and rel.startswith('exports/'):
            if path.suffix.lower() in CODE | RECORDS or license_file(path):
                reason = 'exports authored source, structured data, notes, license or verification evidence retained in place'
            elif path.suffix.lower() in MEDIA:
                if '/reference-' in rel or rel.startswith('exports/shot-review-20261105/'):
                    # Keep already-composed important reference boards, motion strips and overview images.
                    if any(part in path.parts for part in ['boards', 'cuts', 'motion', 'overview']) or path.name.startswith('overview-'):
                        reason = 'composed reference evidence sample retained'
                    else:
                        category = 'unselected-historical-reference-media'
                elif rel.startswith('exports/final-v5.2/'):
                    category = 'unselected-final-derived-media'
                elif rel.startswith('exports/qa-v52-final/'):
                    category = 'unselected-runtime-native-still'
                elif path.suffix.lower() in {'.mp4', '.mov', '.mkv', '.webm', '.avi'}:
                    category = 'obsolete-video-or-review-preview'
                elif path.suffix.lower() in {'.wav', '.m4a', '.aac', '.flac', '.mp3', '.s16le', '.f32', '.pcm'}:
                    category = 'rebuildable-derived-audio'
                else:
                    category = 'unselected-legacy-qa-or-preview-still'
            elif path.suffix.lower() in {'.pyc', '.pid'}:
                category = 'obsolete-runtime-transient'
            else:
                reason = 'small historical evidence/log or unknown type conservatively retained'
        elif rel == 'media/audio/mili-world-execute-original-bilibili-analysis-44100-f32.wav':
            category = 'rebuildable-derived-audio'
        row = {'absolute_path': str(path), 'relative_path': relative(path), 'bytes': size}
        if category:
            row.update({'category': category, 'mtime_ns_at_plan': mtime})
            if str(path) in copy_by_original:
                row['preserved_evidence_copy'] = copy_by_original[str(path)]['retained_copy']
                row['preserved_evidence_sha256'] = copy_by_original[str(path)]['sha256']
            # No authored exports code, notes, JSON, or license can enter the deletion proposal.
            if rel.startswith('exports/') and (path.suffix.lower() in CODE | RECORDS or license_file(path)):
                raise RuntimeError(f'Authored source selected for deletion: {path}')
            proposal.append(row)
            categories[category]['files'] += 1
            categories[category]['bytes'] += size
        else:
            digest = sha256(path)
            row.update({'sha256': digest, 'reason': reason})
            protected.append(row)
            retain_reasons[reason] += 1
            if rel in FIXED_IDENTITIES and (size, digest) != FIXED_IDENTITIES[rel]:
                raise RuntimeError(f'Delivery identity mismatch: {rel}')
    identities = {row['absolute_path']: row for row in protected}
    samples = []
    for group, paths in sorted(selected.items()):
        samples.append({'group': group, 'files': len(paths), 'bytes': sum(p.stat().st_size for p in paths),
                        'paths': [relative(p) for p in sorted(paths)]})
    reference_groups = [row for row in samples if row['group'].startswith('reference-samples/')]
    if sum(row['files'] for row in reference_groups) != 1796:
        raise RuntimeError('Expected 1,796 explicit reference keyframe samples')
    if set(row['absolute_path'] for row in proposal) & set(identities):
        raise RuntimeError('Protected/delete inventories overlap')
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    roots = {'workspace': str(WORKSPACE), 'project': str(PROJECT),
             'candidate_roots': [str(PROJECT / name) for name in ['.cache', 'node_modules', 'exports']],
             'single_extra_candidate': str(PROJECT / 'media/audio/mili-world-execute-original-bilibili-analysis-44100-f32.wav'),
             'excluded_directory_name': '.git', 'traverse_reparse_points': False}
    limitations = [
        'Proposal only: no file or directory was deleted.',
        'Portable archive reproduction is the retained workflow; original strict export reports are historical pre-cleanup evidence.',
        'Original strict verification/export scripts require rebuilding deleted parts/body/cache/old playback inputs before rerunning.',
        'Historical frame sliders will only find retained samples; source notes, frame indices and compressed reference media remain.',
        'All retained files in this snapshot have SHA-256; generated plan/summary/protected manifests exclude themselves to avoid recursion.',
        'All bytes are logical file sizes, not measured disk-space recovery. New files created after this snapshot are outside the proposal.',
        'Protected source snapshots must be refreshed after concurrent archive-code/document changes finish.',
    ]
    shared = {'created_utc': now, 'mode': 'plan-only', 'deletion_executed': False, 'roots': roots,
              'delete_files': len(proposal), 'delete_bytes': sum(row['bytes'] for row in proposal),
              'protected_files': len(protected), 'protected_bytes': sum(row['bytes'] for row in protected),
              'categories': dict(sorted(categories.items())), 'skipped': skipped, 'limitations': limitations}
    write_json(PROTECTED, {'created_utc': now, 'roots': roots, 'count': len(protected),
                           'bytes': shared['protected_bytes'], 'items': protected})
    write_json(PLAN, {**shared, 'items': proposal, 'retained_samples': samples,
                     'reference_sample_rules': sample_rules, 'collected_cache_evidence': copies,
                     'protected_manifest': str(PROTECTED), 'protected_manifest_sha256': sha256(PROTECTED)})
    write_json(SUMMARY, {**shared, 'retained_sample_groups': [{k: v for k, v in row.items() if k != 'paths'} for row in samples],
                        'collected_cache_evidence_files': len(copies),
                        'collected_cache_evidence_bytes': sum(row['bytes'] for row in copies),
                        'retain_reasons': dict(retain_reasons), 'cleanup_plan': str(PLAN),
                        'cleanup_plan_sha256': sha256(PLAN), 'protected_manifest': str(PROTECTED),
                        'protected_manifest_sha256': sha256(PROTECTED)})
    print(json.dumps({'plan': str(PLAN), 'summary': str(SUMMARY), 'protected': str(PROTECTED),
                      'delete_files': shared['delete_files'], 'delete_bytes': shared['delete_bytes'],
                      'protected_files': len(protected), 'evidence_copies': len(copies),
                      'deletion_executed': False}, ensure_ascii=False))


if __name__ == '__main__':
    main()

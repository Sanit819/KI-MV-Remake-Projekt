"""Validate reference-analysis artifacts and preservation; never certifies unviewed images."""
from pathlib import Path
import hashlib, json

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / 'docs/reference-BV1xCai6aE9g'
OUT = ROOT / 'exports/reference-BV1xCai6aE9g-review'

def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def sha(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()

data = read(DOC/'frame-index.json')
rows = read(DOC/'review-early.json') + read(DOC/'review-late.json')
assert [r['id'] for r in rows] == [s['id'] for s in data['shots']]
assert len(rows) == 86
for row in rows:
    for key in ['reference_observation', 'v4_gap', 'proposal', 'new_asset']:
        assert isinstance(row[key], str) and row[key].strip(), (row['id'], key)
    assert row['evidence_images']
    for item in row['evidence_images']:
        assert (DOC/item).is_file(), item
for shot in data['shots']:
    assert (DOC/shot['board']).is_file()
    assert (DOC/shot['motion_file']).is_file()

early = read(DOC/'visual-evidence-early.json')
late = read(DOC/'review-late-provenance.json')
viewed = set(early['reference_frames_actually_present_in_viewed_images']) | set(late['reference_viewed_indices'])
assert all(isinstance(n, int) and 0 <= n < 5085 for n in viewed)
counts = {}
for key, expected in [('reference', 5085), ('astra', 13100)]:
    counts[key] = len(list((OUT/key).glob('*.jpg')))
    assert counts[key] == expected
    assert all((OUT/key/f'{n:06d}.jpg').is_file() for n in range(expected))
    metrics = read(OUT/f'{key}-metrics.json')
    assert len(metrics['rows']) == expected
    assert sha(Path(data[key])) == data['source_sha256'][key] == metrics['source_sha256']
assert len(data['overview']) == 22

audit = read(DOC/'v4-reuse-audit.json')
for file, expected in audit['source_hashes'].items():
    assert sha(ROOT/file) == expected, file
for asset in audit['assets']:
    assert sha(ROOT/asset['path'].lstrip('/')) == asset['sha256'], asset['name']
assert audit['crosscheck']['matching'] == 661 and not audit['crosscheck']['mismatches']
v4_upload = ROOT/'exports/astra-world-execute-me-full-v4-warning-hires-4k60.mp4'
v4_upload_hash = sha(v4_upload)
assert v4_upload_hash == '01b66d81e4892bfe6f7b8f946ecadb80eaa801659a764d096b4ee8f78e4fef19'

ui = read(DOC/'ui-validation.json')
assert ui['passed'] and all(ui['checks'].values())
assert ui['htmlSha256'] == sha(DOC/'index.html')
assert (DOC/'UI_REVIEW.md').is_file()
result = {
    'analysis_artifacts_valid': True, 'date': '2026-11-05',
    'bvid': 'BV1xCai6aE9g', 'comparison_version': 'accepted_v4',
    'reviewed_segments': 86, 'comparison_boards': 86, 'native_motion_boards': 86,
    'full_duration_half_second_overview_sheets': 22,
    'decoded_and_numerically_measured_frames': counts,
    'distinct_reference_frames_present_in_actually_viewed_evidence': len(viewed),
    'human_visual_scope': 'All half-second overviews and 86 same-music boards, selected native consecutive strips and full-size frames. Some boards were viewed in combined thumbnails. Not manual inspection of every native frame or continuous audio/video playback.',
    'source_sha256': data['source_sha256'],
    'audio_alignment_strict_0_95_passed': read(DOC/'alignment.json')['passed'],
    'audio_mapping_use': 'Visual correspondence at 24 fps only; strict correlation gate failure retained, no sample-exact synchronization claim.',
    'v4_sources_and_used_art_unchanged': True,
    'v4_4k_alac_upload_unchanged_sha256': v4_upload_hash,
    'v4_source_call_crosscheck_samples': 661,
    'ui_validation_sha256': sha(DOC/'ui-validation.json'),
    'html_sha256': ui['htmlSha256'],
    'proposal_status': '21 action groups / 52 complete key poses proposed; no final-edition production implemented',
    'checked_documents': {p.name: sha(p) for p in [DOC/'OPTIMIZATION_PROPOSAL.md',DOC/'REFERENCE_EARLY.md',DOC/'REFERENCE_LATE.md',DOC/'V4_REUSE_AUDIT.md',DOC/'UI_REVIEW.md']},
}
(DOC/'validation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
print(json.dumps(result, ensure_ascii=False, indent=2))

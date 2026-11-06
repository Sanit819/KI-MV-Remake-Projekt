"""Extract 28 native encoded v5.2 frames in one FFmpeg decoding pass.

Default is a dry run. --execute requires completed successful final verification.
No resize, overlay, reconstructed artwork, audio encoding, or source mutation.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import struct
import subprocess

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'exports/final-v5.2'
DEST = WORK / 'encoded-stills'
FINAL = ROOT / 'exports/astra-world-execute-me-final-v5.2-lighting-artwork-hires-4k60.mp4'
FF = ROOT / '.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'
FPS, PREFIX, FRAMES = 60, 300, 13400

# Integers are exact BODY frame indices except the first warning frame (-1).
# The source's renderFrame receives body_frame / 60; full frame = body + 300.
SELECTION = [
    (-1, 'warning-last', 'R00', 'Last unchanged warning frame; immediately before the body'),
    (0, 'opening-first', 'R01', 'First body frame; immediately after the warning'),
    (348, 'extra-light-workspace', 'R02', 'Added workspace illumination'),
    (3006, 'extra-light-tangent', 'R14', 'Added scene illumination'),
    (4217, 'boundary-approach', 'R23', 'A02_01 approved leg redraw'),
    (4289, 'boundary-contact', 'R23', 'A02_02 preserved approved contact anatomy'),
    (4357, 'boundary-withdraw', 'R23', 'A02_03 approved leg redraw'),
    (4937, 'cat-pose-1', 'R30', 'Approved cat original pose'),
    (5000, 'cat-pose-2', 'R30', 'Approved cat raised-paw pose'),
    (5074, 'cat-pose-3', 'R30', 'Approved cat relaxed-paw pose'),
    (6356, 'wave-cut1-before', 'R40', 'Last frame before A04_01 to A04_02 source cut'),
    (6357, 'wave-cut1-after', 'R40', 'First A04_02 frame after the first source cut'),
    (6480, 'wave-new-hands', 'R42', 'New receiving/chest hands and continuous yellow line at body 108s'),
    (6527, 'wave-cut2-before', 'R42', 'Last A04_02 frame before the second source cut'),
    (6528, 'wave-cut2-after', 'R42', 'First A04_03 frame after the second source cut'),
    (7790, 'extra-light-request', 'R52', 'Added request/system scene illumination'),
    (7891, 'refusal-request', 'R53', 'A07_01 request pose'),
    (7950, 'refusal-contact-alpha', 'R53', 'A07_02 transparent-background source in final composite at body 132.5s'),
    (8111, 'refusal-retreat', 'R54', 'A07_03 retreat pose'),
    (8274, 'book-turn', 'R55', 'A08_01 approved head/body redraw and thin book'),
    (8327, 'book-cut-before', 'R55', 'Last turning-page pose before phase u=0.52'),
    (8328, 'book-cut-after', 'R55', 'First pointing-page pose after phase u=0.52'),
    (8370, 'book-point-reading', 'R55', 'Latest approved A08_02 pointing at the page'),
    (10158, 'wrist-recoil', 'R74', 'New wrist recoil and red wrist line at body 169.3s'),
    (12582, 'ending-surprise', 'R86', 'Recognition surprise at body 209.7s'),
    (12624, 'ending-smile', 'R86', 'Recognition smile at body 210.4s'),
    (12840, 'quiet-tail-middle', 'R86', 'Quiet co-drawing tail at body 214s'),
    (13099, 'quiet-tail-last', 'R86', 'Last native video frame; body 218.3166667s'),
]


def sha256(p):
    with p.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def png_dimensions(p):
    with p.open('rb') as f:
        header = f.read(24)
    if len(header) < 24 or header[:8] != b'\x89PNG\r\n\x1a\n' or header[12:16] != b'IHDR':
        raise RuntimeError(f'Not a complete PNG header: {p}')
    return list(struct.unpack('>II', header[16:24]))


def plan():
    timeline = read(ROOT / 'data/production-v5/timeline.json')['shots']
    records = []
    for n, (body, label, expected_shot, purpose) in enumerate(SELECTION, 1):
        full = body + PREFIX
        if not 0 <= full < FRAMES:
            raise RuntimeError('Invalid selected frame')
        actual_shot = 'R00' if body < 0 else next(s['id'] for s in timeline if s['start_frame'] <= body < s['end_frame'])
        if actual_shot != expected_shot:
            raise RuntimeError(f'Selection timeline mismatch: {label}: {actual_shot} != {expected_shot}')
        filename = f'{n:02d}-{label}-f{full:06d}.png'
        records.append({'label': label, 'file': str(DEST / filename), 'shot': actual_shot,
                        'full_film_frame': full, 'full_film_seconds': full / FPS,
                        'full_film_time_exact': str(Fraction(full,FPS)),
                        'body_frame': body if body >= 0 else None,
                        'body_seconds': body/FPS if body >= 0 else None,
                        'purpose': purpose})
    if len({r['full_film_frame'] for r in records}) != 28 or records != sorted(records, key=lambda r:r['full_film_frame']):
        raise RuntimeError('Expected exactly 28 distinct chronological native frames')
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true')
    opts = parser.parse_args()
    records = plan()
    if not opts.execute:
        print(json.dumps({'mode':'dry-run', 'source':str(FINAL), 'count':len(records), 'records':records}, ensure_ascii=False, indent=2))
        return
    render, verified = read(WORK/'render.json'), read(WORK/'verification.json')
    if not render.get('passed') or render.get('phase') != 'complete' or not verified.get('passed'):
        raise RuntimeError('Final export and independent verification must be complete before extracting review stills')
    source_hash = sha256(FINAL)
    if Path(render['output']).resolve() != FINAL.resolve() or source_hash != render.get('output_sha256') or source_hash != verified.get('sha256'):
        raise RuntimeError('Final source identity differs from completed render/verification')
    existing = DEST/'index.json'
    if existing.exists():
        prior = read(existing)
        if prior.get('source_sha256') == source_hash and len(prior.get('records',[])) == len(records) and all(
            p['full_film_frame'] == r['full_film_frame'] and Path(p['file']).is_file() and sha256(Path(p['file'])) == p.get('sha256')
            for p,r in zip(prior['records'],records)):
            print(json.dumps({'status':'existing-verified', 'count':len(records), 'index':str(existing)}, ensure_ascii=False))
            return
        raise RuntimeError('Existing still index is not this exact source/selection; refusing overwrite')
    if any(Path(r['file']).exists() for r in records):
        raise RuntimeError('One or more selected output files already exist without a complete index; refusing overwrite')
    DEST.mkdir(parents=True, exist_ok=True)
    attempt = DEST / ('extraction-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    attempt.mkdir()
    expression = '+'.join('eq(n\\,' + str(r['full_film_frame']) + ')' for r in records)
    command = [str(FF), '-hide_banner', '-loglevel', 'error', '-n', '-i', str(FINAL), '-map', '0:v:0', '-an',
               '-vf', 'select=' + expression, '-fps_mode', 'passthrough', '-frames:v', str(len(records)),
               '-c:v', 'png', str(attempt/'selected-%03d.png')]
    (attempt/'command.json').write_text(json.dumps(command,indent=2)+'\n',encoding='utf-8')
    result = subprocess.run(command, capture_output=True, check=False)
    error = result.stderr.decode('utf-8',errors='replace').strip()
    (attempt/'ffmpeg.log').write_text(error+'\n',encoding='utf-8')
    if result.returncode or error:
        raise RuntimeError(f'Frame extraction failed: {result.returncode}: {error}')
    pngs = sorted(attempt.glob('selected-*.png'))
    if len(pngs) != len(records) or any(png_dimensions(p) != [3840,2160] for p in pngs):
        raise RuntimeError('Incorrect number or native dimensions of extracted stills')
    for p,r in zip(pngs,records):
        target=Path(r['file']); p.rename(target)
        r.update({'sha256':sha256(target), 'bytes':target.stat().st_size, 'dimensions':[3840,2160]})
    if sha256(FINAL) != source_hash:
        raise RuntimeError('Source changed during extraction')
    index = {'passed': True, 'source':str(FINAL), 'source_sha256':source_hash, 'source_frames':FRAMES, 'fps':FPS,
             'prefix_frames':PREFIX, 'count':len(records), 'records':records,
             'command':command, 'extraction_log':str(attempt/'ffmpeg.log'),
             'time_basis':'All selection uses zero-based encoded full_film_frame; for body frames full_film_frame = body_frame + 300. No warning offset is applied twice.',
             'scope':'28 exact decoded native 3840x2160 frames from the completed encoded final MP4, selected in one FFmpeg decoding pass. PNG display conversion only; no resizing, overlays, reconstruction or source changes. This is a targeted sample for visual review, not every-frame human viewing.'}
    existing.write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'extracted', 'count':len(records), 'source_sha256':source_hash, 'index':str(existing)}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()

"""Compare the 12 frames adjoining the six V6 patch splices with their real origins.

Usage: python -B tools/check_mv6_patch_splices.py
Exit 0: no suspected mismatch (individual samples may remain ambiguous).
Exit 1: a suspected offset or poor source match needs review. Exit 2: invalid input.
This is an encoded-image comparison, not a claim of lossless pixel identity.
"""
from __future__ import annotations

import argparse
from collections import OrderedDict
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'exports/mv6'
FINAL = BASE / 'final4k-anonymous'
FPS, TOTAL = 60, 13100
EXPECTED_SEGMENTS = [(0, 2896, 'base'), (2896, 3117, 'vision'), (3117, 3754, 'base'),
                     (3754, 3920, 'intro'), (3920, 9529, 'base'), (9529, 9690, 'counts'), (9690, TOTAL, 'base')]
EXPECTED_ORIGINS = {'base': [0, TOTAL], 'vision': [2896, 3117], 'intro': [3754, 3920], 'counts': [9529, 9690]}
THRESHOLDS = {'minimum_candidate_psnr_db': 32.0, 'moving_pixel_channel_difference': 2,
              'minimum_moving_pixels': 64, 'offset_global_mse_ratio': .80,
              'offset_global_mse_improvement': .10, 'offset_roi_mse_ratio': .75,
              'offset_roi_mse_improvement': .50, 'expected_roi_mse_ratio': .80,
              'expected_roi_mse_improvement': .50}


def safe_path(value, exists=False, allow_base=False):
    p = Path(value)
    p = Path(os.path.abspath(p if p.is_absolute() else ROOT / p))
    if not p.is_relative_to(BASE) or (p == BASE and not allow_base):
        raise ValueError(f'Artifact must remain beneath {BASE}: {p}')
    ancestor = p
    while ancestor != ROOT:
        if os.path.lexists(ancestor) and ancestor.resolve(strict=True) != ancestor:
            raise ValueError(f'Redirected artifact ancestor: {ancestor}')
        if not ancestor.is_relative_to(ROOT):
            raise ValueError('Artifact escaped the worktree')
        ancestor = ancestor.parent
    if exists and not p.is_file():
        raise ValueError(f'Missing input file: {p}')
    return p


def sha(p):
    digest = hashlib.sha256()
    with p.open('rb') as stream:
        while block := stream.read(1024 * 1024):
            digest.update(block)
    return digest.hexdigest()


def setup_media_libraries():
    temp = safe_path(BASE / '.splice-check-tmp')
    temp.mkdir(parents=True, exist_ok=True)
    safe_path(temp)
    for name in ('TEMP', 'TMP', 'TMPDIR'):
        os.environ[name] = str(temp)
    tempfile.tempdir = str(temp)
    global cv2, np, Image, ImageDraw, ImageFont
    import cv2
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
    return temp


class Reader:
    def __init__(self, file, expected_frames, expected_size):
        self.file, self.cache = file, OrderedDict()
        self.cap = cv2.VideoCapture(str(file), cv2.CAP_FFMPEG)
        if not self.cap.isOpened():
            raise ValueError(f'Cannot open video: {file}')
        self.frames = int(round(self.cap.get(cv2.CAP_PROP_FRAME_COUNT)))
        self.size = [int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))]
        self.fps = self.cap.get(cv2.CAP_PROP_FPS)
        if self.frames != expected_frames or self.size != expected_size or not math.isfinite(self.fps) or abs(self.fps - FPS) > 1e-6:
            self.close()
            raise ValueError(f'Video metadata mismatch: {file}: {self.frames}, {self.size}, {self.fps}')

    def read(self, index):
        if not 0 <= index < self.frames:
            raise IndexError(f'Frame outside source: {index}/{self.frames}')
        if index in self.cache:
            self.cache.move_to_end(index)
            return self.cache[index]
        accepted = self.cap.set(cv2.CAP_PROP_POS_FRAMES, index)
        before = self.cap.get(cv2.CAP_PROP_POS_FRAMES)
        ok, bgr = self.cap.read()
        after = self.cap.get(cv2.CAP_PROP_POS_FRAMES)
        if not accepted or not ok or not math.isfinite(before) or not math.isfinite(after) or abs(before - index) > .01 or abs(after - (index + 1)) > .01:
            raise ValueError(f'Frame seek/read position mismatch: {self.file}, wanted={index}, before={before}, after={after}')
        if list(bgr.shape[1::-1]) != self.size or len(bgr.shape) != 3 or bgr.shape[2] != 3:
            raise ValueError(f'Decoded frame shape differs from its metadata: {self.file}')
        msec = self.cap.get(cv2.CAP_PROP_POS_MSEC)
        evidence = {'requested_local_frame': index, 'seek_accepted': accepted,
                    'position_before_read': before, 'position_after_read': after,
                    'reported_position_msec_after_read': msec if math.isfinite(msec) else None}
        self.cache[index] = (bgr, evidence)
        while len(self.cache) > 2:
            self.cache.popitem(last=False)
        return bgr, evidence

    def close(self):
        self.cap.release()
        self.cache.clear()


def metric_image(bgr, width):
    if width and bgr.shape[1] > width:
        return cv2.resize(bgr, (width, round(bgr.shape[0] * width / bgr.shape[1])), interpolation=cv2.INTER_AREA)
    return bgr


def errors(a, b, mask=None):
    delta = a.astype(np.float32) - b.astype(np.float32)
    if mask is not None:
        delta = delta[mask]
    mse = float(np.mean(delta * delta, dtype=np.float64))
    return {'mse_8bit': mse, 'mae_8bit': float(np.mean(np.abs(delta), dtype=np.float64)),
            'max_absolute_channel_error': float(np.max(np.abs(delta))),
            'psnr_db': 10 * math.log10(255 * 255 / mse) if mse > 0 else None,
            'pixel_equal_at_metric_resolution': mse == 0}


def decide(candidates):
    expected = next(c for c in candidates if c['offset'] == 0)
    finite = lambda c: c['final_vs_source']['mse_8bit']
    best = min(candidates, key=finite)
    best_psnr = best['final_vs_source']['psnr_db']
    if best_psnr is not None and best_psnr < THRESHOLDS['minimum_candidate_psnr_db']:
        return 'poor_source_match', best['offset'], 'All compared source frames fall below the documented similarity threshold.'
    ambiguous, suspicious = [], []
    for other in candidates:
        if other['offset'] == 0:
            continue
        roi = other['motion_region']
        if not roi['distinguishable_source_motion']:
            ambiguous.append(other['offset'])
            continue
        exp_mse, alt_mse = finite(expected), finite(other)
        exp_roi, alt_roi = roi['final_vs_expected_mse'], roi['final_vs_neighbor_mse']
        if alt_mse <= exp_mse * THRESHOLDS['offset_global_mse_ratio'] and exp_mse - alt_mse >= THRESHOLDS['offset_global_mse_improvement'] and alt_roi <= exp_roi * THRESHOLDS['offset_roi_mse_ratio'] and exp_roi - alt_roi >= THRESHOLDS['offset_roi_mse_improvement']:
            suspicious.append(other['offset'])
        elif not (exp_roi <= alt_roi * THRESHOLDS['expected_roi_mse_ratio'] and alt_roi - exp_roi >= THRESHOLDS['expected_roi_mse_improvement']):
            ambiguous.append(other['offset'])
    if suspicious:
        winning = min((c for c in candidates if c['offset'] in suspicious), key=finite)
        return 'suspected_frame_offset', winning['offset'], 'A distinct adjacent source frame fits materially better both globally and in its moving region; inspect the contact sheet.'
    if ambiguous:
        return 'ambiguous_neighbor', best['offset'], f'Source neighbors {ambiguous} are identical, insufficiently distinct, or too close after lossy encoding to resolve the frame index.'
    return 'consistent_with_expected', 0, 'The expected source frame has a clear moving-region advantage over every available neighbor.'


def thumbnail(bgr, label):
    rgb = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
    tile = Image.new('RGB', (480, 314), '#100c16')
    tile.paste(rgb.resize((480, 270)), (0, 0))
    draw = ImageDraw.Draw(tile)
    font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 15)
    for row, text in enumerate(label.split('\n')[:2]):
        draw.text((8, 274 + 18 * row), text, font=font, fill='#e5d1a1')
    return tile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', default=str(FINAL / 'body.render.json'))
    parser.add_argument('--body', default=None)
    parser.add_argument('--out-dir', default=str(FINAL / 'splice-check'))
    parser.add_argument('--metric-width', type=int, default=0, help='Area-resize width for error metrics; default 0 uses native 4K pixels. Use 1920 to reduce memory/work.')
    args = parser.parse_args()
    if args.metric_width < 0:
        raise ValueError('Metric width must be nonnegative')
    report_path = safe_path(args.report, exists=True)
    body = safe_path(args.body or report_path.with_name('body.mp4'), exists=True)
    if body.suffix.lower() != '.mp4' or report_path.suffix.lower() != '.json':
        raise ValueError('Expected MP4 media and JSON report')
    out = safe_path(args.out_dir)
    if out.exists() and (not out.is_dir() or any(out.iterdir())):
        raise FileExistsError('Use a new or empty splice-check output directory')
    report_bytes = report_path.read_bytes()
    report_hash = hashlib.sha256(report_bytes).hexdigest()
    report = json.loads(report_bytes)
    segments = report.get('segments', [])
    selected = [(s.get('first'), s.get('end'), s.get('captureSource')) for s in segments]
    if selected != EXPECTED_SEGMENTS or report.get('frames') != TOTAL or report.get('interval') != [0, TOTAL] or report.get('fps') != FPS:
        raise ValueError('The final manifest is not the authorized seven-segment, 13100-frame assembly')
    origins = report.get('captureSources', {})
    if set(origins) != set(EXPECTED_ORIGINS):
        raise ValueError('Missing or unexpected capture source')
    size = [report.get('width'), report.get('height')]
    if size != [3840, 2160]:
        raise ValueError('Expected the 4K patch assembly')
    inputs = {'final': {'media': body, 'expected_sha256': report.get('sha256'), 'interval': [0, TOTAL]}}
    for name, origin in origins.items():
        if origin.get('interval') != EXPECTED_ORIGINS[name]:
            raise ValueError(f'Wrong origin interval for {name}')
        file = safe_path(origin['media'], exists=True)
        if file.suffix.lower() != '.mp4' or file == body:
            raise ValueError('Each source must be its original MP4, not the assembled body')
        inputs[name] = {'media': file, 'expected_sha256': origin.get('mediaSha256'), 'interval': origin['interval']}
    for record in inputs.values():
        if not isinstance(record['expected_sha256'], str) or len(record['expected_sha256']) != 64:
            raise ValueError('Missing media hash evidence')
        record['sha256'] = sha(record['media'])
        if record['sha256'] != record['expected_sha256']:
            raise ValueError(f'Media/report hash mismatch: {record["media"]}')
        stat = record['media'].stat()
        record['initial_stat'] = [stat.st_size, stat.st_mtime_ns]
    temp = setup_media_libraries()
    readers, rows, results = {}, [], []
    try:
        for name, record in inputs.items():
            readers[name] = Reader(record['media'], record['interval'][1] - record['interval'][0], size)
        boundaries = [s[0] for s in EXPECTED_SEGMENTS[1:]]
        for boundary in boundaries:
            for global_frame in [boundary - 1, boundary]:
                segment = next(s for s in segments if s['first'] <= global_frame < s['end'])
                source_id = segment['captureSource']
                origin_start = origins[source_id]['interval'][0]
                local_frame = global_frame - origin_start
                final_full, final_position = readers['final'].read(global_frame)
                expected_full, expected_position = readers[source_id].read(local_frame)
                actual = metric_image(final_full, args.metric_width)
                expected = metric_image(expected_full, args.metric_width)
                candidates, unavailable, neighbor_images = [], [], {}
                for offset in [-1, 0, 1]:
                    local = local_frame + offset
                    if not 0 <= local < readers[source_id].frames:
                        unavailable.append({'offset': offset, 'reason': 'outside this original source movie'})
                        continue
                    source_full, position = readers[source_id].read(local)
                    source = metric_image(source_full, args.metric_width)
                    candidate = {'offset': offset, 'source_local_frame': local, 'source_global_frame': global_frame + offset,
                                 'read_position': position, 'final_vs_source': errors(actual, source)}
                    if offset:
                        source_delta = np.max(np.abs(expected.astype(np.int16) - source.astype(np.int16)), axis=2)
                        moving = source_delta > THRESHOLDS['moving_pixel_channel_difference']
                        count = int(np.count_nonzero(moving))
                        candidate['expected_vs_neighbor'] = errors(expected, source)
                        candidate['motion_region'] = {'pixels': count, 'fraction': count / moving.size,
                            'distinguishable_source_motion': count >= THRESHOLDS['minimum_moving_pixels'],
                            'final_vs_expected_mse': errors(actual, expected, moving)['mse_8bit'] if count else None,
                            'final_vs_neighbor_mse': errors(actual, source, moving)['mse_8bit'] if count else None}
                        neighbor_images[offset] = source
                    candidates.append(candidate)
                status, best_offset, reason = decide(candidates)
                expected_metrics = next(c for c in candidates if c['offset'] == 0)['final_vs_source']
                result = {'boundary': boundary, 'side': 'left' if global_frame < boundary else 'right', 'final_global_frame': global_frame,
                          'body_seconds': global_frame / FPS, 'source_id': source_id, 'source_media': str(inputs[source_id]['media']),
                          'source_origin_interval': origins[source_id]['interval'], 'expected_source_local_frame': local_frame,
                          'metric_size': [actual.shape[1], actual.shape[0]], 'final_read_position': final_position,
                          'expected_source_read_position': expected_position, 'candidates': candidates, 'unavailable_neighbors': unavailable,
                          'status': status, 'decision_offset': best_offset,
                          'lowest_global_mse_offset': min(candidates, key=lambda c: c['final_vs_source']['mse_8bit'])['offset'], 'reason': reason}
                results.append(result)
                best_neighbor = min((c for c in candidates if c['offset']), key=lambda c: c['final_vs_source']['mse_8bit'])
                neighbor = neighbor_images[best_neighbor['offset']]
                diff = np.clip(np.abs(actual.astype(np.int16) - expected.astype(np.int16)) * 8, 0, 255).astype(np.uint8)
                psnr = expected_metrics['psnr_db']
                label = f'PSNR {psnr:.2f} dB' if psnr is not None else 'metric pixels equal'
                row = Image.new('RGB', (1920, 314), '#100c16')
                for column, tile in enumerate([
                    thumbnail(final_full, f'FINAL f{global_frame} / cut {boundary}\n{status}'),
                    thumbnail(expected_full, f'EXPECTED {source_id} local {local_frame}\n{label}; MAE {expected_metrics["mae_8bit"]:.4f}'),
                    thumbnail(neighbor, f'NEIGHBOR offset {best_neighbor["offset"]:+d}\nlocal {best_neighbor["source_local_frame"]}'),
                    thumbnail(diff, 'ABS(FINAL - EXPECTED) x8\nMetric-resolution BGR difference')]):
                    row.paste(tile, (column * 480, 0))
                rows.append(row)
                print(f'[splice-check] f{global_frame} -> {source_id}:{local_frame}: {status}', flush=True)
    finally:
        for reader in readers.values():
            reader.close()
    for record in inputs.values():
        stat = record['media'].stat()
        if record['initial_stat'] != [stat.st_size, stat.st_mtime_ns]:
            raise ValueError('Input media changed while it was being compared')
    if sha(report_path) != report_hash:
        raise ValueError('Render manifest changed while its source frames were being compared')
    safe_path(out).mkdir(parents=True, exist_ok=True)
    boards = []
    for page, first in enumerate(range(0, len(rows), 4), 1):
        selected_rows = rows[first:first + 4]
        board = Image.new('RGB', (1920, 314 * len(selected_rows)), '#100c16')
        for index, row in enumerate(selected_rows):
            board.paste(row, (0, index * 314))
        file = safe_path(out / f'splice-boundaries-{page:02d}.jpg')
        if file.exists():
            raise FileExistsError(file)
        with file.open('xb') as handle:
            board.save(handle, format='JPEG', quality=93)
        boards.append(str(file))
    suspicious = [r['final_global_frame'] for r in results if r['status'] in ('suspected_frame_offset', 'poor_source_match')]
    ambiguous = [r['final_global_frame'] for r in results if r['status'] == 'ambiguous_neighbor']
    output = {'schema': 'mv6-patch-splice-image-check-v1', 'created_at_utc': datetime.now(timezone.utc).isoformat(),
              'render_report': str(report_path), 'render_report_sha256': report_hash, 'temp_directory': str(temp),
              'inputs': {name: {**record, 'media': str(record['media'])} for name, record in inputs.items()},
              'expected_segments': EXPECTED_SEGMENTS, 'boundaries': boundaries, 'samples_compared': len(results),
              'metric_width_limit': args.metric_width, 'thresholds': THRESHOLDS, 'results': results, 'contact_sheets': boards,
              'summary': {'no_suspected_wrong_frame': not suspicious, 'suspected_or_poor_match_frames': suspicious,
                          'ambiguous_frames': ambiguous, 'all_samples_distinguishable': not ambiguous,
                          'consistent_samples': sum(r['status'] == 'consistent_with_expected' for r in results)},
              'scope': 'Only the 12 encoded frames immediately adjoining six authorized splices are compared. OpenCV source read positions and manifest media hashes are checked. Expected source frames and available +/-1 neighbors use the original origin interval. PSNR/error thresholds are diagnostics for additional lossy encoding, not proof of pixel identity; ambiguous/static frames do not establish an exact source frame index. No browser, renderer, audio check or whole-film visual acceptance.'}
    json_path = safe_path(out / 'splice-check.json')
    with json_path.open('x', encoding='utf-8') as handle:
        json.dump(output, handle, ensure_ascii=False, indent=2, allow_nan=False)
        handle.write('\n')
    print(json.dumps({'report': str(json_path), **output['summary']}, ensure_ascii=False))
    return 1 if suspicious else 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as error:
        print(f'Splice check could not complete: {error}', file=sys.stderr)
        sys.exit(2)

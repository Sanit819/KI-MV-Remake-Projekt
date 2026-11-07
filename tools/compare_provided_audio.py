"""Read-only comparison of the user's FLAC with the public MV AAC reference.

The only decoded derivatives are temporary 8 kHz mono analysis files under
.cache/audio-comparison/. This does not alter, normalize or replace either input.
"""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import hashlib
import json
import subprocess
import sys
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
BIN = Path(r'D:\myskills\updream\vocaloid-style-mv-pipeline\_tools\ffmpeg\bin')
SR = 8000
HOP = 80


def sha256(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def probe(path):
    r = subprocess.run([str(BIN / 'ffprobe.exe'), '-v', 'error',
                        '-select_streams', 'a:0', '-show_streams', '-show_format',
                        '-of', 'json', str(path)], check=True, capture_output=True)
    d = json.loads(r.stdout)
    s = d['streams'][0]
    return {
        'codec': s['codec_name'], 'sample_rate': int(s['sample_rate']),
        'channels': s['channels'],
        'bits_per_raw_sample': int(s.get('bits_per_raw_sample', 0)) or None,
        'duration_seconds': float(s['duration']),
        'duration_ts': s.get('duration_ts'), 'time_base': s['time_base'],
        'start_time': float(s.get('start_time', 0)),
        'format_duration_seconds': float(d['format']['duration']),
    }


def decode(path, out):
    subprocess.run([str(BIN / 'ffmpeg.exe'), '-v', 'error', '-nostdin', '-y',
                    '-i', str(path), '-map', '0:a:0', '-vn', '-ac', '1',
                    '-ar', str(SR), '-c:a', 'pcm_f32le', '-f', 'f32le', str(out)],
                   check=True, capture_output=True)
    return np.fromfile(out, dtype='<f4').astype(np.float64)


def normalized_match(search, template):
    """Pearson correlation for every valid placement of template in search."""
    m, n = len(template), len(search)
    if m > n:
        raise ValueError('Template is longer than search region')
    t = template - template.mean()
    fftn = 1 << (m + n - 2).bit_length()
    cross = np.fft.irfft(np.fft.rfft(search, fftn) *
                        np.fft.rfft(t[::-1], fftn), fftn)[m - 1:n]
    cs = np.concatenate(([0.0], np.cumsum(search)))
    cs2 = np.concatenate(([0.0], np.cumsum(search * search)))
    sums = cs[m:] - cs[:-m]
    energy = np.maximum(0.0, cs2[m:] - cs2[:-m] - sums * sums / m)
    denom = np.sqrt(np.dot(t, t) * energy)
    return np.divide(cross, denom, out=np.zeros_like(cross), where=denom > 1e-20)


def envelope(x):
    blocks = x[:len(x) // HOP * HOP].reshape(-1, HOP)
    return np.log10(np.sqrt(np.mean(blocks * blocks, axis=1)) + 1e-5)


def compare_window(provided, reference, start, length, coarse_offset, search_radius):
    p0 = round(start * SR)
    template = provided[p0:p0 + round(length * SR)]
    guess = start + coarse_offset
    r0 = max(0, round((guess - search_radius) * SR))
    r1 = min(len(reference), round((guess + length + search_radius) * SR))
    score = normalized_match(reference[r0:r1], template)
    i = int(np.argmax(score))
    ref_start = (r0 + i) / SR
    second = score.copy()
    second[max(0, i - round(.05 * SR)):i + round(.05 * SR) + 1] = -2
    alternative = float(second.max()) if len(second) else None
    aligned = reference[r0 + i:r0 + i + len(template)]
    gain = float(np.dot(aligned, template) / max(np.dot(template, template), 1e-20))
    residual = aligned - gain * template
    return {
        'provided_start_seconds': start, 'window_seconds': length,
        'reference_match_start_seconds': ref_start,
        'reference_minus_provided_analysis_samples': r0 + i - p0,
        'reference_minus_provided_seconds': (r0 + i - p0) / SR,
        'pearson_correlation': float(score[i]),
        'best_alternative_outside_50ms_correlation': alternative,
        'peak_margin_outside_50ms': float(score[i]) - alternative,
        'reference_gain_relative_to_provided': gain,
        'residual_rms_after_scalar_gain': float(np.sqrt(np.mean(residual * residual))),
        'search_reference_start_seconds': r0 / SR,
        'search_reference_end_seconds': r1 / SR,
        'best_at_search_boundary': i == 0 or i == len(score) - 1,
    }


def activity(x):
    """Threshold evidence only, not a perceptual/semantic silence judgement."""
    blocks = x[:len(x) // HOP * HOP].reshape(-1, HOP)
    rms = np.sqrt(np.mean(blocks * blocks, axis=1))
    result = {}
    for db in (-80, -60, -40):
        indices = np.flatnonzero(rms > 10 ** (db / 20))
        result[str(db)] = None if not len(indices) else {
            'first_window_start_seconds': int(indices[0]) * HOP / SR,
            'last_window_end_seconds': (int(indices[-1]) + 1) * HOP / SR,
        }
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--provided', type=Path,
                    default=Path(r'C:\Users\auscar\Desktop\07 太陽系デスコ.flac'))
    ap.add_argument('--reference', type=Path, default=ROOT / 'source/audio.m4a')
    args = ap.parse_args()
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='replace')
    cache = ROOT / '.cache/audio-comparison'
    cache.mkdir(parents=True, exist_ok=True)
    before = {name: sha256(path) for name, path in
              [('provided', args.provided), ('reference', args.reference)]}
    info_p, info_r = probe(args.provided), probe(args.reference)
    p = decode(args.provided, cache / 'provided-8k-mono.f32')
    r = decode(args.reference, cache / 'reference-8k-mono.f32')
    # The interior 170-second template avoids boundaries; +/-10 seconds coarse search.
    pe, re = envelope(p), envelope(r)
    ps, duration, radius = 15.0, 170.0, 10.0
    score = normalized_match(re[round((ps-radius)*100):round((ps+duration+radius)*100)],
                             pe[round(ps*100):round((ps+duration)*100)])
    coarse_offset = int(np.argmax(score)) / 100 - radius
    # Validate sign convention and valid-correlation indexing with a synthetic signal.
    synthetic = np.random.default_rng(1).normal(size=50)
    check = normalized_match(np.concatenate((np.zeros(17), synthetic, np.zeros(25))), synthetic)
    assert int(np.argmax(check)) == 17
    starts = [2, 10, 25, 40, 55, 70, 85, 100, 115, 130, 145, 160, 175, 190]
    windows = [compare_window(p, r, s, 10.0, coarse_offset, 2.0) for s in starts]
    offsets = np.array([x['reference_minus_provided_seconds'] for x in windows])
    corrs = np.array([x['pearson_correlation'] for x in windows])
    slope, intercept = np.polyfit(np.array(starts) + 5, offsets, 1)
    if np.ptp(offsets) == 0:
        slope, intercept = 0.0, float(offsets[0])
    median = float(np.median(offsets))
    # Full interior verification at the median lag. Correlation is never bit identity.
    sample_offset = round(median * SR)
    pbegin = max(0, -sample_offset)
    pend = min(len(p), len(r) - sample_offset)
    pa, ra = p[pbegin:pend], r[pbegin + sample_offset:pend + sample_offset]
    full_correlation = float(np.corrcoef(pa, ra)[0, 1])
    tail_start = len(p) + sample_offset
    extra_tail = r[tail_start:] if 0 <= tail_start < len(r) else np.array([])
    extra_rms = float(np.sqrt(np.mean(extra_tail * extra_tail))) if len(extra_tail) else None
    tail_evidence = {
        'aligned_provided_end_in_reference_seconds': tail_start / SR,
        'reference_decoded_end_seconds': len(r) / SR,
        'extra_reference_tail_samples_at_8khz': len(extra_tail),
        'extra_reference_tail_seconds': len(extra_tail) / SR,
        'extra_reference_tail_rms_dbfs': float(20*np.log10(extra_rms)) if extra_rms else None,
        'extra_reference_tail_max_absolute_sample': float(np.max(np.abs(extra_tail))) if len(extra_tail) else None,
        'interpretation_limit': 'Very low-level trailing samples support near-silence/padding-like tail, not exact zero or a proven encoder cause.'
    }
    after = {name: sha256(path) for name, path in
             [('provided', args.provided), ('reference', args.reference)]}
    if before != after:
        raise RuntimeError('An input changed during read-only comparison')
    result = {
        'generated_utc': datetime.now(timezone.utc).isoformat(),
        'provided': dict(path=str(args.provided), sha256=before['provided'], **info_p,
                         analysis_decoded_samples=len(p),
                         analysis_decoded_duration_seconds=len(p)/SR),
        'reference': dict(path=str(args.reference), sha256=before['reference'], **info_r,
                          analysis_decoded_samples=len(r),
                          analysis_decoded_duration_seconds=len(r)/SR),
        'input_hashes_unchanged': before == after,
        'mapping_direction': 'reference_audio_time = provided_FLAC_time + offset_seconds',
        'method': {
            'analysis_sample_rate': SR, 'channels': 1, 'format': 'float32LE analysis copies; calculations float64',
            'coarse': '10ms log RMS envelope, provided [15,185)s, reference search +/-10s, normalized Pearson correlation',
            'coarse_offset_seconds': coarse_offset,
            'coarse_correlation': float(np.max(score)),
            'fine': '14 distributed 10-second waveform windows; normalized Pearson cross-correlation; +/-2 seconds around coarse estimate',
            'offset_grid_seconds': 1/SR,
            'confidence_note': 'Numerical grid is not a guarantee of perceptual sync or word timing; AAC coding and resampling may affect fine estimates.'
        },
        'windows': windows,
        'summary': {
            'median_offset_seconds': median,
            'median_offset_analysis_samples_at_8khz': sample_offset,
            'min_offset_seconds': float(offsets.min()),
            'max_offset_seconds': float(offsets.max()),
            'range_offset_seconds': float(np.ptp(offsets)),
            'min_window_correlation': float(corrs.min()),
            'max_window_correlation': float(corrs.max()),
            'full_overlap_waveform_correlation_at_median_lag': full_correlation,
            'linear_drift_seconds_per_second': float(slope),
            'linear_drift_ppm': float(slope * 1e6),
            'fit_intercept_seconds': float(intercept),
            'any_search_boundary_peak': any(x['best_at_search_boundary'] for x in windows),
            'reference_minus_provided_container_duration_seconds': info_r['duration_seconds'] - info_p['duration_seconds'],
            'reference_minus_provided_decoded_duration_seconds': (len(r)-len(p))/SR,
        },
        'activity_10ms_rms_thresholds_dbfs': {'provided': activity(p), 'reference': activity(r)},
        'reference_tail_beyond_aligned_provided_end': tail_evidence,
        'scope': {
            'listened': False, 'lossless_identity_proven': False,
            'lyric_boundaries_generated': False,
            'limits': ['14 local windows do not prove every short edit is absent.',
                       'Whole-overlap correlation supports overall similarity but is not source provenance or mastering identity.',
                       'Container/AAC tail duration differences must not automatically be treated as musical content edits.',
                       'No input file was rewritten; no original sample rate/bit depth was changed.'],
        },
    }
    (ROOT / 'analysis/audio-reference-comparison.json').write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'summary': result['summary'], 'windows': windows,
                      'activity': result['activity_10ms_rms_thresholds_dbfs']}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

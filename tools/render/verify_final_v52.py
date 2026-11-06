"""Independent technical verification of the complete v5.2 4K60 delivery.

The changed body is compared with its v5.2 render parts, never with old artwork.
The warning and entire ALAC/PCM soundtrack are compared with protected v5.1.
This is complete media/packet verification, not continuous human visual review.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from fractions import Fraction
from pathlib import Path

import prepend_warning_v3_hires_verify as native
from verify_full_mv import verify
from verify_sample import run_ffmpeg, sha256

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_WORK = ROOT / 'exports/final-v5.2'
DEFAULT_OUTPUT = ROOT / 'exports/astra-world-execute-me-final-v5.2-lighting-artwork-hires-4k60.mp4'
ORIGINAL = ROOT / 'exports/astra-world-execute-me-final-v5.1-cat-warning-hires-4k60.mp4'
ORIGINAL_SHA256 = '19f4a76abfc61c1990d056d018e164ec61e93d147af1436f244cfa57261b7407'
FF = ROOT / '.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'
FPS, PREFIX, BODY_FRAMES, TOTAL_FRAMES = 60, 300, 13100, 13400


def resolve(value):
    p = Path(value)
    return p if p.is_absolute() else ROOT / p


def save(work, name, data):
    work.mkdir(parents=True, exist_ok=True)
    (work / name).write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')


def read_json(path):
    return path.read_text(encoding='utf-8-sig')


def hashes_match(a, b):
    return len(a) == len(b) and all((x['size'], x['sha256']) == (y['size'], y['sha256']) for x, y in zip(a, b))


def framehash(work, video, label, *, stream='v', decoded=False, frames=None):
    """Read exact rational times and one SHA256 for every packet or decoded frame."""
    target = work / (label + '.framehash')
    args = ['-loglevel', 'error', '-i', str(video), '-map', f'0:{stream}:0']
    if stream == 'v':
        args += ['-an', '-fps_mode', 'passthrough']
        args += ['-c:v', 'rawvideo', '-pix_fmt', 'yuv420p'] if decoded else ['-c:v', 'copy']
        if frames is not None:
            args += ['-frames:v', str(frames)]
    else:
        args += ['-vn', '-c:a', 'copy']
    args += ['-f', 'framehash', '-hash', 'sha256', '-']
    result = run_ffmpeg(FF, args)
    errors = result.stderr.decode('utf-8', errors='replace').strip()
    if result.returncode or errors:
        raise RuntimeError(f'{label}: FFmpeg {result.returncode}: {errors}')
    text = result.stdout.decode('utf-8')
    target.write_text(text, encoding='utf-8')
    match = re.search(r'#tb 0:\s*(\d+)/(\d+)', text)
    if not match:
        raise RuntimeError(f'{label}: missing timebase')
    tb = Fraction(int(match[1]), int(match[2]))
    rows = []
    for line in text.splitlines():
        if not line or line.startswith('#'):
            continue
        fields = [s.strip() for s in line.split(',')]
        rows.append(dict(dts=int(fields[1]), pts=int(fields[2]), duration=int(fields[3]), size=int(fields[4]), sha256=fields[5]))
    if not rows:
        raise RuntimeError(f'{label}: no packets or frames')
    return rows, tb


def timing_identical(a, atb, b, btb, shift=Fraction(0)):
    return len(a) == len(b) and all(
        Fraction(y[k]) * btb - Fraction(x[k]) * atb == (0 if k == 'duration' else shift)
        for x, y in zip(a, b) for k in ('pts', 'dts', 'duration')
    )


def check_inventory(items):
    result = []
    for item in items:
        p = resolve(item['path'])
        expected = item.get('sha256', item.get('expected_sha256'))
        actual = sha256(p) if p.is_file() else None
        result.append({'path': str(p), 'expected_sha256': expected, 'actual_sha256': actual,
                       'unchanged': bool(expected) and actual == expected})
    return {'passed': bool(result) and all(x['unchanged'] for x in result), 'items': result}


def protected_inventory(render, override=None):
    declaration = override or render.get('protected_baseline')
    if not declaration:
        return {'passed': False, 'error': 'No protected baseline declared', 'items': []}
    if isinstance(declaration, list):
        return check_inventory(declaration)
    expected = None
    if isinstance(declaration, dict):
        if 'items' in declaration:
            return check_inventory(declaration['items'])
        expected = declaration.get('sha256')
        declaration = declaration.get('path', declaration.get('file'))
    p = resolve(declaration)
    data = json.loads(read_json(p))
    items = data if isinstance(data, list) else data.get('items', data.get('files', data.get('protected_files', data.get('input_hashes', []))))
    result = check_inventory(items)
    result.update({'baseline_path': str(p), 'baseline_sha256': sha256(p), 'baseline_expected_sha256': expected})
    if expected is not None:
        result['baseline_file_unchanged'] = result['baseline_sha256'] == expected
        result['passed'] &= result['baseline_file_unchanged']
    return result


def preflight(opts):
    render = json.loads(read_json(opts.render)) if opts.render.is_file() else {}
    original = resolve(render.get('original', str(ORIGINAL)))
    cfg = native.alac_config(original)
    actual = sha256(original)
    checks = {'v51_protected_path': original.resolve() == ORIGINAL.resolve(),
              'v51_protected_hash': actual == ORIGINAL_SHA256,
              'original_ALAC_192k_24bit_stereo': cfg['sample_rate'] == 192000 and cfg['bit_depth'] == 24 and cfg['channels'] == 2,
              'ffmpeg_exists': FF.is_file()}
    report = {'passed': all(checks.values()), 'checks': checks, 'original': str(original),
              'original_bytes': original.stat().st_size, 'original_sha256': actual, 'alac_config': cfg,
              'scope': 'Read-only source identity and ALAC cookie inspection; no final-video acceptance or decoding.'}
    if render.get('input_hashes'):
        report['input_inventory'] = check_inventory(render['input_hashes'])
        checks['declared_inputs_unchanged'] = report['input_inventory']['passed']
    if opts.protected_baseline or render.get('protected_baseline'):
        report['protected_inventory'] = protected_inventory(render, opts.protected_baseline)
        checks['protected_baseline_unchanged'] = report['protected_inventory']['passed']
    report['passed'] = all(checks.values())
    save(opts.work, 'verification-preflight.json', report)
    print(json.dumps(report, ensure_ascii=False), flush=True)
    return report['passed']


def main_verify(opts):
    render = json.loads(read_json(opts.render))
    out = resolve(render['output'])
    old = resolve(render.get('original', render.get('prefix_source', str(ORIGINAL))))
    if out.resolve() == old.resolve() or out.resolve() != DEFAULT_OUTPUT.resolve():
        raise RuntimeError('Unexpected output path, or output would be the protected original')
    if old.resolve() != ORIGINAL.resolve() or sha256(old) != ORIGINAL_SHA256:
        raise RuntimeError('Protected v5.1 path/hash does not match the independently fixed baseline')
    if render.get('original_sha256', render.get('prefix_source_sha256')) != ORIGINAL_SHA256:
        raise RuntimeError('Render did not declare the correct v5.1 source hash')
    native.WORK = opts.work
    native.FF = FF
    report = {'passed': False, 'phase': 'full-decode', 'scope': 'Complete technical media verification; no claim of continuous human viewing or listening.'}
    save(opts.work, 'verification.json', report)

    print('[v5.2 verify] Complete 13400-frame video decode and distributed audio alignment', flush=True)
    options = argparse.Namespace(video=out, audio=old, width=3840, height=2160, fps=FPS,
                                 frames=TOTAL_FRAMES, source_start=0., windows=[6.,36.,65.,95.,125.,155.,185.,205.],
                                 window_length=2.5, min_correlation=.999999, audio_rate=24000, ffmpeg=FF)
    full = verify(options)
    save(opts.work, 'full-verify.json', full)

    print('[v5.2 verify] All video packets, exact timestamps, part payloads and joins', flush=True)
    final, tb = framehash(opts.work, out, 'final-video-packets')
    original, oldtb = framehash(opts.work, old, 'v51-video-packets')
    pts = sorted(Fraction(p['pts']) * tb for p in final)
    pc = {'count_13400': len(final) == TOTAL_FRAMES,
          'all_pts_exact_n_over_60': len(pts) == TOTAL_FRAMES and all(t == Fraction(n, FPS) for n, t in enumerate(pts)),
          'all_packet_durations_1_over_60': all(Fraction(p['duration']) * tb == Fraction(1, FPS) for p in final),
          'strict_decode_timestamps': all(b['dts'] > a['dts'] for a,b in zip(final, final[1:])),
          'warning_300_packet_payloads_identical': hashes_match(original[:PREFIX], final[:PREFIX]),
          'warning_300_packet_times_identical': timing_identical(original[:PREFIX], oldtb, final[:PREFIX], tb)}
    parts = sorted(render.get('parts', []), key=lambda p: p['first'])
    pc['parts_cover_13100_body_frames_once'] = bool(parts) and parts[0]['first'] == 0 and parts[-1]['last'] == BODY_FRAMES and all(
        p['last'] > p['first'] for p in parts) and all(a['last'] == b['first'] for a,b in zip(parts, parts[1:]))
    part_details = []
    for part in parts:
        pp, ptb = framehash(opts.work, resolve(part['file']), f"part-{part['index']}-packets")
        begin = PREFIX + part['first']; end = PREFIX + part['last']
        selected = final[begin:end]
        checks = {'frame_count': len(pp) == part['last'] - part['first'],
                  'all_payloads_equal_final_interval': hashes_match(pp, selected),
                  'every_PTS_DTS_shift_exact': timing_identical(pp, ptb, selected, tb, Fraction(begin, FPS)),
                  'part_file_hash_matches_render': sha256(resolve(part['file'])) == part.get('sha256')}
        pc[f"part_{part['index']}"] = all(checks.values())
        part_details.append({'index': part['index'], 'full_frame_interval': [begin,end], 'checks': checks, 'timebase': str(ptb)})
    if render.get('body'):
        body = resolve(render['body']); bp, btb = framehash(opts.work, body, 'body-video-packets')
        pc['body_count_13100_and_payloads_preserved'] = len(bp) == BODY_FRAMES and hashes_match(bp, final[PREFIX:])
        pc['body_shift_exact_five_seconds'] = timing_identical(bp, btb, final[PREFIX:], tb, Fraction(5))
        pc['body_file_hash_matches_render'] = sha256(body) == render.get('body_sha256')
    presentation_order = sorted(final, key=lambda x: x['pts'])
    joins = []
    for at in [PREFIX] + [PREFIX + p['first'] for p in parts[1:]]:
        samples = [{'frame': n, 'pts': str(Fraction(presentation_order[n]['pts']) * tb),
                    'duration': str(Fraction(presentation_order[n]['duration']) * tb)}
                   for n in range(max(0,at-2), min(TOTAL_FRAMES,at+3))]
        passed = all(Fraction(x['pts']) == Fraction(x['frame'],FPS) and Fraction(x['duration']) == Fraction(1,FPS) for x in samples)
        joins.append({'full_frame': at, 'full_seconds': at/FPS, 'samples': samples, 'passed': passed})
    pc['all_join_timestamps_contiguous'] = bool(joins) and all(j['passed'] for j in joins)
    save(opts.work, 'packets.json', {'passed': all(pc.values()), 'checks': pc, 'timebase': str(tb),
                                    'parts': part_details, 'joins': joins,
                                    'scope': 'All compressed video packets, counts, payloads, exact PTS/DTS shifts and durations. Changed body is compared only with its new render parts.'})

    print('[v5.2 verify] Independently decoding all 300 warning frames in original and final', flush=True)
    wp, wtb = framehash(opts.work, old, 'v51-warning-decoded', decoded=True, frames=PREFIX)
    wf, wftb = framehash(opts.work, out, 'v52-warning-decoded', decoded=True, frames=PREFIX)
    warning = {'passed': len(wp) == PREFIX and hashes_match(wp,wf) and timing_identical(wp,wtb,wf,wftb),
               'count': len(wf), 'scope': 'Every warning frame decoded to native 3840x2160 yuv420p and SHA256 compared, including frame times.'}
    save(opts.work, 'warning-decoded-verification.json', warning)

    print('[v5.2 verify] Every ALAC packet and native 192kHz/24-bit PCM sample', flush=True)
    ap_old, atb_old = framehash(opts.work, old, 'v51-alac-packets', stream='a')
    ap_new, atb_new = framehash(opts.work, out, 'v52-alac-packets', stream='a')
    audio_packets = {'passed': hashes_match(ap_old,ap_new) and timing_identical(ap_old,atb_old,ap_new,atb_new),
                     'packet_count_original': len(ap_old), 'packet_count_final': len(ap_new),
                     'all_packet_sizes_payloads_identical': hashes_match(ap_old,ap_new),
                     'all_packet_pts_dts_durations_identical': timing_identical(ap_old,atb_old,ap_new,atb_new),
                     'original_timebase': str(atb_old), 'final_timebase': str(atb_new)}
    save(opts.work, 'audio-packets.json', audio_packets)
    oldpcm = native.pcm_digest(old, 'v51-native-pcm')
    newpcm = native.pcm_digest(out, 'v52-native-pcm')
    cfg_old, cfg = native.alac_config(old), native.alac_config(out)
    inputs = check_inventory(render.get('input_hashes', []))
    protected = protected_inventory(render, opts.protected_baseline)
    output_hash = sha256(out)
    declared_fingerprint = render.get('fingerprint')
    computed_fingerprint = hashlib.sha256(json.dumps(render.get('input_hashes', []), ensure_ascii=False, separators=(',',':')).encode('utf-8')).hexdigest()
    checks = {
        'full_video_audio_decode_and_alignment': full['passed'],
        'all_video_packets_and_joins': all(pc.values()),
        'all_300_decoded_warning_frames_identical': warning['passed'],
        'all_ALAC_packet_payloads_and_times_identical': audio_packets['passed'],
        'all_native_PCM_bytes_identical': oldpcm['sha256'] == newpcm['sha256'] and oldpcm['decoded_bytes'] == newpcm['decoded_bytes'],
        'native_192000_24bit_stereo': cfg['sample_rate'] == 192000 and cfg['bit_depth'] == 24 and cfg['channels'] == 2,
        'ALAC_codec_config_identical': cfg == cfg_old,
        'native_samples_42880000': newpcm['decoded_samples_per_channel'] == 42880000,
        'first_5_seconds_exact_silence': newpcm['head_exact_zero_0_to_5s'],
        'last_6_seconds_exact_silence': newpcm['tail_exact_zero_last_6s'],
        'all_declared_render_inputs_frozen': inputs['passed'],
        'render_input_fingerprint_matches': bool(declared_fingerprint) and declared_fingerprint == computed_fingerprint,
        'all_protected_baseline_files_unchanged': protected['passed'],
        'protected_v51_hash_unchanged': sha256(old) == ORIGINAL_SHA256,
        'output_hash_matches_render': output_hash == render.get('output_sha256'),
        'reported_video_dimensions_and_counts': (render.get('width'),render.get('height'),render.get('fps'),render.get('frames'),render.get('body_frames'),render.get('warning_frames')) == (3840,2160,60,13400,13100,300),
    }
    report = {'passed': all(checks.values()), 'phase': 'complete', 'checks': checks,
              'output': str(out), 'bytes': out.stat().st_size, 'sha256': output_hash,
              'original': str(old), 'original_sha256': ORIGINAL_SHA256,
              'frames': TOTAL_FRAMES, 'fps': FPS, 'duration_seconds': TOTAL_FRAMES/FPS,
              'native_pcm': newpcm, 'original_native_pcm': oldpcm, 'alac_config': cfg,
              'audio_packets': audio_packets, 'warning_decoded': warning,
              'render_inputs': inputs, 'protected_baseline': protected,
              'fingerprint': {'declared': declared_fingerprint, 'computed': computed_fingerprint},
              'reports': ['full-verify.json','packets.json','warning-decoded-verification.json','audio-packets.json'],
              'scope': 'Complete 13400-frame 4K60 decode; every video and ALAC packet; exact timestamps and joins; 300 unchanged warning frames decoded and compared; every native 192kHz/24bit stereo PCM byte compared with protected v5.1; eight distributed audio alignments; frozen-source and protection hashes. Changed body is compared with new render parts, not v5.1 pictures. Does not claim continuous human viewing/listening, every-frame visual acceptance, vocal/lyric fine timing, or platform Hi-Res certification.'}
    save(opts.work, 'verification.json', report)
    print(json.dumps({'passed': report['passed'], 'checks': checks, 'output': str(out)}, ensure_ascii=False), flush=True)
    return report['passed']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work', type=Path, default=DEFAULT_WORK)
    parser.add_argument('--render', type=Path)
    parser.add_argument('--protected-baseline', help='Repository-relative or absolute protection inventory JSON')
    parser.add_argument('--preflight', action='store_true', help='Read-only v5.1 identity and ALAC config; no long final decode')
    opts = parser.parse_args()
    opts.work = opts.work.resolve(); opts.work.mkdir(parents=True, exist_ok=True)
    opts.render = (opts.render or opts.work/'render.json').resolve()
    try:
        passed = preflight(opts) if opts.preflight else main_verify(opts)
    except (OSError, RuntimeError, KeyError, ValueError, TypeError) as exc:
        name = 'verification-preflight.json' if opts.preflight else 'verification.json'
        save(opts.work, name, {'passed': False, 'phase': 'failed', 'error': str(exc), 'scope': 'Verification failed or was incomplete; no acceptance.'})
        print(json.dumps({'passed': False, 'error': str(exc)}, ensure_ascii=False), flush=True)
        raise SystemExit(1)
    if not passed:
        raise SystemExit(1)


if __name__ == '__main__':
    main()

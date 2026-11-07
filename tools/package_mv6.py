"""Add the original 5-second warning to the newly rendered full V6 body and verify it."""
import argparse
import hashlib
import json
import os
import re
import subprocess
from fractions import Fraction
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'exports/mv6'
FF = Path('D:/myskills/updream/vocaloid-style-mv-pipeline/_tools/ffmpeg/bin/ffmpeg.exe')
FP = FF.with_name('ffprobe.exe')
SOURCE = ROOT.parent / 'KI-MV-Remake-Projekt/exports/astra-world-execute-me-final-v5.2-lighting-artwork-hires-4k60.mp4'
FPS, BODY_FRAMES, WARNING_FRAMES = 60, 13100, 300
FULL_FRAMES = BODY_FRAMES + WARNING_FRAMES


def run(cmd):
    p = subprocess.run([str(x) for x in cmd], capture_output=True)
    if p.returncode:
        raise RuntimeError(p.stderr.decode('utf-8', errors='replace'))
    return p.stdout


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        while b := f.read(1024 * 1024):
            h.update(b)
    return h.hexdigest()


def safe_output(p, allow_base=False):
    p = Path(os.path.abspath(p))
    if not p.is_relative_to(BASE) or (p == BASE and not allow_base):
        raise ValueError('Write only beneath this worktree exports/mv6')
    current = p
    while current != ROOT:
        if os.path.lexists(current) and current.resolve(strict=True) != current:
            raise ValueError(f'Redirected output ancestor: {current}')
        if not current.is_relative_to(ROOT):
            raise ValueError('Output escaped the worktree')
        current = current.parent
    return p


def fresh(p):
    p = safe_output(p)
    if os.path.lexists(p):
        raise FileExistsError(f'Output exists: {p}')
    return p


def probe(p):
    return json.loads(run([FP, '-v', 'error', '-show_streams', '-show_format', '-of', 'json', p]))


def decode_with_pts(p, expected_frames):
    # One decoding pass covers video, audio and integer PTS. Disabling showinfo
    # checksums avoids calculating expensive per-plane hashes for every 4K frame.
    command = [FF, '-hide_banner', '-nostats', '-v', 'info', '-xerror', '-err_detect', 'explode', '-i', p,
               '-map', '0:v:0', '-map', '0:a:0?', '-vf', 'showinfo=checksum=0', '-fps_mode', 'passthrough', '-f', 'null', '-']
    decoded = subprocess.run([str(x) for x in command], capture_output=True)
    log = decoded.stderr.decode('utf-8', errors='replace')
    if decoded.returncode:
        raise RuntimeError(log[-16000:])
    timebase = re.search(r'config in time_base:\s*(\d+)/(\d+)', log)
    rows = re.findall(r'\bn:\s*(\d+)\s+pts:\s*(-?\d+)\s+pts_time:', log)
    if not timebase or len(rows) != expected_frames:
        raise RuntimeError(f'Incomplete decoded frame audit: {len(rows)}/{expected_frames}')
    unit = Fraction(int(timebase[1]), int(timebase[2]))
    numbers = [int(n) for n, _ in rows]
    stamps = np.array([float(int(pts) * unit) for _, pts in rows])
    if numbers != list(range(expected_frames)) or np.max(np.abs(stamps - np.arange(expected_frames) / FPS)) >= .000002:
        raise RuntimeError('Decoded frame indices or presentation timestamps are discontinuous')
    return {'decoded_frames': len(rows), 'filter_time_base': str(unit), 'first_pts_seconds': float(stamps[0]),
            'last_pts_seconds': float(stamps[-1]), 'maximum_pts_error_seconds': float(np.max(np.abs(stamps - np.arange(expected_frames) / FPS))),
            'method': 'Single ffmpeg full video/audio decode with showinfo checksum=0; integer filter PTS checked.'}


def packet_pts(p, expected_frames, stream):
    packets = json.loads(run([FP, '-v', 'error', '-select_streams', 'v:0', '-show_packets', '-show_entries', 'packet=pts', '-of', 'json', p]))['packets']
    unit = Fraction(stream['time_base'])
    stamps = np.array(sorted(float(int(packet['pts']) * unit) for packet in packets))
    if len(stamps) != expected_frames or np.max(np.abs(stamps - np.arange(expected_frames) / FPS)) >= .000002:
        raise RuntimeError('Remuxed video packet PTS are not continuous')
    return {'packet_count': len(stamps), 'maximum_pts_error_seconds': float(np.max(np.abs(stamps - np.arange(expected_frames) / FPS)))}


def video_checks(p, expected_frames, width, height, audio_kind=None, full_decode=True, copy_master=None):
    info = probe(p)
    v = next(s for s in info['streams'] if s['codec_type'] == 'video')
    checks = {'dimensions': (v['width'], v['height']) == (width, height), '60fps': v['r_frame_rate'] == '60/1',
              'frame_count': int(v['nb_frames']) == expected_frames,
              'video_start_zero': abs(float(v.get('start_time', 0))) < .000002,
              'duration': abs(float(info['format']['duration']) - expected_frames / FPS) < .025}
    if audio_kind:
        a = next(s for s in info['streams'] if s['codec_type'] == 'audio')
        rate = 192000 if audio_kind == 'alac' else 48000
        checks.update({'audio_codec': a['codec_name'] == audio_kind, 'audio_sample_rate': int(a['sample_rate']) == rate,
                       'audio_stereo': a['channels'] == 2, 'audio_start_zero': abs(float(a.get('start_time', 0))) < 1 / rate,
                       'audio_duration': abs(float(a['duration']) - FULL_FRAMES / FPS) < .025})
    if not all(checks.values()):
        raise RuntimeError(f'{p}: {checks}')
    evidence = {}
    if full_decode:
        evidence['decode_and_pts'] = decode_with_pts(p, expected_frames)
        checks.update({'full_decode': True, 'continuous_pts': True})
    elif copy_master:
        original_hash, remuxed_hash = packet_hash(copy_master, 'v:0'), packet_hash(p, 'v:0')
        if original_hash != remuxed_hash:
            raise RuntimeError('Stream-copied preview video packets differ from the validated master')
        evidence['video_packet_identity'] = {'master_sha256': original_hash, 'preview_sha256': remuxed_hash, 'equal': True}
        evidence['packet_pts'] = packet_pts(p, expected_frames, v)
        run([FF, '-v', 'error', '-xerror', '-err_detect', 'explode', '-i', p, '-map', '0:a:0', '-f', 'null', '-'])
        checks.update({'video_matches_fully_decoded_master': True, 'continuous_packet_pts': True, 'full_audio_decode': True})
    else:
        evidence['scope'] = 'Metadata only; render hash/capture evidence and the final master complete decode provide the full-video verification.'
    return {'file': str(p), 'sha256': sha(p), 'bytes': p.stat().st_size, 'checks': checks, 'video_frames': int(v['nb_frames']), **evidence}


def packet_hash(p, selector):
    # Hash encoded packets, which must survive stream-copy unchanged.
    text = run([FF, '-v', 'error', '-i', p, '-map', f'0:{selector}', '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-']).decode().strip()
    if not text.startswith('SHA256='):
        raise RuntimeError(f'Unexpected audio hash output: {text}')
    return text.split('=', 1)[1]


def aac_alignment(p):
    results = []
    for start in [15, 100, 210]:
        ref_filter = f'atrim=start_sample={start*192000}:end_sample={(start+1)*192000},asetpts=PTS-STARTPTS,aresample=48000'
        out_filter = f'atrim=start_sample={start*48000}:end_sample={(start+1)*48000},asetpts=PTS-STARTPTS'
        def pcm(source, graph):
            return np.frombuffer(run([FF, '-v', 'error', '-i', source, '-map', '0:a:0', '-af', graph, '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', '2', '-']), dtype='<f4').reshape(-1, 2).astype(np.float64)
        ref, actual = pcm(SOURCE, ref_filter), pcm(p, out_filter)
        if ref.shape != (48000, 2) or actual.shape != ref.shape:
            raise RuntimeError('Unexpected AAC alignment window length')
        energy = float(np.sum(ref * ref))
        correlation = float(np.sum(ref * actual) / np.sqrt(energy * np.sum(actual * actual)))
        snr = float(10 * np.log10(energy / max(float(np.sum((actual - ref) ** 2)), 1e-30)))
        n = 1 << (2 * len(ref) - 1).bit_length()
        cross = np.fft.irfft(np.fft.rfft(actual.mean(axis=1), n) * np.conj(np.fft.rfft(ref.mean(axis=1), n)), n)
        lags = np.arange(-1024, 1025)
        lag = int(lags[np.argmax(cross[lags % n])])
        passed = correlation > .97 and snr > 20 and abs(lag) <= 1
        results.append({'full_start_seconds': start, 'duration_seconds': 1, 'correlation': correlation, 'snr_db': snr, 'best_lag_samples_48k': lag, 'passed': passed})
        if not passed:
            raise RuntimeError(f'AAC source alignment mismatch: {results[-1]}')
    return {'windows': results, 'scope': 'Three decoded music windows compared to the original source; no direct listening claim. Full output decoding is checked separately.'}


def contacts(master, folder, shots):
    font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 17)
    cap = cv2.VideoCapture(str(master))
    saved, records = set(), []
    overview = list(range(0, FULL_FRAMES, FPS))
    shot_frames = sorted(set(WARNING_FRAMES + (s['firstFrame'] + s['endFrame'] - 1) // 2 for s in shots))
    groups = [('overview', overview), ('shot-midpoints', shot_frames), ('intro-boundary', [298, 299, 300, 301])]
    try:
        for kind, frames in groups:
            for page, begin in enumerate(range(0, len(frames), 32), 1):
                selected = frames[begin:begin + 32]
                sheet = Image.new('RGB', (1920, 298 * ((len(selected) + 3) // 4)), '#0a0812')
                for i, frame in enumerate(selected):
                    if not 0 <= frame < FULL_FRAMES:
                        raise ValueError(f'QA frame outside the final movie: {frame}')
                    cap.set(cv2.CAP_PROP_POS_FRAMES, frame)
                    ok, bgr = cap.read()
                    if not ok:
                        raise RuntimeError(f'Cannot decode QA frame {frame}')
                    rgb = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
                    image_path = folder / f'frame-{frame:05d}.jpg'
                    if frame not in saved:
                        rgb.save(fresh(image_path), quality=94)
                        saved.add(frame)
                    tile = Image.new('RGB', (480, 298), '#0a0812')
                    tile.paste(rgb.resize((480, 270)), (0, 0))
                    ImageDraw.Draw(tile).text((10, 275), f'full {frame/FPS:08.3f}s / f{frame:05d}', font=font, fill='#e9c57a')
                    sheet.paste(tile, ((i % 4) * 480, (i // 4) * 298))
                    records.append({'group': kind, 'frame': frame, 'full_seconds': frame / FPS, 'body_seconds': frame / FPS - 5, 'image': str(image_path)})
                sheet.save(fresh(folder / f'{kind}-{page:02d}.jpg'), quality=94)
    finally:
        cap.release()
    return records


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dir', default='exports/mv6')
    parser.add_argument('--body', default='exports/mv6/body.mp4')
    parser.add_argument('--no-aac-preview', action='store_true')
    args = parser.parse_args()
    out = safe_output(ROOT / args.dir, allow_base=True)
    body = safe_output(ROOT / args.body)
    if body.suffix.lower() != '.mp4' or not body.is_file():
        raise ValueError('Body must be an existing .mp4 beneath exports/mv6')
    if SOURCE.resolve(strict=True) != SOURCE:
        raise ValueError('Original source path is redirected')
    render_path = safe_output(body.with_suffix('.render.json'))
    render = json.loads(render_path.read_text(encoding='utf-8'))
    if render['interval'] != [0, BODY_FRAMES] or render['frames'] != BODY_FRAMES or render['sha256'] != sha(body) or render['auditedFrames'] != BODY_FRAMES:
        raise ValueError('Body must have matching complete V6 render/audit evidence')
    width, height = render['width'], render['height']
    if (width, height) not in [(1920, 1080), (3840, 2160)]:
        raise ValueError('Full deliverables must be 1080p or 4K')
    label = '4k60' if height == 2160 else '1080p60'
    warning = fresh(out / f'warning-{label}.mp4')
    picture = fresh(out / f'picture-{label}.mp4')
    master = fresh(out / f'astra-world-execute-me-v6-{label}-hires.mp4')
    preview = fresh(out / 'astra-world-execute-me-v6-1080p60-preview-aac.mp4') if not args.no_aac_preview else None
    report_path = fresh(out / f'validation-{label}.json')
    concat_file = fresh(out / f'concat-{label}.txt')
    qa = safe_output(out / f'qa-{label}')
    if qa.exists():
        raise FileExistsError('QA directory already exists; choose a new output directory')
    source_info = probe(SOURCE)
    audio = next(s for s in source_info['streams'] if s['codec_type'] == 'audio')
    if audio['codec_name'] != 'alac' or int(audio['sample_rate']) != 192000 or audio['channels'] != 2 or float(audio.get('start_time', 0)) != 0 or abs(float(audio['duration']) - FULL_FRAMES / FPS) > 1 / 192000:
        raise ValueError('Expected complete, zero-start original 192 kHz stereo ALAC track')
    body_validation = video_checks(body, BODY_FRAMES, width, height, full_decode=False)
    out.mkdir(parents=True, exist_ok=True)
    warning_command = [FF, '-v', 'error', '-n', '-i', SOURCE, '-map', '0:v:0', '-an', '-frames:v', WARNING_FRAMES,
                       '-vf', f'trim=start_frame=0:end_frame=300,setpts=PTS-STARTPTS,scale={width}:{height}:flags=lanczos:out_color_matrix=bt709:out_range=limited,format=yuv420p',
                       '-c:v', 'h264_nvenc', '-preset', 'p6', '-tune', 'hq', '-rc', 'vbr', '-cq', '18', '-b:v', '0', '-profile:v', 'high', '-bf', '2',
                       '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-video_track_timescale', '60000', '-movflags', '+faststart', warning]
    run(warning_command)
    warning_validation = video_checks(warning, WARNING_FRAMES, width, height, full_decode=False)
    def ffconcat_path(p):
        return p.as_posix().replace("'", "'\\''")
    concat_file.write_text("file '" + ffconcat_path(warning) + "'\nfile '" + ffconcat_path(body) + "'\n", encoding='utf-8')
    run([FF, '-v', 'error', '-n', '-f', 'concat', '-safe', '0', '-i', concat_file, '-map', '0:v:0', '-c:v', 'copy', '-an', '-video_track_timescale', '60000', '-movflags', '+faststart', picture])
    run([FF, '-v', 'error', '-n', '-i', picture, '-i', SOURCE, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'copy', '-movflags', '+faststart', master])
    master_validation = video_checks(master, FULL_FRAMES, width, height, 'alac')
    original_audio_hash, output_audio_hash = packet_hash(SOURCE, 'a:0'), packet_hash(master, 'a:0')
    if original_audio_hash != output_audio_hash:
        raise RuntimeError('Copied ALAC packet hash differs from the original complete audio track')
    files = [master_validation]
    if preview:
        video_options = ['-c:v', 'copy'] if height == 1080 else ['-vf', 'scale=1920:1080:flags=lanczos:out_color_matrix=bt709:out_range=limited,format=yuv420p',
                         '-c:v', 'h264_nvenc', '-preset', 'p6', '-tune', 'hq', '-rc', 'vbr', '-cq', '18', '-b:v', '0', '-profile:v', 'high', '-bf', '2',
                         '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']
        run([FF, '-v', 'error', '-n', '-i', master, '-map', '0:v:0', '-map', '0:a:0', *video_options, '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-ac', '2', '-video_track_timescale', '60000', '-movflags', '+faststart', preview])
        preview_validation = video_checks(preview, FULL_FRAMES, 1920, 1080, 'aac', full_decode=height != 1080, copy_master=master if height == 1080 else None)
        preview_validation['audio_waveform_alignment'] = aac_alignment(preview)
        files.append(preview_validation)
    qa.mkdir()
    qa_source = preview or master
    samples = contacts(qa_source, qa, render.get('summary', {}).get('shots', []))
    report = {'passed': True, 'files': files, 'body_validation': body_validation, 'warning_validation': warning_validation,
              'original_source': str(SOURCE), 'original_source_sha256': sha(SOURCE),
              'source_video_reuse': {'only_full_frame_interval': [0, WARNING_FRAMES], 'purpose': 'Retain the original 5-second warning; all following frames come from the newly rendered V6 body.'},
              'audio': {'kind': 'Original complete ALAC stream-copy, including the warning interval.', 'sample_rate': 192000, 'duration_samples': 42880000,
                        'original_encoded_packet_sha256': original_audio_hash, 'output_encoded_packet_sha256': output_audio_hash, 'exact_packet_match': True,
                        'body_source_sample_interval': [960000, 42880000]},
              'render_report': str(render_path), 'render_fingerprint': render['fingerprint'], 'audited_body_frames': render['auditedFrames'],
              'shot_beat_semantic_summary': render.get('summary'), 'source_artwork_resolution': render.get('sourceArtworkResolution'),
              'resolution_limit': render.get('resolutionLimit'), 'warning_render_command': [str(x) for x in warning_command], 'qa_source': str(qa_source), 'qa_samples': samples,
              'scope': 'Final ALAC master decoded once with all 13400 frame PTS; original ALAC packet identity checked. A newly downscaled 1080p preview is decoded once with PTS, while a same-resolution remux is checked by encoded video packet identity/PTS plus full audio decoding. Every new body frame has capture audit evidence. Contact sheets use the named QA source and still require visual review; continuous playback, direct listening and user acceptance are not asserted.'}
    with fresh(report_path).open('x', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(json.dumps({'passed': True, 'files': [f['file'] for f in files], 'report': str(report_path)}, ensure_ascii=False))


if __name__ == '__main__':
    main()

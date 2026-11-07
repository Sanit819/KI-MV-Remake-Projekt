"""Mux the 10-second containment study with source ALAC and audit the encoded result."""
import argparse
import hashlib
import json
import os
import subprocess
from fractions import Fraction
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'exports/vfx-lab-v2'
FF = Path('D:/myskills/updream/vocaloid-style-mv-pipeline/_tools/ffmpeg/bin/ffmpeg.exe')
FP = FF.with_name('ffprobe.exe')
SOURCE = ROOT.parent / 'KI-MV-Remake-Projekt/exports/astra-world-execute-me-final-v5.2-lighting-artwork-hires-4k60.mp4'
SOURCE_START = Fraction(1921, 12)  # 160.083333333... full-video seconds.
SECONDS, FPS, SOURCE_RATE = 10, 60, 192000
CUE_FRAMES = [224, 249, 269, 305, 332, 357]
MASTER_NAME = 'astra-vfx-v2-six-ai-containment-1080p60.mp4'


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
        raise ValueError('Write only beneath this worktree exports/vfx-lab-v2')
    current = p
    while current != ROOT:
        # lexists also detects a broken symlink; resolve(strict=True) then rejects it.
        if os.path.lexists(current) and current.resolve(strict=True) != current:
            raise ValueError(f'Redirected output ancestor: {current}')
        if not current.is_relative_to(ROOT):
            raise ValueError('Output escaped the worktree')
        current = current.parent
    return p


def fresh_file(p):
    p = safe_output(p)
    if os.path.lexists(p):
        raise FileExistsError(f'Output exists; choose a new directory: {p}')
    return p


def probe(p):
    return json.loads(run([FP, '-v', 'error', '-show_streams', '-show_format', '-of', 'json', p]))


def audio_source():
    if SOURCE.resolve(strict=True) != SOURCE:
        raise ValueError('Source movie path is redirected')
    info = probe(SOURCE)
    audio = next(s for s in info['streams'] if s['codec_type'] == 'audio')
    if audio['codec_name'] != 'alac' or int(audio['sample_rate']) != SOURCE_RATE or audio['channels'] != 2:
        raise ValueError('Expected original 192 kHz stereo ALAC source')
    stream_start = Fraction(audio.get('start_time', '0'))
    relative_samples = (SOURCE_START - stream_start) * SOURCE_RATE
    if relative_samples.denominator != 1 or relative_samples < 0:
        raise ValueError('Source start time does not map to the requested integer sample')
    first = int(relative_samples)
    end = first + SECONDS * SOURCE_RATE
    if Fraction(audio['duration']) < (SOURCE_START - stream_start + SECONDS):
        raise ValueError('Source audio is shorter than the requested interval')
    graph = f'atrim=start_sample={first}:end_sample={end},asetpts=PTS-STARTPTS,aresample=48000'
    return graph, {'file': str(SOURCE), 'sha256': sha(SOURCE), 'codec': audio['codec_name'], 'sample_rate': SOURCE_RATE,
                   'stream_start_time': str(stream_start), 'full_interval': [float(SOURCE_START), float(SOURCE_START + SECONDS)],
                   'body_interval': [float(SOURCE_START - 5), float(SOURCE_START + SECONDS - 5)],
                   'first_decoded_sample': first, 'exclusive_end_decoded_sample': end, 'filter': graph}


def check_audio_match(master, graph):
    reference = np.frombuffer(run([FF, '-v', 'error', '-i', SOURCE, '-map', '0:a:0', '-af', graph, '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', '2', '-']), dtype='<f4').reshape(-1, 2)
    decoded = np.frombuffer(run([FF, '-v', 'error', '-i', master, '-map', '0:a:0', '-f', 'f32le', '-acodec', 'pcm_f32le', '-ar', '48000', '-ac', '2', '-']), dtype='<f4').reshape(-1, 2)
    n = SECONDS * 48000
    if len(reference) != n or not n <= len(decoded) <= n + 1024:
        raise RuntimeError(f'Unexpected PCM sample counts: source={len(reference)}, AAC={len(decoded)}')
    ref = reference.astype(np.float64)
    actual = decoded[:n].astype(np.float64)
    energy = float(np.sum(ref * ref))
    if energy <= 1e-10:
        raise RuntimeError('Reference interval is too quiet for waveform alignment verification')
    correlation = float(np.sum(actual * ref) / np.sqrt(np.sum(actual * actual) * energy))
    snr = float(10 * np.log10(energy / max(float(np.sum((actual - ref) ** 2)), 1e-30)))
    x, y = actual.mean(axis=1), ref.mean(axis=1)
    fft_length = 1 << (2 * n - 1).bit_length()
    cross = np.fft.irfft(np.fft.rfft(x, fft_length) * np.conj(np.fft.rfft(y, fft_length)), fft_length)
    lags = np.arange(-2048, 2049)
    best_lag = int(lags[np.argmax(cross[lags % fft_length])])
    checks = {'zero_lag_waveform_correlation': correlation > .97, 'lossy_audio_snr': snr > 20, 'alignment_within_one_sample': abs(best_lag) <= 1}
    if not all(checks.values()):
        raise RuntimeError(f'AAC/source waveform mismatch: {checks}, correlation={correlation}, SNR={snr}, lag={best_lag}')
    return {'checks': checks, 'source_pcm_samples_48k': len(reference), 'decoded_aac_samples_48k': len(decoded),
            'compared_samples_48k': n, 'zero_lag_correlation': correlation, 'snr_db': snr, 'best_lag_samples_48k': best_lag,
            'scope': 'Decoded AAC corresponds to the exact downsampled source interval; AAC is lossy, not byte-identical PCM. No direct listening claim.'}


def validate(p, graph):
    result = probe(p)
    v = next(s for s in result['streams'] if s['codec_type'] == 'video')
    a = next(s for s in result['streams'] if s['codec_type'] == 'audio')
    frames = json.loads(run([FP, '-v', 'error', '-select_streams', 'v:0', '-show_frames', '-show_entries', 'frame=best_effort_timestamp_time', '-of', 'json', p]))['frames']
    stamps = np.array([float(f['best_effort_timestamp_time']) for f in frames])
    checks = {'1080p': (v['width'], v['height']) == (1920, 1080), '60fps': v['r_frame_rate'] == '60/1',
              '600_frames': len(stamps) == 600,
              'continuous_timestamps': bool(len(stamps) and np.max(np.abs(stamps - np.arange(len(stamps)) / FPS)) < .000002),
              'video_start_zero': abs(float(v.get('start_time', 0))) < .000002,
              'audio_start_zero': abs(float(a.get('start_time', 0))) < 1 / 48000,
              'audio_48k_stereo_aac': a['codec_name'] == 'aac' and a['sample_rate'] == '48000' and a['channels'] == 2,
              'duration_10s': abs(float(result['format']['duration']) - SECONDS) < .025}
    run([FF, '-v', 'error', '-xerror', '-err_detect', 'explode', '-i', p, '-f', 'null', '-'])
    checks['full_decode'] = True
    if not all(checks.values()):
        raise RuntimeError(f'{p}: {checks}')
    return {'file': str(p), 'sha256': sha(p), 'bytes': p.stat().st_size, 'checks': checks, 'audio_match': check_audio_match(p, graph)}


def contact(master, folder):
    cap = cv2.VideoCapture(str(master))
    font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 18)
    counts = [(i, offset, f + offset) for i, f in enumerate(CUE_FRAMES) for offset in [-1, 0, 1]]
    groups = [('overview', [(None, None, f * FPS) for f in range(SECONDS)], 4), ('count-neighbors', counts, 3)]
    records, saved = [], set()
    try:
        for name, samples, columns in groups:
            tiles = []
            for guest, offset, frame in samples:
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame)
                ok, bgr = cap.read()
                if not ok:
                    raise RuntimeError(f'Cannot decode QA frame {frame}')
                rgb = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
                image_path = folder / f'frame-{frame:04d}.jpg'
                if frame not in saved:
                    fresh_file(image_path)
                    rgb.save(image_path, quality=94)
                    saved.add(frame)
                tile = Image.new('RGB', (480, 298), '#0a0812')
                tile.paste(rgb.resize((480, 270)), (0, 0))
                label = f'{frame/FPS:07.4f}s / f{frame:04d}'
                if guest is not None:
                    label += f' guest{guest} {offset:+d}'
                ImageDraw.Draw(tile).text((10, 275), label, font=font, fill='#e9c57a')
                tiles.append(tile)
                records.append({'sheet': name, 'frame': frame, 'time': frame / FPS, 'guest': guest, 'cue_offset_frames': offset, 'image': str(image_path)})
            sheet = Image.new('RGB', (480 * columns, 298 * ((len(tiles) + columns - 1) // columns)), '#0a0812')
            for i, tile in enumerate(tiles):
                sheet.paste(tile, ((i % columns) * 480, (i // columns) * 298))
            sheet_path = fresh_file(folder / f'{name}.jpg')
            sheet.save(sheet_path, quality=94)
    finally:
        cap.release()
    return records


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', default='exports/vfx-lab-v2')
    opts = ap.parse_args()
    out = safe_output(ROOT / opts.dir, allow_base=True)
    silent = safe_output(out / 'silent.mp4')
    if not silent.is_file() or silent.suffix.lower() != '.mp4':
        raise ValueError('Expected local silent.mp4 input')
    master = fresh_file(out / MASTER_NAME)
    report_path = fresh_file(out / 'validation.json')
    qa = safe_output(out / 'qa')
    if qa.exists():
        raise FileExistsError('QA output already exists; choose a fresh v2 subdirectory')
    graph, source_info = audio_source()
    command = [FF, '-v', 'error', '-n', '-i', silent, '-i', SOURCE, '-filter_complex', f'[1:a:0]{graph}[music]',
               '-map', '0:v:0', '-map', '[music]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-ac', '2',
               '-movflags', '+faststart', master]
    run(command)
    result = validate(master, graph)
    safe_output(qa).mkdir()
    samples = contact(master, qa)
    report = {'passed': True, 'file': result, 'audio_source': source_info, 'silent_sha256': sha(silent),
              'audio_encode_command': [str(x) for x in command], 'count_local_frames': CUE_FRAMES,
              'source_start_frame_60fps': 9605, 'replaced_local_frame_interval': [224, 385],
              'qa_samples': samples,
              'scope': '600 output frames and audio fully decoded, PTS checked, exact source audio sample trim and decoded AAC waveform alignment checked. Contact sheets are generated for visual review; continuous playback, direct listening and source DOM seek frame accuracy are not asserted.'}
    fresh_file(report_path)
    with report_path.open('x', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(json.dumps({'passed': True, 'file': str(master), 'report': str(report_path)}, ensure_ascii=False))


if __name__ == '__main__':
    main()

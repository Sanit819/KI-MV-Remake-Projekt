"""Render supplied style art at 4K60 with verified user-FLAC excerpts.

Images are 1672x941 source art, enlarged to 3840x2160 delivery; this is not
native-4K illustration or character animation. No lyric timing is invented.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
FFMPEG = ROOT / '.cache/python-deps/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'
FFPROBE = ROOT / '.cache/ffprobe/ffprobe.exe'
OUT = ROOT / 'exports/style-tests-v1'
W, H, FPS = 3840, 2160, 60
SPECS = [
    ('01-joker', 'tasha-joker-departure', (-0.0020, 0.0010), (0.0020, -0.0010)),
    ('02-memory', 'tewy-red-flower-memory', (0.0020, 0.0010), (-0.0020, -0.0010)),
    ('03-handover', 'moon11-handover', (-0.0010, 0.0010), (0.0010, -0.0010)),
]


def sha(p: Path) -> str:
    h = hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda: f.read(2**20), b''):
            h.update(b)
    return h.hexdigest()


def run(cmd, *, capture=False):
    r = subprocess.run([str(v) for v in cmd], stdout=subprocess.PIPE if capture else subprocess.DEVNULL,
                       stderr=subprocess.PIPE, check=False)
    if r.returncode:
        raise RuntimeError(f'Command failed ({r.returncode}): {cmd}\n{r.stderr.decode(errors="replace")}')
    return r.stdout


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf8')


def rel(path):
    return path.relative_to(ROOT).as_posix()


def probe(path):
    return json.loads(run([FFPROBE, '-v', 'error', '-count_frames', '-show_streams', '-show_format',
                           '-of', 'json', path], capture=True))


def pcm(path):
    return run([FFMPEG, '-v', 'error', '-i', path, '-map', '0:a:0', '-f', 's16le',
                '-c:a', 'pcm_s16le', 'pipe:1'], capture=True)


def video_hash(path):
    # Extract the unmodified H.264 elementary bitstream; muxer timestamps excluded.
    data = run([FFMPEG, '-v', 'error', '-i', path, '-map', '0:v:0', '-c:v', 'copy',
                '-bsf:v', 'h264_mp4toannexb', '-f', 'h264', 'pipe:1'], capture=True)
    return hashlib.sha256(data).hexdigest()


def verify(path, nframes, duration, audio_codec):
    p = probe(path)
    v = next(s for s in p['streams'] if s['codec_type'] == 'video')
    a = next(s for s in p['streams'] if s['codec_type'] == 'audio')
    assert (v['width'], v['height']) == (W, H), v
    assert v['r_frame_rate'] == '60/1' and v['avg_frame_rate'] == '60/1', v
    assert int(v['nb_read_frames']) == nframes, v
    assert a['codec_name'] == audio_codec and int(a['sample_rate']) == 48000 and a['channels'] == 2, a
    assert abs(float(v['start_time'])) < 0.0011 and abs(float(a['start_time'])) < 0.0011, (v, a)
    assert abs(float(v['start_time']) - float(a['start_time'])) < 0.0011, (v, a)
    assert abs(float(p['format']['duration']) - duration) < 0.04, p['format']
    run([FFMPEG, '-v', 'error', '-xerror', '-i', path, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', 'NUL'])
    # Real decoded frame timestamps, not just the nominal codec rate.
    ts = run([FFPROBE, '-v', 'error', '-select_streams', 'v:0', '-show_entries',
              'frame=best_effort_timestamp_time', '-of', 'csv=p=0', path], capture=True).decode()
    times = [float(line.split(',')[0]) for line in ts.splitlines() if line and line.split(',')[0].strip()]
    assert len(times) == nframes
    assert abs(times[0]) < 0.0011, times[0]
    deltas = np.diff(times)
    assert np.all(deltas > 0) and np.max(np.abs(deltas - 1/FPS)) < 0.0011
    return {'file': rel(path), 'bytes': path.stat().st_size, 'sha256': sha(path), 'ffprobe': p,
            'full_decode_exit_code': 0, 'decoded_timestamp_count': len(times),
            'av_start_zero_checked': True,
            'decoded_timestamp_step_min_seconds': float(min(deltas)),
            'decoded_timestamp_step_max_seconds': float(max(deltas)),
            'note': 'MKV uses millisecond timebase, so timestamps alternate 16/17ms for 60fps.' if path.suffix == '.mkv' else ''}


def render(spec, sample, original_pcm, source_sha, image_override=None):
    name, _, pan0, pan1 = spec
    default_image = '01-joker-v2.png' if name == '01-joker' else f'{name}.png'
    imgfile = image_override or ROOT / 'style-tests/v1' / default_image
    image = cv2.imdecode(np.fromfile(imgfile, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(imgfile)
    ih, iw = image.shape[:2]
    n = sample['video_60fps_frames']
    duration = n / FPS
    assert abs(duration - sample['duration_seconds']) < 1e-8
    audio = ROOT / sample['audio_file']
    assert sha(audio) == sample['audio_sha256']
    cut = pcm(audio)
    a, b = sample['start_sample_48khz'], sample['end_sample_48khz_exclusive']
    assert cut == original_pcm[a*4:b*4]
    mp4, mkv = OUT/f'{name}-4k60.mp4', OUT/f'{name}-4k60.mkv'
    cmd = [FFMPEG, '-hide_banner', '-loglevel', 'warning', '-y', '-f', 'rawvideo', '-pixel_format', 'bgr24',
           '-video_size', f'{W}x{H}', '-framerate', str(FPS), '-i', 'pipe:0', '-i', audio,
           '-map', '0:v:0', '-map', '1:a:0', '-frames:v', str(n), '-t', str(duration),
           '-c:v', 'h264_nvenc', '-preset', 'p6', '-tune', 'hq', '-rc', 'vbr', '-cq', '18', '-b:v', '0',
           '-spatial-aq', '1', '-aq-strength', '8', '-rc-lookahead', '32', '-bf', '3',
           '-vf', 'scale=in_range=full:out_range=limited:out_color_matrix=bt709',
           '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709',
           '-colorspace', 'bt709', '-color_range', 'tv', '-c:a', 'aac', '-b:a', '320k',
           '-ar', '48000', '-movflags', '+faststart', '-video_track_timescale', '60000', mp4]
    start = time.monotonic()
    snaps, frame_hashes = [], []
    base = max(W/iw, H/ih)
    min_margin = float('inf')
    with (OUT/f'{name}-encode.log').open('wb') as log:
        proc = subprocess.Popen([str(c) for c in cmd], stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=log)
        try:
            for i in range(n):
                t = i/(n-1)
                z = 1.012 + 0.026*t
                panx = W*(pan0[0]*(1-t)+pan1[0]*t)
                pany = H*(pan0[1]*(1-t)+pan1[1]*t)
                s = base*z
                m = np.array([[s, 0, (W-1)/2-s*(iw-1)/2+panx],
                              [0, s, (H-1)/2-s*(ih-1)/2+pany]], dtype=np.float64)
                inv = cv2.invertAffineTransform(m)
                corners = np.array([[0,0,1],[W-1,0,1],[0,H-1,1],[W-1,H-1,1]]) @ inv.T
                margin = min(corners[:,0].min(), corners[:,1].min(), iw-1-corners[:,0].max(), ih-1-corners[:,1].max())
                assert margin >= 2, (name, i, margin)
                min_margin = min(min_margin, float(margin))
                frame = cv2.warpAffine(image, m, (W,H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT_101)
                frame_hashes.append(hashlib.sha256(memoryview(frame)).hexdigest())
                if i in (0, n//2, n-1):
                    snaps.append((i, cv2.resize(frame, (960,540), interpolation=cv2.INTER_AREA)))
                proc.stdin.write(memoryview(frame))
                if i % 180 == 0:
                    print(f'{name}: frame {i}/{n}', flush=True)
            proc.stdin.close()
            code = proc.wait()
            if code:
                raise RuntimeError(f'Encoder failed: {name}: {code}. See encode log.')
        except BaseException:
            proc.kill()
            proc.wait()
            raise
    assert len(set(frame_hashes)) == n, 'Duplicate source frames'
    remux = [FFMPEG, '-v', 'error', '-y', '-i', mp4, '-i', audio, '-map', '0:v:0', '-map', '1:a:0',
             '-c:v', 'copy', '-c:a', 'copy', '-map_metadata', '-1', mkv]
    run(remux)
    mp4_check, mkv_check = verify(mp4,n,duration,'aac'), verify(mkv,n,duration,'flac')
    vh1, vh2 = video_hash(mp4), video_hash(mkv)
    assert vh1 == vh2
    master_pcm = pcm(mkv)
    assert master_pcm == cut
    sheet = Image.new('RGB',(960,3*576),(20,24,30)); draw = ImageDraw.Draw(sheet)
    for row,(i,fr) in enumerate(snaps):
        sheet.paste(Image.fromarray(cv2.cvtColor(fr,cv2.COLOR_BGR2RGB)),(0,row*576))
        draw.text((12,row*576+548),f'{name} | frame {i} | {i/FPS:.3f}s | 4K output from {iw}x{ih} source',fill='white')
    sheetfile = OUT/f'{name}-contact-sheet.jpg'
    sheet.save(sheetfile,quality=92)
    result = {'id':name,'created_utc':datetime.now(timezone.utc).isoformat(),
              'source_image':rel(imgfile),'source_image_sha256':sha(imgfile),'source_image_dimensions':[iw,ih],
              'native_4k_artwork':False,'output_dimensions':[W,H],'fps':FPS,'frames':n,'duration_seconds':duration,
              'original_audio_sha256':source_sha,'audio_selection':sample,
              'camera':{'method':'independently evaluated cv2 affine transform per output frame',
                        'interpolation':'bicubic','zoom_start':1.012,'zoom_end':1.038,
                        'relative_zoom_change_percent':(1.038/1.012-1)*100,
                        'pan_start_normalized':pan0,'pan_end_normalized':pan1,
                        'minimum_source_border_margin_pixels':min_margin,
                        'character_animation':False,'all_rendered_source_frames_unique':True},
              'encoding_command':[str(c) for c in cmd],'mkv_remux_command':[str(c) for c in remux],
              'outputs':[mp4_check,mkv_check], 'video_elementary_stream_sha256':vh1,
              'mp4_mkv_identical_video_bitstream':True,'mkv_audio_exactly_equals_original_flac_slice':True,
              'mkv_pcm_sha256':hashlib.sha256(master_pcm).hexdigest(),'contact_sheet':rel(sheetfile),
              'elapsed_seconds':time.monotonic()-start,'lyrics_added':False,'direct_auditory_review':False}
    write_json(OUT/f'{name}-metadata.json',result)
    print(f'{name}: validated in {result["elapsed_seconds"]:.1f}s',flush=True)
    return result


def combine():
    order = ['02-memory','01-joker','03-handover']
    items = [json.loads((OUT/f'{name}-metadata.json').read_text(encoding='utf8')) for name in order]
    # Remove AAC priming timestamps from the video concat input. Audio comes
    # separately from FLAC below, so no per-segment AAC padding enters the mix.
    video_dir = ROOT/'.cache/style-trial-video-concat'
    video_dir.mkdir(parents=True,exist_ok=True)
    for name in order:
        run([FFMPEG,'-v','error','-y','-i',OUT/f'{name}-4k60.mp4',
             '-map','0:v:0','-c:v','copy','-an','-movflags','+faststart',video_dir/f'{name}.mp4'])
    concat = OUT/'preview-concat.txt'
    concat.write_text(''.join(f"file '{(video_dir/f'{name}.mp4').as_posix()}'\n" for name in order),encoding='utf8')
    final = OUT/'00-style-trials-4k60.mp4'
    cmd = [FFMPEG,'-v','error','-y','-f','concat','-safe','0','-i',concat]
    for it in items:
        cmd += ['-i',ROOT/it['audio_selection']['audio_file']]
    cmd += ['-filter_complex','[1:a][2:a][3:a]concat=n=3:v=0:a=1[a]',
            '-map','0:v:0','-map','[a]','-c:v','copy','-c:a','aac','-b:a','320k',
            '-ar','48000','-movflags','+faststart','-video_track_timescale','60000',final]
    run(cmd)
    n = sum(it['frames'] for it in items)
    check = verify(final,n,n/FPS,'aac')
    result = {'order':order,'duration_seconds':n/FPS,'frames':n,
              'video_reencoded':False,'audio':'AAC encoded once from concatenated original FLAC cuts; not bitexact lossless audio.',
              'aac_priming_removed_from_video_concat_input':True,
              'titles_or_lyrics_added':False,'command':[str(c) for c in cmd],'output':check}
    write_json(OUT/'00-style-trials-metadata.json',result)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--only',nargs='*',choices=[s[0] for s in SPECS])
    parser.add_argument('--combine',action='store_true')
    parser.add_argument('--combine-only',action='store_true')
    parser.add_argument('--image',action='append',default=[],metavar='ID=PROJECT_RELATIVE_PNG',
                        help='Use a reviewed alternate image while retaining the requested output ID.')
    args = parser.parse_args()
    overrides = {}
    for value in args.image:
        name, path = value.split('=',1)
        assert name in {s[0] for s in SPECS}
        image_path = (ROOT/path).resolve()
        assert image_path.is_relative_to(ROOT) and image_path.suffix.lower() == '.png'
        overrides[name] = image_path
    OUT.mkdir(parents=True,exist_ok=True)
    cv2.setNumThreads(8)
    selections = json.loads((ROOT/'references/audio-style-sample-selection.json').read_text(encoding='utf8'))
    src = ROOT/selections['source_audio']['file']
    before = sha(src)
    assert before == selections['source_audio']['sha256_before']
    if not args.combine_only:
        original_pcm = pcm(src)
        for spec in SPECS:
            if args.only is None or spec[0] in args.only:
                sample = next(s for s in selections['selected_samples'] if s['id']==spec[1])
                render(spec,sample,original_pcm,before,overrides.get(spec[0]))
    if args.combine or args.combine_only:
        combine()
    assert sha(src) == before
    results = [json.loads(p.read_text(encoding='utf8')) for p in sorted(OUT.glob('0[1-3]-*-metadata.json'))]
    combined = OUT/'00-style-trials-metadata.json'
    manifest = {'schema_version':1,'created_utc':datetime.now(timezone.utc).isoformat(),
                'purpose':'Music visual-style trials; fan illustrations, not final MV or exact original cutscene recreations.',
                'source_art_enlarged_to_4k':True,'original_audio_sha256':before,'original_audio_preserved':True,
                'ffmpeg':{'file':str(FFMPEG),'sha256':sha(FFMPEG),'version':run([FFMPEG,'-version'],capture=True).decode().splitlines()[0]},
                'ffprobe':{'file':str(FFPROBE),'sha256':sha(FFPROBE),'version':run([FFPROBE,'-version'],capture=True).decode().splitlines()[0]},
                'samples':results,'combined':json.loads(combined.read_text(encoding='utf8')) if combined.exists() else None,
                'no_lyric_subtitles':True,'no_alac':True,'no_audio_upsampling':True}
    write_json(OUT/'render-metadata.json',manifest)


if __name__ == '__main__':
    main()

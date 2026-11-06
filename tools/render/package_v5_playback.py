"""Create and verify a browser-friendly 4K60 AAC companion; preserve Hi-Res master."""
from pathlib import Path
from fractions import Fraction
import argparse
import json
import re
import numpy as np
import prepend_warning_v3_verify as packets
from verify_full_mv import verify, stream_metadata
from verify_sample import run_ffmpeg, sha256

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'exports/audio-repair-v5'
FF = ROOT / '.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'
SOURCE = ROOT / 'exports/astra-world-execute-me-final-v5-warning-hires-4k60.mp4'
OUTPUT = ROOT / 'exports/astra-world-execute-me-final-v5-playback-4k60.mp4'
EXPECTED = 'ae6cf8ed08346c0a58e2384ae24d9d8a86d300d684a66d6faf41653f534c73f0'
RATE = 48000
packets.WORK = WORK

def save(name, value):
    (WORK / name).write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')

def pcm(filename):
    r = run_ffmpeg(FF, ['-loglevel', 'error', '-i', str(filename), '-map', '0:a:0', '-vn', '-ac', '2', '-ar', str(RATE), '-f', 'f32le', 'pipe:1'])
    if r.returncode or r.stderr.strip():
        raise RuntimeError(r.stderr.decode(errors='replace'))
    return np.frombuffer(r.stdout, dtype='<f4').reshape(-1, 2)

def level(samples, first, last):
    x = samples[round(first*RATE):round(last*RATE)].astype(np.float64)
    rms = np.sqrt(np.mean(x*x, axis=0))
    peak = np.max(np.abs(x), axis=0)
    return {'seconds': [first, last], 'samples_per_channel': len(x), 'rms_dbfs_L_R': (20*np.log10(np.maximum(rms, 1e-15))).tolist(), 'peak_dbfs_L_R': (20*np.log10(np.maximum(peak, 1e-15))).tolist(), 'exact_zero': bool(not np.any(x))}

def main():
    WORK.mkdir(parents=True, exist_ok=True)
    if sha256(SOURCE) != EXPECTED:
        raise RuntimeError('Original final v5 hash changed; stop before creating companion')
    before = stream_metadata(FF, SOURCE)
    original = pcm(SOURCE)
    active = [level(original, t, t+2.5) for t in [6, 36, 65, 95, 125, 155, 185, 205]]
    diagnostic = {'source': str(SOURCE), 'sha256': EXPECTED, 'metadata': before, 'source_active_windows': active, 'source_head': level(original, 0, 5), 'source_tail': level(original, 13400/60-6, 13400/60), 'conclusion': 'The original ALAC default track contains nonzero decoded audio. Exact user-player failure is unobserved; ALAC compatibility is a hypothesis to test, not an observed speaker setting.'}
    save('diagnosis.json', diagnostic)
    print('[audio repair] Original default ALAC track is present and audible by decoded signal measurements', flush=True)
    args = ['-loglevel', 'warning', '-n', '-i', str(SOURCE), '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy', '-c:a', 'aac', '-profile:a', 'aac_low', '-b:a', '320k', '-ar', '48000', '-ac', '2', '-disposition:a:0', 'default', '-metadata:s:a:0', 'title=Stereo AAC compatible playback', '-metadata:s:a:0', 'handler_name=Stereo AAC playback', '-metadata', 'comment=Native 4K60 video copied unchanged from final v5; AAC-LC 48kHz 320kbps stereo compatibility audio. Hi-Res ALAC original preserved separately.', '-t', '223.333333333', '-video_track_timescale', '60000', '-movflags', '+faststart', str(OUTPUT)]
    save('command.json', [str(FF), '-hide_banner', *args])
    if not OUTPUT.exists():
        result = run_ffmpeg(FF, args)
        (WORK/'encode.log').write_bytes(result.stderr)
        if result.returncode:
            raise RuntimeError(result.stderr.decode(errors='replace'))
    print('[audio repair] Complete playback copy encoded; verifying all picture packets and audio', flush=True)
    old, oldtb = packets.packets(SOURCE, 'source-video')
    new, newtb = packets.packets(OUTPUT, 'playback-video')
    picture = {'all_13400_video_packets': len(new)==len(old)==13400, 'every_video_payload_identical': len(new)==len(old) and all((a['sha256'], a['size'])==(b['sha256'], b['size']) for a,b in zip(old,new)), 'every_pts_dts_and_duration_identical': len(new)==len(old) and all(Fraction(a[k])*oldtb==Fraction(b[k])*newtb for a,b in zip(old,new) for k in ['pts','dts','duration'])}
    save('picture-packets.json', {'passed': all(picture.values()), 'checks': picture})
    opts=argparse.Namespace(video=OUTPUT, audio=SOURCE, width=3840, height=2160, fps=60, frames=13400, source_start=0., windows=[6.,36.,65.,95.,125.,155.,185.,205.], window_length=2.5, min_correlation=.98, audio_rate=24000, ffmpeg=FF)
    full=verify(opts)
    save('full-verify.json', full)
    decoded=pcm(OUTPUT)
    levels=[level(decoded, t, t+2.5) for t in [6,36,65,95,125,155,185,205]]
    head=level(decoded,0,4.9)
    tail=level(decoded,13400/60-5.9,13400/60)
    meta=stream_metadata(FF,OUTPUT)
    alltext=run_ffmpeg(FF,['-i',str(OUTPUT)]).stderr.decode(errors='replace')
    audiolines=[line for line in alltext.splitlines() if 'Stream #' in line and 'Audio:' in line]
    checks={'original_hires_file_unchanged':sha256(SOURCE)==EXPECTED, 'full_video_audio_decode_and_alignment':full['passed'], **picture, 'exactly_one_AAC_LC_48k_stereo_default_track':len(audiolines)==1 and all(term in audiolines[0] for term in ['aac (LC)', '48000 Hz', 'stereo', '(default)']), 'both_channels_nonzero_all_eight_windows':all(min(x['rms_dbfs_L_R'])>-70 for x in levels), 'warning_silence_0_to_4_9s':max(head['peak_dbfs_L_R'])<-80, 'quiet_tail_last_5_9s':max(tail['peak_dbfs_L_R'])<-80}
    report={'passed':all(checks.values()), 'checks':checks, 'source':str(SOURCE), 'source_sha256':EXPECTED, 'output':str(OUTPUT), 'sha256':sha256(OUTPUT), 'bytes':OUTPUT.stat().st_size, 'metadata':meta, 'active_windows':levels, 'warning_silence':head, 'quiet_tail_silence':tail, 'scope':'Video stream copied without re-encoding and verified packet-for-packet. AAC is a lossy compatibility copy, not Hi-Res. Full decoder and eight alignment windows verified; human listening/device speaker behavior not claimed. Silence measurements exclude 100ms at each musical transition to allow AAC transform ringing.'}
    save('verification.json',report)
    print(json.dumps({'passed':report['passed'],'checks':checks,'output':str(OUTPUT),'bytes':report['bytes']},ensure_ascii=False),flush=True)
    if not report['passed']:
        raise SystemExit(1)

if __name__ == '__main__':
    main()

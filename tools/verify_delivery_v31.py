#!/usr/bin/env python3
"""Verify the delivered v3.1 MKV without modifying media or source files.

Writes only exports/v3.1/media-validation.json. A missing delivery exits before
writing a report. Every external command in the report was actually executed;
raw stdout/stderr and return codes are retained for reproducibility.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import time


ROOT = Path(__file__).resolve().parents[1]
PIPELINE = ROOT.parent / 'vocaloid-style-mv-pipeline'
FFMPEG = PIPELINE / '_tools/ffmpeg/bin/ffmpeg.exe'
FFPROBE = PIPELINE / '_tools/ffmpeg/bin/ffprobe.exe'
SOURCE = ROOT / 'local-source/audio/07 太陽系デスコ.flac'
LYRICS = ROOT / 'lyrics/lyrics.json'
DELIVERY = ROOT / 'exports/v3.1/taiyoukei-disco-v3.1-720p30-flac.mkv'
REPORT = ROOT / 'exports/v3.1/media-validation.json'
EXPECTED_SOURCE_SHA256 = '0139c2441bf35e98951ca46b5e8395a71c8aa4b2629c4f5c3a1079881d019ac9'
EXPECTED_LYRICS_SHA256 = '2a7588e0de9a4b922f79fc609f7810f6147f758b4915f0cc10dad14ad0db42de'
EXPECTED_PCM_MD5 = '4daf00626a1c0d4a8d848c3393b6c759'
MKV_TICK_SECONDS = 0.001
PTS_FLOAT_EPSILON_SECONDS = 1e-8
PTS_TOLERANCE_SECONDS = MKV_TICK_SECONDS + PTS_FLOAT_EPSILON_SECONDS


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def digest(path: Path, algorithm: str = 'sha256') -> str:
    h = hashlib.new(algorithm)
    with path.open('rb') as f:
        while data := f.read(8 * 1024 * 1024):
            h.update(data)
    return h.hexdigest()


def as_fraction(value) -> Fraction | None:
    try:
        return Fraction(str(value))
    except (ValueError, ZeroDivisionError, TypeError):
        return None


def as_number(value, kind=float):
    try:
        result = kind(value)
        return result if math.isfinite(result) else None
    except (ValueError, TypeError, OverflowError):
        return None


class Audit:
    def __init__(self, timeout: int):
        self.timeout = timeout
        self.commands = []
        self.checks = {}
        self.observations = {}

    def run(self, name: str, argv: list[str | Path]) -> dict:
        args = [str(a) for a in argv]
        record = dict(name=name, argv=args, windows_command_line=subprocess.list2cmdline(args),
                      started_at=now(), completed=False)
        started = time.monotonic()
        self.commands.append(record)
        try:
            result = subprocess.run(args, capture_output=True, timeout=self.timeout, check=False)
            record.update(completed=True, returncode=result.returncode,
                          stdout=result.stdout.decode('utf-8', errors='replace'),
                          stderr=result.stderr.decode('utf-8', errors='replace'))
        except subprocess.TimeoutExpired as exc:
            record.update(timed_out=True, returncode=None,
                          stdout=(exc.stdout or b'').decode('utf-8', errors='replace'),
                          stderr=(exc.stderr or b'').decode('utf-8', errors='replace'))
        except OSError as exc:
            record.update(returncode=None, stdout='', stderr=str(exc), launch_error=True)
        finally:
            record.update(finished_at=now(), elapsed_seconds=round(time.monotonic()-started, 3))
        print(f"{name}: returncode={record['returncode']} ({record['elapsed_seconds']}s)", flush=True)
        return record

    def check(self, name: str, passed: bool, expected, actual, evidence: str):
        self.checks[name] = dict(passed=bool(passed), expected=expected, actual=actual, evidence=evidence)


def parsed_json(command: dict) -> dict:
    if command.get('returncode') != 0:
        return {}
    try:
        return json.loads(command['stdout'])
    except (ValueError, TypeError):
        return {}


def hash_output(command: dict, stream: bool = False) -> str | None:
    if command.get('returncode') != 0:
        return None
    lines = [x.strip() for x in command['stdout'].splitlines() if x.strip() and not x.startswith('#')]
    if len(lines) != 1:
        return None
    text = lines[0]
    if stream:
        # streamhash outputs: stream_index,media_type,SHA256=digest
        parts = text.split(',')
        if len(parts) != 3 or parts[1] != 'a' or not parts[2].startswith('SHA256='):
            return None
        return parts[2].split('=', 1)[1].lower()
    if not text.startswith('MD5='):
        return None
    return text.split('=', 1)[1].lower()


def validate(video: Path, timeout: int) -> dict:
    audit = Audit(timeout)
    report = dict(schema_version=1, started_at=now(), status='running',
                  delivery=str(video), source_audio=str(SOURCE), formal_lyrics=str(LYRICS),
                  expected=dict(width=1280,height=720,fps='30/1',video_frames=6096,duration_seconds=203.2,
                                video_codec='h264',pixel_format='yuv420p',audio_codec='flac',
                                audio_sample_rate=44100,audio_channels=2,audio_bits=16,
                                source_audio_sha256=EXPECTED_SOURCE_SHA256,pcm_s16le_md5=EXPECTED_PCM_MD5,
                                formal_lyrics_sha256=EXPECTED_LYRICS_SHA256),
                  checks=audit.checks,observations=audit.observations,commands=audit.commands,
                  timestamp_policy=dict(tick_seconds=MKV_TICK_SECONDS,float_epsilon_seconds=PTS_FLOAT_EPSILON_SECONDS,
                    maximum_grid_error_seconds=PTS_TOLERANCE_SECONDS,
                    reason='MKV millisecond quantization policy: one 1ms tick plus 1e-8s floating-point epsilon. Require all adjacent PTS steps to be 33/34ms, 6096 frames, and container duration 203.2s. Signed errors and worker boundaries remain reported; no timestamp correction or media rewrite.'),
                  validation_scope='Technical media/source integrity only; no artistic approval or actual ear-listening claim.')
    try:
        source_before = digest(SOURCE)
        lyrics_before = digest(LYRICS)
        audit.check('source_flac_sha256_before',source_before==EXPECTED_SOURCE_SHA256,EXPECTED_SOURCE_SHA256,source_before,'Python hashlib SHA256 over original FLAC bytes')
        audit.check('formal_lyrics_sha256_before',lyrics_before==EXPECTED_LYRICS_SHA256,EXPECTED_LYRICS_SHA256,lyrics_before,'Python hashlib SHA256 over formal lyrics JSON bytes')
        formal = json.loads(LYRICS.read_text(encoding='utf-8-sig'))
        unchanged_times = len(formal.get('entries',[]))==58 and all(x.get('start') is None and x.get('end') is None for x in formal['entries'])
        audit.check('formal_lyrics_58_unassigned',unchanged_times,'58 entries with null start/end',unchanged_times,'Read original formal lyrics JSON; no write')
        audit.observations['delivery_bytes'] = video.stat().st_size
        audit.run('ffmpeg_version',[FFMPEG,'-version'])
        audit.run('ffprobe_version',[FFPROBE,'-version'])

        probe_command = audit.run('container_and_stream_probe',[FFPROBE,'-v','error','-count_frames','-show_streams','-show_format','-of','json',video])
        probe = parsed_json(probe_command)
        streams = probe.get('streams',[])
        videos = [s for s in streams if s.get('codec_type')=='video']
        audios = [s for s in streams if s.get('codec_type')=='audio']
        audit.check('container_probe_success',probe_command.get('returncode')==0 and bool(streams),True,probe_command.get('returncode'),'container_and_stream_probe')
        audit.check('exactly_one_video_and_one_audio',len(streams)==2 and len(videos)==1 and len(audios)==1,{'total':2,'video':1,'audio':1},{'total':len(streams),'video':len(videos),'audio':len(audios)},'container_and_stream_probe streams')
        attached = [s.get('index') for s in streams if s.get('disposition',{}).get('attached_pic',0)]
        audit.check('no_attached_picture',not attached,[],attached,'container_and_stream_probe dispositions; source cover art must not be mapped')
        vs = videos[0] if len(videos)==1 else {}
        aus = audios[0] if len(audios)==1 else {}
        for key,expected in [('width',1280),('height',720),('codec_name','h264'),('pix_fmt','yuv420p')]:
            audit.check('video_'+key,vs.get(key)==expected,expected,vs.get(key),'container_and_stream_probe video')
        for key in ['r_frame_rate','avg_frame_rate']:
            audit.check('video_'+key,as_fraction(vs.get(key))==Fraction(30,1),'30/1',vs.get(key),'container_and_stream_probe video')
        audit.check('video_millisecond_timebase',as_fraction(vs.get('time_base'))==Fraction(1,1000),'1/1000',vs.get('time_base'),'container_and_stream_probe video time_base; establishes 1ms MKV tick')
        count = as_number(vs.get('nb_read_frames'),int)
        audit.check('video_decoded_frame_count',count==6096,6096,count,'ffprobe -count_frames nb_read_frames')
        duration = as_number(probe.get('format',{}).get('duration'))
        audit.check('container_duration_203_2',duration is not None and abs(duration-203.2)<=0.001,{'seconds':203.2,'tolerance_seconds':0.001},duration,'container_and_stream_probe format.duration')
        for key,expected in [('codec_name','flac'),('sample_rate','44100'),('channels',2)]:
            actual = aus.get(key)
            audit.check('audio_'+key,actual==expected,expected,actual,'container_and_stream_probe audio')
        bits = as_number(aus.get('bits_per_raw_sample') or aus.get('bits_per_sample'),int)
        audit.check('audio_16_bit',bits==16,16,bits,'container_and_stream_probe bits_per_raw_sample, falling back to bits_per_sample')

        # Matroska commonly stores a 1/1000 video time base. 30fps therefore
        # alternates 33 and 34 ms, not an exact 1/30 textual timestamp.
        frame_command = audit.run('decoded_video_frame_pts',[FFPROBE,'-v','error','-select_streams','v:0','-show_frames',
                                      '-show_entries','frame=pts_time,best_effort_timestamp_time,pkt_dts_time','-of','json',video])
        frames = parsed_json(frame_command).get('frames',[])
        pts = []
        for frame in frames:
            value = frame.get('pts_time',frame.get('best_effort_timestamp_time'))
            pts.append(None if value is None else float(value))
        usable = len(pts)==6096 and all(x is not None for x in pts)
        deltas = [round(pts[i+1]-pts[i],6) for i in range(len(pts)-1)] if usable else []
        signed_errors = [t-i/30 for i,t in enumerate(pts)] if usable else []
        grid_errors = [abs(x) for x in signed_errors]
        audit.check('pts_exactly_6096_frames',usable,6096,len(pts),'decoded_video_frame_pts; all frames must have a timestamp')
        audit.check('pts_start_zero',usable and abs(pts[0])<=0.000501,0,pts[0] if pts else None,'decoded_video_frame_pts')
        deltas_ok = usable and all(abs(x-.033)<.000001 or abs(x-.034)<.000001 for x in deltas)
        audit.check('pts_33_or_34_ms_increments',deltas_ok,[0.033,0.034],sorted(set(deltas)),'decoded_video_frame_pts consecutive presentation timestamp deltas')
        max_error = max(grid_errors) if grid_errors else None
        audit.check('pts_match_30fps_grid',usable and max_error<=PTS_TOLERANCE_SECONDS,{'maximum_rounding_error_seconds':PTS_TOLERANCE_SECONDS},max_error,'Each displayed PTS compared with frame_index/30; one MKV 1ms tick plus floating-point epsilon, per timestamp_policy')
        last_end = pts[-1]+1/30 if usable else None
        audit.check('video_endpoint_203_2',usable and abs(last_end-203.2)<=PTS_TOLERANCE_SECONDS,{'seconds':203.2,'tolerance_seconds':PTS_TOLERANCE_SECONDS},last_end,'Last frame PTS plus 1/30 second; container duration is independently checked')
        error_counts = Counter(round(x*1000,6) for x in signed_errors)
        error_distribution = [dict(signed_error_ms=e,count=n) for e,n in sorted(error_counts.items())]
        boundaries = []
        for boundary in [2032,4064]:
            window = []
            if usable:
                for i in range(boundary-4,boundary+5):
                    window.append(dict(frame=i,pts_seconds=pts[i],ideal_pts_seconds=i/30,
                                       signed_grid_error_ms=round(signed_errors[i]*1000,6),
                                       previous_frame_delta_ms=round((pts[i]-pts[i-1])*1000,6)))
            boundaries.append(dict(first_frame_of_worker=boundary,neighbor_frames=window))
        audit.observations['video_pts_summary'] = dict(count=len(pts),first=pts[0] if pts else None,last=pts[-1] if pts else None,
                                                      distinct_deltas_seconds=sorted(set(deltas)),maximum_grid_error_seconds=max_error,
                                                      minimum_signed_error_seconds=min(signed_errors) if signed_errors else None,
                                                      maximum_signed_error_seconds=max(signed_errors) if signed_errors else None,
                                                      signed_error_distribution_ms=error_distribution,
                                                      worker_boundary_details=boundaries)

        decode = audit.run('full_video_audio_decode',[FFMPEG,'-hide_banner','-nostdin','-v','error','-xerror','-err_detect','explode',
                                            '-i',video,'-map','0:v:0','-map','0:a:0','-f','null','-'])
        audit.check('full_decode_without_errors',decode.get('returncode')==0 and not decode['stderr'].strip(),{'returncode':0,'stderr':''},
                    {'returncode':decode.get('returncode'),'stderr':decode['stderr']},'Full H264 and FLAC decode with -xerror -err_detect explode')

        hashes = {}
        for label,path in [('source',SOURCE),('delivery',video)]:
            pcm = audit.run(label+'_audio_pcm_md5',[FFMPEG,'-hide_banner','-nostdin','-v','error','-i',path,'-map','0:a:0',
                                      '-c:a','pcm_s16le','-f','hash','-hash','MD5','-'])
            pcm_hash = hash_output(pcm)
            audit.check(label+'_decoded_pcm_md5',pcm_hash==EXPECTED_PCM_MD5,EXPECTED_PCM_MD5,pcm_hash,
                        label+'_audio_pcm_md5; decoded interleaved signed 16-bit little-endian PCM, no resample or channel remix')
            encoded = audit.run(label+'_audio_encoded_packet_sha256',[FFMPEG,'-hide_banner','-nostdin','-v','error','-i',path,
                                            '-map','0:a:0','-c:a','copy','-f','streamhash','-hash','SHA256','-'])
            hashes[label] = hash_output(encoded,stream=True)
        audit.check('encoded_audio_packet_data_identical',bool(hashes.get('source')) and hashes.get('source')==hashes.get('delivery'),
                    hashes.get('source'),hashes.get('delivery'),
                    'source_audio_encoded_packet_sha256 vs delivery_audio_encoded_packet_sha256: -c:a copy streamhash hashes encoded audio packet payloads, independent of MKV/FLAC container metadata')
        audit.observations['encoded_audio_packet_sha256'] = hashes

        source_after = digest(SOURCE)
        lyrics_after = digest(LYRICS)
        audit.check('source_flac_unchanged_after_validation',source_after==source_before==EXPECTED_SOURCE_SHA256,EXPECTED_SOURCE_SHA256,source_after,'Python hashlib after all external checks')
        audit.check('formal_lyrics_unchanged_after_validation',lyrics_after==lyrics_before==EXPECTED_LYRICS_SHA256,EXPECTED_LYRICS_SHA256,lyrics_after,'Python hashlib after all external checks')
        audit.observations['delivery_sha256'] = digest(video)
    except Exception as exc:
        report['exception'] = dict(type=type(exc).__name__,message=str(exc))
    report['finished_at'] = now()
    report['failed_checks'] = [k for k,v in audit.checks.items() if not v['passed']]
    report['status'] = 'passed' if audit.checks and not report['failed_checks'] and 'exception' not in report else 'failed'
    report['all_requested_checks_completed'] = 'formal_lyrics_unchanged_after_validation' in audit.checks and all(x.get('completed') for x in audit.commands)
    if not report['all_requested_checks_completed']:
        report['status'] = 'failed'
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--video',type=Path,default=DELIVERY)
    parser.add_argument('--timeout',type=int,default=600,help='Timeout in seconds per external command.')
    args = parser.parse_args()
    video = args.video.resolve()
    required = [video,SOURCE,LYRICS,FFMPEG,FFPROBE]
    missing = [str(p) for p in required if not p.is_file()]
    if missing:
        print(json.dumps({'status':'not_run','missing_files':missing,'report_written':False},ensure_ascii=False),file=sys.stderr)
        return 2
    previous_summary = None
    if REPORT.is_file():
        try:
            previous = json.loads(REPORT.read_text(encoding='utf-8'))
            previous_summary = dict(status=previous.get('status'),started_at=previous.get('started_at'),finished_at=previous.get('finished_at'),
                                    failed_checks=previous.get('failed_checks'),
                                    timestamp_checks={k:previous.get('checks',{}).get(k) for k in ['pts_match_30fps_grid','video_endpoint_203_2']})
        except (OSError,ValueError):
            pass
    report = validate(video,args.timeout)
    if previous_summary is not None:
        report['previous_validation_summary'] = previous_summary
    REPORT.parent.mkdir(parents=True,exist_ok=True)
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    print(json.dumps({'status':report['status'],'failed_checks':report['failed_checks'],
                      'all_requested_checks_completed':report['all_requested_checks_completed'],'report':str(REPORT)},ensure_ascii=False),flush=True)
    return 0 if report['status']=='passed' else 1


if __name__=='__main__':
    raise SystemExit(main())

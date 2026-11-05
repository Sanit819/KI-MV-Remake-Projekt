"""Independently verify warning upload copies; never modify production inputs."""
from __future__ import annotations
import argparse
import json
import re
from fractions import Fraction
from pathlib import Path
import numpy as np
from verify_full_mv import verify, audio_track
from verify_sample import alignment, run_ffmpeg, sha256

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'exports/warning-v3'
FF = ROOT / '.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'
RATE, FPS, FRAMES, PREFIX = 48000, 60, 13400, 300

def saved(name, data):
    (WORK / name).write_text(json.dumps(data, indent=2, ensure_ascii=False, allow_nan=False)+'\n', encoding='utf-8')

def packets(filename: Path, label: str):
    target = WORK / (label + '.framehash')
    r = run_ffmpeg(FF, ['-loglevel','error','-y','-i',str(filename),'-map','0:v:0','-an','-c:v','copy','-f','framehash','-hash','sha256',str(target)])
    if r.returncode or r.stderr.strip():
        raise RuntimeError(r.stderr.decode(errors='replace'))
    text = target.read_text(encoding='utf-8')
    tb = re.search(r'#tb 0:\s*(\d+)/(\d+)',text)
    if not tb: raise RuntimeError('No packet timebase')
    timebase = Fraction(int(tb[1]),int(tb[2]))
    rows=[]
    for line in text.splitlines():
        if not line or line.startswith('#'): continue
        p=[s.strip() for s in line.split(',')]
        rows.append({'dts':int(p[1]),'pts':int(p[2]),'duration':int(p[3]),'size':int(p[4]),'sha256':p[5]})
    return rows, timebase

def audio_hash(filename: Path):
    r=run_ffmpeg(FF,['-loglevel','error','-i',str(filename),'-map','0:a:0','-c:a','copy','-f','hash','-hash','sha256','-'])
    if r.returncode: raise RuntimeError(r.stderr.decode(errors='replace'))
    m=re.search(r'SHA256=([0-9a-f]+)',r.stdout.decode())
    if not m: raise RuntimeError('No AAC payload hash')
    return m[1]

def stereo_pcm(filename: Path):
    r=run_ffmpeg(FF,['-loglevel','error','-i',str(filename),'-map','0:a:0','-vn','-ac','2','-ar',str(RATE),'-f','f32le','pipe:1'])
    if r.returncode or r.stderr.strip(): raise RuntimeError(r.stderr.decode(errors='replace'))
    return np.frombuffer(r.stdout,dtype='<f4').reshape(-1,2)

def silent_stats(pcm, start, end):
    samples=pcm[round(start*RATE):round(end*RATE)].astype(np.float64)
    peak=float(np.max(np.abs(samples))) if samples.size else 1
    rms=float(np.sqrt(np.mean(samples*samples))) if samples.size else 1
    return {'interval_seconds':[start,end],'samples_per_channel':len(samples),'peak_dbfs':20*float(np.log10(max(peak,1e-15))),'rms_dbfs':20*float(np.log10(max(rms,1e-15))),'exact_zero':bool(not np.any(samples)), 'passed_below_minus_80_dbfs':peak<=0.0001}

def main():
    render=json.loads((WORK/'render.json').read_text(encoding='utf-8'))
    reference=Path(render['audio']['pcm_reference'])
    original,err=audio_track(FF,Path(render['inputs'][0]['input']),24000)
    if err: raise RuntimeError(err)
    report={'passed':False,'version':'v3-warning','expected_frames':FRAMES,'expected_fps':FPS,'duration_seconds':FRAMES/FPS,'original_picture_start_frame':300,'original_picture_start_seconds':5,'card_is_static_source':True,'items':[],'scope':'Complete video/audio decoding, all encoded packet hashes and PTS, eight shifted original-v3 audio windows per output, two-channel silence. Visual review is separately reported; no medical flash-safety certification.'}
    pcm_reference=stereo_pcm(reference)
    report['reference_silence']={'head':silent_stats(pcm_reference,0,5),'tail':silent_stats(pcm_reference,5+13100/60-6,FRAMES/FPS)}
    shared_audio_hash=audio_hash(Path(render['audio']['encoded_once']))
    for item in render['inputs']:
        key=item['key'];out=Path(item['output']);original_video=Path(item['input'])
        print('[warning verify] '+key+' full decode',flush=True)
        opts=argparse.Namespace(video=out,audio=reference,width=item['width'],height=item['height'],fps=FPS,frames=FRAMES,source_start=0.0,windows=[6.,36.,65.,95.,125.,155.,185.,205.],window_length=2.5,min_correlation=.98,audio_rate=24000,ffmpeg=FF)
        full=verify(opts);saved(key+'.full-verify.json',full)
        old,tb_old=packets(original_video,key+'-original-packets')
        new,tb_new=packets(out,key+'-output-packets')
        times=sorted(Fraction(x['pts'])*tb_new for x in new)
        packet_checks={
            'original_count_13100':len(old)==13100,'new_count_13400':len(new)==FRAMES,
            'all_original_packet_bytes_identical':len(new[PREFIX:])==len(old) and all((a['size'],a['sha256'])==(b['size'],b['sha256']) for a,b in zip(old,new[PREFIX:])),
            'all_pts_exact_n_over_60':len(times)==FRAMES and all(x==Fraction(i,FPS) for i,x in enumerate(times)),
            'all_packet_durations_one_frame':all(Fraction(x['duration'])*tb_new==Fraction(1,FPS) for x in new),
            'dts_strictly_increasing':all(new[i]['dts']>new[i-1]['dts'] for i in range(1,len(new))),
            'original_pts_shift_exact_5s':len(new[PREFIX:])==len(old) and all(Fraction(b['pts'])*tb_new-Fraction(a['pts'])*tb_old==5 for a,b in zip(old,new[PREFIX:])),
        }
        packet_info={'passed':all(packet_checks.values()),'checks':packet_checks,'new_timebase':str(tb_new),'original_timebase':str(tb_old),'count':len(new),'first_pts':str(times[0]),'last_pts':str(times[-1]),'method':'SHA256 and size of each stream-copied AVCC packet via FFmpeg framehash; output decode-order packets [300:] must match input packets one-for-one, including VCL and non-VCL payloads.'}
        saved(key+'.packets.json',packet_info)
        shifted,err=audio_track(FF,out,24000)
        if err: raise RuntimeError(err)
        after_preroll=shifted[5*24000:]
        comparisons=[]
        for t in [1.,31.,60.,90.,120.,150.,180.,200.]:
            a=alignment(original,after_preroll,24000,t,2.5)
            a['original_v3_window_seconds']=[t,t+2.5];a['upload_window_seconds']=[t+5,t+7.5];a['passed']=abs(a['lag_seconds'])<=1/60 and a['normalized_correlation']>=.98;comparisons.append(a)
        decoded=stereo_pcm(out)
        silence={'head':silent_stats(decoded,0,5),'tail':silent_stats(decoded,5+13100/60-6,FRAMES/FPS)}
        payload=audio_hash(out)
        checks={'full_decode_and_reference_alignment':full['passed'],'all_original_video_packets_identical_and_timestamps_correct':packet_info['passed'],'eight_windows_against_original_v3_shifted_five_seconds':all(w['passed'] for w in comparisons),'five_second_head_silent':silence['head']['passed_below_minus_80_dbfs'],'six_second_tail_silent':silence['tail']['passed_below_minus_80_dbfs'],'original_mp4_unchanged':sha256(original_video)==item['sha256_before'],'shared_aac_payload_no_further_encode':payload==shared_audio_hash}
        result={'key':key,'output':str(out),'bytes':out.stat().st_size,'sha256':sha256(out),'passed':all(checks.values()),'checks':checks,'full_verify_report':key+'.full-verify.json','packet_report':key+'.packets.json','original_sha256':sha256(original_video),'aac_payload_sha256':payload,'silence':silence,'alignment_against_original_v3':comparisons}
        report['items'].append(result);saved('verification.json',report)
        print(json.dumps({'key':key,'passed':result['passed'],'checks':checks},ensure_ascii=False),flush=True)
    report['passed']=all(x['passed'] for x in report['items']) and len(report['items'])==2
    report['source_audio_unchanged']=sha256(Path(render['audio']['source']))==render['audio']['sha256']
    report['passed'] &= report['source_audio_unchanged']
    saved('verification.json',report)
    if not report['passed']: raise SystemExit(1)
    render['passed']=True;render['phase']='complete';render['verification_report']=str(WORK/'verification.json');saved('render.json',render)
    print('[warning verify] Both upload copies PASSED',flush=True)

if __name__=='__main__': main()

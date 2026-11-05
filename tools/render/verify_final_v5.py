"""One 4K delivery: full decode, exact timestamps and independently native PCM."""
from pathlib import Path
from fractions import Fraction
import argparse, json
import prepend_warning_v3_verify as packets
import prepend_warning_v3_hires_verify as native
from verify_full_mv import verify, audio_track
from verify_sample import sha256, alignment
ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'exports/final-v5'
FF=ROOT/'.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'
packets.WORK=WORK
native.WORK=WORK

def save(name,data):
    (WORK/name).write_text(json.dumps(data,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf-8')

def main():
    render=json.loads((WORK/'render.json').read_text(encoding='utf-8'))
    out=Path(render['output']);body=Path(render['body']);source=Path(render['audio']['source'])
    report={'passed':False,'scope':'One native 3840x2160 60fps MP4; entire video/audio decode; every video timestamp and packet; every native 24-bit stereo sample; prior warning and v4 preserved. No platform Hi-Res badge or master provenance certification.'}
    save('verification.json',report)
    print('[v5 verify] Full 13400-frame 4K video and audio decode',flush=True)
    options=argparse.Namespace(video=out,audio=Path(render['audio']['reference']),width=3840,height=2160,fps=60,frames=13400,source_start=0.,windows=[6.,36.,65.,95.,125.,155.,185.,205.],window_length=2.5,min_correlation=.98,audio_rate=24000,ffmpeg=FF)
    full=verify(options);save('4k60.full-verify.json',full)
    final,tb=packets.packets(out,'final-video');old,tbold=packets.packets(Path(render['prefix_source']),'preserved-v4');main,tbmain=packets.packets(body,'body-video')
    identical=lambda a,b:len(a)==len(b) and all((x['sha256'],x['size'])==(y['sha256'],y['size']) for x,y in zip(a,b))
    pts=sorted(Fraction(p['pts'])*tb for p in final)
    checks={'count_13400':len(final)==13400,'body_count_13100':len(main)==13100,'all_pts_n_over_60':len(pts)==13400 and all(p==Fraction(i,60) for i,p in enumerate(pts)),'all_durations_one_frame':all(Fraction(p['duration'])*tb==Fraction(1,60) for p in final),'strict_decode_timestamps':all(b['dts']>a['dts'] for a,b in zip(final,final[1:])),'warning_300_packets_identical_to_v4':identical(old[:300],final[:300]),'body_13100_packets_preserved':identical(main,final[300:]),'body_shift_exactly_five_seconds':len(main)==len(final[300:]) and all(Fraction(b['pts'])*tb-Fraction(a['pts'])*tbmain==5 for a,b in zip(main,final[300:]))}
    offset=300
    for part in render['parts']:
        pp,ptb=packets.packets(Path(part['file']),f"part-{part['index']}")
        checks[f"part_{part['index']}_payload_and_frame_count"]=len(pp)==part['last']-part['first'] and identical(pp,final[offset:offset+len(pp)])
        shift=Fraction(300+part['first'],60)
        checks[f"part_{part['index']}_PTS_DTS_shift_exact"]=len(pp)==part['last']-part['first'] and all(Fraction(b[key])*tb-Fraction(a[key])*ptb==shift for a,b in zip(pp,final[offset:offset+len(pp)]) for key in ['pts','dts'])
        offset+=len(pp)
    save('4k60.packets.json',{'passed':all(checks.values()),'checks':checks,'timebase':str(tb),'packet_count':len(final),'body_timebase':str(tbmain)})
    print('[v5 verify] Native 192kHz / 24bit PCM identity',flush=True)
    expected=native.pcm_digest(source,'independent-source-reference',source_reference=True)
    actual=native.pcm_digest(out,'final-native-pcm');cfg=native.alac_config(out)
    payload=packets.audio_hash(out);original_payload=packets.audio_hash(Path(render['audio']['encoded_once']))
    save('independent-pcm-reference.json',expected)
    original,err=audio_track(FF,ROOT/'media/audio/mili-world-execute-original-bilibili.m4a',24000)
    if err:raise RuntimeError(err)
    rendered,err=audio_track(FF,out,24000)
    if err:raise RuntimeError(err)
    windows=[]
    for t in [1.,31.,60.,90.,120.,150.,180.,200.]:
        a=alignment(original,rendered[5*24000:],24000,t,2.5);a['song_start_seconds']=t;a['output_start_seconds']=t+5;a['passed']=abs(a['lag_seconds'])<=1/60 and a['normalized_correlation']>=.90;windows.append(a)
    report.update({'checks':{'complete_video_audio_decode':full['passed'],'all_video_packets_pts_and_durations':all(checks.values()),'source_flac_unchanged':sha256(source)==render['audio']['expected_sha256'],'old_v4_unchanged':sha256(Path(render['prefix_source']))==render['prefix_source_sha256'],'body_unchanged':sha256(body)==render['body_sha256'],'output_hash_matches_render':sha256(out)==render['output_sha256'],'real_ALAC_config_192000_24bit_stereo':cfg['sample_rate']==192000 and cfg['bit_depth']==24 and cfg['channels']==2,'source_sample_count_40686080':expected['source_samples_per_channel']==40686080,'all_native_PCM_bytes_equal_independent_source_reference':actual['sha256']==expected['sha256'],'decoded_sample_count_42880000':actual['decoded_samples_per_channel']==42880000,'ALAC_payload_preserved_no_encode':payload==original_payload,'first_five_seconds_exact_zero':actual['head_exact_zero_0_to_5s'],'last_six_seconds_exact_zero':actual['tail_exact_zero_last_6s'],'eight_music_windows_within_one_frame':all(a['passed'] for a in windows)},'output':str(out),'bytes':out.stat().st_size,'sha256':sha256(out),'native_pcm':actual,'independent_expected_pcm':expected,'alac_config':cfg,'alac_payload_sha256':payload,'music_alignment_windows':windows,'music_alignment_scope':'AAC vs FLAC music correspondence (>=0.90 correlation, <=1/60s lag); native losslessness proved separately by exact integer PCM hashes.'})
    report['passed']=all(report['checks'].values());save('verification.json',report)
    print(json.dumps({'passed':report['passed'],'checks':report['checks']},ensure_ascii=False),flush=True)
    if not report['passed']:raise SystemExit(1)

if __name__=='__main__':main()

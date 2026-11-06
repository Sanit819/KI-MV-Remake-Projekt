"""Verify v5.1 cat-ear picture patch; original v5 ALAC is copied unchanged."""
from pathlib import Path
from fractions import Fraction
import argparse
import json
import prepend_warning_v3_verify as packets
import prepend_warning_v3_hires_verify as native
from verify_full_mv import verify
from verify_sample import sha256

ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'exports/final-v5.1-cat'
FF=ROOT/'.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'
packets.WORK=WORK
native.WORK=WORK

def save(name,value):
    (WORK/name).write_text(json.dumps(value,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf-8')

def same(a,b):
    return len(a)==len(b) and all((x['size'],x['sha256'])==(y['size'],y['sha256']) for x,y in zip(a,b))

def main():
    render=json.loads((WORK/'render.json').read_text(encoding='utf-8'))
    oldrender=json.loads((ROOT/'exports/final-v5/render.json').read_text(encoding='utf-8'))
    out,old=Path(render['output']),Path(render['original'])
    opts=argparse.Namespace(video=out,audio=old,width=3840,height=2160,fps=60,frames=13400,source_start=0.,windows=[6.,36.,65.,95.,125.,155.,185.,205.],window_length=2.5,min_correlation=.999999,audio_rate=24000,ffmpeg=FF)
    full=verify(opts);save('full-verify.json',full)
    original,tbo=packets.packets(old,'original-v5-video')
    final,tbf=packets.packets(out,'final-v5.1-video')
    pts=sorted(Fraction(x['pts'])*tbf for x in final)
    packetchecks={'13400_frames':len(final)==13400,'all_pts_exact_n_over_60':len(pts)==13400 and all(t==Fraction(i,60) for i,t in enumerate(pts)), 'all_durations_1_over_60':all(Fraction(x['duration'])*tbf==Fraction(1,60) for x in final),'strict_monotone_dts':all(b['dts']>a['dts'] for a,b in zip(final,final[1:])), 'all_warning_300_packets_identical':same(original[:300],final[:300]),'all_packets_outside_part2_identical':same(original[:3600],final[:3600]) and same(original[6900:],final[6900:]),'part2_picture_payload_actually_changed':not same(original[3600:6900],final[3600:6900])}
    offset=300
    for part in render['parts']:
        pp,tbp=packets.packets(Path(part['file']),f"part-{part['index']}")
        selected=final[offset:offset+len(pp)]
        packetchecks[f"part{part['index']}_count_payload"]=len(pp)==part['last']-part['first'] and same(pp,selected)
        shift=Fraction(300+part['first'],60)
        packetchecks[f"part{part['index']}_exact_pts_dts_shift"]=len(pp)==len(selected) and all(Fraction(b[k])*tbf-Fraction(a[k])*tbp==shift for a,b in zip(pp,selected) for k in ['pts','dts'])
        offset+=len(pp)
    save('packets.json',{'passed':all(packetchecks.values()),'checks':packetchecks,'timebase':str(tbf),'scope':'All MP4 video packet payloads, counts, PTS and DTS. Only body part2 [3300,6600) re-encoded; all packets outside that part must remain identical to original v5.'})
    oldpcm=native.pcm_digest(old,'original-v5-native-pcm')
    newpcm=native.pcm_digest(out,'final-v5.1-native-pcm')
    cfg=native.alac_config(out)
    audiohashold=packets.audio_hash(old);audiohashnew=packets.audio_hash(out)
    unchanged=[{'path':x['path'],'unchanged':sha256(ROOT/x['path'])==x['sha256']} for x in oldrender['input_hashes']]
    patchunchanged=[{'path':x['path'],'unchanged':sha256(ROOT/x['path'])==x['sha256']} for x in render['input_hashes']]
    qa_path=ROOT/render['cat_qa']['path']
    qa=json.loads(qa_path.read_text(encoding='utf-8'))
    oldparts=[{'index':p['index'],'unchanged':sha256(Path(p['file']))==p['sha256']} for p in oldrender['parts']]
    checks={'full_video_audio_decode_and_sync':full['passed'],'all_video_packet_checks':all(packetchecks.values()),'ALAC_payload_identical_no_audio_encode':audiohashold==audiohashnew,'every_native_PCM_byte_identical':oldpcm['sha256']==newpcm['sha256'],'native_192000_24bit_stereo':cfg['sample_rate']==192000 and cfg['bit_depth']==24 and cfg['channels']==2,'native_samples_42880000':newpcm['decoded_samples_per_channel']==42880000,'head_5s_and_tail_6s_exact_silence':newpcm['head_exact_zero_0_to_5s'] and newpcm['tail_exact_zero_last_6s'],'old_complete_v5_unchanged':sha256(old)==render['original_sha256'],'old_all_production_inputs_unchanged':all(x['unchanged'] for x in unchanged),'all_patch_inputs_frozen':all(x['unchanged'] for x in patchunchanged),'old_all_four_parts_unchanged':all(x['unchanged'] for x in oldparts),'unaffected_6_native_canvas_frames_identical':render['unaffected_canvas']['passed'],'final_hash_matches_render':sha256(out)==render['output_sha256']}
    checks['cat_runtime_qa_matches_frozen_sources']=qa['passed'] and qa['fingerprint']==render['fingerprint'] and sha256(qa_path)==render['cat_qa']['sha256']
    report={'passed':all(checks.values()),'checks':checks,'output':str(out),'bytes':out.stat().st_size,'sha256':sha256(out),'original_sha256':sha256(old),'native_pcm':newpcm,'original_native_pcm':oldpcm,'alac_config':cfg,'ALAC_payload_sha256':audiohashnew,'source_preservation':unchanged,'patch_inputs':patchunchanged,'old_parts':oldparts,'scope':'Complete 4K60 video/audio decode; all video packet timestamps; all packets outside one re-encoded picture part preserved; source hashes; all original 192kHz/24bit PCM bytes and ALAC packets identical. No audio conversion/encoding or 1080p output. Visual inspection separately recorded by cat-scene QA.'}
    save('verification.json',report)
    print(json.dumps({'passed':report['passed'],'checks':checks,'output':str(out)},ensure_ascii=False),flush=True)
    if not report['passed']:raise SystemExit(1)

if __name__=='__main__':main()

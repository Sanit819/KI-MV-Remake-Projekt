"""Native integer PCM verification of user-FLAC ALAC upload derivatives."""
from __future__ import annotations
import argparse
import hashlib
import json
import subprocess
from fractions import Fraction
from pathlib import Path
import prepend_warning_v3_verify as common
from verify_full_mv import verify, audio_track
from verify_sample import alignment, sha256

ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'exports/warning-v3-hires'
FF=ROOT/'.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'
common.WORK=WORK  # Reuse the packet-reader implementation, with isolated outputs.
RATE=192000
FRAME_BYTES=6  # Two channels of signed 24-bit little-endian PCM.
FRONT=960000
TOTAL=42880000
TAIL_START=41728000

def saved(name,value):
    (WORK/name).write_text(json.dumps(value,indent=2,ensure_ascii=False,allow_nan=False)+'\n',encoding='utf-8')

def preserved_inputs(render):
    """Check source files against hashes recorded before this derivative existed."""
    prior=json.loads((ROOT/'exports/warning-v3/render.json').read_text(encoding='utf-8'))
    flac=json.loads((ROOT/'docs/audio/user-flac-analysis.json').read_text(encoding='utf-8'))
    inventory=[
        ('desktop_flac',Path(flac['original_path']),flac['sha256']),
        ('preserved_flac',Path(render['audio']['source']),render['audio']['expected_sha256']),
        ('original_AAC',Path(prior['audio']['source']),prior['audio']['sha256']),
    ]
    inventory.extend(('original_v3_'+x['key'],Path(x['input']),x['sha256_before']) for x in prior['inputs'])
    inventory.extend(('warning_AAC_'+x['key'],Path(x['input']),x['sha256_before']) for x in render['inputs'])
    items=[]
    for key,file,expected in inventory:
        measured=sha256(file)
        items.append({'key':key,'path':str(file),'expected_sha256':expected,'measured_sha256':measured,'unchanged':measured==expected})
    return {'passed':all(x['unchanged'] for x in items),'items':items}

def pcm_digest(file: Path, label: str, *, source_reference=False):
    """Stream raw native PCM. Construct the expected reference in Python using
    byte slicing and literal zeros, independent of the production audio filters.
    """
    args=[str(FF),'-hide_banner','-loglevel','error','-i',str(file),'-map','0:a:0','-vn','-c:a','pcm_s24le','-f','s24le','pipe:1']
    saved(label+'.command.json',{'args':args,'scope':'native 192 kHz 24-bit stereo decode, no resampling'})
    errfile=WORK/(label+'.log')
    h=hashlib.sha256();raw=0;kept=0;remaining=11096*FRAME_BYTES if source_reference else 0
    head_zero=True;tail_zero=True
    def zeros(n):
        block=bytes(1024*1024)
        while n:
            part=block[:min(n,len(block))];h.update(part);n-=len(part)
    if source_reference: zeros(FRONT*FRAME_BYTES)
    with errfile.open('wb') as err:
        proc=subprocess.Popen(args,stdout=subprocess.PIPE,stderr=err)
        while True:
            block=proc.stdout.read(1024*1024)
            if not block: break
            if not source_reference:
                for a,b,which in [(0,FRONT*FRAME_BYTES,'head'),(TAIL_START*FRAME_BYTES,TOTAL*FRAME_BYTES,'tail')]:
                    lo=max(0,a-raw);hi=min(len(block),b-raw)
                    if hi>lo:
                        iszero=not any(block[lo:hi])
                        if which=='head': head_zero &= iszero
                        else: tail_zero &= iszero
            raw+=len(block)
            if remaining:
                n=min(remaining,len(block));block=block[n:];remaining-=n
            h.update(block);kept+=len(block)
        code=proc.wait()
    errors=errfile.read_text(encoding='utf-8',errors='replace').strip()
    if code or errors: raise RuntimeError(f'{label}: {code} {errors}')
    if raw%FRAME_BYTES or remaining: raise RuntimeError('Non-integral source sample count or trim failed')
    if source_reference:
        pad=(TOTAL-FRONT)*FRAME_BYTES-kept
        if pad<0: raise RuntimeError('Reference exceeds target')
        zeros(pad)
        return {'sha256':h.hexdigest(),'source_decoded_bytes':raw,'source_samples_per_channel':raw//FRAME_BYTES,'retained_samples_per_channel':kept//FRAME_BYTES,'trim_front_samples':11096,'front_silent_samples':FRONT,'tail_silent_samples':pad//FRAME_BYTES,'expected_total_bytes':TOTAL*FRAME_BYTES,'expected_total_samples_per_channel':TOTAL,'method':'Native signed 24-bit PCM decoded; Python drops first 11096 sample frames, hashes 960000 leading zero sample frames + every remaining source byte + literal zeros to length. No production-filter reuse.'}
    return {'sha256':h.hexdigest(),'decoded_bytes':raw,'decoded_samples_per_channel':raw//FRAME_BYTES,'head_exact_zero_0_to_5s':head_zero,'tail_exact_zero_last_6s':tail_zero,'tail_start_sample':TAIL_START}

def alac_config(file: Path):
    # Read the MP4 ALACSpecificConfig; s32p alone does not establish 24-bit audio.
    moov=None
    with file.open('rb') as f:
        size=file.stat().st_size
        while f.tell()<size:
            at=f.tell();header=f.read(8)
            if len(header)<8: break
            length=int.from_bytes(header[:4],'big');kind=header[4:8];head=8
            if length==1: length=int.from_bytes(f.read(8),'big');head=16
            if length==0: length=size-at
            if length<head: raise RuntimeError('Invalid MP4 atom length')
            if kind==b'moov': moov=f.read(length-head);break
            f.seek(at+length)
    if moov is None: raise RuntimeError('No MP4 moov')
    configs=[];at=0
    while True:
        i=moov.find(b'alac',at)
        if i<0: break
        at=i+4
        if i>=4 and int.from_bytes(moov[i-4:i],'big')==36:
            d=moov[i+8:i+32]
            if len(d)==24:
                configs.append({'frame_length':int.from_bytes(d[:4],'big'),'compatible_version':d[4],'bit_depth':d[5],'channels':d[9],'sample_rate':int.from_bytes(d[20:24],'big'),'raw_config_hex':d.hex()})
    if len(configs)!=1: raise RuntimeError(f'Expected one ALACSpecificConfig, found {configs}')
    return configs[0]

def main():
    render=json.loads((WORK/'render.json').read_text(encoding='utf-8'))
    source=Path(render['audio']['source']);reference=Path(render['audio']['reference'])
    expected=pcm_digest(source,'independent-source-reference',source_reference=True)
    saved('independent-pcm-reference.json',expected)
    ref_pcm=pcm_digest(reference,'production-reference-decode')
    encoded_once=Path(render['audio']['encoded_once'])
    once_config=alac_config(encoded_once);once_pcm=pcm_digest(encoded_once,'encoded-once-decode');once_hash=common.audio_hash(encoded_once)
    original_path=ROOT/'exports/astra-world-execute-me-full-v3-4k60.mp4'
    original,err=audio_track(FF,original_path,24000)
    if err: raise RuntimeError(err)
    report={'passed':False,'format':'User-supplied FLAC retained as 192 kHz / 24-bit stereo ALAC; recording provenance and platform acceptance unverified','independent_expected_pcm':expected,'production_reference_pcm':ref_pcm,'encoded_once_pcm':once_pcm,'encoded_once_config':once_config,'encoded_once_payload_sha256':once_hash,'checks':{'source_native_sample_count':expected['source_samples_per_channel']==40686080,'front_trim_exact':expected['retained_samples_per_channel']==40674984,'tail_padding_exact':expected['tail_silent_samples']==1245016,'production_reference_bitexact':expected['sha256']==ref_pcm['sha256'],'alac_once_bitexact':expected['sha256']==once_pcm['sha256'],'alac_once_native_format':once_config['bit_depth']==24 and once_config['sample_rate']==RATE and once_config['channels']==2},'items':[]}
    saved('verification.json',report)
    for item in render['inputs']:
        key=item['key'];out=Path(item['output']);input_video=Path(item['input'])
        # Later visual revisions may declare a different verified picture base;
        # legacy v3 callers retain their original source and validation behavior.
        base=ROOT/render.get('base_video_template','exports/astra-world-execute-me-full-v3-{key}.mp4').format(key=key)
        print('[HiRes verify] '+key+' full video/audio decode',flush=True)
        opts=argparse.Namespace(video=out,audio=reference,width=item['width'],height=item['height'],fps=60,frames=13400,source_start=0.,windows=[6.,36.,65.,95.,125.,155.,185.,205.],window_length=2.5,min_correlation=.98,audio_rate=24000,ffmpeg=FF)
        full=verify(opts);saved(key+'.full-verify.json',full)
        before,tb_before=common.packets(input_video,key+'-warning-input')
        after,tb_after=common.packets(out,key+'-hires-output')
        old,tb_old=common.packets(base,key+'-original-picture')
        times=sorted(Fraction(x['pts'])*tb_after for x in after)
        same=lambda a,b: len(a)==len(b) and all((x['sha256'],x['size'])==(y['sha256'],y['size']) for x,y in zip(a,b))
        packet_checks={'video_packet_bytes_equal_warning_input':same(before,after),'original_13100_video_packets_equal':same(old,after[300:]),'all_13400_pts_n_over_60':len(times)==13400 and all(t==Fraction(i,60) for i,t in enumerate(times)),'all_packet_durations_one_frame':all(Fraction(x['duration'])*tb_after==Fraction(1,60) for x in after),'strict_dts':all(after[i]['dts']>after[i-1]['dts'] for i in range(1,len(after))),'original_pts_shifted_5s':len(after[300:])==len(old) and all(Fraction(b['pts'])*tb_after-Fraction(a['pts'])*tb_old==5 for a,b in zip(old,after[300:]))}
        saved(key+'.packets.json',{'passed':all(packet_checks.values()),'checks':packet_checks,'output_timebase':str(tb_after),'source_warning_timebase':str(tb_before),'original_v3_timebase':str(tb_old)})
        cfg=alac_config(out);pcm=pcm_digest(out,key+'-native-pcm');payload=common.audio_hash(out)
        rendered,err=audio_track(FF,out,24000)
        if err: raise RuntimeError(err)
        shifted=rendered[5*24000:];windows=[]
        for t in [1.,31.,60.,90.,120.,150.,180.,200.]:
            # This is correspondence to a DIFFERENT AAC source, not a lossless
            # comparison. Prior measured FLAC/AAC correlations are >=0.934921;
            # use the documented reference-mapping bound and one-frame lag.
            # Losslessness is independently established by all native PCM bytes.
            a=alignment(original,shifted,24000,t,2.5);a['original_window_seconds']=[t,t+2.5];a['upload_window_seconds']=[t+5,t+7.5];a['passed']=abs(a['lag_seconds'])<=1/60 and a['normalized_correlation']>=.90;windows.append(a)
        checks={'full_video_audio_decode':full['passed'],'all_video_packet_and_pts_checks':all(packet_checks.values()),'actual_ALACSpecificConfig_192k_24bit_stereo':cfg['sample_rate']==RATE and cfg['bit_depth']==24 and cfg['channels']==2,'decoded_audio_bitexact_to_independently_trimmed_padded_FLAC':pcm['sha256']==expected['sha256'],'exact_native_decoded_sample_count':pcm['decoded_samples_per_channel']==TOTAL,'shared_ALAC_payload_no_second_encode':payload==once_hash,'five_second_head_exact_zero':pcm['head_exact_zero_0_to_5s'],'last_six_seconds_exact_zero':pcm['tail_exact_zero_last_6s'],'all_eight_old_audio_alignment_windows_within_frame':all(w['passed'] for w in windows),'AAC_warning_input_unchanged':sha256(input_video)==item['sha256_before']}
        entry={'key':key,'passed':all(checks.values()),'checks':checks,'output':str(out),'bytes':out.stat().st_size,'sha256':sha256(out),'alac_config':cfg,'native_pcm':pcm,'alac_payload_sha256':payload,'old_audio_alignment_criteria':{'minimum_correlation':.90,'maximum_absolute_lag_seconds':1/60,'scope':'Music content and timing correspondence to differently encoded source; not sample identity or lossless proof. Prior source study: docs/audio/user-flac-analysis.json.'},'old_audio_alignment_windows':windows,'maximum_absolute_alignment_lag_seconds':max(abs(w['lag_seconds']) for w in windows),'full_verify_report':key+'.full-verify.json','packet_report':key+'.packets.json'}
        report['items'].append(entry);saved('verification.json',report);print(json.dumps({'key':key,'passed':entry['passed'],'checks':checks},ensure_ascii=False),flush=True)
    report['source_flac_sha256_after']=sha256(source);report['checks']['source_flac_unchanged']=report['source_flac_sha256_after']==render['audio']['expected_sha256']
    report['preserved_inputs']=preserved_inputs(render);report['checks']['all_seven_original_inputs_unchanged']=report['preserved_inputs']['passed']
    report['scope']='Both complete videos/audio decoded; all video packet payloads and PTS; actual ALAC bit depth from codec cookie; every native PCM byte independently compared with source after trim and literal-zero padding; eight windows against original v3 using 24k analysis copies only. No production resampling; no provenance or platform-upload certification.'
    report['passed']=all(report['checks'].values()) and len(report['items'])==2 and all(x['passed'] for x in report['items']);saved('verification.json',report)
    if not report['passed']: raise SystemExit(1)
    render['passed']=True;render['phase']='complete';render['verification_report']=str(WORK/'verification.json');saved('render.json',render);print('[HiRes verify] Both copies PASSED',flush=True)

if __name__=='__main__':main()

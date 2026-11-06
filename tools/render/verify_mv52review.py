"""Full decode, every-packet timestamps/payloads, AAC windows and protected hashes."""
from pathlib import Path
from fractions import Fraction
import importlib.util, json, re, sys
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'exports/preview-v52-combination'
DATA=ROOT/'data/production-v52review'
EVIDENCE=OUT/'verification'
EVIDENCE.mkdir(exist_ok=True)
spec=importlib.util.spec_from_file_location('copy_aac_checks',ROOT/'exports/preview-v52-lighting/create_review_aac.py')
v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v);v.EVIDENCE=EVIDENCE
plan=json.loads((DATA/'clip-plan.json').read_text())
source=ROOT/plan['audio_source'];source_pcm=v.audio(source);source_packets,source_tb=v.packets(source,'a','source-aac')
packet=Fraction(1024,48000)
selected=sys.argv[1:] or [x['id'] for x in plan['clips']]
report={'passed':False,'review_only':True,'audio_encoding_count':0,'source_audio':str(source),'source_audio_sha256':v.sha(source),'time_basis':plan['time_basis'],'aac_packet_seconds':float(packet),'items':[]}
for c in plan['clips']:
 cached=EVIDENCE/(c['id']+'-verification.json')
 if c['id'] not in selected and cached.exists():
  item=json.loads(cached.read_text());file=Path(item['file'])
  if item.get('passed') and file.exists() and v.sha(file)==item['sha256']:
   item['existing_verified_output_hash_rechecked']=True;report['items'].append(item)
for c in plan['clips']:
 if c['id'] not in selected:continue
 name=c['id'];file=OUT/(name+'-4k60-review-aac.mp4');silent=OUT/(name+'-4k60-silent.mp4')
 if not file.exists():raise RuntimeError('Clip not ready: '+name)
 print('Verifying '+name,flush=True)
 meta=v.stream_metadata(v.FF,file)
 decode=v.checked(['-v','error','-nostats','-i',file,'-map','0:v:0','-an','-fps_mode','passthrough','-progress','pipe:1','-f','null','-'],'full video decode')
 counts=re.findall(r'^frame=(\d+)\s*$',decode.stdout.decode(),re.M);decoded=int(counts[-1]) if counts else None
 vv,tv=v.packets(file,'v',name+'-video');original,to=v.packets(silent,'v',name+'-silent-video');aa,ta=v.packets(file,'a',name+'-aac')
 presentation=v.audio_presentation(file,name);pcm=v.audio(file)
 offset=Fraction(c['start_frame']+300,60);duration=Fraction(c['frames'],60)
 candidates=[i for i,p in enumerate(source_packets) if (p['size'],p['sha256'])==(aa[0]['size'],aa[0]['sha256'])]
 matches=[]
 for i in candidates:
  seq=source_packets[i:i+len(aa)]
  if len(seq)==len(aa) and all((p['size'],p['sha256'])==(q['size'],q['sha256']) for p,q in zip(seq,aa)):matches.append(i)
 assert matches,'AAC was not a contiguous untouched source packet sequence'
 first=min(matches,key=lambda i:abs(source_packets[i]['pts']*source_tb-offset));seq=source_packets[first:first+len(aa)]
 shifts=[p['pts']*source_tb-q['pts']*ta for p,q in zip(seq,aa)]
 presented=next(i for i,p in enumerate(aa) if (p['pts']+p['duration'])*ta>0)
 source_start=seq[presented]['pts']*source_tb;source_end=(seq[-1]['pts']+seq[-1]['duration'])*source_tb
 pts=sorted(p['pts']*tv for p in vv)
 length=min(.3,float(duration)*.18);last=float(duration)-length-.18;windows=[]
 reference=source_pcm[round(float(offset)*v.RATE):]
 for t in [.18,(.18+last)/2,last]:
  result=v.alignment(reference,pcm,v.RATE,t,length)
  result['passed']=abs(result['lag_seconds'])<=float(packet) and result['normalized_correlation']>=.999
  result['low_level_tail']=result['reference_rms_dbfs']<-70
  if result['low_level_tail']:result['evidence_limit']='Very quiet music decay. Exact source packet identities/timestamps are primary synchronization evidence, not perceptual correlation.'
  windows.append(result)
 checks={
  '4k60':meta['resolution']==[3840,2160] and meta['nominal_fps']==60,
  'aac_lc_48k_stereo':'aac (LC)' in meta['audio_stream'] and '48000 Hz, stereo' in meta['audio_stream'],
  'full_video_decode_exact_frames':decoded==c['frames'] and not decode.stderr.strip(),
  'all_video_payloads_identical_to_silent_render':len(vv)==len(original)==c['frames'] and all((p['size'],p['sha256'])==(q['size'],q['sha256']) for p,q in zip(vv,original)),
  'all_video_pts_n_over_60':len(pts)==c['frames'] and all(t==Fraction(i,60) for i,t in enumerate(pts)),
  'all_video_packet_durations_1_over_60':all(p['duration']*tv==Fraction(1,60) for p in vv),
  'video_dts_strict':all(p['dts']<q['dts'] for p,q in zip(vv,vv[1:])),
  'aac_payloads_unchanged_contiguous_source_sequence':True,
  'aac_packet_offsets_exact_body_plus_5':all(x==offset for x in shifts),
  'aac_dts_strict':all(p['dts']<q['dts'] for p,q in zip(aa,aa[1:])),
  'first_presented_aac_boundary_within_one_packet':abs(source_start-offset)<=packet,
  'last_source_aac_end_within_one_packet':abs(source_end-offset-duration)<=packet,
  'decoded_audio_starts_zero':presentation['first_pts_samples']==0,
  'decoded_audio_pts_contiguous':presentation['all_frames_contiguous'] and presentation['all_frames_48k'],
  'decoded_audio_endpoint_within_one_packet':abs(len(pcm)/v.RATE-float(duration))<=float(packet)+1/v.RATE,
  'all_audio_windows_match':all(w['passed'] for w in windows),
 }
 item={**c,'file':str(file),'sha256':v.sha(file),'bytes':file.stat().st_size,'passed':all(checks.values()),'checks':checks,'metadata':meta,'decoded_video_frames':decoded,'audio_packet_count':len(aa),'source_aac_packet_first_index':first,'aac_packet_timebase':str(ta),'source_aac_packet_timebase':str(source_tb),'exact_source_offset':str(offset),'packet_offset_values':[str(x) for x in sorted(set(shifts))],'retained_negative_pts_preroll_packets':presented,'preroll_note':'MP4 skip/edit metadata discards negative-PTS decode preroll; actual decoded first PCM is checked at zero.','first_presented_packet_minus_requested_start_ms':float(source_start-offset)*1000,'last_packet_end_minus_requested_end_ms':float(source_end-offset-duration)*1000,'decoded_audio_endpoint_minus_video_ms':(len(pcm)/v.RATE-float(duration))*1000,'audio_presentation':presentation,'audio_windows':windows}
 v.save(EVIDENCE/(name+'-verification.json'),item);report['items'].append(item);v.save(OUT/'verification-summary.json',report)
 print(json.dumps({'id':name,'passed':item['passed'],'decoded_frames':decoded,'audio_endpoint_ms':item['decoded_audio_endpoint_minus_video_ms'],'lags':[w['lag_seconds'] for w in windows],'failed':[k for k,x in checks.items() if not x]}),flush=True)
protected=[]
for p,h in json.loads((DATA/'protected-baseline.json').read_text())['sha256'].items():protected.append({'path':p,'expected':h,'after':v.sha(ROOT/p)})
for e in json.loads((DATA/'protected-media.json').read_text()):protected.append({'path':e['path'],'expected':e['sha256_before'],'after':v.sha(ROOT/e['path'])})
report['protected_sources']=protected;report['all_protected_unchanged']=all(p['expected']==p['after'] for p in protected)
report['passed']=all(i['passed'] for i in report['items']) and report['all_protected_unchanged']
report['items'].sort(key=lambda i:i['id'])
report['all_five_present']=len(report['items'])==len(plan['clips'])
report['scope']='Every frame decoded, all video/AAC packet timestamps and source payload identities, complete audio decode/presentation PTS, three distributed PCM windows per clip. Visual acceptance requires encoded-frame inspection; final user acceptance is pending.'
v.save(OUT/'verification-summary.json',report)
if not report['passed']:raise SystemExit('Review clip verification failed')
print('All selected clips and protected sources verified',flush=True)

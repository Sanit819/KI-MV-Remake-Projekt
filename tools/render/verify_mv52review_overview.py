from pathlib import Path
from fractions import Fraction
import importlib.util,json,re
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'exports/preview-v52-combination';E=OUT/'verification';E.mkdir(exist_ok=True)
spec=importlib.util.spec_from_file_location('aac_checks',ROOT/'exports/preview-v52-lighting/create_review_aac.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v);v.EVIDENCE=E
plan=json.loads((ROOT/'data/production-v52review/clip-plan.json').read_text());file=OUT/'combined-artwork-review-4k60-SILENT.mp4'
meta=v.stream_metadata(v.FF,file);packets,tb=v.packets(file,'v','overview-video');decoded=v.checked(['-v','error','-nostats','-i',file,'-map','0:v:0','-an','-fps_mode','passthrough','-progress','pipe:1','-f','null','-'],'overview full decode');counts=re.findall(r'^frame=(\d+)\s*$',decoded.stdout.decode(),re.M);n=int(counts[-1]);pts=sorted(p['pts']*tb for p in packets)
segments=[];cursor=0
for c in plan['clips']:
 src,stb=v.packets(OUT/(c['id']+'-4k60-silent.mp4'),'v',c['id']+'-overview-input')
 selected=packets[cursor:cursor+len(src)];offset=Fraction(c['reel_start_frame'],60)
 payloads=len(src)==len(selected)==c['frames'] and all((p['size'],p['sha256'])==(q['size'],q['sha256']) for p,q in zip(src,selected))
 times=all(p['pts']*stb+offset==q['pts']*tb for p,q in zip(src,selected))
 segments.append({'id':c['id'],'video_start_frame':c['reel_start_frame'],'video_end_frame_exclusive':c['reel_end_frame_exclusive'],'start_pts_seconds':str(offset),'all_payloads_identical':payloads,'all_pts_shift_exact':times})
 cursor+=len(src)
checks={'no_audio_stream':not meta['audio_stream'],'4k60':meta['resolution']==[3840,2160] and meta['nominal_fps']==60,'complete_decode_1425':n==1425 and not decoded.stderr.strip(),'every_pts_n_over_60':len(pts)==1425 and all(t==Fraction(i,60) for i,t in enumerate(pts)),'every_duration_1_over_60':all(p['duration']*tb==Fraction(1,60) for p in packets),'dts_strict':all(p['dts']<q['dts'] for p,q in zip(packets,packets[1:])),'exact_23_75_seconds':pts[-1]+Fraction(1,60)==Fraction(95,4),'every_packet_same_as_native_clip':all(s['all_payloads_identical'] for s in segments),'every_segment_pts_shift_exact':all(s['all_pts_shift_exact'] for s in segments),'cut_frames_exact':[s['video_start_frame'] for s in segments[1:]]==[194,623,1191,1245]}
report={'passed':all(checks.values()),'file':str(file),'sha256':v.sha(file),'bytes':file.stat().st_size,'silent':True,'audio_encoding_count':0,'video_reencoding_count':0,'frames':n,'duration_seconds':23.75,'checks':checks,'segments':segments,'metadata':meta,'note':'Silent overview intentionally avoids accumulating AAC preroll/packet-tail duration at cuts. Hear the five independently verified AAC clips for music.'}
v.save(OUT/'overview-verification.json',report);print(json.dumps({'passed':report['passed'],'checks':checks,'sha256':report['sha256']}))
if not report['passed']:raise SystemExit('Overview verification failed')

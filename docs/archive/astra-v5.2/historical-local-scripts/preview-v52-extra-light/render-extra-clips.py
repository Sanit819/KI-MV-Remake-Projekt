"""Three isolated, review-only 4K60 clips; existing AAC packet copy."""
from pathlib import Path
from fractions import Fraction
import importlib.util,json,re,subprocess,hashlib,shutil,sys

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
STAGING=ROOT/'exports/preview-v52-combination/extra-light'
EVIDENCE=OUT/'clip-evidence'
EXPECTED_MODULE='0202e43e3037f21e71bd61f3cc4bf6df895f0063808921e06c177d6b8a454cec'
spec=importlib.util.spec_from_file_location('aac_review_helpers',ROOT/'exports/preview-v52-lighting/create_review_aac.py')
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
helper.EVIDENCE=EVIDENCE
FF=helper.FF;AAC=helper.AAC;RATE=helper.RATE;PACKET=helper.PACKET
def save(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf-8')
def sha(p):return helper.sha(p)
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def checked(args,label):return helper.checked(args,label)
def run(args):
 print('Running '+str(args[0]),flush=True)
 subprocess.run(list(map(str,args)),cwd=ROOT,check=True)

def main():
 EVIDENCE.mkdir(exist_ok=True);STAGING.mkdir(exist_ok=True)
 candidate=read(ROOT/'data/production-v52review/candidate-map.json')
 if not candidate['final_map_confirmed']:raise SystemExit('Wait: root final candidate map not yet confirmed; no render started.')
 if sha(ROOT/'src/mv52review/extra-light.js')!=EXPECTED_MODULE:raise SystemExit('Extra-light source changed after validated final hash.')
 protected_paths=[AAC,helper.FORMAL,helper.FORMAL_V5,ROOT/'src/mv52/main.js',ROOT/'src/mv52/lighting.js',ROOT/'src/mv5cat/main.js',ROOT/'assets/astra/v12-approved-cat/manifest.json']
 protected=[{'path':str(p),'before':sha(p)} for p in protected_paths]
 assert protected[0]['before']=='65d6ebc725912a6b8c2eaee2c378cde3eab204342b025d127dd829890cf50e17'
 assert protected[1]['before']=='19f4a76abfc61c1990d056d018e164ec61e93d147af1436f244cfa57261b7407'
 save(EVIDENCE/'protected-before.json',protected)
 shots=[s for s in read(ROOT/'data/production-v5/timeline.json')['shots'] if s['id'] in ['R02','R14','R52']]
 report={'passed':False,'review_only':True,'full_film_export':False,'video_render_entry':'src/mv52review/index.html?lighting=1','module_sha256':EXPECTED_MODULE,'audio_source':str(AAC),'audio_encoding_count':0,'video_encode_count_per_clip':1,'video_remux_encode_count':0,'aac_packet_duration_seconds':float(PACKET),'time_mapping':'body frame/60 + 5s warning offset; warning not included in review clips','items':[],'protected':protected}
 for s in shots:
  id=s['id'];frames=s['end_frame']-s['start_frame'];duration=Fraction(frames,60);full_start=Fraction(s['start_frame']+300,60)
  staged=STAGING/f'{id}-extra-light-4k60-silent.mp4'
  silent=OUT/staged.name;movie=OUT/f'{id}-extra-light-4k60-review-aac.mp4'
  if not staged.exists():
   run(['node','tools/render/export_mv52review.mjs','--width','3840','--height','2160','--fps','60','--start-frame',s['start_frame'],'--end-frame',s['end_frame'],'--query','lighting=1','--video-only','true','--out',staged.relative_to(ROOT)])
  assert staged.exists() and staged.with_suffix('.render.json').exists(),'Staging render incomplete'
  if not silent.exists():shutil.copy2(staged,silent)
  assert sha(staged)==sha(silent),'Review staging copy differs'
  render_note=staged.with_suffix('.render.json')
  if not silent.with_suffix('.render.json').exists():shutil.copy2(render_note,silent.with_suffix('.render.json'))
  command=['-v','warning','-n','-i',silent,'-ss',f'{float(full_start):.9f}','-i',AAC,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','copy','-t',f'{float(duration):.9f}','-video_track_timescale','60000','-disposition:a:0','default','-metadata','comment=Isolated scene-attached extra light review; new silent H264 render plus untouched existing AAC packets; no formal full-film output','-movflags','+faststart',movie]
  save(EVIDENCE/f'{id}-mux-command.json',list(map(str,[FF,*command])))
  if not movie.exists():
   r=checked(command,'mux '+id);(EVIDENCE/f'{id}-mux.log').write_bytes(r.stderr)
  report['items'].append({'id':id,'body_start':float(Fraction(s['start_frame'],60)),'body_end':float(Fraction(s['end_frame'],60)),'full_start':float(full_start),'full_start_fraction':str(full_start),'frames':frames,'duration':float(duration),'duration_fraction':str(duration),'staging':str(staged.relative_to(ROOT)),'silent_copy':str(silent.relative_to(ROOT)),'staging_copy_identical':True,'file':str(movie.relative_to(ROOT)),'silent_sha256':sha(silent),'render_evidence':str(render_note.relative_to(ROOT))})
  save(OUT/'clip-delivery.json',report)
  print('Rendered/remuxed '+id,flush=True)
 src_audio=helper.audio(AAC);source_packets,source_tb=helper.packets(AAC,'a','source-existing-aac')
 for item in report['items']:
  id=item['id'];silent=ROOT/item['silent_copy'];movie=ROOT/item['file'];duration=Fraction(item['duration_fraction']);offset=Fraction(item['full_start_fraction'])
  meta=helper.stream_metadata(FF,movie)
  r=checked(['-v','error','-nostats','-i',movie,'-map','0:v:0','-an','-fps_mode','passthrough','-progress','pipe:1','-f','null','-'],'complete video decode')
  counts=re.findall(r'^frame=(\d+)\s*$',r.stdout.decode(),re.M);decoded=int(counts[-1]) if counts else None;assert not r.stderr.strip()
  original_video,tb_in=helper.packets(silent,'v',id+'-silent-video');output_video,tb_out=helper.packets(movie,'v',id+'-output-video');output_aac,tb_aac=helper.packets(movie,'a',id+'-output-aac')
  presentation=helper.audio_presentation(movie,id);pcm=helper.audio(movie);reference=src_audio[round(float(offset)*RATE):]
  windows=[]
  for t in [.2,item['duration']*.4,item['duration']*.73]:
   length=min(.3,item['duration']*.2);a=helper.alignment(reference,pcm,RATE,t,length);a['passed']=abs(a['lag_seconds'])<=float(PACKET) and a['normalized_correlation']>=.999;windows.append({'clip_start':t,'length':length,'source_start':float(offset)+t,**a})
  candidates=[i for i,p in enumerate(source_packets) if (p['size'],p['sha256'])==(output_aac[0]['size'],output_aac[0]['sha256'])]
  starts=[]
  for i in candidates:
   seq=source_packets[i:i+len(output_aac)]
   if len(seq)==len(output_aac) and all((x['size'],x['sha256'])==(y['size'],y['sha256']) for x,y in zip(seq,output_aac)):starts.append(i)
  assert starts,'AAC packets are not a contiguous untouched source sequence'
  first=min(starts,key=lambda i:abs(float(source_packets[i]['pts']*source_tb-offset)));selected=source_packets[first:first+len(output_aac)]
  audio_offsets=[x['pts']*source_tb-y['pts']*tb_aac for x,y in zip(selected,output_aac)]
  packet_start=selected[0]['pts']*source_tb;packet_end=(selected[-1]['pts']+selected[-1]['duration'])*source_tb
  presented=next(i for i,p in enumerate(output_aac) if (p['pts']+p['duration'])*tb_aac>0);first_presented=selected[presented]['pts']*source_tb
  pts=sorted(p['pts']*tb_out for p in output_video);audio_duration=len(pcm)/RATE
  checks={'metadata_4k60':meta['resolution']==[3840,2160] and meta['nominal_fps']==60,'existing_AAC_LC_48k_stereo':'aac (LC)' in meta['audio_stream'] and '48000 Hz, stereo' in meta['audio_stream'],'full_video_decode_exact_frames':decoded==item['frames'],'full_audio_decode':len(pcm)>0,'all_video_packets_identical_to_silent_render':len(original_video)==len(output_video)==item['frames'] and all((x['size'],x['sha256'])==(y['size'],y['sha256']) for x,y in zip(original_video,output_video)),'video_pts_n_over_60':all(t==Fraction(i,60) for i,t in enumerate(pts)),'video_packet_duration_1_over_60':all(p['duration']*tb_out==Fraction(1,60) for p in output_video),'video_dts_increasing':all(x['dts']<y['dts'] for x,y in zip(output_video,output_video[1:])),'aac_payloads_contiguous_source':True,'aac_pts_offset_exact_requested_fraction':all(x==offset for x in audio_offsets),'aac_dts_increasing':all(x['dts']<y['dts'] for x,y in zip(output_aac,output_aac[1:])),'first_presented_packet_boundary_within_one_aac_packet':abs(first_presented-offset)<=PACKET,'first_decoded_audio_pts_zero':presentation['first_pts_samples']==0,'decoded_audio_contiguous_48k':presentation['all_frames_contiguous'] and presentation['all_frames_48k'],'last_packet_boundary_within_one_aac_packet':abs(packet_end-offset-duration)<=PACKET,'decoded_audio_endpoint_within_one_aac_packet':abs(audio_duration-float(duration))<=float(PACKET)+1/RATE,'all_three_windows_aligned':all(w['passed'] for w in windows)}
  item.update(passed=all(checks.values()),checks=checks,sha256=sha(movie),bytes=movie.stat().st_size,metadata=meta,decoded_frames=decoded,decoded_audio_seconds=audio_duration,audio_endpoint_minus_video_ms=(audio_duration-float(duration))*1000,physical_first_source_packet_seconds=float(packet_start),physical_first_packet_minus_trim_ms=float(packet_start-offset)*1000,inaudible_preroll_packet_count=presented,first_presented_packet_source_seconds=float(first_presented),first_presented_packet_minus_trim_ms=float(first_presented-offset)*1000,last_source_packet_end_seconds=float(packet_end),last_packet_end_minus_requested_end_ms=float(packet_end-offset-duration)*1000,audio_pts_offsets_fractions=sorted(set(map(str,audio_offsets))),decoded_audio_presentation=presentation,audio_alignment_windows=windows)
  save(EVIDENCE/f'{id}-verify.json',item);save(OUT/'clip-delivery.json',report)
  print(json.dumps({'id':id,'passed':item['passed'],'audio_endpoint_ms':item['audio_endpoint_minus_video_ms'],'failed':[k for k,v in checks.items() if not v]},ensure_ascii=False),flush=True)
  for t in [.25,item['duration']*.5,item['duration']-.2]:
   image=OUT/f'{id}-encoded-{t:.3f}.png'
   if not image.exists():checked(['-v','error','-n','-ss',f'{t:.6f}','-i',movie,'-frames:v','1',image],'extract encoded still')
 for item in protected:item['after']=sha(Path(item['path']));item['unchanged']=item['before']==item['after']
 report['all_protected_unchanged']=all(x['unchanged'] for x in protected);report['passed']=all(x['passed'] for x in report['items']) and report['all_protected_unchanged']
 report['scope']='Three whole-shot 4K60 review renders; complete video/audio decode; every video/AAC packet and PTS checked; three distributed AAC alignment windows per clip; encoded still extraction. No whole-film output or claim of continuous human hearing.'
 save(OUT/'clip-delivery.json',report)
 if not report['passed']:raise SystemExit('Verification failed; inspect clip-delivery.json')
 print('ALL THREE EXTRA-LIGHT REVIEW CLIPS VERIFIED',flush=True)

if __name__=='__main__':main()

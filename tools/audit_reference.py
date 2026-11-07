"""Reproducible frame coverage and cadence audit; no inferred manual viewing."""
from pathlib import Path
import json, hashlib, subprocess
import numpy as np

R=Path(__file__).resolve().parents[1]
def read(p): return json.loads((R/p).read_text(encoding='utf-8'))
def write(p,x): (R/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
idx=read('analysis/frame-index.json'); probe=read('analysis/probe.json')
rows=idx['frames']; n=len(rows); fps=idx['fps']
pts=[float(f['best_effort_timestamp_time']) for f in probe['frames']]
assert len(pts)==n and all(b>a for a,b in zip(pts,pts[1:]))
missing=[i for i in range(n) if not (R/f'frames/f{i:06d}.jpg').is_file()]
assert not missing, missing[:10]
for row,t in zip(rows,pts): row['pts_seconds']=t
idx['timestamp_note']='PTS from ffprobe; zero-based index/fps differs only by source millisecond quantization.'
write('analysis/frame-index.json',idx)
v=np.array([r['mean_abs_change'] for r in rows]); threshold=.05
starts=[0]+[i for i in range(1,n) if v[i]>threshold]
runs=[{'start_frame':a,'end_frame_exclusive':b,'start_pts':pts[a],
       'frame_count':b-a,'seconds_nominal':(b-a)/fps}
      for a,b in zip(starts,starts[1:]+[n])]
write('analysis/change-runs.json',{'threshold':threshold,'method':'213x120 grayscale adjacent-frame mean absolute difference > threshold; not exact image deduplication, original drawing count, or shot detection. Compression noise and text changes can split runs.','runs':runs})
hist={str(k):sum(x['frame_count']==k for x in runs) for k in sorted({r['frame_count'] for r in runs})}
source=read('source/source.json')
write('analysis/source-metadata.json',{k:source[k] for k in ['source_page','fetched_utc','bvid','aid','cid','title','uploader','published_unix','upload_dimensions','api_duration','playback_timelength_ms','auth','video','audio']})
ff=Path(r'D:\myskills\updream\vocaloid-style-mv-pipeline\_tools\ffmpeg\bin\ffmpeg.exe')
for p in ['source/video-avc.mp4','source/audio.m4a']:
    subprocess.run([str(ff),'-v','error','-i',str(R/p),'-f','null','-'],check=True)
subprocess.run([str(ff),'-v','error','-y','-i',str(R/'source/video-avc.mp4'),'-i',str(R/'source/audio.m4a'),'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',str(R/'source/reference.mp4')],check=True)
summary={'frame_count':n,'first_frame':0,'last_frame':n-1,'fps':fps,'nominal_video_duration_seconds':n/fps,'probe_video_duration_seconds':float(probe['streams'][0]['duration']),'first_pts':pts[0],'last_pts':pts[-1],'max_abs_pts_vs_index_seconds':float(np.max(np.abs(np.array(pts)-np.arange(n)/fps))),'missing_frame_images':missing,'all_pts_strictly_increasing':True,'full_video_audio_decode':'passed','near_unchanged_adjacent_frames_at_threshold':int((v[1:]<=threshold).sum()),'compared_adjacent_pairs':n-1,'change_threshold':threshold,'change_run_count':len(runs),'change_run_lengths_frames':hist,'threshold_sensitivity_changed_pairs':{str(t):int((v[1:]>t).sum()) for t in [.05,.1,.2,.5,1,2,5,10,20,40]},'limitations':['Thumbnail-level luma differences do not count unique original drawings.','No claim of manual listening or beat alignment.','854x480 platform rendition, not production source artwork.']}
if (R/'analysis/audio-envelope.json').exists():
    au=read('analysis/audio-envelope.json'); summary['decoded_audio_duration_seconds']=au['duration']
write('analysis/technical-audit.json',summary)
print(json.dumps(summary,ensure_ascii=True,indent=2))

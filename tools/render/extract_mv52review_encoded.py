"""Extract actual encoded frames at every candidate phase and key cut boundary."""
from pathlib import Path
import subprocess,json,hashlib
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'exports/preview-v52-combination';DEST=OUT/'encoded-stills';DEST.mkdir(exist_ok=True)
FF=ROOT/'.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'
plan=json.loads((ROOT/'data/production-v52review/clip-plan.json').read_text());selection={'01-boundary':[20,92,160],'02-waveform':[40,137,138,230,308,309,400],'03-refusal-book':[25,90,245,405,510],'04-wrist':[8,28,45],'05-ending-expression':[25,90,150]};records=[];pending=[]
for c in plan['clips']:
 file=OUT/(c['id']+'-4k60-review-aac.mp4')
 if not file.exists():pending.append(c['id']);continue
 frames=selection[c['id']];pattern=DEST/(c['id']+'-%02d.png');existing=[DEST/(c['id']+f'-{i+1:02d}.png') for i in range(len(frames))]
 if not all(p.exists() for p in existing):
  expr='+'.join('eq(n\\,'+str(f)+')' for f in frames)
  command=[str(FF),'-hide_banner','-loglevel','error','-n','-i',str(file),'-an','-vf','select='+expr,'-fps_mode','passthrough','-frames:v',str(len(frames)),str(pattern)]
  p=subprocess.run(command,capture_output=True)
  if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace'))
 for i,f in enumerate(frames):
  p=existing[i];records.append({'clip':c['id'],'file':str(p),'encoded_frame':f,'clip_time':f/60,'body_frame':c['start_frame']+f,'body_time':(c['start_frame']+f)/60,'full_film_time':(c['start_frame']+f)/60+5,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(DEST/'index.json').write_text(json.dumps({'records':records,'pending':pending,'scope':'Actual encoded frames; no overlays or reconstruction'},indent=2)+'\n')
print(json.dumps({'encoded_stills':len(records),'pending':pending}))

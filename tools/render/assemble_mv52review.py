"""Join the five video-only native clips without audio or video re-encoding."""
from pathlib import Path
import subprocess,json
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'exports/preview-v52-combination'
plan=json.loads((ROOT/'data/production-v52review/clip-plan.json').read_text())
ff=ROOT/'.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'
lines=[]
for c in plan['clips']:
 file=OUT/(c['id']+'-4k60-silent.mp4');assert file.exists(),file
 lines.extend(["file '"+file.as_posix().replace("'","'\\''")+"'",f"duration {c['frames']/60:.12f}"])
concat=OUT/'visual-overview-concat.txt';concat.write_text('\n'.join(lines)+'\n',encoding='utf-8')
result=OUT/'combined-artwork-review-4k60-SILENT.mp4'
command=[str(ff),'-hide_banner','-loglevel','warning','-n','-f','concat','-safe','0','-auto_convert','0','-i',str(concat),'-map','0:v:0','-an','-c:v','copy','-video_track_timescale','60000','-movflags','+faststart','-metadata','comment=Silent visual overview; five root-selected review clips; no warning; 1425 native 4K60 frames; independent AAC clips contain the original music',str(result)]
if result.exists():raise RuntimeError('Refusing to overwrite overview')
p=subprocess.run(command,capture_output=True);(OUT/'visual-overview-mux.log').write_bytes(p.stderr)
(OUT/'visual-overview-command.json').write_text(json.dumps(command,indent=2)+'\n')
if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace'))
print(str(result))

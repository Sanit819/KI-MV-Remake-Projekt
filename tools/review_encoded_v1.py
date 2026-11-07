"""Extract encoded-video review samples. This is sampling, not human full-frame review."""
import json
import math
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw

PROJECT = Path(__file__).resolve().parents[1]
FFMPEG = PROJECT.parent / 'vocaloid-style-mv-pipeline/_tools/ffmpeg/bin/ffmpeg.exe'
VIDEO = PROJECT / 'exports/v1/taiyoukei-disco-v1-720p30-flac.mkv'
OUT = PROJECT / 'exports/v1/encoded-review'
OUT.mkdir(parents=True, exist_ok=True)
commands = []

def run(args):
    commands.append([str(x) for x in args])
    subprocess.run(args, check=True, capture_output=True)

run([FFMPEG, '-v', 'error', '-y', '-i', VIDEO, '-map', '0:v:0',
     '-vf', "select='not(mod(n,60))',scale=640:360", '-fps_mode', 'vfr',
     OUT / 'sample-%03d.png'])
files = sorted(OUT.glob('sample-*.png'))
assert len(files) == 102, len(files)
records = [{'frame': i*60, 'time': i*2, 'path': str(p)} for i,p in enumerate(files)]
for off in range(0,len(records),12):
    chunk = records[off:off+12]
    sheet = Image.new('RGB',(1536,math.ceil(len(chunk)/4)*240),'#323232')
    draw = ImageDraw.Draw(sheet)
    for j,row in enumerate(chunk):
        im = Image.open(row['path']).convert('RGB').resize((384,216),Image.Resampling.LANCZOS)
        x,y = (j%4)*384,(j//4)*240
        sheet.paste(im,(x,y))
        draw.text((x+6,y+220),f"{row['time']:03d}s | frame {row['frame']}",fill='white')
    sheet.save(OUT/f'sheet-{off//12:02d}.jpg',quality=94)

keys = [12,41,74,139.5,143,161.8,185.8,187.2,189,190.1,192,193.5]
for t in keys:
    run([FFMPEG,'-v','error','-y','-ss',str(t),'-i',VIDEO,'-map','0:v:0',
         '-frames:v','1',OUT/f'key-{t:07.3f}.png'])
(OUT/'coverage.json').write_text(json.dumps({
    'scope':'102 encoded frames at 2s intervals plus 12 full-resolution critical samples; extraction does not claim visual review',
    'records':records,'critical_seconds':keys,'commands':commands
},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'samples':len(records),'critical':len(keys),'out':str(OUT)}))

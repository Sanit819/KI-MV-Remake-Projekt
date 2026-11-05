"""Exact frame-index extraction from the final encoded v4 upload, for visual QA.

This builds contact sheets; it does not mark them visually reviewed or certify
motion, flash safety, audio, or anatomical correctness.
"""
from pathlib import Path
import json, subprocess, hashlib
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[2]
FF=ROOT/'.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'
VIDEO=ROOT/'exports/astra-world-execute-me-full-v4-warning-hires-4k60.mp4'
OUT=ROOT/'exports/qa-v4-encoded'
timeline=json.loads((ROOT/'data/production-v4/timeline.json').read_text(encoding='utf-8'))
frames={30:'warning',299:'warning-last',300:'body-first',13399:'last-frame'}
for s in timeline['shots']:
    frames[300+(s['start_frame']+s['end_frame']-1)//2]=s['id']+'-mid'
for t in [8,9.5,11,82.5,83.5,84.6,92.7,94.4,96,115,116,117,118.5,120,121.6,122,123.1,124.3,125,152.5,156.8,159.9,162.2,164,167.6,170.3,171.8,175.7,177.2,179.8,180.7,182.3,184.5,186.8,189,190.3,204.7,208,209.7,210.6,211.1,212.5,214.5,216.5,218.2]:
    frames[300+round(t*60)]=f'song-{t:.3f}'
ordered=sorted(frames)
OUT.mkdir(parents=True,exist_ok=True)
def balanced_selection(numbers):
    # Avoid FFmpeg expression-parser depth limits from a long left-associative sum.
    if len(numbers)==1:return f'eq(n,{numbers[0]})'
    mid=len(numbers)//2
    return f'({balanced_selection(numbers[:mid])}+{balanced_selection(numbers[mid:])})'
select=balanced_selection(ordered)
args=[str(FF),'-hide_banner','-threads','2','-loglevel','error','-y','-i',str(VIDEO),'-an','-vf',f"select='{select}',scale=1920:1080",'-fps_mode','passthrough','-q:v','2','-start_number','0',str(OUT/'frame-%03d.jpg')]
(OUT/'command.json').write_text(json.dumps(args,indent=2),encoding='utf-8')
with (OUT/'decode.log').open('wb') as log:subprocess.run(args,stdout=log,stderr=log,check=True)
rows=[]
for i,n in enumerate(ordered):
    file=OUT/f'frame-{i:03d}.jpg'
    with Image.open(file) as im:assert im.size==(1920,1080)
    rows.append({'label':frames[n],'frame':n,'upload_seconds':n/60,'song_seconds':(n-300)/60 if n>=300 else None,'file':file.name})
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',18)
for offset in range(0,len(rows),12):
    group=rows[offset:offset+12];sheet=Image.new('RGB',(1440,4*305+45),'#15101d');draw=ImageDraw.Draw(sheet)
    draw.text((15,12),f'ACTUAL V4 ENCODED / frames {offset+1}-{offset+len(group)} / upload timeline',font=font,fill='#f7ead7')
    for j,row in enumerate(group):
        x=(j%3)*480;y=45+(j//3)*305
        with Image.open(OUT/row['file']) as im:sheet.paste(im.resize((480,270),Image.Resampling.LANCZOS),(x,y))
        draw.text((x+6,y+277),f"{row['label']} | f{row['frame']} | {row['upload_seconds']:.2f}s",font=font,fill='#b88ce8')
    sheet.save(OUT/f'sheet-{offset//12+1:02d}.jpg',quality=93)
report={'extraction_succeeded':True,'visually_reviewed':False,'source':str(VIDEO),'source_sha256':hashlib.file_digest(VIDEO.open('rb'),'sha256').hexdigest(),'sample_count':len(rows),'scope':'FFmpeg selects exact decoded zero-based frame indices, then resizes to 1080p. Contact sheets are 480px thumbnails. Not a manual review by this script.','frames':rows}
(OUT/'frames.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'extracted':len(rows),'output':str(OUT)}),flush=True)

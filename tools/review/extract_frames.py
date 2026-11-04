"""Decode every available frame; make same-music-time shot comparison boards. No film editing."""
from pathlib import Path
import json, subprocess, hashlib, math, concurrent.futures, shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'exports/shot-review-20261105'
DOC=ROOT/'docs/shot-review-20261105'
FF=ROOT/'.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'
REF=ROOT.parent/'references/video-review/BV186pc65E68-video-480p30.mp4'
OUR=ROOT/'exports/astra-world-execute-me-full-v1-1080p60.mp4'
idx=json.loads((DOC/'shot-index.json').read_text(encoding='utf-8'))
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
head=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',23)
for p in [OUT/'ref',OUT/'ours',OUT/'boards',OUT/'cuts']: p.mkdir(parents=True,exist_ok=True)
def extract(pair):
    key,video=pair
    files=list((OUT/key).glob('*.jpg'))
    if not files:
        with (OUT/f'decode-{key}.log').open('w',encoding='utf-8') as log:
            subprocess.run([str(FF),'-hide_banner','-threads','2','-i',str(video),'-an','-vf','scale=640:360,setsar=1','-q:v','3','-fps_mode','passthrough','-start_number','0',str(OUT/key/'%06d.jpg')],stdout=log,stderr=log,check=True)
    files=sorted((OUT/key).glob('*.jpg'))
    print(f'{key}: {len(files)} decoded frames',flush=True)
    return key,len(files)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    counts=dict(pool.map(extract,[('ref',REF),('ours',OUR)]))
# All-frame numerical features: evidence for motion/contrast selection, not semantic judgement.
def measure(key):
    rows=[]; prev=None
    for n in range(counts[key]):
        a=np.asarray(Image.open(OUT/key/f'{n:06d}.jpg').convert('L').resize((160,90)),dtype=np.float32)
        edge=np.abs(np.diff(a,axis=0,append=a[-1:]))+np.abs(np.diff(a,axis=1,append=a[:,-1:]))
        total=edge.sum()+1e-6
        y,x=np.mgrid[:90,:160]
        row=[n,round(float(a.mean()),3),round(float(a.std()),3),round(float((a>180).mean()),5),round(float((a<45).mean()),5),round(float((edge*x).sum()/total/159),5),round(float((edge*y).sum()/total/89),5),round(float(np.abs(a-prev).mean()),3) if prev is not None else 0]
        rows.append(row);prev=a
    return rows
refmetrics=measure('ref')
(OUT/'ref-frame-metrics.json').write_text(json.dumps({'columns':['frame','mean_luma','contrast_std','bright_fraction_gt180','dark_fraction_lt45','edge_centroid_x','edge_centroid_y','frame_difference_mean'],'fps':30,'scope':'Every decoded reference frame at 160x90 analysis resolution. Statistics are not composition or camera-motion labels.','rows':refmetrics}),encoding='utf-8')
def pic(key,n):
    return Image.open(OUT/key/f'{max(0,min(counts[key]-1,n)):06d}.jpg').convert('RGB')
records=[]
for s in idx['shots']:
    a=max(0,math.ceil(s['reference_player_start']*30))
    b=min(counts['ref'],math.ceil(s['reference_player_end']*30))
    if b<=a: continue
    chosen=sorted(set(min(b-1,a+round((b-a-1)*q)) for q in (.12,.5,.88)))
    while len(chosen)<3: chosen.append(chosen[-1])
    peak=max(range(a,b),key=lambda n:refmetrics[n][7])
    board=Image.new('RGB',(1440,650),'#18151f');d=ImageDraw.Draw(board)
    d.text((12,8),f"{s['review_id']}  {s['id']}   |   SAME MUSIC TIME",font=head,fill='#e4d8f5')
    ownnums=[]
    for j,n in enumerate(chosen):
        t=n/30
        own_t=t-idx['reference_preroll_s']+idx['astra_offset_s']
        m=round(own_t*60)
        ownnums.append(m if own_t>=0 else None)
        board.paste(pic('ref',n).resize((480,270)),(j*480,44))
        d.text((j*480+9,319),f"REF f{n:04d} | player {t:.3f}s",font=font,fill='#ffbb8e')
        if own_t>=0:
            board.paste(pic('ours',m).resize((480,270)),(j*480,349))
            d.text((j*480+9,623),f"ASTRA f{m:05d} | song {m/60:.3f}s",font=font,fill='#c7abea')
        else:
            d.text((j*480+15,470),'No corresponding ASTRA preroll',font=font,fill='#b7b0c5')
    board.save(OUT/'boards'/f"{s['review_id']}.jpg",quality=91)
    # Exact consecutive frames straddling each source cut. No invented intermediate frames.
    cut=Image.new('RGB',(1440,208),'#18151f');dc=ImageDraw.Draw(cut)
    dc.text((10,5),f"{s['review_id']} boundary: six consecutive source frames",font=head,fill='white')
    cutnums=[max(0,min(counts['ref']-1,a+k)) for k in range(-3,3)]
    for j,n in enumerate(cutnums):
        cut.paste(pic('ref',n).resize((240,135)),(j*240,42))
        dc.text((j*240+6,180),f"f{n}  {n/30:.3f}s",font=font,fill='#ffbb8e')
    # Second strip: six frames around the largest numerical change in the shot.
    full=Image.new('RGB',(1440,385),'#18151f');full.paste(cut.crop((0,0,1440,208)),(0,0));dd=ImageDraw.Draw(full)
    peaknums=[max(a,min(b-1,peak+k)) for k in range(-3,3)]
    for j,n in enumerate(peaknums):
        full.paste(pic('ref',n).resize((240,135)),(j*240,214));dd.text((j*240+6,354),f"peak f{n} {n/30:.3f}s",font=font,fill='#d2c0f2')
    full.save(OUT/'cuts'/f"{s['review_id']}.jpg",quality=90)
    record={**s,'reference_first_frame':a,'reference_end_frame_exclusive':b,'keyframes':chosen,'astra_keyframes':ownnums,'max_change_frame':peak,'max_change_value':refmetrics[peak][7],'board':f"boards/{s['review_id']}.jpg",'boundary_strip':f"cuts/{s['review_id']}.jpg"}
    records.append(record)
manifest={'reference':str(REF),'astra':str(OUR),'decoded_frames':counts,'reference_fps':30,'astra_fps':60,'preview_size':[640,360],'comparison_mapping':'astra_song=reference_player-5-0.08350936080898314; rounded to nearest native frame. Same musical time, not identical shot boundaries.','boundaries':'Current reference scene definitions at commit 93ac637; visually checked sampled boundaries, not an automatic guarantee that published encoding exactly matches every source revision.','sha256':{key:hashlib.sha256(p.read_bytes()).hexdigest() for key,p in [('reference',REF),('astra',OUR)]},'shots':records}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(DOC/'frame-index.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# Small overviews help verify the whole catalog without substituting for per-shot boards.
for base in range(0,len(records),12):
    ss=records[base:base+12];sheet=Image.new('RGB',(1440,4*240),'#18151f');dr=ImageDraw.Draw(sheet)
    for k,s in enumerate(ss):
        x=(k%3)*480;y=(k//3)*240
        sheet.paste(pic('ref',s['keyframes'][1]).resize((400,225)),(x,y))
        dr.text((x+5,y+5),f"{s['review_id']} {s['id']}",font=font,fill='#fff5e7',stroke_width=2,stroke_fill='#15121b')
    sheet.save(OUT/f'overview-{base//12+1:02d}.jpg',quality=90)
for folder in ('boards','cuts'):
    shutil.copytree(OUT/folder,DOC/folder,dirs_exist_ok=True)
print(json.dumps({'shots':len(records),'frames':counts,'boards':str(OUT/'boards'),'reference_all_frame_metrics':len(refmetrics)}),flush=True)

"""All-frame reference analysis and same-music comparisons; never edits production media."""
from pathlib import Path
import concurrent.futures, hashlib, json, math, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'exports/reference-BV1xCai6aE9g-review'
DOC=ROOT/'docs/reference-BV1xCai6aE9g'
REF=ROOT.parent/'references/gpt-astra-BV1xCai6aE9g/reference-video-avc.mp4'
OUR=ROOT/'exports/astra-world-execute-me-full-v4-1080p60.mp4'
FF=ROOT/'.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'
FPS={'reference':24,'astra':60}
EXPECTED={'reference':5085,'astra':13100}
START={'reference':0.0,'astra':0.0}
# Eight-window fit against the actual v4 base audio. Reference first decoded PTS is 0.
# Strict .95 waveform gate failed (minimum .9335); mapping is for 24fps visual correspondence only.
SLOPE=1.0000226265733476
OFFSET=-0.0690719136281559
FONT=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
TITLE=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',24)
for p in [OUT,DOC,OUT/'reference',OUT/'astra',DOC/'overview',DOC/'boards',DOC/'motion']:
    p.mkdir(parents=True,exist_ok=True)

def decode(item):
    key,source=item
    existing=list((OUT/key).glob('*.jpg'))
    if len(existing)!=EXPECTED[key]:
        if existing: raise RuntimeError(f'Incomplete existing decode for {key}; preserve and inspect before rerun')
        with (OUT/f'decode-{key}.log').open('w',encoding='utf8') as log:
            subprocess.run([str(FF),'-hide_banner','-nostdin','-threads','3','-i',str(source),'-an','-vf','scale=852:480:flags=lanczos,setsar=1','-q:v','3','-fps_mode','passthrough','-start_number','0',str(OUT/key/'%06d.jpg')],stdout=log,stderr=log,check=True)
    count=len(list((OUT/key).glob('*.jpg')))
    if count!=EXPECTED[key]: raise RuntimeError(f'{key}: expected {EXPECTED[key]}, got {count}')
    print(f'{key}: {count} native-rate frames decoded',flush=True)
    metric_file=OUT/f'{key}-metrics.json'
    source_sha=hashlib.sha256(source.read_bytes()).hexdigest()
    if metric_file.exists():
        cached=json.loads(metric_file.read_text(encoding='utf8'))
        if cached.get('source_sha256')==source_sha and cached.get('frames')==count:
            return key,cached
    # Full-frame numerical coverage at fixed analysis resolution; these are not aesthetic scores.
    raw=subprocess.run([str(FF),'-v','error','-threads','2','-i',str(source),'-an','-vf','scale=128:72,format=gray','-fps_mode','passthrough','-f','rawvideo','-'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True).stdout
    arr=np.frombuffer(raw,np.uint8).reshape((-1,72,128))
    if len(arr)!=count: raise RuntimeError('Metric frame count mismatch')
    yy,xx=np.mgrid[:72,:128];rows=[];previous=None
    for n,frame in enumerate(arr):
        a=frame.astype(np.float32)
        edge=np.abs(np.diff(a,axis=0,append=a[-1:]))+np.abs(np.diff(a,axis=1,append=a[:,-1:]))
        mass=edge.sum()+1e-6
        row=[n,round(START[key]+n/FPS[key],6),round(float(a.mean()),4),round(float(a.std()),4),round(float((a>180).mean()),6),round(float((a<45).mean()),6),round(float((edge*xx).sum()/mass/127),6),round(float((edge*yy).sum()/mass/71),6),round(float(np.abs(a-previous).mean()),4) if previous is not None else 0]
        rows.append(row);previous=a
    data={'source':str(source),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'fps':FPS[key],'first_frame_player_pts_s':START[key],'frames':count,'analysis_size':[128,72],'columns':['frame','player_time_s','mean_luma','contrast_std','bright_fraction_gt180','dark_fraction_lt45','edge_centroid_x','edge_centroid_y','native_frame_mean_difference'],'rows':rows,'scope':'Every decoded frame measured. Luma and edges are descriptive, not composition labels or aesthetic scores. Reference and ASTRA frame differences are at different native rates and must not be directly compared.'}
    (OUT/f'{key}-metrics.json').write_text(json.dumps(data,ensure_ascii=False),encoding='utf8')
    return key,data

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    METRICS=dict(pool.map(decode,[('reference',REF),('astra',OUR)]))

def frame(key,n):
    return Image.open(OUT/key/f'{n:06d}.jpg').convert('RGB')

def ref_at_song(t):
    return round((SLOPE*t+OFFSET-START['reference'])*FPS['reference'])

overview=[]
samples=list(range(0,EXPECTED['reference'],12))
for b in range(0,len(samples),20):
    ns=samples[b:b+20]; sheet=Image.new('RGB',(1440,5*230),'#15101d');d=ImageDraw.Draw(sheet)
    for j,n in enumerate(ns):
        x=(j%4)*360;y=(j//4)*230
        sheet.paste(frame('reference',n).resize((360,203)),(x,y))
        d.text((x+5,y+205),f'f{n:04d} | {START["reference"]+n/24:.3f}s',font=FONT,fill='#e0cee8')
    filename=f'overview-{b//20+1:02d}.jpg';sheet.save(DOC/'overview'/filename,quality=90)
    overview.append({'file':'overview/'+filename,'frames':ns,'player_start_s':START['reference']+ns[0]/24,'player_end_s':START['reference']+ns[-1]/24})

timeline=json.loads((ROOT/'data/production-v4/timeline.json').read_text(encoding='utf8'))['shots']
records=[]
for s in timeline:
    ts=[s['start_s']+(s['end_s']-s['start_s'])*q for q in (.12,.5,.88)]
    board=Image.new('RGB',(1536,684),'#15101d');d=ImageDraw.Draw(board)
    d.text((12,7),f'{s["id"]} | SAME MUSIC: reference / ASTRA v4',font=TITLE,fill='#f5ead2')
    points=[]
    for j,t in enumerate(ts):
        n=ref_at_song(t);m=min(EXPECTED['astra']-1,round(t*60));x=j*512
        if 0<=n<EXPECTED['reference']:
            board.paste(frame('reference',n).resize((512,288)),(x,42))
            d.text((x+7,332),f'REF f{n} | player {START["reference"]+n/24:.3f}s',font=FONT,fill='#efc37d')
        else:
            d.text((x+20,150),'Reference already ended',font=TITLE,fill='#efc37d')
        board.paste(frame('astra',m).resize((512,288)),(x,362))
        d.rectangle((x,650,x+512,684),fill='#15101d')
        d.text((x+7,657),f'ASTRA f{m} | song {m/60:.3f}s',font=FONT,fill='#b88ce8')
        points.append({'requested_song_s':t,'reference_frame':n if 0<=n<EXPECTED['reference'] else None,'reference_player_s':START['reference']+n/24 if 0<=n<EXPECTED['reference'] else None,'astra_frame':m,'astra_song_s':m/60})
    board.save(DOC/'boards'/f'{s["id"]}.jpg',quality=91)
    a=max(0,ref_at_song(s['start_s']));b=min(EXPECTED['reference'],ref_at_song(s['end_s']))
    if b>a:
        peak=max(range(a,b),key=lambda n:METRICS['reference']['rows'][n][8])
        # Two 12-frame native-rate sequences: span 458ms each. These are motion evidence, not inferred cuts.
        sequences=[list(range(max(0,min(EXPECTED['reference']-12,a-6)),max(0,min(EXPECTED['reference']-12,a-6))+12)),list(range(max(0,min(EXPECTED['reference']-12,peak-6)),max(0,min(EXPECTED['reference']-12,peak-6))+12))]
        strip=Image.new('RGB',(1440,680),'#15101d');dr=ImageDraw.Draw(strip)
        for section,ns in enumerate(sequences):
            top=section*340;dr.text((8,top+5),f'{s["id"]} REF: '+('near ASTRA segment boundary' if section==0 else 'around largest frame change in music interval'),font=FONT,fill='#f5ead2')
            for j,n in enumerate(ns):
                x=(j%6)*240;y=top+30+(j//6)*153
                strip.paste(frame('reference',n).resize((240,135)),(x,y))
                dr.text((x+4,y+135),f'{n} / {START["reference"]+n/24:.3f}s',font=FONT,fill='#efc37d')
        strip.save(DOC/'motion'/f'{s["id"]}.jpg',quality=89)
        motion={'sequences':sequences,'peak_frame':peak,'peak_difference':METRICS['reference']['rows'][peak][8]}
    else: motion=None
    records.append({'id':s['id'],'song_start_s':s['start_s'],'song_end_s':s['end_s'],'points':points,'board':f'boards/{s["id"]}.jpg','motion':motion,'motion_file':f'motion/{s["id"]}.jpg' if motion else None})

# Comparable luma statistics use common song-time samples, not mismatched native frame differences.
summary=[]
for s in records:
    vals={'reference':[],'astra':[]};changes={'reference':[],'astra':[]};prev={}
    for t in np.arange(s['song_start_s'],min(s['song_end_s'],211.85),1/12):
        indices={'reference':ref_at_song(t),'astra':round(t*60)}
        for key,n in indices.items():
            if n<0 or n>=EXPECTED[key]:continue
            row=METRICS[key]['rows'][n];vals[key].append(row)
            if key in prev:changes[key].append(abs(row[2]-prev[key]))
            prev[key]=row[2]
    item={'id':s['id']}
    for key,rows in vals.items():
        if rows:
            arr=np.array(rows)
            item[key]={'samples_12hz':len(rows),'mean_luma':round(float(arr[:,2].mean()),2),'bright_fraction':round(float(arr[:,4].mean()),4),'dark_fraction':round(float(arr[:,5].mean()),4),'luma_std_over_time':round(float(arr[:,2].std()),2),'luma_range':[round(float(arr[:,2].min()),2),round(float(arr[:,2].max()),2)]}
    summary.append(item)

manifest={'reference':str(REF),'astra':str(OUR),'reference_page':'https://www.bilibili.com/video/BV1xCai6aE9g/','source_sha256':{k:v['source_sha256'] for k,v in METRICS.items()},'decoded_frames':EXPECTED,'fps':FPS,'frame_image_size':[852,480],'reference_first_frame_pts_s':START['reference'],'audio_mapping':{'equation':'reference_player = slope * astra_song + offset','slope':SLOPE,'offset':OFFSET,'frame_equation':'reference frame = round((reference_player - 0.0) * 24)','evidence':'../../../references/gpt-astra-BV1xCai6aE9g/alignment.json','strict_waveform_gate_passed':False,'minimum_window_correlation':0.9335206980481056,'scope':'Eight-window fit against v4 base audio; strict .95 correlation threshold failed. Offset spread is under one frame. Used only for 24fps visual correspondence, not sample-exact audio matching.'},'overview':overview,'shots':records,'same_music_summary':summary,'scope':'5085 reference and 13100 ASTRA v4 frames decoded and measured. 0.5s full-duration overview; 86 ASTRA musical-segment comparison boards plus native consecutive-frame strips. These are not a claim of 86 reference shots or manual viewing of every frame.'}
(DOC/'frame-index.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(DOC/'metrics-summary.json').write_text(json.dumps({'scope':'Descriptive 12Hz same-music samples only. Different palettes affect luminance; no aesthetic rating or formal flash-safety test.','shots':summary},indent=2)+'\n',encoding='utf8')
print(json.dumps({'done':True,'decoded':EXPECTED,'overview_sheets':len(overview),'comparison_boards':len(records),'directory':str(DOC)},ensure_ascii=False),flush=True)

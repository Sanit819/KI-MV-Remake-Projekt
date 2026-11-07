"""Download public character reference and extract whole-video one-second samples."""
from pathlib import Path
from datetime import datetime,timezone
import sys,json,hashlib,subprocess
import requests,cv2
import numpy as np
from PIL import Image,ImageDraw,ImageFont
for s in (sys.stdout,sys.stderr):
    if hasattr(s,'reconfigure'):s.reconfigure(encoding='utf-8',errors='replace')
ROOT=Path(__file__).resolve().parents[1]
BVID='BV1tE9XBbErS'; PAGE=f'https://www.bilibili.com/video/{BVID}/'
R=ROOT/'references/characters'/BVID
for p in ['source','samples','sheets','analysis']:(R/p).mkdir(parents=True,exist_ok=True)
def write(p,x):(R/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
s=requests.Session();s.headers.update({'User-Agent':'Mozilla/5.0','Referer':PAGE})
def get(url,params):
    r=s.get(url,params=params,timeout=30);r.raise_for_status();j=r.json()
    if j.get('code')!=0:raise RuntimeError(j.get('code'))
    return j['data']
info=get('https://api.bilibili.com/x/web-interface/view',{'bvid':BVID})
p=get('https://api.bilibili.com/x/player/playurl',{'bvid':BVID,'cid':info['cid'],'qn':127,'fnval':16,'fourk':1})
vs=[v for v in p.get('dash',{}).get('video',[]) if v.get('codecs','').startswith('avc')]
if not vs:raise RuntimeError('No public AVC stream')
v=max(vs,key=lambda x:(x['width']*x['height'],x['bandwidth']))
vp=R/'source/video.mp4'
if not vp.exists():
    with s.get(v.get('baseUrl') or v.get('base_url'),stream=True,timeout=60) as r:
        r.raise_for_status()
        with vp.with_suffix('.partial').open('wb') as f:
            for b in r.iter_content(1048576):f.write(b)
    vp.with_suffix('.partial').replace(vp)
manifest={'source_page':PAGE,'fetched_utc':datetime.now(timezone.utc).isoformat(),'title':info['title'],'bvid':BVID,'aid':info['aid'],'cid':info['cid'],'uploader':info['owner'],'description':info['desc'],'published_unix':info['pubdate'],'api_duration':info['duration'],'upload_dimensions':info['dimension'],'public_video':{k:v[k] for k in ['id','width','height','frameRate','codecs']},'video_sha256':hashlib.sha256(vp.read_bytes()).hexdigest(),'auth':'none; public API, no cookies','scope':'User designated character reference; does not certify original authorship of every design.'}
write('source-metadata.json',manifest)
cap=cv2.VideoCapture(str(vp));fps=cap.get(cv2.CAP_PROP_FPS);rows=[];samples=[];n=0;prev=None
while True:
    ok,bgr=cap.read()
    if not ok:break
    g=cv2.cvtColor(cv2.resize(bgr,(135,240)),cv2.COLOR_BGR2GRAY)
    delta=float(np.abs(g.astype('int16')-prev.astype('int16')).mean()) if prev is not None else 0
    rows.append({'frame':n,'seconds_index':n/fps,'mean_luma_change':round(delta,4)})
    if n%round(fps)==0:
        rel=f'samples/f{n:06d}.jpg';cv2.imwrite(str(R/rel),bgr,[cv2.IMWRITE_JPEG_QUALITY,95]);samples.append({'frame':n,'time':n/fps,'path':rel})
    prev=g;n+=1
cap.release()
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',16);sheets=[]
for start in range(0,len(samples),18):
    group=samples[start:start+18];tw=240;th=427;lh=26;cols=6
    canvas=Image.new('RGB',(cols*tw,((len(group)+cols-1)//cols)*(th+lh)),(25,23,29));draw=ImageDraw.Draw(canvas)
    for k,row in enumerate(group):
        im=Image.open(R/row['path']).resize((tw,th),Image.Resampling.LANCZOS);x=k%cols*tw;y=k//cols*(th+lh);canvas.paste(im,(x,y));draw.text((x+5,y+th+3),f"f{row['frame']} {row['time']:.1f}s",fill='white',font=font)
    rel=f'sheets/overview-{start//18:02d}.jpg';canvas.save(R/rel,quality=93);sheets.append(rel)
write('analysis/frame-metrics.json',{'fps':fps,'decoded_frames':n,'nominal_seconds':n/fps,'frames':rows,'scope':'All decoded frames measured; visual samples only, not all-frame manual review.'})
write('analysis/sample-index.json',{'samples':samples,'sheets':sheets,'visual_sample_interval_seconds':1,'actual_manual_review_record':'CHARACTER_REFERENCE.md'})
print(json.dumps({'root':str(R),'fps':fps,'frames':n,'seconds':n/fps,'samples':len(samples),'sheets':sheets,'rendition':manifest['public_video']},ensure_ascii=False))

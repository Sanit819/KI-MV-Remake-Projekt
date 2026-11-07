"""Public reference acquisition and exhaustive decoded-frame index. No credentials."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, subprocess, sys
import requests
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
FF=Path(r'D:\myskills\updream\vocaloid-style-mv-pipeline\_tools\ffmpeg\bin\ffmpeg.exe')
if not FF.exists(): FF=Path(r'D:\myskills\updream\Hortus-Regis-Alti\.cache\python-deps\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v9.0.2.exe')
PAGE='https://www.bilibili.com/video/BV1UfZ2YwEP5/'
for stream in (sys.stdout,sys.stderr):
    if hasattr(stream,'reconfigure'): stream.reconfigure(encoding='utf-8',errors='replace')
for d in ('source','frames','sheets/all-frames','sheets/overview','analysis'):
    (ROOT/d).mkdir(parents=True,exist_ok=True)
def write(path,data): (ROOT/path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for b in iter(lambda:f.read(1048576),b''):h.update(b)
    return h.hexdigest()
def get_json(session,url,params):
    r=session.get(url,params=params,timeout=30);r.raise_for_status();j=r.json()
    if j.get('code')!=0:raise RuntimeError(f'Public API stopped: {j.get("code")}')
    return j['data']
def safe_track(t):return {k:t[k] for k in ('id','width','height','frameRate','codecs','bandwidth') if k in t}
def get_media(session,t,path):
    if not path.exists():
        url=t.get('baseUrl') or t.get('base_url')
        with session.get(url,stream=True,timeout=60) as r:
            if r.status_code!=200:raise RuntimeError(f'Public CDN stopped: HTTP {r.status_code}')
            tmp=path.with_suffix('.partial')
            with tmp.open('wb') as f:
                for b in r.iter_content(1048576):f.write(b)
            tmp.replace(path)
    return dict(safe_track(t),bytes=path.stat().st_size,sha256=sha(path),path=str(path.relative_to(ROOT)))

s=requests.Session();s.headers.update({'User-Agent':'Mozilla/5.0','Referer':PAGE})
info=get_json(s,'https://api.bilibili.com/x/web-interface/view',{'bvid':'BV1UfZ2YwEP5'})
p=get_json(s,'https://api.bilibili.com/x/player/playurl',{'bvid':info['bvid'],'cid':info['cid'],'qn':127,'fnval':16,'fourk':1})
dash=p.get('dash') or {};vs=[t for t in dash.get('video',[]) if t.get('codecs','').startswith('avc')];aa=dash.get('audio') or []
if not vs or not aa:raise RuntimeError('No public AVC/audio pair; stop')
v=max(vs,key=lambda t:(t['width']*t['height'],t['bandwidth']));a=max(aa,key=lambda t:t['bandwidth'])
manifest={'source_page':PAGE,'fetched_utc':datetime.now(timezone.utc).isoformat(),'bvid':info['bvid'],'aid':info['aid'],'cid':info['cid'],'title':info['title'],'uploader':info['owner'],'description':info['desc'],'published_unix':info['pubdate'],'upload_dimensions':info.get('dimension'),'api_duration':info['duration'],'playback_timelength_ms':p['timelength'],'auth':'none; public API only; no browser credentials','available_avc':[safe_track(t) for t in vs],'scope':'Local reference analysis; no reupload or inclusion of reference footage in project.'}
manifest['video']=get_media(s,v,ROOT/'source/video-avc.mp4');write('source/source.json',manifest)
print(json.dumps({'video_ready':manifest['video']},ensure_ascii=False),flush=True)
manifest['audio']=get_media(s,a,ROOT/'source/audio.m4a');write('source/source.json',manifest)
# Exact packet/frame timestamps where ffprobe is installed.
probe=FF.with_name('ffprobe.exe')
if probe.exists():
    r=subprocess.run([str(probe),'-v','error','-select_streams','v:0','-show_frames','-show_streams','-show_entries','frame=best_effort_timestamp_time,pkt_duration_time,key_frame:stream=width,height,avg_frame_rate,r_frame_rate,start_time,duration,nb_frames','-of','json',str(ROOT/'source/video-avc.mp4')],capture_output=True,text=True,check=True)
    write('analysis/probe.json',json.loads(r.stdout))
else:write('analysis/probe.json',{'available':False,'reason':'ffprobe not installed; cv2 decoder timestamps retained'})

cap=cv2.VideoCapture(str(ROOT/'source/video-avc.mp4'));fps=cap.get(cv2.CAP_PROP_FPS);n=0;prev=None;rows=[]
while True:
    ok,bgr=cap.read()
    if not ok:break
    gray=cv2.cvtColor(cv2.resize(bgr,(213,120)),cv2.COLOR_BGR2GRAY)
    delta=np.abs(gray.astype(np.int16)-prev.astype(np.int16)) if prev is not None else np.zeros_like(gray)
    row={'frame':n,'time_index_seconds':n/fps,'decoder_time_seconds':cap.get(cv2.CAP_PROP_POS_MSEC)/1000,'mean_luma':round(float(gray.mean()),4),'mean_abs_change':round(float(delta.mean()),4),'changed_fraction_gt32':round(float((delta>32).mean()),6),'white_fraction_gt230':round(float((gray>230).mean()),6)}
    path=ROOT/f'frames/f{n:06d}.jpg'
    if not path.exists():cv2.imwrite(str(path),bgr,[cv2.IMWRITE_JPEG_QUALITY,90])
    rows.append(row);prev=gray;n+=1
cap.release()
write('analysis/frame-index.json',{'fps':fps,'frame_count':n,'seconds_from_frame_count':n/fps,'frames':rows,'metric_scope':'Every decoded frame, low-resolution luma/change metrics. Neither a manual viewing record nor a cut detector ground truth.'})
print(json.dumps({'decoded_frames':n,'fps':fps,'seconds':n/fps}),flush=True)
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',12)
def sheet(indices,target,cols,tw,th,label_h=18):
    canvas=Image.new('RGB',(cols*tw,((len(indices)+cols-1)//cols)*(th+label_h)),(15,15,22));draw=ImageDraw.Draw(canvas)
    for k,f in enumerate(indices):
        im=Image.open(ROOT/f'frames/f{f:06d}.jpg').resize((tw,th),Image.Resampling.LANCZOS);x=(k%cols)*tw;y=(k//cols)*(th+label_h)
        canvas.paste(im,(x,y));draw.text((x+3,y+th+1),f'{f:06d}  {f/fps:07.3f}s',font=font,fill=(225,225,235))
    canvas.save(target,quality=92)
all_sheets=[]
for i,start in enumerate(range(0,n,120)):
    ids=list(range(start,min(start+120,n)));rel=f'sheets/all-frames/all-{i:03d}.jpg';sheet(ids,ROOT/rel,10,192,108)
    all_sheets.append({'sheet':rel,'first_frame':ids[0],'last_frame':ids[-1],'start':ids[0]/fps,'end':(ids[-1]+1)/fps})
over=[]
for i,start in enumerate(range(0,n,round(fps*24))):
    ids=list(range(start,min(start+round(fps*24),n),round(fps)));rel=f'sheets/overview/overview-{i:02d}.jpg';sheet(ids,ROOT/rel,4,426,240,18);over.append(rel)
write('analysis/sheet-index.json',{'all_frames':all_sheets,'one_second_overviews':over,'all_frames_coverage':n,'note':'Contact sheets contain every decoded frame, in order. Human review coverage is recorded separately.'})
pcm=subprocess.run([str(FF),'-v','error','-i',str(ROOT/'source/audio.m4a'),'-vn','-ac','1','-ar','24000','-f','f32le','pipe:1'],capture_output=True,check=True)
samples=np.frombuffer(pcm.stdout,dtype='<f4');hop=240
env=np.sqrt(np.mean(samples[:len(samples)//hop*hop].reshape(-1,hop)**2,axis=1));flux=np.maximum(0,np.diff(env,prepend=env[0]))
peaks=[]
for k in np.argsort(flux)[::-1]:
    if flux[k]<=0:break
    if all(abs(k-r['hop'])>=15 for r in peaks):peaks.append({'hop':int(k),'time':k*.01,'positive_rms_change':float(flux[k]),'rms':float(env[k])})
    if len(peaks)>=150:break
write('analysis/audio-envelope.json',{'sample_rate':24000,'samples':len(samples),'duration':len(samples)/24000,'hop_seconds':.01,'rms':env.tolist(),'positive_rms_change_peaks':sorted(peaks,key=lambda x:x['time']),'scope':'Full compressed mix decoded; amplitude onsets only, not drum separation, listening, beat labels or exact perceptual synchronization.'})
write('analysis/extraction-summary.json',{'source':manifest,'decoded_frames':n,'fps':fps,'duration_from_frames':n/fps,'all_frame_sheets':len(all_sheets),'overview_sheets':len(over),'ffmpeg':str(FF),'analysis_scope':'All decoded frames indexed and extracted; visual analysis recorded separately; Public reference rendition; not an original project file or master.'})
print(json.dumps({'done':True,'root':str(ROOT),'all_frame_sheets':len(all_sheets),'overview_sheets':len(over)}),flush=True)

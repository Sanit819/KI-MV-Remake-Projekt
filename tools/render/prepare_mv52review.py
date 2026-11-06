"""Build the isolated candidate manifest; never edits production sources."""
import copy, hashlib, json
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'data/production-v52review'
def read(p): return json.loads(p.read_text(encoding='utf-8'))
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,v): p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
config=read(DATA/'candidate-map.json')
baseline=read(DATA/'protected-baseline.json')['sha256']
changed=[p for p,s in baseline.items() if sha(ROOT/p)!=s]
if changed: raise RuntimeError('Protected source changed: '+repr(changed))
manifest=copy.deepcopy(read(ROOT/'assets/astra/v12-approved-cat/manifest.json'))
manifest.update(status='independent-artwork-review-only',review_state={k:v for k,v in config.items() if k!='assets'})
overrides=[]
for name,c in config['assets'].items():
    if not c.get('enabled'):continue
    if not c.get('path') or not c.get('anchors'):raise ValueError('Unmeasured candidate '+name)
    path=(ROOT/c['path']).resolve()
    if not path.is_relative_to(ROOT):raise ValueError('Outside project')
    im=Image.open(path).convert('RGBA');w,h=im.size
    for key,(x,y) in c['anchors'].items():
        if not 0<=x<w or not 0<=y<h:raise ValueError(name+'.'+key+' outside source')
        if im.getpixel((x,y))[3]<128:raise ValueError(name+'.'+key+' is not on visible source')
    bbox=im.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
    old=manifest['assets'][name]
    new=copy.deepcopy(old)
    for k in ['bounds','face','anchors','provenance','source_width','source_height','sha256']:
        new.pop(k,None)
    new.update(path='/'+c['path'],anchors=c['anchors'],source_width=w,source_height=h,sha256=sha(path),bounds={'x':bbox[0],'y':bbox[1],'w':bbox[2]-bbox[0],'h':bbox[3]-bbox[1]},provenance={'tool':'existing source image; independent review mapping only','review_only':True,'replaces_for_review':old['path'],'measurement_note':c['measurement_note'],'final_map_confirmed':config['final_map_confirmed']})
    if c.get('face'):new['face']=c['face']
    manifest['assets'][name]=new
    overrides.append({'asset':name,'old_path':old['path'],'new_path':new['path'],'sha256':new['sha256'],'anchors':new['anchors'],'face':new.get('face'),'bounds':new['bounds']})
write(DATA/'manifest.json',manifest)
timeline=read(ROOT/'data/production-v5/timeline.json');shots={s['id']:s for s in timeline['shots']}
ranges=[('01-boundary',['R23'],4197,4391),('02-waveform',['R40','R41','R42','R43'],6219,6648),('03-refusal-book',['R53','R54','R55'],7866,8434),('04-wrist',['R74'],10130,10184),('05-ending-expression',['R86'],12480,12660)]
offset=0;clips=[]
for id,ids,start,end in ranges:
    count=end-start
    clips.append({'id':id,'shots':ids,'start_frame':start,'end_frame_exclusive':end,'frames':count,'body_start':start/60,'body_end':end/60,'audio_full_start':start/60+5,'duration':count/60,'reel_start_frame':offset,'reel_end_frame_exclusive':offset+count,'reel_start':offset/60,'reel_end':(offset+count)/60})
    offset+=count
write(DATA/'clip-plan.json',{'schema_version':1,'review_only':True,'final_map_confirmed':config['final_map_confirmed'],'entry':'src/mv52review/index.html','width':3840,'height':2160,'fps':60,'warning_included':False,'time_basis':'Renderer uses unpadded body seconds; source AAC begins body+5 seconds; reel time is concatenated clip time, not full-film time.','audio_source':'exports/astra-world-execute-me-final-v5-playback-4k60.mp4','audio_codec_policy':'AAC stream copy only; never music re-encode','combined_frames':offset,'combined_duration':offset/60,'clips':clips,'note':'R86 is the 208-211 body-second reply/recognition portion; no quiet coda. R74 exact native shot is 0.9 s. Root may revise ranges before final map.'})
write(DATA/'prepare-report.json',{'report_scope':'Manifest preparation only; current export status is in exports/preview-v52-combination/delivery.json','protected_files_checked':len(baseline),'protected_unchanged':True,'active_provisional_overrides':overrides,'final_map_confirmed':config['final_map_confirmed'],'render_performed_by_this_script':False})
print(json.dumps({'protected_unchanged':True,'overrides':[x['asset'] for x in overrides],'final_map_confirmed':config['final_map_confirmed'],'combined_frames':offset,'combined_duration':offset/60}))

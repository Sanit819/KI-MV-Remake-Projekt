"""Prepare v5.2 final DATA only. Existing source images/manifests/review files are read-only."""
import copy, hashlib, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'data/production-v52final'
REVIEW=ROOT/'data/production-v52review'
def read(p): return json.loads(p.read_text(encoding='utf-8'))
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,v): p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
DATA.mkdir(parents=True,exist_ok=True)
review_map=read(REVIEW/'candidate-map.json')
base=read(ROOT/'assets/astra/v12-approved-cat/manifest.json')
protected=read(REVIEW/'protected-baseline.json')['sha256']
for rel in ['data/production-v52review/candidate-map.json','data/production-v52review/manifest.json']:
    protected[rel]=sha(ROOT/rel)
before={rel:sha(ROOT/rel) for rel in protected}
bad=[rel for rel,val in protected.items() if before[rel]!=val]
if bad: raise RuntimeError('Protected source drift: '+repr(bad))
approval={
    'date':'2026-11-06',
    'user_text':'ok了，全部接入视频吧，期待成品！',
    'scope':'User approved latest A08_02 point-reading revision and authorized integrating the current full v5.2 artwork/lighting package into a separate complete final video.',
    'user_approved':True,
    'integration_authorized':True,
    'full_export_authorized':True,
    'evidence_boundary':'Authorization is not a claim that final runtime rendering or exported video validation has already passed.'
}
new={
'A04_02':{
 'path':'assets/astra/v18-wave-hand-review/A04-02-wave-receive-v6-hand-redraw.png',
 'anchors':{'hands':[196,487],'wrist':[243,526],'chest':[705,608],'fingertip':[155,412]},
 'face':{'x':534,'y':320,'w':200,'h':120},
 'measurement_note':'Remeasured on native 1199x1312 v6: hands is receiving-palm interior center (not chest-side hand); wrist is receiving-hand base immediately before cuff; chest follows visible sternum/center costume line below the chest-side hand. Fingertip is the uppermost raised digit tip reference, not the line endpoint. Face crop includes bang-covered face, mouth, jaw and upper neck.',
 'measurement_regions':['A04_02-0.png','A04_02-1.png']
},
'A08_01':{
 'path':'assets/astra/v13-book-review/A08-01-seated-turn-v6-head-redraw.png',
 'anchors':{'hands':[618,642],'wrist':[704,654],'chest':[582,517],'record':[600,712],'shoulder':[702,449]},
 'face':{'x':466,'y':289,'w':168,'h':115},
 'measurement_note':'Remeasured on native 1106x1422 v6: hands is pinching-finger/lifted-leaf contact; wrist is screen-right turning wrist at cuff; record is inside visible reading surface of lifted right leaf; chest follows sternum and shoulder is screen-right skin shoulder. The common face crop includes matching bangs, mouth, jaw and top of neck across v6 book pair.',
 'measurement_regions':['A08_01-0.png','A08_01-1.png']
},
'A08_02':{
 'path':'assets/astra/v13-book-review/A08-02-seated-record-v6-head-redraw.png',
 'anchors':{'hands':[572,723],'wrist':[689,642],'chest':[582,517],'record':[576,730],'shoulder':[702,449]},
 'face':{'x':466,'y':289,'w':168,'h':115},
 'measurement_note':'Remeasured on native 1106x1422 v6: hands is pointing index tip touching right page; record is 4 px right and 7 px below on the actual flat page; wrist is screen-right pointing wrist inside cuff. Sternum/shoulder and face crop were checked on the new matching body/head and deliberately match v6 turn pose. No old v5 hand/wrist/face coordinates inherited.',
 'measurement_regions':['A08_02-0.png','A08_02-1.png']
},
'A02_01':{
 'path':'assets/astra/v14-boundary-review/A02-01-approach-v3-leg-redraw.png',
 'anchors':{'hands':[1035,374],'wrist':[998,401],'eyes':[748,245]},
 'face':{'x':682,'y':216,'w':110,'h':107},
 'measurement_note':'Remeasured on native 1189x1323 v3: hands is reaching palm center, wrist is reaching-hand base/cuff. Legacy key eyes is a face-focus proxy on dark face below bangs; no visible iris is invented. Face crop follows newly turned cheek/jaw silhouette. Raised chest hand is not the reach anchor.',
 'measurement_regions':['A02_01-0.png','A02_01-1.png']
},
'A02_03':{
 'path':'assets/astra/v14-boundary-review/A02-03-withdraw-v3-leg-redraw.png',
 'anchors':{'hands':[739,365],'wrist':[766,401],'eyes':[725,264]},
 'face':{'x':666,'y':224,'w':112,'h':104},
 'measurement_note':'Remeasured on native 1189x1323 v3: hands is the raised withdrawn hand below chin, wrist is that hand\'s cuff base. Does not track separate hanging near hand. Legacy eyes key is a dark-face focus proxy under bangs, not a visible eye. Face crop follows new jaw/cheek.',
 'measurement_regions':['A02_03-0.png']
}}
expected_new={
'A04_02':'63f2c6192072abb12a2ff55e5970c0783fa074ed9ee4c626d8913774c33cd443',
'A08_01':'71e54fdff66097fef4cd8e49122b1cc74906dd75a7c63a4b827556977baede72',
'A08_02':'36af57dff7f2875c0a00ee31f5e4d3fde80c22216c8a3f7dcab5240a14ca283a',
'A02_01':'726880792942ff23853b32e8df13f593af9a16eaecf333d01e0f13f59f45b430',
'A02_03':'a80a3aa018db6e0e6d91a10a3cef7a2042d34e7a448248d29cfc0df27d4f0486'
}
config={
 'schema_version':2,'review_only':False,'final_map_confirmed':True,
 'approval_scope':approval['scope'],'approval':approval,
 'time_basis':{'render':'body seconds','full_film_offset_seconds':5,'fps':60,'full_video_has_warning':True},
 'base_manifest':'assets/astra/v12-approved-cat/manifest.json',
 'prior_review_map':'data/production-v52review/candidate-map.json',
 'assets':copy.deepcopy(review_map['assets']),
 'map_ready':True,'pending_assets':[],
 'runtime_validation_status':'pending final renderer verification',
 'alpha_repair_history':copy.deepcopy(review_map['alpha_repair_runtime_checked'])
}
manifest=copy.deepcopy(base)
manifest.update(status='v5.2-approved-artwork-final-data-prepared',date='2026-11-06',approval=approval,final_data_state={'candidate_map':'data/production-v52final/candidate-map.json','override_count':12,'newly_remeasured_count':5,'runtime_validation_pending':True,'full_export_performed_by_this_preparation':False})
overrides=[]
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
diag=DATA/'measurement-diagnostics';diag.mkdir(exist_ok=True)
for name,c in config['assets'].items():
    old_review=review_map['assets'][name]
    if name in new:
        c.update({k:copy.deepcopy(v) for k,v in new[name].items() if k!='measurement_regions'})
    c['user_approved']=True
    c['approval_reference']='Current user approval on 2026-11-06: '+approval['user_text']
    c['source_measurement']='remeasured_native_source_round2' if name in new else 'unchanged_source_review_measurement_retained'
    if name in ['surprise','sitSmile']:
        c['measurement_note']='Unchanged source and matching face crop retained from the actual first-round independent review render: includes bangs, eyes, mouth, chin and some collar, excludes horn tips. Current user authorization now includes final integration; final renderer validation remains separate.'
    path=ROOT/c['path']
    if not path.resolve().is_relative_to(ROOT):raise ValueError('Outside project: '+str(path))
    image=Image.open(path).convert('RGBA');w,h=image.size
    s=sha(path)
    if name in expected_new and s!=expected_new[name]:raise RuntimeError('Approved source changed: '+name)
    alpha=image.getchannel('A')
    bbox=alpha.point(lambda a:255 if a>=128 else 0).getbbox()
    if not bbox:raise ValueError('Empty source: '+name)
    checks={}
    for key,(x,y) in c['anchors'].items():
        if not 0<=x<w or not 0<=y<h:raise ValueError(name+'.'+key+' outside source')
        value=image.getpixel((x,y))[3]
        if value<128:raise ValueError(name+'.'+key+' alpha '+str(value))
        checks[key]={'point':[x,y],'alpha':value,'visible_at_alpha_128':True}
    f=c.get('face')
    if f and not(0<=f['x']<w and 0<=f['y']<h and f['w']>0 and f['h']>0 and f['x']+f['w']<=w and f['y']+f['h']<=h):raise ValueError(name+' face outside source')
    b={'x':bbox[0],'y':bbox[1],'w':bbox[2]-bbox[0],'h':bbox[3]-bbox[1]}
    c.update(source_width=w,source_height=h,sha256=s,bounds=b)
    original=base['assets'][name]
    entry=copy.deepcopy(original)
    for k in ['bounds','face','anchors','provenance','source_width','source_height','sha256']:entry.pop(k,None)
    entry.update(path='/'+c['path'],anchors=c['anchors'],source_width=w,source_height=h,sha256=s,bounds=b,provenance={
        'tool':'built-in imagegen source; approved final-data mapping',
        'review_only':False,'user_approved':True,'integration_authorized':True,
        'approval_user_text':approval['user_text'],
        'replaces_in_new_manifest':original['path'],
        'previous_review_path':'/'+old_review['path'],
        'source_measurement':c['source_measurement'],
        'measurement_note':c['measurement_note'],
        'source_image_modified_by_preparation':False
    })
    if f:entry['face']=copy.deepcopy(f)
    manifest['assets'][name]=entry
    overrides.append({
        'asset':name,'base_path':original['path'],'review_path':old_review['path'],'final_path':c['path'],
        'new_source_since_review':name in new,
        'source_sha256':s,'bytes':path.stat().st_size,'source_size':[w,h],
        'alpha_bbox_128':list(bbox),'bounds':b,
        'old_review_anchors':old_review['anchors'],'new_anchors':c['anchors'],
        'old_review_face':old_review.get('face'),'new_face':f,
        'anchor_alpha_checks':checks,
        'measurement_note':c['measurement_note'],
        'diagnostic_crops':['data/production-v52final/measurement-diagnostics/'+v for v in new.get(name,{}).get('measurement_regions',[])],
        'unchanged_geometry_reused':name not in new
    })
    if name in new:
        bg=Image.new('RGBA',image.size,(31,27,40,255));bg.alpha_composite(image);bg=bg.convert('RGB')
        d=ImageDraw.Draw(bg)
        for key,(x,y) in c['anchors'].items():
            d.ellipse((x-7,y-7,x+7,y+7),outline=(80,255,165),width=2)
            label=f'{key} {x},{y}';tx=max(0,min(w-220,x+12));ty=max(0,min(h-30,y-22))
            d.text((tx,ty),label,font=font,fill=(110,255,185),stroke_width=2,stroke_fill=(10,10,10))
        if f:d.rectangle((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']),outline=(255,210,80),width=2)
        bg.save(diag/(name+'-anchors.png'))
unchanged=[name for name in base['assets'] if name not in config['assets']]
if any(manifest['assets'][name]!=base['assets'][name] for name in unchanged):raise RuntimeError('Unchanged entry drift')
if set(manifest['assets'])!=set(base['assets']):raise RuntimeError('Asset-set drift')
if manifest['groups']!=base['groups']:raise RuntimeError('Action-group drift')
cat_keys=['A19_01','A19_02','A19_03']
if any(manifest['assets'][name]!=base['assets'][name] for name in cat_keys):raise RuntimeError('Approved cat asset drift')
for rel,expected in protected.items():
    if sha(ROOT/rel)!=expected:raise RuntimeError('Protected changed during preparation: '+rel)
report={
 'date':'2026-11-06','report_scope':'Approved final DATA mapping preparation only; no renderer or exporter execution.',
 'approval':approval,'base_manifest':'assets/astra/v12-approved-cat/manifest.json',
 'base_asset_count':len(base['assets']),'final_asset_count':len(manifest['assets']),
 'overrides_count':len(overrides),'newly_remeasured_count':len(new),'unchanged_entry_count':len(unchanged),
 'unchanged_entries_identical':True,'unchanged_entries':unchanged,'action_groups_unchanged':True,'approved_cat_entries_unchanged':True,
 'protected_files_checked':len(protected),'protected_unchanged':True,'protected_sha256':protected,
 'measurement_method':'Native source images inspected with view_image; separate coordinate-grid diagnostic crops used to select semantic source-pixel points. Every final anchor independently checked for bounds and source alpha >=128. Production PNG bytes never edited.',
 'face_crop_policy':'Book v6 pair uses matching crop checked against both new heads; all five replacement sources received new measured face rectangles. Existing seven candidates retain identical source and measured geometry.',
 'bounds_policy':'PIL alpha >=128 bounding box, right/bottom exclusive; x/y/w/h matches art.js source layout convention.',
 'anchor_semantics_evidence':['src/mv52review/art.js: actionLayout, anchorRect, portrait','src/mv52review/early.js: R23','src/mv52review/middle.js: resonance and R55'],
 'overrides':overrides,
 'render_performed':False,'full_export_performed':False,
 'runtime_checks_required':['All final sources load with no JS errors','New A04_02 gold endpoint/palm and chest path across all 429 R40-R43 frames','New A02 R23 contact stages and scale/crop','New A08 book-page record marker and source-point contacts','Source alpha/traced silhouette composition and final encoded frames'],
 'limits':['Manual semantic anchor localization is not subpixel anatomical certification. Approximate uncertainty is 3-8 native pixels for contact/center points.','All points are visible source pixels, but visibility alone does not prove runtime compositing alignment; final render must be inspected.','Face keys for ordinary dark-face artwork frame face geometry; eyes keys in A02 are focus proxies, not claims of visible eyes.']
}
write(DATA/'candidate-map.json',config)
write(DATA/'manifest.json',manifest)
write(DATA/'prepare-report.json',report)
print(json.dumps({'assets':len(manifest['assets']),'overrides':len(overrides),'remeasured':len(new),'unchanged_entries':len(unchanged),'protected_unchanged':True,'cat_preserved':True,'output':str(DATA)},ensure_ascii=False))


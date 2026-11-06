"""Inspection only: crop/scale comparison boards; never rewrites artwork."""
from pathlib import Path
import hashlib,json
from PIL import Image,ImageDraw
import numpy as np

ROOT=Path(__file__).resolve().parents[3]
CASES=[
 ('v16-withdraw-review','recoil-redraw','recoil',[
  ('hair',(689,176,836,305)),('shoulder',(804,596,905,696)),
  ('waist-near',(438,865,580,1006)),('waist-far',(646,869,778,1000))],
  [('face',(487,310,719,465)),('hand-contact',(355,330,578,756))]),
 ('v17-ending-review','recognition-surprise','surprise',[
  ('shoulder',(933,1098,1065,1229))],
  [('protected-hair',(768,325,1022,545)),('face',(423,526,834,882))]),
 ('v17-ending-review','recognition-smile','smile',[
  ('shoulder',(933,1098,1065,1229))],
  [('protected-hair',(768,325,1022,545)),('face',(423,526,834,882))])]
NATIVE={
 'recoil':'exec-b1bf954e-a804-44a3-bd51-2bd2ad3cbbd7.png',
 'surprise':'exec-a5932462-043f-4393-9c00-234a56dce45f.png','smile':'exec-eee0e776-b9bf-41d5-ae7c-2ee6fb310258.png'}
EXPECTED={
 'recoil':'9613da1ec08802ec2a027c085ebc7af36e1655a3c453c8a95f5eb42d8ca07914',
 'surprise':'bea54a8b2620468aab02a48e9fb07e21cc25de258bc836a71fae5fde530502ff',
 'smile':'9622111277caa22233933e0b9f524bd04e3ccaf89c511e2a0968ca2c9b38053d'}
REVIEW={
 'recoil':'Viewed full saved PNG and all 4 ornament crops plus face/hand-contact comparison. Open angular centers replace small center dots; shoulder remains oblique, far waist remains narrower. Centers can show underlying lavender cloth. No obvious new hand-contact or jaw displacement. Independently reviewed by review_bundle; user approval pending.',
 'surprise':'Viewed full saved PNG and shoulder, protected hair and face comparison. Six-band/open-center shoulder replaces four-lobed chain. Shoulder remains vertically oblique. Open eyes/pupils, small open mouth, jaw and hair ornament visually maintained. Independently reviewed by review_bundle; user approval pending.',
 'smile':'Viewed full saved PNG and shoulder, protected hair and face comparison. Shoulder has six visible woven lobes around open angular center, vertically oblique. Closed smiling eyes, small smile, jaw and hair ornament visually maintained. Independently reviewed by review_bundle; user approval pending.'}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def board(a,b,regions,path):
 out=Image.new('RGB',(1000,60+len(regions)*360),(38,35,44));d=ImageDraw.Draw(out)
 d.text((30,15),'ORIGINAL',fill='white');d.text((530,15),'CANDIDATE',fill='white')
 for i,(label,rect) in enumerate(regions):
  y=60+i*360;d.text((15,y),label+' '+str(rect),fill='white')
  for j,img in enumerate([a,b]):
   crop=img.crop(rect);ratio=min(460/crop.width,320/crop.height)
   crop=crop.resize((round(crop.width*ratio),round(crop.height*ratio)),Image.Resampling.NEAREST)
   out.paste(crop,(j*500+(500-crop.width)//2,y+25),crop)
 out.save(path)
def stats(a,b,rect):
 x=np.array(a.crop(rect)).astype('int16');y=np.array(b.crop(rect)).astype('int16');diff=np.abs(x-y)
 return {'mean_abs_channel_delta':float(diff.mean()),'exact_pixel_fraction':float(np.all(x==y,axis=2).mean()),'maxchannel_over16_fraction':float((diff.max(axis=2)>16).mean())}
for folder,stem,key,regions,protected in CASES:
 base=ROOT/'assets/astra'/folder;original=base/(stem+'.png');candidate=base/(stem+'-knots-perspective-v2.png')
 if not candidate.exists():continue
 dst=base/'knots-perspective-v2-inspection';dst.mkdir(exist_ok=True)
 a=Image.open(original).convert('RGBA');b=Image.open(candidate).convert('RGBA')
 assert a.size==b.size,(key,a.size,b.size)
 assert sha(original)==EXPECTED[key],('original changed',key)
 board(a,b,regions,dst/(key+'-knots-before-after.png'))
 board(a,b,protected,dst/(key+'-protected-before-after.png'))
 native=Path('C:/Users/auscar/.codex/generated_images/01a1acd4-3d6c-7fc3-9df6-24f2c44de01f')/NATIVE[key] if NATIVE[key] else None
 evidence={'key':key,'candidate':str(candidate.relative_to(ROOT)).replace('\\','/'),'original':str(original.relative_to(ROOT)).replace('\\','/'),
  'prompt':str(candidate.with_suffix('.prompt.txt').relative_to(ROOT)).replace('\\','/'),'generator':'built-in image_gen',
  'source':str(native) if native else None,'source_copy_identical':sha(native)==sha(candidate) if native else None,
  'sha256':sha(candidate),'original_sha256':sha(original),'original_unchanged':True,'width':b.width,'height':b.height,'mode':b.mode,
  'alpha_extrema':b.getchannel('A').getextrema(),'ornament_regions':regions,'protected_regions':protected,
  'protected_pixel_differences':{name:stats(a,b,rect) for name,rect in protected},
  'pixel_invariance_claimed':False,'status':'review_only_not_integrated','production_modified':False,
  'inspection':{'full_image_viewed':True,'crop_boards_viewed':True,'independent_review':'review_bundle','notes':REVIEW[key],
    'limits':'Visual comparison, not mathematical topology or pixel-invariance certification; new runtime anchors unmeasured.'}}
 (dst/(key+'-evidence.json')).write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'key':key,'size':b.size,'sha256':evidence['sha256'],'boards':str(dst)}))
for folder in ['v16-withdraw-review','v17-ending-review']:
 base=ROOT/'assets/astra'/folder
 evidence=[json.loads(p.read_text(encoding='utf8')) for p in sorted((base/'knots-perspective-v2-inspection').glob('*-evidence.json'))]
 record={'date':'2026-11-06','status':'review_only_not_integrated','generator':'built-in image_gen',
  'topology_reference':'assets/astra/v02/openai-openwork.png','topology_reference_use':'Connectivity only; local surface projection retained, no frontal logo compositing',
  'artwork_postprocessed':False,'originals_preserved':all(r['original_unchanged'] for r in evidence),
  'native_copies_identical':all(r['source_copy_identical'] for r in evidence),'assets':evidence,
  'production_manifest_src_video_modified':False,'new_runtime_anchors_measured':False}
 (base/'knots-perspective-v2.provenance.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

"""Inspection/provenance only. Does not modify source/candidate artwork."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib
import numpy as np
base=Path(__file__).resolve().parent;root=base.parents[2]
before=base/'A02-02-contact-v5-perspective.png';after=base/'A02-02-contact-v6-perspective.png'
native=Path('C:/Users/auscar/.codex/generated_images/01a1acd4-3d6c-7fc3-9df6-24f2c44de01f/exec-9976e073-246f-469d-a861-b46e28f67f94.png')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
prior=json.loads((root/'exports/review-v52/knot-inspection/hand-and-contact-independent-readonly-crops.json').read_text(encoding='utf8'))
expected=next(r['sha256'] for r in prior if r['source']==str(before.relative_to(root)).replace('\\','/'))
assert sha(before)==expected,'v5 changed'
a=Image.open(before).convert('RGBA');b=Image.open(after).convert('RGBA');assert a.size==b.size==(1189,1323)
regions=[('near-shoulder',(550,364,630,436)),('left-hem',(229,1064,312,1149))]
protected=[('face',(688,211,784,320)),('raised-palm-wrist',(996,257,1122,440)),('chest-hand',(638,367,731,495)),('near-waist',(574,526,671,621)),('far-waist',(674,544,724,622)),('far-shoulder',(759,366,829,422))]
def board(rows,path):
 out=Image.new('RGB',(1000,60+len(rows)*350),(38,35,44));d=ImageDraw.Draw(out)
 d.text((20,12),'SOURCE v5',fill='white');d.text((520,12),'CANDIDATE v6',fill='white')
 for i,(label,rect) in enumerate(rows):
  y=60+i*350;d.text((15,y),label+' '+str(rect),fill='white')
  for j,im in enumerate([a,b]):
   c=im.crop(rect);s=min(460/c.width,310/c.height);c=c.resize((round(c.width*s),round(c.height*s)),Image.Resampling.NEAREST);out.paste(c,(j*500+(500-c.width)//2,y+25),c)
 out.save(path)
board(regions,base/'contact-v6-two-knots-before-after.png')
board(protected[:3],base/'contact-v6-protected-face-hands.png')
board(protected[3:],base/'contact-v6-protected-oblique-knots.png')
aa=np.array(a).astype('int16');bb=np.array(b).astype('int16');mask=np.zeros(aa.shape[:2],dtype=bool)
for name,(x0,y0,x1,y1) in regions:mask[y0:y1,x0:x1]=True
delta=np.abs(aa-bb)[~mask]
record={'date':'2026-11-06','status':'independent_preview_candidate_not_formal_production','generator':'built-in image_gen',
 'edit_target':str(before.relative_to(root)).replace('\\','/'),'edit_target_sha256':sha(before),'edit_target_unchanged_from_pre_edit_inspection':True,
 'topology_reference':'assets/astra/v02/openai-openwork.png','topology_reference_sha256':sha(root/'assets/astra/v02/openai-openwork.png'),
 'candidate':str(after.relative_to(root)).replace('\\','/'),'sha256':sha(after),'native_generated_file':str(native),'native_copy_identical':sha(after)==sha(native),
 'prompt':str(after.with_suffix('.prompt.txt').relative_to(root)).replace('\\','/'),'width':b.width,'height':b.height,'mode':b.mode,'alpha_extrema':b.getchannel('A').getextrema(),
 'requested_edit_regions':regions,'protected_check_regions':protected,'pixel_invariance_claimed':False,'artwork_postprocessing':False,
 'outside_requested_regions':{'mean_abs_channel_difference':float(delta.mean()),'exact_pixel_fraction':float((delta.max(axis=1)==0).mean()),'maxchannel_delta_over16_fraction':float((delta.max(axis=1)>16).mean())},
 'inspection':{'full_saved_png_viewed':True,'two_target_crops_viewed':True,'protected_crops_viewed':True,
  'notes':'Viewed saved full PNG and target/protected comparison boards. Near-shoulder and left-hem central dots now read as wider angular openings exposing cloth. Far waist remains vertically narrow; far shoulder remains flattened oblique. No obvious new face, side-on palm, chest-hand or whole-body distortion observed.',
  'observed_drift':'Near-shoulder outer footprint increased slightly; protected near-waist center color changed from deep purple toward lighter purple while its topology/plane remained visually similar. Not pixel-local editing.',
  'limits':'Hair/far shoulder/far waist/opposite hem and small shoes retain earlier uncertain topology status; no mathematical topology certification, no user approval, no new measured runtime anchors.'},
 'formal_manifest_src_video_modified':False,'new_runtime_anchors_measured':False}
(base/'contact-v6-perspective.provenance.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({k:record[k] for k in ['candidate','sha256','width','height','alpha_extrema','native_copy_identical','edit_target_unchanged_from_pre_edit_inspection']}))

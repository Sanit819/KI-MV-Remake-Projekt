"""Preserves all artwork; records selected candidates and inspection crops only."""
from pathlib import Path
import json,hashlib
from PIL import Image,ImageDraw
import numpy as np
base=Path(__file__).resolve().parents[1];repo=base.parents[2]
if (base/'A07-02-contact-knots-perspective-v5-alpha.png').exists():
 raise SystemExit('This historical v4 selection builder is superseded by the v5-alpha inspection/provenance; v4 is not suitable for runtime.')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
gen=Path('C:/Users/auscar/.codex/generated_images/01a1acd4-3d6c-7fc3-9df6-24f2c44de01f')
p=json.loads((base/'knots-perspective-v2.provenance.json').read_text(encoding='utf8'))
old02=next(a for a in p['assets'] if a['key']=='A07_02')
old02['selection_status']='superseded_due_to_three_blocked_centers'
old02['knot_review']='Independent review found far waist and both hem centers still blocked in v2; not selected. v3 also failed; selected candidate is v4. Shoes remain uncertain.'
(base/'knots-perspective-v2.provenance.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
selected=json.loads(json.dumps(p));selected['selection']='01 v2 / 02 v4 / 03 v2; user review pending'
rec=next(a for a in selected['assets'] if a['key']=='A07_02')
new=base/'A07-02-contact-knots-perspective-v4.png';original=base/'A07-02-contact.png'
a=Image.open(original).convert('RGBA');b=Image.open(new).convert('RGBA');assert a.size==b.size==(1024,1536)
assert sha(original)==rec['original_sha256']
mask=np.zeros((1536,1024),dtype=bool);board=Image.new('RGB',(1000,60+9*300),(38,35,44));d=ImageDraw.Draw(board)
d.text((30,15),'ORIGINAL',fill='white');d.text((530,15),'SELECTED v4',fill='white')
for i,r in enumerate(rec['regions']):
 rect=r['bbox_xyxy'];x0,y0,x1,y1=rect;mask[y0:y1,x0:x1]=True
 y=60+i*300;d.text((15,y),r['label']+' '+str(rect),fill='white')
 for j,im in enumerate([a,b]):
  crop=im.crop(rect);scale=min(450/crop.width,260/crop.height)
  crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.NEAREST)
  board.paste(crop,(j*500+(500-crop.width)//2,y+25),crop)
board.save(base/'knots-perspective-v2-inspection/A07-02-v4-all-nine-before-after.png')
delta=np.abs(np.array(a).astype('int16')-np.array(b).astype('int16'))[~mask]
rec.update(candidate=str(new.relative_to(repo)).replace('\\','/'),prompt=str(new.with_suffix('.prompt.txt').relative_to(repo)).replace('\\','/'),
 native_generated_file=str(gen/'exec-b2064893-088d-4b9b-826b-d24352fb8f54.png'),candidate_sha256=sha(new),
 generated_copy_identical=sha(new)==sha(gen/'exec-b2064893-088d-4b9b-826b-d24352fb8f54.png'),
 selection_status='selected_for_user_review',alpha_extrema=b.getchannel('A').getextrema(),
 inspection='knots-perspective-v2-inspection/A07-02-v4-all-nine-before-after.png',
 outside_ornament_regions={'identical_pixel_fraction':float((delta.max(axis=1)==0).mean()),'mean_abs_channel_difference':float(delta.mean()),'fraction_pixels_delta_gt_16':float((delta.max(axis=1)>16).mean())},
 knot_review='v4 far waist and both hem now show open angular negative spaces instead of small dots/central crossing; far waist remains narrower and hem planes remain oblique. Full image and crops independently reviewed by review_bundle; shoes uncertain; user perspective approval pending.')
selected['iterations']=[]
for version,native,status in [
 ('v2','exec-4a0a4e1d-eaef-460a-b284-14d02f981e71.png','rejected_three_centers_still_blocked'),
 ('v3','exec-e530d7a3-4ccc-41ad-8813-579b922c271f.png','rejected_three_centers_still_blocked'),
 ('v4','exec-b2064893-088d-4b9b-826b-d24352fb8f54.png','selected_for_user_review')]:
 f=base/f'A07-02-contact-knots-perspective-{version}.png'
 selected['iterations'].append({'version':version,'file':str(f.relative_to(repo)).replace('\\','/'),'prompt':str(f.with_suffix('.prompt.txt').relative_to(repo)).replace('\\','/'),'native_generated_file':str(gen/native),'sha256':sha(f),'generated_copy_identical':sha(f)==sha(gen/native),'status':status})
(base/'knots-perspective-selected.provenance.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
trip=Image.new('RGB',(1024,552),(38,35,44));dr=ImageDraw.Draw(trip)
for i,r in enumerate(selected['assets']):
 im=Image.open(repo/r['candidate']).convert('RGBA');im.thumbnail((330,510),Image.Resampling.LANCZOS)
 trip.paste(im,(i*341+(341-im.width)//2,30),im);dr.text((i*341+15,8),r['key']+(' v4' if i==1 else ' v2'),fill='white')
trip.save(base/'knots-perspective-v2-inspection/A07-selected-triptych.png')
print(json.dumps({'selected':rec['candidate'],'sha256':rec['candidate_sha256'],'native_copy':rec['generated_copy_identical'],'original_preserved':sha(original)==rec['original_sha256']}))

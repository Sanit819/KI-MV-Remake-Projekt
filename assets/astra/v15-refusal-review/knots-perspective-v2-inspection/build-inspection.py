import json,hashlib
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np
root=Path(__file__).resolve().parents[1];repo=root.parents[2]
rows_all=json.loads((repo/'exports/review-v52/knot-inspection/crop-manifest.json').read_text(encoding='utf8'))
old_prov=json.loads((root/'provenance.json').read_text(encoding='utf8'))
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
genroot=Path('C:/Users/auscar/.codex/generated_images/01a1acd4-3d6c-7fc3-9df6-24f2c44de01f')
files=[('01','request','exec-10847501-b8e5-4227-8080-714b845d7d2f.png'),('02','contact','exec-4a0a4e1d-eaef-460a-b284-14d02f981e71.png'),('03','retreat','exec-330a9183-4a70-496e-be24-fea7950a07a1.png')]
hashfile=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
prov={'status':'review_only_not_integrated','generator':'built-in image_gen','edit_scope':'source-drawn knot ornaments with local surface perspective; no compositing or programmatic replacement of artwork','topology_reference':'assets/astra/v02/openai-openwork.png','formal_manifest_or_renderer_modified':False,'assets':[]}
for n,name,genfile in files:
 stem=f'A07-{n}-{name}';old=root/f'{stem}.png';new=root/f'{stem}-knots-perspective-v2.png';a=Image.open(old).convert('RGBA');b=Image.open(new).convert('RGBA');aa=np.array(a).astype(np.int16);bb=np.array(b).astype(np.int16)
 rows=[q for q in rows_all if q['group']==f'v15-{n}'];mask=np.zeros(aa.shape[:2],dtype=bool)
 board=Image.new('RGB',(1200,9*245),(235,232,238));d=ImageDraw.Draw(board)
 for i,q in enumerate(rows):
  x0,y0,x1,y1=q['bbox_xyxy'];mask[y0:y1,x0:x1]=True;d.text((10,i*245+12),q['label'],fill=(20,10,30),font=font)
  for j,im in enumerate([a,b]):
   scale=min(250/(x1-x0),205/(y1-y0));c=im.crop(q['bbox_xyxy']).resize((round((x1-x0)*scale),round((y1-y0)*scale)),Image.Resampling.NEAREST)
   bg=Image.new('RGBA',c.size,(30,22,38,255));bg.alpha_composite(c);board.paste(bg.convert('RGB'),(300+j*400,i*245+30));d.text((300+j*400,i*245+2),'ORIGINAL' if j==0 else 'PERSPECTIVE v2',fill=(20,10,30),font=font)
 board.save(root/f'knots-perspective-v2-inspection/A07-{n}-knots-before-after.png')
 outside=np.abs(aa-bb)[~mask];original_record=next(q for q in old_prov['assets'] if q['key']==f'A07_{n}')
 record={'key':f'A07_{n}','original':str(old.relative_to(repo)).replace('\\','/'),'candidate':str(new.relative_to(repo)).replace('\\','/'),'prompt':str((root/f'{stem}-knots-perspective-v2.prompt.txt').relative_to(repo)).replace('\\','/'),'native_generated_file':str(genroot/genfile),'original_sha256':hashfile(old),'original_unchanged_from_previous_provenance':hashfile(old)==original_record['sha256'],'candidate_sha256':hashfile(new),'generated_copy_identical':hashfile(new)==hashfile(genroot/genfile),'width':b.width,'height':b.height,'mode':b.mode,'alpha_extrema':[int(bb[:,:,3].min()),int(bb[:,:,3].max())],'outside_ornament_regions':{'identical_pixel_fraction':float(np.mean(np.max(outside,axis=1)==0)),'mean_abs_channel_difference':float(outside.mean()),'fraction_pixels_delta_gt_16':float(np.mean(np.max(outside,axis=1)>16))},'exact_pixel_preservation_claim':False,'anatomy_review':'visual pose / limb / hands / foot placement comparison; not numerical anatomy certification','knot_review':'large ornaments visually reviewed; tiny shoe topology remains uncertain at native size; user perspective approval pending','inspection':f'knots-perspective-v2-inspection/A07-{n}-knots-before-after.png','regions':rows}
 prov['assets'].append(record)
(root/'knots-perspective-v2.provenance.json').write_text(json.dumps(prov,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps([{'key':q['key'],'original_preserved':q['original_unchanged_from_previous_provenance'],'native_copy':q['generated_copy_identical'],'size':[q['width'],q['height']],'sha256':q['candidate_sha256']} for q in prov['assets']],indent=2))

"""Alpha/source audit and inspection images only; never changes artwork PNGs."""
from pathlib import Path
from PIL import Image,ImageFilter,ImageDraw
import numpy as np,json,hashlib
base=Path(__file__).resolve().parent;root=base.parents[2];dst=base/'knots-perspective-v2-inspection'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
native=Path('C:/Users/auscar/.codex/generated_images/01a1acd4-3d6c-7fc3-9df6-24f2c44de01f/exec-08a0ad25-ac71-4362-b857-28fcd0b4e418.png')
source=base/'A07-02-contact-knots-perspective-v4.png';new=base/'A07-02-contact-knots-perspective-v5-alpha.png'
assert sha(source)=='c881c89fbd756448daf24262c6eb84533c93145c23744cb0f8d3aeb40449cd24'
assert sha(new)==sha(native)
rows=[]
for stem,ver in [('A07-01-request','v2'),('A07-02-contact','v4'),('A07-03-retreat','v2'),('A07-02-contact','v5-alpha')]:
 old=base/(stem+'.png');p=base/(stem+'-knots-perspective-'+ver+'.png');a=Image.open(old).convert('RGBA');im=Image.open(p).convert('RGBA');al=np.array(im)[:,:,3]
 mask=a.getchannel('A').point(lambda v:255 if v>=128 else 0)
 for _ in range(10):mask=mask.filter(ImageFilter.MaxFilter(5))
 far=np.array(mask)==0
 yy,xx=np.where(far&(al>=128))
 edges={'top':al[:20,:],'bottom':al[-20:,:],'left':al[:,:20],'right':al[:,-20:]}
 row={'source':str(old.relative_to(root)).replace('\\','/'),'source_sha256':sha(old),'candidate':str(p.relative_to(root)).replace('\\','/'),'candidate_sha256':sha(p),
  'alpha_extrema':im.getchannel('A').getextrema(),'outside_method':'outside 20px Chebyshev dilation of original alpha>=128 silhouette; old/new pose differences can count as legitimate foreground',
  'outside_pixels':int(far.sum()),'outside_alpha_gt8':int(((al>8)&far).sum()),'outside_alpha_ge128':int(((al>=128)&far).sum()),'outside_alpha_ge240':int(((al>=240)&far).sum()),
  'outside_alpha_quantiles':np.quantile(al[far],[0,.5,.9,.99,1]).tolist(),
  'outside_ge128_bbox_xyxy':[int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)] if len(xx) else None,
  'corners_alpha':[int(al[0,0]),int(al[0,-1]),int(al[-1,0]),int(al[-1,-1])],
  'edge_bands':{k:{'min':int(v.min()),'max':int(v.max()),'alpha_ge128_pixels':int((v>=128).sum()),'alpha_gt8_pixels':int((v>8).sum())} for k,v in edges.items()}}
 rows.append(row)
 if ver!='v4':
  bg=Image.new('RGBA',im.size,(245,238,222,255));bg.alpha_composite(im);bg.convert('RGB').save(dst/(stem+'-'+ver+'-ivory-inspection.png'))
  im.getchannel('A').save(dst/(stem+'-'+ver+'-alpha-inspection.png'))
(root/'exports/review-v52/knot-inspection/A07-alpha-repair-audit.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
regions=[('face',(617,260,761,370)),('contact-palm',(934,266,1016,478)),('chest-hand',(548,391,673,521)),('far-waist',(535,628,635,730)),('left-hem',(145,1202,239,1301)),('right-hem',(692,1283,792,1385))]
a=Image.open(source).convert('RGBA');b=Image.open(new).convert('RGBA');board=Image.new('RGB',(1000,60+6*300),(38,35,44));d=ImageDraw.Draw(board)
d.text((20,12),'SOURCE v4',fill='white');d.text((520,12),'EXTRACTION v5-alpha',fill='white')
for i,(label,box) in enumerate(regions):
 y=60+i*300;d.text((15,y),label+' '+str(box),fill='white')
 for j,im in enumerate([a,b]):
  c=im.crop(box);s=min(450/c.width,260/c.height);c=c.resize((round(c.width*s),round(c.height*s)),Image.Resampling.NEAREST);board.paste(c,(j*500+(500-c.width)//2,y+25),c)
board.save(dst/'A07-02-v5-alpha-protected-before-after.png')
rec={'date':'2026-11-06','status':'alpha_repaired_candidate_pending_native_4k_runtime_recheck',
 'generator':'built-in image_gen','operation':'background-extraction','edit_target':str(source.relative_to(root)).replace('\\','/'),'source_sha256':sha(source),'source_preserved':True,
 'candidate':str(new.relative_to(root)).replace('\\','/'),'sha256':sha(new),'native_generated_file':str(native),'native_copy_identical':True,
 'prompt':str(new.with_suffix('.prompt.txt').relative_to(root)).replace('\\','/'),'size':b.size,'mode':b.mode,'alpha_extrema':b.getchannel('A').getextrema(),
 'artwork_programmatically_modified':False,'pixel_invariance_claimed':False,'alpha_audit':rows[-1],
 'inspection':{'white_background_composite_viewed':True,'alpha_channel_viewed':True,'protected_crops_viewed':True,'native_4k_runtime_viewed':False,
  'foreground_observation':'Viewed full clean composite and v4/v5-alpha crops of face, contact palm, chest hand, far waist and both hems. Original pose and the corrected open-center motifs remain visually similar; no obvious new anatomy distortion. This is not pixel-invariance certification.'},
 'notes':'Earlier v4 alpha 2..253 range was insufficient QA. Runtime revealed widespread medium/high-alpha exterior contamination. v4 preserved but unsuitable for runtime; all new final PNG bytes copied unmodified from imagegen.',
 'other_A07_candidates':'01/03 v2 have zero alpha>8 pixels outside original silhouette dilated20px; no same-scale exterior alpha pollution found. Native runtime still must be viewed.'}
runtime=base/'A07-alpha-runtime-review.json'
if runtime.exists():
 run=json.loads(runtime.read_text(encoding='utf8'))
 assert run['candidate_sha256']==sha(new),'Runtime report belongs to a different candidate'
 rec['status']='alpha_repaired_native_4k_sampled_composites_checked_user_acceptance_pending'
 rec['inspection']['native_4k_runtime_viewed']=True
 rec['runtime_review']=str(runtime.relative_to(root)).replace('\\','/')
 rec['other_A07_candidates']='01/03 v2 have zero alpha>8 pixels outside original silhouette dilated20px; white composites and native 4K sampled frames131.4/135.4 viewed, no same-scale exterior alpha pollution found.'
(base/'A07-02-contact-knots-perspective-v5-alpha.provenance.json').write_text(json.dumps(rec,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'sha256':rec['sha256'],'size':b.size,'alpha_extrema':rec['alpha_extrema'],'outside_counts':[(r['candidate'],r['outside_alpha_ge128']) for r in rows]}))

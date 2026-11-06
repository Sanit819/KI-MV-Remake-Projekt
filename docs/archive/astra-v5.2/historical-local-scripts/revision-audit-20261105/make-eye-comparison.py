from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
from collections import deque
import hashlib, json

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
FILES={
 'old_surprise':'assets/astra/final/surprise-knot.png',
 'new_surprise':'assets/astra/v06-eye-study/surprise-candidate.png',
 'old_smile':'assets/astra/final/sitSmile-knot.png',
 'new_smile':'assets/astra/v06-eye-study/smile-candidate.png',
}
HEADERS=['OLD surprise','NEW surprise','OLD smile','NEW smile']
images={k:Image.open(ROOT/p).convert('RGBA') for k,p in FILES.items()}
arrays={k:np.array(v) for k,v in images.items()}
records={}
for key,a in arrays.items():
 alpha=a[:,:,3]; mask=(a[210:380,500:670,:3].min(axis=2)>175)&(a[210:380,500:670,3]>200)
 seen=np.zeros(mask.shape,bool); comps=[]
 for yy,xx in zip(*np.where(mask)):
  if seen[yy,xx]:continue
  q=deque([(yy,xx)]);seen[yy,xx]=1;pts=[]
  while q:
   y,x=q.popleft();pts.append((x+500,y+210))
   for ny,nx in [(y-1,x),(y+1,x),(y,x-1),(y,x+1)]:
    if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=1;q.append((ny,nx))
  if len(pts)>20:
   pts=np.array(pts);comps.append({'pixels':len(pts),'center_xy':pts.mean(axis=0).round(2).tolist(),'bbox_xyxy':[*pts.min(axis=0).tolist(),*(pts.max(axis=0)+1).tolist()],'mean_rgb':a[pts[:,1],pts[:,0],:3].mean(axis=0).round(1).tolist()})
 eye=max((c for c in comps if c['center_xy'][1]<315),key=lambda c:c['pixels'])
 mouth=max((c for c in comps if c['center_xy'][1]>=315),key=lambda c:c['pixels'])
 lum=(a[:,:,:3]*[.2126,.7152,.0722]).sum(axis=2)
 x=round(eye['center_xy'][0]);top=eye['bbox_xyxy'][1]
 profile=np.median(lum[210:top-1,x-2:x+3],axis=1);light=np.where(profile>100)[0]+210
 hair_y=int(light[-1]);eye_hair_gap=top-hair_y-1
 opaque=alpha>=128; dilated=np.array(Image.fromarray((opaque*255).astype('uint8')).filter(ImageFilter.MaxFilter(5)))>0
 records[key]={'file':FILES[key],'sha256':hashlib.sha256((ROOT/FILES[key]).read_bytes()).hexdigest(),'size':list(images[key].size),'nonzero_alpha_bbox':list(images[key].getbbox()),'eye':eye,'mouth':mouth,'eye_to_mouth_vertical_px':round(mouth['center_xy'][1]-eye['center_xy'][1],2),'local_bang_last_bright_y':hair_y,'gap_bang_to_eye_top_px':eye_hair_gap,'alpha':{'nonzero_pixels':int((alpha>0).sum()),'alpha_16_or_more_pixels':int((alpha>=16).sum()),'alpha_16_to_249_pixels':int(((alpha>=16)&(alpha<250)).sum()),'alpha_16_or_more_beyond_2px_from_opaque128':int(((alpha>=16)&~dilated).sum())}}

def gray(a):return(a[:,:,:3]*[.2126,.7152,.0722]).sum(axis=2)*(a[:,:,3]/255)
g={k:gray(a) for k,a in arrays.items()};registrations=[]
for ka,kb in [('old_surprise','new_surprise'),('old_smile','new_smile'),('new_surprise','new_smile')]:
 ga,gb=g[ka],g[kb];ys,xs=np.mgrid[30:430:2,300:790:2]
 mask=~((xs>500)&(xs<665)&(ys>240)&(ys<375))
 grad=np.abs(np.diff(ga,axis=1,prepend=0))+np.abs(np.diff(ga,axis=0,prepend=0));mask &= grad[ys,xs]>8
 ax,ay=xs[mask],ys[mask];best=(1e9,0,0)
 for dy in range(-15,16):
  for dx in range(-35,36):
   val=float(np.abs(ga[ay,ax]-gb[ay+dy,ax+dx]).mean())
   if val<best[0]:best=(val,dx,dy)
 registrations.append({'from':ka,'to':kb,'best_translation_dx_dy':list(best[1:]),'edge_luminance_mae_0_255':round(best[0],3),'sampled_edge_pixels':len(ax)})

a=arrays['new_surprise'];b=arrays['new_smile'];height=min(a.shape[0],b.shape[0]);aa=a[:height,:,3]>=128;bb=b[:height,:,3]>=128
iou=float((aa&bb).sum()/(aa|bb).sum()); ah=aa[:460,280:820];bh=bb[:460,280:820];hiou=float((ah&bh).sum()/(ah|bh).sum())
deltas={}
for emotion in ['surprise','smile']:
 old,new=records['old_'+emotion],records['new_'+emotion]
 deltas[emotion]={'eye_center_y_delta_px':round(new['eye']['center_xy'][1]-old['eye']['center_xy'][1],2),'mouth_center_y_delta_px':round(new['mouth']['center_xy'][1]-old['mouth']['center_xy'][1],2),'eye_lift_relative_to_mouth_px':round(new['eye_to_mouth_vertical_px']-old['eye_to_mouth_vertical_px'],2),'local_bang_gap_reduction_px':old['gap_bang_to_eye_top_px']-new['gap_bang_to_eye_top_px']}

# Pure QA composition: identical fixed crop/scale, no auto-alignment or source edits.
colw=480;canvas=Image.new('RGB',(colw*4,670),(27,26,33));d=ImageDraw.Draw(canvas)
fontpath='C:/Windows/Fonts/arial.ttf';boldpath='C:/Windows/Fonts/arialbd.ttf'
font=ImageFont.truetype(fontpath,17);small=ImageFont.truetype(fontpath,14);bold=ImageFont.truetype(boldpath,23)
crop=(280,0,800,470); cw,ch=460,416
for i,(key,im) in enumerate(images.items()):
 x=i*colw;d.text((x+12,12),HEADERS[i],font=bold,fill=(240,236,246))
 bg=Image.new('RGBA',(cw,ch));bd=ImageDraw.Draw(bg)
 for yy in range(0,ch,16):
  for xx in range(0,cw,16):bd.rectangle((xx,yy,xx+15,yy+15),fill=(92,95,104,255) if (xx//16+yy//16)%2 else (105,108,118,255))
 part=im.crop(crop).resize((cw,ch),Image.Resampling.LANCZOS);bg.alpha_composite(part);canvas.paste(bg.convert('RGB'),(x+10,48))
 rec=records[key];eye=rec['eye']['center_xy'];mouth=rec['mouth']['center_xy']
 # Side ticks identify vertical eye/mouth levels without painting over the features.
 for y,color in [(eye[1],(115,224,234)),(mouth[1],(241,190,105))]:
  py=48+y*ch/(crop[3]-crop[1]);d.line((x+10,py,x+29,py),fill=color,width=2)
 d.text((x+12,480),f'Eye y {eye[1]:.2f} / mouth y {mouth[1]:.2f}',font=font,fill=(230,226,237))
 d.text((x+12,508),f'Eye-mouth distance {rec["eye_to_mouth_vertical_px"]:.2f} px',font=font,fill=(230,226,237))
 d.text((x+12,536),f'Local bang gap {rec["gap_bang_to_eye_top_px"]} px',font=font,fill=(230,226,237))
 if key.startswith('new'):
  em=key[4:];d.text((x+12,568),f'Lift vs mouth: {deltas[em]["eye_lift_relative_to_mouth_px"]:.2f} px',font=font,fill=(125,224,225))
 else:d.text((x+12,568),'Baseline / source pixels',font=font,fill=(170,162,184))
 if i:d.line((x,0,x,613),fill=(74,67,83),width=1)
d.text((12,617),'Same source-space crop x280..800 / y0..470, scaled equally; no alignment or production-image editing.',font=small,fill=(202,195,210))
d.text((12,640),'Cyan tick = eye center; amber tick = mouth center. Bang gap is a local threshold proxy, not an anatomical landmark.',font=small,fill=(202,195,210))
canvas.save(OUT/'eye-comparison.png')

report={
 'date':'2026-11-05','status':'candidate_visual_qa_not_activated',
 'scope':'Read-only source-image review and pure QA crop/layout. No manifest, renderer, source PNG or final-video edits.',
 'comparison_image':'exports/revision-audit-20261105/eye-comparison.png',
 'methods':{'eye_and_mouth':'Connected bright regions in source ROI x500..670/y210..380. min RGB >175, alpha>200, component size>20; largest upper/lower component. Source-pixel centroids, not guessed screen positions.','bang_proxy':'Last median luminance>100 pixel before eye top in five source columns around eye center, starting at y210. x changes with the eye; this is a local relation, not a universal bang landmark.','registration':'Integer translation search dx +/-35, dy +/-15 over non-expression head edges x300..790,y30..430; excludes x500..665,y240..375. Edge luminance MAE, not deformable registration.','alpha':'RGBA inspection plus alpha>=16 support outside 2-pixel dilation of alpha>=128 mask. This does not certify every edge or remove alpha<16 residue.'},
 'source_measurements':records,'old_to_new_deltas':deltas,'non_expression_head_registration':registrations,
 'new_candidate_pair':{'whole_alpha128_iou':round(iou,6),'head_alpha128_iou':round(hiou,6),'head_region_xyxy':[280,0,820,460]},
 'visual_findings':[
  {'topic':'eye_height','result':'improved','detail':'两张候选眼位均实际上移，且相对嘴的位置仍上移；并非仅将整张脸平移。惊讶相对嘴上移12.53px，微笑18.36px。'},
  {'topic':'bangs','result':'improved_with_local_change','detail':'惊讶眼上缘与局部刘海亮边之间的暗面间隔由16px减到11px；微笑由25px减到13px。刘海本身也有重画，不能将全部变化说成只移动了眼睛。'},
  {'topic':'jaw','result':'qualitative_only','detail':'新惊讶保留下颌至领口的暗面关系，眼位相对嘴和下半脸更高。旧微笑有明显浅紫下颌轮廓线，新的微笑取消该线、暗面与颈部连贯；所以新旧微笑的下颌并非严格冻结，不能以同一个自动颜色阈值声称精确下颌归一化结果。'},
  {'topic':'new_pair_head_drift','result':'no_large_rigid_shift_local_redraw_exists','detail':'新惊讶与新微笑非表情头部边缘配准最佳整数平移为[0,0]，未见整体头部跳位。头部alpha128轮廓IoU约0.9609，说明局部发梢/角沿仍有重画；不是像素锁定的两帧。'},
  {'topic':'gpt_knot','result':'no_major_redesign_observed','detail':'四张头饰均在画面右侧，仍是同类六股镂空结饰与垂穗，没有新增外圆或底板。新惊讶和新微笑的结饰视觉位置与轮廓相近，未见明显换边、丢失或扩大；源图局部笔画仍有少量重画，未做商标拓扑正确性的自动认证。'},
  {'topic':'alpha_edges','result':'no_new_broad_fringe_observed','detail':'四张都有透明背景与细半透明边缘；两候选alpha>=16像素均没有落在alpha>=128轮廓外超过2px。半透明像素数没有升高，未见新白底/黑底或宽外缘。非常低alpha彩色残点和角顶触源图上边界仍存在，不宜称为完全无残边。'},
  {'topic':'source_palette','result':'needs_consistency_check','detail':'新微笑眼嘴是暖米白，亮色区域均值约[243,230,211]；新惊讶眼/嘴更偏紫白。这是原始候选的一处色彩变化。现有art.js三墨映射可能将其统一，但本轮没有激活或渲染候选，不能据此宣称成片一致。'},
  {'topic':'outline_weight','result':'needs_consistency_check','detail':'四列完整头部对比可见，新微笑的角沿、呆毛及部分外发束深色描边比新惊讶更重，属于非表情区域的重画，不是眼位修正本身。大构图稳定，但直接切换仍可能产生轮廓粗细变化。'}
 ],
 'pending':[
  '保持新眼位，进一步锁定两候选共同的刘海、角、轮廓粗细和下颌；尤其确认是否接受旧微笑下颌线消失。',
  '确认眼与嘴统一采用同一墨色；不要让惊讶/微笑切换同时带来不必要的颜色跳变。',
  '若进入镜头测试，按同一裁切和锚点交替显示两候选，检查闭眼时的局部发梢变化；本轮未连续播放或激活候选。',
  '如需完全清洁透明边缘，应针对极低alpha残点另做处理并复核；本轮仅测量，没有编辑源图。'
 ],
 'activation':'Not activated. Existing final manifest remains unchanged. No full-MV reproduction authorized by this QA task.'
}
(ROOT/'docs/validation/EYE_STUDY_V06.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'comparison':str(OUT/'eye-comparison.png'),'report':str(ROOT/'docs/validation/EYE_STUDY_V06.json'),'deltas':deltas,'head_iou':hiou},ensure_ascii=False))

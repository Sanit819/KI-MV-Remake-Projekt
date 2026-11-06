"""Measure existing reference rasters; do not redraw aircraft or alter sources."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib, json, shutil

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'references/aircraft'
OUT = BASE / 'source-assets/fa-18f/scale-review'
OUT.mkdir(parents=True, exist_ok=True)
FT = .3048
SCALE = 60.0  # review-board pixels per metre, not print DPI or engineering scale
L, W, H = 60.3*FT, 44.9*FT, 16*FT
WU = (44+8.5/12)*FT
P = {
    'usace': BASE/'source-assets/western/fa18f-usace-2013-p243.png',
    'usaf': BASE/'source-assets/western/fa18ef-usaf-r11-2006-segment24-p36.png',
    'thesis': OUT/'bahner-2005-p17-source.png',
    'game': BASE/'source-assets/fa-18f/ac8-fa18f-official-perspective.webp',
}
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def filemeta(p):
    d={'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
    if p.suffix.lower() in ['.png','.webp']: d['pixels']=list(Image.open(p).size)
    return d
if not P['thesis'].exists():
    shutil.copyfile(ROOT/'.cache/aircraft-western/bahner-2005-p17.png', P['thesis'])
thesis_pdf = OUT/'bahner-2005-thesis-source.pdf'
if not thesis_pdf.exists():
    shutil.copyfile(ROOT/'.cache/aircraft-western/bahner-2005-thesis.pdf', thesis_pdf)
initial_hashes={k:sha(v) for k,v in P.items()}

# Coordinates refer to the unmodified source page, x rightwards, y downwards.
views = {
 'top': {'source':'usace','crop':[240,410,1145,1085], 'px_per_m':882/L,
   'calibration':'nose x=252 to aftmost planform x=1134: 882 px = 60.3 ft',
   'anchors':{'N':[252,747],'AFT':[1134,602],'A+':[904,420],'A-':[904,1074],
              'C1':[414,730],'C2':[596,746],'I':[659,684],'EX':[1098,715]},
   'endpoint_uncertainty_px':1},
 'side':{'source':'usace','crop':[240,1255,1145,1510], 'px_per_m':882/L,
   'calibration':'nose x=252 to tail end x=1134: 882 px = 60.3 ft',
   'anchors':{'N':[252,1419],'AFT':[1134,1409],'FIN':[985,1267],'GND':[800,1502],
              'C1':[413,1374],'C2':[596,1350],'I':[659,1402],'EX':[1105,1392]},
   'endpoint_uncertainty_px':1},
 'front_usaf':{'source':'usaf','crop':[1035,287,1766,546], 'px_per_m':699/WU,
   'calibration':'published span dimension x=1055..1754: 699 px = 44 ft 8.5 in',
   'anchors':{'WL':[1055,435],'WR':[1754,435],'FIN':[1499,300],'GND':[1404,536]},
   'endpoint_uncertainty_px':2},
 'front_thesis':{'source':'thesis','crop':[760,1940,1385,2170], 'px_per_m':206/H,
   'calibration':'fin-top y=1954 to ground y=2160: 206 px = 16 ft, imported common E/F height',
   'anchors':{'FIN':[992,1954],'GND':[1137,2160],
              'FIN-L':[775,2076],'FIN-R':[1372,2076],
              'AX-L':[787,2076],'AX-R':[1361,2076]},
   'endpoint_uncertainty_px':2},
}
metrics = {
 'usace_top_length_m':L,
 'usace_top_span_m':654/(882/L),
 'usace_top_span_vs_44_9ft_percent':(654/(882/L)/W-1)*100,
 'usace_side_height_m':235/(882/L),
 'usace_side_height_vs_16ft_percent':(235/(882/L)/H-1)*100,
 'usaf_front_height_after_span_scale_m':236/(699/WU),
 'usaf_front_height_error_percent':(236/(699/WU)/H-1)*100,
 'thesis_front_full_weapon_envelope_m':597/(206/H),
 'thesis_front_axis_span_m':574/(206/H),
 'thesis_axis_span_vs_usaf_nominal_percent':(574/(206/H)/WU-1)*100,
 'thesis_full_envelope_vs_usaf_nominal_percent':(597/(206/H)/WU-1)*100,
 'published_span_difference_m':W-WU,
}
# Worst-case endpoint-only ranges. These are not statistical confidence intervals.
def ratio_range(n,d,physical,nerr,derr):
    return [(n-nerr)/(d+derr)*physical,(n+nerr)/(d-derr)*physical]
ranges = {
 'usace_span_m':ratio_range(654,882,L,2,2),
 'usace_height_m':ratio_range(235,882,L,2,2),
 'usaf_front_height_m':ratio_range(236,699,WU,4,4),
 'thesis_front_axis_span_m':ratio_range(574,206,H,4,4),
 'thesis_front_weapon_envelope_m':ratio_range(597,206,H,4,4),
}
for k,v in views.items():
    im=Image.open(P[v['source']]).convert('RGB').crop(v['crop'])
    im.save(OUT/(k+'-source-crop.png'))

FONT='C:/Windows/Fonts/msyh.ttc'
def font(n): return ImageFont.truetype(FONT,n)
board=Image.new('RGB',(2460,1810),'#f1f4f8');d=ImageDraw.Draw(board)
def text(x,y,t,size=24,fill='#152942'): d.text((x,y),t,font=font(size),fill=fill)
def panel(box,title):
    d.rounded_rectangle(box,18,fill='white',outline='#ccd6e2',width=2)
    text(box[0]+20,box[1]+12,title,27)
def place(k,origin):
    v=views[k];b=v['crop'];im=Image.open(OUT/(k+'-source-crop.png'))
    s=SCALE/v['px_per_m'];sz=(round(im.width*s),round(im.height*s))
    board.paste(im.resize(sz,Image.Resampling.LANCZOS),origin)
    def point(p):return (origin[0]+(p[0]-b[0])*s,origin[1]+(p[1]-b[1])*s)
    for label,p in v['anchors'].items():
        x,y=point(p);d.ellipse((x-4,y-4,x+4,y+4),fill='#c74d3f')
        if label in ['N','AFT','FIN','GND','A+','A-','WL','WR','FIN-L','FIN-R','AX-L','AX-R']:
            # Alternating vertical labels keep close wingtip anchors readable.
            dy=-30 if label.startswith('AX') else 8
            text(int(x)+6,int(y)+dy,label,18,'#b3372c')
    return point
text(40,24,'F/A-18F 三视比例复核｜原始图只裁切、等比缩放与标点',37)
text(40,82,'全板 60 px / m；无横纵独立拉伸。顶／侧用明确 F 型；正视为 E/F 共用候选。',24)
panel((30,132,1220,1100),'A · USACE 2013 F 型顶视｜以机长 60.3 ft 定标')
pt=place('top',(60,194))
text(55,1060,f'翼展：{metrics["usace_top_span_m"]:.3f} m；页标 13.686 m，差 {metrics["usace_top_span_vs_44_9ft_percent"]:+.2f}%',23)
panel((30,1120,1220,1560),'B · USACE 2013 F 型侧视｜同一机长比例')
ps=place('side',(60,1184))
text(55,1518,f'地面→垂尾顶：{metrics["usace_side_height_m"]:.3f} m；16 ft = 4.877 m，差 {metrics["usace_side_height_vs_16ft_percent"]:+.2f}%',22)
panel((1240,132,2430,640),'C · USAF 2006 E/F 正视｜按页标翼展定标')
pf=place('front_usaf',(1280,223))
xg,yg=pf(views['front_usaf']['anchors']['GND']); yexpected=yg-H*SCALE
d.line((1280,yexpected,2190,yexpected),fill='#337eb5',width=2)
text(1280,180,'蓝线：相同地面下，16 ft 高度应到的位置',20,'#337eb5')
text(1270,560,f'等比后高度 {metrics["usaf_front_height_after_span_scale_m"]:.3f} m（{metrics["usaf_front_height_error_percent"]:+.2f}%）',25,'#b3372c')
text(1270,600,'保留作外形对照；不作为主尺度正视，不把它单独拉高。',22)
panel((1240,660,2430,1230),'D · Bahner 2005 / 引 NATOPS 2001 正视候选')
text(1270,710,'按地面→垂尾顶 16 ft 定标，翼展作为独立检查',23)
pb=place('front_thesis',(1280,765))
text(1270,1110,f'翼尖挂载轴约 {metrics["thesis_front_axis_span_m"]:.3f} m；导弹翼外缘约 {metrics["thesis_front_full_weapon_envelope_m"]:.3f} m',23)
text(1270,1152,'外缘比旧手册标称宽 3.71%；轴线接近不能抹平挂载差异。',22)
text(1270,1187,'论文未标尺寸；高度是 E/F 资料互证假定，不是该页原标值。',21,'#765b22')
panel((1240,1250,2430,1560),'如何使用这组参考')
for i,s in enumerate(['F 型顶／侧可共同作为绘画基线；未使用 E 型侧视。',
                       '论文正视可补布局与倾角，保留共用型号／挂载口径限制。',
                       '这不是画稿几何验收、逐面板精度认证或游戏 Block 全匹配。',
                       '红点坐标、截取框、缩放与误差范围均写入 JSON。']):
    text(1270,1305+i*42,s,22)
text(50,1590,'端点误差：USACE ±1 px／点；两份低清正视 ±2 px／点。误差范围是测量界限，不是概率区间。',24)
text(50,1640,'原资料包含起落架与翼尖挂载。飞行镜头须另锁定收放、襟翼、折叠翼、挂载和喷口状态。',24)
text(50,1690,'比例尺',22);d.line((170,1710,470,1710),fill='#19374e',width=5)
for n in range(6):
    x=170+n*SCALE;d.line((x,1700,x,1720),fill='#19374e',width=2);text(int(x)-4,1724,str(n),18)
text(500,1700,'m',23)
board.save(OUT/'fa18f-scale-comparison.png')

# Qualitative game comparison: retain perspective; do not flatten into orthographic.
photo=Image.open(P['game']).convert('RGB')
qa=Image.new('RGB',(2400,1250),'#f1f4f8');q=ImageDraw.Draw(qa)
q.text((35,22),'AC8 官方 F/A-18F：外形对应核查（透视，不参与米制测量）',font=font(34),fill='#152942')
photo.thumbnail((1460,1000));qa.paste(photo,(30,105))
points=[(1330,205),(1310,480),(1210,790),(520,530),(210,835)]
for i,(x,y) in enumerate(points,1):
    xx=30+x*photo.width/1920;yy=105+y*photo.height/1080
    q.ellipse((xx-20,yy-20,xx+20,yy+20),fill='#c74d3f');q.text((xx-9,yy-17),str(i),font=font(25),fill='white')
notes=[('1 座舱','可直接看见前后两个乘员位置。','使用 USACE F 长座舱；排除 E 单座侧图。'),
       ('2 进气道区域','可辨一侧外部区域，口面受边条与视角遮挡。','不能据此检验正面开口宽高或双侧间距。'),
       ('3 翼面','后掠梯形翼、边条及挂载可辨。','挂载／翼面状态须单独记录，不能照搬到所有镜头。'),
       ('4 尾翼','两片倾斜垂尾与尾部翼面可辨。','远侧根部有遮挡；不能由透视直接量取外倾角。'),
       ('5 喷口','双喷口外壳与两股尾焰可辨。','开口面并未正对镜头；不由透视量取口径与间距。'),
       ('共同限制','未发现可见外形直接否定 F 型参考。','没有证据锁定所有面板、传感器或具体 Block。')]
for i,(title,a,b) in enumerate(notes):
    y=110+i*166;q.text((1530,y),title,font=font(28),fill='#152942')
    q.text((1530,y+48),a,font=font(22),fill='#253d52');q.text((1530,y+82),b,font=font(21),fill='#586a7b')
q.text((35,1040),'来源：enso-order.acecombat.jp/assets/img/aircraft/ss_08.webp（官方 AIRCRAFT 索引 8）',font=font(23),fill='#253d52')
q.text((35,1100),'原图保留；标号只指可观察区域。不能把斜视缩短造成的比例差异当成机型版本差异。',font=font(24),fill='#253d52')
qa.save(OUT/'fa18f-ac8-feature-review.png')

assert initial_hashes=={k:sha(v) for k,v in P.items()}, 'source modified'
data={
 'schema_version':1,'date':'2026-11-06','requested_model':'F/A-18F / AC8 early Cope-Rex aircraft',
 'scope':'Reference-raster scale comparison only; no storyboard art, model or final line art generated',
 'sources':{k:filemeta(v) for k,v in P.items()},
 'thesis_original_pdf':filemeta(thesis_pdf),
 'source_urls':{
  'usace':'https://transportation.erdc.dren.mil/tsmcx/downloads/Military%20Aircraft%20Characteristics%20TSC%2013-2%20Dec%2013%20Rev%202.pdf#page=243',
  'usaf':'https://0x4d.net/files/AF1/R11%20Segment%2024.pdf#page=36',
  'thesis':'https://trace.tennessee.edu/server/api/core/bitstreams/c5de7c0f-aeac-4221-9880-70ae1e255077/content',
  'game':'https://enso-order.acecombat.jp/assets/img/aircraft/ss_08.webp'},
 'source_model_limits':{'usace':'Explicit F/A-18F; airfield-planning illustration, not factory CAD',
  'usaf':'E/F effectivity; single-seat side view excluded; frontal candidate only',
  'thesis':'Figure 2 on PDF p17/printed p3; cites E/F NATOPS 2001; E-like side view excluded; front has stores/folded-wing alternate outlines',
  'game':'Official named F/A-18F game screenshot; oblique partial coverage, not a metric projection'},
 'dimensions':{'usace_page243_ft':{'length':60.3,'span':44.9,'height':16.0},
  'usace_page241_ft':{'length':60.29,'span':44.88,'height':16.0},
  'usaf_ft':{'length':60+3.5/12,'span':44+8.5/12,'height':16.0},
  'conversion':'1 ft = 0.3048 m exact; published precision/rounding retained'},
 'board_scale_px_per_m':SCALE,'views':views,'metrics':metrics,
 'endpoint_only_worst_case_ranges_m':ranges,
 'uncertainty_notes':['Endpoint errors describe raster reading and line thickness only, not source-drawing accuracy.',
  'USACE 0.1 ft page rounding implies up to 0.05 ft rounding, not an engineering tolerance.',
  'Thesis front has no printed dimension; 16 ft is an explicitly imported E/F common-height assumption.',
  'Wingtip attachment axes and missile-fin outer edges are distinct anchors; neither is silently renamed to fit nominal span.',
  'USACE A dimension extension lines align with depicted outboard attachment outlines. It does not prove that missile-fin extent is excluded. The thesis axis-to-axis span must not be treated as the same outer-envelope baseline merely because it fits a nominal span.',
  'No anisotropic scaling, perspective rectification, line synthesis or E single-seat side-view substitution.'],
 'recommendation':{'drawing_reference_baseline':'USACE F top+side, with Bahner E/F front as annotated complementary baseline; keep front stores/baseline assumptions visible',
  'old_usaf_front':'Qualitative secondary check only: height and span are inconsistent under uniform scale.',
  'reference_exact_geometry_proven':False,'line_art_geometry_approved':False,'shot_geometry_approved':False,
  'no_new_storyboard_art':True,'source_hashes_unchanged':True},
 'artifacts':[filemeta(OUT/f) for f in ['top-source-crop.png','side-source-crop.png','front_usaf-source-crop.png','front_thesis-source-crop.png','bahner-2005-p17-source.png','fa18f-scale-comparison.png','fa18f-ac8-feature-review.png']],
}
(BASE/'FA18F_SCALE_REVIEW.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'metrics':metrics,'ranges':ranges,'out':str(OUT)},ensure_ascii=False))

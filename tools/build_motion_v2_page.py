"""Build the local motion review entry and source-provenance manifest."""
from pathlib import Path
import json,hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
HERE=ROOT/'motion-tests/v2'
def record(p):
 f=ROOT/p; d={'path':p,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}
 if f.suffix=='.png':
  with Image.open(f) as im:d.update(dimensions=list(im.size),mode=im.mode)
 return d
style='storyboard/drawings-v1/batch-01-v2.png'
sources={k:[style] for k in ['window-plate','flower-poses','cloud-plate']}
sources['rex-poses']=['references/characters/source-assets/joker/m4-OK.jpg','references/characters/source-assets/joker/rex-helmet-prop-official.jpg',style]
assets=[]
for name,refs in sources.items():
 assets.append({'id':name,'operation':'new illustration generation','generator':'built-in image_gen','image':record(f'motion-tests/v2/assets/{name}.png'),'prompt':record(f'motion-tests/v2/assets/{name}.prompt.txt'),'references':[record(p) for p in refs],'new_art_final_approved':False})
manifest={'date':'2026-11-06','user_style_choice':'original graphite/grayscale storyboard with selective red anemone','color_trial_v1':'archived_not_primary','assets':assets,'rex_states_used':['A','B','C'],'rex_states_excluded':{'D':'mask and breathing-hose connection drift'},'output_target':[3840,2160,60],'source_native_4k':False,'audio_original_unchanged':True}
(HERE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
analysis=json.loads((ROOT/'references/rhythm-v2/analysis.json').read_text(encoding='utf-8'))
data=json.dumps(analysis['sample_envelope']['points'],ensure_ascii=False)
page='''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hortus Regis Alti · 铅笔伪动画</title><style>
:root{color-scheme:dark;--bg:#18191b;--panel:#252629;--text:#f0eeea;--muted:#bdc0c3;--line:#45464a;--red:#cb7774}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.75 "Segoe UI","Microsoft YaHei",sans-serif}main{max-width:1220px;margin:auto;padding:48px 30px}h1{font-size:clamp(30px,4vw,50px);line-height:1.25;margin:14px 0}h2{font-size:25px;margin-top:36px}.eyebrow{color:var(--red);font-size:12px;letter-spacing:.14em}.intro{max-width:850px;color:var(--muted)}a{color:#e2aba7;text-underline-offset:4px}.links{display:flex;flex-wrap:wrap;gap:22px;margin:18px 0}video{width:100%;aspect-ratio:16/9;background:#08090a;border:1px solid var(--line);border-radius:7px;display:block}.meta{display:flex;justify-content:space-between;gap:15px;flex-wrap:wrap;color:var(--muted);font-size:13px;margin:12px 0}.pill{border:1px solid var(--line);border-radius:20px;padding:3px 12px;display:inline-block;font-size:12px}.phases{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin:28px 0}.phase{padding:19px;background:var(--panel);border-top:2px solid #85878a}.phase:last-child{border-color:var(--red)}.phase strong{display:block;font-size:19px}.phase p{margin:9px 0 0;color:var(--muted);font-size:14px}.note{padding:16px 20px;border-left:3px solid var(--red);background:var(--panel);color:var(--muted);font-size:14px}.atlas{display:grid;grid-template-columns:1fr 1fr;gap:22px}.atlas img{width:100%;background:#333439;border:1px solid var(--line);border-radius:6px}.atlas figure{margin:0}.atlas figcaption{font-size:13px;color:var(--muted);padding-top:10px}details{margin:30px 0;border-top:1px solid var(--line);padding-top:20px}summary{cursor:pointer}details img{max-width:100%;margin-top:15px}.meter{height:5px;background:#414246;border-radius:5px;margin-top:14px;overflow:hidden}.meter div{height:100%;background:var(--red);width:0;transition:width .12s linear}footer{font-size:13px;color:var(--muted);margin-top:35px;padding-top:22px;border-top:1px solid var(--line)}@media(max-width:700px){main{padding:28px 18px}.phases,.atlas{grid-template-columns:1fr}h2{font-size:23px}.links{gap:14px}}
</style></head><body><main><span class="eyebrow">HORTUS REGIS ALTI · MOTION STUDY 02</span><h1>让铅笔画随着音乐动起来</h1><span class="pill">已选灰阶方向 · 动作与节奏试验</span><p class="intro">前段留出呼吸，音乐推进时动作变密，增强段让镜头与环境连续流动。花、浅盆、人物和云分别运动；关键姿态之间维持同一条动作方向。</p>
<div class="links"><a href="../../docs/PSEUDO_ANIMATION_V2.md">66镜动作方案</a><a href="../../references/characters/index.html">官方人物依据</a><a href="README.md">本轮说明与限制</a></div>
<video id="film" controls playsinline preload="metadata" src="../../exports/motion-v2/hortus-motion-v2-4k60.mp4" poster="../../exports/motion-v2/hortus-motion-v2-preview-key-01.png"></video>
<div class="meta"><span>连续原曲 01:12.5–01:42.5 · 30秒 · 4K60</span><span id="clock">当前原曲 01:12.50</span></div><div class="meter" aria-hidden="true"><div id="level"></div></div>
<div class="links"><a href="../../exports/motion-v2/hortus-motion-v2-preview.mp4">快速预览 720p</a><a href="../../exports/motion-v2/hortus-motion-v2-4k60.mkv">FLAC无损音轨母版</a><a href="../../exports/motion-v2/validation.json">导出核验</a></div>
<div class="phases"><section class="phase"><strong>呼吸</strong><p>花独立摆动，根点留在盆内。环境与浅盆保持稳定，让变化从小处开始。</p></section><section class="phase"><strong>推进</strong><p>Rex低头、抬头、望向前方。肩部对齐，前景与反射协助衔接完整姿态。</p></section><section class="phase"><strong>增强</strong><p>连续轨迹以60Hz计算，云、视角和人物运动各有速度。局部重音跟随音乐，完整动作仍能看清。</p></section></div>
<div class="note">这是动作机制示范，尚未作为正式歌词剪辑。画面由低于4K的原画分层合成；三张Rex关键画并非60张手绘帧。D姿态因装备漂移未使用，正式头盔标记仍待精修。MP4为AAC试听，MKV保留48kHz／16-bit FLAC切片。</div>
<h2>同一主体，准备连续姿态</h2><div class="atlas"><figure><a href="assets/flower-poses.png"><img src="assets/flower-poses.png" alt="红银莲花三态与独立浅盆图集"></a><figcaption>花的三态与浅盆；使用独立根锚，具体使用时点见时间线。</figcaption></figure><figure><a href="assets/rex-poses.png"><img src="assets/rex-poses.png" alt="Rex姿态图集，右下D排除"></a><figcaption>Rex图集只用A／B／C，右下D留档排除。完整提示词在同目录。</figcaption></figure></div>
<details><summary>查看原曲的节奏分析与全曲变化</summary><p>测量的是混音瞬态，不是分离鼓轨。此30秒首尾响度约增加5.52 LU，强瞬态密度约0.90→2.43次／秒；下图与画面控制包络分别保留。</p><img src="../../references/rhythm-v2/selected-30s-curves.png" alt="30秒音乐强度变化"><img src="../../references/rhythm-v2/full-track-curves.png" alt="全曲音乐强度变化"><a href="../../references/rhythm-v2/REPORT.md">分析方法与边界</a></details>
<footer><div class="links"><a href="manifest.json">原画来源和生成提示词清单</a><a href="timeline.json">实际动作时间线</a><a href="ASSET_REVIEW.json">源图审阅</a><a href="../../style-tests/v1/index.html">已留档彩色候选</a></div>原曲未改，没有ALAC或升采样。第一企划归档保持原样；沿用其多姿态、锚点与分层方法。</footer></main><script>
const points=POINTS,film=document.getElementById('film'),clock=document.getElementById('clock'),level=document.getElementById('level');
film.addEventListener('timeupdate',()=>{const t=72.5+film.currentTime;clock.textContent='当前原曲 '+String(Math.floor(t/60)).padStart(2,'0')+':'+(t%60).toFixed(2).padStart(5,'0');const p=points[Math.min(points.length-1,Math.round(film.currentTime*10))];level.style.width=(100*p.motion_intensity_0_1)+'%';});
</script></body></html>'''.replace('POINTS',data)
(HERE/'index.html').write_text(page,encoding='utf-8')
print(json.dumps({'page':str(HERE/'index.html'),'assets':len(assets)},ensure_ascii=False))

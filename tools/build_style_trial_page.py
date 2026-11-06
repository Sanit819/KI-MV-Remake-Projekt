"""Make the local review page and provenance manifest; no media is modified."""
from pathlib import Path
import json, hashlib, html
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'style-tests/v1'
def record(p):
    f=ROOT/p
    d={'path':p,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size}
    if f.suffix=='.png':
        with Image.open(f) as im: d['dimensions']=list(im.size)
    return d

common='references/'
source_roles={
 '01-joker': [('characters/source-assets/joker/tasha-us.webp','official Tasha identity'),('characters/source-assets/joker/baxter-us.webp','official Baxter identity'),('characters/source-assets/joker/coster-us.webp','official Coster identity'),('style/source-assets/user-reference-03.png','broad visual-language reference'),('style/source-assets/user-reference-04.png','broad visual-language reference')],
 '01-joker-v2':[('../../style-tests/v1/01-joker.png','edit target'),('style/source-assets/user-reference-03.png','broad visual-language reference'),('style/source-assets/user-reference-04.png','broad visual-language reference'),('characters/source-assets/joker/tasha-us.webp','official Tasha identity')],
 '02-memory':[('characters/source-assets/carmille-tewy/official-jp-full.webp','official uniform'),('characters/source-assets/carmille-tewy/aaw2029-p182-artsee.webp','official face design via third-party scan'),('style/source-assets/user-reference-02.png','broad visual-language reference'),('style/source-assets/user-reference-01.png','broad visual-language reference')],
 '03-handover':[('characters/source-assets/carmille-tewy/m29-BV19TaZ6vE5K-0592s-hand.png','gameplay glove and gesture'),('characters/source-assets/carmille-tewy/aaw2029-p182-artsee.webp','official pressure suit design via third-party scan'),('style/source-assets/user-reference-04.png','broad visual-language reference'),('style/source-assets/user-reference-03.png','broad visual-language reference')]
}
source_roles['01-joker-v2'][0]=('LOCAL:style-tests/v1/01-joker.png','edit target')
assets=[]
for name,refs in source_roles.items():
    row={'id':name,'mode':'built-in image_gen','operation':'edit' if name.endswith('v2') else 'generate','approval':'unadopted_style_trial','image':record(f'style-tests/v1/{name}.png'),'prompt':record(f'style-tests/v1/{name}.prompt.txt'),'inputs':[]}
    for rel,role in refs:
        rel=rel.removeprefix('LOCAL:') if rel.startswith('LOCAL:') else common+rel
        row['inputs'].append(dict(record(rel),role=role))
    assets.append(row)
shots=[
 {'id':'02-memory','image':'02-memory.png','title':'01 / 红花与故土','tag':'TEWY · 记忆','interval':'00:30.85–00:44.85','duration':14,'description':'昔日欢悦的原野，如今已然枯槁。目光、白浅盆与红银莲花叠入失去的故土。','basis':'L01–02；HRA-003 / 047 的记忆意象。肖像与故土是叠化构图，不是新增真实会面。','audio':'tewy-red-flower-memory'},
 {'id':'01-joker','image':'01-joker-v2.png','title':'02 / 同行的人','tag':'TASHA · BAXTER · COSTER','interval':'00:59.60–01:13.90','duration':14.3,'description':'启程吧，偕亲友同行。书页与音乐把三位同伴放回战争中的日常。','basis':'L05–06；HRA-017 / 018 的同人延伸。二维修订作为当前试听图，初稿保留供比较。','audio':'tasha-joker-departure'},
 {'id':'03-handover','image':'03-handover.png','title':'03 / 托付','tag':'MOON 11 · 白手套','interval':'02:58.00–03:08.00','duration':10,'description':'手伸向天空，将无法亲自抵达的归处托付出去。白压力袖、红线与金属腕扣沿用实录。','basis':'HRA-057；只有 Tewy 自己的右手，没有实体握手。局部音乐对应，不添加未定时的归乡歌词。','audio':'moon11-handoff'}
]
selection=json.loads((ROOT/'references/audio-style-sample-selection.json').read_text(encoding='utf-8'))
for shot in shots:
    # Match by source interval rather than relying on a display ID.
    start={'02-memory':30.85,'01-joker':59.6,'03-handover':178}[shot['id']]
    matched=next(s for s in selection['selected_samples'] if abs(s['start_seconds']-start)<.001)
    shot['audio_path']='../../'+matched['audio_file']
manifest={'date':'2026-11-06','adoption_status':'awaiting_user_style_choice','generation_mode':'built-in image_gen','assets':assets,'shots':shots,'delivery':{'size':[3840,2160],'fps':60,'source_images_native_4k':False,'character_animation':False,'audio_original':'FLAC 48000 Hz / 16-bit / stereo','preview_audio':'AAC','lossless_audio':'FLAC in MKV','alac':False,'upsampling':False}}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
cards=[]
for s in shots:
    cards.append(f'''<article class="shot" id="{s['id']}"><div class="heading"><div><span class="kicker">{s['tag']}</span><h2>{s['title']}</h2></div><span class="time">原曲 {s['interval']} · {s['duration']} 秒</span></div>
<video controls preload="metadata" playsinline poster="{s['image']}" src="../../exports/style-tests-v1/{s['id']}-4k60.mp4"></video>
<p class="story">{s['description']}</p><p class="muted">{s['basis']}</p><div class="links"><a href="{s['image']}">看原画</a><a href="{s['image'].replace('.png','.prompt.txt')}">完整提示词</a><a href="../../exports/style-tests-v1/{s['id']}-4k60.mkv">无损音轨母版 MKV</a></div>
<details><summary>只听原曲片段（FLAC）</summary><audio controls preload="none" src="{s['audio_path']}"></audio></details></article>''')
page='''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hortus Regis Alti · 首轮画风试听</title><style>
:root{color-scheme:dark;--bg:#10171c;--panel:#18242a;--ink:#f1eee7;--muted:#b1c0c6;--gold:#e9c98b;--line:#34464d}*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at top,#263941,var(--bg) 60%);font:16px/1.75 "Segoe UI","Microsoft YaHei",sans-serif;color:var(--ink)}main{max-width:1240px;margin:auto;padding:48px 32px}a{color:var(--gold);text-underline-offset:4px}a:focus-visible,summary:focus-visible{outline:3px solid var(--gold);outline-offset:5px}h1{font-size:clamp(30px,4vw,52px);line-height:1.25;font-weight:650;margin:14px 0}h2{font-size:27px;margin:3px 0 12px;line-height:1.4}.kicker{font-size:12px;letter-spacing:.14em;color:var(--gold)}.lead{max-width:860px;color:var(--muted)}.links{display:flex;gap:22px;flex-wrap:wrap;margin:15px 0}.badge{display:inline-block;padding:3px 12px;border:1px solid #6a644e;border-radius:20px;color:var(--gold);font-size:12px}.overview{margin-top:28px}.overview video{border:1px solid var(--line)}video{display:block;width:100%;aspect-ratio:16/9;background:#090d10;border-radius:9px}audio{max-width:100%;margin:15px 0}.shot{margin-top:52px;padding-top:30px;border-top:1px solid var(--line)}.heading{display:flex;gap:20px;align-items:end;justify-content:space-between}.time{font-size:13px;color:var(--muted);margin-bottom:16px}.story{font-size:18px;margin-bottom:6px}.muted{color:var(--muted);font-size:14px}.notes{border-left:3px solid var(--gold);padding:12px 20px;margin:24px 0;background:var(--panel)}details{border-top:1px solid var(--line);padding-top:14px;margin-top:18px;color:var(--muted);font-size:14px}summary{cursor:pointer}.compare{display:grid;grid-template-columns:1fr 1fr;gap:18px}.compare figure{margin:0}.compare img{width:100%;border-radius:8px}.compare figcaption{font-size:13px;color:var(--muted)}footer{margin-top:50px;padding-top:24px;border-top:1px solid var(--line);font-size:13px;color:var(--muted)}@media(max-width:650px){main{padding:28px 17px}.heading{display:block}h2{font-size:23px}.time{display:block}.compare{grid-template-columns:1fr}.links{gap:14px}.shot{margin-top:34px}.story{font-size:16px}}
</style></head><body><main><span class="kicker">HORTUS REGIS ALTI · 崇高君王之苑</span><h1>让画面随原曲相遇</h1><span class="badge">首轮风格试听 · 待你决定</span><p class="lead">三组镜头，试验细线、厚涂、冷暖光色与环绕构图。先看整体感受，再比较舰上场面的二维修订。人物与衣装依据官方资料，画面动作与构图属于同人创作。</p>
<div class="links"><a href="../../references/characters/index.html">八人官方人设参考</a><a href="../../references/style/STYLE_LANGUAGE.md">画风拆解与通用提示词</a><a href="README.md">本轮说明</a></div>
<section class="overview"><h2>一键试听 · 38.3 秒</h2><video controls preload="metadata" playsinline poster="02-memory.png" src="../../exports/style-tests-v1/00-style-trials-4k60.mp4"></video><p class="muted">顺序：故土记忆 → Joker 同行 → 托付。点击播放会有原曲声音。</p></section>
<div class="notes"><strong>4K60 输出／原曲保留。</strong><br><span class="muted">原画 1672×941，放大输出 3840×2160；每帧计算轻微运镜，人物没有逐帧动作。MP4 为 AAC 试听，单段 MKV 保留 FLAC 48kHz／16-bit。最终目标为 Hi-Res 4K60，本轮不把升采样或放大称作原生高规格。</span></div>
'''+''.join(cards)+'''
<section class="shot"><h2>同一镜头，比较两种处理</h2><p class="muted">左为初稿：更接近电影写实。右为修订：明确描线与概括明暗色块，银色夹克恢复布料感。试听默认采用修订；两版都没有替你作最终选择。</p><div class="compare"><figure><a href="01-joker.png"><img src="01-joker.png" alt="Joker初稿：半写实材质"></a><figcaption>初稿 · 保留作对照</figcaption></figure><figure><a href="01-joker-v2.png"><img src="01-joker-v2.png" alt="Joker二维插画修订"></a><figcaption>二维修订 · 当前试听</figcaption></figure></div></section>
<footer>第一、二段歌词语义由社区字幕与独立波形比对支持，尚非逐字耳核；第三段只使用已比对的原曲区间，不标未定时歌词。原始 FLAC 未改，没有转 ALAC。<div class="links"><a href="manifest.json">原画与输入来源</a><a href="VISUAL_REVIEW.json">画面审阅记录</a><a href="../../exports/style-tests-v1/render-metadata.json">导出核验</a><a href="../../references/audio-style-sample-selection.json">音乐选段证据</a></div></footer></main><script>document.querySelectorAll('video,audio').forEach(media=>media.addEventListener('play',()=>{document.querySelectorAll('video,audio').forEach(other=>{if(other!==media)other.pause()})}));</script></body></html>'''
(OUT/'index.html').write_text(page,encoding='utf-8')
print(json.dumps({'images':len(assets),'shots':len(shots),'page':str(OUT/'index.html')},ensure_ascii=False))

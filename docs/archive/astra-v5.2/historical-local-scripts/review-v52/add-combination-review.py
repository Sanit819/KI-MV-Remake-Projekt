from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
PAGE = ROOT / 'exports/review-v52/index.html'
verification = json.loads((ROOT / 'exports/preview-v52-combination/verification-summary.json').read_text(encoding='utf-8-sig'))
overview = json.loads((ROOT / 'exports/preview-v52-combination/overview-verification.json').read_text(encoding='utf-8-sig'))
assert verification['passed'] and len(verification['items']) == 5 and sum(x['frames'] for x in verification['items']) == 1425
assert overview['passed'] and overview['silent'] and overview['frames'] == 1425
html = PAGE.read_text(encoding='utf-8')
assert 'id="combination"' not in html, 'Already added; make later edits directly.'
items = [
    ('01-boundary', '边界三态', '1:14.950–1:18.183', '3.233', '01-boundary-02.png', '探手 → 触碰 → 收手'),
    ('02-waveform', '波形与新手部', '1:48.650–1:55.800', '7.150', '02-waveform-04.png', '新五指原画与连续黄线一起审看'),
    ('03-refusal-book', '受阻与翻书', '2:16.100–2:25.567', '9.467', '03-refusal-book-05.png', '受阻三态 → 翻页 → 点读'),
    ('04-wrist', '握腕退回', '2:53.833–2:54.733', '0.900', '04-wrist-02.png', '保留原镜头长度，可暂停看手腕'),
    ('05-ending-expression', '结尾回应与表情', '3:33.000–3:36.000', '3.000', '05-ending-expression-02.png', '接到回应 → 微怔 → 放松微笑'),
]
cards = []
for stem, title, fulltime, duration, poster, note in items:
    video = f'../preview-v52-combination/{stem}-4k60-review-aac.mp4'
    poster = f'../preview-v52-combination/encoded-stills/{poster}'
    cards.append(f'''      <figure><video class="video" controls playsinline preload="metadata" src="{video}" poster="{poster}">请用下方链接打开短片。</video><figcaption><span class="tag">新原画组合试片 · 待审核</span><h3>{title}</h3><p class="caption">全片 {fulltime} · {duration} 秒</p><p class="caption">{note}</p><a class="video-link" href="{video}" target="_blank" rel="noopener">打开带音乐短片</a></figcaption></figure>''')
section = '''  <section class="section" id="combination">
    <div class="heading"><h2>10 · 新原画组合试片</h2><span class="time">独立试片 · 待整体审核</span></div>
    <p class="intro">上方最新候选原画已放进独立试片：边界、波形新手、受阻与翻书、握腕、结尾表情。先看静音总览确认画面，再用下方带音乐分段检查节奏与动作。所有短片均为 4K / 60 fps，正式成片尚未替换。</p>
    <div class="grid one"><figure><video class="video" controls playsinline preload="metadata" src="../preview-v52-combination/combined-artwork-review-4k60-SILENT.mp4" poster="../preview-v52-combination/encoded-stills/01-boundary-02.png">请用下方链接打开总览。</video><figcaption><span class="tag">静音 · 画面总览 · 待审核</span><h3>五组新原画 · 23.75 秒</h3><p class="caption">依次为边界、波形、受阻与翻书、握腕、结尾；这里连续拼接的是不同全片位置。</p><a class="video-link" href="../preview-v52-combination/combined-artwork-review-4k60-SILENT.mp4" target="_blank" rel="noopener">打开静音总览</a></figcaption></figure></div>
    <p class="hint">总览无声音。分段保留各自的原位置音乐；结尾处于歌曲的低声衰减段。</p>
    <div class="grid">
''' + '\n'.join(cards) + '''
    </div>
  </section>

'''
html = html.replace('  <footer>', section + '  <footer>', 1)
html = html.replace('<a href="#extra-light">全片局部补光</a></nav>', '<a href="#extra-light">全片局部补光</a><a href="#combination">新原画组合试片</a></nav>')
html = html.replace('已认可的人体姿态保留，所有 GPT 结饰正在逐处检查与修正。边界触碰结饰透视修正版已到位，翻书两态和波形段手部新原画已到位待审。光感与节奏已认可，整体原画和组合试片仍待审核；当前正式成片仍为 v5.1。', '本轮人体与 GPT 结饰修正版已整理成原画和五组独立试片。翻书两态、波形手部及饰件透视都需结合演出整体审看。原三段光感与节奏已认可；新原画、组合试片与后来新增的局部补光仍待审核，当前正式成片仍为 v5.1。')
html = html.replace('黄波形连续接手的逻辑保留。该段现行原画另发现六指问题，新完整原画已到位待审；下方视频仍只展示旧原画的连线逻辑，新手部需重新核对接点。反馈位置在短片约 4.35 秒。', '黄波形连续接手的逻辑保留。六指问题已用新完整原画返修，并重新核对接点；新原画与黄线的组合效果见<a href="#combination">第 10 组试片</a>。本组仍保留此前旧原画的连线逻辑视频，反馈位置在短片约 4.35 秒。')
html = html.replace('此图尚未接入下方短片；双手姿势和饰件也需整体审看', '此图已用于第 10 组新试片；下方旧视频仍作连线逻辑记录')
html = html.replace('原画认可状态不等于视频已获认可；所有新图仍未接入正式片，后续还需构图、接触点与连续播放检查。', '原画认可状态不等于视频已获认可；所有新图仍未接入正式片，组合演出与连续播放效果仍待你确认。')
PAGE.write_text(html, encoding='utf-8')

status = ROOT / 'docs/production-v52/REVIEW_STATUS.md'
text = status.read_text(encoding='utf-8')
text = text.replace('旧连线短片只证明原黄线连接逻辑；新手部锚点与组合效果必须重新检查。', '旧连线短片只证明原黄线连接逻辑；独立新试片已重新测量手部锚点并验证 429 帧连续黄线接点，组合效果仍待用户确认。')
text = text.replace('独立 `src/mv52review` 正在制作候选原画组合试片；', '独立 `src/mv52review` 已完成五组候选原画试片与静音总览；')
text += '''
## 新原画组合试片实际交付

五段带音乐试片与一份静音总览现已纳入审核页第 10 组，均仅供用户审核。目录为 `exports/preview-v52-combination/`；每段文件名为下表编号加 `-4k60-review-aac.mp4`。

| 编号 | 全片位置（已加 5 秒警告） | 帧数 / 画面时长 | 主要审核内容 |
|---|---|---|---|
| `01-boundary` | 1:14.950–1:18.183 | 194 / 3.233333 秒 | A02 三态与触壁点 |
| `02-waveform` | 1:48.650–1:55.800 | 429 / 7.15 秒 | A04_02 新五指源与连续黄线 |
| `03-refusal-book` | 2:16.100–2:25.567 | 568 / 9.466667 秒 | A07 三态及 A08 翻页→点读 |
| `04-wrist` | 2:53.833–2:54.733 | 54 / 0.9 秒 | 新 recoil 握腕 |
| `05-ending-expression` | 3:33.000–3:36.000 | 180 / 3 秒 | 回应、surprise、sitSmile；不是整段尾声 |

静音总览 `combined-artwork-review-4k60-SILENT.mp4` 为 1425 帧 / 23.75 秒 / 3840×2160 / 60fps，无音轨。五段画面按原包拼接，不新增重编码；拼接后的总览时间不等于全片时间。音乐请听独立分段，避免 AAC 预滚及尾包时长在拼接处累积。

[五段验证报告](../../exports/preview-v52-combination/verification-summary.json) 已检查全帧解码、逐视频包内容与时间戳、AAC 源包连续性及精确正文+5秒偏移、解码 PCM 起点为零和连续 PTS。AAC 端点有一个包（21.333 毫秒）以内的边缘差异，详见逐段实测值；不称作无损音频。结尾音轨为极低电平衰减，包身份与时间戳是主要同步证据。总览全部切点及1425帧验证见 [overview-verification.json](../../exports/preview-v52-combination/overview-verification.json)。

新波形锚点运行时逐帧审计为 429 帧，三相位 138/171/120 帧，均 singleStroke 且 startGap/handGap 为零；新源掌心 [263,511]，见 [wave-429-runtime.json](../../exports/preview-v52-combination/wave-429-runtime.json)。这证明几何连接，不代替用户对姿态切换的审美判断。五组区间的额外补光均不活跃。

整理者逐张实看了 `encoded-stills/index.json` 全部 21 张真实编码抽帧，覆盖边界三态、波形两次换态前后、受阻三态、翻书两态、握腕三点及结尾三点。未见新增明显肢体错接或 A07 背景黑碎块；原文件为4K，工具实际展示为2048×1152。没有连续人工听看1425帧，不把21帧抽样写成逐帧审查。图哈希与范围见 [独立编码帧审查](../../exports/review-v52/combination-encoded-sample-review.json)。所有新原画及五组组合试片仍待用户审核。
'''
status.write_text(text, encoding='utf-8')
print('Added five AAC clips plus silent overview; preserved pending user acceptance.')

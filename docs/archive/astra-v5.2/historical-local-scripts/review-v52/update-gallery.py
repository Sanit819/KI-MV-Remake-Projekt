"""Update only the local review page to explicitly named review candidates."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[2]
page=root/'exports/review-v52/index.html'
s=page.read_text(encoding='utf-8')
s=s.replace('翻书两态和波形段手部原画正在重画','翻书两态和波形段手部新原画已到位待审')
def art(path,title,tag,caption,alt):
 return f'<figure><a class="art" href="../../{path}" target="_blank" rel="noopener"><img src="../../{path}" alt="{alt}" loading="lazy"></a><figcaption><span class="tag">{tag}</span><h3>{title}</h3><p class="caption">{caption}</p></figcaption></figure>'
book='''  <section class="section" id="book">
    <div class="heading"><h2>02 · 翻页与点读</h2><span class="time">全片 2:21.883–2:25.567 · R55</span></div>
    <p class="intro">两态已完整重画：双腿分别落到各自脚踝，书保持俯视薄页；同一只手托书，另一只手从翻页转为点读。新候选仍需你看书页、角耳、手腿和饰件的整体效果。</p>
    <div class="grid two">'''
book+=art('assets/astra/v13-book-review/A08-01-seated-turn-v5.png','掀起书页','完整重画 v5 · 待审核','第一态 · A08_01','坐姿翻页：双腿并排，左手托书，右手掀页')
book+=art('assets/astra/v13-book-review/A08-02-seated-record-v5.png','翻完后点读','完整重画 v5 · 待审核','第二态 · A08_02','坐姿点读：左手继续托书，右手指向展开的右页')
book+='</div>\n  </section>'
s=re.sub(r'  <section class="section" id="book">.*?</section>',book,s,flags=re.S)
s=s.replace('该段现行原画另发现六指问题，正在完整重画；下方只展示连线逻辑预览，重画手部后还需重新核对接点。','该段现行原画另发现六指问题，新完整原画已到位待审；下方视频仍只展示旧原画的连线逻辑，新手部需重新核对接点。')
wave_art='<div class="grid one portrait">'+art('assets/astra/v18-wave-hand-review/A04-02-wave-receive-v5.png','接收波形 · 新手部原画','完整重画 v5 · 待审核','此图尚未接入下方短片；双手姿势和饰件也需整体审看','双手完整新原画，接线手朝外张开，另一手位于胸前，尾卷与袖端完整')+'</div><p class="hint">下方为原连线逻辑预览，尚未替换新原画。</p>'
if '接收波形 · 新手部原画' not in s:s=s.replace('    <div class="grid one"><figure><video class="video" controls playsinline preload="metadata" poster="../preview-v52-wave/encoded-01.png"', '    '+wave_art+'\n    <div class="grid one"><figure><video class="video" controls playsinline preload="metadata" poster="../preview-v52-wave/encoded-01.png"')
s=s.replace('三态人体已认可；左、右加入结饰透视修正版，中间的远腰和裙摆结饰仍在返修。','原三态人体已认可；现已加入三张结饰透视修正版，中间为第四版。')
s=s.replace('A07-02-contact.png','A07-02-contact-knots-perspective-v4.png')
s=s.replace('<span class="tag">人体已认可 · 结饰待修</span><h3>触壁受阻','<span class="tag">结饰透视修正版 v4 · 待审核</span><h3>触壁受阻')
s=s.replace('v16-withdraw-review/recoil-redraw.png','v16-withdraw-review/recoil-redraw-knots-perspective-v2.png')
s=s.replace('<span class="tag">人体已认可 · 结饰待修</span><h3>握腕退回','<span class="tag">结饰透视修正版 · 待审核</span><h3>握腕退回')
s=s.replace('两张已认可的完整头肩表情并排展示，肩饰仍需修正；','两张原表情已认可，现并排展示肩饰修正版，仍待整体审核；')
for name in ['surprise','smile']:s=s.replace(f'v17-ending-review/recognition-{name}.png',f'v17-ending-review/recognition-{name}-knots-perspective-v2.png')
s=s.replace('表情已认可 · 肩饰待修','肩饰透视修正版 · 待审核')
for stem in ['01-opening','02-climax','03-release-reply']:
 s=s.replace(f'src="../preview-v52-lighting/{stem}-4k60.mp4"',f'src="../preview-v52-lighting/{stem}-4k60-review-aac.mp4"')
s=s.replace('三段均含原音轨。如果浏览器播放无声，请用 WPS 或夸克打开原始短片。','内嵌播放器使用带 AAC 音轨的兼容审看副本；“打开原始短片”保留 ALAC 版本，可用 WPS 或夸克播放。')
s=s.replace('文件清单、使用位置和验证边界见','全片光感另有 <a href="../../docs/production-v52/LIGHTING_FULL_COVERAGE.md" target="_blank" rel="noopener">86 镜覆盖记录</a>。文件清单、使用位置和验证边界见')
page.write_text(s,encoding='utf-8')
print('Updated local review candidates; no production files written.')

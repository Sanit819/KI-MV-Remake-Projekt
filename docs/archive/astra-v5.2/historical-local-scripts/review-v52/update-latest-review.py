from pathlib import Path
import json,hashlib,re
root=Path(__file__).resolve().parents[2]
def sha(p):return hashlib.sha256((root/p).read_bytes()).hexdigest()
page=root/'exports/review-v52/index.html';s=page.read_text(encoding='utf-8')
s=s.replace('边界触碰仍在修结饰透视','边界触碰结饰透视修正版已到位')
s=s.replace('左、右现为新结饰透视修正版，待你整体审看；中间仅展示第二版人体参考，结饰透视仍在修正。','三态现均为结饰透视修正版，中间使用第六版；请整体看饰件与头部、肩腰、衣裙的朝向是否自然。')
s=s.replace('A02-02-contact-v2.png','A02-02-contact-v6-perspective.png')
s=s.replace('人体参考 v2 · 结饰未通过','结饰透视修正版 v6 · 待审核').replace('掌心触碰 · 人体参考','掌心触碰').replace('第二态 · A02_02 · 等待结饰透视修正','第二态 · A02_02')
if 'id="extra-light"' not in s:
 s=s.replace('<a href="#lighting">光感与踩点</a>','<a href="#lighting">光感与踩点</a><a href="#extra-light">全片局部补光</a>')
 block='''  <section class="section" id="extra-light">
    <div class="heading"><h2>09 · 全片局部补光</h2><span class="time">新增候选 · 待审核</span></div>
    <p class="intro">在原有光感之外，为光线较少的镜头补上贴合场景的发光线路和空间边缘。空座、孤立与灰色眼部特写保留安静感。这里先列代表静帧；新增动态效果仍需短片审看。</p>
    <div class="grid">'''
 for id,title,when in [('R02','工作区装配','0:10.800'),('R05','标题与输入','0:20.950'),('R14','感知界面外缘','0:55.100'),('R31','请求传出路线','1:30.183'),('R44','空桌空间','1:56.833'),('R52','请求与系统卡','2:14.833')]:
  path=f'../preview-v52-extra-light/{id}-on.png'
  block+=f'<figure><a class="art" style="aspect-ratio:16/9" href="{path}" target="_blank" rel="noopener"><img src="{path}" alt="{title}补光候选" loading="lazy"></a><figcaption><span class="tag">新增补光静帧 · 待审核</span><h3>{title}</h3><p class="caption">全片 {when} · {id}</p><a class="video-link" href="../preview-v52-extra-light/{id}-comparison.png" target="_blank" rel="noopener">查看前后对照</a></figcaption></figure>'
 block+='</div><p class="hint">这部分是后来增加的候选，不将先前光感与节奏的认可扩大到新增效果。</p></section>\n\n'
 s=s.replace('  <footer>',block+'  <footer>')
page.write_text(s,encoding='utf-8')
p=root/'docs/production-v52/REVIEW_STATUS.md';s=p.read_text(encoding='utf-8-sig')
s=s.replace('v5 仍有结饰未定，root 继续修正。审核页中间暂留 v2 人体参考并明确标注结饰未通过。','v5 的近肩/左裙中心继续返修为 v6，现已独立看过并列为待审候选，不能默认整体获用户认可。')
s=s.replace('`assets/astra/v14-boundary-review/A02-02-contact-v2.png` | 仅人体参考；结饰未通过，非最终候选','`assets/astra/v14-boundary-review/A02-02-contact-v6-perspective.png` | 第六版结饰透视修正候选；待用户审核')
s=s.replace('以及当前 A02 第一/三态结饰候选','以及 contact-v6 全图/两修位/脸掌/斜饰对照、当前 A02 第一/三态结饰候选')
s=s.replace('- A07：','- contact-v6：近肩/左裙原小中心点改为更清楚的角形负形；近肩略增、近腰孔色改变，不声称像素锁定。远腰竖斜和远肩扁投影保留，不为数六带而强行展开。强缩短位置和小鞋仍有分辨率限制；全图未见明显新增腿踝、掌腕或脸形错位。\n- A07：')
s=s.replace('新增效果仍需内部运行验证及用户审核','146 个 4K 样本检查已通过，代表对照已逐张实看；新增效果仍需短片连续审看及用户审核')
s=s.replace('最终页面核验会再次记录。','最新页面核验已再次实读一致（见 qa-review.json）。')
p.write_text(s,encoding='utf-8')
p=root/'docs/production-v52/KNOT_REVIEW.json';data=json.loads(p.read_text(encoding='utf-8-sig'))
data['contact_status']['v6']='独立看过全图与指定修位/保护区域；近肩与左裙中心改善，强缩短及小鞋保留不确定性；待用户审核，未正式接入'
entries=[('assets/astra/v14-boundary-review/A02-02-contact-v6-perspective.png','contact-v6-two-knots-before-after.png','近肩/左裙中心已改善；其他强缩短保留。新稿仍待用户审。'),('assets/astra/v15-refusal-review/A07-01-request-knots-perspective-v2.png','knots-perspective-v2-inspection/A07-01-knots-before-after.png','全图及九位置前后实看；小鞋 uncertain。'),('assets/astra/v15-refusal-review/A07-02-contact-knots-perspective-v4.png','knots-perspective-v2-inspection/A07-02-v4-three-regions.png','全图及旧失败三处实看；远腰/双裙中心改善，小鞋 uncertain。'),('assets/astra/v15-refusal-review/A07-03-retreat-knots-perspective-v2.png','knots-perspective-v2-inspection/A07-03-knots-before-after.png','全图及九位置前后实看；小鞋 uncertain。'),('assets/astra/v16-withdraw-review/recoil-redraw-knots-perspective-v2.png','knots-perspective-v2-inspection/recoil-knots-before-after.png','全图四结饰及脸手腕对照实看；不同肩腰朝向保留。'),('assets/astra/v17-ending-review/recognition-surprise-knots-perspective-v2.png','knots-perspective-v2-inspection/surprise-knots-before-after.png','全图肩饰与原发饰/脸对照实看；原四瓣链环改善。'),('assets/astra/v17-ending-review/recognition-smile-knots-perspective-v2.png','knots-perspective-v2-inspection/smile-knots-before-after.png','全图肩饰与原发饰/脸对照实看；笑眼嘴形视觉保持。')]
existing={r['path'] for r in data['revision_candidates']}
for source,evidence,note in entries:
 if source not in existing:data['revision_candidates'].append({'path':source,'sha256':sha(source),'status':'candidate_user_review_pending_not_integrated','manual_full_image_viewed':True,'manual_detail_viewed':True,'evidence':str(Path(source).parent/evidence).replace('\\','/'),'scope':note})
data['not_yet_reviewed']=['book-v5 两张及 wave-v5 已全图人体实看，但尚未完成全部结饰逐带独立拓扑认证','新原画组合视频的用户整体审核仍待完成']
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=root/'docs/production-v52/KNOT_REVIEW.md';s=p.read_text(encoding='utf-8-sig');marker='## 当前返修候选独立复看'
if marker in s:s=s[:s.index(marker)]
s+='\n'+marker+'\n\n原 52 处计数保留为原源图历史检查，不能直接套到新版。当前另实看 A02 两张 perspective-v2、contact-v6、A07 01v2/02v4/03v2、recoil-v2、两表情-v2 的全图及对应局部，详见 JSON 的 revision_candidates 和 [当前审核状态](REVIEW_STATUS.md)。这些候选均待用户审核，强缩短及小鞋仍保留分辨率不确定性；不把中孔颜色浅直接判错，也不为了正六边中心强行展开透视。\n\nbook 两态-v5 和 wave-v5 已独立看全图，原画待审；没有由此认证其全部结饰。contact-v4 的透视退回状态保留，旧 A07-02-v2/v3 的失败不随 v4 到位抹掉。\n'
p.write_text(s,encoding='utf-8')
print('Latest candidates and audit states saved.')

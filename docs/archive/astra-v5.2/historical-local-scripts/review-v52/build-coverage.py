"""Read-only source/runtime audit; writes review evidence only."""
from pathlib import Path
import json, re, hashlib

ROOT=Path(__file__).resolve().parents[2]
def read(p): return json.loads((ROOT/p).read_text(encoding='utf-8-sig'))
def sha(p): return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
timeline=read('data/production-v5/timeline.json')['shots']
runtime=read('exports/preview-v52-lighting/runtime-review.json')
delivery=read('exports/preview-v52-lighting/delivery.json')
sources=['src/mv52/main.js','src/mv52/lighting.js','src/mv52/early.js','src/mv52/middle.js','src/mv52/late.js','src/mv52/kit.js','src/mv52/art.js','data/production-v5/timeline.json','data/production-v52/audio-accents.json','exports/preview-v52-lighting/runtime-review.json']
geometry='''电源通路、计算核心、保护外壳；明确科技光源
工作区部件组装、透视格线与角点；亮线稀疏
激活网络、参数节点、输出柱与地面空间
工作区命令行、光标、短紫线；无大型能量光源
标题格线、发送点击与爆点；亮源集中小范围
聊天输入框、犹豫删除线、淡背景；无大型发光结构
建议卡片、网格、光标轨迹、发送环
首次星标、坐标与几何引导线；小范围光源
点线面体、立方体射线与节点；以细线为主
三圈轨道、空间格线、人物笔尖接点
多层正弦、金色切线、人物笔尖
无穷回路、流动粒子、金色边界与透明面
交流波转直流、流动粒子与接收地形
参数设置、视觉马赛克、背景波形与点击脉冲
分层历史城市、时间线与播放头
双圆共享空间、地形、双轨迹与星标
折叠世界框、金色传输线与星标
刺激闪电、辐射线与关键词
六人物卡、入口门与紫色联线
径向刻度盘、接收按钮与点击爆点
人物介绍、淡视线轨迹与星标；起始淡入
交付框、执行进度环
人物触壁、紫色边界涟漪、金色返回路径
三任务卡及世界/记忆/几何传输线
请求卡、金色轨迹与笔；短镜头小亮源
茄子切面、营养粒子、路径与生长地形
请求卡、金色轨迹、前一茄子保留
番茄切面、粒子与护盾路径
请求卡、金色轨迹、前一番茄保留
猫人物、CNN张量/卷积核/扫描窗/输出回线
请求卡、金色轨迹、淡猫人物；短镜头
人物造物、透视纸面、地形与金色见证路径
参数抽屉、箭头、光标与操作人物
双人物分屏、传输菱形与金色基线
RNN记忆页、节点/线/激活条、日弧与人物
弯曲平行空间格线、手部交付路径与金色笔
参数环、边界缺口与光标
三层环绕纸面/粒子带与人物；前景带裁切
重新连接细线与五点；亮源稀疏
黄波形、手掌连接曲线、紫色胸前路径
黄/紫波形、手部路径与空间网线
持续波形、手部路径与独立输入提示
持续波形、手部路径与完成字样
空座/桌面空间、退去的金线、记忆卡；故意收暗
等待人物、手到空座紫线与小圆
五阶段时间轴、进度线与节点；人物逐步变灰
拉远的桌面/灰人物、记忆卡；光线非常弱
灰人物马赛克、删除条目、小星与几何残片；直接位图路径
守住旧星、锯齿擦除边、近景人物与薄光环
灰色眼部特写、代码条与词；无彩色大型光源
请求面板、紫色发送折线、空场透视边界
请求/系统卡、白色扫描条与离线状态；彩色亮源少
前景压迫边界、红色拒绝轨迹、请求人物
压迫边界、重复请求与触壁人物
记忆搜索页、翻书人物、旧星与记录联线
设置面板、移动轨迹与操作人物
伪造回应折纸、波形阴影与手部返回线
错误前景卡、红边界、保护人物与旧星
横向错误框折叠成竖紫柱；极短呼吸过渡
八竖柱/十六进制、运行代码、计数器与护星人物
执行代码空间、人物与运行状态
执行代码空间、人物与运行状态
执行代码空间、人物与运行状态
计数/锁定卡、代码空间与人物
计数/锁定卡、代码空间与人物
计数/锁定卡、代码空间与人物
计数/锁定卡、代码空间与人物
计数/锁定卡、代码空间与人物
计数/锁定卡、代码空间与人物
喊声人物/几何强段、深墨脸外亮边
眼部强段人物与高亮能量盘；大亮域
闪电能量线、爆发几何；无人
半身人物、世界深度层与代码强亮
握腕人物、按钮/红线与强段空间
手部人物及强段接触路径
代码过载与红色轨迹；无人
三层递归窗口、折叠与返回源头；裁切多
三维FC网络、连线、节点与数值传播
三维CNN输入/卷积/特征/池化空间
三维RNN循环网络、状态与来源说明
紫色答复卡、回手路径、红闭环与旧星
透视桌面、代理纸面/回路、释放控制人物
旧星转空白纸、固定桌面空间与人物
桌面、三层控制面板下落、人物
半星、连接笔尖、等待框与人物
末命令/新回应/表情窗/共同星线地形；尾声暖静光'''.splitlines()
assert len(geometry)==86
def fmt(t): return f'{int(t)//60}:{t%60:06.3f}'
rows=[]
for shot,desc in zip(timeline,geometry):
    samples=[r for r in runtime['runtime']['rows'] if r['shot']==shot['id']]
    assert len(samples)==3 and all(r['lighting']['enabled'] for r in samples)
    bright=[r['lighting']['bloomFraction']*100 for r in samples]
    actors=[r['lighting']['actorCount'] for r in samples]
    note='常规角色走外沿与人物蒙版' if max(actors) else '无人或未提交人物蒙版'
    if shot['id']=='R48':note='例外：马赛克直接drawImage；无新增人物外沿/专属蒙版'
    if shot['id']=='R50':note='portrait有蒙版但按设计跳过外沿'
    if shot['id']=='R86':note='混合：表情portrait无外沿，其余人物常规；三样本不涵盖所有子阶段'
    rows.append({'shot':shot['id'],'full_start':shot['start_s']+5,'full_end':shot['end_s']+5,'body_start':shot['start_s'],'body_end':shot['end_s'],'source_geometry':desc,'sections':list(dict.fromkeys(s['lighting']['section'] for s in samples)),'sample_frames':[s['frame'] for s in samples],'bright_extraction_percent':[round(x,6) for x in bright],'bright_percent_min':min(bright),'bright_percent_max':max(bright),'actor_counts':actors,'character_light_scope':note,'low_extraction_all_three':max(bright)<1,'manual_full_shot_viewed':False})
low=[r['shot'] for r in rows if r['low_extraction_all_three']]
text=(ROOT/'src/mv52/lighting.js').read_text(encoding='utf-8')
sections=[]
for m in re.finditer(r"\[([\d.]+),([\d.]+),'([^']+)',([^\]]+)\]",text):
    values=[float(x) for x in m[4].split(',')]
    sections.append({'body_start':float(m[1]),'body_end':float(m[2]),'name':m[3],**dict(zip(['bloom','rim','room','motion','warmth'],values))})
assert len(sections)==17
report={'date':'2026-11-06','scope':'read-only source inspection + existing measured runtime records; no new formal render','user_light_rhythm_approval':True,'formal_integration':False,'shot_count':86,'runtime_samples':258,'all_samples_enabled':True,'all_sections_sampled':len(set(s for r in rows for s in r['sections'])),'low_extraction_shots':low,'brightness_metric_limitation':'Extraction mask pixel fraction BEFORE blur/composite, includes bright character pixels; not screen luminance, improvement delta, or physical light-source count. Only 3 instants/shot.','source_sha256':{p:sha(p) for p in sources},'sections':sections,'shots':rows,'manual_viewed_existing_comparisons':['body-119.500-comparison.png'],'important_exceptions':['R48 direct raster mosaic bypasses lighting.artwork so no character-specific rim or mask','R50 and R86 recognition portrait skip direct rim by design','lighting module does not generate new per-shot circuit/space geometry','default off; review entry must explicitly set lighting=1'],'suggested_sampling':[{'full_seconds':[8.95,34.333],'purpose':'R02–08 early assembly/chat: sparse light sources across long opening stretch'},{'full_seconds':[34.333,64.333],'purpose':'R09/14 weak line scenes versus R10/11/15 clear geometry'},{'full_seconds':[79.1,108.65],'purpose':'request inserts R25/31, sparse reconnect R39, split R34 mask'},{'full_seconds':[115.8,136.1],'purpose':'R44–52 waiting/grayscale/mosaic/portrait, retain quiet timing while assess room/circuit presence'},{'full_seconds':[177.633,197.267],'purpose':'R76–81 folding/network section outside delivered climax short clip'},{'full_seconds':[208.333,223.333],'purpose':'R85–86 all portrait/co-draw/quiet tail phases, final six seconds absent from 03 clip'}]}
out=ROOT/'docs/production-v52'
(out/'LIGHTING_FULL_COVERAGE.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
md=['# v5.2 全 86 镜光感覆盖审查','', '用户已明确认可本轮光感与节奏。本记录检查它在全曲的覆盖与实际作用边界；没有修改已认可模块，没有导出或接入正式全片。','', '## 结论与口径','', '- `main.js` 每镜统一调用 `begin → camera → scene → apply → subtitle`，`lighting=1` 时覆盖全部 86 镜、17 连续段。现存运行证据为每镜首/中/末前一帧，共 258 个 4K 样本；不是只对三段短片起效。默认参数仍关闭光照，审核入口必须显式开启。','- 全部镜头共享紫金空间光池、亮部提取和三尺度辉光。普通人物增加细外沿，并由人物/深墨蒙版保护内部。光池是固定画面位置的宽渐变，不是每镜新增灯具或电路；可见技术空间主要来自现有场景自身。','- 下面“提亮域”是亮部提取蒙版的像素比例，尚未做辉光和合成，包含人物原色；不是最终亮度、前后改善百分比或独立光源个数。不能据此判定全镜明亮，也不能把低值自动判为失败。',f'- 三个样本的提取占比始终低于 1% 的镜头共 {len(low)} 个：{", ".join(low)}。这些镜头应优先检查已有线条与空间光是否足以回应“全 MV 光亮科技感”。','- R48 碎片化人物走 `mosaicRaster → ctx.drawImage`，绕过 `lighting.artwork`：运行记录人物蒙版数为 0。该镜没有新增人物外沿与专属遮光蒙版；低饱和灰图使辉光提取少，但不能写成所有人物都获相同保护。R50 与 R86 表情窗有蒙版，portrait 按设计不画外沿。','- 等待、呼吸、回复、尾声动态强度为 0，静态空间光仍在。保留已认可的节奏；如果后续增加装饰光线，应评审空间与亮源存在感，不擅自加节拍或改变模块。','', '## 17 段设置','', '值为归一化配置，motion 仍会乘实测音频段 gain；不是物理照度。','', '| 段 | 全片时间 | bloom / 外沿 / 空间 | 动态上限 |','|---|---|---|---:|']
for s in sections:md.append(f"| {s['name']} | {fmt(s['body_start']+5)}–{fmt(s['body_end']+5)} | {s['bloom']:.2f} / {s['rim']:.2f} / {s['room']:.2f} | {s['motion']:.2f} |")
md+=['','## 逐镜覆盖','', '全部行均有全局光池/提取/合成调用。人物列为运行提交数，不是可见人物比例；普通图每次提交有外沿，portrait 与马赛克例外见上。★ 表示三样本提取占比均低于 1%。场景描述来自源码检查，非全片逐帧视觉认证。','', '| 镜头 | 全片时间 | 已有光源、线路与空间 | 提亮域 min–max | 人物提交 min–max |','|---|---|---|---:|---:|']
for r in rows:md.append(f"| {r['shot']}{' ★' if r['low_extraction_all_three'] else ''} | {fmt(r['full_start'])}–{fmt(r['full_end'])} | {r['source_geometry']} | {r['bright_percent_min']:.3f}–{r['bright_percent_max']:.3f}% | {min(r['actor_counts'])}–{max(r['actor_counts'])} |")
md+=['','## 下一轮抽样建议','', '先用独立审核入口按以下六段连续看，再在新原画组合试片里复核。三段已交付短片没有覆盖这些全部区域。','', '| 全片区间 | 重点 |','|---|---|']
for item in report['suggested_sampling']:md.append(f"| {fmt(item['full_seconds'][0])}–{fmt(item['full_seconds'][1])} | {item['purpose']} |")
md+=['','## 证据与未做事项','', '- 已检查 `main.js`、`lighting.js`、早/中/晚场景和 `kit.js` 的调用关系；逐镜数值直接取既有 `runtime-review.json`。同目录 JSON 保存源 SHA256 与每镜三个精确帧号，便于后续查找。','- 独立实看等待段正文 119.5 秒 off/on 对照：空间边缘只轻微抬亮，灰人物与删除界面仍明显收暗；这个样本不能代表全等待段。之前另看过开场/高潮/回复各一张编码帧。没有声称新看完全部 86 镜或连续听看全片。','- 既有技术验证覆盖 1096 个实测瞬态事件、258 样本、字幕不变与安静段不抖动；三段视频完整解码另有证据。用户对光感节奏的认可高于旧文档结尾尚未认可的历史状态。','- 当前源只到 `src/mv52` 候选。新原画后续试合成会改变亮部面积与人物蒙版，须重跑组合验证；本表不是新原画合成后的结果。','', '关联：[光感与节奏原始报告](LIGHTING_RHYTHM_REVIEW.md) · [逐镜数据](LIGHTING_FULL_COVERAGE.json) · [当前审核状态](REVIEW_STATUS.md)','']
(out/'LIGHTING_FULL_COVERAGE.md').write_text('\n'.join(md),encoding='utf-8')
print(json.dumps({'shots':len(rows),'samples':sum(len(r['sample_frames']) for r in rows),'sections':len(sections),'low_extraction':low},ensure_ascii=False))

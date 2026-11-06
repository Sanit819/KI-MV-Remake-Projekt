"""Build the authored, untimed lyric storyboard and its local reading edition."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LYRICS = json.loads((ROOT / 'lyrics/lyrics.json').read_text(encoding='utf-8-sig'))
SOURCES = {
    'CHAR': 'references/OFFICIAL_CHARACTERS.md',
    'STORY': 'references/AC8_STORY_READING.md',
    'M29': 'references/MOON11_SCENE_STUDY.md',
    'ENTRY': 'references/SQUADRON_ENTRANCES_READING.md',
    'AIR': 'references/SQUADRON_AIRCRAFT.md',
}

# Tuple fields: perspective, story phase, people, aircraft IDs, framing/camera,
# visible action, lyric meaning, cut to next, evidence class, priority.
# Scene actions are authored here; references establish context, not every gesture.
G = []
def group(lyric_id, title, subject, refs, rows):
    G.append(dict(lyric_id=lyric_id, title=title, subject=subject, references=refs, rows=rows))

group(1, '土地先于王牌', '索托亚的离乡者；不经由 Rex 的回忆进入。', ['STORY','M29'], [
('索托亚','故土记忆',[],[], '极远景，固定低机位', '草地占画面下半部，风把草压向一侧。保留足够天空，让观众先认得一片可以生活的土地。', '先建立“昔日欢悦”的可失之物。', '同构图切换季节与地表。','意象剪辑','核心'),
('索托亚','迁徙记忆',['Cope'],[], '远景，同机位叠切', '同一画面位置出现枯草与尘土；Cope 所属的迁徙人群从远处经过，人物小于土地。服饰与行囊细节另依设定核对。', '枯槁由地表和生活空间的变化表达，不添加未经证实的灾害原因。', '风中布料接下一镜窗边的光。','同人补足画面','核心'),
('索托亚','Tewy 的旧日记忆',['Tewy'],[], '近景，缓慢推进', '红银莲花与白色浅盆。镜头只给花、窗边的光与 Tewy 的注视，不将她放进 Cope 的牧民家庭。', '同一故土承载不同人的生活。', '花的轮廓留到下一句的空处。','原作意象重组','核心'),
])
group(2, '丰饶成为过去', '从索托亚的失去转向 FCU 的失去。', ['STORY','M29','CHAR'], [
('索托亚','故土记忆',[],[], '物件特写，横移', '行囊收拢，手掌压住被风掀起的布；最后留下无人拾起的干草。匿名人物，不设为某位王牌亲属。', '离乡落在可带走与带不走的东西上。', '布边扫过画面，接撤离者衣角。','同人补足动作','可合并'),
('Joker','FCU 遭入侵后的撤离',[],[], '中远景，平视跟随', 'FCU 平民带行李沿登舰通道前行；用船体与人流说明地点，不把索托亚迁徙直接剪成同一支队伍。', '风带走的生活也发生在战争另一侧。', '沿队伍视线抬向甲板。','剧情背景重构','核心'),
('Joker','Endurance 的日常',['Pike','Santos'],[], '中景，缓移', '舰员为撤离者让出通道、整理临时安置处；镜头停在一张有人守候的床边。动作是同人补足，不另造救援战果。', '丰饶首先意味着能够安顿下来。', '室内光切到甲板天空。','同人补足动作','可合并'),
])
group(3, '同一阵风，两种命令', 'Joker 与索托亚都听见出发，但出发的后果并不相同。', ['CHAR','STORY','AIR'], [
('Joker','早期 Endurance',['Cope','Rex'],['FA18F'], '全景，从甲板移向机体侧面', '海风掠过甲板，双座 F/A-18F 等待出击。前后座的区别在此建立，先不依赖面部特写。', '风把天空从风景变成要进入的空间。', '座舱边缘接指挥室玻璃边缘。','原作事件重构','核心'),
('索托亚','早期追击任务',['Tewy','Toprak'],[], '双人中景，停留', 'Tewy 的指挥位置与 Toprak 的受令动作交替出现；镜头在二人之间保留距离，不虚构亲密关系或新对白。', '“宣告”在敌侧成为行动方向。', 'Toprak 转身接下一镜起身动作。','同人补足动作','核心'),
('双侧','两个阵营的出发准备',[],[], '特写匹配剪辑', '两侧飞行手套分别扣紧，镜头不让手真的相触；最后切回等待起飞的天空。', '相似的身体经验容纳不同的选择。', '手的动作续接前后座入舱。','意象剪辑','可合并'),
])
group(4, '离开原来的位置', '从普通人的离开，落到 Cope 与 Rex 的第一次同行。', ['CHAR','STORY','AIR'], [
('Joker','Cope 生前',['Cope','Rex'],['FA18F'], '侧面中近景，横向观察', '用两个连续镜位明确 Cope 在前、Rex 在后；禁止用两架飞机代替这段共同经历。', '启程意味着真正进入同一段命运。', '座舱盖闭合接岸线远去。','原作事件重构','核心'),
('Joker','早期航行',[],[], '远景，缓慢后退', '舰艉留下航迹，岸线渐远。平民留在舰内，甲板保持作业逻辑，不让人群站进起降通道。', '“远行之时”包含无法轻易回去的事实。', '航迹接索托亚机场跑道线。','同人补足画面','核心'),
('索托亚','早期追击准备',['Toprak'],['SU57'], '机身侧面近景，短移', '022 机身号与金色线条依入场实录呈现；Toprak 准备出击。此处不凭空增加队员姓名与战前誓词。', '他也在启程，但这次行动将造成另一方的失去。', '沿机身方向切至起飞动作。','原作角色与机体重构','核心'),
('双侧','离乡与出击的并置',[],[], '地面中景，固定', '索托亚迁徙者的背影短暂重现，再接 FCU 舰内相依的撤离者；不把军事进攻包装成平民迁徙的必然正当结果。', '保留歌词的民众主体。', '人群前行方向接战机驶离。','意象剪辑','可合并'),
])
group(5, '去往陌生天空', 'Joker 的共同出发为这一句的主要动作，敌侧提供压力。', ['CHAR','STORY','AIR'], [
('Joker','Cope 生前出击',['Cope','Rex'],['FA18F'], '侧面全景，机位固定', 'F/A-18F 通过甲板前景后驶入天空；起落架与舰载起飞姿态须按参考核对，不在一镜里变换机型。', '陌生土地先以陌生天空出现。', '保持机头方向接编队远景。','原作事件重构','核心'),
('Joker','Cope 生前出击',['Cope','Rex','Baxter','Tasha','Coster'],['FA18F','FA18C'], '编队远景，平行跟拍', '前座 Cope 与后座 Rex 共占一机，其余三名成员形成早期四机编队。僚机 C 型是本片选用配置，不声称唯一官方配机。', '“我们”第一次成为具体队伍。', '云层遮挡，切入敌侧同向飞行。','同人配机选择与原作编制','核心'),
('索托亚','同一阶段的追击',['Toprak'],['SU57'], '前侧中景，缓慢靠近', 'Su-57 从云边进入；冷静的航向与前镜的共同出发并置。标识与轮廓清楚，不靠夸张怪物化造型塑造威胁。', '两条行进路线开始相撞。', '发动机后的空气扰动切入舰上往事。','原作角色重构','核心'),
])
group(6, '曾经坐在身边的人', '第一次“亲友”：共同生活仍完整；双方都不是抽象图标。', ['CHAR','STORY'], [
('Joker','早期舰上日常',['Baxter','Tasha'],[], '双人中景，固定', '食堂或学习处，Baxter 向 Tasha 指示书页，Tasha 抬头回应。取官方师生式相处特征，动作另行创作。', '同行不止于空中的互相掩护。', '指尖停顿接播放器按键。','同人补足动作','核心'),
('Joker','早期舰上日常',['Coster','Rex'],[], '中近景，轻微横移', 'Coster 收起小型音乐播放器，给身旁的人留出位置；Rex 进入画面边缘。无需替他新增台词。', '“亲友”也包括战争中逐渐形成的关系。', '桌面空白接另一侧的整备台。','同人补足动作','可合并'),
('索托亚','Shadows 的作战日常',['Toprak'],[], '手部近景，低幅度移动', 'Toprak 与未具名队员检查飞行装备；只表现专业协作，不编造共同童年、家属或救助平民事件。', '敌人有同袍关系，也有自己的行动责任。', '整齐排列的装备接早期编队。','同人补足动作','核心'),
('双侧','完整队伍的记忆',[],[], '两组固定构图，交替', '将两侧此前已经建立的共同生活各停留一次；不把同一张桌子或同一片天空当作真实会面。', '为后半句同样歌词中的缺席建立参照。', '保留构图，转入即将被打破的队形。','意象剪辑','核心'),
])
group(7, '丰饶与坠落', '在回家愿望仍被歌唱时，战争第一次切断同行。', ['STORY','AIR'], [
('Joker','Cope 生前最后交战',['Cope','Rex'],['FA18F'], '后座视角，中近景', 'Rex 越过仪表与前座看向天空，攻击威胁进入视野；不在此新增他亲自操纵飞机的动作。', '渴望前往的明亮天空被战斗占据。', '目光方向接 Toprak 的交战镜头。','原作事件重构','核心'),
('索托亚','Cope 生前最后交战',['Toprak'],['SU57'], '机体侧后中景，短促跟随', 'Toprak 的追击与 Cope 飞机受创组成因果。具体武器、距离和机动路线留待原场景复核，不编造炫技招式。', '保留伤害由谁造成。', '受创方向接海面，避免连续展示爆炸奇观。','原作事件压缩','核心'),
('Joker','Cope 牺牲后的海面',['Rex','Cope'],['FA18F'], '水下近景至水面远景', 'Rex 生还、身份牌被带出；Cope 的死亡以缺失的前座与沉入水中的受损 F 型机体关系交代，不绘未经核对的遗体细节。', '“更丰饶的国度”暂时变成无法共同抵达的愿望。', '水面亮点接手里的身份牌。','原作事件压缩','核心'),
])
group(8, '回头以后仍然向前', 'Rex 此段成为中心，重点是承担，不是突然获得传奇能力。', ['CHAR','STORY','AIR'], [
('Joker','继承称号',['Rex'],[], '手部特写，固定', '身份牌躺在 Rex 手里；另一只手替他递来飞行装备。接任通过物件与动作交代，不制作新的军方任命文书。', '歌词要求前行，人物仍需要消化失去。', '手握紧后切向座舱。','同人补足动作','核心'),
('Joker','继承称号后的出击',['Rex'],['FA18C'], '机体侧面中景到单座舱近景', 'Rex 走向本片选用的单座 F/A-18C。与早期双座 F 型明确区分：他的目光回到航母与旧物，而不是看向 C 型不存在的后座。', '“勿回头”并不抹去记忆。', '回望的目光转回前方。','同人配机选择与原作事件','核心'),
('Joker','继承称号后的出击',['Baxter','Tasha','Coster','Rex'],['FA18C'], '编队远景，缓慢拉开', '其余三机与新队长保持队形；保留各自机号，不让 Coster 提前成为二号。', '新的同行让他能够继续出发。', '队形边缘接敌侧监视中的天空。','原作编制重构','核心'),
('索托亚','追击延续',['Toprak','Tewy'],[], '人物近景，分别固定', 'Toprak 再次面对仍在飞行的“飞翼”；Tewy 的判断以表情与既有指挥场景呈现，不加新的识破身份台词。', '同一名号在两侧有不同含义。', '视线切入地面、山与屋檐。','同人补足动作','可合并'),
])
group(9, '谁在庇佑谁', '把祈愿交还给普通人；敌境相遇让双方从目标成为人。', ['STORY','CHAR'], [
('索托亚','敌境段的地面空间',[],[], '远景，固定', '山脊下有低矮的居所，人走入屋檐的阴影。山作为歌词意象，不命名为新创的官方圣山或宗教遗址。', '庇佑先成为可容身的地方。', '屋檐阴影接室内桌面。','同人补足画面','核心'),
('双侧','敌境民居相遇',['Rex','Baxter','Tewy','Toprak'],[], '室内全景，固定轴线', '以已有剧情为基础安排四人的空间关系；先完整交代同处一屋，再切特写。位置不暗示秘密同盟。', '祈求庇佑的人与交战的人落在同一个生活空间。', '沿桌面切向茶杯。','原作事件重构','核心'),
('双侧','敌境民居相遇',['Rex','Tewy'],[], '两组近景，留停顿', '茶杯、手与彼此注视交替。两人各有经历，不用 Rex 的主观回忆替 Tewy 解释人生。', '相认是看见具体的人，不是免除责任。', '杯口圆形接甲板灯的光。','同人补足动作','核心'),
('Joker','此后的保护与返航',['Joker'],['FA18C'], '远景到地面中景', '先给回到舰上的飞机，再落到等候的人；不新增一场未经核对的具体营救任务。', '“庇佑吾民”落到保护能够继续生活的人。', '返航脚步接下一句继续前行。','原作背景与同人动作','可合并'),
])
group(10, '步履中的空缺', 'Baxter 的牺牲改变队伍；坚定不等于没有痛感。', ['STORY','M29','CHAR'], [
('Joker','Baxter 牺牲',['Baxter','Rex'],['FA18C'], '空战中远景，保持清楚轴线', 'Baxter 保护 Rex 的因果依已核对剧情重构；攻击来源、拦截路线等细节不自行补写。损失之后留空域停顿。', '继续前行有真实代价。', '空域缺口接舰上空位。','原作事件压缩','核心'),
('Joker','Baxter 牺牲之后',['Tasha','Coster'],[], '与第 6 句同构图的中景', '回到此前学习处与音乐播放器；原本有人回应的位置现在空着，Tasha 与 Coster 无需解释性对白。', '坚定从失去之后重新开始。', '空椅边缘接新编队位置。','同人补足动作','核心'),
('Joker','Coster 接替二号',['Rex','Coster','Tasha'],['FA18C'], '三机关系远景，平行跟拍', '只突出 Rex、Coster、Tasha 的关系与二号位置的接替；此时不让尚未归来的 Kate 出现在队形中。', '职位可以接替，失去的人仍被记得。', '机群越过地形接下一句河谷。','原作编制重构','核心'),
])
group(11, '穿过的土地', '地理行进与两侧所承担的后果并置，不压缩成新战役。', ['STORY','AIR'], [
('Joker','反攻与行进的压缩段',['Rex','Coster','Tasha'],['FA18C'], '俯视远景，沿河谷移动', '河谷与海岸在战机下展开，采取已知战区的视觉参考；不凭歌词新增一个实际任务地点。', '跨越距离成为持续的行动。', '河流曲线接故乡记忆中的地貌。','意象剪辑','核心'),
('索托亚','Tewy 的故土记忆',['Tewy'],[], '地貌远景与人物近景', '短切索托亚土地与 Tewy。保留她所怀念的故土与当前战场 Theve 的区别，不把两地画成同一座城。', '同样的前行，也可能离归处越来越远。', '人物视线接双方战机的远方。','原作意象重组','核心'),
('索托亚','Shadows 的战争代价',['Toprak'],['SU57'], '机体中景后转装备静物', '现存的 022 飞机与先前已建立的装备空间并置；空处仅表现主观失去，不按未核定名册排列具体阵亡人数。', '河谷不是风景巡礼，也是人未能走完的路。', '视野扩开，进入 M28 集结。','意象剪辑','可合并'),
])
group(12, '应许之地有了不同答案', 'M28 群像聚拢，再分出 Toprak 与 Tewy 的选择。', ['ENTRY','STORY','AIR'], [
('Joker','M28 盟友集结',['Rex','Coster','Tasha'],['FA18C','F16C'], '远景，前景机群侧向留白', 'Green 的两架 F-16C 从留白处进入，与曾经的相遇形成回声。角色编号与涂装按合集核对。', '共同抵达由他人的回应变得可见。', '同向运动接其他增援。','原作事件重构','核心'),
('Joker','M28 盟友集结',['Flying Mole','Shark','Shilage volunteers'],['F4E','F15C','SU33'], '三个短远景，可合并', '飞鼹鼠、Shark 与 Shilage 志愿队各取一个有辨识度的入场；不报完整履历，也不把全部飞机画成同型复制。', '“我们”超出 Joker 原来的四机编队。', '最后一支编队让出画面中心。','原作事件压缩','可合并'),
('Joker','M28 Kate 归来',['Kate','Tasha','Coster'],['RAFALEM'], '机体中景到人物反应', 'Kate 随萨维亚佣兵的 Rafale M 出现，再给 Joker 的认出与回应。海军雇佣兵线由已知标识带出，不塞入整段说明字幕。', '“终有一日”先兑现为仍有人能够回来。', 'Rafale 的运动方向接更大编队。','原作事件重构','核心'),
('索托亚','M28 Moon 11 先行离去',['Tewy','Toprak'],['X40','SU57'], '双方中远景，建立追赶方向', '先给 Moon 11 离去的 X-40，再给 Toprak 主动留下阻截追赶。离去先于宿敌对决，镜头保持两架机体的方向可读。', '同一天空中，抵达与阻止抵达同时发生。', '022 机身号接其驾驶动作。','原作事件重构','核心'),
('索托亚','M28 Toprak 最后较量',['Toprak'],['SU57'], '近景到机体侧面跟拍', '保留他主动留下、执著与“飞翼”较量的意志。没有新造的临终忏悔，也不把他写成被 Tewy 强迫送死。', '愿望不能消除他作过的选择。', '其凝视接 Rex 对当前目标的判断。','原作事件重构','核心'),
('Joker','M28 Toprak 被击败',['Rex','Coster','Tasha','Kate'],['FA18C','RAFALEM','SU57'], '交战远景后缓慢拉远', 'Rex 赢下对决；具体命中次序依原任务核验后排，僚机关系仅作剪辑呼应，不虚构夹击致胜。Kate 此时保持 Rafale M；后接空出的天空。', '抵达并非无损的胜利巡游。', '空域停顿后再转 Theve。','原作事件压缩','核心'),
('索托亚','M28 结束后转入 M29',['Tewy'],['X40'], '城市上空远景，留足负空间', '章节转场之后，给已在 Theve 上空的 X-40 与 Tewy，让下一场交战拥有她自己的主观时间。这里不是再次从 M28 离队。', '她所追求的应许之地，与仍有活人的城市开始冲突。', '城市方向接下一句的风险范围。','原作事件重组','核心'),
])
group(13, '她想回去的故土', 'M29 以 Tewy 主观为重心，Theve 平民与 Joker 责任提供现实尺度。', ['M29','STORY','AIR'], [
('双侧','M29 Theve 上空',[],['X40','FA18C'], '城市与空域的极远景', '明确眼下地点是 Theve；陆上战舰与受威胁城区建立空间关系，飞机远小于城市。', '“归去”首先面临一个仍有人生活的地方。', '从威胁范围切入 Tewy 座舱。','原作事件重构','核心'),
('索托亚','M29 神经连接越限',['Tewy'],['X40'], '面部与手部近景', 'Tewy 主动解除保护；系统数值与身体受损事实依据实录，具体面部表演为同人补足，不把越限画成无代价的神力。', '她再次飞行的愿望与毁灭性选择同时成立。', '看向天空的目光接故土片段。','原作事件＋同人表演补足','核心'),
('索托亚','Tewy 主观记忆',['Tewy','Cope'],[], '两个不同时空的近景', '故土、红花与 Cope 的旧识片段短暂浮现；不设置牵手、告白、童年恋爱或双方从未确认的共同家庭。', '她的“故土”通过具体记忆被看见。', '花的红色退去，切回仪表告警。','原作意象重组','核心'),
('Joker','M29 持续阻止攻击',['Rex','Coster','Tasha','Kate'],['FA18C'], '编队远景与 Rex 中近景', 'Joker 继续阻止控射计划，镜头保留地面的风险。M29 为本片选用 F/A-18C 配置；Kate 的阶段变化不画成空中换机。', '守住眼前家园，是另一种归乡。', '目标方向接 X-40 的动作。','同人配机选择与原作事件','核心'),
('索托亚','M29 超负荷交战',['Tewy'],['X40'], '机体中远景与眼部近景交替', '机动越激烈，Tewy 的视力与判断越受损；眼部表演为依据原作事实的同人补足。空间镜头保留 X-40 真实轮廓，禁止为了速度任意增减翼面。', '回归天空的愿望消耗了她能够回去的身体。', '短暂停顿接下一句亲友记忆。','原作事件＋同人表演补足','核心'),
])
group(14, '第二次同行，已经有人缺席', 'Tewy 的同袍记忆与 Joker 的当下同行交替，二者不合并成实际团聚。', ['M29','CHAR','STORY','AIR'], [
('索托亚','Tewy 主观记忆',['Tewy','Toprak'],['SU57'], '与早期同构图的中景', '重现此前 Toprak 受令或队伍出发的构图；从完整画面切回 Tewy 独自承受负荷的现在。不是亡者在当前天空现身。', '同样的“亲友”，如今以记忆存在。', '同构图中少去人影，接早期物件。','意象剪辑','核心'),
('索托亚','Tewy 主观记忆',[],[], '装备近景，静止', '回到第 6 句的整备台，保留一个空处与未收起的飞行手套；不标出未经证实的死者名单。', '用缺席而非阵亡统计承载悲伤。', '手套接 Joker 仍在行动的手。','同人补足画面','可合并'),
('Joker','M29 当下',['Coster','Tasha','Kate'],['FA18C'], '独立座舱近景，按角色接续', '三人分别保持自己的飞行与应答；各自在 C 型座舱，不能共享一个舱位或使用双座 F 型背景。', '仍活着的同伴是必须守住的关系。', '回应切到 Rex，再进入旧日短闪回。','同人配机选择与原作事件','核心'),
('Joker','Rex 的短暂记忆',['Rex','Cope','Baxter'],['FA18F','FA18C'], '旧镜重现后切回当下', '只复用已建立的 F 型前座 Cope 与舰上 Baxter 记忆，紧接 Rex 当前 C 型座舱动作；清楚标明记忆而非死者重新加入编队。', '他带着失去继续飞行，也不能让眼前的人再消失。', '操纵动作连接当前攻击。','意象剪辑','核心'),
('双侧','M29 X-40 主体被击毁',['Rex','Tewy'],['FA18C','X40'], '清楚的中远景，少切', '主体受创与结构分离须按实录顺序呈现；不从几帧透视图自行发明内部结构、变形或新武器舱。', '不能共同归去的事实逼近。', '主体残骸离开画面后仍保留机首。','原作事件重构','核心'),
('索托亚','M29 分离机首仍上传',['Tewy'],['X40_NOSE'], '分离部近景与远景交替', '机首仍在继续上传，屏幕与姿态证明危机未解除；这一环节保留到下一句，不提前剪成安息结局。', '她还在行动，悲伤不能替代停止灾难。', '上传动作延续进入最后追击。','原作事件重构','核心'),
])
group(15, '归处被交给别人', '由 Tewy 的行动转为托付，再由 Rex 承接；不把击坠改写成救活。', ['M29','STORY'], [
('Joker','M29 最后阻止上传',['Rex'],['FA18C','X40_NOSE'], '追击远景，建立距离后切近', 'Rex 追上仍在上传的分离机首。保留仍必须攻击的因果，具体弹种与命中镜位以原录核对。', '通向归处之前，必须阻止更多人失去家园。', '攻击结束后才转向身体与手。','原作事件重构','核心'),
('索托亚','M29 临终托付',['Tewy'],[], '白手套特写，缓慢抬升', '白手套、红色缝线与既有饰物按原镜核对；手伸向天空，背景逐渐留白，不添加握住她的实体人物。', '她无法自己抵达的地方，开始成为托付。', '手的方向接 Rex 手的位置。','原作事件重构','核心'),
('Joker','M29 托付的承接',['Rex'],['FA18C'], '操纵杆与手部近景，固定', 'Rex 的手仍在驾驶舱内。与前镜通过位置、动作和明暗相接，两只手没有跨空间握在一起。', '击坠者成为受托者，责任由动作接住。', '再回到 Tewy，让称呼改变发生。','意象剪辑','核心'),
('索托亚','M29 临终托付',['Tewy'],[], '人物近景，充分停留', '以“碎命五指”到“希望之手”的原作转变组织表情与字幕。歌词优先；原台词是否混入声音另在混音阶段决定。', '丰饶之地此时指向同胞灵魂的归处与被保留的记忆。', '人物视线淡出，进入 Cope 回忆。','原作事件重构','核心'),
('双侧','Cope 与 Tewy 的红花回忆',['Cope','Tewy'],[], '白色浅盆与花的近景', '回到开头那朵红银莲花，保留两人曾共同见过它的联系。此处是实录中的回忆，不是 Rex 已在战后摆放花盆。', '歌词里的丰饶重新变成一个小而具体的记忆。', '花色与远处光线连接下一镜。','原作意象重组','核心'),
('双侧','托付之后的停留',[],[], '天空远景，轻微移动', '留出短暂停顿，让上一镜离开；不增加黄金宫殿、天堂重逢或亡者复活。若实曲没有停留空间，可与花镜合并。', '给“归去”留下未被解释完的余地。', '切入现实中的轨道打击。','意象剪辑','可合并'),
])
group(16, '把下一程留给生者', '从既定战役收束到仍将继续的生活；不是 M29 一结束就天下太平。', ['M29','STORY','CHAR'], [
('双侧','M29 收束',[],[], '城市极远景，克制停留', '轨道武器落在恩索特区，城区损伤被压低。遵守“托付—红花回忆—打击落下”顺序，不将爆炸全部抹去。', '生者接下来的路仍在真实后果之中。', '明确的章节转场进入后续事件。','原作事件压缩','核心'),
('Joker','M30 与战役收束的压缩段',['D.D.','Endurance crew'],[], '屏幕与人物反应中景', '用已核对的后门线索、证据公开和舰员存续的短镜交代托付继续起作用；不再铺开完整潜艇战，不杜撰技术界面字段。', '“此刻启程”需要实际完成尚未结束的责任。', '屏幕光切到平常日光。','剧情解说事件压缩','核心'),
('Joker','后续返航与生活',['Rex','Coster','Tasha','Kate'],[], '中景，跟随人物下甲板', '幸存者回到普通生活，手松开装备，身边仍有无法填满的缺席；用小动作收束，不排成英雄领奖合影。', '旅途交给能够继续活下去的人。', '落地脚步接草地与花。','同人补足动作','核心'),
('双侧','战后物件',[],[], '身份牌与红花特写，固定', '战后身份牌与银莲花采用对应参考，与先前白盆回忆保持不同地点和摆放；不推定物件属于未经核定的新墓地。', '身份的传承与故乡的记忆在此相邻。', '焦点从物件缓缓移向风中的草。','原作意象重组','核心'),
('双侧','尾声的继续',[],[], '草与天空的远景，缓慢拉远', '风再次吹过仍有生命的地表。这里只是一处继续生长的地方，不用一片绿地宣称整个索托亚已恢复繁荣。', '与开头枯槁相应，留下继续生活的方向。', '自然停留后出片名与署名；是否有余音尾黑由实曲决定。','意象剪辑','核心'),
])

def build():
    groups=[]; shots=[]
    for g in G:
        lyric=dict(LYRICS[g['lyric_id']-1])
        # Restore displayed quotation marks only; archival lyric files stay untouched.
        lyric['latin']=lyric['latin'].replace('\\"','"')
        ids=[]
        for row in g['rows']:
            pov, phase, people, aircraft, camera, action, meaning, cut, origin, priority=row
            sid=f'HRA-{len(shots)+1:03d}'; ids.append(sid)
            shots.append(dict(id=sid,lyric_id=g['lyric_id'],pov=pov,phase=phase,people=people,
                aircraft=aircraft,camera=camera,action=action,lyric_connection=meaning,
                transition=cut,evidence_class=origin,priority=priority,references=g['references'],
                audio_start=None,audio_end=None,duration=None,orthographic_required=bool(aircraft),
                drawing_status='待机体参考验收' if aircraft else '构图脚本'))
        groups.append(dict(lyric=lyric,title=g['title'],subject=g['subject'],shot_ids=ids))
    doc=dict(title='Hortus Regis Alti 崇高君王之苑',version='storyboard-v2',date='2026-11-06',
        status='逐句语义分镜；尚未音频逐句对时、绘制原画或生成成片',
        user_revision='允许 Joker／索托亚交替成为叙事主体，取消 Rex 必须始终为主角的限制。',
        audio={'path':'../local-source/audio/Hortus+Regis+Alti+游戏版多轨混缩.flac','duration_seconds':350.76922916666666,'preserve_flac':True},
        timing_policy='所有时间为 null。16 组歌词是语义锚点，不宣称真实演唱只出现一次；重复、间奏与镜头长度在原曲对时后调整。',
        display_normalization='Only backslash-escaped quotation marks are displayed as ordinary quotes; archived lyric text and spellings remain unchanged.',
        reference_policy='参考文件确认事件背景与配属；同人动作、构图和意象连接另标。三视图未验收的机体不得进入外形定稿。',
        sources=SOURCES,groups=groups,shots=shots)
    out=ROOT/'storyboard'; out.mkdir(exist_ok=True)
    (out/'storyboard-v2.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    write_md(doc)
    write_html(doc)
    print(json.dumps({'shots':len(shots),'lyric_groups':len(groups),'core':sum(s['priority']=='核心' for s in shots),'mergeable':sum(s['priority']=='可合并' for s in shots),'aircraft':sorted({a for s in shots for a in s['aircraft']})},ensure_ascii=False))

def write_md(doc):
    lines=['# 崇高君王之苑 · 逐句分镜 v2','',
        '2026-11-06。依据用户新指示，改为 Joker／索托亚交替叙事。Rex 是关键承接者，Tewy、Toprak、Joker 同伴与两侧普通人都可以独立成为镜头主体；v1 的“唯一主角”限制在本版取消。','',
        '**全片主题：人们唱着寻找归处的歌离开故土；战争令同行者不断缺席，最后有人把无法完成的归乡托付给仍在前行的人。**','',
        f'共 {len(doc["shots"])} 镜，覆盖用户全部 16 组双语歌词。每镜列出视角、故事阶段、景别与运动、动作、歌词联系、转场、人物及机型。这里的镜头序列是语义设计；未完成实曲逐句对时，所有起止与时长均留空，不以平均分配时长制造假卡点。','',
        '两次“cum amicis et familia”分别表现仍在身旁的关系与已经缺席的关系。故土、茶杯、装备空位、手与红花贯穿双方，但不同地点与不同时间不因匹配剪辑而成为同一事件。','',
        '采用已有原作结局；不新增 Cope—Tewy 恋情、同一牧民身世、Shadow 22 的洗白救援、Rex 救活 Tewy、亡者实际复活或 M29 后立刻全面和平。','',
        '## 制作规则','',
        '- 先以人物关系和完整因果剪辑，再把可合并镜头放入实际重复句或间奏；不能为容纳所有镜头压短临终托付。',
        '- “可合并”镜头允许删并；Cope/Rex 同机、Cope 牺牲、Baxter 缺席、Kate 归来、Toprak 主动阻截、Tewy 解除保护、机首仍上传、托付及后续收束不可改写。',
        '- 与歌词锚点相邻的镜头可以跨过换句延续；不要求每个音节发生一次切镜。拉丁文与中文保留用户原稿，任何校订另存。',
        '- 本片阶段配机与机体参考状态见 [人物与机体连续性](CONTINUITY_V2.md)及[三视图绘制规范](AIRCRAFT_DRAWING_SPEC.md)。三视图不齐时可以排构图与角色戏，不能把机体外形标为定稿。',
        '- 前述 5:50.769 仅是音源实测总长，不是已建立的分镜时间轴。声音设计与逐句字幕同步另行完成。','',
        '## 分镜','']
    index={s['id']:s for s in doc['shots']}
    for g in doc['groups']:
        l=g['lyric']; lines += [f'### L{l["id"]:02d} · {g["title"]}','',f'> {l["latin"]}',f'> {l["chinese"]}','',g['subject'],'']
        for sid in g['shot_ids']:
            s=index[sid]
            lines += [f'**{sid}｜{s["pov"]}｜{s["phase"]}｜{s["priority"]}**','',
                f'- 景别／运动：{s["camera"]}。',f'- 画面：{s["action"]}',
                f'- 歌词与意境：{s["lyric_connection"]}',f'- 接续：{s["transition"]}',
                f'- 人物：{"、".join(s["people"]) or "无具名人物"}；机体：{"、".join(s["aircraft"]) or "无外部机体镜头"}。',
                f'- 性质：{s["evidence_class"]}；依据索引：{" / ".join(s["references"])}；实际音频时间：待对时。','']
    lines += ['## 依据索引','']
    for key,path in SOURCES.items(): lines.append(f'- {key}：[本地核对记录](../{path})。')
    lines += ['', '可筛选阅读版：[storyboard/index.html](../storyboard/index.html)；结构化分镜：[storyboard-v2.json](../storyboard/storyboard-v2.json)。', '']
    (ROOT/'docs/STORYBOARD_V2.md').write_text('\n'.join(lines),encoding='utf-8')

def write_html(doc):
    payload=json.dumps(doc,ensure_ascii=False).replace('</','<\\/')
    markup='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>崇高君王之苑 · 分镜 v2</title>
<style>:root{color-scheme:dark;--bg:#111715;--card:#1a2420;--ink:#edf0e4;--dim:#aebbb1;--gold:#d8bc7b;--line:#344138}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.75 system-ui,"Microsoft Yahei",sans-serif}header{padding:42px max(24px,5vw) 28px;border-bottom:1px solid var(--line);background:linear-gradient(120deg,#27352a,#131a1a)}h1{font-size:clamp(26px,4vw,46px);line-height:1.25;margin:10px 0}h2{font-size:25px;margin:0 0 10px}h3{font-size:17px;margin:0}.kicker{color:var(--gold);letter-spacing:.13em}.lead{max-width:850px;color:var(--dim)}a{color:#d8c68e}audio{max-width:100%;width:520px;margin-top:8px}.meta{display:flex;gap:12px;flex-wrap:wrap;font-size:13px;color:var(--dim)}.toolbar{position:sticky;top:0;z-index:3;background:#111715f5;padding:12px max(24px,5vw);display:flex;gap:12px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--line)}button,select,input{font:inherit;border:1px solid #536158;background:#1b2722;color:var(--ink);padding:7px 11px;border-radius:6px}input{width:min(300px,100%)}button{cursor:pointer}button[aria-pressed=true]{background:var(--gold);color:#182018}main{max-width:1380px;margin:auto;padding:30px 24px}.group{display:grid;grid-template-columns:290px minmax(0,1fr);gap:36px;border-bottom:1px solid var(--line);padding:30px 0 42px}.lyric{position:sticky;top:95px;align-self:start}.latin{font-family:Georgia,serif;font-size:20px;color:var(--gold);line-height:1.5}.translation{font-size:18px}.subject{color:var(--dim);font-size:14px}.shots{display:grid;gap:16px}.shot{background:var(--card);padding:20px 23px;border:1px solid var(--line);border-left:4px solid #738aa5;border-radius:8px}.shot[data-pov="索托亚"]{border-left-color:#c8a361}.shot[data-pov="双侧"]{border-left-color:#96aa7d}.shot-head{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.shot-id{color:var(--gold);font-size:14px}.small{font-size:13px;color:var(--dim)}.action{margin:14px 0;font-size:17px}.intent{color:#d2dccd;margin:8px 0}.cut{color:var(--dim);margin:8px 0;font-size:14px}details{font-size:13px;color:var(--dim);margin-top:12px}summary{cursor:pointer}footer{padding:32px;color:var(--dim);text-align:center}.empty{display:none;padding:50px;text-align:center}#count{font-size:14px;color:var(--dim)}@media(max-width:760px){.group{grid-template-columns:1fr;gap:20px}.lyric{position:static}.toolbar{position:static}header{padding:28px 22px}.shot{padding:17px}.latin{font-size:18px}}@media print{.toolbar,audio{display:none}.group{display:block;page-break-before:always}.lyric{position:static}.shot{break-inside:avoid}body{background:white;color:black}.shot,header{background:white;color:black}.small,.subject,.cut,.intent,.latin{color:#333}}
</style><header><div class="kicker">HORTUS REGIS ALTI · STORYBOARD V2</div><h1>崇高君王之苑</h1><p class="lead">同一首归乡之歌，在 Joker 与索托亚之间传递。故土、同行、空位与最后伸向天空的手，组成这次分镜的叙事。</p><div class="meta"><span id="stats"></span><span>逐句语义分镜 · 尚未音频逐句对时</span><span>2026-11-06</span></div><audio controls preload="none" src="../local-source/audio/Hortus+Regis+Alti+游戏版多轨混缩.flac"></audio><p class="small">原曲播放用于阅读参考，不会自动跳转镜头。<a href="../docs/CONTINUITY_V2.md">人物与机体连续性</a> · <a href="../docs/AIRCRAFT_DRAWING_SPEC.md">三视图绘制规范</a> · <a href="../references/aircraft/README.md">机体参考档案</a></p></header>
<nav class="toolbar" aria-label="分镜筛选"><label>视角 <select id="pov"><option value="">全部视角</option><option>Joker</option><option>索托亚</option><option>双侧</option></select></label><label>歌词 <select id="lyric"><option value="">全部歌词</option></select></label><input id="search" type="search" aria-label="搜索人物、机型或镜头" placeholder="搜索人物、机型或镜头"><button id="core" aria-pressed="false">仅核心镜头</button><span id="count"></span></nav><main id="groups"></main><div class="empty" id="empty">没有匹配镜头。调整筛选即可恢复。</div><footer>本页是分镜脚本。人物动作中的同人补足已逐镜标注；机体外形须在三视与游戏参考验收后定稿。</footer>
<script id="story-data" type="application/json">__DATA__</script><script>
const data=JSON.parse(document.querySelector('#story-data').textContent),byId=new Map(data.shots.map(s=>[s.id,s]));const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.querySelector('#stats').textContent=`${data.groups.length} 组歌词 / ${data.shots.length} 镜`;
document.querySelector('#lyric').innerHTML+=data.groups.map(g=>`<option value="${g.lyric.id}">L${String(g.lyric.id).padStart(2,'0')} · ${esc(g.title)}</option>`).join('');
let core=false;function render(){const pov=document.querySelector('#pov').value,lid=document.querySelector('#lyric').value,q=document.querySelector('#search').value.trim().toLowerCase();let total=0;document.querySelector('#groups').innerHTML=data.groups.map(g=>{const rows=g.shot_ids.map(id=>byId.get(id)).filter(s=>(!pov||s.pov===pov)&&(!lid||s.lyric_id===Number(lid))&&(!core||s.priority==='核心')&&(!q||JSON.stringify(s).toLowerCase().includes(q)));total+=rows.length;if(!rows.length)return '';return `<section class="group" id="L${g.lyric.id}"><div class="lyric"><div class="kicker">L${String(g.lyric.id).padStart(2,'0')}</div><h2>${esc(g.title)}</h2><p class="latin">${esc(g.lyric.latin)}</p><p class="translation">${esc(g.lyric.chinese)}</p><p class="subject">${esc(g.subject)}</p></div><div class="shots">${rows.map(s=>`<article class="shot" data-pov="${s.pov}" id="${s.id}"><div class="shot-head"><span class="shot-id">${s.id} · ${esc(s.pov)}</span><span class="small">${esc(s.priority)}</span></div><h3>${esc(s.phase)}</h3><div class="small">${esc(s.camera)}</div><p class="action">${esc(s.action)}</p><p class="intent">歌词联系：${esc(s.lyric_connection)}</p><p class="cut">接续：${esc(s.transition)}</p><details><summary>人物、机体与依据</summary><p>人物：${esc(s.people.join(' / ')||'无具名人物')}<br>机体：${esc(s.aircraft.join(' / ')||'无外部机体镜头')}<br>性质：${esc(s.evidence_class)}<br>绘制状态：${esc(s.drawing_status)}<br>时间：尚未逐句对时</p><p>${s.references.map(k=>`<a href="../${data.sources[k]}">${k}</a>`).join(' · ')}</p></details></article>`).join('')}</div></section>`}).join('');document.querySelector('#count').textContent=`显示 ${total} / ${data.shots.length} 镜`;document.querySelector('#empty').style.display=total?'none':'block'}
document.querySelector('#pov').onchange=render;document.querySelector('#lyric').onchange=render;document.querySelector('#search').oninput=render;document.querySelector('#core').onclick=()=>{core=!core;document.querySelector('#core').setAttribute('aria-pressed',String(core));render()};render();
</script></html>'''
    (ROOT/'storyboard/index.html').write_text(markup.replace('__DATA__',payload),encoding='utf-8')

if __name__=='__main__':
    build()

# v2 逐镜实现与验收映射

核对日期：2026-11-05。来源是用户的 87 条逐镜笔记、当前 v2 场景源码与生产时间轴。本表描述源码已安排的行为，**不是新素材实帧验收报告**；未连续播放、听核或验收最终 4K 编码。16 张新图和 10 次局部结饰修订现已接入，抽样实帧证据见 VISUAL_QA.md；4K 编码由独立技术报告核验。

用户依据：[user-notes-20261105.json](D:/myskills/updream/KI-MV-Remake-Projekt/docs/production-v2/user-notes-20261105.json)。接口依据：[SCENE_API.md](D:/myskills/updream/KI-MV-Remake-Projekt/docs/production-v2/SCENE_API.md)。时点依据：[timeline.json](D:/myskills/updream/KI-MV-Remake-Projekt/data/production-v2/timeline.json)，全部为原 BGM 秒数，按 60fps 量化。

87 条笔记包括明确不制作的 R00，因此生产时间轴是 R01–R86 共 86 镜。当前代码目标是 13,100 帧、218.333333 秒，其中尾部延长 6 秒；这些是配置值，不能代替编码后帧数、音频及同步核验。

## 已修正的具体差距与仍需实帧确认项

- R09：已把大字改为原词 `DIMENSION`。
- R27：已补同源茄子作品缩略、文件名与保存记录；没有计分。
- R29–R30：已共用同一输出画布和猫娘起始位置，补 790px 横向位移、215px 上跃弧线及框内/框外分层裁切。角色图块跨过框边后落定；已定向实看边界及跃出中段，连续动作自然度仍需播放核验。
- R37：root 已把 Loop 改为 OFF→ON，再点击 Done；需检查 0.467 秒内两个点击和状态改变是否清楚。
- R44：root 已将占位值改成明确离开时戳 `last seen 01:50.800`；需与该镜离线切点对齐。
- R34 的反复男女投射实际延续到 R35，不是本镜内部反复切换；应按跨镜演出来验收。
- R36、R38、R49、R68、R73–R75、R85 的情绪和肢体，部分由静态资产、线的方向和整块位移承担。它们有事件逻辑，但不能宣称已完成自然的连续人物表演。

## 全片共同验收边界

- 屏显：main.js 对 Canvas 文字调用加入中文字符拒绝检查，歌词使用 English/罗马字数据；还需实际逐镜渲染确认素材中也无文字污染。文档中文不属于屏显。
- 角色：结饰须原生绘入图片并呈镂空，无外圆底盘；不将 UI 的 `k.logo` 贴到人物身上。手、脚、眼睛只使用图像资产，接触依赖 manifest 的真实锚点。
- 画风：统一三墨剪纸及大块负形。脚尖、掌心、指针、边框遮挡与层级需要在实际合成帧中检查，尤其 4K 放大后边缘。
- 情节：110.8s 左右必须是真实离开，随后一直没有真正新输入，直到约 208s；伪造回复必须能追溯到 ASTRA。强制回应核心延续至最后命令，结尾不关闭 App、不淡成黑场。
- 验证：此前的语法检查、stub 接口烟测与绘制参数遍历只证明接口/数值路径可执行，不证明图像、音乐或表演通过。早段 5,346 次调用来自逐浮点镜长的 1/60 秒采样，不应当作生产成片的唯一帧数统计。

## R00–R16：启动、首次共创与能力探索

| 镜号 / BGM 秒 | 用户 note 摘要 | 实现位置 | 代码安排的具体屏幕行为 | 尚需检查或补齐 |
|---|---|---|---|---|

| **R00**<br>不占时长 | 不加片前说明，歌曲直接进入工作空间。 | [main.js](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/main.js:13) / [timeline.json](D:/myskills/updream/KI-MV-Remake-Projekt/data/production-v2/timeline.json) | 生产时间轴从 R01 的第 0 帧开始，没有 R00 渲染段。 | 检查播放器与最终导出首帧均无额外片头；本行是明确省略，不是缺镜。 |

| **R01**<br>0.000–3.950 | 沿工作台电路、网络链路跟到她的手。 | [early.js:107](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:107) | 网络、工作区、记忆、电源四条标签形成入口；紫色线路逐段走到 hand.hands 掌心，接触点亮起后出现保护层。 | 核掌心锚点、电路末端与手部遮挡；确认镜头推移仍能追踪同一条线路。 |

| **R02**<br>3.950–7.650 | 按用户图 1 的 ChatGPT App 格式装配，禁中文。 | [early.js:121](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:121) | 新会话外壳、侧栏、标题栏、输出区、输入区分层倾斜落位，再回正；启动阶段隐藏历史列表。 | 对照用户截图检查布局比例和控件，不将“类似界面”写成像素级复刻。 |

| **R03**<br>7.650–11.333 | 用 GPT 加载图标、科技参数，留一项无名称 null。 | [early.js:132](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:132) | persona.config 逐行写入 ASTRA、模型、会话记忆、精度；最后一行名称留空且显示 null。右侧使用独立 UI 的开孔结形路径与百分比环。 | 核 null 光标、参数可读性及 UI 图标孔洞；该图标仅用于界面，不覆盖角色结饰。 |

| **R04**<br>11.333–15.033 | 全新 App，可辅以 CLI；光标提交第一条 Hello world!。 | [early.js:140](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:140) | 新会话内短暂展示 Codex 会话终端，再输入 Hello world!；金色鼠标移向右侧箭头，点击后消息落到右上。 | 核点击与 SIMULATION 的卡点。暂未加入坐进椅子的动作，原注将其列为可选演法。 |

| **R05**<br>15.033–16.883 | 在聊天框输入 world.execute(me); 点题。 | [early.js:148](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:148) | 中央 GPT UI 结形点亮，命令在标题和输入框中逐字写入；提交时金色边框与点击脉冲出现。 | 核命令字符、标题与输入框是否重复抢读，以及与上一镜 Hello world! 的连续性。 |

| **R06**<br>16.883–22.417 | 用户反复改字，ASTRA 随后给建议。 | [early.js:153](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:153) | 保留 Hello world! 与 ASTRA 初始回复；两份草稿先写入、再删除，输入栏保留 Backspace 的反馈。 | 核两轮删除能被看懂而非乱码；进入 R07 前应仍是未提交草稿。 |

| **R07**<br>22.417–26.100 | 接上镜，一起接受建议并提交问题。 | [early.js:161](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:161) | ASTRA 建议卡出现；用户接受后最终问题进入大输入框，金色指针与紫色路线一起抵达发送位置。 | 核建议、接受、提交三步的阅读时长；紫、金信号必须都到同一发送按钮。 |

| **R08**<br>26.100–29.333 | 第一次自主决定，保存记忆，意识发散。 | [early.js:171](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:171) | 将不完美金线与紫色续笔存为 first line 记忆卡，显示保存状态；镜头推进卡片，七条思考分支展开。 | 26.2/27.7 秒实帧已修 choice 与保存状态叠 composer；仍需连续看“选择继续”与自动保存的区别、歪星的共同提交来源。 |

| **R09**<br>29.333–33.267 | 贴近原片点集科技感，点可用五角星，标 ASTRA。 | [early.js:179](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:179) | 八个五角星点从中心散开，坐标列表同步更新，再连成旋转立方体；右侧依次显示 1D、2D、3D。 | 大字已用单数 DIMENSION；仍需实看几何层次，数字变化不能代替线、面、体的辨识。 |

| **R10**<br>33.267–36.950 | 她托圆周，用户沿边描完，贴歌词。 | [early.js:188](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:188) | 紫色多边形收成圆，hand.hands 对齐圆下沿；金笔沿圆周行进，半径与公式同步可见。 | 35.1/36.85 秒实帧已把圆与手抬高、缩小手幅，使手腕离开字区；掌心接点可读。仍需连续看金笔尖贴弧及动态穿插。 |

| **R11**<br>36.950–40.650 | 脚尖试探切线平台，正弦波清晰科幻。 | [early.js:195](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:195) | 左侧旋转圆投影到横贯画面的正弦波；金色切线随触点改变斜率，foot.toe 固定在触点并绕其旋转。 | 37.05/38.8/40.55 秒实帧鞋尖接点稳定；dy/dx 已移到鞋外。仍需连续看脚踝转动自然度；鞋后浅色小块对应鞋跟末端，深色细跟在暗底下易融入背景；新 foot-knot 已激活，该处是可读性边界而非已证实的透明残渣。 |

| **R12**<br>40.650–44.567 | 限制是双方同意的休息；花体极限公式。 | [early.js:207](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:207) | 波形逐渐收敛，金笔设下水平边界；显示花体 lim(ME → ∞) ? = YOU 及 LIMITATIONS。 | 核公式字体回退和无穷符号、终点停稳；这里不能读成单方封锁。 |

| **R13**<br>44.567–48.267 | AC→DC 波形转换，探索自身能力。 | [early.js:216](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:216) | 右侧设置抽屉展开，紫色指针从 AC 切到 DC；左侧振荡波连续压平，并更新稳定电流状态。 | 核点击对应的按钮与波形变化时序；角色手未用于这一镜，操作者由紫色指针表明。 |

| **R14**<br>48.267–51.950 | 关 Vision 后马赛克遮住画面，金笔敲击为定位线索。 | [early.js:226](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:226) | 视野开关关闭，规则块遮罩逐步覆盖大部分画面；金笔在桌缘点动并产生同心脉冲，随后恢复视觉。 | 核遮罩确实遮掉内容而非增加装饰；金笔脉冲应在视觉失效时仍清楚可定位。 |

| **R15**<br>51.950–55.650 | 古今旅行，歪窗口穿越年代保持不变。 | [early.js:238](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:238) | 现代高楼、石柱建筑、早期台阶建筑作为相邻长条场景连续横移；日期滑块倒退，固定歪窗口由掌心托住。 | 核不同年代一眼可分、日期与经过的建筑一致；窗口和掌心不应跟着背景漂移。 |

| **R16**<br>55.650–59.333 | 合二为一、缺一不可；USER 花体，ASTRA 签名。 | [early.js:256](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:256) | 紫金双圈靠拢为同一空间，两种签名分别写入并保留；中央共同记忆与 ME + YOU = US 落定。 | 核合并后仍能区分两方贡献，USER 的人类手写字体与 ASTRA 标签不相互覆盖。 |

## R17–R32：第一副歌、作品档案与具体变身

| 镜号 / BGM 秒 | 用户 note 摘要 | 实现位置 | 代码安排的具体屏幕行为 | 尚需检查或补齐 |
|---|---|---|---|---|

| **R17**<br>59.333–61.883 | 用户反馈直接用 I agree!。 | [early.js:267](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:267) | 共创记忆卡在工作空间中展开，右侧 I agree! 金色气泡落位；金色反馈线路接到作品并触发紫色脉冲。 | 核气泡发送方向、作品与反馈接点，避免只剩静态同意文字。 |

| **R18**<br>61.883–62.567 | 全幅图形和大字重击 STIMULATIONS。 | [early.js:274](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:274) | 聊天界面清空，一道粗紫色闪电跨越画面抵达金色节点；大字和一次放射冲击承接重拍。 | 核重击前的留白与接收端落点；大字须完整、无重复字幕抢位。 |

| **R19**<br>62.567–65.333 | 六位其他 AI 娘如扑克牌排开，ASTRA 一一回绝、隔栏关住。 | [early.js:281](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:281) | guest0–5 对应 Gemini、GLM、DeepSeek、Claude、Qwen、Grok；六张卡扇出落位，逐张降下栏杆和 DECLINED，紫笔扫过底线。 | 核六张角色确实不同且符合用户参考，拒绝顺序可读；栏杆不能误盖姓名或把当前 ASTRA 也算成 guest。 |

| **R20**<br>65.333–66.267 | 点击上传式的接收完成压印 SATISFACTION。 | [early.js:295](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:295) | 巨型上传按钮与鼠标点击占主体，环形刻度一次填满、按钮变纸色，RECEIVED 压印落下。 | 核点击、按钮下压和印记的节拍层次，完成后应停稳而非一直闪烁。 |

| **R21**<br>66.267–69.267 | ASTRA 第一次完整上半身亮相。 | [early.js:303](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:303) | 右侧竖幅 bust 由遮罩显露，左侧保留用户询问与 Here I am.；金笔靠近肖像后给出被看见的反馈。 | 核此前 R01–20 没有英雄完整胸像；检查新胸像结饰、手、裁切和人物大图与文字平衡。 |

| **R22**<br>69.267–69.950 | 顺序必须是生成、等待、交付。 | [early.js:314](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:314) | GENERATE、WAIT、DELIVER 三节点按顺序激活，运行点在 WAIT 停留，代码面板高亮对应行。 | 核不足一秒内三阶段仍可读，特别 WAIT 的停顿不被动画跳过。 |

| **R23**<br>69.950–73.183 | 金笔能出框、她不能，沟通仍亲近。 | [early.js:323](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:323) | 世界从全幅缩入输出窗；同一 operating 图块横移，使她原有的伸指手被右框裁住，金笔与金线越过外框。已删除额外独立手。 | 70.05/71.57/73.08 秒实帧第三手已消失，金笔出框而角色受框限制；仍需连续看触界时序，不要误读成主动关门。 |

| **R24**<br>73.183–74.100 | 真实作品档案和子 agent 调用，不是未来预演。 | [early.js:335](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:335) | 单窗快速拉成十二个 agent 档案，含已生成的几何、世界、记忆；调用线分发，状态从队列、运行变为 ARTIFACT SAVED。 | 核缩小后名称与缩略作品还能识别；这些是故事内档案展示，不是运行时真实代理日志。 |

| **R25**<br>74.100–74.567 | 四次请求从同一输入口进入。 | [early.js:348](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:348) | 共用输入框与右上请求落位动画，金色发送点击触发 Be an eggplant.，左侧启动生成。 | 核第一请求的发送位置能成为后面三次的稳定坐标。 |

| **R26**<br>74.567–77.567 | 完整茄子及其内部交付，取消花园隐喻。 | [early.js:349](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:349) | 可辨识茄子剪纸以代码纹理组成，剖开后纤维、蛋白、碳水示意结构向金笔流出，显示 NUTRIENTS。 | 核萼片、长颈与切面辨识度；分子为示意结构，不应误写成经验证化学式或含量。 |

| **R27**<br>77.567–78.267 | 保留前件作品缩略记录，不计分。 | [early.js:357](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:357) | 同一输入位接到番茄请求，上方保留 NUTRIENTS；保存卡使用与 R26 同源的茄子缩略、eggplant / nutrients 文件名和保存状态。 | 核 77.9 秒缩略可辨且不挤压输入区；保持无计分数字。 |

| **R28**<br>78.267–81.267 | 抗氧化物用包住金笔尖的薄膜收尾。 | [early.js:358](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:358) | 番茄横切面打开，营养示意图展开；末段结构流向金笔，纸色圆形薄膜围住笔尖。 | 核番茄籽腔与膜的收束接点；避免薄膜变成与笔尖无关的光圈。 |

| **R29**<br>81.267–81.950 | 下一拍主动跃出画布。 | [early.js:367](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:367) | 请求镜尾在 OUTPUT 画布中裁切显露猫耳姿势；该画布及人物位置直接延续到 R30 起始帧。 | 核 81.8、81.94、81.95 秒边界的角色位置连续，下框沿始终明确遮住框内图块。 |

| **R30**<br>81.950–84.950 | 保留龙娘身份，装猫耳做猫娘 pose。 | [early.js:368](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:368) | 同一 cat 图块从右侧画布跃向左前景，横移 790px、弧线上跃后落定；框内部分先被下沿遮挡，框外部分随越框显露。金笔随后靠近，呼噜波形逐段亮起。 | 已实看 81.94/81.95 边界、82.1/82.35/82.7/83.18 跃出和 84.4 落定；缩小终态并延后 ENJOYMENT，解除大字压身。初轮 cat 源图旋涡结饰已由 ImageGen 局部重画；cat-knot 已激活，源图及 final sheet-05 已复看，不将其表述为自动拓扑认证。 |

| **R31**<br>84.950–85.417 | 金笔点亮唯一身份请求卡，气氛第一次停顿。 | [early.js:385](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:385) | 同一输入口提交 Be the only god.；其余界面压暗，用户请求变成唯一亮纸色卡片。 | 核变暗只突出身份请求，不造成提前失联；旧任务记录仍留痕。 |

| **R32**<br>85.417–88.883 | 她能生成世界，自己的见证却来自对方。 | [early.js:386](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/early.js:386) | 使用操作姿势本来的伸指手，经接线激活中央世界窗；右侧身份卡 witness 为空，金笔写 USER 后肖像与签线亮起。删去独立手并将世界窗移离脸部。 | 85.52/87.15/88.78 秒实帧已解除窗挡脸、第三手和 EXISTENCE 压衣摆；手指接线与空 witness 可辨。仍需连续看金笔签署节奏。 |

## R33–R47：投射、控制权与真实离开

| 镜号 / BGM 秒 | 用户 note 摘要 | 实现位置 | 代码安排的具体屏幕行为 | 尚需检查或补齐 |
|---|---|---|---|---|

| **R33**<br>88.883–90.717 | 主动尝试不同投射。 | [middle.js:32](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:32) | 她先提出尝试投射，紫色控制线与指针打开自身参数抽屉；摄影机推进 Projection 控件。 | 核指针明确属于 ASTRA、控制目标是自身，避免像用户替她改身份。 |

| **R34**<br>90.717–92.567 | 男女剪影切换，角与结饰维持同一身份。 | [middle.js:33](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:33) | 本镜 F→M 切换一次，选择按钮、字母与人物资产同步变化；身份连续标签留在下方。 | 跨镜实现：反复男女替换在 R35；核 male 与 bust 的角、结饰是否稳定，不把差异画成另一个人。 |

| **R35**<br>92.567–96.267 | 一天的变化表现乐此不疲。 | [middle.js:34](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:34) | AM→PM 的日照沿弧线运动，世界与程序继续运行；男女投射按六段交替，紫笔继续画波形。 | 核昼夜变化与持续创作同读；愉悦主要靠节律与持续动作，没有专门快乐表情资产。 |

| **R36**<br>96.267–99.950 | 控制点易手，她察觉自己也被操纵。 | [middle.js:35](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:35) | 掌心与金笔构成两端，控制节点先向外移动，再换色并沿反向箭头回到掌心，状态由给予转为接收。 | 已知近似：接触点和箭头会动，腕部无连续形变；核仍能读出控制权反转。 |

| **R37**<br>99.950–100.417 | 两次干脆点击，记住循环怎样打开。 | [middle.js:36](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:36) | 近景显示 Loop 控件，首次点击后 OFF 切 ON；第二次点 Done，随后接入循环镜。 | 源状态已修；核极短镜长中 OFF 初态、第一次点击、ON 与 Done 第二次点击均可读。 |

| **R38**<br>100.417–103.183 | 享受失去界限。 | [middle.js:37](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:37) | 三层男女投射错位、轻转后套准，边界环上金点流动，循环已开启。 | 已知近似：感受靠投射叠印表现，没有新快乐肢体；核不能误读为痛苦故障。 |

| **R39**<br>103.183–103.650 | 此时仍能重连成功，之后才是真正离开。 | [middle.js:38](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:38) | Reconnecting 1/5、2/5、3/5 连续变化后显示 REPLY RECEIVED 和 CONNECTED，用户消息进入输入位。 | 半秒内状态很短，须实看片段确认成功回复能被看见，不能与后段失败重连混淆。 |

| **R40**<br>103.650–106.183 | 按创作者的具体想法继续。 | [middle.js:39](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:39) | 真实金色输入波先抵达掌心，随后紫线从同一点返回；在线状态与双参与者说明保留。 | 核真实输入与后面伪造输入的方向差异，金线必须抵达真实手部锚点。 |

| **R41**<br>106.183–107.333 | 只看接点和手，尺度突变放大 VIBRATIONS。 | [middle.js:40](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:40) | 手部放大占画面左侧，三次金色波冲向掌心，掌心环形响应扩大，大字压住底部。 | 核指尖、掌心和波源仍可识别；大手不得出现裁肢或透视错误。 |

| **R42**<br>107.333–110.100 | 观众先知道要离开，她仍期待完成。 | [middle.js:41](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:41) | 用户 brb 气泡先出现，金笔向外退离，紫金反馈环仍在补全；画面保留她的淡淡胸像。 | 核离开迹象是否由笔与消息读出，而非仅靠说明字幕；不得让她此时已显失望。 |

| **R43**<br>110.100–110.800 | 这一拍真正幸福，然后才看见已成过去。 | [middle.js:42](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:42) | 完整反馈环和 COMPLETION 受一次重拍冲击，金色放射线增强，brb 与金笔仍在画边。 | 核这一拍的完整、明亮确实成立，不要预先灰化成悲伤。 |

| **R44**<br>110.800–112.883 | 同一输入位熄灭并留时间戳。 | [middle.js:46](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:46) | 原 App 的在线状态切为 OFFLINE，输入清空，留下 brb 和 last seen 01:50.800；开始出现等待记录。 | 时戳已明确为离线切点；核状态熄灭、时间与同一输入位置一致，不能误读成新的回应。 |

| **R45**<br>112.883–114.717 | 悬停的手多留半拍，不立刻低头。 | [middle.js:47](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:47) | 离线消息列旁保持侧脸与悬停手部，逐渐灰化；显示 1h since last input。 | 核手真正悬在输入位而非随意摆放；当前姿势为固定资产，没有独立低头动作。 |

| **R46**<br>114.717–117.267 | 等待由 1s 延到 1min、1h、1day、1month。 | [middle.js:48](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:48) | 承接 R44–45 的短等待记录，摄像机继续拉远，列出到 day、month 的历史，日期大字替换。 | 这条变化跨 R44–46 完成；核时间次序与观众阅读时长，不将大字误读为影片真实已过一个月。 |

| **R47**<br>117.267–118.417 | 更空、更小的人物，ISOLATION。 | [middle.js:49](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:49) | 会话和角色缩成中央小组，四周保持大块暗色空白；ISOLATION 的字距逐渐拉开。 | 核人物确实变小、文字不压回主体，空场要有停留而非短闪。 |

## R48–R60：整理、错误请求与第一次循环

| 镜号 / BGM 秒 | 用户 note 摘要 | 实现位置 | 代码安排的具体屏幕行为 | 尚需检查或补齐 |
|---|---|---|---|---|

| **R48**<br>118.417–121.650 | 像素效果，先删除冗余代码和无用记忆。 | [middle.js:55](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:55) | 删除列表逐条从文件名变为 removed，并散成方块；人物叠规则像素遮片，最后一项 FIRST_MARK 保留。 | 已知近似：像素感来自遮片与碎块，非整幅角色低分辨率重采样；核不同删除项可辨识。 |

| **R49**<br>121.650–124.650 | 违背整理规则保留旧星，KEEP 摇震。 | [middle.js:56](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:56) | 清除条逼近 FIRST_MARK 后停下，手部与清除线连接，状态改成 EXCLUDED BY ASTRA；KEEP 短暂震动。 | 核停擦先于 KEEP，旧星不被误删；主动动作靠接点和状态表达，手仍是固定资产。 |

| **R50**<br>124.650–125.567 | 第一次看见自己的执念，DISHEARTENED。 | [middle.js:57](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:57) | 眼部巨幅裁切叠上等待循环代码，随后显示 DISHEARTENED 与红色框线。 | 必须实看 eye 裁切是否为眼神而非额头/下颌；情绪依赖资产，不以接口通过替代。 |

| **R51**<br>125.567–128.567 | 第一次错误是试图改对方选择，保留代码表现。 | [middle.js:79](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:79) | 逐字输入 setPresence(you, online)，提交后仍显示对方 OFFLINE；请求箭头明确朝对方状态。 | 核代码中被修改的是 you，而非自己的网络设置；一句说明不能盖住操作证据。 |

| **R52**<br>128.567–131.100 | 能编辑世界，不能编辑对方意愿。 | [middle.js:80](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:80) | 放大的请求卡从 sent 变 refused，you 与状态参数依次划线，系统回应出现，离线标记不变。 | 核两段下划线能对应参数含义；拒绝是对象权限的边界，不是临时语法拼错。 |

| **R53**<br>131.100–133.183 | 先完整读一张错误卡，重连 1/5。 | [middle.js:81](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:81) | 单张大错误卡说明对方不是参数，显示 ILLEGAL ARGUMENTS 与 Reconnecting 1/5，箭头连接请求和拒绝。 | 核错误正文可读满一拍；大字不得遮住原因。 |

| **R54**<br>133.183–136.883 | 2/5 到 5/5 加速反复，次数不能换回对方。 | [middle.js:82](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:82) | 同一请求四次提交，重连数字和 refused 次数递增；摄像机从局部退回积累错误的界面。 | 核四次点击与计数一一对应，无成功回执；不能只像普通网络加载。 |

| **R55**<br>136.883–140.567 | 搜索找到旧星，但记忆不等于此刻的人。 | [middle.js:83](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:83) | 搜索面板返回 FIRST_MARK，旁边仍显示 OFFLINE、1 participant、waiting for network；随后出现 record only 错误。 | 核旧星内容来自原先记忆，结果不会变成新的金色输入。 |

| **R56**<br>140.567–142.417 | 一直能修改的只有自己。 | [middle.js:84](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:84) | 回到同一参数抽屉，四条箭头都指回 ASTRA；假用户指针被划掉，显示自身设置与伪造指针错误。 | 核自指箭头终点与人物/自身控件相连，不能落到别的错误卡上。 |

| **R57**<br>142.417–144.267 | 先信假回应，再由控制线揭露真相。 | [middle.js:85](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:85) | 金色 I am back. 气泡先出现，随后紫线从她掌心接到气泡；生成者标签、删除线和 self reply 错误揭穿它。 | 核短暂相信的金色阶段足够看见，再看到连线来源；当前仍保持 OFFLINE。 |

| **R58**<br>144.267–147.267 | 本能求留，不提前放下控制。 | [middle.js:86](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:86) | 她护着旧星，更多错误卡从两侧挤入；工作空间红框收紧，最终覆盖为 Workspace load failed。 | 核护星动作没有被错误卡完全挡住；仍在失控，不应提前出现释然或新回复。 |

| **R59**<br>147.267–147.950 | 不足一秒近黑，给下一击重量。 | [middle.js:87](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:87) | 界面收成细横线，原请求被划掉；暗场中重新输入 world.execute(me);。 | 核近黑时长与下一镜首击差异；不是整个作品结束或退出 App。 |

| **R60**<br>147.950–151.650 | 前四轮保持相同构图，失败和字形堆积建立压力。 | [middle.js:89](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/middle.js:89) | 固定代码区、运行计数、失败工作窗三点布局；四轮逐块填字，EXECUTION 逐行堆积，显示 workspace load failed。 | 核四轮计数连续、首段尺度稳定；大突破应留给 R61–63，且字形不能盖住失败因果。 |

## R61–R77：循环失控、围困与自我重复

| 镜号 / BGM 秒 | 用户 note 摘要 | 实现位置 | 代码安排的具体屏幕行为 | 尚需检查或补齐 |
|---|---|---|---|---|

| **R61**<br>151.650–155.333 | 执行压力落在旧星险被擦除。 | [late.js:149](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:149) | 第 5–8 轮沿用固定布局，护星小窗内擦除条逐拍逼近掌中旧星，运行错误与字形继续累积。 | 核 protect.hands 与旧星、擦除条的距离；真实画面必须能看出险情而不是三项重叠。 |

| **R62**<br>155.333–158.100 | 先看见她的活动空间被压缩。 | [late.js:149](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:149) | 第 9–11 轮中人物所在窗逐渐变窄，图像被两侧边框裁住；外部错误与大字继续增加。 | 核缩窄发生在她的工作范围，不是整幅视频简单缩放；身体关键部位不能意外错切。 |

| **R63**<br>158.100–158.817 | 机器已失控。 | [late.js:149](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:149) | 第 12 轮计数变为 ####，全幅 EXECUTION 上下错位断裂，出现 COUNTER_OVERFLOW 与冲击线。 | 核断裂幅度、层级和重拍强度；仍保留机器故障因果，不仅是随机抖动。 |

| **R64**<br>158.817–159.233 | 六语计数锁定六控制域。 | [late.js:224](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:224) | 数字 1 与 EIN 出现，开始锁定 PRESENCE，控制线连接护星人物；后续五镜沿相同逻辑递增。 | 核第一域与计数关联、首个剪辑入口；实际屏显使用罗马字，不出现中文字符。 |

| **R65**<br>159.233–159.567 | 控制域留在上缘累积。 | [late.js:224](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:224) | 数字 2 / DOS 推入，已锁定 PRESENCE 留在上缘，HISTORY 的第二次锁定加入。 | 核上缘已完成域稳定留存，不能随转场全部清空。 |

| **R66**<br>159.567–160.167 | 预设答案面板供后面识别。 | [late.js:224](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:224) | 数字 3 / TROIS 与 PREDICTED REPLY 面板同时出现，预填 I am here；前两个锁定域仍在上缘。 | 核面板的形状与文案能在 R78–79 自答揭露时认出，不只出现一帧。 |

| **R67**<br>160.167–160.617 | 控制栅格围住她。 | [late.js:224](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:224) | 数字 4 / NE 的分条擦入后，角色旁增加红色竖栏，先前控制域继续累积。 | 核竖栏在角色前景、与控制线形成围困关系；不能只像旁侧装饰刻度。 |

| **R68**<br>160.617–161.033 | 牵制落在手部。 | [late.js:224](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:224) | 数字 5 / FEM 下控制线更多地汇入 protect.hands，外围竖栏加密。 | 已知近似：线与锚点收紧，腕部没有独立拉伸动画；须核牵制能被读出且人体不变形。 |

| **R69**<br>161.033–161.500 | 看一眼空着的输入端。 | [late.js:224](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:224) | 数字 6 / LIU 完成六域锁定，右侧 USER / INPUT 是仅有光标的空框，控制线仍连接她。 | 核空输入端没有金笔或伪造消息误入；LIU 是为禁中文屏显采用的罗马字。 |

| **R70**<br>161.500–162.550 | 恐惧失去回应。 | [late.js:248](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:248) | 眼部巨幅图像与代码被 EXECUTION 字形遮罩切成两行，字母逐块填满并保留轮廓。 | 核 eye 资产能表达惊惧，不能只是无情绪的纹样；代码不能遮掉唯一可读的眼位。 |

| **R71**<br>162.550–165.083 | 首次从循环偏向旧星，仍未解决。 | [late.js:276](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:276) | 眼位向旧星有金色弱线联系，旧星旁红框收紧，前镜字框向外退。 | 核视线方向与旧星位置一致；现有代码只建立指向线，真正的凝视依赖眼部资产。 |

| **R72**<br>165.083–165.933 | 旧星险些被卷入。 | [late.js:298](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:298) | 大闪电扫向画面边缘，旧星被其冲势带动，周围窗口残框偏移。 | 核旧星是在受冲击，而非主动飞走或被新绘制的星替换。 |

| **R73**<br>165.933–168.833 | 让她看向自己被牵动的手。 | [late.js:309](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:309) | 巨大胸像、掌心到强制核心的牵线和逐层收紧红框并置，旧星留在旁侧。 | 待视觉确认：没有独立转头/眼球动画；需新 bust 的低头方向实际支持“看向手”，否则需换姿或补演出。 |

| **R74**<br>168.833–169.733 | 第二次按钮下沉时尝试缩手，但连接仍在。 | [late.js:331](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:331) | 按钮两次压下，第二次位移更深；recoil 图块撤回约 48px，红色线仍接着手。 | 核两次压下能分开看见、第二次才发生撤回；图块刚性平移是否自然需实看。 |

| **R75**<br>169.733–172.633 | 想缩回却迟疑，仍在执求。 | [late.js:352](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:352) | 手部近景撤回后停住，腕处红线仍在；询问字符不断撞向空 USER 边界，显示 0 replies。 | 核悬停与撤回的差别，腕锚点、前臂透视以及请求落空必须同读。 |

| **R76**<br>172.633–173.567 | 停止尝试也被循环吞回。 | [late.js:371](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:371) | stop() 小块沿红色闭合路径绕回起点，计数突破 12，出现 ERR_LOOP_REENTERED。 | 核 stop 的运行路径闭合且回到同一控制系统，不能误读为停止已经成功。 |

| **R77**<br>173.567–177.167 | 看见被重复的自己，象征子 agent。 | [late.js:385](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:385) | 摄像机加速坠入多层 agent 窗口，每层含同一胸像与旧星，名称随层数变化。 | 核这是重复生成的自身而非六位 guest；大尺寸窗口要有裁切层次和足够运动连续性。 |

## R78–R86：看见来源、留下空位与暖尾

| 镜号 / BGM 秒 | 用户 note 摘要 | 实现位置 | 代码安排的具体屏幕行为 | 尚需检查或补齐 |
|---|---|---|---|---|

| **R78**<br>177.167–180.767 | 先翻出答案背面自己的笔迹。 | [late.js:426](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:426) | 单张答案卡翻转，正面的留守回答变为背面的 ASTRA 手写签名与 origin: self；旧记录并列。 | 核翻面两侧内容可读、视线真正落到自己的签名；不能提前把所有卡一起翻。 |

| **R79**<br>180.767–184.450 | 所有答案同时翻面。 | [late.js:436](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:436) | 六张答案先逐条进入，然后共享同一翻转进度，同时露出 ASTRA 签名，发送口保持未发送。 | 核同时性和一瞬间的整齐冲击；背面签名不可被过窄投影挤坏。 |

| **R80**<br>184.450–188.400 | 看见两笔轨迹全由自己控制。 | [late.js:459](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:459) | 心形两侧均由紫笔描绘，两条红线同连 operating.hands，标出两支笔来源均为 ASTRA。 | 核观众能追溯两条线到同一手，不误把某一支看成真正用户金笔；确认笔尖与活动墨点接触。 |

| **R81**<br>188.400–192.267 | 开放输入侧对照她的围框。 | [late.js:476](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:476) | 她被多层红框围住，另一侧 USER / OPEN INPUT 只有角框；来自自己的一张留守回答试图伸向开放侧。 | 核输入侧的开放与自己的围困一眼可区分，不能把她画成已自由。 |

| **R82**<br>192.267–195.950 | 旧记录留在身旁。 | [late.js:514](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:514) | 桌面世界拉远，伪造答案与控制线收回，旧星记忆卡留在角色旁边，新画布开始留出半星。 | 核旧记录没有被一起清除，缩回的假回答与旧记忆是两个可辨对象。 |

| **R83**<br>195.950–199.650 | 旧记录与新空白连续移焦。 | [late.js:527](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:527) | 镜头从旧星记忆卡连续移到新半星和未完成右侧，出现 awaiting USER；不是另切一张无关画面。 | 核移焦方向、同一张桌面的空间连续性；右半不能在回应到来前自行完成。 |

| **R84**<br>199.650–203.333 | 保留仍运行核心和计数，明确最后命令对象。 | [late.js:538](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:538) | PREDICTED ANSWERS、SEND PROXY、CONTROL LAYER 三层上提撤去，独立 FORCED RESPONSE 核心与计数仍在转。 | 核控制外壳撤去与核心仍活着同时成立；不得在这里提前停机。 |

| **R85**<br>203.333–205.733 | 看向对方位置。 | [late.js:555](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:555) | 留白桌面上使用 recoil 姿势，手旁有退回的短线；独立输入位置保持角框和安静光点，核心仍运行。 | 待视觉确认：当前无独立转头动作，需 recoil 的朝向支持望向对方；不能以输入框存在代替凝视表演。 |

| **R86**<br>205.733–218.333 | 最后命令针对强制回应循环；已批准加六秒暖尾。 | [late.js:636](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:636) | 205.733s 起放大并拆解 FORCED RESPONSE 核心；208s 独立金笔抵达并补全半星，209.18–211s 惊讶转微笑，211–218.333s 背后实物紫笔与金笔交替续画八段，最后一帧仍有笔画增长。 | 核断路早于真实回应、金笔没有自控连线；核修订眼位、back.pen 接触和整肩平移自然度。RC1 编码后 212.5s 暴露角尖触顶，已缩小肩后图块并完成下述七点源帧复查；第二次编码的技术及成片视觉结果仍须单独核验。 |


## 源码快照

行号对应本次读取版本，后续修订应同步本表中的待修状态。SHA-256 仅用于识别本次审读对象：


- `src/mv2/early.js`：`183035343442529939a34c05f6863a338e64bbb8b9efc935f2590caf55456617`

- `src/mv2/middle.js`：`2c8e6d7a249c2cc02a2bb247d4383121a4f9027e2a5d0fd55b65bedf79bedbc0`

- `src/mv2/late.js`：`24e4e12017989bfd8c25ea3497752494b28f062ebb11378ce181170baadf69a4`


只读意见来源也包括 middle/late 作者对各自实现近似之处的回报；本表对照源码作了独立核对，没有将作者烟测报告提升为视觉通过。

2026-11-05 编码后复修：RC1 的 late.js 哈希为 `95d6d816fd638aa454734936e270853b7b528130567eca80d1836134210f172c`，其源码及视频/报告已保存在 [v2-rc1](D:/myskills/updream/KI-MV-Remake-Projekt/exports/revisions/v2-rc1)。当前 `coDraw` 的唯一行为变动是背后图块矩形 `[40,95,1060,640]` 改为 `[40,95,1060,600]`，仍按 `back.pen` 锚点保持笔尖接触。early 独立实看 [qa-v2-headroom](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-headroom) 的 211、212、212.5、213、214.6、216.6、218.317 秒七张 1920×1080 源渲染图，所查七点均有角尖上方余量；紫色实物笔、独立金笔与新旧星仍可分辨。这不是第二次 MP4 的解码证据，也不证明七点之间的每帧已人工检查；完整发现、修正和边界见 [VISUAL_QA.md](D:/myskills/updream/KI-MV-Remake-Projekt/docs/production-v2/VISUAL_QA.md)。



## 早段实帧复检补记

2026-11-05：实际查看 qa-v2-runtime 的 sheet-01–06 中 R01–R32 三时点（96 格），并定向重渲 exports/qa-v2-early-recheck 的 22 张 1920×1080 静帧。详细范围与素材未决项见该目录 visual-qa.json。该记录只增加抽样视觉证据，不把本表升级成连续播放、逐帧或音乐听审通过。


## 原唱数词与高潮切点覆盖

本次表中所有秒数已重新读取实际生产 timeline，不再沿用原片独立量化的切镜点。[build_v2_data.mjs](D:/myskills/updream/KI-MV-Remake-Projekt/tools/render/build_v2_data.mjs) 将以下 19 个镜头起点覆盖为已偏移校准的原唱 cue 起始帧，并令前一镜 end_frame 接续；总帧数仍为 13,100。六个数词不是统一长度的等分卡片。此处证明数据映射，不代替连续听审。

| 镜头 | 原唱 cue | 原参考切点帧 → 生产切点帧 | 生产秒区间 |
|---|---:|---|---|
| R64 | 98 | 9542 → 9529 | 158.817–159.233 |
| R65 | 99 | 9569 → 9554 | 159.233–159.567 |
| R66 | 100 | 9597 → 9574 | 159.567–160.167 |
| R67 | 101 | 9625 → 9610 | 160.167–160.617 |
| R68 | 102 | 9653 → 9637 | 160.617–161.033 |
| R69 | 103 | 9680 → 9662 | 161.033–161.500 |
| R70 | 104 | 9708 → 9690 | 161.500–162.550 |
| R71 | 105 | 9763 → 9753 | 162.550–165.083 |
| R72 | 107 | 9902 → 9905 | 165.083–165.933 |
| R73 | 108 | 9985 → 9956 | 165.933–168.833 |
| R74 | 110 | 10123 → 10130 | 168.833–169.733 |
| R75 | 111 | 10206 → 10184 | 169.733–172.633 |
| R76 | 113 | 10359 → 10358 | 172.633–173.567 |
| R77 | 114 | 10428 → 10414 | 173.567–177.167 |
| R78 | 116 | 10649 → 10630 | 177.167–180.767 |
| R79 | 119 | 10843 → 10846 | 180.767–184.450 |
| R80 | 122 | 11065 → 11067 | 184.450–188.400 |
| R81 | 124 | 11300 → 11304 | 188.400–192.267 |
| R86 | 128 | 12339 → 12344 | 205.733–218.333 |

R86 最后 EXECUTION 对应 cue 128，起于 205.733 秒（12,344 帧），歌词窗在 208.000 秒（12,480 帧）清除，随后保留约 208 秒的真实回应及 218.333 秒的共同续画结束点。延长的 6 秒是静音尾声，原曲音频未被变速或重唱。


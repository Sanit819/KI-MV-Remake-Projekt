# v2 抽样视觉 QA

记录日期：2026-11-05。对象是 `src/mv2`、v07 已激活素材及当前 86 镜时间轴。**已完成抽样真实渲染和分段人工构图复核；没有完成连续全片听看，也不是逐帧人工或逐帧手绘认证。** 最终 4K 文件的容器、解码、音轨及帧数另由渲染后的技术报告填写。

## 267 点运行时结果

[最终 qa-v2.json](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-final/qa-v2.json) 的 `passed=true`、`phase=complete`；当前结果是尾声余量复修后的复跑，完成时间为 `2026-11-04T21:18:32.976Z`。实际分辨率 1920×1080；86 镜各取首后 0.1 秒、镜中、末前 0.1 秒，共 258 点，再加 6 个尾声时点和最后歌词 cue 128 的首/中/末 3 点，合计 267 点。短镜取样量由脚本限制为镜长四分之一，所有样本实际渲染均完成。

检查内容包括镜号正确、英文/原文歌词实际被绘出、分词拼接证据、Canvas/DOM 没有中文、素材存在、接点和矩形数值有限、无 HTTP/请求/JS/console 错误、时间轴连续、最后 EXECUTION 首中末保留、静音尾声无残留歌词。该检查**不能**判断手部自然度、结饰每条穿插、演出感染力或音乐听感。

对应工具：[qa_v2.mjs](D:/myskills/updream/KI-MV-Remake-Projekt/tools/render/qa_v2.mjs)。首轮 [qa-v2-runtime](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-runtime/qa-v2.json) 也完成 267 点；后续针对真实可见问题修改后再跑 final。不能将两次样本数相加成 534 个互不重复镜头或整片逐帧覆盖。

## 人工检查的实际范围

三位场景检查者分段查看首轮 15 张接触表，合计覆盖全部 267 个缩略格；其中一部分再打开原尺寸或定向重渲。**这不表示 267 张都被逐张按 1920×1080 细查，也不表示 final 的全部格子重新逐一人工检查。** 每位证据如下。

| 检查者 | 接触表/缩略范围 | 单独查看或定向复检 |
|---|---|---|
| early | [runtime sheet-01](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-runtime/sheet-01.jpg)–[sheet-06](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-runtime/sheet-06.jpg)，主要 R01–R32 首中末 96 格；最终又看 [final sheet-05](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-final/sheet-05.jpg)、[sheet-06](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-final/sheet-06.jpg) | 初轮另开 R08-start、R10-mid、R23-end、R32-mid 缩略原文件。重渲 22 张 1920 帧；其中单独原尺寸查看 26.2、35.1、37.05、38.8、40.55、73.08、77.9、81.94、81.95、82.1、82.35、82.7、83.18、84.4、87.15 秒，其余在新接触表查看。 |
| middle | [runtime sheet-06](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-runtime/sheet-06.jpg)–[sheet-10](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-runtime/sheet-10.jpg)，重点 R33–R60；修后重新查看 [final sheet-07](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-final/sheet-07.jpg)–[sheet-10](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-final/sheet-10.jpg)，R37–R60 | 单独查看 runtime thumbs/R52-end、R54-start、R57-end、R50-end。不是全量原尺寸逐帧检查。 |
| late | [runtime sheet-11](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-runtime/sheet-11.jpg)–[sheet-15](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-runtime/sheet-15.jpg)，R61–R86 首中末及尾声/末歌词探针 | 单独查看 late-recheck 的 158.000、161.600、163.880、167.570、171.380、177.380 秒；late-recheck2 的 158.000、162.270、175.650、211.000、214.600、218.317 秒，均为 1920 帧。 |
| root | 生成返回的 16 张新图和 10 张结饰重绘图全部观察；初轮 sheet-04/12/15；final sheet-02/08/12/15 | 额外打开 bust、v06 smile 源图及正确 GPT 小图；主持最新来源锁定、267 点复跑和后续 4K 导出。 |

早段详单：[visual-qa.json](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-early-recheck/visual-qa.json)；[22 张复检表](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-early-recheck/recheck-sheet.jpg)。该 JSON 中 cat 旋涡问题是修订前的历史发现，当前已激活 cat-knot，见下节，不应继续当成当前未修状态。

晚段证据目录：[late-recheck](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-late-recheck)、[late-recheck2](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-late-recheck2)。这些时点属于当时的实际检查时间；数词/高潮切点后来按歌曲 cue 覆盖，查新镜号须使用当前 timeline，而不能用旧近似秒点推断镜号。

## 实帧发现与修正

| 范围 | 实际发现 | 修正及证据边界 |
|---|---|---|
| R08 | choice / SAVING 压到 composer 输入区 | 信息移至输入区上方，26.2/27.7 秒可分辨；[26.2 秒](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-early-recheck/source-026.200.png)。 |
| R09–12、R26/28/30/32 | 大字与底部同一歌词重复；R10 手腕与字重叠，R11 dy/dx 盖鞋 | 只在大字确实匹配当前完整歌词时去重复；手/圆抬高，dy/dx 移到脚外；[35.1](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-early-recheck/source-035.100.png)、[38.8](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-early-recheck/source-038.800.png)。 |
| R23 / R32 | 完整姿势本来有两手，再叠手图变第三只手；R32 世界窗挡脸、大字压衣摆 | 删独立手，使用 operating 原有伸指手。R23 指尖受窗口裁切而金笔出框；R32 指尖接线到世界窗；[73.08](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-early-recheck/source-073.080.png)、[87.15](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-early-recheck/source-087.150.png)。 |
| R27 / R29–30 | 保存卡缺上一件作品；猫娘越框不充分，大字压跳跃身体 | 同源茄子缩略保留；R29/R30 共用起始画布与角色位置，作横移/上跃/裁切，落定后才显 ENJOYMENT。81.94/81.95 边界及 82.1/82.35/82.7/83.18 中段已看。动作由刚性图块演出，不能称重新绘制的肢体中间帧。 |
| R37–44 | Loop 起初就 ON；R38 三影残留；R40 接触前显示 received；R42 告别气泡叠字；R44 ONLINE/OFFLINE 首帧矛盾及占位时戳 | OFF→ON→Done、套印收束、接触后 received、分开气泡、统一离线状态及 last seen 01:50.800。final sheet-07/08 中人工复看。 |
| R47–54 | 重复字幕、FRAGMENTS 提前出现、R50 不是专用眼裁切、R52 红线错位、R54 重连计数被裁 | 修关键词时序、眼部/HEART 构图、参数线与计数显示；final sheet-08/09 人工复看。R55–60 final sheet-10 未见新增阻断。 |
| R62–69 | run/stop 数字被缩放裁切；当前控制域卡漏画 | 调整版面、六域完整显示；[158.000](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-late-recheck2/source-158.000.png)、[161.600](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-late-recheck/source-161.600.png)。歌曲数词时点另由 timeline 覆盖。 |
| R71 / R73 / R75 / R77 | 大构图分词和底字幕重复；前层实底窗盖住递归层与自己 | 使用实际分词证据判定去重、递归层留出自己；[163.880](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-late-recheck/source-163.880.png)、[175.650](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-late-recheck2/source-175.650.png)。 |
| R86 | 头部龙角出框、握笔/线关系和旧星被袖摆遮挡需校正；RC1 的 212.5 秒仍触顶 | 惊讶→闭眼微笑的头框与表情、实体紫笔与独立金笔的分离已抽样查看。早先 [211.000](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-late-recheck2/source-211.000.png)、[214.600](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-late-recheck2/source-214.600.png)、[218.317](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-late-recheck2/source-218.317.png) 不能证明整个尾声角尖完整。编码后发现及矩形高度 640→600 的追加修正见下节；新七点源帧同时覆盖旧星 y790 的当前位置。 |

## RC1 编码后发现与尾声余量复修

late 检查者从首版 4K MP4 实际解码并查看九点：158.9、161.26、163.817、167.57、175.65、209.7、210.6、212.5、218.3167 秒。具体帧号及观察保存在 [RC1 编码后视觉报告](D:/myskills/updream/KI-MV-Remake-Projekt/exports/revisions/v2-rc1/ENCODED_VISUAL_QA.md)。其中 **212.5 秒（帧 12,750）的画面左侧龙角尖仍触到上沿并被截切**；同位置的旧源渲染图也有该问题，故这是构图问题，不是编码损坏。其余八个抽样点未报告同样的新增阻断，但不能据此宣称整个尾声已检查。

首版 [4K MP4](D:/myskills/updream/KI-MV-Remake-Projekt/exports/revisions/v2-rc1/astra-world-execute-me-full-v2-4k60.mp4)、源码和技术报告保存在 [v2-rc1](D:/myskills/updream/KI-MV-Remake-Projekt/exports/revisions/v2-rc1)。该首版视频 SHA-256 是 `01b11e111a05ec79199bead4e4f2dcd29414ac7215fc476e3367be67d9aeb1d3`；旧报告内未重写的路径只记录当时输出位置，不代表最新成片。RC1 的解码、音频、时间戳通过结果不能直接移用到第二次导出。

root 随后把 [late.js:629](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv2/late.js:629) 的 `coDraw` 背后图块矩形由 `[40,95,1060,640]` 改为 `[40,95,1060,600]`。这是此次唯一行为变动，源人物图、`back.pen` 接点、时间轴及音频不变；相对 RC1 的文件差异另有一个末尾空行。early 独立打开并实际查看以下七张新 1920×1080 源渲染图：

| 秒点 | 新源帧证据 | 实际观察 |
|---:|---|---|
| 211.000 | [source-211.000.png](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-headroom/source-211.000.png) | 肩后构图开始时角尖上方有余量，紫色实物笔与金笔分离。 |
| 212.000 | [source-212.000.png](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-headroom/source-212.000.png) | 角尖未触顶，新双色星和左下旧金星可分辨。 |
| 212.500 | [source-212.500.png](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-headroom/source-212.500.png) | 原问题秒点已出现可见上方余量；未沿用旧三点推断。 |
| 213.000 | [source-213.000.png](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-headroom/source-213.000.png) | 肩部随笔尖移动后，所查角尖仍完整。 |
| 214.600 | [source-214.600.png](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-headroom/source-214.600.png) | 角尖余量保留，旧星在袖摆下方，新尾迹继续向外。 |
| 216.600 | [source-216.600.png](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-headroom/source-216.600.png) | 紫/金两条新画迹与两支笔仍分别可读。 |
| 218.317 | [source-218.317.png](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-headroom/source-218.317.png) | 最后一帧附近仍保留完整角尖、两支笔与新旧两颗星。 |

七点之间的画迹存在变化，但这组静帧不能替代连续运动审查。修正后 267 点运行时复跑通过；**这七图来自 Canvas 源渲染，并非第二次 MP4 解码帧**。第二次 4K 与 1080p 已重新导出，全部解码、PTS、音频及静音尾段核验通过；当前文件与输出 hash 见 [完整 v2 交付](../FULL_MV_V2.md)。编码后图像另见 ENCODED_VISUAL_QA.md。该发现也明确收窄此前“龙角完整”的表述：先前只检查 211、214.6、218.317 秒，遗漏了中间的 212.5 秒风险。

## 源图、结饰与 alpha

素材清单、提示词及真实处理步骤见 [v07 README](D:/myskills/updream/KI-MV-Remake-Projekt/assets/astra/v07/README.md) 与 [provenance.json](D:/myskills/updream/KI-MV-Remake-Projekt/assets/astra/v07/provenance.json)。16 张新图包含 10 ASTRA + 6 guest，10 ASTRA 现全部调用对应 `*-knot.png`。人物不外挂 SVG/logo，正确小图只作 ImageGen 参考；guest 不添加 GPT 配饰。

- root 实看全部 26 次生成返回；late 另打开 eye/bust/back/hand/operating/profile/recoil 七张新 `-knot` 源图，观察到六瓣、中心负形及没有额外外圆。middle 独立打开 hand-knot，掌心锚基本匹配。
- early 实帧发现 cat 的头/腰饰像旋涡后，root 定向修订 cat/male/foot 并激活。early 随后独立打开最新 [cat-knot](D:/myskills/updream/KI-MV-Remake-Projekt/assets/astra/v07/cat-knot.png)、[male-knot](D:/myskills/updream/KI-MV-Remake-Projekt/assets/astra/v07/male-knot.png)、[foot-knot](D:/myskills/updream/KI-MV-Remake-Projekt/assets/astra/v07/foot-knot.png)，及 final sheet-05/06；六瓣交织的可读性得到改善，cat 的旧旋涡问题不再列为当前未修。
- v06 surprise/smile 两个继承表情曾做完整头部比较与量测，见 [EYE_STUDY_V06.json](D:/myskills/updream/KI-MV-Remake-Projekt/docs/validation/EYE_STUDY_V06.json)。其“未激活”是当时历史状态，当前 manifest 已激活；209.7/210.6 的合成头框一致、表情可读，是晚段报告的静帧观察，不是像素锁定保证。
- 实际通道检查确认 16 个新激活源均为 RGBA、有 alpha=0；低 alpha 彩色边屑仍存在。渲染先排除 alpha<16，再经三场分色、平滑和 127.5 等值轮廓追踪。不能写成“原文件已完全无残边”。
- foot 鞋后的小浅色块从源图看对应鞋跟末端，暗色细跟在暗底上可读性弱；不能未经分析就当成随机透明渣点。掌/腕、笔尖、toe 使用源像素锚点，实际接触是抽样核对。
- 大结饰可辨不等于对所有小腰饰逐像素检查或自动拓扑认证。R34 的男性投射保留长发，剪影偏中性；F/M 状态明确。结饰重绘不是男性气质设计的重新评审。

## 剪辑卡点与诚实边界

当前时间轴将 R64–R81 中选定高潮镜及 R86 共 19 个起点改用已校准原唱 cue，R64–R69 六次计数跟随 cue 98–103，非机械等分。完整覆盖表见 [IMPLEMENTATION.md](D:/myskills/updream/KI-MV-Remake-Projekt/docs/production-v2/IMPLEMENTATION.md)。R86 最后 EXECUTION 自 205.733 秒至 208.000 秒，随后接真实金笔回应，尾部延长 6 秒，总目标 218.333333 秒 / 13,100 帧 / 60fps。

- 原曲没有训练新声线或替换演唱。当前工具和静帧校验不等于耳听每个卡点。
- 不是 13,100 张独立手绘。人物是生成的姿势/表情源图，经三墨轮廓化、图块变换、遮罩、程序图形和文字连续渲染；一部分手腕牵动、收手、迟疑由刚性图块位移承担。
- 未完成全片连续听看、每帧人体检查或最终 4K 编码的视觉逐帧复查；1920 静帧与缩略表不能冒充 4K 原尺寸全片检查。
- R36 腕部受控、R38 享受感、R49 主动保留、R68/74/75 迟疑等，有因果状态逻辑，但自然表演强度仍有静态资产限制。
- 第二次最终编码：4K 与 1080p 均 13100 帧完整解码、逐包 PTS、8 个音频窗口零偏移、6 秒静音尾全部通过，AAC payload 相同。可追溯 hash 及报告见 [FULL_MV_V2.md](../FULL_MV_V2.md)。当前输入 SHA 为最后一次注释同步后的文件（只将 640 的旧说明改为实际 600），功能未再变动；440 帧边界证据已同步重存。

## 本次证据版本

运行时报告的 manifest/timeline/lyrics input hashes 与当前文件一致；场景源码哈希已刷新为尾声余量修正后的读取结果。下表识别当前源输入，不是第二次编码完成的证明：

| 对象 | SHA-256 |
|---|---|
| manifest | 0fb6b71a807242fb72178d40888c5ba9163cf4682ac9ddc357a09518f7b45943 |
| timeline | 04a970244e7f54ae63de285b620a3f378d78d5e15bddfe6a27a3e66a5cd3d211 |
| lyrics | a69b162b62c8da85e7033adb9f61834d3c23cef5ac4e14c9dd6ffe752393ce83 |
| early.js | 183035343442529939a34c05f6863a338e64bbb8b9efc935f2590caf55456617 |
| middle.js | 2c8e6d7a249c2cc02a2bb247d4383121a4f9027e2a5d0fd55b65bedf79bedbc0 |
| late.js | 24e4e12017989bfd8c25ea3497752494b28f062ebb11378ce181170baadf69a4 |

这些哈希固定审读版本，不能代替最终编码输出哈希。root 实施的高度 640→600 修正已单独记录；本次文档编辑没有再改生产代码、激活 PNG、manifest 或时间轴。



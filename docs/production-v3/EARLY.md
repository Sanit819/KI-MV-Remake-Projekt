# v3 早段动作与果实切面修订

2026-11-05。对应用户修订 1–5：R10（33.267–36.950 秒）、R11（36.950–40.650 秒）、R15（51.950–55.650 秒）、R26/R28 的果实剖面。只修改 [src/mv3/early.js](D:/myskills/updream/KI-MV-Remake-Projekt/src/mv3/early.js)，v2 保留。新角色图、提示词和来源片段位于 `assets/astra/v08/early-*`；共享 manifest 由 root 合并。

## 三个独立动作资产

使用内置 `image_gen.imagegen`，每个动作独立生成。先实际查看 v07 operating-knot、hand-knot 与用户正确 GPT 图标，使用 operating 身份/风格和正确图标作为生成参考。后续修订也使用内置 ImageGen，没有用代码绘制人物手部、粘贴人物 logo 或镜像人物。

| Manifest key | 激活源图 | 画面动作与接点 |
|---|---|---|
| earlyCircle | [early-circle.png](D:/myskills/updream/KI-MV-Remake-Projekt/assets/astra/v08/early-circle.png) | 侧面完整肩、上臂、肘、前臂与持笔手，三指握笔。`pen=[1568,543]` 是实际可见紫色笔尖；最初近黑轮廓端点 1577,553 会造成视觉间隙，已修订。 |
| earlyTangent | [early-tangent.png](D:/myskills/updream/KI-MV-Remake-Projekt/assets/astra/v08/early-tangent.png) | 高三分之四视角的另一种握笔姿势，笔接近竖直，肩臂完整连接。`pen=[1225,475]`。 |
| earlyTravel | [early-travel-framed.png](D:/myskills/updream/KI-MV-Remake-Projekt/assets/astra/v08/early-travel-framed.png) | 自然圆肩、完整袖臂到伸出的食指；没有笔或生成的 UI。`hands=[1625,490]`，`pen` 同点仅作兼容别名。 |

三个姿势的 GPT 六瓣结饰直接绘在源图袖口/衣饰中，没有额外外圆或底盘。小尺寸穿插没有经过自动拓扑认证。每张源图有真实 RGBA 透明通道，仍有少量低 alpha 边屑；已有渲染流程过滤并轮廓化为三墨，实际合成图未见源图预览中显示的辉光或矩形背景。不能由此说原始 RGB 数据完全没有辉光色值。

提示词：[circle](D:/myskills/updream/KI-MV-Remake-Projekt/assets/astra/v08/early-circle.prompt.txt)、[tangent 初稿](D:/myskills/updream/KI-MV-Remake-Projekt/assets/astra/v08/early-tangent-initial.prompt.txt)、[tangent 修订](D:/myskills/updream/KI-MV-Remake-Projekt/assets/astra/v08/early-tangent.prompt.txt)、[travel 初稿](D:/myskills/updream/KI-MV-Remake-Projekt/assets/astra/v08/early-travel-initial.prompt.txt)、[travel 去除生成 UI](D:/myskills/updream/KI-MV-Remake-Projekt/assets/astra/v08/early-travel.prompt.txt)、[travel 自然肩部重构](D:/myskills/updream/KI-MV-Remake-Projekt/assets/astra/v08/early-travel-framed.prompt.txt)。尺寸、alpha 统计、默认生成输出路径和 SHA-256 见 [early-provenance.json](D:/myskills/updream/KI-MV-Remake-Projekt/assets/astra/v08/early-provenance.json)；实际接点与源图路径见 [early-assets.json](D:/myskills/updream/KI-MV-Remake-Projekt/assets/astra/v08/early-assets.json)。`early-travel.png` 保留为已淘汰的中间候选，不是当前激活图。

## 具体演出

R10 用完整持笔姿势替换独立手模型，固定肩臂与笔尖，让数学纸面在笔下移动，完成方形趋圆和下半圆弧描绘。这样身体保持延续到左侧和内容区下边界，不随笔运动露出水平截身。圈上的触点来自源图可见笔尖锚；无另一支浮动紫笔。公式和大字避开手部。这里是纸面运动与静态姿势的合成，不宣称重新画出手腕关节中间帧。

R11 删除脚模型，替换为专用高视角握笔图。笔尖接触固定的正弦曲线点；波形纸面移动，金色切线使用该点的解析导数，所以笔尖、曲线和切线始终共享同一点。调整大小和接点高度，保留笔上端的画内余量。人物不镜像，且没有重复手部拼接。

R15 删除不动的中央方框和复用 hand。新伸指姿势触在时间尺游标上，连续年份让刻度从未来向过去滑动，纵向游标与三层城市横移相连。大年份和刻度读取同一个 `yearValue`，从 A.D. 2026 经 A.D. 640 向 3000 B.C. 变化。第一次合成暴露头发顶端横切，随后专门重构自然圆肩顶轮廓并重新渲染确认。

R26/R28 保留代码生成物的故事语法，但截面不再是独立的星轮贴片。`fruitChord` 对绘制果皮的同一组 Bezier 曲线求 y=15 的交点：茄子 `[-150.393367,122.021652]`，番茄 `[-244.383795,237.701154]`。两个暴露面共用该弦、中心、比例与投影，跟随各自上下半块平移；下缘两端直接接到果皮切口。茄子为浅色果肉、两条弯曲种子带和细小孔点；番茄为厚果壁、中心肉芯和四个带种子的不规则种腔。它们是风格化的剖面展开示意，不是植物学测绘或真实摄影。茄子缩小后不再压住 NUTRIENTS 标题。

本次三个人物动作裁切到 y≤920；双语歌词由主入口绘制在底部保留区，实际抽样中动作与两行字幕分离。

## 实际视觉检查及发现

所有下列图片都是真实 Canvas 1920×1080 渲染，均逐张通过 `view_image` 查看；不是无绘制 mock，也不是最终 MP4 解码。

| 轮次 | 目录与实际秒点 | 发现/结论 |
|---|---|---|
| 初轮 15 张 | [qa-v3-early](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v3-early)：33.4、35、36.8、37.05、38、40.5、52.05、53、55.5、75.7、76.4、77.1、79.5、80.3、81.1 | 发现 R10 随整图上移露出截身、R11 笔上端过近顶、R15 头发顶边横切及时间尺与年份矛盾、茄子压大字。三墨输出未见辉光；果实截面已接到皮轮廓。 |
| 二轮 18 张 | [qa-v3-early-recheck](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v3-early-recheck)：33.4、35、36.8、37.05、38、40.5、52.05、53、53.8、55.5、74.7、75.7、76.4、77.1、78.4、79.5、80.3、81.1 | 上述问题已按前节修订；实际看到完整肩臂连接、真实紫笔尖接触、自然肩部轮廓、刻度/年份一致、切面多个展开阶段与果皮接合、双语字幕清晰。R10 开始时小 r 注记压到手，因此再删除该冗余注记。 |
| 最终 R10 三张 | [qa-v3-early-final](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v3-early-final)：33.4、35、36.8 | 删除小 r 后重新导出并实看，手部与公式没有该重叠；两行歌词仍独立。 |

共查看 36 张渲染结果，其中有重复秒点，不是 36 个不同镜头。`node --check src/mv3/early.js` 通过；还直接运行当前曲线求交函数得到上面的弦坐标。导出工具日志显示的默认 `--start-frame/--end-frame` song 范围不代表本次静帧采样范围，实际按 `--stills` 参数及文件名记录。

没有连续听看全片，没有逐帧人体或音乐听审，也没有凭这些 1920 静帧预先宣称最终 4K 编码通过。最后源码与三个激活图已通知 root 冻结，后续整片 QA 和编码报告由主流程承担。

## 冻结对象

| 文件 | SHA-256 |
|---|---|
| src/mv3/early.js | bb3044b4c48d24b60eeedd4e7bb9b0163b25bb95775a860fe29554aef12afe7c |
| early-circle.png | 4bcc297c398464587a9d8145ba92c6cd6266ab77c0f870725589f0b2a457dd8a |
| early-tangent.png | cec887d27980a65d6a645535f8e03cad11ac3dc8e7dc3e1c7e1c126f92560e14 |
| early-travel-framed.png | 0df36e9626f3f5cbebd3683b20745d2ceb07c8c9e2117a170df73fe86c6fcbef |

本文件是源资产和局部视觉记录；完整文件路径、编解码结果及视频输出哈希不由此预填。

## 最终整合图板只读复核

4K 导出开始后，early 实际查看最终 [sheet-01](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v3-final/sheet-01.jpg)、[sheet-02](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v3-final/sheet-02.jpg)、[sheet-03](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v3-final/sheet-03.jpg)、[sheet-04](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v3-final/sheet-04.jpg)、[sheet-05](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v3-final/sheet-05.jpg)。范围为 R01–R30 各首/中/末三点，共 90 个缩略格；工具将整张图板从 1440×1898 缩至 1376×1813 显示，不能称逐张 1920 原尺寸检查，也未在此人工审完 661 个运行时样本。

所查图板中，有歌词的时点均呈上原文、下中文的独立两行，未见新增字幕裁切、压住主要动作或乱码阻断。R10/R11 三个阶段保持不同的完整肩臂与实际笔触；R15 自然肩部轮廓、游标、移动年代与城市仍相连，未退回旧静态方块；R26/R28 完整/展开/提取三阶段的切面仍贴合果皮；R30 从输出窗到落定的采样阶段保留。当前范围未发现需要中断导出的新增问题。

这是冻结后只读的整合缩略检查，未新增源码或素材改动；不替代连续播放、全片听审、661 点原尺寸人工复核或最终 MP4 编码后解码验收。

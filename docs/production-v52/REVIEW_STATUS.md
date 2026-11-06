# v5.2 当前审核包

**最新：完整 v5.2 已导出，完整技术核验通过。** [打开 4K60 成片](../../exports/astra-world-execute-me-final-v5.2-lighting-artwork-hires-4k60.mp4) · [最终交付记录](../FULL_MV_V5_2.md)。本轮获认可原画、17 段光感及新增补光已接入独立正式版；旧 v5.1 保留。成片为 816,343,779 bytes，SHA256 `e76f5208861df5e10f4fc64f515d36b50dd9daf8b6e563f24ac56f99200e8402`，完整解码、全部包／时间戳、原生无损音频、静尾及保护检查见 [verification.json](../../exports/final-v5.2/verification.json)。编码后人工抽查仅代表各记录列明的样本范围，不等于全片逐帧人工视听或全部视觉验收。

**以下均为历史审核过程。** 其中「待审」「未接入」「禁止完整导出」等文字已被 [最终制作授权](FINAL_V52_AUTHORIZATION.md) 和上述实际交付覆盖。旧审核 map、组合 01／02／03 及静音总览含后来退回的稿件，保留作历史记录，不能当成最终 v5.2 用图清单；最终清单是 `data/production-v52final/manifest.json`。

**最新追加反馈：** 用户「点读态头也歪了；其他的ok」。第二轮页面中的四张新稿 A08_01-v6、A02_01/03-v3、A04_02-v6 已获静态认可；点读 A08_02-v5 头部退回，正在参照认可翻页态重画。下面四张「待审」属于此前状态；不扩大认可到旧组合片或未展示组。

**当前待审只有本轮新点读图：** `A08-02-seated-record-v6-head-redraw.png` 已交付并在 [第二轮页面](../../exports/review-v52/round2.html) 与认可翻页态并排。五张新图都在 `round2-static-candidates.json`，其中四张 `user_approved=true`，新点读为 false。这里的「只有」限于第二轮当前页面，不替未展示组作认可。旧渲染 map／试片没有切换；新接点、两态过渡和运行时 alpha 仍待后续重测。

## 最新用户反馈：第二轮人体返工

2026-11-06 用户退回 A08_01-v5 的头部、A02_01/03 透视-v2 的腿部，以及 A04_02-v5 胸前另一只手；明确 A02_02-v6「对」，保留当前原图作为结构参考。详见 [本轮反馈](USER_FEEDBACK_ROUND2.md)。以下「人体已认可」「未见明显新错」等属于先前记录，不能覆盖这次否决。

旧组合 01/02/03 和静音总览含退回源，只作为历史演出记录。旧 candidate-map 继续对应这些已导出文件，不是新一轮通过清单。新图先审核，正式 v5.1 及生产入口保持不变。

第二轮四张新图已完成：A08_01-v6-head-redraw、A02_01/03-v3-leg-redraw、A04_02-v6-hand-redraw，均为内置 imagegen 完整重画的原字节 PNG。请先看 [第二轮人体返修页](../../exports/review-v52/round2.html)；文件与提示词见 [本轮反馈／交付](USER_FEEDBACK_ROUND2.md)，静态清单为 `data/production-v52review/round2-static-candidates.json`。新图仍待用户审核，没有接入旧候选映射或任何视频。A08 两态头部过渡、新波形接点与运行时 alpha 还要在用户选择后重测。

以下为第一轮交付记录（2026-11-06），不覆盖顶部最新退回状态。审核页：[首轮原画与演出](../../exports/review-v52/index.html)。所有时间含开头 5 秒警告。

## 第一轮状态（历史证据）

- 用户明确“光感和节奏ok”：原三段光感与节奏已认可。该认可不覆盖旧人物源图，也不覆盖后来新增的弱镜补光。
- A02 第一/三态、A07 三态、recoil、结尾两表情的原人体或表情曾获认可；现用结饰返修候选仍需整体审核。A02 contact-v2 仅人体获认可；v4 的正面贴纸透视被用户退回，v5 的近肩/左裙中心继续返修为 v6，现已独立看过并列为待审候选，不能默认整体获用户认可。
- 翻书 turn/record 原版本均因腿踝问题撤回；现两张完整重画 v5 已到位待审。旧 record-v3 书体被退回，v4 厚箱体由制作者自拒，均不展示。
- 波形第二态原源有六指问题，完整重画 A04_02-v5 已到位待审。旧连线短片只证明原黄线连接逻辑；独立新试片已重新测量手部锚点并验证 429 帧连续黄线接点，组合效果仍待用户确认。
- A07_02-v4 曾因背景透明度污染人物路径而暂停合成；现改用 `A07-02-contact-knots-perspective-v5-alpha.png`。整理者实看新全图/alpha通道/脸手三饰对照及正文132.5、133.4两张组合帧，root也实看132.5，未见旧外部黑碎块。该阻点已解除，v4保留历史但不再作为渲染候选；用户整体审核仍待完成。
- 独立 `src/mv52review` 已完成五组候选原画试片与静音总览；它不等于正式接入。正式合成须待全原画及组合试片用户审核。正式 v5.1 保留。

## 第一轮页面引用（退回项见顶部）

| 组 / 使用位置 | 当前展示候选（相对仓库） | 状态 |
|---|---|---|
| 翻书 A08_01/02；R55，2:21.883–2:25.567 | `assets/astra/v13-book-review/A08-01-seated-turn-v5.png`、`A08-02-seated-record-v5.png` | 完整重画待审；同一左手托书、右手翻→点读 |
| 边界 A02_01/03；R23，1:14.950–1:18.183 | `assets/astra/v14-boundary-review/A02-01-approach-knots-perspective-v2.png`、`A02-03-withdraw-knots-perspective-v2.png` | 结饰透视返修待审 |
| 边界 A02_02；同 R23 | `assets/astra/v14-boundary-review/A02-02-contact-v6-perspective.png` | 第六版结饰透视修正候选；待用户审核 |
| 波形 A04_02；R40–R43，1:48.650–1:55.800 | `assets/astra/v18-wave-hand-review/A04-02-wave-receive-v5.png` | 新完整手部原画待审；双手姿势较原图张开 |
| 受阻 A07 三态；R53–54，2:16.100–2:21.883 | `assets/astra/v15-refusal-review/A07-01-request-knots-perspective-v2.png`、`A07-02-contact-knots-perspective-v5-alpha.png`、`A07-03-retreat-knots-perspective-v2.png` | 三态结饰返修待审；02-v2/v3 旧中心问题、v4背景污染不作为选定稿 |
| 握腕 recoil；R74，2:53.833–2:54.733 | `assets/astra/v16-withdraw-review/recoil-redraw-knots-perspective-v2.png` | 结饰返修待审；对应用户称约 2:55 的实际截图，非 R75/A11 |
| surprise / sitSmile；R86，3:34.183–3:36.000 | `assets/astra/v17-ending-review/recognition-surprise-knots-perspective-v2.png`、`recognition-smile-knots-perspective-v2.png` | 肩饰返修待审；原表情已认可 |

上述候选使用位置来自源引用/各目录使用审计；R55 当前代码只调用 A08 两态，R86 才调用这两表情。活动 `src/mv5cat` 与 v12 manifest 没有被本审核整理工作改写。完整源图出现次数不是可见像素比例；旧 helper 引用不等于实际播放。

## 独立实际看图的范围

整理者通过 `view_image` 实际查看了原始八张人体/表情源、contact-v2，以及 contact-v6 全图/两修位/脸掌/斜饰对照、当前 A02 第一/三态结饰候选、A07 三态选定候选、recoil-v2、两表情-v2、book 两态-v5、wave-v5。结饰使用逐位置放大对照，源文件保持原字节。

- A02 第一/三态：修饰后全身动作可读，未见明显新增错接肢体；近/远肩腰及裙摆遵循不同朝向。较小鞋饰仍不足以逐带认证。imagegen 引起了 ROI 外线色变化，人体不是像素锁定：详见该目录 provenance。
- contact-v6：近肩/左裙原小中心点改为更清楚的角形负形；近肩略增、近腰孔色改变，不声称像素锁定。远腰竖斜和远肩扁投影保留，不为数六带而强行展开。强缩短位置和小鞋仍有分辨率限制；全图未见明显新增腿踝、掌腕或脸形错位。
- A07：01/03-v2 全图和九位置前后板已看。02-v2 的远腰和双裙存在中心穿带/浅点，已明确退回；02-v4 三处改为开放角形孔；随后 v5-alpha 清理背景并保留该结构，完整全图、alpha与保护区域及两运行帧均已看。鞋饰原生细小仍 uncertain，不能宣称所有小图标拓扑通过。
- recoil-v2：全图与四结饰、脸/握腕前后板已看；肩纵斜、远腰较窄，旧中心珠改善，手腕与脸没有明显新错。孔内透出衣色允许成立，不要求一律黑孔。
- 两表情-v2：全图、肩饰及脸/原发饰前后对照已看；旧四瓣链环改为可读六带开放中心，肩仍纵斜；表情轮廓视觉保持。
- book 两态-v5：两腿分别落到各自鞋踝；薄书口与两大页面可读，掀页曲线→展平页可连贯，角耳轮廓未见明显新增重复。尚未由此认证全部饰件拓扑。
- wave-v5：全图实看，双手各一拇指与四长指可辨，腕臂连续；张开程度改变了原姿势，需要用户判断。图标仍有透视/材料适配待审；不因五指可数而强行要求未来所有手指无遮挡。

原八图的 52 处结饰初审（40 bad / 10 uncertain / 2 visually consistent）保留为历史源审计，不能错误套用到返修源。见 [KNOT_REVIEW.md](KNOT_REVIEW.md) 与各候选目录 provenance。静态人工初审也曾漏掉用户随后指出的旧 contact 腿部问题，所以任何内部初审均不代用户通过。

## 短片与播放边界

| 实际短片 | 画面 / 时长 | 页面范围 |
|---|---|---|
| `exports/preview-v52-opening/R01-power-protection-4k60.mp4` | 3840×2160 / 60fps / 237 帧 / 3.95s | 开场局部演出；原电源/保护层逻辑 |
| `exports/preview-v52-wave/R40-R43-wave-contact-4k60.mp4` | 3840×2160 / 60fps / 429 帧 / 7.15s | 旧人物连线预览，未接 wave-v5 |
| `exports/preview-v52-lighting/01-opening-4k60.mp4` | 237 帧 / 3.95s；全片 0:05–0:08.95 | 用户认可光感节奏 |
| `exports/preview-v52-lighting/02-climax-4k60.mp4` | 420 帧 / 7s；全片 2:49–2:56 | 用户认可光感节奏；沿用旧人物源 |
| `exports/preview-v52-lighting/03-release-reply-4k60.mp4` | 480 帧 / 8s；全片 3:26.5–3:34.5 | 用户认可光感节奏；未覆盖最终 6s 尾声 |

开场/波形沿用既有 AAC 包；光感原三段沿用现用 ALAC 包。页面光感 `<video>` 现引用同目录 `*-4k60-review-aac.mp4` 兼容副本，原 ALAC 保留在“打开原始短片”。兼容副本画面包与原短片逐包相同，音频包复制自旧 AAC 播放版，没有新增音/视频重编码；不将 AAC 称为无损。证据见 [REVIEW_AAC.md](../../exports/preview-v52-lighting/REVIEW_AAC.md)。

制作者对以上短片做过完整媒体解码和音频窗口对齐；光感三段共 1137 帧、九窗口测得 0 延迟。整理者只实际看过代表编码帧，未连续人工听看全部视频。节奏测量源于混音频带瞬态候选，不是独立鼓轨逐拍人工精标。

## 全曲光感及后来新增补光

原 `src/mv52/lighting.js` 的 17 连续段覆盖 86 镜；现存证据为 86×3=258 个运行时样本及 1096 个实测瞬态事件。它增强原场景亮部、人物外沿和空间光池，不自动生成每镜专属线路。14 镜三样本提亮域始终低于 1%，R48 马赛克人物绕过 artwork 蒙版、R50/R86 portrait 跳过外沿等例外已明确记录：[全镜覆盖](LIGHTING_FULL_COVERAGE.md)。

用户随后要求整片更明亮、更有科技感。仅在 `src/mv52review/extra-light.js` 新增按镜头坐标的 12 镜线路/空间补光；R47 isolation 和 R50 灰眼保留静空。原 17 段代码与三段已认可效果不改。146 个 4K 样本检查已通过，代表对照已逐张实看；R02/R14/R52 三整镜 4K60 AAC 已导出并完整技术核验（595 帧、九窗口零延迟），编码后九抽帧已实看；新增效果仍需用户连续审看审核，不继承先前光感认可。

## 页面验证与保留

`exports/review-v52/qa-review.mjs` 检查全部本地链接存在、图片实际解码、当前全部视频原生 metadata、桌面/手机无横向溢出，并实际读取正式 v5.1 SHA256。最新机器结果以同目录 `qa-review.json` 为准；这些检查不等于连续视频播放或扬声器听音。

本工作新增审核文档/页面/诊断预览、经授权的 A02 第一与第三态结饰 sibling PNG，以及独立 extra-light 模块。没有改写原图、正式源、活动 v12 manifest 或正式成片。正式 v5.1 预期且此前多次实读一致的 SHA256 为 `19f4a76abfc61c1990d056d018e164ec61e93d147af1436f244cfa57261b7407`；最新页面核验已再次实读一致（见 qa-review.json）。

## Root 人工抽样复查

root另实看补光 R02/R05/R14/R31/R44/R52 六组对照，未发现新增需改问题；也看过独立新原画正文108、139.5、169.3、209.7、210.4、132.5、135.4秒的指定4K源帧。此为指定样本范围的内部人工复查，不冒充逐帧全片检查，不替代用户最终审核。

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

[五段验证报告](../../exports/preview-v52-combination/verification-summary.json) 已检查全帧解码、逐视频包内容与时间戳、AAC 源包连续性及精确正文+5秒偏移、解码 PCM 起点为零和连续 PTS。15 个分布式 PCM 对齐窗口均测得零采样延迟。AAC 解码端点分别比画面末尾多 3.333、18.667、12、8、0 毫秒，均小于一个包（21.333 毫秒）；不称作无损音频。结尾音轨为极低电平衰减，包身份与时间戳是主要同步证据。总览全部切点及1425帧验证见 [overview-verification.json](../../exports/preview-v52-combination/overview-verification.json)。

新波形锚点运行时逐帧审计为 429 帧，三相位 138/171/120 帧，均 singleStroke 且 startGap/handGap 为零；新源掌心 [263,511]，见 [wave-429-runtime.json](../../exports/preview-v52-combination/wave-429-runtime.json)。这证明几何连接，不代替用户对姿态切换的审美判断。五组区间的额外补光均不活跃。

整理者逐张实看了 `encoded-stills/index.json` 全部 21 张真实编码抽帧，覆盖边界三态、波形两次换态前后、受阻三态、翻书两态、握腕三点及结尾三点。未见新增明显肢体错接或 A07 背景黑碎块；原文件为4K，工具实际展示为2048×1152。没有连续人工听看1425帧，不把21帧抽样写成逐帧审查。图哈希与范围见 [独立编码帧审查](../../exports/review-v52/combination-encoded-sample-review.json)。所有新原画及五组组合试片仍待用户审核。

完整交付与所有保护文件核验见 [COMBINATION_REVIEW_DELIVERY.md](COMBINATION_REVIEW_DELIVERY.md) 及 [delivery.json](../../exports/preview-v52-combination/delivery.json)。审核页现有18张原画/静帧、14个原生视频控件；桌面/手机布局、本地链接与全部媒体读取已通过，正式v5.1哈希再次读取一致。

# v5.2 最终接入实施记录

2026-11-06 更新。源码／素材接入、完整导出及完整技术核验已完成；[打开 v5.2 成片](../../exports/astra-world-execute-me-final-v5.2-lighting-artwork-hires-4k60.mp4)，最终交付见 [FULL_MV_V5_2.md](../FULL_MV_V5_2.md)。技术依据为 [render.json](../../exports/final-v5.2/render.json) 与 [verification.json](../../exports/final-v5.2/verification.json)。编码后人工抽样另有 [编码帧抽查记录](../../exports/final-v5.2/encoded-visual-root.json)，不据此声称全部画面均已人工通过。

用户明确「ok了，全部接入视频吧，期待成品！」，确认最后点读稿并授权本轮全部接入和完整导出。该指令覆盖早先待审限制，详见 [最终授权](FINAL_V52_AUTHORIZATION.md)。

## 独立正式入口与保留项

- 新入口为 [src/mv52final/index.html](../../src/mv52final/index.html)，使用 [最终 manifest](../../data/production-v52final/manifest.json) 与 [最终候选映射](../../data/production-v52final/candidate-map.json)。旧审核入口／映射仍记录其真实历史用图。
- manifest 以 `assets/astra/v12-approved-cat/manifest.json` 为底，共 79 项；替换 12 项，另外 67 项保持原条目，A19 猫猫三态与动作组配置保持一致。
- 正文继续读取原 `data/production-v5/timeline.json` 与 `lyrics.en-zh.json`：86 镜、13,100 帧／218.333333 秒、128 条英中歌词、原叙事和 6 秒安静尾声。开场 R01 保留科技启动／防护演出，不出现人物。
- 输出配置为原生 3840×2160／60fps，加 300 帧警告后共 13,400 帧／223.333333 秒。新文件另存为 `exports/astra-world-execute-me-final-v5.2-lighting-artwork-hires-4k60.mp4`。
- 原图、v12 manifest、旧源码和 v5／v5.1 成片不覆盖。[导出预检](../../exports/final-v5.2/verification-preflight.json) 已通过保护文件与 v5.1 身份核验。

## 最终采用的 12 个替换槽位

下表文件均在 `assets/astra/`；完整路径、源尺寸、可见边界和来源记录见最终映射及 [prepare-report.json](../../data/production-v52final/prepare-report.json)。

| 槽位 | 最终文件 | 本轮处理 |
|---|---|---|
| A02_01 | `v14-boundary-review/A02-01-approach-v3-leg-redraw.png` | 第二轮完整腿部结构重画 |
| A02_02 | `v14-boundary-review/A02-02-contact-v6-perspective.png` | 保留用户确认的触壁稿 |
| A02_03 | `v14-boundary-review/A02-03-withdraw-v3-leg-redraw.png` | 第二轮完整腿部结构重画 |
| A04_02 | `v18-wave-hand-review/A04-02-wave-receive-v6-hand-redraw.png` | 第二轮胸前手及完整肩臂重画 |
| A07_01 | `v15-refusal-review/A07-01-request-knots-perspective-v2.png` | 保留结饰透视候选 |
| A07_02 | `v15-refusal-review/A07-02-contact-knots-perspective-v5-alpha.png` | 保留已修透明背景稿，不使用污染 v4 |
| A07_03 | `v15-refusal-review/A07-03-retreat-knots-perspective-v2.png` | 保留结饰透视候选 |
| A08_01 | `v13-book-review/A08-01-seated-turn-v6-head-redraw.png` | 第二轮完整头骨／颈肩重画 |
| A08_02 | `v13-book-review/A08-02-seated-record-v6-head-redraw.png` | 以认可翻页稿统一头部方向，重画点读态 |
| recoil | `v16-withdraw-review/recoil-redraw-knots-perspective-v2.png` | R74 完整握腕重画候选 |
| surprise | `v17-ending-review/recognition-surprise-knots-perspective-v2.png` | 保留黑脸惊愕及肩饰修稿 |
| sitSmile | `v17-ending-review/recognition-smile-knots-perspective-v2.png` | 保留黑脸欢喜及肩饰修稿 |

五张第二轮新图均重新测量源像素锚点和脸部裁切，没有沿用旧人体坐标；其余七张源、锚点和裁切与首轮已渲染候选一致。每个锚点均检查源范围及 alpha≥128，边界按同一 alpha 阈值计算。源 PNG 保留生成原字节，未拼补人体或代码贴图标。

| 新槽位 | 主要源像素锚点 |
|---|---|
| A02_01 | 探手掌心 `[1035,374]`，腕 `[998,401]` |
| A02_03 | 收回抬手 `[739,365]`，腕 `[766,401]` |
| A04_02 | 接线掌心 `[196,487]`，腕 `[243,526]`，胸口 `[705,608]` |
| A08_01 | 翻页接触 `[618,642]`，记录页 `[600,712]` |
| A08_02 | 点读指尖 `[572,723]`，记录页 `[576,730]` |

A08 两态采用共同脸框 `{x:466,y:289,w:168,h:115}`。A02 的旧键名 `eyes` 仅表示遮眼黑脸上的焦点位置，不代表画出了眼睛。手部中心等人工定位约有 3–8 源像素的不确定度，透明像素检查本身不能替代实际合成检查。

## 光感与节奏

[lighting.js](../../src/mv52final/lighting.js) 默认启用 17 个连续光照分段，覆盖全部 86 镜；原三段已认可光感参数保留。节奏事件来自真实混音频带瞬态，共 1,096 候选、316 个严格强重音，约 ±25ms 不确定度；未分离鼓轨，也不是逐鼓人工认证。

[extra-light.js](../../src/mv52final/extra-light.js) 为 R02／04／05／06／08／09／14／25／31／39／44／52 共 12 镜加入贴合原场景的线路、外沿和粒子。R47 孤独空场、R50 灰眼停顿明确保留；非目标镜不绘制该层，三段已认可试片区间另有保护。新增层位于原光感之后、字幕之前，避让人物蒙版和字幕区域。

既有例外继续成立：R48 马赛克人物绕过普通 artwork 蒙版，R50／R86 头像按设计跳过直接人物外沿。分段覆盖不等于每个人物层都获得相同光照处理，细节见 [全镜光感记录](LIGHTING_FULL_COVERAGE.md)。

## 已完成的运行时与人工抽样检查

- [runtime.json](../../exports/qa-v52-final/runtime.json)：原生 4K 共 1,859 个运行时采样通过，保存 121 张 PNG；覆盖全部 86 镜首／中／末、五组修订区间及猫猫段。79 项素材载入、12 个当前源、时间轴和双语歌词检查通过。
- 全部 429 个波形帧重新检查单一路径、波形端点／切线和手部接点；12 个补光目标镜均实际触发。无运行时错误；两条被取消的旧媒体预载记录另列，不作为最终音频验证。
- [独立视觉记录](../../exports/qa-v52-final/independent-visual.json)：逐张打开 20 张真实运行 PNG，涵盖边界、波形换态、受阻透明边缘、翻页到点读、握腕与结尾。未发现新增阻断问题。
- [Root 视觉记录](../../exports/qa-v52-final/root-visual-review.json)：实际看过覆盖 86 镜中点的六张联系表，另看翻书两态及微笑三张单帧。记录标记跟随书页，其尾迹作为数字场景叠层延伸到页外；两态头轴、结尾脸框及保留停顿可读。
- 工具把单张 4K PNG 缩放至 2048×1152 显示。上述是运行时数值检查与明确范围的静帧审看，不是连续人工视听整片，也不证明所有小饰件拓扑或每个编码帧都已审过。

## 完整导出与技术核验

导出使用上述独立入口，正文按四段编码；原 5 秒警告和原生 ALAC 192kHz／24bit 双声道沿用 v5.1。实际新文件为 816,343,779 bytes，SHA256 `e76f5208861df5e10f4fc64f515d36b50dd9daf8b6e563f24ac56f99200e8402`。音频包复制，未再次编码音乐。

[完整技术核验](../../exports/final-v5.2/verification.json) 现为 `phase=complete`、`passed=true`：13,400 帧完整解码、全部视频包／时间戳与接点、300 帧警告解码一致、全部 ALAC 包与原生 192kHz／24bit PCM 一致、八窗音频对齐、首 5 秒和末 6 秒精确静音、冻结输入及旧版保护均通过。

编码后人工抽查与运行时抽查分开记录：[Root 编码帧记录](../../exports/final-v5.2/encoded-visual-root.json) 明列实看九张及其范围，其余独立审阅结果由最终交付记录汇总。抽样不等于连续人工视听整片或每帧视觉验收；没有对外发布。

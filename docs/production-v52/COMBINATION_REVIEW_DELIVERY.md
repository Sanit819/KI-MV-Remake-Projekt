# 独立组合试片交付

2026-11-06：五段 4K60 AAC 试片及 23.75 秒静音总览已完成。仅用于用户审核；本报告不代表用户认可候选原画，也未接入正式成片。当前状态以 [delivery.json](../../exports/preview-v52-combination/delivery.json) 为准，早期 setup-validation.json 保留为历史准备证据。

## 播放文件与时间基准

渲染使用正文时间，不含片头 5 秒 warning。取旧 v5 播放版的 AAC 时间为 **正文时间 + 5 秒**。每段试片从本地 0 秒开始；下表区间右端不包含。五段均为 3840×2160、60 fps，含原 AAC 包复制音轨，没有音乐重编码。

| 试片 | 正文区间（秒） | 原 AAC 起点（秒） | 视频帧数 / 时长 | AAC 解码尾部超长 |
|---|---:|---:|---:|---:|
| [边界三态](../../exports/preview-v52-combination/01-boundary-4k60-review-aac.mp4) | 69.950000–73.183333 | 74.950000 | 194 / 3.233333s | +3.333 ms |
| [波形接线](../../exports/preview-v52-combination/02-waveform-4k60-review-aac.mp4) | 103.650000–110.800000 | 108.650000 | 429 / 7.150000s | +18.667 ms |
| [受阻三态与翻书](../../exports/preview-v52-combination/03-refusal-book-4k60-review-aac.mp4) | 131.100000–140.566667 | 136.100000 | 568 / 9.466667s | +12.000 ms |
| [握腕](../../exports/preview-v52-combination/04-wrist-4k60-review-aac.mp4) | 168.833333–169.733333 | 173.833333 | 54 / 0.900000s | +8.000 ms |
| [结尾表情](../../exports/preview-v52-combination/05-ending-expression-4k60-review-aac.mp4) | 208.000000–211.000000 | 213.000000 | 180 / 3.000000s | +0.000 ms |

[静音视觉总览](../../exports/preview-v52-combination/combined-artwork-review-4k60-SILENT.mp4) 为 1,425 帧 / 23.75 秒，**无音轨**。接点为总览第 194、623、1191、1245 帧，即 3.233333、10.383333、19.850000、20.750000 秒。按视频帧时长拼接且视频包原样复制，不使用含 AAC 预滚和包尾的容器时长累计接点。听音乐请播放上面五段独立试片。R74 保留原镜头 0.9 秒；R86 选正文 208–211 秒的回应和表情部分。

## 实际验证

- 五段所有视频帧与音轨完整解码；视频 PTS 均为 n/60，DTS 严格递增，分片视频包与对应无音轨渲染逐包一致。
- AAC 包为原音源中连续、字节不变的序列，逐包时间偏移精确等于正文起点 + 5 秒。MP4 skip/edit 信息处理负 PTS 预滚，实际解码 PCM 首点为 0，后续连续。保留的 AAC 包尾使部分音轨比视频长，具体数值见表，均小于 1 包（21.333333 ms）；不宣称尾部逐样本裁切。
- 15 个分布音频窗口的测得延迟均为 0 样本。结尾三窗音量极低，同步主要由包身份与时间戳证明，不能把低音量相关性当作听感证明。
- 静音总览完整解码为 1,425 帧；无音轨，所有视频包、逐段时间偏移和四个接点均验证通过。
- 新 A04_02 手掌锚点为原图 [263,511]，未继承旧 [188,565]。使用当前候选重跑整个 429 帧波形段：三阶段 138/171/120 帧，singleStroke 全为真，起点和手端 gap 均为 0，切换相邻帧也有编码抽帧。
- 已实看各动作阶段的原生 4K still，以及 [21 张编码后抽帧](../../exports/preview-v52-combination/encoded-stills/index.json)。review_bundle 另行逐张复核并记录 [独立抽样意见](../../exports/review-v52/combination-encoded-sample-review.json)。掌心/袖口接线、书页接点、握腕线与结尾裁切未见新增明显错位。此为抽样视觉检查，不是逐帧人工观看或小尺寸透视结饰的全面认证。

完整证据：[分片验证](../../exports/preview-v52-combination/verification-summary.json)、[总览验证](../../exports/preview-v52-combination/overview-verification.json)、[429 帧波形运行记录](../../exports/preview-v52-combination/wave-429-runtime.json)。

## 候选原画与锚点

12 个候选槽位已在独立 [candidate-map.json](../../data/production-v52review/candidate-map.json) 启用；`final_map_confirmed=true` / `review_map_ready=true` 仅表示 root 已选定本次审核映射。每张图重新测量手、腕、书页或面部区域，记录在 map、manifest 和 delivery 中。map 内早期“runtime crop check pending”文字属于测量时备注；最终运行与抽帧结果以本报告为准。

| 角色槽位 | 选用原画 |
|---|---|
| A04_02 | [A04-02-wave-receive-v5.png](../../assets/astra/v18-wave-hand-review/A04-02-wave-receive-v5.png) |
| A08_01 | [A08-01-seated-turn-v5.png](../../assets/astra/v13-book-review/A08-01-seated-turn-v5.png) |
| A08_02 | [A08-02-seated-record-v5.png](../../assets/astra/v13-book-review/A08-02-seated-record-v5.png) |
| surprise | [recognition-surprise-knots-perspective-v2.png](../../assets/astra/v17-ending-review/recognition-surprise-knots-perspective-v2.png) |
| sitSmile | [recognition-smile-knots-perspective-v2.png](../../assets/astra/v17-ending-review/recognition-smile-knots-perspective-v2.png) |
| A02_01 | [A02-01-approach-knots-perspective-v2.png](../../assets/astra/v14-boundary-review/A02-01-approach-knots-perspective-v2.png) |
| A02_02 | [A02-02-contact-v6-perspective.png](../../assets/astra/v14-boundary-review/A02-02-contact-v6-perspective.png) |
| A02_03 | [A02-03-withdraw-knots-perspective-v2.png](../../assets/astra/v14-boundary-review/A02-03-withdraw-knots-perspective-v2.png) |
| A07_01 | [A07-01-request-knots-perspective-v2.png](../../assets/astra/v15-refusal-review/A07-01-request-knots-perspective-v2.png) |
| A07_02 | [A07-02-contact-knots-perspective-v5-alpha.png](../../assets/astra/v15-refusal-review/A07-02-contact-knots-perspective-v5-alpha.png) |
| A07_03 | [A07-03-retreat-knots-perspective-v2.png](../../assets/astra/v15-refusal-review/A07-03-retreat-knots-perspective-v2.png) |
| recoil | [recoil-redraw-knots-perspective-v2.png](../../assets/astra/v16-withdraw-review/recoil-redraw-knots-perspective-v2.png) |

A07_02 的 v4 候选曾在合成中出现背景 alpha 黑碎块，已由内置 imagegen 提取透明背景得到 v5-alpha，再重新测量与导出。修复后 [132.5 秒](../../exports/preview-v52-combination/stills-alpha-fixed/source-132.500.png)、[133.4 秒](../../exports/preview-v52-combination/stills-alpha-fixed/source-133.400.png) 原生合成及最终编码样本均已实看，外部黑碎块消失。`stills-candidates/source-132.500.png` 是保留的旧错误证据，不能当作最终结果。旧原画保持历史原字节。

## 隔离与保留

独立入口为 `src/mv52review/index.html`，仅载入独立审核 manifest。原 `src/mv52`、`src/mv5cat` 与生产 manifest 共 20 个文件，以及 3 个受保护媒体均重新核对原 hash，一致。审核目录中的 lighting、early、middle、late、kit、neural、spatial-neural 七个基线模块与 mv52 字节相同。

独立 extra-light 模块 hash 为 `0202e43e3037f21e71bd61f3cc4bf6df895f0063808921e06c177d6b8a454cec`，本次五段均不触发新增效果。额外弱镜试片由 review_bundle 在 `exports/preview-v52-extra-light/` 独立交付，不能用本五段替代其动态审核。

正式 v5.1 成片 SHA256 保持 `19f4a76abfc61c1990d056d018e164ec61e93d147af1436f244cfa57261b7407`。未覆盖原 PNG、正式 manifest、正式 renderer、正式音轨或正式视频。

工具链为 `prepare_mv52review.py`、`render_mv52review.mjs`、`verify_mv52review.py`、`assemble_mv52review.py`、`verify_mv52review_overview.py`、`extract_mv52review_encoded.py`、`finalize_mv52review.py`。渲染与验证为独立步骤；最终交付 metadata 由 finalize 汇总。既有 AAC 源含 UDTA metadata 解析 fallback 提示，但全量媒体解码与实际音频呈现检查均通过。localhost 审核服务器需按需启动，不以曾记录的进程号证明它当前在线。

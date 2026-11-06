# ASTRA 完整 MV v5.2 — 原画修订与全片光感

2026-11-06。用户确认「ok了，全部接入视频吧，期待成品！」后，已将本轮认可的原画、全片光感与额外补光接入独立正式入口，完成完整视频导出与技术核验。

[打开完整视频](../exports/astra-world-execute-me-final-v5.2-lighting-artwork-hires-4k60.mp4) · [标题](publishing/video-title-v07.txt) · [可复制简介](publishing/video-description-v07.txt) · [保留的猫猫封面](../assets/publishing/cover-v03/astra-world-execute-me-cat-cover-v03.png)

## 实际交付文件

| 项目 | 实测结果 |
|---|---|
| 文件 | `exports/astra-world-execute-me-final-v5.2-lighting-artwork-hires-4k60.mp4` |
| 画面 | 原生 3840×2160，60 fps，H.264 High，yuv420p，BT.709 limited |
| 时长与帧数 | 13,400 帧，223.333333 秒；5 秒警告 + 218.333333 秒正文 |
| 音频 | ALAC，192,000 Hz，24 bit，双声道；直接复制已验证 v5.1 音轨 |
| 大小 | 816,343,779 bytes，约 816 MB |
| SHA-256 | `e76f5208861df5e10f4fc64f515d36b50dd9daf8b6e563f24ac56f99200e8402` |

视频采用 NVENC p6 / cq19 编码；无损指音频。正文四段分别编码后无重编码拼接，原片头的 300 个视频包和完整 ALAC 轨复制到新文件。旧 v5、v5.1、原画、审核试片与生产入口全部保留，没有覆盖旧成片。

## 已接入的修订

- 12 个角色素材槽位采用本轮最终选择，其中五张为最后一轮认可的完整重画：A02_01／03 腿部，A08_01 翻页与 A08_02 点读头部，A04_02 接线姿态的胸前另一只手。新图接点与脸框按源像素重新测量。
- A02_02 继续使用用户明确认可的 contact-v6。A07_02 采用已修透明背景的 v5-alpha；受阻另外两态、握腕和结尾惊愕／欢喜采用审核后的透视修订稿。
- 17 段连续光感覆盖 86 镜，另为 R02／04／05／06／08／09／14／25／31／39／44／52 共 12 镜补充场景线路、外沿和流光。R47 孤独空场、R50 停顿保留。
- 光感节奏来自真实混音频带瞬态，不是固定 BPM 网格；1,096 候选、316 个严格强重音，时间约有 ±25ms 不确定度。没有分离鼓轨或逐鼓人工认证。
- 保留 86 镜、21 组／52 个动作姿态、用户选定的猫猫三态、128 条上英文下中文歌词、原故事和 6 秒安静共画尾声。开场科技启动／防护不出现人物。

最终文件、坐标及取舍详见 [12 槽实施记录](production-v52/FINAL_V52_IMPLEMENTATION.md) 和 [最终映射](../data/production-v52final/candidate-map.json)。独立入口为 [src/mv52final/index.html](../src/mv52final/index.html)，素材清单为 [production-v52final/manifest.json](../data/production-v52final/manifest.json)。首轮审核 map 和短片仍对应当时历史源，不作为当前生产入口。

## 已完成的技术核验

[最终核验报告](../exports/final-v5.2/verification.json) 的 16 项检查全部通过；[导出记录](../exports/final-v5.2/render.json) 为 `phase=complete`、`passed=true`。

- 完整解码全部 13,400 帧及音频，无解码错误；3840×2160／60 fps 和时长符合预期。
- 所有视频包的 PTS 为精确 `n/60`、时长 `1/60`，DTS 严格递增；四分段覆盖正文 13,100 帧且不重不漏，全部压缩视频包与最终对应区间相同，拼接时间戳连续。
- 原片头全部 300 个视频包保持一致，另逐帧解码比较原生画面 SHA-256 与时间，均一致。
- 10,469 个 ALAC 音频包的大小、内容、PTS、DTS 与持续时间和 v5.1 完全相同，没有新增音频编码。
- 两版全部原生 PCM 各 257,280,000 bytes、每声道 42,880,000 个样本，SHA-256 均为 `a8195021c34ab3c21474d2ec7a8e3e0a14ed36d571d42cf95e1da7979d9b7e26`。前 5 秒及最后 6 秒逐样本为零。
- 6／36／65／95／125／155／185／205 秒八个分布式音频窗口偏移均为零。此项对照既有音轨，不另作演唱逐字对时认证。
- 全部声明的渲染输入、源指纹和受保护文件哈希保持不变。原 v5.1 SHA-256 仍为 `19f4a76abfc61c1990d056d018e164ec61e93d147af1436f244cfa57261b7407`。

分项证据：[完整解码与音频窗](../exports/final-v5.2/full-verify.json)、[视频包与接点](../exports/final-v5.2/packets.json)、[片头解码](../exports/final-v5.2/warning-decoded-verification.json)、[音频包](../exports/final-v5.2/audio-packets.json)。

## 视觉检查范围

导出前完成 [1,859 个原生 4K 运行采样](../exports/qa-v52-final/runtime.json)，覆盖全部 86 镜首／中／末、五组修订区间和猫猫段，并保存 121 张 PNG。所有 429 个波形帧的端点／切线与手部接点检查通过；字幕和 12 镜补光触发正常，无运行时错误。

实际看过覆盖 86 镜中点的六张联系表与三张重点帧；独立审阅者另逐张查看 20 张运行帧，范围见 [Root 运行画面记录](../exports/qa-v52-final/root-visual-review.json) 和 [独立记录](../exports/qa-v52-final/independent-visual.json)。

成片使用一次解码提取 [28 个精确原生 4K 帧](../exports/final-v5.2/encoded-stills/index.json)，其中包含警告／正文边界、补光、A02 三态、猫猫三态、波形换态前后、A07 三态、翻书换态前后、握腕、两表情及尾声。28 张均已实际逐张审看，未发现新的构图、透明背景、手部接点或编码回归阻断项；Root 看后 9 张，独立审阅者看前 19 张，结果分别记录于 [Root 编码帧检查](../exports/final-v5.2/encoded-visual-root.json) 和 [独立编码帧检查](../exports/final-v5.2/encoded-visual-independent.json)。

这些是明确范围的静帧检查与全片技术检测，不是连续人工视听或逐帧人工审完全部影片。看图工具将 4K 源图显示为 2048×1152；小饰件未作数学／矢量拓扑认证。旧 v5 的 16.48% 复用率属于历史，本轮没有重新统计。

## 复现与后续

在仓库运行 `node tools/render/export_final_v52.mjs` 可查看导出 dry run；`--execute` 才执行，已有文件不覆盖。独立核验为 `tools/render/verify_final_v52.py`，成片抽帧为 `tools/render/extract_final_v52_stills.py --execute`。缓存按完整输入指纹隔离；修改输入后不能冒用本次报告。

v07 标题逐字保留已确认的 v06，简介只同步技术交付段，保留第一人称故事、参考视频、源码与版权署名。封面仍为 v03。本次仅本地交付，未上传发布；沿用用户此前决定，没有新制 AAC 或 1080p 副本。平台转码与 Hi-Res 标识不在本地验证范围内。

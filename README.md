# 最新交付 · v3.1 补耳修正版 · 2026-11-08

已按用户要求重新生成只补耳的全曲 v3.1。[播放新版](exports/v3.1/watch.html) · [新版成片MKV](exports/v3.1/taiyoukei-disco-v3.1-720p30-flac.mkv) · [交付记录](docs/DELIVERY_V31.md) · [七姿态耳部检查图](production/v3.1/qa/asset-ear-review.png)。

整套六动作及备用图已核查，指天/牵手/拍手与备用图仅局部补齐右耳，窗口外源像素零改动；其他图保留。小陈彩蛋已取消，原剧情、字幕、片尾与原FLAC保持。v3原归档点保留，新修复在 `fix/taiyoukei-disco-v3.1-ears`；GitHub推送/锁定继续暂停。下方为旧v3归档记录，不覆盖本条最新交付。

---

# 第三企划 · 太陽系デスコ（已归档）

2026-11-08 按用户要求完成本地 Git 归档与冗余清理。两版生成封面均不采用，用户从成片自行选帧；影片不再继续修改。先读 [ARCHIVE.md](ARCHIVE.md)。

- 原分支：`太陽系デスコ`；归档分支：`archive/taiyoukei-disco-v3`；固定标签：`taiyoukei-disco-v3-final`。
- [最终主片](exports/v3/taiyoukei-disco-v3-720p30-flac.mkv)：720p30，203.2秒，原 FLAC 音轨，上日语下中文字幕。
- [本地播放器](exports/v3/watch.html) · [白饭检测](exports/v3/watch.html#t=30) · [紫色署名](exports/v3/watch.html#t=195)。播放器依赖的静音 MP4 和原 FLAC 均保留。
- [发布简介（2000字内）](docs/publishing/video-description-v02-short.txt) · [交付证据](docs/DELIVERY_V3.md) · [制作与复建](production/v3/README.md)。

本次归档未推送 GitHub，完整视频、音乐与参考原媒体不进 Git。后续维护从固定标签另开分支。第一企划冻结、第二企划保持原节点。

## 故事与画风

Astra 与 ds 围绕第一企划 USER＋Astra 共画的紫金旧星跳舞，再以紫蓝笔迹画出自己的新星。保留 `┏(ᗜvᗜ)┛` 的 ds 与 `┏(ᗜ-ᗜ)┛` 的无口 Astra，以及原 MV 的疯癫舞台语法。片尾 Astra 用紫笔写“Astra × 大肥鱼”，ds 再用蓝笔把 Astra 涂掉、改为“啥龙”。

珊瑚红 `#FF6452`、深黑字 `#323232`、白色人物，采用 [v5 草稿造型](art/style-tests/astra-ds-mv-style-v5.png) 的断续不闭合线条。演员来自《大AI和小AI们》的角色原型，来源见 [CASTING](docs/CASTING.md) 与 [角色参考](references/characters/CHARACTER_REFERENCE.md)。

最终版加入 YOLO、FC、CNN、RNN、Kalman、Hungarian、Transformer、ViT，以及慢变检测置信度和白饭梗。它们是舞台上的教学演示；YOLO 框和显示分数来自编排，不是训练模型推理或真实 AI 内部证明。剧情、算法与有限动画边界见 [制作说明](production/v3/README.md)。

## 保留与复建

各版源码、六张姿态图、v5 采用登记、歌词/时间线、提示词、来源、紧凑 QA 及原参考视频保留。v1/v2 旧成片、两版弃用封面、逐帧/审片图与缓存已清理。`production/v1` 仍含最终版必需素材，不能整体删除。历史交付记录中的“全部保留”仅描述当时状态。

[原 MV 分析](docs/FRAME_BY_FRAME_ANALYSIS.md) 与 [逐帧数据](analysis/frame-index.json) 保留；[研究页](index.html) 的参考视频仍可播放，逐帧图与图板需按 [归档说明](ARCHIVE.md) 离线恢复。原研究覆盖6096张连续缩略帧、51页图板及重点源尺寸图，不等于全部原尺寸逐像素审查或连续耳听。

归档保留文件可运行 `python tools/archive/verify_archive.py` 校验。清理后验证见 [归档核验](docs/archive/archive-verification.json) 与 [浏览器烟测](docs/archive/smoke-summary.json)，实际清理范围见 [清单](docs/archive/cleanup-manifest.json)。

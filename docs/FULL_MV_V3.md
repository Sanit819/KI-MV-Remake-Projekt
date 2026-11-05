# ASTRA 完整 MV v3 交付

2026-11-05。86 镜、218.333333 秒、13,100 帧；完整 Mili 原版音轨与已确认的 6 秒安静共画尾段。此次为针对用户十点反馈的完整影片修订。

| 文件 | 规格 | 大小 | SHA256 |
|---|---|---|---|
| [4K60 母版](../exports/astra-world-execute-me-full-v3-4k60.mp4) | 3840 × 2160 / 60 fps | 283,245,132 bytes | `fc5843f714c862d4a405f2a2cee58f958eaeb1597fe872dfe4300d0c1586e90b` |
| [1080p60 播放版](../exports/astra-world-execute-me-full-v3-1080p60.mp4) | 1920 × 1080 / 60 fps | 138,195,714 bytes | `26c6ea3ea2cf0b940b481eaf8b970c0f687a772f45a57bf7c2d18aa39908a23b` |

## 本次修订

| 反馈 | 成片里的处理 |
|---|---|
| 0:35 手突兀 | R10 使用连贯肩臂、不同持笔手，实体笔尖与圆周同点；角色从画边进入 |
| 0:37 脚突兀 | R11 删除脚，改独立绘制的垂直持笔动作；正弦曲线与解析切线在笔尖交会 |
| 0:53 手与静态方块 | R15 换伸指拖动姿势，移除方块；时间尺、AD/BC 年份与城市联动 |
| 茄子/番茄切面 | 从果实同一曲线轮廓求切口宽度，上下切面与皮相接；分别画弯曲种子带和番茄种腔 |
| 手部重复 | 新画五种动作；中后段原孤立手也换为完整接收、护星、作画或伸手人物。旧 hand 只用于开机接电镜 |
| 1:53 拼接姿势 | R45 一张完整头肩肘腕手的等待姿势，无独立手部拼贴 |
| 1:55 时间变化 | R46 明确逐级显示 1 second → 1 hour → 1 day → 1 week → 1 month，五级轨道持续保留 |
| 2:00 马赛克 | R48 对实际人物图像做低分辨率像素替换，依角色 alpha 从左上向右下覆盖到 100% |
| 五官与追加眼型纠正 | v01 新脸被用户否定后重画 v02，改原人设窄杏眼、细睫毛、小椭圆高光与闭口；R50/R70/R71 已接入 |
| 中文字幕 | 128 条演唱 cue 烧入上英文、下用户原中文译文；界面和叙事文字仍英文/代码 |

画风保持有限紫色、深墨剪纸与程序图形。人物 GPT 镂空结饰直接在源图里绘制；没有后贴圆形图标。完整图、拒稿、提示词和源像素锚点均保存。暖尾声不改：新回应、认出、放松、继续共画。

## 验证与边界

- [661 点实际渲染](validation/astra-v3-runtime.json)：86 镜首中末、128 条双语 cue 首中末、尾声及专门时间/马赛克点，全部通过。中文仅来自用户所给译文，英文在上、中文在下；无 404 或 JS 异常。
- [中段连续 347 帧](validation/astra-v3-middle.json)：等待五级为 31/31/30/31/30 帧；马赛克的 194 帧真实 alpha 加权覆盖率单调从 0 到 1。连续指标检查不是连续人工观看。
- [4K 完整解码/音频](validation/astra-full-v3-4k60.verify.json)、[逐包 PTS](validation/astra-full-v3-4k60.timestamps.json)、[渲染记录](validation/astra-full-v3-4k60.render.json)通过；所有 13,100 帧完整解码、精确 60fps，八个原音频窗口均对齐，安静尾段保持 6 秒。
- [1080p 完整解码/音频](validation/astra-full-v3-1080p60.verify.json)、[时间戳](validation/astra-full-v3-1080p60.timestamps.json)、[缩制记录](validation/astra-full-v3-1080p60.render.json)通过，由同一母版缩制、AAC 直接复制。
- 重点源帧与图板实际查看记录：[早段](production-v3/EARLY.md)、[中段](production-v3/MIDDLE.md)、[脸部及晚段](production-v3/FACE.md)。最终 MP4 抽查见 [编码后记录](production-v3/ENCODED_QA.md)。未把静帧抽样或完整解码称作全片逐帧人工听看。
- [交付哈希与旧版保留](validation/astra-v3-delivery-preservation.json)：当前源码/资产匹配运行时记录，两版 v2 MP4 哈希不变。旧作品未覆盖。

这仍是动作原画、2.5D 镜头和程序动态图形的合成，不是逐帧重绘的人体动画。艺术效果由用户继续评价；本地交付不包含发布或演唱音色训练。

## 可复现入口

生产页 [src/mv3/index.html](../src/mv3/index.html)，[素材清单](../assets/astra/v08/manifest.json)，[双语歌词](../data/production-v3/lyrics.en-zh.json)，[双语 SRT](../data/production-v3/world-execute-me.en-zh.srt)。

仓库根目录依次运行 `npm run full:v3:data`、`npm run full:v3:assets`、`npm run full:v3:qa`、`npm run full:v3:4k`、`npm run full:v3:1080`。本机 Node/Edge/FFmpeg NVENC/Python 路径沿用既有制作工具。

最新范围以 [用户反馈原文](production-v3/USER_FEEDBACK.md) 为准：本轮明确恢复中文字幕，覆盖 v2 的全片无中文决定。

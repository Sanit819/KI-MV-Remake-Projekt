# ASTRA《未写完的世界》完整 MV v2

2026-11-05 本地交付。采用用户全部 87 条镜头笔记；R00 不另做片头，正片 86 镜。原曲完整保留，新增已批准的 6 秒安静尾段；总长 218.333333 秒、60 fps、13,100 帧。

| 文件 | 规格 | 大小 | SHA256 |
|---|---|---|---|
| [4K60 母版](../exports/astra-world-execute-me-full-v2-4k60.mp4) | 3840×2160，H.264 High / 8-bit 4:2:0 / BT.709 | 283,411,899 bytes | `3a52d4f32bdb3ad914b941cf8f96161eaa8dcf627d76dc724e1a01760df45b24` |
| [1080p60 播放版](../exports/astra-world-execute-me-full-v2-1080p60.mp4) | 1920×1080，由同一母版 Lanczos 缩制 | 137,271,294 bytes | `80fbd62ee2a6876350b12b0198105969d6cd31fe84982523fda0302dd97320d9` |

## 本轮变化

- 重写为 86 镜，按歌词表现开机、参数初始化、数学世界、感官试验、投射、等待、删除、失控循环、放手和新回应。原参考仓库的场景时间与本曲音频偏移可追溯；六次数词和高潮 19 个切点进一步直接锁定原词 cue。
- 全片仅英文、原文歌词、数学与程序符号。用户最新指示覆盖早先双语字幕要求；中文译文保留在资料中，不进入影片。128 个演唱 cue 使用用户提供原文。
- 加入绘制的 ChatGPT 工作区、Codex CLI、精确 UI 加载图形、参数与子任务窗口。截图仅作界面参考，没有把带中文字的截图放入影片。
- 新绘 10 个 ASTRA 动作/局部素材和 6 位 AI 客串人物，统一三墨剪纸；10 个新 ASTRA 素材又分别通过 ImageGen 局部重绘六环 GPT 结饰。人物结饰存在于源图内，无外挂图标、外圆或圆盘。原图、修订图和提示词均保留于 [v07](../assets/astra/v07/README.md)。
- 激活 v06 修正眼位的惊讶与微笑。手腕、掌心、指尖、鞋尖、持笔笔尖分别接源像素锚点；不靠镜像交换左右手。
- 最后一次 EXECUTION 终止强迫回应的循环。208 秒新金笔独立进入；209.18–211 秒认出并微笑；211–218.333 秒两种笔迹继续画。旧星保留，不以黑场或关闭应用结尾。

这是 2.5D 剪纸角色与程序动态图形合成、原生 4K60 画布输出；角色由不同动作图块、镜头、遮罩和锚点动画表演。并非 13,100 张独立手绘，也不是完整骨骼角色动画。

## 已完成核验

1. [267 点真实运行时检查](validation/astra-v2-runtime.json)：86 镜首中末、6 个尾声点、末句首中末；镜号、实际歌词绘制证据、无中文、无 404/JS 错误、素材存在，全部通过。
2. [4K 全解码与音频](validation/astra-full-v2-4k60.verify.json)：13,100 帧完整解码，8 个分布式音频窗口均零采样偏移，相关性最低 0.997620。
3. [4K 逐包时间戳](validation/astra-full-v2-4k60.timestamps.json)：每一帧 PTS 与时长均为精确 1/60 秒，三处分片交界无缺帧或重复。
4. [渲染与静音尾段报告](validation/astra-full-v2-4k60.render.json)：212.333333 秒起新增 6 秒解码为 144,000 个 24kHz 零值样本。原音轨未拉伸、循环或重排，最终只编码一次 AAC。
5. [1080p 完整核验](validation/astra-full-v2-1080p60.verify.json)、[时间戳](validation/astra-full-v2-1080p60.timestamps.json)、[转码记录](validation/astra-full-v2-1080p60.render.json)全部通过。两版 AAC packet payload SHA256 同为 `d1f8b8a0289af95c44e4a26ede2e6537b332fa9626198a23fa3f4bb38e691588`，播放版没有再次编码音频。
6. [视觉检查范围与修正](production-v2/VISUAL_QA.md)记录分段图板、原尺寸重点帧及源图检查；[最终编码帧检查](production-v2/ENCODED_VISUAL_QA.md)单独检查实际 MP4。抽样不冒称全片逐帧人工或连续听审。

编码后还发现并修正了 212.5 秒的角尖轻触顶；旧 RC1 在 exports/revisions/v2-rc1 留存。[完整共画段边界检查](validation/astra-v2-coda-bounds.json)覆盖最后 440 帧，素材矩形最小上方余量 23.69px；最终重新输出两版并重新通过技术核验。

v1 两个 MP4 当前 SHA256 与此前交付完全一致，未覆盖。技术核验不等于用户对艺术效果的最终认可。

## 复现与资料

在仓库根目录运行：

```powershell
npm run full:v2:data
npm run full:v2:qa
npm run full:v2:4k
npm run full:v2:1080
```

需要本地 Node、Edge、FFmpeg/NVENC、Python/NumPy；具体路径见工具与 [交付核验说明](production-v2/DELIVERY_VERIFICATION_NOTES.md)。4K 四段渲染实耗 390.08 秒，含核验 417.01 秒；1080p 缩制和核验共 51.470 秒，仅为本机本次记录。

预览页：[src/mv2/index.html](../src/mv2/index.html)。从仓库运行 `python -m http.server 8000 --bind 127.0.0.1` 后，浏览器访问 `/src/mv2/index.html`。支持原曲播放和 6 秒尾声继续计时。

可追溯资料：[用户原笔记](production-v2/user-notes-20261105.json) · [逐镜实现](production-v2/IMPLEMENTATION.md) · [生产时间轴](../data/production-v2/timeline.json) · [英文歌词](../data/production-v2/lyrics.en.json) · [英文 SRT](../data/production-v2/world-execute-me.en.srt) · [来源署名](CREDITS.md)。本轮仅本地制作和交付，未发布；ASTRA 演唱音色训练仍未开始。


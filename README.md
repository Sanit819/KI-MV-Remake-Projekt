# KI-MV-Remake-Projekt

ASTRA《未写完的世界》——用户与 ASTRA 共同制作的 Mili《world.execute(me);》原创 MV。

## 当前交付：完整 v3（2026-11-05）

[4K60 母版](exports/astra-world-execute-me-full-v3-4k60.mp4) · [1080p60 播放版](exports/astra-world-execute-me-full-v3-1080p60.mp4) · [交付与核验](docs/FULL_MV_V3.md)

完整 86 镜、218.333333 秒、13,100 帧。根据本轮十点反馈重画五种上下文动作及原人设眼型，修正果蔬切面、五级等待时间和人物渐进马赛克；128 条歌词按最新要求恢复为上英文、下用户提供的中文译文。保留完整原曲和 6 秒安静尾段，最后两个人继续画下去。

两版完整解码、全部帧时间戳、8 个音频对齐窗口和静默尾段均通过。661 点运行时检查及中段 347 帧连续指标检查通过，人工抽查范围见交付文档。v1/v2 和被否定的眼部中间稿保留；这仍是动作原画、2.5D 镜头与程序动态图形合成。

当前生产入口为 [src/mv3/index.html](src/mv3/index.html)、[v08 manifest](assets/astra/v08/manifest.json)、[v3 时间轴](data/production-v3/timeline.json)及[双语歌词](data/production-v3/lyrics.en-zh.json)。复现用 `npm run full:v3:qa`、`npm run full:v3:4k`、`npm run full:v3:1080`；提示词和反馈记录见 [v3 制作目录](docs/production-v3/USER_FEEDBACK.md)。MP4 在本地交付，未提交进 Git 或发布。

以下各节为历史记录。v2 的无中文决定已由本轮“歌词的中文字幕加上”覆盖，当前以 v3 交付和最新用户反馈为准。

## 历史交付：完整 v2（2026-11-05）

[4K60 母版](exports/astra-world-execute-me-full-v2-4k60.mp4) · [1080p60 播放版](exports/astra-world-execute-me-full-v2-1080p60.mp4) · [交付与核验](docs/FULL_MV_V2.md)

已按用户 87 条镜头笔记重做为 86 个正片镜头，218.333333 秒、13,100 帧。全片无中文，使用英文原歌词和程序/数学符号；新绘工作区、CLI、动作局部与六位客串，人物六环结饰直接绘入源图。高潮数词与歌词逐项对齐；保留完整原曲，增加已批准的 6 秒静默尾段，最后认出真实回应并继续共画。

两版完整解码、全部帧时间戳、8 个音频对齐窗口、静默尾段和 267 点运行时检查均通过。视觉抽样范围见交付文档；这是剪纸角色/动态图形合成，并非全片逐帧手绘。v1 交付文件保留原样。

v2 生产入口为 [src/mv2/index.html](src/mv2/index.html)、[v07 manifest](assets/astra/v07/manifest.json)、[v2 时间轴](data/production-v2/timeline.json)。复现用 `npm run full:v2:4k`，再用 `npm run full:v2:1080` 从母版缩制；`npm run full:v2:qa` 执行实际渲染检查。[逐镜落实记录](docs/production-v2/IMPLEMENTATION.md)与[新素材提示词](assets/astra/v07/README.md)已存仓库。

以下对照讨论和 v1 章节是历史记录；其“待审/未激活/尚未重做”状态已由后续交付覆盖。v2 当时采用无中文要求，v3 已恢复双语。

## 2026-11-05 对照与修订

最新：[87镜逐镜讨论室](docs/shot-review-20261105/index.html) · [逐镜图文稿](docs/shot-review-20261105/SHOT_DISCUSSION.md)。每镜附原片与v1同音乐时间对比图，支持原片30fps逐帧查看、镜号搜索及本机笔记；[审阅范围与复现](docs/shot-review-20261105/README.md)。当前是构图和演出讨论，尚未重做v2成片。

用户看完 v1 后要求增强冲击力、减少重复、建立 AI 工作空间、让演出贴近歌词，并添加双语字幕及修正眼位。已保存[实际成片对照与量化审计](docs/REVISION_V2_AUDIT.md)、[全曲 v2 演出提案](docs/REVISION_V2_SCENE_PROPOSAL.md)、[用户提供的歌词与字幕草稿](data/lyrics/README.md)、[眼位修订候选](assets/astra/v06-eye-study/README.md)。

v1 成片及生产素材保持原样。v2 演出为待审提案，字幕尚未烧入视频，新眼位尚未激活到生产 manifest；完整 v1 的技术交付状态不代表用户已认可其艺术效果。

## 完整版 v1

- [4K 60fps 完整版](exports/astra-world-execute-me-full-v1-4k60.mp4)：3840×2160、212.333333 秒、12,740 帧、H.264 High / BT.709、原版 BGM。
- [1080p60 播放版](exports/astra-world-execute-me-full-v1-1080p60.mp4)：由同一 4K 成片缩制，保留完整音轨。
- [交付记录](docs/FULL_MV_V1.md) · [技术报告](docs/validation/astra-full-v1-4k60.verify.json) · [全部帧时间戳](docs/validation/astra-full-v1-4k60.timestamps.json) · [视觉检查范围](docs/validation/FULL_MV_VISUAL_QA.md)。
- [署名与来源](docs/CREDITS.md)。

影片完整覆盖已确认的八阶段、54 镜故事。紫色是 ASTRA，暖金是另一侧独立的新回应。她先主动撤回控制，再等来新的一笔；最后两种笔迹继续画下去，旧星留在身边。

当前唯一有效人物素材为 `assets/astra/final/manifest.json` 激活的六张 `*-knot.png`：紫黑剪纸剪影、直接绘入的 GPT 镂空结饰、无外圆或贴标层。人物近景采用源图轮廓描摹，界面和几何按源时间连续绘制。输出是原生 4K60 画布合成；不是 12,740 张独立生成画，也不是全身逐帧手绘动画。

## 工程与复现

本地 Git 分支：`world.execute(me);`，尚未配置远程。MP4、音源、缓存和依赖不纳入 Git；已保存工程、提示词、源图、分镜和核验报告。

安装 Node 依赖后：

```powershell
npm run full:4k
npm run full:1080
```

4K 命令使用四段并行 PNG / NVENC 渲染，然后一次合入原版音频，自动进行完整解码、每帧时间戳和分布式音频对齐检查。需要本地 Edge、FFmpeg 及 Python + NumPy；当前机器的路径与复现命令见交付记录。

交互预览：

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

打开 `http://127.0.0.1:8000/src/full/index.html`，可播放原音轨、拖动时间轴。

## 策划与参考

| 文档 | 内容 |
| --- | --- |
| [故事](docs/STORY.md) | 八阶段动机、旧星、新回应与温暖结局 |
| [分镜](docs/STORYBOARD.md) | 54 镜的情绪、动作、转场、原音轨帧号 |
| [BGM 校准](docs/BGM_ALIGNMENT.md) | 原版音源、拍点与近静默尾部 |
| [参考镜头审阅](docs/FULL_MV_REFERENCE_AUDIT.md) | 指定仓库和 GPT 参考片的 12 组真实构图/运动对照 |
| [最终人物与提示词](assets/astra/final/README.md) | 新素材、结饰修订、透明边缘、三墨处理与锚点 |
| [版本重设记录](docs/assets/DESIGN_V05_RESET.md) | 用户弃用旧设计与独立贴标的决定 |

画风、制作提示和镜头机制参考 [Nyankomintsu 的仓库](https://github.com/Nyankomintsu/world-execute-me-lyric-mv) 与 [GPT6-Astra 参考片](https://www.bilibili.com/video/BV1RzHG6SEHy/)。故事与金色回应结尾采用本项目企划。

v01–v04、旧 `assets/astra/full/`、19.267 秒 v01 结尾样片及 `src/sample-v02/` 均属历史方案，不参与当前成片。具体历史保留于各版本文档。完整片已获用户授权，本次仅本地交付，未发布。

未来的 ASTRA 演唱音色训练仍未开始。当前成片采用 Mili 原版；替换演唱版时需重新校准。

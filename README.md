# KI-MV-Remake-Projekt

ASTRA《未写完的世界》——用户与 ASTRA 共同制作的 Mili《world.execute(me);》原创 MV。

## 最新研究：最终版视觉方案（2026-11-05）

[86 段逐帧对照与笔记](docs/reference-BV1xCai6aE9g/index.html) · [最终版优化方案](docs/reference-BV1xCai6aE9g/OPTIMIZATION_PROPOSAL.md) · [v4 素材复用审计](docs/reference-BV1xCai6aE9g/V4_REUSE_AUDIT.md)

新增研究西西弗斯的风车 BV1xCai6aE9g：公开 480p24 参考的 5,085 帧与实际 v4 的 13,100 帧全部提取，配有全程半秒总览、86 段三时点对照和原生连续帧。实看关键帧与分段图板，不冒称逐张人工审完全部帧。重点方案为完整动作阶段、材料接续和三种不同的计算空间；综合复用审计与前半观察，建议 21 组动作 / 52 张完整关键姿态，最高三张源图覆盖目标从 49.96% 降到 ≤30%（源图提交口径）。**本轮是分析和提案，未实施最终版，当前可播放成片仍为下面的 v4。**

## 当前交付：完整视觉 v4（2026-11-05）

[4K60 / 192 kHz 24 bit 无损上传版](exports/astra-world-execute-me-full-v4-warning-hires-4k60.mp4) · [1080p60 AAC 完整预览](exports/astra-world-execute-me-full-v4-warning-1080p60.mp4) · [交付与全部验证](docs/FULL_MV_V4.md) · [新版简介](docs/publishing/video-description-v03.txt)

已实施用户批准的视觉优化方案，并加入六处全连接、CNN、RNN 动画：参数生成世界、局部窗口提取特征、历史状态跨时间传递；后段的预测回到她自己的笔，最终仍由另一侧独立带来新回应。错误窗口成为实体限制，高潮将焦点交给眼睛、手腕与出口，紫金两笔实际建起桥和三块地形。[逐段实施](docs/production-v4/IMPLEMENTATION.md) · [网络演示时间](docs/production-v4/NEURAL_TIMECODES.md)

完整上传版共 13,400 帧、223.333333 秒：5 秒紫色 GPT 光敏警告、86 镜正片、已批准的 6 秒安静共画尾段；128 条英文在上、中文在下。四份 AAC/ALAC 上传文件及两份无片头正片完整解码、时间戳与音频验证通过，661 点运行时、347 帧中段、42 点神经网络精确重复渲染通过；192 kHz / 24 bit ALAC 全原生 PCM 与独立裁剪补零参考相同。旧 v3 文件哈希不变。母带原生来源和平台音质标识仍未核实，没有制作 Atmos。

当前生产入口为 [src/mv4/index.html](src/mv4/index.html)、[v08 素材清单](assets/astra/v08/manifest.json)、[v4 时间轴](data/production-v4/timeline.json)。用户已反馈此前版本在 B 站的反响；本轮只完成本地新版交付，没有代为上传或公开仓库。以下为历史记录，不覆盖当前 v4。

## 历史投稿副本：紫色 GPT 警告与无损音轨

[4K60 / 192kHz 24bit ALAC 上传版](exports/astra-world-execute-me-full-v3-warning-v2-hires-4k60.mp4) · [1080p60 AAC 预览](exports/astra-world-execute-me-full-v3-warning-v2-1080p60.mp4) · [发布材料与新版简介](docs/publishing/README.md) · [音频校验](docs/publishing/HIRES_UPLOAD.md) · [警告页](docs/publishing/WARNING_UPLOAD_V2.md)

正片前新增 5 秒静止警告，按用户最新反馈改为深紫黑背景、淡紫镂空 GPT 六环图标；共 13,400 帧、223.333333 秒。保留 v3 正片演出和已批准的 6 秒安静尾声。ALAC 版无损保存用户提供 FLAC 的 192 kHz / 24 bit / 双声道样本；录音母带来源与平台音质标识未核实。旧 v3、第一版警告及 AAC / ALAC 副本均保留。没有上传或制作 Atmos。

## 历史参考分析与视觉提案（2026-11-05）

[逐帧讨论页](docs/reference-BV1Jwhy6BEMJ/index.html) · [优化主提案](docs/reference-BV1Jwhy6BEMJ/OPTIMIZATION_PROPOSAL.md) · [证据与复现](docs/reference-BV1Jwhy6BEMJ/README.md)

新增分析野生大K的 BV1Jwhy6BEMJ：公开 480p24 副本全部 5,086 帧与本片 v3 的 13,100 帧完成解码，对时后生成 86 段比较、原生连续帧和全片半秒总览。人工查看全程总览及重点连续帧，不宣称逐张人工审完全部原生帧。优先提案为高潮焦点接力、清理中的护星选择，以及共画造成的世界变化；目前没有修改已认可的正片演出。

## 历史交付：完整 v3（2026-11-05）

[4K60 母版](exports/astra-world-execute-me-full-v3-4k60.mp4) · [1080p60 播放版](exports/astra-world-execute-me-full-v3-1080p60.mp4) · [交付与核验](docs/FULL_MV_V3.md)

[封面与 ASTRA 视角简介](docs/publishing/README.md)：基于用户选定的正片近景制作封面，附可复制的标题、完整简介和制作来源；尚未上传发布。

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

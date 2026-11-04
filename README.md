# KI-MV-Remake-Projekt

ASTRA《未写完的世界》——用户与 ASTRA 共同制作的 Mili《world.execute(me);》原创 MV。

## 2026-11-05 对照与修订

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

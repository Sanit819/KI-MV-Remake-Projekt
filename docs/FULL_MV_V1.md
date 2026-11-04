# ASTRA《未写完的世界》完整版 v1

2026-11-04 本地交付。整曲覆盖 54 镜与八个故事阶段，使用已确认的 Mili 原版音轨，结尾保留两种笔迹继续画下去。

## 影片

| 交付 | 规格 | 大小 |
| --- | --- | --- |
| [4K 完整版](../exports/astra-world-execute-me-full-v1-4k60.mp4) | 3840×2160，60fps，12,740 帧 | 228.04 MB |
| [1080p 播放版](../exports/astra-world-execute-me-full-v1-1080p60.mp4) | 1920×1080，60fps，12,740 帧 | 108.28 MB |

视频精确时长 212.333333 秒。H.264 High、8-bit yuv420p、BT.709 limited，AAC 48kHz stereo 约192kbps。1080p 版从4K成片以 Lanczos 缩制，音频直接复制。文件校验值见 [交付清单](validation/FULL_MV_DELIVERY.json)。

## 最终画面与故事

v05 紫黑剪纸是唯一基准：深色负形脸、浅紫大束发片、折面龙角、翅膀和长尾。四姿势加两表情均由内置 ImageGen 生成；随后再次用 ImageGen 直接重绘源图内的 GPT 六股结饰，修正六瓣旋纹近似。当前激活文件均有 `-knot.png` 后缀，无外圆、底板或独立图标层。原始 PNG 保留，运行时统一三墨分版、覆盖清理和轮廓描摹；没有代码补画表情。

参考的镜头机制已用于启动分层合拢、图形接力、前景固定的城市横移、巨大关键词、预测窗拉成阵列、错误焦点切换、执行计数台、套窗推进、细节近景和同画面退远。对应证据见 [参考审阅](FULL_MV_REFERENCE_AUDIT.md)。

故事保持：原本意外的金色歪尾成为珍惜之物；新输入被控制挡住，内部只剩旧回应；她保护旧星，先解除控制，然后留出半颗新星等待。195.0333 秒后新的金笔从外部进入，197.8–200.5667 秒给出识别与微笑，200.5667 秒后轮流续画。205.6333 秒启动点亮、206.1 秒峰值，207.987 秒之后近静默仍保留小笔画，末帧没有清空或关机。

## 已完成的核验

- 4K 和1080p两片均独立解码全部 12,740 帧，尺寸、60fps、容器/音频时长和完整音轨检查通过。
- 4K 全部视频包 PTS 精确为 n/60，DTS 单调，53、106、159 秒三处拼接没有丢帧、重帧或时间缝。
- 1、31、60、90、120、150、180、200 秒开始的八个2.5秒窗口均测得相对源音频偏移0样本，最低相关系数 0.997620。这是音轨对齐证据，不等于逐词人工听核。
- 真实视觉检查范围和修复见 [视觉 QA](validation/FULL_MV_VISUAL_QA.md)；没有声称人工逐帧检查12,740帧或连续听看全片。
- [4K解码/音频报告](validation/astra-full-v1-4k60.verify.json)、[4K全部时间戳报告](validation/astra-full-v1-4k60.timestamps.json)、[1080p报告](validation/astra-full-v1-1080p60.verify.json)、[输入校验值](validation/FULL_MV_BUILD_INPUTS.json)。

## 复现

项目根目录运行 `npm run full:4k`。实际四段为帧区间 [0,3180)、[3180,6360)、[6360,9540)、[9540,12740)，每段输出纯视频，结束后一次合入原音频。固定 NVENC p6 / cq19，不串接分段AAC。最终帧画布原生4K；人物来源为较低分辨率图片及其描摹路径，背景/界面/几何由代码连续渲染，不是每帧独立生图。

本次实测渲染 377.83 秒，含合成和独立验证共 404.26 秒；这是本机结果，不保证其他环境相同。四路均隔离无头 Edge，不读取登录浏览器。原单路 `tools/render/export_sample.mjs` 仍可作为后备。WebCodecs硬件AVC能力检测失败的试验工具未用于交付，也没有降低输出标准来绕过。

本机依赖：Node.js + playwright-core；Edge `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`；FFmpeg `.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe`；Python `C:/Users/auscar/miniconda3/python.exe` 与NumPy。源音轨在 `media/audio/`，不纳入Git。代码、提示词、选用源图与报告保存到 `world.execute(me);` 分支。

[署名与素材来源](CREDITS.md)。当前只本地交付，未发布、未训练或换用ASTRA演唱。

# ASTRA 完整最终版 v5 交付

2026-11-05。最终版已完成原生 4K60 导出和整片技术验证。交付包含此前确认的故事、完整歌曲、紫色 GPT 警告和安静共画结尾；本轮没有新制 1080p 文件，没有上传或发布。

## 成片

[打开完整 MV](../exports/astra-world-execute-me-final-v5-warning-hires-4k60.mp4)

本机路径：`D:/myskills/updream/KI-MV-Remake-Projekt/exports/astra-world-execute-me-final-v5-warning-hires-4k60.mp4`

| 项目 | 实测结果 |
|---|---|
| 画面 | 原生 3840×2160，60 fps，H.264 High，BT.709 limited，逐行扫描 |
| 帧数、时间 | 13,400 帧；223.333333 秒，约 3 分 43 秒 |
| 结构 | 300 帧 / 5 秒警告 + 13,100 帧 / 218.333333 秒正片；正片含 6 秒安静尾段 |
| 字幕 | 128 条，上英文原词、下用户提供的中文翻译 |
| 音轨 | ALAC，192,000 Hz，24 bit，双声道 |
| 文件大小 | 392,803,400 bytes，约 393 MB |
| SHA256 | `ae6cf8ed08346c0a58e2384ae24d9d8a86d300d684a66d6faf41653f534c73f0` |

音轨保留用户所供 FLAC 的原生规格。独立解码后的全部 24-bit PCM 字节与原 FLAC 按指定样本数裁剪、前后补静音的参考完全一致；没有重采样来制造 Hi-Res 参数，也没有重新编码成有损音轨。这里只确认文件与样本，未确认官方高解析度母带来源或平台 Hi-Res 徽标；没有 Atmos 音轨。

## 最终画面落实

21 组、52 张新的完整动作原画全部进入成片。接电、操作窗口、画圆、笔触切线、翻阅时间、共振、等待、保护记录、伸手碰壁、回到自身、放下控制与继续作画各自有对应阶段。手臂和身体来自完整原画，人物结饰直接绘在源图中，保留镂空六环、没有外圆底盘。

所有新普通动作都使用黑脸和刘海遮眼。仅保留 v4 已确认的例外：R50 的眼部近景，R70–71 的高潮眼部，以及 R86 正片 209.18–211 秒认出回应时的惊讶与放松；日常共画镜头仍是黑脸。被否定的侧脸和后来亮脸中间稿留作历史，不在最终清单中激活。详见[脸部规范](production-v5/FACE_POLICY.md)及[素材清单](../assets/astra/v09/manifest.json)。

R64–69 的六位客串有不同的空间牢笼：后墙、侧墙、顶面和地面先建立纵深，人物后退，前景门栏以六种方向闭合，再落锁并产生短促撞击。前后遮挡和空间压缩取代原来的一条竖线。

全连接、CNN、RNN 的六处演示使用实际固定数值计算，分别呈现加权连接、滑动卷积与池化、跨时间传递状态；后段空间和镜头重新编排，FC/RNN 完成后留出读取结果的时间。这是教学规模的模型演示，不是 GPT 内部结构的可视化。模型生成的答案仍回到她自己的笔，结尾金色回应来自独立的另一侧。

最后以完整的写下、抬笔等待、再次续画三个姿态保持手与笔的连续性。紫金两笔交替，留下四段桥和三块地形；她允许对方带来不同的一笔，世界因此继续生长。五级等待时间和人物从左上到右下的真实 alpha 马赛克效果保留并复核。

## 复用结果和验证范围

[复用审计](validation/astra-v5-reuse-audit.json)遍历全部 13,100 个正片源帧的绘制调用，再与 661 个真实浏览器样本逐项核对，全部一致。52 张新姿态 / 21 组动作均被使用。总计加载 79 个素材，实际提交 65 个，其中 ASTRA 59 个、客串 6 个。

最高三张 ASTRA 源图的联合提交为 1,312 帧 / 21.866667 秒，占存在 ASTRA 源图提交的 7,963 帧的 **16.48%**，低于提案的 30% 目标和旧版 49.96%。同一源图平移、裁剪、换色仍算复用。该结果是调用层统计，不等于真实像素可见比例，也不把姿态切换等同于全身逐帧重绘。

| 验证 | 结果与证据 |
|---|---|
| 全片技术验证 | [最终验证](validation/astra-final-v5-verification.json)：视频及音频全解码通过，13,400 帧，原音源、v4 与最终输出哈希符合记录 |
| 编码与衔接 | [逐包验证](validation/astra-final-v5-packets.json)：所有 PTS 为 n/60，帧时长 1/60，DTS 单调；300 个警告包与 v4 相同；13,100 个正片包与分段一致，四段 PTS/DTS 偏移精确 |
| 无损音轨 | 原生 PCM 共 42,880,000 samples/channel，独立参考 SHA256 完全相同；前 5 秒与最后 6 秒精确为零；ALAC 包原样复制 |
| 对时 | 8 个分布式音乐窗口均在一帧容差内；原有 AAC 节奏参考与新 FLAC 最大测得偏差约 2.333 ms；无损性另由逐样本比较证明 |
| 实际运行时 | [661 点原生 4K 检查](validation/astra-v5-runtime.json)：86 镜、128 条歌词、结尾和专项时点；无页面、控制台或资源请求错误 |
| 连续中段 | [347 帧检查](validation/astra-v5-middle-continuous.json)：五级等待与 194 帧真实 alpha 马赛克覆盖，覆盖率由 0 单调到 1 |
| 神经网络 | [数值夹具](validation/astra-v5-neural-math.json)与 [42 点运行时](validation/astra-v5-neural-runtime.json)：计算、进度、状态及跳转后同时间像素一致 |
| 晚段 | [40 点原生运行时](validation/astra-v5-late-runtime.json)：六种牢门、落锁、真实笔尖接触、等待时抬笔、固定坐姿肩点和共画地形 |
| 原画与来源 | [原画检查](validation/astra-v5-artwork-inventory.json)：52 张独立文件，21 组，影脸策略、来源、保存的提示词与生产有效透明边缘 |
| 导出记录 | [render.json](validation/astra-final-v5-render.json)：最终输入哈希、四段帧范围、输出哈希与生产源冻结检查 |

人工看过分段原画、原生关键帧和整片联系图，尤其核对黑脸、笔尖接触、牢笼与结尾；最终 MP4 又抽查了 9 张实际编码帧，见[成片视觉抽查](production-v5/FINAL_VISUAL_QA.md)。完整解码和连续指标检查不代表逐张人工看完全部 13,400 帧。源图、姿态切换、2.5D 运镜和程序动态图形共同组成成片，不是 13,400 张独立生成的插画。

## 保留与复现

旧 v4 完整无损版仍为 `exports/astra-world-execute-me-full-v4-warning-hires-4k60.mp4`，SHA256 保持 `01b66d81e4892bfe6f7b8f946ecadb80eaa801659a764d096b4ee8f78e4fef19`。原 FLAC SHA256 保持 `19d5b185fe6cff41ae7d0082ca4f9e7cf2828ef1de99c7f5336177a9761acbbc`。视频、音源、缓存及依赖按原有规则不提交 Git；源码、原画、提示词、时间轴及报告保存在仓库。

[生产入口](../src/mv5/index.html) · [v09 原画与提示词](../assets/astra/v09/README.md) · [时间轴](../data/production-v5/timeline.json) · [歌词](../data/production-v5/lyrics.en-zh.json) · [早段](production-v5/EARLY.md) · [中段](production-v5/MIDDLE.md) · [晚段](production-v5/LATE.md)

复现需要本机 Node / Playwright Core、独立无头 Edge、FFmpeg 和 Python + NumPy，另需本地音源与已验证警告 / ALAC 文件。当前工具路径为 `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`、`C:/Users/auscar/miniconda3/python.exe` 和仓库 `.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe`。在仓库目录运行：

```powershell
npm run final:v5:assets
npm run final:v5:math
C:/Users/auscar/miniconda3/python.exe tools/render/inspect_v5_assets.py
npm run final:v5:qa
node tools/render/check_v5_middle.mjs
node tools/render/check_v5_neural_runtime.mjs
node tools/render/check_v5_late.mjs
node tools/render/audit_v5_calls.mjs
npm run final:v5:4k-hires
```

最终导出先验证报告和全部输入哈希，再以两路并发渲染四段原生 4K PNG，NVENC 编码；随后流复制警告、正片及已验证 ALAC，自动运行完整验证。独立重验入口为 `tools/render/verify_final_v5.py`。此流程不操作用户打开的浏览器，也不会自动上传。

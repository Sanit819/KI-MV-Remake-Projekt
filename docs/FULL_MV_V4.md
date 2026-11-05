# ASTRA 完整 MV v4 交付

2026-11-05。已通过最终文件验证与保留检查。完整投稿版为 **4K 3840×2160 / 60 fps，13,400 帧，223.333333 秒（约 3 分 43 秒）**：5 秒静止紫色 GPT 光敏警告，加上 86 镜、13,100 帧的正片；原曲后的 6 秒安静共画尾段保留。歌词共 128 条，英文在上、中文在下。

## 完整投稿文件

| 文件 | 帧数 | 大小 | SHA256 |
|---|---:|---:|---|
| [4K60 AAC](../exports/astra-world-execute-me-full-v4-warning-4k60.mp4) | 13,400 | 263,699,052 bytes | `fa5239d00f2741031e6a335a210a228c6ca34ac7e9c163c1d3bfb21b6c01c0a1` |
| [1080p60 AAC](../exports/astra-world-execute-me-full-v4-warning-1080p60.mp4) | 13,400 | 128,760,272 bytes | `e71f7869f32adcc5c17be698cddf8e1a3a652d691e864506e65324fe40be7bce` |
| [4K60 ALAC 192 kHz / 24 bit stereo](../exports/astra-world-execute-me-full-v4-warning-hires-4k60.mp4) | 13,400 | 414,879,071 bytes | `01b66d81e4892bfe6f7b8f946ecadb80eaa801659a764d096b4ee8f78e4fef19` |
| [1080p60 ALAC 192 kHz / 24 bit stereo](../exports/astra-world-execute-me-full-v4-warning-hires-1080p60.mp4) | 13,400 | 279,940,291 bytes | `571d88512ec1b399ac3b6c0e1df51ded97ff4bddf089cfd3b2818b912509be49` |

ALAC 版本保留用户所供 FLAC 的 192 kHz / 24 bit 立体声规格。独立解码的全部原生 PCM 字节与去除指定前导样本、补齐前后静音后的参考一致；这不证明音源是官方原生高解析度母带，也不保证平台显示 Hi-Res 标识。没有制作或声称 Dolby Atmos 音轨。

## 无片头的正片母版

用于后续制作的两份 base 为 13,100 帧、218.333333 秒。下面的文件没有 5 秒警告；它们与完整投稿文件分开保存。

| 文件 | 帧数 | 大小 | SHA256 |
|---|---:|---:|---|
| [4K60 AAC](../exports/astra-world-execute-me-full-v4-4k60.mp4) | 13,100 | 262,584,123 bytes | `9c472ff8c07887dd72d4aec8566f399abbc400fa467736197473dc7e7eeb08d5` |
| [1080p60 AAC](../exports/astra-world-execute-me-full-v4-1080p60.mp4) | 13,100 | 128,317,537 bytes | `27468f5d26431c5cafde118ea800b2432ebd35a7a41b413c7d2820dccb33bdd8` |

## 本次视觉改版

实施依据是用户批准的[视觉优化提案](reference-BV1Jwhy6BEMJ/OPTIMIZATION_PROPOSAL.md)，并加入全连接、CNN、RNN 演示。计算产生可见后果：参数长成世界，几何成为手能触碰的空间，信号抵达接收端，清理逼近旧星，人物的保护与退手改变周围的限制。

- FC：4→5→4→3 的相邻层全部连接，固定权重的激活逐层传播。
- CNN：5×5 图样经过 3×3 核的有效互相关、ReLU 与 2×2 最大池化；表现特征提取，不宣称训练模型的识别准确率。
- RNN：共享权重、三时步输入与隐藏状态递推；零输入时保留历史状态。教学计算可复算，不代表 GPT 的真实内部架构。
- 后段预测仍来自旧记录；真实新回应由画布另一侧独立带来。她认出后放松，两种笔迹实际补成桥段与地形，最后仍继续画。

人物保留已确认的眼型、完整肩臂、直接绘在原画里的镂空结饰与真实果肉切面。工程仍由角色原画、2.5D 镜头与程序动态图形组成，不是逐帧重绘人体。实现和局部审阅记录见[早段](production-v4/EARLY.md)、[中段](production-v4/MIDDLE.md)、[晚段](production-v4/LATE.md)、[神经网络设计](production-v4/NEURAL_DESIGN.md)及[六处演示时间](production-v4/NEURAL_TIMECODES.md)。

## 验证证据与边界

- [最终编码画面复核](production-v4/ENCODED_QA.md)：已实际查看最终 MP4 的 134 张解码采样，覆盖全部 86 镜中点与专项时点，未发现交付阻塞项；详细范围见分段观察和[抽帧清单](validation/astra-v4-encoded-review.json)。
- [实际运行时采样](validation/astra-v4-runtime.json)：661 点，覆盖 86 镜、128 条双语 cue、结尾和专项时点；源码、资产、时间轴、歌词及清单的当前 SHA256 与报告相符。
- [连续中段检查](validation/astra-v4-middle-continuous.json)：R46 的 153 帧和 R48 的 194 帧，等待五级与真实 alpha 加权马赛克覆盖通过。
- [网络数学](validation/astra-v4-neural-math.json)与[42 点实际网络运行时](validation/astra-v4-neural-runtime.json)：FC/CNN/RNN 数值、进度和跳转后同时间像素一致性通过。
- [4K 正片完整解码](validation/astra-full-v4-4k60.verify.json)、[逐包 PTS](validation/astra-full-v4-4k60.timestamps.json)、[渲染记录](validation/astra-full-v4-4k60.render.json)，以及 [1080p 完整解码](validation/astra-full-v4-1080p60.verify.json)、[逐包 PTS](validation/astra-full-v4-1080p60.timestamps.json)、[缩制记录](validation/astra-full-v4-1080p60.render.json)均通过。
- [AAC 完整投稿验证](validation/warning-v4/verification.json)与[ALAC 完整投稿验证](validation/warning-v4-hires/verification.json)：每版 13,400 帧完整解码、精确 60 fps 时间戳、音画窗口对齐、5 秒片头和最后 6 秒静音通过。前 300 个视频包与已确认的紫色警告相同，其后视频包与 v4 正片一致。
- [最终哈希与旧版保留](validation/astra-v4-delivery-preservation.json)：六份新视频当前文件哈希均匹配验证报告；v3 两份正片和 v3 warning-v2 4K ALAC 版的已确认 SHA256 均未变化。

连续指标检查、完整解码和静帧抽查各有范围，不等于人工逐张看完全部帧；这里不作医学闪光安全认证。交付是本地文件，不包含上传、公开仓库发布或演唱音色训练。

## 工程入口

[v4 生产页](../src/mv4/index.html) · [素材清单](../assets/astra/v08/manifest.json) · [时间轴](../data/production-v4/timeline.json) · [双语歌词](../data/production-v4/lyrics.en-zh.json) · [v3 原交付](FULL_MV_V3.md)

验证与封装入口：`tools/render/qa_v4.mjs`、`check_neural_v4.mjs`、`check_v4_middle.mjs`、`check_v4_neural_runtime.mjs`、`export_full_v4_parallel.mjs`、`downscale_v4.mjs`、`package_v4_upload.mjs`、`verify_v4_upload.py`；全部通过后运行 `node tools/render/finalize_v4_delivery.mjs` 重新汇总。本脚本不会解除发布简介的草稿标记或自动发布。

# ASTRA v3：深紫 GPT 警告页的无损音轨上传版

完成日期：2026-11-05。已将用户提供的 FLAC 保持 **192 kHz / 24 bit / 双声道**，无损编码为 ALAC 并封装进两份完整 MP4。均已通过完整解码、全部视频包与时间戳检查、原生 PCM 逐字节校验及分布式音画对齐。平台上传和转码尚未进行。当前链接为用户追加配色与图标要求后的 warning-v2；旧 warning-v01 成片和报告保持不变。

## 交付文件

| 文件 | 视频 | 音频 | 大小 | SHA-256 |
| --- | --- | --- | ---: | --- |
| [4K60 无损音轨上传版](../../exports/astra-world-execute-me-full-v3-warning-v2-hires-4k60.mp4) | 3840×2160 / 60 fps / H.264 High | ALAC / 192000 Hz / 24 bit / stereo | 435540282 bytes | `fa8aead7b51bf21ec8eaabed035a3a1b078c644085695b29b7e4dadd3a99a248` |
| [1080p60 无损音轨上传版](../../exports/astra-world-execute-me-full-v3-warning-v2-hires-1080p60.mp4) | 1920×1080 / 60 fps / H.264 High | ALAC / 192000 Hz / 24 bit / stereo | 289818670 bytes | `c0f9f8fef2b56559a836b896973077029496f5a4a037aea96065d179d74f4f80` |

两份都是 **13400 帧、223.333333 秒（3:43.333）**。包含开头 5 秒静止中英文光敏警告、原先 218.333333 秒完整 v3 画面，以及其中已确认的 6 秒安静共画结尾。原 MV 的所有画面、歌词和镜头时间在新文件中统一顺延 5 秒。未重新制作或调整 v3 的角色与视觉演出。

建议投稿优先使用 4K60 无损音轨版。若本地浏览器不能播放 MP4 中的 ALAC，可用支持 ALAC 的播放器检查，或使用 [1080p60 AAC 预览版](../../exports/astra-world-execute-me-full-v3-warning-v2-1080p60.mp4) 查看相同画面；AAC 预览不用于证明无损音质。

## 音频来源与精确处理

桌面源文件为 `C:/Users/auscar/Desktop/world.execute (me) ;.flac`。原字节副本存于被 Git 忽略的 `media/audio/user-world-execute-192k24.flac`，二者 SHA-256 均为 `19d5b185fe6cff41ae7d0082ca4f9e7cf2828ef1de99c7f5336177a9761acbbc`。

源文件包含每声道 **40686080** 个 192 kHz / 24 bit 样本。已完成 FLAC STREAMINFO、整段解码 MD5 与时序核验；详见 [用户 FLAC 检查](USER_FLAC.md) 和 [源分析 JSON](../audio/user-flac-analysis.json)。

无损音轨的首次制作保持原生整数 24 bit、192 kHz、双声道；本轮仅换警告卡，直接复制已验证音轨，不重新执行裁剪或音频编码。首次制作步骤如下：

1. 依八窗对时结果，裁去源文件前 **11096 样本 / 0.0577916667 秒**，保留余下 **40674984** 样本。没有时间拉伸。
2. 在前面加 **960000 个零样本 / 5 秒**，对应静止警告页。
3. 完整保留源文件末端的安静衰减，再在尾部补 **1245016 个零样本 / 6.484458333 秒**，使总长精确等于每声道 **42880000** 样本 / 223.333333 秒。
4. 这份整数 PCM 只编码一次 ALAC，两种分辨率复制同一条 ALAC 包载荷。没有升采样、降采样、声道扩展、有损音频编码或第二次 ALAC 编码。

补尾较已确认 6 秒共画多出的约 0.484458 秒，是两音源文件尾长不同导致的补齐。旧音源对应区间已经逐样本确认全零；用户 FLAC 自身最后 0.5 秒尚有低电平衰减，因此没有另外裁掉这段衰减。

与旧音源测得约 **22.63 ppm** 时钟差，整曲八窗偏移跨度约 4.5 ms。本次采用常量前裁，保留源音频原速；最终相对旧 v3 音轨八窗最大残余偏移 **2.333333 ms**，低于 60 fps 的一帧 16.666667 ms。它是帧内时序对应，不是与旧 AAC 的逐样本相同。

## 已完成的独立验证

持久报告：[verification.json](../validation/warning-v3-v2-hires/verification.json)、[render.json](../validation/warning-v3-v2-hires/render.json)。完整运行日志和逐包 hash 位于 `exports/warning-v3-v2-hires/`。

- **真实编码规格：** 直接解析两份 MP4 内的 `ALACSpecificConfig`，确认采样率 192000、有效位深 24、声道数 2；没有仅凭 `s32p` 中间样本容器推断位深。
- **无损：** 验证程序独立解码桌面副本为原生 PCM24，在 Python 中按字节丢弃前 11096 样本并拼接实际零字节，不复用生产滤镜。得到的 **257280000 字节**参考与中间 PCM、一次 ALAC、两份最终 MP4 的全部解码 PCM 完全一致，SHA-256 均为 `a8195021c34ab3c21474d2ec7a8e3e0a14ed36d571d42cf95e1da7979d9b7e26`。
- **完整画面：** 两份各完整解码 13400 帧，所有 PTS 精确为 `n/60`，包时长精确 `1/60`，DTS 严格递增；没有缺帧、额外黑帧或视频重编码。与对应 AAC 警告版的 13400 个视频包逐包大小及 SHA-256 相同；其中后 13100 包也与原 v3 相同，PTS 精确加 5 秒。
- **音轨复用：** 两种分辨率与一次编码的 ALAC 包载荷 SHA-256 都为 `3eebefc53a6091a220385b308cc130ba2a486b50318cc8e86dd5c1e7fbbe6858`。
- **音乐时序：** 旧 v3 歌曲 1、31、60、90、120、150、180、200 秒起的八个 2.5 秒窗口，对照本版各自加 5 秒的窗口；最大残余偏移 2.333333 ms，相关系数 0.933447–0.953459。相关阈值 ≥0.90、偏移 ≤1/60 秒用于不同编码来源间的内容与时序对应；无损依据是上面的全 PCM 字节一致，不能用这个相关阈值替代无损校验。另对本次 PCM 参考的八窗检查全部通过。
- **静音：** 两声道 0–5 秒与 217.333333–223.333333 秒都为严格零样本。
- **输入保存：** 桌面 FLAC、项目 FLAC 副本、旧 AAC 音源、原 v3 两份 MP4、AAC 警告版两份 MP4，共七个输入文件的 SHA-256 与此前记录全部一致。

每份的完整解码与包报告分别为 [4K 解码](../validation/warning-v3-v2-hires/4k60.full-verify.json)、[4K 包与 PTS](../validation/warning-v3-v2-hires/4k60.packets.json)、[1080 解码](../validation/warning-v3-v2-hires/1080p60.full-verify.json)、[1080 包与 PTS](../validation/warning-v3-v2-hires/1080p60.packets.json)。警告页及原片交界的实际编码帧查看记录在 [深紫 GPT 警告版交付说明](WARNING_UPLOAD_V2.md)；本版全部视频包相同，没有对这一相同画面另行重渲染。

## Hi-Res 与 Atmos 的边界

本文件满足用户提供截图中的无损编码、至少 48 kHz、至少 24 bit 这三项格式条件。用户尚未提供购买来源或原录音母带链路，文件头和无损解码只能证实其交付规格，不能据此认证为官方原生 192 kHz / 24 bit 母带。B 站是否接受这份音轨、如何转码、是否显示 Hi-Res 标识，仍以实际上传后的结果为准。

本次没有制作或标记 Atmos。现有输入为双声道；没有该曲的对象音频母版、空间混音和 JOC 交付链路。普通 E-AC-3 或把双声道扩成 5.1/7.1，不能代替经核验的 Atmos。官方音源和格式研究保存在 [可行性记录](AUDIO_UPLOAD_OPTIONS.md)。

## 复现

项目根目录：

```powershell
node tools/render/prepend_warning_v3_v2.mjs --card
node tools/render/prepend_warning_v3_v2.mjs --export
node tools/render/prepend_warning_v3_v2.mjs --proof
& 'C:/Users/auscar/miniconda3/python.exe' tools/render/prepend_warning_v3_v2_verify.py
```

前提是此前已验证的 AAC / ALAC 音轨、源文件及报告仍在且哈希一致。脚本仅生成 warning-v02 卡片和 warning-v2 新文件，写入 `exports/warning-v3-v2/` 与 `exports/warning-v3-v2-hires/`；不会覆盖旧 v3、warning-v01 输出或桌面音源。首次无损音轨制作的脚本与报告继续保留。本次未上传、发布或购买任何内容。

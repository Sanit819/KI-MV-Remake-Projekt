# v5 无声播放排查记录（额外制作已停止）

2026-11-05。用户反馈完整最终版在其播放入口无声，随后确认 Windows 自带播放器无声，而 WPS 和夸克能正常播放，并要求“不用补做”。收到该要求后未继续生成或测试音频。以下 AAC 副本和排查已在取消前完成，仅作为历史保留；它不是本轮主要交付，不替代 ALAC Hi-Res 投稿文件。后续猫耳画面修订继续直接复制原 ALAC 音轨。

## 原因与实测

原文件不是没有音轨：它包含默认 ALAC 192 kHz / 24-bit 双声道，解码后八个音乐窗口的左右声道均有非零信号。开头 5 秒警告和最后 6 秒安静尾声是有意保留的静音。

在本机独立隐藏 Edge 156 中复现了兼容性差异。使用同一页的 HTMLAudioElement 和 WebAudio analyser，在成片第 6–8 秒测量：

| 文件音轨 | canPlayType | 播放进度 | 解码信号 |
| --- | --- | --- | --- |
| 原 ALAC | 空字符串 | 正常推进到约 8.03 秒 | peak=0，RMS=0 |
| 新 AAC-LC | probably | 正常推进到约 8.05 秒 | peak=1.00889，RMS=0.22624 |

因此浏览器中的 ALAC 无声兼容问题已被实际复现，并且 AAC 副本有真实非零解码信号。该测试未直接检查用户正在使用的桌面预览器、系统音量或实体扬声器，不能把这些未知项也称为已验证。此前交付只证明了无损样本与解码正确，没有充分验证默认播放入口的音频兼容性。

## 使用哪个文件

- [日常播放、浏览器预览：4K60 AAC 兼容版](../../exports/astra-world-execute-me-final-v5-playback-4k60.mp4)：H.264 画面原样复制，单条默认 AAC-LC 48 kHz 双声道，目标码率 320 kbps（整轨实测平均约 308 kbps，含静音）。AAC 为有损兼容副本，**不能称作 Hi-Res 无损音轨**。
- [原 4K60 Hi-Res 文件](../../exports/astra-world-execute-me-final-v5-warning-hires-4k60.mp4)：ALAC 192 kHz /24-bit 原生无损音轨，保留供支持该格式的播放器与无损投稿流程使用。平台最终音质标识仍取决于平台处理。

新播放版为 245,159,971 bytes，SHA256：`65d6ebc725912a6b8c2eaee2c378cde3eab204342b025d127dd829890cf50e17`。

原无损版保持 392,803,400 bytes，SHA256：`ae6cf8ed08346c0a58e2384ae24d9d8a86d300d684a66d6faf41653f534c73f0`。

两者都是 3840×2160 /60 fps，13,400 帧，223.333333 秒，包含 5 秒警告和 6 秒安静尾段。本次没有重新渲染画面，也没有新增 1080p。

## 验证与复现

新副本的全部 13,400 个压缩视频包 SHA256、大小、PTS、DTS 与持续时间均逐项等于原文件。全片视频和音频解码通过；八个分布式音乐窗口对齐通过、测得 lag 均为 0；左右声道均有声音。警告和尾段静音检查排除音乐边缘 100 ms，以避免把 AAC 变换编码边缘振铃误当作内容变化。

报告位于 `exports/audio-repair-v5/`：`diagnosis.json`、`verification.json`、`picture-packets.json`、`full-verify.json`、`browser-audio.json`；FFmpeg 命令与日志也保留在该目录。

```powershell
C:/Users/auscar/miniconda3/python.exe tools/render/package_v5_playback.py
node tools/render/check_v5_playback_browser.mjs
```

工具只读取本地原片，写入新的副本和报告，启动独立隐藏浏览器测试并自行关闭，不接触用户已有标签页。浏览器测试是解码验证，不冒称已通过实体扬声器人工听完整片。

# v3 光敏警告投稿副本

最新交付：[深紫 GPT 警告卡与四份投稿文件](WARNING_UPLOAD_V2.md)。用户追加要求的配色和图标已另存 v02；本页为保留的 v01 历史记录。无损音轨说明见 [Hi-Res 格式上传版](HIRES_UPLOAD.md)。下文规格及验证仅对应旧 AAC 警告版。

完成日期：2026-11-05。两份新文件均完成全视频/音频解码、逐视频包字节与时间戳检查、八窗音频对齐和前后静音验证。警告页及切换处的实际编码帧已经查看。

| 文件 | 规格 | 大小 | SHA-256 |
| --- | --- | ---: | --- |
| [4K60 投稿版](../../exports/astra-world-execute-me-full-v3-warning-4k60.mp4) | 3840×2160，60 fps | 284667323 bytes | `493a403666e76208c146543bbb94fbf2b100d72387973789d0903c2ce3112deb` |
| [1080p60 投稿版](../../exports/astra-world-execute-me-full-v3-warning-1080p60.mp4) | 1920×1080，60 fps | 138534156 bytes | `ca870ea978d676648ceae0a24813c5b6611329c1e85018c815b073ddb9f283da` |

两份均为 H.264 High / yuv420p、AAC-LC 48 kHz 双声道，13400 帧，223.333333 秒（3:43.333）。前 300 帧为警告页；零基帧 300、时间 5.000000 秒开始原 v3 零基帧 0。原片内所有画面和声音顺延 5 秒，末尾已批准的 6 秒安静共画保持。

## 警告页来源与制作

[原生 4K PNG](../../assets/publishing/warning-v01/card-4k.png) 由 [card.html](../../assets/publishing/warning-v01/card.html) 中的 Canvas 文字直接生成。版式依用户截图：深蓝紫、稀疏固定星点、象牙色中英文标题和细分隔线；精确文案见 [REQUEST.md](../../assets/publishing/warning-v01/REQUEST.md)。[用户截图副本](../../assets/publishing/warning-v01/user-reference.png) 与 [provenance.json](../../assets/publishing/warning-v01/provenance.json) 一并保留。没有使用 ImageGen，没有把截图当成低清片头放大。

300 帧全部从同一张静态 PNG 编码，无新动画、淡入或淡出。警告末帧到原片首帧为硬切。4K 文字原生绘制，1080 警告由这张 4K 卡 Lanczos 缩小后独立编码。

## 原片保留与编码方式

只用 NVENC H.264 p6 / HQ / CQ19 编码新加的 300 帧警告。两种分辨率分别与原先对应分辨率的 v3 视频流拼接；`-c:v copy`、concat `auto_convert=0` 保留原 13100 个 AVCC 视频包。独立 FFmpeg framehash 对每包大小及 SHA-256 比较，新增片头之后的 13100 包与对应原片逐包完全相同；不是重新压缩主体画面。

原片文件前后 SHA-256 一致：

- 原 4K：`fc5843f714c862d4a405f2a2cee58f958eaeb1597fe872dfe4300d0c1586e90b`。
- 原 1080p：`26c6ea3ea2cf0b940b481eaf8b970c0f687a772f45a57bf7c2d18aa39908a23b`。

音频从项目原 Mili 音源在生产流程中解码一次，保留 48 kHz / 双声道，前置每声道 240000 个零样本，再补足既有尾静音，总长每声道 10720000 个样本。该 PCM 只编码一次 AAC（目标 192 kb/s，实际流平均约 182 kb/s），两份投稿文件复制同一 AAC 包；没有重编码原片的 AAC 再追加片头，也没有升采样声称 Hi-Res。两份及中间 AAC 的包载荷 SHA-256 均为 `025527af3a205573232a918cfb816949a54511d764161ea2b88d84b71b88e1d2`。验收中的再次解码只用于读数比较，不是生产编码。

## 实际技术验证

主记录：[render.json](../../exports/warning-v3/render.json)、[verification.json](../../exports/warning-v3/verification.json)。分别附有 [4K 全解码报告](../../exports/warning-v3/4k60.full-verify.json)、[1080 全解码报告](../../exports/warning-v3/1080p60.full-verify.json)、[4K 包/PTS 报告](../../exports/warning-v3/4k60.packets.json)、[1080 包/PTS 报告](../../exports/warning-v3/1080p60.packets.json)，以及完整逐包 `.framehash` 文件。

- 两份各完整解码 13400 视频帧，完整解码音轨，FFmpeg 无解码错误。
- 所有视频 PTS 精确等于 `n/60`，所有包时长为 `1/60` 秒，无缺帧/重复时间戳；DTS 严格递增，正常 B 帧初始负 DTS 允许存在。
- 原视频全部 PTS 精确顺延 5 秒；13100 个视频包逐包 SHA-256 与大小完全相同。
- 用原 v3 音轨的 1、31、60、90、120、150、180、200 秒起始的八个 2.5 秒窗口，对照投稿版各自加 5 秒的窗口；两份的八窗残余偏移全部为 0 样本，相关系数范围约 0.994126–0.998936。另与前置静音后的原音源 PCM 作八窗核验，也全部通过。
- 两声道实际解码后，0.000–5.000 秒、217.333333–223.333333 秒均为精确零样本。静音检测记录的 −300 dBFS 是零值对数的数值下限，不代表存在极低噪声。
- 原 4K、原 1080p、原音频文件哈希均未改变。

## 实际画面检查

先实际查看了用户参考截图与原生 4K PNG；显示工具将 4K PNG 缩至 2048×1152 显示，不声称逐像素审核 4K。

随后从每份最终 MP4 顺序解码、按原始零基帧选择以下五帧，全部逐张实际查看（共 10 张，1920×1080）：

| 原始零基帧 | 时间 | 内容 |
| ---: | ---: | --- |
| 0 | 0.000000 s | 完整警告页 |
| 150 | 2.500000 s | 警告页保持静止 |
| 299 | 4.983333 s | 最后一帧警告页 |
| 300 | 5.000000 s | 原 MV 首帧，警告完全消失，没有新增黑帧 |
| 301 | 5.016667 s | 原 MV 第二帧，上英文、下中文歌词正常 |

证据目录：[4K 边界帧](../../exports/warning-v3/visual/4k60/frames.json)、[1080 边界帧](../../exports/warning-v3/visual/1080p60/frames.json)。抽帧命令及 showinfo 原始 PTS 均记录在 `exports/warning-v3/proof-*.command.json` / `.log`。已确认标题与正文完整、文字未裁边、两种分辨率排版一致、无淡入遮挡。没有在本轮连续听看整片，也没有宣称做过光敏闪烁的医学安全认证；这里验收的是用户要求的静止警告、无损画面拼接与音画时间完整性。

## 复现入口

在项目根目录运行；输出仅写入独立投稿副本与警告素材目录：

```powershell
node tools/render/prepend_warning_v3.mjs --card
node tools/render/prepend_warning_v3.mjs --export
& 'C:/Users/auscar/miniconda3/python.exe' tools/render/prepend_warning_v3_verify.py
node tools/render/prepend_warning_v3.mjs --proof
```

本次未修改 MV 生产源码、角色资产、时间轴、歌词数据、旧 MP4 或顶层项目文档；未提交 Git，也未上传或发布视频。

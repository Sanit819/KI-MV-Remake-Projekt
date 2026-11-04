# V2 4K 母片编码后视觉抽查

检查日期：2026-11-05。检查者：late-scenes 子代理。结论：当前母片的 10 张最终编码帧已重新提取并逐张实际查看，未发现明显的文字、脸部、笔尖或末帧解码破损；此前 212.5 秒角尖触顶已修复，新增 213 秒复核亦有头顶余量。此结论限于下表静帧，不代表连续全片听审或逐帧人工验收。

## 母片与取证方式

- 文件：[astra-world-execute-me-full-v2-4k60.mp4](D:/myskills/updream/KI-MV-Remake-Projekt/exports/astra-world-execute-me-full-v2-4k60.mp4)
- 本次只读核对大小：283,411,899 bytes。
- 本次重新计算 SHA-256：`3a52d4f32bdb3ad914b941cf8f96161eaa8dcf627d76dc724e1a01760df45b24`，与独立技术核验报告相同。
- 使用项目附带 FFmpeg 7.1，以 `select=eq(n,...)` 从实际 MP4 解码指定帧，`scale=1920:1080:flags=lanczos` 输出 PNG。没有重新运行 Canvas，没有改写或转码母片。
- 原视频为 3840×2160；下列实际查看的证据图均为 **1920×1080**。帧号从 0 起，按请求秒数乘 60 后取最近帧；实际展示时间为 `frame / 60`。

## 逐张观察

| 请求秒点 | 实际帧号 / 秒点 | 证据图 | 实际观察 |
|---|---|---|---|
| 158.9 | 9534 / 158.900000 | [late-frame-01.png](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-encoded/final/late-frame-01.png) | `EIN`、数字 1、`PRESENCE` 与 `1/6 domains locked` 可读；旧星仍在护星角色手间。底部没有先跳到下一数词，也未见字幕乱码。底部紫横线是当前进入转场。 |
| 161.26 | 9676 / 161.266667 | [late-frame-02.png](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-encoded/final/late-frame-02.png) | 数字 6 与 `LIU` 一致；上排从 PRESENCE 到 OUTPUT 六域齐全，右侧输入区仍为空。角色、控制线、旧星和文字完整，没有编码后消失或断块。 |
| 163.817 | 9829 / 163.816667 | [late-frame-03.png](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-encoded/final/late-frame-03.png) | 大字、眼部近景和左下旧星可辨；脸部未出现双影或破碎色块。大结饰仍可数六瓣、中心负形保留，没有回退为外圆徽章。头部上沿属于有意的满幅近景裁切。 |
| 167.57 | 10054 / 167.566667 | [late-frame-04.png](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-encoded/final/late-frame-04.png) | 控制线末端仍落在胸前抬手的腕部，代码沿手附近上行；刘海遮眼的负形保持，没有臆造眼球。完整歌词只显示一处，手部轮廓和结饰未见编码后错位。 |
| 175.65 | 10539 / 175.650000 | [late-frame-05.png](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-encoded/final/late-frame-05.png) | 多层窗口内连续保留重复的自己，未回退成近层空板遮掉内层。`We are trapped ah` 可读，未与角色主体叠成乱码；细小远层标题本就缩小，不能用此图认证所有远层微字可读性。 |
| 209.7 | 12582 / 209.700000 | [late-frame-06.png](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-encoded/final/late-frame-06.png) | 惊讶的睁眼与微张嘴清楚；新星的紫、金两半和新折尾保留，旧长尾星单独在 MEMORY 卡片。金笔独立留在纸面右侧；脸、结饰和卡片没有编码块损坏。 |
| 210.6 | 12636 / 210.600000 | [late-frame-07.png](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-encoded/final/late-frame-07.png) | 闭眼微笑可辨，与前图的头部占幅、鼻口区域和结饰位置相近，没有双脸叠加。闭眼与睁眼不能用同一个亮区中心衡量眼位；本次只确认已修表情没有编码后回退。 |
| 212.5 | 12750 / 212.500000 | [late-frame-08.png](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-encoded/final/late-frame-08.png) | 背影实体紫笔尖与写痕接近，独立金笔可辨，未增加第三支悬浮紫笔。新旧两星分开且完整。屏幕左侧角尖完整入框，亮紫轮廓最上像素约在 y39，未见触顶；笔尖与脸侧没有编码破损。 |
| 213 | 12780 / 213.000000 | [late-frame-09.png](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-encoded/final/late-frame-09.png) | 补查共画过程较低头顶余量的时点：角尖完整，亮紫轮廓最上像素约在 y29。实体紫笔尖仍接在写痕处，金笔单独悬停，旧新星保留，没有编码后位置回退。 |
| 218.3167 | 13099 / 218.316667 | [late-frame-10.png](D:/myskills/updream/KI-MV-Remake-Projekt/exports/qa-v2-encoded/final/late-frame-10.png) | 这是母片最后一个视频帧。角色、实体紫笔、独立金笔和续画线条均存在，旧星已位于袖摆下方且完整，新星与新折尾保留；没有黑屏、结束卡、画面截断或片尾丢失。与 212.5 秒相比笔和写痕位置改变，但两张抽样不能单独证明中间每帧运动连续。 |

## 已修构图问题与版本边界

首次候选母片（RC1，SHA-256 `01b11e111a05ec79199bead4e4f2dcd29414ac7215fc476e3367be67d9aeb1d3`）曾在 212.5 秒轻微裁掉角尖。RC1 母片、对应报告及旧 late.js 已保存在 [v2-rc1](D:/myskills/updream/KI-MV-Remake-Projekt/exports/revisions/v2-rc1/ENCODED_VISUAL_QA.md)；`exports/qa-v2-encoded/late-frame-01.png` 至 `late-frame-09.png` 是 **RC1 旧版证据**，不能作为当前母片的通过依据。

根代理将共画背影高度从 640 调整为 600，并保持真实笔尖锚点。之后实际查看了 `exports/qa-v2-headroom/` 中 211、212、212.5、213、214.6、216.6、218.3167 秒的 7 张源帧，头顶可见余量为 29–103 px。当前母片重新完整导出后，本表 10 张图全部重新从新 MP4 解码至 `exports/qa-v2-encoded/final/`；原有 9 个秒点没有沿用 RC1 图片，另补 213 秒。

当前编码帧的 212.5 / 213 / 218.316667 秒，头部 ROI（x400–1000、y0–220）中亮紫像素阈值 `R>130、G>80、B>160、B>R` 的最上行分别是 39 / 29 / 103。该像素测量辅助已实际查看的完整角尖判断，只适用于这三张缩至 1080p 的图，不能代替全尾声每帧人工检查。本次仅更新证据图与本文，没有改写源码、素材或母片。

这 10 张图中未见合成边缘出现明显白框、彩色方块或旧图标外圆回退。MP4 本身没有透明通道，此处检查的是透明素材合成到视频后的边缘表现；不是源 PNG alpha 或所有细小结饰交织拓扑的逐像素认证。惊讶、微笑结饰流苏及背影角上的少量深色纹理仍可见，本次未将源画细节重新定义为编码故障。

没有连续播放或亲自听完本片，没有重新进行歌词音节听审；没有覆盖每帧运动、所有镜头或全片小字号可读性。未对 1080p 另一个发行文件作编码后视觉确认。

## 与技术核验的关系

本次读取并核对了对应母片的已有报告，以下是**技术报告结果**，与上述人工静帧观察分开记录：

- [full-verify.json](D:/myskills/updream/KI-MV-Remake-Projekt/exports/astra-world-execute-me-full-v2-4k60.full-verify.json)：3840×2160 / 60 fps；13,100 帧完整解码；视频及音频解码无报错；8 个音频对齐窗均为 0 lag。
- [timestamps.json](D:/myskills/updream/KI-MV-Remake-Projekt/exports/astra-world-execute-me-full-v2-4k60.timestamps.json)：13,100 个视频包的全部 PTS 和包时长满足 1/60 秒，DTS 严格递增，三个分段边界连续。
- [parallel.render.json](D:/myskills/updream/KI-MV-Remake-Projekt/exports/astra-world-execute-me-full-v2-4k60.parallel.render.json)：212.333333 秒之后的 6 秒尾声，24 kHz 解码样本 144,000 个，报告的 RMS/peak 均为 -300 dBFS（零样本下限表示），静音核验通过。

技术报告证明完整解码、时序与测量的音频对齐；本记录增加了指定晚段编码后画面的可见性证据。二者都不等同于连续全片主观听看通过。

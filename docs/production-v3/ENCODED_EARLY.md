# v3 编码母版：早段定向视觉验收

检查日期：2026-11-05。检查者：early scenes agent。结论：**指定五帧通过；没有发现阻断交付的新问题。** 本次证据直接解码自最终 MP4，区别于此前的 Canvas 源画面检查。

## 被检文件与抽帧方法

- 母版：`exports/astra-world-execute-me-full-v3-4k60.mp4`
- 文件大小：`283245132` bytes。
- SHA-256：`fc5843f714c862d4a405f2a2cee58f958eaeb1597fe872dfe4300d0c1586e90b`；抽帧时独立读取文件并核对。
- FFmpeg 输入流报告：H.264 High、3840×2160、60 fps、yuv420p、BT.709、逐行；音轨 AAC 48 kHz 双声道。本次关闭音频输出，没有进行听审。
- 从开头顺序解码，用 `select` 精确选择原视频零基帧号，选出五帧后停止；没有靠不精确时间 seek 定位。输出使用 Lanczos 缩为 1920×1080 PNG，逐张实际查看。

在项目根目录执行的单次命令：

```powershell
& '.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe' -hide_banner -nostdin -threads 4 -i 'exports/astra-world-execute-me-full-v3-4k60.mp4' -vf "select='eq(n,2100)+eq(n,2280)+eq(n,3180)+eq(n,4584)+eq(n,4818)',scale=1920:1080:flags=lanczos,showinfo" -fps_mode vfr -frames:v 5 -an 'exports/qa-v3-encoded/early/decoded-%02d.png' 2> 'exports/qa-v3-encoded/early/ffmpeg-select.log'
```

命令退出码为 0，输出五张 PNG。完整记录：[ffmpeg-select.log](../../exports/qa-v3-encoded/early/ffmpeg-select.log)。`showinfo` 放在 `select` 后，日志中的 `n=0…4` 是所选输出序号，**不是原视频帧号**。下表原视频帧号来自选择器，并由日志中未重置的 PTS 核对；输入时间基为 `1/60000`。

## 五帧逐项结果

| 镜头 / 秒点 | 原视频零基帧号 | PTS | 实际查看的输出 | 检查结果 |
| --- | ---: | ---: | --- | --- |
| R10 / 35.000 s | 2100 | 2100000 | [decoded-01.png](../../exports/qa-v3-encoded/early/decoded-01.png) | 新肩部、袖、臂、握笔手连为一体，角色从画面边缘进入；实体紫笔尖抵在圆周亮点，未见旧悬浮手或额外程序笔。镂空结饰、圆周与大字均可读。通过。 |
| R11 / 38.000 s | 2280 | 2280000 | [decoded-02.png](../../exports/qa-v3-encoded/early/decoded-02.png) | 与圆周镜不同的握笔姿势已进入成片；笔尖、正弦曲线和金色切线共点，旧脚部素材已不存在；笔上端完整留在画面内。通过。 |
| R15 / 53.000 s | 3180 | 3180000 | [decoded-03.png](../../exports/qa-v3-encoded/early/decoded-03.png) | 圆顺肩袖与食指连续，指尖抵住时间尺标记；城市层、年份与操作语义可读，旧静态方块未出现。此帧能确认接点与构图，不能单帧证明完整拖动运动。通过。 |
| R26 / 76.400 s | 4584 | 4584000 | [decoded-04.png](../../exports/qa-v3-encoded/early/decoded-04.png) | 茄子上下半的切面各自连接外皮，浅色果肉及弯曲种子带可辨；椭圆宽度对应切口，未见独立贴上的星轮；下半果实未遮住 NUTRIENTS。通过。 |
| R28 / 80.300 s | 4818 | 4818000 | [decoded-05.png](../../exports/qa-v3-encoded/early/decoded-05.png) | 番茄上下切面同向、各自贴合外皮，四个种子腔与种子清楚区别于茄子；未见旧星轮贴片。上下分离是当前剖面展示状态。通过。 |

五张图均为**上行英文原文、下行中文译文**，位于底部独立字幕带；没有观察到字幕缺字、互相覆盖或遮挡指定动作/果实切面的情况。三种新人物局部未观察到透明素材矩形底、明显光晕或脱离身体的断臂拼贴。结饰是画面素材内部图形，本次没有追加或修改图标。

## 范围与边界

本报告仅确认上述五个时点在实际编码母版中的视觉状态。没有逐帧人工检查整片，没有连续播放或听审，没有声称逐像素检查完整 4K 图像；人工查看的是从 4K 母版缩出的 1920×1080 帧。编码、整片帧数、音画同步及全片解码完整性由根代理的技术验收另行记录。此次没有修改源代码、素材、manifest 或 MP4。

# ASTRA V6 便携归档复刻入口

`reproduce_v6.mjs` 从最终归档源码调用 `/src/mv6/index.html` 的 `window.vfx.renderFrame()`，以 Three.js / WebGL 重新绘制 V6。它读取仓库内 79 个原画槽位、86 镜头、128 条双语字幕、光效时间特征和原 4K 警告卡，不依赖原开发机目录、私有 v5.2 MP4、旧渲染缓存、Python 或原曲。

入口只输出 **3840×2160 / 60 fps 静帧与静音视频**，不生成 1080p 视频。它从最终源码直接新渲染，不模拟历史交付的七段补丁拼接，也不承诺历史成片的 SHA256 或像素完全相同。历史交付证据见 [V6 归档说明](../../docs/ARCHIVE_V6.md)；这里介绍的是新的复刻路径。

## 安装

需要 Node.js 20 或更高版本。在干净 clone 的仓库根目录运行：

```text
npm ci
npx playwright-core install chromium
node tools/archive/reproduce_v6.mjs --check
```

导出视频另需自行安装含 `libx264` 的 FFmpeg 与 FFprobe。默认使用 PATH 中的 `ffmpeg` / `ffprobe`，浏览器默认使用 Playwright 已安装的 Chromium。也可显式配置：

| 参数 | 环境变量 | 说明 |
| --- | --- | --- |
| `--browser PATH` | `BROWSER_PATH` | Chromium 或 Edge 可执行文件完整路径 |
| `--ffmpeg PATH` | `FFMPEG_PATH` | FFmpeg 可执行文件完整路径 |
| `--ffprobe PATH` | `FFPROBE_PATH` | 默认与显式 FFmpeg 路径同目录，否则走 PATH |

默认 `libx264` 使用 CPU 编码；`--encoder h264_nvenc` 需要使用者已有可用的 NVIDIA 驱动和硬件，入口不会悄悄替换编码器。无论编码器如何选择，场景都需要可工作的 WebGL。软件 WebGL 可能很慢，实际图形后端会写入导出报告。Linux 上浏览器需要的系统库和权限由使用者准备，例如通过 Playwright 的 `--with-deps` 安装方式。

浏览器临时 profile、缓存和临时文件环境固定到**当前 clone 内** `exports/archive-v6/.browser-tmp`，包括父进程与子浏览器的 `TEMP` / `TMP` / `TMPDIR`。本项目放在 D 盘时，入口的这些临时文件也在 D 盘。`npm ci`、浏览器安装命令及使用者手动打开的浏览器有各自的缓存策略，不受此入口管理。

原画仍是已批准的二维插画，放入三维场景不会产生原图没有的细节或完整人体 rig。源码使用 Segoe UI、Microsoft YaHei UI / Microsoft YaHei、Georgia、Consolas、Segoe Script 等系统字体，微软字体不随仓库再分发。字体、浏览器、GPU、驱动和编码器差异均可能改变画面或视频字节；4K 表示输出分辨率，不表示所有原画都是原生 4K。

## 检查和静音预览

```text
node tools/archive/reproduce_v6.mjs --check
node tools/archive/reproduce_v6.mjs --serve
```

`--check` 不启动浏览器、不写文件。它检查素材在仓库内、PNG 头和尺寸、manifest 中已有的 SHA256、86 镜头连续覆盖 13100 帧和 6 秒安静尾声、128 条双语歌词，以及 V6 入口的静态依赖图、Three.js import map 和播放控件。无历史 hash 的素材仅计算本次实际 hash，不冒充历史内容比对。静态检查不能证明 WebGL 能启动或电影已经复刻完成。

`--serve` 打印 `http://127.0.0.1:随机端口/src/mv6/index.html?...`。打开完整地址后，可拖动时间轴或按 Play 静音播放；Ctrl+C 结束服务。可用 `--port 8769` 固定端口。入口只监听本机，允许 HTTP 读取的目录有明确限制，不开放整个工作目录。

预览显示 **body 时间**，不含前置 5 秒警告。默认画布仍为 4K；性能有限时可仅为实时预览传更小的偶数 16:9 尺寸，例如 `--width 1280 --height 720`。这不会生成低分辨率视频。实时播放受设备性能影响，不能替代导出后的帧数、同步和视觉核验。

使用者可选择自己有权使用、且浏览器能播放的本地音源：

```text
node tools/archive/reproduce_v6.mjs --serve --audio "D:/private/audio/body-aligned.m4a" --audio-offset 0
node tools/archive/reproduce_v6.mjs --serve --audio "D:/private/audio/full-aligned.m4a" --audio-offset 5
```

`--audio-offset` 指 **body 第 0 秒对应音源的第几秒**，不是自动添加静音。音源通过专用本机路由播放，不复制进仓库、不上传、不参加视频渲染。没有音源时使用独立静音时钟。

## 精确 4K 帧和短区间测试

所有帧号均为零起算 **body 帧号** `0..13099`，固定 60 fps。完整电影帧号为 `body_frame + 300`，完整电影时刻为 `body_frame / 60 + 5`。

```text
node tools/archive/reproduce_v6.mjs --stills 0,2997,3840,9553,10938,13099 --out exports/archive-v6/stills-01
node tools/archive/reproduce_v6.mjs --render --start-frame 0 --end-frame 120 --out exports/archive-v6/first-two-seconds.mp4
node tools/archive/reproduce_v6.mjs --render --execute --start-frame 0 --end-frame 120 --out exports/archive-v6/first-two-seconds.mp4
```

`--stills` 接受 1–120 个不重复的整数帧号，重新绘制原生 WebGL PNG；不会从旧 MP4 抽帧。旁边的 `index.json` 记录帧号、时刻、镜头、当前运行时状态和 PNG SHA256。

`--render` **不带 `--execute` 时只打印计划**，不启动浏览器、编码器，也不写输出。实际渲染区间为 `[start-frame, end-frame)`，上例恰好 120 帧 / 2 秒。省略区间意味着完整 13100 帧 body，应先看计划。

默认编码为 `libx264` / CRF 19，BT.709 limited、yuv420p；`--quality` 范围 0–51。选择 `--encoder h264_nvenc` 后 quality 表示 CQ。输出不覆盖已有文件，必须位于当前 clone 的 `exports/` 下；路径越界或输出符号链接逃逸会被拒绝。失败后保留部分输出以便定位，请换新输出名重试；本入口没有旧 fingerprint 断点续跑功能。

每帧按 `frame / 60` 调用 V6 API，检查实际帧号与原时间轴镜头，原生 PNG 经本机管道送入 FFmpeg，不落盘整套帧缓存。此便携路径优先保持依赖简单，可能慢于原制作中的异步 PBO 渲染器；浏览器显式回收 Blob，防止长片积累旧帧对象。

编码完成后完整解码视频，检查所有展示时间戳、帧数、4K 尺寸和精确 `60/1` 帧率；MP4 视频和电影 timescale 均为 60000，每帧相差 1000 ticks。随后写同名 `.render.json`，记录输入指纹、运行环境、编码命令、输出 SHA256 和精简镜头覆盖。输入文件在捕获前后复核；新报告不沿用历史视频的审计结论。

## 带原警告的完整静音电影

先看计划；完整执行会耗费较多时间和磁盘空间：

```text
node tools/archive/reproduce_v6.mjs --render --with-warning --out exports/archive-v6/full-silent-4k60.mp4
node tools/archive/reproduce_v6.mjs --render --with-warning --execute --out exports/archive-v6/full-silent-4k60.mp4
```

`--with-warning` 要求 start-frame 为 0。它先绘制归档 `assets/publishing/warning-v02/card-4k.png` 的 300 个静止帧，再绘制 body。完整输出为 `300 + 13100 = 13400` 帧，`223.333333…` 秒。body 已包含最后 6 秒安静尾声。新警告编码不承诺与历史 MP4 的警告视频包相同。

只想测试警告路径时，可执行 `--with-warning --start-frame 0 --end-frame 1`，输出 301 帧；这只能证明该短路径，不代表全片完成。

## 自备音源与 Hi-Res

原歌曲、用户提供的 FLAC、历史含原曲 MP4 和音频中间文件不随代码仓库分发。`audio-accents.json` 只有已制作的光效时间特征，不是可播放音频、也不是可独立还原的鼓轨。请自行准备有权使用的音源。

最便于封装的是已经与完整电影对齐的音轨：前 5 秒警告静音，body 从第 5 秒开始，全长 223.333333… 秒，结尾保留安静尾声。验证音轨起点、时长、编码及同步关系后，使用单独输出文件封装：

```text
ffmpeg -n -i exports/archive-v6/full-silent-4k60.mp4 -i "D:/private/audio/full-aligned.m4a" -map 0:v:0 -map 1:a:0 -c copy -t 223.333333333 -video_track_timescale 60000 -movie_timescale 60000 -movflags +faststart exports/archive-v6/full-with-own-audio.mp4
```

此命令只复制提供的编码流；不会修正错位，也不会把有损或低采样率音源变成真正 Hi-Res。MP4 需使用兼容音频编码，例如 ALAC。若持有已验证的原高采样率 ALAC，可以原样复制；否则音源质量与音频处理、样本数和同步验证由使用者负责。不要将新封装称为已通过历史 192 kHz ALAC 核验。

## 完成边界

本入口的检查与短测不等于完整电影已复刻。新全片还需重新检查音轨、视听同步、算法数值/剧情语义、镜头边界、字幕和画面表现，再判断能否交付。当前 `.render.json` 检查的是帧号、镜头归属、编码和时基，并不运行原版完整剧情/算法审计，也不代表人连续观看或耳听。原制作的检查记录只证明当时的那组媒体。

V6 中的卷积、Kalman 和匈牙利匹配是有实际计算的场景演示，输入来自作者设定的记忆、轨迹或对应关系。检测框采用作者设计的视觉语言，不是 YOLO 推理输出；角色关键点来自原画已知锚点，不是训练模型识别。不得将这些舞台表现理解为真实 AI 模型内部、人物意图推断或新的外部回复。

# ASTRA v5.2 归档复刻入口

`reproduce_v52.mjs` 直接调用冻结版 `src/mv52final` 的 `window.sample.renderFrame()`。它只读取仓库里的画面源码、时间轴、128 条双语字幕、79 张 manifest 原画、已有光效时间特征和 4K 警告卡，不需要旧 `exports/`、`.cache/`、Python、原曲或原开发机的绝对路径。

这是新增的便携入口。历史 `tools/render/` 保留当时交付和核验流程；本入口生成的新文件不冒充历史 v5.2 成片的 SHA256，也不沿用历史成片的音频核验结论。当前默认生成静音视频。

## 安装

在仓库根目录运行，需要 Node.js 20 或更高版本：

```text
npm ci
npx playwright-core install chromium
node tools/archive/reproduce_v52.mjs --check
```

视频导出另需自行安装带 `libx264` 编码器的 FFmpeg，使 `ffmpeg` 在 PATH 中可用；也可每次传 `--ffmpeg "完整路径"`，或设置 `FFMPEG_PATH`。浏览器默认使用上述 Playwright 安装的 Chromium；可传 `--browser "完整路径"` 或设置 `BROWSER_PATH`。Linux 上浏览器所需系统库可用 Playwright 安装命令的 `--with-deps` 选项安装，所需系统权限由使用者管理。

源码使用 Segoe UI、Microsoft YaHei UI / Microsoft YaHei、Georgia、Consolas、Segoe Script 等系统字体。相同素材和时序不等于跨系统像素完全相同；字体、浏览器、图形栅格化和编码器版本都可能改变文字排版或成片字节。微软字体不随此入口再分发。报告记录实际 Node、浏览器及 FFmpeg 版本。

## 检查与预览

```text
node tools/archive/reproduce_v52.mjs --check
node tools/archive/reproduce_v52.mjs --serve --width 1920 --height 1080
```

`--check` 不启动浏览器，不生成文件。它检查 79 个 manifest 槽位的文件是否在仓库内、PNG 头和尺寸、manifest 已声明的 SHA256，以及 86 镜头连续覆盖、6 秒尾声和 128 条双语字幕。对没有历史哈希字段的旧素材，只报告本次实际哈希，不声称其内容已与历史基准逐字节比对。

`--serve` 输出 `127.0.0.1` 预览地址和随机空闲端口，可用 `--port 8769` 指定端口。打开打印的完整地址即可拖动时间轴或用 Play 静音播放；Ctrl+C 关闭本入口的服务。预览显示的是正片 body 时间，不含前置警告。

可选择自己持有且浏览器能播放的音源：

```text
node tools/archive/reproduce_v52.mjs --serve --audio "D:/private/audio/body-aligned.m4a" --audio-offset 0
node tools/archive/reproduce_v52.mjs --serve --audio "D:/private/audio/full-aligned.m4a" --audio-offset 5
```

`--audio-offset` 表示 **body 的 0 秒位于该音源的第几秒**；不是给歌曲自动加静音。音源只通过专用本机路由提供，不复制进仓库，不上传，不参加渲染。预览使用浏览器时钟，播放效果受设备性能和媒体缓冲影响；它不能代替导出后逐帧、音频样本或同步核验。

## 精确帧与区间渲染

以下帧号均为零起算的 **body 帧号**，固定 60 fps，范围 `0..13099`。完整电影帧号为 `body_frame + 300`，完整电影秒数为 `body_frame / 60 + 5`。

```text
node tools/archive/reproduce_v52.mjs --stills 0,6480,13099 --out exports/archive-v52/stills
node tools/archive/reproduce_v52.mjs --render --start-frame 0 --end-frame 120 --out exports/archive-v52/first-two-seconds.mp4
node tools/archive/reproduce_v52.mjs --render --execute --start-frame 0 --end-frame 120 --out exports/archive-v52/first-two-seconds.mp4
```

`--stills` 最多接受 120 个互不重复的帧号，输出原生 Canvas PNG 和 `index.json`，记录 body/full 帧号、时刻、镜头、所用角色及 SHA256。它重新渲染精确帧，不从历史成片抽帧。

`--render` **没有 `--execute` 时只打印计划**。实际导出必须显式加 `--execute`。区间为 `[start-frame, end-frame)`，上例恰好 120 帧、2 秒。未指定区间时是整个 13100 帧 body，因此完整运行前应先检查计划。

默认 3840×2160、60 fps、`libx264` / CRF 19、BT.709 limited、yuv420p；可用 `--width 1920 --height 1080` 等偶数 16:9 尺寸降低测试成本。冻结时间轴只支持 60 fps，`--fps` 传其他值会被拒绝。需要 NVIDIA 编码器时显式传 `--encoder h264_nvenc`，`--quality 19` 此时表示 CQ；入口不会自动替换编码器，硬件和驱动由使用者准备。

生成过程不保存逐帧缓存，PNG 通过管道送入 FFmpeg。结束后完整解码新视频，核对输出帧数，再写入同名 `.render.json`：包含参数、实际环境、命令、素材 manifest 哈希、输出大小和 SHA256。该检查没有声称视频包与历史成片一致、音频一致或人工逐帧审片完成。

## 生成包含警告的完整静音电影

先检查计划，再选择是否实际运行：

```text
node tools/archive/reproduce_v52.mjs --render --with-warning --out exports/archive-v52/full-silent-4k60.mp4
node tools/archive/reproduce_v52.mjs --render --with-warning --execute --out exports/archive-v52/full-silent-4k60.mp4
```

`--with-warning` 要求 `--start-frame 0`。入口先用已归档的 `assets/publishing/warning-v02/card-4k.png` 生成 300 帧静止警告，再顺序绘制 body。全长为 `300 + 13100 = 13400` 帧，`223.333333…` 秒，body 已含最后 6 秒安静尾声。警告卡会按请求输出尺寸绘制；新编码不会与旧视频警告包逐字节相同。

## 自备音源：对齐和封装

原曲、用户提供的 FLAC、含原曲的历史 MP4 和音频中间文件不随代码归档上传。请自行准备有权使用的音源。此入口读取的 `audio-accents.json` 是既有光效时序数据，不包含可播放音频，不代表独立分离出的鼓点音轨。

最稳妥的封装输入是一条已经与 **完整电影** 对齐的音轨：前 5 秒为警告静音，body 从第 5 秒开始，全长 223.333333… 秒，并保留结尾安静尾声。若你持有当时的验证版 ALAC，直接复制该音轨即可，不必重新编码。先确认其音轨参数、时长与同步关系，再封装到新静音视频：

```text
ffmpeg -n -i exports/archive-v52/full-silent-4k60.mp4 -i "D:/private/audio/full-aligned.m4a" -map 0:v:0 -map 1:a:0 -c copy -t 223.333333333 -movflags +faststart exports/archive-v52/full-with-own-audio.mp4
```

`-c copy` 只复制所提供输入的编码流，不会自动校正错位，也不会把有损音源变成无损。请使用 MP4 支持的音频编码；若没有已对齐音轨，应先在独立文件中做好前静音、起点和尾声，再核验。

仅当自备文件就是历史同一 FLAC 时，可以复用历史样本配方：源 SHA256 为 `19d5b185fe6cff41ae7d0082ca4f9e7cf2828ef1de99c7f5336177a9761acbbc`，192000 Hz、24 bit、双声道、每声道 40686080 个样本；去掉前 11096 个样本，添加 960000 个前置零样本，尾部补零至每声道 42880000 个样本。示例：

```text
ffmpeg -n -i "D:/private/audio/matching-original.flac" -map 0:a:0 -vn -af "atrim=start_sample=11096,asetpts=PTS-STARTPTS,adelay=960000S:all=1,apad=whole_len=42880000,atrim=end_sample=42880000,asetpts=N/SR/TB" -c:a alac -sample_fmt s32p -bits_per_raw_sample 24 -movflags +faststart exports/archive-v52/own-aligned-alac.m4a
```

这是一次新的无损音频编码；不能声称复制了历史 ALAC 压缩包，必须对新文件另做样本与同步验证。不要把这个裁切配方套到不同采样率、不同前奏或不同版本的歌曲。

## 输出保护、HTTP 范围和中断

- 输出只能位于本仓库 `exports/` 下。路径检查包含已存在祖先的真实路径，拒绝跳出该目录的符号链接；PNG、索引、视频和报告都禁止覆写。
- 服务仅绑定 `127.0.0.1`。它只允许画面源码、数据和素材目录；拒绝父目录、反斜线穿越及跳出允许目录的链接。只有显式 `--audio` 的单个文件能通过专用路由读取。渲染帧提交还需要随机令牌。
- Ctrl+C、失败或完成时关闭本入口创建的浏览器、服务和编码器，不结束外部已运行的进程。失败可能留下未完成的新输出；入口不自动删除或覆盖它，请检查后自行处理，重试时选择新路径。
- 完整 4K60 CPU 编码耗时和磁盘需求明显大于短测。本入口没有分段断点续渲功能。历史成片与报告是独立的交付证据，不是新复刻的依赖。

## 本机验证范围

本入口在本机 Windows 环境验证 `--check`、精确 body 帧和 120 帧 / 2 秒的 3840×2160、60 fps、libx264 静音短片，测试产物位于忽略的 `exports/archive-smoke/`。具体版本、帧数和输出哈希以该目录的 JSON 报告为准。测试不依赖原曲，不重新渲染历史完整成片，也不构成 Linux/macOS、所有浏览器版本、所有编码器或完整长片的新验证保证。

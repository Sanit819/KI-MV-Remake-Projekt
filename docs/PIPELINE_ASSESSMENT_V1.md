# 第一版制作：本地pipeline可用性核查

2026-11-07，Asia/Shanghai。用户已授权制作第三企划全曲第一版；最新输出要求为**720p、30fps，FLAC不用转别的**。本核查只读pipeline与第一企划源文件，未重装依赖、下载模型或改动第一/第二企划；本次只新增此报告。

检查时pipeline仓库有本机初始化文件及模板`index.html`、`vertical.html`、`imagegen.py`、`kit_env.mjs`的未提交状态；本次未改这些源文件，不应为复用工具而重置或清理它们。第一企划工作区状态干净。

## 结论

`D:/myskills/updream/vocaloid-style-mv-pipeline`可以辅助第三企划，最值得复用的是**音频/歌词分析环境、字体、确定性逐帧渲染器和审片方法**。第三企划的v5角色画风与剧情已经有自己的方向，不应套用模板《残光》的夜景、暖金辉光、滤镜或示例时间线。

第一版建议保持独立制作入口：第三企划自己的720p Canvas/Python画面逻辑、原曲时基、姿态素材与剧情，然后复用现成FFmpeg及可运行的捕帧方法。成片以**H.264 1280×720/30fps + 原FLAC流复制的MKV**交付。pipeline默认MP4音频流程不符合这次要求，必须绕开。

## 本次现场检查与可复用资源

通过当前PowerShell加载`Use-Environment.ps1`，使用pipeline自己的Python运行：

```powershell
. ./Use-Environment.ps1
./.venv/Scripts/python.exe skills/vocaloid-style-mv/scripts/check_env.py --project _demo
```

结果：全部REQUIRED项目存在；NVENC实际短编码检查通过。它检查了演示工程环境，不是第三企划成片已经渲染通过。

| 组件 | 当前可用路径／现场结果 | 用途 |
|---|---|---|
| Node | v24.18.0 | 确定性画面、Playwright工具 |
| Python | `vocaloid-style-mv-pipeline/.venv/Scripts/python.exe`，3.12.10 | 已有librosa 1.0.0、NumPy 2.5.4、SciPy 1.18.1、Pillow 13.0.0等；不必装系统环境 |
| FFmpeg/FFprobe | `vocaloid-style-mv-pipeline/_tools/ffmpeg/bin/`，9.0.2 | H.264编码、FLAC无转码封装、全解码与媒体核验 |
| GPU编码 | RTX 5060 Laptop，NVENC短测试通过 | 可选h264_nvenc；也有libx264 |
| 浏览器/库 | Edge 157.0.4341.42；`_demo/node_modules/playwright/` 1.65.0 | 依赖存在，但本会话实际无头启动见下面限制 |
| 字体 | `_demo/engine/fonts/`，37/37文件存在 | NotoSansJP/SC变量字体、ZenKakuGothicNew-Black、DelaGothicOne等；应连同对应OFL保留来源 |
| JIZURA | `_demo/vendor/JIZURA/`，固定fc16bfe43e；`_demo/jizura/app/jizura_engine.js` | 可选字效，不必为了使用pipeline加载所有样式 |
| 日语时序环境 | faster-whisper、ONNX、pykakasi、隔离torch/torchaudio存在 | 可辅助候选歌词时序；输出仍需与正式歌词逐句核对 |
| 模型缓存 | `_models/huggingface/`的Whisper large-v3/Kim；`_models/torch/`的MMS | 文件现场存在；本次未对本曲跑识别或对齐，历史合成输入验证不代表本曲准确性 |

重要：**安装齐全不等于这次浏览器启动已经成功。** 本次独立Playwright/Edge无头能力探针失败，报`Target page, context or browser has been closed`，日志含Crashpad `TransactNamedPipe` 0x6D；发生于当前沙箱临时profile目录。本次未确认实际WebGL渲染或浏览器媒体播放能力，不能直接沿用历史演示的成功结论。主制作应先试当前入口的极短帧段；若同样失败，处理本地浏览器启动权限/环境，或用Pillow/FFmpeg渲染方案继续。原项目无需重装。

## 最小渲染接口与720p边界

已读`template/tools/render_frames.mjs`、`kit_env.mjs`、`stills.mjs`与`engine/core/main.js`。

- 页面只需提供`window.ready`（素材/字体就绪Promise）、`window.renderFrame(t)`、`window.__zankoMeta={duration,fps}`及待捕获canvas。`t`必须来自原曲时间，不能用实际墙钟；随机变化按帧/姿态确定种子。
- 模板默认内部画布在`engine/core/main.js`硬编码1920×1080。单传`--width 1280 --height 720`会缩小输出；如要减少本次计算量，第三企划页面直接设置1280×720。
- Canvas2D捕帧选`--mode blob`或`rawvf`。默认`raw`要求WebGL canvas，直接用于普通2D画布会失败。
- 可以调用现有`_demo/tools/render_frames.mjs`并用`--root`指向第三企划；它能找到`_demo/node_modules/playwright`。`_demo`与template的render_frames脚本SHA一致。这样不必把整个demo复制进第三企划，也不需改demo。
- `--out`、`--stats`用第三企划下的绝对路径，避免工具对相对路径按自身PROJECT解析；不要附加`--preview`，它会把已传的1280×720再除以二。
- 默认脚本会清理自己的渲染分段。若需先保留拼接证据可传`--keep-parts`。每次输出新版本，不覆盖已审产物。

示意调用（页面路径由主制作实际文件替换，先做短段验证）：

```powershell
node ../vocaloid-style-mv-pipeline/_demo/tools/render_frames.mjs --root D:/myskills/updream/Taiyoukei-Disco --url production/v1/index.html --selector canvas#out --width 1280 --height 720 --fps 30 --mode blob --workers 2 --start 0 --end 203.2 --codec nvenc --cq 19 --out D:/myskills/updream/Taiyoukei-Disco/exports/v1/video-only.mp4 --stats D:/myskills/updream/Taiyoukei-Disco/exports/v1/render-stats.json
```

这只是审核后的参数示例，本报告没有创建该页面或运行全曲命令。源曲203.2秒对应30fps正好6096帧，范围为`[0,6096)`。

## FLAC原流封装与预览

两处默认音频入口都要避开：

- `render_final.mjs`硬编码AAC 320k、48kHz，并会`apad`；即使传FLAC也会转码。
- `render_frames.mjs --audio ...`同样会转AAC 320k、48kHz并补尾。只渲染画面时不要传`--audio`。

生成无声H.264画面后，独立封装原FLAC：

```powershell
../vocaloid-style-mv-pipeline/_tools/ffmpeg/bin/ffmpeg.exe -n -i exports/v1/video-only.mp4 -i 'local-source/audio/07 太陽系デスコ.flac' -map 0:v:0 -map 1:a:0 -c:v copy -c:a copy exports/v1/taiyoukei-disco-v1-720p30-flac.mkv
```

明确选`1:a:0`排除FLAC文件内封面；不加重采样、增益、裁切、静音补尾、`-shortest`或AAC副本。这里仅更换容器，FLAC仍是原编码流。最终视频与音频时长应分别核验，不以容器总时长代替。

- 音频：解码成原始44.1kHz/16bit双声道后核对8,961,120样本/声道及PCM MD5 `4daf00626a1c0d4a8d848c3393b6c759`。独立核封装后的结果；不沿用源文件验证作为成片证明。
- 视频：核1280×720、30fps、6096帧、全解码、时间戳递增。Matroska通常采用1ms时间基，30fps时间戳可呈33/34ms交替，不能机械套第一企划“每包PTS精确n/60”的规则。
- 播放：MKV作为交付文件，可用机器已有关联且支持H.264+FLAC的播放器；本次未确认VLC安装，也未验证Codex内联MKV解码。不要为了网页播放偷偷加AAC版本。
- 网页预览可让Canvas按原FLAC的`audio.currentTime`作主时钟，直接读用户FLAC；或无声MP4与原FLAC同步。当前浏览器探针启动失败，兼容性仍需主制作实测，不能仅靠`canPlayType`或文件存在宣称播放验收。

## 音频与歌词工具注意点

`analyze_audio.py`接受`--audio`原FLAC，内部分析会解码/重采样到24/48k浮点数据，这不改变源FLAC，但其默认会额外生成`click_preview.m4a`。本次应传`--no-click`，不要交付改音轨的点击版；分析结果应写第三企划自己的目录。脚本通过`kit_env.ROOT`定位输出，不能直接在原template目录运行后误写到template。

`transcribe_lines.py`内含示例歌词/粗时码，`transcribe_align_mms.py`依赖它；必须改为本曲的独立输入后再运行。用户的58组歌词仍为文字唯一基线，Whisper结果不能覆盖词句。初版使用的候选时码与人工耳听确认必须分开登记。全曲固定150BPM等推断，需实际音频证据支持；原MV局部12帧换姿只证明局部视觉规律。

## 从第一企划带走的经验

已读第一企划`ARCHIVE.md`、`tools/archive/README.md`与`docs/FULL_MV_V5_2.md`，仅借鉴方法，不执行其冻结渲染入口。

1. **动作需要完整姿态。** 第一企划最终保留52个姿态，手部接点和人体重画是实际返工重点。本次双人举手、换向、分掌/合掌、伸手、落笔必须有可读动作素材；仅把v5整张图平移旋转不能代表人物动画完成。
2. **换图后重测接点。** 新姿态的手、笔尖、共同轨道端点按该图像坐标重设；不能直接沿用旧图坐标。先审相接的一帧，再审换态前后。
3. **参考风格有保持帧。** 第三企划需要固定双人构图、少量完整换姿和突然变化；不自动复制第一作60fps插值或光感，更不能让多层光效盖住已批准的不闭合线。
4. **母题连续性落实到画面。** 旧紫金星仍是USER与Astra共画；ds的新贡献是蓝线。末段应实际出现交替落笔和等待，而非只展示成品图。第一作的5秒警告、6秒静音尾是该项目的特定设计，不移植到203.2秒本曲。
5. **技术通过与看过画面分开。** 第一企划记录了全解码/PCM验证、运行采样和有限编码后静帧审查范围，没有冒充逐帧人工看完全片。本次也应报告实际抽查覆盖，重点看人物不串形、巨字遮挡、动作接点、尾声星形。
6. **输入指纹和版本隔离。** v5基准图及FLAC保留原哈希；新素材、画面入口和导出置于第三企划版本目录。第一企划依赖已清理，历史缓存存在性不能据旧报告推断。

当前用户已给出角色、画风、剧情与制作授权，pipeline技能里的重新提案/角色选择节点不应导致重复确认。其CLI生图与绿幕流程是工具选项；本会话继续按内置image_gen规则处理画稿和透明输出。署名取用户已经提供的词曲编曲与已登记角色来源，不照搬demo作者/标题。

## 核查边界

本报告完成文件与参数阅读、当前工具/依赖检查、NVENC短编码探测；浏览器启动探测失败并明确记录。没有宣称本曲歌词已对齐、当前新引擎已运行、全曲已渲染或MKV已实际播放。没有修改pipeline、第一企划、第二企划的制作文件。


## 主制作补证：实际浏览器与全曲渲染成功

本报告前面的Edge失败限定在沙箱探针。主制作随后通过获准的本地非沙箱exec启动同一pipeline Edge，短烟测及6096帧完整渲染均成功；没有重装环境。使用RTX 5060 Laptop GPU、Canvas2D blob捕帧、三个worker，渲染74.3秒/总78.32秒。58组字幕检查、原FLAC浏览器解码、file://成片播放器均成功；最终媒体核验与限制见DELIVERY_V1.md。原文“本次未对本曲跑识别”仅指最初只读核查，后续本曲分析已完成，见production/v1/timeline。

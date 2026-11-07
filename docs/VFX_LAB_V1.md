# ASTRA · VFX studies 01

用户在逐帧参考研究后明确授权三段视效试片。本工作树从冻结标签 `astra-world-execute-me-v5.2-final`（881e403fc3b76fa0d8fd0fe2a27c081710830f21）另开 `project-01/vfx-lab-v1`，保留原成片与归档分支。此处是26秒机制与构图试片，尚未替换全曲。

**2026-11-07已交付候选**：`exports/vfx-lab-v1/astra-vfx-studies-v1-1080p60.mp4`，1920×1080、60fps、1560帧、26秒，75,720,530 bytes，SHA256 `c04d317049956cf2fa7bd707b89b6310dd502cc9a41bffa3350ceb8d93df4b11`。三个独立短片同目录，分别以01/02/03开头。四个文件完整解码、逐帧时间戳、时长与48kHz立体声音频检查全部通过；总片26张逐秒图、14张解锁邻帧以及3张全幅已实看，另有独立审阅。待用户播放与审美反馈。

## 三段内容

| 总片时间 | 内容 | 新的实际机制 |
|---|---|---|
| 0–8秒 | Beyond the boundary | ASTRA批准原画手部锚点接金色信号，真实透视相机跨越多道门框；前景遮挡、城市尺度、地面受光与景深距离一致 |
| 8–16秒 | An unwritten world | 同一固定顶点UV网格从星尾展开为信号带、卷页，再展开成世界地表；文字、轨道和信号瓦片共享形变，镜头下降进入城市 |
| 16–26秒 | Six unlocks | 分瓣、剪切、翻折、抽离、解缠、放桥六个实体操作；相机连续穿门，末端围墙展开为环形世界；每次门框局部错位仅3帧后恢复 |

曲目均来自本地既有v5.2成片的ALAC音轨。源成片包含5秒片头，三个完整成片区间为56.133333–64.133333、37.6–45.6、160.083333–170.083333秒；按192kHz整数样本裁切，再转为48kHz立体声AAC。独立短片直接从同一ALAC源配音。六次触发来自既有歌词时间轴，尚非新一轮人工耳听标定。详细候选依据见 `vfx-lab-audio-recommendation.json`。

## 入口与重建

- 场景入口：`src/vfxlab/index.html`，渲染API：`window.vfx.ready` / `window.vfx.renderFrame(seconds)`。
- 静帧/视频工具：`tools/render_vfxlab.mjs`；打包与完整解码核验：`tools/package_vfxlab.py`。
- 依赖：Node、锁定的Three.js 0.187.0 / playwright-core 1.64.1、可启动的Edge/Chromium、FFmpeg/FFprobe、Python的Pillow/NumPy/OpenCV。
- 无AI新生图/逐帧生图；当前出镜角色是原manifest的A02_02三墨轮廓，仍为固定原画平面，没有新增骨骼动画或真实身体三维旋转。
- 参考片只用于机制研究；没有将参考视频、音乐、截图或作者素材嵌入输出。Three.js是本试片采用的实现方式，不是对参考作者实际引擎的断言。

```powershell
npm ci
node tools/render_vfxlab.mjs --stills 0.4,3.5,8.4,12.6,15.8,19.9,22.14,24.4 --out exports/vfx-review-new
node tools/render_vfxlab.mjs --out exports/vfx-lab-new/silent.mp4
python tools/package_vfxlab.py --dir exports/vfx-lab-new
```

默认FFmpeg和浏览器路径对应当前本机；渲染器支持 `--ffmpeg` / `--browser` 或同名环境变量。视频输出不覆盖已有文件，必须在新工作树exports内且扩展名为.mp4。当前Windows沙箱内Edge启动会发生命名管道退出；本轮获自动批准后使用隔离临时配置在沙箱外启动无界面Edge，不连接用户浏览器配置。试图下载的独立headless-shell因网络慢已取消，实际未用于交付。

本地交互预览可在此目录运行 `python -m http.server 8790 --bind 127.0.0.1` 后打开 `/src/vfxlab/index.html`；交互版为无声图形时间轴，成片MP4包含原曲选段。

## 验证与范围

最终核验结果写入 `exports/vfx-lab-v1/validation.json`，每帧时间戳、画幅、帧率、帧数、音频格式与完整解码单独验证；编码后样图位于同目录qa。实际WebGL使用的GPU与浏览器版本记录于silent.render.json，以工具实测为准，不因机器有NVIDIA显卡便声称WebGL由它渲染。

初稿已通过实际样图修正：第六门铰链朝镜头扫入、卷页阶段残留小角色、城市只像一块俯视板、前门标牌抢焦点、末端星体孤立、细线抗锯齿与建筑受光不足。技术检查、对象级射线与静帧审阅均不等于用户验收，也不声称完成连续播放或直接耳听。下一步应根据这三段的实际播放反馈选择适合全曲的强度与镜头语言，再扩展对应段落。

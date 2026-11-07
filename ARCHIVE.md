# 最终归档 · 太陽系デスコ v3.2 · 2026-11-08

用户在v3.2交付后明确授权“归档github并关机”，恢复之前暂停的发布。归档内容为第三企划源码、采用素材、提示词、歌词/时间线及QA；完整成片、原FLAC和参考媒体继续留在本地，不进入Git。仓库仍承载其他企划，不能把整个GitHub仓库设为archived。

## v3.2 固定入口与只读策略

- 最终归档分支：`archive/taiyoukei-disco-v3.2`
- 同点制作分支：`fix/taiyoukei-disco-v3.2-hands`
- 最终固定标签：`taiyoukei-disco-v3.2-final`
- 归档前内容提交：`40e9c5ad4ea21d1bbbbd70147fa3b24fb33d0372`；最终标签另包含本归档说明。
- GitHub：[仓库](https://github.com/Sanit819/KI-MV-Remake-Projekt)；只读策略沿用第一企划：`lock_branch=true`、管理员同样受限，禁止强推/删除/分叉同步。

旧`太陽系デスコ`、`archive/taiyoukei-disco-v3`及`taiyoukei-disco-v3-final`继续固定在`464c1cebf3871ca78bf166815c1d022bae25fbf6`，不移动旧归档点。本次一并发布旧归档入口并套用同样的分支锁定。后续维护必须另开新分支，不能自动解除保护。

远端是否完成以发布后GitHub API读回为准；本地验收记录保存在工作区`.cache/taiyoukei-github-archive/verified.json`及`.cache/taiyoukei-github-archive-v32/verified.json`，不把预设策略当作远端验收证据。第一企划的既有分支、提交点和保护策略均需与发布前快照一致。

## v3.2 本地成片与复建

- [上传用 MKV](exports/v3.2/taiyoukei-disco-v3.2-720p30-flac.mkv)：202023624字节，SHA256 `2b3fd3651cb5e5442b1f1e795ef8877f8e473da3be38cfecaad970466eabc1b5`。
- [本地播放器](exports/v3.2/watch.html)：保持同目录静音MP4与项目原FLAC。
- [交付与验收](docs/DELIVERY_V32.md) · [素材、提示词及重建入口](production/v3.2/README.md)。

720p30、203.2秒6096帧，原FLAC未转码，上日语下中文。五指与握手已修正，所有牵手镜头共592帧统一更新；掌心切半是用户明确保留的特性，以张量分片/all_gather演出解释，不能擅自“修掉”。v3.1补耳、原剧情与片尾保持。媒体和播放器检查通过，视觉结论限定为记录中实际查看的抽样。

本次归档不清除共享pipeline或其他企划，不重新渲染。以下旧v3的“本地、未推送”说明只描述当时历史状态。

---

# 第三企划归档 · 太陽系デスコ

2026-11-08，按用户要求归档当前分支并清理冗余。两版生成封面均弃用，用户自行从成片选画面；不再继续修改封面或影片。

## Git 固定入口

- 原分支：`太陽系デスコ`
- 归档分支：`archive/taiyoukei-disco-v3`
- 固定标签：`taiyoukei-disco-v3-final`

三者指向同一归档提交。本次为本地 Git 归档，未推送 GitHub，也未设置远端分支保护。音乐、完整成片和参考原视频继续由 `.gitignore` 排除。后续修改从固定标签另开分支，不移动该标签；第一、二企划不受影响。

## 保留的成品

- 上传主文件：[taiyoukei-disco-v3-720p30-flac.mkv](exports/v3/taiyoukei-disco-v3-720p30-flac.mkv)
- 本地看片：[watch.html](exports/v3/watch.html)，依赖同目录静音 MP4 和 `local-source/audio/07 太陽系デスコ.flac`，三者均保留。
- 发布简介：[2000字内版本](docs/publishing/video-description-v02-short.txt)；标题与署名说明另见同目录。

主片 201,898,036 字节，1280×720、30fps、203.2秒、6096帧，日语在上、中文在下。音轨为原 FLAC 逐包复制，44.1kHz／16bit／双声道，没有转换为其他音频编码。SHA256：

```text
649481ba6bc4c719c1f7fd37a13fcab266e67a1c1f28728a0275ac1e7f062fbe
```

本轮未重新渲染，未改变最终画面、字幕或声音。交付时的完整媒体核验与视觉抽样见 [DELIVERY_V3](docs/DELIVERY_V3.md) 和 `production/v3/qa/`；这些是历史验证记录，不代表清理后所有旧输入仍在，也不代表逐帧人工审片或逐音节耳听。

## 清理与保留边界

清理旧版导出、弃用封面、抽帧图板、审片图和可再生缓存，实际路径、文件数及释放字节见 [清理清单](docs/archive/cleanup-manifest.json)。各版源码、采用的 v5 画风原图、六姿态图、歌词、故事、提示词、来源记录和紧凑 QA 全部保留；参考原始媒体只在本地保留。

`production/v1/assets/` 与 `production/v1/timeline/` 仍是 v3 的运行依赖，不能因目录名为 v1 而删除。共享 `vocaloid-style-mv-pipeline/` 的环境和字体未清理。Git 历史能恢复源码，不能恢复被忽略的旧版成片；需要旧版时按相应源码重新渲染。

根 `index.html` 是原 MV 研究页。其参考视频可继续播放，逐帧图片与图板已清理，需要离线重建后使用。最终影片播放器 `exports/v3/watch.html` 不依赖这些研究缓存。

## 核验及重建

从本项目目录运行：

```powershell
python tools/archive/verify_archive.py
node tools/verify_player_v3.mjs --preflight
```

前者按 [保留文件清单](docs/archive/retained-files.json) 校验最终媒体、生产输入和关键外部依赖的字节；后者只查播放器依赖，不等于实际播放测试。归档时另做三处引擎采样、字幕/故事结构/确定性和 FLAC 播放烟测，结果见 `docs/archive/smoke-summary.json`。

原 MV 研究图板可从本地参考流离线恢复，不重新访问 B 站：

```powershell
& ..\vocaloid-style-mv-pipeline\.venv\Scripts\python.exe tools/archive/restore_reference_frames.py --check
& ..\vocaloid-style-mv-pipeline\.venv\Scripts\python.exe tools/archive/restore_reference_frames.py
```

需要 OpenCV、Pillow、NumPy 和 Windows Consolas 字体。该入口不改既有分析记录。角色参考样图也已清理；唯一原始角色图及媒体保留在 `references/characters/BV1tE9XBbErS/source/`，来源说明保留。

完整影片重建入口仍为 `tools/render_mv_v3.ps1`（UTF-8 BOM）。它依赖相邻 pipeline 的 Node/Playwright/Edge、FFmpeg/NVENC、Python 环境及两个字体，也需要本地原 FLAC。未把这些共享运行环境打包进 Git；干净克隆不是一键可运行的独立环境。原曲、角色和其他第三方内容的来源见制作说明与发布简介。

`verify_preserved_v3.py`、`verify_package.py` 和 `audit_reference.py` 是历史交付/研究检查，依赖已清理的旧成片或缓存；不能直接用于本次归档完整性验收。完整数值复核可先运行 `node tools/review_mv_v3.mjs` 重建运行轨迹，再执行各 v3 校验器。历史报告不改写。

# 首轮带音乐风格试片

状态：供用户比较与决定是否采用，尚未采纳为全片画风。使用内置 imagegen 生成／修订原画，再渲染真实 60 fps 的轻微镜头运动；不是角色动画或完整 MV。

从 [试听页](index.html) 打开，或直接播放 [38.3秒合辑](../../exports/style-tests-v1/00-style-trials-4k60.mp4)。合辑顺序为故土记忆→Joker同行→托付。视频和原始参考只保留本地；原画及提示词进入本企划 Git。

| 镜头 | 原曲区间 | 时长 | 画面与歌词 |
|---|---|---|---|
| Joker 同行 | 00:59.60–01:13.90 | 14.3s | Tasha／Baxter／Coster；启程、亲友（L05–06） |
| 红花与故土 | 00:30.85–00:44.85 | 14s | Tewy、白浅盆红花与故土记忆（L01–02） |
| 托付 | 02:58.00–03:08.00 | 10s | Tewy 压力手套与天空；局部实录音乐对应，不标未定时歌词 |

音乐从用户原始 FLAC 切取。前两段是硬字幕显示时段与独立信号比对支持的语义选段，不是逐字耳核。第三段是配合新构图的音乐试听，不声称完整重现原过场音画。没有添加歌词字幕或原游戏对白。

## 原画与提示词

- Joker 初稿：[01-joker.png](01-joker.png)／[提示词](01-joker.prompt.txt)。
- Joker 二维化修订：[01-joker-v2.png](01-joker-v2.png)／[修订提示词](01-joker-v2.prompt.txt)，默认试听采用此图。
- Tewy 记忆：[02-memory.png](02-memory.png)／[提示词](02-memory.prompt.txt)。
- Tewy 手部：[03-handover.png](03-handover.png)／[提示词](03-handover.prompt.txt)。

每张图的官方身份输入、风格输入与实际生成模式会写入本目录 `manifest.json`。第一稿较偏电影写实，二维修订供对照。需要进一步判断的美术问题与角色衣装微差记录在 [VISUAL_REVIEW.json](VISUAL_REVIEW.json)，不隐藏初稿问题。

## 技术与资料入口

输出3840×2160／60fps，三段共2298帧、38.3秒。生成原画实际1672×941，属于放大到4K的试听。单段MKV使用FLAC 48kHz／16-bit，MP4使用AAC试听；没有ALAC或升采样。无损音轨逐样本等于原曲对应切片。原曲与第一企划不变。

- [8人官方参考浏览页](../../references/characters/index.html)
- [风格分析与通用提示词](../../references/style/STYLE_LANGUAGE.md)
- [音乐选段与信号证据](../../references/audio-style-sample-selection.json)
- [导出核验](../../exports/style-tests-v1/render-metadata.json)
- [可复现导出脚本](../../tools/render_style_trials.py)

本机依赖与已核验切片保留时，运行 `python tools/render_style_trials.py --combine` 可重建三段与合辑，Joker默认选择v2。脚本依赖本地OpenCV、NumPy、Pillow及`.cache`中的FFmpeg/ffprobe与音频切片；不是无缓存环境的一键安装器。

最终原画还需解决部分徽记、纹身与面部风格的一致性，正式成片仍需完整歌词对时与逐镜动作设计。先等用户评价本轮候选，再确定后续美术方向。

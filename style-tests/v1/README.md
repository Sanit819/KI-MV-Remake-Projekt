# 首轮彩色风格试片（留档）

状态更新：用户已选择回到 `storyboard/drawings-v1/` 的**铅笔灰阶＋红花留色**。本目录彩色候选保留作比较与制作记录，不再作为全片主用画风。它使用内置 imagegen 生成／修订原画，再渲染真实 60 fps 的轻微镜头运动；不是角色动画或完整 MV。

新的主入口为 [动作试验 v2](../../motion-tests/v2/index.html)（正在制作，尚未完成渲染核验）。本轮使用原曲72.5–102.5秒的连续30秒，拟验证花的分层风动、Rex四姿态头部动作及独立云层；当前状态与方法见 [项目首页](../../README.md)和[伪动画方案](../../docs/PSEUDO_ANIMATION_V2.md)。

从 [试听页](index.html) 打开，或直接播放 [38.3秒合辑](../../exports/style-tests-v1/00-style-trials-4k60.mp4)。合辑顺序为故土记忆→Joker同行→托付。视频和原始参考只保留本地；原画及提示词进入本企划 Git。

| 镜头 | 原曲区间 | 时长 | 画面与歌词 |
|---|---|---|---|
| Joker 同行 | 00:59.60–01:13.90 | 14.3s | Tasha／Baxter／Coster；启程、亲友（L05–06） |
| 红花与故土 | 00:30.85–00:44.85 | 14s | Tewy、白浅盆红花与故土记忆（L01–02） |
| 托付 | 02:58.00–03:08.00 | 10s | Tewy 压力手套与天空；局部实录音乐对应，不标未定时歌词 |

音乐从用户原始 FLAC 切取。前两段是硬字幕显示时段与独立信号比对支持的语义选段，不是逐字耳核。第三段是配合新构图的音乐试听，不声称完整重现原过场音画。没有添加歌词字幕或原游戏对白。

## 原画与提示词

- Joker 初稿：[01-joker.png](01-joker.png)／[提示词](01-joker.prompt.txt)。
- Joker 二维化修订：[01-joker-v2.png](01-joker-v2.png)／[修订提示词](01-joker-v2.prompt.txt)，本目录历史试听采用此图。
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

这批彩色候选仍有部分徽记、纹身与面部风格的一致性问题，保留在原审阅记录。后续按已选定的铅笔灰阶方向制作，正式成片仍需完整歌词对时与逐镜动作设计；不因这批历史试片技术检查通过而宣布新画风动画完成。

# 第三企划 · 太陽系デスコ

2026-11-07 开启。共享仓库：`Sanit819/KI-MV-Remake-Projekt`；独立工作区：`D:/myskills/updream/Taiyoukei-Disco`；Git 分支名：`太陽系デスコ`。使用独立历史起点，不继承第一企划文件，不混入第二企划未提交制作。

本阶段完成用户指定 MV 的全帧研究。第三企划的人物、改编主题和正式制作规格尚未设定，不自动沿用其他企划的剧情或分辨率。

## 阅读入口

- [本地逐帧查看器](index.html)：0–6095帧，键盘前后步进，重点帧导航、连续播放、51张连续图板。
- [主分析报告](docs/FRAME_BY_FRAME_ANALYSIS.md)：美术、动作、文字、节奏、段落与可借鉴的方法。
- [A段详细记录](docs/review-a.md)：0–68秒。
- [B段详细记录](docs/review-b.md)：68–136秒。
- [C段详细记录](docs/review-c.md)：136秒至结束。
- [审阅覆盖](analysis/review-coverage.json)、[技术核验](analysis/technical-audit.json)、[每帧索引](analysis/frame-index.json)。

## 参考与范围

源页：[BV1UfZ2YwEP5](https://www.bilibili.com/video/BV1UfZ2YwEP5/)。本次取得公开视频为854×480、30fps、6096帧，画面名义时长203.2秒；音轨解码长203.337167秒；页面204秒是取整标称。音视频末尾长度不同分别记录，未裁切或拉伸。

所有帧已计算差异、提取并纳入连续图板；三段审阅覆盖全部51页，重点帧另作854×480细看。该范围是**连续逐帧缩略图审阅**，不是全部帧的源尺寸逐像素审阅，也不是已完成逐句耳听／歌词对时。源工程、独立原画数量、角色官方设定与音乐BPM均未据此认证。

完整视频、音频、逐帧JPEG和图板只存本地，并由`.gitignore`排除。Git记录脚本、研究文本与结构化证据。仓库干净检出不会自带参考画面；本地`index.html`依赖下列重建步骤。

## 重建研究包

运行环境：Python、requests、OpenCV、NumPy、Pillow、FFmpeg与FFprobe。脚本默认使用此机器已有`vocaloid-style-mv-pipeline/_tools/ffmpeg/bin/`；换机器需先修改两处工具路径。没有使用浏览器Cookie或登录凭证。

```powershell
python tools/collect_reference.py
python tools/audit_reference.py
python tools/build_review.py
```

按顺序运行；不要并行执行采集和核验。公开接口以后可能改变，拒绝访问时应停止并记录，不能把旧缓存当作新下载证据。`audit_reference.py`将原始音视频流无重编码合并为本地`source/reference.mp4`，供播放器使用。

## 后续接续

先读`AGENTS.md`和主分析报告。用户当前只要求开第三企划与分析参考；已有少量舞姿循环、文字编排、段落例外的制作方法总结，但尚未开始第三企划正式原画、分镜或成片。第一企划冻结，第二企划保留现有30秒审查节点。

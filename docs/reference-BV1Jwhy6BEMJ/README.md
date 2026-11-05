# BV1Jwhy6BEMJ：同音乐逐帧对照与优化方案

2026-11-05。参考为野生大K的 [GPT6-Astra眼中的world.execute(me)](https://www.bilibili.com/video/BV1Jwhy6BEMJ/)，不是此前分析的 Claude 版，也不是 BV1RzHG6SEHy 紫色龙娘版。

- [打开本地逐帧讨论页](index.html)：86 个我方分镜，各有同音乐三时点对比图、原片连续帧条；支持镜号搜索、24fps 逐帧 / 12 帧步进、我方尾声单独查看、逐镜笔记保存与 JSON 导出。
- [视觉优化主提案](OPTIMIZATION_PROPOSAL.md)：优先级、完整分段索引与三段验证建议，尚未改写 v3 正片。
- [早段 0–80 秒](REFERENCE_EARLY.md)、[中段 80–150 秒](REFERENCE_MIDDLE.md)、[后段 150 秒至结束](REFERENCE_LATE.md)：实际可见证据、连续帧号、对比图与原创演法。
- [本片早段自查](OUR_EARLY_AUDIT.md)、[本片后段自查](OUR_LATE_AUDIT.md)：独立于新参考的 v3 源码 / 编码帧审阅。
- [UI 实测报告](ui-validation.json)：18 项交互检查通过，并查看桌面、手机与无参考尾声截图。

## 来源、覆盖与限制

公开接口无需登录返回的 AVC 副本是 852×480、24fps，共 5,086 帧，首帧 PTS 为 0.021 秒；原压缩文件保存在仓库外 `D:/myskills/updream/references/gpt-astra-BV1Jwhy6BEMJ/`。参考音频也已完整取得并解码进行八窗时序对应。没有使用登录凭据或绕过付费访问，也没有取得参考的制作源码或最高质量母版。

本片取已交付 v3 的实际 1080p60 MP4，13,100 帧。两片全部解码至 852×480 JPEG，保存在被 Git 忽略的 `exports/reference-BV1Jwhy6BEMJ-review/{reference,astra}/`。逐帧 UI 使用这些本地实际帧，不使用重渲染的假对照。

全片按 0.5 秒取样，生成 22 张总览、共 424 格；86 张三时点对照板及 86 张连续帧条以我方音乐区间为单位。连续帧条每张两组各 12 个原生参考帧：一组在我方区间起点附近，一组围绕区间内数值帧差峰。这不是自动认定参考剪切点，两组也可能重叠。

团队实际查看全部 22 张总览，并针对重点选择连续帧、对照板和原生大图；每篇分析列明范围。完整解码 / 逐帧数值测量不等于逐张人工观看。图像不能验证原作者的实际算法，亮度统计也不是审美评分或正式频闪安全测试。

映射：`reference_player = 1.000022626573 × astra_song + 0.055428086`。参考 `n` 帧对应 `0.021+n/24` 秒，取逆映射后在我方 60fps 成片中找最近帧。常量偏移方案八窗最大误差约 2.333ms；原生参考一帧约 41.667ms，不能据此宣称样本级同步。新增 5 秒警告版另显示 `astra_song+5` 的投稿时间。参考结束后没有对应图，界面明确留空；我们的独立尾声可继续查看到最后一帧。

来源记录及原始数值：

- [公开来源与媒体哈希](source.json)
- [八窗音频映射](alignment.json)；[初始严格相关阈值未全通过的记录](alignment-initial-raw-095.json)
- [全部镜号 / 帧号 / 时间索引](frame-index.json)
- [同音乐 12Hz 描述统计](metrics-summary.json)

低清 JPEG 用于本地分析；不作为我们的 MV 画面素材，不随成片转载参考视频。参考作者署名和页面保留。

## 本地使用

直接用浏览器打开 `index.html`。图板和连续帧在文档目录中；单帧滑块需要上述 `exports/` 内的全帧缓存。没有网络依赖或对外上传。本机笔记使用浏览器 localStorage，换浏览器或路径后可能看不到，讨论完可用页面按钮导出 JSON 保存。

## 复现

在 `D:/myskills/updream/KI-MV-Remake-Projekt` 执行。现有源文件和缓存保留，缺少文件时不要删除旧数据来绕过验证。

```powershell
# 原媒体已在本地时，只重做音频映射；0.90 阈值仅用于不同编码间的镜头对应。
& 'C:/Users/auscar/miniconda3/python.exe' tools/review/fetch_new_reference.py --align-only --minimum-correlation 0.90 --maximum-offset-spread 0.0208333333333333

# 全帧解码、数值测量、总览、86 段对照与连续帧条。
& 'C:/Users/auscar/miniconda3/python.exe' tools/review/analyze_new_reference.py

# 生成本地页面并在独立无头 Edge 中检查真实交互。
node tools/review/build_new_review.mjs --validate
```

依赖：项目现有 FFmpeg、Python NumPy / Pillow / Requests、Node 与 Playwright；路径见各脚本。首次公开获取使用 `fetch_new_reference.py --resume --minimum-correlation 0.90 --maximum-offset-spread 0.0208333333333333`。未来页面或公开接口可能变化，当前记录只证明本次取得并检查了这些文件。

当前成果是分析、讨论工具与提案。投稿版的警告和音轨交付另见 [发布材料](../publishing/README.md)，不能把封装更新当成这里提出的新演出已经完成。

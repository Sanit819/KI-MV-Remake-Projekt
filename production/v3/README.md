# 全曲第三版 · 算法也来跳舞

2026-11-08 已归档，先读 [ARCHIVE.md](../../ARCHIVE.md)。最终媒体与制作输入保留，旧导出及抽帧缓存已清理；以下记录制作过程与复建命令。

用户肯定第二版，追加YOLO、FC、CNN、RNN、卡尔曼滤波、匈牙利匹配、Transformer和ViT；随后指定检测框显示置信度，片尾原始“Astra × 大肥鱼”整行用紫色体现Astra所写。本版在原203.2秒内完成这些修订，故事顺序和末尾蓝笔改名保留。

追加白饭梗：检测段白饭置信度在0.97–1.00间缓慢变化，小dsQ等饭；Transformer段再被一碗饭吸引。饭碗为断口Canvas草稿，人物仍使用既有Q图，详见[RICE.md](RICE.md)。

[播放器](../../exports/v3/watch.html) · [27秒检测框](../../exports/v3/watch.html#t=27) · [148秒ViT](../../exports/v3/watch.html#t=148) · [195秒紫色署名](../../exports/v3/watch.html#t=195) · [MKV主片](../../exports/v3/taiyoukei-disco-v3-720p30-flac.mkv) · [交付记录](../../docs/DELIVERY_V3.md)。

1280×720 / 30fps / 6096帧。MKV内原FLAC逐包复制；浏览器看片使用静音画面MP4加原FLAC时钟。58组字幕上日语下中文。各版源码与紧凑QA保留，v1/v2旧媒体已按用户归档清理要求移除。

## 演出模块

| 时间 | 演出 |
|---|---|
| 27.049–39.849 | YOLO候选框追两主演和旧星，NMS筛掉重叠框；类别＋两位小数置信度 |
| 46.249–52.649 | CNN扫旧星像素图，3×3卷积→ReLU→pool |
| 62.649–69.049，158.249–161.449 | FC：原2→4→2神经银河，蓝紫信号汇向旧星 |
| 71.849–78.249 | Kalman预测乱飞的星，约76.8秒缺测仍留预测框 |
| 78.249–85.049 | Hungarian匹配星与两个角落Q的轨迹，1↔1关联 |
| 85.049–97.449 | RNN递归保存上一拍“ナ”，空输入也保留hidden |
| 97.449–110.249 | Transformer四个token随拍轮换query，注意力绕舞台走 |
| 148.249–154.649 | ViT：旧星小图→16块patch→token→CLS attention→重组 |
| 195.049–203.2 | 紫色原署名；ds蓝色划去Astra并写“啥龙”，Astra省略号 |

细节和原始资料见[TRACKING.md](TRACKING.md)、[CLASSIC.md](CLASSIC.md)、[ATTENTION.md](ATTENTION.md)。剧本边界见[REVISION_BRIEF.md](REVISION_BRIEF.md)。

所有算法画面都是舞台演示。YOLO候选来自已知演员几何，置信度是按节拍编排的显示分数，没有加载训练YOLO模型；IoU/NMS确实计算。Kalman/Hungarian与卷积、RNN、注意力是小型真实数值运算，有独立参考验算，不能宣称GPT/DeepSeek真实内部或商业模型表现。

## 制作与复建

从本项目目录执行：

```powershell
node tools/review_mv_v3.mjs
& ..\vocaloid-style-mv-pipeline\.venv\Scripts\python.exe -X utf8 tools/verify_tracking_v3.py
& ..\vocaloid-style-mv-pipeline\.venv\Scripts\python.exe -X utf8 tools/verify_classic_v3.py
& ..\vocaloid-style-mv-pipeline\.venv\Scripts\python.exe -X utf8 tools/verify_attention_v3.py
& ..\vocaloid-style-mv-pipeline\.venv\Scripts\python.exe -X utf8 tools/verify_neural_v3.py
powershell -NoProfile -ExecutionPolicy Bypass -File tools/render_mv_v3.ps1
& ..\vocaloid-style-mv-pipeline\.venv\Scripts\python.exe -X utf8 tools/review_encoded_v3.py
node tools/verify_player_v3.mjs
```

需要本地pipeline的Playwright/Edge、字体、FFmpeg/NVENC和Python环境，以及已忽略的原FLAC。PowerShell脚本使用UTF-8 BOM以支持Windows PowerShell5.1日文路径；不要另存为ANSI或无BOM。不得误用pipeline默认AAC音频处理。QA证据保存在qa/，大图/视频/完整日志只在exports/v3。

这仍是姿态切换、平移旋转与程序图形组成的有限动画。参考画风、人物、蓝紫点缀与红底黑字保持；没有新增人物位图。原15段故事时间与候选歌词时间不改，正式歌词时码仍为空，未声称逐音节听辨完成。

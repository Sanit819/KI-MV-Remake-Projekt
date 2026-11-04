# 原版 BGM 校准工具

这些工具只取得分析用音轨、测量波形并生成时间数据和图，不制作 MV 或新的歌曲。

运行位置为仓库根目录。当前分析环境为 Python 3.13，使用 NumPy、SciPy、Matplotlib、requests 和 imageio-ffmpeg，具体版本记录在 [requirements.txt](requirements.txt)。额外依赖位于本项目被忽略的 `.cache/python`；脚本会优先读取该目录，不修改用户其他项目的环境。

1. `python tools/analysis/fetch_bgm_reference.py` 取得 ProjectMili 的公开官方原版音轨并记录来源。音轨已存在时停止，防止覆盖本次校准基准。
2. `python tools/analysis/measure_bgm.py` 解码为分析用浮点 WAV，进行四路包络的九窗口相关，生成信号、阈值、瞬态数据和两张图。
3. `python tools/analysis/inspect_accents.py --offset -0.08350936080898314` 用另一组 FFT、步长和中侧声道频带检查高潮与末尾瞬态。频带包含伴奏，不是分离人声。
4. `python tools/analysis/calibrate_timeline.py` 从 Git 基线 `ae8b77a` 的 54 镜生成校准 JSON，应用实际偏移、重点段落安排和 60fps 帧取整；不覆盖分镜的叙事文字。

第 2 步需仓库旁既有参考路径 `../references/world-execute-me-lyric-mv/data/audio_features.json`。本地音轨和 WAV 位于 `media/audio/`，被 Git 忽略。`docs/audio/` 只追踪来源、测量数据、静态分析图和时间规划；脚本不写逐字歌词，不输出视频。

参考特征的 60Hz 精度、混合音频瞬态与具体词语之间的区别，以及近静默阈值的定义，均保留在测量 JSON 和 [BGM 校准记录](../../docs/BGM_ALIGNMENT.md) 中。

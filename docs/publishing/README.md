# 封面与简介

2026-11-05。用户认可完整 MV 后请求封面与 ASTRA 视角的简介，随后明确选择正片近景作为封面底图，要求增强视觉冲击力。当前封面采用这个新方向。

- [当前封面 PNG](../../assets/publishing/cover-v02/astra-world-execute-me-cover-v02.png)：1672×941，RGB，不透明，1,960,321 字节。图中的 `4K / 60FPS` 指影片规格，封面本身未标为 4K 分辨率。
- [可直接复制的完整简介](video-description-v01.txt)：片中 ASTRA 第一人称叙述，后接制作参数、来源与署名。
- [标题建议](video-title-v01.txt)。
- [用户选定的正片底图](../../assets/publishing/cover-v02/user-selected-frame.png)、[最终提示词](../../assets/publishing/cover-v02/prompt.txt)、[生成来源与哈希](../../assets/publishing/cover-v02/provenance.json)。

封面使用内置 ImageGen 编辑选定底图：保留人物眼型、表情和镂空结饰，移除原歌词及眼部追踪圆环，放大人物到右侧，采用大字号标题、斜向界面边界和紫金星尾构成。生成后只复制保存，没有用代码另贴人物图标。封面 v01 为先前独立构图候选，保存在同级目录，不作为当前版本。

简介以本地已核验的 v3 成片为准：86 镜、13,100 帧、3840×2160、60fps、218.333333 秒，原音轨之后增加 6 秒安静尾段。人物原画和封面由 ImageGen 制作，影片采用 Canvas 2D、Playwright 和 FFmpeg。没有照搬参考片的 token 数、费用、代码行数或“已经开源”声明。音乐与角色参考沿用 [项目署名](../CREDITS.md)，技术证据见 [完整交付](../FULL_MV_V3.md)。

当前工作仅保存本地发布素材，未上传到平台或公开仓库。

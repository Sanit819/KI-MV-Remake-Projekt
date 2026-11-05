# v3 动作与眼部修订

五种新动作与一张新脸通过内置 ImageGen 绘制。图内 GPT 镂空结饰与人体同次作画，无另贴角色标志。统一三墨的分色与矢量轮廓由 `src/mv3/art.js` 读取源图；原 PNG 和生成提示词不覆盖旧版本。

| 生产 key | 当前源图 | 使用语境 |
|---|---|---|
| earlyCircle | [early-circle.png](early-circle.png) | R10 肩臂连贯持笔描圆 |
| earlyTangent | [early-tangent.png](early-tangent.png) | R11 从上方持笔接触曲线切线 |
| earlyTravel | [early-travel-framed.png](early-travel-framed.png) | R15 食指拖动时间尺；自然肩部外轮廓 |
| midWait | [mid-wait.png](mid-wait.png) | R45–48 等待、悬停手与逐步像素化 |
| midReceive | [mid-receive.png](mid-receive.png) | R36/R40/R41 接收振动与交换控制 |
| eye | [face-eye-v02.png](face-eye-v02.png) | R50/R70/R71 原人设窄杏眼、短睫毛和细闭口 |

`face-eye-v01.png` 为用户明确否定的中间稿，不进入成片。`early-travel.png` 保留为修正构图前版本，当前使用自然肩部轮廓的 framed 版本。其余继承资产路径仍指向 v07/final/v06；不重复复制未修改图片。

生产清单由 [merge_v3_assets.mjs](../../../tools/render/merge_v3_assets.mjs) 合并三个 fragment，附加逐源分色阈值。眼图保留鼻影与闭口线；midWait 的中层阈值避开原图轻微色差，避免平涂变成碎斑。此步骤不新画五官、肢体或图标。

详细来源与全部提示词：[早段](../../../docs/production-v3/EARLY.md) · [等待与接收](../../../docs/production-v3/MIDDLE.md) · [眼部重画](../../../docs/production-v3/FACE.md)。原输出路径及 SHA 见 [early-provenance.json](early-provenance.json)、[mid-provenance.json](mid-provenance.json) 和眼部文档。

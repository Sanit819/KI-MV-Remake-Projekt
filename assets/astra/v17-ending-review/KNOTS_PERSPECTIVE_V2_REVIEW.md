# 结尾两表情肩饰 v2（候选待审）

使用内置 ImageGen 分别编辑原始两张完整头像，只请求修正右下肩饰的四瓣链环。每张原画先查看，再生成、保存并查看全图和局部对照。原文件均保留，SHA256与旧provenance一致；没有修改正式manifest、源码或视频。

| 表情 | 候选与提示词 | 实际查看的前后板 |
|---|---|---|
| 惊讶 | [PNG](recognition-surprise-knots-perspective-v2.png) / [prompt](recognition-surprise-knots-perspective-v2.prompt.txt) | [肩饰](knots-perspective-v2-inspection/surprise-knots-before-after.png) / [发饰与面部](knots-perspective-v2-inspection/surprise-protected-before-after.png) |
| 微笑 | [PNG](recognition-smile-knots-perspective-v2.png) / [prompt](recognition-smile-knots-perspective-v2.prompt.txt) | [肩饰](knots-perspective-v2-inspection/smile-knots-before-after.png) / [发饰与面部](knots-perspective-v2-inspection/smile-protected-before-after.png) |

两肩饰现在可见六带交织和开放角形中心，保留上臂袖口的纵向/斜向缩短，没有独立圆底章、照片式浮贴或把标准正面图直接覆盖。既有较正确的大型发饰列为保护对象，未请求重画。对照中，惊讶的睁眼瞳孔与小开口、微笑的闭眼弧与小笑口、软下颌、尖耳、深墨脸和发饰视觉保持，未见明显扭脸；review_bundle独立查看两张全图及对应局部板，支持作为待审候选。

两张均为原生1254×1254 RGBA、alpha 0–255，项目PNG与生成源逐字节一致。图像编辑仍造成面部/发饰区域细微像素差异，因此“视觉保持”不等于字节级局部修补或保证人体完全不变。局部像素差异、来源路径、提示词、原图保护断言和SHA256见 [knots-perspective-v2.provenance.json](knots-perspective-v2.provenance.json)。检查板仅裁切和放大；没有用程序贴图修画。没有数学拓扑认证，新头像锚点未测量，用户最终透视/表情认可仍待审核。

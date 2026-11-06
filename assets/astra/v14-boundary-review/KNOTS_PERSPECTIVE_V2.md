# A02 第一、三态：结饰透视修正版 v2

**候选待用户审核，未接入正式片。** 人体以用户已认可的 approach / withdraw 为基础，只请求修原绘 GPT 结饰；内置 imagegen 分别进行一次独立对象编辑，没有后贴 SVG、代码拼图或替换像素。

- [靠近边界修正版](A02-01-approach-knots-perspective-v2.png)：九处可见结饰；[完整提示词](A02-01-approach-knots-perspective-v2.prompt.txt)。
- [收手修正版](A02-03-withdraw-knots-perspective-v2.png)：八处可见结饰；[完整提示词](A02-03-withdraw-knots-perspective-v2.prompt.txt)。
- [来源、逐位置与漂移证据](knots-perspective-v2-provenance.json)。
- [第一态放大板](../../../exports/review-v52/knot-inspection/v14-01-perspective-v2.png)；[第三态放大板](../../../exports/review-v52/knot-inspection/v14-03-perspective-v2.png)。

两张生成结果及保存后的完整 PNG 都已实际查看，再逐位置查看共17个最近邻放大裁片。近肩与远肩不同朝向，远肩更扁；近腰与远腰宽度明显不同，远腰保留窄斜；裙摆各随局部布面，鞋饰随鞋背坡面。没有发现统一正面贴纸式章的明显问题；大结饰的开放中央负形与六向交织较旧旋涡结可辨。

小鞋饰仍标 `uncertain_small_source`，不声明放大后每个交叉都得到认证。强缩短的远肩/远腰标 `plausible_foreshortened_not_fully_counted`，允许中心负形窄斜，并承认无法从遮挡中补出六带。全部为栅格人工审查，不是数学拓扑证明或用户最终认可。

两图均为1189×1323 RGBA，输出与内置工具源文件SHA256一致。两张原人体图SHA256与审查前记录一致，没有覆盖。生成输出并非逐像素锁定：在结饰检查框之外，可见像素的最大预乘RGB差>8比例分别约43.70% /39.69%，alpha>128轮廓IoU分别0.97793 /0.98420；这包括线条、颜色和边缘漂移，不隐藏为“只改了几个像素”。姿态、完整人体与原构图已目视对照，但新图仍须用户整体审看。

后续如获准接入，仍需重新确认源图边界、手部锚点、墙线与字幕避让。未改manifest、renderer、时间轴或正式视频。

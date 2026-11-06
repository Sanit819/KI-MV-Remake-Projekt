# A07 结饰透视修订（01/03 v2，02 v5-alpha；待审核）

仅新增候选原画；原 A07 三图、正式 manifest、运行时源码和视频均未替换。使用内置 ImageGen，分别对三张现有全身图作结饰编辑，没有程序贴图、鞋面贴标或身体拼接。

| 动作 | 候选 | 提示词 | 局部前后检查 |
|---|---|---|---|
| 请求 / 01 | [A07-01-request-knots-perspective-v2.png](A07-01-request-knots-perspective-v2.png) | [prompt](A07-01-request-knots-perspective-v2.prompt.txt) | [9处对比](knots-perspective-v2-inspection/A07-01-knots-before-after.png) |
| 触壁 / 02 | [A07-02-contact-knots-perspective-v5-alpha.png](A07-02-contact-knots-perspective-v5-alpha.png) | [图标修订prompt](A07-02-contact-knots-perspective-v4.prompt.txt) / [透明提取prompt](A07-02-contact-knots-perspective-v5-alpha.prompt.txt) | [v4 9处对比](knots-perspective-v2-inspection/A07-02-v4-all-nine-before-after.png) / [v5-alpha保护区](knots-perspective-v2-inspection/A07-02-v5-alpha-protected-before-after.png) |
| 退回 / 03 | [A07-03-retreat-knots-perspective-v2.png](A07-03-retreat-knots-perspective-v2.png) | [prompt](A07-03-retreat-knots-perspective-v2.prompt.txt) | [9处对比](knots-perspective-v2-inspection/A07-03-knots-before-after.png) |

唯一拓扑参考为 `assets/astra/v02/openai-openwork.png`。参考用于约束六条交织带、交替上下穿插与开放中心，不用于照搬其正面投影。输入原图是编辑目标，角色人体与构图是保留项。

## 本轮实际观察

第一张完成后，先查看全图及九处放大，报告效果，再继续第二、三张；另由审核代理独立查看第一张全图与局部板。其意见是发饰、腰饰与裙摆的中心开放/交织明显改善，未见所有结饰统一正面化；鞋饰依然不能给出全部拓扑通过。

- 当前选出的三张候选，发、双腰、双裙摆的主要修改是把原先堵心的旋涡结改为可见开放角形中心和相互穿插的带状结构；饰件位置、流苏和布料连接关系视觉保持。不能把这条概括套用于被淘汰的02 v2/v3。
- 01与02近肩保持竖向斜面，远肩随抬起的上臂保持明显横向压扁；03双手收回后，双肩按各自袖口转为不同的竖斜面。没有为了展示六条带而把远肩展开成正面圆章。
- 双腰维持近侧较宽、远侧较窄的相对关系；裙摆两处仍分别跟随各自下垂/外翻布面的斜向。所有结饰仍由同一图像编辑模型画入源图，不是把标准logo覆盖到人体上。
- 已逐张查看生成的全身图及保存后的局部前后板，未发现新的额外肢体、手指数量变化、膝/踝断裂或鞋跟位置跳变；原有两手、前后腿与裙摆轮廓视觉保持。这里是视觉检查，不宣称非饰件区域逐像素不变。

## 尚待确认

两枚鞋面结饰原生只有约30–45像素，倾斜、压扁状态保留，但原生尺度不能可靠追踪每条带的全部上下穿插，所以六处鞋饰仍标记 **uncertain**。压缩最强的远肩也只作可见轮廓与投影检查，不宣称完成数学拓扑认证。用户对各处透视和整体观感的最终认可仍待审核。

图像编辑对非饰件区域有细微像素变化，不能把“视觉保持人体”说成字节级局部修补。完整差异统计记录在来源文件中；所有原图本身都未改动。

## 02的三处返修

独立复查看到02 v2的远腰、左右裙摆仍有中心浅点/穿中心带，因此该版不选用。v3定向重试仍未解决，保留为过程证据。v4用同一全图作为编辑目标，另外提供三处放大诊断图，要求明确拓宽开放孔且不改变外轮廓、远近宽度和布面斜向。生成后查看完整PNG及三处放大，再按原坐标查看全部九处；review_bundle独立查看全图和三处局部，确认前次堵心问题消失、远腰仍窄且裙面仍斜。v4列为待用户审候选，不代表完整拓扑认证。

## 文件与验证

三张候选均1024×1536、RGBA，alpha范围逐图记录；生成后的原生PNG逐字节复制进项目，没有程序后处理候选绘画。当前选用版本见 [knots-perspective-alpha-selected.provenance.json](knots-perspective-alpha-selected.provenance.json)。[v4历史选择记录](knots-perspective-selected.provenance.json)已标明02因透明污染不适合运行时；[v2初轮记录](knots-perspective-v2.provenance.json)保留并标明02已被替代。[此前三图总览](knots-perspective-v2-inspection/A07-selected-triptych.png)仍含v4，只作历史图标检查，不是当前alpha成品。

原“02 v4只有极低背景残留alpha”的说明不充分，现撤回：实际4K运行时出现人物外大面积黑碎块，v4背景有大量中高alpha，不能靠整体min/max或四角检查排除。v4现已标记不适合运行时，保留过程文件。新v5-alpha使用内置ImageGen仅请求背景提取，原生PNG未作程序改图。全部A07逐边、主体外区域、白底合成与alpha通道复核见 [ALPHA_REPAIR_REVIEW.md](ALPHA_REPAIR_REVIEW.md) 和 [v5-alpha来源](A07-02-contact-knots-perspective-v5-alpha.provenance.json)。

局部板仅按原坐标裁切并最近邻放大，供检查；不会被渲染器消费。未测量新掌心/手腕等动作锚点，未做正式运行时替换或视频导出。

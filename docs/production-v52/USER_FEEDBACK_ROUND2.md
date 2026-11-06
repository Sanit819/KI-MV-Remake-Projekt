# v5.2 第二轮用户原画反馈（2026-11-06）

## 最新追加：点读头部退回，其他四张新稿通过

用户在第二轮页面继续指出「点读态头也歪了」，随后明确「其他的ok」。据当前页面范围，A08_01-v6-head-redraw、A02_01/03-v3-leg-redraw、A04_02-v6-hand-redraw 四张新静态源已获认可；A08_02-v5 的头部被退回，正在按获认可 A08_01 的头骨、角耳和颈肩方向完整重画。截图为 `feedback-round2/04-pointread-head.png`。认可不扩大到未展示的新原画、旧退回图或组合视频。

新 [A08_02-v6 点读态](../../assets/astra/v13-book-review/A08-02-seated-record-v6-head-redraw.png) 已完成，**仅这张新图待审**；[完整提示词](../../assets/astra/v13-book-review/A08-02-seated-record-v6-head-redraw.prompt.txt) 和 [来源检查](../../assets/astra/v13-book-review/A08-02-seated-record-v6-head-redraw.provenance.json) 已保存。主要参考是已认可 A08_01-v6，旧点读图仅供手与展平书页动作参考。Root 与制作者实际看过新整图，头轴、下颌／颈肩和角耳方向与翻页态更一致；尚未动态验证，也不宣称像素锁定。已认可四张源没有改写。

本轮反馈优先于旧内部初审和历史「人体已认可」文字。

用户原话：

> A08_01头部变形
> A02_01 A02_03 腿不对 A02_02对
> 黄波形连接手部另一只手变形

| 槽位 | 本轮结论 | 处理 |
|---|---|---|
| A08_01 | `A08-01-seated-turn-v5.png` 头部退回 | 重新建立头骨、角耳、下颌与颈肩关系，整张人物重画；保留薄书与翻页动作方向 |
| A02_01 | `A02-01-approach-knots-perspective-v2.png` 腿部退回 | 以当前 A02_02 的人体为参考，整张重画接近边界姿态 |
| A02_03 | `A02-03-withdraw-knots-perspective-v2.png` 腿部退回 | 以当前 A02_02 的人体为参考，整张重画收手姿态 |
| A02_02 | 用户明确「对」 | 保留当前 `A02-02-contact-v6-perspective.png` 原字节作为本轮结构基准；不扩大为整组视频或所有饰件通过 |
| A04_02 | `A04-02-wave-receive-v5.png` 胸前另一只手变形 | 整体重画完整肩臂、前臂、腕掌和自然手指；不是仅数接线手有几根手指 |
| A08_02 及其他未点名图 | 本次无新增结论 | 原状态保留，未提问题不等于通过 |

截图副本在 `feedback-round2/`，仅作反馈证据，不作为待用角色资产。

所有人体问题使用内置 imagegen 完整重画，不在坏结构上拼接肢体。所有旧源、旧试片和正式 v5.1 保留。新图先作为独立静态候选供用户审看；不自动正式接入，也不沿用旧像素锚点。

旧 `candidate-map.json` 仍记录第一轮已编码试片的真实用图，不能把它当成第二轮最终批准清单。旧组合片 01/02/03 和静音总览包含这次退回的图，保留为历史演出记录；完整解码、音频对齐和黄线零间隙的技术结果不能覆盖本轮美术否决。

## 本轮首批四张新稿（已获用户认可）

[第二轮审核页](../../exports/review-v52/round2.html) 当前将已认可 A08_01-v6 与新待审 A08_02-v6 并排，将两张新 A02 放在未改 A02_02 两侧，并对照新旧波形手部。旧审核页已给退回源和受影响试片加历史／退回标记。

| 槽位 | 新原画 | 实际提示词 | 来源与检查 |
|---|---|---|---|
| A08_01 | [v6 头部重画](../../assets/astra/v13-book-review/A08-01-seated-turn-v6-head-redraw.png) | [prompt](../../assets/astra/v13-book-review/A08-01-seated-turn-v6-head-redraw.prompt.txt) | [provenance](../../assets/astra/v13-book-review/A08-01-seated-turn-v6-head-redraw.provenance.json) |
| A02_01 | [v3 探手重画](../../assets/astra/v14-boundary-review/A02-01-approach-v3-leg-redraw.png) | [prompt](../../assets/astra/v14-boundary-review/A02-01-approach-v3-leg-redraw.prompt.txt) | [provenance](../../assets/astra/v14-boundary-review/boundary-v3-leg-redraw-provenance.json) |
| A02_03 | [v3 收手重画](../../assets/astra/v14-boundary-review/A02-03-withdraw-v3-leg-redraw.png) | [prompt](../../assets/astra/v14-boundary-review/A02-03-withdraw-v3-leg-redraw.prompt.txt) | 同上 |
| A04_02 | [v6 胸前手重画](../../assets/astra/v18-wave-hand-review/A04-02-wave-receive-v6-hand-redraw.png) | [prompt](../../assets/astra/v18-wave-hand-review/A04-02-wave-receive-v6-hand-redraw.prompt.txt) | [provenance](../../assets/astra/v18-wave-hand-review/v6-hand-redraw-provenance.json) |

四图均用内置 imagegen 完整重画，最终 PNG 按生成源原字节保存。新静态清单为 [round2-static-candidates.json](../../data/production-v52review/round2-static-candidates.json)，不是活动渲染 manifest。

## 实际静态检查与后续界限

- Root 实看全部四张完整源图，以及未改 A02_02 参考。三位制作者各自检查其整图；另有一位审阅者独立看过新波形手与 A02_01。
- A08_01-v6 下颌／颈部连接更完整，头部较直立，薄书、翻页、两条非交叉腿脚仍可读。新头部轴线与未改 A08_02-v5 存在差别；尚未渲染新两态过渡，不能称无跳变。
- A02_01/03-v3 按 contact-v6 重建侧转骨盆和右前近腿、左后远腿。近腿可追到同侧鞋踝；远侧上段部分被裙摆遮挡，只能作可见结构判断，不能宣称完整骨骼认证。新 01 保留探手、新 03 保留收手。
- A04_02-v6 改为掌心贴胸、手背朝外。两位静态审阅者检查了角色左臂（画面右侧）肩—肘—前臂—腕—手背链条，四指朝左上、拇指处于右上桡侧的读法合理，未发现明确镜像错误；不只是数手指。自然遮挡仍允许。接线手的位置和角度也有漂移，旧 [263,511] 不能复用。新掌心约 [199,494] 仅为估测，后续需实际测量并重新跑连续接线检查。
- 图片有真实 alpha，生成结果的低 alpha 轮廓杂点仍可能贴近画布边。原始 source alpha、四角统计和出处见各 provenance；不因四角透明就宣称运行时三色描摹及4K合成全部通过。
- 尚未用新图更新试片、重测正式运行时接点或导出新完整影片。首批四图已获用户认可，新 A08_02-v6 待审；认可的四图、A02_02、旧 A08_02-v5、旧试片、旧候选映射及正式 v5.1 保持原字节。

文件检查：23 个原有保护文件哈希未变；首批四张与生成源逐字节一致，新 A08_02-v6 也由独立 provenance 验证源字节。第二轮页面图片已实际解码。独立 headless Edge 在沙箱内创建页面前退出，因此没有新的桌面／手机布局截图证据；本轮不宣称运行时或视频验证。首批页面快照检查在 `exports/review-v52/round2-qa/report.json`，后续点读更新另记 `round2-qa/pointread-update.json`。

任何内部静态检查均不替代用户认可。

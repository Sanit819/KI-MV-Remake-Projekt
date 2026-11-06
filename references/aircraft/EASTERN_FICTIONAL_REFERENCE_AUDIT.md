# 东侧与虚构机体：三视图资料审计

2026-11-06。用于本企划绘机约束；核心是 **Toprak 的 Su-57／022** 与 **Moon 11 的 X-40**。本轮下载及抽帧共 20 个素材文件，逐文件来源、SHA256、字节数、像素／SVG 尺寸、许可和读取时间见 [EASTERN_FICTIONAL_SOURCES.json](EASTERN_FICTIONAL_SOURCES.json)。素材均在 `source-assets/` 对应型号目录，单文件小于 1 MB。

**当前只有 Su-33 获得型号明确、顶／侧／前三视齐全的参考页，且它仍是模拟器手册图，不是制造商认证工程图。其余机型存在型号或正投影视角缺口，不能宣布已经满足“严格按对应三视图绘制”。** 本轮没有生成、补画或透视变换出任何假三视图。

## 可用程度

| 本片型号 | 已取得的资料 | 顶／侧／前三视验收 |
| --- | --- | --- |
| Su-57／Toprak 022 | T-50 原型时期三视 SVG＋预览；AC8 官方 1920×1080 展示图；022 实录细节／前上斜视／侧上细节 | **未通过：**原型图三视齐，但不是已核实的量产 Su-57 或 AC8 机模三视。 |
| X-40／Moon 11 | M28 侧斜视、M29 上方斜视及两张机首分离后截图 | **未通过：**全部是透视画面；完整机体三条正投影轴均缺。机首分离后必须单列。 |
| Su-33 | DCS 官方手册第 20 页／印刷第 14 页，Figure 3 | **三视齐全、型号明确。**可作形体参考，不能称 Sukhoi 原厂工程蓝图。 |
| MiG-29A | Kaboldy 的 Commons MiG-29 三视 SVG＋1920px 预览 | **型号未通过：**通用 MiG-29 顶／侧／前三视齐；原页未明确 A／9-12，不能直接升格为精确子型。 |
| Su-35S | Begemot 水贴定位图原 PDF＋第 1、2 页 PNG | **未通过：**明确标 Su-35S，有顶／底／左右侧，缺正投影前视。 |
| FA-36 Game | AC8 官方 1920×1080 正面透视；Gemma 上方斜视、入场卡和正面远景 | **未通过：**有多角度但没有正投影三视。作为备用资料，不自动指定为 Rex 座机。 |

## Su-57：T-50 原型与量产机分开核对

[Commons 原图页](https://commons.wikimedia.org/wiki/File:Sukhoi_T-50_3-view.svg)明确称画中为 PAK-FA T-50，作者 XaHyMaH 于 2012 年据专利图片重绘，现存修订为 2013 年。该页不证明它对应量产 Su-57，更不证明它与 AC8 机模一致。本轮未进一步核实其引用的具体专利号。[UAC 的 Su-57 产品页](https://uacrussia.ru/en/aircraft/lineup/lineup/su-57/)也区分原型阶段和后续量产交付，因此不得把名称沿革当成几何无差异的证据。

- [早期 T-50 三视预览](source-assets/su-57/t50-prototype-commons-3view-preview.png)：仅作历史形体基线；保留 [SVG 原文件](source-assets/su-57/t50-prototype-commons-xahyman-3view.svg)。作者授权 **CC BY-SA 3.0**，使用时保留署名与许可。
- [AC8 官方 Su-57 展示图](source-assets/su-57/ac8-official-su57-perspective.webp)：来自[官方 AIRCRAFT 页](https://enso-order.acecombat.jp/aircraft/)，通过公开 HTML 的 `data-index=30`／名称及页面 JavaScript 的图片映射核对。它能校对游戏机模的可见形体，但该图不是 Toprak 涂装，也不是正投影。
- [M18 01:30.5 的 022 细节](source-assets/su-57/su57-toprak-m18-0090.5-022-detail.png)、[01:32.5 前上斜视](source-assets/su-57/su57-toprak-m18-0092.5-front-quarter.png)、[M28 05:12.5 侧上细节](source-assets/su-57/su57-toprak-m28-0312.5-side-detail.png)来自[入场合集](https://www.bilibili.com/video/BV1qsHS6REg9/)。以 **022、金色线条和 22ND UNIT 卡**校对角色配机；后机身、腹部与全部标识仍不完整。

严格绘制前仍需同一版本 Su-57 的完整顶／侧／前参考，并逐项对照 AC8 可见外形。暂不能以这组资料批准一个号称量产机／AC8 精确复现的完整三视设定。

## X-40：原机与机首分离后分别存档

本轮官方 AIRCRAFT 展示页未列出 X-40，也未取得可验证的官方正投影图或可旋转游戏模型检视器。以下是用户指定实录的直接画面；X-40／Moon 11 对应另由已整理的 M29 HUD 读取支持。“Nightmare”完整名沿用已有社区补充边界，不把它标成此次官网确认。

| 素材 | 可看清的内容 | 不可据此决定的内容 |
| --- | --- | --- |
| [M28 04:51.5 侧斜视](source-assets/x-40/x40-m28-0291.5-side-perspective.png) | 原机飞越时的侧面层次、长机首与外侧构件 | 有运动模糊；不是正侧视，不能量取精确长度比例。 |
| [M29 00:32 上方斜视](source-assets/x-40/x40-m29-0032-oblique-upper.png) | 金色座舱罩、**011** 标号、前机身与可见翼面／连接结构 | 机体后部及一侧超出画面，不能由此镜补成完整顶视。 |
| [M29 09:04 分离瞬间](source-assets/x-40/x40-m29-0544-nose-separation.png) | 前方独立机首与后方爆炸主机的相对关系 | 火焰遮挡结构；不能把残骸轮廓当正常外形。 |
| [M29 10:24 燃烧机首](source-assets/x-40/x40-m29-0624-detached-nose-burning.png) | 分离后机首的近景及损伤阶段 | 不是完整 X-40；不能沿用为决斗前机体，也不能据火焰补画结构。 |

M29 来源：[BV19TaZ6vE5K](https://www.bilibili.com/video/BV19TaZ6vE5K/)。全部保留 852×480 原抽帧、字幕和水印，没有放大补纹理或试听音轨。后续正投影缺口仍是完整原机的顶／侧／前，以及分离机首自身的独立几何资料。

## 辅助型号与许可

**Su-33：**[Eagle Dynamics 官方手册](https://www.digitalcombatsimulator.com/upload/iblock/e28/DCS_Su33_FC3_Flight_Manual_EN.pdf)的 [Figure 3 页面](source-assets/su-33/dcs-su33-manual-p020-three-view.png)能同时核对鸭翼、机翼与尾翼关系、折叠分段和起落架。原 PDF 约 10.5 MB 未保留，只保存相关页的 144dpi 渲染，来源 PDF 的 SHA 仍记在清单。未找到开放再利用许可。

**MiG-29A：**[Commons 图页](https://commons.wikimedia.org/wiki/File:Mikoyan_MiG-29_3-view.svg)署名 Kaboldy，可追溯其所列 Airwar 图源，提供 CC BY-SA 3.0。保留 [三视预览](source-assets/mig-29a/commons-kaboldy-mig29-three-view-1920.png)和 SVG；仅凭早期窄机背外观不能替代对 A／9-12 的来源核对。

**Su-35S：**[Begemot／Hannants 原 PDF](https://media.hannants.co.uk/pdfs/begemot/72-055_2.pdf)是模型水贴定位资料，不是 Sukhoi 工程发布物。[顶／底图](source-assets/su-35s/begemot-72-055-2-p01.png)与[侧面图](source-assets/su-35s/begemot-72-055-2-p02.png)明确标 Su-35S，已排除带鸭翼的早期 Su-27M／Su-35 搜索结果；仍需补正视。未找到开放再利用许可。

**FA-36 Game：**[官方正面透视](source-assets/fa-36/ac8-official-fa36-perspective.webp)按同一 AIRCRAFT 页的索引 32 核对；Gemma 实录的 [01:59.5 上方斜视](source-assets/fa-36/fa36-gemma-m23-0119.5-upper-quarter.png)、[02:02.5 入场卡](source-assets/fa-36/fa36-gemma-m23-0122.5-unit-card.png)、[02:05.5 远景](source-assets/fa-36/fa36-gemma-m23-0125.5-front-perspective.png)补足状态对照。机翼状态须按对应镜头保存，不能把 AC3 的 XFA-36A、现实 X-36 或字幕正在发话的 Ventus 机体混入。

官方游戏图与第三方录屏保留原权利归属，未发现开放素材许可；本资料包记录研究来源，不把下载成功写成可直接转载的成品素材授权。后续绘制不沿用上传者的黄色标题、人物贴图、水印或 HUD，也不把未经核对的部分交给生成工具自由补全后称为严格复现。

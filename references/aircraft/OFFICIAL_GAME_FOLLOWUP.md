# AC8 官网机体资料定向复核

2026-11-06。针对用户追问的 X-40、Su-57、F/A-18F，复核日文官网实际 HTML／公开脚本、美国机型页、欧美宣传页与一个官方媒体包目录。检索结果已合并到本项目参考资料清单。

**官网有更多可用图像，也有官方素材下载和实体设定集；本次仍未取得这三型的完整正投影三视或可下载机体模型。**“官网未找到完整三视”不等于“官网没有参考图”，更不等于 X-40 不在原作中。

## 已查入口与结果

| 官方入口／读取范围 | 实际找到的内容 | 边界 |
| --- | --- | --- |
| [日文 AIRCRAFT](https://enso-order.acecombat.jp/aircraft/)：全部 32 个公开机型按钮字段、图片标签 | F/A-18F 索引 8；Su-57 索引 30。各有一张 1920×1080 主图和 120×120 顶视识别小图（未选中／选中状态）。 | 本次 HTML 没有 X-40／Nightmare 名称，也没有 PDF、ZIP 或模型文件链接；不能由此断言其他渠道没有。 |
| [日文公开 project.js](https://enso-order.acecombat.jp/assets/js/project.js)：机型页交互函数 | 左右箭头、点击和滑动都增减**机型索引**，把主图换成 `ss_N.webp`。 | 没有在此函数发现前／侧／顶观察角度数组；全脚本未命中所查的 GLB／GLTF／FBX／OBJ 模型文件或 GLTFLoader／model-viewer 标识。它是图片切换器，不是已确认的旋转模型查看器。 |
| [美国 Aircraft](https://www.bandainamcoent.com/games/ace-combat-8/aircraft)：公开 HTML | Su-57 Felon、F/A-18F Super Hornet 条目和静态图片。 | 未找到 X-40／Nightmare、对应模型文件或完整三视入口；`360` 字样来自 CSS 动画，不能当作模型旋转功能。 |
| [美国 Walkthrough](https://www.bandainamcoent.com/games/ace-combat-8/walkthrough)、[欧洲 Game Overview](https://en.bandainamcoent.eu/ace-combat/news/ace-combat-8-wings-of-theve-game-overview)、[欧洲 Online Overview](https://en.bandainamcoent.eu/ace-combat/news/ace-combat-8-wings-of-theve-online-overview) | 宣传视频、游戏截图和 F/A-18F 配装／飞行画面。 | 不是按正投影发布的三视图。 |
| [欧洲 Press Kit](https://en.bandainamcoent.eu/ace-combat/ace-combat-8-wings-of-theve/press)及 Online Overview 的公开下载 | 确有官方媒体包。对下述一个 ZIP 读取中央目录，见下节。 | 其余宣传包没有逐包穷尽；不能概括为官网无下载。 |
| [日文 SPECIAL](https://enso-order.acecombat.jp/special/)、[官方攻略入口](https://enso-order.acecombat.jp/special/webguide/)、[纪念壁纸](https://enso-order.acecombat.jp/special/wallpaper/) | 基本操作与 M1–10 攻略各 12 页图片入口；壁纸提供 9 种尺寸。 | 本次核了页面及公开图片链接，未逐页阅读两套攻略内图，不能宣称其内部绝无机体示意图。壁纸入口不等于三视资料。 |
| [日文 PRODUCT](https://enso-order.acecombat.jp/product/)、[欧洲版本介绍](https://en.bandainamcoent.eu/ace-combat/news/ace-combat-8-wings-of-theve-all-you-need-know) | **ACES at WAR A HISTORY 2029** 实体设定集；欧洲介绍称其为 208 页，包含概念美术、战史及开发资料。 | 未取得该书内页，不确认 X-40 是否收录，也不确认是否有这三型的完整三视。不能把销售说明当作已经读过内容。 |

## 三个机型的直接可用链接

- **F/A-18F：**[主图 ss_08.webp](https://enso-order.acecombat.jp/assets/img/aircraft/ss_08.webp)是后上方透视，能看见串列双座、翼面与尾部；[顶视小图 off_08.webp](https://enso-order.acecombat.jp/assets/img/aircraft/icon/off_08.webp)是 120×120 的识别图，尺寸包含底部文字与边框，机体本身更小。二者已实际看图，仍缺正侧与正前及足够精度的顶视。
- **Su-57：**[主图 ss_30.webp](https://enso-order.acecombat.jp/assets/img/aircraft/ss_30.webp)是前侧低角度起落架放下的透视图；[顶视小图 off_30.webp](https://enso-order.acecombat.jp/assets/img/aircraft/icon/off_30.webp)同为 120×120 识别图。不能将这张小图或旧 T-50 三视自动当作 AC8／量产 Su-57 精确三视。
- **X-40：**上述日美机型页本轮均未找到独立条目或图组。继续以已保存的 M28／M29 实录为透视与结构阶段参考；此项只描述官网检索缺口，不撤回 HUD 已确认的 X-40／Moon 11 对应。

选中状态的 `on_08.webp`／`on_30.webp` 与未选中状态属于列表按钮资源；公开脚本把它们用于当前项状态，并没有把它们定义成另一个观察角度。

## 已核一个官方媒体包

[2026-09-01 Online Overview 官方 ZIP](https://static.bandainamcoent.eu/press-kits/2026/AC8/2026.09.01_ACE_COMBAT_8_WINGS_OF_THEVE_Online_Overview_Trailer.zip)，总大小 **140,659,159 字节**。使用 HTTP Range 读取 ZIP 中央目录，没有下载整包：19 条记录中包含 15 个文件，分类为 Key Art 3 PNG、Logo 2 PNG、Screenshots 10 张（1 JPG、6 BMP、3 PNG）。

该目录未见模型格式、蓝图命名或单列设定图文件。包内截图没有逐张阅读，所以结论限于目录类型；这也不排除其他官方媒体包或实体设定集有进一步资料。

## 本轮检索边界

搜索限定 `acecombat.jp`、`enso-order.acecombat.jp`、`bandainamcoent.com`、`bandainamcoent.eu`，关键词包括 X-40、Nightmare、Su-57、F/A-18F、blueprint、3D model、設定。实际 HTML／JS 检查仅访问页面已经公开引用的资源，没有探测私有接口或猜测隐藏下载地址。

当前适合向用户说明：**官方网站能补充游戏外形与双座／涂装辨识，完整三视仍需继续按型号找；设定集是尚未阅读的官方候选来源。**现有缺口记录应保留，补图后再验收，不能用“官网图”这一标签代替视角、型号和精度检查。

## 本轮已保存的三张官方图片

2026-11-06 下载；原字节保存、未放大或重绘。来源均为前文链接的日文官方 AIRCRAFT 页实际引用／公开脚本明确映射的资源。版权归 Bandai Namco Entertainment 及相应权利人，未找到开放再利用许可。两张 120px 小图只作顶视轮廓识别，**不能作为精细三视图**。

| 本地文件 | 原始资源／尺寸／字节 | SHA256 |
| --- | --- | --- |
| [F/A-18F 顶视小图](source-assets/fa-18f/ac8-fa18f-top-icon-120.webp) | `icon/off_08.webp`；120×120；1,740 bytes | `7e4d8ecde412e180bbeae00acd91f336572221f2181b02d91c3e6812bd50dfb0` |
| [Su-57 顶视小图](source-assets/su-57/ac8-su57-top-icon-120.webp) | `icon/off_30.webp`；120×120；1,580 bytes | `f7ceb9e297e6e51611e5064fd5cecbab8962c94152601c9a20b2185ae67d6ebf` |
| [F/A-18F 官方透视主图](source-assets/fa-18f/ac8-fa18f-official-perspective.webp) | `ss_08.webp`；1920×1080；352,444 bytes | `8934718b63fa560f58f9e30424bce4fe4a080bc86b965e10263f4f038be38061` |

资源路径均相对于 `https://enso-order.acecombat.jp/assets/img/aircraft/`。Su-57 的 1920×1080 官方透视主图已在上一轮保存，本轮没有重复下载到素材库。未下载 140.7 MB 媒体包整包。新增来源已登记，图片原件保留在本地忽略目录。


## Su-57 制造商渠道的本次读取限制

补查了 [UAC Su-57 产品页](https://www.uacrussia.ru/en/aircraft/lineup/military/su-57/)及检索定位的 [Rostec 公开 PDF](https://rostec.ru/upload/iblock/c3a/jcqrh7d0ze3i32whydcy9n1eb1dp06ol.pdf)。搜索索引可见 UAC 介绍，但本次直接读取分别遇到超时／TLS 证书错误及网关／TLS 错误，未完整读到页面和 PDF 内容。因此这些渠道属于“本轮未能完整读取”，不能据此写成“厂商没有三视图”。抓取结果记录在 `.cache/official-followup/fetch-results.json`。

本片校对目标是 **AC8 实际 Su-57 机模**。生产批次、原型／量产差异应从游戏可见几何逐项判断，不预设游戏一定使用最新量产外形；现有 T-50 三视也不能只因名称不同就认定与游戏外形不符。

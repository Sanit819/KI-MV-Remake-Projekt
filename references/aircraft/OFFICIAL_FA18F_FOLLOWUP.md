# F/A-18F 官网资料定向补核

核对日期：2026-11-06。结论：**官网能找到更多外形依据；前轮“尚未取得”不能理解为“官网不存在”。本轮已从 USACE 官方服务器取得明确标注 F/A-18F 的顶视＋侧视，正视仍需同型互证。** 另取得美空军旧版官方手册的镜像三视页，其适用范围为 E/F 共用，不能把全部图形自动认定为精确 F。

## 本轮实际检查的官方页面

| 官方入口 | 实际发现 | 证据范围 |
|---|---|---|
| [Boeing Super Hornet / Growler 产品页](https://www.boeing.com/defense/fighters-and-bombers/fa-18-super-hornet-and-ea-18-growler) | 产品介绍、总体尺寸、照片；本轮页内未定位三视下载 | 不能据一次未定位断言整个 Boeing 网站无图 |
| [Boeing CAD 3-view 目录](https://www.boeing.com/commercial/airports/3-view) | 明确提供 plan/side/front CAD，但列的是民航机与 BBJ，没有 F/A-18 | 该目录不能解决军用 Super Hornet |
| [NAVAIR media/1621](https://www.navair.navy.mil/media/1621) | 已下载并看过 [FA18F_011.jpg](https://www.navair.navy.mil/sites/g/files/jejdrs536/files/FA18F_011.jpg)：清楚的双座 F 仰视照片 | 可核外形与座舱；是透视照片，不是正投影三视 |
| [NAVAIR E/F 产品页](https://www.navair.navy.mil/product/FA-18EF-Super-Hornet) | 明确 E 单座、F 双座；有 E/F 总体尺寸 | 文字能核子型号，不能代替图纸 |
| [美国海军 VFA-32 官网](https://www.airlant.usff.navy.mil/vfa32/) | 明确该队使用双座 F/A-18F | 独立军方子型确认，不是三视来源 |
| [RAAF F/A-18F 页](https://www.airforce.gov.au/aircraft/18f-super-hornet) | 明确 F 双座，长度18.3m、翼展13.6m、高4.9m | 精确 F 的公开尺寸，数值为网页的舍入值 |
| [USACE 2013 旧版 TSC 13-2 PDF](https://transportation.erdc.dren.mil/tsmcx/downloads/Military%20Aircraft%20Characteristics%20TSC%2013-2%20Dec%2013%20Rev%202.pdf#page=243) | 已完整下载，并渲染核对第243页“F/A-18F (Boeing)”顶／侧视 | 新取得的直接官网外形资料；页内没有正视 |

## 新取得的官方 F 型两视图

- 原始文件：`Aircraft Characteristics for Airfield Pavement Design and Evaluation — Air Force and Army Aircraft`，Technical Report TSC 13-2，December 2013；封面署名 Air Force Civil Engineering Center 与 USACE Transportation Systems Center。
- 取得方式：直接读取官方 `/tsmcx/downloads/` URL；没有登录或绕过身份验证。
- PDF 第243页标题明确为 `F/A-18F (Boeing)`。画面有顶视及带起落架的侧视，保留机翼、进气口、双垂尾、机背与长座舱外形。没有正视。
- 表格 A/B/C 给出 44.9 / 60.3 / 16.0；第11页定义尺寸单位为英尺，并说明翼展包括横向伸出翼尖的附件。第241页 F 型数据表用更细的 44.88 / 60.29 / 16.00 ft。这是出版物自己的显示精度差异，不应混成超高精度建模尺寸。
- 图上若干次要尺寸明确带星号 `NOT VERIFIED`；不将这些值作为确定约束。只用公开的总体外形尺寸和轮廓作绘机参考。
- 资料用途是机场道面规划，不能当厂商制造图、完整表面细节图或本游戏对应 Block 的完整验收依据。

本地原 PDF：`.cache/aircraft-western/usace-military-aircraft-tsc13-2.pdf`，11,831,902 bytes。

SHA-256：`11968bb1c2f20a5115cbff6fc30f08e7441d7011ff6246b70f82f93497a2ca80`

相关页已以 pdftoppm 180 dpi 无改绘渲染：

[source-assets/western/fa18f-usace-2013-p243.png](source-assets/western/fa18f-usace-2013-p243.png)，1530×1980，141,050 bytes。

SHA-256：`12f38d6f227b59e2961d7f8e7f0b48d3c3f662700bca4d3a151096c1cd6dcfec`

来源／许可边界：这是美国政府机构署名并仍可直接公开下载的2013旧档。未在本次检查的封面、前言和目标页发现开放图片许可证或图形的独立作者署名，因此保留原出处，仅作为内部外形研究参考，不把“能下载”写成可任意重发的授权。

版本边界：[USACE 当前目录](https://transportation.erdc.dren.mil/tsmcx/criteria.aspx)链接的是另一份 `May 2022 Change 2`，明确标为 CUI，要求 CAC。该新链接导向身份认证，本轮没有访问其内容，也没有尝试登录。**本轮使用的2013旧档与当前受限2022文件不是同一份；不将旧档称为现行版本。**

## T.O. 00-105E-9 线索核对

- 旧官网路径 `http://www.robins.af.mil/logistics/LGEDA/Documents/to00-105e-9.htm` 本轮不能读取。没有找到当前官方服务器上可直接下载的这一版第24分段。
- [空军官方技术命令管理文件](https://www.tinker.af.mil/Portals/106/Documents/Technical%20Orders/AFD-180215-00-5-3.pdf?ver=2018-02-15-102807-940)说明该救援资料后续版本通过注册权限分发；未尝试申请或绕过访问。
- [2006 Revision 11 封面镜像](https://www.0x4d.net/files/AF1/R11%20Segment%201.pdf)的公开检索正文明确记载 `Approved for public release; distribution is unlimited`。这证明那一旧版的发行标记，不能扩张为后续受限版也全部公开。
- 已取得检索定位的 [R11 Segment 24 镜像](https://0x4d.net/files/AF1/R11%20Segment%2024.pdf)。本轮只提取一般外形尺寸页，没有采集或整理救援操作、系统关闭、弹射或危险部件的步骤。
- 分段 PDF 第36页，印刷编号 `A/F-18.4`，标题 `AIRCRAFT DIMENSIONS-Continued`，适用范围明确为 `F/A-18E/F`，同时说明 E 单座、F 双座。画面有顶／侧／正三视，但**侧视呈单座轮廓，页内未分别给出 E/F 两个侧视**，所以不能当 F 专用整套三视；可作为 E/F 共用总体外形与正视的候选互证。
- 页标长度60 ft 3.5 in（18.38 m）、翼展44 ft 8.5 in（13.62 m）、高度16 ft（4.88 m）。本轮只是记录原刊标值，不强行让旧资料的小数与各官网舍入值逐位一致。

本地镜像 PDF：`.cache/aircraft-western/to00-105e9-r11-segment24-mirror.pdf`，6,450,566 bytes。

SHA-256：`3190f4dac3346f3e66909d76326b31e3e6b1358c526800094f090ef8f20cacb6`

相关页：

[source-assets/western/fa18ef-usaf-r11-2006-segment24-p36.png](source-assets/western/fa18ef-usaf-r11-2006-segment24-p36.png)，1980×1530，484,042 bytes。

SHA-256：`19101f141b890873d5e8fcff125e99558ee890ec54569f8fd45f40dc829cace5`

渲染器提示 Symbol/ArialUnicode 字体替代警告；已实际目视核对，机型适用标记、三视轮廓及主要英制／公制尺寸可读。无重画、补线或修改比例。

## 对现有缺口的更新建议

1. F/A-18F 从“没有到手的精确图”更新为“官方 F 型顶／侧两视已取得，E/F 共用正视候选已取得；待按统一比例核对与确认游戏外观对应”。
2. 不能直接把 USACE 图和救援手册拼合后就宣布全机通过；先核双座座舱长度、进气道、翼尖附件及同一量测口径。
3. “官网找不到”应改为“前轮未在常用产品页定位到”；本次已经证明定向查官方旧版技术公开资料可以补到实物图页。

本轮新增两张相关页图像，并已将来源、散列和适用边界合并到 WESTERN_SOURCES.json、WESTERN_REFERENCE_AUDIT.md 与资产需求表；图像原件仅保留在本地忽略目录。

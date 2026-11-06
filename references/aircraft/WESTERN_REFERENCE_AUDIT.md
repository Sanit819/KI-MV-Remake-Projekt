# 西方机型参考资料核验

核验日期：2026-11-06。本轮已完成有界资料收集与实际图像检查，**尚未有任何一型通过“精确子型号、顶／侧／正三视均已取得并核验”的完整门槛**。这不是禁止继续写分镜；这些缺口应在对应飞机定稿绘制前补齐。资料库的图像不能证明游戏内中队配属。

## 当前可用范围

| 机型 | 已获得且检查过的内容 | 仍缺什么／使用边界 |
|---|---|---|
| F/A-18F | 澳空军官网明确双座（飞行员＋武器系统官）和尺寸 | 精确 F 完整三视未取得；E 单座图、C/D 老大黄蜂图不可替代 |
| F/A-18C | 国防刊印刷26页明确 C 侧视；同图有 D 侧视及未单独标型的顶／正视；另有通用 Hornet 低清三视 | 顶视座舱较长且分段，不能不核对就当 C；须补精确 C 顶视／正视及座舱细节 |
| F/A-18E（备用） | Newresid 三幅明确 E 型侧视涂装图 | 只有侧视；不是 F 双座图；顶／正视待补 |
| Rafale M | 国防刊和 Newresid 图均有明确 M 侧视；国防刊能对照舰载前起落架 | 同页顶视为双座 B，正视未单独标 M；不能拼成 M 合格三视 |
| F-4E | 已下载并看过顶／侧／正完整低清线图 | Commons 正文明确为 E/F 家族，574×385；生产型 E 的具体构型和细节未核清 |
| F-16C | 官方 DCS 手册已缓存 | 尚未定位并核验精确 C 的三视图；泛型 F-16 图有机炮左右镜像警告，未采为正式几何依据 |
| F-15C | 已保存通用 F-15 线图来源元数据 | 图像下载失败；未获得精确 C 三视；元数据不等于可用图纸 |

## 已落盘图像与原始出处

### hornet-generic-usarmy

- 文件：[hornet-generic-usarmy.png](D:/myskills/updream/Hortus-Regis-Alti/references/aircraft/source-assets/western/hornet-generic-usarmy.png)
- [来源页](https://commons.wikimedia.org/wiki/File:McDonnell_Douglas_F-A-18_Hornet_3-view_line_drawing.png)；作者／出版方：U.S. Army airdefense.bliss.army.mil; individual illustrator unspecified。
- 范围：Generic legacy F/A-18; C subtype not established。
- 实际检查：Inspected original raster. Front has central nose and flanking dark intakes; earlier rear-view interpretation was corrected. Low resolution; not a detail master.
- 许可：Commons PD-USArmy; public domain in US。
- SHA-256：`3f45f99425311841c2cf4b9ae4de536e73104d035c745ac3e8a8966f0d6c615b`；13,983 bytes。

### hornet-cd-hrvatski

- 文件：[hornet-cd-hrvatski-p26-detail.png](D:/myskills/updream/Hortus-Regis-Alti/references/aircraft/source-assets/western/hornet-cd-hrvatski-p26-detail.png)
- [来源页](https://hrvatski-vojnik.hr/wp-content/uploads/2017/10/hv_006_91_95.pdf)；作者／出版方：Hrvatski vojnik / Croatian Ministry of Defence; article Željko Hanich; diagram illustrator not separately credited。
- 范围：Side views explicitly F/A-18D and F/A-18C; top/front not separately subtype-labelled。
- 实际检查：Rendered and visually checked PDF page 14 / printed 26. The top canopy is elongated/divided; do not transplant it unchanged onto the single-seat C. C side profile is explicitly labelled.
- 许可：Public archive PDF; no open image-reuse license found. Internal reference only; public availability is not a reuse grant.。
- SHA-256：`447467b8c829076b9119f1a3b9e66c22906441ccc80da044369135646040a899`；685,157 bytes。

### super-hornet-e-profile

- 文件：[super-hornet-e-family.jpg](D:/myskills/updream/Hortus-Regis-Alti/references/aircraft/source-assets/western/super-hornet-e-family.jpg)
- [来源页](https://commons.wikimedia.org/wiki/File:F18Efamilyweb.jpg)；作者／出版方：Newresid; current Commons cropped revision by Beao。
- 范围：F/A-18E, explicitly labelled; NOT F/A-18F。
- 实际检查：Visually inspected: three painted E side profiles, single-seat canopy. No top/front.
- 许可：CC BY-SA 3.0; attribute creator/source, indicate changes, share alike for adapted image。
- SHA-256：`7925de5a046c8d8e26e951760809291716d9977e10d800243a7ac5bd2583838c`；304,046 bytes。

### rafale-family-newresid

- 文件：[rafale-family-newresid.jpg](D:/myskills/updream/Hortus-Regis-Alti/references/aircraft/source-assets/western/rafale-family-newresid.jpg)
- [来源页](https://commons.wikimedia.org/wiki/File:Rafalefamily.jpg)；作者／出版方：Newresid / Stéphane Lhernault。
- 范围：B, C and M each explicitly labelled。
- 实际检查：Visually inspected: M is bottom side profile; does not supply M top/front.
- 许可：CC BY-SA 3.0 selected from offered multi-licenses。
- SHA-256：`37515015e6fcff9a7d5f779e4a73a7d96f997db59b9a627c343f4fc81ea090bf`；273,250 bytes。

### rafale-m-profile

- 文件：[rafale-m-profile.svg](D:/myskills/updream/Hortus-Regis-Alti/references/aircraft/source-assets/western/rafale-m-profile.svg)
- [来源页](https://commons.wikimedia.org/wiki/File:RAFALE_M_-_illustration.svg)；作者／出版方：SixPlusbyLibé; own work。
- 范围：Labelled Rafale M; independent illustration, NOT Dassault official。
- 实际检查：SVG downloaded and XML checked; rendering not visually audited. Side-profile candidate only; no approval as geometric master.
- 许可：CC BY-SA 4.0。
- SHA-256：`5de5dbabfbe2fa74038d33bbd7e95bf882c3011c96c82d064bda3d4947486991`；8,823 bytes。

### rafale-bcm-hrvatski

- 文件：[rafale-bcm-hrvatski-p64.png](D:/myskills/updream/Hortus-Regis-Alti/references/aircraft/source-assets/western/rafale-bcm-hrvatski-p64.png)
- [来源页](https://hrvatski-vojnik.hr/wp-content/uploads/2017/10/hv_033_95-04.pdf)；作者／出版方：Hrvatski vojnik / Croatian Ministry of Defence; March 1998; drawing illustrator not individually credited。
- 范围：Mixed Rafale family: B-like twin-seat top, front not individually labelled, B/C/M named sides。
- 实际检查：Rendered and visually inspected PDF/printed page 64. M side and carrier nosegear useful; not an M-specific three-view set.
- 许可：No open reuse license found. Some photographs credit Dassault Aviation; that does not attribute the adjacent drawing automatically.。
- SHA-256：`1548d2e6a8c2b68371330156bb23b2f9535f479a5261854584c616bee1b6568a`；2,065,450 bytes。

### f4ef-usarmy

- 文件：[f4e-usarmy.png](D:/myskills/updream/Hortus-Regis-Alti/references/aircraft/source-assets/western/f4e-usarmy.png)
- [来源页](https://commons.wikimedia.org/wiki/File:McDonnell_Douglas_F-4E_Phantom_II_3-view_line_drawing.png)；作者／出版方：U.S. Army airdefense.bliss.army.mil; illustrator unspecified。
- 范围：File title F-4E; Commons description explicitly F-4E/F. Exact production E configuration not established.。
- 实际检查：Original 574x385 raster visually inspected. Complete outline views, low detail; subtype label broadens to E/F in metadata. Not exact E production master.
- 许可：Commons current PD-USGov military tag, public domain in US; original 2005 uploader comment mentioned possible restrictions without specifics。
- SHA-256：`ad9a9e872c806fc9f69d4920339a45e9621a93373cace2c9b11cc72f82d15d1c`；15,490 bytes。

## 尺寸与缩放边界

尺寸是几何核对的外部约束，不足以证明图纸的子型号、起落架状态或挂载状态。下表顺序为长度／翼展／高度（米）。

| 机型 | 长／展／高 | 出处与边界 |
|---|---|---|
| F/A-18F | 18.3／13.6／4.9 | [来源](https://www.airforce.gov.au/aircraft/18f-super-hornet)；Exact F, rounded published dimensions; pilot + WSO |
| F/A-18C | 17.07／11.43／4.66 | [来源](https://hrvatski-vojnik.hr/wp-content/uploads/2017/10/hv_006_91_95.pdf)；Legacy Hornet family caption below C/D drawing, not a separately typed C dimension table. Wingtip-store convention unspecified; not interchangeable with 40 ft 5 in span reported elsewhere. |
| F/A-18E | 18.3／13.7／4.9 | [来源](https://www.boeing.com/defense/fighters-and-bombers/fa-18-super-hornet-and-ea-18-growler)；Boeing Super Hornet E/F family public dimensions, rounded; not proof of F canopy geometry |
| Rafale M | 15.3／10.9／5.3 | [来源](https://www.dassault-aviation.com/en/group/about-us/civil-and-military-aircraft/)；Exact Rafale Marine single-seat section, rounded dimensions |
| F-16C | 待核／待核／待核 | [来源](https://www.shaw.af.mil/About-Us/Fact-Sheets/Display/Article/663884/f-16c-fighting-falcon/)；Primary fact-sheet candidate read earlier but later fetch 403; generic F-16 imperial/metric conversion differences and exact C block scope not resolved; do not set production geometry from this record. |
| F-4E | 待核／待核／待核 | [来源](https://www.haf.gr/en/equipment/f-4e-phantom-ii/)；Exact E primary dimensions not verified in this bounded pass; HAF page returned 403 |
| F-15C | 19.44／13.0／5.6 | [来源](https://www.af.mil/About-Us/Fact-Sheets/Display/Article/104501/f-15-eagle/source/f-15-eagle/)；USAF F-15 family A-D public figures (rounded). Not a C-only geometry certificate; later retry returned 403. |

旧 Hornet 国防刊翼展写 11.43 m，而美国海军一些页面写 40 ft 5 in；翼尖附件计量口径尚未闭合。海军部分事实页的英制／公制换算还存在不一致，不能为了给出一个数字而混用。F-16C 本轮也未把泛型页面的粗略换算当成精确尺寸。

## 原始 PDF、来源和许可

大 PDF 只保存在 `.cache/aircraft-western/`；正式参考目录仅保留相关页或裁片。PDF URL、原始 SHA、页码及像素裁切坐标完整写在 [WESTERN_SOURCES.json](WESTERN_SOURCES.json)。

- Hornet：Hrvatski vojnik PDF 第14页，对应印刷第26页；裁片保留 C/D 两个侧视标注、顶／正视与尺寸表。只裁源像素，没有重画。
- Rafale：Hrvatski vojnik PDF 第64页，印刷第64页，1998年3月。明确保留“混合 B/C/M”警示。图旁 Dassault 照片版权行不能自动充当线图作者证明。
- DCS F/A-18C 424页、F-16C 774页均从官方当前下载入口取得。只在前80／100页做文本检索，没有完成整本逐图检查；“未定位”不代表手册里一定没有三视图。
- 公共档案可读取不等于图片可自由重发；国防刊和 DCS 图暂仅作为内部研究参考。Commons 作品按逐项许可证保留作者与链接；衍生图若采用 CC BY-SA 原图，需处理对应署名、修改标识及相同许可要求。

## 下一步只补关键缺口

1. 优先补精确 F/A-18F 三视；其次锁定 F/A-18C 顶视座舱与正视。不能把 E、F、C 当同一轮廓换座舱。
2. Rafale M 需找到明确 M 顶／正视；Dassault 官网有 [三视图目录](https://www.dassault-aviation.com/en/passion/discovery/3-view-drawings/)，本轮仅确认入口，尚未取到 M 的具体条目。
3. M28 辅机暂按分镜占位；F-15C／F-16C 尚缺图，F-4E 只有低清 E/F 家族图。进入可辨识飞机绘制前再完成该型核验。

本轮未使用带 Distribution Statement C 的 F-4E 手册图片；没有抓取受限付费资料。没有生成、修改或定稿飞机画面，也没有提交 Git。

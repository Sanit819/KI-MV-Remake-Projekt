# A07-02 透明污染修复

真实4K候选帧 `exports/preview-v52-combination/stills-candidates/source-132.500.png` 暴露了v4人物外黑色碎块。检查源RGBA后，确认不是只有低alpha薄雾：v4的top/bottom/left/right 20px边带都有中高alpha，原始角色alpha≥128轮廓扩张20px以外，还有128,477个alpha≥128像素。此前只报告2–253范围并推测“极低残留”的结论不充分，现明确撤回。v4不再是可交渲染器的候选，原文件保留。

使用内置 ImageGen 的 `background-extraction`，以v4为唯一编辑目标生成 [A07-02-contact-knots-perspective-v5-alpha.png](A07-02-contact-knots-perspective-v5-alpha.png)，只请求透明背景提取、保护原画、人体和各处透视图标。没有用Python/代码改最终图片；最终文件逐字节复制自原生生成输出。原v4 SHA256、生成源SHA256、完整prompt、尺寸与alpha信息见 [provenance](A07-02-contact-knots-perspective-v5-alpha.provenance.json)。

## 实查

- v5-alpha为1024×1536 RGBA、alpha 0–254，四角alpha均0。已查看完整[象牙白底合成](knots-perspective-v2-inspection/A07-02-contact-v5-alpha-ivory-inspection.png)及[alpha通道](knots-perspective-v2-inspection/A07-02-contact-v5-alpha-alpha-inspection.png)：外部烟雾消失，实际暗色脸/衣面/翼膜保留；头角、发丝、袖与身体间、尾部与裙间、鞋跟间的背景空隙可透出底色。
- 同样主体外扩张20px区域的alpha≥128降至37个，全部位于现有左角尖(415..421,22..30)。该诊断沿用最早原图轮廓，角尖位置在此前图标迭代已略变，因此此37个是合法前景偏移，不是外部碎块。左20px边带全0；顶部/右侧/底部20px的少量非零对应角尖、掌缘、鞋与衣边接近画布边缘，不能把“边带有前景”直接判污染。
- 实看[脸、接触掌、胸前手、远腰和两裙前后板](knots-perspective-v2-inspection/A07-02-v5-alpha-protected-before-after.png)，姿态与已修图标的开孔关系视觉保持，未见明显新增人体扭曲；不宣称逐像素前景不变或全部拓扑认证。
- 01/03 v2也逐张查看白底合成，并作相同主体外诊断：两张区域内alpha>8像素均为0，未发现同级外部alpha污染，保留原候选不再生成。

数值证据为仓库 `exports/review-v52/knot-inspection/A07-alpha-repair-audit.json`，同时保存原始图/候选hash、四边分布与外部像素数。候选路径与hash已交audio_accents重建独立审核map及4K帧；实际运行时复查记录在完成后追加，源码alpha检查不能替代运行时结果。

## 实际4K复查完成

audio_accents重建独立候选map后，双方分别实际查看3840×2160源帧：`exports/preview-v52-combination/stills-alpha-fixed/source-132.500.png`（正文132.5/全片137.5秒）与 `source-133.400.png`（正文133.4/全片138.4秒）。两图人物外黑碎块消失，头角、发丝、翼尾、袖口外周干净；接触掌位置视觉正常。132.5秒审计为A07_02、actorCount1、contactReached=true。

另外实看未改01/03对应的 `stills-candidates/source-131.400.png`、`source-135.400.png`，没有同级污染，不需再生成它们。四张源帧尺寸/hash、正文/全片时间、审计路径、候选hash与独立manifest hash见 [A07-alpha-runtime-review.json](A07-alpha-runtime-review.json)。这是抽样实际合成检查，工具显示会缩小4K源图，不冒充逐像素全片人工检查；用户最终姿态/透视认可仍待审核。audio已收到可继续R53–55候选短预览的检查结果。

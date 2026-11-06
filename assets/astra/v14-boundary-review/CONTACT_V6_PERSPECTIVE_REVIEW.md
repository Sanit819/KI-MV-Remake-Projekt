# Contact v6：仅两处定向修订候选

[A02-02-contact-v6-perspective.png](A02-02-contact-v6-perspective.png)使用内置 ImageGen 编辑 v5 完整图，v02标准结图只作六带交织拓扑参考。按复核确定的最小范围，提示词只请求修近肩(588,402)与左裙摆(272,1107)，明确锁定其它饰件斜扁投影和人体。原v5未覆盖；[完整提示词](A02-02-contact-v6-perspective.prompt.txt)与[来源/哈希记录](contact-v6-perspective.provenance.json)均保留。

实际查看保存后的完整PNG、[两目标前后板](contact-v6-two-knots-before-after.png)、[脸与两手](contact-v6-protected-face-hands.png)、[近腰/远腰/远肩](contact-v6-protected-oblique-knots.png)。两处中心从小浅点变成较大的角形开孔，孔内透出紫色衣面；六带在孔周边相交，未要求孔一律黑色。远腰仍强竖窄，远肩仍斜扁，侧脸、侧掌、胸前手与全身姿态未见明显新增扭曲，没有把整套饰件变成统一正面圆章。

实测与观察边界：近肩饰外轮廓略增，受保护近腰孔内颜色从深紫偏向较亮紫，但其轮廓与平面基本保持；模型对其它区域也有细微像素变化，所以不能称严格只改两个像素区域。发饰、远肩、远腰、右裙摆与小鞋仍沿用窄斜/小尺度uncertain状态，没有因为生成结束而宣称全部拓扑通过。用户对透视与姿态的最终认可仍待审核。

候选1189×1323、RGBA、alpha 0–255，文件与生成源逐字节一致。原v5 SHA256与编辑前只读记录一致。没有对候选绘画作程序合成、贴标或后处理；裁切板仅供观察。候选路径/尺寸/hash已交给audio_accents用于独立审核版测锚点与短试片。本任务没有修改正式manifest、src或视频，没有导出全片，也没有冒用旧锚点为已验证新锚点。

# 大肥鱼的白饭插曲

用户新增“大肥鱼喜欢吃白饭”的性格梗。只在两个短窗口追加边角小演出，不改变故事、共画旧星/新星的关系、原翻转舞步、署名回击、字幕或时长。

- **30.249–39.849秒：** 左侧出现一碗白饭，小ds Q在下方等饭。tracking模块可给这碗饭加置信度0.97–1.00缓慢变化的白饭检测框。
- **101.449–106.249秒：** Transformer段左下的ナ tile被饭碗临时覆盖，小ds Q想着“饭！”，构成注意力跑到白饭的笑话。原attention计算和trace不变；视觉喜好梗不能解释为真实attention权重变化。

饭碗由Canvas填色和断口线段现场绘制：红底、白饭、深灰草稿线、一道鲸蓝碗纹，米堆轮廓有缺口。小ds Q直接复用已经通过的q素材左半边，不改角色图，不生成新脸。底部硬裁到y640，字幕从y642以下安全保留。

接口为`DiscoRice.draw(ctx,t,host)`及纯时间函数`DiscoRice.state(t)`。host需要C、line、text、ellipse、sprite。每次draw写`window.__riceFrame`，非窗口清null。state的`box`供检测模块使用：YOLO窗口为`{x:20,y:410,w:164,h:145}`；Transformer窗口向上10px。框是场景几何，0.97–1.00是编排的喜剧分数，均不声称真实模型推理结果。

建议绘制顺序：原场景 → attention → rice → tracking框；YOLO窗口没有attention演出，其他模块时窗互不影响。主引擎在30.249–33.449秒应取消原底角的大qCorner，避免与等饭的小Q重叠。

此模块不写入或修改Transformer的Q/K/V、softmax、FFN数值，也不改变tracking算法。需在整合截图上确认饭碗、小Q、YOLO标签及字幕间距。

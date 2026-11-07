# Transformer 与 ViT：第三版舞台模块

本模块只新增演出层，不改变歌词、原剧情时码、翻转舞步、旧星来历、末段六次共画与署名回击。实现为`engine/attention.js`，接口`DiscoAttention.draw(ctx,t,host)`与纯函数`DiscoAttention.state(t)`；非窗口返回null并清`window.__attentionFrame`。

## Transformer：97.449–110.249秒

四个边带token为HA、HA、ナ、!。当前query每拍跳到下一个；不同强度的连线沿外沿与底边绕行，流动点也沿线走。中间原角色继续翻转，字幕仍在原位置。“Transformer”标签在(640,554)，原HA在602，固定双语字幕在662/696。

每个token有4维固定embedding与正弦/余弦位置编码。计算先做LayerNorm，再将输入投影成Q/K/V，按`softmax(QKᵀ/√4)V`求attention；加残差后做LayerNorm、4→6→4 GELU前馈层并加第二条残差。边的粗细来自所选query的实际attention权重。参数固定，没有预训练或语言能力声明；这是单头单层教学encoder，非完整预训练Transformer。

## ViT：148.249–154.649秒

在原最终神经银河窗口里，两位仍在两侧跳舞，中间旧紫金星保留。其下方出现紫金旧星的8×8低分辨率示意图，拆成16个2×2小片，排为token条，再把attention汇向旧星，最后重组。没有提前展示新紫蓝五角星，也没有把人物脸切碎。

各patch包含2×2×3的RGB值，按行flatten并归一化到[-1,1]，经12→4固定投影；前置4维CLS token，加入17个固定位置向量，再通过与上面相同的单头encoder。CLS最终LayerNorm输出作为该玩具图像表示。输入图案为程序生成的已有旧星示意，不是对实际演员图像做识别；没有分类准确率或预训练ViT声明。

可复算trace包含原图、patches、patchProjection、patchEmbedding、classToken、position、tokens、Q/K/V、scores、weights、attention、residual、前馈权重/偏置与output/classRepresentation。动画位置和拍点速度是舞台参数，不能解释成真实推理耗时。

## 原始资料

- Transformer的scaled dot-product attention、multi-head概念及前馈/残差结构核对[Vaswani等，Attention Is All You Need，§3.1–3.3](https://arxiv.org/html/1706.03762v7)。本模块使用单头小型演示，并不复刻论文完整encoder/decoder。
- 图像patch flatten、线性嵌入、位置编码和CLS核对[Dosovitskiy等，An Image is Worth 16x16 Words，§3.1](https://arxiv.org/html/2010.11929v2)。本模块的2×2 patch与4维隐藏宽度是演示规格，不声称论文ViT-B/16规格。

## 布局与验证边界

host需要C、text、line、ellipse；不需要新的角色素材或额外字体。ViT时建议主引擎用旧星加两侧galaxyDancers替代同时显示整张FC网，避免视觉互抢。几何均位于字幕安全边界y642以上。独立数值核验与编码后可读性应以主任务QA为准；此文不把语法通过当作用户视觉接受。

# 第三版 FC / CNN / RNN 演出

`engine/classic.js`为独立、可任意跳转的Canvas模块，不修改v1/v2画稿、歌曲时长、正式歌词或署名回击。所有状态由歌曲时间计算，输入和固定权重保存于模块，不依赖上一帧播放。

## 位置与表演

- **CNN，46.249–52.649秒**：左边的小纸片是已有紫金旧星的7×7粗采样，3×3共享滤波器逐格扫过，留下5×5特征，再经ReLU和2×2最大池化缩成小块。只占x18–212/y190–616，不遮主角脸，也不提前画新紫蓝五角星。CNN标签42px；卷积结果是特征图，不被称为分类或星的生成。
- **FC，62.649–69.049及158.249–161.449秒**：原有神经银河顶部显示FC与2→4→2，继续复用v2真实全连接网络和权重/激活。只加标签，不另画覆盖主体的网络面板；148.249–154.649留给ViT。
- **RNN，85.049–97.449秒**：字墙右边的一小路“ナ→hidden回环→ナ”。每0.8秒前进一步；两种na token交替进入，每第四步故意留空，隐藏状态仍把上一拍记忆送下来，所以空一下仍然“まだナ”。圆点大小/亮度由实际hidden值驱动，输出“ナ”的字号由实际output[0]驱动；并非逐字音素对齐。区域x1062–1266/y192–600，底部字幕保持不动。

CNN/RNN为固定权重的教学玩具演出，没有额外训练，也没有声称真实角色模型内部或识别准确率。RNN的“ナ”是编排符号，输出值只控制图形，不冒充训练出来的日语文本生成器。

## 数学与可复核状态

CNN是7×7单通道二值输入，以Sobel式竖向边缘核`[[-1,0,1],[-2,0,2],[-1,0,1]]`、stride1、无padding做不翻核的互相关，得到5×5；逐元素`max(0,x)`，再2×2/stride2无padding最大池化得2×2。最后一行/列按valid边界不参与池化。原矩阵、核、卷积、ReLU与池化均暴露于`DiscoClassic.cnn`及当前`__classicFrame`。

RNN使用二维输入、二维hidden，`h_t=tanh(Wih*x_t + Whh*h_(t-1) + bh)`；读出`y_t=tanh(Why*h_t+by)`。初始hidden为零，16个确定输入预计算为可索引序列，每次查询返回input、previous_hidden、hidden、output和全部权重。零输入也经过递归项，不把记忆当作收到新的输入。`DiscoClassic.rnn`保存全部序列。

FC查询`host.getToyNetworkTrace(t)`或同名window接口，返回与背景实际使用相同的权重和激活。它是仿射层后接tanh；“FC”只指层的连接方式。

接口：`window.DiscoClassic.draw(ctx,t,host)`及`state(t,host={})`；host需要`C,line,text,ellipse,roughRect`，FC可提供`getToyNetworkTrace`。每帧draw把`window.__classicFrame`设置为当前trace，所有窗口外清为null。模块与宿主均负责ctx.save/restore，内容不进入y642以下字幕区。

## 核对来源

2026-11-07查阅官方资料，数学计算按这些定义实现，未从第三方摘要推断：

- [PyTorch Conv2d](https://docs.pytorch.org/docs/main/generated/torch.nn.modules.conv.Conv2d.html)：二维卷积层按互相关计算，stride/padding决定输出形状。
- [PyTorch ReLU](https://docs.pytorch.org/docs/2.15/generated/torch.nn.ReLU.html)：逐元素截断负值。
- [PyTorch MaxPool2d](https://docs.pytorch.org/docs/2.15/generated/torch.nn.MaxPool2d.html)：每个局部窗口取最大值。
- [PyTorch RNN](https://docs.pytorch.org/docs/2.15/generated/torch.nn.RNN.html)：Elman递归，当前输入与前一步hidden参与同一状态更新。
- [PyTorch Linear](https://docs.pytorch.org/docs/2.15/generated/torch.nn.Linear.html)：FC所用的仿射变换约定。

## 本模块检查

2026-11-07通过Node语法检查；以Canvas/host替身走完6096帧的draw调用，无异常，非演出窗口的`__classicFrame`为null。首次浏览器集成发现池化字段名不一致，已统一读取`pool.values`后重新跑完所有draw分支。

独立NumPy参考计算复核CNN全部卷积/ReLU/池化值以及16步RNN前状态、hidden和读出，绝对误差容限`1e-14`全部通过。池化结果为`[[3,0],[4,0]]`；首个零输入步骤3仍保留hidden约`[0.5120287143,-0.1470063445]`，证明递归计算未被空输入清零。

这些检查验证模块计算及调用路径。最终构图、字幕/人物遮挡、编码后抽帧由主任务集成审查，不把源码正确当作视觉通过。

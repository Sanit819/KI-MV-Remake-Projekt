# ASTRA 配色与 GPT 结形警告卡

2026-11-05，用户进一步要求：光敏警告背景换成属于我们作品的颜色，顶部星星换成 GPT 图标。

本版沿用已接受的 5 秒静止无声警告和完整中英文文案。背景改为本片深紫黑系，色值来自 `src/mv3/kit.js` 的 `C`（ink / panel / purple / paper / gold / muted / line），边缘补色为 `#130f1c`。紫色标题、象牙白正文、一小段暖金分隔线，不增加闪烁或运动。

顶部图标沿用 `assets/astra/v07/interface-openai.svg` 中与 `assets/astra/openai-blossom.svg` 相同的官方六环 path，仅去除描边并改为本片淡紫填色。保留六环镂空与准确外轮廓，不添加外圆边框或圆盘。这里是独立警告页 UI 标志，不改动人物饰品。

原 `warning-v01`、其参考截图、原 v3 成片及首版 warning / Hi-Res 输出全部保留，新文件另存 `warning-v2`。

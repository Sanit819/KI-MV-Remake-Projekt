# 太陽系デスコ · 全曲第一版

2026-11-07。Astra × ds，沿用用户已采纳的v5角色造型和不闭合草稿线。第一版已经制作成完整203.2秒的MV；用户尚未验收本版动画。

## 看片

- [本地播放器](../../exports/v1/watch.html)：可双击，用Edge/Chrome播放；直接读取原FLAC，视频为独立画面轨。
- [完整MKV](../../exports/v1/taiyoukei-disco-v1-720p30-flac.mkv)：1280×720、30fps、6096帧，H.264 + **原FLAC流复制**。218,795,017字节，约208.7 MiB。
- [制作与检查说明](../../docs/DELIVERY_V1.md)。播放器和成片均为本地产物，未上传。

## 本版内容

15个音乐段落覆盖原剧情九章：第一企划紫金旧星展开为舞会中心；双人换姿、纸校舍、冥王星迟到、Q版四角应援、字墙与舞台倒转；轨道弹开后握手接回；八行星绕行；末轮拟声段六次交替落笔，画出紫蓝新星，Astra留下额外的小弯，尾声新旧双星同场。

第一企划的旧星仍属于USER与Astra；ds在本作贡献蓝线，不改写旧星金色的来历。

背景与大字按用户最新截图的RGB众数设为 **#FF6452 / #323232**；白色人物，蓝紫仅局部点缀。[取样依据](../../references/user-palette/README.md)。58组歌词全部采用**上日语、下中文**固定字幕，最长行自动适配宽度，最后na-na段也保留字幕。原始歌词不改，显示窗口另存候选时间线。

六张动作资产由内置image_gen沿批准的v5参考派生：正反指向、拍手预备、牵手、持笔共画、Q版。原始v5没有改动。各资产、提示词与哈希见[清单](assets/generation-manifest.json)。这些新姿势尚未被用户分别确认。

## 制作范围与限制

这是完整姿势切换、平移/旋转、笔迹和文字合成的有限动画，不是6096张逐帧角色原画。共画时真实图中笔尖锚定线端，但人物会随笔尖整体位移；白纸内可见半身平切下沿和局部手臂遮挡。词界主要沿原MV视觉切词并补偿FLAC偏移，四个拟声内部边界是剪辑估计，未声明逐音节耳听对齐。

## 重建

保留项目下原FLAC，以及相邻的`vocaloid-style-mv-pipeline`已安装环境、`_demo`字体/Playwright和FFmpeg。执行：

```powershell
powershell -ExecutionPolicy Bypass -File tools/render_mv_v1.ps1
```

该命令会重建本地v1输出。渲染不传pipeline的`--audio`参数；最后明确映射`0:v:0`与`1:a:0`并`-c:a copy`封装MKV，避免误带FLAC封面或转成AAC。`tools/review_mv_v1.mjs`检查浏览器和全部字幕；`tools/review_encoded_v1.py`抽取编码后样点；`tools/verify_delivery_v1.py`做全解码、PTS和音频完整性校验。

## 来源与署名

- 原曲／词／曲／编曲：ナユタン星人；Vocal：初音ミク。使用用户提供的FLAC及日中歌词。
- 角色原型：《大AI和小AI们》BV1tE9XBbErS；ZipZipPipe，鲸娘设计上善无形，详见[角色来源](../../references/characters/CHARACTER_REFERENCE.md)。
- 视觉语法参考：官方《太陽系デスコ》MV BV1UfZ2YwEP5，保留来源研究与逐帧审阅边界。
- 制作工具：内置image_gen；NikusonP的vocaloid-style-mv-pipeline分析环境、字体与逐帧渲染器；自建Canvas2D时间函数引擎。实际未调用JIZURA或Blender。
- 字体：Dela Gothic One、Noto Sans SC（OFL），复用pipeline的`_demo/engine/fonts`及其许可证。

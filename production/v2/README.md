# 太陽系デスコ · 第二版

按用户对第一版的肯定与三项追加意见制作：保持剧情，增加错拍喜剧、神经银河，以及署名被ds涂改的尾声。

[播放全曲](../../exports/v2/watch.html) · [直接看尾声](../../exports/v2/watch.html#t=195) · [完整MKV／原FLAC](../../exports/v2/taiyoukei-disco-v2-720p30-flac.mkv)

203.2秒，1280×720／30fps／6096帧，日上中下双语字幕。原FLAC流复制，未转码。第一版全部保留，本版尚待用户审看。

三项变化：

- 副歌左右错拍、轻歪身、拍点突大，Q版排队乱入；冥王星挂“未分類”，拟声与倒转段增加边角表演，关键牵手和共画时段保持可读。
- 银河变成2→4→2的神经星点网，两人舞步驱动蓝紫输入。实际玩具网络的激活与权重驱动节点和连线；小型计算说明在[ENGINE.md](ENGINE.md)，不表示真实模型内部。
- 片名署名是认真连笔`Astra ×`潦草`大肥鱼`。195秒起ds发现、涂掉Astra、逐笔改成`啥龙`，最后退到左侧，Astra顶省略号，两颗星仍在。详见[SIGNATURE.md](SIGNATURE.md)。没有谐音括号解释上屏。

本版没有新生成人物图片，沿用v1六张姿势；签名为原生矢量笔画。仍是整幅姿态切换/位移的有限动画，共画和改名镜头可见半身下沿，未声称逐帧人体重绘或独立关节动画。

复建使用相邻已安装的vocaloid-style-mv-pipeline环境，在项目目录执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/render_mv_v2.ps1
```

PS1已保存UTF-8 BOM以兼容本机Windows PowerShell 5.1的日文路径。视频捕帧仍不传`--audio`，再用明确流映射及`-c:a copy`封装。浏览器播放器直接同步原FLAC与无声画面轨，没有另转AAC。来源和署名沿用[第一版制作说明](../v1/README.md)。

最终媒体哈希、抽样范围、保留输入校验与交接见[DELIVERY_V2.md](../../docs/DELIVERY_V2.md)及`qa/`。

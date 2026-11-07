# v3.2 · 五指、牵手与张量分片

[播放成片](../../exports/v3.2/watch.html) · [上传用 MKV](../../exports/v3.2/taiyoukei-disco-v3.2-720p30-flac.mkv) · [交付记录](../../docs/DELIVERY_V32.md) · [手部对比](qa/asset-hand-review.png)

本版补齐 Astra 外伸手的四根手指与拇指，重画中央两只手的握合结构。修正接在共用 reach 动作图上，三段所有调用共592帧均使用新版。v3.1 的补耳修正保持。

用户明确把中段从掌心切半的效果保留为小特性，并要求用已画好的握手图结合机器学习合理化。因此原 x836 裁切和人物走位不变，仅在手下方加入蓝紫 rank 0 / rank 1，以及“牵手已分片 / Shard(W) → all_gather / 牵手同步中 → 牵手已同步”。这是借用张量分片与通信概念的舞台笑话，不是实际分布式训练。术语依据 [PyTorch DTensor](https://docs.pytorch.org/docs/stable/distributed.tensor.html)，其中 Shard(dim) 转 Replicate() 使用 all_gather。

## 局部合成

内置 image_gen 的最终供图是 [assets/reach-hands.png](assets/reach-hands.png)，[精确提示词](assets/PROMPTS.md) 和 [来源/哈希/映射记录](assets/generation-manifest.json) 均保留。供图为1671×941，在内存中映射到原1672×941；不能整张替换原动作图。

| 用途 | 原图窗口 x/y/w/h | 改动像素 |
|---|---|---:|
| 中央相握的双手 | 760 / 442 / 130 / 113 | 10427 |
| Astra 外伸手 | 1378 / 516 / 126 / 118 | 9646 |

窗口外归一化 RGBA 均零改动。外手窗口内另以多边形保护原发梢461像素，保护区零改动。原图宽高、bounds 与 halfBounds 均保留；v3.1 四处补耳在前一步合成，六个既有科学/署名/CSS模块字节一致。

## 覆盖与复建

| 段落 | 30fps零基帧（含首尾） | 帧数 |
|---|---|---:|
| 开场牵手 | 78–239 | 162 |
| 中段分开再靠拢 | 3872–4217 | 346 |
| 最后副歌 | 4364–4447 | 84 |

1280×720、30fps、203.2秒／6096帧，H.264＋原FLAC，58组日上中下字幕。原15段故事、旧新共画星、白饭、检测置信度及紫色署名与蓝色“啥龙”结尾保持；没有小陈彩蛋。字幕继续使用原候选显示时码。

```powershell
node tools/review_mv_v32.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File tools/render_mv_v32.ps1
& ../vocaloid-style-mv-pipeline/.venv/Scripts/python.exe -X utf8 tools/review_encoded_v32.py
node tools/verify_player_v32.mjs
& ../vocaloid-style-mv-pipeline/.venv/Scripts/python.exe -X utf8 tools/package_qa_v32.py
```

浏览器检查与媒体全解码通过；编码后实际视觉观察范围见 qa 下审计记录。抽样不等于全部6096帧逐张人眼审阅或连续耳听。当前维护分支 `fix/taiyoukei-disco-v3.2-hands`，旧成片与归档点不动。GitHub推送和只读锁定继续暂停。

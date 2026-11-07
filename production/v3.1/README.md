# v3.1 · 补齐 Astra 右耳

2026-11-08，用户要求检查所有朝左动作并修正漏耳，只取耳朵附近的小块合成。全套六张动作图和备用图均已核查。小陈彩蛋已由用户取消，本版保持原有剧情与片尾。

[成片 MKV](../../exports/v3.1/taiyoukei-disco-v3.1-720p30-flac.mkv) · [播放器](../../exports/v3.1/watch.html) · [牵手](../../exports/v3.1/watch.html#t=6) · [指天](../../exports/v3.1/watch.html#t=8.1) · [拍手](../../exports/v3.1/watch.html#t=41) · [交付记录](../../docs/DELIVERY_V31.md)

1280×720、30fps、203.2秒／6096帧；原 FLAC 逐包复制，58组日上中下字幕。主片 SHA256：`ff312918f6162a68937c568c7e7dd2f0ff9ac098196d4b077c4734ece503c97e`。

## 实际修改

| 素材 | 处理 | 原图坐标窗口 x/y/w/h |
|---|---|---|
| pose-a 指天 | 补画画面左侧的 Astra 右耳 | 934 / 240 / 64 / 40 |
| reach 牵手 | 补画右耳 | 898 / 302 / 74 / 47 |
| clap 拍手 | 补画右耳，不碰手指 | 932 / 239 / 66 / 45 |
| fallback 备用图 | 同步修正备用路径，保留原红底 | 926 / 241 / 72 / 46 |
| pose-b / draw / q | 放大确认双耳存在，保持原图 | 不修改 |

`assets/` 中四张 PNG 是 image_gen 产生的局部供图，**不能整张替换旧动作图**。引擎先加载原素材，在 Canvas 内只复制表中窗口；保留原宽高、bounds 与 halfBounds，避免缩放或舞台位置漂移。每次初始化都会逐像素验证窗口外改动为0。备用 RGB 图还保留窗口内的原红色背景像素，避免矩形色差。

原图、已采纳的 v5 基准及 v3 引擎没有覆盖。图像提示词、来源与哈希见 [assets/generation-manifest.json](assets/generation-manifest.json)、[PROMPTS](assets/PROMPTS.md) 及 [追加提示词](assets/PROMPTS_ADDITIONAL.md)。

## 验证与复建

六个算法/署名/CSS模块与v3逐字节一致；film.js 的差异仅为局部耳部合成、QA接口和版本元数据。15段故事、58组字幕、重复帧确定性、七素材与四补丁断言通过。媒体30项、完整6096帧及FLAC解码、编码音频包/PCM一致性、播放器22项均通过。视觉检查为编码后抽样，不是全部6096帧逐张人工审阅或连续耳听。

```powershell
node tools/review_mv_v31.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File tools/render_mv_v31.ps1
& ../vocaloid-style-mv-pipeline/.venv/Scripts/python.exe -X utf8 tools/review_encoded_v31.py
node tools/verify_player_v31.mjs
python tools/archive/verify_archive.py
```

仍依赖相邻 pipeline、原 FLAC 与 v1 的素材/候选时间线。原 v3 的98项保留文件校验通过，旧归档分支与标签保持原提交；当前修复分支 `fix/taiyoukei-disco-v3.1-ears`。GitHub 推送与只读锁定按用户要求继续暂停，本版没有执行它们。

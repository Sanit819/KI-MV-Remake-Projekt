# v3 最终编码成片视觉抽查

2026-11-05。对最终 4K 母版实际解码出的 **19 张**精确帧逐张查看，覆盖用户本轮指出的早段动作、果蔬切面、完整等待姿势、五级时间、马赛克、眼部近景、伸手及最后一帧。未发现阻断交付的编码后回退。

母版：`exports/astra-world-execute-me-full-v3-4k60.mp4`，283,245,132 字节，SHA256 `fc5843f714c862d4a405f2a2cee58f958eaeb1597fe872dfe4300d0c1586e90b`。

| 区间 | 实际帧号（零基） | 本次实际观察 | 报告 |
|---|---|---|---|
| 早段，5 张 | 2100 / 2280 / 3180 / 4584 / 4818 | 连贯持笔肩臂、切线接触、拖动年代尺、茄子种子带、番茄种腔；双语可读 | [ENCODED_EARLY.md](ENCODED_EARLY.md) |
| 中段，8 张 | 6828 / 6897 / 6927 / 6959 / 6989 / 7019 / 7200 / 7296 | 完整等待动作；SECOND / HOUR / DAY / WEEK / MONTH；人物自身像素逐步覆盖；平涂无旧碎斑回退 | [ENCODED_MIDDLE.md](ENCODED_MIDDLE.md) |
| 脸与尾声，6 张 | 7500 / 9747 / 9840 / 10200 / 12582 / 13099 | 原设窄杏眼、I 内虹膜、鼻影闭口、完整伸手；新旧星区分；最后一帧仍共同作画 | [ENCODED_FACE_TAIL.md](ENCODED_FACE_TAIL.md) |

各组图像与抽帧元数据保存在本地 `exports/qa-v3-encoded/`；上述详细报告记录请求时间、实际帧号与实际时间。它们来自实际 MP4，不是源渲染器代画的截图；统一缩至 1920×1080 查看。没有把 19 张静帧说成全片逐帧人工观看、连续听审或原生 4K 逐像素审查。

连续状态与技术检查另见 [661 点渲染](../validation/astra-v3-runtime.json)、[中段 347 帧](../validation/astra-v3-middle.json)、[完整 4K 解码与音频](../validation/astra-full-v3-4k60.verify.json)、[全部帧时间戳](../validation/astra-full-v3-4k60.timestamps.json)。完整文件、来源与修订映射见 [交付说明](../FULL_MV_V3.md)。

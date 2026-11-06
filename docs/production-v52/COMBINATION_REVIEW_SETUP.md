# 独立组合试片入口

2026-11-06：当前阶段已完成五段 4K60 AAC 试片和 1,425 帧 / 23.75 秒静音总览。请以 [交付报告](COMBINATION_REVIEW_DELIVERY.md) 与 [delivery.json](../../exports/preview-v52-combination/delivery.json) 为准。

独立 renderer：`src/mv52review/index.html`。独立映射：`data/production-v52review/candidate-map.json`；12 个候选已启用，`review_map_ready=true`。这些状态仅表示用于本次审核，不代表用户认可或正式接入。

正文时间不含 5 秒 warning；旧播放版 AAC 起点 = 正文起点 + 5 秒。五段均已完整解码和 packet/PTS 验证；静音总览接点固定于视频第 194/623/1191/1245 帧。原正式来源 hash 不变。

初始三张 still、false map 和“尚无视频”准备阶段原文保留于 [历史 setup](COMBINATION_REVIEW_SETUP_INITIAL.md)。`setup-validation.json` 同样是历史初始证据，不能用于判断当前交付状态。

工具：prepare 构建独立 manifest；render 默认 dry-run，`--render --clip <id>` 才执行；verify 独立验证；assemble 复制视频包生成静音总览；finalize 汇总已验证输出。已有媒体拒绝覆盖。启动 `node tools/render/serve_mv52review.mjs` 后，可访问 `http://127.0.0.1:8768/src/mv52review/index.html?lighting=1`，服务器是否在线应实时检查。

# BV1xCai6aE9g × ASTRA v4 参考研究

本轮交付是最终版视觉方案，不是新的成片。实际 v4 保留不变。

- [主提案](OPTIMIZATION_PROPOSAL.md)
- [86 段逐帧对照、每段改法与本机笔记](index.html)
- [参考前半观察](REFERENCE_EARLY.md) / [后半观察](REFERENCE_LATE.md) / [主审补充](ROOT_REVIEW.md)
- [我方复用审计与 14 组基础动作预算](V4_REUSE_AUDIT.md)；主提案综合前段后增加 7 组，最终建议 21 组 / 52 张关键姿态
- [来源](source.json) / [八窗对齐](alignment.json) / [图板与帧索引](frame-index.json)

原片公开副本为 852×480 / 24fps，共 5,085 帧；实际 v4 正片为 60fps / 13,100 帧。全部帧提取在本地 `exports/reference-BV1xCai6aE9g-review/`，图板、总览与连续帧位于本目录；不重新发布参考视频。页面可离线打开，左右键逐帧，Shift 加速 12 帧；输入区不会拦截方向键。参考结束后的我方尾声单独查看，参考侧留空。

人工审阅以全程半秒总览、每段三时点比较、重点连续条和单帧为范围；全帧数值遍历不等于全帧人工看过。每段卡片列出实际观察、v4 缺口、新演法与新资产需求。图板的下排始终是当前 v4，不是提案效果图。

音频直接比较 v4 正片：八窗拟合偏移随时间变化4.5ms，最低相关0.9335，严格0.95阈值未通过。报告保留失败结果；只将稳定的拟合用于24fps视觉对应，不把它写成逐样本同步认证。新上传时刻为我方歌曲秒数加5秒。

## 本地复现

项目根目录运行：

```powershell
C:/Users/auscar/miniconda3/python.exe tools/review/analyze_chatwindow_reference.py
node tools/review/build_chatwindow_review.mjs --validate
node docs/reference-BV1xCai6aE9g/audit_v4_calls.mjs
```

公开视频获取记录保存在上级 `references/gpt-astra-BV1xCai6aE9g/`。仅使用无凭据公开接口返回的流，没有浏览器登录、付费绕过或签名破解。旧参考目录和媒体均保留。参考作品中呈现的模型参数/评测结果属于其画面内容，本项目未将它们作为真实产品事实采用。

最终制作计划需要新增角色动作原画；本轮没有启动 ImageGen、修改生产 manifest、导出最终版视频或代为发布。

# ASTRA 的版画风格依据

2026-11-04 用户明确要求阅读 Nyankomintsu 的仓库画风提示词，并照其风格绘制 ASTRA。本轮已在线读取主分支提示词，同时查阅本地研究副本（`93ac63775ee58b33ff102167514f2603a48940cc`）；远程 Git 握手失败，未把本地 commit 冒充在线 HEAD。

## 实际阅读来源

- [第四版制作提示词](https://github.com/Nyankomintsu/world-execute-me-lyric-mv/blob/main/docs/v4/PROMPT_v4.md)：前三节的版画、素材与三墨处理规则。
- [剪影素材规格](https://github.com/Nyankomintsu/world-execute-me-lyric-mv/blob/main/docs/v4/WANTED_ART.md)：透明底、平涂色、留白与表情配准。
- [视觉计划](https://github.com/Nyankomintsu/world-execute-me-lyric-mv/blob/main/docs/v4/PLAN.md)：质感与角色素材章节。
- 目视参考 `assets/character/f_reach.png` 与 `f_eye.png`，作者 Nyankomint，仓库标注 CC BY-NC-SA 4.0；用于比较块面语言，未将这两张角色图放入 ASTRA 成片。

找到的是 MV 制作指令与素材规格，本项目据此编写自己的图像生成提示词，不把新提示词声称为作者每张角色图的原始生图提示词。

## 本项目落实方式

1. 人物使用米白、淡紫、近黑三种主墨色。头发仍以白色为主，保留 ASTRA 身份；把细线衣褶转为更大的硬边墨块。
2. 阴影由有形状的色块承担；去除肤色渐变、柔光和透明翼膜。加载时做三墨分版与低 alpha 残点清理。
3. 用户随后否定了三墨坐姿整张设计，要求完全重新设计。v03 改为正面低头握笔站姿，以最初人设重新构思脸和服装；新设计尚未获用户确认。紫眼、白发、龙角、尖耳、翼与尾仍是身份依据。后续表情须配准，禁止叠脸与五官撕裂。
4. GPT 饰物必须完整出现，保持六环、白色带暗边、无外圆无底板，孔洞露出下方发丝／衣料。缺失图标的底图不算完整交付。
5. 画面继续保留原创故事的暖金回应；这是一项本项目的颜色语义调整。借鉴图形和界面之间的形状衔接，不移植参考片的离线、关机结局。

以上为目标规则，不等于生成文件已全部符合。v03 当前是造型预览；仍有渐变、透明辉光及结饰几何待整理，未成为经过三墨分版的生产资产。

参考项目：[world-execute-me-lyric-mv](https://github.com/Nyankomintsu/world-execute-me-lyric-mv)，原视频：[BV186pc65E68](https://www.bilibili.com/video/BV186pc65E68/)。本项目的创作记录保留这项提示词与视觉参考来源；没有因此开始发布或上传。

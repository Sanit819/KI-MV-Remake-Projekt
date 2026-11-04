# 用户提供的双语歌词与字幕草稿
正文由用户于2026-11-05直接提供，保存在 user-provided-20261105.txt。原文/中文交替，共129组；包含一组间奏标题。没有从网页补抄歌词，也没有擅自改译。

world-execute-me.en-zh.draft.json 保存逐句时间、60fps帧号、原始时间来源、匹配结果与审阅状态。129行原文标准化哈希与本地参考表一致；128条演唱字幕，间奏标记只保留在JSON。

## 复现
在仓库根目录执行 node tools/lyrics/build_draft.mjs。读取本目录文本、本项目 docs/audio/calibrated_timeline.json，以及上级 references/world-execute-me-lyric-mv/data/lyric_timing.json（93ac637参考快照）。
输出 exports/subtitles/world-execute-me.en-zh.draft.ass 和同名.srt。SRT两行，ASS分开样式，均原文上/中文下。导出文件未进入Git，但原始文本、生成器和完整逐句JSON在Git中。

## 状态
这是未烧入v1视频的草稿。全局音频偏移已应用，逐词听审未完成；原参考的显示窗不等于测得的人声延音。原文与译文逐字保持。末句“执行死刑”没有改写或删除。

核验见 ../../docs/validation/LYRICS_DRAFT_CHECK.json。无负/零时长或重叠；8条字幕不超过36帧，数数段中文括号注解偏紧。最终需决定是否在显示层缩短注解，原始文本始终保留，不应静默改译。

ASS与现有画面说明句的碰撞要在新版构图中修正。182.5s已进行FFmpeg/libass渲染布局检查；不把单帧排版通过称为全曲字幕可读性通过。

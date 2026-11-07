# 第三企划接续 · 全曲v1 · 2026-11-07

最新授权：用户要求借助本地vocaloid-style-mv-pipeline制作第一版；输出720p、30fps，FLAC不转别的，歌词上日语下中文，最新截图配色优先。具体制作和证据见[交付报告](DELIVERY_V1.md)、[生产入口](../production/v1/README.md)。

现有完整203.2秒/6096帧第一版：`exports/v1/taiyoukei-disco-v1-720p30-flac.mkv`；可双击的播放器`exports/v1/watch.html`。成片SHA256为387570654f878c622322fa36123070779d447be39e26e61cb6da1117e673cb43。H264画面+原FLAC流复制，音频编码包与PCM都与源一致；未上传。用户尚未验收此版动画。

配色固定#FF6452 / #323232，依据references/user-palette/original-mv-crop.png直接取样，覆盖旧转码色#FD5354。角色基准依旧是用户采用的art/style-tests/astra-ds-mv-style-v5.png；左ds、右Astra，无口Astra积极参与，ds双眼之间不要加独立横线。新增六张派生动作在production/v1/assets，不把新动作记作用户逐张批准。

第一企划旧紫金长尾星属于USER+Astra。第三企划让ds贡献蓝线，末轮拟声时两位真实交替画出紫蓝新星，保留Astra额外小弯；新旧星在尾声并存，不能把金色追认为ds。

全曲使用完整姿势切换与平移旋转、后景文字和程序笔迹，是有限动画。共画笔尖接触已核，但人物整体移动和半身下沿仍有贴纸感；局部手臂遮挡见交付报告。需要修改时另存下一版输出，不把技术通过当用户审美认可。

58组正式歌词原文和lyrics/lyrics.json未改，正式时间依旧null。production/v1/timeline保存独立候选（参考MV视觉时间减0.084125秒，四处拟声分界估计）；无逐句耳听/音素对齐声明。已有150BPM声学候选，不等于每拍人工校验。音源203.2秒保持完整。

检查：30项媒体核验通过；43个浏览器关键样点、全部58字幕程序核对、102个编码后2秒样点图板及六个原尺寸编码后细看；本地播放器起播/暂停/拖动/全屏/结束/重播通过。MKV最多1毫秒PTS量化差已记录，播放器约40毫秒样点时钟差不影响主MKV的原音轨。均不冒充连续听看片。

制作入口tools/render_mv_v1.ps1，复用相邻pipeline已安装环境。默认pipeline的音频AAC路径不能用于本项目。主片MKV必须显式-map 0:v:0 -map 1:a:0 -c:v copy -c:a copy；源FLAC有封面，不映射它。

已有研究入口index.html（与新片播放器分开）：6096帧计算、51页连续缩略图和99张参考原尺寸细看，见FRAME_BY_FRAME_ANALYSIS.md与analysis/review-coverage.json。参考媒体/音频/成片只在本地，Git忽略；脚本、文档和制作图记录在独立分支太陽系デスコ。

第一企划KI-MV-Remake-Projekt冻结HEAD 881e403fc3b76fa0d8fd0fe2a27c081710830f21且干净。第二企划Hortus-Regis-Alti仍是30秒待审节点，本轮没修改，勿自动续做。

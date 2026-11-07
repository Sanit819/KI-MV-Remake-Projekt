# 第一版画面引擎

原生1280×720 Canvas2D，30fps，203.2秒/6096帧。与vocaloid-style-mv-pipeline的`render_frames.mjs`合同兼容：`window.ready`、`window.renderFrame(t)`、`window.__zankoMeta`，输出`canvas#out`。

从`D:/myskills/updream`作为HTTP根提供文件，以便共享字体可访问。引擎入口为`Taiyoukei-Disco/production/v1/engine/index.html`；加`?watch=1`可显示播放器，直接加载项目原FLAC并用其currentTime驱动画面。渲染页面自身不编码或改写音频。

字体复用pipeline `_demo/engine/fonts/` 的Dela Gothic One与Noto Sans SC。新增绘制代码独立，采用时间纯函数、文字后景/人物前景、完整姿态保持与突换、四角Q版短事件、末段交替画星等方法。渲染器请使用Canvas2D可用的`--mode blob`，不使用需WebGL的默认raw通道。

素材期望：`../assets/pose-a.png`、`pose-b.png`、`clap.png`、`reach.png`、`draw.png`、`q.png`。每张左ds右Astra；原PNG不改，运行时可按半幅绘制独立角色，初次加载只读alpha计算内容范围。缺图时仅为烟测回退已批准红底v5，最终制作必须确认`window.__filmInfo.missing`为空且六张素材可用。

歌词从`../timeline/lyrics-candidate.json.entries`读取`id/ja/zh/start/end`，节拍从`rhythm-analysis.json.beats`读取秒数。词候选缺失时会明确在`__filmInfo.warnings`记录临时等分时间，不改正式歌词；最终渲染不得使用等分占位。

实现覆盖15个音乐段落、9章故事动作：紫金旧星、轨道/脚印、纸校舍、晚半拍冥王星、呼喊传星、拟声字墙、翻转舞台、短黑纸幕、麻花弹开/伸手接桥、八行星、末尾六次交替紫蓝落笔和新旧双星。最后共画从185.449秒开始、约193.3秒完成，之后只看结果。上述秒数为第一版剪辑，随候选词界复核可调整。

共画不另加浮空笔：`draw.png`两半各自以原画笔尖(735,806)/(931,814)为锚点，当前画者合成位移到正在生长的线端，另一个停在上一次端点；纸、线迹先画，真实手和笔在前景。Q版使用独立半幅alpha内容中心，保证四角事件在画幅内可见。

按用户最新参考截图调整背景为`#FF6452`、主字及线墨为`#323232`。全部58组歌词采用固定底部日语26px/中文23px双行，分别居中y=662/696，长句按1180px宽度自适应；无歌词间奏保持空白。共画新星上移113px至中心(615,523)，真实笔尖同步，纸桌在字幕区上方；`__subtitleFrame`供逐组显示校验。

限制：静态绘制的完整姿势在拍点切换，辅以合成位移/旋转，未声称逐帧角色原画。引擎技术测试和最终编码视觉审阅由主任务执行；词界证据以timeline目录说明为准。

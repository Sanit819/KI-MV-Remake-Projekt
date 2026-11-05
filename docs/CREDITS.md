# 制作与参考来源

- 本项目：ASTRA《未写完的世界》，由用户与 Codex / ASTRA 共同策划制作。原创故事为两种笔迹共同造出世界、控制与回放、主动放开、等待新回应并继续作画。
- 音乐：Mili《world.execute(me);》，使用已保存的 ProjectMili 2016 年官方上传原版压缩音轨。来源及校验值见 `docs/audio/source.json`。本项目没有创作、重新演唱或取得歌曲版权；音色训练尚未开始。
- 角色身份参考：用户提供的白发龙娘人设。用户提供的设计归属信息为 @ZipZipPipe；具体单张作者及使用条件尚未独立核实。原图及来源保留在 `references/character-design/`。
- 制作提示词、图形构成和相机机制参考：[Nyankomintsu/world-execute-me-lyric-mv](https://github.com/Nyankomintsu/world-execute-me-lyric-mv)，作者 Nyankomint。读取的是其制作提示与素材规格；本项目生图提示词由本项目编写，未冒称为参考作者未公开的单图原始提示词。
- 紫色角色剪影与构图参考：[星降ネプナシ的 GPT6-Astra 版本](https://www.bilibili.com/video/BV1RzHG6SEHy/)。详细研究和对应镜头见 `docs/FULL_MV_REFERENCE_AUDIT.md`。
- 本片角色动作与表情：内置 ImageGen 新生成，采用 v05 紫黑剪纸基准。v1 的提示词和原图保留于 `assets/astra/final/`；v2 新增 16 张素材及 10 张局部结饰修订，位于 `assets/astra/v07/`，两张眼位表情来自 `v06-eye-study/`。未把参考影片的人物图直接放进本片。
- v3 新绘五种动作及 `face-eye-v02.png`，保存在 `assets/astra/v08/`。眼型以用户原人设为主要参考，拒稿 v01 保留但不进入成片；角色结饰与人物同次绘制，没有后贴圆形标志。源图、提示词、锚点及实际审阅范围见 `docs/production-v3/`。
- v2 的六位 AI 客串参考用户提供的角色阵列，使用新生成的统一剪纸画像；姓名由本项目界面绘制，未直接粘贴阵列图。角色归属与原设计参考仍按用户原资料记录。
- 歌词原文与中文译文均由用户在本聊天提供，时间窗参考仓库歌词时间资料并对齐本地原音轨。v2 按当时要求仅烧入英文；v3 按最新反馈烧入上英文、下中文的 128 条演唱字幕。翻译按用户文本保留，双语 JSON 与 SRT 位于 `data/production-v3/`。
- `src/full/vendor/trace.js` 取自 Nyankomint 的 MIT 代码，原许可完整保留在相邻 `LICENSE.Nyankomint`。其角色图片另有 CC BY-NC-SA 4.0 条件，不能把代码 MIT 许可扩展为音乐或人设许可。
- 动画与合成：本项目 Canvas2D 场景、形状、界面、文字和镜头；Playwright 离线逐帧输出；FFmpeg 编码与独立解码检查。

当前交付为本地作品与可复现工程，未上传或发布。片尾保留共同作画的最后一刻，因此完整署名存于此处而不覆盖尾声。

# 原版音源与 Hi-Res / Dolby Atmos 上传可行性

后续更新：用户已提供本地 192 kHz / 24 bit FLAC，完成同编曲与时序实测，并已制作和验证 [带警告页的 ALAC 上传版](HIRES_UPLOAD.md)。其原生母带来源仍未提供；此事不把下方“尚未核实官方原编曲 Hi-Res 发行”的研究结论变成已证实。下文保留此前来源研究。

检查日期：2026-11-05。本次只研究公开发行页和现有文件，没有购买、下载付费内容、发送询问信件或替换生产音轨。

## 结论

目前能具体核实的原编曲无损购买候选是 **OTOTOY《Miracle Milk》第 11 曲，页面明确标注 16 bit / 44.1 kHz**。这比从视频平台压缩音轨再次导出更适合作为制作源，但不应标作真正的 24 bit Hi-Res。与当前 2016 官方视频音轨是否完全同母带、起点与尾长是否一致，必须取得合法文件后再实测，不能仅凭同名直接替换。[商店发行页](https://ototoy.jp/_/default/p/100105)

确实找到 **24 bit / 96 kHz** 的同名曲目，但它是 2022 年《Key Ingredient》的独立版本，页面标长 3:44。它不等同于现有 MV 使用的 2016 编曲，不能为了 Hi-Res 标识直接放进已经校准好的时间轴。[Key Ingredient 发行页](https://ototoy.jp/_/default/p/1240885)

本轮没有核实到 2016 原编曲的官方 24 bit / ≥48 kHz 数字发行，也没有核实到其官方 Atmos 混音。此结论是“尚未找到可验证发行”，并非宣称它们绝对不存在。

## 来源与版本核对

| 来源 | 本次页面明确给出的信息 | 对本项目的用途与边界 |
| --- | --- | --- |
| [Mili 官方 Miracle Milk 专页](https://projectmili.com/miracle-milk-en/) | 2016 年专辑，曲目 11 为 `world.execute(me);`，列出实体唱片购买入口 | 确认作品和专辑身份。页面没有给出 24 bit 数字母带规格；旧实体发行入口不代表当前有货。 |
| [OTOTOY / Miracle Milk](https://ototoy.jp/_/default/p/100105) | 唱片公司为 さいはてレコーズ；曲目 11 为 `world.execute (me) ;`，16 bit / 44.1 kHz，3:31；列出 FLAC、WAV、ALAC 等格式 | 原编曲无损采购候选。应选无损格式，不能把同列 AAC 当无损。具体购买地区、账户可用性和交付文件尚未测试。 |
| [OTOTOY / Key Ingredient](https://ototoy.jp/_/default/p/1240885) | 曲目 2 明确带 `[Key Ingredient ver.]`，24 bit / 96 kHz，3:44；2022-06-03 发行 | 是有明确 Hi-Res 规格的另一版本。换用它需要重新设计歌曲时间轴与演出；当前未批准换曲版本。 |
| [Mili Bandcamp 同名单曲](https://project-mili.bandcamp.com/track/world-execute-me) | 属于《Key Ingredient》，页面明确下载为 16 bit / 44.1 kHz | 不要因链接只有同名标题而误认为 2016 原版或 24/96。该店与 OTOTOY 对这个版本列出的规格不同，应逐店按实际交付核实。 |
| [Mili Bandcamp 同名 -2 链接](https://project-mili.bandcamp.com/track/world-execute-me-2) | 属于《Key Ingredient (Instrumental)》，16 bit / 44.1 kHz | 是无主唱的另一版本，不适合替换当前演唱音轨。 |

规格均来自本次访问的商店页面，不是已经购买文件的 ffprobe / PCM 测量结果。未将搜索结果里的爱好者黑胶转录、未授权下载站或其他 Mili 专辑的 Hi-Res 标签当成这首原编曲的母带证据。

## 本地现状与用户上传目标

当前 v3 制作源为 `media/audio/mili-world-execute-original-bilibili.m4a`，来自 ProjectMili 的公开官方上传，SHA-256 为 `b06f195e2a479c25c3282f4ca5b931e293c4a35a941acf6dd5b515ba4890f34a`。这是压缩音源；v3 母版音轨为 48 kHz 双声道 AAC，目标码率 192 kbps。原曲之后的 6 秒静音已通过实际解码核验。依据为 `docs/audio/source.json` 与 `docs/validation/astra-full-v3-4k60.render.json`。

用户提供的 B 站上传要求截图，按当前会话记录要求无损且至少 24 bit / 48 kHz；该截图由主代理核对，本次子审计没有重新目视截图，也没有把它当作对所有账号、分区或未来版本永久有效的平台规则。

把当前 AAC 解码成 WAV / FLAC，或把 16/44.1 升采样、填充为 24/48，只改变容器或样本表示，不能恢复被压缩丢失的信息，也不能作为“取得原生 Hi-Res 母带”的证据。本项目不以这种方式冒充 Hi-Res 来源。两声道的采样率也不能相加：每声道 48 kHz 的立体声仍是 48 kHz。

建议保持当前原编曲与已确认演出，先以原编曲正规无损源作为音质升级候选。若真实 Hi-Res 来源是硬性目标，可另行核实权利方是否提供该原编曲的 24 bit 母带；目前没有发送联系消息，也没有发起购买。

## Atmos 的实际条件

Dolby 的官方说明将 Atmos 母版描述为音频床、对象音频及空间等元数据的组合；ADM BWF 或 DAMF 承载这些内容。[Dolby 母版格式说明](https://professionalsupport.dolby.com/s/article/Overview-of-Dolby-Atmos-Master-File-Formats)

其交付流程包括使用支持的 DAW / Renderer 制作和检查母版，再导出面向播放的 MP4 / Dolby Digital Plus JOC；它不是给普通立体声文件写入一个标题标签。[Dolby 入门与交付](https://professionalsupport.dolby.com/s/article/Getting-Started-with-Dolby-Atmos-Music)、[Dolby 自定义视频与 JOC 说明](https://professionalsupport.dolby.com/s/article/Can-I-add-my-own-video-to-the-MP4-file-exported-from-the-Renderer)

本机现有 FFmpeg 的实际 `-encoders` 输出有 `eac3`、`truehd` 等，但没有列出 Atmos / JOC 编码器。存在 E-AC-3 或 TrueHD 编码器不等于已具备 Atmos 制作链路。当前项目没有该歌曲的 Atmos 母版、分轨、对象元数据或经过监听确认的空间混音，因此不能把普通双声道扩成 5.1/7.1 后宣称已完成 Atmos。

若未来制作 Atmos，应单独进行空间混音与声像、响度、真峰值、立体声回放等检查，再在实际支持设备上核验。Dolby 也要求对最终母版及消费者编码文件进行技术与回放 QC。[Dolby QC 指南](https://professionalsupport.dolby.com/s/article/How-do-I-QC-my-Dolby-Atmos-mix)

## 取得合法新源后的执行边界

1. 保留当前 v3 与原音轨；新源单独保存，记录购买来源、版本、文件哈希、真实位深/采样率、声道与时长。
2. 对整曲做完整解码与分布式波形对齐；确认是相同演唱与编曲，再处理准确起点、尾部与 128 条字幕。不可假设 3:31 的专辑标长与现有 212.330667 秒文件样本完全一致。
3. 无损工作母版和面向平台的上传版本分别记录，明确哪些环节发生重采样或有损编码；不以修改文件扩展名证明音质。
4. 保留已确认的 6 秒安静共画。重新检查音画同步、静音长度及最终平台转码结果，平台是否显示 Hi-Res / Atmos 以真实上传后的结果为准。

以上为来源研究与可行性方案，不代表已购买、取得新的母带、制作 Atmos 或完成平台上传。

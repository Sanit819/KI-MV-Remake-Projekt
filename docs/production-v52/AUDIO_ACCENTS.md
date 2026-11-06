# v5.2 全曲音频重音测量

当前数据：`data/production-v52/audio-accents.json`。复现：项目根运行 `python tools/analysis/analyze_accents_v52.py`。本次只读音轨与正式视频，新增分析脚本、JSON 和本说明，没有改音乐或正式成片。

## 时间基准与现用音轨核对

- 现用 `exports/warning-v3-hires/user-flac-trimmed-padded.pcm24.wav` 自带 **5 秒警告静音**；192000 Hz、双声道、24 bit，共 42880000 样本/声道。
- `time_body` 从警告结束后正文零点开始；`time_full = time_body + 5`；`frame_full = frame_body + 300`。帧以最近 60fps 帧四舍五入。不要再减旧 `fixed_offset_s`，也不要再将 body 加 5 后传给正文渲染器。
- 正文总长 218.333333333s，全片 223.333333333s；额外 6 秒尾声从正文 212.333333333s / 全片 217.333333333s 开始。
- 将 padded WAV、现用 ALAC 和当前 v5.1 MP4 全曲分别解码为分析用 22050Hz mono float32，三份 **4924500 个样本完全相等，最大差 0**。这校核当前分析时间基准，不替代原有 192k/24-bit 原生无损证据。
- 另直接读取 WAV 原生 PCM 字节，前 5 秒及最后 6 秒均双声道严格全零。下采样仅在进程内分析，未写出降采样音乐或巨型中间 WAV。
- WAV SHA256: `a6cf40be4601f4bbdf44865c3bd6ed6ee051716ecb99c27342febc26d25812a4`。
- v5.1 MP4 SHA256: `19f4a76abfc61c1990d056d018e164ec61e93d147af1436f244cfa57261b7407`。

## 测量结果与边界

共 **1096** 个事件，正文范围 **0.114195–207.062041s**。类型统计 `{"snare": 223, "combined": 419, "kick": 191, "transient": 263}`；strong/high 且 kick/combined 共 **316** 个。所有事件按时间严格递增，ID 和正文帧唯一；静音尾和实测低能量区间均零触发。具体自动断言在 JSON `validation`，已全部通过。

方法为 22050Hz 单声道、1024 样本 Hann 窗（46.44ms）、128 样本 hop（5.805ms），计算正向 log 频谱差。前三个频率相邻 bin 最大值参考用于压低持续音与小幅音高移动；比较相隔两个 hop 的频谱。分 35–190Hz 低频、190–2200Hz 中频、2200–9500Hz 高频测重音；各带 p99 归一化、Gaussian 平滑、局部 0.459s median/MAD 自适应门限，RMS 低于 -38dBFS 不触发。40ms 内频带候选合并，105ms 内只保留较强的一次。

**没有固定 BPM 或周期格点补拍。** 旧 `calibrated_timeline.json` 和 `accent_candidates.json` 来源是旧压缩音轨且后者只覆盖局部窗口，本次只用于理解历史时间关系，没有把其事件复制进新数据。

`type` 的 kick/snare/combined 是低频/宽频攻击形态的工程标记，**不是已经分离或逐拍人工听认的真实鼓轨**；人声、贝斯与合成器攻击仍可能贡献峰值。`confidence` high/medium 依据多带一致性和局部峰显著性，`confidence_score` 不是概率。窗造成约 ±25ms 定位边界。没有声部拆分、逐拍人工听审或歌词/音素校准；mono 分析可能漏掉反相立体声瞬态。

## 接入建议与段落强度

事件字段：`id, time_body, time_full, frame_body, frame_full, strength(0..1), type(kick|snare|combined|transient), accent(strong|medium|light), confidence(high|medium), confidence_score, bands, rms_dbfs`。JSON 顶层 `schema_version = 1`。以正文时间消费，镜头推动仅建议 `accent==='strong' && confidence==='high' && ['kick','combined'].includes(type)`，其余用于低幅局部亮光；不要给全部事件配置全屏闪烁。strong kick/combined 还要求低频自身归一化峰值 ≥0.65、对局部门限的显著比 ≥1.6，避免仅由人声/高频攻击把微弱低频升级成镜头推动。

`quiet_intervals` 是 0.25s RMS 块低于 -42dBFS、持续至少 0.5s 的实测区间：207.500–218.333s。这些区间建议 gain=0。最后衰减/温暖尾声建议不响应鼓点；`sections` 的段落 gain 为实测能量配合保守剪辑建议，高潮也限制在 0.68，建议与现有段落强度取较低值。

| 正文秒 | RMS p90 dBFS | 事件数 | 模式 | 建议 gain |
| --- | ---: | ---: | --- | ---: |
| 0.000–15.033 | -5.17 | 87 | active | 0.42 |
| 15.033–29.333 | -4.07 | 70 | active | 0.42 |
| 29.333–44.100 | -4.44 | 80 | active | 0.42 |
| 44.100–58.900 | -4.16 | 80 | active | 0.42 |
| 58.900–73.700 | -3.66 | 75 | active | 0.42 |
| 73.700–88.400 | -5.97 | 73 | active | 0.42 |
| 88.400–103.200 | -6.41 | 72 | active | 0.42 |
| 103.200–118.000 | -3.79 | 71 | active | 0.42 |
| 118.000–132.700 | -4.16 | 77 | active | 0.42 |
| 132.700–147.500 | -4.18 | 92 | active | 0.42 |
| 147.500–162.300 | -5.13 | 85 | climax | 0.68 |
| 162.300–177.000 | -3.87 | 73 | climax | 0.68 |
| 177.000–191.800 | -3.68 | 79 | climax | 0.68 |
| 191.800–207.000 | -5.04 | 81 | active | 0.42 |
| 207.000–212.333 | -49.66 | 1 | quiet | 0.00 |
| 212.333–218.333 | -180.00 | 0 | quiet | 0.00 |

段落边界是视觉建议，不是音频自动识别出的严格曲式；每个真正事件仍来自当次音轨测量。`energy` 为该段 RMS p90 / 0.8 后限制到 0..1，仅作连续相对指标，不代表人耳响度或鼓强度。最终亮光效果仍需在实际渲染帧/视频验收，音频 JSON 完成不等于视觉成片完成。

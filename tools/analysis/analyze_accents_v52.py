"""Measure full-song mixed-audio transient accents for v5.2, without editing audio."""
from pathlib import Path
import collections
import hashlib
import json
import math
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / ".cache/python"))
import numpy as np
from scipy.ndimage import gaussian_filter1d, maximum_filter1d, median_filter
from scipy.signal import find_peaks

FFMPEG = ROOT / ".cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe"
SOURCE = ROOT / "exports/warning-v3-hires/user-flac-trimmed-padded.pcm24.wav"
ALAC = ROOT / "exports/warning-v3-hires/user-flac-trimmed-padded.alac.m4a"
VIDEO = ROOT / "exports/astra-world-execute-me-final-v5.1-cat-warning-hires-4k60.mp4"
OUT = ROOT / "data/production-v52/audio-accents.json"
REPORT = ROOT / "docs/production-v52/AUDIO_ACCENTS.md"
SR, HOP, NFFT, FPS, WARNING = 22050, 128, 1024, 60, 5.0
BODY_DURATION, FULL_DURATION, MUSIC_END = 13100 / 60, 13400 / 60, 12740 / 60


def file_hash(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(4 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def decode(path):
    result = subprocess.run([str(FFMPEG), "-v", "error", "-i", str(path), "-map", "0:a:0",
                             "-vn", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                            capture_output=True, check=True)
    return np.frombuffer(result.stdout, dtype="<f4")


def summarize_interval(start, end, times, rms, events):
    mask = (times >= start + WARNING) & (times < end + WARNING)
    values = rms[mask]
    rms90 = float(np.percentile(values, 90)) if len(values) else 0.0
    return {"start_body": round(start, 6), "end_body": round(end, 6),
            "start_full": round(start + WARNING, 6), "end_full": round(end + WARNING, 6),
            "rms90_dbfs": round(20 * math.log10(max(rms90, 1e-9)), 2),
            "energy": round(float(np.clip(rms90 / .8, 0, 1)), 4),
            "event_count": sum(start <= e["time_body"] < end for e in events)}


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    print("Decoding analysis-only 22.05 kHz mono audio and checking v5.1 timebase", flush=True)
    y = decode(SOURCE)
    comparisons = {}
    for path in (ALAC, VIDEO):
        other = decode(path)
        equal = len(other) == len(y) and np.array_equal(y, other)
        comparisons[path.relative_to(ROOT).as_posix()] = {
            "analysis_sample_count": len(other), "equal_to_source_sample_for_sample": bool(equal),
            "max_abs_sample_difference": float(np.max(np.abs(other - y))) if len(other) == len(y) else None}
        assert equal, "Current export differs from the analysis source: " + str(path)
    with wave.open(str(SOURCE), "rb") as f:
        native = {"sample_rate": f.getframerate(), "channels": f.getnchannels(),
                  "sample_width_bytes": f.getsampwidth(), "samples_per_channel": f.getnframes()}
        assert f.getframerate() == 192000 and f.getnframes() == 42880000
        warning_data = f.readframes(960000)
        f.setpos(41728000)
        tail_data = f.readframes(1152000)
    assert not any(warning_data) and not any(tail_data)
    print("Three audio sources match; native warning and final six seconds are exact zero", flush=True)

    frame_view = np.lib.stride_tricks.sliding_window_view(np.pad(y, (NFFT//2, NFFT//2)), NFFT)[::HOP]
    times = np.arange(len(frame_view)) * HOP / SR
    rms = np.sqrt(np.mean(frame_view.astype(np.float64) ** 2, axis=1))
    spec = np.empty((len(frame_view), NFFT//2 + 1), dtype=np.float32)
    window = np.hanning(NFFT + 1)[:-1].astype(np.float32)
    for first in range(0, len(frame_view), 2048):
        frames = frame_view[first:first+2048]
        spec[first:first+len(frames)] = np.abs(np.fft.rfft(frames * window, axis=1)) / (NFFT/2)
    logspec = np.log1p(spec * 100.0)
    # A wider frequency reference suppresses small moving tonal/vocal harmonics.
    ref = maximum_filter1d(logspec, size=3, axis=1)
    diff = np.zeros_like(logspec)
    diff[2:] = np.maximum(logspec[2:] - ref[:-2], 0)
    frequencies = np.fft.rfftfreq(NFFT, 1/SR)
    band_specs = {"low": (35, 190), "mid": (190, 2200), "high": (2200, 9500)}
    curves, candidates, thresholds, stats = {}, [], {}, {}
    active = (times >= WARNING) & (times < WARNING + MUSIC_END) & (rms >= 10**(-38/20))
    for name, (lo, hi) in band_specs.items():
        mask = (frequencies >= lo) & (frequencies < hi)
        flux = gaussian_filter1d(diff[:, mask].mean(axis=1), .65)
        flux[:4] = 0
        scale = max(float(np.percentile(flux[active], 99)), 1e-9)
        normalized = flux / scale
        local_median = median_filter(normalized, size=79, mode="nearest")
        local_mad = median_filter(np.abs(normalized - local_median), size=79, mode="nearest")
        threshold = np.maximum(.14, local_median + 1.65 * local_mad + .035)
        peaks, _ = find_peaks(normalized, distance=round(.085 * SR/HOP), prominence=.055)
        peaks = [int(i) for i in peaks if active[i] and normalized[i] >= threshold[i]]
        curves[name], thresholds[name] = normalized, threshold
        stats[name] = {"range_hz": [lo, hi], "raw_flux_p99": scale, "candidate_count": len(peaks)}
        for i in peaks:
            candidates.append({"index": i, "band": name, "value": float(normalized[i]),
                               "ratio": float(normalized[i] / threshold[i])})
    candidates.sort(key=lambda x: x["index"])
    groups = []
    for item in candidates:
        if groups and (item["index"] - groups[-1][0]["index"]) * HOP/SR <= .04:
            groups[-1].append(item)
        else:
            groups.append([item])
    events = []
    for group in groups:
        band_peaks = {}
        for item in group:
            if item["band"] not in band_peaks or item["value"] > band_peaks[item["band"]]["value"]:
                band_peaks[item["band"]] = item
        strongest = max(group, key=lambda c: c["value"])
        # Prefer measured low-band peak for a kick-like attack, keeping one event per cluster.
        low = band_peaks.get("low")
        middle = band_peaks.get("mid")
        high = band_peaks.get("high")
        has_kick = low is not None and low["value"] >= .32 and low["ratio"] >= 1.25
        has_snare = middle is not None and high is not None and middle["value"] >= .25 and high["value"] >= .25
        event_type = "combined" if has_kick and has_snare else "kick" if has_kick else "snare" if has_snare else "transient"
        chosen = low if has_kick else strongest
        index = chosen["index"]
        # Confidence is algorithmic evidence, not a listening-based probability.
        agreement = len(band_peaks)
        score = float(np.clip(.30 + .20*min(strongest["ratio"] / 2.5, 1)
                             + .25*min(strongest["value"], 1) + .125*(agreement - 1), 0, 1))
        strength = float(np.clip(max(c["value"] for c in group) * .76 + .08*(agreement-1), 0, 1))
        confidence = "high" if score >= .76 and agreement >= 2 else "medium"
        accent = "strong" if strength >= .72 and confidence == "high" else "medium" if strength >= .42 else "light"
        # A vocal/high-band spike must not turn a modest low-band peak into a camera kick.
        if accent == "strong" and event_type in ("kick", "combined") and (low["value"] < .65 or low["ratio"] < 1.6):
            accent = "medium"
        body = float(times[index] - WARNING)
        if not 0 <= body < MUSIC_END:
            continue
        frame = math.floor(body * FPS + .5)
        event = {"id": "", "time_body": round(body, 6), "time_full": round(body + WARNING, 6),
                 "frame_body": frame, "frame_full": frame + int(WARNING * FPS),
                 "strength": round(strength, 4), "type": event_type, "accent": accent,
                 "confidence": confidence, "confidence_score": round(score, 4),
                 "bands": {name: round(item["value"], 4) for name, item in band_peaks.items()},
                 "rms_dbfs": round(20*math.log10(max(float(rms[index]), 1e-9)), 2)}
        events.append(event)
    # Global refractory period prevents several band peaks driving duplicate visual accents.
    events.sort(key=lambda e: e["time_body"])
    selected = []
    for event in events:
        if selected and event["time_body"] - selected[-1]["time_body"] < .105:
            if event["strength"] > selected[-1]["strength"]:
                selected[-1] = event
        else:
            selected.append(event)
    events = selected
    for n, event in enumerate(events, 1):
        event["id"] = f"A{n:04d}"

    # Contiguous quiet blocks from measured RMS; never synthesize events on a beat grid.
    quiet_intervals, pending = [], None
    for block in range(math.ceil(BODY_DURATION / .25)):
        first = round((WARNING + block*.25) * SR)
        end = min(round((WARNING + (block+1)*.25) * SR), len(y))
        level = float(np.sqrt(np.mean(y[first:end].astype(np.float64) ** 2)))
        if level < 10**(-42/20):
            if pending is None:
                pending = first/SR - WARNING
        elif pending is not None:
            stop = first/SR - WARNING
            if stop - pending >= .5:
                quiet_intervals.append({"start_body": round(pending, 6), "end_body": round(stop, 6), "threshold_dbfs": -42})
            pending = None
    if pending is not None:
        quiet_intervals.append({"start_body": round(pending, 6), "end_body": round(BODY_DURATION, 6), "threshold_dbfs": -42})
    for interval in quiet_intervals:
        interval.update(start_full=round(interval["start_body"] + WARNING, 6),
                        end_full=round(interval["end_body"] + WARNING, 6), suggested_gain=0)

    sections = []
    boundaries = [0, 15.033333, 29.333333, 44.1, 58.9, 73.7, 88.4, 103.2, 118.0,
                  132.7, 147.5, 162.3, 177.0, 191.8, 207.0, MUSIC_END, BODY_DURATION]
    for start, end in zip(boundaries, boundaries[1:]):
        section = summarize_interval(start, end, times, rms, events)
        if start >= 207 or section["rms90_dbfs"] < -38:
            mode, gain = "quiet", 0
        elif section["rms90_dbfs"] < -21:
            mode, gain = "restrained", .25
        elif start >= 147.5 and start < 191.8:
            mode, gain = "climax", .68
        else:
            mode, gain = "active", .42
        section.update(mode=mode, suggested_gain=gain,
                       basis="measured section energy plus conservative editorial lighting ceiling")
        sections.append(section)

    checks = {
        "all_times_in_music_body": all(0 <= e["time_body"] < MUSIC_END for e in events),
        "strictly_increasing_times": all(a["time_body"] < b["time_body"] for a,b in zip(events, events[1:])),
        "unique_ids": len(set(e["id"] for e in events)) == len(events),
        "strictly_increasing_frames": all(a["frame_body"] < b["frame_body"] for a,b in zip(events, events[1:])),
        "full_time_equals_body_plus_warning": all(abs(e["time_full"] - e["time_body"] - WARNING) < 1e-6 for e in events),
        "frame_full_equals_frame_body_plus_300": all(e["frame_full"] == e["frame_body"] + 300 for e in events),
        "strengths_in_unit_interval": all(0 <= e["strength"] <= 1 for e in events),
        "no_events_in_final_six_seconds": not any(e["time_body"] >= MUSIC_END for e in events),
        "no_events_in_measured_quiet_intervals": not any(q["start_body"] <= e["time_body"] < q["end_body"] for q in quiet_intervals for e in events),
        "native_192k_stereo_warning_exact_zero": not any(warning_data),
        "native_192k_stereo_final_six_seconds_exact_zero": not any(tail_data),
    }
    assert all(checks.values()), checks
    counts = dict(collections.Counter(e["type"] for e in events))
    summary = {"event_count": len(events), "type_counts": counts,
               "accent_counts": dict(collections.Counter(e["accent"] for e in events)),
               "confidence_counts": dict(collections.Counter(e["confidence"] for e in events)),
               "first_event_body": events[0]["time_body"], "last_event_body": events[-1]["time_body"],
               "strong_high_kick_or_combined_count": sum(e["accent"] == "strong" and e["confidence"] == "high" and e["type"] in ("kick", "combined") for e in events)}
    result = {"schema_version": 1, "version": "v5.2", "fps": FPS,
              "warning_duration": WARNING, "body_duration": BODY_DURATION, "full_duration": FULL_DURATION,
              "music_body_end": MUSIC_END, "time_mapping": "time_full = time_body + 5; body time starts after warning; no legacy source offset or BPM grid applied",
              "source": {"path": SOURCE.relative_to(ROOT).as_posix(), "sha256": file_hash(SOURCE),
                         "native": native, "full_timeline_includes_warning": True},
              "current_video": {"path": VIDEO.relative_to(ROOT).as_posix(), "sha256": file_hash(VIDEO)},
              "analysis": {"sample_rate": SR, "channels": 1, "fft_samples": NFFT, "hop_samples": HOP,
                           "hop_seconds": HOP/SR, "window_seconds": NFFT/SR,
                           "timing_uncertainty_seconds": .025, "method": "positive log spectral difference with 3-bin frequency maximum reference, 2-hop lag, three frequency bands, Gaussian smoothing, local median/MAD peak threshold, 40ms merge, 105ms refractory",
                           "rms_gate_dbfs": -38, "local_window_seconds": 79*HOP/SR, "bands": stats,
                           "fixed_bpm_grid_used": False, "audio_mutated": False,
                           "confidence_semantics": "algorithmic multi-band agreement and local peak salience, not a calibrated probability",
                           "strong_kick_gate": "strong kick/combined additionally requires low normalized flux >=0.65 and low local-threshold ratio >=1.6; middle/high attacks alone cannot promote a camera kick",
                           "type_semantics": "kick/snare/combined are mixed-audio frequency-band attack candidates; vocals/synths may also contribute; no isolated drum stems"},
              "source_comparison": comparisons, "summary": summary, "validation": checks,
              "quiet_intervals": quiet_intervals, "sections": sections, "events": events,
              "limitations": ["No source separation and no manual per-beat listening confirmation.",
                              "Not lyric/phoneme alignment, tempo transcription or a claim every event is a drum.",
                              "Mono analysis can miss anti-phase stereo attacks; only analysis audio was downsampled.",
                              "Use strong/high kick or combined for restrained camera accents; other events are local light candidates.",
                              "Section gains are conservative visual recommendations, not automatic full-frame flashes."]}
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    table = "\n".join(f"| {s['start_body']:.3f}–{s['end_body']:.3f} | {s['rms90_dbfs']:.2f} | {s['event_count']} | {s['mode']} | {s['suggested_gain']:.2f} |" for s in sections)
    quiet_text = "; ".join(f"{q['start_body']:.3f}–{q['end_body']:.3f}s" for q in quiet_intervals)
    report = f"""# v5.2 全曲音频重音测量

当前数据：`data/production-v52/audio-accents.json`。复现：项目根运行 `python tools/analysis/analyze_accents_v52.py`。本次只读音轨与正式视频，新增分析脚本、JSON 和本说明，没有改音乐或正式成片。

## 时间基准与现用音轨核对

- 现用 `exports/warning-v3-hires/user-flac-trimmed-padded.pcm24.wav` 自带 **5 秒警告静音**；192000 Hz、双声道、24 bit，共 42880000 样本/声道。
- `time_body` 从警告结束后正文零点开始；`time_full = time_body + 5`；`frame_full = frame_body + 300`。帧以最近 60fps 帧四舍五入。不要再减旧 `fixed_offset_s`，也不要再将 body 加 5 后传给正文渲染器。
- 正文总长 {BODY_DURATION:.9f}s，全片 {FULL_DURATION:.9f}s；额外 6 秒尾声从正文 {MUSIC_END:.9f}s / 全片 {MUSIC_END+5:.9f}s 开始。
- 将 padded WAV、现用 ALAC 和当前 v5.1 MP4 全曲分别解码为分析用 22050Hz mono float32，三份 **{len(y)} 个样本完全相等，最大差 0**。这校核当前分析时间基准，不替代原有 192k/24-bit 原生无损证据。
- 另直接读取 WAV 原生 PCM 字节，前 5 秒及最后 6 秒均双声道严格全零。下采样仅在进程内分析，未写出降采样音乐或巨型中间 WAV。
- WAV SHA256: `{result['source']['sha256']}`。
- v5.1 MP4 SHA256: `{result['current_video']['sha256']}`。

## 测量结果与边界

共 **{len(events)}** 个事件，正文范围 **{events[0]['time_body']:.6f}–{events[-1]['time_body']:.6f}s**。类型统计 `{json.dumps(counts)}`；strong/high 且 kick/combined 共 **{summary['strong_high_kick_or_combined_count']}** 个。所有事件按时间严格递增，ID 和正文帧唯一；静音尾和实测低能量区间均零触发。具体自动断言在 JSON `validation`，已全部通过。

方法为 22050Hz 单声道、1024 样本 Hann 窗（46.44ms）、128 样本 hop（5.805ms），计算正向 log 频谱差。前三个频率相邻 bin 最大值参考用于压低持续音与小幅音高移动；比较相隔两个 hop 的频谱。分 35–190Hz 低频、190–2200Hz 中频、2200–9500Hz 高频测重音；各带 p99 归一化、Gaussian 平滑、局部 0.459s median/MAD 自适应门限，RMS 低于 -38dBFS 不触发。40ms 内频带候选合并，105ms 内只保留较强的一次。

**没有固定 BPM 或周期格点补拍。** 旧 `calibrated_timeline.json` 和 `accent_candidates.json` 来源是旧压缩音轨且后者只覆盖局部窗口，本次只用于理解历史时间关系，没有把其事件复制进新数据。

`type` 的 kick/snare/combined 是低频/宽频攻击形态的工程标记，**不是已经分离或逐拍人工听认的真实鼓轨**；人声、贝斯与合成器攻击仍可能贡献峰值。`confidence` high/medium 依据多带一致性和局部峰显著性，`confidence_score` 不是概率。窗造成约 ±25ms 定位边界。没有声部拆分、逐拍人工听审或歌词/音素校准；mono 分析可能漏掉反相立体声瞬态。

## 接入建议与段落强度

事件字段：`id, time_body, time_full, frame_body, frame_full, strength(0..1), type(kick|snare|combined|transient), accent(strong|medium|light), confidence(high|medium), confidence_score, bands, rms_dbfs`。JSON 顶层 `schema_version = 1`。以正文时间消费，镜头推动仅建议 `accent==='strong' && confidence==='high' && ['kick','combined'].includes(type)`，其余用于低幅局部亮光；不要给全部事件配置全屏闪烁。strong kick/combined 还要求低频自身归一化峰值 ≥0.65、对局部门限的显著比 ≥1.6，避免仅由人声/高频攻击把微弱低频升级成镜头推动。

`quiet_intervals` 是 0.25s RMS 块低于 -42dBFS、持续至少 0.5s 的实测区间：{quiet_text}。这些区间建议 gain=0。最后衰减/温暖尾声建议不响应鼓点；`sections` 的段落 gain 为实测能量配合保守剪辑建议，高潮也限制在 0.68，建议与现有段落强度取较低值。

| 正文秒 | RMS p90 dBFS | 事件数 | 模式 | 建议 gain |
| --- | ---: | ---: | --- | ---: |
{table}

段落边界是视觉建议，不是音频自动识别出的严格曲式；每个真正事件仍来自当次音轨测量。`energy` 为该段 RMS p90 / 0.8 后限制到 0..1，仅作连续相对指标，不代表人耳响度或鼓强度。最终亮光效果仍需在实际渲染帧/视频验收，音频 JSON 完成不等于视觉成片完成。
"""
    REPORT.write_text(report, encoding="utf-8")
    print(json.dumps({"output": str(OUT), "summary": summary, "quiet_intervals": quiet_intervals, "validation": checks}, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()

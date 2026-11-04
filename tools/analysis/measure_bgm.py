"""Measure the selected BGM against existing reference envelopes; no media production.

Uses locally installed analysis dependencies in .cache/python. All times in the
measurement JSON refer to the decoded source unless explicitly labelled reference.
Band transients are mixed-audio evidence, not verified words or isolated vocals.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / ".cache/python"))
import numpy as np
from scipy import signal
from scipy.io import wavfile
import imageio_ffmpeg
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

SR = 44100
FPS = 60
NFFT = 2048
HOP = SR // FPS
BANDS = {"low": (20, 150), "mid": (150, 2500), "high": (2500, 16000)}
AUDIO = ROOT / "media/audio/mili-world-execute-original-bilibili.m4a"
PCM = ROOT / "media/audio/mili-world-execute-original-bilibili-analysis-44100-f32.wav"
REFERENCE = ROOT.parent / "references/world-execute-me-lyric-mv/data/audio_features.json"
OUT = ROOT / "docs/audio"


def relative(path):
    return str(path.relative_to(ROOT)).replace("\\", "/")


def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for b in iter(lambda: f.read(1024 * 1024), b""):
            h.update(b)
    return h.hexdigest()


def decode():
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [ffmpeg, "-hide_banner", "-nostdin", "-y", "-i", str(AUDIO),
           "-map", "0:a:0", "-vn", "-ar", str(SR), "-ac", "2", "-c:a",
           "pcm_f32le", str(PCM)]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode:
        raise RuntimeError(result.stderr)
    probe = [x.strip() for x in result.stderr.splitlines()
             if "Duration:" in x or "Stream #" in x or "Audio:" in x]
    rate, stereo = wavfile.read(PCM)
    meta = {"sample_rate": int(rate), "channels": int(stereo.shape[1]),
            "sample_width_bytes": int(stereo.dtype.itemsize), "sample_frames": int(len(stereo))}
    assert rate == SR and stereo.shape[1] == 2 and stereo.dtype == np.float32
    y = stereo.astype(np.float64).mean(axis=1)
    meta["duration_seconds"] = len(y) / SR
    meta["format"] = "IEEE float32 WAV, resampled to 44100 Hz for analysis; AAC overshoots preserved without integer PCM clipping"
    meta["mono_method"] = "arithmetic mean of decoded left and right channels"
    meta["peak_abs_mono"] = float(np.max(np.abs(y)))
    meta["peak_abs_stereo"] = float(np.max(np.abs(stereo)))
    print("PCM_READY " + str(PCM), flush=True)
    print("PCM_METADATA " + json.dumps(meta), flush=True)
    return y, meta, probe


def norm01(v):
    return np.clip(v / (np.percentile(v, 99.5) or 1.0), 0, 1)


def envelopes(y):
    count = int(np.ceil(len(y) / HOP))
    padded = np.pad(y, (NFFT // 2, NFFT // 2), mode="constant")
    windows = np.lib.stride_tricks.sliding_window_view(padded, NFFT)[::HOP][:count]
    hann = signal.windows.hann(NFFT, sym=False)
    freq = np.fft.rfftfreq(NFFT, 1 / SR)
    masks = {k: (freq >= lo) & (freq < hi) for k, (lo, hi) in BANDS.items()}
    result = {k: np.empty(count, dtype=np.float64) for k in ["rms", *BANDS]}
    for a in range(0, count, 512):
        b = min(a + 512, count)
        w = windows[a:b]
        result["rms"][a:b] = np.sqrt(np.mean(w * w, axis=1))
        power = np.abs(np.fft.rfft(w * hann, axis=1)) ** 2
        for k, mask in masks.items():
            result[k][a:b] = np.sqrt(power[:, mask].sum(axis=1))
    raw_rms = result["rms"].copy()
    return {k: norm01(v) for k, v in result.items()}, raw_rms


def align(reference, measured):
    windows = [(8, 28), (35, 55), (65, 85), (90, 110), (120, 140),
               (144, 158), (159, 174), (178, 194), (194, 207)]
    results = []
    keys = ["rms", "low", "mid", "high"]
    radius = 5 * FPS
    for a_sec, b_sec in windows:
        a, b = round(a_sec * FPS), round(b_sec * FPS)
        lo, hi = -min(radius, a), min(radius, len(measured["rms"]) - b)
        channel_scores = []
        for key in keys:
            x = np.asarray(reference[key][a:b], dtype=np.float64)
            x -= x.mean()
            y = measured[key][a + lo:b + hi]
            n = len(x)
            cs = np.r_[0.0, np.cumsum(y)]
            cs2 = np.r_[0.0, np.cumsum(y * y)]
            ss = cs[n:] - cs[:-n]
            variance_sum = np.maximum(cs2[n:] - cs2[:-n] - ss * ss / n, 1e-20)
            numerator = signal.correlate(y, x, mode="valid", method="fft")
            channel_scores.append(numerator / np.sqrt(variance_sum * np.sum(x * x)))
        score = np.mean(channel_scores, axis=0)
        j = int(np.argmax(score))
        shift = lo + j
        fractional = 0.0
        if 0 < j < len(score) - 1:
            denom = score[j - 1] - 2 * score[j] + score[j + 1]
            if denom:
                fractional = float(np.clip(0.5 * (score[j - 1] - score[j + 1]) / denom, -0.5, 0.5))
        eligible = np.abs(np.arange(len(score)) - j) >= round(0.25 * FPS)
        results.append({"reference_window_seconds": [a_sec, b_sec],
                        "reference_center_seconds": (a_sec + b_sec) / 2,
                        "lag_seconds_grid": shift / FPS,
                        "lag_seconds_parabolic_estimate": (shift + fractional) / FPS,
                        "mean_ncc_at_grid_peak": float(score[j]),
                        "ncc_by_channel_at_grid_peak": {k: float(channel_scores[i][j]) for i, k in enumerate(keys)},
                        "best_alternative_ncc_outside_250ms": float(np.max(score[eligible]))})
    x = np.array([w["reference_center_seconds"] for w in results])
    lag = np.array([w["lag_seconds_parabolic_estimate"] for w in results])
    slope, intercept = np.polyfit(x, lag, 1)
    residual = lag - (intercept + slope * x)
    fit = {"mapping": "source_time = reference_time + offset_seconds + drift_seconds_per_second * reference_time",
           "offset_seconds": float(intercept), "drift_seconds_per_second": float(slope),
           "drift_ppm": float(slope * 1e6), "lag_change_over_211_9576_seconds": float(slope * 211.9576),
           "median_lag_seconds": float(np.median(lag)),
           "recommended_constant_offset_seconds": float(np.median(lag)),
           "recommended_mapping": "source_time approximately equals reference_time plus recommended_constant_offset_seconds; do not time-stretch from this fit",
           "interpretation": "the fitted change across the song is below one 60 Hz analysis frame; it is not sufficient evidence of a genuine tempo change",
           "residual_max_abs_ms": float(np.max(np.abs(residual)) * 1000),
           "residual_rms_ms": float(np.sqrt(np.mean(residual ** 2)) * 1000),
           "grid_resolution_ms": 1000 / FPS,
           "subgrid_precision_note": "parabolic interpolation is an estimate from 60 Hz envelopes, not sample-level or phoneme verification"}
    return results, fit


def rms_db(y, window_ms=20, hop_ms=5):
    size = round(SR * window_ms / 1000)
    hop = round(SR * hop_ms / 1000)
    # RMS intervals are [start, start + size), and are labelled by their centres.
    starts = np.arange(0, len(y) - size + 1, hop)
    energy = np.r_[0.0, np.cumsum(y * y)]
    r = np.sqrt(np.maximum(0, (energy[starts + size] - energy[starts]) / size))
    return (starts + size / 2) / SR, 20 * np.log10(np.maximum(r, 1e-15)), starts, size, hop


def threshold_report(y):
    t, db, starts, size, hop = rms_db(y)
    rows = []
    for threshold in [-20, -40, -60, -80]:
        above = np.flatnonzero(db > threshold)
        first = int(above[0]) if len(above) else None
        last = int(above[-1]) if len(above) else None
        # Conservative boundary: the end of the last window exceeding the threshold.
        tail_start = (int(starts[last]) + size) / SR if last is not None else 0.0
        rows.append({"threshold_dbfs": threshold,
                     "first_above_window_start_seconds": float(starts[first] / SR) if first is not None else None,
                     "last_above_window_center_seconds": float(t[last]) if last is not None else None,
                     "last_above_window_end_seconds": float(tail_start),
                     "final_contiguous_below_threshold_duration_seconds": float(len(y) / SR - tail_start)})
    return {"method": "20 ms RMS windows with approximately 5 ms hops on decoded mono PCM; conservative tail starts at the end of the last above-threshold window",
            "window_samples": int(size), "hop_samples": int(hop),
            "window_ms": size / SR * 1000, "hop_ms": hop / SR * 1000,
            "rows": rows, "warning": "below-threshold and quantized zero are not claims of mathematical silence"}, t, db


def flux_segment(y, begin, end):
    start = round(begin * SR)
    segment = y[start:round(end * SR)]
    hop = 256
    pad = np.pad(segment, (NFFT // 2, NFFT // 2), mode="constant")
    w = np.lib.stride_tricks.sliding_window_view(pad, NFFT)[::hop]
    mag = np.abs(np.fft.rfft(w * signal.windows.hann(NFFT, sym=False), axis=1))
    fr = np.fft.rfftfreq(NFFT, 1 / SR)
    out = {}
    for name, lo, hi in [("mixed_40_8000_hz", 40, 8000), ("mixed_300_3400_hz", 300, 3400)]:
        band = mag[:, (fr >= lo) & (fr <= hi)]
        env = np.maximum(0, np.diff(np.log1p(band * 50).sum(axis=1), prepend=0))
        scaled = env / (np.percentile(env, 99.5) + 1e-12)
        t = start / SR + np.arange(len(env)) * hop / SR
        ids, props = signal.find_peaks(scaled, prominence=0.08, distance=4)
        valid = (t[ids] > begin + 0.06) & (t[ids] < end - 0.06)
        ids = ids[valid]
        out[name] = {"t": t, "envelope": scaled,
                     "peaks": [{"time_seconds": float(t[i]), "relative_strength": float(scaled[i])} for i in ids]}
    return out


def plot_results(reference, env, raw_rms, meta, windows, fit, rms_t, rms_values, climax_flux, tail_flux):
    plt.rcParams.update({"font.size": 10, "axes.grid": True, "grid.alpha": 0.2})
    time = np.arange(len(raw_rms)) / FPS
    ref_t = np.arange(reference["meta"]["frames"]) / FPS
    mapped_t = ref_t * (1 + fit["drift_seconds_per_second"]) + fit["offset_seconds"]
    fig, ax = plt.subplots(3, 1, figsize=(15, 9), constrained_layout=True)
    ax[0].plot(rms_t, rms_values, lw=0.6, color="#6457a5")
    ax[0].set(ylabel="20 ms RMS (dBFS)", ylim=(-100, 0), xlim=(0, meta["duration_seconds"]),
              title="Selected Mili original upload: decoded mixed audio, not isolated vocals")
    ax[1].plot(time, env["rms"], lw=0.65, color="#c16e2a", label="Selected audio RMS (normalized)")
    ax[1].plot(mapped_t, reference["rms"], lw=0.55, alpha=0.7, color="#2f70a0", label="Reference RMS, mapped to source time")
    ax[1].set(ylabel="Normalized RMS", xlim=(0, meta["duration_seconds"]))
    ax[1].legend(loc="upper right")
    centers = np.array([w["reference_center_seconds"] for w in windows])
    lags = np.array([w["lag_seconds_parabolic_estimate"] for w in windows])
    ax[2].plot(centers, lags * 1000, "o", color="#6457a5", label="Window lag estimates")
    ax[2].plot(centers, (fit["offset_seconds"] + fit["drift_seconds_per_second"] * centers) * 1000, color="#c16e2a", label="Linear fit")
    ax[2].set(xlabel="Reference song time (s)", ylabel="Source minus reference (ms)",
              title="60 Hz envelope correlation; interpolated lags are estimates")
    ax[2].legend()
    fig.savefig(OUT / "waveform_overview.png", dpi=160)
    plt.close(fig)

    fig, ax = plt.subplots(2, 2, figsize=(17, 10), constrained_layout=True)
    ax[0, 0].plot(time, env["mid"], lw=0.7, label="Mid energy (mixed)", color="#6457a5")
    ax[0, 0].plot(time, env["low"], lw=0.7, alpha=0.7, label="Low energy", color="#c16e2a")
    ax[0, 0].set(xlim=(145, 164), ylim=(0, 1.05), title="Climax: actual source time", ylabel="Normalized energy")
    transform = lambda v: v * (1 + fit["drift_seconds_per_second"]) + fit["offset_seconds"]
    for ref, label in [(147.660, "LRC 147.660"), (148.0363, "Grid 148.036"), (159.1132, "Grid 159.113"), (161.8825, "Grid 161.882")]:
        x = transform(ref)
        ax[0, 0].axvline(x, lw=0.8, ls="--", color="gray")
        ax[0, 0].text(x, 0.97, label, rotation=90, va="top", fontsize=8)
    ax[0, 0].legend(loc="lower right")

    ax[0, 1].plot(rms_t, rms_values, lw=0.8, color="#6457a5")
    for threshold in [-40, -60, -80]:
        ax[0, 1].axhline(threshold, color="gray", ls="--", lw=0.7)
    ax[0, 1].set(xlim=(190, meta["duration_seconds"]), ylim=(-100, 0),
                 title="Tail energy and below-threshold duration", ylabel="20 ms RMS (dBFS)")

    for key, color in [("mixed_40_8000_hz", "#c16e2a"), ("mixed_300_3400_hz", "#6457a5")]:
        item = climax_flux[key]
        ax[1, 0].plot(item["t"], item["envelope"], lw=0.8, color=color, label=key.replace("_", " "))
    ax[1, 0].set(xlim=(158.3, 163.5), ylim=(0, 2), title="Counting / final shout: mixed-band transients", xlabel="Source time (s)", ylabel="Local relative flux")
    ax[1, 0].legend(fontsize=8)

    for key, color in [("mixed_40_8000_hz", "#c16e2a"), ("mixed_300_3400_hz", "#6457a5")]:
        item = tail_flux[key]
        ax[1, 1].plot(item["t"], item["envelope"], lw=0.8, color=color, label=key.replace("_", " "))
    tail_max = max(float(np.max(v["envelope"][(v["t"] >= 204.8) & (v["t"] <= 208.5)])) for v in tail_flux.values())
    ax[1, 1].set(xlim=(204.8, 208.5), ylim=(0, max(2, tail_max * 1.05)), title="Last mixed-audio accents; no word verification", xlabel="Source time (s)", ylabel="Local relative flux")
    ax[1, 1].legend(fontsize=8)
    fig.savefig(OUT / "climax_tail.png", dpi=160)
    plt.close(fig)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    reference = json.loads(REFERENCE.read_text(encoding="utf-8"))
    y, meta, probe = decode()
    env, raw_rms = envelopes(y)
    windows, fit = align(reference, env)
    thresholds, rms_t, rms_values = threshold_report(y)
    result = {"analysis_scope": "mixed-audio timing and energy measurements only; no isolated-vocal or lyric listening verification",
              "source": {"path": relative(AUDIO), "sha256": sha256(AUDIO), "ffmpeg_stream_summary": probe},
              "decoded_pcm": {"path": relative(PCM), **meta},
              "reference": {"path": str(REFERENCE), "meta": reference["meta"], "grid": reference["grid"],
                            "reference_precision": "normalized 60 Hz envelopes rounded to 0.001; source waveform unavailable"},
              "envelope_method": {"fps": FPS, "hop_samples": HOP, "fft_size": NFFT,
                                  "window": "periodic Hann for STFT; rectangular for RMS", "padding": "centered constant zero",
                                  "normalization": "each channel divided by its own 99.5th percentile and clipped to [0,1]",
                                  "channels": ["rms", *BANDS], "bands_hz": BANDS},
              "alignment_windows": windows, "alignment_fit": fit, "energy_thresholds": thresholds}
    result["reference_grid_transfer"] = {
        "bpm": reference["grid"]["bpm"],
        "source_beat_zero_seconds": reference["grid"]["t0"] + fit["recommended_constant_offset_seconds"],
        "basis": "reference tempo and phase transferred using high multiband-envelope correlations across the track; not an independent beat transcription",
        "source_minus_reference_file_duration_seconds": meta["duration_seconds"] - reference["meta"]["duration"],
        "source_tail_beyond_mapped_reference_end_seconds": meta["duration_seconds"] - reference["meta"]["duration"] - fit["recommended_constant_offset_seconds"],
        "warning": "file-duration difference is not the content alignment offset"}
    (OUT / "signal_alignment.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print("STAGE1 " + json.dumps({"duration": meta["duration_seconds"], "fit": fit,
                                  "window_scores": [{"center": w["reference_center_seconds"], "lag": w["lag_seconds_parabolic_estimate"], "ncc": w["mean_ncc_at_grid_peak"]} for w in windows],
                                  "thresholds": thresholds["rows"]}), flush=True)
    climax_flux = flux_segment(y, 145, 165)
    tail_flux = flux_segment(y, 203.5, 209.5)
    result["mixed_transient_method"] = {"fft_size": NFFT, "hop_samples": 256,
                                       "grid_ms": 256 / SR * 1000,
                                       "method": "positive difference of summed log1p band magnitudes, locally normalized at 99.5th percentile",
                                       "caution": "not harmonic/percussive separation; instruments and voice overlap; peaks are not verified word boundaries"}
    result["mixed_transient_peaks"] = {
        "climax_145_165": {k: v["peaks"] for k, v in climax_flux.items()},
        "tail_203_5_209_5": {k: v["peaks"] for k, v in tail_flux.items()}}
    (OUT / "signal_alignment.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    plot_results(reference, env, raw_rms, meta, windows, fit, rms_t, rms_values, climax_flux, tail_flux)
    print("COMPLETE " + json.dumps({"report": relative(OUT / "signal_alignment.json"),
                                    "plots": [relative(OUT / "waveform_overview.png"), relative(OUT / "climax_tail.png")]}), flush=True)


if __name__ == "__main__":
    main()

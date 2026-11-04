"""Independently decode an exported sample and compare its audio with the source.

No ffprobe or screen playback is required. The FFmpeg decode checks every video
frame, while three audio windows verify source alignment after AAC encoding.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]


def sha256(filename: Path) -> str:
    with filename.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def run_ffmpeg(executable: Path, args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run([str(executable), "-hide_banner", *args], capture_output=True, check=False)


def read_audio(executable: Path, filename: Path, start: float, duration: float, rate: int) -> np.ndarray:
    # A seek of zero can discard AAC priming twice in some FFmpeg builds.
    # Decode exported audio normally so its MP4 edit list/skip samples are used.
    seek = ["-ss", f"{start:.9f}"] if start > 0 else []
    result = run_ffmpeg(executable, ["-loglevel", "error", *seek, "-i", str(filename),
        "-t", f"{duration:.9f}", "-vn", "-ac", "1", "-ar", str(rate), "-f", "f32le", "pipe:1"])
    if result.returncode:
        raise RuntimeError(result.stderr.decode("utf-8", errors="replace"))
    return np.frombuffer(result.stdout, dtype="<f4").astype(np.float64)


def alignment(reference: np.ndarray, sample: np.ndarray, rate: int, start: float, length: float = 2.5) -> dict:
    padding = round(0.15 * rate)
    first, count = round(start * rate), round(length * rate)
    a = reference[first:first + count]
    b = sample[first - padding:first + count + padding]
    if len(a) != count or len(b) != count + padding * 2:
        raise RuntimeError("Audio is too short for an alignment window")
    a = a - a.mean()
    fft_size = 1 << (len(a) + len(b) - 2).bit_length()
    full = np.fft.irfft(np.fft.rfft(b, fft_size) * np.fft.rfft(a[::-1], fft_size), fft_size)
    dots = full[len(a) - 1:len(b)]
    sums = np.concatenate(([0.0], np.cumsum(b)))
    powers = np.concatenate(([0.0], np.cumsum(b * b)))
    sum_b = sums[count:] - sums[:-count]
    power_b = powers[count:] - powers[:-count] - sum_b * sum_b / count
    scores = dots / np.sqrt(np.maximum(power_b, 1e-30) * np.dot(a, a))
    peak = int(np.argmax(scores))
    return {"sample_window_seconds": [start, start + length], "lag_samples": peak - padding,
        "lag_seconds": (peak - padding) / rate, "normalized_correlation": float(scores[peak]),
        "reference_rms_dbfs": float(20 * np.log10(max(np.sqrt(np.mean(a * a)), 1e-15)))}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("--width", type=int, default=3840)
    parser.add_argument("--height", type=int, default=2160)
    parser.add_argument("--fps", type=int, default=60)
    parser.add_argument("--start-frame", type=int, default=11584)
    parser.add_argument("--end-frame", type=int, default=12740)
    parser.add_argument("--ffmpeg", type=Path, default=ROOT / ".cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe")
    parser.add_argument("--audio", type=Path, default=ROOT / "media/audio/mili-world-execute-original-bilibili.m4a")
    parser.add_argument("--out", type=Path)
    opts = parser.parse_args()
    video = opts.video.resolve()
    expected_frames = opts.end_frame - opts.start_frame
    expected_duration = expected_frames / opts.fps
    source_start = opts.start_frame / opts.fps
    metadata = run_ffmpeg(opts.ffmpeg, ["-i", str(video)])
    metadata_text = metadata.stderr.decode("utf-8", errors="replace")
    video_line = next((line.strip() for line in metadata_text.splitlines() if "Stream #" in line and "Video:" in line), "")
    audio_line = next((line.strip() for line in metadata_text.splitlines() if "Stream #" in line and "Audio:" in line), "")
    resolution = re.search(r", (\d+)x(\d+)(?:[ ,]|$)", video_line)
    rate = re.search(r", ([\d.]+) fps", video_line)
    duration = re.search(r"Duration: (\d+):(\d+):([\d.]+)", metadata_text)
    if not resolution or not rate or not duration:
        raise RuntimeError(f"Could not read output stream metadata:\n{metadata_text}")
    actual_duration = int(duration[1]) * 3600 + int(duration[2]) * 60 + float(duration[3])
    print(f"[verify] Decoding all video frames from {video.name}", flush=True)
    decoded = run_ffmpeg(opts.ffmpeg, ["-loglevel", "error", "-nostats", "-i", str(video),
        "-map", "0:v:0", "-an", "-fps_mode", "passthrough", "-progress", "pipe:1", "-f", "null", "-"])
    progress = decoded.stdout.decode("utf-8", errors="replace")
    counts = re.findall(r"^frame=(\d+)\s*$", progress, flags=re.MULTILINE)
    if decoded.returncode or not counts:
        raise RuntimeError(f"Video decode failed: {decoded.stderr.decode('utf-8', errors='replace')}")
    actual_frames = int(counts[-1])
    print(f"[verify] {actual_frames} frames decoded; comparing source audio windows", flush=True)
    audio_rate = 24000
    reference = read_audio(opts.ffmpeg, opts.audio, source_start, expected_duration, audio_rate)
    sample = read_audio(opts.ffmpeg, video, 0, expected_duration, audio_rate)
    windows = [alignment(reference, sample, audio_rate, t) for t in (1.0, 6.5, 10.5)]
    checks = {
        "resolution": [int(resolution[1]), int(resolution[2])] == [opts.width, opts.height],
        "frame_rate": abs(float(rate[1]) - opts.fps) < 0.0001,
        "decoded_frame_count": actual_frames == expected_frames,
        "container_duration": abs(actual_duration - expected_duration) <= 0.025,
        "audio_stream_present": bool(audio_line),
        "audio_covers_sample_duration": abs(len(sample) - round(expected_duration * audio_rate)) <= 1,
        "audio_alignment_within_one_frame": all(abs(w["lag_seconds"]) <= 1 / opts.fps for w in windows),
        "audio_correlation_at_least_0_98": all(w["normalized_correlation"] >= 0.98 for w in windows),
        "clean_video_decode": not decoded.stderr.strip(),
    }
    report = {
        "passed": all(checks.values()), "checks": checks,
        "file": str(video), "bytes": video.stat().st_size,
        "video_sha256": sha256(video),
        "source_audio_sha256": sha256(opts.audio),
        "source_start_seconds": source_start, "source_frames": [opts.start_frame, opts.end_frame],
        "source_frame_interval": "start inclusive, end exclusive",
        "expected_duration_seconds": expected_duration,
        "container_duration_seconds": actual_duration, "decoded_video_frames": actual_frames,
        "video_stream": video_line, "audio_stream": audio_line,
        "audio_comparison_sample_rate": audio_rate,
        "decoded_audio_samples": len(sample),
        "decoded_audio_duration_seconds": len(sample) / audio_rate,
        "audio_alignment_windows": windows,
        "scope": "Independent full video decode and source-audio alignment; visual storytelling still requires human review.",
    }
    output = opts.out or video.with_suffix(".verify.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"passed": report["passed"], "checks": checks, "audio_alignment_windows": windows, "report": str(output)}, indent=2))
    if not report["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

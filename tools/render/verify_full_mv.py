"""Independently decode a complete MV and verify distributed audio alignment.

Defaults describe the 12,740-frame, 60 fps original-audio ASTRA project.
FFmpeg decodes every video frame. Eight audio windows span the song without
using its near-silent tail. Stream metadata is read from FFmpeg, not the export
manifest. This is an encoding/synchronization check, not visual acceptance.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import numpy as np

from verify_sample import alignment, run_ffmpeg, sha256

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_WINDOWS = (1.0, 31.0, 60.0, 90.0, 120.0, 150.0, 180.0, 200.0)


def audio_track(executable: Path, filename: Path, rate: int) -> tuple[np.ndarray, str]:
    """Decode the complete track, with no duration cap hiding a long output."""
    result = run_ffmpeg(executable, [
        "-loglevel", "error", "-i", str(filename), "-map", "0:a:0", "-vn",
        "-ac", "1", "-ar", str(rate), "-f", "f32le", "pipe:1",
    ])
    message = result.stderr.decode("utf-8", errors="replace").strip()
    if result.returncode:
        raise RuntimeError(message or f"FFmpeg exited {result.returncode}")
    return np.frombuffer(result.stdout, dtype="<f4").astype(np.float64), message


def stream_metadata(executable: Path, video: Path) -> dict:
    result = run_ffmpeg(executable, ["-i", str(video)])
    # No output was requested, so FFmpeg normally returns 1 after printing input
    # metadata. Validity is established by parsing it and then fully decoding.
    text = result.stderr.decode("utf-8", errors="replace")
    video_line = next((s.strip() for s in text.splitlines() if "Stream #" in s and "Video:" in s), "")
    audio_line = next((s.strip() for s in text.splitlines() if "Stream #" in s and "Audio:" in s), "")
    size = re.search(r", (\d+)x(\d+)(?:[ ,]|$)", video_line)
    fps = re.search(r", ([\d.]+) fps", video_line)
    duration = re.search(r"Duration: (\d+):(\d+):([\d.]+)", text)
    if not size or not fps or not duration:
        raise RuntimeError(f"Unable to read video metadata:\n{text}")
    return {
        "resolution": [int(size[1]), int(size[2])],
        "nominal_fps": float(fps[1]),
        "container_duration_seconds": int(duration[1]) * 3600 + int(duration[2]) * 60 + float(duration[3]),
        "video_stream": video_line,
        "audio_stream": audio_line,
    }


def verify(opts: argparse.Namespace) -> dict:
    video, source = opts.video.resolve(), opts.audio.resolve()
    expected_duration = opts.frames / opts.fps
    metadata = stream_metadata(opts.ffmpeg, video)
    print(f"[full verify] Decoding every video frame: {video.name}", flush=True)
    decoded = run_ffmpeg(opts.ffmpeg, [
        "-loglevel", "error", "-nostats", "-i", str(video), "-map", "0:v:0",
        "-an", "-fps_mode", "passthrough", "-progress", "pipe:1", "-f", "null", "-",
    ])
    counts = re.findall(r"^frame=(\d+)\s*$", decoded.stdout.decode("utf-8", errors="replace"), re.MULTILINE)
    actual_frames = int(counts[-1]) if counts else None
    video_error = decoded.stderr.decode("utf-8", errors="replace").strip()
    print(f"[full verify] Decoded {actual_frames} frames; checking {len(opts.windows)} distributed audio windows", flush=True)

    source_audio = np.empty(0, dtype=np.float64)
    output_audio = np.empty(0, dtype=np.float64)
    audio_errors = []
    for label, filename in (("source", source), ("output", video)):
        try:
            samples, message = audio_track(opts.ffmpeg, filename, opts.audio_rate)
            if label == "source":
                source_audio = samples
            else:
                output_audio = samples
            if message:
                audio_errors.append({"track": label, "error": message})
        except RuntimeError as exc:
            audio_errors.append({"track": label, "error": str(exc)})

    source_first = round(opts.source_start * opts.audio_rate)
    reference = source_audio[source_first:]
    windows = []
    for start in opts.windows:
        window = {"sample_window_seconds": [start, start + opts.window_length],
                  "source_window_seconds": [opts.source_start + start, opts.source_start + start + opts.window_length]}
        try:
            a = reference[round(start * opts.audio_rate):round((start + opts.window_length) * opts.audio_rate)]
            rms_dbfs = float(20 * np.log10(max(float(np.sqrt(np.mean(a * a))) if a.size else 0.0, 1e-15)))
            if a.size != round(opts.window_length * opts.audio_rate):
                raise RuntimeError("Source audio is too short for this window")
            if rms_dbfs < -70:
                raise RuntimeError("Reference window is near-silent; alignment would be unreliable")
            window.update(alignment(reference, output_audio, opts.audio_rate, start, opts.window_length))
            if not np.isfinite(window["normalized_correlation"]):
                window["normalized_correlation"] = None
                raise RuntimeError("Audio correlation is not finite")
            window["passed"] = (abs(window["lag_seconds"]) <= 1 / opts.fps
                                and window["normalized_correlation"] >= opts.min_correlation)
        except (RuntimeError, ValueError, FloatingPointError) as exc:
            window.update({"passed": False, "error": str(exc)})
        windows.append(window)

    measured = [w for w in windows if "lag_seconds" in w and "error" not in w]
    lag_spread = (max(w["lag_seconds"] for w in measured) - min(w["lag_seconds"] for w in measured)) if measured else None
    checks = {
        "resolution": metadata["resolution"] == [opts.width, opts.height],
        "nominal_frame_rate": abs(metadata["nominal_fps"] - opts.fps) < 0.0001,
        "decoded_frame_count": actual_frames == opts.frames,
        "container_duration": abs(metadata["container_duration_seconds"] - expected_duration) <= 0.025,
        "clean_full_video_decode": decoded.returncode == 0 and bool(counts) and not video_error,
        "audio_stream_present": bool(metadata["audio_stream"]),
        "clean_full_audio_decode": not audio_errors and bool(output_audio.size) and bool(source_audio.size),
        "decoded_audio_duration_within_one_frame": abs(len(output_audio) / opts.audio_rate - expected_duration) <= 1 / opts.fps,
        "source_audio_covers_expected_interval": len(reference) / opts.audio_rate >= expected_duration - 1 / opts.fps,
        "all_alignment_windows_measured": len(measured) == len(opts.windows),
        "audio_alignment_within_one_frame": len(measured) == len(opts.windows) and all(abs(w["lag_seconds"]) <= 1 / opts.fps for w in measured),
        "audio_correlation_threshold": len(measured) == len(opts.windows) and all(w["normalized_correlation"] >= opts.min_correlation for w in measured),
        "distributed_alignment_spread_within_one_frame": lag_spread is not None and lag_spread <= 1 / opts.fps,
    }
    return {
        "passed": all(checks.values()), "checks": checks,
        "file": str(video), "bytes": video.stat().st_size, "video_sha256": sha256(video),
        "source_audio": str(source), "source_audio_sha256": sha256(source),
        "expected_resolution": [opts.width, opts.height], "expected_fps": opts.fps,
        "expected_video_frames": opts.frames, "decoded_video_frames": actual_frames,
        "expected_duration_seconds": expected_duration,
        "source_start_seconds": opts.source_start, "source_frame_interval": "start inclusive, end exclusive",
        "source_frames": [round(opts.source_start * opts.fps), round(opts.source_start * opts.fps) + opts.frames],
        **metadata,
        "decoded_audio_samples": len(output_audio), "decoded_audio_duration_seconds": len(output_audio) / opts.audio_rate,
        "decoded_source_audio_samples": len(source_audio), "decoded_source_audio_duration_seconds": len(source_audio) / opts.audio_rate,
        "audio_comparison_sample_rate": opts.audio_rate, "minimum_audio_correlation": opts.min_correlation,
        "audio_search_radius_seconds": 0.15, "audio_alignment_lag_spread_seconds": lag_spread,
        "audio_alignment_windows": windows, "video_decode_error": video_error, "audio_decode_errors": audio_errors,
        "scope": "Independent complete FFmpeg video/audio decode, measured stream dimensions/nominal rate, exact decoded frame count and eight distributed source-audio alignments. Not per-frame timestamp CFR certification, visual-storytelling acceptance, lyric/phoneme timing or a flash-safety certification.",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("--width", type=int, default=3840)
    parser.add_argument("--height", type=int, default=2160)
    parser.add_argument("--fps", type=int, default=60)
    parser.add_argument("--frames", "--expected-frames", type=int, default=12740)
    parser.add_argument("--source-start", type=float, default=0.0)
    parser.add_argument("--windows", type=float, nargs="+", default=list(DEFAULT_WINDOWS))
    parser.add_argument("--window-length", type=float, default=2.5)
    parser.add_argument("--min-correlation", type=float, default=0.98)
    parser.add_argument("--audio-rate", type=int, default=24000)
    parser.add_argument("--ffmpeg", type=Path, default=ROOT / ".cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe")
    parser.add_argument("--audio", type=Path, default=ROOT / "media/audio/mili-world-execute-original-bilibili.m4a")
    parser.add_argument("--out", type=Path)
    opts = parser.parse_args()
    if min(opts.width, opts.height, opts.fps, opts.frames, opts.audio_rate) <= 0 or opts.source_start < 0:
        parser.error("Dimensions, fps, frames and audio rate must be positive; source start must not be negative")
    if not 0 < opts.min_correlation <= 1 or opts.window_length <= 0:
        parser.error("Correlation must be in (0,1] and window length must be positive")
    if any(t < 0.15 or t + opts.window_length + 0.15 > opts.frames / opts.fps for t in opts.windows):
        parser.error("Alignment windows plus the 150 ms search margin must fit inside the expected video")
    output = opts.out or opts.video.with_suffix(".full-verify.json")
    try:
        report = verify(opts)
    except (OSError, RuntimeError, ValueError) as exc:
        report = {"passed": False, "checks": {"verification_completed": False},
                  "file": str(opts.video.resolve()), "error": str(exc)}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps({"passed": report["passed"], "checks": report["checks"], "report": str(output.resolve())}, indent=2))
    if not report["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

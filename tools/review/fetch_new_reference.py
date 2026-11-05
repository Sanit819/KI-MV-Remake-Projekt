"""Fetch only openly returned Bilibili DASH streams and measure local music alignment.

No authentication, stored browser cookies, signed API workarounds or login bypass.
Media stays outside this repository. Signed CDN URLs are never persisted or printed.
"""
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlsplit
import argparse
import hashlib
import json
import re
import subprocess

import numpy as np
import requests

ROOT = Path(__file__).resolve().parents[2]


def save_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def api(session, endpoint, params):
    response = session.get("https://api.bilibili.com" + endpoint, params=params, timeout=30)
    if response.status_code != 200:
        raise RuntimeError(f"Public API {endpoint}: HTTP {response.status_code}; stop without bypass")
    payload = response.json()
    if payload.get("code") != 0:
        raise RuntimeError(f"Public API {endpoint}: code {payload.get('code')}; stop without bypass")
    return payload["data"]


def clean_track(track):
    keys = ("id", "codecs", "width", "height", "frameRate", "frame_rate", "bandwidth", "mimeType", "mime_type")
    return {key: track[key] for key in keys if key in track}


def download(session, track, target, resume=False):
    if target.exists():
        if resume:
            return {**clean_track(track), "path": str(target), "download_host": None,
                    "preserved_prior_download": True, "bytes": target.stat().st_size,
                    "sha256": sha256(target)}
        raise FileExistsError(f"Preserving existing media; choose --align-only or another directory: {target}")
    urls = [track.get("baseUrl") or track.get("base_url")]
    urls += track.get("backupUrl") or track.get("backup_url") or []
    urls = list(dict.fromkeys(url for url in urls if url and urlsplit(url).scheme in ("http", "https")))
    if not urls:
        raise RuntimeError("Public DASH response did not contain an HTTP(S) base URL")
    failures = []
    for i, url in enumerate(urls):
        pending = target.with_suffix(target.suffix + f".download-{i:02}")
        if pending.exists():
            raise FileExistsError(f"Preserving partial download for inspection: {pending}")
        try:
            with session.get(url, stream=True, timeout=60) as response:
                if response.status_code in (401, 403, 412):
                    raise RuntimeError(f"Public CDN HTTP {response.status_code}; stop without bypass")
                if response.status_code != 200:
                    failures.append({"host": urlsplit(url).hostname, "http_status": response.status_code})
                    continue
                with pending.open("wb") as stream:
                    for block in response.iter_content(1024 * 1024):
                        if block:
                            stream.write(block)
            pending.replace(target)
            return {**clean_track(track), "path": str(target), "download_host": urlsplit(url).hostname,
                    "bytes": target.stat().st_size, "sha256": sha256(target), "public_cdn_transport_failures": failures}
        except requests.RequestException as exc:
            # Publicly returned backup URLs are ordinary failover; do not persist exception text with signed URLs.
            failures.append({"host": urlsplit(url).hostname, "transport_error": type(exc).__name__})
    raise RuntimeError("Public CDN transport failures: " + json.dumps(failures))


def decode_video(ffmpeg, path):
    process = subprocess.run([str(ffmpeg), "-hide_banner", "-nostdin", "-loglevel", "info",
                              "-i", str(path), "-map", "0:v:0", "-an", "-progress", "pipe:1",
                              "-nostats", "-f", "null", "NUL"], capture_output=True, text=True)
    if process.returncode:
        raise RuntimeError("Full video decode failed: " + process.stderr[-1200:])
    streams = [line.strip() for line in process.stderr.splitlines() if "Stream #" in line and "Video:" in line]
    if not streams:
        raise RuntimeError("No decoded video stream")
    source = streams[0]
    dimensions = re.search(r"(?<!\d)(\d{2,5})x(\d{2,5})(?!\d)", source)
    rate = re.search(r"([\d.]+) fps", source)
    frame_counts = re.findall(r"^frame=(\d+)$", process.stdout, re.MULTILINE)
    times = re.findall(r"^out_time_us=(\d+)$", process.stdout, re.MULTILINE)
    if not dimensions or not rate or not frame_counts:
        raise RuntimeError("Could not determine decoded dimensions, frame rate or frame count")
    nframes = int(frame_counts[-1])
    fps = float(rate.group(1))
    return {"passed": True, "full_decode_exit": process.returncode, "stream": source,
            "width": int(dimensions.group(1)), "height": int(dimensions.group(2)), "fps": fps,
            "decoded_frames": nframes, "duration_from_frames_seconds": nframes / fps,
            "last_decode_progress_seconds": int(times[-1]) / 1e6 if times else None,
            "scope": "Actual complete FFmpeg decode and stream probe; not visual inspection or exact per-packet timestamp certification"}


def audio_samples(ffmpeg, path, rate=24000):
    process = subprocess.run([str(ffmpeg), "-hide_banner", "-nostdin", "-loglevel", "error",
                              "-i", str(path), "-map", "0:a:0", "-vn", "-ac", "1", "-ar", str(rate),
                              "-f", "f32le", "pipe:1"], capture_output=True)
    if process.returncode or process.stderr:
        raise RuntimeError("Audio decode error: " + process.stderr.decode("utf-8", errors="replace")[-1200:])
    return np.frombuffer(process.stdout, dtype="<f4").astype(np.float64)


def normalized_valid_correlation(longer, template):
    """Pearson correlation at each complete template position, via FFT."""
    n = len(template)
    if len(longer) < n or n < 2:
        raise ValueError("Insufficient samples for correlation")
    template = template - np.mean(template)
    energy = np.dot(template, template)
    if energy <= 1e-12:
        raise RuntimeError("Cannot align a silent original-audio window")
    fftn = 1 << (len(longer) + n - 2).bit_length()
    correlation = np.fft.irfft(np.fft.rfft(longer, fftn) * np.fft.rfft(template[::-1], fftn), fftn)
    numerator = correlation[n - 1:len(longer)]
    sums = np.concatenate(([0.0], np.cumsum(longer)))
    squares = np.concatenate(([0.0], np.cumsum(longer * longer)))
    local_sum = sums[n:] - sums[:-n]
    variance = np.maximum(0.0, squares[n:] - squares[:-n] - local_sum * local_sum / n)
    denominator = np.sqrt(variance * energy)
    return np.divide(numerator, denominator, out=np.zeros_like(numerator), where=denominator > 1e-12)


def align(ffmpeg, original, reference, out, minimum_correlation=.95, maximum_spread=1 / 60):
    sr = 24000
    original_pcm = audio_samples(ffmpeg, original, sr)
    ref_pcm = audio_samples(ffmpeg, reference, sr)
    # Box-low-pass before a 12:1 decimation; this coarse search is only an initializer.
    factor = 12
    small_rate = sr // factor
    original_small = original_pcm[:len(original_pcm) // factor * factor].reshape(-1, factor).mean(axis=1)
    ref_small = ref_pcm[:len(ref_pcm) // factor * factor].reshape(-1, factor).mean(axis=1)
    template_start = 20.0
    template_duration = 40.0
    template = original_small[round(template_start * small_rate):round((template_start + template_duration) * small_rate)]
    coarse = normalized_valid_correlation(ref_small, template)
    coarse_index = int(np.argmax(coarse))
    coarse_offset = coarse_index / small_rate - template_start
    windows = []
    duration = 2.5
    for song_start in (1, 31, 60, 90, 120, 150, 180, 200):
        first = round(song_start * sr)
        template = original_pcm[first:first + round(duration * sr)]
        search_start = max(0, round((song_start + coarse_offset - 1) * sr))
        search_end = min(len(ref_pcm), round((song_start + coarse_offset + duration + 1) * sr))
        values = normalized_valid_correlation(ref_pcm[search_start:search_end], template)
        peak = int(np.argmax(values))
        reference_start = (search_start + peak) / sr
        windows.append({"song_window_seconds": [song_start, song_start + duration],
                        "reference_window_seconds": [reference_start, reference_start + duration],
                        "offset_seconds": reference_start - song_start,
                        "correlation": float(values[peak]),
                        "original_rms_dbfs": float(20 * np.log10(max(1e-15, np.sqrt(np.mean(template ** 2)))))})
    offsets = np.array([row["offset_seconds"] for row in windows])
    starts = np.array([row["song_window_seconds"][0] for row in windows])
    slope, intercept = np.polyfit(starts, offsets, 1)
    median = float(np.median(offsets))
    spread = float(np.ptp(offsets))
    good = all(row["correlation"] >= minimum_correlation for row in windows) and spread <= maximum_spread
    strict_waveform_gate = all(row["correlation"] >= .95 for row in windows)
    report = {"passed": good, "mapping": "ref_player_seconds = our_song_seconds + offset_seconds",
              "offset_seconds": median, "coarse_search": {"original_window_seconds": [20, 60],
                  "sample_rate": small_rate, "offset_seconds": coarse_offset, "correlation": float(coarse[coarse_index])},
              "fine_sample_rate": sr, "minimum_correlation_required": minimum_correlation,
              "maximum_offset_spread_seconds": maximum_spread, "measured_offset_spread_seconds": spread,
              "constant_offset_max_measured_error_seconds": float(np.max(np.abs(offsets - median))),
              "strict_raw_waveform_0_95_gate_passed": strict_waveform_gate,
              "precision_note": "Frame-level correspondence only; raw correlations and nonzero drift remain visible. A configurable lower correlation gate must not be described as sample-exact matching.",
              "fit": {"offset_at_song_zero_seconds": float(intercept), "offset_slope_seconds_per_second": float(slope),
                      "reference_seconds_per_song_second": float(1 + slope),
                      "affine_mapping": f"ref_player_seconds = {1 + slope:.12f} * our_song_seconds + {intercept:.12f}",
                      "drift_ppm": float(slope * 1e6), "residual_max_seconds": float(np.max(np.abs(offsets - (slope * starts + intercept))))},
              "windows": windows, "original_audio": {"path": str(original), "sha256": sha256(original),
                  "decoded_samples": len(original_pcm), "decoded_seconds": len(original_pcm) / sr},
              "reference_audio": {"path": str(reference), "sha256": sha256(reference),
                  "decoded_samples": len(ref_pcm), "decoded_seconds": len(ref_pcm) / sr},
              "scope": "Full audio decoded; waveform correlation over one coarse interval plus eight measured windows. No listening or phoneme-level timing claim. Offset maps source-audio/player timelines, not a guessed intro length."}
    source_manifest = out / "source.json"
    if source_manifest.exists():
        source = json.loads(source_manifest.read_text(encoding="utf-8"))
        video_decode = source.get("video", {}).get("decode", {})
        start_match = re.search(r"start ([\d.]+)", video_decode.get("stream", ""))
        if start_match:
            video_start = float(start_match.group(1))
            report["reference_video_frame_mapping"] = {
                "original_video_start_time_seconds": video_start,
                "original_audio_start_time_seconds": 0.0,
                "video_fps": video_decode.get("fps"),
                "formula": f"ref_player_seconds ~= {video_start} + zero_based_extracted_frame / {video_decode.get('fps')}",
                "note": "Input video stream start offset retained separately. Default FFmpeg frame extraction resets this timestamp to zero; do not omit 21ms when mapping image indices to the original DASH player timeline. 16k video timebase rounds individual frame PTS by under 1 tick."}
        source["audio"]["decode"] = {"passed": True, "full_decode_exit": 0, "analysis_sample_rate": sr,
            "channels_for_analysis": 1, "decoded_samples": len(ref_pcm), "duration_seconds": len(ref_pcm) / sr,
            "scope": "Entire audio decoded to mono float32 at 24kHz for correlation; original compressed stream preserved"}
        save_json(source_manifest, source)
    save_json(out / "alignment.json", report)
    print(json.dumps({"alignment_passed": good, "offset_seconds": median, "offset_spread_seconds": spread,
                      "minimum_correlation": min(row["correlation"] for row in windows), "report": str(out / "alignment.json")}), flush=True)
    if not good:
        raise RuntimeError("Alignment did not satisfy confidence/drift thresholds; report retained for analysis")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bvid", default="BV1Jwhy6BEMJ")
    parser.add_argument("--out", type=Path)
    parser.add_argument("--ffmpeg", type=Path, default=ROOT / ".cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe")
    parser.add_argument("--original-audio", type=Path, default=ROOT / "media/audio/mili-world-execute-original-bilibili.m4a")
    parser.add_argument("--align-only", action="store_true")
    parser.add_argument("--resume", action="store_true", help="Preserve already downloaded media while completing a failed fetch")
    parser.add_argument("--minimum-correlation", type=float, default=.95)
    parser.add_argument("--maximum-offset-spread", type=float, default=1 / 60)
    args = parser.parse_args()
    if not re.fullmatch(r"BV[0-9A-Za-z]{10}", args.bvid):
        raise ValueError("Expected a Bilibili BV identifier")
    out = (args.out or ROOT.parent / "references" / ("gpt-astra-" + args.bvid)).resolve()
    out.mkdir(parents=True, exist_ok=True)
    video = out / "reference-video-avc.mp4"
    audio = out / "reference-audio.m4a"
    if not args.align_only:
        page = f"https://www.bilibili.com/video/{args.bvid}/"
        session = requests.Session()
        session.headers.update({"User-Agent": "Mozilla/5.0", "Referer": page})
        info = api(session, "/x/web-interface/view", {"bvid": args.bvid})
        playback = api(session, "/x/player/playurl", {"bvid": args.bvid, "cid": info["cid"], "qn": 127, "fnval": 16, "fourk": 1})
        dash = playback.get("dash") or {}
        videos = [track for track in dash.get("video", []) if str(track.get("codecs", "")).startswith("avc")]
        audios = dash.get("audio") or []
        if not videos or not audios:
            raise RuntimeError("No public AVC video and audio pair returned; stop without authentication or bypass")
        chosen_video = max(videos, key=lambda track: (track.get("height", 0) * track.get("width", 0), track.get("bandwidth", 0)))
        chosen_audio = max(audios, key=lambda track: track.get("bandwidth", 0))
        print(json.dumps({"title": info["title"], "uploader": info["owner"]["name"], "cid": info["cid"],
                          "selected_video": clean_track(chosen_video), "selected_audio": clean_track(chosen_audio)}, ensure_ascii=False), flush=True)
        manifest = {"source_page": page, "bvid": args.bvid, "aid": info["aid"], "cid": info["cid"],
                    "title": info["title"], "uploader": {"name": info["owner"]["name"], "mid": info["owner"]["mid"]},
                    "published_utc": datetime.fromtimestamp(info["pubdate"], timezone.utc).isoformat(),
                    "fetched_utc": datetime.now(timezone.utc).isoformat(), "api_duration_seconds": info["duration"],
                    "playback_timelength_ms": playback.get("timelength"),
                    "authentication": "none; new requests Session without browser credentials or cookies",
                    "selection": "highest-resolution AVC openly returned by public playurl, then highest bandwidth; maximum public audio bandwidth",
                    "publicly_returned_avc_tracks": [clean_track(track) for track in videos],
                    "publicly_returned_audio_tracks": [clean_track(track) for track in audios],
                    "use": "local frame-by-frame reference analysis; no reupload; existing references preserved",
                    "url_sanitization": "Only public page and CDN hostname persisted; no signed playback URLs or query tokens"}
        manifest["video"] = download(session, chosen_video, video, args.resume)
        save_json(out / "source.json", manifest)
        print(json.dumps({"video_ready": str(video), "bytes": manifest["video"]["bytes"]}), flush=True)
        manifest["audio"] = download(session, chosen_audio, audio, args.resume)
        save_json(out / "source.json", manifest)
        print(json.dumps({"media_ready": True, "video": str(video), "audio": str(audio), "manifest": str(out / "source.json")}), flush=True)
        manifest["video"]["decode"] = decode_video(args.ffmpeg, video)
        save_json(out / "source.json", manifest)
        print(json.dumps({"video_decode": manifest["video"]["decode"]}), flush=True)
    align(args.ffmpeg, args.original_audio, audio, out, args.minimum_correlation, args.maximum_offset_spread)


if __name__ == "__main__":
    main()

"""Preserve and inspect a user-supplied FLAC; never infer master provenance from its header."""
from pathlib import Path
import hashlib
import importlib.util
import json
import re
import shutil
import subprocess

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path("C:/Users/auscar/Desktop/world.execute (me) ;.flac")
TARGET = ROOT / "media/audio/user-world-execute-192k24.flac"
FFMPEG = ROOT / ".cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe"
QA = ROOT / "exports/audio-qa/user-flac"
REPORT = ROOT / "docs/audio/user-flac-analysis.json"


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def streaminfo(path):
    with path.open("rb") as f:
        if f.read(4) != b"fLaC":
            raise RuntimeError("Not a native FLAC file")
        header = f.read(4)
        if header[0] & 127 != 0 or int.from_bytes(header[1:], "big") != 34:
            raise RuntimeError("Missing standard first STREAMINFO block")
        block = f.read(34)
    packed = int.from_bytes(block[10:18], "big")
    rate = packed >> 44
    total = packed & ((1 << 36) - 1)
    return {"sample_rate": rate, "channels": ((packed >> 41) & 7) + 1,
            "bits_per_sample": ((packed >> 36) & 31) + 1, "total_samples_per_channel": total,
            "duration_seconds": total / rate, "decoded_pcm_md5_declared": block[18:34].hex()}


def spectrum_windows():
    results = []
    sr = 192000
    fftn = 32768
    hann = np.hanning(fftn)
    freqs = np.fft.rfftfreq(fftn, 1 / sr)
    bands = ((0, 20000), (20000, 22050), (22050, 24000), (24000, 48000), (48000, 96000))
    for start in (30, 90, 150):
        process = subprocess.run([str(FFMPEG), "-hide_banner", "-nostdin", "-loglevel", "error",
            "-ss", str(start), "-i", str(TARGET), "-t", "8", "-map", "0:a:0", "-ac", "2",
            "-ar", str(sr), "-f", "f32le", "pipe:1"], capture_output=True)
        if process.returncode or process.stderr:
            raise RuntimeError("Spectrum-window decode failed")
        pcm = np.frombuffer(process.stdout, "<f4").reshape(-1, 2)
        power = np.zeros(fftn // 2 + 1)
        count = 0
        for offset in range(0, len(pcm) - fftn + 1, fftn // 2):
            block = pcm[offset:offset + fftn].astype(np.float64) * hann[:, None]
            power += np.sum(np.abs(np.fft.rfft(block, axis=0)) ** 2, axis=1)
            count += 1
        power /= max(1, count)
        base = np.sum(power[(freqs >= 0) & (freqs < 20000)])
        result = {"window_seconds": [start, start + 8], "welch_segments": count, "bands": []}
        for lo, hi in bands:
            energy = np.sum(power[(freqs >= lo) & (freqs < hi)])
            result["bands"].append({"hz": [lo, hi], "energy_db_relative_0_20khz": float(10 * np.log10(max(1e-30, energy / base)))})
        cumulative = np.cumsum(power) / np.sum(power)
        result["power_99_99_percent_frequency_hz"] = float(freqs[np.searchsorted(cumulative, .9999)])
        results.append(result)
    return {"method": "Three 8s native-rate stereo windows; sum L/R FFT power, Hann32768, half-overlap; relative integrated band energy",
            "windows": results, "scope": "Frequency-energy description only. A cutoff or weak ultrasonic energy cannot alone prove lossy transcoding, upsampling, or native-master provenance."}


def measure_tail(path, start, end, sample_rate):
    process = subprocess.run([str(FFMPEG), "-hide_banner", "-nostdin", "-loglevel", "error",
        "-i", str(path), "-map", "0:a:0", "-af", f"atrim=start={start:.12f}:end={end:.12f}",
        "-ac", "2", "-ar", str(sample_rate), "-f", "f32le", "pipe:1"], capture_output=True)
    if process.returncode or process.stderr:
        raise RuntimeError("Tail decode failed")
    pcm = np.frombuffer(process.stdout, "<f4").astype(np.float64)
    if len(pcm) == 0:
        raise RuntimeError("Empty tail window")
    rms = float(np.sqrt(np.mean(pcm * pcm)))
    peak = float(np.max(np.abs(pcm)))
    return {"path": str(path), "requested_window_seconds": [start, end], "sample_rate": sample_rate,
            "decoded_samples_per_channel": len(pcm) // 2, "decoded_duration_seconds": len(pcm) / 2 / sample_rate,
            "rms_dbfs": float(20 * np.log10(max(1e-15, rms))), "peak_dbfs": float(20 * np.log10(max(1e-15, peak))),
            "all_samples_exact_zero": bool(np.all(pcm == 0)), "scope": "Actual decoded stereo samples; zero maps to -300dB display floor"}


def main():
    source_hash = digest(SOURCE)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    if TARGET.exists():
        if digest(TARGET) != source_hash:
            raise RuntimeError("Existing preserved user FLAC differs; refusing overwrite")
    else:
        shutil.copyfile(SOURCE, TARGET)
    if digest(TARGET) != source_hash:
        raise RuntimeError("Copy hash mismatch")
    header = streaminfo(TARGET)
    report = {"original_path": str(SOURCE), "preserved_path": str(TARGET), "sha256": source_hash,
              "bytes": TARGET.stat().st_size, "byte_exact_copy": True, "streaminfo": header,
              "provenance": "User-supplied Desktop file; origin, purchase source and mastering lineage were not provided",
              "authenticity_boundary": "Header confirms the delivered PCM representation only, not that the recording was originally mastered at this rate/depth"}
    print(json.dumps({"preserved": str(TARGET), "sha256": source_hash, "bytes": report["bytes"], "streaminfo": header}), flush=True)
    QA.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    codec = {16: "pcm_s16le", 24: "pcm_s24le", 32: "pcm_s32le"}.get(header["bits_per_sample"])
    if not codec:
        raise RuntimeError("Unsupported PCM depth for exact native hash verification")
    process = subprocess.run([str(FFMPEG), "-hide_banner", "-nostdin", "-loglevel", "error", "-err_detect", "explode",
        "-i", str(TARGET), "-map", "0:a:0", "-c:a", codec, "-f", "hash", "-hash", "md5", "pipe:1"], capture_output=True, text=True)
    match = re.search(r"MD5=([a-fA-F0-9]{32})", process.stdout)
    report["full_native_decode"] = {"exit_code": process.returncode, "error_output": process.stderr,
        "decoded_pcm_md5": match.group(1).lower() if match else None,
        "matches_streaminfo_md5": bool(match and match.group(1).lower() == header["decoded_pcm_md5_declared"])}
    if process.returncode or process.stderr or not report["full_native_decode"]["matches_streaminfo_md5"]:
        raise RuntimeError("Full native PCM decode/MD5 validation failed")
    spec = importlib.util.spec_from_file_location("reference_alignment", ROOT / "tools/review/fetch_new_reference.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    comparisons = (("existing_original", ROOT / "media/audio/mili-world-execute-original-bilibili.m4a"),
                   ("new_reference", ROOT.parent / "references/gpt-astra-BV1Jwhy6BEMJ/reference-audio.m4a"))
    report["comparisons"] = {}
    for name, other in comparisons:
        destination = QA / name
        destination.mkdir(parents=True, exist_ok=True)
        error = None
        try:
            module.align(FFMPEG, other, TARGET, destination, .90, 1 / 48)
        except RuntimeError as exc:
            error = str(exc)
        result_path = destination / "alignment.json"
        result = json.loads(result_path.read_text(encoding="utf-8"))
        result["mapping_role_note"] = "In this comparison, reference/ ref_player = user FLAC time; original/our_song = comparison input time"
        result["comparison_error"] = error
        report["comparisons"][name] = result
        print(json.dumps({"comparison": name, "passed": result["passed"], "offset": result["offset_seconds"],
                          "affine": result["fit"]["affine_mapping"], "min_correlation": min(x["correlation"] for x in result["windows"])}), flush=True)
    report["spectrum"] = spectrum_windows()
    trim = 11096 / header["sample_rate"]
    aligned_end = header["duration_seconds"] - trim
    old_audio = ROOT / "media/audio/mili-world-execute-original-bilibili.m4a"
    report["proposed_constant_trim"] = {"samples_per_channel": 11096, "rate": header["sample_rate"],
        "seconds": trim, "aligned_source_end_song_seconds": aligned_end,
        "missing_interval_before_original_timeline_end_seconds": 212.33333333333334 - aligned_end,
        "total_padding_to_218_333333_seconds": 218.33333333333334 - aligned_end,
        "no_trim_or_resampling_performed_here": True}
    report["tail_level_checks"] = {
        "old_audio_interval_after_aligned_flac_end": measure_tail(old_audio, aligned_end, 212.33333333333334, 48000),
        "user_flac_last_half_second": measure_tail(TARGET, header["duration_seconds"] - .5, header["duration_seconds"], header["sample_rate"])}
    report["passed_decode_and_copy"] = True
    report["production_audio_changed"] = False
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"report": str(REPORT), "completed": True}), flush=True)


if __name__ == "__main__":
    main()

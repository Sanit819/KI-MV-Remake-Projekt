"""Inspect mixed-audio accent candidates; this is not speech or lyric alignment."""
from pathlib import Path
import argparse
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / ".cache/python"))
import imageio_ffmpeg
import numpy as np
from scipy.ndimage import gaussian_filter1d
from scipy.signal import find_peaks
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--offset", type=float, required=True)
    args = ap.parse_args()
    src = ROOT / "media/audio/mili-world-execute-original-bilibili.m4a"
    raw = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-i", str(src),
                          "-vn", "-ac", "2", "-ar", "44100", "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    pcm = np.frombuffer(raw, dtype="<f4").reshape(-1, 2)
    sr, hop, nfft = 44100, 128, 1024
    windows = [(146 + args.offset, 164 + args.offset), (190 + args.offset, 209 + args.offset)]
    analysis = []
    for w0, w1 in windows:
        a, b = round(w0 * sr), min(len(pcm), round(w1 * sr))
        clip = pcm[a:b]
        mid = clip.mean(axis=1)
        side = (clip[:, 0] - clip[:, 1]) * .5
        freqs = np.fft.rfftfreq(nfft, 1/sr)
        curves = {}
        times = None
        for channel, data in [("mid", mid), ("side", side)]:
            frames = np.lib.stride_tricks.sliding_window_view(np.pad(data, (nfft//2, nfft//2)), nfft)[::hop]
            spec = np.abs(np.fft.rfft(frames * np.hanning(nfft+1)[:-1], axis=1))
            times = a / sr + np.arange(len(frames)) * hop / sr
            for name, lo, hi in [("low", 30, 180), ("speech_band", 350, 3400), ("high", 3400, 12000)]:
                band = spec[:, (freqs >= lo) & (freqs < hi)]
                flux = np.maximum(np.diff(np.log1p(band * 20), axis=0, prepend=0), 0).mean(axis=1)
                flux[:4] = 0
                flux = gaussian_filter1d(flux, 1)
                curves[f"{channel}_{name}"] = flux / max(float(np.percentile(flux, 99.5)), 1e-12)
        events = []
        if w0 < 180:
            pulse_refs = [(f"repeat_{i+1:02}", .344 + (320 + 2*i) * 60 / 130) for i in range(12)]
            pulse_refs += [(f"count_{i+1}", .344 + (344+i) * 60 / 130) for i in range(6)]
            pulse_refs += [("release_shout", .344 + 350 * 60/130), ("chorus_strong_beat", .344 + 352 * 60/130)]
        else:
            pulse_refs = [("last_voice_accent_1",191.36),("last_voice_accent_2",191.63),
                          ("last_voice_accent_3",192.05),("final_shout_start",205.75),
                          ("final_shout_accent_2",205.96),("final_shout_accent_3",206.19),
                          ("final_shout_accent_4",206.45),("last_instrument_hit",206.88)]
        for event_id, ref in pulse_refs:
            expected = ref + args.offset
            candidates = {}
            for name, flux in curves.items():
                ix = np.where((times >= expected-.09) & (times <= expected+.09))[0]
                k = int(ix[np.argmax(flux[ix])])
                candidates[name] = {"t_s":round(float(times[k]),6), "strength_normalized":round(float(flux[k]),4)}
            events.append({"id":event_id,"reference_s":ref,"expected_source_s":round(expected,6),
                           "candidate_peaks_near_expected":candidates})
        analysis.append({"start_s":w0,"end_s":w1,"events":events})
        fig, axes=plt.subplots(3,1,figsize=(18,8),sharex=True)
        for ax, name in zip(axes,["low","speech_band","high"]):
            ax.plot(times,curves[f"mid_{name}"],lw=.65,label="mid")
            ax.plot(times,curves[f"side_{name}"],lw=.6,alpha=.6,label="side")
            ax.set_ylabel(name);ax.grid(alpha=.2);ax.legend(loc="upper right")
            for event in events:ax.axvline(event["expected_source_s"],color="purple",alpha=.25,lw=.7)
        axes[-1].set_xlabel("Source audio seconds")
        fig.suptitle("Mixed-audio spectral flux: candidates, not isolated vocals or verified phonemes")
        fig.tight_layout(rect=(0,0,1,.96))
        suffix="climax" if w0<180 else "ending"
        fig.savefig(ROOT/f"docs/audio/accent_{suffix}.png",dpi=140,bbox_inches="tight")
        plt.close(fig)
    result={"source":src.relative_to(ROOT).as_posix(),"source_offset_s":args.offset,
            "sample_rate":sr,"hop_samples":hop,"hop_seconds":hop/sr,"fft_samples":nfft,
            "interpretation":"Mixed audio. A frequency band or mid channel is not isolated voice. Peaks are visual accent candidates, not verified word onsets.",
            "windows":analysis}
    out=ROOT/"docs/audio/accent_candidates.json"
    out.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    print(f"Saved {out.relative_to(ROOT)}")
    for window in analysis:
        for event in window["events"]:
            mid=event["candidate_peaks_near_expected"]["mid_speech_band"]
            low=event["candidate_peaks_near_expected"]["mid_low"]
            print(event["id"],event["expected_source_s"],"midband",mid["t_s"],"low",low["t_s"])


if __name__ == "__main__":
    main()

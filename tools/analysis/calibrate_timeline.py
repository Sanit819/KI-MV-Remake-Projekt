"""Create a 60 fps editorial timing plan from the approved pre-audio storyboard.

This writes timing data only, not animation or rendered media. Word timings outside
the focused regions remain inherited line references, transferred to the source.
"""
from pathlib import Path
import json
import math
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
BASELINE = "ae8b77a"
FPS = 60


def main():
    alignment = json.loads((ROOT / "docs/audio/signal_alignment.json").read_text(encoding="utf-8"))
    accents = json.loads((ROOT / "docs/audio/accent_candidates.json").read_text(encoding="utf-8"))
    offset = alignment["alignment_fit"]["recommended_constant_offset_seconds"]
    assert abs(accents["source_offset_s"] - offset) < .001, "Accent analysis uses a different source offset"
    duration = alignment["decoded_pcm"]["duration_seconds"]
    baseline = subprocess.run(["git", "show", f"{BASELINE}:docs/STORYBOARD.md"], cwd=ROOT,
                              check=True, capture_output=True).stdout.decode("utf-8")
    pattern = re.compile(r"^\| ([A-H]\d{2}) \| (\d{2}):(\d{2})\.(\d{3})–(\d{2}):(\d{2})\.(\d{3}) \|", re.M)
    matches = list(pattern.finditer(baseline))
    assert len(matches) == 54
    period = 60 / 130
    t0 = .344 + offset
    # Climax acts use the transferred musical grid; lyric-line starts need not be beats.
    overrides = {"F01": t0+320*period,"F02":t0+328*period,"F03":t0+336*period,
                 "F04":t0+344*period,"F05":t0+350*period,
                 # Editorial tail: new input, recognition, shared drawing before final accent.
                 "H02":t0+422*period,"H03":t0+428*period,"H04":t0+434*period,
                 "H05":205.6276,"H06":207.15}
    shots=[]
    for m in matches:
        g=m.groups(); old_start=int(g[1])*60+int(g[2])+int(g[3])/1000
        old_end=int(g[4])*60+int(g[5])+int(g[6])/1000
        t=max(0, old_start+offset) if g[0]!="A01" else 0
        if g[0] in overrides:t=overrides[g[0]]
        frame=round(t*FPS)
        basis="inherited line/editorial reference transferred by measured source offset"
        if g[0].startswith("F") and g[0] in overrides:basis="musical grid transferred using multiband signal alignment; not a verified phoneme onset"
        elif g[0] in ["H02","H03","H04"]:basis="editorial action on transferred grid; preserves recognition and shared drawing"
        elif g[0]=="H05":basis="two mixed-audio transient methods approximately 205.625-205.631s; selected 60fps accent"
        elif g[0]=="H06":basis="editorial decay-to-quiet transition supported by measured RMS thresholds"
        shots.append({"id":g[0],"previous_reference_start_s":old_start,"previous_reference_end_s":old_end,
                      "start_frame":frame,"start_s":frame/FPS,"basis":basis})
    for i,shot in enumerate(shots):
        shot["end_frame"]=shots[i+1]["start_frame"] if i+1<len(shots) else math.ceil(duration*FPS)
        shot["end_s"]=shot["end_frame"]/FPS
        shot["duration_frames"]=shot["end_frame"]-shot["start_frame"]
        assert shot["duration_frames"]>0
    cues=[]
    for name,first,count,step in [("push",320,12,2),("unlock",344,6,1)]:
        for i in range(count):
            candidate=t0+(first+i*step)*period; frame=round(candidate*FPS)
            cues.append({"id":f"{name}_{i+1:02}","candidate_s":candidate,"frame60":frame,"frame_time_s":frame/FPS,
                         "basis":"transferred music beat; independently inspect accents around this point"})
    for name,candidate,basis in [
        ("loop_break",162.57+offset,"inherited shout subdivision plus measured source offset; phoneme not verified"),
        ("wing_expand_strong_beat",t0+352*period,"strong beat after inherited vocal pickup"),
        ("star_light_start",shots[-2]["start_s"],"mixed-transient accent selected from actual source"),
        ("star_light_peak",206.1,"mixed-transient candidates 206.095-206.101s; visual peak"),
        ("near_silent_tail",208.0,"source stays below -80 dBFS from approximately 207.987s")]:
        frame=round(candidate*FPS)
        cues.append({"id":name,"candidate_s":candidate,"frame60":frame,"frame_time_s":frame/FPS,"basis":basis})
    result={"baseline_commit":BASELINE,"audio_sha256":alignment["source"]["sha256"],
            "audio_file":alignment["source"]["path"],"actual_audio_duration_s":duration,"fps":FPS,
            "video_plan_end_frame_exclusive":shots[-1]["end_frame"],
            "video_plan_duration_s":shots[-1]["end_s"],
            "final_frame_rounding_hold_ms":(shots[-1]["end_s"]-duration)*1000,
            "fixed_offset_s":offset,"beat_grid":{"bpm":130,"source_t0_s":t0},
            "evidence_boundary":"source alignment, mixed-audio accents and tail energy measured; no isolated-vocal/word listening verification; no video render",
            "shots":shots,"action_cues":cues}
    path=ROOT/"docs/audio/calibrated_timeline.json"
    path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"54 shots, {shots[-1]['end_frame']} frames, {shots[-1]['end_s']:.6f}s editorial plan")
    for s in shots:
        if s['id'].startswith(('F','G','H')):print(s['id'],f"{s['start_s']:.3f}-{s['end_s']:.3f}",s['start_frame'],s['end_frame'])


if __name__=="__main__":main()

"""Copy existing H264 + existing AAC packets into three review-only clips."""
from pathlib import Path
from fractions import Fraction
import hashlib
import json
import re
import subprocess
import sys
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"tools/render"))
from verify_sample import alignment
from verify_full_mv import stream_metadata

WORK = Path(__file__).resolve().parent
EVIDENCE = WORK/"review-aac-evidence"
FF = ROOT/".cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe"
AAC = ROOT/"exports/astra-world-execute-me-final-v5-playback-4k60.mp4"
FORMAL = ROOT/"exports/astra-world-execute-me-final-v5.1-cat-warning-hires-4k60.mp4"
FORMAL_V5 = ROOT/"exports/astra-world-execute-me-final-v5-warning-hires-4k60.mp4"
RATE,FPS,PACKET = 24000,60,Fraction(1024,48000)
SEGMENTS = [
    {"id":"01-opening","body_start":0,"frames":237,"windows":[.25,1.5,2.5],"input_sha256":"91d86090db50a1d6cd480bde19314956ad8e6bad88c9d6e92fe63c3c883d0025"},
    {"id":"02-climax","body_start":164,"frames":420,"windows":[.5,2.6,5.5],"input_sha256":"e7a14cda100e26ecca0b5e7593ec07426333074f2273a134706d2c30a2d8613a"},
    {"id":"03-release-reply","body_start":201.5,"frames":480,"windows":[.4,1.8,3.7],"input_sha256":"db50fceea40121c205fe71b9191eb6a4354a60cf0dd42a07297e426efb9e6f3f"},
]


def sha(path):
    with path.open("rb") as f:
        return hashlib.file_digest(f,"sha256").hexdigest()


def run(args):
    return subprocess.run([str(FF),"-hide_banner",*map(str,args)],capture_output=True)


def checked(args,label):
    r=run(args)
    if r.returncode:
        raise RuntimeError(label+": "+r.stderr.decode(errors="replace"))
    return r


def save(path,data):
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2,allow_nan=False)+"\n",encoding="utf-8")


def audio(path):
    r=checked(["-v","error","-i",path,"-map","0:a:0","-vn","-ac","1","-ar",RATE,"-f","f32le","-"],"audio decode")
    assert not r.stderr.strip(),r.stderr.decode(errors="replace")
    return np.frombuffer(r.stdout,dtype="<f4").astype(np.float64)


def packets(path,stream,label):
    r=checked(["-v","error","-i",path,"-map",f"0:{stream}:0","-c","copy","-f","framehash","-hash","sha256","-"],"packet scan")
    assert not r.stderr.strip(),r.stderr.decode(errors="replace")
    text=r.stdout.decode()
    (EVIDENCE/(label+".framehash")).write_text(text,encoding="utf-8")
    match=re.search(r"#tb 0:\s*(\d+)/(\d+)",text)
    assert match
    tb=Fraction(int(match[1]),int(match[2]))
    rows=[]
    for line in text.splitlines():
        if not line or line.startswith("#"):continue
        p=[v.strip() for v in line.split(",")]
        rows.append({"dts":int(p[1]),"pts":int(p[2]),"duration":int(p[3]),"size":int(p[4]),"sha256":p[5]})
    return rows,tb


def audio_presentation(path,label):
    r=checked(["-v","info","-i",path,"-map","0:a:0","-vn","-af","ashowinfo","-f","null","-"],"decoded audio PTS")
    text=r.stderr.decode(errors="replace")
    (EVIDENCE/(label+"-audio-presentation.log")).write_text(text,encoding="utf-8")
    rows=[{"index":int(m[0]),"pts":int(m[1]),"rate":int(m[2]),"samples":int(m[3])}
          for m in re.findall(r"n:(\d+) pts:(-?\d+) pts_time:\S+.*?rate:(\d+) nb_samples:(\d+)",text)]
    assert rows,"No decoded audio presentation timestamps"
    return {"decoded_audio_frame_count":len(rows),"sample_rate":rows[0]["rate"],
            "first_pts_samples":rows[0]["pts"],"first_pts_seconds":rows[0]["pts"]/rows[0]["rate"],
            "first_frame_samples_after_skip":rows[0]["samples"],
            "end_sample_exclusive":rows[-1]["pts"]+rows[-1]["samples"],
            "end_seconds":(rows[-1]["pts"]+rows[-1]["samples"])/rows[-1]["rate"],
            "all_frames_contiguous":all(y["pts"]==x["pts"]+x["samples"] for x,y in zip(rows,rows[1:])),
            "all_frames_48k":all(x["rate"]==48000 for x in rows)}


def main():
    EVIDENCE.mkdir(exist_ok=True)
    expected={AAC:"65d6ebc725912a6b8c2eaee2c378cde3eab204342b025d127dd829890cf50e17",
              FORMAL:"19f4a76abfc61c1990d056d018e164ec61e93d147af1436f244cfa57261b7407",
              FORMAL_V5:"ae6cf8ed08346c0a58e2384ae24d9d8a86d300d684a66d6faf41653f534c73f0"}
    for s in SEGMENTS:expected[WORK/(s["id"]+"-4k60.mp4")]=s["input_sha256"]
    protected=[{"path":str(p),"sha256_before":sha(p),"expected_sha256":h} for p,h in expected.items()]
    assert all(x["sha256_before"]==x["expected_sha256"] for x in protected)
    save(EVIDENCE/"protected-before.json",protected)
    print("Protected sources match; copying video and AAC packets only",flush=True)
    for s in SEGMENTS:
        src=WORK/(s["id"]+"-4k60.mp4")
        out=WORK/(s["id"]+"-4k60-review-aac.mp4")
        s.update(input=str(src),output=str(out),full_start=s["body_start"]+5,duration=s["frames"]/FPS)
        command=["-v","warning","-n","-i",src,"-ss",f"{s['full_start']:.9f}","-i",AAC,
                 "-map","0:v:0","-map","1:a:0","-c:v","copy","-c:a","copy",
                 "-t",f"{s['duration']:.9f}","-video_track_timescale","60000",
                 "-disposition:a:0","default","-metadata:s:a:0","title=Existing AAC-LC packet copy for short review",
                 "-metadata","comment=Review-only short clip; existing v52 H264 and prior v5 AAC packets copied without video or audio encoding; formal ALAC source preserved",
                 "-movflags","+faststart",out]
        save(EVIDENCE/(s["id"]+"-command.json"),list(map(str,[FF,*command])))
        if not out.exists():
            r=checked(command,"mux "+s["id"])
            (EVIDENCE/(s["id"]+"-mux.log")).write_bytes(r.stderr)
        print("Copied "+out.name,flush=True)

    src_audio=audio(AAC)
    source_packets,source_tb=packets(AAC,"a","source-v5-aac")
    report={"passed":False,"review_only":True,"full_film_export":False,"video_encode_count":0,"audio_encode_count":0,
            "audio_source":str(AAC),"audio_source_sha256":expected[AAC],"source_audio_codec":"AAC-LC 48000 Hz stereo",
            "time_mapping":"full AAC start = body start + 5 seconds; no old source offset applied",
            "aac_packet_samples":1024,"aac_sample_rate":48000,"aac_packet_duration_seconds":float(PACKET),
            "items":[],"scope":"Complete short-clip video/audio decoding, every copied video packet/PTS, AAC contiguous source-payload identity and exact PTS offset, three distributed audio windows against AAC source and original ALAC clip. No full-film export and no audio re-encoding. Human player/speaker behavior not claimed."}
    for s in SEGMENTS:
        src,out=Path(s["input"]),Path(s["output"])
        meta=stream_metadata(FF,out)
        r=checked(["-v","error","-nostats","-i",out,"-map","0:v:0","-an","-fps_mode","passthrough","-progress","pipe:1","-f","null","-"],"full video decode")
        counts=re.findall(r"^frame=(\d+)\s*$",r.stdout.decode(),re.M)
        decoded=int(counts[-1]) if counts else None
        assert not r.stderr.strip(),r.stderr.decode(errors="replace")
        original_video,tb_in=packets(src,"v",s["id"]+"-original-video")
        output_video,tb_out=packets(out,"v",s["id"]+"-review-video")
        output_aac,tb_aac=packets(out,"a",s["id"]+"-review-aac")
        presentation=audio_presentation(out,s["id"])
        output_pcm=audio(out)
        original_pcm=audio(src)
        reference=src_audio[round(s["full_start"]*RATE):]
        windows=[]
        for t in s["windows"]:
            aa=alignment(reference,output_pcm,RATE,t,.6)
            al=alignment(original_pcm,output_pcm,RATE,t,.6)
            aa["passed"]=abs(aa["lag_seconds"])<=float(PACKET) and aa["normalized_correlation"]>=.999
            al["passed"]=abs(al["lag_seconds"])<=float(PACKET) and al["normalized_correlation"]>=.98
            windows.append({"clip_window_seconds":[t,t+.6],"full_source_window_seconds":[s["full_start"]+t,s["full_start"]+t+.6],
                            "against_existing_aac":aa,"against_original_alac_clip":al})
        candidates=[i for i,p in enumerate(source_packets) if (p["size"],p["sha256"])==(output_aac[0]["size"],output_aac[0]["sha256"])]
        starts=[]
        for i in candidates:
            seq=source_packets[i:i+len(output_aac)]
            if len(seq)==len(output_aac) and all((x["size"],x["sha256"])==(y["size"],y["sha256"]) for x,y in zip(seq,output_aac)):
                starts.append(i)
        assert starts,"AAC payloads are not a contiguous untouched source sequence"
        first=min(starts,key=lambda i:abs(float(source_packets[i]["pts"]*source_tb)-s["full_start"]))
        selected=source_packets[first:first+len(output_aac)]
        offset=Fraction(str(s["full_start"]))
        audio_offsets=[x["pts"]*source_tb-y["pts"]*tb_aac for x,y in zip(selected,output_aac)]
        packet_start=selected[0]["pts"]*source_tb
        packet_end=(selected[-1]["pts"]+selected[-1]["duration"])*source_tb
        first_presented_index=next(i for i,p in enumerate(output_aac) if (p["pts"]+p["duration"])*tb_aac>0)
        first_presented_source_start=selected[first_presented_index]["pts"]*source_tb
        pts=sorted(p["pts"]*tb_out for p in output_video)
        audio_duration=len(output_pcm)/RATE
        checks={
            "video_metadata_4k60":meta["resolution"]==[3840,2160] and meta["nominal_fps"]==60,
            "audio_is_existing_AAC_LC_48k_stereo":"aac (LC)" in meta["audio_stream"] and "48000 Hz, stereo" in meta["audio_stream"],
            "clean_complete_video_decode_exact_frames":decoded==s["frames"],
            "clean_complete_audio_decode":len(output_pcm)>0,
            "every_video_packet_identical":len(original_video)==len(output_video)==s["frames"] and all((x["size"],x["sha256"])==(y["size"],y["sha256"]) for x,y in zip(original_video,output_video)),
            "every_video_pts_exact_n_over_60":len(pts)==s["frames"] and all(t==Fraction(i,FPS) for i,t in enumerate(pts)),
            "video_dts_strictly_increasing":all(x["dts"]<y["dts"] for x,y in zip(output_video,output_video[1:])),
            "every_video_packet_duration_one_frame":all(p["duration"]*tb_out==Fraction(1,FPS) for p in output_video),
            "AAC_payloads_contiguous_source_sequence":True,
            "AAC_all_packet_pts_shift_exact_full_start":all(x==offset for x in audio_offsets),
            "AAC_dts_strictly_increasing":all(x["dts"]<y["dts"] for x,y in zip(output_aac,output_aac[1:])),
            "AAC_first_presented_packet_boundary_within_one_packet_of_trim":abs(first_presented_source_start-offset)<=PACKET,
            "AAC_decoder_presentation_starts_exactly_zero":presentation["first_pts_samples"]==0,
            "AAC_all_decoded_audio_pts_contiguous_48k":presentation["all_frames_contiguous"] and presentation["all_frames_48k"],
            "AAC_last_source_packet_end_within_one_packet_of_trim":abs(packet_end-offset-Fraction(str(s["duration"])))<=PACKET,
            "decoded_audio_endpoint_within_one_AAC_packet":abs(audio_duration-s["duration"])<=float(PACKET)+1/RATE,
            "all_three_AAC_alignment_windows_pass":all(w["against_existing_aac"]["passed"] for w in windows),
            "all_three_original_ALAC_alignment_windows_pass":all(w["against_original_alac_clip"]["passed"] for w in windows),
        }
        item={**s,"passed":all(checks.values()),"checks":checks,"sha256":sha(out),"bytes":out.stat().st_size,
              "metadata":meta,"decoded_frames":decoded,"video_duration_seconds":s["duration"],
              "decoded_audio_duration_seconds":audio_duration,"audio_endpoint_minus_video_ms":(audio_duration-s["duration"])*1000,
              "video_timebase":str(tb_out),"video_first_pts":str(pts[0]),"video_last_pts":str(pts[-1]),
              "aac_packet_timebase":str(tb_aac),"aac_packet_count":len(output_aac),"source_aac_packet_index_start":first,
              "source_first_aac_packet_seconds":float(packet_start),"source_last_aac_packet_end_seconds":float(packet_end),
              "first_packet_minus_requested_start_ms":float(packet_start-offset)*1000,
              "retained_inaudible_preroll_packet_count":first_presented_index,
              "preroll_boundary_explanation":"Negative-PTS AAC decode-preroll packets are retained unchanged from the source. MP4 skip/edit metadata discards them; ashowinfo independently confirms first presented PCM PTS=0 and contiguous 48k audio. Physical first packet is not the playback start.",
              "first_presented_packet_source_start_seconds":float(first_presented_source_start),
              "first_presented_packet_boundary_minus_requested_start_ms":float(first_presented_source_start-offset)*1000,
              "decoded_audio_presentation":presentation,
              "last_packet_end_minus_requested_end_ms":float(packet_end-offset-Fraction(str(s["duration"])))*1000,
              "aac_packet_pts_offsets_seconds":sorted(set(map(float,audio_offsets))),"audio_alignment_windows":windows}
        report["items"].append(item)
        save(EVIDENCE/(s["id"]+"-review-aac-verification.json"),item)
        save(WORK/"review-aac-delivery.json",report)
        print(json.dumps({"id":s["id"],"passed":item["passed"],"checks":checks,"audio_endpoint_ms":item["audio_endpoint_minus_video_ms"]}),flush=True)
    for p in protected:
        p["sha256_after"]=sha(Path(p["path"]))
        p["unchanged"]=p["sha256_after"]==p["sha256_before"]
    report["protected_files"]=protected
    report["all_protected_sources_unchanged"]=all(p["unchanged"] for p in protected)
    report["passed"]=len(report["items"])==3 and all(x["passed"] for x in report["items"]) and report["all_protected_sources_unchanged"]
    save(WORK/"review-aac-delivery.json",report)
    if not report["passed"]:raise SystemExit("Review AAC verification failed; inspect report")
    print("ALL THREE REVIEW AAC CLIPS VERIFIED",flush=True)


if __name__=="__main__":main()

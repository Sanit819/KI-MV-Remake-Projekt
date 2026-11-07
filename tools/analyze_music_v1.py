#!/usr/bin/env python3
"""Create v1 candidates without modifying the formal lyric/source files.

Reference frame anchors are manually annotated from the local official-MV
review. They are display/layout cues, not claimed phoneme boundaries.
"""
from pathlib import Path
import argparse
import hashlib
import json
import os
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PIPELINE = ROOT.parent / 'vocaloid-style-mv-pipeline'
OUT = ROOT / 'production/v1/timeline'
AUDIO = ROOT / 'local-source/audio/07 太陽系デスコ.flac'
OFFSET = 0.084125
DURATION = 203.2


def write(name, value):
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def sec(frame):
    return round(max(0.0, frame / 30 - OFFSET), 6)


def lyrics():
    source = json.loads((ROOT / 'lyrics/lyrics.json').read_text(encoding='utf-8-sig'))
    story = json.loads((ROOT / 'storyboard/story-proposal-v1.json').read_text(encoding='utf-8-sig'))
    # Na-na repeats are editorial clusters. User supplies three lyric groups;
    # original shows repeated wall text rather than one clean subtitle per line.
    frames = [34,149,226,334,814,910,1006,1102,1198,1294,1390,1486,
              1582,1630,1671,1762,1870,1954,2062,2158,2206,2302,2398,2494,
              2554,2650,2746,2926,3016,3118,3214,3310,3406,3502,3598,
              3694,3742,3778,3874,3982,4066,4174,4258,4366,4450,4558,
              4642,4750,4846,4942,5038,5086,5182,5278,5374,5470,5566,5662]
    assert len(frames) == 58
    special_end = {4:430, 27:2926, 58:5854}
    estimated = {26,27,57,58}
    onset_before_text = {17,19,39,40,44,45,46,48,50}
    mapping = {x['lyric_id']: x for x in story['lyric_map']}
    entries = []
    for i, (row, frame) in enumerate(zip(source['entries'], frames), 1):
        end_frame = special_end.get(i, frames[i] if i < 58 else 5854)
        evidence = 'reference_mv_visual_subtitle_or_layout_cue'
        note = '参考字幕/排版出现或清场换句的视觉锚点；不是已耳听确认的歌声起止。'
        if i in estimated:
            evidence = 'editorial_repeat_cluster_estimate'
            note = '重复拟声段按8拍单位分组；末组保留余下重复。用户三组文字与原MV文字墙不能逐组一一对应，供第一版调度，不是逐词对齐。'
        elif i in onset_before_text:
            note += '使用该句的清场/排版起点，文字可能在随后数帧才完全可辨。'
        entry = dict(row)
        entry.update(start=sec(frame), end=sec(end_frame),
                     timing_status='production_candidate_not_formal_alignment',
                     reference_start_frame=frame, reference_end_frame=end_frame,
                     reference_timebase='30 fps decoded reference video; zero-based frame; end exclusive',
                     timing_evidence=evidence, timing_note=note,
                     scene_id=mapping[row['id']]['scene_id'], action=mapping[row['id']]['action'])
        entries.append(entry)
    gaps = [dict(id='G00', start=0.0,end=sec(34),purpose='开场留白/旧星准备',lyrics=False),
            dict(id='I01',start=sec(430),end=sec(814),purpose='片名与双人舞间奏',lyrics=False),
            dict(id='I02',start=sec(5854),end=DURATION,purpose='已画成的新星与旧星结果展示、片尾',lyrics=False)]
    chapters = [
        ('C01','那颗星今天开始打拍子',0,814,1,4),
        ('C02','舞池越来越不像正常地方',814,1582,5,12),
        ('C03','舞步真的能把世界画出来',1582,2158,13,19),
        ('C04','把星光寄给站在旁边的人',2158,2926,20,27),
        ('C05','Astra主动把舞台翻过来了',2926,3310,28,31),
        ('C06','少说一句，多接一笔',3310,3874,32,38),
        ('C07','跑出轨道，就把手伸出来',3874,4258,39,42),
        ('C08','把彼此的乱画都带上',4258,5038,43,50),
        ('C09','让观众真的看到两人把星画完',5038,6096,51,58),
    ]
    ch = [dict(id=a,title=b,start=sec(c) if c else 0.0,end=sec(d) if d<6096 else DURATION,
               lyric_ids=[f'L{x:03d}' for x in range(e,f+1)],timing_status='candidate') for a,b,c,d,e,f in chapters]
    data = dict(schema_version=1, status='production_candidate', timebase='provided FLAC first sample = 0',
                duration_seconds=DURATION, fps=30, frame_count=6096,
                source='lyrics/lyrics.json', reference='source/video-avc.mp4',
                audio_reference_offset_seconds=OFFSET,
                transform='flac_seconds = reference_frame / 30 - 0.084125',
                evidence='All nine 1-second overview sheets and existing continuous-frame reports; selected exact frames inspected. Repeated-na allocations are editorial estimates. No actual auditory review or phoneme alignment claimed.',
                end_policy='end is display-window end (next cue or section boundary), not measured vocal release',
                formal_lyrics_file_modified=False, entries=entries, gaps=gaps, chapters=ch,
                drawing_window=dict(start=sec(5566),end=sec(5854),
                    note='9.6 seconds for actual alternating blue/purple star drawing, closure, blue tail and purple extra bend; may start transition during L056. Complete before I02.'))
    assert all(e['start'] < e['end'] for e in entries)
    assert all(entries[i]['end'] <= entries[i+1]['start'] for i in range(57))
    write('lyrics-candidate.json', data)
    print('lyrics-candidate.json: 58 entries, 9 chapters, 3 gaps', flush=True)


def rhythm():
    import numpy as np
    import librosa
    from scipy.signal import find_peaks
    ffmpeg = PIPELINE / '_tools/ffmpeg/bin/ffmpeg.exe'
    command = [str(ffmpeg), '-v','error','-i',str(AUDIO),'-ac','1','-ar','24000','-f','f32le','pipe:1']
    raw = subprocess.check_output(command)
    y = np.frombuffer(raw,dtype='<f4').copy()
    sr, hop = 24000, 240
    env = librosa.onset.onset_strength(y=y,sr=sr,hop_length=hop,n_fft=1024)
    # Integer lag gives 150 BPM at 100Hz; also estimate local dominant lag.
    centered = env - np.mean(env)
    ac = np.fft.irfft(np.abs(np.fft.rfft(centered, n=2*len(env)))**2)[:len(env)]
    lags = np.arange(30,61)
    top = sorted(((float(ac[x]),int(x),6000/x) for x in lags),reverse=True)[:8]
    main_lag = top[0][1]
    # Sub-frame parabola estimates period but long-term grid uses reviewed
    # 12-video-frame (=.4s) cadence, after acoustic lag verification below.
    den = ac[main_lag-1]-2*ac[main_lag]+ac[main_lag+1]
    correction = .5*(ac[main_lag-1]-ac[main_lag+1])/den if den else 0
    period = .4
    phases = np.arange(0,period,.001)
    et = np.arange(len(env))*hop/sr
    scores = [float(np.mean(np.interp(np.arange(p,DURATION,period),et,env))) for p in phases]
    phase = float(phases[int(np.argmax(scores))])
    peaks,_ = find_peaks(env,distance=12,prominence=float(np.percentile(env,65))*.35)
    peak_times = et[peaks]
    # Retain the calibrated regular grid separately from measured onset peaks.
    beats = np.arange(phase,DURATION,period)
    local = []
    for a in range(0,200,20):
        z = centered[int(a*100):int((a+20)*100)]
        az = np.correlate(z,z,mode='full')[len(z)-1:]
        lag = int(lags[np.argmax(az[lags])])
        ps = [float(np.mean(np.interp(np.arange(a+p,a+20,period),et,env))) for p in phases]
        lp = float(phases[int(np.argmax(ps))])
        local.append(dict(start=a,end=a+20,dominant_bpm=round(6000/lag,4),phase_seconds=lp))
    # RMS at final video frame rate; retain normalized envelopes for tiny motion accents.
    frame_rms = [float(np.sqrt(np.mean(y[int(f*sr/30):int((f+1)*sr/30)]**2))) for f in range(6096)]
    p95 = float(np.percentile(frame_rms,95))
    data = dict(schema_version=1,timebase='provided FLAC first sample = 0',duration_seconds=DURATION,
                audio='local-source/audio/07 太陽系デスコ.flac',audio_sha256=hashlib.sha256(AUDIO.read_bytes()).hexdigest(),
                source_unchanged=True, analysis_method='FLAC temporarily decoded in memory to mono 24 kHz; librosa spectral-flux onset envelope (hop .01s), autocorrelation, onset-grid phase scan',
                bpm=150.0,beat_period_seconds=period,beat_phase_seconds=phase,
                bpm_status='regularized_visual_and_acoustic_candidate_not_manual_tap_annotation',
                strongest_acoustic_lag_bpm=round(6000/main_lag,5),
                parabolic_acoustic_lag_bpm=round(float(60/((main_lag+correction)/100)),5),
                autocorrelation_candidates=[dict(lag_frames=l,bpm=round(b,5),score=s) for s,l,b in top],
                local_windows=local,
                beats=[round(float(x),6) for x in beats],
                onset_peaks=[round(float(x),6) for x in peak_times],
                normalized_rms_30fps=[round(min(1.5,x/p95),4) for x in frame_rms],
                downbeats=[],downbeat_status='not inferred; beat phase does not establish bar position',
                limitations=['Synthetic vocal/polyphonic mix; spectral onsets can be syllables or subdivisions.','Grid uses stable 150 BPM candidate, not independently annotated each-beat times.','Local phase can favor .020 or .220 seconds (half-beat ambiguity); no bar/downbeat claim.','No ear-listening or percussion stem separation claimed.','Analysis decode does not alter audio master or final stream-copy requirement.'])
    write('rhythm-analysis.json',data)
    print(json.dumps({k:data[k] for k in ['bpm','beat_phase_seconds','strongest_acoustic_lag_bpm','parabolic_acoustic_lag_bpm','local_windows']},ensure_ascii=False),flush=True)


def asr():
    import numpy as np
    sys.path.insert(0,str(PIPELINE/'skills/vocaloid-style-mv/template/tools'))
    import kit_env
    kit_env.add_nvidia_dll_dirs()
    from faster_whisper import WhisperModel
    model_dir = PIPELINE/'_models/huggingface/hub/models--Systran--faster-whisper-large-v3/snapshots/edaa852ec7e145841d8ffdb056a99866b5f3a478'
    if not model_dir.is_dir():
        model_dir = next((PIPELINE/'_models/huggingface/hub/models--Systran--faster-whisper-large-v3/snapshots').iterdir())
    model = WhisperModel(str(model_dir),device='cuda',compute_type='float16',local_files_only=True)
    # Installed PyAV and faster-whisper have an incompatible metadata_errors
    # argument. Supplying decoded in-memory PCM avoids changing dependencies.
    ffmpeg = PIPELINE / '_tools/ffmpeg/bin/ffmpeg.exe'
    raw = subprocess.check_output([str(ffmpeg),'-v','error','-i',str(AUDIO),'-ac','1','-ar','16000','-f','f32le','pipe:1'])
    pcm = np.frombuffer(raw,dtype='<f4').copy()
    segments,info = model.transcribe(pcm,language='ja',beam_size=5,word_timestamps=True,
                                    condition_on_previous_text=False,vad_filter=False)
    results=[]
    for s in segments:
        results.append(dict(start=s.start,end=s.end,text=s.text,avg_logprob=s.avg_logprob,
                            words=[dict(w=w.word,start=w.start,end=w.end,p=w.probability) for w in (s.words or [])]))
        print(f'{s.start:.2f}-{s.end:.2f} {s.text}',flush=True)
        write('asr-candidate.json',dict(status='raw_automatic_asr_not_lyric_alignment',model='cached faster-whisper-large-v3',
            language=info.language,timebase='FLAC',segments=results))
    write('asr-candidate.json',dict(status='completed_raw_automatic_asr_not_lyric_alignment',
        model='cached faster-whisper-large-v3',language=info.language,timebase='FLAC',segments=results,
        warning='Polyphonic synthetic singing has many incorrect words and instrumental hallucinations. Never use raw ASR text as lyrics.'))


def verify():
    lyric_path = ROOT / 'lyrics/lyrics.json'
    formal = json.loads(lyric_path.read_text(encoding='utf-8-sig'))
    candidate = json.loads((OUT/'lyrics-candidate.json').read_text(encoding='utf-8'))
    rhythm_data = json.loads((OUT/'rhythm-analysis.json').read_text(encoding='utf-8'))
    checks = dict(
        all_58_formal_times_remain_null=all(e['start'] is None and e['end'] is None for e in formal['entries']),
        formal_sha256_unchanged=hashlib.sha256(lyric_path.read_bytes()).hexdigest()=='2a7588e0de9a4b922f79fc609f7810f6147f758b4915f0cc10dad14ad0db42de',
        flac_sha256_unchanged=hashlib.sha256(AUDIO.read_bytes()).hexdigest()=='0139c2441bf35e98951ca46b5e8395a71c8aa4b2629c4f5c3a1079881d019ac9',
        exactly_58_candidate_entries=len(candidate['entries'])==58,
        original_ja_zh_preserved=all(x['ja']==y['ja'] and x['zh']==y['zh'] for x,y in zip(formal['entries'],candidate['entries'])),
        candidate_times_ordered=all(e['start']<e['end'] for e in candidate['entries']) and all(candidate['entries'][i]['end']<=candidate['entries'][i+1]['start'] for i in range(57)),
        nine_chapters=len(candidate['chapters'])==9,
        rms_matches_6096_frames=len(rhythm_data['normalized_rms_30fps'])==6096,
        all_10_tempo_windows_150=all(x['dominant_bpm']==150 for x in rhythm_data['local_windows']),
        drawing_finishes_before_outro=candidate['drawing_window']['end']==next(g['start'] for g in candidate['gaps'] if g['id']=='I02'))
    write('validation.json',dict(status='passed' if all(checks.values()) else 'failed',checks=checks,
        evidence_limits='Structural, hash and acoustic-analysis checks; not full video/audio artistic acceptance or ear-listening approval.'))
    print(json.dumps(checks,ensure_ascii=False),flush=True)
    assert all(checks.values())


if __name__ == '__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--lyrics',action='store_true')
    ap.add_argument('--rhythm',action='store_true')
    ap.add_argument('--asr',action='store_true')
    ap.add_argument('--verify',action='store_true')
    a=ap.parse_args()
    if a.lyrics: lyrics()
    if a.rhythm: rhythm()
    if a.asr: asr()
    if a.verify: verify()

"""Mux the three local music excerpts, export standalone studies and validate decoded files."""
import argparse, hashlib, json, subprocess
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FF = Path('D:/myskills/updream/vocaloid-style-mv-pipeline/_tools/ffmpeg/bin/ffmpeg.exe')
FP = FF.with_name('ffprobe.exe')
SOURCE = ROOT.parent / 'KI-MV-Remake-Projekt/exports/astra-world-execute-me-final-v5.2-lighting-artwork-hires-4k60.mp4'
SPECS = [('01-beyond-the-boundary', 0, 8, 56.13333333333333), ('02-an-unwritten-world', 8, 8, 37.6), ('03-six-unlocks', 16, 10, 160.08333333333334)]

def run(cmd):
    p = subprocess.run([str(x) for x in cmd], capture_output=True)
    if p.returncode:
        raise RuntimeError(p.stderr.decode('utf-8', errors='replace'))
    return p.stdout

def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        while b := f.read(1024 * 1024): h.update(b)
    return h.hexdigest()

def validate(p, seconds):
    result = json.loads(run([FP, '-v', 'error', '-show_streams', '-show_format', '-of', 'json', p]))
    v = next(s for s in result['streams'] if s['codec_type'] == 'video')
    a = next(s for s in result['streams'] if s['codec_type'] == 'audio')
    frames = json.loads(run([FP, '-v', 'error', '-select_streams', 'v:0', '-show_frames', '-show_entries', 'frame=best_effort_timestamp_time', '-of', 'json', p]))['frames']
    stamps = np.array([float(f['best_effort_timestamp_time']) for f in frames])
    checks = {'1080p': (v['width'], v['height']) == (1920, 1080), '60fps': v['r_frame_rate'] == '60/1', 'frame_count': len(stamps) == seconds*60, 'continuous_timestamps': bool(np.max(np.abs(stamps-np.arange(len(stamps))/60)) < .000002), 'audio_48k_stereo': a['sample_rate'] == '48000' and a['channels'] == 2, 'duration': abs(float(result['format']['duration'])-seconds) < .025}
    run([FF, '-v', 'error', '-i', p, '-f', 'null', '-'])
    checks['full_decode'] = True
    if not all(checks.values()): raise RuntimeError(f'{p}: {checks}')
    return {'file':str(p),'sha256':sha(p),'bytes':p.stat().st_size,'checks':checks}

def contact(p, folder):
    cap = cv2.VideoCapture(str(p)); images=[]; times=list(range(26))+[19.717,19.75,20.133,20.167,20.467,20.5,21.067,21.1,21.517,21.55,21.933,21.967,22.4,22.45]
    font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',18)
    for t in times:
        cap.set(cv2.CAP_PROP_POS_FRAMES,round(t*60)); ok, bgr=cap.read()
        if not ok: raise RuntimeError(f'Cannot decode sample {t}')
        rgb=Image.fromarray(cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB)); rgb.save(folder/f'frame-{round(t*60):04d}.jpg',quality=94)
        tile=Image.new('RGB',(480,298),'#0a0812'); tile.paste(rgb.resize((480,270)),(0,0));ImageDraw.Draw(tile).text((12,275),f'{t:06.3f}s / f{round(t*60):04d}',font=font,fill='#e9c57a'); images.append(tile)
    cap.release()
    for start,end,name in [(0,26,'overview'),(26,len(images),'unlock-neighbors')]:
        chosen=images[start:end];sheet=Image.new('RGB',(480*4,298*((len(chosen)+3)//4)),'#0a0812')
        for i,tile in enumerate(chosen):sheet.paste(tile,((i%4)*480,(i//4)*298))
        sheet.save(folder/f'{name}.jpg',quality=94)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--dir',default='exports/vfx-lab-v1');opts=ap.parse_args();out=(ROOT/opts.dir).resolve()
    if not out.is_relative_to((ROOT/'exports').resolve()) or out == (ROOT/'exports').resolve():
        raise ValueError('Write only inside this worktree exports directory')
    silent=out/'silent.mp4'; master=out/'astra-vfx-studies-v1-1080p60.mp4'
    filters=[]
    for i,(_,_,duration,start) in enumerate(SPECS):
        sample=round(start*192000)
        filters.append(f'[1:a]atrim=start_sample={sample}:end_sample={sample+duration*192000},asetpts=PTS-STARTPTS,aresample=48000[a{i}]')
    filters.append('[a0][a1][a2]concat=n=3:v=0:a=1[music]')
    run([FF,'-v','error','-n','-i',silent,'-i',SOURCE,'-filter_complex',';'.join(filters),'-map','0:v:0','-map','[music]','-c:v','copy','-c:a','aac','-b:a','320k','-ar','48000','-ac','2','-movflags','+faststart',master])
    results=[validate(master,26)]
    for name,offset,duration,source_start in SPECS:
        dest=out/f'{name}-1080p60.mp4'
        sample=round(source_start*192000)
        graph=f'[0:v]trim=start_frame={offset*60}:end_frame={(offset+duration)*60},setpts=PTS-STARTPTS[v];[1:a]atrim=start_sample={sample}:end_sample={sample+duration*192000},asetpts=PTS-STARTPTS,aresample=48000[a]'
        run([FF,'-v','error','-n','-i',silent,'-i',SOURCE,'-filter_complex',graph,'-map','[v]','-map','[a]','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','320k','-ar','48000','-movflags','+faststart',dest])
        results.append(validate(dest,duration))
    qa=out/'qa';qa.mkdir(exist_ok=True);contact(master,qa)
    report={'passed':True,'files':results,'audio_source':str(SOURCE),'audio_source_sha256':sha(SOURCE),'audio_intervals':[{'name':n,'combined_start':o,'source_full_start':s,'source_body_start':s-5,'duration':d,'source_first_sample_192k':round(s*192000)} for n,o,d,s in SPECS], 'scope':'All output frames and audio fully decoded, frame timestamps checked. Music is trimmed from local v5.2 at exact sample indices and downsampled to 48k AAC. Cue positions rely on existing production timeline; direct listening and continuous human visual review are not claimed.'}
    (out/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'passed':True,'files':[r['file'] for r in results]},ensure_ascii=False))

if __name__=='__main__':main()

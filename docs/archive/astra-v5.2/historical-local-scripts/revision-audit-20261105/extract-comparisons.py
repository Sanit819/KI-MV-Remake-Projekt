"""Read-only media audit: decoded reference/v1 frames, labelled by their own clocks."""
from pathlib import Path
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
FF = ROOT / '.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe'
REF = ROOT.parent / 'references/video-review/BV186pc65E68-video-480p30.mp4'
MV = ROOT / 'exports/astra-world-execute-me-full-v1-4k60.mp4'
CASES = [
    ('01-workspace-actions', [139,149], [124,133]),
    ('02-chorus-scale', [67.1,67.5], [64,68]),
    ('03-execution-pressure', [155.4,161.5], [149,153.4]),
    ('04-depth-crossing', [179,181], [164,167]),
    ('05-shape-action', [38,44], [35,42]),
    ('06-awakening', [171.4,174], [157,172]),
    ('07-workspace-origin', [10,14], [5.6,9]),
    ('08-warm-ending', [196.8,199.3], [206.1,211.8]),
    ('09-body-is-the-workspace', [168.7,172.7], [157,172]),
]
for name, reference_times, mv_times in CASES:
    if len(sys.argv) > 1 and name not in sys.argv[1:]:
        continue
    folder = OUT / name
    folder.mkdir(parents=True, exist_ok=True)
    for row, (video, label, times) in enumerate([(REF,'Claude player',reference_times), (MV,'ASTRA v1 song',mv_times)]):
        for column, second in enumerate(times):
            caption = f'{label} {second:.3f}s'
            vf = f"scale=640:360,pad=640:390:0:0:color=0x17151d,drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='{caption}':x=12:y=366:fontsize=19:fontcolor=white"
            subprocess.run([str(FF),'-y','-hide_banner','-loglevel','error','-ss',str(second),'-i',str(video),'-frames:v','1','-vf',vf,str(folder/f'{row*2+column:02}.png')],check=True)
    subprocess.run([str(FF),'-y','-hide_banner','-loglevel','error','-framerate','1','-i',str(folder/'%02d.png'),'-vf','tile=2x2','-frames:v','1',str(OUT/f'{name}.png')],check=True)
    print(name,flush=True)
(OUT/'comparison-manifest.json').write_text(json.dumps({'reference':str(REF),'our_actual_encoded_mv':str(MV),'time_basis':'Reference player seconds versus our song seconds; thematic comparisons, not shared clock alignment.','cases':[{'name':name,'reference_player_seconds':ref,'our_song_seconds':ours} for name,ref,ours in CASES]},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

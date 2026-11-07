"""Preserve user FLAC bytes, verify decoded PCM, and structure supplied lyric pairs."""
from pathlib import Path
import sys,hashlib,json,shutil,subprocess
for stream in (sys.stdout,sys.stderr):
    if hasattr(stream,'reconfigure'):stream.reconfigure(encoding='utf-8',errors='replace')
R=Path(__file__).resolve().parents[1]
ORIGINAL=Path(r'C:\Users\auscar\Desktop\07 太陽系デスコ.flac')
DEST=R/'local-source/audio'/ORIGINAL.name
BIN=Path(r'D:\myskills\updream\vocaloid-style-mv-pipeline\_tools\ffmpeg\bin')
def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(1048576),b''):h.update(b)
    return h.hexdigest()
def write(p,x):
    target=R/p;target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
before=sha(ORIGINAL);DEST.parent.mkdir(parents=True,exist_ok=True)
if DEST.exists():
    if sha(DEST)!=before:raise RuntimeError('Existing local master differs; preserve it and stop.')
else:shutil.copy2(ORIGINAL,DEST)
assert sha(DEST)==before
probe=json.loads(subprocess.check_output([str(BIN/'ffprobe.exe'),'-v','error','-show_streams','-show_format','-of','json',str(DEST)],encoding='utf-8'))
audio=next(x for x in probe['streams'] if x['codec_type']=='audio')
with DEST.open('rb') as f:
    assert f.read(4)==b'fLaC','Expected native FLAC header'
    h=f.read(4);assert h[0]&127==0 and int.from_bytes(h[1:],'big')==34
    streaminfo=f.read(34)
packed=int.from_bytes(streaminfo[10:18],'big')
sr=packed>>44;channels=((packed>>41)&7)+1;bits=((packed>>36)&31)+1;samples=packed&((1<<36)-1)
expected_md5=streaminfo[18:34].hex()
assert sr==int(audio['sample_rate']) and channels==audio['channels']
assert bits==16,'This intake checks the supplied 16-bit master without bit-depth conversion.'
p=subprocess.Popen([str(BIN/'ffmpeg.exe'),'-v','error','-xerror','-i',str(DEST),'-map','0:a:0','-c:a','pcm_s16le','-f','s16le','pipe:1'],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
pcm_hash=hashlib.md5();byte_count=0
for chunk in iter(lambda:p.stdout.read(1048576),b''):pcm_hash.update(chunk);byte_count+=len(chunk)
err=p.stderr.read().decode('utf-8',errors='replace');rc=p.wait()
assert rc==0,(rc,err)
assert byte_count==samples*channels*2
assert pcm_hash.hexdigest()==expected_md5
assert sha(ORIGINAL)==before==sha(DEST)
manifest={'received_date':'2026-11-07','provided_by':'user','original_path':str(ORIGINAL),'project_copy':str(DEST.relative_to(R)).replace('\\','/'),'bytes':DEST.stat().st_size,'sha256':before,'copy_byte_identical':True,'original_unchanged_after_validation':True,'codec':audio['codec_name'],'sample_rate_hz':sr,'bit_depth':bits,'channels':channels,'channel_layout':audio.get('channel_layout'),'samples_per_channel':samples,'duration_seconds':samples/sr,'duration_display':'03:23.200','flac_streaminfo_pcm_md5':expected_md5,'decoded_pcm_md5':pcm_hash.hexdigest(),'decoded_pcm_bytes':byte_count,'full_decode_passed':True,'flac_internal_md5_verified':True,'attached_cover_preserved':any(x.get('disposition',{}).get('attached_pic') for x in probe['streams']),'embedded_tags_unverified':probe['format'].get('tags',{}),'processing':'Original FLAC copied byte-for-byte. PCM decoded only for validation; no resampling, retagging, reencoding, trimming or gain adjustment of the master.','reference_video_duration_seconds':203.2,'version_match':'See separate analysis/audio-reference-comparison.json; equal duration alone is not proof of audio identity.'}
write('analysis/audio-source.json',manifest)
raw=R/'lyrics/user-provided.txt';text=raw.read_text(encoding='utf-8');lines=text.splitlines()
assert len(lines)==120 and lines[-1]=='ー終わりー'
body=lines[3:-1];assert len(body)%2==0
entries=[]
for i in range(0,len(body),2):
    entries.append({'id':f'L{i//2+1:03d}','source_lines':[i+4,i+5],'ja':body[i],'zh':body[i+1],'start':None,'end':None,'timing_status':'unassigned'})
lyric={'source':'User message received 2026-11-07; retained without wording or translation correction.','source_text_file':'lyrics/user-provided.txt','source_text_sha256':sha(raw),'credits_original':lines[:3],'language_pair':['ja','zh'],'pair_count':len(entries),'entries':entries,'end_marker_original':lines[-1],'end_marker_is_sung':None,'timebase':'Provided FLAC, time zero is its first audio sample.','timing_policy':'No precise vocal alignment established; preserve repeated lines and their distinct supplied translations as separate entries.','text_policy':'Retain readings in parentheses, punctuation, spaces, unusual wording and onomatopoeia. Do not silently normalize or correct.'}
roundtrip='\n'.join(lyric['credits_original']+[v for e in entries for v in (e['ja'],e['zh'])]+[lyric['end_marker_original']])+'\n'
assert roundtrip==text
write('lyrics/lyrics.json',lyric)
print(json.dumps({'file':manifest['project_copy'],'bytes':manifest['bytes'],'sha256':before,'sample_rate':sr,'bits':bits,'channels':channels,'samples_per_channel':samples,'duration':samples/sr,'pcm_md5_verified':True,'lyric_pairs':len(entries),'all_lyric_times_unassigned':True},ensure_ascii=False))

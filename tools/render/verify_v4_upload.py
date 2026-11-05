"""Existing independent full decode and PCM checks, isolated to v4 outputs."""
from pathlib import Path
import json, shutil
import prepend_warning_v3_verify as aac
import prepend_warning_v3_hires_verify as alac
from verify_sample import sha256
ROOT=Path(__file__).resolve().parents[2]

def main():
    aac.WORK=ROOT/'exports/warning-v4';aac.main()
    alac.WORK=ROOT/'exports/warning-v4-hires';aac.WORK=alac.WORK;alac.main()
    prefix_checks=[]
    aac.WORK=ROOT/'exports/warning-v4'
    render=json.loads((aac.WORK/'render.json').read_text(encoding='utf-8'))
    for item in render['inputs']:
        old,oldtb=aac.packets(Path(item['prefix_source']),item['key']+'-old-warning')
        new,newtb=aac.packets(Path(item['output']),item['key']+'-new-warning')
        same=all((a['sha256'],a['size'])==(b['sha256'],b['size']) for a,b in zip(old[:300],new[:300]))
        assert len(new)==13400 and same
        assert sha256(Path(item['prefix_source']))==item['prefix_source_sha256']
        prefix_checks.append({'key':item['key'],'prefix_300_packets_identical':same,'prior_warning_unchanged':True})
    for name in ('warning-v4','warning-v4-hires'):
        work=ROOT/'exports'/name
        result=json.loads((work/'verification.json').read_text(encoding='utf-8'));assert result['passed']
        result['purple_warning_prefix']=prefix_checks
        (work/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        dest=ROOT/'docs/validation'/name;dest.mkdir(parents=True,exist_ok=True)
        for fn in ('render.json','verification.json','4k60.full-verify.json','4k60.packets.json','1080p60.full-verify.json','1080p60.packets.json','independent-pcm-reference.json'):
            if (work/fn).exists():shutil.copy2(work/fn,dest/fn)
    print('V4 AAC/ALAC upload copies verified, purple warning preserved',flush=True)

if __name__=='__main__':main()

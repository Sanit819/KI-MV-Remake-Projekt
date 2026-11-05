"""Verify the purple/GPT warning-v2 derivatives using the established independent
video/PCM checks. Every original and prior warning export is retained.
"""
from __future__ import annotations
import json
import shutil
from pathlib import Path
import prepend_warning_v3_verify as aac
import prepend_warning_v3_hires_verify as alac
from verify_sample import sha256

ROOT=Path(__file__).resolve().parents[2]

def preserve_legacy():
    items=[]
    for version in ('warning-v3','warning-v3-hires'):
        prior=json.loads((ROOT/'exports'/version/'verification.json').read_text(encoding='utf-8'))
        if not prior['passed']: raise RuntimeError('Prior verification not passed: '+version)
        for item in prior['items']:
            file=Path(item['output']);actual=sha256(file)
            items.append({'file':str(file),'expected_sha256':item['sha256'],'actual_sha256':actual,'unchanged':actual==item['sha256']})
    return {'passed':all(x['unchanged'] for x in items),'items':items}

def main():
    legacy_before=preserve_legacy()
    if not legacy_before['passed']: raise RuntimeError('Prior warning exports changed')
    aac.WORK=ROOT/'exports/warning-v3-v2'
    aac.main()
    alac.WORK=ROOT/'exports/warning-v3-v2-hires'
    aac.WORK=alac.WORK
    alac.main()
    legacy_after=preserve_legacy()
    if not legacy_after['passed']: raise RuntimeError('Prior warning exports changed')
    for version in ('warning-v3-v2','warning-v3-v2-hires'):
        work=ROOT/'exports'/version
        report=json.loads((work/'verification.json').read_text(encoding='utf-8'))
        report['version']=version
        report['legacy_warning_outputs_unchanged']=legacy_after
        report['reuse_scope']='Only the first 300 picture frames were newly encoded. Previously verified AAC/ALAC bitstreams are copied; no new production audio encode or resample. Prior warning-v01 exports retained.'
        (work/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        target=ROOT/'docs/validation'/version;target.mkdir(parents=True,exist_ok=True)
        for name in ('render.json','verification.json','4k60.full-verify.json','4k60.packets.json','1080p60.full-verify.json','1080p60.packets.json','independent-pcm-reference.json'):
            if (work/name).exists(): shutil.copy2(work/name,target/name)
    print('[warning v2] All four exports verified; legacy exports unchanged',flush=True)

if __name__=='__main__':main()

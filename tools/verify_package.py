"""Check complete review coverage, local evidence references and inline JS syntax."""
from pathlib import Path
import hashlib,json,re,subprocess
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text(encoding='utf-8'))
a,b,c=[read(f'analysis/review-{x}.json') for x in 'abc']
pages=[x['file'] for x in a['all_pages_visually_inspected']]+b['reviewed_sheets']+c['all_frame_sheets_reviewed']
expected=[f'sheets/all-frames/all-{i:03d}.jpg' for i in range(51)]
assert pages==expected and len(set(pages))==51
assert a['range']['end_frame_exclusive']==b['frame_start']==2040
assert b['frame_end_exclusive']==c['reviewed_frame_range'][0]==4080
assert c['reviewed_frame_range'][1]==6096
for p in pages: assert (R/p).is_file(),p
full=sorted(set(a['full_size_frames_inspected']+b['source_resolution_frames_reviewed']+c['source_resolution_frames_reviewed']))
for f in full: assert (R/f'frames/f{f:06d}.jpg').is_file(),f
coverage={'review_date':'2026-11-07','source_bvid':'BV1UfZ2YwEP5','total_decoded_frames':6096,'visually_reviewed_contact_sheet_frames':6096,'continuous_frame_ranges':[[0,2040],[2040,4080],[4080,6096]],'unreviewed_contact_sheet_frames':0,'reviewed_sheet_count':51,'reviewed_sheets':pages,'source_resolution_detail_frame_count':len(full),'source_resolution_detail_frames':full,'root_additional_review':'All nine 1-second overviews, all-000, and focused original frames 1965,4744,4755,5854,6046.','audio_listened':False,'every_frame_source_resolution_reviewed':False,'method':'All consecutive thumbnails visually reviewed by three reviewers; selected source-size detail review; not full-size pixel-level review of every frame.','review_file_sha256':{f'analysis/review-{x}.json':hashlib.sha256((R/f'analysis/review-{x}.json').read_bytes()).hexdigest() for x in 'abc'}}
(R/'analysis/review-coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
body=(R/'index.html').read_text(encoding='utf-8');script=re.search(r'<script>(.*?)</script>',body,re.S).group(1)
cache=R/'.cache';cache.mkdir(exist_ok=True);(cache/'viewer-check.js').write_text(script,encoding='utf-8')
subprocess.run(['node','--check',str(cache/'viewer-check.js')],check=True)
missing=[]
for rel in re.findall(r'(?:href|src)="([^"]+)"',body):
    if not rel.startswith(('http:','https:','#')) and not (R/rel.split('#')[0]).exists():missing.append(rel)
assert not missing,missing
for p in R.glob('analysis/*.json'):read(str(p.relative_to(R)))
print(json.dumps({'continuous_visual_coverage':6096,'sheets':51,'source_detail_frames':len(full),'inline_js_syntax':'passed','html_local_links':'passed','analysis_json':'passed','browser_visual_runtime_test':False},ensure_ascii=False))

"""Read-only source/provenance check; writes reports and diagnostic crops only."""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib, json, math

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
GEN = Path('C:/Users/auscar/.codex/generated_images/01a1acd5-4240-7a52-bce1-fcd2e1dc582b')
SOURCES = {
    1: 'exec-5ee1c296-e70d-4cb0-9664-8d338b937d66.png',
    2: 'exec-852d2199-4e22-4c06-acac-52b59989b533.png',
    3: 'exec-02256cee-6216-4a5f-8cd0-71cc91d60ed2.png',
    4: 'exec-ef172081-7e8f-443f-9bce-7900ec82f2e5.png',
    5: 'exec-b9bbaabe-11a1-4d37-9f9c-71f1fc160f01.png',
}
PROTECTED = {
    'assets/astra/v09/A04-01-shadow.png': 'fbca1fe8e04d9e2d4dbb93ace79479be63a3fee8241dae2e33d96e8c19ecf1a7',
    'assets/astra/v09/A04-02-shadow.png': '6e1a9c6b0a0bad0277077ad8a61ac5ac7b92c53bc23054a66357c9657e2dec67',
    'assets/astra/v09/A04-03-shadow.png': '604716f07eb6c39e425e97b5960929127008f324d313f8bc2e33fbea18c96281',
    'assets/astra/v12-approved-cat/manifest.json': '6a8651a9e6626fc715d63e57b9c0258c3e73ed794e88199e52a69aabd14937f6',
    'src/mv5cat/middle.js': '793b27d8687cc48649c6a268bb39f7e91d38f24008f6ef2d42e7c9b03700edf5',
}
def sha(p):
    h=hashlib.sha256()
    with Path(p).open('rb') as f:
        for b in iter(lambda:f.read(1024*1024), b''): h.update(b)
    return h.hexdigest()
def dump(name,value):
    (HERE/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

common_refs = [ROOT/'assets/astra/v09/A04-01-shadow.png', Path('C:/Users/auscar/Documents/Tencent Files/2470641710/nt_qq/nt_data/Pic/2026-11/Ori/e0ec7a1db8d1862fe1135298bd354581.jpg'), ROOT/'assets/astra/v02/openai-openwork.png']
attempt_notes = {
    1: {'hands':'Receiving hand: thumb plus four long-finger contours read clearly. Chest hand was less explicit in its overlap.', 'framing':'Tail enters lower upper-body crop.', 'status':'retained candidate history; tail crop is not by itself an anatomy rejection'},
    2: {'hands':'Receiving hand reads five; four chest-hand long fingers clear, thumb is hidden/ambiguous behind the palm/hair. This is not proof of a missing thumb.', 'framing':'Complete coiled tail and tip.', 'status':'retained candidate history'},
    3: {'hands':'Chest palm reads five. Receiving hand has three separately readable long-finger contours; another may be occluded. Not proof of a missing finger.', 'framing':'Tail and tip are inside canvas.', 'status':'retained candidate history'},
    4: {'hands':'Both palms show one thumb and four independently readable long fingers. Wrist/forearm connections continuous in visual inspection.', 'framing':'Tail lower curve meets upper-body crop. Parent clarified this may be valid for upper-body composition and is not an automatic rejection.', 'status':'requested root review candidate; not production-approved'},
    5: {'hands':'Both palms show one thumb and four independently readable long fingers. No apparent sixth fingertip; wrist/forearm connections continuous.', 'framing':'Complete sleeve hems, wings, horns and compact tail with tapered tip; silhouette has margin at alpha greater than 8.', 'status':'additional review candidate completed before stop message; not production-approved'},
}
attempts=[]
for n,source in SOURCES.items():
    final=HERE/f'A04-02-wave-receive-v{n}.png'; origin=GEN/source
    im=Image.open(final).convert('RGBA'); alpha=im.getchannel('A'); hist=alpha.histogram()
    refs=common_refs if n<5 else [HERE/'A04-02-wave-receive-v4.png', ROOT/'assets/astra/v02/openai-openwork.png']
    attempts.append({'version':n,'path':str(final),'source':str(origin),'bytes':final.stat().st_size,'sha256':sha(final),'generated_source_sha256':sha(origin),'raw_generated_bytes_preserved':sha(final)==sha(origin),'dimensions':list(im.size),'alpha':{'zero_pixels':hist[0],'opaque_pixels':hist[255],'partial_pixels':sum(hist[1:255]),'nonzero_bbox':alpha.getbbox(),'bbox_alpha_gt8':alpha.point(lambda x:255 if x>8 else 0).getbbox(),'has_true_transparency':hist[0]>0},'prompt':str(HERE/f'A04-02-wave-receive-v{n}.prompt.txt'),'prompt_sha256':sha(HERE/f'A04-02-wave-receive-v{n}.prompt.txt'),'references':[{'path':str(r),'sha256':sha(r)} for r in refs],'visual_inspection':attempt_notes[n]})
protected=[{'path':p,'before_sha256':s,'after_sha256':sha(ROOT/p),'unchanged':sha(ROOT/p)==s} for p,s in PROTECTED.items()]
assert all(p['unchanged'] for p in protected), 'A protected source changed; inspect concurrent work before attributing.'
assert all(a['raw_generated_bytes_preserved'] and a['alpha']['has_true_transparency'] for a in attempts)

manifest=json.loads((ROOT/'assets/astra/v12-approved-cat/manifest.json').read_text(encoding='utf-8'))
phase_start=103.65+.32*(110.8-103.65);phase_end=103.65+.72*(110.8-103.65)
usage={'schema_version':1,'scope':'read-only active mv5cat mapping; no manifest/code/video modifications','user_screenshot':{'path':'C:/Users/auscar/AppData/Local/Temp/codex-clipboard-02a82788-193b-435f-a798-6b7f4cd349a2.png'},'full_time_seconds':113,'warning_prefix_seconds':5,'body_time_seconds':108,'body_frame_60fps':6480,'full_frame_60fps':6780,'source_loader':{'path':'src/mv5cat/art.js','line':9,'manifest':'assets/astra/v12-approved-cat/manifest.json'},'scene_function':{'path':'src/mv5cat/middle.js','line':325,'name':'resonance','callers':['R40','R41','R42','R43'],'action_line':328,'progress':'clamp((t-103.65)/(110.8-103.65))','phase_cuts':[.32,.72],'q_at_body108':(108-103.65)/(110.8-103.65)},'phase_selection':{'asset_id':'A04_02','phase':2,'continuous_body_interval_start_inclusive_end_exclusive':[phase_start,phase_end],'first_sampled_body_frame':math.ceil(phase_start*60-1e-8),'end_sampled_body_frame_exclusive':math.ceil(phase_end*60-1e-8)},'active_source':manifest['assets']['A04_02'],'related_source_assets':{k:manifest['assets'][k]['path'] for k in ['A04_01','A04_02','A04_03']},'important':'hands is an anchor name, not the source filename. New image dimensions/geometry differ: existing anchors must not be reused without new measurement. No integration performed.'}
dump('usage-audit.json',usage)
report={'schema_version':1,'date':'2026-11-06','tool':'built-in image_gen.imagegen','method':'Complete-pose generation requested each time. v1-v4 use identity/style/topology references; v5 uses v4 only as pose-design guide plus topology reference. No masks, local inpainting, code-drawn hands, pasted logos, compositing or production replacement. Saved final PNGs are raw generated bytes.','review_status':'Pending root/user review. Generation stopped. v4 requested for review; v5 was already complete before stop message.','attempts':attempts,'protected_sources':protected,'all_protected_unchanged':all(p['unchanged'] for p in protected),'v5_knots':{'count_visible':6,'locations':['hair','near upper arm','far upper arm','near waist','far waist','sleeve hem'],'inspection':'Six-ribbon outline and central polygonal negative shape are readable. Far upper arm and far waist are narrower, but hair/near waist still lean toward frontal presentation. Center holes use similar dark purple rather than clearly demonstrating the underlying local surface. Do not label all knot topology/perspective checks passed.','status':'review required'},'boundaries':['Visual hand counting is human-readable inspection, not automated 3D anatomy proof.','Natural overlap may be anatomically valid: an obscured digit alone is not proof of a missing digit.','Upper-body tail crop may be compositionally valid, as clarified by parent.','No production anchors, manifest, render source, video, or approved lighting modified.','Image alpha includes very low-opacity marginal pixels; raw source preserved and no automatic cleaning applied.','New framing and gesture need story/composition approval before integration.']}
dump('source-inspection.json',report)

# Diagnostic only: never used as final character source.
for n,regions in [(4,[('receiving hand',(10,405,270,650)),('chest hand',(670,535,875,790)),('tail crop',(790,930,1100,1408))]),(5,[('receiving hand',(140,390,340,590)),('chest hand',(675,500,825,695)),('complete tail',(805,805,985,1000))])]:
    im=Image.open(HERE/f'A04-02-wave-receive-v{n}.png').convert('RGBA');board=Image.new('RGB',(1500,1000),'#55515e');draw=ImageDraw.Draw(board)
    for i,(label,box) in enumerate(regions):
        crop=im.crop(box);crop.thumbnail((480,940));crop=crop.resize((min(480,crop.width*2),min(940,crop.height*2)))
        xy=(i*500+10,40);board.paste(crop,xy,crop);draw.text((xy[0],10),label,fill='white')
    board.save(HERE/f'v{n}-hands-tail-inspection.png')
print(json.dumps({'attempts':len(attempts),'all_protected_unchanged':True,'raw_generated_bytes_preserved':True,'review_status':'pending','v4':attempts[3]['sha256'],'v5':attempts[4]['sha256']}))

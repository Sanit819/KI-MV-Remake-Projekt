"""Read-only source alpha/anchor/provenance inventory; no image edits."""
from pathlib import Path
import json,hashlib
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'docs/validation';WORK.mkdir(exist_ok=True)
manifest=json.loads((ROOT/'assets/astra/v09/manifest.json').read_text(encoding='utf-8'))
rows=[]
for name,a in manifest['assets'].items():
    if not a.get('actionGroup'):continue
    file=ROOT/a['path'].lstrip('/');im=Image.open(file);rgba=np.array(im.convert('RGBA'));alpha=rgba[:,:,3]
    opaque=alpha>=128;ys,xs=np.where(opaque);has_transparent=bool((alpha==0).any());has_opaque=bool(opaque.any())
    bounds=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)] if has_opaque else None
    anchors=[]
    for key,point in a['anchors'].items():
        x,y=(round(float(v)) for v in point);near=alpha[max(0,y-14):min(im.height,y+15),max(0,x-14):min(im.width,x+15)]
        # Hands may mark the intentional cavity between fingers. Report nearby
        # alpha as evidence; do not reject an inspected empty contact cavity.
        anchors.append({'key':key,'source_point':point,'nearby_max_alpha':int(near.max()) if near.size else None})
    corners=[int(alpha[y,x]) for x,y in [(0,0),(im.width-1,0),(0,im.height-1),(im.width-1,im.height-1)]]
    checks={'real_alpha_channel':im.mode=='RGBA','opaque_foreground_present':has_opaque,'fully_transparent_background_present':has_transparent,'production_effective_transparent_corners':all(v<16 for v in corners),'hash_matches_manifest':hashlib.sha256(file.read_bytes()).hexdigest()==a['sha256'],'prompt_preserved':bool(a.get('provenance',{}).get('prompt')) and (ROOT/a['provenance']['prompt']).exists(),'shadow_face_inspection_declared':a.get('faceTreatment')=='shadow' and a.get('provenance',{}).get('inspected') is True}
    rows.append({'name':name,'path':a['path'],'actionGroup':a['actionGroup'],'phase':a['phase'],'size':list(im.size),'mode':im.mode,'raw_corner_alpha':corners,'raw_corners_exact_zero':all(v==0 for v in corners),'production_alpha_rule':'Existing Art.load discards source alpha < 16 before tracing; no source-image modification.','alpha_128_bounds_xyxy':bounds,'opaque_fraction':float(opaque.mean()),'transparent_fraction':float((alpha==0).mean()),'source_anchors':anchors,'checks':checks,'passed':all(checks.values())})
checks={'52_distinct_source_files':len(rows)==52 and len({a['sha256'] for a in manifest['assets'].values() if a.get('actionGroup')})==52,'21_groups':len({r['actionGroup'] for r in rows})==21,'all_source_checks':all(r['passed'] for r in rows)}
report={'passed':all(checks.values()),'checks':checks,'scope':'Read-only alpha, dimension, source-hash and saved-prompt inventory. Actual anatomy, knot shape and intentional anchor location require visual inspection. No image transformation.','items':rows}
(WORK/'astra-v5-artwork-inventory.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'passed':report['passed'],'checks':checks,'failed':[x['name'] for x in rows if not x['passed']]}))
if not report['passed']:raise SystemExit(1)

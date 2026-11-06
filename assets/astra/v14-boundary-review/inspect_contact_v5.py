"""Read-only provenance and bounded visual review record for contact-v5."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
TARGET = HERE / "A02-02-contact-v5-perspective.png"
BASE = HERE / "A02-02-contact-v2.png"
SOURCE = Path("C:/Users/auscar/.codex/generated_images/01a1acd5-4240-7a52-bce1-fcd2e1dc582b/exec-55aff4fe-a80f-45b4-a7e7-0e67f290d5b0.png")
EXPECTED = {
    "A02-01-approach.png":"ecd92ec70f34a521cee9a681a928b744d99f234c01f53cd3d0b23e50b4442f27",
    "A02-02-contact.png":"b4448c6c6cb6032dbe3915ef91a7aa618d4e8f217a731e088ff16c85b6996d79",
    "A02-02-contact-v2.png":"461e4f04df416c66e1d8129861f3714ebd010b4c5778d2229c720f391a13b200",
    "A02-02-contact-v3-knot.png":"cc68d3139ab8243d3257d02276ce2da55cc1937f427f44c380ba48d717aa199e",
    "A02-02-contact-v4-knots.png":"52f40cda5630449e111d8da51980e0df6130ee64a72e5aa72280e4f10eb5ee6a",
    "A02-03-withdraw.png":"13766afc9a82de875e1b1bce5f1a48c317506d1a926dc953ca0bbefcf7f3ae85",
}
SITES = [
    ("hair", [740,110,830,200], "Sideward narrowing follows head better than v4.", "Curled band shapes and small center make canonical six-band/hexagonal opening uncertain; not passed."),
    ("arm-left", [545,360,625,440], "Slightly oblique and integrated into the band.", "Still flower/pinwheel-like at magnification; six-band topology not confirmed."),
    ("arm-right", [750,350,830,430], "Distinctly flattened along extended-arm sleeve band, better differentiated from near arm.", "Foreshortened center and curled segments are too ambiguous to confirm canonical topology."),
    ("waist-near", [570,530,675,635], "Mildly oblique broad near-side mounting remains plausible.", "Most readable six-loop structure in v5, but central shape/over-under geometry still merits a closer check; not a global acceptance."),
    ("waist-far", [670,545,730,625], "Clear horizontal narrowing now matches the receding belt, unlike v4.", "Very small narrow center/loops not sufficient to certify all six connections."),
    ("hem-left", [215,1068,300,1153], "Mild slant, retains local panel placement.", "Relatively readable six-loop outline; local projected structure still pending reviewer/user acceptance."),
    ("hem-right", [710,1093,790,1173], "More slanted and flattened with the outward fabric plane.", "Curled band structure and narrow central area remain uncertain; not automatically passed."),
    ("shoe-rear", [455,1178,520,1243], "Clearly lies flatter along the toe-box surface rather than standing upright.", "Small pinwheel-like result; exact six-band construction and projected hexagon not confirmed."),
    ("shoe-near", [695,1232,775,1312], "Flatter, slanted, follows visible shoe surface better.", "Still resembles curved petals around a tiny center at magnification; six-band topology not confirmed."),
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def bbox(mask):
    yy,xx = np.where(mask)
    return [int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)] if len(xx) else None


a = np.asarray(Image.open(BASE))
b = np.asarray(Image.open(TARGET))
assert a.shape == b.shape == (1323,1189,4)
rois = np.zeros(a.shape[:2],bool)
for name,(x0,y0,x1,y1),p,t in SITES:
    rois[y0:y1,x0:x1] = True
visible = (a[:,:,3]>15)|(b[:,:,3]>15)
outside = visible & ~rois
diff = np.max(np.abs(a[:,:,:3].astype(float)*a[:,:,3:]/255-b[:,:,:3].astype(float)*b[:,:,3:]/255),axis=2)
sa,sb = a[:,:,3]>128,b[:,:,3]>128
alpha = b[:,:,3]
bb = bbox(alpha>15)
protected = [{"path":(HERE/name).as_posix(),"sha256_before":expected,"sha256_after":digest(HERE/name),
              "unchanged":digest(HERE/name)==expected} for name,expected in EXPECTED.items()]
checks = {
    "workspace_matches_generated_source_bytes":TARGET.read_bytes()==SOURCE.read_bytes(),
    "all_six_protected_images_unchanged":all(p["unchanged"] for p in protected),
    "rgba_same_canvas_as_approved_v2":a.shape==b.shape,
    "real_alpha_transparency":bool(alpha.min()==0 and alpha.max()==255),
    "corners_alpha_zero":all(int(alpha[y,x])==0 for x,y in [(0,0),(1188,0),(0,1322),(1188,1322)]),
    "visible_subject_inside_canvas":bb[0]>0 and bb[1]>0 and bb[2]<1189 and bb[3]<1323,
}
assert all(checks.values()),checks
result = {
    "status":"perspective-improved-topology-unresolved-review-required-not-integrated",
    "overall_asset_verdict":"NOT PASSED: local projection improves over v4, but several small knots reverted toward curled/pinwheel structures and are not confirmed as correct GPT six-band topology.",
    "path":TARGET.as_posix(),"source":SOURCE.as_posix(),"generator":"built-in image_gen",
    "generation_intent":"Nine local source-drawn perspective-aware ornament edits, using approved anatomy v2 as direct target; standard openwork image for topology only.",
    "generation_reference_paths":[BASE.as_posix(),(HERE.parent/"v02/openai-openwork.png").as_posix()],
    "v4_passed_to_generator":False,
    "prompt_path":(HERE/"A02-02-contact-v5-perspective.prompt.txt").as_posix(),
    "prompt_sha256":digest(HERE/"A02-02-contact-v5-perspective.prompt.txt"),
    "sha256":digest(TARGET),"source_sha256":digest(SOURCE),"bytes":TARGET.stat().st_size,
    "width":1189,"height":1323,"mode":"RGBA","alpha_range":[int(alpha.min()),int(alpha.max())],
    "fully_transparent_pixels":int((alpha==0).sum()),"alpha_gt15_bbox":bb,
    "positions":[{"site":name,"inspection_crop_xyxy":coords,"perspective_observation":p,
                  "topology_observation":t,"site_acceptance":"pending-not-auto-passed"} for name,coords,p,t in SITES],
    "visual_review":{"full_generated_image_reviewed":True,"all_nine_positions_individually_magnified":True,
                     "reported_to_root_before_claiming_acceptance":True,
                     "body_boundary":"Pose remains recognizably the approved pose, but generative color/contour and placement drift occurs; no pixel-lock claim.",
                     "scope":"Source-image review only. No production manifest/src, contact-anchor or 4K runtime acceptance."},
    "pixel_lock_achieved":False,
    "difference_vs_approved_v2":{
        "method":"Same-canvas unregistered comparison, max absolute RGB channel difference after alpha premultiplication over black; union alpha>15; exclude listed local inspection ROIs.",
        "outside_roi_visible_union_pixels":int(outside.sum()),
        "outside_roi_mean_max_abs_premultiplied_rgb_difference":float(diff[outside].mean()),
        "outside_roi_percent_difference_gt8":float((diff[outside]>8).mean()*100),
        "outside_roi_percent_difference_gt32":float((diff[outside]>32).mean()*100),
        "outside_roi_difference_gt8_bbox_xyxy":bbox(outside&(diff>8)),
        "body_below_y300_silhouette_iou_alpha_gt128":float((sa[300:]&sb[300:]).sum()/(sa[300:]|sb[300:]).sum()),
    },
    "protected_files":protected,"validation":checks,
    "inspection_artifact":"contact-v5-all-knots-inspection.png",
    "inspection_boundary":"Diagnostic crop/magnification only. Final transparent PNG is unchanged imagegen output, not code-composited or post-repaired.",
    "production_manifest_or_src_modified":False,
}
(HERE/"contact-v5-source-inspection.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"status":result["status"],"sha256":result["sha256"],"bytes":result["bytes"],
                  "validation":checks,"difference":result["difference_vs_approved_v2"]},indent=2))

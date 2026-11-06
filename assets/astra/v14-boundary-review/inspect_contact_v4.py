"""Read-only source/protection/difference audit for the nine-knot contact asset."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
TARGET = HERE / "A02-02-contact-v4-knots.png"
SOURCE = Path("C:/Users/auscar/.codex/generated_images/01a1acd5-4240-7a52-bce1-fcd2e1dc582b/exec-c3acc13d-03d2-48e8-ac3b-dfa513aee4d4.png")
EXPECTED = {
    "A02-01-approach.png": "ecd92ec70f34a521cee9a681a928b744d99f234c01f53cd3d0b23e50b4442f27",
    "A02-02-contact.png": "b4448c6c6cb6032dbe3915ef91a7aa618d4e8f217a731e088ff16c85b6996d79",
    "A02-02-contact-v2.png": "461e4f04df416c66e1d8129861f3714ebd010b4c5778d2229c720f391a13b200",
    "A02-02-contact-v3-knot.png": "cc68d3139ab8243d3257d02276ce2da55cc1937f427f44c380ba48d717aa199e",
    "A02-03-withdraw.png": "13766afc9a82de875e1b1bce5f1a48c317506d1a926dc953ca0bbefcf7f3ae85",
}
SITES = [
    ("hair", [755,115,845,205], "pass", "Six interwoven bands and central hexagonal opening were already legible; preserve requested."),
    ("arm-left", [560,365,635,440], "fail", "Curled petals meet at filled central point, not a hexagonal open knot."),
    ("arm-right", [770,355,845,430], "fail", "Compressed pinwheel lacks canonical six-band construction and central hexagon."),
    ("waist-near", [575,530,680,635], "fail", "Large curled flower-like hub rather than open hexagonal negative space."),
    ("waist-far", [675,545,735,625], "fail", "Foreshortening does not explain missing six-band structure and central opening."),
    ("hem-left", [215,1068,300,1153], "fail", "Spiral petals rather than interwoven six-band knot."),
    ("hem-right", [710,1093,790,1173], "fail", "Spiral petals with filled center."),
    ("shoe-rear", [455,1178,520,1243], "fail", "Magnification confirms vortex, not a canonical six-band knot."),
    ("shoe-near", [695,1242,775,1322], "fail", "Small pinwheel; size does not excuse incorrect topology."),
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def bbox(mask):
    ys, xs = np.where(mask)
    return [int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)] if len(xs) else None


final = np.asarray(Image.open(TARGET))
assert final.shape == (1323,1189,4)
all_rois = np.zeros(final.shape[:2],bool)
edited_rois = np.zeros_like(all_rois)
for name,(x0,y0,x1,y1),before,note in SITES:
    all_rois[y0:y1,x0:x1] = True
    if before == "fail":
        edited_rois[y0:y1,x0:x1] = True
body = np.zeros_like(all_rois)
body[300:] = True


def compare(baseline, exclude):
    old = np.asarray(Image.open(HERE/baseline))
    visible = (old[:,:,3]>15)|(final[:,:,3]>15)
    p_old = old[:,:,:3].astype(float)*old[:,:,3:]/255
    p_new = final[:,:,:3].astype(float)*final[:,:,3:]/255
    difference = np.max(np.abs(p_old-p_new),axis=2)
    outside = visible & ~exclude
    sa,sb = old[:,:,3]>128,final[:,:,3]>128
    return {
        "baseline": baseline,
        "pixel_identical_outside_edited_rois": bool(np.array_equal(old[~exclude],final[~exclude])),
        "outside_roi_visible_union_pixels": int(outside.sum()),
        "outside_roi_mean_max_abs_premultiplied_rgb_difference_0_to_255": float(difference[outside].mean()),
        "outside_roi_percent_visible_pixels_difference_gt8": float((difference[outside]>8).mean()*100),
        "outside_roi_percent_visible_pixels_difference_gt32": float((difference[outside]>32).mean()*100),
        "outside_roi_difference_gt8_bbox_xyxy": bbox(outside & (difference>8)),
        "outside_roi_alpha_gt128_silhouette_iou": float((sa&sb&~exclude).sum()/((sa|sb)&~exclude).sum()),
        "body_below_y300_alpha_gt128_silhouette_iou": float((sa&sb&body).sum()/((sa|sb)&body).sum()),
    }


protected = [{"path":(HERE/name).as_posix(),"sha256_before":expected,
              "sha256_after":digest(HERE/name),"unchanged":digest(HERE/name)==expected}
             for name,expected in EXPECTED.items()]
alpha = final[:,:,3]
bb = bbox(alpha>15)
checks = {
    "raw_generated_source_matches_workspace_copy": TARGET.read_bytes()==SOURCE.read_bytes(),
    "all_five_protected_images_unchanged": all(p["unchanged"] for p in protected),
    "same_rgba_dimensions_as_approved_v2": final.shape==(1323,1189,4),
    "real_alpha_transparency": bool(alpha.min()==0 and alpha.max()==255),
    "four_corners_alpha_zero": all(alpha[y,x]==0 for x,y in [(0,0),(1188,0),(0,1322),(1188,1322)]),
    "visible_subject_inside_canvas": bb[0]>0 and bb[1]>0 and bb[2]<1189 and bb[3]<1323,
}
checks = {k:bool(v) for k,v in checks.items()}
assert all(checks.values()),checks
result = {
    "status":"rejected-by-user-perspective-not-integrated",
    "user_feedback":"不能这样直接贴上来，要符合透视啊",
    "overall_asset_verdict":"REJECTED: six-band structure readability did not establish correct attachment-plane perspective.",
    "perspective_review_document":(HERE/"CONTACT_V4_PERSPECTIVE_REJECTION.md").as_posix(),
    "approved_anatomy_baseline":"A02-02-contact-v2.png, explicitly approved by user before ornament edits",
    "generator":"built-in image_gen",
    "generation_intent":"Fix only eight failed GPT ornaments in contact-v3; preserve already-correct hair ornament, body and pose. No source SVG pasted into final image.",
    "path":TARGET.as_posix(),"source":SOURCE.as_posix(),"sha256":digest(TARGET),"source_sha256":digest(SOURCE),
    "bytes":TARGET.stat().st_size,"width":1189,"height":1323,"mode":"RGBA",
    "alpha_range":[int(alpha.min()),int(alpha.max())],"fully_transparent_pixels":int((alpha==0).sum()),"alpha_gt15_bbox":bb,
    "prompt_path":(HERE/"A02-02-contact-v4-knots.prompt.txt").as_posix(),
    "prompt_sha256":digest(HERE/"A02-02-contact-v4-knots.prompt.txt"),
    "generation_reference_paths":[(HERE/"A02-02-contact-v3-knot.png").as_posix(),(HERE.parent/"v02/openai-openwork.png").as_posix()],
    "positions":[{"site":name,"inspection_crop_xyxy":coords,"v3_verdict":before,"v3_reason":note,
                  "v4_structure_verdict":"six-band-structure-readable-at-magnification-only",
                  "v4_perspective_verdict":"not-accepted; see complete-figure perspective review",
                  "v4_observation":"Six outer interwoven band loops and central hexagonal negative space are readable; no pinwheel/petal hub or backing circle.",
                  "requested_change":before=="fail"} for name,coords,before,note in SITES],
    "visual_review":{"full_image_reviewed":True,"all_nine_positions_individually_magnified":True,
                     "small_shoe_emblems_individually_checked":True,
                     "human_pose_assessment":"Approved near-leg support and occluded rear-leg relation remain visually the same; no new anatomical pose was requested or observed.",
                     "boundary":"Prior magnified raster STRUCTURE review only. User rejected v4 perspective: marks remain too frontal and do not follow head/arm/waist/cloth/shoe planes. Overall artwork is not accepted."},
    "difference_method":"Raw same-canvas comparison without alignment/warping; compare RGB premultiplied by alpha over black. Silhouette IoU uses alpha>128. Source color and antialiasing drift is explicitly measured, not hidden by restoring baseline pixels.",
    "difference_vs_immediate_v3":compare("A02-02-contact-v3-knot.png",edited_rois),
    "difference_vs_user_approved_v2":compare("A02-02-contact-v2.png",all_rois),
    "pixel_lock_achieved":False,
    "pixel_lock_boundary":"Generative output changes linework/color/antialiasing outside ornament ROIs as well. All old source images remain byte-identical; final output is not claimed to preserve their pixels.",
    "protected_files":protected,"validation":checks,
    "inspection_artifacts":["contact-v3-all-knots-inspection.png","contact-v4-all-knots-inspection.png","contact-v4-vs-approved-v2-legs-qa.png"],
    "inspection_boundary":"Diagnostic crops/magnifications only; final PNG is the unchanged generated source, not a code-composited or locally repaired image.",
    "production_manifest_or_src_modified":False,
}
(HERE/"contact-v4-source-inspection.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"sha256":result["sha256"],"bytes":result["bytes"],"validation":checks,
                  "difference_vs_v3":result["difference_vs_immediate_v3"],
                  "difference_vs_v2":result["difference_vs_user_approved_v2"]},indent=2))

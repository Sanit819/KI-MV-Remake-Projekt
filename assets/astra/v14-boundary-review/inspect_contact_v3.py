"""Inspect generated contact-v3 and measure drift without modifying final images."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
BASE = HERE / "A02-02-contact-v2.png"
TARGET = HERE / "A02-02-contact-v3-knot.png"
SOURCE = Path("C:/Users/auscar/.codex/generated_images/01a1acd5-4240-7a52-bce1-fcd2e1dc582b/exec-f062321f-6168-4801-b563-caf24b10cb5d.png")
EXPECTED = {
    "A02-01-approach.png": "ecd92ec70f34a521cee9a681a928b744d99f234c01f53cd3d0b23e50b4442f27",
    "A02-02-contact-v2.png": "461e4f04df416c66e1d8129861f3714ebd010b4c5778d2229c720f391a13b200",
    "A02-03-withdraw.png": "13766afc9a82de875e1b1bce5f1a48c317506d1a926dc953ca0bbefcf7f3ae85",
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def bbox(mask):
    ys, xs = np.where(mask)
    return [int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1)] if len(xs) else None


a = np.asarray(Image.open(BASE))
b = np.asarray(Image.open(TARGET))
assert a.shape == b.shape == (1323, 1189, 4)
premul_a = a[:,:,:3].astype(float) * a[:,:,3:] / 255
premul_b = b[:,:,:3].astype(float) * b[:,:,3:] / 255
diff = np.max(np.abs(premul_a - premul_b), axis=2)
visible = (a[:,:,3] > 15) | (b[:,:,3] > 15)
near_opaque_a, near_opaque_b = a[:,:,3] > 128, b[:,:,3] > 128
roi = np.zeros(a.shape[:2], bool)
roi[110:210,750:850] = True
body = np.zeros_like(roi)
body[300:] = True
legs = np.zeros_like(roi)
legs[680:1323,360:790] = True


def difference_stats(region):
    active = visible & region
    silhouette_union = (near_opaque_a | near_opaque_b) & region
    silhouette_intersection = near_opaque_a & near_opaque_b & region
    return {
        "visible_union_pixel_count": int(active.sum()),
        "mean_max_abs_premultiplied_rgb_difference_0_to_255": float(diff[active].mean()),
        "percent_visible_pixels_difference_gt8": float((diff[active] > 8).mean()*100),
        "percent_visible_pixels_difference_gt32": float((diff[active] > 32).mean()*100),
        "percent_visible_pixels_raw_rgba_exact_equal": float(np.all(a == b, axis=2)[active].mean()*100),
        "difference_gt8_bbox_xyxy": bbox(active & (diff > 8)),
        "alpha_gt128_silhouette_iou": float(silhouette_intersection.sum()/silhouette_union.sum()),
    }


protected = [{"path": (HERE/name).as_posix(), "sha256_before": expected,
              "sha256_after": digest(HERE/name), "unchanged": digest(HERE/name) == expected}
             for name,expected in EXPECTED.items()]
alpha = b[:,:,3]
visible_bbox = bbox(alpha > 15)
checks = {
    "selected_copy_matches_imagegen_source_bytes": TARGET.read_bytes() == SOURCE.read_bytes(),
    "all_protected_inputs_unchanged": all(p["unchanged"] for p in protected),
    "same_canvas_dimensions_as_approved_v2": a.shape == b.shape,
    "rgba_with_real_transparency": bool(alpha.min() == 0 and alpha.max() == 255),
    "four_corners_fully_transparent": not any([int(alpha[0,0]),int(alpha[0,-1]),int(alpha[-1,0]),int(alpha[-1,-1])]),
    "subject_bbox_inside_canvas": visible_bbox[0] > 0 and visible_bbox[1] > 0 and visible_bbox[2] < 1189 and visible_bbox[3] < 1323,
}
assert all(checks.values()), checks
result = {
    "status": "hair-knot-edit-ready-for-user-review-not-integrated",
    "approved_baseline": "User explicitly approved contact-v2 whole pose and legs; only hair knot requested for correction.",
    "path": TARGET.as_posix(), "source": SOURCE.as_posix(), "generator": "built-in image_gen",
    "generation_intent": "precise object edit of hair knot only, with all approved body/legs/hands/ears/horns/clothing and other knots requested invariant",
    "pixel_lock_achieved": False,
    "pixel_lock_boundary": "Output is a generative edit. Although the pose and anatomy remain visually consistent, RGB, antialiasing and line contours outside the hair-knot ROI also changed. The baseline was preserved, not composited back into this output.",
    "prompt_path": (HERE/"A02-02-contact-v3-knot.prompt.txt").as_posix(),
    "prompt_sha256": digest(HERE/"A02-02-contact-v3-knot.prompt.txt"),
    "generation_reference_paths": [BASE.as_posix(), (HERE.parent/"v02/openai-openwork.png").as_posix()],
    "reference_roles": ["approved edit target; pose/body invariant", "accurate six-loop geometry reference only; color follows target"],
    "rejected_reference_reason": "v07/reference-gpt-knot.png was viewed but only 63x61 and contains interface background; v02/openai-openwork.png is the clearer reference.",
    "width": 1189, "height": 1323, "mode": "RGBA", "bytes": TARGET.stat().st_size,
    "sha256": digest(TARGET), "source_sha256": digest(SOURCE),
    "alpha_range": [int(alpha.min()),int(alpha.max())],
    "fully_transparent_pixels": int((alpha==0).sum()), "alpha_gt15_bbox": visible_bbox,
    "requested_edit_roi_xyxy": [750,110,850,210],
    "difference_method": "Compare raw same-canvas images without registration or warping. Color difference is maximum absolute RGB channel difference after premultiplication by alpha over black; valid region is union alpha>15. Silhouette IoU uses alpha>128.",
    "difference_stats": {
        "outside_requested_hair_knot_roi": difference_stats(~roi),
        "body_below_y300": difference_stats(body),
        "legs_and_feet_roi_360_680_790_1323": difference_stats(legs),
    },
    "visual_review": {
        "full_generated_image_reviewed": True,
        "hair_knot_5x_nearest_neighbor_zoom_reviewed": True,
        "six_outer_interwoven_band_loops_visually_readable": True,
        "central_hexagonal_opening_visually_readable": True,
        "no_enclosing_backing_circle": True,
        "topology_boundary": "Raster visual assessment at 5x; not a mathematical vector topology proof.",
        "legs_before_after_comparison_reviewed": True,
        "pose_assessment": "Near leg remains continuous weight-bearing chain; far leg/foot remains behind and partially occluded. No new knee crossing or leg pose redesign observed in the side-by-side lower-body comparison.",
        "outside_change_assessment": "Visible generative retracing/antialiasing and small contour shifts occur outside the requested edit area. Not pixel-identical preservation.",
    },
    "inspection_artifacts": ["contact-v3-knot-inspection-zoom.png", "contact-v3-legs-comparison-qa.png"],
    "inspection_artifact_boundary": "Cropped/enlarged and side-by-side read-only diagnostic renders; not pasted into, used to repair, or substituted for the final transparent generated asset.",
    "protected_files": protected, "validation": checks,
    "production_manifest_or_src_modified": False,
}
(HERE/"contact-v3-source-inspection.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"sha256":result["sha256"], "bytes":result["bytes"], "validation":checks,
                  "outside_requested_roi":result["difference_stats"]["outside_requested_hair_knot_roi"]},indent=2))

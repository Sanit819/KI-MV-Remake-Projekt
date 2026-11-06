"""Read-only image validation; writes JSON evidence, never modifies PNG pixels."""
from pathlib import Path
import hashlib
import json
from PIL import Image
import numpy as np

HERE = Path(__file__).resolve().parent
SOURCE = Path("C:/Users/auscar/.codex/generated_images/01a1acd5-4240-7a52-bce1-fcd2e1dc582b/exec-899f2f92-8640-4331-863b-b2d0e008bb6e.png")
TARGET = HERE / "A02-02-contact-v2.png"
PROTECTED = {
    "A02-01-approach.png": "ecd92ec70f34a521cee9a681a928b744d99f234c01f53cd3d0b23e50b4442f27",
    "A02-02-contact.png": "b4448c6c6cb6032dbe3915ef91a7aa618d4e8f217a731e088ff16c85b6996d79",
    "A02-03-withdraw.png": "13766afc9a82de875e1b1bce5f1a48c317506d1a926dc953ca0bbefcf7f3ae85",
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


image = Image.open(TARGET)
assert image.mode == "RGBA"
pixels = np.asarray(image)
alpha = pixels[:, :, 3]
ys, xs = np.where(alpha > 15)
bbox = [int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1)]
protected = [{"path": (HERE/name).as_posix(), "sha256_before": before,
              "sha256_after": digest(HERE/name), "unchanged": before == digest(HERE/name)}
             for name,before in PROTECTED.items()]
checks = {
    "generated_source_bytes_equal": TARGET.read_bytes() == SOURCE.read_bytes(),
    "alpha_has_transparent_and_visible_pixels": bool(alpha.min() == 0 and alpha.max() == 255),
    "four_corners_fully_transparent": bool(not any([alpha[0,0], alpha[0,-1], alpha[-1,0], alpha[-1,-1]])),
    "visible_subject_inside_canvas": bbox[0] > 0 and bbox[1] > 0 and bbox[2] < image.width and bbox[3] < image.height,
    "approved_approach_and_withdraw_unchanged": all(p["unchanged"] for p in protected if not p["path"].endswith("A02-02-contact.png")),
    "superseded_contact_preserved_unchanged": protected[1]["unchanged"],
    "substantial_visible_nonblack_subject": int(((alpha > 240) & (pixels[:,:,:3].max(axis=2) > 60)).sum()) > 300000,
}
assert all(checks.values()), checks
result = {
    "status": "review-not-integrated",
    "user_approval": "A02-01 and A02-03 approved; only new contact-v2 awaits visual response",
    "proposed_asset_id": "A02_02", "path": TARGET.as_posix(), "source": SOURCE.as_posix(),
    "generator": "built-in image_gen", "generation_intent": "new complete original pose, rebuilding pelvis and leg depth; no local limb repairs, cut-and-paste, warping or pixel edits",
    "prompt_path": (HERE/"A02-02-contact-v2.prompt.txt").as_posix(),
    "prompt_sha256": digest(HERE/"A02-02-contact-v2.prompt.txt"),
    "generation_reference_paths": [(HERE/"A02-01-approach.png").as_posix(), (HERE/"A02-03-withdraw.png").as_posix(),
        "C:/Users/auscar/Documents/Tencent Files/2470641710/nt_qq/nt_data/Pic/2026-11/Ori/e0ec7a1db8d1862fe1135298bd354581.jpg"],
    "reference_roles": ["approved style and character identity only", "approved style and character identity only", "original costume and dragon anatomy only; shadow-face style comes from approved poses"],
    "old_contact_passed_to_generator": False,
    "user_red_lines_passed_to_generator": False,
    "width": image.width, "height": image.height, "mode": image.mode,
    "bytes": TARGET.stat().st_size, "sha256": digest(TARGET), "source_sha256": digest(SOURCE),
    "alpha_range": [int(alpha.min()), int(alpha.max())],
    "corner_alpha": [int(alpha[0,0]), int(alpha[0,-1]), int(alpha[-1,0]), int(alpha[-1,-1])],
    "fully_transparent_pixels": int((alpha == 0).sum()), "alpha_ge240_pixels": int((alpha >= 240).sum()),
    "alpha_gt15_bbox": bbox,
    "rgba_samples": {f"{x},{y}": [int(v) for v in pixels[y,x]] for x,y in [(650,850),(700,180),(400,600),(30,30)]},
    "visual_review": {
        "generated_preview_reviewed": True,
        "workspace_view_image_requested": True,
        "workspace_raw_png_emitted_and_reviewed": True,
        "rendering_note": "Generated preview and direct nodeRepl.emitImage of unchanged workspace PNG bytes both show the complete image and were reviewed. view_image transport alone displayed nearly black despite valid RGB/alpha; raw-byte display resolved that tool-display issue. This is not a browser/runtime composite test.",
        "pelvis": "Body and pelvis now turn together toward screen-right; near waist knot is broad and far one narrow/turned away.",
        "near_leg": "Foreground thigh continues from near hip to its own relaxed knee and planted ankle; connected silhouette with front boot farther down/right.",
        "far_leg": "Far upper thigh is occluded by skirt/foreground limb; rear calf continues separately to smaller higher rear shoe, offset left/back.",
        "knees_and_feet": "No knee-level X, no calf attached to the other knee; shoes face generally screen-right and show different depth.",
        "identity": "Dark complete face and eye-covering bangs retained; horns, wings, tail, hands, skirt hems and both shoes inside canvas.",
        "scope": "Source-art preview and raw-file inspection only. Not a runtime contact-anchor or 4K video acceptance. User visual acceptance still pending.",
    },
    "protected_files": protected, "validation": checks,
    "supersedes": (HERE/"A02-02-contact.png").as_posix(),
    "production_manifest_or_src_modified": False,
}
(HERE/"contact-v2-source-inspection.json").write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
print(json.dumps({"sha256": result["sha256"], "dimensions": image.size, "alpha_gt15_bbox": bbox,
                  "fully_transparent_pixels": result["fully_transparent_pixels"], "validation": checks}, ensure_ascii=False, indent=2))

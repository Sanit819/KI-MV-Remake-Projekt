from pathlib import Path
from PIL import Image
import hashlib, json
BASE = Path(__file__).resolve().parent
SOURCE = Path("C:/Users/auscar/.codex/generated_images/01a1ac32-877e-76a2-8ba3-825f38b3acef")
items = [
    ("A02_01", "A02-01-approach.png", "exec-63091093-ebaa-4a20-9857-6f6ec5a514a6.png", "A02-01-approach.prompt.txt", "ready-for-user-review", ["assets/astra/v09/A01-01-inkface.png"]),
    ("A02_02", "A02-02-contact.png", "exec-1bd64c60-35ed-4458-b502-c6ae9156087e.png", "A02-02-contact.prompt.txt", "ready-for-user-review", ["assets/astra/v14-boundary-review/A02-01-approach.png"]),
    ("A02_03", "A02-03-withdraw.png", "exec-f5f8a2ce-697b-49ef-84a1-70853b624be7.png", "A02-03-withdraw-final.prompt.txt", "ready-for-user-review", ["assets/astra/v14-boundary-review/A02-01-approach.png"]),
    ("A02_03_rejected", "A02-03-withdraw-rejected-light-chin.png", "exec-dd10e612-b797-4584-b687-4087e2305a9d.png", "A02-03-withdraw.prompt.txt", "rejected-light-lower-face", ["assets/astra/v14-boundary-review/A02-02-contact.png"]),
]
rows = []
for asset_id, filename, source_name, prompt_file, status, references in items:
    local = BASE / filename
    source = SOURCE / source_name
    digest = hashlib.sha256(local.read_bytes()).hexdigest()
    image = Image.open(local)
    alpha = image.getchannel("A")
    histogram = alpha.histogram()
    width, height = image.size
    corners = [alpha.getpixel(pt) for pt in [(0,0),(width-1,0),(0,height-1),(width-1,height-1)]]
    rows.append({
        "proposed_asset_id": asset_id,
        "path": str(local).replace("\\", "/"),
        "source": str(source).replace("\\", "/"),
        "generator": "built-in image_gen",
        "generation_intent": "independent complete pose redrawing with character/design reference; no local repair, warping, compositing, or external image editing",
        "generation_reference_paths": references,
        "prompt_path": str(BASE / prompt_file).replace("\\", "/"),
        "prompt_sha256": hashlib.sha256((BASE / prompt_file).read_bytes()).hexdigest(),
        "status": status,
        "width": width, "height": height, "mode": image.mode,
        "sha256": digest, "bytes": local.stat().st_size,
        "same_bytes_as_generated_source": digest == hashlib.sha256(source.read_bytes()).hexdigest(),
        "alpha_range": list(alpha.getextrema()), "corner_alpha": corners,
        "fully_transparent_pixels": histogram[0], "fully_opaque_pixels": histogram[255],
        "alpha_gt15_bbox": list(alpha.point(lambda value: 255 if value > 15 else 0).getbbox()),
        "view_image_reviewed": True,
    })
selected = [r for r in rows if r["status"] == "ready-for-user-review"]
result = {
    "status": "review-not-integrated",
    "user_approval": "pending",
    "all_selected_distinct_sha256": len(set(r["sha256"] for r in selected)) == len(selected),
    "all_selected_match_generated_source": all(r["same_bytes_as_generated_source"] for r in selected),
    "all_selected_rgba_with_transparency": all(r["mode"] == "RGBA" and r["fully_transparent_pixels"] > 0 for r in selected),
    "review_scope": "Source artwork visual review by cat_pipeline agent for connected standing anatomy, hands, waist-knot perspective, complete dark face, and action readability. No renderer, contact-anchor, native 4K runtime or video QA.",
    "review_notes": {
        "A02_01": "Two distinct leg chains and staggered feet; compact torso; reaching fingers softly curled before contact; both waist knots attached to one curved belt.",
        "A02_02": "Separate grounded legs, coherent knees and ankles; raised flat five-finger palm and bent elbow; same belt perspective; tiny open mouth stays within dark face.",
        "A02_03": "Whole pose regenerated after rejected light-chin attempt. Entire visible face now dark; arm withdrawn near collarbone, other hand lowered; legs remain separate and grounded.",
        "knots": "Recognizable six-loop GPT knot geometry visually checked at hair and paired waist. This is raster artwork, not mathematically certified vector topology.",
    },
    "unchanged_production": ["src/mv5cat", "assets/astra/v12-approved-cat/manifest.json", "assets/astra/v09/A02-01-inkface.png", "assets/astra/v09/A02-02-inkface.png", "assets/astra/v09/A02-03-inkface.png", "exports/astra-world-execute-me-final-v5.1-cat-warning-hires-4k60.mp4"],
    "official_character_reference_visual_only": "C:/Users/auscar/Documents/Tencent Files/2470641710/nt_qq/nt_data/Pic/2026-11/Ori/e0ec7a1db8d1862fe1135298bd354581.jpg",
    "items": rows,
}
(BASE / "source-inspection.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"selected": len(selected), "independent_hashes": result["all_selected_distinct_sha256"], "source_copies_match": result["all_selected_match_generated_source"], "output": str(BASE / "source-inspection.json")}, ensure_ascii=False))


"""Recompute v3 attention traces in NumPy, independently of browser JavaScript.

The fixed miniature models are animation demonstrations, not trained predictors.
This verifies their arithmetic and sampled trace lifecycle, not visual acceptance.
"""
from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "exports/v3/review/browser-review.json"
OUTPUT = ROOT / "exports/v3/review/attention-validation.json"
ENGINE = ROOT / "production/v3/engine/attention.js"
TOLERANCE = 1e-11


def layer_norm(x):
    x = np.asarray(x, dtype=np.float64)
    mean = x.mean(axis=-1, keepdims=True)
    variance = ((x - mean) ** 2).mean(axis=-1, keepdims=True)
    return (x - mean) / np.sqrt(variance + 1e-5)


def reference_parameters():
    return {
        "Wq": np.array([[.8, .1, -.2, .1], [.1, .7, .2, -.1],
                        [-.2, .1, .8, .15], [.15, -.1, .2, .65]]),
        "Wk": np.array([[.65, .1, .15, -.1], [.2, .75, -.1, .15],
                        [-.1, .2, .7, .1], [.1, -.15, .2, .75]]),
        "Wv": np.array([[.6, -.2, .1, .1], [.15, .75, .05, -.1],
                        [-.1, .1, .7, .2], [.2, -.1, .15, .6]]),
        "Wf1": np.sin(3 + np.arange(4)[:, None] * 5 + np.arange(6)[None, :] * 2) * .32,
        "bf1": np.array([.04, -.02, .03, -.01, .02, -.03]),
        "Wf2": np.cos(5 + np.arange(6)[:, None] * 3 + np.arange(4)[None, :] * 4) * .28,
        "bf2": np.array([.01, -.02, .02, -.01]),
    }


def encoder(tokens):
    p = reference_parameters()
    normalized = layer_norm(tokens)
    q, k, v = (normalized @ p[name] for name in ("Wq", "Wk", "Wv"))
    scores = (q @ k.T) / np.sqrt(q.shape[-1])
    exponentials = np.exp(scores - scores.max(axis=1, keepdims=True))
    weights = exponentials / exponentials.sum(axis=1, keepdims=True)
    attention = weights @ v
    residual = tokens + attention
    normalized_residual = layer_norm(residual)
    ff_pre = normalized_residual @ p["Wf1"] + p["bf1"]
    ff_hidden = .5 * ff_pre * (1 + np.tanh(np.sqrt(2 / np.pi)
                                                * (ff_pre + .044715 * ff_pre ** 3)))
    ff_output = ff_hidden @ p["Wf2"] + p["bf2"]
    return {**p, "tokens": tokens, "normalized": normalized, "Q": q, "K": k,
            "V": v, "keyDimension": 4, "scores": scores, "weights": weights,
            "attention": attention, "residual": residual,
            "normalizedResidual": normalized_residual, "ffPre": ff_pre,
            "ffHidden": ff_hidden, "ffOutput": ff_output,
            "output": residual + ff_output}


def text_inputs():
    embedding = np.array([[1, .1, -.2, .3], [1, .1, -.2, .3],
                          [-.1, .8, .5, -.2], [.3, -.2, .7, 1]])
    index = np.arange(4, dtype=np.float64)
    position = np.column_stack((np.sin(index), np.cos(index),
                                np.sin(index / 100), np.cos(index / 100)))
    return {"embedding": embedding, "position": position,
            **encoder(embedding + position)}


def old_star_image():
    """Rasterize old-star geometry using winding count, unlike JS ray toggles."""
    polygon = np.array([[0, -1], [.27, -.37], [1, -.23], [.48, .15], [.65, .94],
                        [0, .55], [-.69, .91], [-.46, .17], [-1.04, -.21], [-.28, -.38]])
    image = np.full((8, 8, 3), [255, 100, 82], dtype=np.float64)
    for row, col in np.ndindex((8, 8)):
        x, y = (col + .5) / 4 - 1, (row + .5) / 4 - 1
        winding = 0
        for a, b in zip(polygon, np.roll(polygon, -1, axis=0)):
            cross = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0])
            if a[1] <= y < b[1] and cross > 0:
                winding += 1
            elif b[1] <= y < a[1] and cross < 0:
                winding -= 1
        if winding:
            image[row, col] = [182, 160, 212] if col < 4 else [245, 207, 114]
    return image


def vision_inputs():
    image = old_star_image()
    # Reshape/transpose independently establishes row-major patch and RGB order.
    pixels = image.reshape(4, 2, 4, 2, 3).transpose(0, 2, 1, 3, 4).reshape(16, 4, 3)
    flat = pixels.reshape(16, 12) / 127.5 - 1
    projection = np.sin(2 + np.arange(12)[:, None] * 3 + np.arange(4)[None, :] * 5) * .19
    patch_embedding = flat @ projection
    class_token = np.array([.35, -.2, .4, .1])
    index = np.arange(17, dtype=np.float64)
    position = np.column_stack((np.sin(index * .37), np.cos(index * .37),
                                np.sin(index * .11), np.cos(index * .11))) * .22
    result = encoder(np.vstack((class_token, patch_embedding)) + position)
    return {"image": image, "patchSize": 2, "pixels": pixels, "flat": flat,
            "patchProjection": projection, "patchEmbedding": patch_embedding,
            "classToken": class_token, "position": position, **result,
            "classRepresentation": layer_norm(result["output"][0])}


def check_array(actual, expected, label, errors):
    actual, expected = np.asarray(actual, dtype=np.float64), np.asarray(expected, dtype=np.float64)
    if actual.shape != expected.shape:
        raise AssertionError(f"{label}: shape {actual.shape} != {expected.shape}")
    if not np.isfinite(actual).all() or not np.isfinite(expected).all():
        raise AssertionError(f"{label}: nonfinite values")
    error = float(np.max(np.abs(actual - expected))) if actual.size else 0.0
    errors[label] = error
    if error > TOLERANCE:
        raise AssertionError(f"{label}: max error {error:.6g} > {TOLERANCE:.6g}")


def verify_record(record, text_reference, vision_reference):
    t = float(record["t"])
    trace = (record.get("ml") or {}).get("attention")
    expected_mode = ("transformer" if 97.449 <= t < 110.249 else
                     "vit" if 148.249 <= t < 154.649 else None)
    if expected_mode is None:
        if trace is not None:
            raise AssertionError("stale attention trace outside either active window")
        return None
    if not isinstance(trace, dict) or trace.get("mode") != expected_mode:
        raise AssertionError(f"expected {expected_mode} trace")
    errors = {}
    check_array(trace["time"], t, "time", errors)
    reference = text_reference if expected_mode == "transformer" else vision_reference
    for field, expected in reference.items():
        if field not in {"pixels", "flat"}:
            check_array(trace[field], expected, field, errors)
    if expected_mode == "transformer":
        if trace["labels"] != ["HA", "HA", "ナ", "!"]:
            raise AssertionError("unexpected text token labels")
        expected_phase = "self_attention"
        expected_query = int(np.floor((t - 97.449) / .4)) % 4
    else:
        patches = trace["patches"]
        if len(patches) != 16:
            raise AssertionError("ViT must have sixteen patches")
        for index, patch in enumerate(patches):
            if (patch["index"], patch["row"], patch["col"]) != (index, index // 4, index % 4):
                raise AssertionError(f"patch {index}: incorrect raster ordering")
        check_array([p["pixels"] for p in patches], reference["pixels"], "patch_pixels", errors)
        check_array([p["flat"] for p in patches], reference["flat"], "patch_flatten_normalize", errors)
        local = t - 148.249
        expected_phase = ("patches" if local < 1.2 else "tokens" if local < 2.4 else
                          "attention" if local < 5.2 else "reassemble")
        expected_query = 0
    if trace["phase"] != expected_phase or trace["query"] != expected_query:
        raise AssertionError("phase or query does not follow deterministic timeline")
    weights = np.asarray(trace["weights"])
    check_array(weights.sum(axis=1), np.ones(len(weights)), "softmax_row_sum", errors)
    if not (weights > 0).all():
        raise AssertionError("softmax has nonpositive weights")
    return {"time": t, "mode": expected_mode, "phase": expected_phase,
            "query": expected_query, "sequence_length": len(weights),
            "all_values_finite": True, "max_absolute_error": max(errors.values()),
            "field_max_absolute_errors": errors}


def main():
    input_bytes = REVIEW.read_bytes()
    review = json.loads(input_bytes)
    text_reference, vision_reference = text_inputs(), vision_inputs()
    checked, failures, inactive = [], [], 0
    for record in review["records"]:
        try:
            result = verify_record(record, text_reference, vision_reference)
            if result is None:
                inactive += 1
            else:
                checked.append(result)
        except (KeyError, TypeError, ValueError, AssertionError) as exc:
            failures.append({"time": record.get("t"), "error": str(exc)})
    modes = Counter(row["mode"] for row in checked)
    phases = set(row["phase"] for row in checked if row["mode"] == "vit")
    if modes["transformer"] < 2 or modes["vit"] < 4:
        failures.append({"error": "insufficient sampled active windows", "counts": dict(modes)})
    if phases != {"patches", "tokens", "attention", "reassemble"}:
        failures.append({"error": "missing ViT phase coverage", "observed": sorted(phases)})
    if inactive < 1:
        failures.append({"error": "missing inactive-frame trace clearing coverage"})
    report = {
        "status": "failed" if failures else "passed",
        "scope": "Independent NumPy arithmetic and sampled trace-lifecycle checks of fixed tiny Transformer/ViT demonstrations; no pretrained-model, classification, or visual-acceptance claim.",
        "method": "Independent fixed inputs/parameters; winding-count old-star raster; reshape/transpose patch flatten; projection and position/CLS; pre-LayerNorm Q/K/V, scaled-dot-product stable softmax, weighted values, two residuals and GELU FFN; final CLS LayerNorm.",
        "tolerance": TOLERANCE,
        "input": str(REVIEW.relative_to(ROOT)),
        "input_sha256": hashlib.sha256(input_bytes).hexdigest(),
        "engine_sha256": hashlib.sha256(ENGINE.read_bytes()).hexdigest(),
        "sampled_frames": len(review["records"]),
        "inactive_frames_cleared": inactive,
        "active_counts": dict(modes),
        "vit_phases": sorted(phases),
        "max_absolute_error": max((row["max_absolute_error"] for row in checked), default=None),
        "records": checked,
        "failures": failures,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, ensure_ascii=False))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())

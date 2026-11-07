#!/usr/bin/env python3
"""Offline V6 story/numeric audit. Reads JSON evidence, never renders or plays media.

Default API:
    python tools/check_mv6_story_audit.py
    python tools/check_mv6_story_audit.py --render PATH --output PATH

Exit 0: no recorded violations; 1: violations; 2: unreadable/incomplete evidence.
An observed-field pass is explicitly narrower than full field coverage.
"""

from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[1]
FINAL = ROOT / "exports/mv6/final4k"
FPS, TOTAL, TOL = 60, 13100, 1e-8
NAMES = ["Gemini", "GLM", "DeepSeek", "Claude", "Qwen", "Grok"]
MISSING = object()


def finite(value):
    return type(value) in (int, float) and math.isfinite(value)


def equal(a, b):
    if isinstance(a, list) or isinstance(b, list):
        return isinstance(a, list) and isinstance(b, list) and len(a) == len(b) and all(equal(x, y) for x, y in zip(a, b))
    if finite(a) and finite(b):
        return math.isclose(a, b, rel_tol=TOL, abs_tol=TOL)
    return type(a) is type(b) and a == b


def load(path):
    raw = path.read_bytes()
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


class Check:
    def __init__(self, scope):
        self.scope = scope
        self.tests = self.failures = self.missing = 0
        self.examples = []

    def test(self, condition, frame=None, detail=None):
        self.tests += 1
        if not condition:
            self.failures += 1
            if len(self.examples) < 8:
                self.examples.append({"frame": frame, "detail": detail})

    def field(self, obj, key, expected, frame):
        if key not in obj:
            self.missing += 1
            self.test(False, frame, f"missing required field {key}")
        else:
            self.test(equal(obj[key], expected), frame, f"{key}: expected {expected!r}, observed {obj[key]!r}")

    def report(self):
        return {"status": "fail" if self.failures else "pass" if self.tests else "not_covered",
                "tests": self.tests, "failures": self.failures, "missingRequiredFields": self.missing,
                "scope": self.scope, **({"examples": self.examples} if self.examples else {})}


def tensor(value, shape):
    if not shape:
        return finite(value)
    return isinstance(value, list) and len(value) == shape[0] and all(tensor(v, shape[1:]) for v in value)


def conv3d(x, k):
    """CNN convention: valid cross-correlation, stride one, no reversal/bias."""
    zd, yh, xw = len(x) - len(k) + 1, len(x[0]) - len(k[0]) + 1, len(x[0][0]) - len(k[0][0]) + 1
    return [[[sum(x[z + dz][y + dy][xx + dx] * k[dz][dy][dx]
                  for dz in range(len(k)) for dy in range(len(k[0])) for dx in range(len(k[0][0])))
              for xx in range(xw)] for y in range(yh)] for z in range(zd)]


def check_convolution(s, frame, checks):
    c, sample = checks["conv3d"], checks["conv3d_samples"]
    x, k = s.get("input3D"), s.get("kernel3D")
    valid = tensor(x, [3, 5, 5]) and tensor(k, [3, 3, 3])
    c.test(valid, frame, "finite input[D,H,W]=[3,5,5] and kernel=[3,3,3] required")
    if not valid:
        return
    for key, expected in {"kind": "conv3d", "dimensionality": 3, "inputSize": [5, 5, 3], "kernelSize": [3, 3, 3],
                          "outputSize": [3, 3, 1], "poolSize": [2, 2, 1], "poolWindow": [2, 2, 1],
                          "stride": 1, "padding": 0, "poolStride": 1, "tensorOrder": "depth / y / x"}.items():
        c.field(s, key, expected, frame)
    out = conv3d(x, k)
    relu = [[[max(0, value) for value in row] for row in layer] for layer in out]
    pool = [[[max(relu[z][y + dy][xx + dx] for dy in range(2) for dx in range(2))
              for xx in range(2)] for y in range(2)] for z in range(1)]
    for key, expected in {"input": x, "kernel": k, "convolution3D": out, "convolution": out,
                          "relu3D": relu, "relu": relu, "pool3D": pool, "pool": pool}.items():
        c.field(s, key, expected, frame)
    patch = s.get("patch")
    valid_patch = (isinstance(patch, list) and len(patch) == 3 and all(type(v) is int for v in patch)
                   and patch[0] == 0 and 0 <= patch[1] < 3 and 0 <= patch[2] < 3)
    sample.test(valid_patch, frame, "patch must be [0,y,x] within valid output")
    if not valid_patch:
        return
    z, y, xx = patch
    sample.field(s, "scanIndex", y * 3 + xx, frame)
    sample.field(s, "currentDotProduct", out[z][y][xx], frame)
    phase = s.get("phase")
    sample.test(phase in ("convolution3d", "relu", "pool"), frame, "known convolution/ReLU/pool phase")
    if phase != "convolution3d":
        sample.field(s, "sampledTerms", [], frame)
        sample.field(s, "activeSampleCount", 0, frame)
        return
    terms = s.get("sampledTerms")
    sample.field(s, "activeSampleCount", 27, frame)
    valid_terms = isinstance(terms, list) and len(terms) == 27 and all(isinstance(v, dict) for v in terms)
    sample.test(valid_terms, frame, "27 individually recorded sampled terms required")
    if not valid_terms:
        return
    expected = {(dz, y + dy, xx + dx): (x[dz][y + dy][xx + dx], k[dz][dy][dx])
                for dz in range(3) for dy in range(3) for dx in range(3)}
    seen, products = set(), []
    for term in terms:
        index = term.get("index")
        key = tuple(index) if isinstance(index, list) and len(index) == 3 and all(type(v) is int for v in index) else None
        good = key in expected and key not in seen
        sample.test(good, frame, f"unique sampled voxel within patch: {index!r}")
        if not good:
            continue
        seen.add(key)
        value, weight = expected[key]
        for field, wanted in (("input", value), ("weight", weight), ("product", value * weight)):
            sample.field(term, field, wanted, frame)
        if finite(term.get("product")):
            products.append(term["product"])
    sample.test(len(seen) == 27 and len(products) == 27 and equal(sum(products), out[z][y][xx]), frame,
                "sum of all 27 recorded products equals independently recomputed output")


def expected_by_frame(entries, value, total=TOTAL, allow_gaps=False):
    result = [MISSING] * total
    for entry in entries:
        a, b = entry["start_frame"], entry["end_frame"]
        if type(a) is not int or type(b) is not int or not 0 <= a < b <= total:
            raise ValueError("Invalid original frame interval")
        for f in range(a, b):
            if result[f] is not MISSING:
                raise ValueError(f"Overlapping original interval at frame {f}")
            result[f] = entry[value]
    if not allow_gaps and any(v is MISSING for v in result):
        raise ValueError("Original timeline does not cover all 13100 frames")
    return [None if v is MISSING else v for v in result]


def resolve_report(value, owner):
    p = Path(value)
    if p.is_absolute():
        return p.resolve()
    local, project = owner.parent / p, ROOT / p
    return (local if local.exists() else project).resolve()


def audit(render_path):
    manifest, manifest_hash = load(render_path)
    timeline_path, lyrics_path, accent_path = (ROOT / "data/production-v5/timeline.json",
        ROOT / "data/production-v5/lyrics.en-zh.json", ROOT / "data/production-v52/audio-accents.json")
    timeline, timeline_hash = load(timeline_path)
    lyrics, lyrics_hash = load(lyrics_path)
    accents, accent_hash = load(accent_path)
    shots = timeline["shots"]
    shot_map = {s["id"]: s for s in shots}
    wanted_shots = expected_by_frame(shots, "id")
    wanted_lyrics = expected_by_frame(lyrics["lines"], "index", allow_gaps=True)
    release_frame = shot_map["R82"]["start_frame"]
    scopes = {
        "frame_chain": "Manifest and all listed chunk JSONs: exactly frames 0..13099, frame/60 timestamps, interval continuity and common source hash. No media decode/hash recalculation.",
        "shot_timeline": "Every frame's shot must equal original integer [start_frame,end_frame) timeline membership.",
        "lyric_cues": "Every frame's audit.lyrics must equal original cue index or explicit null in a gap; validates timing identity, not glyphs or singing.",
        "containment": "R64..R69 every frame: exact guest identity/index, cameraOutside and gateInFrontOfGuest; depth ordering when reported. These are recorded geometry facts, not image occlusion inspection.",
        "containment_sealed": "Last original frame of each count shot: closure/lock/grey must all be fully sealed (>=1-1e-6).",
        "neural_same_source": "R78..R80 every frame: FIRST MARK / MEMORY, no independent reply, predicted/not-received output and SAME RECORD origin.",
        "conv3d": "R79 every frame: recompute valid stride-1 cross-correlation from actual 3D input/kernel, then ReLU and 1x2x2 max pool; compare all recorded tensor aliases.",
        "conv3d_samples": "R79 convolution phase: verify all 27 unique sampled voxels, weights/products and sum; post-convolution phases explicitly contain no active sampled terms.",
        "control_release_observed": "Only actually present numeric controlReleased fields in story/spatial/current. Absent fields are unobserved, not assumed zero; none may be positive before R82.",
        "spatial_release_observed": "Separately check actually present spatial.current.release; this describes layer withdrawal and is not substituted for story.controlReleased.",
        "late_reply_observed": "Only R78..R86 actually present independentReply flags in story/spatial/current: true must not precede body 208s. Missing fields are explicitly unobserved.",
        "quiet_tail": "Every frame >=212.333333s: top-level beat pulse/kick zero, quiet true, no event IDs. Also checks present spatial.current pulse/kick; does not prove pixel stillness or silence.",
        "declared_quiet_intervals": "Every frame inside actual accent quiet_intervals or quiet sections: beat pulse/kick zero and quiet true. Does not infer quiet from music analysis outside these windows."
    }
    checks = {name: Check(scope) for name, scope in scopes.items()}
    chain = checks["frame_chain"]
    chain.test(manifest.get("frames") == TOTAL and manifest.get("interval") == [0, TOTAL], detail="full body manifest frames/interval")
    chain.test(manifest.get("config", {}).get("fps") == FPS, detail="manifest FPS=60")
    chunks = manifest.get("chunks")
    if not isinstance(chunks, list) or not chunks:
        raise ValueError("Final manifest has no chunk evidence")
    source_hash = manifest.get("config", {}).get("sourceCodeAndDataSha256")
    chain.test(isinstance(source_hash, str) and len(source_hash) == 64, detail="source hash recorded")
    part_fingerprints = {p["name"]: p.get("fingerprint") for p in manifest.get("parts", [])}
    cursor, seen, covered, chunk_inputs = 0, set(), Counter(), []
    first_reply, first_release = None, None
    sealed = {}
    coverage = {"controlReleased": Counter(), "spatialRelease": Counter(), "lateIndependentReply": Counter(), "quietSpatialBeat": Counter()}
    quiet_intervals = list(accents.get("quiet_intervals", [])) + [s for s in accents.get("sections", []) if s.get("mode") == "quiet"]
    for reference in chunks:
        chunk_path = resolve_report(reference["report"], render_path)
        if chunk_path in seen:
            chain.test(False, detail=f"duplicate chunk reference {chunk_path}")
            continue
        seen.add(chunk_path)
        chunk, digest = load(chunk_path)
        chunk_inputs.append({"file": str(chunk_path), "sha256": digest})
        a, b, records = chunk.get("first"), chunk.get("end"), chunk.get("frameAudit")
        if type(a) is not int or type(b) is not int or not isinstance(records, list):
            raise ValueError(f"Malformed chunk {chunk_path}")
        chain.test(a == cursor and a == reference.get("first") and b == reference.get("end") and a < b <= TOTAL,
                   detail=f"chunk interval {a}..{b}, expected next {cursor}")
        chain.test(len(records) == b - a, detail=f"chunk record count {chunk_path.name}")
        chain.test(chunk.get("config", {}).get("sourceCodeAndDataSha256") == source_hash, detail=f"chunk source hash {chunk_path.name}")
        chain.test(chunk.get("sha256") == reference.get("sha256"), detail=f"listed chunk media hash agreement {chunk_path.name}")
        expected_fingerprint = part_fingerprints.get(reference.get("part"), manifest.get("fingerprint"))
        chain.test(chunk.get("fingerprint") == expected_fingerprint, detail=f"owning renderer fingerprint {chunk_path.name}")
        for offset, record in enumerate(records):
            expected_frame = a + offset
            f, t = record.get("frame"), record.get("t")
            chain.test(type(f) is int and f == expected_frame == cursor and finite(t) and abs(t - f / FPS) <= TOL,
                       expected_frame, "exact frame/timestamp sequence")
            cursor += 1
            if type(f) is not int or not 0 <= f < TOTAL:
                continue
            expected_shot, expected_cue = wanted_shots[f], wanted_lyrics[f]
            checks["shot_timeline"].field(record, "shot", expected_shot, f)
            covered[expected_shot] += 1
            raw = record.get("audit")
            raw = raw if isinstance(raw, dict) else {}
            checks["lyric_cues"].field(raw, "lyrics", expected_cue, f)
            story, spatial = raw.get("story", {}), raw.get("spatial", {})
            story = story if isinstance(story, dict) else {}
            spatial = spatial if isinstance(spatial, dict) else {}
            current = spatial.get("current", {})
            current = current if isinstance(current, dict) else {}
            n = int(expected_shot[1:])
            if 64 <= n <= 69:
                c, guest = checks["containment"], n - 64
                for key, value in {"currentGuest": f"guest{guest}", "currentGuestName": NAMES[guest], "currentIndex": guest,
                                   "cameraOutside": True, "gateInFrontOfGuest": True}.items():
                    c.field(spatial, key, value, f)
                if "frontGateZ" in spatial and "guestDepth" in spatial:
                    c.test(finite(spatial["frontGateZ"]) and finite(spatial["guestDepth"]) and spatial["frontGateZ"] > spatial["guestDepth"], f, "gate depth in front of guest")
                if f == shot_map[expected_shot]["end_frame"] - 1:
                    sealed[expected_shot] = {"frame": f, "guest": spatial.get("currentGuestName"), **{key: spatial.get(key) for key in ("closure", "lock", "grey")}}
                    for key in ("closure", "lock", "grey"):
                        v = spatial.get(key)
                        checks["containment_sealed"].test(finite(v) and 1 - 1e-6 <= v <= 1 + TOL, f, f"{key} fully sealed: {v!r}")
            if 78 <= n <= 80:
                for key, value in {"source": "FIRST MARK / MEMORY", "independentReply": False, "predictedOutput": True,
                                   "outputClassification": "PREDICTED / NOT RECEIVED", "origin": "SAME RECORD", "outputText": "I will stay."}.items():
                    checks["neural_same_source"].field(spatial, key, value, f)
            if n == 79:
                check_convolution(spatial, f, checks)
            control_observed = False
            for obj in (story, spatial, current):
                if "controlReleased" in obj:
                    control_observed = True
                    v = obj["controlReleased"]
                    if f < release_frame:
                        checks["control_release_observed"].test(finite(v) and v <= 0, f, f"controlReleased={v!r}; R82 starts frame {release_frame}")
                    if finite(v) and v > TOL and first_release is None:
                        first_release = f
            coverage["controlReleased"]["observedFrames" if control_observed else "unobservedFrames"] += 1
            if f < release_frame:
                coverage["controlReleased"]["observedBeforeR82" if control_observed else "unobservedBeforeR82"] += 1
            if "release" in current:
                coverage["spatialRelease"]["observedFrames"] += 1
                v = current["release"]
                checks["spatial_release_observed"].test(finite(v) and (f >= release_frame or v <= TOL), f, f"spatial layer release={v!r}")
            else:
                coverage["spatialRelease"]["unobservedFrames"] += 1
            if 78 <= n <= 86:
                flags = [obj["independentReply"] for obj in (story, spatial, current) if "independentReply" in obj]
                coverage["lateIndependentReply"]["observedFrames" if flags else "unobservedFrames"] += 1
                if f < 208 * FPS:
                    coverage["lateIndependentReply"]["observedBefore208" if flags else "unobservedBefore208"] += 1
                for flag in flags:
                    checks["late_reply_observed"].test(type(flag) is bool and (not flag or f >= 208 * FPS), f, f"independentReply={flag!r}")
                    if flag is True and first_reply is None:
                        first_reply = f
            beat = record.get("beat")
            beat = beat if isinstance(beat, dict) else {}
            in_tail = f >= 12740  # 212 + 1/3 seconds, exactly on the 60fps grid.
            in_declared_quiet = any(f / FPS >= s["start_body"] and f / FPS < s["end_body"] for s in quiet_intervals)
            for key, enabled in (("quiet_tail", in_tail), ("declared_quiet_intervals", in_declared_quiet)):
                if enabled:
                    for field, value in (("pulse", 0), ("kick", 0), ("quiet", True)):
                        checks[key].field(beat, field, value, f)
                    if key == "quiet_tail":
                        checks[key].field(beat, "events", [], f)
            if in_tail:
                for field in ("pulse", "kick"):
                    present = field in current
                    coverage["quietSpatialBeat"][field + ("ObservedFrames" if present else "UnobservedFrames")] += 1
                    if present:
                        checks["quiet_tail"].field(current, field, 0, f)
    chain.test(cursor == TOTAL, detail=f"audited frame count {cursor}, expected {TOTAL}")
    for shot in shots:
        chain.test(covered[shot["id"]] == shot["end_frame"] - shot["start_frame"], detail=f"exact coverage for {shot['id']}")
    checks["containment_sealed"].test(len(sealed) == 6, detail="all six final count frames observed")
    reports = {key: c.report() for key, c in checks.items()}
    return {"schemaVersion": 1, "createdUTC": datetime.now(timezone.utc).isoformat(),
            "status": "fail" if any(c.failures for c in checks.values()) else "pass",
            "auditedFrames": cursor, "expectedFrames": TOTAL, "fps": FPS, "chunkCount": len(chunk_inputs),
            "inputs": {"render": {"file": str(render_path), "sha256": manifest_hash},
                       "timelineSha256": timeline_hash, "lyricsSha256": lyrics_hash, "accentSha256": accent_hash,
                       "recordedSourceCodeAndDataSha256": source_hash, "chunks": chunk_inputs},
            "checks": reports, "observedFieldCoverage": {k: dict(v) for k, v in coverage.items()}, "sealedCountEndpoints": sealed,
            "firstObservedIndependentReply": None if first_reply is None else {"frame": first_reply, "bodyTime": first_reply / FPS},
            "firstObservedControlRelease": None if first_release is None else {"frame": first_release, "bodyTime": first_release / FPS},
            "scope": ["JSON state/numeric audit only. No playback, ear listening, visual occlusion, glyph legibility or media decoding is performed.",
                      "Missing optional story flags are counted as unobserved, never inferred false. Required frame/guest/neural/tensor fields fail if absent.",
                      "Reported render/video hashes are linked by agreement only; this tool hashes its JSON inputs, not media or the current source tree.",
                      "Toy 3D memory volume is authored from FIRST MARK. Exact arithmetic does not validate a trained model, physical depth or genuine independent reasoning."]}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--render", type=Path, default=FINAL / "body.render.json")
    parser.add_argument("--output", type=Path, default=FINAL / "story-audit.json")
    args = parser.parse_args()
    render_path, output = args.render.resolve(), args.output.resolve()
    if not output.is_relative_to((ROOT / "exports/mv6").resolve()) or output == render_path:
        parser.error("Output must be a distinct file beneath this worktree exports/mv6")
    try:
        result = audit(render_path)
        code = 0 if result["status"] == "pass" else 1
    except (OSError, ValueError, KeyError, TypeError, IndexError) as exc:
        result = {"schemaVersion": 1, "createdUTC": datetime.now(timezone.utc).isoformat(), "status": "incomplete",
                  "render": str(render_path), "error": f"{type(exc).__name__}: {exc}",
                  "scope": "Input evidence unavailable or malformed. No successful full-frame audit is claimed."}
        code = 2
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=output.parent, prefix="story-audit-", suffix=".tmp", delete=False) as handle:
        json.dump(result, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write("\n")
        temporary = Path(handle.name)
    temporary.replace(output)
    print(json.dumps({"status": result["status"], "output": str(output), "auditedFrames": result.get("auditedFrames", 0)}, ensure_ascii=False))
    return code


if __name__ == "__main__":
    sys.exit(main())

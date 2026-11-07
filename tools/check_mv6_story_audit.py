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
PATCH_SEGMENTS = [(0, 2896, "base"), (2896, 3117, "vision"), (3117, 3754, "base"),
                  (3754, 3920, "intro"), (3920, 9529, "base"),
                  (9529, 9690, "counts"), (9690, TOTAL, "base")]
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


def source_context(manifest, path, digest):
    references = {}
    for ref in manifest.get("chunks", []):
        report = resolve_report(ref["report"], path)
        if report in references:
            raise ValueError(f"Duplicate original chunk reference in {path}")
        references[report] = ref
    if not references:
        raise ValueError(f"No original chunk references in {path}")
    return {"manifest": manifest, "path": path, "sha256": digest,
            "sourceHash": manifest.get("config", {}).get("sourceCodeAndDataSha256"),
            "fingerprint": manifest.get("fingerprint"), "references": references,
            "parts": {p["name"]: p.get("fingerprint") for p in manifest.get("parts", [])}}


def prepare_sources(manifest, path, digest, check):
    """Validate source JSON provenance without relabelling old capture hashes."""
    if manifest.get("mixedCaptureSources") is not True:
        check.test(not manifest.get("captureSources"), detail="captureSources requires explicit mixedCaptureSources:true")
        return {"single": source_context(manifest, path, digest)}, False
    check.test(manifest.get("schema") == "mv6-patched-render-v1", detail="recognized explicit mixed-capture schema")
    segments = manifest.get("segments")
    if not isinstance(segments, list):
        raise ValueError("Mixed capture manifest requires exact segments")
    observed = [(s.get("first"), s.get("end"), s.get("captureSource")) for s in segments]
    check.test(observed == PATCH_SEGMENTS, detail="only R14 [2896,3117), R19 [3754,3920), R64..R69 [9529,9690) replaced")
    for segment in segments:
        check.test(segment.get("sourceFrameInterval") == [segment.get("first"), segment.get("end")],
                   detail="source frames retain their original global indices")
    capture_sources = manifest.get("captureSources")
    if not isinstance(capture_sources, dict) or set(capture_sources) != {"base", "vision", "intro", "counts"}:
        raise ValueError("Mixed capture requires exactly base, vision, intro and counts sources")
    contexts = {}
    expected_intervals = {"base": [0, TOTAL], "vision": [2896, 3117], "intro": [3754, 3920], "counts": [9529, 9690]}
    post_edit_hash = manifest.get("config", {}).get("postEditSourceCodeAndDataSha256")
    check.test(isinstance(post_edit_hash, str) and len(post_edit_hash) == 64, detail="explicit post-edit source hash")
    proof = manifest.get("sourceProof", {})
    labels_hash = proof.get("labelsOnlySourceCodeAndDataSha256")
    check.test(proof.get("ready") is True, detail="assembler reports completed staged source proof")
    check.test(isinstance(labels_hash, str) and len(labels_hash) == 64, detail="separate historical labels-only source hash")
    check.test(proof.get("postEditSourceCodeAndDataSha256") == post_edit_hash, detail="source proof final hash agrees with assembly config")
    for name, declaration in capture_sources.items():
        source_path = resolve_report(declaration["renderReport"], path)
        if source_path == path:
            raise ValueError("Mixed manifest cannot cite itself as original capture")
        original, original_digest = load(source_path)
        if original.get("mixedCaptureSources"):
            raise ValueError("Nested mixed capture source is unsupported; cite original renders")
        context = source_context(original, source_path, original_digest)
        contexts[name] = context
        check.test(declaration.get("renderReportSha256") == original_digest, detail=f"{name} original render JSON SHA256")
        check.test(declaration.get("sourceCodeAndDataSha256") == context["sourceHash"], detail=f"{name} original source hash unchanged")
        check.test(declaration.get("renderFingerprint") == context["fingerprint"], detail=f"{name} original render fingerprint")
        check.test(declaration.get("mediaSha256") == original.get("sha256"), detail=f"{name} media hash matches original report; media not rehashed")
        interval = original.get("interval", original.get("config", {}).get("interval"))
        check.test(interval == declaration.get("interval") == expected_intervals[name], detail=f"{name} exact original capture interval")
        check.test(original.get("config", {}).get("fps") == FPS, detail=f"{name} capture FPS=60")
        if name in ("vision", "intro"):
            check.test(context["sourceHash"] == post_edit_hash, detail=f"{name} patch captured with declared post-edit source")
        elif name == "counts":
            check.test(context["sourceHash"] == labels_hash, detail="counts retains its actual labels-only historical source hash")
        else:
            check.test(context["sourceHash"] == proof.get("reconstructedBaseSourceCodeAndDataSha256"), detail="base retains the original reconstructed source hash")
        expected_fingerprints = {context["parts"].get(ref.get("part"), context["fingerprint"])
                                 for ref in context["references"].values()}
        declared = declaration.get("chunkFingerprints")
        check.test(isinstance(declared, list) and set(declared) == expected_fingerprints,
                   detail=f"{name} chunk fingerprint whitelist derived from original render report")
    stages = proof.get("revisionStages", [])
    check.test([(s.get("from"), s.get("to")) for s in stages] ==
               [(contexts["base"]["sourceHash"], labels_hash), (labels_hash, post_edit_hash)],
               detail="declared source stages match three actual capture hashes; source reconstruction itself belongs to assembler")
    return contexts, True


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
        "frame_chain": "Exactly frames 0..13099 and frame/60 timestamps. Each original full chunk is checked before clipping. A single render retains one source hash; an explicit patched manifest retains separately verified capture-source hashes. No media decode/hash recalculation.",
        "capture_provenance": "Original render JSONs are hashed; chunk references/fingerprints/source hashes must match their original owning report. Mixed capture accepts only the three authorized R14/R19/R64..69 intervals: base, historical labels-only counts, and final vision/intro source hashes remain distinct. Assembler source-reconstruction proof is checked for hash consistency, not recomputed here.",
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
    contexts, mixed = prepare_sources(manifest, render_path, manifest_hash, checks["capture_provenance"])
    for name, context in contexts.items():
        chain.test(isinstance(context["sourceHash"], str) and len(context["sourceHash"]) == 64, detail=f"{name} capture source hash recorded")
    source_hash = None if mixed else contexts["single"]["sourceHash"]
    cursor, seen, covered, chunk_inputs = 0, set(), Counter(), []
    first_reply, first_release = None, None
    sealed = {}
    coverage = {"controlReleased": Counter(), "spatialRelease": Counter(), "lateIndependentReply": Counter(), "quietSpatialBeat": Counter()}
    quiet_intervals = list(accents.get("quiet_intervals", [])) + [s for s in accents.get("sections", []) if s.get("mode") == "quiet"]
    for reference in chunks:
        chunk_path = resolve_report(reference["report"], render_path)
        source_id = reference.get("captureSource") if mixed else "single"
        if source_id not in contexts:
            raise ValueError(f"Unrecognized capture source {source_id!r}")
        context = contexts[source_id]
        original_ref = context["references"].get(chunk_path)
        if original_ref is None:
            raise ValueError(f"Chunk {chunk_path} is not listed by its original {source_id} render")
        lo, hi = reference.get("first"), reference.get("end")
        unit = (source_id, chunk_path, lo, hi) if mixed else chunk_path
        if unit in seen:
            chain.test(False, detail=f"duplicate selected chunk interval {chunk_path}")
            continue
        seen.add(unit)
        chunk, digest = load(chunk_path)
        chunk_inputs.append({"file": str(chunk_path), "sha256": digest, "captureSource": source_id, "selectedInterval": [lo, hi]})
        a, b, records = chunk.get("first"), chunk.get("end"), chunk.get("frameAudit")
        if type(a) is not int or type(b) is not int or not isinstance(records, list):
            raise ValueError(f"Malformed chunk {chunk_path}")
        if any(not isinstance(record, dict) for record in records):
            raise ValueError(f"Non-object frame record in original chunk {chunk_path}")
        if type(lo) is not int or type(hi) is not int or not a <= lo < hi <= b:
            raise ValueError(f"Selected interval [{lo},{hi}) is outside original chunk [{a},{b})")
        chain.test(lo == cursor and 0 <= a < b <= TOTAL,
                   detail=f"selected interval {lo}..{hi}, expected next {cursor}")
        chain.test(a == original_ref.get("first") and b == original_ref.get("end"), detail=f"original owning chunk interval {chunk_path.name}")
        chain.test(len(records) == b - a, detail=f"chunk record count {chunk_path.name}")
        chain.test(chunk.get("config", {}).get("sourceCodeAndDataSha256") == context["sourceHash"], detail=f"original {source_id} chunk source hash {chunk_path.name}")
        chain.test(chunk.get("sha256") == reference.get("sha256") == original_ref.get("sha256"), detail=f"listed/original chunk media hash agreement {chunk_path.name}")
        checks["capture_provenance"].test(resolve_report(reference["file"], render_path) == resolve_report(original_ref["file"], context["path"]),
                                           detail=f"selected media path matches original owning chunk {chunk_path.name}")
        expected_fingerprint = context["parts"].get(original_ref.get("part"), context["fingerprint"])
        chain.test(chunk.get("fingerprint") == expected_fingerprint, detail=f"owning renderer fingerprint {chunk_path.name}")
        if mixed:
            provenance = checks["capture_provenance"]
            provenance.test(reference.get("reportSha256") == digest, detail=f"selected chunk JSON SHA256 {chunk_path.name}")
            provenance.test(reference.get("originalInterval") == [a, b], detail=f"original full chunk bounds {chunk_path.name}")
            provenance.test(reference.get("captureFingerprint") == chunk.get("fingerprint"), detail=f"original capture fingerprint retained {chunk_path.name}")
            provenance.test(reference.get("sourceCodeAndDataSha256") == context["sourceHash"], detail=f"original source hash retained {chunk_path.name}")
            provenance.test(any(start <= lo < hi <= end and source_id == source for start, end, source in PATCH_SEGMENTS),
                            detail=f"{source_id} selection {lo}..{hi} inside its authorized segment")
        else:
            chain.test(lo == a and hi == b, detail="single-source manifest must reference each complete chunk")
        for offset, record in enumerate(records):
            full_frame = a + offset
            chain.test(isinstance(record, dict) and type(record.get("frame")) is int and record["frame"] == full_frame
                       and finite(record.get("t")) and abs(record["t"] - full_frame / FPS) <= TOL,
                       full_frame, "full original chunk frame/timestamp continuity before selection")
        for offset, record in enumerate(records[lo - a:hi - a]):
            expected_frame = lo + offset
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
                       "recordedSourceCodeAndDataSha256": source_hash,
                       "mixedCaptureSources": mixed,
                       "postEditSourceCodeAndDataSha256": manifest.get("config", {}).get("postEditSourceCodeAndDataSha256") if mixed else None,
                       "captureSources": {name: {"renderReport": str(c["path"]), "renderReportSha256": c["sha256"],
                                                  "sourceCodeAndDataSha256": c["sourceHash"], "renderFingerprint": c["fingerprint"]}
                                          for name, c in contexts.items()}, "chunks": chunk_inputs},
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
    except (OSError, ValueError, KeyError, TypeError, IndexError, AttributeError) as exc:
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

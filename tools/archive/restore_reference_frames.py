#!/usr/bin/env python3
"""Restore ignored reference frames/contact sheets from the retained local MP4.

No network access, analysis updates, or changes to index.html. Existing images
are skipped. The JPEG and sheet settings match tools/collect_reference.py.
--check only inspects dependencies and the local source; it creates no files.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "source/video-avc.mp4"
SOURCE_SHA256 = "b513c311df1ea2ab4a614c0f90e6ed6584fa039fc246cea71f315b2542a0ab8a"
EXPECTED_FRAMES = 6096
EXPECTED_FPS = 30.0
FONT = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts/consola.ttf"


def inspect_source():
    import cv2
    import PIL
    from PIL import ImageFont

    if not SOURCE.is_file():
        raise FileNotFoundError(f"Retained local source is missing: {SOURCE}")
    with SOURCE.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if digest != SOURCE_SHA256:
        raise ValueError("Local reference SHA256 differs from the archived source")
    # The original grid used Windows Consolas; do not silently change its labels.
    ImageFont.truetype(str(FONT), 12)
    cap = cv2.VideoCapture(str(SOURCE))
    try:
        if not cap.isOpened():
            raise RuntimeError("OpenCV cannot open the local reference MP4")
        frame_count = int(round(cap.get(cv2.CAP_PROP_FRAME_COUNT)))
        fps = cap.get(cv2.CAP_PROP_FPS)
        if frame_count != EXPECTED_FRAMES or abs(fps - EXPECTED_FPS) > 1e-6:
            raise ValueError(f"Unexpected source metadata: {frame_count} frames, {fps} fps")
    finally:
        cap.release()
    return {
        "source": str(SOURCE), "source_sha256": digest,
        "reported_frame_count": frame_count, "fps": fps,
        "frame_count_scope": "OpenCV container metadata; full decode occurs on restore",
        "opencv_version": cv2.__version__, "pillow_version": PIL.__version__,
        "font": str(FONT), "expected_all_frame_sheets": 51,
        "expected_overview_sheets": 9,
    }


def restore_frames():
    import cv2

    frame_dir = ROOT / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(str(SOURCE))
    decoded = created = skipped = 0
    try:
        if not cap.isOpened():
            raise RuntimeError("OpenCV cannot open the local reference MP4")
        while True:
            ok, bgr = cap.read()
            if not ok:
                break
            if decoded >= EXPECTED_FRAMES:
                raise ValueError("Source decoded more than the archived 6096 frames")
            target = frame_dir / f"f{decoded:06d}.jpg"
            if target.exists():
                if not target.is_file():
                    raise ValueError(f"Expected an image file, found another path type: {target}")
                skipped += 1
            else:
                ok, encoded = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, 90])
                if not ok:
                    raise RuntimeError(f"OpenCV JPEG encoding failed at frame {decoded}")
                # Exclusive creation also prevents accidental replacement during a race.
                with target.open("xb") as stream:
                    stream.write(encoded.tobytes())
                created += 1
            decoded += 1
    finally:
        cap.release()
    if decoded != EXPECTED_FRAMES:
        raise ValueError(f"Incomplete decode: {decoded} / {EXPECTED_FRAMES} frames")
    return {"decoded": decoded, "created": created, "skipped_existing": skipped}


def restore_sheets():
    from PIL import Image, ImageDraw, ImageFont

    font = ImageFont.truetype(str(FONT), 12)
    created = skipped = 0

    def sheet(indices, target, cols, tw, th, label_h=18):
        nonlocal created, skipped
        if target.exists():
            if not target.is_file():
                raise ValueError(f"Expected a sheet file, found another path type: {target}")
            skipped += 1
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        size = (cols * tw, ((len(indices) + cols - 1) // cols) * (th + label_h))
        with Image.new("RGB", size, (15, 15, 22)) as canvas:
            draw = ImageDraw.Draw(canvas)
            for k, frame in enumerate(indices):
                x, y = (k % cols) * tw, (k // cols) * (th + label_h)
                with Image.open(ROOT / f"frames/f{frame:06d}.jpg") as image:
                    canvas.paste(image.resize((tw, th), Image.Resampling.LANCZOS), (x, y))
                draw.text((x + 3, y + th + 1), f"{frame:06d}  {frame / EXPECTED_FPS:07.3f}s",
                          font=font, fill=(225, 225, 235))
            with target.open("xb") as stream:
                canvas.save(stream, format="JPEG", quality=92)
        created += 1

    for i, start in enumerate(range(0, EXPECTED_FRAMES, 120)):
        indices = list(range(start, min(start + 120, EXPECTED_FRAMES)))
        sheet(indices, ROOT / f"sheets/all-frames/all-{i:03d}.jpg", 10, 192, 108)
    span, stride = round(EXPECTED_FPS * 24), round(EXPECTED_FPS)
    for i, start in enumerate(range(0, EXPECTED_FRAMES, span)):
        indices = list(range(start, min(start + span, EXPECTED_FRAMES), stride))
        sheet(indices, ROOT / f"sheets/overview/overview-{i:02d}.jpg", 4, 426, 240)
    return {"created": created, "skipped_existing": skipped, "total_expected": 60}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="check local dependencies/source metadata without writing files")
    args = parser.parse_args()
    report = {"mode": "check-only" if args.check else "restore", **inspect_source()}
    if not args.check:
        report["frames"] = restore_frames()
        report["sheets"] = restore_sheets()
    report["status"] = "passed"
    report["analysis_and_index_unchanged"] = True
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ImportError, OSError, RuntimeError, ValueError) as error:
        print(json.dumps({"status": "failed", "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)

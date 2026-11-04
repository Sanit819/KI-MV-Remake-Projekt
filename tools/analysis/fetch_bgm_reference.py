"""Fetch the public audio stream of ProjectMili's original upload for local analysis."""
from pathlib import Path
import hashlib
import json
from datetime import datetime, timezone
from urllib.parse import urlsplit

import requests

ROOT = Path(__file__).resolve().parents[2]
BVID = "BV1ds411e7df"
PAGE = f"https://www.bilibili.com/video/{BVID}/"


def main():
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0", "Referer": PAGE})
    response = session.get("https://api.bilibili.com/x/web-interface/view", params={"bvid": BVID}, timeout=30)
    response.raise_for_status()
    metadata = response.json()
    if metadata.get("code") != 0:
        raise RuntimeError(f"Public metadata unavailable: {metadata.get('code')}")
    info = metadata["data"]
    if info["owner"]["mid"] != 23340150 or info["owner"]["name"] != "ProjectMili":
        raise RuntimeError("Unexpected uploader; inspect source identity before downloading")
    response = session.get("https://api.bilibili.com/x/player/playurl", params={
        "bvid": BVID, "cid": info["cid"], "qn": 64, "fnval": 16, "fourk": 1,
    }, timeout=30)
    response.raise_for_status()
    playback = response.json()
    if playback.get("code") != 0:
        raise RuntimeError(f"Public playback unavailable: {playback.get('code')}")
    tracks = (playback["data"].get("dash") or {}).get("audio") or []
    if not tracks:
        raise RuntimeError("No public DASH audio track returned")
    track = max(tracks, key=lambda x: x.get("bandwidth", 0))
    url = track.get("baseUrl") or track["base_url"]
    target = ROOT / "media/audio/mili-world-execute-original-bilibili.m4a"
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        raise FileExistsError(f"Reference already exists; preserve it: {target}")
    pending = target.with_suffix(".download")
    with session.get(url, stream=True, timeout=60) as response:
        response.raise_for_status()
        with pending.open("wb") as output:
            for block in response.iter_content(1024 * 1024):
                output.write(block)
    pending.replace(target)
    manifest = {
        "source_kind": "compressed audio from official public upload; not a lossless master",
        "source_page": PAGE,
        "official_youtube_version_reference": "https://www.youtube.com/watch?v=ESx_hy1n7HA",
        "uploader": {"name": info["owner"]["name"], "mid": info["owner"]["mid"]},
        "title": info["title"], "bvid": BVID, "aid": info["aid"], "cid": info["cid"],
        "published_utc": datetime.fromtimestamp(info["pubdate"], timezone.utc).isoformat(),
        "fetched_utc": datetime.now(timezone.utc).isoformat(),
        "api_duration_seconds": info["duration"],
        "playback_timelength_ms": playback["data"].get("timelength"),
        "track_id": track["id"], "codec": track.get("codecs"),
        "advertised_bandwidth_bps": track.get("bandwidth"),
        "download_host": urlsplit(url).hostname,
        "local_path": target.relative_to(ROOT).as_posix(),
        "bytes": target.stat().st_size,
        "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        "authentication": "none; public metadata and public playback only",
        "use": "local timing analysis; audio bytes excluded from Git",
    }
    path = ROOT / "docs/audio/source.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: manifest[k] for k in ("local_path", "bytes", "sha256", "track_id")}, indent=2))


if __name__ == "__main__":
    main()

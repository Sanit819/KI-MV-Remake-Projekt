"""Build a source-derived X-40 scale board, without redrawing aircraft pixels.

Only source cropping (including a polygon crop through empty page background),
uniform scaling, and separate review annotations are applied. Original files
are hashed before and after. No perspective correction or anisotropic stretch.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib
import json
import math

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "references/aircraft"
SOURCE = BASE / "source-assets/x-40/aaw2029-artsee-mirror-p153.webp"
OUT = BASE / "source-assets/x-40/scale-review"
OUT.mkdir(parents=True, exist_ok=True)
SCALE = 60.0  # pixels per metre on the board, not a print DPI claim
LENGTH, SPAN, HEIGHT = 26.9, 22.17, 2.94
FONT = "C:/Windows/Fonts/msyh.ttc"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def meta(path):
    result = {"file": path.relative_to(ROOT).as_posix(),
              "bytes": path.stat().st_size, "sha256": sha(path)}
    if path.suffix in [".webp", ".png"]:
        result["pixels"] = list(Image.open(path).size)
    return result


source_hash = sha(SOURCE)
assert source_hash == "c3fecb6089821776c03c7da34ced1eddb5dbdc650b5a274097351996f657ea5d"
source = Image.open(SOURCE).convert("RGB")

# Coordinates refer to original 1654 x 2340 p153 scan, not resized thumbnails.
# Polygon cuts follow empty grey gaps between separately printed views. They
# remove neighbouring-view fragments, not aircraft outlines. Rectangular source
# crops are also retained, allowing this boundary to be audited.
VIEWS = {
    "top": {
        "crop_xyxy": [105, 1090, 825, 1688],
        "polygon_crop_xy": [[105, 1090], [825, 1090], [825, 1688],
                            [735, 1688], [440, 1545], [300, 1465], [105, 1420]],
        "calibration": "Nose x121 to aftmost planform x809: 688 px = 26.9 m",
        "calibration_px": 688, "calibration_m": LENGTH,
        "anchors": {"N": [121, 1389], "AFT": [809, 1642],
                    "W1": [765, 1104], "W2": [767, 1672]},
        "span_px": 568,
    },
    "side": {
        "crop_xyxy": [105, 2060, 825, 2160],
        "polygon_crop_xy": None,
        "calibration": "Nose x128 to aftmost planform x807: 679 px = 26.9 m",
        "calibration_px": 679, "calibration_m": LENGTH,
        "anchors": {"N": [128, 2120], "AFT": [807, 2108],
                    "HTOP": [351, 2072], "HLOW": [620, 2148]},
        "height_px": 76,
        "height_basis": "Visible gear-up side envelope, canopy to lower aft silhouette; projected stores cannot all be separated in this view.",
    },
    "front": {
        "crop_xyxy": [230, 1948, 830, 2051],
        "polygon_crop_xy": [[230, 2008], [370, 1958], [590, 1948],
                            [830, 1948], [830, 2051], [230, 2051]],
        "calibration": "Outer wing tips x245 to x813: 568 px = 22.17 m",
        "calibration_px": 568, "calibration_m": SPAN,
        "anchors": {"WL": [245, 2016], "WR": [813, 2015],
                    "HTOP": [529, 1961], "BODYLOW": [586, 2037],
                    "UAVLOW": [665, 2038]},
        "airframe_height_px": 76, "with_uav_height_px": 77,
        "height_basis": "Canopy top to distinguishable main nacelle underside. Inner UAV underside is measured separately, approximately one source pixel lower.",
    },
}


def range_ratio(numerator, denominator, physical):
    # +/-3px per endpoint -> +/-6px per measured extent, worst-case only.
    return [(numerator - 6) / (denominator + 6) * physical,
            (numerator + 6) / (denominator - 6) * physical]


metrics = {
    "top_span_m": 568 / 688 * LENGTH,
    "top_span_difference_percent": (568 / 688 * LENGTH / SPAN - 1) * 100,
    "side_height_m": 76 / 679 * LENGTH,
    "side_height_difference_percent": (76 / 679 * LENGTH / HEIGHT - 1) * 100,
    "front_airframe_height_m": 76 / 568 * SPAN,
    "front_airframe_height_difference_percent": (76 / 568 * SPAN / HEIGHT - 1) * 100,
    "front_with_uav_height_m": 77 / 568 * SPAN,
    "front_with_uav_height_difference_percent": (77 / 568 * SPAN / HEIGHT - 1) * 100,
    "relative_side_to_top_uniform_scale": 688 / 679,
    "side_minus_front_height_m": 76 / 679 * LENGTH - 76 / 568 * SPAN,
}
ranges = {
    "top_span_m": range_ratio(568, 688, LENGTH),
    "side_height_m": range_ratio(76, 679, LENGTH),
    "front_airframe_height_m": range_ratio(76, 568, SPAN),
    "front_with_uav_height_m": range_ratio(77, 568, SPAN),
}

crops = {}
for name, view in VIEWS.items():
    x0, y0, x1, y1 = view["crop_xyxy"]
    rectangular = source.crop((x0, y0, x1, y1))
    rectangular.save(OUT / f"x40-{name}-source-crop.png")
    isolated = rectangular.convert("RGBA")
    if view["polygon_crop_xy"]:
        alpha = Image.new("L", isolated.size, 0)
        ImageDraw.Draw(alpha).polygon([(x-x0, y-y0) for x, y in view["polygon_crop_xy"]], fill=255)
        isolated.putalpha(alpha)
    isolated.save(OUT / f"x40-{name}-isolated-crop.png")
    crops[name] = isolated
    view["source_px_per_m"] = view["calibration_px"] / view["calibration_m"]
    view["uniform_scale_factor"] = SCALE / view["source_px_per_m"]
    view["endpoint_uncertainty_px"] = 3

board = Image.new("RGB", (2100, 2960), "#f1f4f8")
draw = ImageDraw.Draw(board)


def text(x, y, content, size=25, color="#18314b"):
    draw.text((x, y), content, font=ImageFont.truetype(FONT, size), fill=color)


def panel(box, label):
    draw.rounded_rectangle(box, radius=16, fill="white", outline="#c7d3df", width=2)
    text(box[0]+22, box[1]+15, label, 30)


def place(name, origin):
    view = VIEWS[name]
    s = view["uniform_scale_factor"]
    im = crops[name]
    # One scalar is explicitly shared by both axes. Integer output bounds do
    # not introduce independent horizontal/vertical resize factors.
    scaled = im.transform((math.ceil(im.width*s), math.ceil(im.height*s)),
                          Image.Transform.AFFINE, (1/s, 0, 0, 0, 1/s, 0),
                          Image.Resampling.BICUBIC, fillcolor=(0, 0, 0, 0))
    board.paste(scaled, origin, scaled)
    view["board_origin_xy"] = list(origin)
    view["resampling"] = "Pillow affine BICUBIC, identical scalar on x/y; transparent polygon-crop exterior"
    x0, y0 = view["crop_xyxy"][:2]

    def pt(point):
        return origin[0]+(point[0]-x0)*s, origin[1]+(point[1]-y0)*s

    return pt


def dimension(x1, x2, y, label):
    draw.line((x1, y, x2, y), fill="#286f98", width=3)
    for x in [x1, x2]:
        draw.line((x, y-10, x, y+10), fill="#286f98", width=3)
    text((x1+x2)/2-160, y+12, label, 23, "#286f98")


def dashed(x1, x2, y, color):
    for x in range(round(x1), round(x2), 18):
        draw.line((x, y, min(x+10, x2), y), fill=color, width=2)


text(40, 24, "X-40 同比例参考板｜AAW 2029 印刷第 153 页", 38)
text(40, 82, "全板 60 px / m；顶、侧按全长 26.9 m，前视按翼展 22.17 m 分别等比定标。", 27)
text(40, 119, "原始扫描 → 裁切 → 单一比例缩放；没有重画轮廓、透视矫正、横纵独立拉伸。", 24)

panel((40, 165, 2060, 1740), "A · 顶视｜机首朝左；保留原扫描线条与灰底")
top = place("top", (182, 232))
dimension(top(VIEWS["top"]["anchors"]["N"])[0], top(VIEWS["top"]["anchors"]["AFT"])[0],
          1670, "26.9 m / 1614 px")
text(1100, 190, f"定标后翼展 {metrics['top_span_m']:.3f} m（较22.17 m {metrics['top_span_difference_percent']:+.2f}%）", 22)

panel((40, 1760, 2060, 2185), "B · 侧视｜收起起落架的可见下包络；机鼻与顶视对齐")
side = place("side", (165, 1850))
s_top = side(VIEWS["side"]["anchors"]["HTOP"])
s_low = side(VIEWS["side"]["anchors"]["HLOW"])
dashed(215, 1860, s_low[1]-HEIGHT*SCALE, "#347ea1")
draw.line((s_low[0], s_top[1], s_low[0], s_low[1]), fill="#b34a3c", width=2)
dimension(side(VIEWS["side"]["anchors"]["N"])[0], side(VIEWS["side"]["anchors"]["AFT"])[0],
          2117, "26.9 m / 1614 px")
text(950, 1810, f"高度约 {metrics['side_height_m']:.3f} m；对2.94 m {metrics['side_height_difference_percent']:+.2f}%", 24)

panel((40, 2205, 2060, 2575), "C · 前视｜4 架 UAV 仍在；机体高度与挂载高度分开量")
front = place("front", (350, 2264))
f_top = front(VIEWS["front"]["anchors"]["HTOP"])
f_low = front(VIEWS["front"]["anchors"]["BODYLOW"])
u_low = front(VIEWS["front"]["anchors"]["UAVLOW"])
dashed(375, 1740, f_low[1]-HEIGHT*SCALE, "#347ea1")
draw.line((f_low[0], f_top[1], f_low[0], f_low[1]), fill="#b34a3c", width=2)
draw.ellipse((u_low[0]-4, u_low[1]-4, u_low[0]+4, u_low[1]+4), fill="#b17c2f")
dimension(front(VIEWS["front"]["anchors"]["WL"])[0], front(VIEWS["front"]["anchors"]["WR"])[0],
          2524, "22.17 m / 1330.2 px")

text(45, 2590, f"前视机体：{metrics['front_airframe_height_m']:.3f} m（{metrics['front_airframe_height_difference_percent']:+.2f}%）；含 UAV 下缘约 {metrics['front_with_uav_height_m']:.3f} m，原图仅差约 1 px。", 26)
text(45, 2634, "蓝虚线：以各自下包络为基准的 2.94 m 应有顶界；红线：扫描所见高度。保留差异，不硬调。", 25)
text(45, 2678, "端点读取 ±3 px／点；高度范围包含2.94 m，只说明与扫描精度相容，不是工程精度认证。", 25)
text(45, 2722, "原件不变。完整矩形裁片另存；板中沿空灰底裁去邻接视图残片，飞机边缘未修形。", 25)
text(45, 2766, "未生成独立分离机首三视；后部接口仍缺证。本文不是已完成线稿／镜头的验收。", 25)
text(45, 2810, "来源：官方出版物的 Artsee 镜像；保留扫描／印刷误差，不称官网网格导出。", 25)
text(45, 2860, "比例尺", 24)
draw.line((175, 2881, 475, 2881), fill="#18314b", width=4)
for n in range(6):
    x = 175+n*SCALE
    draw.line((x, 2871, x, 2891), fill="#18314b", width=2)
    text(x-5, 2898, str(n), 20)
text(495, 2868, "m", 24)
text(750, 2870, "源页 SHA-256：c3fecb60…657ea5d｜坐标与缩放详见 JSON", 23)

board_path = OUT / "x40-common-scale-reference.png"
board.save(board_path)
assert sha(SOURCE) == source_hash, "source changed"

data = {
    "schema_version": 1, "date": "2026-11-06", "aircraft": "X-40 Nightmare",
    "scope": "Source-derived common-scale reference board only; no original aircraft art or game mesh generated",
    "source": meta(SOURCE),
    "source_url": "https://qc.artsee.cc/images/350b75c9-6370-47d8-a03b-defc5ed1840c-00158.webp",
    "source_publication": "ACES at WAR: A HISTORY 2029, printed page 153",
    "host_page": "https://www.artsee.cc/collection/584", "official_host": False,
    "printed_dimensions_m": {"length": LENGTH, "span": SPAN, "height_gear_off": HEIGHT,
                             "height_parked": 4.13},
    "board_px_per_m": SCALE, "views": VIEWS, "metrics": metrics,
    "worst_case_endpoint_only_ranges_m": ranges,
    "height_check": {
        "side_includes_nominal_in_reading_range": ranges["side_height_m"][0] <= HEIGHT <= ranges["side_height_m"][1],
        "front_includes_nominal_in_reading_range": ranges["front_airframe_height_m"][0] <= HEIGHT <= ranges["front_airframe_height_m"][1],
        "side_datum": "canopy y2072 to visible lower aft envelope y2148; stores may overlap the side projection",
        "front_airframe_datum": "canopy y1961 to distinguishable main nacelle underside y2037",
        "front_uav_datum": "canopy y1961 to inner UAV underside y2038",
        "height_was_independent_check_not_calibration": True,
        "uncertainty_kind": "Worst-case source endpoint reading only; not statistical confidence or publication accuracy",
    },
    "operations": ["rectangular crop, original unaltered source retained",
                   "polygon crop only through empty grey gaps to exclude adjacent printed views",
                   "single scalar per view applied identically in x and y",
                   "review labels, dimension lines and height guides on separate board"],
    "not_performed": ["anisotropic stretch", "outline repaint", "perspective correction",
                      "hidden-geometry inference", "detached nose three-view reconstruction", "game mesh inspection"],
    "outputs": [meta(path) for path in sorted(OUT.glob("*.png"))],
    "original_source_sha256_after": sha(SOURCE),
    "result": "Common-scale source board usable with scan/height/stores limitations; not finished drawing approval",
}
payload = json.dumps(data, ensure_ascii=False, indent=2)+"\n"
(BASE / "X40_SCALE_REVIEW.json").write_text(payload, encoding="utf-8")
(OUT / "x40-scale-review.json").write_text(payload, encoding="utf-8")

index_path = BASE / "X40_GEOMETRY_SOURCES.json"
index = json.loads(index_path.read_text(encoding="utf-8"))
index["common_scale_review"] = {
    "script": "tools/review_x40_scale.py", "data": meta(BASE / "X40_SCALE_REVIEW.json"),
    "board": meta(board_path), "pixels_per_m": SCALE, "geometry_redrawn": False,
    "side_height_m": metrics["side_height_m"],
    "front_airframe_height_m": metrics["front_airframe_height_m"],
    "front_with_uav_height_m": metrics["front_with_uav_height_m"],
    "assessment": "Source-proportions checked; preserve small discrepancies and hanging-UAV datum; no forced-fit changes",
}
index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
print(json.dumps({"board": str(board_path), "metrics": metrics, "ranges": ranges,
                  "source_unchanged": sha(SOURCE) == source_hash}, ensure_ascii=False, indent=2))

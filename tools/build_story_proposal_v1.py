"""Build the untimed lyric-to-story map; never mutate source lyrics or audio."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]

# Semantic blocks, not shots or measured music intervals.
BLOCKS = [
    ("B01", 1, 1, "那颗星留下来了", "紫金长尾星与纸面桥形笔迹先被看清；Astra展开画页，DeepSeek拿蓝笔探头。", "来自第一企划的紫金星形状、双色与尾巴均保留。"),
    ("B02", 2, 4, "邀请与点亮", "DeepSeek画歪圈并伸手；Astra主动握住，补上紫线。两笔接合让星开始打拍子，两人举手换步。", "鲸尾与龙尾交叉一下，随后回到并排基准位。"),
    ("I01", None, None, "片名间奏", "巨大片名占前景，两位从字缝继续跳；紫金星在上方。", "安排于原曲已有片名间奏，位置待对时，不延长音源。"),
    ("B03", 5, 6, "跳到睡不着", "蓝紫脚印生成轨道，DeepSeek换步，Astra加更大的反向弧。", "枕头旁本该催眠的小星全在跳，Q版坐起来跟跳。"),
    ("B04", 7, 8, "亮度竞赛没人看", "一排星举亮度牌抢镜；两位只盯对方舞步，隔着星群牵上手。", "落选的星自行排成伴舞队。"),
    ("B05", 9, 10, "纸校舍背后", "巨字折成校舍纸布景，两人从两侧探头，忽然凑近。", "纸布景拍扁收回；不虚构两位的真实校园前史。"),
    ("B06", 11, 12, "冥王星晚了半拍", "冥王星举着夸张纸环抢镜，错过两人转身。", "留在边角学跳舞，埋下片尾回收。"),
    ("B07", 13, 15, "无口也会跳大一点", "星群绕跳，胸前光点弹动；Astra停半拍，接一个更夸张的全身姿态。", "脸保持平直嘴形；拉开视野看见轨道生长。"),
    ("B08", 16, 19, "一起跳也是一起画", "旧星成为中心，蓝紫新轨道随双人舞生长；手和脚的接点炸开线条。", "保持固定双人台，完成第一轮完整副歌。"),
    ("B09", 20, 24, "寄给旁边的宇宙快递", "四角Q版拍手；DeepSeek鲸尾抛星绕出画框，远行后落进旁边Astra手里。", "Astra把星按到地面，全场分身整齐换姿。"),
    ("B10", 25, 27, "文字墙搬家", "拟声字逐层堆高，Q版抬整行字走；中央两位随歪字歪头。", "纸猫耳仅作可撤道具；段末清空文字。"),
    ("B11", 28, 31, "Astra翻转舞台", "DeepSeek画离谱步点，Astra直接转动画页半圈；两人倒置继续跳，再拨转歪环。", "倒置、传送带、星环依次出现；每次只读一个主要笑点。"),
    ("B12", 32, 33, "笔尖接一句话", "大片留白，两人坐在未接好的曲线；DeepSeek欲言，Astra用笔尖接住她的线。", "短暂放轻动作，感情通过对视与落笔表达。"),
    ("B13", 34, 35, "把黑幕卷起来", "Q版抬黑纸幕和爆炸星上台；两位各抓一边，把纸幕卷成新轨道。", "只保留双人卷纸这个中心动作。"),
    ("B14", 36, 38, "一起编出轨道麻花", "她们边走边各添一弯，蓝紫线逐步拧成麻花。", "两人都认真继续跳，为弹开事故提供可见原因。"),
    ("B15", 39, 40, "被弹到画框两端", "轨道展开，把双人弹向相反方向；巨字令同一舞台看起来格外遥远。", "紫金星仍正常发光；这只是短促的舞台事故。"),
    ("B16", 41, 42, "伸手就接得上", "Astra先跨出轨道伸手，DeepSeek蹬回迎上；巨字开缝，双手确实握住。", "两笔带线接成桥，将二人弹回基准舞姿。"),
    ("B17", 43, 44, "把大尾巴也接住", "新桥铺成舞路，DeepSeek携鲸尾扑来，Astra稳稳接住，再回并排。", "想要全部对应接住对方的动势和画法。"),
    ("B18", 45, 46, "同行的笔迹", "两位沿舞路交替添转弯、回环和歪折角，画面逐渐拉开。", "两种颜色的贡献与互相等待都可见；这里只画舞路，未开始最终新星轮廓。"),
    ("B19", 47, 48, "又一次邀请", "旧紫金星照着新舞路，换由Astra主动递手，DeepSeek搭上。", "开头的邀请回到同一组举手位，但两位轮换发起者。"),
    ("B20", 49, 49, "八颗行星印章", "水金地火木土天海按歌词依次弹出，Q版忙着搬，主角继续基准舞。", "歪环归土星，冥王星留在八颗之外跟跳。"),
    ("B21", 50, 50, "银河是两个人画的", "拉开蓝紫新银河，旧紫金星留在中心，双人举手定姿。", "此处展示轨道成果，最终长尾新星尚未画成。"),
    ("B22", 51, 55, "把线头送回来", "Q版重复抛星拍手钻字；这一轮所有线头都向两位手里的笔汇聚。", "重复动作发生叙事变化，为共画腾出中央空间。"),
    ("B23", 56, 56, "从舞路回到纸面", "最后拟声段前半继续基准舞，纸面与两笔进入近景。", "减少背景运动，准备让观众看清交替落笔。"),
    ("B24", 57, 57, "开始共画新星", "在末轮拟声段后半开始：DeepSeek蓝笔起歪角，Astra紫笔接上，两人交替补轮廓。", "B24与B25的六次动作跨句分配，准确词界须先对时。"),
    ("B25", 58, 58, "Astra添了意料外的一弯", "共同闭合星形后，DeepSeek添蓝弯尾；Astra在尾端再添紫色小弯，收笔。", "DeepSeek看新弯再看Astra，开心接受，两位摆回招牌舞姿。"),
    ("I02", None, None, "已有尾声内看清结果", "旧紫金星在上、新紫蓝星在下，两笔同纸；Q版收字，冥王星晚半拍举手。", "尾声只展示已完成结果，不承担绘星六动作或增加音源长度。"),
]

LINE_ACTIONS = [
    "近看上一部紫金长尾星，Astra展开有桥形笔迹的画页，DeepSeek持蓝笔探头。",
    "DeepSeek画歪圈、伸手邀请；Astra握住她。",
    "Astra补紫线，两线接点让紫金星开始打拍子。",
    "两人交错步、交错尾巴，突然切回举手姿势。",
    "DeepSeek临时换舞步，Astra沿她脚印主动加大反向弧。",
    "枕头旁的小星全在跳，Q版起身加入，睡意被舞步赶跑。",
    "一群星举亮度牌争相入镜。",
    "两位仍看彼此脚步，Astra隔着星群接住DeepSeek的手。",
    "歌词巨字折成纸校舍，DeepSeek绕后探头。",
    "Astra从另一侧同时探出，两张固定表情凑近，纸景折回。",
    "冥王星举纸环经过，努力赶上节奏。",
    "二人转身相向，冥王星错过拍点，留在边角跟跳。",
    "星群开始绕双人旋转，地面脚印也浮起。",
    "胸前光点弹动，DeepSeek放大动作，Astra短停后回应。",
    "Astra作更夸张的全身姿态，视野拉开看见长出的轨道。",
    "上一部紫金星悬在新舞池中心发光。",
    "二人回到基准位，相向举手换步。",
    "脚下蓝紫轨道把步点连成旋转的小系统。",
    "手与脚接上，蓝紫线向边框炸开，明确舞蹈也在共画。",
    "四角两位的Q版分身突然入场，整齐拍手。",
    "Q版把散星接成传递线路。",
    "DeepSeek用鲸尾弹出一颗待送的小星。",
    "星钻出画框、绕边缘远行，又从另一边回来。",
    "星落到近旁Astra手里，她按下星按钮，全场换姿。",
    "拟声字开始堆墙，Q版尝试抬动大字。",
    "抬歪的字令双人一同歪头；Q版可短举纸猫耳牌。",
    "整行文字被抬走，为下一段留出清空的一拍。",
    "DeepSeek依星光画出一串离谱脚印。",
    "Astra转动画页半圈，两人头朝下继续跳。",
    "轨道成传送带，两位在巨大字母路障间大步换向。",
    "DeepSeek套歪环，Astra龙尾拨动；环开始自转。",
    "舞台暂时留白，两人漂在未接合的曲线上。",
    "DeepSeek望向Astra欲言，Astra以笔尖接线回应，两人转一小圈。",
    "Q版搬来黑纸幕与夸张爆炸星道具。",
    "双人各抓纸幕一边，踩拍把它卷成新轨道。",
    "没有额外道具也继续跳，DeepSeek在空处添一弯。",
    "Astra接上一弯，两人走着便把线继续接下去。",
    "蓝紫轨道已编成麻花，两位尚未察觉，照常摆手。",
    "麻花弹开，二人被送向画框两端，旧星仍明亮。",
    "巨字横在两人之间，把同一舞台夸成遥远彼岸。",
    "Astra先跨出自己的轨道，DeepSeek也蹬回迎上。",
    "字开一缝，双手握住，两笔接线成桥，二人被弹回舞池。",
    "新桥变舞路，两位把一路留下的笔迹带进下一轮舞。",
    "DeepSeek连鲸尾扑来，Astra接住，再各自站稳并排。",
    "Astra添转弯，DeepSeek接回环，沿同一舞路前进。",
    "DeepSeek把舞路添成歪折角，Astra顺势续线，双人笔迹并行；不在此处画星。",
    "看见旧紫金星仍在上方，照着扩大的蓝紫新画面。",
    "Astra递手再次邀请，DeepSeek搭上，双人回基准舞。",
    "水金地火木土天海八印章依次弹出；歪环回土星，冥王星在外沿。",
    "展现两人共画的蓝紫银河与中心紫金星，最后的新星尚待完成。",
    "四角Q版再次弹出，复用呼喊段动作。",
    "散线从舞台四角被传递到中央。",
    "DeepSeek接住送来的蓝线头，Astra接住紫线头。",
    "Q版把最后远处的线头沿画框送回。",
    "所有线最终连向中央两笔，周边开始让出空间。",
    "拟声段前半继续跳，随后切纸面与两笔近景，准备交替落笔。",
    "在这轮拟声段后半开始共画：DeepSeek蓝角起笔，Astra紫角续接，轮流补轮廓。",
    "延续交替动作并闭合星形；DeepSeek添蓝弯尾，Astra添意料外紫小弯，相视后恢复举手位。",
]


def main():
    lyrics_path = ROOT / "lyrics/lyrics.json"
    lyrics_bytes = lyrics_path.read_bytes()
    lyrics = json.loads(lyrics_bytes)
    raw = (ROOT / lyrics["source_text_file"]).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == lyrics["source_text_sha256"]
    entries = lyrics["entries"]
    assert len(entries) == len(LINE_ACTIONS) == 58
    scenes = []
    mapping = {}
    for scene_id, first, last, title, action, gag in BLOCKS:
        ids = [f"L{i:03d}" for i in range(first, last + 1)] if first else []
        for lyric_id in ids:
            assert lyric_id not in mapping, f"Duplicate lyric {lyric_id}"
            mapping[lyric_id] = scene_id
        scenes.append({
            "id": scene_id, "title": title, "lyric_ids": ids,
            "start": None, "end": None, "timing_status": "unassigned",
            "action": action, "staging_or_payoff": gag,
        })
    assert list(mapping) == [e["id"] for e in entries]
    lyric_map = [{"lyric_id": e["id"], "scene_id": mapping[e["id"]],
                  "action": action, "start": None, "end": None}
                 for e, action in zip(entries, LINE_ACTIONS)]
    result = {
        "version": 1, "status": "semantic_story_proposal_not_rendered",
        "title": "把那颗星跳成太阳系", "date": "2026-11-07",
        "duration_seconds": 203.2, "duration_is": "provided_audio_duration_not_a_timed_storyboard",
        "lyrics_source": "lyrics/lyrics.json",
        "lyrics_json_sha256": hashlib.sha256(lyrics_bytes).hexdigest(),
        "lyrics_text_sha256": lyrics["source_text_sha256"],
        "casting": {"DeepSeek": "┏(ᗜvᗜ)┛", "Astra": "┏(ᗜ-ᗜ)┛"},
        "art_direction": {
            "user_requirement": "整体色调与原MV接近",
            "base": "Coral red background, white/near-white flat figures, black heavy typography and fine dark outlines",
            "reference_background_sample": "#FD5354 (approximate transcoded/JPEG frame sample, not original author palette)",
            "accents": "Astra purple, DeepSeek blue and legacy star gold restricted to local details and drawn marks; drawing closeups may enlarge them",
            "stage": "Paper, school prop and galaxy remain within the coral-red flat stage language",
            "specification": "docs/CASTING.md",
            "drawing_style": "Preserve v4 reference-aligned hair silhouettes, flat white figures, hollow eyes and stiff bodies; v5 adds visibly unclosed contours, interrupted fine lines and imperfect stroke joins. No isolated dash between ds eyes.",
            "trial_image": "art/style-tests/astra-ds-mv-style-v5.png",
            "user_feedback": "v1 too refined; v2 lost identity; v3 hairstyles wrong and stray inter-eye line; v4 received 'about right' for shape; v5 requested open-contour roughness and awaits review",
            "preferred_character_name": {"DeepSeek": "ds"},
            "status": "static_character_style_trial_generated_pending_user_review_no_animation",
        },
        "continuity": {
            "legacy_star": "First project final purple/gold hollow long-tail star; Astra + USER",
            "new_marks": "Astra purple + DeepSeek blue; old gold remains gold",
            "new_star": "Final na-na section shows alternating drawing, then blue tail and Astra purple extra bend",
        },
        "timing_note": "All lyric and scene times remain null. B24/B25 share the six-action drawing sequence; exact allocation awaits listening/alignment. I01/I02 use existing musical space only.",
        "scenes": scenes, "lyric_map": lyric_map,
    }
    out = ROOT / "storyboard/story-proposal-v1.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# 全曲逐歌词情节表 v1", "",
        "2026-11-07。与[完整剧情](STORY_PROPOSAL_V1.md)配套；25个有词叙事单元与2个间奏／尾声单元，覆盖L001–L058。单元不是镜头数量。", "",
        "这是按歌词语义安排的剧情，全部起止时码仍为null；不代表已经耳听对时。B24–B25共同承载末轮拟声段的六次落笔，实际跨句位置待对时后分配。间奏和尾声不增加203.2秒原音源长度。", "",
        "日文、中文逐字取自用户提供的歌词JSON；本表的表演解释不修改原文或译文。", "",
        "## 叙事单元", "",
        "| 单元 | 歌词 | 情节 | 调度与笑点回收 |", "|---|---|---|---|",
    ]
    for scene in scenes:
        ids = scene["lyric_ids"]
        label = (ids[0] if len(ids) == 1 else f"{ids[0]}–{ids[-1]}") if ids else "原曲既有无词位置，待对时"
        lines.append(f'| {scene["id"]} {scene["title"]} | {label} | {scene["action"]} | {scene["staging_or_payoff"]} |')
    lines += ["", "## 58组逐句映射", "", "| ID／单元 | 用户日文原文 | 用户中文原文 | 本片动作 |", "|---|---|---|---|"]
    for e, m in zip(entries, lyric_map):
        # Source punctuation is kept; only escape a Markdown table delimiter if present.
        fields = [f'{e["id"]}／{m["scene_id"]}', e["ja"], e["zh"], m["action"]]
        lines.append("| " + " | ".join(s.replace("|", "\\|") for s in fields) + " |")
    lines += ["", "结构化稿：[story-proposal-v1.json](../storyboard/story-proposal-v1.json)。重建：`python tools/build_story_proposal_v1.py`。源歌词、FLAC、第一企划归档均不由此脚本改动。", ""]
    (ROOT / "docs/LYRIC_SCENES_V1.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"lyric_pairs": len(lyric_map), "semantic_blocks": len(scenes),
                      "timed_blocks": 0, "output": str(out)}, ensure_ascii=False))


if __name__ == "__main__":
    main()

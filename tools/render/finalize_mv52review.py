"""Collect already verified review outputs; never render or modify source media."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'exports/preview-v52-combination'
DATA = ROOT / 'data/production-v52review'
DOCS = ROOT / 'docs/production-v52'

def read(path):
    return json.loads(path.read_text(encoding='utf-8'))

def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

verification = read(OUT / 'verification-summary.json')
overview = read(OUT / 'overview-verification.json')
wave = read(OUT / 'wave-429-runtime.json')
visual = read(ROOT / 'exports/review-v52/combination-encoded-sample-review.json')
encoded = read(OUT / 'encoded-stills/index.json')['records']
candidate_map = read(DATA / 'candidate-map.json')
manifest = read(DATA / 'manifest.json')
plan = read(DATA / 'clip-plan.json')
assert verification['passed'] and verification['all_five_present']
assert overview['passed'] and overview['silent'] and overview['frames'] == 1425
assert wave['passed'] and len(wave['rows']) == 429
assert visual['passed_sample_review'] and len(encoded) == 21
assert candidate_map['review_map_ready'] and candidate_map['final_map_confirmed']
assert not candidate_map['blocked_clip_ids']
assert [x['id'] for x in verification['items']] == [x['id'] for x in plan['clips']]

clips = []
for item in verification['items']:
    path = Path(item['file'])
    assert path.is_file() and sha(path) == item['sha256']
    assert path.stat().st_size == item['bytes']
    record = {k: item[k] for k in ('id', 'shots', 'start_frame', 'end_frame_exclusive', 'frames', 'body_start', 'body_end', 'audio_full_start', 'duration', 'reel_start_frame', 'reel_end_frame_exclusive', 'sha256', 'bytes')}
    record.update(file=path.relative_to(ROOT).as_posix(), absolute_file=path.as_posix(), verification_passed=True,
                  verification=f"exports/preview-v52-combination/verification/{item['id']}-verification.json",
                  decoded_audio_endpoint_minus_video_ms=item['decoded_audio_endpoint_minus_video_ms'],
                  encoded_still_count=sum(x['clip'] == item['id'] for x in encoded))
    clips.append(record)
assert sha(Path(overview['file'])) == overview['sha256']
for item in verification['protected_sources']:
    assert sha(ROOT / item['path']) == item['expected'] == item['after'], item['path']
for item in encoded:
    assert sha(Path(item['file'])) == item['sha256'], item['file']
assets = []
for slot, item in candidate_map['assets'].items():
    if not item['enabled']:
        continue
    target = manifest['assets'][slot]
    assert target['path'] == '/' + item['path']
    digest = sha(ROOT / item['path'])
    assert digest == target['sha256']
    assets.append(dict(slot=slot, path=item['path'], sha256=digest, anchors=item['anchors'], face=item.get('face'),
                       source_size=[target['source_width'], target['source_height']], bounds=target['bounds']))
assert len(assets) == 12
core = ['lighting.js', 'early.js', 'middle.js', 'late.js', 'kit.js', 'neural.js', 'spatial-neural.js']
assert all(sha(ROOT / 'src/mv52review' / name) == sha(ROOT / 'src/mv52' / name) for name in core)
extra_hash = sha(ROOT / 'src/mv52review/extra-light.js')
assert extra_hash == '0202e43e3037f21e71bd61f3cc4bf6df895f0063808921e06c177d6b8a454cec'

evidence_paths = [OUT / name for name in ('verification-summary.json', 'overview-verification.json', 'wave-429-runtime.json', 'encoded-stills/index.json')]
evidence_paths.append(ROOT / 'exports/review-v52/combination-encoded-sample-review.json')
source_paths = list((ROOT / 'src/mv52review').glob('*')) + [DATA / 'candidate-map.json', DATA / 'manifest.json', DATA / 'clip-plan.json']
delivery = dict(
    schema_version=1, completed_at_utc=datetime.now(timezone.utc).isoformat(), status='review_delivery_complete_user_acceptance_pending',
    review_only=True, production_integrated=False, user_approved=False, root_review_map_ready=True,
    width=3840, height=2160, fps=60, warning_included=False,
    time_basis=plan['time_basis'], audio_encoding_count=0,
    source_audio=verification['source_audio'], source_audio_sha256=verification['source_audio_sha256'],
    clips=clips, combined_frames=1425, combined_duration_seconds=23.75,
    overview={**overview, 'file': Path(overview['file']).relative_to(ROOT).as_posix(), 'absolute_file': Path(overview['file']).as_posix()},
    audio_validation=dict(all_packets_unchanged=True, exact_offset='body_start + 5 seconds', decoded_pcm_starts_at_zero=True,
        distributed_windows=15, all_measured_window_lags_samples=0, maximum_aac_packet_ms=1024/48000*1000,
        endpoint_note='Packet-copy tails extend beyond video by 0 to 18.667 ms; no claim of sample-exact end trimming. Ending windows are very quiet; packet identity and timing are the primary evidence.'),
    visual_validation=dict(encoded_samples=21, all_encoded_samples_actually_viewed=True, all_video_frames_manually_viewed=False,
        independent_review='exports/review-v52/combination-encoded-sample-review.json',
        scope='Source anchors and phase-level native 4K stills, plus 21 encoded samples. Not a certification of every small projected knot or final user approval.'),
    waveform_validation=dict(passed=True, frames=429, phase_counts=wave['phaseCounts'], source_path=wave['sourcePath'], source_sha256=wave['sourceSha256'],
        single_stroke_all=all(x['singleStroke'] for x in wave['rows']), max_start_gap=max(x['startGap'] for x in wave['rows']), max_hand_gap=max(x['handGap'] for x in wave['rows'])),
    selected_candidates=assets,
    alpha_repair=dict(slot='A07_02', final_path=candidate_map['assets']['A07_02']['path'], native_fixed_stills=candidate_map['alpha_repair_runtime_checked']['stills'],
        superseded_bad_still='exports/preview-v52-combination/stills-candidates/source-132.500.png', result='External black alpha islands removed; fixed native and encoded samples inspected.'),
    isolation=dict(protected_file_count=len(verification['protected_sources']), all_protected_hashes_rechecked=True, baseline_core_byte_identical=core,
        review_extra_light_sha256=extra_hash, extra_light_inactive_in_these_five_clips=True, protected_sources=verification['protected_sources']),
    current_review_input_sha256={p.relative_to(ROOT).as_posix():sha(p) for p in source_paths if p.is_file()},
    evidence_sha256={p.relative_to(ROOT).as_posix():sha(p) for p in evidence_paths},
    report='docs/production-v52/COMBINATION_REVIEW_DELIVERY.md')
write(OUT / 'delivery.json', delivery)
previous = OUT / 'clip-delivery.json'
if previous.exists() and not (OUT / 'clip-delivery-last-render-batch.json').exists():
    (OUT / 'clip-delivery-last-render-batch.json').write_bytes(previous.read_bytes())
write(previous, delivery)

setup = read(DATA / 'setup-validation.json')
setup.update(report_scope='Historical initial setup evidence only; final state is superseded by delivery.json',
             superseded_by='exports/preview-v52-combination/delivery.json')
write(DATA / 'setup-validation.json', setup)
prepare = read(DATA / 'prepare-report.json')
prepare.pop('render_started', None)
prepare.update(report_scope='Manifest preparation only; current export status is in exports/preview-v52-combination/delivery.json', render_performed_by_this_script=False)
write(DATA / 'prepare-report.json', prepare)

names = {'01-boundary':'边界三态', '02-waveform':'波形接线', '03-refusal-book':'受阻三态与翻书', '04-wrist':'握腕', '05-ending-expression':'结尾表情'}
rows = ['| 试片 | 正文区间（秒） | 原 AAC 起点（秒） | 视频帧数 / 时长 | AAC 解码尾部超长 |', '|---|---:|---:|---:|---:|']
for x in clips:
    href = '../../' + x['file']
    rows.append(f"| [{names[x['id']]}]({href}) | {x['body_start']:.6f}–{x['body_end']:.6f} | {x['audio_full_start']:.6f} | {x['frames']} / {x['duration']:.6f}s | +{x['decoded_audio_endpoint_minus_video_ms']:.3f} ms |")
asset_rows = ['| 角色槽位 | 选用原画 |', '|---|---|']
for x in assets:
    asset_rows.append(f"| {x['slot']} | [{Path(x['path']).name}](../../{x['path']}) |")
doc = '''# 独立组合试片交付

2026-11-06：五段 4K60 AAC 试片及 23.75 秒静音总览已完成。仅用于用户审核；本报告不代表用户认可候选原画，也未接入正式成片。当前状态以 [delivery.json](../../exports/preview-v52-combination/delivery.json) 为准，早期 setup-validation.json 保留为历史准备证据。

## 播放文件与时间基准

渲染使用正文时间，不含片头 5 秒 warning。取旧 v5 播放版的 AAC 时间为 **正文时间 + 5 秒**。每段试片从本地 0 秒开始；下表区间右端不包含。五段均为 3840×2160、60 fps，含原 AAC 包复制音轨，没有音乐重编码。

''' + '\n'.join(rows) + '''

[静音视觉总览](../../exports/preview-v52-combination/combined-artwork-review-4k60-SILENT.mp4) 为 1,425 帧 / 23.75 秒，**无音轨**。接点为总览第 194、623、1191、1245 帧，即 3.233333、10.383333、19.850000、20.750000 秒。按视频帧时长拼接且视频包原样复制，不使用含 AAC 预滚和包尾的容器时长累计接点。听音乐请播放上面五段独立试片。R74 保留原镜头 0.9 秒；R86 选正文 208–211 秒的回应和表情部分。

## 实际验证

- 五段所有视频帧与音轨完整解码；视频 PTS 均为 n/60，DTS 严格递增，分片视频包与对应无音轨渲染逐包一致。
- AAC 包为原音源中连续、字节不变的序列，逐包时间偏移精确等于正文起点 + 5 秒。MP4 skip/edit 信息处理负 PTS 预滚，实际解码 PCM 首点为 0，后续连续。保留的 AAC 包尾使部分音轨比视频长，具体数值见表，均小于 1 包（21.333333 ms）；不宣称尾部逐样本裁切。
- 15 个分布音频窗口的测得延迟均为 0 样本。结尾三窗音量极低，同步主要由包身份与时间戳证明，不能把低音量相关性当作听感证明。
- 静音总览完整解码为 1,425 帧；无音轨，所有视频包、逐段时间偏移和四个接点均验证通过。
- 新 A04_02 手掌锚点为原图 [263,511]，未继承旧 [188,565]。使用当前候选重跑整个 429 帧波形段：三阶段 138/171/120 帧，singleStroke 全为真，起点和手端 gap 均为 0，切换相邻帧也有编码抽帧。
- 已实看各动作阶段的原生 4K still，以及 [21 张编码后抽帧](../../exports/preview-v52-combination/encoded-stills/index.json)。review_bundle 另行逐张复核并记录 [独立抽样意见](../../exports/review-v52/combination-encoded-sample-review.json)。掌心/袖口接线、书页接点、握腕线与结尾裁切未见新增明显错位。此为抽样视觉检查，不是逐帧人工观看或小尺寸透视结饰的全面认证。

完整证据：[分片验证](../../exports/preview-v52-combination/verification-summary.json)、[总览验证](../../exports/preview-v52-combination/overview-verification.json)、[429 帧波形运行记录](../../exports/preview-v52-combination/wave-429-runtime.json)。

## 候选原画与锚点

12 个候选槽位已在独立 [candidate-map.json](../../data/production-v52review/candidate-map.json) 启用；`final_map_confirmed=true` / `review_map_ready=true` 仅表示 root 已选定本次审核映射。每张图重新测量手、腕、书页或面部区域，记录在 map、manifest 和 delivery 中。map 内早期“runtime crop check pending”文字属于测量时备注；最终运行与抽帧结果以本报告为准。

''' + '\n'.join(asset_rows) + '''

A07_02 的 v4 候选曾在合成中出现背景 alpha 黑碎块，已由内置 imagegen 提取透明背景得到 v5-alpha，再重新测量与导出。修复后 [132.5 秒](../../exports/preview-v52-combination/stills-alpha-fixed/source-132.500.png)、[133.4 秒](../../exports/preview-v52-combination/stills-alpha-fixed/source-133.400.png) 原生合成及最终编码样本均已实看，外部黑碎块消失。`stills-candidates/source-132.500.png` 是保留的旧错误证据，不能当作最终结果。旧原画保持历史原字节。

## 隔离与保留

独立入口为 `src/mv52review/index.html`，仅载入独立审核 manifest。原 `src/mv52`、`src/mv5cat` 与生产 manifest 共 20 个文件，以及 3 个受保护媒体均重新核对原 hash，一致。审核目录中的 lighting、early、middle、late、kit、neural、spatial-neural 七个基线模块与 mv52 字节相同。

独立 extra-light 模块 hash 为 `0202e43e3037f21e71bd61f3cc4bf6df895f0063808921e06c177d6b8a454cec`，本次五段均不触发新增效果。额外弱镜试片由 review_bundle 在 `exports/preview-v52-extra-light/` 独立交付，不能用本五段替代其动态审核。

正式 v5.1 成片 SHA256 保持 `19f4a76abfc61c1990d056d018e164ec61e93d147af1436f244cfa57261b7407`。未覆盖原 PNG、正式 manifest、正式 renderer、正式音轨或正式视频。

工具链为 `prepare_mv52review.py`、`render_mv52review.mjs`、`verify_mv52review.py`、`assemble_mv52review.py`、`verify_mv52review_overview.py`、`extract_mv52review_encoded.py`、`finalize_mv52review.py`。渲染与验证为独立步骤；最终交付 metadata 由 finalize 汇总。既有 AAC 源含 UDTA metadata 解析 fallback 提示，但全量媒体解码与实际音频呈现检查均通过。localhost 审核服务器需按需启动，不以曾记录的进程号证明它当前在线。
'''
(DOCS / 'COMBINATION_REVIEW_DELIVERY.md').write_text(doc, encoding='utf-8')
old_setup = DOCS / 'COMBINATION_REVIEW_SETUP.md'
archive = DOCS / 'COMBINATION_REVIEW_SETUP_INITIAL.md'
if not archive.exists():
    archive.write_text('# 历史准备阶段记录（已被最终交付报告取代）\n\n下列 false、未导出及 pending 描述仅对应最初准备阶段，不代表当前状态。最终状态见 [COMBINATION_REVIEW_DELIVERY.md](COMBINATION_REVIEW_DELIVERY.md)。\n\n' + old_setup.read_text(encoding='utf-8'), encoding='utf-8')
old_setup.write_text('''# 独立组合试片入口

2026-11-06：当前阶段已完成五段 4K60 AAC 试片和 1,425 帧 / 23.75 秒静音总览。请以 [交付报告](COMBINATION_REVIEW_DELIVERY.md) 与 [delivery.json](../../exports/preview-v52-combination/delivery.json) 为准。

独立 renderer：`src/mv52review/index.html`。独立映射：`data/production-v52review/candidate-map.json`；12 个候选已启用，`review_map_ready=true`。这些状态仅表示用于本次审核，不代表用户认可或正式接入。

正文时间不含 5 秒 warning；旧播放版 AAC 起点 = 正文起点 + 5 秒。五段均已完整解码和 packet/PTS 验证；静音总览接点固定于视频第 194/623/1191/1245 帧。原正式来源 hash 不变。

初始三张 still、false map 和“尚无视频”准备阶段原文保留于 [历史 setup](COMBINATION_REVIEW_SETUP_INITIAL.md)。`setup-validation.json` 同样是历史初始证据，不能用于判断当前交付状态。

工具：prepare 构建独立 manifest；render 默认 dry-run，`--render --clip <id>` 才执行；verify 独立验证；assemble 复制视频包生成静音总览；finalize 汇总已验证输出。已有媒体拒绝覆盖。启动 `node tools/render/serve_mv52review.mjs` 后，可访问 `http://127.0.0.1:8768/src/mv52review/index.html?lighting=1`，服务器是否在线应实时检查。
''', encoding='utf-8')
print(json.dumps(dict(passed=True, clips=len(clips), frames=sum(x['frames'] for x in clips), overview_silent=True, assets=len(assets), protected=len(verification['protected_sources']), encoded_samples=len(encoded), delivery=str(OUT / 'delivery.json'), report=str(DOCS / 'COMBINATION_REVIEW_DELIVERY.md')), ensure_ascii=False))

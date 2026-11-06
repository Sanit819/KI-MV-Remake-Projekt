# 历史准备阶段记录（已被最终交付报告取代）

下列 false、未导出及 pending 描述仅对应最初准备阶段，不代表当前状态。最终状态见 [COMBINATION_REVIEW_DELIVERY.md](COMBINATION_REVIEW_DELIVERY.md)。

# Independent combination review setup

2026-11-06. This is preparation for user review, not production integration or a completed video delivery.

The independent entry is `src/mv52review/index.html`. It copies the current `src/mv52` renderer. The original lighting, scene timing, camera and continuous waveform connector remain unchanged. `art.js` loads `data/production-v52review/manifest.json`; the page title identifies review/body time. A separate `extra-light.js`, prepared by review_bundle at root's instruction, is called only in this review copy after the existing lighting pass and before subtitles. It can be disabled with `extraLight=0`; it is inactive for all five planned combination clips.

Local read-only server: `http://127.0.0.1:8768/src/mv52review/index.html?lighting=1`. Server process ID/logs are under `exports/preview-v52-combination/`. The server binds only to localhost and supports AAC source byte ranges. It does not modify served content.

## Candidate mapping and anchors

`data/production-v52review/candidate-map.json` is the editable review plan. `final_map_confirmed` is currently **false**. Only the three root-specified replacements are provisionally enabled:

| Slot | Candidate | Newly measured coordinates |
|---|---|---|
| A04_02 | v18-wave-hand-review/A04-02-wave-receive-v5.png | hands = [263,511] palm center; wrist = [296,558]; chest = [646,615]; optional fingertip = [211,416] |
| A08_01 | v13-book-review/A08-01-seated-turn-v5.png | hands = [620,632] page-turn contact; wrist = [704,658]; record = [575,723] visible page |
| A08_02 | v13-book-review/A08-02-seated-record-v5.png | hands = [556,693] pointing fingertip; wrist = [676,628]; record = [556,701] page beneath fingertip |

All enabled anchor pixels were checked against visible source alpha >= 128 and visually reviewed on annotated diagnostic copies. No final source PNG was edited. The old A04 hands [188,565] is not reused.

`surprise` and `sitSmile` are the actual ending slot names. Both proposed v17 v2 candidates have a newly measured face box {x:355,y:320,w:590,h:610}, including eyes/mouth/chin and partial bangs/collar. The same framing avoids an expression-cut crop jump. The source face crops were visually inspected, but these replacements are not enabled until root's final map. Their old hands/pen anchors are not inherited.

A02, A07 and recoil candidate paths are recorded but disabled and unmeasured. A02_02 remains unspecified; pending contact-v5 is not used. Their source-specific anchors must be measured when the final map arrives. No candidate is implied to have user approval.

## Planned clips and time basis

Render time is **body time**, excluding the 5-second warning. Existing AAC source time = body time + 5 seconds. The review clips contain no warning. Combined reel time is a third, concatenated time basis; exact offsets are saved in `clip-plan.json`.

| Clip | Body interval | Frames |
|---|---|---|
| R23 boundary | [69.950,73.183333) | [4197,4391), 194 |
| R40–43 waveform | [103.650,110.800) | [6219,6648), 429 |
| R53–55 refusal/book | [131.100,140.566667) | [7866,8434), 568 |
| R74 wrist | [168.833333,169.733333) | [10130,10184), 54 |
| R86 reply/expressions | [208.000,211.000) | [12480,12660), 180 |

Plan total: 1,425 frames / 23.75 seconds at 3840×2160 / 60 fps. R74 is its exact native 0.9-second shot. R86 is the reply/recognition portion rather than its whole co-drawing coda. Root may revise ranges before final map.

## Tools and actual validation

1. `python tools/render/prepare_mv52review.py` checks protected hashes, measures alpha bounds, builds the isolated manifest and clip plan. It never edits production sources.
2. `node tools/render/render_mv52review.mjs` prints a dry run. `--render` is blocked while the final map is false. Later, `--clip <id>` can render one planned clip. The runner generates silent 4K60 video, copies AAC packets from the existing v5 playback movie, and invokes independent decode/PTS/audio verification. It does not encode music.
3. `tools/render/export_mv52review.mjs` is an independent exporter. It allows still QA before the final map, limits each video segment to 12 seconds, requires silent rendering, and refuses existing video outputs or output locations outside the review directory.
4. `tools/render/serve_mv52review.mjs` is the localhost review server.

Actual runtime check completed: three native 4K stills at body 108.0, 137.6 and 139.5 seconds, saved in `exports/preview-v52-combination/stills-initial/` with scene audit JSON. First sandboxed headless Edge launch failed due to Windows named-pipe restrictions. The approved independent headless run outside the sandbox succeeded. No existing browser was controlled.

At body 108.0 (R42/A04_02), the yellow connector ends at transformed palm [1059.8405253,369.1857411] in the 1920×1080 logical scene, with singleStroke=true, startGap=0 and handGap=0. The source hand and endpoint were visually checked in the rendered 4K still. Book phase 1/2 source art and star/page placement were also visually checked. Extra-light audit was inactive with zero paths/nodes/particles for all three stills.

Source isolation is recorded in `protected-baseline.json`: all files in original mv52, mv5cat and the production manifest remain unchanged. The review copy preserves the original lighting.js, early.js, middle.js, late.js, kit.js and neural modules byte-for-byte. Its main.js differs only by the explicit extra-light import/call.

No video has been exported in this preparation task. The combined reel has not been assembled or verified. After root's final mapping, remaining work is to measure unresolved anchors, verify representative frames/crops, render the five clips, assemble the reel, and verify every output's frames/PTS/audio packet timing and segment boundaries. This document does not treat setup or static QA as completed video delivery.

# v5 late production: R61–R86

Updated 2026-11-05. This note records the late-scene implementation and targeted native-renderer checks. It is not a claim that the complete encoded MV, audio or upload has passed final validation; the root export process owns those checks.

## Active artwork and source continuity

`assets/astra/v09/late-assets.json` contains 14 active source illustrations, all `faceTreatment: shadow`, `styleRevision: 3`. Each active file has its own built-in ImageGen edit output and saved prompt; the prior generation is recorded as `previousProvenance`. Source pixel anchors and canvas sizes are stored with each entry. All 14 edited sources were viewed. `late-alpha-check.json` records actual dimensions, alpha ranges and transparent corner samples.

| Group | Complete source-drawn poses | Use |
|---|---|---|
| A10, 3 poses | Protect the first mark; bend knees and hold it close; compress into a crouch and fold wings | R60 shared with middle, R61–63 |
| A11, 3 poses | Reach; fingers hover and curl; withdraw the arm toward the body | R75 |
| A12, 2 poses | Trace a loop with a connected pen; turn back toward its source | R77 |
| A13, 3 poses | Offer a generated answer; lower the controlling hand; open the palm and leave room | R81–84 |
| A14, 3 poses | Put down a mark; lift the pen and wait; reach farther to resume drawing | R85–86 |

The rejected first A10 side-profile trilogy and early A11 halo attempt remain preserved as history. They are not active artwork and are not counted as new action poses. The subsequent bright-face style2 assets are also inactive. Current normal poses have the face drawn dark in the source image itself, not hidden with a code overlay. GPT ornaments remain integrated hollow knots without outer discs; there are no separate pasted logo, hand, eye or skin elements. A14's floating pen-cap ornament was removed through source ImageGen editing. Existing v4 eye, surprise and relaxed recognition portraits are the intentional face-reveal exceptions.

## Staging

- R61–63: three distinct defensive body poses. Contact point lowers as knees bend; source bounds are used to retain the floor near y=900. Pressure shutters cover the pose changes, rather than blending incompatible limbs.
- R64–69: six independent volumetric cells for the six existing guest identities. Back wall, two side walls, ceiling and floor appear before foreground gates close. Guests retreat and reduce in apparent scale. The gate closure directions are top-down, split-horizontal, left-hinged, bottom-up, diagonal-split and right-hinged. Red bolts converge into a lock, with a short damped impact at closure. Every cage was inspected in actual native 4K output.
- R75: full connected A11 arm reaches, hesitates, then returns to the body. The red route follows the actual wrist and slackens after withdrawal.
- R77: the source-drawn pen closes a route toward its own source, followed by the second full pose turning back. The room compresses to a horizontal boundary through clipping and collapsing frames; the actor is not artificially squashed.
- R78–80: separate spatial FC, CNN and RNN layouts in `spatial-neural.js`. These call the original validated `fcForward`, `cnnForward` and `rnnForward` functions. FC shows all 52 weighted connections in 4→5→4→3 layers; CNN uses the actual 5×5 input / shared 3×3 filter / convolution / ReLU / pooling values; RNN carries the actual recurrent hidden state across three moments, including zero input in the final moment. These are explicitly teaching models, not a representation of GPT internals. Their output is still predicted from the old record, not a received reply. No repeated standing portrait is placed in the corner.
- R81–84: generated output returns to the same hand. A13 lowers the control sheet and opens a space, while the forced-response loop remains alive until the last command.
- R85: the writing detail uses the complete source-drawn A14 arm and actual nib, pinned to the growing left half of the star. Once the mark is complete, a deliberate cut reveals the seated waiting pose with the pen lifted. The former non-contact transfer line was removed.
- R86: the independent gold nib completes the new mark; the approved recognition and relaxation closeups follow. In the quiet coda, eight alternating authorship steps grow a four-span bridge and three islands. The seated shoulder remains fixed across all poses. The digital paper contents scroll under the violet nib during her marks; the nib lifts when the other author draws. Bridge/island geometry stays away from the writing hand. Actual connected pen anchors and contact positions are recorded, not inferred from a nearby decorative cursor.

## Runtime evidence and audit fields

Native PNG probes:

- `exports/qa-v5-late-shadow`: six closed cages, R77 collapse, initial R85–R86 inspection.
- `exports/qa-v5-late-shadow-revised`: corrected source-nib writing detail, lifted waiting pose, alternating coda poses.
- `exports/qa-v5-late-shadow-final`: final bridge spacing and end-of-tail frames.
- `exports/qa-v5-late-shadow-actions`: A10 three defensive poses, A11 reach/hover/withdrawal, and all three neural spaces, inspected from native 4K renders.

`tools/render/check_v5_late.mjs` checks 40 selected actual renderer instants at 3840×2160. It records open/middle/closed states of each cage, six R85 states, and two samples in each of the eight coda authorship steps. The report is `docs/validation/astra-v5-late-runtime.json`. Checks cover six distinct identities and closure directions, open-to-locked progression, foreground gate order, actual nib-to-mark coordinates, stable seated shoulder, lifted pen during the gold author's turn, and world growth. Native stills were separately viewed; these metadata checks do not by themselves prove visual quality or full-frame continuity.

`sceneAudit.imprisonment` contains `guest`, `cellDepth`, `closureProgress`, `lockProgress`, `foregroundBars`, `frontOcclusion`, `doorDirection`, `guestScale`, `backWall`, `sideWalls`, `floor`, `frontDrawnAfterGuest`. `frontOcclusion` is an analytical bar-coverage estimate, not a measured image-mask percentage. Neural audit retains computed arrays and logical bounds; R78–80 remain `predictedOutput: true`, `independentReply: false`. R85/R86 record actual source-mapped pen positions; R86 additionally records `seatedShoulder`, `paperOffset`, `completedStrokes`, `bridgeFraction`, `terrainCount` and `penPausesForOtherAuthor`.

No timeline, lyric, warning or audio changes were made by the late-scene owner. The complete song and the six-second quiet coda remain intact. No new 1080p video or final MV encode was made by this task.

The final readability adjustment completes the FC/RNN progress at 83% of each shot, leaving approximately 0.612s / 0.672s with all final values visible. Initial progress remains zero, completion remains one, and the source numerical models are unchanged. CNN keeps its existing scan timing. The root will rerun integrated checks against this final timing update; the previous late-runtime JSON must be refreshed after all source edits are stable.

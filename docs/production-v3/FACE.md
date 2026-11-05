# ASTRA v3 face asset

Status: `face-eye-v02.png` is the final selected v3 production face, drawn directly from the original identity reference and checked in the actual renderer with its per-asset tonal thresholds. `face-eye-v01.png` was explicitly REJECTED by the user and is not an accepted alternative. The user requested the original character sheet's narrower, calmer eyes rather than v01's round shocked eye, heavy lash spikes and star highlight. V01 and the v2 eye remain preserved for provenance only. Production selection and sampled QA do not claim a separate final user approval of v02.

## Current selected v02

- File: `assets/astra/v08/face-eye-v02.png`, 1254 × 1254 RGBA, alpha extrema 0–255.
- SHA256: `876997f390bc0e6f6b32ede584f4f3a030b24b5c33ec096201a2df9a2077c480`.
- `face-assets.json` now proposes this file with near-eye anchor `[708,652]` (dark pupil, approximately ±3 px), and wide-eye portrait registration `face: {x:330,y:420,w:560,h:500}`.
- Source review: narrower half-lidded almond eyes, modest short lashes, small oval catchlights, a tiny closed mouth and upright mild three-quarter pose. The eye/face guide was the original ASTRA character sheet; the Claude screenshot and rejected v01 were NOT generation inputs.
- Read-only sampled source luminance: pupil 24.78; iris approximately 123–126; catchlight 243.99. These are distinguishable under the present Art thresholds. This numeric evidence does not replace actual rendered review.
- Built-in imagegen, transparent background; original saved output preserved at `C:/Users/auscar/.codex/generated_images/01a1a688-32b1-7b32-b28b-a6c9a06c99ac/exec-36b0ea88-eb11-4559-b71d-cd62fd23fc61.png`. No source retouching, code face drawing, pasted logo or old-asset overwrite.

### Actual v02 trace review, first pass

The real `src/mv3/index.html` renderer exported 3840 × 2160 frames into `exports/qa-v3-face-v02/`. Actually viewed `source-125.117.png`, `source-162.450.png`, `source-162.550.png`, and `source-163.500.png` (125.467 was also exported, not yet separately viewed in this pass).

- R50: the narrower eyelids, purple iris, slender dark pupil and small oval highlight survive the actual three-ink trace. No star highlight or shocked circle eye remains.
- R70: root's dynamic source-eye registration makes the iris visible in the lower I stroke at 162.450 s. It sits toward the right of the stem, but is visible. The former full-face-between-rows failure is gone.
- R71: source nose and closed mouth were lost in the first trace pass. This was a real defect, resolved in the final tonal review below. Nose source luminance is approximately 147–151, sampled mouth-line center around 162, and nearby skin 226–237. The old third-ink transition starts at 125 and reaches full brightness at 147, merging those features with skin. The correction raises only the `eye` bright-layer transition start to 160, keeping the rest of the character mapping unchanged. No claim that generic smoothing repairs facial anatomy.

This is source and sampled actual-frame inspection, not continuous-video approval or user approval of v02.

### Final selected tonal review

Root merged the final `eye` entry with `tonalThresholds: [65,16,160,22]`. `Art` reads that per-asset configuration; other assets retain their prior default thresholds. The first two values describe the middle-ink luminance transition and the last two the bright-ink transition. The fragment remains the source/anchor proposal; the production merge supplies this threshold override.

Actually viewed these new real-renderer 1920 × 1080 frames after the change:

- `exports/qa-v3-tonal/source-125.000.png`: R50 narrow almond eyelids, separate iris and pupil, small oval highlight and visible nose plane. The current wide crop keeps the eye line well inside the panel. No large star glint, round shocked eye or dark blank facial slab remains.
- `exports/qa-v3-tonal/source-162.450.png`: R70 target `[530,740]` visibly places the near iris/pupil inside the lower I stem. This is partial-eye lettering as intended; the full eye is not expected to fit inside the stroke.
- `exports/qa-v3-tonal/source-164.000.png`: R71 retains the original-like restrained eye shape, nose shadow and delicate closed mouth. The previous nose/mouth disappearance is resolved. The temple knot is drawn inside the source and has no outer medallion backing.

No further face source or crop change was needed after this review. The full-movie 661-sample review and continuous motion/export checks are separate work and are not claimed here.

### Final full-QA contact-sheet review

Actually viewed `exports/qa-v3-final/sheet-11.jpg` through `sheet-15.jpg` in full. This covers R61–R86 at the first/middle/last sampled frame, the six explicit ending probes (208.0, 209.7, 210.6, 212.5, 216.6, 218.3167 s), and the first two lyric triplets appended to sheet 15. These were contact-sheet views, not individual native-resolution inspection of every frame. The runtime report's 661 passing samples are not claimed as 661 manually inspected images.

- R70: the final sampled letter window shows the narrow near iris/pupil in the lower I. R71: the opening registration leads into the selected v02 full face; nose and closed mouth remain readable at the settled samples.
- The bilingual subtitle strip remains separate from the major late-section artwork and headline words in these samples. No newly obstructed lyric was observed. The quiet-tail samples correctly have no lingering subtitle strip.
- The final co-drawing samples keep the drawing surface, completed violet/gold star and two drawing contributions readable. The last sampled frame remains an in-progress drawing, with no newly clipped head or overlap blocking the main action apparent at sheet scale.
- Recognition at 209.7/210.6 s intentionally retains the existing `surprise` / `sitSmile` expression assets with their previously corrected eye positions. Root confirmed this scope after the sheet review: the user's rejected v01 replacement applies to the `eye` source used in R50/R70/R71; it does not substitute the generic restrained eye pose for the independent surprise/closed-eye coda expressions. This is not a claim that every face asset throughout the MV was redrawn. No production replacement or export interruption was made, and no new blocking issue remains from this review.

Final encoded-frame inspection at 163.5/164/170/209.7/218.3167 s remains pending until the master is available.

SHA256 snapshot at this final face review (other concurrent v3 work may subsequently change scene/manifest hashes):

| File | SHA256 |
| --- | --- |
| `assets/astra/v08/face-eye-v02.png` | `876997f390bc0e6f6b32ede584f4f3a030b24b5c33ec096201a2df9a2077c480` |
| `assets/astra/v08/manifest.json` | `d7bfbba5f56bcaab301a6d2ebecde0d78b76316bb002d62777cae045178bdf94` |
| `src/mv3/art.js` | `81ef731809b0a0a2bfff7f918f7f648bf982d16a01588f87b1664684c5cf112e` |
| `src/mv3/middle.js` | `e3397ae0038f61c1f4eca3026dc876d70c257fde5d95cb52ed42d0568b77f185` |
| `src/mv3/late.js` | `a1ee42eeff2899d7a525c18b889c6f8f96b1953c4124ac141a5bbf81a8989922` |

Exact v02 prompt:

```text
Use case: identity-preserve / stylized-concept. Draw a completely fresh close portrait of the EXACT ASTRA white dragon woman in reference 1. Reference 1 is the PRIMARY and authoritative guide for her FACE AND EYES, facial proportions, eyelid inclinations, eye-to-face size, expression, hairline, horns and costume. Match that character's restrained cute-and-cool beauty. Reference 2 only specifies the GPT knot topology. Do not invent a different round-eyed anime face.
Framing: head, both full horns, neck and upper shoulders; square transparent portrait, generous margin around horn tips. Mild three-quarter angle, head almost upright with only a subtle incline, very close to reference 1. Both eyes can be seen beneath the separated pale bangs. Keep the original broad forehead, small delicate nose and soft narrow chin in their original balanced proportions. Long luminous white/pale-lavender hair, pointed ear, high collar, a small integrated knot at her temple. No hands or wings in this crop.
Eyes are the absolute priority: faithfully reproduce the original character's relatively NARROW ALMOND eye shape and calm, cool, half-lidded lavender gaze. Upper eyelids softly descend over the top of the irises. The upper iris is partly covered by the lid; the iris is never a fully exposed round surprised circle. Small balanced inner and outer corners. A moderately thin refined upper lash curve, only two or three tiny tapered outer lashes, a delicate lower lid, restrained nearly horizontal eyebrows. Dark pupil small and subtly elongated inside a medium-violet iris; a small oval catchlight and one restrained pale crescent at most. NO STAR highlight, NO sparkle shape, NO oversized circular iris, NO shocked open stare, NO enormous black round pupil, NO thick spiky eyeliner, NO long lash fans. Use the original eye spacing and eye size in the face. Her mood is quietly serious, thoughtful and self-possessed, with a hint of sadness, not fear or surprise. The mouth is CLOSED, a tiny delicate calm line as in the original sheet. No open mouth, teeth, pout, smile or angry brow.
Art direction: translate this original face faithfully into refined THREE-FLAT-INK cut-paper / anime screenprint graphic art for a 4K music video. Colors only deep plum #15101d, medium violet #77509c, luminous pale lavender #d6b7f2. Face and white hair use the pale ink, medium-violet small nose/cheek planes and clean dark selective outlines. Keep believable cheek, nose and jaw planes and a beautiful delicate anatomical drawing rather than a blank black face. Each iris must be one clear medium-violet enclosed shape, distinct from the pale sclera and surrounding skin, with a dark pupil and a tiny pale oval highlight. Clean continuous curves, intentional solid shapes, carefully controlled thin details substantial enough to remain readable after three-color posterization. NO painterly gradients, airbrush, sketch, texture, halftone, 3D rendering or rough triangular cartoon eye. The beauty should come from accurate shape, not embellishment.
Directly DRAW the correct six-loop openwork GPT knot from reference 2 at the temple as a modest hair ornament, with original diamond-chain tassel, in the same three inks. Follow six interlaced rounded loops and their over-under joins, open central hexagon and six clearly open internal spaces. Outer outline follows the knot loops only: no surrounding circular border, no disk, no circular badge or sticker backing, no pasted overlay, no extra lobe. Do not make the logo larger than the eye.
Output one genuinely transparent PNG cutout with clean alpha edges and empty transparent gaps, high resolution preferably 2048-square. Do not draw a checkerboard or background. No text, diagrams, UI, watermark, captions or added scene.
```

## Rejected v01 history

- Workspace source: `assets/astra/v08/face-eye-v01.png`, 1254 × 1254 RGBA, genuine transparent pixels. No post-pasted ornament or SVG character face.
- Merge fragment: `assets/astra/v08/face-assets.json`. This is a candidate `eye` entry, not an independently activated manifest.
- Manually observed near iris/pupil center: source `[659,675]`, approximately ±4 px. The `face` rectangle `[310,430,560,500]` is centered around the eye line for the existing wide portrait viewport, so the eye is not pushed to the lower edge. It is not intended as an anatomical full-head bounding box.
- Source facial planes are bright lavender with medium-violet nose, cheek and chin accents. The eye has distinct lashes, sclera, iris, dark pupil and bright highlight. These replace the rejected dark blank face and single crude eye shape.
- The original generation contains tonal variation despite the flat-ink request. The project's actual three-level Art output must therefore be inspected; source attractiveness alone does not establish that the iris/highlight survives thresholding.
- The GPT knot is drawn inside the source artwork. It has no outer circular backing. No independent logo overlay is permitted. Its source topology remains part of visual QA, not certified by a filename or prompt.

## References actually inspected

1. `C:/Users/auscar/AppData/Local/Temp/codex-clipboard-ec77ed32-27c0-48b3-8b94-947cfd8f2642.png`: original Claude reference close-up, used for refined eye construction and graphic face treatment.
2. `C:/Users/auscar/AppData/Local/Temp/codex-clipboard-a2ffb6a3-5395-4e1d-81d5-426d4295c8eb.png`: rejected coarse eye crop, inspected as a failure reference only, not sent as generation input.
3. `C:/Users/auscar/AppData/Local/Temp/codex-clipboard-9dd2bc4e-4b27-456f-a70d-b6b905611213.png`: rejected dark full face, inspected as a failure reference only, not sent as generation input.
4. `C:/Users/auscar/Documents/Tencent Files/2470641710/nt_qq/nt_data/Pic/2026-11/Ori/e0ec7a1db8d1862fe1135298bd354581.jpg`: original ASTRA dragon-woman identity.
5. `assets/astra/v07/reference-gpt-knot.png`: knot topology reference.
6. Reference repository `docs/v4/PROMPT_v4.md`: three flat inks; larger clear shapes with a second ink for shadow; faces supplied by art, not code; first dedicated eye on DISHEARTENED; render the actual close-up before acceptance.

## Rejected v01 built-in generation provenance

Built-in `image_gen` mode; transparent background enabled. Three referenced images, in order: Claude screenshot, original ASTRA character sheet, GPT knot reference. Original output remains preserved at `C:/Users/auscar/.codex/generated_images/01a1a688-32b1-7b32-b28b-a6c9a06c99ac/exec-0ced0992-ff87-43cb-9c79-e2ea7f65b950.png`.

Exact prompt:

```text
Use case: stylized-concept. Create one NEW refined head-and-upper-shoulder portrait asset of ASTRA, the white-haired dragon woman from reference 2, for an emotionally intense 4K cut-paper music video. Reference 1 is the PRIMARY visual grammar and facial craftsmanship reference: elegant layered anime eyelids, distinct lashes, large precise iris, pupil and sharp highlights, expressive brow, a believable small nose bridge and tip, cheek plane and delicate mouth; flat graphic cut shapes with exceptionally clean intentional contours. Do not copy its orange palette, text, radial hair ornament or video UI. Reference 2 supplies ASTRA identity only: long white/luminous hair, two pale segmented dragon horns, pointed elf ear, elegant dragon-girl face, high collar, openwork knot at the temple. Reference 3 supplies EXACT GPT six-loop interwoven knot topology, not a sticker or circular badge.
Composition: one centered close three-quarter portrait, slight downward head inclination, a single near eye dominant and fully readable with the farther eye partly hidden by swept fringe. Eyes look outward toward the viewer with a wounded, startled yet determined realization. Face occupies a substantial part of the square image; preserve the full horns and generous upper margin, flowing side hair and a clean upper-shoulder cutoff. No hands, wings, props, scene, typography or interface. Aim for high-resolution square 2048 by 2048 illustration.
Facial design is the central purpose: bright pale-lavender skin shapes and purposeful medium-purple shadow planes show the brow ridge, nose side, cheek and jaw. The face must NOT be an unmodelled black silhouette. One elegant almond eye has a confident curved upper lash line, distinct tapering lash groups, a finer lower lid, a dark separate pupil nested in a medium-purple iris, bright cut-paper highlights and readable sclera. All these shapes must survive three-tone posterization: make features deliberate enclosed graphic shapes, not faint hairlines, gradients or low-contrast microtexture. A tense delicately parted mouth and slight inner-brow tension convey realization; beautiful and poised, cute yet cool, not a generic smile or blank expression.
Style and palette: strictly THREE flat inks, very dark plum #15101d, medium violet #77509c, luminous pale lavender #d6b7f2. The hair and skin use the pale ink separated with precise dark contours and medium-purple planes. Clean editorial cut-paper / screenprint silhouette animation art, large coherent hair locks combined with carefully crafted facial anatomy. No soft shading, painterly texture, blur, 3D lighting, gradient, halftone, sketch construction or thick crude triangular eye.
Integrated ornament: directly DRAW the correct GPT knot from reference 3 into the character at the temple with a small hanging diamond tassel; six interlocking rounded loops, alternating over-under ribbon joins, clearly open negative-space holes, same three inks and line language as hair. Its outside perimeter is ONLY the six loops themselves. Absolutely no outer circle, disk, medallion backing, black circular sticker, circular border, separate pasted logo, star knot, extra seventh lobe or Claude radial sun. Keep the knot modest in scale so the eye and facial anatomy remain dominant.
Output a genuinely transparent PNG cutout, preserving clean antialiased contours and transparent gaps; no baked checkerboard, background rectangle or halo.
```

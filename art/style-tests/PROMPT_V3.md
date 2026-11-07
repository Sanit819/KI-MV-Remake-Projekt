# v3保留粗草并恢复辨识特征 · 实际提示词

内置image_gen；以v2为编辑目标，DeepSeek/Astra原型作为身份参考，MV f000622为画风参考。用户已指出v1太精致、v2丢失特征，本版用于重新评审二者的平衡。

```text
Use case: style-transfer / identity-preserve.
Revise Image 1 (the rough two-person red-background sketch) to restore the distinctive character identities that were oversimplified. Keep its rough sparse thin pen drawing, awkward angular dance, fixed vacant faces, white flat fills and red background. It must remain much less refined than a polished anime illustration. The user likes roughness but says the character traits were lost.
Reference roles: Image 1 = edit target / roughness and staging to KEEP. Image 2 = DeepSeek original identity, Image 3 = Astra original identity; use only selected identifying features, NEVER their detailed rendering. Image 4 = music-video drawing style authority, sparse and slightly wonky.
Goal: make viewers immediately recognize the two specific characters while drawing each identifying feature in very few loose strokes.

Keep exactly two figures, DeepSeek on the LEFT with ᗜvᗜ tiny v smile; Astra on the RIGHT with ᗜ-ᗜ tiny horizontal mouth. Preserve the hollow half-lidded eyes from Image 1, nearly absent noses, no iris highlights or conventional pretty anime face. Preserve one arm pointing diagonally up, the other stiff elbow bending down, kinked knees; exactly two arms and two legs per person, and one tail each. Keep lower shins cropped. No new figures or extra hands.

LEFT DEEPSEEK — restore THESE signature traits:
1. Her LONG WAVY / CURLY HAIR, not a generic straight jagged haircut. Use five big unruly S-shaped locks, including curls beside both cheeks and a long mass reaching her hips. Draw each lock with one or two loose uneven strokes; no fine strands. Include the recognizable long bent looping ahoge.
2. Show her BLUE HAIR identity using flat muted denim-blue underside patches on the outer/back curls and pale-blue ends, while leaving the big front hair area white. This is a small but clearly visible color cue, not full shaded blue hair. No gradients.
3. Keep the ruffled maid headband drawn as only five irregular bumps, plus its blue side bow and little finlike side ornaments.
4. Her MAID OUTFIT must read clearly again: loose collared bodice, simple bow at neck, one bib/waist seam, a big rounded apron over a flared skirt, two big ties at the waist. Add a few tiny flat blue side panels at the bodice/outer skirt and a small, deliberately crude blue whale doodle on the apron. Draw apron frill with only 3–4 uneven zigzag ticks, not continuous meticulous scallops. Two crooked button dots at most. No lace, embroidery, gems or intricate stitching.
5. Retain her unmistakable broad whale tail and two-lobed flukes sticking out left. Keep tail cleanly attached behind her.

RIGHT ASTRA — restore THESE signature traits:
1. Her very LONG WHITE HAIR with an uneven SIDE-PARTED fringe and two sweeping cheek locks, long rough outer hair shapes reaching hips. Replace the current generic blunt straight fringe. Draw with a handful of broad uneven contours, not many refined strands. Keep her curved ahoge.
2. Restore curved, slightly kinked SEGMENTED DRAGON HORNS as in Image 3, not plain smooth devil horns. Only three crooked segment ticks per horn. Pointed ears visible.
3. Restore ONE small recognizable rough six-loop KNOT-SHAPED HAIR ORNAMENT near the temple with a tiny pale-purple accent. Draw the knot as a casual crooked scribble, not a precisely rendered logo. No chains, earrings or other jewelry.
4. Keep small simple batlike dragon wings, each with at most one inner line.
5. Restore the outline of her WHITE LONG DRESS: small standing collar, loose simple draped sleeve shapes and asymmetric flowing lower panels, drawn as angular loose shapes with only two folds. Modest, flat, boxy torso; no breast modeling, cinched corset, fashion anatomy or high-heel styling.
6. Her DRAGON TAIL should have a slightly scalloped / angular outer edge with two or three very sparse scale ticks, tapered pointed tip and a tiny pale-purple accent. The tail stays clearly different from the whale flukes.

KEEP THE SCRUFFY MUSIC-VIDEO LOOK:
Very sparse gray-black hand-drawn contours, mildly shaky and imperfectly joined; a few line overshoots and gaps. Large flat white areas. Boxy narrow bodies with stiff elbows and knees. Slightly uneven head contours. Rough identity cues are enough. Absolutely no shading, rendering, volume, texture, hatching, soft lighting, intricate hair, dense frills or many jewelry marks. Do not turn the added identity details into polish. No sketch-paper texture or fake noise filter.
Wide frame, solid flat coral red near #FD5354 with the same ample margins. Red-white-black remain dominant; blue and pale purple are a few small, readable identity patches. No lettering, titles, background objects, decorative stars or panels.
```

# v5不闭合线条草稿感 · 实际提示词

使用内置image_gen。用户对v4表示“这回差不多了”，进一步要求原MV一眼草稿、线条不闭合的效果。本次仅以v4为编辑目标，保留发型与身份，修改描线质量。

```text
Use case: precise-object-edit.
Edit this exact image ONLY to change the INK LINE QUALITY into visibly UNFINISHED, OPEN-CONTOUR ANIMATION ROUGH DRAWING. The user says the hairstyle and character design are now about right. LOCK this geometry and identity. Do NOT redesign, simplify away, restyle the hair, change proportions or add details. The only requested change is that the contours look like a first-pass rough sketch with visibly unclosed lines.

KEEP EXACTLY:
Same ds on the left and Astra on the right, same hairstyle main contours / parting / fringe shapes / long flowing clumps, same crowns/ahoges/horns, maid headband, bows, knot ornament, clothing, wings, two distinct tails, hands, legs, body sizes, dance poses and framing. Same white flat character areas, blue/purple accents and coral-red flat background. Same vacant hollow half-lidded eyes; ds tiny v smile and Astra small horizontal mouth. Keep the white gap between ds's eyes clear of any stray horizontal line or nose bridge. Exactly two arms and two legs per character.

CHANGE THE DRAWING PASS, NOT THE DESIGN:
The current outlines are too continuous, uniformly black and neatly closed. Redraw that ink as a sparse lightweight slightly gray-black rough animation pencil/pen pass, with purposeful visible OPEN GAPS, overshooting strokes and imperfect joins.
- Leave clearly visible small breaks along many outer hair contours, selected long hair-lock edges, shoulder / sleeve joins, cuffs, collar, apron edge, skirt hem, wing outlines and tail outlines. Roughly one in five contour runs should end slightly early or start slightly late. These gaps should be readable at ordinary viewing scale, approximately 4–12 pixels on this 1674px-wide canvas; not just microscopic antialias noise.
- At several hair tips / elbow corners / hem corners, let the two approaching strokes stop short of touching, or overshoot each other slightly, instead of cleanly sealing a pointed shape. Don't neatly close all the shapes.
- Keep the stroke thin and pressure-uneven: some portions lighter and finer, others a little firmer, with slightly crooked drawn segments. No bold uniform sticker-like contour.
- Permit only a FEW sparse displaced retry strokes close to a chosen hair edge or cuff, as if the animator tested that contour once. Do not cover the image in a net of repeated scribbles. No construction circles, crosshatching or extra graphic marks.
- Interior folds and hair division lines can have tapered lifted ends and short interruptions. Do not add more folds or more hair strands.
- Keep the established main hair shapes legible and coherent, with the same overall flow. Rough gaps must not change the hairstyles.

WHITE FILL STAYS:
Keep the flat white silhouettes / fills substantially in the same places even where the ink is interrupted, like loosely filled animation rough cels. The missing contour sections reveal a white-to-red edge without a black border. Do NOT make giant missing chunks of hair/body, transparent holes, missing hands or broken anatomy. The white fill can overrun or undershoot a few ink ends very slightly. Retain clear negative spaces and both eyes.
Target: a noticeably unfinished hand-drawn MV frame, freshly roughed in and never cleaned up, still readable and recognizable. The sense of hurried awkward roughness comes from visibly UNCONNECTED LINE ENDS, not from blurred resolution or texture overlays.
No shading, no paper texture, no grain, no graphite smudges, no noise filter, no new background, no words or labels. No hair redesign. No polished cleanup. Preserve the entire wide composition.
```

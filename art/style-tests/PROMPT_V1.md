# 角色画风试稿 v1 · 实际提示词

使用内置 image_gen。第一轮以原MV帧为风格/舞姿参考、两张角色原图为身份参考，第二轮仅修正Astra多余的第三只手。

## 初始风格转换

```text
Use case: style-transfer.
Create one character style-test illustration by redrawing and simplifying the two supplied character portraits into the drawing language and dance staging of the supplied music-video frame.
Reference roles: Image 1 is the authoritative STYLE, LINEWORK, FACE GEOMETRY, POSE and COMPOSITION reference. Images 2 and 3 are IDENTITY / COSTUME references only; discard their glossy rendering, anatomy polish and intricate decoration.
Edit the scene of Image 1: replace its left dancer with DeepSeek from Image 2, and its right dancer with Astra from Image 3. Remove all credit text. Output one clean wide 16:9 test frame with exactly two characters, nearly full-body with feet visible, generous coral-red background. No titles, labels, calligraphy, logos, extra characters, star props or inset panels.

STYLE IS THE MAIN PRIORITY: closely match Image 1's deliberately sparse hand-drawn music-video cel. Fine dark slightly uneven pen contours with occasional small natural line overlaps. Mostly blank white flat silhouettes, no shading, no gray shadow washes, no lighting, no highlights, no gradients, no hatching, no paper texture, no 3D volume. Sparse folds and hair strands. Slightly large heads on slim elongated simple bodies, about five heads tall; narrow waists, long angular arms and visible bent knees; do not use super-deformed chibi proportions. Uniform thin line weight rather than thick sticker borders. Keep the charm of an economical awkward dance drawing.
Faces faithfully follow Image 1: two half-lidded hollow geometric U/rounded-square eyes with horizontal upper lids, large blank white interiors, no sparkly pupils or rendered irises, a minimal absent nose. LEFT DeepSeek has a tiny v-shaped happy mouth, expression ᗜvᗜ. RIGHT Astra has a tiny straight horizontal mouth, expression ᗜ-ᗜ, calm and deadpan. Do not beautify the faces into conventional detailed anime eyes or add blush.

POSE: both front-facing in the same synchronized angular disco gesture as Image 1: one arm reaches diagonally upward with index finger pointing, the other upper arm extends sideways and elbow folds sharply down with index finger pointing toward the ground; tilted hips and bent knees. Match the broad rhythmic silhouette of the reference while naturally adapting costume and tails. Arms, fingers, faces and tails must remain legible and separate. Two complete adult feminine characters with modest simplified costumes.

LEFT DEEPSEEK: long flowing wavy hair drawn in only a few large contour clumps, bent ahoge, frilled maid headband and a small blue bow with finlike side ornaments, white simplified maid dress with a large plain white apron and a very small blue whale emblem. Simplify the skirt to a mobile mid-calf silhouette so ankles and bent-leg stance read. One clearly visible broad WHALE tail sweeps out behind her toward the left edge, ending in two horizontal rounded flukes; not a fish-person lower body. Hair and costume are overwhelmingly white; blue only at a few hair tips, the bow and a small tail accent.
RIGHT ASTRA: long white hair rendered with a few contour clumps; two curved segmented dragon horns, pointed ears, a small simplified knot-shaped hair ornament without literal text, two small outlined batlike dragon wings emerging from her upper back; a clearly visible long tapered dragon tail with only a few triangular scale marks curls out to the right. White modest simplified flowing dress, parted/arranged around the bent legs so the dance pose reads, minimal folds and restrained sleeve shapes. Tiny pale-purple accents at an ornament or tail tip only. No cat ears. No huge detailed wings or intricate scale texture.

PALETTE: uninterrupted solid coral red around #FD5354, white figures, thin near-black outlines. Tiny muted blue and purple identifying details together occupy very little area. Skin is also flat white as in Image 1. Background must remain a single flat color. The result should plausibly be a replacement frame in the reference MV, with the two new identities drawn economically in its own visual language.
```

## 局部修正

```text
Edit this exact two-character coral-red style-test image. Make ONE localized anatomy correction only.
The RIGHT character Astra currently has an accidental THIRD HAND hanging below her image-left bat wing, beside her waist, around x970,y450 in the 1674x941 image (roughly 58% image width, 48% height). Remove that entire stray dangling hand and its short stray forearm, and cleanly reconnect the adjacent hair / dress side contours where necessary. Fill any freed background area with the same coral red. Her two intended arms must remain: one diagonal upward pointing hand and one bent arm pointing down at image-right.
Preserve the small bat wing above that spot. Preserve both characters' exact faces, poses, legitimate arms/hands, costumes, tails, fine sparse black linework, white fill, tiny blue/purple accents and plain red background. Do not add new limbs, props, text or detail. Leave DeepSeek (left character) completely unchanged. Keep the same wide canvas and framing.
```


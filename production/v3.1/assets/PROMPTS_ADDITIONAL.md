# v3.1 扩展核查后的局部补耳提示词

使用 built-in `image_gen`。clap保留透明RGBA；fallback保留原RGB红底。仅在运行时取耳部窗口，原图与旧版归档不改。

## clap

Use case: precise-object-edit. Image 1 is the EDIT TARGET: two characters with raised palms beside their cheeks on a transparent 1673x940 canvas. Image 2 is a reference ONLY for Astra's two narrow pointed ears.
Add the missing anatomical RIGHT pointed elf/dragon ear to Astra, the white dragon girl on the RIGHT half. This ear is on the VIEWER-LEFT side of her head, at eye/temple height, immediately ABOVE the raised hand. The ear base should emerge naturally from behind the side hair around x=985, y=245..273 and the distinct narrow pointed tip should extend left to approximately x=938, y=254. Use a small white triangle, thin imperfect dark outline and ONE short inner-ear crease, matching her other ear. Do not mistake the curl of hair below for the ear. Do not touch the raised palm or fingers.
Keep all other image pixels as unchanged as possible: exact original full-canvas dimensions, composition, character sizes/positions, both palms and arms, body pose, mouth and eyes, hairstyles, horns, accessory, wings, tail, clothes and ds on the LEFT. Maintain the extremely simple thin scratchy open/broken sketch contours and flat white fill. Do not polish, shade, texture, crop, mirror, recolor or shift the characters. Preserve genuine transparent alpha and white filled interiors. No backdrop, checkerboard, text, symbols or new props. Only the small missing-ear region may change.

## fallback

Use case: precise-object-edit. Image 1 is the EDIT TARGET, the original red-background two-character disco style frame, 1673x940. Image 2 shows the same pointing pose after an ear repair, and is ONLY an ear-position/shape reference.
Make exactly one local correction to image 1: add the missing anatomical RIGHT pointed dragon/elf ear to Astra (the white dragon girl on the RIGHT half), on the VIEWER-LEFT edge of her head. The ear is a narrow off-white triangle projecting left from behind side hair at eye height, around x=938..998,y=240..278 in the target coordinate system. Include a thin uneven dark outline and one small inner crease. Match the reference's ear position and proportion; do not enlarge it or turn a hair curl into an ear.
Keep the entire original 1673x940 canvas, red background, ds, all original body positions, proportions, gesture, pointing hand, face, hairstyle and forelocks, horns, wings, tail, dress, blue/purple accents and broken thin open contour lines exactly as they were. Do not remove the backdrop or introduce transparency. No smoothing, new shading, polish, text or composition changes. Only the tiny ear region should be repaired.

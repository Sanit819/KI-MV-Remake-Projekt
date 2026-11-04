# ASTRA final character set

Created 2026-11-04 with the built-in ImageGen tool. The sole visual baseline is `../v05/style-bust.png`, following the user's purple cut-paper screenshot. Original generated RGBA files are preserved unchanged. Generation instructions are recorded in `prompts.json` and `expression-prompts.json`; source dimensions and SHA-256 hashes are in `source-files.json`.

The six active `*-knot.png` files contain four poses and two seated expressions. They are ImageGen edits correcting the initial pinwheel approximations to the actual GPT interwoven knot structure, using the user's supplied logo reference. Earlier PNGs without this suffix are preserved iterations, not active film inputs. `sleep` deliberately aliases the featureless standing silhouette: awakening is staged through lighting and composition, not a fabricated extra face. The seated expression edits preserve the pose and drawing stylus.

GPT-inspired openwork ornaments were drawn with the character by ImageGen. There is no separate logo, circular backing plate, SVG ornament layer, or post-generation logo replacement in the full renderer. Older character designs and the former independent logo method are not inputs to the finished film.

At load time `src/full/art.js` converts the entire artwork to three fixed purple ink plates. A uniform coverage filter removes matte speckles; traced outlines provide closeups, while cached rasters provide smaller full-body figures. No facial features are painted by code. This produces a native 3840×2160 video canvas from lower-resolution generated art plus traced paths and procedural graphics; it is not 12,740 independently generated drawings.

Anchor coordinates in `manifest.json` are measured in original source pixels and mapped through the same tight bounds as the character. They attach the treasured old star to the cupped hands, and outgoing purple ink to the actual stylus.

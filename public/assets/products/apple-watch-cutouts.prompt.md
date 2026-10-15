# Apple Watch background removal

Edited using the built-in image_gen tool, one call per input, transparent_background=true.
Inputs and final assets: watch-01.webp, watch-02.webp, watch-03.webp.
The generated cutouts were re-encoded to 800px-wide WebP with alpha preserved.

## Shared final prompt

Use case: background-extraction. Edit the supplied product photograph: remove only its entire light gray studio background, floor and ground shadow, replacing them with genuine transparent alpha. Preserve the watch EXACTLY as shown: full strap, case, screen content, colors, lighting, orientation, proportions and centered position. Keep the original wide landscape canvas and the same size of watch within that canvas; do not zoom or crop. No new objects, no text changes, no white background, no checkerboard pattern, no halo. Product pixels should remain opaque with clean antialiased cutout edges; only surrounding empty space is transparent.

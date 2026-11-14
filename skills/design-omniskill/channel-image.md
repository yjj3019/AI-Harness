# Channel: Image (raster quality — inherits visual-artist scorecard)

Input: a static image (PNG/JPEG/WebP) plus its design intent. Extends the visual-artist scorecard with pixel measurements.

## Render contract

- Read the file's own pixels: dimensions, format, bit depth; no re-render needed.
- Measurements: dimension vs intended canvas, margin gaps (sample lines), contrast pairs sampled at ≥ 3 locations.
- sha256 recorded; a measured row exists for every score.

## Checks

1. **Dimensions** — matches intent (±1 px); upscale from source < intent = defect row.
2. **Contrast** — sampled pairs ≥ 4.5:1 (≥ 3:1 large); one bad pair documented = ≤ 2 axis.
3. **Margins** — content bounding box vs intended margins on the 4 px scale; 1 px off = documented, 3+ = defect.
4. **Type in image** — any rendered text: axis + ≥ reasonable size for display distance; blur/tiny text = defect row.
5. **Evidence** — pixels measured, not eyeballed.

## Scorecard (0-5): Dimensions / Contrast / Margins / In-image type / Evidence.

## Positive controls

- A pair measuring 3.9:1 must catch (≤ 2).
- A 1-px-off content box must be documented; a 3-px-off must drop the axis.

## Report

Four blocks: **Changed / Kept / Evidence / Uncovered**. Not an authorship check, not a detector.

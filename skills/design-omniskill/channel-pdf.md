# Channel: PDF (render forensics & layout QA)

Input: a PDF produced from a designed document (PPTX/DOCX/HTML export). The contract reuses the verified raster path: LibreOffice import → PDF → raster at 144 dpi with coordinate rulers.

## Render contract (measured values)

- Source converter: LibreOffice headless import; PDF size for 16:9 = 959.98×540 pt (1920×1080 at 144 dpi).
- Raster: 144 dpi (10.0 px = 0.1 in ruler), absolute output path, band rectangles compared against the PPTX/DOCX coordinates.
- Chain: sha256(input) → sha256(pdf) → sha256(raster); any chain break is recorded as a FAIL evidence row.
- Vertical stretch warning: office-direct renders at non-144 dpi are scaled (pos × 144/dpi); use the PDF path for measurement, not the office render.

## Checks

1. **Page geometry** — page size matches the design spec (pt vs EMU); mismatch = FAIL row.
2. **Overflow/clipping** — no content past margins; no text cut at page edges (raster bands).
3. **Bleed check** — elements at the exact page edge are deliberate (full-bleed) or off-margin.
4. **Repeated-scan** — identical geometry across two independent conversions (e.g., two source versions) matches; cross-day drift is measured, not assumed.
5. **Evidence** — chain + rulers + band comparisons; every score mapped.

## Scorecard (0-5)

| Axis | 5 | 3 | 1 |
| --- | --- | --- | --- |
| Geometry | exact spec | ≤1% off | wrong size |
| Overflow | none | 1 element clipped row | cut content |
| Type | no tofu, axis + fallback | 1 family odd | broken glyphs |
| Raster proof | chain + rulers | partial | missing |

## Positive controls

- Geometry probe: a 1% size change must be caught.
- Ruler probe: a band at an unexpected coordinate must be caught (any band whose y differs from the source coordinate by > 1 px at 144 dpi).

## Report

Four blocks: **Changed / Kept / Evidence / Uncovered**. Missing block = FAIL. A PASS on this channel is a design-quality pass only; gates (PPTX approval, phase gates) are separate and unchanged.

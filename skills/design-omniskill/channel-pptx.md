# Channel: PPTX (decks — inherits ppt-master, adds render-diff)

Input: a PPTX deck plus its approved design reference (or the design spec). The PPTX approval gate is unchanged and never replaced by HTML approval or by any channel pass.

## Render contract

- LibreOffice headless export → PDF (959.98×540 pt for 16:9), raster at 144 dpi (1920×1080).
- sha256 chain recorded: pptx → pdf → raster; office-direct renders at other dpi are known-stretched (×144/dpi) and are not measurement sources.
- render-diff: raster vs the approved reference raster at the same page geometry; allowed differences must be listed per band with coordinates.

## Checks

1. **Page geometry** — page size matches the spec (pt/EMU); mismatch = FAIL row.
2. **Master consistency** — same type axis, 4 px spacing scale, token colors across slides (spot-check ≥ 3 slides).
3. **Overflow/bleed** — no clipped text in raster bands; full-bleed elements deliberate.
4. **Approved-reference diff** — every band change has a coordinate row; unexplained bands = FAIL.
5. **Fonts** — families on axis, fallback chain for hangul/latin/digits; tofu = FAIL axis.

## Scorecard (0-5): Geometry / Master consistency / Overflow / Diff evidence / Type.

## Positive controls

- A slide with an off-scale gap (e.g., 6 px) must drop Spacing/Master axis ≤ 2.
- A raster band at an unexpected coordinate must produce an unexplained-diff FAIL row.

## Report

Four blocks: **Changed / Kept / Evidence / Uncovered**. A PASS here is a design-quality pass; the PPTX approval gate and phase gates are separate and unchanged.

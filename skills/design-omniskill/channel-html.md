# Channel: HTML (layout & typography QA)

Input: a local HTML/CSS artifact plus its sources. Render by contract, measure, score, report.

## Render contract

- Chrome headless, **absolute** output path, isolated `--user-data-dir`.
- Widths: 1440×900 and 1920×1080 (the raster standard).
- Record: binary path, widths, sha256 of each PNG, viewport overflow check (no horizontal scroll at both widths).
- HTML approval never substitutes the PPTX gate (unchanged rule).

## Checks (each measured or marked unverified)

1. **Overflow** — no horizontal scroll at 1440/1920; no clipped text at both widths.
2. **Contrast** — sample text/background pairs on the render; ratio ≥ 4.5:1 (≥ 3:1 large).
3. **Type** — families on the axis (≤ 3), fallback chain present, body ≥ 12 px, measure ≤ 90 chars, line-height ≥ 1.4 body / ≥ 1.2 display.
4. **Spacing/rhythm** — all gaps on the 4 px scale; repeated patterns deliberate (3+ equal gaps checked against the design intent).
5. **Grid** — 12-column grid, margins on scale; elements align to it at 1440 width.
6. **Evidence** — screenshot bytes + sha + dimensions recorded; a measured row exists for every score.

## Scorecard (0-5 per axis; each score = one measurement row)

| Axis | 5 | 3 | 1 |
| --- | --- | --- | --- |
| Layout | aligned to grid, no overflow | minor off-grid | clipped/overflow |
| Typography | axis respected, no tofu | 1 family off | tofu/mixed sizes |
| Color | contrast measured AA | one pair below, documented | unreadable pair |
| Spacing | 4 px scale throughout | one 1 px-off | random gaps |
| Evidence | full chain + rulers | partial | missing rows |

## Positive controls (probe both ways when in doubt)

- Overflow probe: an element wider than the container at 1440 must be caught (score axis ≤ 2, evidence row present).
- Contrast probe: a 3.8:1 pair must be caught (score axis ≤ 2, not 4).
Controls are signals for review, not verdicts on the artifact.

## Report

Four blocks: **Changed / Kept / Evidence / Uncovered** — every score maps to a measurement row or an Uncovered entry. Missing block = FAIL.

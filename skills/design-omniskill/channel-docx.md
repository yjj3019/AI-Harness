# Channel: DOCX (print typography & layout — inherits office-master)

Input: a DOCX document plus its sources. Print-layout QA on top of office-master content checks.

## Render contract

- LibreOffice headless → PDF (page size per section), raster at 144 dpi.
- Evidence chain: sha256(docx) → sha256(pdf) → sha256(raster), page count + page size recorded.

## Checks

1. **Page geometry** — paper size/margins per section match the design spec.
2. **Type** — body ≥ 10 pt print, line-height ≥ 1.4, measure ≤ 90 chars; one type axis; hangul/latin/digits no tofu (raster check).
3. **Spacing** — gaps on the 4 pt scale; table cell padding ≥ 4 pt; no orphan headings (heading + first body line on same page — raster pages).
4. **Overflow** — no clipped table/box content in raster bands; no single-character widow lines flagged as defects, but 3+ consecutive = one defect row.
5. **Evidence** — chain + rulers + page-size rows; every score mapped.

## Scorecard (0-5): Page geometry / Type / Spacing / Overflow / Evidence.

## Positive controls

- A heading stranded at a page bottom (raster) must drop the Overflow axis ≤ 2.
- An off-scale gap (e.g., 5 pt) must drop Spacing ≤ 2.

## Report

Four blocks: **Changed / Kept / Evidence / Uncovered**. Content claims stay governed by evidence rules; this channel never verifies facts.

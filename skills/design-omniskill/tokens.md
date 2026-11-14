# Design Tokens (shared scale for every channel)

Measurable defaults, not opinions. A channel scores deviations from these values. Values are the measurement basis for contrast, spacing, type, and grid checks.

## Color

- Foreground/background contrast **≥ 4.5:1 measured** (WCAG AA text), ≥ 3:1 for large text and UI components.
- Palette per artifact: 1 primary + 1 accent + neutrals; every accent color has a defined pair with a measured contrast.
- No red/green-only distinctions: any meaning carried by hue also appears in shape, label, or position.

## Spacing

- Scale: multiples of **4 px** (4/8/12/16/24/32/48/64). Halves (2 px) allowed inside glyph counters; anything else = a deviation to score.
- Section rhythm: ≥ 2 consecutive equal gaps between distinct sections is a repeated pattern; 3+ is a rhythm that must be deliberate.

## Type

- One type axis per artifact: 2-3 families max (UI + body; optional mono). Fallback chain recorded for every family (system stack).
- Body size ≥ 12 pt screen / ≥ 10 pt print; line length ≤ 90 chars/measure; line-height ≥ 1.4 body, ≥ 1.2 display.
- Glyph coverage: hangul + latin + digits checked on the actual render; missing glyphs (tofu) = FAIL axis.

## Grid

- Base grid: 12 columns (screen) / 8 columns (print). Margins on the 4 px scale.
- Raster: screen 1920×1080 (144 dpi PDF equivalent 959.98×540 pt), HTML screenshots at 1440 and 1920 widths.
- Overflow: no horizontal scroll at the contract width; print: no content past margins.

## Render evidence standard

- Every channel record includes: engine, input file, output file, dimensions (px or pt+EMU), conversion path, sha256 chain (input → intermediate → raster).
- A ruler/banding comparison against coordinates is the minimum geometric proof (see `channel-pdf.md`).

# Channel: Code (UI layout tokens — inherits api-design)

Input: code with a UI/layout surface (HTML/CSS/JS/TS/component files) plus its token rules. Checks the code against [tokens.md](tokens.md) without running the app.

## Render contract

- Static scan only (no installs, no servers): parse values, not screenshots. Screenshots belong to channel-html.
- Record: files scanned, rule hits (file:line), sha256 of each scanned file.

## Checks

1. **Spacing scale** — layout literals (px/pt values outside 4-scale: 1,2,3,5,6,7,9,10,) flagged as candidates; 4/8/12/16/24 allowed only ≥ thresholds? Rule: any hardcoded gap 1-3 px or odd (5/7/9) px in layout contexts = hit.
2. **Color literals** — hex/rgb values not tied to a named token (CSS custom property / const) = hit; token names must match the artifact's palette.
3. **Type scale** — font-size literals outside the declared axis = hit; family names outside the 2-3 axis entries = hit.
4. **Fallback chains** — every font-family declaration lists a system fallback (no single-family declarations) = requirement.
5. **Evidence** — hits reported file:line; zero hits = clean; every hit is a candidate for review, not a verdict.

## Positive controls

- A planted 6px gap literal must be flagged.
- A planted bare hex color must be flagged; the same value as a named token must NOT be flagged.

## Report

Four blocks: **Changed / Kept / Evidence / Uncovered**. This channel is a scan; it never executes the code and never installs anything.

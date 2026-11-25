---
name: design-omniskill
description: Entry-point design skill for HTML, image, PDF, PPTX, DOCX, and code artifacts — pick the artifact format, then use the channel document for its rubric, render evidence contract, and scorecard. Video is an experimental PoC channel (channel-video.md) with a measurement-only contract — never gate evidence (D4). Use before shipping any designed artifact, after the authoring skill, and before the evidence gates. Not for visual-artist-only images and not a replacement for the PPTX approval gate.
license: MIT
---

# Design OmniSkill (Entry)

**Goal**: One entry point that routes any designed artifact (HTML, image, PDF, PPTX, DOCX, code — video is experimental) to its channel document, and gives every channel the same backbone: tokens, scorecard, render evidence, and a four-block report.

## Trigger

- Authoring/reviewing a designed artifact in HTML, image, PDF, PPTX, DOCX, or UI/code layout.
- Rendering a designed HTML page to video (experimental channel, `channel-video.md`).
- Before shipping a designed artifact or claiming design quality.
- Not for: plain text drafting (document-master/writer-master), PPTX-only flows (ppt-master), interface contracts without visual layout (api-design).

## Route table (progressive disclosure)

| Artifact | Channel | Render evidence contract |
| --- | --- | --- |
| HTML page / deck | `channel-html.md` | chrome headless screenshot, fixed widths, sha recorded |
| Static image | `channel-image.md` (visual-artist scorecard) | pixel measurement (dimensions, contrast, margins) |
| PDF | `channel-pdf.md` | LibreOffice import → PDF → 144 dpi raster with rulers, sha chain |
| PPTX | `channel-pptx.md` (ppt-master + render-diff) | PDF render diff vs approved reference; PPTX gate is never replaced by HTML approval |
| DOCX | `channel-docx.md` (office-master + typography) | print-layout raster check, 1-page typography checks |
| Code with UI layout | `channel-code.md` (api-design + token consistency) | token scan of layout units and naming |
| HTML video render (experimental, PoC) | `channel-video.md` | `scripts/render-video.js` → webm: viewport 1440×900, size + sha256 + duration/fps/codec measured — **D4: artifact + measurement only, never gate evidence** |

## Backbone (every channel)

1. **Tokens first** — read [tokens.md](tokens.md); violations are scored, not debated.
2. **Score** — the channel rubric, 0-5 per axis, every score backed by a measurement or a marked-unverified reason.
3. **Evidence** — render by the channel's contract; record path, size, and sha. A score with no evidence row is FAIL.
4. **Report** — four blocks: **Changed / Kept / Evidence / Uncovered**. All four present; otherwise FAIL.

## Rules

- Evidence is measurement, not preference: contrast, overflow, bleed, glyph fallback, and scale are measured or marked unverified.
- **개선 이력** — 사용 후 스코어카드 차이가 이 규칙·토큰과 어긋나면 그 측정을 `docs/design-cases/` 케이스로 남기고, 같은 이탈이 반복되면 규칙을 승격(승격 시 양성 대조 test-first)한다.
- The PPTX approval gate and the existing render-diff gate stay untouched. A channel pass never substitutes a gate.
- Style review is not verification: a good score does not verify facts, claims, or phase gates.
- Keep the artifact and gates untouched except the artifact under review.
- Cover limits: "could not check" is written as uncovered, never as empty.

## Boundaries

This skill reviews and measures; it does not run third-party installers, does not judge authorship, and does not promise detector results. It is a read-and-render-level design review, not a replacement for a human design lead.

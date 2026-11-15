# Channel: Video (HTML → webm render, experimental PoC)

Status: **experimental PoC** (v1.8.0). Measurement-only contract — this channel produces artifacts and measured values, never a scorecard verdict and never gate evidence (D4). First practice: `docs/practice/design-omniskill-v1.7.0-2026-11-15/`; v1.8.0 practice: `docs/practice/design-omniskill-video-channel-v1.8.0-2026-11-15/`.

Input: a local HTML/CSS artifact (render source) plus a viewport reference screenshot for frame comparison.

## Render contract

- `scripts/render-video.js` — zero npm dependencies in the repo. Playwright is resolved optionally: `PLAYWRIGHT_MODULE` env, `--playwright <module>` flag, or `require.resolve` from the repo root. When absent the script prints a SKIP line and exits 0 (non-gate; it is not part of `tests/run-all.sh`).
- Browser: a system-installed channel, default `msedge`, or `chrome` (`channel` option). No browser download; the exact channel + version is recorded in the report (measured).
- Options: `--page <html> --viewport 1440x900 --duration <s> --out <webm>`. ffmpeg is optional and used only for metadata/PSNR (PATH, `FFMPEG_BIN`, or the ms-playwright cache).
- Record: webm path, size, sha256, duration/fps/codec (measured), viewport, channel+version, playwright version.

## Determinism contract

- Promise: identical stdout metrics for **dimensions, fps, codec** (and the requested duration, as input) across repeated runs on the same host/browser.
- Measured baseline (v1.8.0 practice, 10 runs, Edge 157.0.4341.46 / playwright 1.65.1): variants = 1 for 1440×900, 25 fps, vp9. Measured `duration_s` varied 4.68–5.00 s (container duration lags the nominal wait); size/sha256 varied per run (creation_time differs each run).
- Not promised: byte-identical webm (mux timestamps vary). Do not record byte-diff or duration_s as a pass/fail signal.

## Frame comparison (candidate signal, not a gate)

- Reference must be **viewport-matched** (1440×900 screenshot, not fullPage). The script takes it at t≈0 (`--ref-out`).
- Compare a frame of the recorded webm (extracted via ffmpeg, `--frame-out`, offset `--frame-time`) against the reference; PSNR computed in-repo (zero-dep PNG decode + 8-bit per-channel dB average, ffmpeg `psnr` semantics for rgb24).
- **First-paint variability (measured)**: frame 0 is captured from context creation and may predate the first paint — in v1.8.0 practice one run's frame 0 showed the unpainted background band (dark) while another's matched the reference (PSNR 40.39 dB). Use a stable `--frame-time` (e.g. ≥ 1 s) for the candidate signal; report frame 0 as measured, never silently swapped.
- The PSNR threshold is a documented candidate value (v1.8.0 practice: ≥ 30 dB candidate-pass, set from the measured 40.39 dB stable-frame baseline); it is a signal for review, not a verdict. A low PSNR means "look", never "fail".

## Checks (each measured or marked unverified)

1. **Contract** — webm exists; size + sha256 + duration/fps/codec recorded; viewport matches the render contract.
2. **Determinism** — repeated runs compared on stdout metrics; variants count recorded (byte-diff out of scope).
3. **Frame 0** — PSNR vs viewport-matched reference recorded, or marked unverified (no ffmpeg / no reference).
4. **Limits** — host, browser channel+version, playwright version recorded; anything not run on this host is marked unverified.

## Scorecard

Not defined for the experimental channel (D4). No 0–5 axes. Promotion path: after repeated use, follow the 개선 이력 rule in `SKILL.md` — leave `docs/design-cases/` cases, then define axes + positive controls and graduate to a scored channel with a new decision record.

## Report

Four blocks: **Changed / Kept / Evidence / Uncovered** — every measurement maps to an Evidence row or an Uncovered entry. A video row never substitutes an HTML/PPTX gate verdict; verdicts come only from `scripts/design-channel-check.js`.

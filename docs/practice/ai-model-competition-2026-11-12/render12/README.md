# render12 — v6.1 공식 렌더 (2026-11-14)

- **경로**: PPTX → (LibreOffice 임포트) → PDF → (pdfium) PNG 144dpi (1920×1080)
- **sha 체인**:
  - PPTX `03-deck.pptx`: `b4bb226c5d4ecc79213a8760dcba362a0646a297027aa8a8b86171da1f398b4a`
  - PDF (중간 산출물 `_tmp_pdf/current.pdf`): `82cc86283bbdc07533461c489253961122ec129ed712275d4ad0f14cd7592e80`
  - PDF 페이지 치수: 959.98×540pt × 12p (실측)
- **충실성 검증**: 콘텐츠 밴드 = PPTX 좌표 1:1 (커버: kicker 0.82in · 타이틀 2.20in · 패널 5.06in · 푸터 7.03in) · P1·P3 재실독 0결함
- **배경**: 110dpi office 직접 렌더 경로에 세로 스트레치(위치×144/dpi) 실증 → 시각 게이트 경로를 PDF 144dpi로 전환 (design_spec §10.1)

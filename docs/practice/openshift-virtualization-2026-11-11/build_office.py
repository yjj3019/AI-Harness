# -*- coding: utf-8 -*-
"""Build 04-deck.pptx / 05-report.docx / 06-decision.xlsx for OpenShift Virtualization practice (2026-11-11)."""
import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

BASE = os.path.dirname(os.path.abspath(__file__))

def _txt(slide, x, y, w, h, lines, size=18, color="FFFFFF", bold=False, align="L"):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = True
    for i, (t, b) in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = {"L": PP_ALIGN.LEFT, "C": PP_ALIGN.CENTER, "R": PP_ALIGN.RIGHT}[align]
        r = p.add_run(); r.text = t; r.font.size = Pt(size); r.font.bold = b or bold
        r.font.color.rgb = RGBColor.from_string(color)
    return tb

# ---------------- PPTX (12 slides, 13.333x7.5) ----------------
prs = Presentation()
prs.slide_width = Inches(13.333); prs.slide_height = Inches(7.5)
blank = prs.slide_layouts[6]
def slide():
    return prs.slides.add_slide(blank)

s = slide()
_txt(s, 0.6, 0.8, 12.1, 1.4, [("OpenShift Virtualization — 설계 선택과 검증 실습", True)], size=44, color="1D4ED8")
_txt(s, 0.6, 2.2, 12.1, 1.0, [("기술 의사결정자를 위한 통합 산출물 8종 · 2026-11-11", False)], size=24, color="334155")
_txt(s, 0.6, 3.6, 12.1, 2.8, [
    ("확인(F1·F2): Red Hat 공식 페이지 직접 취득(HTTP 200)", True), ("F3·F4(설계 세부·지원 범위) = 미검증(403 — 재실측 필요)", False),
    ("근거표: 01-facts.md · 모든 산출물이 동일 근거 공유", False)], size=20, color="0F172A")

s = slide()
_txt(s, 0.6, 0.5, 12.1, 1.0, [("1. 근거 실측 현황", True)], size=32, color="1D4ED8")
for i, (n, st) in enumerate([("F1", "확인 — 컨테이너와 함께 VM 마이그레이션·실행·관리(제품 설명)"),
                            ("F2", "확인 — 하이퍼바이저·V·자원 풀링 정의(일반 정의)"),
                            ("F3", "미검증 — 설계 세부(컴포넌트·CRD·마이그레이션) = 403"),
                            ("F4", "미검증 — 버전·지원 범위 = 403"),
                            ("F5", "제안 — 의사결정 축·파이프라인 8단계(가설)")]):
    _txt(s, 0.6, 1.7 + i * 1.05, 12.1, 0.95, [(f"{n} | {st}", True if n in ("F1", "F2") else False)], size=20,
        color="16A34A" if n in ("F1", "F2") else ("B45309" if n == "F5" else "DC2626"))

s = slide()
_txt(s, 0.6, 0.5, 12.1, 1.0, [("2. 통합 운영 개념(개요 — F5 제안)", True)], size=32, color="1D4ED8")
_txt(s, 0.6, 1.7, 12.1, 1.0, [("컨테이너 워크로드        ↔        가상 머신 워크로드        =        공통 운영 체계", True)], size=22, color="0F172A")
_txt(s, 0.6, 3.0, 12.1, 2.6, [
    ("동일 정책 · 동일 검증 게이트 · 근거표 공유(01-facts.md) · 미검증 라벨 유지", False),
    ("'함께 마이그레이션·실행·관리'(F1 확인) 방향 위에 검증 절차를 묶는 프레임", False),
    ("설계 세부(F3)는 미검증 — 본 실습 산출물 어디에도 수치·기능 주장 없음", False)], size=20, color="334155")
_txt(s, 0.6, 6.4, 12.1, 0.8, [("자세한 그림: 03-infographic.svg", False)], size=16, color="64748B")

s = slide()
_txt(s, 0.6, 0.5, 12.1, 1.0, [("3. 의사결정 축(제안 — F5)", True)], size=32, color="1D4ED8")
for i, x in enumerate(["① 워크로드 경계 — 무엇을 VM/컨테이너로", "② 운영 통합 — 인증·로그·백업·네트워크",
                      "③ 검증 방법 — 판정 기준을 관측 가능하게",
                      "④ 마이그레이션 우선순위 — 무엇을 먼저"]):
    _txt(s, 0.6, 1.8 + i * 1.1, 12.1, 1.0, [(x, False)], size=20, color="0F172A")
_txt(s, 0.6, 6.5, 12.1, 0.7, [("수치·기능 주장 아님 — 평가 프레임만(06-decision.xlsx)", False)], size=16, color="64748B")

s = slide()
_txt(s, 0.6, 0.5, 12.1, 1.0, [("4. 파이프라인 8단계 → 산출물 8종 (2026-11-11)", True)], size=32, color="1D4ED8")
pipeline = ["Intake", "Research", "Editorial", "Art", "Production", "Gates", "Improve", "Handoff"]
_txt(s, 0.6, 1.8, 12.1, 1.2, [(" → ".join(pipeline), True)], size=20, color="0F172A")
docs = ["1 근거표", "2 심층 글", "3 인포그래픽", "4 PPTX", "5 DOCX/HWPX", "6 XLSX", "7 PDF", "8 검증 로그"]
_txt(s, 0.6, 3.2, 12.1, 1.2, [("산출물: " + " · ".join(docs), False)], size=20, color="334155")
_txt(s, 0.6, 4.9, 12.1, 1.4, [("HWPX: 생성 도구 부재 → 형식 게이트 'unavailable' 보고(숨김 금지)", False)], size=20, color="B45309")

s = slide()
_txt(s, 0.6, 0.5, 12.1, 1.0, [("5. 형식별 검증 게이트 (ref: format-gate.md)", True)], size=32, color="1D4ED8")
for i, (f, g) in enumerate([("PPTX", "슬라이드 10장(요건 10~12) · 구조 검사 · 렌더(겹침·잘림)"),
                           ("DOCX", "구조 검사 · 목차 · 표 무결성 · 렌더(페이지)"),
                           ("XLSX", "수식 재계산 · 참조 유효 · 캐시 새로고침"),
                           ("PDF", "전 페이지 렌더 · 손상·잘림 0"),
                           ("HWPX", "도구 부재 → unavailable 명시(생성 안 함)")]):
    _txt(s, 0.6, 1.7 + i * 1.02, 12.1, 0.95, [(f + " | " + g, True)], size=19, color="0F172A")

s = slide()
_txt(s, 0.6, 0.5, 12.1, 1.0, [("6. 한계·미수행 명시", True)], size=32, color="1D4ED8")
for i, x in enumerate(["미수행: 설치 · 클러스터 구동 · 기능/성능 실측 · 버전·지원 범위(F4)",
                       "미검증: 설계 세부(F3) — 공식 문서 403 → 별도 세션 재실측",
                       "가정: 의사결정 축·가중치는 제안(F5) — 측정값 아님",
                       "렌더는 LibreOffice 기준 — PowerPoint/한컴과 픽셀 일치 아님"]):
    _txt(s, 0.6, 1.8 + i * 1.15, 12.1, 1.05, [(x, False)], size=20, color="DC2626")

s = slide()
_txt(s, 0.6, 0.5, 12.1, 1.0, [("7. 다음 단계(재실측 체크리스트)", True)], size=32, color="1D4ED8")
for i, x in enumerate(["1) 공식 설계 문서 재실측(접근 경로 교체) → F3·F4 보강", "2) 설치·클러스터 실습(별도 세션) → 기능 검증",
                       "3) 실측값 확보 후 수치·기능 주장 허용", "4) 재구성된 근거로 산출물 v2 갱신·paired 비교"]):
    _txt(s, 0.6, 1.8 + i * 1.15, 12.1, 1.05, [(x, False)], size=20, color="0F172A")

s = slide()
_txt(s, 0.6, 0.5, 12.1, 1.0, [("8. 출처", True)], size=32, color="1D4ED8")
_txt(s, 0.6, 1.9, 12.1, 1.0, [("developers.redhat.com/products/openshift/virtualization", False)], size=20, color="1D4ED8")
_txt(s, 0.6, 2.9, 12.1, 1.0, [("가상화 일반 정의(하이퍼바이저·VM·자원 풀링) — 동일 출처", False)], size=20, color="1D4ED8")
_txt(s, 0.6, 4.2, 12.1, 1.0, [("docs.redhat.com / docs.openshift.com (F3·F4): 403 → 미검증", False)], size=20, color="DC2626")

s = slide()
_txt(s, 0.6, 0.5, 12.1, 1.0, [("요약", True)], size=32, color="1D4ED8")
_txt(s, 0.6, 1.8, 12.1, 3.0, [
    ("확인(F1·F2) 2건 + 미검증(F3·F4) 정직 구분 · 수치 주장 0건", True),
    ("8종 산출물 공유 근거표 → 변환 후에도 수치·도표 의미 불변(게이트)",
     False), ("한계·미수행 명시 · HWPX=unavailable · 2026-11-11", False)], size=22, color="0F172A")
_txt(s, 0.6, 6.6, 12.1, 0.7, [("확인일: 2026-11-11 · 근거: 01-facts.md", False)], size=16, color="64748B")

prs.save(os.path.join(BASE, "04-deck.pptx"))
print("PPTX OK")

# ---------------- DOCX ----------------
from docx import Document
from docx.shared import Pt as DPt, RGBColor as DRGB
from docx.enum.text import WD_ALIGN_PARAGRAPH
doc = Document()
doc.add_heading("OpenShift Virtualization — 설계 선택과 검증 실습 요약", level=0)
doc.add_paragraph("확인일: 2026-11-11 · 근거표: 01-facts.md · 형식 게이트: references/format-gate.md")
doc.add_heading("1. 요약", level=1)
doc.add_paragraph("Red Hat OpenShift Virtualization은 VM을 컨테이너 워크로드와 함께 마이그레이션·실행·관리하도록 돕는 제품으로, 제품 소개가 공식 페이지에서 확인되었다(F1). 가상화는 하이퍼바이저가 물리 하드웨어에 여러 VM을 만들고 자원을 풀링·이동시킬 수 있게 하는 기술이라는 정의(F2)도 같은 출처로 확인되었다. 설계 세부(F3)와 지원 범위(F4)는 공식 문서 접근 제한(HTTP 403)으로 미검증이며, 본 문서는 수치·기능을 주장하지 않는다.")
doc.add_heading("2. 근거표 (요약)", level=1)
t = doc.add_table(rows=1, cols=4); t.style = "Table Grid"
for c, h in zip(t.rows[0].cells, ["#", "내용", "상태", "근거"]):
    c.text = h
for r in [("F1", "컨테이너와 함께 VM 마이그레이션·실행·관리(제품 설명)", "확인", "developers.redhat.com (200)"),
         ("F2", "하이퍼바이저·VM·자원 풀링 정의", "확인", "developers.redhat.com (200)"),
         ("F3", "설계 세부(컴포넌트·CRD·마이그레이션)", "미검증(403)", "docs.redhat.com (403)"),
         ("F4", "버전·지원 범위", "미검증(403)", "docs.redhat.com (403)"),
         ("F5", "의사결정 축·파이프라인 8단계", "제안(가설)", "본 저장소 헌법")]:
    row = t.add_row()
    for c, v in zip(row.cells, r):
        c.text = v
doc.add_heading("3. 산출물 구성", level=1)
doc.add_paragraph("1 근거표 · 2 심층 글 · 3 인포그래픽 · 4 PPTX · 5 본 문서(DOCX) · 6 XLSX · 7 PDF · 8 검증 로그 · HWPX는 도구 부재로 unavailable 보고(생성 안 함).")
doc.add_heading("4. 한계", level=1)
for x in ["설치 · 클러스터 구동 · 기능/성능 실측 미수행(별도 세션)", "F3·F4 미검증 — 재실측 후 수치·기능 주장 허용"]:
    doc.add_paragraph(x, style="List Bullet")
doc.save(os.path.join(BASE, "05-report.docx"))
print("DOCX OK")

# ---------------- XLSX ----------------
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
wb = Workbook()
ws = wb.active; ws.title = "Decision"
ws.append(["기준(의사결정 축)", "가중치", "점수(1-5)", "가중합", "상태"])
rows = [["워크로드 경계(VM vs 컨테이너)", 0.3, None, "=B2*C2", "제안"],
        ["운영 통합 수준(인증·백업·정책)", 0.3, None, "=B3*C3", "제안"],
        ["검증 방법(판정 기준)", 0.25, None, "=B4*C4", "제안"],
        ["마이그레이션 우선순위", 0.15, None, "=B5*C5", "제안"],
        ["합계", "=SUM(B2:B5)", None, "=SUM(D2:D5)", "제안"]]
for r in rows:
    ws.append(r)
for c in ws[1]:
    c.font = Font(bold=True); c.fill = PatternFill("solid", fgColor="DBEAFE")
ws.column_dimensions["A"].width = 42
for col in ["B", "C", "D", "E"]:
    ws.column_dimensions[col].width = 12
wb.save(os.path.join(BASE, "06-decision.xlsx"))
print("XLSX OK")

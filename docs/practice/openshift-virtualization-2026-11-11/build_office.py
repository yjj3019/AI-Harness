# -*- coding: utf-8 -*-
"""OpenShift Virtualization practice (2026-11-11/12) — v3 design build.
v3 = narrative arc + real diagrams + icon system + ghost typography.
Generates 04-deck.pptx (12 slides), 05-report.docx, 06-decision.xlsx.
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn

BASE = os.path.dirname(os.path.abspath(__file__))

NAVY = "0B1F3A"; NAVY2 = "12294A"; BLUE = "2563EB"; BLUE_D = "1B3E6B"; BLUE_L = "DBEAFE"
PURPLE = "7C3AED"; PURPLE_D = "4C1D95"; PURPLE_L = "EDE9FE"
GREEN = "16A34A"; GREEN_D = "14532D"; GREEN_L = "DCFCE7"
AMBER = "F59E0B"; AMBER_D = "92400E"; AMBER_L = "FEF3C7"
RED = "DC2626"; RED_D = "7F1D1D"; RED_L = "FEE2E2"
CARD = "F1F5F9"; WHITE = "FFFFFF"; INK = "0F172A"; SUB = "475569"; MUT = "64748B"
LINE = "E2E8F0"; GHOST = "E4EBF4"; NAVY_TX = "9FB6D4"; NAVY_TX2 = "CFE3FF"
LATIN = "Segoe UI"; EA = "Malgun Gothic"

def C(h): return RGBColor.from_string(h)

def _set_run(r, text, size, color, bold=False, italic=False):
    r.text = text
    f = r.font
    f.size = Pt(size); f.bold = bold; f.italic = italic
    f.color.rgb = C(color); f.name = LATIN
    rPr = r._r.get_or_add_rPr()
    for tag in ("a:ea", "a:cs"):
        el = rPr.find(qn(tag))
        if el is None:
            el = rPr.makeelement(qn(tag), {}); rPr.append(el)
        el.set("typeface", EA)

def tb(slide, x, y, w, h, lines, anchor=MSO_ANCHOR.TOP, wrap=True,
       ml=0.0, mr=0.0, mt=0.0, mb=0.0):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = wrap
    tf.vertical_anchor = anchor
    tf.margin_left = Inches(ml); tf.margin_right = Inches(mr)
    tf.margin_top = Inches(mt); tf.margin_bottom = Inches(mb)
    for i, (t, o) in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = o.get("align", PP_ALIGN.LEFT)
        if o.get("sa"): p.space_after = Pt(o["sa"])
        if o.get("ls"): p.line_spacing = o["ls"]
        _set_run(p.add_run(), t, o.get("size", 16), o.get("color", INK),
                 o.get("bold", False), o.get("italic", False))
    return box

def rect(slide, x, y, w, h, fill, line_color=None, line_w=1.0, rounded=False, radius=0.08):
    shp = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE,
        Inches(x), Inches(y), Inches(w), Inches(h))
    if rounded:
        try: shp.adjustments[0] = radius
        except Exception: pass
    if fill is None:
        shp.fill.background()
    else:
        shp.fill.solid(); shp.fill.fore_color.rgb = C(fill)
    if line_color is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = C(line_color); shp.line.width = Pt(line_w)
    shp.shadow.inherit = False
    return shp

def oval(slide, x, y, w, h, fill, line_color=None, line_w=1.0):
    shp = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(w), Inches(h))
    if fill is None: shp.fill.background()
    else: shp.fill.solid(); shp.fill.fore_color.rgb = C(fill)
    if line_color is None: shp.line.fill.background()
    else: shp.line.color.rgb = C(line_color); shp.line.width = Pt(line_w)
    shp.shadow.inherit = False
    return shp

def shape_text(shp, lines, anchor=MSO_ANCHOR.MIDDLE, ml=0.15, mt=0.05):
    tf = shp.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = Inches(ml); tf.margin_right = Inches(0.12)
    tf.margin_top = Inches(mt); tf.margin_bottom = Inches(0.05)
    for i, (t, o) in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = o.get("align", PP_ALIGN.LEFT)
        if o.get("sa"): p.space_after = Pt(o["sa"])
        if o.get("ls"): p.line_spacing = o["ls"]
        _set_run(p.add_run(), t, o.get("size", 14), o.get("color", INK),
                 o.get("bold", False))

def icon_chip(slide, x, y, d, glyph, bg, fg, size=None):
    o = oval(slide, x, y, d, d, bg)
    shape_text(o, [(glyph, {"size": size or int(d * 26), "color": fg, "bold": True,
                            "align": PP_ALIGN.CENTER})], ml=0.0, mt=0.0)
    return o

def pill(slide, x, y, w, h, text, fg, bg, size=11, bold=True, line_color=None):
    p = rect(slide, x, y, w, h, bg, line_color=line_color, rounded=True, radius=0.5)
    shape_text(p, [(text, {"size": size, "color": fg, "bold": bold, "align": PP_ALIGN.CENTER})], ml=0.02)
    return p

def vm_icon(slide, x, y, color):
    for i in range(3):
        rect(slide, x, y + i * 0.24, 0.52, 0.17, color, rounded=True, radius=0.3)

def ct_icon(slide, x, y, color):
    rect(slide, x, y + 0.18, 0.42, 0.26, color, rounded=True, radius=0.25)
    rect(slide, x + 0.12, y, 0.42, 0.26, color, rounded=True, radius=0.25)

SW, SH = 13.333, 7.5
META = "OpenShift Virtualization 실습 · 2026-11-11 · 근거: 01-facts.md"

def header(slide, kicker, title, n):
    rect(slide, 0.6, 0.46, 0.11, 0.11, BLUE)
    tb(slide, 0.8, 0.4, 9.0, 0.3, [(kicker, {"size": 11, "color": MUT, "bold": True})])
    tb(slide, 0.6, 0.66, 10.5, 0.7, [(title, {"size": 27, "color": INK, "bold": True})])
    rect(slide, 0.62, 1.4, 0.5, 0.05, BLUE)
    tb(slide, 10.2, 0.12, 2.5, 1.3, [("%02d" % n, {"size": 84, "color": GHOST, "bold": True, "align": PP_ALIGN.RIGHT})])
    rect(slide, 0.6, 7.06, 12.13, 0.012, LINE)
    tb(slide, 0.6, 7.12, 8.0, 0.3, [(META, {"size": 9, "color": MUT})])
    tb(slide, 11.6, 7.12, 1.13, 0.3, [("%02d / 12" % n, {"size": 9, "color": MUT, "align": PP_ALIGN.RIGHT})])

prs = Presentation()
prs.slide_width = Inches(SW); prs.slide_height = Inches(SH)
blank = prs.slide_layouts[6]
def new_slide(bg=WHITE):
    s = prs.slides.add_slide(blank)
    if bg: rect(s, 0, 0, SW, SH, bg)
    return s

# ===== S1 cover =====
s = new_slide(NAVY)
rect(s, 9.55, 0, 3.78, SH, NAVY2)
rect(s, 9.55, 0, 0.02, SH, BLUE)
rect(s, 0, 0, SW, 0.1, BLUE)
tb(s, 0.9, 1.05, 11.0, 0.4, [("TECH DECISION BRIEF · 2026-11-11", {"size": 13, "color": NAVY_TX, "bold": True})])
tb(s, 0.85, 1.55, 8.5, 1.6, [("OpenShift", {"size": 58, "color": WHITE, "bold": True}),
                             ("Virtualization", {"size": 58, "color": WHITE, "bold": True})])
tb(s, 0.9, 3.5, 8.3, 0.5, [("가상 머신과 컨테이너의 공존 — 설계 선택과 검증 실습", {"size": 20, "color": NAVY_TX2})])
rect(s, 0.92, 4.28, 0.7, 0.06, BLUE)
pills = [
    (0.9, "✓", GREEN, "확인 2 — F1·F2", "86EFAC", 2.75),
    (3.85, "!", RED, "미검증 2 — F3·F4 (403)", "FCA5A5", 3.1),
    (7.05, "?", AMBER, "제안 1 — F5", "FCD34D", 2.4),
]
for x, g, col, txt, fg, w in pills:
    rect(s, x, 4.75, w, 0.6, "0E2A45", line_color="24466B", line_w=1, rounded=True, radius=0.5)
    icon_chip(s, x + 0.17, 4.89, 0.32, g, col, "FFFFFF", size=14)
    tb(s, x + 0.58, 4.75, w - 0.7, 0.6, [(txt, {"size": 12, "color": fg, "bold": True})], anchor=MSO_ANCHOR.MIDDLE)
tb(s, 0.9, 6.55, 8.3, 0.4, [("통합 산출물 8종 · 구조·렌더·재계산 검증 (08-verification-log.md)", {"size": 11.5, "color": NAVY_TX})])
tb(s, 9.95, 2.2, 3.0, 1.2, [("8", {"size": 88, "color": NAVY_TX2, "bold": True, "align": PP_ALIGN.CENTER})])
tb(s, 9.95, 3.55, 3.0, 0.4, [("산출물 (종)", {"size": 14, "color": NAVY_TX, "bold": True, "align": PP_ALIGN.CENTER})])
rect(s, 10.35, 4.15, 2.2, 0.02, "24466B")
tb(s, 9.95, 4.4, 3.0, 1.6, [
    ("근거  01-facts.md", {"size": 11, "color": NAVY_TX, "align": PP_ALIGN.CENTER, "sa": 6}),
    ("검증  08-verification-log.md", {"size": 11, "color": NAVY_TX, "align": PP_ALIGN.CENTER, "sa": 6}),
    ("형식 게이트  format-gate.md", {"size": 11, "color": NAVY_TX, "align": PP_ALIGN.CENTER}),
])

# ===== S2 the decision =====
s = new_slide(); header(s, "01 · 질문 (QUESTION)", "내려야 할 결정 — 분리, 아니면 공존?", 2)
tb(s, 0.6, 1.75, 6.4, 0.9, [
    ("레거시 VM과 새 컨테이너 서비스를", {"size": 17, "color": INK, "bold": True}),
    ("플랫폼을 나눠서 돌릴 것인가, 하나로 합칠 것인가.", {"size": 17, "color": INK, "bold": True}),
])
sc = rect(s, 0.6, 2.75, 6.4, 1.75, AMBER_L, rounded=True, radius=0.07)
rect(s, 0.6, 2.75, 0.09, 1.75, AMBER)
shape_text(sc, [
    ("예시 (가설 — 사실 아님)", {"size": 11, "color": AMBER_D, "bold": True, "sa": 4}),
    ("레거시 VM 40대 · 컨테이너 서비스 30개 · 운영 팀 1개. 분리하면 도구·정책·당직이 ×2. 공존하면 한 플랫폼이지만 — 경계를 근거로 결정해야 한다.", {"size": 12.5, "color": INK, "ls": 1.3}),
], ml=0.22, mt=0.14)
tb(s, 0.6, 4.55, 6.4, 0.4, [("이 덱이 답하는 것", {"size": 13.5, "color": INK, "bold": True})])
ans = [
    ("✓", GREEN, "근거 현황 — 무엇을 확인했고, 무엇이 미검증인가 (F1~F5)"),
    ("?", AMBER, "결정 프레임 — 4개 축 + 가중치 채점 (제안)"),
    ("✓", GREEN, "검증 계획 — 형식별 게이트와 남은 한계"),
]
for i, (g, col, txt) in enumerate(ans):
    y = 5.0 + i * 0.5
    icon_chip(s, 0.62, y + 0.04, 0.3, g, col, "FFFFFF", size=13)
    tb(s, 1.05, y, 5.95, 0.48, [(txt, {"size": 12.5, "color": SUB})], anchor=MSO_ANCHOR.MIDDLE)
tb(s, 7.4, 1.75, 5.3, 0.4, [("그 결정은 3개의 질문에 있다", {"size": 13.5, "color": INK, "bold": True})])
for i, (n, t, d) in enumerate([("1", "경계", "무엇을 VM으로, 무엇을 컨테이너로"),
                               ("2", "통합", "운영 체계를 어디까지 하나로"),
                               ("3", "검증", "통과/실패를 어떻게 관측할 것인가")]):
    y = 2.25 + i * 1.12
    card = rect(s, 7.4, y, 5.33, 0.98, WHITE, line_color=LINE, line_w=1.2, rounded=True, radius=0.1)
    icon_chip(s, 7.62, y + 0.27, 0.44, n, NAVY, "FFFFFF", size=16)
    tb(s, 8.25, y + 0.12, 1.4, 0.7, [(t, {"size": 16, "color": INK, "bold": True})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 9.65, y + 0.12, 2.95, 0.7, [(d, {"size": 11, "color": SUB, "ls": 1.15})], anchor=MSO_ANCHOR.MIDDLE)
strip = rect(s, 0.6, 6.55, 12.13, 0.5, NAVY, rounded=True, radius=0.14)
shape_text(strip, [("이 덱에는 수치가 없다 — 수치는 실측값 + 확인일 + 출처 + 재현 방법이 함께 있을 때만 등장한다.", {"size": 12.5, "color": WHITE, "bold": True, "align": PP_ALIGN.CENTER})], ml=0.2)

# ===== S3 evidence =====
s = new_slide(); header(s, "02 · 근거 (EVIDENCE)", "근거 실측 현황 (2026-11-11 취득)", 3)
ev = [("F1", "확인", GREEN, GREEN_L, "컨테이너(모던) 워크로드와 함께 VM을 마이그레이션·실행·관리 — 제품 설명", "developers.redhat.com · HTTP 200"),
      ("F2", "확인", GREEN, GREEN_L, "하이퍼바이저가 물리 하드웨어에 여러 VM 생성 · 자원 풀링·이동 — 가상화 일반 정의", "developers.redhat.com · HTTP 200"),
      ("F3", "미검증", RED, RED_L, "설계 세부 (컴포넌트 구성 · 특정 API · 라이브 마이그레이션 동작)", "docs.redhat.com · HTTP 403 → 재실측 필요"),
      ("F4", "미검증", RED, RED_L, "지원 범위 (버전 · 플랫폼)", "docs.redhat.com · HTTP 403 → 재실측 필요"),
      ("F5", "제안", AMBER, AMBER_L, "의사결정 4축 · 파이프라인 8단계 — 본 저장소 헌법 기반 프레임 (측정값 아님)", "본 저장소 AGENTS.md")]
for i, (fid, st, acc, bgc, desc, src) in enumerate(ev):
    y = 1.8 + i * 1.02
    rect(s, 0.6, y, 12.13, 0.9, CARD, rounded=True, radius=0.12)
    rect(s, 0.6, y, 0.09, 0.9, acc)
    tb(s, 0.85, y, 0.8, 0.9, [(fid, {"size": 22, "color": INK, "bold": True})], anchor=MSO_ANCHOR.MIDDLE)
    g = {"확인": "✓", "미검증": "!", "제안": "?"}[st]
    pill(s, 1.75, y + 0.24, 1.35, 0.42, g + " " + st, acc if st != "제안" else AMBER_D, bgc, size=11)
    tb(s, 3.4, y, 5.85, 0.9, [(desc, {"size": 13.5, "color": INK, "ls": 1.1})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 9.35, y, 3.25, 0.9, [(src, {"size": 10.5, "color": MUT})], anchor=MSO_ANCHOR.MIDDLE)

# ===== S4 concept diagram =====
s = new_slide(); header(s, "03 · 개념 (CONCEPT)", "통합 운영 개념 — 한 플랫폼, 두 워크로드, 한 운영", 4)
lane_y, lane_h = 1.72, 2.15
rect(s, 0.6, lane_y, 5.9, lane_h, WHITE, line_color=PURPLE, line_w=1.75, rounded=True, radius=0.05)
rect(s, 0.6, lane_y, 0.09, lane_h, PURPLE)
vm_icon(s, 0.95, lane_y + 0.32, PURPLE)
tb(s, 1.65, lane_y + 0.2, 4.5, 0.5, [("가상 머신 워크로드", {"size": 18, "color": INK, "bold": True})])
for j, ch in enumerate(["기존 VM (레거시)", "컨테이너화 어려운 앱"]):
    cb = rect(s, 1.65 + j * 2.35, lane_y + 0.78, 2.25, 0.5, PURPLE_L, rounded=True, radius=0.2)
    shape_text(cb, [(ch, {"size": 11.5, "color": PURPLE_D, "bold": True, "align": PP_ALIGN.CENTER})])
tb(s, 0.95, lane_y + 1.5, 5.2, 0.5, [("하이퍼바이저 기반 가상화 (정의 F2)", {"size": 11.5, "color": SUB})])
oval(s, 6.02, lane_y + 0.14, 0.14, 0.14, RED)
tb(s, 5.0, lane_y + 0.06, 1.35, 0.3, [("F3 미검증", {"size": 9, "color": RED_D, "align": PP_ALIGN.RIGHT})])
rect(s, 6.83, lane_y, 5.9, lane_h, WHITE, line_color=BLUE, line_w=1.75, rounded=True, radius=0.05)
rect(s, 6.83, lane_y, 0.09, lane_h, BLUE)
ct_icon(s, 7.18, lane_y + 0.3, BLUE)
tb(s, 7.88, lane_y + 0.2, 4.5, 0.5, [("컨테이너 워크로드", {"size": 18, "color": INK, "bold": True})])
for j, ch in enumerate(["마이크로서비스", "클라우드 네이티브 앱"]):
    cb = rect(s, 7.88 + j * 2.35, lane_y + 0.78, 2.25, 0.5, BLUE_L, rounded=True, radius=0.2)
    shape_text(cb, [(ch, {"size": 11.5, "color": BLUE_D, "bold": True, "align": PP_ALIGN.CENTER})])
tb(s, 7.18, lane_y + 1.5, 5.2, 0.5, [("→ 함께 마이그레이션·실행·관리 (확인 F1)", {"size": 11.5, "color": SUB})])
oval(s, 12.25, lane_y + 0.14, 0.14, 0.14, GREEN)
tb(s, 11.55, lane_y + 0.06, 0.7, 0.3, [("F1 확인", {"size": 9, "color": GREEN_D, "align": PP_ALIGN.RIGHT})])
for ax in (3.29, 9.52):
    ar = s.shapes.add_shape(MSO_SHAPE.DOWN_ARROW, Inches(ax), Inches(4.0), Inches(0.34), Inches(0.48))
    ar.fill.solid(); ar.fill.fore_color.rgb = C("5B7FA6"); ar.line.fill.background(); ar.shadow.inherit = False
pb = rect(s, 0.6, 4.62, 12.13, 0.8, NAVY, rounded=True, radius=0.1)
icon_chip(s, 0.85, 4.79, 0.46, "✓", GREEN, "FFFFFF", size=18)
shape_text(pb, [("한 플랫폼 — VM과 컨테이너의 공존 (확인 F1 방향)", {"size": 16, "color": WHITE, "bold": True, "align": PP_ALIGN.CENTER})], ml=0.5)
band = rect(s, 0.6, 5.62, 12.13, 1.02, AMBER, rounded=True, radius=0.09)
tb(s, 0.95, 5.74, 6.5, 0.4, [("공통 운영 체계 — 제안 축 (F5)", {"size": 14.5, "color": AMBER_D, "bold": True})])
for j, ch in enumerate(["동일 정책", "검증 게이트", "근거표 공유", "미검증 라벨"]):
    cb = rect(s, 0.95 + j * 2.95, 6.14, 2.75, 0.4, "FFFBEB", line_color=AMBER, line_w=0.75, rounded=True, radius=0.3)
    shape_text(cb, [(ch, {"size": 10.5, "color": AMBER_D, "bold": True, "align": PP_ALIGN.CENTER})])
tb(s, 0.6, 6.78, 12.13, 0.3, [("개념 개요 (제안 F5) — 상세 도해: 03-infographic.svg · 설계 세부(F3)는 미검증(403 → 재실측 필요)", {"size": 10.5, "color": MUT})])

# ===== S5 background + tradeoff =====
s = new_slide(); header(s, "04 · 배경 (BACKGROUND)", "VM vs 컨테이너 — 일반 지식, 제품 사양 아님", 5)
rect(s, 0.6, 1.72, 5.9, 1.6, WHITE, line_color=PURPLE, line_w=1.5, rounded=True, radius=0.06)
vm_icon(s, 0.92, 1.98, PURPLE)
tb(s, 1.65, 1.86, 4.7, 0.4, [("VM (가상 머신)", {"size": 15, "color": INK, "bold": True})])
tb(s, 0.95, 2.78, 5.3, 0.5, [("하드웨어를 가상화해 각 VM이 독립된 운영체계를 가진다 — 격리는 강하고, 시작은 느리고, 밀도는 낮다.", {"size": 11.5, "color": SUB, "ls": 1.2})])
rect(s, 6.83, 1.72, 5.9, 1.6, WHITE, line_color=BLUE, line_w=1.5, rounded=True, radius=0.06)
ct_icon(s, 7.15, 1.96, BLUE)
tb(s, 7.88, 1.86, 4.7, 0.4, [("컨테이너", {"size": 15, "color": INK, "bold": True})])
tb(s, 7.18, 2.55, 5.3, 0.7, [("운영체계를 공유하고 애플리케이션만 격리한다 — 격리는 가볍고, 시작은 빠르고, 밀도는 높다.", {"size": 11.5, "color": SUB, "ls": 1.2})])
trows = [("차원 (일반 지식)", "VM (가상 머신)", "컨테이너"),
         ("격리 수준", "하드웨어 가상화 — 격리 강함", "OS 공유 — 격리 가볍고 빠름"),
         ("시작 · 밀도", "부팅 느림 · 단위 서버당 밀도 낮음", "초기화 빠름 · 고밀도 실행"),
         ("상태 · 의존성", "OS 포함 — 레거시 의존성 그대로", "앱만 — 의존성 현대화 필요"),
         ("이동성", "VM 이미지 단위 (볼륨 크고 무거움)", "이미지 단위 — 레지스트리 배포")]
ty = 3.55
for ri, row in enumerate(trows):
    rh = 0.5
    widths = [2.3, 4.9, 4.93]
    cx = 0.6
    for ci in range(3):
        if ri == 0: fc, tc_, bd = NAVY, WHITE, True
        else: fc, tc_, bd = (CARD if ri % 2 else WHITE), INK, False
        rect(s, cx, ty, widths[ci], rh, fc, line_color=LINE, line_w=0.75)
        tb(s, cx + 0.15, ty, widths[ci] - 0.25, rh,
           [(row[ci], {"size": 11, "color": tc_, "bold": bd or ci == 0, "align": PP_ALIGN.LEFT})], anchor=MSO_ANCHOR.MIDDLE)
        cx += widths[ci]
    ty += rh
strip = rect(s, 0.6, 6.15, 12.13, 0.62, AMBER_L, rounded=True, radius=0.14)
shape_text(strip, [("※ 일반 배경 지식(교육용) — OpenShift Virtualization의 특정 기능·숫자가 아님. 제품 주장은 F1·F2 확인 범위까지.", {"size": 11.5, "color": AMBER_D, "bold": True, "align": PP_ALIGN.CENTER})], ml=0.2)

# ===== S6 decision axes =====
s = new_slide(); header(s, "05 · 결정 (DECISION)", "의사결정 4개 축 (제안 F5 — 판단의 틀)", 6)
axes = [
    ("1", "워크로드 경계", ["어느 VM을 남기고, 무엇을 컨테이너로?", "의존성·라이선스·레거시 미들웨어 제약은?", "컨테이너화할 팀 역량은 충분한가?"], PURPLE),
    ("2", "운영 통합 수준", ["인증·로그·백업·네트워크를 얼마나 하나로?", "통합 1점당 검증 범위가 커지는가?", "단계적 통합 로드맵은 있는가?"], BLUE),
    ("3", "검증 방법", ["통과/실패 기준을 관측 가능하게 쓸 수 있나?", "측정 전 점수를 보고하지 않는가?", "근거(날짜·출처)가 모든 주장에 붙는가?"], GREEN),
    ("4", "마이그레이션 우선순위", ["낮은 위험 + 높은 가치부터인가?", "가장 어려운 것은 검증 인프라 완성 후로?", "회귀(rollback) 경로가 있는가?"], AMBER),
]
for i, (num, t, qs, acc) in enumerate(axes):
    x = 0.6 + (i % 2) * 6.22
    y = 1.78 + (i // 2) * 2.52
    card = rect(s, x, y, 5.9, 2.34, WHITE, line_color=LINE, line_w=1.25, rounded=True, radius=0.05)
    rect(s, x, y, 0.09, 2.34, acc)
    icon_chip(s, x + 0.26, y + 0.22, 0.46, num, acc, "FFFFFF", size=17)
    tb(s, x + 0.88, y + 0.2, 4.8, 0.5, [(t, {"size": 17, "color": INK, "bold": True})])
    lines = [(q, {"size": 12, "color": SUB, "sa": 5, "ls": 1.1}) for q in qs]
    tb(s, x + 0.3, y + 0.85, 5.35, 1.4, lines)

# ===== S7 worked example =====
s = new_slide(); header(s, "06 · 결정 (DECISION)", "XLSX 채점 구조 + 예시 (06-decision.xlsx)", 7)
rows = [("기준 (의사결정 축)", "가중치", "점수 (1~5)", "가중합", "상태"),
        ("워크로드 경계 (VM vs 컨테이너)", "0.30", "3 *", "0.90", "제안"),
        ("운영 통합 수준 (인증·백업·정책)", "0.30", "4 *", "1.20", "제안"),
        ("검증 방법 (판정 기준 관측 가능성)", "0.25", "4 *", "1.00", "제안"),
        ("마이그레이션 우선순위", "0.15", "3 *", "0.45", "제안"),
        ("합계", "= 1.00", "—", "= 3.55 *", "제안")]
ty = 1.85
for ri, row in enumerate(rows):
    rh = 0.6
    colw = [4.9, 1.5, 1.7, 1.6, 1.5]
    cx = 0.6
    for ci, cell in enumerate(row):
        if ri == 0: fc, tc_, bd = NAVY, WHITE, True
        elif ri == 5: fc, tc_, bd = BLUE_L, BLUE_D, True
        else: fc, tc_, bd = (CARD if ri % 2 else WHITE), INK, False
        if ci == 4 and ri > 0: tc_ = AMBER_D
        rect(s, cx, ty, colw[ci], rh, fc, line_color=LINE, line_w=0.75)
        align = PP_ALIGN.LEFT if ci == 0 else PP_ALIGN.CENTER
        tb(s, cx + (0.15 if ci == 0 else 0.02), ty, colw[ci] - 0.2, rh,
           [(cell, {"size": 12.5 if ri else 12, "color": tc_, "bold": bd, "align": align})], anchor=MSO_ANCHOR.MIDDLE)
        cx += colw[ci]
    ty += rh
tb(s, 0.6, ty + 0.1, 11.2, 0.35, [("* 점수 3·4·4·3 = 예시 — 실제 채점은 결정자가 입력 (수식은 자동 합산). 가중치 합 1.0 검증됨.", {"size": 11, "color": MUT, "italic": True})])
tb(s, 0.6, ty + 0.5, 8.9, 1.0, [
    ("읽는 법: 가중합이 큰 축이 '먼저 답해야 할 질문'이다.", {"size": 13, "color": INK, "bold": True, "sa": 5}),
    ("예시에서 운영 통합(1.20)·검증 방법(1.00)이 상위에 오르면, 그 두 축의 질문을 먼저 관측 가능한 판정 기준으로 설계해야 한다는 뜻이다.", {"size": 12, "color": SUB, "ls": 1.25}),
])
rc = rect(s, 9.85, ty + 0.5, 2.88, 1.0, CARD, rounded=True, radius=0.08)
shape_text(rc, [
    ("사용 규칙", {"size": 12, "color": INK, "bold": True, "sa": 3}),
    ("· 가중치 합 = 1.0 (검증됨) · 점수 1~5", {"size": 10.5, "color": SUB, "sa": 2}),
    ("· 제안 프레임 — 측정값 아님", {"size": 10.5, "color": AMBER_D}),
], ml=0.15, mt=0.1)

# ===== S8 pipeline =====
s = new_slide(); header(s, "07 · 프로세스 (PROCESS)", "8단계 파이프라인 → 산출물 8종", 8)
for i, st in enumerate(["Intake", "Research", "Editorial", "Art", "Production", "Gates", "Improve", "Handoff"]):
    x = 0.6 + i * 1.56
    ch = rect(s, x, 1.95, 1.42, 0.62, NAVY if i < 6 else BLUE, rounded=True, radius=0.16)
    shape_text(ch, [(st, {"size": 12.5, "color": WHITE, "bold": True, "align": PP_ALIGN.CENTER})])
    if i < 7:
        ar = s.shapes.add_shape(MSO_SHAPE.CHEVRON, Inches(x + 1.43), Inches(2.11), Inches(0.14), Inches(0.3))
        ar.fill.solid(); ar.fill.fore_color.rgb = C("5B7FA6"); ar.line.fill.background(); ar.shadow.inherit = False
tb(s, 0.6, 2.9, 12.0, 0.4, [("산출물 (이 실습의 8종)", {"size": 15, "color": INK, "bold": True})])
for i, a in enumerate(["1 근거표", "2 심층 글", "3 인포그래픽", "4 PPTX", "5 DOCX", "6 XLSX", "7 PDF", "8 검증 로그"]):
    x = 0.6 + i * 1.56
    ch = rect(s, x, 3.4, 1.42, 0.62, CARD, line_color=LINE, line_w=1, rounded=True, radius=0.16)
    shape_text(ch, [(a, {"size": 11.5, "color": SUB, "bold": True, "align": PP_ALIGN.CENTER})])
pill(s, 0.6, 4.45, 3.6, 0.5, "HWPX → unavailable (도구 부재 · 명시)", RED, RED_L, size=11)
tb(s, 0.6, 5.25, 12.1, 1.4, [
    ("각 단계의 산출물은 같은 근거표(01-facts.md)를 읽는다.", {"size": 13, "color": INK, "bold": True, "sa": 5}),
    ("따라서 어느 형식으로 변환해도 수치·주장의 의미가 변하지 않는다 (형식 게이트 '변환 의미 불변').", {"size": 12, "color": SUB, "ls": 1.25}),
])

# ===== S9 gates =====
s = new_slide(); header(s, "08 · 검증 (GATES)", "형식별 검증 게이트 + 이번 실행 결과", 9)
grows = [("PPTX", "12슬라이드 (요구 10~12) · 구조 검사 · 전 슬라이드 렌더(겹침·잘림 0)", "PASS"),
         ("DOCX", "구조 검사 · 표 무결성 · 전 페이지 렌더 (스타일링)", "PASS"),
         ("XLSX", "수식 재계산 · 3시트 · 가중치 합 1.0 확인", "PASS"),
         ("PDF", "변환 성공 · 헤더 %PDF 검증 · 원본 DOCX 렌더 기준", "PASS"),
         ("HWPX", "생성 도구 부재 → unavailable 명시 (생성 안 함)", "unavailable")]
ty = 1.85
for ri, (fmt, gate, res) in enumerate(grows):
    rh = 0.78
    widths = [1.3, 7.4, 3.43]
    cx = 0.6
    vals = [fmt, gate, res]
    for ci in range(3):
        fc = WHITE if ri % 2 else CARD
        tc_ = INK if ci < 2 else (GREEN_D if res == "PASS" else RED)
        rect(s, cx, ty, widths[ci], rh, fc, line_color=LINE, line_w=0.75)
        align = PP_ALIGN.LEFT if ci in (0, 1) else PP_ALIGN.CENTER
        tb(s, cx + (0.18 if ci < 2 else 0.05), ty, widths[ci] - 0.25, rh,
           [(vals[ci], {"size": 13 if ci < 2 else 13.5, "color": tc_, "bold": True, "align": align})], anchor=MSO_ANCHOR.MIDDLE)
        cx += widths[ci]
    ty += rh
tb(s, 0.6, ty + 0.1, 12.1, 0.6, [("검증 도구: LibreOffice Kit (구조 검사 · 렌더 · 재계산 · 변환) — 전 결과: 08-verification-log.md", {"size": 11, "color": MUT})])

# ===== S10 limits =====
s = new_slide(); header(s, "09 · 한계 (LIMITS)", "한계와 미수행 — 정직하게", 10)
lims = [
    ("설치·클러스터 구동·기능/성능 실측", "미수행 — 별도 세션의 재실측 체크리스트로 이관"),
    ("설계 세부 (F3) · 지원 범위 (F4)", "공식 문서 HTTP 403 — 미검증 라벨 유지, 재실측 필요"),
    ("수치·기능 주장", "0건 — 측정값·확인일·출처·재현 방법이 함께 올 때만 허용"),
    ("HWPX 산출물", "생성 도구 부재 — unavailable으로 보고 (숨기지 않음)"),
    ("렌더 기준", "LibreOffice 기준 — PowerPoint·한컴오피스와의 픽셀 일치 보장 아님"),
]
for i, (t, d) in enumerate(lims):
    y = 1.85 + i * 0.95
    rect(s, 0.6, y, 12.13, 0.82, WHITE, line_color=LINE, line_w=1.2, rounded=True, radius=0.1)
    rect(s, 0.6, y, 0.09, 0.82, RED)
    tb(s, 0.9, y, 4.6, 0.82, [(t, {"size": 14, "color": INK, "bold": True})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 5.7, y, 6.9, 0.82, [(d, {"size": 12.5, "color": SUB})], anchor=MSO_ANCHOR.MIDDLE)

# ===== S11 next steps =====
s = new_slide(); header(s, "10 · 다음 단계 (NEXT)", "재실측 체크리스트 (별도 세션)", 11)
for i, (n, t, d) in enumerate([
    ("1", "공식 설계 문서 재실측", "접근 경로 교체로 docs 재취득 → F3·F4를 확인/미검증으로 재분류"),
    ("2", "설치·클러스터 실습", "별도 세션에서 VM/컨테이너 공존 실행 → 기능 검증 (성능 벤치는 명시된 조건과 함께)"),
    ("3", "수치·기능 주장 허용", "실측값 + 확인일 + 출처 + 재현 방법이 함께 있을 때만 산출물에 진입"),
    ("4", "산출물 v2 갱신", "재구성된 근거표로 8종 재생성 → 이전 버전과 paired 비교")]):
    y = 1.9 + i * 1.18
    rect(s, 0.6, y, 12.13, 1.0, CARD, rounded=True, radius=0.1)
    icon_chip(s, 0.85, y + 0.22, 0.56, n, BLUE, "FFFFFF", size=18)
    tb(s, 1.75, y, 4.3, 1.0, [(t, {"size": 15.5, "color": INK, "bold": True})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 6.1, y, 6.5, 1.0, [(d, {"size": 12, "color": SUB, "ls": 1.2})], anchor=MSO_ANCHOR.MIDDLE)

# ===== S12 closing =====
s = new_slide(NAVY)
rect(s, 0, 0, SW, SH, NAVY)
rect(s, 0, 0, SW, 0.1, BLUE)
rect(s, 0, 7.4, SW, 0.1, BLUE)
tb(s, 0.9, 0.85, 11.5, 0.4, [("11 · 출처 (SOURCES) · 마무리", {"size": 13, "color": NAVY_TX, "bold": True})])
for i, (src, st, col, g, gc) in enumerate([
    ("developers.redhat.com/products/openshift/virtualization", "확인 — F1·F2 (HTTP 200, 2026-11-11)", "86EFAC", "✓", GREEN),
    ("docs.redhat.com · docs.openshift.com (설계 문서)", "미검증 — F3·F4 (HTTP 403 → 재실측 필요)", "FCA5A5", "!", RED),
    ("본 저장소 AGENTS.md (evidence-first · 형식 게이트)", "제안 프레임 — F5", "FCD34D", "?", AMBER)]):
    y = 1.65 + i * 0.88
    rect(s, 0.9, y, 11.5, 0.72, "0E2A45", line_color="24466B", line_w=1, rounded=True, radius=0.12)
    icon_chip(s, 1.12, y + 0.18, 0.36, g, gc, "FFFFFF", size=15)
    tb(s, 1.65, y, 6.4, 0.72, [(src, {"size": 12.5, "color": NAVY_TX2})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 8.0, y, 4.2, 0.72, [(st, {"size": 11.5, "color": col, "bold": True})], anchor=MSO_ANCHOR.MIDDLE)
rect(s, 0.92, 4.5, 0.7, 0.06, BLUE)
tb(s, 0.9, 4.8, 11.5, 1.3, [("확인일 2026-11-11 · 근거 없는 수치 0 · 미검증은 미검증으로.", {"size": 25, "color": WHITE, "bold": True, "ls": 1.25})])
tb(s, 0.9, 6.4, 11.5, 0.4, [("근거표: 01-facts.md · 검증 로그: 08-verification-log.md · 산출물 8종 (HWPX: unavailable)", {"size": 11.5, "color": NAVY_TX})])

prs.save(os.path.join(BASE, "04-deck.pptx"))
print("PPTX OK slides=12")

# ---------------- DOCX v3 ----------------
from docx import Document
from docx.shared import Pt as DPt, RGBColor as DRGB
from docx.oxml import OxmlElement
from docx.oxml.ns import qn as wqn

def dshade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd"); shd.set(wqn("w:val"), "clear"); shd.set(wqn("w:fill"), hexcolor)
    tcPr.append(shd)

def dset(r, text, size=10.5, color=INK, bold=False, italic=False):
    r.text = text
    r.font.size = DPt(size); r.font.bold = bold; r.font.italic = italic
    r.font.color.rgb = DRGB.from_string(color)
    r.font.name = LATIN
    rPr = r._element.get_or_add_rPr()
    rf = rPr.find(wqn("w:rFonts"))
    if rf is None:
        rf = OxmlElement("w:rFonts"); rPr.append(rf)
    rf.set(wqn("w:eastAsia"), EA); rf.set(wqn("w:ascii"), LATIN); rf.set(wqn("w:hAnsi"), LATIN)

def dhead(doc, text, level=1):
    p = doc.add_heading("", level=level)
    dset(p.add_run(), text, size=15 if level == 1 else 12.5, color=NAVY if level == 1 else BLUE_D, bold=True)
    return p

def ddiv(doc):
    p = doc.add_paragraph()
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr"); bottom = OxmlElement("w:bottom")
    bottom.set(wqn("w:val"), "single"); bottom.set(wqn("w:sz"), "12"); bottom.set(wqn("w:color"), BLUE)
    pBdr.append(bottom); pPr.append(pBdr)

doc = Document()
for sec in doc.sections:
    sec.top_margin = Inches(0.8); sec.bottom_margin = Inches(0.8)
    sec.left_margin = Inches(0.9); sec.right_margin = Inches(0.9)

cov = doc.add_table(rows=1, cols=1)
covcell = cov.rows[0].cells[0]
dshade(covcell, NAVY)
p = covcell.paragraphs[0]
dset(p.add_run(), "TECH DECISION BRIEF · 2026-11-11", size=9, color=NAVY_TX, bold=True)
p = covcell.add_paragraph()
dset(p.add_run(), "OpenShift Virtualization", size=24, color=WHITE, bold=True)
p = covcell.add_paragraph()
dset(p.add_run(), "가상 머신과 컨테이너의 공존 — 설계 선택과 검증 실습 요약", size=13, color=NAVY_TX2)
p = covcell.add_paragraph()
dset(p.add_run(), "확인 2 (F1·F2) · 미검증 2 (F3·F4, 403) · 제안 1 (F5)  |  산출물 8종 · HWPX: unavailable", size=9, color=NAVY_TX)
doc.add_paragraph()
ddiv(doc)

dhead(doc, "1. 요약")
p = doc.add_paragraph()
dset(p.add_run(), "레거시 VM과 컨테이너 서비스를 나눠서 돌릴 것인가, 하나로 합칠 것인가 — 이 문서의 출발점이다. Red Hat OpenShift Virtualization은 VM을 컨테이너(모던) 워크로드와 함께 마이그레이션·실행·관리하도록 돕는 제품으로, 제품 소개가 공식 페이지에서 확인되었다(F1). 가상화는 하이퍼바이저가 물리 하드웨어 위에 여러 VM을 만들고 자원을 풀링·이동시키는 기술이라는 정의(F2)도 같은 출처로 확인되었다. 설계 세부(F3)와 지원 범위(F4)는 공식 문서 접근 제한(HTTP 403)으로 미검증이며, 본 문서는 수치·기능을 주장하지 않는다.", size=10.5, color=INK)

dhead(doc, "2. 근거표")
t = doc.add_table(rows=1, cols=4); t.style = "Table Grid"
for c, htxt in zip(t.rows[0].cells, ["#", "내용", "상태", "근거"]):
    dshade(c, NAVY); dset(c.paragraphs[0].add_run(), htxt, size=10, color=WHITE, bold=True)
for fid, desc, st, stc, stbg, src in [("F1", "컨테이너와 함께 VM 마이그레이션·실행·관리 (제품 설명)", "확인", GREEN_D, GREEN_L, "developers.redhat.com (200)"),
          ("F2", "하이퍼바이저·VM·자원 풀링 — 가상화 일반 정의", "확인", GREEN_D, GREEN_L, "developers.redhat.com (200)"),
          ("F3", "설계 세부 (컴포넌트·API·라이브 마이그레이션)", "미검증 (403)", RED, RED_L, "docs.redhat.com (403)"),
          ("F4", "버전·지원 범위", "미검증 (403)", RED, RED_L, "docs.redhat.com (403)"),
          ("F5", "의사결정 4축·파이프라인 8단계 (가설)", "제안", AMBER_D, AMBER_L, "본 저장소 헌법")]:
    row = t.add_row().cells
    dset(row[0].paragraphs[0].add_run(), fid, size=10, bold=True)
    dset(row[1].paragraphs[0].add_run(), desc, size=9.5)
    dshade(row[2], stbg); dset(row[2].paragraphs[0].add_run(), st, size=9.5, color=stc, bold=True)
    dset(row[3].paragraphs[0].add_run(), src, size=9, color=SUB)

dhead(doc, "3. 배경 — VM vs 컨테이너 (일반 지식, 제품 사양 아님)")
p = doc.add_paragraph()
dset(p.add_run(), "하이퍼바이저는 물리 서버 위에서 여러 VM을 격리하여 각 VM이 독립된 운영체계를 갖게 하는 소프트웨어이고, 컨테이너는 운영체계를 공유하고 애플리케이션만 격리하는 접근이다. 공통 질문은 '워크로드를 어디에, 얼마나 격리해서 돌릴 것인가'이며, VM/컨테이너 경계는 이 질문에 대한 결정이다. 본 절은 일반 배경 지식이며 OpenShift Virtualization의 특정 기능·숫자가 아니다.", size=10.5, color=INK)
tt = doc.add_table(rows=1, cols=3); tt.style = "Table Grid"
for c, htxt in zip(tt.rows[0].cells, ["차원 (일반 지식)", "VM (가상 머신)", "컨테이너"]):
    dshade(c, NAVY); dset(c.paragraphs[0].add_run(), htxt, size=9.5, color=WHITE, bold=True)
for dim, vm, ct in [("격리 수준", "하드웨어 가상화 — 격리 강함", "OS 공유 — 격리 가볍고 빠름"),
                    ("시작 · 밀도", "부팅 느림 · 밀도 낮음", "초기화 빠름 · 고밀도"),
                    ("상태 · 의존성", "OS 포함 — 레거시 의존성 그대로", "앱만 — 의존성 현대화 필요"),
                    ("이동성", "VM 이미지 단위 (무거움)", "이미지 단위 — 레지스트리 배포")]:
    row = tt.add_row().cells
    dset(row[0].paragraphs[0].add_run(), dim, size=9.5, bold=True)
    dset(row[1].paragraphs[0].add_run(), vm, size=9.5)
    dset(row[2].paragraphs[0].add_run(), ct, size=9.5)

dhead(doc, "4. 의사결정 4축 (제안 F5)")
for t_ in ["① 워크로드 경계 — 무엇을 VM으로 남기고 무엇을 컨테이너로 (의존성·라이선스·역량)",
           "② 운영 통합 수준 — 인증·로그·백업·네트워크를 얼마나 하나로 (통합 1점당 검증 범위 증대)",
           "③ 검증 방법 — 통과/실패 기준을 관측 가능하게, 측정 전 점수 금지, 근거(날짜·출처) 필수",
           "④ 마이그레이션 우선순위 — 낮은 위험+높은 가치부터, 가장 어려운 것은 검증 인프라 완성 후"]:
    p = doc.add_paragraph(style="List Bullet")
    dset(p.add_run(), t_, size=10.5, color=INK)
p = doc.add_paragraph()
dset(p.add_run(), "채점 예시(예시만): 3·4·4·3 → 운영 통합 1.20 · 검증 방법 1.00이 상위 → 이 두 축의 질문을 먼저 관측 가능한 판정 기준으로 설계. XLSX(06)는 이 구조를 수식으로 자동화한 것이다.", size=10.5, color=SUB)

dhead(doc, "5. 산출물 구성")
p = doc.add_paragraph()
dset(p.add_run(), "1 근거표 · 2 심층 글(02) · 3 인포그래픽(03) · 4 PPTX 12슬라이드(04) · 5 본 문서(05) · 6 XLSX 3시트(06) · 7 PDF(07) · 8 검증 로그(08). HWPX는 생성 도구 부재로 unavailable 보고(생성 안 함).", size=10.5, color=INK)

dhead(doc, "6. 검증 요약")
p = doc.add_paragraph()
dset(p.add_run(), "PPTX·DOCX·XLSX 구조 검사 통과, PPTX 12슬라이드 전 렌더(겹침·잘림 0, 표본 시각 실독), XLSX 수식 재계산(가중치 합 1.0), PDF 변환·헤더 검증. 전 결과: 08-verification-log.md.", size=10.5, color=INK)

dhead(doc, "7. 한계")
for x in ["설치 · 클러스터 구동 · 기능/성능 실측 미수행 (별도 세션 — 재실측 체크리스트는 발표자료 11번 슬라이드)",
          "F3·F4 미검증 — 공식 문서 403, 재실측 후 수치·기능 주장 허용",
          "렌더는 LibreOffice 기준 — 타 앱 픽셀 일치 보장 아님"]:
    p = doc.add_paragraph(style="List Bullet")
    dset(p.add_run(), x, size=10.5, color=INK)

dhead(doc, "8. 출처")
p = doc.add_paragraph()
dset(p.add_run(), "developers.redhat.com/products/openshift/virtualization (HTTP 200, 2026-11-11 취득) · docs.redhat.com / docs.openshift.com (F3·F4): 403 → 미검증", size=10, color=SUB)
doc.save(os.path.join(BASE, "05-report.docx"))
print("DOCX OK")

# ---------------- XLSX (v2.1 logic) ----------------
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

wb = Workbook()
ws = wb.active; ws.title = "의사결정"
thin = Side(style="thin", color="CBD5E1")
border = Border(left=thin, right=thin, top=thin, bottom=thin)
def xf(cell, **kw):
    if "bold" in kw: cell.font = Font(name="Malgun Gothic", size=kw.get("size", 10.5), bold=kw["bold"],
                                      color=kw.get("color", "0F172A"))
    if "fill" in kw: cell.fill = PatternFill("solid", fgColor=kw["fill"])
    if "align" in kw: cell.alignment = Alignment(horizontal=kw["align"], vertical="center", wrap_text=True)
    if border: cell.border = border

ws.merge_cells("A1:E1")
c = ws["A1"]; c.value = "OpenShift Virtualization — 의사결정 프레임 (제안 F5 · 측정값 아님)"
xf(c, bold=True, size=13, color="FFFFFF", fill="0B1F3A", align="center")
ws.row_dimensions[1].height = 30
ws.merge_cells("A2:E2")
c = ws["A2"]; c.value = "확인일 2026-11-11 · 가중치 합 = 1.0 (검증됨) · 점수는 결정자가 입력 (예시는 '사용법' 시트)"
xf(c, size=9, color="64748B", fill="F1F5F9", align="center")
ws.row_dimensions[2].height = 20
for j, h in enumerate(["기준 (의사결정 축)", "가중치", "점수 (1~5)", "가중합", "상태"], 1):
    c = ws.cell(row=3, column=j, value=h)
    xf(c, bold=True, size=11, color="FFFFFF", fill="2563EB", align="center")
ws.row_dimensions[3].height = 24
for i, (name, w) in enumerate([("워크로드 경계 — 무엇을 VM / 무엇을 컨테이너", 0.30),
                               ("운영 통합 수준 — 인증·백업·정책 통합 범위", 0.30),
                               ("검증 방법 — 판정 기준의 관측 가능성", 0.25),
                               ("마이그레이션 우선순위 — 무엇을 먼저", 0.15)]):
    r = 4 + i
    ws.cell(row=r, column=1, value=name)
    ws.cell(row=r, column=2, value=w)
    ws.cell(row=r, column=4, value="=B%d*C%d" % (r, r))
    ws.cell(row=r, column=5, value="제안")
    ws.cell(row=r, column=1).fill = PatternFill("solid", fgColor="F1F5F9" if i % 2 else "FFFFFF")
    xf(ws.cell(row=r, column=1), size=10.5, align="left")
    xf(ws.cell(row=r, column=2), size=10.5, align="center"); ws.cell(row=r, column=2).number_format = "0.00"
    xf(ws.cell(row=r, column=3), size=10.5, align="center"); ws.cell(row=r, column=3).number_format = "0"
    xf(ws.cell(row=r, column=4), size=10.5, align="center"); ws.cell(row=r, column=4).number_format = "0.00"
    xf(ws.cell(row=r, column=5), size=10, color="92400E", align="center")
    ws.row_dimensions[r].height = 26
r = 8
ws.cell(row=r, column=1, value="합계")
ws.cell(row=r, column=2, value="=SUM(B4:B7)")
ws.cell(row=r, column=3, value="—")
ws.cell(row=r, column=4, value="=SUM(D4:D7)")
ws.cell(row=r, column=5, value="제안")
for col in range(1, 6):
    c = ws.cell(row=r, column=col)
    xf(c, bold=True, size=10.5, color="1B3E6B", fill="DBEAFE", align="center")
ws.cell(row=r, column=1).alignment = Alignment(horizontal="left", vertical="center")
ws.cell(row=r, column=2).number_format = "0.00"
ws.cell(row=r, column=4).number_format = "0.00"
ws.row_dimensions[8].height = 24
for col, w in zip("ABCDE", [46, 11, 12, 11, 10]):
    ws.column_dimensions[col].width = w

ws2 = wb.create_sheet("사용법")
ws2.column_dimensions["A"].width = 100
for i, (txt, bold) in enumerate([
    ("의사결정 프레임 사용법 (제안 F5 — 측정값 아님)", True), ("", False),
    ("1) '의사결정' 시트의 점수(1~5) 열에 각 축의 점수를 입력하면 가중합·합계가 자동 계산된다.", False),
    ("2) 가중치는 편집 가능 — 단, 합계(가중치)는 1.0으로 유지 (현재 0.30+0.30+0.25+0.15 = 1.0).", False),
    ("3) 가중합이 큰 축 = 먼저 답해야 할 질문이다.", False), ("", False),
    ("예시 채점 (예시만 — 실제 채점 아님):  경계 3 / 통합 4 / 검증 4 / 우선순위 3", False),
    ("  → 0.30×3 + 0.30×4 + 0.25×4 + 0.15×3 = 0.90+1.20+1.00+0.45 = 3.55", False),
    ("  → 읽기: '운영 통합(1.20)'과 '검증 방법(1.00)'이 상위 → 이 두 축의 질문을 먼저 관측 가능한 판정 기준으로 설계.", False),
    ("", False),
    ("주의: 본 시트는 판단의 틀(제안)이다. F3(설계 세부)·F4(지원 범위)는 공식 문서 403으로 미검증 —", False),
    ("      실측값이 확인되면 이 프레임의 축·가중치는 실측 근거로 재구성한다. (01-facts.md · 08-verification-log.md)", False)], 1):
    c = ws2.cell(row=i, column=1, value=txt)
    xf(c, bold=bold, size=12 if i == 1 else 10.5, color="0B1F3A" if i == 1 else "0F172A",
       fill="DBEAFE" if i == 1 else "FFFFFF", align="left")
    if i == 1: ws2.row_dimensions[i].height = 26

ws3 = wb.create_sheet("근거")
for col, w in zip("ABCD", [8, 62, 18, 34]):
    ws3.column_dimensions[col].width = w
ws3.merge_cells("A1:D1")
c = ws3["A1"]; c.value = "근거표 (01-facts.md 요약) — 확인일 2026-11-11"
xf(c, bold=True, size=12, color="FFFFFF", fill="0B1F3A", align="center")
ws3.row_dimensions[1].height = 26
for j, h in enumerate(["#", "내용", "상태", "근거"], 1):
    c = ws3.cell(row=2, column=j, value=h)
    xf(c, bold=True, size=10.5, color="FFFFFF", fill="2563EB", align="center")
for i, (fid, desc, st, stbg, stc, src) in enumerate([
    ("F1", "컨테이너와 함께 VM 마이그레이션·실행·관리 (제품 설명)", "확인", GREEN_L, GREEN_D, "developers.redhat.com (200)"),
    ("F2", "하이퍼바이저·VM·자원 풀링 — 가상화 일반 정의", "확인", GREEN_L, GREEN_D, "developers.redhat.com (200)"),
    ("F3", "설계 세부 (컴포넌트·API·라이브 마이그레이션)", "미검증 (403)", RED_L, RED, "docs.redhat.com (403)"),
    ("F4", "버전·지원 범위", "미검증 (403)", RED_L, RED, "docs.redhat.com (403)"),
    ("F5", "의사결정 4축·파이프라인 8단계 (가설)", "제안", AMBER_L, AMBER_D, "본 저장소 헌법")]):
    r = 3 + i
    ws3.cell(row=r, column=1, value=fid)
    ws3.cell(row=r, column=2, value=desc)
    ws3.cell(row=r, column=3, value=st)
    ws3.cell(row=r, column=4, value=src)
    xf(ws3.cell(row=r, column=1), bold=True, size=10, align="center")
    xf(ws3.cell(row=r, column=2), size=10, align="left")
    ws3.cell(row=r, column=3).fill = PatternFill("solid", fgColor=stbg)
    xf(ws3.cell(row=r, column=3), bold=True, size=9.5, color=stc, align="center")
    xf(ws3.cell(row=r, column=4), size=9, color="64748B", align="left")
    ws3.row_dimensions[r].height = 24
wb.save(os.path.join(BASE, "06-decision.xlsx"))
print("XLSX OK")

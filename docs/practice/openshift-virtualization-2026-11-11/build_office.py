# -*- coding: utf-8 -*-
"""OpenShift Virtualization practice (2026-11-12) — v5 Swiss/editorial design build.
v5 = design-language overhaul: hairline rules, typographic hierarchy, single accent,
no card/chip/ghost-number template patterns. Content and evidence discipline unchanged.
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

# ---------------- palette (ink/paper + single blue accent; status = dots only) ----------------
INK = "101418"; PAPER = "FFFFFF"; LINE = "D8DDE4"; MUT = "8A93A3"; SUB = "46505E"
BLUE = "2563EB"
INK_TX = "F4F7FB"; INK_TX2 = "93A5BE"; INK_LINE = "2A3648"
GREEN = "16A34A"; GREEN_TX = "157A3C"
RED = "DC2626"; RED_TX = "B91C1C"
AMBER = "D97706"; AMBER_TX = "B45309"
NUM_GHOST = "D5DAE1"
DISP = "Bahnschrift"; BODY = "Segoe UI"; MONO = "Consolas"; EA = "Malgun Gothic"
LATIN = BODY

def C(h): return RGBColor.from_string(h)

def _set_run(r, text, size, color, bold=False, italic=False, spc=None, disp=False, mono=False):
    r.text = text
    f = r.font
    f.size = Pt(size); f.bold = bold; f.italic = italic
    f.color.rgb = C(color)
    f.name = DISP if disp else (MONO if mono else BODY)
    rPr = r._r.get_or_add_rPr()
    if spc is not None: rPr.set("spc", str(spc))
    for tag in ("a:ea", "a:cs"):
        el = rPr.find(qn(tag))
        if el is None:
            el = rPr.makeelement(qn(tag), {}); rPr.append(el)
        el.set("typeface", EA)

def tb(slide, x, y, w, h, lines, anchor=MSO_ANCHOR.TOP, wrap=True, ml=0.0, mt=0.0):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = wrap
    tf.vertical_anchor = anchor
    tf.margin_left = Inches(ml); tf.margin_right = Inches(0.0)
    tf.margin_top = Inches(mt); tf.margin_bottom = Inches(0.0)
    for i, (t, o) in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = o.get("align", PP_ALIGN.LEFT)
        if o.get("sa"): p.space_after = Pt(o["sa"])
        if o.get("ls"): p.line_spacing = o["ls"]
        _set_run(p.add_run(), t, o.get("size", 16), o.get("color", INK),
                 o.get("bold", False), o.get("italic", False),
                 o.get("spc"), o.get("disp", False), o.get("mono", False))
    return box

def rect(slide, x, y, w, h, fill, line_color=None, line_w=1.0):
    shp = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE,
        Inches(x), Inches(y), Inches(w), Inches(h))
    if fill is None: shp.fill.background()
    else: shp.fill.solid(); shp.fill.fore_color.rgb = C(fill)
    if line_color is None: shp.line.fill.background()
    else: shp.line.color.rgb = C(line_color); shp.line.width = Pt(line_w)
    shp.shadow.inherit = False
    return shp

def dot(slide, x, y, d, color):
    o = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(d), Inches(d))
    o.fill.solid(); o.fill.fore_color.rgb = C(color)
    o.line.fill.background(); o.shadow.inherit = False
    return o

def tri_down(slide, x, y, w, h, color):
    t = slide.shapes.add_shape(MSO_SHAPE.ISOSCELES_TRIANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    t.rotation = 180
    t.fill.solid(); t.fill.fore_color.rgb = C(color)
    t.line.fill.background(); t.shadow.inherit = False
    return t

def hairline(slide, x, y, w, color=LINE, h=0.011):
    rect(slide, x, y, w, h, color)

META5 = "OPENSHIFT VIRTUALIZATION · 2026-11-11 · 근거 01-facts.md"

def chrome(slide, kicker, title, page):
    rect(slide, 0.9, 0.665, 0.09, 0.09, BLUE)
    tb(slide, 1.12, 0.56, 10.5, 0.3, [(kicker.upper(), {"size": 9.5, "color": MUT, "bold": True, "spc": 200})])
    tb(slide, 0.88, 0.9, 11.6, 0.7, [(title, {"size": 27, "color": INK, "bold": True})])
    tb(slide, 0.9, 7.16, 8.0, 0.28, [(META5, {"size": 8.5, "color": MUT, "spc": 60})])
    tb(slide, 11.03, 7.16, 1.4, 0.28, [("%02d / 12" % page, {"size": 8.5, "color": MUT, "mono": True, "align": PP_ALIGN.RIGHT})])

def etable(slide, x, y, colw, header, rows, row_h=0.56, aligns=None, num_cols=(), body_size=11.5, bold_first=False):
    cx = x
    for i, htxt in enumerate(header):
        al = aligns[i] if aligns else PP_ALIGN.LEFT
        tb(slide, cx + 0.02, y, colw[i] - 0.04, 0.3,
           [(htxt.upper(), {"size": 9, "color": MUT, "bold": True, "spc": 140, "align": al})])
        cx += colw[i]
    rect(slide, x, y + 0.36, sum(colw), 0.022, INK)
    yy = y + 0.36
    for ri, row in enumerate(rows):
        cx = x
        for i, cell in enumerate(row):
            al = aligns[i] if aligns else PP_ALIGN.LEFT
            tb(slide, cx + 0.02, yy + 0.05, colw[i] - 0.04, row_h - 0.08,
               [(str(cell), {"size": body_size, "color": INK, "mono": i in num_cols,
                             "bold": (bold_first and i == 0), "align": al})], anchor=MSO_ANCHOR.MIDDLE)
            cx += colw[i]
        hairline(slide, x, yy + row_h, sum(colw))
        yy += row_h
    return yy

SW, SH = 13.333, 7.5
prs = Presentation()
prs.slide_width = Inches(SW); prs.slide_height = Inches(SH)
blank = prs.slide_layouts[6]
def new_slide(bg=PAPER):
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, SW, SH, bg)
    return s

# ===== S1 cover (ink) =====
s = new_slide(INK)
rect(s, 0, 0, SW, 0.05, BLUE)
tb(s, 0.9, 0.78, 6.0, 0.3, [("TECH DECISION BRIEF", {"size": 10, "color": INK_TX2, "bold": True, "spc": 240})])
tb(s, 6.43, 0.78, 5.1, 0.3, [("2026-11-11", {"size": 10, "color": INK_TX2, "mono": True, "align": PP_ALIGN.RIGHT})])
hairline(s, 0.9, 1.42, 11.53, INK_LINE)
tb(s, 0.86, 2.3, 11.8, 2.3, [
    ("OpenShift", {"size": 64, "color": PAPER, "bold": True, "disp": True}),
    ("Virtualization", {"size": 64, "color": PAPER, "bold": True, "disp": True}),
])
tb(s, 0.9, 4.72, 11.0, 0.5, [("가상 머신과 컨테이너의 공존 — 설계 선택과 검증 실습", {"size": 16, "color": "C7D2E0"})])
dot(s, 0.92, 5.66, 0.09, GREEN); tb(s, 1.18, 5.56, 2.6, 0.3, [("확인 2 — F1 · F2", {"size": 10.5, "color": INK_TX, "spc": 60})])
dot(s, 3.75, 5.66, 0.09, RED); tb(s, 4.01, 5.56, 3.3, 0.3, [("미검증 2 — F3 · F4 (403)", {"size": 10.5, "color": INK_TX, "spc": 60})])
dot(s, 7.6, 5.66, 0.09, AMBER); tb(s, 7.86, 5.56, 2.4, 0.3, [("제안 1 — F5", {"size": 10.5, "color": INK_TX, "spc": 60})])
hairline(s, 0.9, 6.82, 11.53, INK_LINE)
tb(s, 0.9, 7.02, 8.6, 0.3, [("산출물 8종 · 구조 · 렌더 · 재계산 검증 — 08-verification-log.md", {"size": 9, "color": INK_TX2, "spc": 60})])
tb(s, 10.43, 7.02, 2.0, 0.3, [("ARTIFACTS 08", {"size": 9, "color": INK_TX2, "mono": True, "align": PP_ALIGN.RIGHT})])

# ===== S2 question =====
s = new_slide(); chrome(s, "01 — 질문 Question", "결정할 것은 기술이 아니라 경계 — 한 플랫폼으로 합칠 것인가", 2)
tb(s, 0.9, 1.95, 6.9, 1.5, [
    ("레거시 VM과 컨테이너를", {"size": 24, "color": INK, "bold": True, "ls": 1.15}),
    ("하나의 플랫폼으로 합칠 것인가.", {"size": 24, "color": BLUE, "bold": True, "ls": 1.15}),
])
rect(s, 0.9, 3.78, 0.028, 1.42, BLUE)
tb(s, 1.22, 3.74, 6.4, 0.3, [("예시 — 가설, 사실 아님", {"size": 9, "color": MUT, "bold": True, "spc": 180})])
tb(s, 1.22, 4.06, 6.3, 1.1, [("레거시 VM 40대 · 컨테이너 서비스 30개 · 운영 팀 1개. 분리하면 도구·정책·당직이 ×2, 공존하면 한 플랫폼이지만 — 경계를 근거로 결정해야 한다.", {"size": 12.5, "color": SUB, "ls": 1.3})])
tb(s, 0.9, 5.5, 6.5, 0.3, [("이 덱이 답하는 것", {"size": 9.5, "color": MUT, "bold": True, "spc": 180})])
for i, (c, t) in enumerate([(GREEN, "근거 현황 — 무엇을 확인했고, 무엇이 미검증인가 (F1~F5)"),
                            (AMBER, "결정 프레임 — 4개 축 + 가중치 채점 (제안)"),
                            (GREEN, "검증 계획 — 형식별 게이트와 남은 한계")]):
    y = 5.88 + i * 0.4
    dot(s, 0.92, y + 0.08, 0.08, c)
    tb(s, 1.2, y - 0.02, 6.3, 0.35, [(t, {"size": 12, "color": SUB})])
tb(s, 8.0, 1.95, 4.4, 0.3, [("그 결정은 3개의 질문에 있다", {"size": 9.5, "color": MUT, "bold": True, "spc": 180})])
for i, (n, t, d) in enumerate([("01", "경계", "무엇을 VM으로, 무엇을 컨테이너로"),
                               ("02", "통합", "운영 체계를 어디까지 하나로"),
                               ("03", "검증", "통과/실패를 어떻게 관측할 것인가")]):
    y = 2.42 + i * 1.32
    tb(s, 8.0, y - 0.06, 1.3, 0.7, [(n, {"size": 30, "color": NUM_GHOST, "disp": True, "bold": True})])
    tb(s, 9.35, y, 3.05, 0.4, [(t, {"size": 16, "color": INK, "bold": True})])
    tb(s, 9.35, y + 0.42, 3.05, 0.7, [(d, {"size": 10.5, "color": SUB, "ls": 1.2})])
    if i < 2: hairline(s, 8.0, y + 1.12, 4.43)
tb(s, 8.0, 6.5, 4.43, 0.6, [("이 덱에는 수치가 없다 — 수치는 실측값 + 확인일 + 출처 + 재현 방법이 함께 있을 때만 등장한다.", {"size": 10, "color": MUT, "italic": True, "ls": 1.25})])

# ===== S3 evidence (editorial table) =====
s = new_slide(); chrome(s, "02 — 근거 Evidence", "확인은 두 건뿐 — F3·F4는 403으로 아직 말할 수 없다", 3)
dot(s, 0.92, 1.8, 0.08, GREEN); tb(s, 1.12, 1.7, 1.5, 0.3, [("확인", {"size": 10, "color": SUB, "spc": 80})])
dot(s, 1.95, 1.8, 0.08, RED); tb(s, 2.15, 1.7, 1.7, 0.3, [("미검증", {"size": 10, "color": SUB, "spc": 80})])
dot(s, 3.45, 1.8, 0.08, AMBER); tb(s, 3.65, 1.7, 1.5, 0.3, [("제안", {"size": 10, "color": SUB, "spc": 80})])
ev = [("F1", "확인", GREEN, GREEN_TX, "컨테이너(모던) 워크로드와 함께 VM을 마이그레이션·실행·관리 — 제품 설명", "developers.redhat.com · HTTP 200"),
      ("F2", "확인", GREEN, GREEN_TX, "하이퍼바이저가 물리 하드웨어에 여러 VM 생성 · 자원 풀링·이동 — 가상화 일반 정의", "developers.redhat.com · HTTP 200"),
      ("F3", "미검증", RED, RED_TX, "설계 세부 (컴포넌트 구성 · 특정 API · 라이브 마이그레이션 동작)", "docs.redhat.com · HTTP 403"),
      ("F4", "미검증", RED, RED_TX, "지원 범위 (버전 · 플랫폼)", "docs.redhat.com · HTTP 403"),
      ("F5", "제안", AMBER, AMBER_TX, "의사결정 4축 · 파이프라인 8단계 — 본 저장소 헌법 기반 프레임 (측정값 아님)", "본 저장소 AGENTS.md")]
tx, ty = 0.9, 2.2
colw = [0.8, 6.15, 2.15, 2.43]
for i, htxt in enumerate(["#", "내용", "상태", "근거"]):
    al = PP_ALIGN.RIGHT if i == 3 else PP_ALIGN.LEFT
    tb(s, tx, ty, colw[i], 0.3, [(htxt.upper(), {"size": 9, "color": MUT, "bold": True, "spc": 140, "align": al})])
    tx += colw[i]
rect(s, 0.9, ty + 0.36, 11.53, 0.022, INK)
yy = ty + 0.36
stx = 0.9 + colw[0] + colw[1]
srx = stx + colw[2]
for fid, st, dc, dtc, desc, src in ev:
    rh = 0.82
    tb(s, 0.92, yy + 0.05, colw[0] - 0.04, rh - 0.1, [(fid, {"size": 13, "color": INK, "mono": True, "bold": True})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 0.9 + colw[0] + 0.05, yy + 0.05, colw[1] - 0.1, rh - 0.1, [(desc, {"size": 12, "color": INK, "ls": 1.15})], anchor=MSO_ANCHOR.MIDDLE)
    dot(s, stx + 0.05, yy + rh / 2 - 0.04, 0.08, dc)
    tb(s, stx + 0.22, yy + 0.05, colw[2] - 0.26, rh - 0.1, [(st.upper(), {"size": 9.5, "color": dtc, "bold": True, "spc": 120})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, srx + 0.02, yy + 0.05, colw[3] - 0.04, rh - 0.1, [(src, {"size": 9.5, "color": MUT, "mono": True, "align": PP_ALIGN.RIGHT})], anchor=MSO_ANCHOR.MIDDLE)
    hairline(s, 0.9, yy + rh, 11.53)
    yy += rh

# ===== S4 concept (thin-line diagram) =====
s = new_slide(); chrome(s, "03 — 개념 Concept", "한 플랫폼, 두 워크로드, 한 운영 — 공존은 확인된 방향 (F1)", 4)
by, bh = 1.85, 2.0
rect(s, 0.9, by, 5.6, bh, PAPER, line_color=INK, line_w=1.4)
tb(s, 1.18, by + 0.2, 4.0, 0.4, [("가상 머신 워크로드", {"size": 15, "color": INK, "bold": True})])
dot(s, 6.18, by + 0.3, 0.09, RED)
tb(s, 4.9, by + 0.2, 1.25, 0.3, [("F3 미검증", {"size": 8.5, "color": MUT, "mono": True, "align": PP_ALIGN.RIGHT})])
tb(s, 1.18, by + 0.78, 5.1, 0.75, [
    ("— 기존 VM (레거시)", {"size": 11, "color": SUB, "sa": 4}),
    ("— 컨테이너화 어려운 앱", {"size": 11, "color": SUB}),
])
tb(s, 1.18, by + 1.55, 5.1, 0.3, [("하이퍼바이저 기반 가상화 (정의 F2)", {"size": 10, "color": MUT})])
rect(s, 6.83, by, 5.6, bh, PAPER, line_color=INK, line_w=1.4)
tb(s, 7.11, by + 0.2, 4.0, 0.4, [("컨테이너 워크로드", {"size": 15, "color": INK, "bold": True})])
dot(s, 12.11, by + 0.3, 0.09, GREEN)
tb(s, 10.85, by + 0.2, 1.25, 0.3, [("F1 확인", {"size": 8.5, "color": MUT, "mono": True, "align": PP_ALIGN.RIGHT})])
tb(s, 7.11, by + 0.78, 5.1, 0.75, [
    ("— 마이크로서비스", {"size": 11, "color": SUB, "sa": 4}),
    ("— 클라우드 네이티브 앱", {"size": 11, "color": SUB}),
])
tb(s, 7.11, by + 1.55, 5.1, 0.3, [("→ 함께 마이그레이션 · 실행 · 관리 (확인 F1)", {"size": 10, "color": MUT})])
for ax in (3.66, 9.59):
    rect(s, ax, 3.9, 0.016, 0.5, INK)
    tri_down(s, ax - 0.065, 4.36, 0.15, 0.11, INK)
rect(s, 0.9, 4.6, 11.53, 0.72, INK)
tb(s, 0.9, 4.6, 11.53, 0.72, [("한 플랫폼 — VM과 컨테이너의 공존  (확인 F1)", {"size": 15, "color": PAPER, "bold": True, "align": PP_ALIGN.CENTER})], anchor=MSO_ANCHOR.MIDDLE)
rect(s, 0.9, 5.56, 11.53, 0.95, PAPER, line_color=BLUE, line_w=1.25)
tb(s, 1.18, 5.68, 6.0, 0.3, [("공통 운영 체계 — 제안 (F5)", {"size": 9.5, "color": BLUE, "bold": True, "spc": 160})])
for j, ch in enumerate(["동일 정책", "검증 게이트", "근거표 공유", "미검증 라벨 유지"]):
    tb(s, 1.18 + j * 2.88, 6.08, 2.7, 0.35, [(ch, {"size": 11, "color": SUB})])
    if j < 3: hairline(s, 3.86 + j * 2.88, 5.98, 0.011, LINE, h=0.42)
tb(s, 0.9, 6.72, 11.53, 0.3, [("개념 개요 (제안 F5) — 상세 도해 03-infographic.svg · 설계 세부 F3 미검증 (403 → 재실측 필요)", {"size": 9.5, "color": MUT})])

# ===== S5 background + tradeoff (editorial) =====
s = new_slide(); chrome(s, "04 — 배경 Background", "VM과 컨테이너는 네 차원의 교환 관계 — 격리·밀도·상태·이동성", 5)
tb(s, 0.9, 1.8, 5.5, 0.4, [("VM (가상 머신)", {"size": 15, "color": INK, "bold": True})])
tb(s, 0.9, 2.28, 5.5, 0.95, [("하드웨어를 가상화해 각 VM이 독립된 운영체계를 가진다 — 격리는 강하고, 시작은 느리고, 밀도는 낮다.", {"size": 11.5, "color": SUB, "ls": 1.3})])
tb(s, 6.93, 1.8, 5.5, 0.4, [("컨테이너", {"size": 15, "color": INK, "bold": True})])
tb(s, 6.93, 2.28, 5.5, 0.95, [("운영체계를 공유하고 애플리케이션만 격리한다 — 격리는 가볍고, 시작은 빠르고, 밀도는 높다.", {"size": 11.5, "color": SUB, "ls": 1.3})])
hairline(s, 0.9, 3.42, 11.53)
trows = [("격리 수준", "하드웨어 가상화 — 격리 강함", "OS 공유 — 격리 가볍고 빠름"),
         ("시작 · 밀도", "부팅 느림 · 단위 서버당 밀도 낮음", "초기화 빠름 · 고밀도 실행"),
         ("상태 · 의존성", "OS 포함 — 레거시 의존성 그대로", "앱만 — 의존성 현대화 필요"),
         ("이동성", "VM 이미지 단위 (볼륨 크고 무거움)", "이미지 단위 — 레지스트리 배포")]
etable(s, 0.9, 3.66, [2.3, 4.6, 4.63], ["차원 (일반 지식)", "VM (가상 머신)", "컨테이너"], trows, row_h=0.62, body_size=11)
dot(s, 0.92, 6.68, 0.08, AMBER)
tb(s, 1.14, 6.58, 11.2, 0.35, [("일반 배경 지식(교육용) — OpenShift Virtualization의 특정 기능·숫자가 아님 · 제품 주장은 F1·F2 확인 범위까지", {"size": 9.5, "color": AMBER_TX, "spc": 60})])

# ===== S6 decision axes (typographic) =====
s = new_slide(); chrome(s, "05 — 결정 Decision", "4축으로 경계를 판단한다 — 가중치는 제안일 뿐 (F5)", 6)
axes = [
    ("01", "워크로드 경계", ["어느 VM을 남기고, 무엇을 컨테이너로?", "의존성 · 라이선스 · 레거시 미들웨어 제약은?", "컨테이너화할 팀 역량은 충분한가?"], "0.30"),
    ("02", "운영 통합 수준", ["인증 · 로그 · 백업 · 네트워크를 얼마나 하나로?", "통합 1점당 검증 범위가 커지는가?", "단계적 통합 로드맵은 있는가?"], "0.30"),
    ("03", "검증 방법", ["통과/실패 기준을 관측 가능하게 쓸 수 있나?", "측정 전 점수를 보고하지 않는가?", "근거(날짜 · 출처)가 모든 주장에 붙는가?"], "0.25"),
    ("04", "마이그레이션 우선순위", ["낮은 위험 + 높은 가치부터인가?", "가장 어려운 것은 검증 인프라 완성 후로?", "회귀(rollback) 경로가 있는가?"], "0.15"),
]
for i, (num, t, qs, wt) in enumerate(axes):
    x = 0.9 + (i % 2) * 6.03
    y = 1.85 + (i // 2) * 2.5
    hairline(s, x, y, 5.5)
    tb(s, x - 0.05, y + 0.08, 1.5, 0.8, [(num, {"size": 40, "color": NUM_GHOST, "disp": True, "bold": True})])
    tb(s, x + 1.15, y + 0.16, 2.9, 0.5, [(t, {"size": 17, "color": INK, "bold": True})])
    tb(s, x + 3.4, y + 0.2, 2.1, 0.35, [("가중치 " + wt, {"size": 10, "color": MUT, "mono": True, "align": PP_ALIGN.RIGHT})])
    lines = [("—  " + q, {"size": 11.5, "color": SUB, "sa": 7, "ls": 1.15}) for q in qs]
    tb(s, x + 0.05, y + 0.85, 5.4, 1.5, lines)

# ===== S7 scoring (editorial table + thin bars) =====
s = new_slide(); chrome(s, "06 — 결정 Decision", "예시 채점에서는 통합·검증이 상위 — 이 두 축부터 답해야 한다", 7)
rows = [("워크로드 경계 (VM vs 컨테이너)", "0.30", "3 *", "0.90", "제안"),
        ("운영 통합 수준 (인증 · 백업 · 정책)", "0.30", "4 *", "1.20", "제안"),
        ("검증 방법 (판정 기준 관측 가능성)", "0.25", "4 *", "1.00", "제안"),
        ("마이그레이션 우선순위", "0.15", "3 *", "0.45", "제안"),
        ("합계", "1.00", "—", "3.55 *", "제안")]
endy = etable(s, 0.9, 1.8, [5.3, 1.5, 1.6, 1.6, 1.53],
              ["기준 (의사결정 축)", "가중치", "점수 (1~5)", "가중합", "상태"], rows,
              row_h=0.56, aligns=[PP_ALIGN.LEFT, PP_ALIGN.CENTER, PP_ALIGN.CENTER, PP_ALIGN.CENTER, PP_ALIGN.CENTER],
              num_cols={1, 2, 3}, body_size=11.5)
tb(s, 0.9, endy + 0.06, 9.0, 0.3, [("* 점수 3·4·4·3 = 예시 — 실제 채점은 결정자가 입력 (수식 자동 합산) · 가중치 합 1.0 검증됨", {"size": 9.5, "color": MUT, "italic": True})])
tb(s, 0.9, 5.5, 8.9, 0.3, [("가중합 — 큰 축이 '먼저 답할 질문'", {"size": 9.5, "color": MUT, "bold": True, "spc": 160})])
for i, (lbl, val) in enumerate([("경계", 0.90), ("통합", 1.20), ("검증", 1.00), ("우선순위", 0.45)]):
    y = 5.92 + i * 0.31
    tb(s, 0.9, y - 0.03, 1.05, 0.3, [(lbl, {"size": 10, "color": SUB, "align": PP_ALIGN.RIGHT})])
    hairline(s, 2.1, y + 0.13, 6.9, LINE)
    rect(s, 2.1, y, 6.9 * val / 1.5, 0.11, BLUE)
    tb(s, 9.1, y - 0.03, 0.7, 0.3, [("%.2f" % val, {"size": 10.5, "color": INK, "mono": True, "bold": True})])
tb(s, 10.15, 5.5, 2.28, 0.3, [("예시 가중합 총점", {"size": 9.5, "color": MUT, "bold": True, "spc": 160, "align": PP_ALIGN.RIGHT})])
tb(s, 10.15, 5.72, 2.28, 1.1, [("3.55 *", {"size": 52, "color": INK, "bold": True, "disp": True, "align": PP_ALIGN.RIGHT})])
tb(s, 10.15, 6.78, 2.28, 0.3, [("제안 프레임 — 측정값 아님", {"size": 9, "color": AMBER_TX, "spc": 60, "align": PP_ALIGN.RIGHT})])

# ===== S8 pipeline (hairline timeline) =====
s = new_slide(); chrome(s, "07 — 프로세스 Process", "8개 산출물은 같은 근거표를 읽는다 — 변환해도 의미가 변하지 않는다", 8)
rect(s, 0.9, 3.0, 11.53, 0.014, INK)
steps = ["Intake", "Research", "Editorial", "Art", "Production", "Gates", "Improve", "Handoff"]
arts = ["1 근거표", "2 심층 글", "3 인포그래픽", "4 PPTX", "5 DOCX", "6 XLSX", "7 PDF", "8 검증 로그"]
for i in range(8):
    x = 0.9 + i * (11.53 / 7)
    rect(s, x - 0.045, 2.955, 0.09, 0.09, INK)
    tb(s, x - 0.8, 2.42, 1.6, 0.3, [(steps[i].upper(), {"size": 9, "color": MUT, "bold": True, "spc": 140, "align": PP_ALIGN.CENTER})])
    tb(s, x - 0.8, 3.32, 1.6, 0.35, [(arts[i], {"size": 10.5, "color": SUB, "align": PP_ALIGN.CENTER})])
dot(s, 0.92, 4.42, 0.08, RED)
tb(s, 1.14, 4.32, 8.0, 0.3, [("HWPX → UNAVAILABLE — 생성 도구 부재 · 명시 (생성 안 함)", {"size": 9.5, "color": RED_TX, "bold": True, "spc": 120})])
tb(s, 0.9, 5.15, 11.5, 1.1, [
    ("각 단계의 산출물은 같은 근거표(01-facts.md)를 읽는다.", {"size": 14, "color": INK, "bold": True, "sa": 6}),
    ("따라서 어느 형식으로 변환해도 수치 · 주장의 의미가 변하지 않는다 (형식 게이트 '변환 의미 불변').", {"size": 12, "color": SUB, "ls": 1.3}),
])

# ===== S9 gates (editorial rows) =====
s = new_slide(); chrome(s, "08 — 검증 Gates", "검증을 통과한 것은 4개 — HWPX는 unavailable", 9)
grows = [("PPTX", "12슬라이드 (요구 10~12) · 구조 검사 · 전 슬라이드 렌더 · 시각 실독", "PASS", GREEN, GREEN_TX),
         ("DOCX", "구조 검사 · 표 무결성 · 전 페이지 렌더 (에디토리얼 스타일)", "PASS", GREEN, GREEN_TX),
         ("XLSX", "3시트 · 수식 재계산 — 가중치 합 1.0 확인 (B8)", "PASS", GREEN, GREEN_TX),
         ("PDF", "변환 성공 · 헤더 %PDF 검증 (원본 DOCX 렌더 기준)", "PASS", GREEN, GREEN_TX),
         ("HWPX", "생성 도구 부재 → unavailable 명시 (생성 안 함 · 게이트 규칙)", "UNAVAILABLE", RED, RED_TX)]
for i, (fmt, gate, res, dc, dtc) in enumerate(grows):
    y = 1.9 + i * 0.98
    hairline(s, 0.9, y, 11.53)
    tb(s, 0.9, y + 0.12, 1.25, 0.6, [(fmt, {"size": 15, "color": INK, "bold": True})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 2.3, y + 0.12, 8.3, 0.6, [(gate, {"size": 12, "color": SUB})], anchor=MSO_ANCHOR.MIDDLE)
    dot(s, 10.9, y + 0.32, 0.09, dc)
    tb(s, 11.1, y + 0.12, 1.33, 0.6, [(res, {"size": 9.5, "color": dtc, "bold": True, "spc": 120})], anchor=MSO_ANCHOR.MIDDLE)

# ===== S10 limits + next (2-column, top rules only) =====
s = new_slide(); chrome(s, "09 — 한계 + 다음 단계", "지금 못 하는 것은 명확하다 — 실측과 F3·F4, 그리고 다음 4걸음", 10)
rect(s, 0.9, 1.85, 5.5, 0.028, RED)
tb(s, 0.9, 2.08, 5.5, 0.4, [("미수행 · 미검증 — 지금 못 하는 것", {"size": 14, "color": INK, "bold": True})])
for i, t in enumerate(["설치 · 클러스터 구동 · 기능/성능 실측", "F3(설계 세부) · F4(지원 범위) — 403, 재실측 필요", "수치 · 기능 주장 0건 (근거 4요소 갖춰야 진입)", "HWPX 산출물 — 도구 부재, unavailable 명시", "타 앱(파워포인트 · 한컴) 픽셀 일치 보장"]):
    y = 2.72 + i * 0.82
    dot(s, 0.92, y + 0.09, 0.07, RED)
    tb(s, 1.2, y - 0.04, 5.2, 0.7, [(t, {"size": 11.5, "color": SUB, "ls": 1.15})])
rect(s, 6.93, 1.85, 5.5, 0.028, BLUE)
tb(s, 6.93, 2.08, 5.5, 0.4, [("재실측 체크리스트 — 다음 4걸음", {"size": 14, "color": INK, "bold": True})])
for i, (n, t, d) in enumerate([("01", "공식 문서 재실측", "F3 · F4를 확인/미검증으로 재분류"),
                               ("02", "설치 · 클러스터 실습", "공존 실행 → 기능 검증 (성능 벤치는 조건 명시)"),
                               ("03", "수치 주장 허용", "실측값 + 확인일 + 출처 + 재현 4요소 갖출 때"),
                               ("04", "산출물 v2 갱신", "재구성된 근거표로 8종 재생성 → paired 비교")]):
    y = 2.72 + i * 1.0
    tb(s, 6.93, y - 0.02, 0.6, 0.4, [(n, {"size": 14, "color": NUM_GHOST, "disp": True, "bold": True})])
    tb(s, 7.55, y - 0.04, 4.9, 0.35, [(t, {"size": 12.5, "color": INK, "bold": True})])
    tb(s, 7.55, y + 0.3, 4.9, 0.55, [(d, {"size": 10.5, "color": SUB, "ls": 1.15})])

# ===== S11 conclusion =====
s = new_slide(); chrome(s, "10 — 결론 Conclusion", "결정은 순서가 있다 — ① 재실측 ② 실측 채점 ③ 경계 결정", 11)
for x, acc, atc, title, lines, takeaway in [
    (0.9, GREEN, GREEN_TX, "확인 — 방향은 확인됨",
     ["F1: VM+컨테이너 통합 운영은 제품 설명 (200)", "F2: 가상화 정의 — 하이퍼바이저 기반 (200)"],
     "→ '공존'은 근거 있는 방향, 추측 아님"),
    (4.86, RED, RED_TX, "미검증 — 아직 못 말하는 것",
     ["F3: 설계 세부 (API · 컴포넌트) — 403", "F4: 지원 범위 (버전 · 플랫폼) — 403"],
     "→ 재실측 전 어떤 수치도 주장하지 않음"),
    (8.82, AMBER, AMBER_TX, "제안 — 판단의 틀",
     ["F5: 4축 + 가중치 프레임 (측정값 아님)", "XLSX(06): 채점 구조 자동화"],
     "→ 실측 데이터가 들어야 비로소 결정")]:
    rect(s, x, 1.85, 3.66, 0.028, acc)
    tb(s, x, 2.1, 3.66, 0.45, [(title, {"size": 14, "color": INK, "bold": True})])
    tb(s, x, 2.68, 3.66, 1.2, [(t, {"size": 11, "color": SUB, "sa": 8, "ls": 1.2}) for t in lines])
    tb(s, x, 4.05, 3.66, 0.4, [(takeaway, {"size": 11, "color": atc, "bold": True})])
rect(s, 0.9, 5.75, 11.53, 1.05, INK)
tb(s, 1.2, 5.9, 10.9, 0.3, [("지금 내려야 할 결정", {"size": 9.5, "color": INK_TX2, "bold": True, "spc": 200})])
tb(s, 1.2, 6.22, 10.9, 0.5, [("① F3 · F4 재실측     →     ② 4축에 실측 데이터로 채점     →     ③ 그 순서로 경계 결정", {"size": 16, "color": PAPER, "bold": True})])

# ===== S12 closing (ink) =====
s = new_slide(INK)
rect(s, 0, 0, SW, 0.05, BLUE)
tb(s, 0.9, 0.78, 6.0, 0.3, [("11 — 출처 SOURCES", {"size": 10, "color": INK_TX2, "bold": True, "spc": 240})])
hairline(s, 0.9, 1.42, 11.53, INK_LINE)
tb(s, 0.88, 2.1, 11.8, 1.9, [
    ("확인일 2026-11-11 —", {"size": 34, "color": PAPER, "bold": True, "ls": 1.15}),
    ("근거 없는 수치 0 · 미검증은 미검증으로.", {"size": 34, "color": PAPER, "bold": True, "ls": 1.15}),
])
for i, (src, st, c) in enumerate([
    ("developers.redhat.com/products/openshift/virtualization", "확인 — F1 · F2 (HTTP 200)", GREEN),
    ("docs.redhat.com · docs.openshift.com (설계 문서)", "미검증 — F3 · F4 (HTTP 403)", RED),
    ("본 저장소 AGENTS.md (evidence-first · 형식 게이트)", "제안 프레임 — F5", AMBER)]):
    y = 4.35 + i * 0.5
    dot(s, 0.92, y + 0.08, 0.08, c)
    tb(s, 1.18, y - 0.04, 7.3, 0.35, [(src, {"size": 10.5, "color": INK_TX2, "mono": True})])
    tb(s, 8.6, y - 0.04, 3.83, 0.35, [(st, {"size": 10, "color": INK_TX, "align": PP_ALIGN.RIGHT, "spc": 60})])
hairline(s, 0.9, 6.82, 11.53, INK_LINE)
tb(s, 0.9, 7.02, 11.53, 0.3, [("근거표 01-facts.md · 검증 로그 08-verification-log.md · 산출물 8종 (HWPX: unavailable)", {"size": 9, "color": INK_TX2, "spc": 60})])

prs.save(os.path.join(BASE, "04-deck.pptx"))
print("PPTX OK slides=12")

# ---------------- DOCX (v4, unchanged) ----------------
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
    dset(p.add_run(), text, size=15 if level == 1 else 12.5, color="0B1F3A" if level == 1 else "1B3E6B", bold=True)
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
dshade(covcell, "0B1F3A")
p = covcell.paragraphs[0]
dset(p.add_run(), "TECH DECISION BRIEF · 2026-11-11", size=9, color=INK_TX2, bold=True)
p = covcell.add_paragraph()
dset(p.add_run(), "OpenShift Virtualization", size=24, color=WHITE if False else "FFFFFF", bold=True)
p = covcell.add_paragraph()
dset(p.add_run(), "가상 머신과 컨테이너의 공존 — 설계 선택과 검증 실습 요약", size=13, color="CFE3FF")
p = covcell.add_paragraph()
dset(p.add_run(), "확인 2 (F1·F2) · 미검증 2 (F3·F4, 403) · 제안 1 (F5)  |  산출물 8종 · HWPX: unavailable", size=9, color=INK_TX2)
doc.add_paragraph()
ddiv(doc)

dhead(doc, "1. 요약")
p = doc.add_paragraph()
dset(p.add_run(), "레거시 VM과 컨테이너 서비스를 나눠서 돌릴 것인가, 하나로 합칠 것인가 — 이 문서의 출발점이다. Red Hat OpenShift Virtualization은 VM을 컨테이너(모던) 워크로드와 함께 마이그레이션·실행·관리하도록 돕는 제품으로, 제품 소개가 공식 페이지에서 확인되었다(F1). 가상화는 하이퍼바이저가 물리 하드웨어 위에 여러 VM을 만들고 자원을 풀링·이동시키는 기술이라는 정의(F2)도 같은 출처로 확인되었다. 설계 세부(F3)와 지원 범위(F4)는 공식 문서 접근 제한(HTTP 403)으로 미검증이며, 본 문서는 수치·기능을 주장하지 않는다.", size=10.5, color=INK)

dhead(doc, "2. 근거표")
t = doc.add_table(rows=1, cols=4); t.style = "Table Grid"
for c, htxt in zip(t.rows[0].cells, ["#", "내용", "상태", "근거"]):
    dshade(c, "0B1F3A"); dset(c.paragraphs[0].add_run(), htxt, size=10, color="FFFFFF", bold=True)
for fid, desc, st, stc, stbg, src in [("F1", "컨테이너와 함께 VM 마이그레이션·실행·관리 (제품 설명)", "확인", "14532D", "DCFCE7", "developers.redhat.com (200)"),
          ("F2", "하이퍼바이저·VM·자원 풀링 — 가상화 일반 정의", "확인", "14532D", "DCFCE7", "developers.redhat.com (200)"),
          ("F3", "설계 세부 (컴포넌트·API·라이브 마이그레이션)", "미검증 (403)", "DC2626", "FEE2E2", "docs.redhat.com (403)"),
          ("F4", "버전·지원 범위", "미검증 (403)", "DC2626", "FEE2E2", "docs.redhat.com (403)"),
          ("F5", "의사결정 4축·파이프라인 8단계 (가설)", "제안", "B45309", "FEF3C7", "본 저장소 헌법")]:
    row = t.add_row().cells
    dset(row[0].paragraphs[0].add_run(), fid, size=10, bold=True)
    dset(row[1].paragraphs[0].add_run(), desc, size=9.5)
    dshade(row[2], stbg); dset(row[2].paragraphs[0].add_run(), st, size=9.5, color=stc, bold=True)
    dset(row[3].paragraphs[0].add_run(), src, size=9, color=SUB)

dhead(doc, "3. 배경 — VM vs 컨테이너 (일반 지식, 제품 사양 아님)")
p = doc.add_paragraph()
dset(p.add_run(), "하이퍼바이저는 물리 서버 위에서 여러 VM을 격리하여 각 VM이 독립된 운영체계를 갖게 하는 소프트웨어이고, 컨테이너는 운영체계를 공유하고 애플리케이션만 격리하는 접근이다. 공통 질문은 '워크로드를 어디에, 얼마나 격리해서 돌릴 것인가'이며, VM/컨테이너 경계는 이 질문에 대한 결정이다. 격리·시작밀도·상태의존성·이동성 4차원의 교환(trade-off)이며, 본 절은 일반 배경 지식이지 OpenShift Virtualization의 특정 기능·숫자가 아니다.", size=10.5, color=INK)
tt = doc.add_table(rows=1, cols=3); tt.style = "Table Grid"
for c, htxt in zip(tt.rows[0].cells, ["차원 (일반 지식)", "VM (가상 머신)", "컨테이너"]):
    dshade(c, "0B1F3A"); dset(c.paragraphs[0].add_run(), htxt, size=9.5, color="FFFFFF", bold=True)
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
dset(p.add_run(), "PPTX·DOCX·XLSX 구조 검사 통과, PPTX 12슬라이드 전 렌더(겹침·잘림·가림 0, 시각 실독), XLSX 수식 재계산(가중치 합 1.0), PDF 변환·헤더 검증. 전 결과: 08-verification-log.md.", size=10.5, color=INK)

dhead(doc, "7. 한계")
for x in ["설치 · 클러스터 구동 · 기능/성능 실측 미수행 (별도 세션 — 재실측 체크리스트는 발표자료 10번 슬라이드)",
          "F3·F4 미검증 — 공식 문서 403, 재실측 후 수치·기능 주장 허용",
          "렌더는 LibreOffice 기준 — 타 앱 픽셀 일치 보장 아님"]:
    p = doc.add_paragraph(style="List Bullet")
    dset(p.add_run(), x, size=10.5, color=INK)

dhead(doc, "8. 결론 — 지금 내려야 할 결정")
p = doc.add_paragraph()
dset(p.add_run(), "확인(F1·F2): VM+컨테이너 통합 운영 방향은 제품 설명 기반의 확인된 방향이다. 미검증(F3·F4): 설계 세부·지원 범위는 재실측 전까지 주장하지 않는다. 제안(F5): 4축 프레임은 실측 데이터가 채워져야 비로소 결정이 된다. 다음 결정 순서: ① F3·F4 재실측 → ② 4축 실측 채점 → ③ 경계 결정.", size=10.5, color=INK)

dhead(doc, "9. 출처")
p = doc.add_paragraph()
dset(p.add_run(), "developers.redhat.com/products/openshift/virtualization (HTTP 200, 2026-11-11 취득) · docs.redhat.com / docs.openshift.com (F3·F4): 403 → 미검증", size=10, color=SUB)
try:
    doc.save(os.path.join(BASE, "05-report.docx"))
    print("DOCX OK")
except PermissionError as e:
    print("DOCX SAVE FAILED (file locked by another process) - XLSX still saved: %s" % e)

# ---------------- XLSX (v2.1 logic, unchanged) ----------------
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
    ("F1", "컨테이너와 함께 VM 마이그레이션·실행·관리 (제품 설명)", "확인", "DCFCE7", "14532D", "developers.redhat.com (200)"),
    ("F2", "하이퍼바이저·VM·자원 풀링 — 가상화 일반 정의", "확인", "DCFCE7", "14532D", "developers.redhat.com (200)"),
    ("F3", "설계 세부 (컴포넌트·API·라이브 마이그레이션)", "미검증 (403)", "FEE2E2", "DC2626", "docs.redhat.com (403)"),
    ("F4", "버전·지원 범위", "미검증 (403)", "FEE2E2", "DC2626", "docs.redhat.com (403)"),
    ("F5", "의사결정 4축·파이프라인 8단계 (가설)", "제안", "FEF3C7", "B45309", "본 저장소 헌법")]):
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

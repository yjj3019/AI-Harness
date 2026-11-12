# -*- coding: utf-8 -*-
"""GPT vs Claude AI competition sample (2026-11-12) — v6 accessibility + notes build.
v5 design system (dark act slide, modular type scale, Swiss gridlines) plus:
WCAG AA contrast audit fixes (MUT 8A93A3->6B7280, tier numbers SUB, focal on-blue
PAPER, band BLUE_D) and speaker notes (purpose/transition) on all 12 slides.
Ideas adopted (MIT, zero code copy): slidevjs/themes, reveal.js, yjj3019/ProposalSkills.
Evidence: 01-facts.md (F1~F9). Vendor benchmark = one-sided (F6, amber label).
Generates 03-deck.pptx (12 slides). Deterministic: no images, shapes only.
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn

BASE = os.path.dirname(os.path.abspath(__file__))

# ---------------- palette ----------------
INK = "101418"; PAPER = "FFFFFF"; LINE = "D8DDE4"; MUT = "6B7280"; SUB = "46505E"
BLUE = "2563EB"; BLUE_TINT = "E8EEFB"; BLUE_L = "9DC1FF"; BLUE_D = "1D4ED8"
INK_TX = "F4F7FB"; INK_TX2 = "93A5BE"; INK_LINE = "2A3648"; LTX = "C7D2E0"
INK_TINT = "EEF0F3"; INK_TINT2 = "F6F7F9"
GREEN = "16A34A"; RED = "DC2626"; RED_TX = "B91C1C"
AMBER = "D97706"; AMBER_TX = "B45309"; AMBER_L = "E8B45A"
BAR_GRY = "C9D0D9"
DISP = "Bahnschrift"; BODY = "Segoe UI"; MONO = "Consolas"; EA = "Malgun Gothic"

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

def _run_opts(o):
    return (o.get("size", 16), o.get("color", INK), o.get("bold", False), o.get("italic", False),
            o.get("spc"), o.get("disp", False), o.get("mono", False))

def tb(slide, x, y, w, h, lines, anchor=MSO_ANCHOR.TOP, wrap=True, ml=0.0, mt=0.0):
    """lines: list of (text, opts) — text may be a list of (rtext, ropts) for multi-run paragraphs."""
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = wrap
    tf.vertical_anchor = anchor
    tf.margin_left = Inches(ml); tf.margin_right = Inches(0.0)
    tf.margin_top = Inches(mt); tf.margin_bottom = Inches(0.0)
    for i, item in enumerate(lines):
        t, o = item
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = o.get("align", PP_ALIGN.LEFT)
        if o.get("sa"): p.space_after = Pt(o["sa"])
        if o.get("ls"): p.line_spacing = o["ls"]
        if isinstance(t, list):
            for rt, ro in t:
                m = dict(o); m.update(ro)
                _set_run(p.add_run(), rt, *_run_opts(m))
        else:
            _set_run(p.add_run(), t, *_run_opts(o))
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

def hairline(slide, x, y, w, color=LINE, h=0.011):
    rect(slide, x, y, w, h, color)

def chip(slide, x, y, w, h, text, tcolor=SUB, border=LINE, fill=None, size=9.0, bold=False, spc=None, mono=False):
    rect(slide, x, y, w, h, fill, border, 1.0)
    tb(slide, x + 0.1, y, w - 0.2, h,
       [(text, {"size": size, "color": tcolor, "bold": bold, "spc": spc, "mono": mono, "align": PP_ALIGN.CENTER})],
       anchor=MSO_ANCHOR.MIDDLE)

META5 = "GPT vs CLAUDE · 2026-11-12 · 근거 01-facts.md"

def chrome(slide, kicker, title, page):
    rect(slide, 0.9, 0.665, 0.09, 0.09, BLUE)
    tb(slide, 1.12, 0.56, 10.5, 0.3, [(kicker.upper(), {"size": 9.5, "color": MUT, "bold": True, "spc": 200})])
    tb(slide, 0.88, 0.9, 11.6, 0.7, [(title, {"size": 27, "color": INK, "bold": True})])
    tb(slide, 0.9, 7.16, 8.0, 0.28, [(META5, {"size": 8.5, "color": MUT, "spc": 60})])
    tb(slide, 11.03, 7.16, 1.4, 0.28, [("%02d / 12" % page, {"size": 8.5, "color": MUT, "mono": True, "align": PP_ALIGN.RIGHT})])

def footnote(slide, text, color=MUT, italic=False, bold=False):
    hairline(slide, 0.9, 6.86, 11.53, LINE)
    tb(slide, 0.9, 6.94, 11.53, 0.24, [(text, {"size": 9, "color": color, "italic": italic, "bold": bold})])

def chrome_dark(slide, kicker, title, page):
    rect(slide, 0.9, 0.665, 0.09, 0.09, BLUE)
    tb(slide, 1.12, 0.56, 10.5, 0.3, [(kicker.upper(), {"size": 9.5, "color": INK_TX2, "bold": True, "spc": 200})])
    tb(slide, 0.88, 0.9, 11.6, 0.7, [(title, {"size": 27, "color": PAPER, "bold": True})])
    tb(slide, 0.9, 7.16, 8.0, 0.28, [(META5, {"size": 8.5, "color": INK_TX2, "spc": 60})])
    tb(slide, 11.03, 7.16, 1.4, 0.28, [("%02d / 12" % page, {"size": 8.5, "color": INK_TX2, "mono": True, "align": PP_ALIGN.RIGHT})])

SW, SH = 13.333, 7.5
prs = Presentation()
prs.slide_width = Inches(SW); prs.slide_height = Inches(SH)
blank = prs.slide_layouts[6]
def new_slide(bg=PAPER):
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, SW, SH, bg)
    return s

# ===== S1 cover (ink) — archetype: cover =====
s = new_slide(INK)
tb(s, 0.9, 0.78, 6.0, 0.3, [("AI MODEL COMPETITION — SAMPLE", {"size": 10, "color": INK_TX2, "bold": True, "spc": 240})])
tb(s, 6.43, 0.78, 5.1, 0.3, [("2026-11-12", {"size": 10, "color": INK_TX2, "mono": True, "align": PP_ALIGN.RIGHT})])
hairline(s, 0.9, 1.42, 11.53, INK_LINE)
tb(s, 0.86, 1.95, 11.8, 1.2, [("GPT vs Claude", {"size": 64, "color": PAPER, "bold": True, "disp": True})])
tb(s, 0.9, 3.3, 11.0, 0.5, [("두 회사의 4티어 라인업 전쟁 — 추구와 장단점 (공식 문서 기준)", {"size": 16, "color": "C7D2E0"})])
# two-side direction strip (argument preview)
tb(s, 0.9, 4.72, 5.6, 0.3, [("OPENAI", {"size": 10, "color": INK_TX2, "bold": True, "spc": 240})])
tb(s, 0.9, 5.02, 5.6, 0.5, [("능력의 폭 × 규모", {"size": 23, "color": PAPER, "bold": True})])
tb(s, 0.9, 5.62, 5.6, 0.3, [("멀티모달 풀스택 · 4티어 + 전문 세로 · 소비자 규모 (F1·F2)", {"size": 10, "color": INK_TX2})])
rect(s, 6.66, 4.72, 0.011, 1.3, INK_LINE)
tb(s, 6.83, 4.72, 5.6, 0.3, [("ANTHROPIC", {"size": 10, "color": INK_TX2, "bold": True, "spc": 240})])
tb(s, 6.83, 5.02, 5.6, 0.5, [("안전과 신뢰 × 공익 구조", {"size": 23, "color": PAPER, "bold": True})])
tb(s, 6.83, 5.62, 5.6, 0.3, [("안전 체계 · 검증 프로그램 분리 · PBC·S-1 (F5·F7)", {"size": 10, "color": INK_TX2})])
tb(s, 6.28, 5.2, 0.75, 0.3, [("VS", {"size": 10, "color": INK_TX2, "mono": True, "align": PP_ALIGN.CENTER, "spc": 200})])
hairline(s, 0.9, 6.82, 11.53, INK_LINE)
tb(s, 0.9, 7.02, 8.6, 0.3, [("산출물 8종 · 구조 · 렌더 · 스코어카드 검증 — 04-verification-log.md", {"size": 9, "color": INK_TX2, "spc": 60})])
tb(s, 10.43, 7.02, 2.0, 0.3, [("ARTIFACTS 08", {"size": 9, "color": INK_TX2, "mono": True, "align": PP_ALIGN.RIGHT})])

# ===== S2 — archetype: statement =====
s = new_slide(); chrome(s, "01 — 질문 Question", "비교의 단위를 바꾸자 — 모델이 아니라 티어", 2)
tb(s, 0.88, 1.95, 11.6, 1.5, [
    ([("GPT와 Claude의 대결은 두 모델의 대결이 아닙니다. ", {"size": 32, "color": INK, "bold": True}),
      ("티어(4단계 라인업)의 대결입니다.", {"size": 32, "color": BLUE, "bold": True})], {"ls": 1.2}),
])
tb(s, 0.9, 3.7, 11.4, 0.85, [
    ([("OpenAI", {"size": 11.5, "color": INK, "bold": True}),
      (" — GPT-6 Astra→Luna 4티어 + 전문 세로 (F1)", {"size": 11.5, "color": SUB}),
      ("      ", {"size": 11.5, "color": SUB}),
      ("Anthropic", {"size": 11.5, "color": INK, "bold": True}),
      (" — Fable 5.2→Haiku 5.5 4티어 (F3)", {"size": 11.5, "color": SUB})], {"sa": 6}),
    ("두 카탈로그를 나란히 놓으면 티어가 1:1로 정렬된다 — 그래서 '티어 × 작업' 축으로 비교한다.", {"size": 11.5, "color": INK, "bold": True, "ls": 1.15}),
])
# agenda chips (inline, replaces vertical 01/02/03 stack)
chip(s, 0.9, 5.1, 3.7, 0.62, "01  라인업 — 각 티어에 어떤 모델이 대응하나", size=9.5)
chip(s, 4.85, 5.1, 3.7, 0.62, "02  비용·성능 — 80배 격차와 한측 소스 벤치마크", size=9.5)
chip(s, 8.8, 5.1, 3.63, 0.62, "03  결정 — '작업 × 티어' 매핑으로 고르는 법", size=9.5)
footnote(s, "이 덱의 범위 — 공식 문서 기준 · 독립 벤치마크 아님 (F8·F9 미수행, 주장 없음)")

# ===== S3 — archetype: data-table =====
s = new_slide(); chrome(s, "02 — 근거 Evidence", "숫자는 전부 오늘 취득 — 단 F6는 벤더 발표", 3)
# summary chips (top right)
chip(s, 8.3, 1.72, 1.3, 0.4, "확인 7", tcolor="157A3C", border=LINE, size=9)
chip(s, 9.75, 1.72, 1.3, 0.4, "한측 1", tcolor=AMBER_TX, border=LINE, size=9)
chip(s, 11.2, 1.72, 1.23, 0.4, "미검증 2", tcolor=RED_TX, border=LINE, size=9)
rows3 = [
    ("F1", "OpenAI 라인업 — GPT-6 Astra·Sol·Terra·Luna·Cyber + 5.x + 오픈웨이트 + 전문 모델", GREEN, "확인", "developers.openai.com"),
    ("F2", "OpenAI 모델 선택 — Luna=비용 효율, Astra=능력 최상, 추론 노력 7단계", GREEN, "확인", "developers.openai.com"),
    ("F3", "Claude 라인업 역할 — Fable 5.2 · Opus 5.5 · Sonnet 5.5 · Haiku 5.5", GREEN, "확인", "platform.claude.com"),
    ("F4", "Claude API 가격 — Fable $8/$40 · Opus $4/$20 · Sonnet $2/$10 · Haiku $0.10/$0.50", GREEN, "확인", "platform.claude.com"),
    ("F5", "Fable/Mythos 5.2 — 동일 모델, Mythos는 검증 프로그램 · 30% 고속 · fast 2.5×", GREEN, "확인", "anthropic.com"),
    ("F6", "벤치마크 — FrontierCode: Fable 49.1 > Opus 45.5 > GPT-6 Astra 42.8 (Anthropic 공고)", AMBER, "확인 (한측)", "anthropic.com (단일 소스)"),
    ("F7", "Anthropic 구조 신호 — PBC(공익법인) · S-1 IPO (10-26) · Public Benefit Fund · 약물 개발 연구", GREEN, "확인", "anthropic.com/news"),
    ("F8·F9", "OpenAI 공식 입장 진술 · 독립(비벤더) 벤치마크 — 미취득·미수행, 주장하지 않음", RED, "미검증", "—"),
]
ty = 2.35
tb(s, 0.9, ty, 0.8, 0.3, [("#", {"size": 9, "color": MUT, "mono": True, "spc": 100})])
tb(s, 1.7, ty, 6.6, 0.3, [("내용", {"size": 9, "color": MUT, "spc": 100})])
tb(s, 8.4, ty, 1.6, 0.3, [("상태", {"size": 9, "color": MUT, "spc": 100})])
tb(s, 10.05, ty, 2.4, 0.3, [("근거 (HTTP 200, 2026-11-12)", {"size": 9, "color": MUT, "spc": 100, "align": PP_ALIGN.RIGHT})])
rect(s, 0.9, ty + 0.34, 11.53, 0.022, INK)
ry = ty + 0.44
for i, (fid, txt, dc, st, src) in enumerate(rows3):
    y = ry + i * 0.51
    if i < len(rows3) - 1:
        hairline(s, 0.9, y + 0.47, 11.53)
    if fid == "F6":
        rect(s, 0.9, y + 0.06, 0.035, 0.34, AMBER)
    if fid == "F8·F9":
        tb(s, 0.9, y, 0.8, 0.3, [(fid, {"size": 10, "color": MUT, "mono": True, "bold": True})])
        tb(s, 1.7, y, 6.5, 0.4, [(txt, {"size": 10.5, "color": MUT})])
        dot(s, 8.42, y + 0.09, 0.08, RED)
        tb(s, 8.62, y, 1.5, 0.3, [(st, {"size": 9.5, "color": MUT})])
        tb(s, 10.05, y, 2.4, 0.3, [(src, {"size": 9, "color": MUT, "mono": True, "align": PP_ALIGN.RIGHT})])
    else:
        tb(s, 0.9, y, 0.8, 0.3, [(fid, {"size": 10, "color": INK, "mono": True, "bold": True})])
        tb(s, 1.7, y, 6.5, 0.4, [(txt, {"size": 10.5, "color": SUB})])
        dot(s, 8.42, y + 0.09, 0.08, dc)
        stc = AMBER_TX if dc == AMBER else ("157A3C" if dc == GREEN else RED_TX)
        tb(s, 8.62, y, 1.5, 0.3, [(st, {"size": 9.5, "color": stc, "bold": dc != GREEN})])
        src_c = AMBER_TX if dc == AMBER else MUT
        tb(s, 10.05, y, 2.4, 0.3, [(src, {"size": 9, "color": src_c, "mono": True, "align": PP_ALIGN.RIGHT})])

# ===== S4 — archetype: ladder (OpenAI) =====
s = new_slide(); chrome(s, "03 — 라인업 OpenAI", "OpenAI의 카드는 폭 — 4티어 + 전문 세로 확장", 4)
tb(s, 0.9, 1.72, 11.53, 0.26, [("카탈로그 출처 — developers.openai.com (F1)", {"size": 8.5, "color": MUT, "spc": 60, "align": PP_ALIGN.RIGHT})])
lad4 = [
    ("01", "GPT-6 Astra", "플래그십 — 가장 어려운 추론 · 코딩", BLUE, True),
    ("02", "GPT-6.1 Sol", "복잡한 작업 — Astra에 근접한 성능, 낮은 비용", "E8EEFB", False),
    ("03", "GPT-6.1 Terra", "비주얼 추론 · 정밀 컴퓨터 사용 · 자연스러운 글쓰기", INK_TINT, False),
    ("04", "GPT-6 Luna", "집중형 대량 작업에 가장 효율적", INK_TINT2, False),
]
lw4 = [11.53, 10.5, 9.5, 8.5]
for no, name, role, fill, focal in lad4:
    i = int(no) - 1
    y = 1.95 + i * 0.78
    rect(s, 0.9, y, lw4[i], 0.62, BLUE if focal else fill, BLUE if focal else LINE, 1.0)
    tb(s, 1.12, y + 0.16, 0.6, 0.34, [(no, {"size": 16, "color": PAPER if focal else SUB, "disp": True, "bold": True})])
    tb(s, 1.78, y + 0.13, 3.1, 0.4, [(name, {"size": 15, "color": INK_TX if focal else INK, "mono": True, "bold": True})])
    tb(s, 5.15, y + 0.18, lw4[i] - 5.5, 0.4, [(role, {"size": 10.5, "color": PAPER if focal else SUB})])
tb(s, 0.9, 5.18, 6.0, 0.3, [("티어 아래 — 세로 (전문) 확장 (F1)", {"size": 9.5, "color": MUT, "bold": True, "spc": 160})])
c4 = [("GPT-6 Cyber — 허가된 취약점 작업", 2.7), ("gpt-oss-120b/20b — 오픈웨이트 (H100)", 2.9),
      ("음성 · 이미지 전문 라인 (Audio · GPT-Image)", 3.0), ("ChatGPT — 소비자 생태계", 2.7)]
cx = 0.9
for txt, w in c4:
    chip(s, cx, 5.54, w, 0.46, txt, size=8.5)
    cx += w + 0.14
footnote(s, "추론 — '능력 × 비용' 사다리: 같은 작업을 Luna Low → Astra XHigh 7단계로 모델·노력 조합 (F2) — 공식 주장이 아니라 카탈로그 구조의 해석", color=AMBER_TX, italic=True)

# ===== S5 — archetype: ladder + band (Anthropic) =====
s = new_slide(); chrome(s, "03 — 라인업 Anthropic", "Anthropic의 카드는 안전 — 4티어 + 검증 프로그램 분리 모델", 5)
tb(s, 0.9, 1.72, 11.53, 0.26, [("카탈로그 출처 — platform.claude.com (F3)", {"size": 8.5, "color": MUT, "spc": 60, "align": PP_ALIGN.RIGHT})])
lad5 = [
    ("01", "Claude Fable 5.2", "강인한 추론 · 장기 에이전트 작업", True),
    ("02", "Claude Opus 5.5", "장기 에이전틱 코딩 · 지식 업무 — 기본 권장", False),
    ("03", "Claude Sonnet 5.5", "속도와 지능의 최적 조합", False),
    ("04", "Claude Haiku 5.5", "대량 · 지연 민감 (분류·추출·라우팅)", False),
]
lw5 = [11.53, 10.7, 9.9, 9.1]
for no, name, role, focal in lad5:
    i = int(no) - 1
    y = 1.95 + i * 0.6
    rect(s, 0.9, y, lw5[i], 0.46, INK if focal else INK_TINT, INK if focal else LINE, 1.0)
    tb(s, 1.12, y + 0.08, 0.6, 0.32, [(no, {"size": 15, "color": INK_TX2 if focal else SUB, "disp": True, "bold": True})])
    tb(s, 1.78, y + 0.08, 3.3, 0.32, [(name, {"size": 14, "color": INK_TX if focal else INK, "mono": True, "bold": True})])
    tb(s, 5.35, y + 0.11, lw5[i] - 5.7, 0.32, [(role, {"size": 10.5, "color": "C7D2E0" if focal else SUB})])
# FABLE=MYTHOS band
rect(s, 0.9, 4.5, 11.53, 0.82, BLUE_TINT)
rect(s, 0.9, 4.5, 0.045, 0.82, BLUE)
tb(s, 1.18, 4.62, 11.0, 0.3, [("FABLE = MYTHOS — 동일한 기반 모델, 접근만 분리 (F5)", {"size": 11, "color": BLUE_D, "bold": True, "spc": 80})])
tb(s, 1.18, 4.94, 11.0, 0.32, [("Fable = 일반 공개(사이버·바이오 안전장치 포함) · Mythos = Life Sciences · Cyber 검증 프로그램 조직 — '이중용도'를 가격으로 분리한 구조", {"size": 10, "color": SUB})])
tb(s, 0.9, 5.56, 5.0, 0.3, [("안전 체계 신호 (F5)", {"size": 9.5, "color": MUT, "bold": True, "spc": 180})])
saf = ["System Card 공개 · 샌드박스 탈출 평가 (프리릴리스 안전 테스트)",
       "사이버·바이오 안전장치 · 최강 증류 방어",
       "Opus 5.5 — 전세대 대비 실행 비용 40% 절감 (2026-09-22)"]
for i, t in enumerate(saf):
    y = 5.9 + i * 0.32
    dot(s, 0.94, y + 0.07, 0.07, GREEN)
    tb(s, 1.18, y, 11.2, 0.3, [(t, {"size": 10, "color": SUB})])

# ===== S6 — archetype: duel (dark act) =====
s = new_slide(INK); chrome_dark(s, "04 — 추구 Pursuit", "각사가 추구하는 것은 다르다 — 능력의 폭 vs 안전과 신뢰", 6)
rect(s, 6.66, 1.85, 0.011, 4.0, INK_LINE)
# left panel
tb(s, 0.9, 1.85, 5.5, 0.4, [("OpenAI", {"size": 15, "color": PAPER, "bold": True})])
tb(s, 0.9, 2.24, 5.5, 0.26, [("신호 (확인 — F1·F2)", {"size": 8.5, "color": INK_TX2, "bold": True, "spc": 160})])
tb(s, 0.9, 2.68, 5.5, 0.55, [("능력의 폭 × 규모", {"size": 26, "color": BLUE_L, "bold": True})])
sig6l = ["멀티모달 풀스택 — 텍스트 · 오디오 · 이미지 · 리얼타임",
         "4티어 + 전문 세로 (사이버 · 라이프사이언스 · 오픈웨이트)",
         "소비자 규모 — ChatGPT(상업 · 광고 · 플러그인)",
         "모델 × 추론 노력 7단계 선택 체계"]
for i, t in enumerate(sig6l):
    y = 3.5 + i * 0.37
    tb(s, 0.9, y, 5.5, 0.34, [([("—  ", {"size": 10.5, "color": BLUE_L, "bold": True}), (t, {"size": 10.5, "color": LTX})], {"ls": 1.05})])
tb(s, 0.9, 5.1, 5.5, 0.6, [("추론 — '능력 확장 × 소비자 규모' 방향. (F8: 공식 입장 진술은 미취득 — 해석임)", {"size": 9.5, "color": AMBER_L, "italic": True, "ls": 1.15})])
# right panel
tb(s, 6.83, 1.85, 5.5, 0.4, [("Anthropic", {"size": 15, "color": PAPER, "bold": True})])
tb(s, 6.83, 2.24, 5.5, 0.26, [("신호 (확인 — F5·F7)", {"size": 8.5, "color": INK_TX2, "bold": True, "spc": 160})])
tb(s, 6.83, 2.68, 5.5, 0.55, [("안전과 신뢰 × 공익 구조", {"size": 26, "color": PAPER, "bold": True})])
sig6r = ["PBC(공익법인) · S-1 IPO (2026-10-26) · Public Benefit Fund",
         "안전·정렬 체계 — System Card · 샌드박스 탈출 평가 · 증류 방어",
         "이중용도 분리 — Mythos 검증 프로그램 (사이버 · 라이프사이언스)",
         "과학 적용 — 6개 조직과 약물 개발 파트너십 (2026-10-27)"]
for i, t in enumerate(sig6r):
    y = 3.5 + i * 0.37
    tb(s, 6.83, y, 5.5, 0.34, [([("—  ", {"size": 10.5, "color": PAPER, "bold": True}), (t, {"size": 10.5, "color": LTX})], {"ls": 1.05})])
tb(s, 6.83, 5.1, 5.5, 0.6, [("추론 — '안전과 기업 신뢰' 방향. (자본 구조와 법인 형태에서 읽은 해석)", {"size": 9.5, "color": AMBER_L, "italic": True, "ls": 1.15})])
# anchored conclusion
hairline(s, 0.9, 5.95, 11.53, INK_LINE)
tb(s, 0.9, 6.1, 11.5, 0.55, [
    ("같은 '최강 모델'이라도 방향이 다르다 — OpenAI는 폭(모달리티·세로·규모)으로, Anthropic은 안전 구조(검증·분리·PBC)로 경쟁한다.",
     {"size": 12, "color": PAPER, "bold": True, "ls": 1.15}),
    ("이 덱의 모든 '추구' 표현은 위 신호에 기반한 추론이다.", {"size": 9.5, "color": INK_TX2}),
])

# ===== S7 — archetype: price-scale =====
s = new_slide(); chrome(s, "05 — 비용 Cost", "가격 격차는 80배 — Haiku $0.10에서 Fable $40까지", 7)
# log-scale bars (output $/MTok): domain log10 [-1.0, 1.65], x 3.2..9.6
X0, XW = 3.2, 6.4
def logx(v):
    import math
    return X0 + (math.log10(v) + 1.0) / 2.65 * XW
bars7 = [
    ("Claude Fable 5.2", "입력 $8", 40.0, BLUE),
    ("Claude Opus 5.5", "입력 $4", 20.0, INK),
    ("Claude Sonnet 5.5", "입력 $2", 10.0, INK),
    ("Claude Haiku 5.5", "입력 $0.10", 0.5, INK),
]
# Swiss grid: vertical hairlines at axis ticks (structure under bars)
for gx_ in (X0, logx(1.0), logx(10.0)):
    rect(s, gx_, 2.0, 0.008, 3.42, LINE)
for i, (name, inn, val, col) in enumerate(bars7):
    y = 2.05 + i * 0.78
    tb(s, 0.9, y + 0.03, 2.2, 0.3, [(name, {"size": 11.5, "color": INK, "mono": True, "bold": True})])
    tb(s, 0.9, y + 0.3, 2.2, 0.24, [(inn, {"size": 8.5, "color": MUT})])
    w = max(logx(val) - X0, 0.14)
    rect(s, X0, y + 0.06, w, 0.4, col)
    tb(s, X0 + w + 0.12, y + 0.12, 1.6, 0.3, [("$%.2f" % val if val < 1 else "$%d" % val,
                                               {"size": 14, "color": INK, "mono": True, "bold": True})])
    if name.startswith("Claude Fable"):
        tb(s, 9.0, y + 0.34, 1.0, 0.24, [("fast $16/$80", {"size": 8, "color": MUT, "align": PP_ALIGN.RIGHT})])
# axis
hairline(s, X0, 5.42, XW, LINE)
for tv_, tx_ in [("$0.10", X0), ("$1", logx(1.0)), ("$10", logx(10.0))]:
    tb(s, tx_ - 0.3, 5.48, 0.6, 0.22, [(tv_, {"size": 8, "color": MUT, "mono": True, "align": PP_ALIGN.CENTER})])
tb(s, 0.9, 5.48, 4.3, 0.22, [("출력 $/MTok · 로그 스케일 (F4)", {"size": 8.5, "color": MUT, "spc": 40})])
# 80x display (right)
tb(s, 10.1, 2.35, 2.3, 0.3, [("HAIKU → FABLE", {"size": 9, "color": MUT, "bold": True, "spc": 200, "align": PP_ALIGN.CENTER})])
tb(s, 9.9, 2.62, 2.6, 1.3, [("80×", {"size": 80, "color": INK, "bold": True, "disp": True, "align": PP_ALIGN.CENTER})])
tb(s, 10.1, 4.15, 2.3, 0.3, [("출력 $0.50 → $40", {"size": 10, "color": SUB, "align": PP_ALIGN.CENTER})])
tb(s, 10.1, 4.42, 2.3, 0.3, [("입력 $0.10 → $8", {"size": 10, "color": MUT, "align": PP_ALIGN.CENTER})])
tb(s, 10.1, 4.85, 2.3, 0.5, [
    ("Fable = Opus의 2배", {"size": 9.5, "color": SUB, "align": PP_ALIGN.CENTER, "sa": 2}),
    ("최상위 프리미엄 구조 (F4)", {"size": 9.5, "color": MUT, "align": PP_ALIGN.CENTER}),
])
footnote(s, "범위 한계 — OpenAI API 가격 미취득 → OpenAI 가격 수치 0건 · 모든 가격은 Anthropic 문서(F4) — 한 회사 기준")

# ===== S8 — archetype: bar-grid =====
s = new_slide(); chrome(s, "05 — 성능 Performance", "최상위 점수는 Fable 5.2 — 단 그 숫자는 Anthropic의 보고", 8)
chip(s, 7.0, 1.72, 5.43, 0.42, "벤더 발표 — Anthropic 공고 (2026-11-09) · 한측 소스 (F6)", tcolor=AMBER_TX, border=AMBER, size=9)
cols8 = [("FABLE 5.2", 3.75, BLUE), ("OPUS 5.5", 5.95, BAR_GRY), ("GPT-6 ASTRA", 8.15, BAR_GRY), ("GEMINI 4 CARBON", 10.35, BAR_GRY)]
tb(s, 0.9, 2.32, 2.7, 0.3, [("EVAL", {"size": 9, "color": MUT, "spc": 160})])
for lab, cx_, bc in cols8:
    tb(s, cx_, 2.32, 2.0, 0.3, [(lab, {"size": 9, "color": MUT if bc == BAR_GRY else BLUE, "spc": 120, "bold": bc != BAR_GRY})])
rect(s, 0.9, 2.66, 11.53, 0.022, INK)
rows8 = [
    ("FrontierCode 2.0 (에이전틱 코딩)", [("49.1", 49.1, "(Xhigh)"), ("45.5", 45.5, ""), ("42.8", 42.8, ""), ("41.1", 41.1, "")]),
    ("Humanity's Last Exam (tools)", [("74.2", 74.2, ""), ("67.7", 67.7, ""), ("57.2", 57.2, ""), ("—", None, "")]),
    ("OSWorld 2.1 (컴퓨터 사용)", [("89.3", 89.3, ""), ("87.2", 87.2, ""), ("79.5", 79.5, ""), ("81.5", 81.5, "")]),
]
for ri, (ev, vals) in enumerate(rows8):
    y = 2.86 + ri * 0.95
    if ri < 2:
        hairline(s, 0.9, y + 0.88, 11.53)
    tb(s, 0.9, y + 0.12, 2.7, 0.4, [(ev, {"size": 10.5, "color": SUB})])
    for (lab, cx_, bc), (vtxt, vnum, sub) in zip(cols8, vals):
        fsz = 15 if bc == BLUE else 13
        tb(s, cx_, y, 2.0, 0.34, [([(vtxt, {"size": fsz, "color": INK if bc == BLUE else SUB, "mono": True, "bold": bc == BLUE}),
                                    ((" " + sub) if sub else "", {"size": 8, "color": MUT, "mono": True})], {})] )
        if vnum is not None:
            bh = 0.2 if bc == BLUE else 0.16
            rect(s, cx_, y + 0.4, vnum / 100.0 * 1.85, bh, BLUE if bc == BLUE else BAR_GRY)
tb(s, 0.9, 5.92, 11.5, 0.3, [("Fable 5.2 High effort ≈ Opus 5.5 Max effort, 약 절반 비용 — '노력(effort)' 변수가 성능 비교의 핵심 축 (F6)", {"size": 10.5, "color": SUB})])
footnote(s, "독립 검증 미수행 (F9) — 이 표는 'Anthropic이 주장하는 순위'로만 읽어야 한다. OpenAI·Gemini 공식 수치가 같은 벤치마크에 있다면, 비교는 한측 소스 안에서만 성립한다.", color=RED_TX, italic=True)

# ===== S9 — archetype: two-col (strengths) =====
s = new_slide(); chrome(s, "06 — 강점 Strengths", "각사의 강점 — 폭과 생태계 vs 장기 에이전트와 신뢰", 9)
for px_, head, sub in [(0.9, "OpenAI (신호 기반)", "F1·F2"), (6.83, "Anthropic (신호 기반)", "F3·F5·F7")]:
    tb(s, px_, 1.95, 5.5, 0.4, [(head, {"size": 13.5, "color": INK, "bold": True})])
    tb(s, px_, 2.34, 5.5, 0.26, [("확인 신호 " + sub, {"size": 8.5, "color": MUT, "spc": 160, "bold": True})])
    rect(s, px_, 2.68, 5.5, 0.022, INK)
def two_col_items(px_, items):
    for i, (term, desc) in enumerate(items):
        y = 2.95 + i * 0.8
        tb(s, px_, y, 5.5, 0.3, [(term, {"size": 13, "color": INK, "bold": True})])
        tb(s, px_, y + 0.3, 5.5, 0.4, [(desc, {"size": 10, "color": SUB, "ls": 1.1})])
two_col_items(0.9, [
    ("멀티모달 풀스택", "음성 (Realtime·Live) · 이미지 · 텍스트를 한 카탈로그 (F1)"),
    ("비용 사다리", "Luna~Astra + 추론 노력 7단계로 작업별 정밀 선택 (F2)"),
    ("오픈웨이트 옵션", "gpt-oss-120b/20b — 자가 호스팅 시나리오 가능 (F1)"),
    ("소비자 생태계", "ChatGPT 상업·광고·플러그인이라는 독보적 채널 (F1)"),
])
two_col_items(6.83, [
    ("장기 에이전트 특화", "Fable(장기 호라이즌) · Opus(장기 코딩)의 역할 분화 (F3·F5)"),
    ("비용 개선 속도", "Opus 5.5 — 전세대 대비 실행 비용 40% 절감 (F5)"),
    ("기업 인프라", "1M 컨텍스트 · 프롬프트 캐싱 · 데이터 거주지 · Managed Agents (F4)"),
    ("신뢰 구조", "System Card · 검증 프로그램 · PBC (F5·F7)"),
])
footnote(s, "'강점'도 '각사 자기 문서의 문장'이다 — 위 목록은 F1~F7 확인 신호의 재구성이지, 두 회사의 상대적 우열이 아닙니다. 우열 판단은 독립 벤치마크(F9)가 전제된다.")

# ===== S10 — archetype: two-col (weaknesses) =====
s = new_slide(); chrome(s, "06 — 약점 Weaknesses", "각사의 약점 — 증거에 있는 것과 없는 것", 10)
for px_, head in [(0.9, "OpenAI (증거 기반 리스크)"), (6.83, "Anthropic (증거 기반 리스크)")]:
    tb(s, px_, 1.95, 5.5, 0.4, [(head, {"size": 13.5, "color": INK, "bold": True})])
    rect(s, px_, 2.68, 5.5, 0.022, INK)
def risk_items(px_, items):
    for i, (dc, term, desc) in enumerate(items):
        y = 3.15 + i * 1.0
        dot(s, px_ + 0.03, y + 0.09, 0.08, dc)
        tb(s, px_ + 0.25, y, 5.25, 0.3, [(term, {"size": 13, "color": INK, "bold": True})])
        tb(s, px_ + 0.25, y + 0.32, 5.25, 0.5, [(desc, {"size": 10, "color": SUB, "ls": 1.15})])
risk_items(0.9, [
    (AMBER, "버전 전환 빈도", "5.2 → 5.4 → 5.5 → 5.6 → 6 → 6.1 연속 전환, 비활성화 계열 다수 (F1) · 마이그레이션 부하 (추론)"),
    (RED, "안전 구조 신호 미취득", "이번 세션에 안전 체계 공식 문서 확인 없음 (F8 미검증) — '없다'가 아니라 '확인 못 함'"),
    (AMBER, "플래그십 의존", "가장 어려운 작업은 Astra로 수렴하는 구조 (F2) · 비용 상한이 명확 (추론)"),
])
risk_items(6.83, [
    (AMBER, "최상위 티어 프리미엄", "Fable = Opus 2배 가격, fast mode 2배 (F4) · 장기 에이전트 작업의 비용 상한 (추론)"),
    (AMBER, "접근 분리", "Mythos(무방비 버전)는 검증 프로그램 조직만 · 일률적 접근 아님 (F5)"),
    (AMBER, "오픈웨이트 부재", "카탈로그에 공개 검증치 모델 없음 (F1 vs F3 비교) · 자가 호스팅 경로는 제한 (추론)"),
])
footnote(s, "약점 = F1~F7로부터의 추론이지, 각 회사의 공식 인정 진술이 아니다. (F8 OpenAI 입장 미취득 — 좌측 두 번째 항목은 확인 부재의 보고)", color=RED_TX, italic=True)

# ===== S11 — archetype: matrix =====
s = new_slide(); chrome(s, "07 — 결정 Decision", "모델 결정은 티어 선택이지 브랜드 선택이 아니다", 11)
tb(s, 10.55, 1.62, 1.88, 0.3, [("1:1", {"size": 30, "color": INK, "bold": True, "disp": True, "align": PP_ALIGN.RIGHT})])
tb(s, 8.9, 1.98, 3.53, 0.26, [("4티어가 대응한다", {"size": 9, "color": MUT, "spc": 120, "align": PP_ALIGN.RIGHT})])
tb(s, 0.9, 2.3, 2.0, 0.3, [("티어", {"size": 9, "color": MUT, "spc": 100})])
tb(s, 3.3, 2.3, 3.4, 0.3, [("OPENAI (F1)", {"size": 9, "color": MUT, "spc": 160})])
tb(s, 6.7, 2.3, 0.6, 0.3, [("", {"size": 9})])
tb(s, 7.4, 2.3, 4.6, 0.3, [("ANTHROPIC (F3)", {"size": 9, "color": MUT, "spc": 160})])
rect(s, 0.9, 2.64, 11.53, 0.022, INK)
rows11 = [
    ("①", "플래그십", "GPT-6 Astra", "Claude Fable 5.2"),
    ("②", "복잡한 작업", "GPT-6.1 Sol", "Claude Opus 5.5"),
    ("③", "속도 + 지능", "GPT-6.1 Terra", "Claude Sonnet 5.5"),
    ("④", "대량 · 저비용", "GPT-6 Luna", "Claude Haiku 5.5"),
]
for i, (no, tier, oai, ant) in enumerate(rows11):
    y = 2.84 + i * 0.56
    if i < 3:
        hairline(s, 0.9, y + 0.5, 11.53)
    tb(s, 0.9, y + 0.06, 0.5, 0.35, [(no, {"size": 13, "color": MUT, "disp": True})])
    tb(s, 1.5, y + 0.09, 1.7, 0.3, [(tier, {"size": 11.5, "color": INK, "bold": True})])
    tb(s, 3.3, y + 0.09, 3.4, 0.3, [(oai, {"size": 11.5, "color": SUB, "mono": True})])
    tb(s, 6.75, y + 0.06, 0.5, 0.35, [("↔", {"size": 11, "color": MUT, "mono": True, "align": PP_ALIGN.CENTER})])
    tb(s, 7.4, y + 0.09, 4.6, 0.3, [(ant, {"size": 11.5, "color": SUB, "mono": True})])
tb(s, 0.9, 5.22, 11.5, 0.35, [
    ([("4티어가 1:1로 대응한다. ", {"size": 12, "color": INK, "bold": True}),
      ("'GPT인가 Claude인가'는 질문이 안 되고, '내 작업은 어느 티어인가'가 질문이 된다.", {"size": 12, "color": SUB})], {}),
])
# decision strip (ink)
rect(s, 0.9, 5.75, 11.53, 1.0, INK)
tb(s, 1.18, 5.92, 11.0, 0.26, [("결정 절차 (제안 — 이 실습의 프레임)", {"size": 9, "color": INK_TX2, "bold": True, "spc": 200})])
tb(s, 1.18, 6.22, 11.0, 0.42, [("① 작업 분류 (양 · 지연 · 복잡도) → ② 티어 선택 (4티어, 양사 1:1) → ③ 같은 티어에서 자기 워크로드로 평가 (벤더 수치는 한측 소스, F6)",
                                 {"size": 12, "color": INK_TX, "bold": True})])

# ===== S12 close (ink) — archetype: close/center =====
s = new_slide(INK)
tb(s, 0.9, 0.78, 6.0, 0.3, [("11 — 출처 SOURCES", {"size": 10, "color": INK_TX2, "bold": True, "spc": 240})])
tb(s, 6.43, 0.78, 5.1, 0.3, [("2026-11-12", {"size": 10, "color": INK_TX2, "mono": True, "align": PP_ALIGN.RIGHT})])
hairline(s, 0.9, 1.42, 11.53, INK_LINE)
tb(s, 0.9, 2.25, 11.6, 1.3, [
    ("취득일 2026-11-12.", {"size": 28, "color": PAPER, "bold": True, "ls": 1.2}),
    ("모든 수치는 벤더 취득 — 독립 검증은 미수행.", {"size": 28, "color": PAPER, "bold": True, "ls": 1.2}),
])
src12 = [
    (GREEN, "developers.openai.com · platform.claude.com · anthropic.com", "HTTP 200 — F1~F5 · F7 확인"),
    (AMBER, "anthropic.com (벤치마크 표)", "F6 — 한측 소스 · OpenAI 독립 보고 없음"),
    (RED, "독립 벤치마크 · OpenAI 공식 입장", "F8 · F9 — 미수행 · 미취득 (주장 없음)"),
]
for i, (dc, u, st) in enumerate(src12):
    y = 4.25 + i * 0.52
    dot(s, 0.94, y + 0.09, 0.09, dc)
    tb(s, 1.22, y, 7.5, 0.3, [(u, {"size": 11, "color": INK_TX, "mono": True})])
    tb(s, 8.6, y + 0.02, 3.83, 0.3, [(st, {"size": 9.5, "color": INK_TX2, "align": PP_ALIGN.RIGHT})])
hairline(s, 0.9, 6.82, 11.53, INK_LINE)
tb(s, 0.9, 7.02, 8.6, 0.3, [("근거표 01-facts.md · 심층 글 02-article.md · 검증 로그 04-verification-log.md", {"size": 9, "color": INK_TX2, "spc": 60})])
tb(s, 10.43, 7.02, 2.0, 0.3, [("END", {"size": 9, "color": INK_TX2, "mono": True, "align": PP_ALIGN.RIGHT, "spc": 200})])

out = os.path.join(BASE, "03-deck.pptx")
# speaker notes (목적/전환) — every slide (idea-adopted: yjj3019/ProposalSkills, MIT)
NOTES = [
    "목적: 프레이밍 — '모델의 전쟁이 아니라 4티어 라인업의 전쟁'. 전환: 2장의 중심 질문으로.",
    "목적: 중심 주장 — '티어의 대결, 모델의 대결이 아님' + 덱 구조(라인업/비용·성능/결정). 전환: 주장의 근거 — 숫자의 출처.",
    "목적: 근거 9건 투명 보고 (확인 7 · 한측 소스 1 · 미검증 2=주장 없음). F6 앰버 = 벤더 발표(한측). 전환: 각사가 실제로 내보낸 라인업.",
    "목적: OpenAI의 카드 — 4티어 + 전문 세로의 폭 (F1). 사다리 해석은 추론임을 강조. 전환: Anthropic의 카드 비교.",
    "목적: Anthropic의 카드 — 안전 구조 + 검증 프로그램 분리 (Fable=Mythos, F5). 전환: 무엇이 추구되는가 — 방향 질문.",
    "목적: 덱의 클라이맥스 — 각사 추구 방향은 신호 기반 추론(추론 라벨 명시). F8 미취득은 확인 부재의 보고. 전환: 격차를 수치화하는 가격 구조.",
    "목적: 로그 스케일 80배 가격 격차 (F4) — 단 한 회사(Anthropic) 기준, OpenAI 수치 0건. 전환: 성능 — 그리고 그 숫자의 한측 소스.",
    "목적: 최상위 점수 Fable 5.2 — 단 Anthropic 자체 발표 (F6, 한측 소스·앰버). 독립 검증은 미수행. 전환: 각사 문서 기준 강점.",
    "목적: 양사 강점 — 확인 신호의 재구성이지 상대적 우열의 주장이 아님. 전환: 증거에 없는 것 — 약점.",
    "목적: 약점 — 추론과 확인 부재의 구분 (좌2는 '없다'가 아닌 '확인 못 함'). 전환: 결정의 방법 — 티어 선택.",
    "목적: 1:1 티어 매핑 + 3단계 결정 절차 (이 실습의 제안 프레임). 전환: 출처 목록 — 어떤 수치가 확인됐고 어떤 것이 아닌지.",
    "목적: 최종 투명성 보고 — 취득일, 벤더 취득, 독립 검증 미수행의 한계. 전환: (종료) 상세는 01-facts.md · 02-article.md.",
]
for sl, n in zip(prs.slides, NOTES):
    sl.notes_slide.notes_text_frame.text = n
prs.save(out)
print("PPTX OK slides=%d" % len(prs.slides._sldIdLst))

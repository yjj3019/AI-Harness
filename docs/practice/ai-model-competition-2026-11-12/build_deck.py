# -*- coding: utf-8 -*-
"""GPT vs Claude AI competition sample (2026-11-12) — v6 craft-gate build.
Editorial hairline system (ink/paper + single blue accent). Generates 03-deck.pptx (12 slides).
Evidence: 01-facts.md (F1~F9). Vendor benchmark = amber (one-sided source).
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

META5 = "GPT vs CLAUDE · 2026-11-12 · 근거 01-facts.md"

def chrome(slide, kicker, title, page):
    rect(slide, 0.9, 0.665, 0.09, 0.09, BLUE)
    tb(slide, 1.12, 0.56, 10.5, 0.3, [(kicker.upper(), {"size": 9.5, "color": MUT, "bold": True, "spc": 200})])
    tb(slide, 0.88, 0.9, 11.6, 0.7, [(title, {"size": 27, "color": INK, "bold": True})])
    tb(slide, 0.9, 7.16, 8.0, 0.28, [(META5, {"size": 8.5, "color": MUT, "spc": 60})])
    tb(slide, 11.03, 7.16, 1.4, 0.28, [("%02d / 12" % page, {"size": 8.5, "color": MUT, "mono": True, "align": PP_ALIGN.RIGHT})])

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
tb(s, 0.9, 0.78, 6.0, 0.3, [("AI MODEL COMPETITION — SAMPLE", {"size": 10, "color": INK_TX2, "bold": True, "spc": 240})])
tb(s, 6.43, 0.78, 5.1, 0.3, [("2026-11-12", {"size": 10, "color": INK_TX2, "mono": True, "align": PP_ALIGN.RIGHT})])
hairline(s, 0.9, 1.42, 11.53, INK_LINE)
tb(s, 0.86, 2.2, 11.8, 1.2, [("GPT vs Claude", {"size": 64, "color": PAPER, "bold": True, "disp": True})])
tb(s, 0.9, 3.55, 11.0, 0.5, [("AI 경합 — OpenAI GPT 시리즈 vs Anthropic Claude 라인업의 추구와 장단점", {"size": 16, "color": "C7D2E0"})])
dot(s, 0.92, 4.62, 0.09, GREEN); tb(s, 1.18, 4.52, 3.4, 0.3, [("확인 6 — F1~F5 · F7", {"size": 10.5, "color": INK_TX, "spc": 60})])
dot(s, 4.6, 4.62, 0.09, AMBER); tb(s, 4.86, 4.52, 3.6, 0.3, [("한측 소스 1 — F6 (벤더 발표)", {"size": 10.5, "color": INK_TX, "spc": 60})])
dot(s, 8.6, 4.62, 0.09, RED); tb(s, 8.86, 4.52, 3.3, 0.3, [("미검증 2 — F8 · F9 (주장 없음)", {"size": 10.5, "color": INK_TX, "spc": 60})])
hairline(s, 0.9, 6.82, 11.53, INK_LINE)
tb(s, 0.9, 7.02, 8.6, 0.3, [("산출물 4종 · 구조 · 렌더 · 스코어카드 검증 — 04-verification-log.md", {"size": 9, "color": INK_TX2, "spc": 60})])
tb(s, 10.43, 7.02, 2.0, 0.3, [("ARTIFACTS 04", {"size": 9, "color": INK_TX2, "mono": True, "align": PP_ALIGN.RIGHT})])

# ===== S2 question =====
s = new_slide(); chrome(s, "01 — 질문 Question", "경합은 단일 모델이 아니라 4티어 라인업 전쟁", 2)
tb(s, 0.9, 1.95, 6.9, 1.5, [
    ("GPT와 Claude의 대결은", {"size": 24, "color": INK, "bold": True, "ls": 1.15}),
    ("두 모델의 대결이 아니다.", {"size": 24, "color": BLUE, "bold": True, "ls": 1.15}),
])
rect(s, 0.9, 3.78, 0.028, 1.42, BLUE)
tb(s, 1.22, 3.74, 6.4, 0.3, [("이 덱의 범위 — 공식 문서 비교 · 독립 벤치마크 아님", {"size": 9, "color": MUT, "bold": True, "spc": 180})])
tb(s, 1.22, 4.06, 6.3, 1.1, [("양사 모두 4티어 라인업(플래그십·중간·효율·대량) + 전문 모델(사이버·라이프사이언스)로 전환했다. 그래서 비교의 단위는 모델이 아니라 티어다.", {"size": 12.5, "color": SUB, "ls": 1.3})])
tb(s, 0.9, 5.5, 6.5, 0.3, [("이 덱이 답하는 것", {"size": 9.5, "color": MUT, "bold": True, "spc": 180})])
for i, (c, t) in enumerate([(GREEN, "라인업과 추구 — 각 티어의 역할과 각사의 방향 (F1~F7)"),
                            (AMBER, "비용과 성능 — 가격 80배 격차와 한측 소스 벤치마크 (F4·F6)"),
                            (GREEN, "결정법 — 티어 매핑으로 '작업 × 티어'를 고르는 법")]):
    y = 5.88 + i * 0.4
    dot(s, 0.92, y + 0.08, 0.08, c)
    tb(s, 1.2, y - 0.02, 6.5, 0.35, [(t, {"size": 12, "color": SUB})])
tb(s, 8.0, 1.95, 4.4, 0.3, [("그 비교는 3개의 축에 있다", {"size": 9.5, "color": MUT, "bold": True, "spc": 180})])
for i, (n, t, d) in enumerate([("01", "라인업", "각 티어에 어떤 모델이 대응하는가"),
                               ("02", "비용", "같은 티어 사이 가격 구조는"),
                               ("03", "성능", "숫자는 누가 발표한 것인가")]):
    y = 2.42 + i * 1.32
    tb(s, 8.0, y - 0.06, 1.3, 0.7, [(n, {"size": 30, "color": NUM_GHOST, "disp": True, "bold": True})])
    tb(s, 9.35, y, 3.05, 0.4, [(t, {"size": 16, "color": INK, "bold": True})])
    tb(s, 9.35, y + 0.42, 3.05, 0.7, [(d, {"size": 10.5, "color": SUB, "ls": 1.2})])
    if i < 2: hairline(s, 8.0, y + 1.12, 4.43)
tb(s, 8.0, 6.5, 4.43, 0.6, [("모든 수치는 2026-11-12 공식 출처 취득 — 벤더 발표 수치는 한측 소스 라벨을 붙인다.", {"size": 10, "color": MUT, "italic": True, "ls": 1.25})])

# ===== S3 evidence (editorial table) =====
s = new_slide(); chrome(s, "02 — 근거 Evidence", "숫자는 전부 오늘 취득 — 단 F6는 벤더 발표", 3)
dot(s, 0.92, 1.78, 0.08, GREEN); tb(s, 1.12, 1.68, 1.6, 0.3, [("확인", {"size": 10, "color": SUB, "spc": 80})])
dot(s, 2.0, 1.78, 0.08, AMBER); tb(s, 2.2, 1.68, 2.0, 0.3, [("확인(한측 소스)", {"size": 10, "color": SUB, "spc": 80})])
dot(s, 4.3, 1.78, 0.08, RED); tb(s, 4.5, 1.68, 1.8, 0.3, [("미검증 (주장 없음)", {"size": 10, "color": SUB, "spc": 80})])
ev = [("F1", "확인", GREEN, GREEN_TX, "OpenAI 라인업 — GPT-6 Astra·Sol·Terra·Luna·Cyber + 5.x + 오픈웨이트 + 전문 모델", "developers.openai.com"),
      ("F2", "확인", GREEN, GREEN_TX, "OpenAI 모델 선택 — Luna=비용 효율, Astra=능력 최상, 추론 노력 7단계", "developers.openai.com"),
      ("F3", "확인", GREEN, GREEN_TX, "Claude 라인업과 역할 — Fable 5.2 · Opus 5.5 · Sonnet 5.5 · Haiku 5.5", "platform.claude.com"),
      ("F4", "확인", GREEN, GREEN_TX, "Claude API 가격 — Fable $8/$40 · Opus $4/$20 · Sonnet $2/$10 · Haiku $0.10/$0.50", "platform.claude.com"),
      ("F5", "확인", GREEN, GREEN_TX, "Fable/Mythos 5.2 — 동일 모델, Mythos는 검증 프로그램 · 30% 고속 · fast 2.5×", "anthropic.com"),
      ("F6", "확인(한측)", AMBER, AMBER_TX, "벤치마크 — FrontierCode: Fable 49.1 > Opus 45.5 > GPT-6 Astra 42.8 (Anthropic 공고)", "anthropic.com (단일 소스)"),
      ("F7", "확인", GREEN, GREEN_TX, "Anthropic 구조 신호 — PBC · S-1 (10-26) · Public Benefit Fund · 약물 개발 연구", "anthropic.com/news"),
      ("F8·F9", "미검증", RED, RED_TX, "OpenAI 공식 입장 진술 · 독립(비벤더) 벤치마크 — 미취득·미수행, 주장하지 않음", "—")]
tx, ty = 0.9, 2.16
colw = [0.95, 6.35, 1.7, 2.53]
for i, htxt in enumerate(["#", "내용", "상태", "근거 (HTTP 200, 2026-11-12)"]):
    al = PP_ALIGN.RIGHT if i == 3 else PP_ALIGN.LEFT
    tb(s, tx, ty, colw[i], 0.3, [(htxt.upper(), {"size": 9, "color": MUT, "bold": True, "spc": 140, "align": al})])
    tx += colw[i]
rect(s, 0.9, ty + 0.36, 11.53, 0.022, INK)
yy = ty + 0.36
stx = 0.9 + colw[0] + colw[1]
srx = stx + colw[2]
for fid, st, dc, dtc, desc, src in ev:
    rh = 0.545
    tb(s, 0.92, yy + 0.03, colw[0] - 0.04, rh - 0.06, [(fid, {"size": 11, "color": INK, "mono": True, "bold": True})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 0.9 + colw[0] + 0.05, yy + 0.03, colw[1] - 0.1, rh - 0.06, [(desc, {"size": 10.5, "color": INK, "ls": 1.05})], anchor=MSO_ANCHOR.MIDDLE)
    dot(s, stx + 0.05, yy + rh / 2 - 0.04, 0.08, dc)
    tb(s, stx + 0.22, yy + 0.03, colw[2] - 0.26, rh - 0.06, [(st.upper(), {"size": 8.5, "color": dtc, "bold": True, "spc": 100})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, srx + 0.02, yy + 0.03, colw[3] - 0.04, rh - 0.06, [(src, {"size": 8.5, "color": MUT, "mono": True, "align": PP_ALIGN.RIGHT})], anchor=MSO_ANCHOR.MIDDLE)
    hairline(s, 0.9, yy + rh, 11.53)
    yy += rh

# ===== S4 OpenAI lineup =====
s = new_slide(); chrome(s, "03 — 라인업 OpenAI", "OpenAI의 카드는 폭 — 4티어 + 오디오·이미지·사이버 세로", 4)
rows4 = [("GPT-6 Astra", "플래그십 — 가장 어려운 추론·코딩", "F1"),
         ("GPT-6.1 Sol", "복잡한 작업에 Astra에 근접한 성능, 낮은 비용", "F1"),
         ("GPT-6.1 Terra", "비주얼 추론 · 정밀 컴퓨터 사용 · 자연스러운 글쓰기", "F1"),
         ("GPT-6 Luna", "집중형 대량 작업에 가장 효율적", "F1")]
tx, ty = 0.9, 1.85
colw = [2.3, 8.0, 1.23]
for i, htxt in enumerate(["모델 (MONO)", "역할 (F1 공식 카탈로그)", "근거"]):
    al = PP_ALIGN.RIGHT if i == 2 else PP_ALIGN.LEFT
    tb(s, tx, ty, colw[i], 0.3, [(htxt.upper(), {"size": 9, "color": MUT, "bold": True, "spc": 140, "align": al})])
    tx += colw[i]
rect(s, 0.9, ty + 0.36, 11.53, 0.022, INK)
yy = ty + 0.36
for mid, role, fid in rows4:
    rh = 0.5
    tb(s, 0.92, yy + 0.03, colw[0] - 0.04, rh - 0.06, [(mid, {"size": 12, "color": INK, "mono": True, "bold": True})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 0.9 + colw[0] + 0.05, yy + 0.03, colw[1] - 0.1, rh - 0.06, [(role, {"size": 11.5, "color": SUB})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 0.9 + colw[0] + colw[1], yy + 0.03, colw[2], rh - 0.06, [(fid, {"size": 10, "color": MUT, "mono": True, "align": PP_ALIGN.RIGHT})], anchor=MSO_ANCHOR.MIDDLE)
    hairline(s, 0.9, yy + rh, 11.53)
    yy += rh
tb(s, 0.9, 4.42, 6.0, 0.3, [("티어 아래 — 세로(전문) 확장 (F1)", {"size": 9.5, "color": MUT, "bold": True, "spc": 180})])
for i, t in enumerate(["GPT-6 Cyber — 허가된 취약점 조사·재현·수정 검증 (GPT-5.6 Cyber 계열)",
                       "gpt-oss-120b / 20b — 오픈웨이트 (H100 단일 GPU 탑재)",
                       "오디오·리얼타임·라이브(음성) + GPT-Image 2.5/2.6(이미지) 전문 라인",
                       "ChatGPT — 소비자 생태계 (상업·광고·플러그인)"]):
    y = 4.82 + i * 0.42
    dot(s, 0.92, y + 0.08, 0.07, GREEN)
    tb(s, 1.18, y - 0.02, 11.0, 0.35, [(t, {"size": 11.5, "color": SUB})])
dot(s, 0.92, 6.62, 0.07, AMBER)
tb(s, 1.18, 6.52, 11.0, 0.35, [("추론 — '폭 × 비용' 사다리: 같은 작업을 Luna Low → Astra XHigh 7단계로 모델·노력 조합 (F2) — 공식 주장이 아니라 카탈로그 구조의 해석", {"size": 10.5, "color": AMBER_TX, "italic": True})])

# ===== S5 Anthropic lineup =====
s = new_slide(); chrome(s, "03 — 라인업 Anthropic", "Anthropic의 카드는 안전 — 4티어 + 검증 프로그램 분리 모델", 5)
rows5 = [("Claude Fable 5.2", "강인한 추론 · 장기 에이전트 작업 (최상위 티어)", "F3"),
         ("Claude Opus 5.5", "장기 에이전틱 코딩 · 지식 업무 — 기본 권장", "F3"),
         ("Claude Sonnet 5.5", "속도와 지능의 최적 조합", "F3"),
         ("Claude Haiku 5.5", "대량 · 지연 민감 (분류·추출·라우팅)", "F3")]
tx, ty = 0.9, 1.85
colw = [2.7, 7.6, 1.23]
for i, htxt in enumerate(["모델 (MONO)", "역할 (F3 공식 문서)", "근거"]):
    al = PP_ALIGN.RIGHT if i == 2 else PP_ALIGN.LEFT
    tb(s, tx, ty, colw[i], 0.3, [(htxt.upper(), {"size": 9, "color": MUT, "bold": True, "spc": 140, "align": al})])
    tx += colw[i]
rect(s, 0.9, ty + 0.36, 11.53, 0.022, INK)
yy = ty + 0.36
for mid, role, fid in rows5:
    rh = 0.5
    tb(s, 0.92, yy + 0.03, colw[0] - 0.04, rh - 0.06, [(mid, {"size": 12, "color": INK, "mono": True, "bold": True})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 0.9 + colw[0] + 0.05, yy + 0.03, colw[1] - 0.1, rh - 0.06, [(role, {"size": 11.5, "color": SUB})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 0.9 + colw[0] + colw[1], yy + 0.03, colw[2], rh - 0.06, [(fid, {"size": 10, "color": MUT, "mono": True, "align": PP_ALIGN.RIGHT})], anchor=MSO_ANCHOR.MIDDLE)
    hairline(s, 0.9, yy + rh, 11.53)
    yy += rh
rect(s, 0.9, 4.32, 11.53, 0.86, PAPER, line_color=BLUE, line_w=1.25)
tb(s, 1.18, 4.44, 11.0, 0.3, [("FABLE = MYTHOS — 동일한 기반 모델, 접근만 분리 (F5)", {"size": 9.5, "color": BLUE, "bold": True, "spc": 160})])
tb(s, 1.18, 4.76, 11.0, 0.35, [("Fable = 일반 공개(사이버·바이오 안전장치 포함) · Mythos = Life Sciences · Cyber 검증 프로그램 조직 — '이중용도'를 가격으로 분리한 구조", {"size": 11, "color": SUB})])
tb(s, 0.9, 5.5, 6.0, 0.3, [("안전 체계 신호 (F5)", {"size": 9.5, "color": MUT, "bold": True, "spc": 180})])
for i, t in enumerate(["System Card 공개 · 샌드박스 탈출 평가 등 프리릴리스 안전 테스트",
                       "사이버·바이오 안전장치 (불필요 차단 감소) · 최강 증류 방어",
                       "Opus 5.5 — Opus 5 대비 실행 비용 40% 감소 (2026-09-22) · PBC·S-1 구조 신호는 S6 (F7)"]):
    y = 5.9 + i * 0.42
    dot(s, 0.92, y + 0.08, 0.07, GREEN)
    tb(s, 1.18, y - 0.02, 11.0, 0.35, [(t, {"size": 11.5, "color": SUB})])

# ===== S6 pursuits =====
s = new_slide(); chrome(s, "04 — 추구 Pursuit", "각사가 추구하는 것은 다르다 — 능력의 폭 vs 안전과 신뢰", 6)
tb(s, 0.9, 1.8, 5.6, 0.4, [("OpenAI", {"size": 17, "color": INK, "bold": True})])
tb(s, 0.9, 2.18, 5.6, 0.3, [("신호 (확인 — F1·F2)", {"size": 9, "color": MUT, "bold": True, "spc": 160})])
for i, t in enumerate(["멀티모달 풀스택 — 텍스트·오디오·이미지·리얼타임·라이브",
                       "4티어 + 전문 세로 (사이버 · 라이프사이언스 · 오픈웨이트)",
                       "소비자 규모 — ChatGPT(상업 · 광고 · 플러그인)",
                       "모델 × 추론 노력 7단계 선택 체계"]):
    y = 2.56 + i * 0.52
    dot(s, 0.92, y + 0.08, 0.07, GREEN)
    tb(s, 1.18, y - 0.02, 5.3, 0.5, [(t, {"size": 11.5, "color": SUB, "ls": 1.15})])
dot(s, 0.92, 4.76, 0.07, AMBER)
tb(s, 1.18, 4.66, 5.3, 0.7, [("추론 — '능력 확장 × 소비자 규모' 방향. (F8: 공식 입장 진술은 미취득 — 해석임)", {"size": 10.5, "color": AMBER_TX, "italic": True, "ls": 1.2})])
hairline(s, 6.75, 1.8, 0.011, LINE, h=5.0)
tb(s, 6.93, 1.8, 5.6, 0.4, [("Anthropic", {"size": 17, "color": INK, "bold": True})])
tb(s, 6.93, 2.18, 5.6, 0.3, [("신호 (확인 — F5·F7)", {"size": 9, "color": MUT, "bold": True, "spc": 160})])
for i, t in enumerate(["PBC(공익법인) · S-1 IPO (2026-10-26) · Public Benefit Fund",
                       "안전·정렬 체계 — System Card · 샌드박스 탈출 평가 · 증류 방어",
                       "이중용도 분리 — Mythos 검증 프로그램 (사이버 · 생명과학)",
                       "과학 적용 — 6개 조직과 약물 개발 파트너십 (2026-10-27)"]):
    y = 2.56 + i * 0.52
    dot(s, 6.95, y + 0.08, 0.07, GREEN)
    tb(s, 7.21, y - 0.02, 5.3, 0.5, [(t, {"size": 11.5, "color": SUB, "ls": 1.15})])
dot(s, 6.95, 4.76, 0.07, AMBER)
tb(s, 7.21, 4.66, 5.3, 0.7, [("추론 — '안전과 기업 신뢰' 방향. (제품 구조와 법인 형태에서 읽은 해석)", {"size": 10.5, "color": AMBER_TX, "italic": True, "ls": 1.2})])
tb(s, 0.9, 5.9, 11.5, 0.7, [("같은 '최강 모델'이라도 방향이 다르다 — OpenAI는 폭(모달리티·세로·규모)으로, Anthropic은 안전 구조(검증·분리·PBC)로 경쟁한다. 이 덱의 모든 '추구' 표현은 위 신호에 기반한 추론이다.", {"size": 12.5, "color": INK, "bold": True, "ls": 1.3})])

# ===== S7 cost =====
s = new_slide(); chrome(s, "05 — 비용 Cost", "가격 격차는 80배 — Haiku $0.10에서 Fable $40까지", 7)
rows7 = [("Claude Fable 5.2", "$8", "$40", "$16 / $80"),
         ("Claude Opus 5.5", "$4", "$20", "—"),
         ("Claude Sonnet 5.5", "$2", "$10", "—"),
         ("Claude Haiku 5.5", "$0.10", "$0.50", "— (프롬프트 ≤100k)")]
tx, ty = 0.9, 1.95
colw = [3.2, 1.5, 1.5, 2.3]
for i, htxt in enumerate(["모델 (MONO)", "입력", "출력", "FAST MODE"]):
    al = PP_ALIGN.RIGHT if i > 0 else PP_ALIGN.LEFT
    tb(s, tx, ty, colw[i], 0.3, [(htxt.upper(), {"size": 9, "color": MUT, "bold": True, "spc": 140, "align": al})])
    tx += colw[i]
rect(s, 0.9, ty + 0.36, 8.5, 0.022, INK)
yy = ty + 0.36
for mid, ci, co, fast in rows7:
    rh = 0.62
    tb(s, 0.92, yy + 0.03, colw[0] - 0.04, rh - 0.06, [(mid, {"size": 12, "color": INK, "mono": True, "bold": True})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 0.9 + colw[0], yy + 0.03, colw[1], rh - 0.06, [(ci, {"size": 12, "color": INK, "mono": True, "align": PP_ALIGN.RIGHT})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 0.9 + colw[0] + colw[1], yy + 0.03, colw[2], rh - 0.06, [(co, {"size": 12, "color": INK, "mono": True, "align": PP_ALIGN.RIGHT})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 0.9 + colw[0] + colw[1] + colw[2], yy + 0.03, colw[3], rh - 0.06, [(fast, {"size": 10.5, "color": SUB, "align": PP_ALIGN.RIGHT})], anchor=MSO_ANCHOR.MIDDLE)
    hairline(s, 0.9, yy + rh, 8.5)
    yy += rh
tb(s, 9.9, 2.6, 2.6, 0.4, [("HAIKU → FABLE", {"size": 9, "color": MUT, "bold": True, "spc": 180, "align": PP_ALIGN.RIGHT})])
tb(s, 9.7, 3.0, 2.9, 1.1, [("80×", {"size": 52, "color": INK, "disp": True, "bold": True, "align": PP_ALIGN.RIGHT})])
tb(s, 9.9, 4.15, 2.6, 0.7, [
    ("출력 $0.50 → $40", {"size": 10, "color": SUB, "mono": True, "align": PP_ALIGN.RIGHT, "sa": 2}),
    ("입력 $0.10 → $8", {"size": 10, "color": SUB, "mono": True, "align": PP_ALIGN.RIGHT}),
])
tb(s, 0.9, 5.05, 11.5, 0.4, [("모든 가격은 백만 토큰(MTok)당 — Fable = Opus의 2배(입력 $8 vs $4, 출력 $40 vs $20), 최상위 티어의 프리미엄 구조 (F4)", {"size": 11.5, "color": SUB})])
dot(s, 0.92, 5.72, 0.07, AMBER)
tb(s, 1.18, 5.62, 11.0, 0.7, [("범위 한계 — OpenAI API 가격은 이번 세션에 미취득(F1 카탈로그에 가격 없음) → OpenAI 가격 수치는 아예 등장하지 않는다. 모든 가격은 Anthropic 문서(F4) — 한 회사 기준.", {"size": 10.5, "color": AMBER_TX, "italic": True, "ls": 1.25})])
tb(s, 0.9, 6.55, 11.5, 0.3, [("참고: Sonnet 5.5 출시가 $2/$10은 'introductory'가 아니라 표준가로 확정(2026-09-01 가격 인상 불발) — F4 문서 주석", {"size": 9.5, "color": MUT})])

# ===== S8 performance =====
s = new_slide(); chrome(s, "05 — 성능 Performance", "최상위 점수는 Fable 5.2 — 단 그 숫자는 Anthropic의 보고", 8)
dot(s, 0.92, 1.74, 0.07, AMBER)
tb(s, 1.18, 1.64, 11.0, 0.3, [("벤더 발표 — Anthropic 공고(2026-11-09) · OpenAI 독립 보고 미취득 (F6, 한측 소스)", {"size": 10, "color": AMBER_TX, "bold": True, "spc": 60})])
rows8 = [("FrontierCode 2.0 (에이전틱 코딩)", "49.1 (Xhigh)", "45.5", "42.8", "41.1"),
         ("Humanity's Last Exam (tools)", "74.2", "67.7", "57.2", "—"),
         ("OSWorld 2.1 (컴퓨터 사용)", "89.3", "87.2", "79.5", "81.5")]
tx, ty = 0.9, 2.14
colw = [4.03, 1.9, 1.6, 1.9, 2.1]
for i, htxt in enumerate(["EVAL", "FABLE 5.2", "OPUS 5.5", "GPT-6 ASTRA", "GEMINI 4 CARBON"]):
    al = PP_ALIGN.LEFT if i == 0 else PP_ALIGN.RIGHT
    tb(s, tx, ty, colw[i], 0.3, [(htxt, {"size": 9, "color": MUT, "bold": True, "spc": 140, "align": al})])
    tx += colw[i]
rect(s, 0.9, ty + 0.36, 11.53, 0.022, INK)
yy = ty + 0.36
for evname, f, o, g, gem in rows8:
    rh = 0.62
    tb(s, 0.92, yy + 0.03, colw[0] - 0.04, rh - 0.06, [(evname, {"size": 11.5, "color": INK})], anchor=MSO_ANCHOR.MIDDLE)
    for j, v in enumerate([f, o, g, gem]):
        tb(s, 0.9 + sum(colw[:1 + j]), yy + 0.03, colw[1 + j], rh - 0.06,
           [(v, {"size": 12, "color": AMBER_TX, "mono": True, "bold": (j == 0), "align": PP_ALIGN.RIGHT})], anchor=MSO_ANCHOR.MIDDLE)
    hairline(s, 0.9, yy + rh, 11.53)
    yy += rh
tb(s, 0.9, 4.7, 11.5, 0.4, [("Fable 5.2 High effort는 Opus 5.5 Max effort와 동급 점수에 약 절반 비용 — '노력(effort)' 변수가 성능 비교의 핵심 축 (F6)", {"size": 11.5, "color": SUB})])
dot(s, 0.92, 5.5, 0.07, RED)
tb(s, 1.18, 5.4, 11.0, 0.7, [("독립 검증 미수행 (F9) — 이 표를 'Anthropic이 주장하는 순위'로만 읽어야 한다. OpenAI·Gemini 공식 수가 같은 벤치마크에 없다면, 비교는 한측 소스 안에서만 성립한다.", {"size": 10.5, "color": RED_TX, "italic": True, "ls": 1.25})])

# ===== S9 strengths =====
s = new_slide(); chrome(s, "06 — 강점 Strengths", "각자의 강점 — 폭과 생태계 vs 장기 에이전트와 신뢰", 9)
tb(s, 0.9, 1.8, 5.6, 0.4, [("OpenAI (신호 기반)", {"size": 15, "color": INK, "bold": True})])
hairline(s, 0.9, 2.24, 5.6, INK, h=0.02)
for i, t in enumerate(["멀티모달 풀스택 — 음성(Realtime·Live) · 이미지 · 텍스트가 한 카탈로그 (F1)",
                       "비용 사다리 — Luna~Astra + 추론 노력 7단계로 작업별 정밀 선택 (F2)",
                       "오픈웨이트 옵션 — gpt-oss-120b/20b, 자가 호스팅 가능성 (F1)",
                       "소비자 생태계 — ChatGPT 상업·광고·플러그인이라는 유통 채널 (F1)"]):
    y = 2.5 + i * 0.78
    dot(s, 0.92, y + 0.08, 0.07, GREEN)
    tb(s, 1.18, y - 0.02, 5.3, 0.75, [(t, {"size": 11, "color": SUB, "ls": 1.2})])
hairline(s, 6.75, 1.8, 0.011, LINE, h=5.0)
tb(s, 6.93, 1.8, 5.6, 0.4, [("Anthropic (신호 기반)", {"size": 15, "color": INK, "bold": True})])
hairline(s, 6.93, 2.24, 5.6, INK, h=0.02)
for i, t in enumerate(["장기 에이전트 특화 — Fable(장기 호라이즌) · Opus(장기 코딩)의 역할 분화 (F3·F5)",
                       "비용 개선 속도 — Opus 5.5가 전세대 대비 40% 절감 (F5)",
                       "기업 인프라 — 1M 컨텍스트 · 프롬프트 캐싱 · 데이터 거주지 · Managed Agents (F4)",
                       "신뢰 구조 — System Card · 검증 프로그램 · PBC (F5·F7)"]):
    y = 2.5 + i * 0.78
    dot(s, 6.95, y + 0.08, 0.07, GREEN)
    tb(s, 7.21, y - 0.02, 5.3, 0.75, [(t, {"size": 11, "color": SUB, "ls": 1.2})])
tb(s, 0.9, 5.9, 11.5, 0.7, [("강점도 '각자 자기 문서의 문장'이다 — 위 목록은 F1~F7 확인 신호의 재구성이지, 두 회사의 상대적 우열이 아니다. 우열 판단은 독립 벤치마크(F9)가 전제다.", {"size": 11, "color": MUT, "italic": True, "ls": 1.25})])

# ===== S10 weaknesses =====
s = new_slide(); chrome(s, "06 — 약점 Weaknesses", "각자의 약점 — 증거에 있는 것과 없는 것", 10)
tb(s, 0.9, 1.8, 5.6, 0.4, [("OpenAI (증거 기반 리스크)", {"size": 15, "color": INK, "bold": True})])
hairline(s, 0.9, 2.24, 5.6, INK, h=0.02)
for i, (c, t) in enumerate([(AMBER, "버전 전환 빈도 — 5.2 → 5.4 → 5.5 → 5.6 → 6 → 6.1, 카탈로그에 비활성화 계열 다수 (F1) · 마이그레이션 부하 (추론)"),
                            (RED, "안전 구조 신호 미취득 — 이번 세션에 안전 체계 공식 문서 확인 없음 (F8 미검증) — '없다'가 아니라 '확인 못 함'"),
                            (AMBER, "플래그십 의존 — 가장 어려운 작업은 Astra로 수렴하는 구조 (F2) · 비용 상한이 명확 (추론)")]):
    y = 2.5 + i * 0.86
    dot(s, 0.92, y + 0.08, 0.07, c)
    tb(s, 1.18, y - 0.02, 5.3, 0.8, [(t, {"size": 11, "color": SUB, "ls": 1.2})])
hairline(s, 6.75, 1.8, 0.011, LINE, h=5.0)
tb(s, 6.93, 1.8, 5.6, 0.4, [("Anthropic (증거 기반 리스크)", {"size": 15, "color": INK, "bold": True})])
hairline(s, 6.93, 2.24, 5.6, INK, h=0.02)
for i, (c, t) in enumerate([(AMBER, "최상위 티어 프리미엄 — Fable = Opus 2배 가격, fast mode 2배 (F4) · 장기 에이전트 작업의 비용 상한 (추론)"),
                            (AMBER, "접근 분리 — Mythos(무방비 버전)는 검증 프로그램 조직만 · 일률적 접근 아님 (F5)"),
                            (AMBER, "오픈웨이트 부재 — 카탈로그에 공개 가중치 모델 없음 (F1 vs F3 비교) · 자가 호스팅 경로는 제한 (추론)")]):
    y = 2.5 + i * 0.86
    dot(s, 6.95, y + 0.08, 0.07, c)
    tb(s, 7.21, y - 0.02, 5.3, 0.8, [(t, {"size": 11, "color": SUB, "ls": 1.2})])
dot(s, 0.92, 5.9, 0.07, AMBER)
tb(s, 1.18, 5.8, 11.0, 0.7, [("약점 = F1~F7로부터의 추론이지, 각 회사의 공식 인정 진술이 아니다. (F8 OpenAI 입장 미취득 — 좌측 두 번째 항목은 확인 부재의 보고)", {"size": 10.5, "color": AMBER_TX, "italic": True, "ls": 1.25})])

# ===== S11 decision =====
s = new_slide(); chrome(s, "07 — 결정 Decision", "모델 결정은 티어 선택이지 브랜드 선택이 아니다", 11)
rows11 = [("플래그십", "GPT-6 Astra", "Claude Fable 5.2"),
          ("복잡한 작업", "GPT-6.1 Sol", "Claude Opus 5.5"),
          ("속도 + 지능", "GPT-6.1 Terra", "Claude Sonnet 5.5"),
          ("대량 · 저비용", "GPT-6 Luna", "Claude Haiku 5.5")]
tx, ty = 0.9, 1.95
colw = [2.2, 4.6, 4.73]
for i, htxt in enumerate(["티어", "OPENAI (F1)", "ANTHROPIC (F3)"]):
    al = PP_ALIGN.LEFT if i == 0 else PP_ALIGN.LEFT
    tb(s, tx, ty, colw[i], 0.3, [(htxt.upper(), {"size": 9, "color": MUT, "bold": True, "spc": 140, "align": al})])
    tx += colw[i]
rect(s, 0.9, ty + 0.36, 11.53, 0.022, INK)
yy = ty + 0.36
for tier, oa, an in rows11:
    rh = 0.56
    tb(s, 0.92, yy + 0.03, colw[0] - 0.04, rh - 0.06, [(tier, {"size": 12, "color": INK, "bold": True})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 0.9 + colw[0] + 0.05, yy + 0.03, colw[1] - 0.1, rh - 0.06, [(oa, {"size": 12, "color": INK, "mono": True})], anchor=MSO_ANCHOR.MIDDLE)
    tb(s, 0.9 + colw[0] + colw[1] + 0.05, yy + 0.03, colw[2] - 0.1, rh - 0.06, [(an, {"size": 12, "color": INK, "mono": True})], anchor=MSO_ANCHOR.MIDDLE)
    hairline(s, 0.9, yy + rh, 11.53)
    yy += rh
tb(s, 0.9, 4.62, 11.5, 0.5, [("4티어가 1:1로 대응한다. 'GPT인가 Claude인가'는 질문이 안 되고, '내 작업은 어느 티어인가'가 질문이 된다.", {"size": 13, "color": INK, "bold": True, "ls": 1.25})])
rect(s, 0.9, 5.45, 11.53, 1.28, INK)
tb(s, 1.24, 5.62, 10.5, 0.3, [("결정 절차 (제안 — 이 실습의 프레임)", {"size": 9.5, "color": INK_TX2, "bold": True, "spc": 160})])
tb(s, 1.24, 5.98, 11.0, 0.6, [("① 작업 분류 (비율 · 지연 · 복잡도)   →   ② 티어 선택 (4티어, 양사 1:1)   →   ③ 같은 티어에서 자기 워크로드로 평가 (벤더 수치는 한측 소스, F6)", {"size": 13, "color": PAPER, "bold": True, "ls": 1.3})])

# ===== S12 closing (ink) =====
s = new_slide(INK)
rect(s, 0, 0, SW, 0.05, BLUE)
tb(s, 0.9, 0.78, 6.0, 0.3, [("11 — 출처 SOURCES", {"size": 10, "color": INK_TX2, "bold": True, "spc": 240})])
hairline(s, 0.9, 1.42, 11.53, INK_LINE)
tb(s, 0.86, 2.5, 11.8, 1.6, [
    ("취득일 2026-11-12 —", {"size": 34, "color": PAPER, "bold": True, "disp": True}),
    ("모든 수치는 벤더 취득, 독립 검증은 미수행.", {"size": 34, "color": PAPER, "bold": True, "disp": True}),
])
srcs = [(GREEN, "developers.openai.com · platform.claude.com · anthropic.com", "HTTP 200 — F1~F5 · F7 확인"),
        (AMBER, "anthropic.com (벤치마크 표)", "F6 — 한측 소스 · OpenAI 독립 보고 없음"),
        (RED, "독립 벤치마크 · OpenAI 공식 입장", "F8 · F9 — 미수행 · 미취득 (주장 없음)")]
for i, (c, l, r) in enumerate(srcs):
    y = 4.75 + i * 0.44
    dot(s, 0.92, y + 0.09, 0.09, c)
    tb(s, 1.24, y - 0.02, 7.3, 0.35, [(l, {"size": 11.5, "color": INK_TX, "mono": True})])
    tb(s, 8.6, y - 0.02, 3.85, 0.35, [(r, {"size": 10, "color": INK_TX2, "align": PP_ALIGN.RIGHT})])
hairline(s, 0.9, 6.82, 11.53, INK_LINE)
tb(s, 0.9, 7.02, 11.5, 0.3, [("근거표 01-facts.md · 심층 글 02-article.md · 검증 로그 04-verification-log.md", {"size": 9, "color": INK_TX2, "spc": 60})])

prs.save(os.path.join(BASE, "03-deck.pptx"))
print("PPTX OK slides=%d" % len(prs.slides._sldIdLst))

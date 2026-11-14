# -*- coding: utf-8 -*-
"""Layout audit for 03-deck.pptx — baseline-free (no snapshot diff).
Ideas adopted (MIT, fresh re-implementation, zero code copy):
- rogermsc/overset: exact-EMU off-slide arithmetic, text-on-text collision,
  capacity checks (silent content drop), severity tiers (major/minor),
  fail-closed/fail-open discipline, explicit NOT-CHECKED reporting, CI exit code.
- ilookatshow-gif/presentation-kit: deterministic builder + content-fit gate.
Text fit is ESTIMATED with Pillow + the real fonts (Bahnschrift/Segoe UI/
Consolas/Malgun Gothic) — minor severity. Renderer-level truth (real glyph
positions) is the manual re-read and is reported as NOT-CHECKED, never passed
silently. A check that didn't run says so.
"""
import os, sys
from pptx import Presentation
from pptx.util import Emu, Pt
from PIL import ImageFont

BASE = os.path.dirname(os.path.abspath(__file__))
IN = 96.0
SLIDE_W_EMU, SLIDE_H_EMU = 12192000, 6858000  # 13.333 x 7.5in
FONTMAP = {
    "disp": (r"C:\Windows\Fonts\Bahnschrift.ttf", r"C:\Windows\Fonts\Bahnschrift.ttf"),
    "mono": (r"C:\Windows\Fonts\consola.ttf", r"C:\Windows\Fonts\consolab.ttf"),
    "text": (r"C:\Windows\Fonts\SegoeUI.ttf", r"C:\Windows\Fonts\segoeuib.ttf"),
    "cjk":  (r"C:\Windows\Fonts\malgun.ttf", r"C:\Windows\Fonts\malgunbd.ttf"),
}
_cache = {}
def has_cjk(t):
    return any("\uAC00" <= ch <= "\uD7A3" or "\u1100" <= ch <= "\u11FF" for ch in t)

def _font(kind, bold, px):
    path = FONTMAP[kind][1 if bold else 0]
    if not os.path.exists(path):
        path = FONTMAP["text"][1 if bold else 0]
    key = (path, int(px * 4))
    if key not in _cache:
        _cache[key] = ImageFont.truetype(path, max(8, int(px * 4)))
    return _cache[key]

def run_metrics(run):
    """(size_pt, bold, kind) of a run, classified by font name."""
    st = run.font
    size = st.size.pt if st.size else 18.0
    bold = bool(st.bold)
    name = st.name or ""
    if "Bahnschrift" in name:
        kind = "disp"
    elif name == "Consolas":
        kind = "mono"
    elif "Malgun" in name:
        kind = "cjk"
    else:
        kind = "text"
    return size, bold, kind

def text_width(text, size, bold, kind):
    if has_cjk(text):
        kind = "cjk"
    f = _font(kind, bold, size * IN / 72.0)
    return f.getlength(text) / 4.0

def para_est(p, box_w_in):
    """Estimate (height_in, max_pt) of a wrapped paragraph inside box_w_in."""
    avail = max(0.2, (box_w_in - 0.2) * IN)  # 0.1in insets L/R
    # tokenize: CJK char or maximal latin word
    toks = []
    buf = ""
    for ch in p.text:
        if has_cjk(ch):
            if buf:
                toks.append(buf); buf = ""
            toks.append(ch)
        elif ch == " ":
            if buf:
                toks.append(buf); buf = ""
            toks.append(" ")
        else:
            buf += ch
    if buf:
        toks.append(buf)
    # per-token widths from run metrics (approx: dominant run of the paragraph)
    rmts = [run_metrics(r) for r in p.runs] or [(18, False, "text")]
    maxpt = max(m[0] for m in rmts)
    ls = p.line_spacing
    line_h = (maxpt * IN / 72.0) * (ls if (ls and isinstance(ls, (int, float))) else 1.25)
    lines, cur = 1, 0.0
    for t in toks:
        if t == " ":
            w = text_width(t, maxpt, False, "text")
            if cur + w > avail:
                lines += 1; cur = 0.0
            else:
                cur += w
            continue
        w = max(text_width(t, m[0], m[1], m[2]) for m in rmts) if len(rmts) == 1 else \
            max((text_width(t, m[0], m[1], m[2]) for m in rmts), default=w)
        if cur + w > avail and cur > 0:
            lines += 1; cur = w
        else:
            cur += w
    return lines * line_h / IN, maxpt

def shape_rect(sh):
    return (sh.left or 0) / 914400.0, (sh.top or 0) / 914400.0, (sh.width or 0) / 914400.0, (sh.height or 0) / 914400.0

def rect_overlap(a, b):
    x = max(0.0, min(a[0] + a[2], b[0] + b[2]) - max(a[0], b[0]))
    y = max(0.0, min(a[1] + a[3], b[1] + b[3]) - max(a[1], b[1]))
    return x * y

def fill_hex(sh):
    try:
        if sh.fill.type == 1:  # MSO_FILL.SOLID
            return str(sh.fill.fore_color.rgb).upper()
    except Exception:
        pass
    return None

MAJOR, MINOR, NOTCHECKED = [], [], []
def major(msg): MAJOR.append(msg)
def minor(msg): MINOR.append(msg)
def ncheck(msg): NOTCHECKED.append(msg)

def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    path = os.path.join(BASE, "03-deck.pptx")
    prs = Presentation(path)
    n = len(prs.slides._sldIdLst)
    if n != 12:
        major("slide count %d != 12" % n)
    for i, slide in enumerate(prs.slides, 1):
        if not (slide.has_notes_slide and slide.notes_slide.notes_text_frame.text.strip()):
            major("slide %d: empty speaker notes" % i)
        texts = []
        for sh in slide.shapes:
            x, y, w, h = shape_rect(sh)
            # 1) off-slide (exact EMU arithmetic)
            over = max(-x, -y, (x + w) - SLIDE_W_EMU / 914400.0, (y + h) - SLIDE_H_EMU / 914400.0)
            if over > 1e-6:
                major("slide %d: '%s' extends %.2fin past slide edge" % (i, sh.name, over))
            # 2) text-on-text collision (both boxes carry visible text)
            if sh.has_text_frame and sh.text_frame.text.strip():
                texts.append((sh, (x, y, w, h)))
        # Intentional containments (design intent, render-verified):
        # S7 axis tick labels sit above the axis label band box.
        INTENTIONAL = {(7, "TextBox 28", "TextBox 31"), (7, "TextBox 31", "TextBox 28")}
        for a in range(len(texts)):
            for b in range(a + 1, len(texts)):
                sa, ra = texts[a]; sb, rb = texts[b]
                ia = rect_overlap(ra, rb)
                amin = min(ra[2] * ra[3], rb[2] * rb[3])
                if amin > 0 and ia / amin > 0.5 and (i, sa.name, sb.name) not in INTENTIONAL:
                    minor("slide %d: text-on-text '%s' x '%s' (%.0f%% of smaller)" %
                          (i, sa.name, sb.name, 100.0 * ia / amin))
            # 3) text-fit estimate (Pillow, real fonts) — wrap-aware boxes only
            if sh.has_text_frame and sh.text_frame.text.strip() and w > 0.4 and h > 0.2:
                est = 0.0
                for p in sh.text_frame.paragraphs:
                    if not p.text.strip():
                        est += 0.05
                        continue
                    est += para_est(p, w)[0]
                if est > h + 0.02:
                    minor("slide %d: text-fit est %.2fin > box %.2fin ('%s' @ %.0f,%.0f %.2fx%.2f)" %
                          (i, est, h, sh.name, x, y, w, h))
        # 4) capacity checks (per archetype, shape filters)
        rects = [(sh, shape_rect(sh), fill_hex(sh)) for sh in slide.shapes]
        def count(pred): return sum(1 for sh, r, f in rects if pred(sh, r, f))
        def no_text(sh, r, f):
            return not (sh.has_text_frame and sh.text_frame.text.strip())
        if i == 2 and count(lambda sh, r, f: no_text(sh, r, f) and 0.55 < r[3] < 0.70 and r[2] > 3.0) != 3:
            major("slide 2: agenda chips != 3")
        if i == 3:
            import re as _re
            ids = 0
            for sh in slide.shapes:
                if sh.has_text_frame and _re.fullmatch(r"F[1-9](·F9)?", sh.text_frame.text.strip()) \
                        and (sh.left or 0) < 914400:
                    ids += 1
            if ids != 8:  # F1..F7 + merged F8·F9 row
                major("slide 3: evidence id rows != 8 (F1..F7 + F8·F9)")
        if i == 4 and count(lambda sh, r, f: f is not None and 0.55 < r[3] < 0.70 and r[2] > 8.0 and r[0] < 1.0) != 4:
            major("slide 4: ladder bars != 4")
        if i == 5 and count(lambda sh, r, f: f is not None and 0.40 < r[3] < 0.52 and r[2] > 8.0 and r[0] < 1.0) != 4:
            major("slide 5: ladder bars != 4")
        if i == 6 and count(lambda sh, r, f: sh.has_text_frame and sh.text_frame.text.strip().startswith("— ")) != 8:
            major("slide 6: signal items != 8 (4+4)")
        if i == 7 and count(lambda sh, r, f: f is not None and r[0] > 3.1 and 0.30 < r[3] < 0.50 and r[2] > 0.3) != 4:
            major("slide 7: price bars != 4")
        if i == 8:
            blue = count(lambda sh, r, f: f == "2563EB" and r[3] < 0.25 and 0.2 < r[2] < 3.0)
            gray = count(lambda sh, r, f: f == "C9D0D9" and r[3] < 0.25 and 0.2 < r[2] < 3.0)
            if blue != 3 or gray != 8:
                major("slide 8: bar-grid bars blue=%d gray=%d (expect 3/8)" % (blue, gray))
        def bold13(sh, r, f):
            if not sh.has_text_frame:
                return False
            for p in sh.text_frame.paragraphs:
                for run in p.runs:
                    if run.font.size and run.font.size.pt == 13.0 and run.font.bold:
                        return True
            return False
        if i == 9 and count(bold13) != 8:
            major("slide 9: strength terms != 8 (4+4, 13pt bold)")
        if i == 10 and count(bold13) != 6:
            major("slide 10: weakness items != 6 (3+3, 13pt bold)")
        if i == 11:
            def tier13(sh, r, f):
                if not sh.has_text_frame:
                    return False
                t = sh.text_frame.text.strip()
                if t in "①②③④" and any(run.font.size and run.font.size.pt == 13.0
                                         for p in sh.text_frame.paragraphs for run in p.runs):
                    return True
                return False
            if count(tier13) != 4:
                major("slide 11: matrix tier rows != 4")
    ncheck("text-fit under LibreOffice/PowerPoint renderer (real glyph positions) — manual re-read, not automated")
    ncheck("PowerPoint engine vs LibreOffice metrics difference for unusual sizes")
    for m in MAJOR:
        print("[major] " + m)
    for m in MINOR:
        print("[minor] " + m)
    for m in NOTCHECKED:
        print("[not-checked] " + m)
    print("\n%d major, %d minor, %d not checked" % (len(MAJOR), len(MINOR), len(NOTCHECKED)))
    sys.exit(1 if MAJOR else 0)

if __name__ == "__main__":
    main()

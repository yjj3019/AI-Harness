# -*- coding: utf-8 -*-
"""WCAG contrast audit for 03-deck.pptx (idea-adopted from yjj3019/ProposalSkills
color_contrast — MIT, user's own repo; re-implemented fresh, formula = WCAG 2.x).
Method: every (text color, background color, size, bold) pair used by the deck
generators is enumerated and checked against WCAG AA: >=4.5:1 for normal text,
>=3.0:1 for large text (>=18pt or >=14pt bold). Backgrounds are the solid fills
known from build_deck.py (the deck uses only solid fills, no theme/alpha/pattern).
"""
import math, sys

def lum(hexc):
    h = hexc.lstrip("#")
    def ch(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)

def ratio(fg, bg):
    lf, lb = lum(fg), lum(bg)
    hi, lo = max(lf, lb), min(lf, lb)
    return (hi + 0.05) / (lo + 0.05)

# (fg, bg, size_pt, bold, usage) — post-fix palette (v6)
PAIRS = [
    # S1/S12 dark
    ("F4F7FB", "101418", 64, True, "S1 title"),
    ("93A5BE", "101418", 10, True, "S1/S12 kicker"),
    ("93A5BE", "101418", 8.5, False, "S1/S12 meta/page"),
    ("C7D2E0", "101418", 16, False, "S1 subtitle"),
    ("FFFFFF", "101418", 23, True, "S1 strip keywords"),
    ("93A5BE", "101418", 9, False, "S12 footer"),
    ("F4F7FB", "101418", 11, False, "S12 source url"),
    ("93A5BE", "101418", 9.5, False, "S12 source status"),
    ("FFFFFF", "101418", 28, True, "S12 statement"),
    # S2 light
    ("101418", "FFFFFF", 27, True, "S2 title"),
    ("6B7280", "FFFFFF", 9.5, True, "S2 kicker"),
    ("101418", "FFFFFF", 32, True, "S2 statement"),
    ("2563EB", "FFFFFF", 32, True, "S2 statement 2nd line"),
    ("46505E", "FFFFFF", 11.5, False, "S2 evidence"),
    ("6B7280", "FFFFFF", 9, False, "S2 footnote"),
    ("46505E", "FFFFFF", 9.5, False, "S2 chips"),
    # S3 table
    ("101418", "FFFFFF", 10, True, "S3 fid"),
    ("46505E", "FFFFFF", 10.5, False, "S3 txt"),
    ("6B7280", "FFFFFF", 10, True, "S3 F8F9 fid"),
    ("6B7280", "FFFFFF", 10.5, False, "S3 F8F9 txt"),
    ("157A3C", "FFFFFF", 9.5, True, "S3 status green"),
    ("B45309", "FFFFFF", 9.5, True, "S3 status amber"),
    ("6B7280", "FFFFFF", 9.5, False, "S3 status F8F9"),
    ("6B7280", "FFFFFF", 9, False, "S3 src mono"),
    # S4 ladder
    ("FFFFFF", "2563EB", 16, True, "S4 01 num on BLUE"),
    ("F4F7FB", "2563EB", 15, True, "S4 name on BLUE"),
    ("FFFFFF", "2563EB", 10.5, False, "S4 role on BLUE"),
    ("46505E", "E8EEFB", 16, True, "S4 02 num"),
    ("101418", "E8EEFB", 15, True, "S4 name 02"),
    ("46505E", "E8EEFB", 10.5, False, "S4 role 02"),
    ("46505E", "EEF0F3", 16, True, "S4 03 num"),
    ("46505E", "F6F7F9", 16, True, "S4 04 num"),
    ("6B7280", "FFFFFF", 8.5, False, "S4 source tag"),
    ("B45309", "FFFFFF", 9, True, "S4 footnote amber"),
    ("46505E", "FFFFFF", 8.5, False, "S4 chips"),
    # S5 ladder
    ("93A5BE", "101418", 15, True, "S5 01 num on INK"),
    ("F4F7FB", "101418", 14, True, "S5 name on INK"),
    ("C7D2E0", "101418", 10.5, False, "S5 role on INK"),
    ("46505E", "EEF0F3", 15, True, "S5 02 num"),
    ("46505E", "EEF0F3", 15, True, "S5 03 num"),
    ("46505E", "EEF0F3", 15, True, "S5 04 num"),
    ("1D4ED8", "E8EEFB", 11, True, "S5 FABLE=MYTHOS band"),
    ("46505E", "E8EEFB", 10, False, "S5 band desc"),
    ("6B7280", "FFFFFF", 9.5, True, "S5 safety label"),
    ("46505E", "FFFFFF", 10, False, "S5 safety items"),
    # S6 dark act
    ("FFFFFF", "101418", 27, True, "S6 title"),
    ("93A5BE", "101418", 9.5, True, "S6 kicker"),
    ("9DC1FF", "101418", 26, True, "S6 OpenAI keyword"),
    ("C7D2E0", "101418", 10.5, False, "S6 signal lines"),
    ("E8B45A", "101418", 9.5, True, "S6 inference"),
    ("FFFFFF", "101418", 12, True, "S6 conclusion"),
    # S7 price
    ("101418", "FFFFFF", 11.5, True, "S7 model labels"),
    ("6B7280", "FFFFFF", 8.5, False, "S7 input tags"),
    ("101418", "FFFFFF", 14, True, "S7 values"),
    ("6B7280", "FFFFFF", 8, False, "S7 ticks/axis"),
    ("6B7280", "FFFFFF", 9, True, "S7 HAIKU->FABLE"),
    ("101418", "FFFFFF", 80, True, "S7 80x"),
    ("46505E", "FFFFFF", 10, False, "S7 right sub"),
    # S8 bar-grid
    ("B45309", "FFFFFF", 9, False, "S8 vendor chip"),
    ("2563EB", "FFFFFF", 9, True, "S8 FABLE col label"),
    ("6B7280", "FFFFFF", 9, False, "S8 col labels"),
    ("101418", "FFFFFF", 15, True, "S8 Fable value"),
    ("46505E", "FFFFFF", 13, False, "S8 other values"),
    ("6B7280", "FFFFFF", 8, False, "S8 (Xhigh) sub"),
    ("46505E", "FFFFFF", 10.5, False, "S8 eval/notes"),
    ("B91C1C", "FFFFFF", 9, True, "S8 footnote red"),
    # S9/S10 two-col
    ("101418", "FFFFFF", 13.5, True, "S9/S10 heads"),
    ("6B7280", "FFFFFF", 8.5, True, "S9 signal label"),
    ("101418", "FFFFFF", 13, True, "S9/S10 terms"),
    ("46505E", "FFFFFF", 10, False, "S9/S10 descs"),
    # S11 matrix
    ("101418", "FFFFFF", 30, True, "S11 1:1"),
    ("6B7280", "FFFFFF", 9, False, "S11 headers"),
    ("6B7280", "FFFFFF", 13, False, "S11 circled nums"),
    ("101418", "FFFFFF", 11.5, True, "S11 tier"),
    ("46505E", "FFFFFF", 11.5, False, "S11 model names"),
    ("93A5BE", "101418", 9, True, "S11 strip label"),
    ("F4F7FB", "101418", 12, True, "S11 strip line"),
]

fails = 0
for fg, bg, size, bold, where in PAIRS:
    if where.startswith("placeholder"):
        continue
    req = 3.0 if (size >= 18 or (size >= 14 and bold)) else 4.5
    r = ratio(fg, bg)
    ok = r >= req
    if not ok:
        fails += 1
    print("%-4s %s on %s  %5.2f:1 (req %4.1f)  %s" % ("PASS" if ok else "FAIL", fg, bg, r, req, where))
print("\nFAILS: %d" % fails)
sys.exit(1 if fails else 0)

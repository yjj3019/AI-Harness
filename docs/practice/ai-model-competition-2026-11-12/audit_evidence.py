# -*- coding: utf-8 -*-
"""Evidence-discipline audit for the ai-model-competition practice set.
Rule-based, fail-closed (exit 1 on major). Rules = the invariants of this
practice (evidence-first, one-sided source labeling, zero OpenAI price
numbers, ghost-deck claim titles, artifact-set truth on the cover).
"""
import os, re, sys
from pptx import Presentation

BASE = os.path.dirname(os.path.abspath(__file__))

MAJOR, MINOR = [], []
def major(m): MAJOR.append(m)
def minor(m): MINOR.append(m)

def deck_texts(prs):
    """(all_texts, disc_texts): all cell/frame texts, plus disclosure-level
    units (frames + whole table rows) for no-claim phrasing checks — a bare
    'F8' id cell is an id, not a claim."""
    out, disc = [], []
    for i, s in enumerate(prs.slides, 1):
        for sh in s.shapes:
            if sh.has_text_frame and sh.text_frame.text.strip():
                out.append((i, sh.text_frame.text))
                disc.append((i, sh.text_frame.text))
            if sh.has_table:
                for row in sh.table.rows:
                    cells = [c.text for c in row.cells if c.text.strip()]
                    out.extend((i, c) for c in cells)
                    joined = " | ".join(cells)
                    if joined.strip() and not re.fullmatch(r"F[1-9]( \| F[1-9])?", joined.strip()):
                        disc.append((i, joined))
    return out, disc

def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    prs = Presentation(os.path.join(BASE, "03-deck.pptx"))
    texts, disc = deck_texts(prs)
    alltext = "\n".join(t for _, t in texts)
    slide_of = {}
    for i, t in texts:
        for m in re.finditer(r"F[1-9]", t):
            slide_of.setdefault(m.group(), set()).add(i)

    # R1: every evidence id F1..F9 is cited in the deck
    for f in range(1, 10):
        tag = "F%d" % f
        if tag not in alltext:
            major("R1: evidence id %s never cited in deck" % tag)

    # R2: zero OpenAI price numbers (S7 = Anthropic prices only)
    oai = ("GPT", "OpenAI", "Astra", " Sol", "Terra", "Luna", "ChatGPT", "gpt-oss")
    for i, t in texts:
        if any(k in t for k in oai) and re.search(r"\$\s?\d", t):
            major("R2: slide %d: OpenAI-side text contains a price number: %s" % (i, t[:60]))

    # R3: F6 (vendor benchmark) is labeled one-sided wherever used
    f6 = [t for i, t in texts if "F6" in t]
    if not any(("한측" in t or "벤더" in t or "독립" in t) for t in f6):
        major("R3: F6 used without one-sided-source label")

    # R4: F8/F9 never asserted — must carry 미검증/미수행/미취득/확인 없음
    # no-claim phrasing; bare id cells/frames ('F8·F9') carry no claim;
    # '전제된다' marks F9 as a prerequisite, not a claim.
    for f in (8, 9):
        for i, t in disc:
            if len(t.strip()) <= 6:
                continue
            if ("F%d" % f) in t and not re.search(r"미검증|미수행|미취득|확인 없음|확인 부재|전제된다", t):
                major("R4: slide %d: F%d without no-claim phrasing: %s" % (i, f, t[:60]))

    # R5: inference (추론) is labeled — at least 3 distinct slides
    inf_slides = {i for i, t in texts if "추론" in t}
    if len(inf_slides) < 3:
        major("R5: inference label on only %d slides (need >=3)" % len(inf_slides))

    # R6: ghost deck — content-slide titles (27pt) unique and non-empty
    titles = []
    for i, s in enumerate(prs.slides, 1):
        if i in (1, 12):
            continue
        for sh in s.shapes:
            if sh.has_text_frame:
                for p in sh.text_frame.paragraphs:
                    for run in p.runs:
                        if run.font.size and run.font.size.pt == 27:
                            titles.append((i, sh.text_frame.text.strip()))
    seen = {}
    for i, t in titles:
        if not t:
            major("R6: slide %d has empty title" % i)
        if t in seen:
            major("R6: title repeats slide %d: %s" % (seen[t], t))
        seen[t] = i
    if len(titles) != 10:
        major("R6: content titles found %d != 10 (S2..S11)" % len(titles))

    # R7: article length 2000~3000 (non-whitespace)
    art = open(os.path.join(BASE, "02-article.md"), encoding="utf-8").read()
    nchars = len(re.sub(r"\s", "", art))
    if not (2000 <= nchars <= 3000):
        major("R7: article length %d outside 2000~3000" % nchars)
    else:
        minor("R7: article length %d (in range)" % nchars)

    # R8: cover artifact count == actual artifact files in this directory
    cover = "\n".join(t for i, t in texts if i == 1)
    m = re.search(r"산출물\s*(\d+)종", cover)
    if not m:
        major("R8: cover has no '산출물 N종' statement")
    else:
        declared = int(m.group(1))
        artifacts = ["01-facts.md", "02-article.md", "03-deck.pptx", "04-verification-log.md",
                     "build_deck.py", "design_spec.md", "build_html.py",
                     "audit_contrast.py", "audit_layout.py", "audit_evidence.py"]
        present = [a for a in artifacts if os.path.exists(os.path.join(BASE, a))]
        if declared != len(present):
            major("R8: cover declares %d artifacts but %d present (%s)" %
                  (declared, len(present), ",".join(present)))

    # R9: deck date invariant + close source rows
    if "2026-11-12" not in alltext:
        major("R9: deck date 2026-11-12 missing")
    close = "\n".join(t for i, t in texts if i == 12)
    if close.count("—") < 3:
        major("R9: close source rows < 3")

    # R10: speaker notes on all 12
    for i, s in enumerate(prs.slides, 1):
        if not (s.has_notes_slide and s.notes_slide.notes_text_frame.text.strip()):
            major("R10: slide %d notes empty" % i)

    for m in MAJOR:
        print("[major] " + m)
    for m in MINOR:
        print("[minor] " + m)
    print("\n%d major, %d minor" % (len(MAJOR), len(MINOR)))
    sys.exit(1 if MAJOR else 0)

if __name__ == "__main__":
    main()

"""
Offline test of the verify-against-text VOTING + ABSTAIN logic only.

No ML. Feeds hand-written "decode" strings (standing in for what Su-srota would
return) into score_against_text() and checks the per-akshara label. This proves
the alignment + consensus + abstain behaviour is sound; it says nothing about
real ASR accuracy (that needs the model + audio -- see 01-*.md / 05-*.md).

Run:  PYTHONUTF8=1 py -3.11 test_verify_logic.py
"""

from __future__ import annotations

from verify_against_text import score_against_text, summarise

REF = "सरस्वति नमस्तुभ्यं वरदे कामरूपिणि"


def labels(decodes: list[str]) -> list[str]:
    return [r["label"] for r in score_against_text(REF, decodes)]


def main() -> None:
    checks = []

    # 1. All 4 decodes reproduce the reference exactly -> every akshara 'correct'.
    ls = labels([REF, REF, REF, REF])
    checks.append(("all-correct", set(ls) == {"correct"}, ls.count("correct")))

    # 2. All 4 decodes agree on the SAME wrong akshara at position 4
    #    (ता -> मा in 'sarasvati' region) -> that akshara 'incorrect', rest 'correct'.
    wrong = REF.replace("वति", "वमि", 1)  # परिवर्तन: ति -> मि at one spot
    ls = labels([wrong, wrong, wrong, wrong])
    checks.append(("consensus-wrong -> incorrect", ls.count("incorrect") == 1, ls))

    # 3. Decodes DISAGREE about the deviation (2 hear it right, 2 hear it wrong,
    #    and the 2 wrong ones disagree with each other) -> 'unclear', never 'incorrect'.
    w1 = REF.replace("वति", "वमि", 1)
    w2 = REF.replace("वति", "वनि", 1)
    ls = labels([REF, REF, w1, w2])
    checks.append(("split decodes -> no false incorrect", ls.count("incorrect") == 0, ls))

    # 4. ASR drops the first two aksharas entirely (encoder ramp-up, per the log's
    #    finding #12) -> those positions 'unclear' (deletion), not 'incorrect'.
    truncated = " ".join(REF.split()[0].split()) and REF[4:]
    ls = labels([truncated, truncated, truncated, truncated])
    lead = ls[:2]
    checks.append(("leading deletion -> unclear not incorrect",
                   "incorrect" not in lead, lead))

    # 5. Garbage decode (wrong sloka). Documents a GAP, not a success: with no
    #    front gate, a wrong-sloka input yields a pile of 'incorrect' flags
    #    (here ~7/16) instead of a graceful "couldn't check". A production
    #    pipeline needs a coverage/completeness gate BEFORE per-akshara scoring
    #    to route silence / wrong-sloka / background-noise to 'unavailable'.
    #    See 05-*.md. The only assertion here: it must not crash and must not
    #    call a wrong sloka mostly 'correct'.
    garbage = "गणपतिबप्पामोरया"
    ls = labels([garbage, garbage, garbage, garbage])
    checks.append(("garbage -> not mostly correct (front gate still TODO)",
                   ls.count("correct") <= 3,
                   summarise(score_against_text(REF, [garbage] * 4))))

    ok = True
    for name, passed, detail in checks:
        print(f"[{'PASS' if passed else 'FAIL'}] {name}\n        {detail}")
        ok = ok and passed
    raise SystemExit(0 if ok else 1)


if __name__ == "__main__":
    main()

"""
Shared text helpers for the SlokaSteps pronunciation-AI harness.

Written from scratch by the research-analyst agent. It intentionally does NOT
reuse code from github.com/prathoshap/sushrota-sanskrit-asr or
github.com/prathoshap/vagdhenu (the ASR experiment log has no LICENSE; the
method is described in their docs and reimplemented here in the analyst's own
words). Devanagari normalisation choices below follow the "content-only
normalisation" description on the Su-srota model card (NFC; keep Devanagari
letters + combining marks; drop digits, danda, avagraha, om, Vedic accents;
collapse whitespace) -- that description is a factual recipe, not code.

Nothing here needs torch/nemo. Pure stdlib. Python 3.11.

Known limitation: segment_aksharas is a fast orthographic segmenter, not a full
Sanskrit syllabifier. It handles conjunct onsets and phrase-final halanta
consonants, but treats an internal "consonant + virama + vowel" (m + a) the
same as orthography, not as resyllabified sandhi. Good enough for counts and
alignment; a production scorer would want a real syllabifier.
"""

from __future__ import annotations

import re
import unicodedata

_DEV_DANDA = "।"          # DEVANAGARI DANDA
_DEV_DOUBLE_DANDA = "॥"   # DEVANAGARI DOUBLE DANDA
_DEV_AVAGRAHA = "ऽ"       # AVAGRAHA
_DEV_OM = "ॐ"             # OM
_DEV_VIRAMA = "्"         # VIRAMA (halant)
_DEV_ANUSVARA = "ं"       # ANUSVARA

# Vedic accent marks / cantillation (Devanagari extended + Vedic block).
_VEDIC_ACCENTS = "".join(
    chr(c) for c in list(range(0x0951, 0x0955)) + list(range(0x1CD0, 0x1CFB))
)

_DROP_CHARS = re.compile(
    "[" + re.escape(
        _DEV_DANDA + _DEV_DOUBLE_DANDA + _DEV_AVAGRAHA + _DEV_OM + "|"
    ) + _VEDIC_ACCENTS + "०-९0-9]"
)

_WS = re.compile(r"\s+")


def normalise_devanagari(text: str) -> str:
    """Content-only normalisation for scoring. Keeps letters + combining marks."""
    text = unicodedata.normalize("NFC", text)
    text = _DROP_CHARS.sub(" ", text)
    text = _WS.sub(" ", text).strip()
    return text


def strip_spaces(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = _DROP_CHARS.sub("", text)
    return _WS.sub("", text)


# --- Devanagari akshara (orthographic syllable) segmentation ------------------

_VOWEL_BODY = "ऄ-औॠॡॲ-ॷ"
_CONS_BODY = "क-हक़-य़ॸ-ॿ"
_MATRA_BODY = "ऺ-़ा-ौॎॏॕ-ॗॢॣ"
_TRAIL_BODY = "ऀ-ः"

_INDEP_VOWEL = f"[{_VOWEL_BODY}]"
_CONSONANT = f"[{_CONS_BODY}]"
_MATRA = f"[{_MATRA_BODY}]"
_TRAIL = f"[{_TRAIL_BODY}]"
_V = _DEV_VIRAMA

# The final "(?:CONS virama (?![CONS VOWEL]))?" clause attaches a phrase-final
# halanta consonant (the m of ...darshanam, the t of ...bhavet) to the akshara
# it closes, instead of leaving it as a spurious extra unit. The negative
# lookahead means a conjunct onset (CONS virama CONS...) still opens the NEXT
# akshara as normal.
_AKSHARA_RE = re.compile(
    "(?:"
    f"{_INDEP_VOWEL}{_TRAIL}?"
    "|"
    f"(?:{_CONSONANT}{_V})*{_CONSONANT}़?{_MATRA}*{_TRAIL}*"
    f"(?:{_CONSONANT}{_V}(?![{_CONS_BODY}{_VOWEL_BODY}]))?"
    ")"
)


def segment_aksharas(text: str) -> list[str]:
    """Split normalised Devanagari into a list of akshara strings (no spaces)."""
    text = strip_spaces(text)
    return [m.group(0) for m in _AKSHARA_RE.finditer(text) if m.group(0)]


# --- canonicalisation used before alignment ---------------------------------
#
# Follows the Vagbodhini system doc's stated canonicalisation ("dedup doubled
# marks; word-final m-virama == anusvara; spacing"). Reimplemented here.

_DOUBLED_MARK = re.compile("([ंः़])\\1+")
_MA_VIRAMA_FINAL = re.compile("म्(?=\\s|$)")


def canonicalise_for_alignment(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = _MA_VIRAMA_FINAL.sub(_DEV_ANUSVARA, text)
    text = _DOUBLED_MARK.sub(r"\1", text)
    return strip_spaces(text)


# --- edit distance / alignment (Needleman-Wunsch, unit costs) ---------------


def align(ref: list[str], hyp: list[str]) -> list[tuple[str | None, str | None]]:
    """Return a list of (ref_token | None, hyp_token | None) alignment pairs."""
    n, m = len(ref), len(hyp)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        dp[i][0] = i
    for j in range(1, m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if ref[i - 1] == hyp[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j - 1] + cost,
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
            )
    i, j = n, m
    out: list[tuple[str | None, str | None]] = []
    while i > 0 or j > 0:
        if (
            i > 0
            and j > 0
            and dp[i][j] == dp[i - 1][j - 1] + (0 if ref[i - 1] == hyp[j - 1] else 1)
        ):
            out.append((ref[i - 1], hyp[j - 1]))
            i, j = i - 1, j - 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            out.append((ref[i - 1], None))
            i -= 1
        else:
            out.append((None, hyp[j - 1]))
            j -= 1
    out.reverse()
    return out


def char_error_rate(ref: str, hyp: str) -> float:
    """Levenshtein over characters of space-stripped strings / len(ref)."""
    r = strip_spaces(ref)
    h = strip_spaces(hyp)
    if not r:
        return 0.0 if not h else 1.0
    prev = list(range(len(h) + 1))
    for i, rc in enumerate(r, 1):
        cur = [i] + [0] * len(h)
        for j, hc in enumerate(h, 1):
            cur[j] = min(
                prev[j] + 1,
                cur[j - 1] + 1,
                prev[j - 1] + (0 if rc == hc else 1),
            )
        prev = cur
    return prev[-1] / len(r)


def word_error_rate(ref: str, hyp: str) -> float:
    r = normalise_devanagari(ref).split()
    h = normalise_devanagari(hyp).split()
    if not r:
        return 0.0 if not h else 1.0
    pairs = align(r, h)
    errs = sum(1 for a, b in pairs if a != b)
    return errs / len(r)


def sandhi_normalised_wer(ref: str, hyp: str) -> float:
    """
    SN-WER in the spirit of the Su-srota model card: strip spaces on both sides,
    a reference word counts correct iff its characters are recovered in order
    within a small drift window. Single point estimate (the card reports a
    lo..hi band from alternative sandhi splits; that band is out of scope here).
    """
    r_words = normalise_devanagari(ref).split()
    if not r_words:
        return 0.0
    h_chars = strip_spaces(hyp)
    pos = 0
    correct = 0
    for w in r_words:
        wc = strip_spaces(w)
        scan = pos
        matched_all = True
        for ch in wc:
            found = h_chars.find(ch, scan)
            if found == -1 or found - scan > 3:
                matched_all = False
                break
            scan = found + 1
        if matched_all:
            correct += 1
            pos = scan
    return 1.0 - correct / len(r_words)


if __name__ == "__main__":
    for demo in (
        "सरस्वति नमस्"
        "तुभ्यं वरदे "
        "कामरूपिणि ।",
        "करमूले तु गोव"
        "िन्दः प्रभात"
        "े करदर्शनम् ॥",
    ):
        print("normalised:", normalise_devanagari(demo))
        ak = segment_aksharas(demo)
        print(f"aksharas ({len(ak)}):", " ".join(ak))

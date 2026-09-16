"""
Prototype: "verify against known text" per-akshara scoring with abstain.

STATUS (2026-09-15): RUN, on real audio, for the first time. See
run_p4_p5_tests.py and ../10-p4-p5-real-audio-consensus-abstain.md for the
results (a proxy false-positive rate, corrupted-transcript detection, and
hard-negative behaviour on 16 real clips from the Su-srota dataset's
in_the_wild_test split). decode_variants() now goes through
load_susrota_ctc.py (see that file's docstring for why the original
asr_susrota_decode.py restore_from() path doesn't work with the installed
NeMo). See 04-*.md for the full design rationale and 05-*.md for how the
abstain threshold would have to be tuned and measured against a real
blind-labelled corpus (still not available -- see the caveats in 10-*.md).

INPUT :  expected_text (Devanagari)  +  audio (16 kHz mono WAV)
OUTPUT:  for each reference akshara -> one of {correct, incorrect, unclear}
         plus the evidence (how many decode passes matched) -- never a bare
         number, and never a number shown to a child.

This is the analyst's own implementation. The *shape* of the method -- one
forward pass, several cheap greedy decodes at different blank penalties,
canonicalise both sides, align by edit distance, then a per-akshara vote with
an abstain bucket -- is described in the Vagbodhini system doc
(docs/VAGBODHINI_2026-07-13.md in github.com/prathoshap/sushrota-sanskrit-asr,
which has NO LICENSE). No code is copied from there; the doc describes an
approach and this is a fresh implementation of that approach.

Design knobs (these are the things a validation study must tune, not guess):
  N_DECODES            how many blank-penalty variants to produce
  BLANK_PENALTIES      the penalty grid (larger penalty -> fewer blanks ->
                       recovers dropped onsets; CTC is "spiky", per the log)
  T_OK  (strict)       min matching decodes to call an akshara 'correct'
  T_BAD (strict)       max matching decodes to even consider 'incorrect'
  CONSENSUS_WRONG      require the non-matching decodes to agree on the SAME
                       wrong akshara before calling 'incorrect' (else 'unclear')
Everything else abstains. Abstain is the safe default: for a child app, telling
a child a correct chant is wrong is far worse than staying quiet.
"""

from __future__ import annotations

import argparse
import collections
import json

from common_text import (
    align,
    canonicalise_for_alignment,
    normalise_devanagari,
    segment_aksharas,
)

N_DECODES = 4
BLANK_PENALTIES = (0.0, 2.0, 4.0, 6.0)
T_OK = N_DECODES           # strict: ALL decodes must match
T_BAD = 0                  # strict: NO decode matched
CONSENSUS_WRONG = True

Label = str  # "correct" | "incorrect" | "unclear"


def decode_variants(nemo_path: str, wav_path: str):
    """
    Return a list of N_DECODES decoded strings, one per blank penalty.
    Loads the model fresh each call -- convenience wrapper for one-off use.
    For scoring many clips, load once with load_susrota_ctc.load_ctc_only_model
    and call decode_variants_with_model per clip instead (see run_p4_p5_tests.py).

    UPDATED 2026-09-15: restore_from() on the raw .nemo does not work with the
    installed NeMo 3.0.0 (see ../09-*.md for the full diagnosis -- the
    checkpoint was trained with a customised/forked NeMo). This now goes
    through load_susrota_ctc.py, which reconstructs the encoder + CTC head
    (the only part the documented decode path uses) with real trained
    weights, verified 2026-09-15 to load with zero missing/unexpected keys.
    """
    from load_susrota_ctc import load_ctc_only_model, transcribe_variants

    model = load_ctc_only_model(nemo_path)
    return transcribe_variants(model, wav_path, blank_penalties=BLANK_PENALTIES)


def decode_variants_with_model(model, wav_path: str):
    """Same as decode_variants but with an already-loaded model (batch use)."""
    from load_susrota_ctc import transcribe_variants

    return transcribe_variants(model, wav_path, blank_penalties=BLANK_PENALTIES)


def score_against_text(expected_text: str, decodes: list[str]) -> list[dict]:
    ref_ak = segment_aksharas(canonicalise_for_alignment(normalise_devanagari(expected_text)))
    decode_ak = [
        segment_aksharas(canonicalise_for_alignment(normalise_devanagari(d)))
        for d in decodes
    ]

    # For each decode, map every reference index -> the aligned hyp akshara (or None).
    aligned_per_decode: list[list[str | None]] = []
    for hyp in decode_ak:
        pairs = align(ref_ak, hyp)
        row: list[str | None] = []
        ref_i = 0
        # Walk the alignment, recording what each ref position received.
        buffer: dict[int, str | None] = {}
        for a, b in pairs:
            if a is not None:
                buffer[ref_i] = b if (a == b) else b  # b may be None (deletion)
                ref_i += 1
        for i in range(len(ref_ak)):
            row.append(buffer.get(i))
        aligned_per_decode.append(row)

    results = []
    for i, ref in enumerate(ref_ak):
        got = [aligned_per_decode[d][i] for d in range(len(decode_ak))]
        n_match = sum(1 for g in got if g == ref)
        wrong = [g for g in got if g is not None and g != ref]
        wrong_counts = collections.Counter(wrong)

        label: Label
        if n_match >= T_OK:
            label = "correct"
        elif n_match <= T_BAD and wrong and (
            not CONSENSUS_WRONG
            or (wrong_counts.most_common(1)[0][1] >= max(1, len(decode_ak) - 1))
        ):
            label = "incorrect"
        else:
            label = "unclear"

        results.append(
            {
                "index": i,
                "akshara": ref,
                "label": label,
                "evidence": {
                    "decodes": len(decode_ak),
                    "matched": n_match,
                    "heard": [g or "-" for g in got],
                },
            }
        )
    return results


def summarise(results: list[dict]) -> dict:
    c = collections.Counter(r["label"] for r in results)
    return {
        "aksharas": len(results),
        "correct": c["correct"],
        "incorrect": c["incorrect"],
        "unclear": c["unclear"],
        # NOTE: deliberately no overall percentage. A child never sees a score;
        # a parent sees counts + the per-akshara list + playback of their child
        # vs the reference.
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--nemo", required=True)
    ap.add_argument("--wav", required=True)
    ap.add_argument("--expected-text", required=True, help="Devanagari reference")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    decodes = decode_variants(args.nemo, args.wav)
    results = score_against_text(args.expected_text, decodes)
    out = {"summary": summarise(results), "aksharas": results, "decodes": decodes}
    if args.json:
        print(json.dumps(out, ensure_ascii=False, indent=2))
    else:
        print(out["summary"])
        for r in results:
            print(f"  {r['index']:2d} {r['akshara']:6s} {r['label']:9s} "
                  f"{r['evidence']['matched']}/{r['evidence']['decodes']}  "
                  f"heard={r['evidence']['heard']}")


if __name__ == "__main__":
    main()

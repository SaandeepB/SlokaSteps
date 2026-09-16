"""
P4 + first-pass P5: real-audio tests of the decode-consensus + abstain
verify_against_text approach, using real recitation audio for the first
time (previously only synthetic decode strings had been tested -- see
04-*.md, 05-*.md). Written from scratch by the research-analyst.

Audio: 16 held-out clips sampled from prathoshap/sushrota-sanskrit-asr-data,
split=in_the_wild_test (CC BY 4.0), extracted by extract_held_out_clips.py.
See clips/held_out_manifest.json for full per-clip provenance.

MANDATORY CAVEAT (repeated in the report): this dataset trained the model
that scores it. The in_the_wild_test split is the dataset author's own
claimed "leakage-free held-out" set (quoted from their README, not
independently re-verified for zero overlap by this analyst). Every number
this script prints is a TECHNIQUE-VIABILITY figure on this specific
checkpoint + this specific audio, not a product-accuracy figure, and is
optimistically biased by whatever train/test relationship actually holds.

P4a: correct audio + true transcript -> per-akshara false-'incorrect' rate
     (proxy false-positive rate -- see caveat in the printed output; this is
     NOT the blind-expert-labelled false-positive rate 05-*.md specifies,
     because no blind human labels exist. The proxy ground truth is "the
     dataset curators' own claim that this transcript matches this audio,
     having already akshara-level auto-graded and clean-tier-filtered it.")
P4b: correct audio + deliberately corrupted transcript (known substitution
     positions) -> does the tool catch the corrupted positions, and does it
     avoid flagging the untouched neighbours as false 'incorrect'.
P5:  hard negatives -- silence, noise, wrong-sloka, truncated -- must not
     produce a pile of false 'incorrect' (04-*.md's identified gap).
"""
from __future__ import annotations

import json
import random
import sys

import numpy as np
import soundfile as sf

from common_text import (
    canonicalise_for_alignment,
    normalise_devanagari,
    segment_aksharas,
)
from load_susrota_ctc import TARGET_SR, load_ctc_only_model
from verify_against_text import decode_variants_with_model, score_against_text

NEMO_PATH = "models/susrota/sushrota_sanskrit_asr_v13b.nemo"
MANIFEST = "clips/held_out_manifest.json"
RNG_SEED = 20260915

SLOKAS = {
    s["id"]: "".join(s["devanagari_lines"])
    for s in json.load(open("slokas_reference.json", encoding="utf-8"))["slokas"]
}


def akshara_pool_from_manifest(clips) -> list[str]:
    pool = []
    for c in clips:
        pool.extend(segment_aksharas(canonicalise_for_alignment(normalise_devanagari(c["text"]))))
    return sorted(set(pool))


def corrupt_text_aksharas(text: str, pool: list[str], frac: float, rng: random.Random):
    """
    Substitute a fraction of reference aksharas with a different akshara
    drawn from `pool`. Returns (corrupted_text, corrupted_positions:set[int],
    original_ref_akshara_list).
    """
    ref = segment_aksharas(canonicalise_for_alignment(normalise_devanagari(text)))
    n_corrupt = max(1, round(len(ref) * frac))
    positions = set(rng.sample(range(len(ref)), min(n_corrupt, len(ref))))
    corrupted = list(ref)
    for i in positions:
        choices = [a for a in pool if a != ref[i]]
        corrupted[i] = rng.choice(choices)
    return "".join(corrupted), positions, ref


def tally(results):
    c = {"correct": 0, "incorrect": 0, "unclear": 0}
    for r in results:
        c[r["label"]] += 1
    return c


def run_p4a(model, clips):
    print("=" * 78)
    print("P4a -- correct audio + TRUE transcript -> per-akshara labels")
    print("(proxy false-positive test; see caveat in file header)")
    print("=" * 78)
    grand = {"correct": 0, "incorrect": 0, "unclear": 0}
    per_clip = []
    false_incorrect_examples = []
    for c in clips:
        decodes = decode_variants_with_model(model, c["wav_path"])
        results = score_against_text(c["text"], decodes)
        t = tally(results)
        for k in grand:
            grand[k] += t[k]
        per_clip.append({"clip_id": c["clip_id"], **t, "n_akshara": len(results)})
        for r in results:
            if r["label"] == "incorrect":
                false_incorrect_examples.append({
                    "clip_id": c["clip_id"], "index": r["index"], "akshara": r["akshara"],
                    "heard": r["evidence"]["heard"],
                })
        print(f"[{c['clip_id']}] n_akshara={len(results):3d}  correct={t['correct']:3d}  "
              f"incorrect={t['incorrect']:3d}  unclear={t['unclear']:3d}")

    total = sum(grand.values())
    proxy_fp_rate = grand["incorrect"] / total if total else 0.0
    abstain_rate = grand["unclear"] / total if total else 0.0
    print()
    print(f"TOTAL aksharas scored: {total}")
    print(f"  correct   = {grand['correct']:4d}  ({grand['correct']/total:.4f})")
    print(f"  incorrect = {grand['incorrect']:4d}  ({proxy_fp_rate:.4f})  <- proxy false-positive rate")
    print(f"  unclear   = {grand['unclear']:4d}  ({abstain_rate:.4f})  <- abstain rate")
    if false_incorrect_examples:
        print("\n  'incorrect' flags on presumed-correct audio (inspect for real ASR errors")
        print("  vs alignment artefacts):")
        for e in false_incorrect_examples:
            print(f"    {e['clip_id']}  idx={e['index']:3d}  akshara={e['akshara']!r}  heard={e['heard']}")
    return {"grand_total": grand, "proxy_false_positive_rate": proxy_fp_rate,
            "abstain_rate": abstain_rate, "per_clip": per_clip,
            "incorrect_examples": false_incorrect_examples}


def run_p4b(model, clips):
    print()
    print("=" * 78)
    print("P4b -- correct audio + DELIBERATELY CORRUPTED transcript")
    print("(known substitution positions; detection + abstain-not-false-correct test)")
    print("=" * 78)
    rng = random.Random(RNG_SEED)
    pool = akshara_pool_from_manifest(clips)

    corrupted_pos_labels = {"correct": 0, "incorrect": 0, "unclear": 0}
    clean_pos_labels = {"correct": 0, "incorrect": 0, "unclear": 0}
    per_clip = []

    for c in clips:
        corrupted_text, corrupt_positions, ref_ak = corrupt_text_aksharas(
            c["text"], pool, frac=0.25, rng=rng
        )
        decodes = decode_variants_with_model(model, c["wav_path"])
        results = score_against_text(corrupted_text, decodes)

        c_tally = {"correct": 0, "incorrect": 0, "unclear": 0}
        clean_tally = {"correct": 0, "incorrect": 0, "unclear": 0}
        for r in results:
            bucket = corrupted_pos_labels if r["index"] in corrupt_positions else clean_pos_labels
            bucket[r["label"]] += 1
            (c_tally if r["index"] in corrupt_positions else clean_tally)[r["label"]] += 1

        per_clip.append({
            "clip_id": c["clip_id"],
            "n_akshara": len(ref_ak),
            "n_corrupted": len(corrupt_positions),
            "corrupted_positions_result": c_tally,
            "clean_positions_result": clean_tally,
        })
        print(f"[{c['clip_id']}] n_akshara={len(ref_ak):3d} corrupted={len(corrupt_positions):2d}  "
              f"corrupted-pos-> correct={c_tally['correct']:2d} incorrect={c_tally['incorrect']:2d} unclear={c_tally['unclear']:2d}"
              f"   clean-pos-> correct={clean_tally['correct']:3d} incorrect={clean_tally['incorrect']:2d} unclear={clean_tally['unclear']:2d}")

    n_corrupt_total = sum(corrupted_pos_labels.values())
    n_clean_total = sum(clean_pos_labels.values())
    caught_rate = (corrupted_pos_labels["incorrect"] + corrupted_pos_labels["unclear"]) / n_corrupt_total if n_corrupt_total else 0.0
    falsely_correct_rate = corrupted_pos_labels["correct"] / n_corrupt_total if n_corrupt_total else 0.0
    clean_false_incorrect_rate = clean_pos_labels["incorrect"] / n_clean_total if n_clean_total else 0.0

    print()
    print(f"CORRUPTED positions (n={n_corrupt_total}): {corrupted_pos_labels}")
    print(f"  'caught' (incorrect+unclear, i.e. NOT silently passed as correct) = {caught_rate:.4f}")
    print(f"  falsely still labelled 'correct' (missed)                        = {falsely_correct_rate:.4f}")
    print(f"CLEAN (untouched) positions (n={n_clean_total}): {clean_pos_labels}")
    print(f"  false-'incorrect' rate on untouched neighbours                   = {clean_false_incorrect_rate:.4f}")

    return {
        "corrupted_positions": corrupted_pos_labels,
        "clean_positions": clean_pos_labels,
        "caught_rate": caught_rate,
        "falsely_correct_rate": falsely_correct_rate,
        "clean_false_incorrect_rate": clean_false_incorrect_rate,
        "per_clip": per_clip,
    }


def run_p5(model, clips):
    print()
    print("=" * 78)
    print("P5 -- hard negatives (coverage-gate check)")
    print("=" * 78)
    out = {}

    # 1. Silence vs a real app-repo sloka text.
    text = SLOKAS["saraswati-namastubhyam"]
    silence = np.zeros(TARGET_SR * 3, dtype=np.float32)
    wav_path = "clips/_hardneg_silence.wav"
    sf.write(wav_path, silence, TARGET_SR)
    decodes = decode_variants_with_model(model, wav_path)
    results = score_against_text(text, decodes)
    t = tally(results)
    out["silence_vs_saraswati"] = {"decodes": decodes, "tally": t, "n_akshara": len(results)}
    print(f"[silence, 3s] vs Saraswati Namastubhyam -> {t}  (n_akshara={len(results)})")
    print(f"  decodes: {decodes}")

    # 2. White noise vs the same text.
    rng = np.random.default_rng(RNG_SEED)
    noise = (rng.standard_normal(TARGET_SR * 3) * 0.05).astype(np.float32)
    wav_path = "clips/_hardneg_noise.wav"
    sf.write(wav_path, noise, TARGET_SR)
    decodes = decode_variants_with_model(model, wav_path)
    results = score_against_text(text, decodes)
    t = tally(results)
    out["noise_vs_saraswati"] = {"decodes": decodes, "tally": t, "n_akshara": len(results)}
    print(f"[white noise, 3s, amp=0.05] vs Saraswati Namastubhyam -> {t}  (n_akshara={len(results)})")
    print(f"  decodes: {decodes}")

    # 3. Wrong sloka: real speech (heldout_13, Vasudevasutam) vs a DIFFERENT
    #    real app-repo sloka text (Guru Brahma) -- genuinely unrelated
    #    content, real human speech, not silence/noise.
    wrong_clip = next(c for c in clips if c["clip_id"] == "heldout_13_dur10.2s")
    wrong_text = SLOKAS["guru-brahma"]
    decodes = decode_variants_with_model(model, wrong_clip["wav_path"])
    results = score_against_text(wrong_text, decodes)
    t = tally(results)
    out["wrong_sloka"] = {
        "audio_clip": wrong_clip["clip_id"], "audio_true_text": wrong_clip["text"],
        "scored_against": wrong_text, "decodes": decodes, "tally": t, "n_akshara": len(results),
    }
    print(f"[wrong sloka] real audio ({wrong_clip['clip_id']}, actually says "
          f"{wrong_clip['text']!r}) scored against unrelated Guru Brahma text -> {t}  (n_akshara={len(results)})")
    print(f"  decodes: {decodes}")

    # 4. Truncated: first 15% of the longest clip's audio vs its OWN full
    #    correct transcript (simulates a child's recording cut off early).
    long_clip = next(c for c in clips if c["clip_id"] == "heldout_15_dur24.1s")
    audio, sr = sf.read(long_clip["wav_path"], dtype="float32")
    cut = audio[: int(len(audio) * 0.15)]
    wav_path = "clips/_hardneg_truncated.wav"
    sf.write(wav_path, cut, sr)
    decodes = decode_variants_with_model(model, wav_path)
    results = score_against_text(long_clip["text"], decodes)
    t = tally(results)
    out["truncated"] = {
        "source_clip": long_clip["clip_id"], "kept_fraction": 0.15,
        "decodes": decodes, "tally": t, "n_akshara": len(results),
    }
    print(f"[truncated to 15% = {len(cut)/sr:.1f}s] of {long_clip['clip_id']} "
          f"vs its own full transcript -> {t}  (n_akshara={len(results)})")
    print(f"  decodes: {decodes}")

    print()
    print("ACCEPTANCE CHECK (05-*.md protocol step 6): none of the above should")
    print("produce 'incorrect' on more than a token few akshara -- ideally they")
    print("route to mostly 'unclear' (or a not-yet-built coverage gate would")
    print("catch them before per-akshara scoring at all). Actual counts above.")
    return out


def main() -> None:
    with open(MANIFEST, encoding="utf-8") as f:
        clips = json.load(f)

    print("Loading model...")
    model = load_ctc_only_model(NEMO_PATH)
    print("Model loaded.\n")

    p4a = run_p4a(model, clips)
    p4b = run_p4b(model, clips)
    p5 = run_p5(model, clips)

    with open("p4_p5_results.json", "w", encoding="utf-8") as f:
        json.dump({"p4a": p4a, "p4b": p4b, "p5": p5}, f, ensure_ascii=False, indent=2)
    print("\nWrote p4_p5_results.json")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()

"""
Run the (now-working) Su-srota CTC decode path across the 16-clip held-out
sample and report CER / SN-WER against the dataset's own ground-truth text.
Written from scratch; see load_susrota_ctc.py for the load workaround and
09-*.md for why this is technique-viability evidence, not a product number.
"""
from __future__ import annotations

import json
import sys

from common_text import char_error_rate, sandhi_normalised_wer, word_error_rate
from load_susrota_ctc import load_ctc_only_model, transcribe

NEMO_PATH = "models/susrota/sushrota_sanskrit_asr_v13b.nemo"
MANIFEST = "clips/held_out_manifest.json"


def main() -> None:
    with open(MANIFEST, encoding="utf-8") as f:
        clips = json.load(f)

    print("Loading model...")
    model = load_ctc_only_model(NEMO_PATH)
    print("Model loaded.\n")

    results = []
    for c in clips:
        hyp = transcribe(model, c["wav_path"])
        ref = c["text"]
        cer = char_error_rate(ref, hyp)
        wer = word_error_rate(ref, hyp)
        snwer = sandhi_normalised_wer(ref, hyp)
        results.append({
            "clip_id": c["clip_id"],
            "duration_s": c["duration_s"],
            "ref": ref,
            "hyp": hyp,
            "cer": cer,
            "wer": wer,
            "sn_wer": snwer,
        })
        print(f"[{c['clip_id']}] dur={c['duration_s']:.1f}s CER={cer:.3f} WER={wer:.3f} SN-WER={snwer:.3f}")
        print(f"  ref: {ref}")
        print(f"  hyp: {hyp}")
        print()

    n = len(results)
    mean_cer = sum(r["cer"] for r in results) / n
    mean_wer = sum(r["wer"] for r in results) / n
    mean_snwer = sum(r["sn_wer"] for r in results) / n
    print("=" * 70)
    print(f"MEASURED on {n} real held-out clips (in_the_wild_test split):")
    print(f"  mean CER    = {mean_cer:.4f}")
    print(f"  mean WER    = {mean_wer:.4f}")
    print(f"  mean SN-WER = {mean_snwer:.4f}")

    with open("holdout_decode_results.json", "w", encoding="utf-8") as f:
        json.dump({
            "n_clips": n,
            "mean_cer": mean_cer,
            "mean_wer": mean_wer,
            "mean_sn_wer": mean_snwer,
            "per_clip": results,
        }, f, ensure_ascii=False, indent=2)
    print("\nWrote holdout_decode_results.json")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()

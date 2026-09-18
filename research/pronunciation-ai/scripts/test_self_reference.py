"""
Validate the SELF-REFERENCED audio-match approach the product owner chose:
grade an attempt against the same speaker's own reference recording.

The cross-speaker probe (test_audio_similarity.py) showed audio matching
overlaps across different voices. This probe asks the different, narrower
question that the self-reference design actually depends on:

  For the SAME speaker, does a second take of the SAME recitation score much
  higher than a DIFFERENT recitation — enough for a fair pass bar to exist?

No paired same-speaker retakes exist in the dataset, so a second take is
simulated from each clip with realistic take-to-take variation: a small random
time-stretch (tempo drift), a mic-gain change, and light additive noise. This
is a proxy for "the same child recites the same line again", not a real retake,
and is labelled as such. Different-text scores are the real cross-clip numbers.

Reuses the exact MFCC+CMVN+DTW method that will ship in TS.
"""
from __future__ import annotations

import numpy as np

from load_susrota_ctc import load_ctc_only_model, read_wav_16k_mono
from test_audio_similarity import dtw_distance, log_mel, mfcc_cmvn

SR = 16_000
RNG = np.random.default_rng(20260918)


def simulate_retake(audio: np.ndarray) -> np.ndarray:
    # tempo drift +/-8% via linear resample (no pitch lock -> also a mild
    # pitch shift, which a real retake has too)
    rate = float(RNG.uniform(0.92, 1.08))
    n = int(round(len(audio) / rate))
    idx = np.linspace(0, len(audio) - 1, n)
    stretched = np.interp(idx, np.arange(len(audio)), audio).astype(np.float32)
    # mic-gain change
    stretched *= float(RNG.uniform(0.7, 1.3))
    # light noise at ~ -34 dB relative to RMS
    rms = float(np.sqrt(np.mean(stretched**2)) + 1e-8)
    stretched += RNG.normal(0, rms * 0.02, size=stretched.shape).astype(np.float32)
    return np.clip(stretched, -1.0, 1.0)


def sim_from_feats(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.exp(-dtw_distance(a, b) / 0.5))


def main() -> None:
    import json

    with open("clips/held_out_manifest.json", encoding="utf-8") as f:
        clips = json.load(f)
    model = load_ctc_only_model("models/susrota/sushrota_sanskrit_asr_v13b.nemo")

    audio = {c["clip_id"]: read_wav_16k_mono(c["wav_path"]) for c in clips}
    feats = {cid: mfcc_cmvn(log_mel(model, a)) for cid, a in audio.items()}
    text = {c["clip_id"]: c["text"] for c in clips}
    ids = list(audio)

    print("SELF vs simulated RETAKE (same speaker, same text):")
    retake_scores = []
    for cid in ids:
        ref = feats[cid]
        for _ in range(2):  # two simulated retakes per clip
            att = mfcc_cmvn(log_mel(model, simulate_retake(audio[cid])))
            s = sim_from_feats(ref, att)
            retake_scores.append(s)
        print(f"  {cid:22s} retake sims: "
              f"{sim_from_feats(ref, mfcc_cmvn(log_mel(model, simulate_retake(audio[cid])))):.3f}")

    print("\nSELF vs DIFFERENT text (same reference clip, other recitation):")
    diff_scores = []
    for a in ids:
        for b in ids:
            if a != b and text[a] != text[b]:
                diff_scores.append(sim_from_feats(feats[a], feats[b]))

    retake = np.array(retake_scores)
    diff = np.array(diff_scores)
    print("\n" + "=" * 60)
    print("SUMMARY")
    print(f"  retake (same speaker+text)  mean={retake.mean():.3f}  min={retake.min():.3f}  p05={np.percentile(retake,5):.3f}")
    print(f"  different recitation        mean={diff.mean():.3f}  max={diff.max():.3f}  p95={np.percentile(diff,95):.3f}")
    # A fair pass bar must sit between p05(retake) and p95(diff).
    lo, hi = np.percentile(retake, 5), np.percentile(diff, 95)
    print(f"  candidate pass-bar window: [{hi:.3f} .. {lo:.3f}]")
    if lo > hi:
        mid = (lo + hi) / 2
        # false rejects of good retakes at mid, false accepts of wrong at mid
        fr = float((retake < mid).mean())
        fa = float((diff >= mid).mean())
        print(f"  VERDICT: SEPARABLE. e.g. bar={mid:.3f} -> "
              f"false-reject(good retake)={fr:.1%}, false-accept(wrong)={fa:.1%}")
    else:
        print("  VERDICT: OVERLAP even for self-reference — needs better features")


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    main()

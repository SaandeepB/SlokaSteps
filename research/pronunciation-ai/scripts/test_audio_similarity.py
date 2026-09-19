"""
Feasibility probe for AUDIO-TO-AUDIO similarity scoring (attempt vs a reference
recitation), the approach the product owner chose for graded lessons.

The question this answers before any app code is written: does a speaker-robust
spectral template match (MFCC + per-utterance cepstral mean/variance
normalisation + DTW) actually separate "same recitation" from "different
recitation" across DIFFERENT speakers? If it cannot, grading a child against an
adult teacher recording would penalise the child's voice, not their
pronunciation — a non-starter.

Data: the 16 held-out CC BY 4.0 clips. Several share text across recordings, so
they form real same-text / different-text pairs:
  - clip04 & clip06  : "मानं च तच्च यत्रोक्त"
  - clip10 & clip12  : "जन्माद्यस्य यतो..."
  - clip13 & clip14  : "वसुदेवसुतं देवं..."
  - clip09 & clip11  : overlapping "अग्निमीळे पुरोहितं..." (partial)
Everything else is different text.

Method (kept deliberately simple, so it ports cleanly to TS later):
  16kHz mono -> log-mel (same 80-band frontend as the ASR) -> MFCC via DCT-II,
  keep 13 coeffs -> per-utterance CMVN -> DTW with a Sakoe-Chiba band ->
  length-normalised path distance -> similarity = exp(-dist / scale).

No number here is invented; every figure is printed from a real computation.
"""
from __future__ import annotations

import itertools
import json

import numpy as np

from load_susrota_ctc import load_ctc_only_model, read_wav_16k_mono

N_MFCC = 13
BAND = 0.2  # Sakoe-Chiba band as a fraction of the longer sequence


def log_mel(model, audio: np.ndarray) -> np.ndarray:
    import torch

    sig = torch.tensor(audio).unsqueeze(0)
    length = torch.tensor([audio.shape[0]])
    with torch.no_grad():
        feats, feat_len = model.preprocessor(input_signal=sig, length=length)
    return feats[0, :, : int(feat_len[0])].cpu().numpy().T  # [frames, 80]


def dct_ii_matrix(n_out: int, n_in: int) -> np.ndarray:
    k = np.arange(n_out)[:, None]
    n = np.arange(n_in)[None, :]
    m = np.cos(np.pi * k * (2 * n + 1) / (2 * n_in))
    m *= np.sqrt(2.0 / n_in)
    m[0] *= 1.0 / np.sqrt(2.0)
    return m  # [n_out, n_in]


def mfcc_cmvn(logmel: np.ndarray) -> np.ndarray:
    d = dct_ii_matrix(N_MFCC, logmel.shape[1])
    mfcc = logmel @ d.T  # [frames, 13]
    mean = mfcc.mean(axis=0, keepdims=True)
    std = mfcc.std(axis=0, keepdims=True) + 1e-8
    return (mfcc - mean) / std


def dtw_distance(a: np.ndarray, b: np.ndarray, band: float = BAND) -> float:
    n, m = len(a), len(b)
    w = max(int(band * max(n, m)), abs(n - m)) + 1
    inf = float("inf")
    prev = np.full(m + 1, inf)
    prev[0] = 0.0
    # cost: 1 - cosine similarity per frame pair
    a_norm = a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-8)
    b_norm = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-8)
    for i in range(1, n + 1):
        cur = np.full(m + 1, inf)
        j_lo = max(1, i - w)
        j_hi = min(m, i + w)
        ai = a_norm[i - 1]
        for j in range(j_lo, j_hi + 1):
            cost = 1.0 - float(ai @ b_norm[j - 1])
            cur[j] = cost + min(prev[j], cur[j - 1], prev[j - 1])
        prev = cur
    return prev[m] / (n + m)  # length-normalised


def main() -> None:
    with open("clips/held_out_manifest.json", encoding="utf-8") as f:
        clips = json.load(f)
    model = load_ctc_only_model("models/susrota/sushrota_sanskrit_asr_v13b.nemo")

    feats = {}
    for c in clips:
        audio = read_wav_16k_mono(c["wav_path"])
        feats[c["clip_id"]] = mfcc_cmvn(log_mel(model, audio))
    ids = [c["clip_id"] for c in clips]
    text = {c["clip_id"]: c["text"] for c in clips}

    same_pairs = [
        ("heldout_04_dur3.8s", "heldout_06_dur4.2s"),
        ("heldout_10_dur6.2s", "heldout_12_dur8.0s"),
        ("heldout_13_dur10.2s", "heldout_14_dur13.8s"),
    ]
    same_set = {frozenset(p) for p in same_pairs}

    def sim(a: str, b: str) -> float:
        d = dtw_distance(feats[a], feats[b])
        return float(np.exp(-d / 0.5))

    print("SAME-TEXT pairs (different recordings/speakers):")
    same_scores = []
    for a, b in same_pairs:
        s = sim(a, b)
        same_scores.append(s)
        print(f"  {a:22s} vs {b:22s}  sim={s:.3f}  dist={dtw_distance(feats[a], feats[b]):.4f}")

    print("\nSELF pairs (identical recording, sanity upper bound):")
    self_scores = []
    for cid in ["heldout_04_dur3.8s", "heldout_13_dur10.2s"]:
        s = sim(cid, cid)
        self_scores.append(s)
        print(f"  {cid:22s} vs itself                  sim={s:.3f}")

    print("\nDIFFERENT-TEXT pairs (sample):")
    diff_scores = []
    pairs = [
        p for p in itertools.combinations(ids, 2)
        if frozenset(p) not in same_set and text[p[0]] != text[p[1]]
    ]
    # deterministic sample spread across the set
    for a, b in pairs[::7][:12]:
        s = sim(a, b)
        diff_scores.append(s)
        print(f"  {a:22s} vs {b:22s}  sim={s:.3f}")
    # score the rest silently for the summary
    for a, b in pairs:
        if (a, b) not in pairs[::7][:12]:
            diff_scores.append(sim(a, b))

    print("\n" + "=" * 60)
    print("SUMMARY")
    print(f"  self  min={min(self_scores):.3f}")
    print(f"  same  mean={np.mean(same_scores):.3f}  min={min(same_scores):.3f}  max={max(same_scores):.3f}")
    print(f"  diff  mean={np.mean(diff_scores):.3f}  min={min(diff_scores):.3f}  max={max(diff_scores):.3f}  (n={len(diff_scores)})")
    margin = min(same_scores) - max(diff_scores)
    print(f"  separation (min same - max diff) = {margin:+.3f}")
    print("  VERDICT:", "separable" if margin > 0 else "OVERLAP — naive audio-to-audio is unreliable")


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    main()

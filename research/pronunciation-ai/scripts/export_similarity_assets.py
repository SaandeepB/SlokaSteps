"""
Exports for the SELF-REFERENCED audio-match grader (pure-TS, no model weights):

1. <app>/src/services/chantAnalysis/melConstants.json   (COMMITTED)
     The hann window (win 400, periodic=False) and the 80x257 mel filterbank.
     These are NOT the Su-srota trained weights — the filterbank is the
     standard librosa mel matrix (a deterministic function of sr/n_fft/n_mels)
     and the window is a plain hann window, both reproducible by anyone. They
     let the grader compute log-mel features without any licensed asset.

2. <app>/src/test/fixtures/chant/similarity-parity.json  (COMMITTED, small)
     Python similarity values (MFCC+CMVN+DTW) for a handful of real clip pairs
     and for feature-level synthetic cases, so the TS port can be held to them.

3. <app>/src/test/fixtures/chant/mfcc-golden.json        (COMMITTED, small)
     One clip's audio -> MFCC(+CMVN) sequence, so the TS MFCC step has a
     self-contained golden independent of the DTW step.
"""
from __future__ import annotations

import base64
import json
import os

import numpy as np

from load_susrota_ctc import load_ctc_only_model, read_wav_16k_mono
from test_audio_similarity import (
    N_MFCC,
    dct_ii_matrix,
    dtw_distance,
    log_mel,
    mfcc_cmvn,
)

APP = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
SVC = os.path.join(APP, "src", "services", "chantAnalysis")
FIX = os.path.join(APP, "src", "test", "fixtures", "chant")
MANIFEST = "clips/held_out_manifest.json"
SCALE = 0.5  # similarity = exp(-dtw_dist / SCALE); must match TS


def b64(arr: np.ndarray) -> str:
    return base64.b64encode(np.ascontiguousarray(arr, dtype=np.float32).tobytes()).decode()


def sim(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.exp(-dtw_distance(a, b) / SCALE))


def main() -> None:
    model = load_ctc_only_model("models/susrota/sushrota_sanskrit_asr_v13b.nemo")
    feat = model.preprocessor.featurizer
    fb = feat.fb.detach().cpu().numpy()
    if fb.ndim == 3:
        fb = fb[0]
    window = feat.window.detach().cpu().numpy()

    # 1. committed mel constants
    with open(os.path.join(SVC, "melConstants.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "_doc": "Standard hann window + librosa mel filterbank (sr 16000, "
                "n_fft 512, n_mels 80). NOT Su-srota trained weights; a "
                "deterministic, licence-free mel matrix. Used by the "
                "self-referenced audio grader to compute log-mel with no "
                "model download.",
                "nFft": int(feat.n_fft),
                "winLength": int(feat.win_length),
                "hopLength": int(feat.hop_length),
                "nMels": int(fb.shape[0]),
                "preemph": float(feat.preemph),
                "logZeroGuard": float(2**-24),
                "normalizeStdEps": 1e-5,
                "magPower": 2.0,
                "padTo": int(feat.pad_to),
                "nMfcc": N_MFCC,
                "dtwScale": SCALE,
                "windowB64": b64(window),
                "melFilterbankShape": [int(fb.shape[0]), int(fb.shape[1])],
                "melFilterbankB64": b64(fb),
            },
            f,
        )
    print("wrote melConstants.json  fb", fb.shape, "win", window.shape)

    with open(MANIFEST, encoding="utf-8") as f:
        clips = json.load(f)
    audio = {c["clip_id"]: read_wav_16k_mono(c["wav_path"]) for c in clips}
    feats = {cid: mfcc_cmvn(log_mel(model, a)) for cid, a in audio.items()}

    # 2. real-clip similarity parity
    pairs = [
        ("heldout_04_dur3.8s", "heldout_04_dur3.8s"),   # self -> 1.0
        ("heldout_04_dur3.8s", "heldout_06_dur4.2s"),   # same text, diff speaker
        ("heldout_10_dur6.2s", "heldout_12_dur8.0s"),   # same text
        ("heldout_13_dur10.2s", "heldout_14_dur13.8s"), # same text
        ("heldout_00_dur2.0s", "heldout_15_dur24.1s"),  # different text
        ("heldout_02_dur3.4s", "heldout_09_dur5.8s"),   # different text
        ("heldout_01_dur3.2s", "heldout_08_dur5.2s"),   # different text
    ]
    parity = [{"a": a, "b": b, "similarity": sim(feats[a], feats[b])} for a, b in pairs]
    with open(os.path.join(FIX, "similarity-parity.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "_doc": "MFCC+CMVN+DTW similarity for real clip pairs, computed "
                "by test_audio_similarity.py. The TS grader must reproduce "
                "these within tolerance. Clips are git-ignored (CC BY 4.0 "
                "prathoshap/sushrota-sanskrit-asr-data); the node test skips "
                "when absent.",
                "dtwScale": SCALE,
                "nMfcc": N_MFCC,
                "pairs": parity,
            },
            f,
            indent=1,
        )
    print("wrote similarity-parity.json", [round(p["similarity"], 3) for p in parity])

    # 3. MFCC golden for one short clip (self-contained: audio -> mfcc)
    cid = "heldout_00_dur2.0s"
    lm = log_mel(model, audio[cid])
    mf = mfcc_cmvn(lm)
    with open(os.path.join(FIX, "mfcc-golden.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "_doc": "audio -> MFCC(13)+CMVN sequence for one clip. Lets the "
                "TS MFCC step be checked without the DTW step. "
                "CC BY 4.0 prathoshap/sushrota-sanskrit-asr-data.",
                "clipId": cid,
                "audioB64": b64(audio[cid]),
                "mfccShape": [int(mf.shape[0]), int(mf.shape[1])],
                "mfccB64": b64(mf),
                "nMfcc": N_MFCC,
            },
            f,
        )
    print("wrote mfcc-golden.json  mfcc", mf.shape)

    # also emit the DCT matrix parity (small) so the TS DCT is pinned exactly
    dct = dct_ii_matrix(N_MFCC, int(fb.shape[0]))
    with open(os.path.join(FIX, "dct-golden.json"), "w", encoding="utf-8") as f:
        json.dump(
            {"_doc": "DCT-II matrix [13 x 80] used for MFCC.",
             "shape": [int(dct.shape[0]), int(dct.shape[1])], "b64": b64(dct)},
            f,
        )
    print("wrote dct-golden.json", dct.shape)


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    main()

"""
Export everything the in-app (TypeScript) chant analyzer needs, straight from
the real checkpoint and the real harness — so the web port can be verified
against ground truth instead of re-derived by hand.

Outputs
-------
1. <app>/models-local/chant/            (git-ignored; serving is a deploy step)
     susrota_ctc_fp16.onnx              copied from models/
     sa_tokenizer.json                  the 256 Sanskrit SentencePiece pieces
     frontend.json                      preprocessor constants + hann window +
                                        mel filterbank, exported verbatim from
                                        the loaded checkpoint's preprocessor
     model-manifest.json                file names, byte sizes, sha256

2. <app>/src/test/fixtures/chant/       (committed; small)
     text-parity.json                   common_text.py outputs for the app's
                                        sloka texts + edge cases
     align-parity.json                  Needleman-Wunsch alignments
     features-golden.json               clip00 audio (f32 b64) -> features
                                        (f32 b64), + window + filterbank so the
                                        TS unit test is self-contained
     verify-parity.json                 per-clip: expected text, the 4 ONNX-
                                        fp16 decode variants, and the exact
                                        per-akshara labels score_against_text
                                        produces for them (incl. hard negatives)

Every number in these files is computed here by the same code paths measured
in reports 09/10/11. Nothing is estimated.

Audio provenance: clips/ came from the Su-srota dataset's in_the_wild_test
split (prathoshap/sushrota-sanskrit-asr-data, CC BY 4.0); attribution is
embedded in the fixture JSON.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import shutil
import sys

import numpy as np
import torch

from common_text import (
    align,
    canonicalise_for_alignment,
    normalise_devanagari,
    segment_aksharas,
    strip_spaces,
)
from load_susrota_ctc import (
    BLANK_ID,
    SANSKRIT_OFFSET,
    SANSKRIT_WIDTH,
    load_ctc_only_model,
    read_wav_16k_mono,
)
from verify_against_text import BLANK_PENALTIES, score_against_text

APP_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
ASSET_DIR = os.path.join(APP_ROOT, "models-local", "chant")
FIXTURE_DIR = os.path.join(APP_ROOT, "src", "test", "fixtures", "chant")
NEMO_PATH = "models/susrota/sushrota_sanskrit_asr_v13b.nemo"
FP16_ONNX = "models/susrota_ctc_fp16.onnx"
MANIFEST = "clips/held_out_manifest.json"

ATTRIBUTION = (
    "Derived from the Su-srota Sanskrit ASR dataset "
    "(prathoshap/sushrota-sanskrit-asr-data, in_the_wild_test split), "
    "licensed CC BY 4.0."
)

# The app's three featured slokas + edge cases for the text-layer port.
TEXT_CASES = [
    "सरस्वति नमस्तुभ्यं वरदे कामरूपिणि ।",
    "विद्यारम्भं करिष्यामि सिद्धिर्भवतु मे सदा ॥",
    "शुक्लाम्बरधरं विष्णुं शशिवर्णं चतुर्भुजम् ।",
    "प्रसन्नवदनं ध्यायेत् सर्वविघ्नोपशान्तये ॥",
    "प्रभुं प्राणनाथं विभुं विश्वनाथं जगन्नाथनाथं सदानन्दभाजाम् ।",
    "भवद्भव्यभूतेश्वरं भूतनाथं शिवं शङ्करं शम्भुमीशानमीडे ॥",
    "गले रुण्डमालं तनौ सर्पजालं महाकालकालं गणेशादिपालम् ।",
    "जटाजूटगङ्गोत्तरङ्गैर्विशालं शिवं शङ्करं शम्भुमीशानमीडे ॥",
    "गुरुर्ब्रह्मा गुरुर्विष्णुर्गुरुर्देवो महेश्वरः ।",
    "करमूले तु गोविन्दः प्रभाते करदर्शनम् ॥",
    # edge cases
    "ॐ सह नाववतु ।",           # om dropped
    "सञ्जय उवाच",              # independent vowel + conjunct
    "तस्मै श्रीगुरवे नमः ॥ १ ॥",  # digits + double danda
    "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन",  # dense conjuncts
    "अन्तं गच्छन्तम् ",          # phrase-final m-virama -> anusvara canonical
    "पठेत् स्तोत्ररत्नम्",        # final t-virama kept, final m canonicalised
    "यत्र योगेश्वरः कृष्णः",      # visarga trail
    "सोऽहम् अस्मि",             # avagraha dropped
    "",                          # empty
    "   ",                       # whitespace only
]

ALIGN_CASES = [
    (["स", "र", "स्व", "ति"], ["स", "र", "स्व", "ति"]),
    (["स", "र", "स्व", "ति"], ["स", "स्व", "ति"]),            # deletion
    (["स", "र", "स्व", "ति"], ["स", "र", "र", "स्व", "ति"]),  # insertion
    (["स", "र", "स्व", "ति"], ["श", "र", "स्प", "ती"]),       # substitutions
    ([], ["क"]),
    (["क"], []),
]


def b64_f32(arr: np.ndarray) -> str:
    return base64.b64encode(np.ascontiguousarray(arr, dtype=np.float32).tobytes()).decode(
        "ascii"
    )


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def compute_features(model, audio: np.ndarray):
    sig = torch.tensor(audio).unsqueeze(0)
    sig_len = torch.tensor([audio.shape[0]])
    with torch.no_grad():
        feats, feat_len = model.preprocessor(input_signal=sig, length=sig_len)
    return feats.cpu().numpy().astype(np.float32), int(feat_len[0])


def decode_variants_from_logprobs(model, logprobs: np.ndarray) -> list[str]:
    from load_susrota_ctc import greedy_decode_sanskrit_slice

    return [
        greedy_decode_sanskrit_slice(model, logprobs, blank_penalty=p)
        for p in BLANK_PENALTIES
    ]


def main() -> None:
    os.makedirs(ASSET_DIR, exist_ok=True)
    os.makedirs(FIXTURE_DIR, exist_ok=True)

    print("Loading checkpoint (preprocessor + tokenizer + config)...")
    model = load_ctc_only_model(NEMO_PATH)
    featurizer = model.preprocessor.featurizer

    # --- 1. tokenizer -------------------------------------------------------
    sub = model.tokenizer.tokenizers_dict["sa"]
    pieces = [sub.ids_to_tokens([i])[0] for i in range(SANSKRIT_WIDTH)]
    with open(os.path.join(ASSET_DIR, "sa_tokenizer.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "_doc": "Sanskrit ('sa') sub-tokenizer pieces of the Su-srota "
                "aggregate tokenizer. Sliced-vocab id i (1..256) maps to "
                "pieces[i-1]; id 0 is the CTC blank.",
                "sanskritOffset": SANSKRIT_OFFSET,
                "sanskritWidth": SANSKRIT_WIDTH,
                "blankId": BLANK_ID,
                "pieces": pieces,
            },
            f,
            ensure_ascii=False,
            indent=1,
        )
    print(f"  sa tokenizer: {len(pieces)} pieces")

    # --- 2. frontend constants ---------------------------------------------
    fb = featurizer.fb.detach().cpu().numpy()  # [1, nfilt, n_fft//2+1]
    if fb.ndim == 3:
        fb = fb[0]
    window = featurizer.window.detach().cpu().numpy()
    frontend = {
        "_doc": "Mel frontend constants exported verbatim from the loaded "
        "Su-srota checkpoint's AudioToMelSpectrogramPreprocessor. The TS "
        "port must reproduce NeMo's eval-mode forward exactly: no dither "
        "(training-only), preemphasis, center=True reflect-padded STFT "
        "(win 400 zero-padded to n_fft 512, hann periodic=False), "
        "power spectrum, mel matmul, log(x + 2^-24), per-feature "
        "mean/std(N-1) normalisation with +1e-5 on std, zero beyond "
        "seq_len = floor(len/160). pad_to is 0 in this checkpoint.",
        "sampleRate": 16000,
        "nFft": int(featurizer.n_fft),
        "winLength": int(featurizer.win_length),
        "hopLength": int(featurizer.hop_length),
        "nMels": int(fb.shape[0]),
        "preemph": float(featurizer.preemph),
        "logZeroGuard": float(2**-24),
        "normalizeStdEps": 1e-5,
        "magPower": 2.0,
        "padTo": int(featurizer.pad_to),
        "windowB64": b64_f32(window),
        "melFilterbankShape": [int(fb.shape[0]), int(fb.shape[1])],
        "melFilterbankB64": b64_f32(fb),
        "onnxInputNames": ["audio_signal", "length"],
        "onnxOutputName": "logprobs",
        "vocabSize": 5633,
    }
    with open(os.path.join(ASSET_DIR, "frontend.json"), "w", encoding="utf-8") as f:
        json.dump(frontend, f, ensure_ascii=False)
    print(
        f"  frontend: n_fft={frontend['nFft']} win={frontend['winLength']} "
        f"hop={frontend['hopLength']} mels={frontend['nMels']} "
        f"preemph={frontend['preemph']} pad_to={frontend['padTo']} "
        f"fb={fb.shape} window={window.shape}"
    )

    # --- 3. model copy + manifest -------------------------------------------
    dst_onnx = os.path.join(ASSET_DIR, "susrota_ctc_fp16.onnx")
    if not os.path.exists(dst_onnx) or os.path.getsize(dst_onnx) != os.path.getsize(FP16_ONNX):
        print("  copying fp16 onnx ...")
        shutil.copyfile(FP16_ONNX, dst_onnx)
    manifest = {
        "_doc": "Chant analyzer web assets. The .onnx weights derive from the "
        "Su-srota Sanskrit ASR checkpoint, which has no explicit licence "
        "grant (research/pronunciation-ai/06): these files are provisioned "
        "locally and must not be redistributed until the author grants one.",
        "analyzerVersion": "susrota-v13b-ctc-fp16-web-v1",
        "files": {
            name: {
                "bytes": os.path.getsize(os.path.join(ASSET_DIR, name)),
                "sha256": sha256_file(os.path.join(ASSET_DIR, name)),
            }
            for name in ["susrota_ctc_fp16.onnx", "sa_tokenizer.json", "frontend.json"]
        },
    }
    with open(os.path.join(ASSET_DIR, "model-manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1)
    print("  manifest written")

    # --- 4. text-layer fixtures ----------------------------------------------
    text_cases = []
    for case in TEXT_CASES:
        text_cases.append(
            {
                "input": case,
                "normalised": normalise_devanagari(case),
                "stripped": strip_spaces(case),
                "canonical": canonicalise_for_alignment(normalise_devanagari(case)),
                "aksharas": segment_aksharas(
                    canonicalise_for_alignment(normalise_devanagari(case))
                ),
            }
        )
    with open(os.path.join(FIXTURE_DIR, "text-parity.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "_doc": "Generated by export_web_assets.py from common_text.py. "
                "The TS text layer must reproduce these outputs exactly.",
                "cases": text_cases,
            },
            f,
            ensure_ascii=False,
            indent=1,
        )
    align_cases = [
        {
            "ref": r,
            "hyp": h,
            "pairs": [[a, b] for a, b in align(r, h)],
        }
        for r, h in ALIGN_CASES
    ]
    with open(os.path.join(FIXTURE_DIR, "align-parity.json"), "w", encoding="utf-8") as f:
        json.dump({"_doc": "align() parity cases.", "cases": align_cases}, f, ensure_ascii=False, indent=1)
    print(f"  text fixtures: {len(text_cases)} text cases, {len(align_cases)} align cases")

    # --- 5. feature golden (clip00) ------------------------------------------
    with open(MANIFEST, encoding="utf-8") as f:
        clips = json.load(f)
    clip00 = clips[0]
    audio00 = read_wav_16k_mono(clip00["wav_path"])
    feats00, feat_len00 = compute_features(model, audio00)
    with open(os.path.join(FIXTURE_DIR, "features-golden.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "_doc": "Self-contained mel-frontend golden: audio in, NeMo "
                "eval-mode features out, plus the exact window and mel "
                "filterbank. " + ATTRIBUTION,
                "clipId": clip00["clip_id"],
                "sampleRate": 16000,
                "audioB64": b64_f32(audio00),
                "featLen": feat_len00,
                "featShape": [int(feats00.shape[1]), int(feats00.shape[2])],
                "featuresB64": b64_f32(feats00[0]),
                "windowB64": frontend["windowB64"],
                "melFilterbankShape": frontend["melFilterbankShape"],
                "melFilterbankB64": frontend["melFilterbankB64"],
                "preprocessor": {
                    k: frontend[k]
                    for k in (
                        "nFft",
                        "winLength",
                        "hopLength",
                        "nMels",
                        "preemph",
                        "logZeroGuard",
                        "normalizeStdEps",
                        "magPower",
                        "padTo",
                    )
                },
            },
            f,
        )
    print(f"  features golden: {clip00['clip_id']} feats {feats00.shape} len {feat_len00}")

    # --- 6. verify-parity fixtures (ONNX fp16 decodes + labels) ---------------
    import onnxruntime as ort

    so = ort.SessionOptions()
    so.intra_op_num_threads = 4
    sess = ort.InferenceSession(FP16_ONNX, sess_options=so, providers=["CPUExecutionProvider"])

    def onnx_logprobs(audio: np.ndarray) -> np.ndarray:
        feats, feat_len = compute_features(model, audio)
        out = sess.run(
            None,
            {"audio_signal": feats, "length": np.array([feat_len], dtype=np.int64)},
        )
        return out[0][0]

    entries = []
    for c in clips:
        audio = read_wav_16k_mono(c["wav_path"])
        lp = onnx_logprobs(audio)
        decodes = decode_variants_from_logprobs(model, lp)
        results = score_against_text(c["text"], decodes)
        entries.append(
            {
                "clipId": c["clip_id"],
                "kind": "correct-pair",
                "expectedText": c["text"],
                "decodes": decodes,
                "results": results,
            }
        )
        print(f"  verify-parity: {c['clip_id']} decodes ok")

    # hard negatives measured in report 10: silence, noise, truncated —
    # each scored against clip15's long text; plus wrong-text (clip13 audio
    # vs clip15 text, and clip15 audio vs clip13 text).
    long_text = clips[15]["text"]
    for wav, kind in [
        ("clips/_hardneg_silence.wav", "silence"),
        ("clips/_hardneg_noise.wav", "noise"),
        ("clips/_hardneg_truncated.wav", "truncated"),
    ]:
        audio = read_wav_16k_mono(wav)
        lp = onnx_logprobs(audio)
        decodes = decode_variants_from_logprobs(model, lp)
        results = score_against_text(long_text, decodes)
        entries.append(
            {
                "clipId": os.path.basename(wav),
                "kind": kind,
                "expectedText": long_text,
                "decodes": decodes,
                "results": results,
            }
        )
        print(f"  verify-parity: {kind} ok")
    for audio_idx, text_idx in [(13, 15), (15, 13), (2, 15)]:
        audio = read_wav_16k_mono(clips[audio_idx]["wav_path"])
        lp = onnx_logprobs(audio)
        decodes = decode_variants_from_logprobs(model, lp)
        results = score_against_text(clips[text_idx]["text"], decodes)
        entries.append(
            {
                "clipId": clips[audio_idx]["clip_id"],
                "kind": "wrong-text",
                "expectedText": clips[text_idx]["text"],
                "decodes": decodes,
                "results": results,
            }
        )
        print(f"  verify-parity: wrong-text audio={audio_idx} text={text_idx} ok")

    with open(os.path.join(FIXTURE_DIR, "verify-parity.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "_doc": "ONNX-fp16 decode variants (blank penalties "
                f"{list(BLANK_PENALTIES)}) and the exact score_against_text "
                "labels for them. The TS port must reproduce every label and "
                "every evidence count. " + ATTRIBUTION,
                "blankPenalties": list(BLANK_PENALTIES),
                "entries": entries,
            },
            f,
            ensure_ascii=False,
            indent=1,
        )
    print(f"  verify-parity: {len(entries)} entries written")
    print("\nDone. Assets in", ASSET_DIR, "\nFixtures in", FIXTURE_DIR)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()

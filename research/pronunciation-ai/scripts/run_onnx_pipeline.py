"""
Q3 (timing) + Q4 (accuracy after quantization) for the on-device feasibility
report (11-*.md). Written from scratch by the research-analyst.

Mel-feature extraction (raw audio -> 80-dim log-mel) is done via the NeMo/
PyTorch preprocessor (see 11-*.md Q1: it does not export to ONNX --
`torch.stft`'s complex-tensor output isn't supported by the installed
PyTorch ONNX exporter). Only the encoder+CTC-decoder graph -- the part that
DOES export, and the dominant cost of a forward pass -- is run through
onnxruntime here. This is stated explicitly so the timing numbers below are
not mistaken for a full raw-audio-in, ONNX-only pipeline measurement.

CRITICAL HONESTY NOTE: every wall-clock number this script prints is native
CPU onnxruntime on this machine. It is a LOWER BOUND on browser
(onnxruntime-web / WASM) latency, not a browser measurement -- this script
cannot run in a browser and makes no claim about one.
"""
from __future__ import annotations

import json
import sys
import time

import numpy as np
import onnxruntime as ort
import torch

from common_text import char_error_rate, sandhi_normalised_wer, word_error_rate
from load_susrota_ctc import (
    SANSKRIT_OFFSET,
    SANSKRIT_WIDTH,
    BLANK_ID,
    SUBTOKENIZER_KEY,
    load_ctc_only_model,
    read_wav_16k_mono,
    greedy_decode_sanskrit_slice,
)

NEMO_PATH = "models/susrota/sushrota_sanskrit_asr_v13b.nemo"
FP32_ONNX = "models/susrota_ctc_fp32.onnx"
INT8_ONNX = "models/susrota_ctc_int8.onnx"
FP16_ONNX = "models/susrota_ctc_fp16.onnx"
MANIFEST = "clips/held_out_manifest.json"


def compute_features(torch_model, wav_path: str):
    """Raw 16kHz wav -> (audio_signal [1,80,T] float32 np, length [1] int64 np).
    Uses the PyTorch preprocessor (NOT exported to ONNX -- see module docstring).
    """
    audio = read_wav_16k_mono(wav_path)
    sig = torch.tensor(audio).unsqueeze(0)
    sig_len = torch.tensor([audio.shape[0]])
    with torch.no_grad():
        feats, feat_len = torch_model.preprocessor(input_signal=sig, length=sig_len)
    return feats.cpu().numpy().astype(np.float32), feat_len.cpu().numpy().astype(np.int64)


def ort_forward(session: ort.InferenceSession, audio_signal: np.ndarray, length: np.ndarray):
    input_names = [i.name for i in session.get_inputs()]
    t0 = time.perf_counter()
    outputs = session.run(None, {input_names[0]: audio_signal, input_names[1]: length})
    dt = time.perf_counter() - t0
    return outputs[0], dt  # logprobs [1, T, 5633]


def main() -> None:
    with open(MANIFEST, encoding="utf-8") as f:
        clips = json.load(f)

    print("Loading PyTorch model (for tokenizer + preprocessor only)...")
    torch_model = load_ctc_only_model(NEMO_PATH)

    print("Creating onnxruntime CPU sessions (fp32 + int8)...")
    so = ort.SessionOptions()
    so.intra_op_num_threads = 4
    t0 = time.perf_counter()
    sess_fp32 = ort.InferenceSession(FP32_ONNX, sess_options=so, providers=["CPUExecutionProvider"])
    load_fp32 = time.perf_counter() - t0
    t0 = time.perf_counter()
    sess_int8 = ort.InferenceSession(INT8_ONNX, sess_options=so, providers=["CPUExecutionProvider"])
    load_int8 = time.perf_counter() - t0
    t0 = time.perf_counter()
    sess_fp16 = ort.InferenceSession(FP16_ONNX, sess_options=so, providers=["CPUExecutionProvider"])
    load_fp16 = time.perf_counter() - t0
    print(f"  fp32 session load: {load_fp32:.2f}s   int8 session load: {load_int8:.2f}s   fp16 session load: {load_fp16:.2f}s")
    print(f"  ORT providers available: {ort.get_available_providers()}")
    print(f"  ORT version: {ort.__version__}\n")

    per_clip = []
    for c in clips:
        feats, feat_len = compute_features(torch_model, c["wav_path"])

        lp_fp32, dt_fp32 = ort_forward(sess_fp32, feats, feat_len)
        lp_int8, dt_int8 = ort_forward(sess_int8, feats, feat_len)
        feats16 = feats.astype(np.float32)  # keep_io_types=True -> fp16 session still takes fp32 I/O
        lp_fp16, dt_fp16 = ort_forward(sess_fp16, feats16, feat_len)

        hyp_fp32 = greedy_decode_sanskrit_slice(torch_model, lp_fp32[0])
        hyp_int8 = greedy_decode_sanskrit_slice(torch_model, lp_int8[0])
        hyp_fp16 = greedy_decode_sanskrit_slice(torch_model, lp_fp16[0].astype(np.float32))

        ref = c["text"]
        row = {
            "clip_id": c["clip_id"],
            "duration_s": c["duration_s"],
            "ort_fp32_s": dt_fp32,
            "ort_int8_s": dt_int8,
            "ort_fp16_s": dt_fp16,
            "rtf_fp32": dt_fp32 / c["duration_s"],
            "rtf_int8": dt_int8 / c["duration_s"],
            "rtf_fp16": dt_fp16 / c["duration_s"],
            "ref": ref,
            "hyp_fp32_onnx": hyp_fp32,
            "hyp_int8_onnx": hyp_int8,
            "hyp_fp16_onnx": hyp_fp16,
            "cer_fp32_onnx": char_error_rate(ref, hyp_fp32),
            "cer_int8_onnx": char_error_rate(ref, hyp_int8),
            "cer_fp16_onnx": char_error_rate(ref, hyp_fp16),
            "wer_fp32_onnx": word_error_rate(ref, hyp_fp32),
            "wer_int8_onnx": word_error_rate(ref, hyp_int8),
            "wer_fp16_onnx": word_error_rate(ref, hyp_fp16),
            "snwer_fp32_onnx": sandhi_normalised_wer(ref, hyp_fp32),
            "snwer_int8_onnx": sandhi_normalised_wer(ref, hyp_int8),
            "snwer_fp16_onnx": sandhi_normalised_wer(ref, hyp_fp16),
        }
        per_clip.append(row)
        print(f"[{c['clip_id']}] dur={c['duration_s']:5.1f}s  "
              f"fp32={dt_fp32*1000:6.1f}ms(RTF={row['rtf_fp32']:.3f})  "
              f"int8={dt_int8*1000:6.1f}ms(RTF={row['rtf_int8']:.3f})  "
              f"fp16={dt_fp16*1000:6.1f}ms(RTF={row['rtf_fp16']:.3f})  "
              f"CER fp32={row['cer_fp32_onnx']:.3f} int8={row['cer_int8_onnx']:.3f} fp16={row['cer_fp16_onnx']:.3f}")

    n = len(per_clip)
    summary = {
        "n_clips": n,
        "ort_version": ort.__version__,
        "session_load_s": {"fp32": load_fp32, "int8": load_int8, "fp16": load_fp16},
        "mean_rtf_fp32": sum(r["rtf_fp32"] for r in per_clip) / n,
        "mean_rtf_int8": sum(r["rtf_int8"] for r in per_clip) / n,
        "mean_rtf_fp16": sum(r["rtf_fp16"] for r in per_clip) / n,
        "mean_cer_fp32_onnx": sum(r["cer_fp32_onnx"] for r in per_clip) / n,
        "mean_cer_int8_onnx": sum(r["cer_int8_onnx"] for r in per_clip) / n,
        "mean_cer_fp16_onnx": sum(r["cer_fp16_onnx"] for r in per_clip) / n,
        "median_cer_fp32_onnx": sorted(r["cer_fp32_onnx"] for r in per_clip)[n // 2],
        "median_cer_int8_onnx": sorted(r["cer_int8_onnx"] for r in per_clip)[n // 2],
        "median_cer_fp16_onnx": sorted(r["cer_fp16_onnx"] for r in per_clip)[n // 2],
        "mean_wer_fp32_onnx": sum(r["wer_fp32_onnx"] for r in per_clip) / n,
        "mean_wer_int8_onnx": sum(r["wer_int8_onnx"] for r in per_clip) / n,
        "mean_wer_fp16_onnx": sum(r["wer_fp16_onnx"] for r in per_clip) / n,
        "n_hyp_identical_fp32_vs_int8": sum(1 for r in per_clip if r["hyp_fp32_onnx"] == r["hyp_int8_onnx"]),
        "n_hyp_identical_fp32_vs_fp16": sum(1 for r in per_clip if r["hyp_fp32_onnx"] == r["hyp_fp16_onnx"]),
    }
    print("\n" + "=" * 78)
    print("SUMMARY")
    for k, v in summary.items():
        print(f"  {k}: {v}")

    with open("onnx_pipeline_results.json", "w", encoding="utf-8") as f:
        json.dump({"summary": summary, "per_clip": per_clip}, f, ensure_ascii=False, indent=2)
    print("\nWrote onnx_pipeline_results.json")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()

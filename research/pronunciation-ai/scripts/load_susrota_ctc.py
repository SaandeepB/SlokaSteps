"""
Load the Su-srota Sanskrit ASR checkpoint's encoder + CTC head with the
CURRENTLY INSTALLED NeMo (3.0.0), working around three confirmed API
incompatibilities between whatever NeMo build trained this checkpoint and
vanilla NeMo 3.0.0. See ../09-parameter-count-and-restore-from.md for the
full diagnosis; short version:

  1. tokenizer.type == "multilingual" is not a type vanilla NeMo 3.0.0's
     ASRBPEMixin._setup_tokenizer dispatches on (only "agg" or a monolingual
     bpe/wpe type). The underlying structure (a `langs: {<code>: {dir,
     model_path, vocab_path, spe_tokenizer_vocab}, ...}` map) is IDENTICAL
     to what current NeMo calls an aggregate ("agg") tokenizer -- confirmed
     empirically: relabelling the type to "agg" loads all 22 sub-tokenizers
     correctly (log line "Aggregate vocab size: 5632").
  2. decoder.multisoftmax=True (RNNTDecoder) and joint.multilingual=True
     (RNNTJoint) are constructor kwargs that do not exist on
     nemo.collections.asr.modules.rnnt.{RNNTDecoder,RNNTJoint} in this
     install. This is NOT a simple version-pin issue for the RNNT half --
     these kwargs do not appear anywhere in the upstream NeMo module in any
     version this analyst could find; the checkpoint was almost certainly
     trained with a customised/forked NeMo (consistent with an AI4Bharat
     in-house IndicConformer training fork) that added multilingual-aware
     RNNT support never merged upstream.

The documented Su-srota decode path (HF model card "Usage" section) only
ever touches the encoder + CTC head -- it explicitly does not use the RNNT
decoder/joint. So instead of chasing a NeMo/fork version that can build the
full hybrid model, this loader:
  - extracts the .nemo archive to a folder (needed so tokenizer artifact
    refs of the form "nemo:<hash>_file" resolve -- normally restore_from()
    does this internally, we replicate it manually with AppState so we can
    build a plain EncDecCTCModelBPE instead of the hybrid class),
  - builds a config for `EncDecCTCModelBPE` using ONLY the checkpoint's
    preprocessor / encoder / tokenizer / aux_ctc.decoder sections (the RNNT
    decoder/joint sections are dropped entirely -- they're dead weight for
    this decode path),
  - patches the two incompatible keys (tokenizer.type -> "agg",
    decoder.multisoftmax removed),
  - loads a state dict built by taking the checkpoint's `encoder.*` and
    `preprocessor.*` keys verbatim and remapping `ctc_decoder.*` ->
    `decoder.*` (the checkpoint's CTC head keys) -- the `decoder.*` (RNNT
    prednet) and `joint.*` keys in the original state dict are dropped.

Empirically verified 2026-09-15: this produces ZERO missing and ZERO
unexpected keys on `load_state_dict(strict=True)` -- i.e. every parameter
this loader's model has is filled from the checkpoint's own trained
weights; nothing is left randomly initialised. Total: 118,001,153 params
(~118.0 M) for the encoder+CTC-head path actually used at inference, out of
129,289,352 (~129.3 M) trained in the full checkpoint (the remaining ~11.25
M live in the unused RNNT decoder/joint).

No code is copied from the Su-srota model card or the (license-less)
github.com/prathoshap/sushrota-sanskrit-asr repo. The four numeric
constants below are quoted facts from the model card; everything else here
-- including this whole workaround -- is this analyst's own diagnosis and
implementation, arrived at by reading NeMo's own installed source and
iterating against real error messages, not by copying any third party fix.
"""
from __future__ import annotations

import os

import numpy as np
import torch
import yaml
from omegaconf import OmegaConf

SANSKRIT_OFFSET = 4096
SANSKRIT_WIDTH = 256
BLANK_ID = 5632
SUBTOKENIZER_KEY = "sa"
TARGET_SR = 16_000


def _extract_dir_for(nemo_path: str) -> str:
    base = os.path.splitext(os.path.basename(nemo_path))[0]
    return os.path.join(os.path.dirname(os.path.abspath(nemo_path)), f"_{base}_extracted")


def load_ctc_only_model(nemo_path: str, cache_extract: bool = True):
    """
    Return an eval-mode nemo_asr.models.EncDecCTCModelBPE built from the
    Su-srota .nemo's encoder + CTC head only, with real trained weights.
    """
    import tarfile

    import nemo.collections.asr as nemo_asr
    from nemo.utils import app_state as app_state_mod

    extract_dir = _extract_dir_for(nemo_path)
    if not (cache_extract and os.path.isdir(extract_dir) and os.listdir(extract_dir)):
        os.makedirs(extract_dir, exist_ok=True)
        with tarfile.open(nemo_path) as tf:
            tf.extractall(extract_dir)

    with open(os.path.join(extract_dir, "model_config.yaml"), encoding="utf-8") as f:
        full_cfg = yaml.safe_load(f)

    # --- patch #1: tokenizer type "multilingual" -> "agg" ------------------
    full_cfg["tokenizer"]["type"] = "agg"

    # --- patch #2: drop the fork-only "multisoftmax" decoder kwarg ---------
    decoder_cfg = dict(full_cfg["aux_ctc"]["decoder"])
    decoder_cfg.pop("multisoftmax", None)

    ctc_only_cfg = {
        "sample_rate": TARGET_SR,
        "preprocessor": full_cfg["preprocessor"],
        "encoder": full_cfg["encoder"],
        "decoder": decoder_cfg,
        "tokenizer": full_cfg["tokenizer"],
        "spec_augment": full_cfg.get("spec_augment"),
        "log_prediction": False,
    }
    conf = OmegaConf.create(ctc_only_cfg)

    app_state = app_state_mod.AppState()
    app_state.nemo_file_folder = extract_dir
    cwd = os.getcwd()
    os.chdir(extract_dir)
    try:
        model = nemo_asr.models.EncDecCTCModelBPE(cfg=conf)
    finally:
        os.chdir(cwd)

    sd = torch.load(os.path.join(extract_dir, "model_weights.ckpt"), map_location="cpu", weights_only=True)
    new_sd = {}
    for k, v in sd.items():
        if k.startswith("encoder.") or k.startswith("preprocessor."):
            new_sd[k] = v
        elif k.startswith("ctc_decoder."):
            new_sd["decoder." + k[len("ctc_decoder."):]] = v
        # decoder.* (RNNT prednet) and joint.* intentionally dropped: unused
        # by the documented CTC decode path and architecturally incompatible
        # with this NeMo's RNNTDecoder/RNNTJoint (see module docstring).

    missing, unexpected = model.load_state_dict(new_sd, strict=True)
    assert not missing and not unexpected, (missing, unexpected)

    model.eval()
    return model


def read_wav_16k_mono(path: str) -> np.ndarray:
    import soundfile as sf

    audio, sr = sf.read(path, dtype="float32", always_2d=False)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    if sr != TARGET_SR:
        raise SystemExit(
            f"[blocked] {path} is {sr} Hz; the model needs {TARGET_SR} Hz mono. "
            "Run transcode_to_wav.py first."
        )
    return audio


def ctc_logprobs_full_vocab(model, audio: np.ndarray) -> np.ndarray:
    """Full-vocab (5633-way, incl. blank) per-frame log-probs, shape [T, V]."""
    sig = torch.tensor(audio).unsqueeze(0)
    sig_len = torch.tensor([audio.shape[0]])
    with torch.no_grad():
        log_probs, _encoded_len, _greedy = model.forward(input_signal=sig, input_signal_length=sig_len)
    return log_probs[0].cpu().numpy()


def greedy_decode_sanskrit_slice(model, logprobs_full: np.ndarray, blank_penalty: float = 0.0) -> str:
    """
    Slice to [blank] + Sanskrit-256, re-log_softmax, greedy argmax, CTC
    collapse, map through the 'sa' sub-tokenizer. blank_penalty subtracts
    from the blank column's log-prob before argmax (cheap decode-variant
    knob used for decode-consensus; no re-encode needed).
    """
    cols = [BLANK_ID] + list(range(SANSKRIT_OFFSET, SANSKRIT_OFFSET + SANSKRIT_WIDTH))
    sliced = logprobs_full[:, cols].copy()
    if blank_penalty:
        sliced[:, 0] -= blank_penalty
    mx = sliced.max(axis=1, keepdims=True)
    sliced = sliced - (mx + np.log(np.exp(sliced - mx).sum(axis=1, keepdims=True)))
    ids = sliced.argmax(axis=1)

    sub = model.tokenizer.tokenizers_dict[SUBTOKENIZER_KEY]
    pieces: list[str] = []
    prev = -1
    for raw in ids:
        i = int(raw)
        if i != prev and i != 0:
            pieces.append(sub.ids_to_tokens([i - 1])[0])
        prev = i
    return "".join(pieces).replace("▁", " ").strip()


def transcribe(model, wav_path: str, blank_penalty: float = 0.0) -> str:
    audio = read_wav_16k_mono(wav_path)
    lp = ctc_logprobs_full_vocab(model, audio)
    return greedy_decode_sanskrit_slice(model, lp, blank_penalty=blank_penalty)


def transcribe_variants(model, wav_path: str, blank_penalties=(0.0, 2.0, 4.0, 6.0)) -> list[str]:
    """One encoder forward pass, N cheap re-argmax decode variants."""
    audio = read_wav_16k_mono(wav_path)
    lp = ctc_logprobs_full_vocab(model, audio)
    return [greedy_decode_sanskrit_slice(model, lp, blank_penalty=p) for p in blank_penalties]

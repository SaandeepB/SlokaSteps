"""
Su-srota Sanskrit ASR -- Sanskrit-slice CTC greedy decode.

STATUS (2026-09-15): the ML stack is now installed. This file's naive
`restore_from()` path was ACTUALLY TRIED and FAILS on the real checkpoint
with the currently installed NeMo 3.0.0 -- three separate API
incompatibilities (tokenizer.type=="multilingual" not recognised;
decoder.multisoftmax and joint.multilingual are not valid kwargs on this
NeMo's RNNTDecoder/RNNTJoint). See ../09-parameter-count-and-restore-from.md
for the full diagnosis and exact error text. The checkpoint appears to have
been trained with a customised/forked NeMo, not any vanilla upstream
release, so no version pin fixes the RNNT half.

The working replacement is load_susrota_ctc.py, which reconstructs just the
encoder + CTC head (all the documented decode path below actually uses) and
loads it with the real trained weights -- verified with zero missing/
unexpected keys. This file is kept as-is for the historical record of the
naive attempt and because its documented CONSTANTS (offsets, blank id,
tokenizer key) were independently re-verified empirically against the real
checkpoint in 09-*.md. Prefer load_susrota_ctc.py for anything new.

This file is the analyst's own implementation of the *method* documented on the
Su-srota model card. It does not copy the card's or the GitHub repo's code. The
numeric parameters below (vocab slice offset, width, blank index; the "sa"
sub-tokenizer key) are facts quoted from the model card
(https://huggingface.co/prathoshap/sushrota-sanskrit-asr) and the experiment
log README, both read on 2026-08-30.

Method, in the analyst's words:
  1. Load the aggregate multilingual IndicConformer checkpoint
     (EncDecHybridRNNTCTCBPEModel) from the .nemo file; eval mode.
  2. Run the encoder on a 16 kHz mono waveform; take the CTC head's per-frame
     log-probabilities over the FULL aggregate vocabulary.
  3. Keep only the columns for the Sanskrit slice: the blank id plus the 256
     token ids starting at the Sanskrit offset. Re-run log_softmax over just
     those 257 columns so they form a proper distribution again.
  4. Greedy argmax per frame; collapse CTC repeats; drop blank.
  5. Map the surviving ids (shifted back by the +1 the blank-first layout adds)
     through the model's Sanskrit SentencePiece sub-tokenizer; join; turn the
     SentencePiece word-boundary marker back into a space.

Config values (from the model card, subject to change upstream):
  SANSKRIT_OFFSET = 4096      # first Sanskrit token id in the aggregate vocab
  SANSKRIT_WIDTH  = 256       # number of Sanskrit tokens
  BLANK_ID        = 5632      # CTC blank id (== 22 languages * 256)
  SUBTOKENIZER_KEY = "sa"
The experiment log states the same slice as `cols = [BLANK] + range(4096,4352)`.
"""

from __future__ import annotations

import argparse
import sys

SANSKRIT_OFFSET = 4096
SANSKRIT_WIDTH = 256
BLANK_ID = 5632
SUBTOKENIZER_KEY = "sa"
TARGET_SR = 16_000


def _lazy_imports():
    try:
        import numpy as np  # noqa: F401
        import torch  # noqa: F401
        import soundfile as sf  # noqa: F401
        import nemo.collections.asr as nemo_asr  # noqa: F401
    except Exception as exc:  # pragma: no cover - the whole point is it's not installed
        sys.stderr.write(
            "\n[blocked] ML dependencies are not installed.\n"
            f"  import error: {exc!r}\n"
            "  Install (see SETUP.md, needs approval -- multi-GB):\n"
            "    py -3.11 -m pip install -r requirements.txt\n\n"
        )
        raise SystemExit(2)
    return np, torch, sf, nemo_asr


def load_model(nemo_path: str):
    np, torch, sf, nemo_asr = _lazy_imports()
    model = nemo_asr.models.EncDecHybridRNNTCTCBPEModel.restore_from(
        restore_path=nemo_path, map_location="cpu"
    )
    model.eval()
    return model


def read_wav_16k_mono(path: str):
    np, torch, sf, nemo_asr = _lazy_imports()
    audio, sr = sf.read(path, dtype="float32", always_2d=False)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    if sr != TARGET_SR:
        raise SystemExit(
            f"[blocked] {path} is {sr} Hz; the model needs {TARGET_SR} Hz mono. "
            "Run transcode_to_wav.py first (needs ffmpeg -- also not on PATH)."
        )
    return audio


def ctc_logprobs_full_vocab(model, audio):
    """Per-frame log-probs over the full aggregate vocab: shape [T, V_full]."""
    np, torch, sf, nemo_asr = _lazy_imports()
    sig = torch.tensor(audio).unsqueeze(0)
    sig_len = torch.tensor([audio.shape[0]])
    with torch.no_grad():
        enc_out, _enc_len = model.forward(
            input_signal=sig, input_signal_length=sig_len
        )
        # The hybrid model exposes its CTC head separately from the RNNT decoder.
        logprobs = model.ctc_decoder(encoder_output=enc_out)
    return logprobs[0].cpu().numpy()  # [T, V_full]


def greedy_decode_sanskrit_slice(model, logprobs_full) -> str:
    np, torch, sf, nemo_asr = _lazy_imports()
    cols = [BLANK_ID] + list(range(SANSKRIT_OFFSET, SANSKRIT_OFFSET + SANSKRIT_WIDTH))
    sliced = logprobs_full[:, cols]
    # Re-normalise the 257-way slice into a proper log distribution.
    mx = sliced.max(axis=1, keepdims=True)
    sliced = sliced - (mx + np.log(np.exp(sliced - mx).sum(axis=1, keepdims=True)))
    ids = sliced.argmax(axis=1)

    sub = model.tokenizer.tokenizers_dict[SUBTOKENIZER_KEY]
    pieces: list[str] = []
    prev = -1
    for raw in ids:
        i = int(raw)
        if i != prev and i != 0:  # 0 == blank within the slice layout
            pieces.append(sub.ids_to_tokens([i - 1])[0])
        prev = i
    return "".join(pieces).replace("▁", " ").strip()


def transcribe(nemo_path: str, wav_path: str) -> str:
    model = load_model(nemo_path)
    audio = read_wav_16k_mono(wav_path)
    lp = ctc_logprobs_full_vocab(model, audio)
    return greedy_decode_sanskrit_slice(model, lp)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--nemo", required=True, help="path to sushrota_sanskrit_asr_v13b.nemo")
    ap.add_argument("--wav", required=True, help="16 kHz mono WAV")
    ap.add_argument("--decodes", type=int, default=1,
                    help="blank-penalty decode variants for consensus (see verify_against_text.py)")
    args = ap.parse_args()
    print(transcribe(args.nemo, args.wav))


if __name__ == "__main__":
    main()

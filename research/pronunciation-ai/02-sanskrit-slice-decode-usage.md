# 02 — Does the documented Sanskrit-slice decode path actually run?

_Dated 2026-08-30. Research-analyst._

---

## Verdict box

| | |
|---|---|
| **What I set out to test** | Whether the decode path documented on the Su-śrotā model card is real and runnable — reproduce the invocation, enumerate every dependency and its size, state exactly what blocks execution. |
| **What I actually did** | Read the decode recipe from two sources (HF model card + GitHub experiment log §3) and confirmed they agree. Reimplemented the method from scratch in `scripts/asr_susrota_decode.py` (no code copied). Verified the script parses and its CLI works; the ML path is unreached. Did **not** install NeMo or run a decode. |
| **What I concluded** | The decode path is **documented consistently and looks sound**, but is **blocked on execution** by: (1) NeMo/torch not installed (~2.5–4 GB); (2) no audio in the repo; (3) no ffmpeg for transcode; (4) an **unstated NeMo version** for the checkpoint — `.nemo` restore is version-sensitive and this is a genuine unknown, not just an install. Script is ready. |

---

## The decode path, reproduced on paper

Two independent statements of the same method, both read 2026-08-30:

**HF model card** (`prathoshap/sushrota-sanskrit-asr`, "Usage" section) — loads `EncDecHybridRNNTCTCBPEModel.restore_from("sushrota_sanskrit_asr_v13b.nemo")`, forwards a 16 kHz mono float32 signal, takes the **CTC head** log-probs, keeps columns `[BLANK] + range(4096, 4096+256)` with `BLANK = 5632`, re-normalises that 257-way slice with log-softmax, greedy-argmaxes per frame, CTC-collapses (drop repeats + blank), maps ids through `M.tokenizer.tokenizers_dict["sa"]` (the Sanskrit SentencePiece sub-tokenizer), joins, turns `▁` back into a space.

**GitHub experiment log** (§3, "The model (v5)") — quoted: _"We use the **CTC head** on the Sanskrit token slice (`cols = [BLANK] + range(4096,4352)`, re-`log_softmax`), greedy decode."_ `range(4096,4352)` = 4096..4351 = 256 tokens. Identical to the card.

### What the numbers mean (inferred by me, consistent with both sources)
The base is an **aggregate multilingual IndicConformer** with one combined vocabulary: 22 language slices × 256 SentencePiece tokens = 5632, and the CTC blank at index 5632. Sanskrit is slice 16 (offset 4096). The decode throws away all non-Sanskrit columns so the model can only emit Sanskrit tokens. This is a standard "language-masked CTC decode" — nothing exotic.

### My reimplementation
`scripts/asr_susrota_decode.py` — the analyst's own code. It performs: load `.nemo` → `model.forward(input_signal=…, input_signal_length=…)` → `model.ctc_decoder(encoder_output=…)` → slice + re-log-softmax → greedy collapse → `tokenizer.tokenizers_dict["sa"].ids_to_tokens`. The constants (`4096 / 256 / 5632 / "sa"`) are quoted from the card as facts; the surrounding code is written fresh. **No snippet is copied** from the card or the (licence-less) GitHub repo.

---

## Every dependency and its size

| Component | Size (approx.) | Notes |
|---|---|---|
| `torch` (CPU wheel) | ~0.8–1.5 GB installed | or ~2.5 GB with CUDA 12.x |
| `nemo_toolkit[asr]` | ~1–2 GB with transitive deps | pulls `pytorch-lightning`, `torchmetrics`, `transformers`, `sentencepiece`, `librosa`, `numba`, `editdistance`, `hydra-core`, `omegaconf`, `huggingface-hub`, `sacremoses`, `webdataset`, … |
| `soundfile`, `numpy` | small | `soundfile` reads WAV/FLAC/OGG — **not** WebM/Opus |
| **Su-śrotā `.nemo`** | not stated on card; ~0.5–2.4 GB | IndicConformer is ~129 M params per the card ("~129 M") but the plausible base repo is named "600m" — see the discrepancy note below. Two checkpoints exist (`v13b`, `v5`). |
| generic IndicConformer | ~0.5–2.4 GB | only if running the item-1 comparison |
| `ffmpeg` | ~80 MB | not a pip dep; not on PATH here |

Total to first decode: **roughly 3–6 GB** on disk, dominated by torch + NeMo + one checkpoint.

---

## What blocks execution — in priority order

1. **NeMo + torch not installed.** Multi-GB; not run per role scope. `scripts/requirements.txt` + `scripts/SETUP.md` have the exact commands, pending approval.

2. **No audio.** The decode needs a 16 kHz mono WAV. The repo has none (`public/audio/manifest.json` empty). A synthetic tone would technically "run" and produce garbage; a meaningful test needs real recitation audio — for the product's purpose, child recitation with parental consent (see `01`, `05`).

3. **No ffmpeg.** Browser recordings are WebM/Opus (or MP4/AAC on Safari). `soundfile` can't read those. `scripts/transcode_to_wav.py` wraps ffmpeg but ffmpeg isn't on PATH. `winget install Gyan.FFmpeg` fixes it.

4. **Unstated NeMo version — a real unknown, not just an install.** The model card gives **no version pin**. `.nemo` archives embed a config that a newer/older NeMo may refuse to `restore_from` (class signature drift in `EncDecHybridRNNTCTCBPEModel`, tokenizer-dict layout changes). The card was last modified 2026-08-28; the safe move is the NeMo release closest to that date, or asking the author. **Plan for `restore_from` to need iteration.**

5. **`tokenizers_dict["sa"]` is assumed, not verified.** The decode relies on the aggregate model exposing a per-language tokenizer dict with a `"sa"` key. This is consistent with the multilingual IndicConformer design but I could not verify it without loading the checkpoint. If the key differs (`"san"`, an index, …) the final id→token step needs a one-line change.

6. **Hybrid model, two heads.** `EncDecHybridRNNTCTCBPEModel` has both an RNNT decoder and a CTC head. The decode must explicitly use the **CTC** head (`model.ctc_decoder`), not the default `.transcribe()` which may route through RNNT. The script does this; noting it because it's an easy trap.

---

## Discrepancy worth recording

The Su-śrotā card says the base is _"AI4Bharat IndicConformer (`EncDecHybridRNNTCTCBPEModel`, ~129 M params)"_. The vocab math (22 × 256 + blank = 5633; `tokenizers_dict["sa"]`) matches the **aggregate multilingual** IndicConformer. The current AI4Bharat multilingual repo is `ai4bharat/indic-conformer-600m-multilingual` — **600 M**, not 129 M. Possible explanations (I did not resolve this):
- Su-śrotā finetuned an **earlier/smaller** multilingual IndicConformer (~130 M, the 2023-era checkpoint) that predates the 600 M release;
- "~129 M" refers to the encoder only, or is an approximation carried over loosely.

It matters for `06` (licence — which exact base repo, hence which exact licence terms and gating) and for `08` (in-browser feasibility — a 130 M model is far more browser-viable than a 600 M one). **Recommend: ask the author which base checkpoint and NeMo version.**

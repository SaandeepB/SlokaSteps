# 09 — Real parameter count, and does `restore_from` actually work with NeMo 3.0.0?

_Dated 2026-09-15. Research-analyst. ML stack now installed and verified
(Python 3.11.9, torch 2.13.0+cpu, nemo 3.0.0, transformers 5.16.1, librosa
0.11.0, soundfile 0.14.0, huggingface_hub 1.29.0). This report supersedes
the "blocked, unstated NeMo version" framing in `02-*.md` on both points it
raised._

---

## Verdict box

| | |
|---|---|
| **What I set out to test** | (P1) The real parameter count of the actual Su-śrotā checkpoint — 129M per the card vs. a possible 600M base. (P2) Whether `restore_from()` actually executes against the real `.nemo` file with the now-installed NeMo 3.0.0, and if not, exactly why. |
| **What I actually did** | Downloaded `sushrota_sanskrit_asr_v13b.nemo` (523,192,320 bytes) from `huggingface.co/prathoshap/sushrota-sanskrit-asr` (the only place it's hosted). Extracted and read its embedded `model_config.yaml` and `model_weights.ckpt` directly. Ran `EncDecHybridRNNTCTCBPEModel.restore_from()` unmodified — it fails. Iteratively diagnosed each failure by reading NeMo 3.0.0's own installed source and patching one config key at a time, re-running against the real checkpoint each time (not simulated). Concluded the RNNT half needs a fork-specific NeMo this environment doesn't have, but the **documented decode path never uses the RNNT half** — so I reconstructed a CTC-only model from the checkpoint's own weights instead, and it loads with **zero missing and zero unexpected keys** (`load_state_dict(strict=True)` succeeds). Ran a full forward pass and greedy decode against a synthetic input to confirm the plumbing works end to end. |
| **What I concluded** | **P1 settled: 129,289,352 params (~129.29 M) total, confirmed by two independent measurements** (checkpoint weight-file byte size, and summing every tensor in the state dict). This matches the card's "~129 M" almost exactly and **rules out the 600 M base hypothesis** from `02-*.md`. **P2 settled: the unmodified `.nemo` does NOT load with vanilla NeMo 3.0.0** — three separate, confirmed API incompatibilities, all in the RNNT half, none in the CTC half. **The documented decode path (encoder + CTC head, which is all the model card's "Usage" section and the shipped verify-against-text approach actually use) DOES execute**, via a from-scratch CTC-only reconstruction detailed below. This unblocks `04`/`05`'s real-audio tests (see `10-*.md`). |

---

## P1 — the real parameter count

### Signal 1: the checkpoint file's own byte size, before loading anything

`huggingface_hub.HfApi().model_info(..., files_metadata=True)` lists both hosted checkpoints at **523,192,320 bytes** each (`sushrota_sanskrit_asr_v13b.nemo` and `sushrota_sanskrit_asr_v5.nemo`). Extracting the tar-format `.nemo`, the weights file `model_weights.ckpt` alone is **517,438,810 bytes**. If those weights are fp32 (4 bytes/element), that implies **517,438,810 / 4 = 129,359,702.5 ≈ 129.4 M** elements — before restoring anything, purely from the file's size on disk. This is much closer to 129 M than to any 600 M-scale checkpoint (which would need to be several times larger on disk even with fp16 or moderate compression).

### Signal 2: the embedded config's architecture numbers

`model_config.yaml` (extracted from the tar, 202,648 bytes) gives the encoder hyperparameters directly:

```
encoder:
  _target_: ...ConformerEncoder
  d_model: 512
  n_layers: 17
  n_heads: 8
  feat_in: 80
  subsampling: striding
  subsampling_factor: 4
tokenizer:
  type: multilingual
  langs: {22 entries: as, bn, brx, doi, gu, hi, kn, kok, ks, mai, ml, mni,
          mr, ne, or, pa, sa, sat, sd, ta, te, ur}
```

512-dim / 17-layer / 8-head is a mid-size ("Conformer-M" class) encoder. 22 languages confirms the vocab arithmetic from `02-*.md` (22 × 256 sub-tokens + 1 blank = 5,633) independent of anything on the model card — I did not take this on the card's word; I read it out of the checkpoint's own tokenizer config. I did not independently verify the exact architecture of `ai4bharat/indic-conformer-600m-multilingual` this session, so I make no numeric claim about it here — only that this checkpoint's own config is self-consistent at ~129 M and not compatible with a 600 M-parameter encoder at this `d_model`/`n_layers`.

### Signal 3: exact parameter count from the real loaded weights (the authoritative number)

Loading `model_weights.ckpt` directly with `torch.load(..., weights_only=True)` and summing every tensor's `.numel()`, grouped by top-level key:

| module | tensors | elements | |
|---|---:|---:|---|
| `encoder.*` | 686 | 115,128,849 | 115.13 M |
| `decoder.*` (RNNT prednet) | 5 | 6,887,040 | 6.89 M |
| `joint.*` (RNNT joint network) | 48 | 4,362,774 | 4.36 M |
| `ctc_decoder.*` (the CTC head) | 2 | 2,889,729 | 2.89 M |
| `preprocessor.*` | 2 | 20,960 | 0.02 M |
| **TOTAL** | 743 | **129,289,352** | **129.29 M** |

This is the whole trained checkpoint, everything in `model_weights.ckpt`, measured directly — not a claim from anywhere. **It matches the card's "~129 M params" almost exactly.**

**A materially useful sub-finding:** the RNNT decoder + joint (`decoder.*` + `joint.*`) together are only **11,249,814 params (~11.25 M)** — about 8.7% of the checkpoint — and, per the model card's own documented "Usage" recipe, are **never touched** by the shipped decode path. The part that actually runs at inference for this product's purposes is **encoder + CTC head + preprocessor ≈ 118.0 M params**, smaller again than the full checkpoint.

### Verdict on the 129M vs 600M discrepancy (`02-*.md`'s open question)

**Resolved: 129 M, not 600 M.** Three independent measurements (file size on disk, config hyperparameters, and a full tensor-by-tensor count of the actually-loaded weights) all land at ~129 M. This settles the gating question for `08-*.md`'s decision D2(c): **the model that would need to run on-device is at most ~118 M parameters for the part that matters**, not 600 M. This materially improves the plausibility of an on-device/ONNX path, though I have **not** tested an ONNX export, quantization, or a WASM runtime this session — see "what remains untested" below.

---

## P2 — does `restore_from()` actually execute?

### Attempt 1 — unmodified checkpoint, unmodified NeMo 3.0.0

```python
model = nemo_asr.models.EncDecHybridRNNTCTCBPEModel.restore_from(
    restore_path="sushrota_sanskrit_asr_v13b.nemo", map_location="cpu"
)
```

**Fails immediately:**

```
KeyError: 'dir'
  File ".../nemo/collections/asr/parts/mixins/mixins.py", line 89, in _setup_monolingual_tokenizer
    self.tokenizer_dir = self.tokenizer_cfg.pop('dir')
```

**Diagnosis (read from NeMo 3.0.0's own installed source, `ASRBPEMixin._setup_tokenizer`):**

```python
def _setup_tokenizer(self, tokenizer_cfg):
    tokenizer_type = tokenizer_cfg.get('type')
    if tokenizer_type is None:
        raise ValueError(...)
    elif tokenizer_type.lower() == 'agg':
        self._setup_aggregate_tokenizer(tokenizer_cfg)
    else:
        self._setup_monolingual_tokenizer(tokenizer_cfg)   # <- falls here
```

The checkpoint's config says `tokenizer.type: multilingual`. Current NeMo only recognises the literal string `'agg'` as "this is a multi-language aggregate tokenizer"; anything else falls into the monolingual path, which immediately fails looking for a `dir` key that a `langs:`-keyed multilingual config doesn't have.

**Fix, tested and confirmed:** `ASRBPEMixin._setup_aggregate_tokenizer`'s expected input structure — a `tokenizer.langs: {<code>: {dir, model_path, vocab_path, spe_tokenizer_vocab}}` map, assembled into `tokenizers.AggregateTokenizer(tokenizers_dict)` keyed by language code — is **structurally identical** to what the checkpoint's config already has under `type: multilingual`. Relabelling `tokenizer.type` from `"multilingual"` to `"agg"` (nothing else changed) and re-running:

```
[NeMo I ...] _setup_tokenizer: detected an aggregate tokenizer
[NeMo I ...] Tokenizer SentencePieceTokenizer initialized with 256 tokens   (×22)
[NeMo I ...] Aggregate vocab size: 5632
```

Loads cleanly. This one-line relabel is a genuine, working fix for the tokenizer half.

### Attempt 2 — with the tokenizer fixed, same checkpoint

Instantiation proceeds further, then fails on the RNNT decoder:

```
TypeError: RNNTDecoder.__init__() got an unexpected keyword argument 'multisoftmax'
```

The checkpoint's `decoder` config carries `multisoftmax: true`. The installed NeMo 3.0.0's `RNNTDecoder.__init__` signature (read directly from the installed module) is:

```
(self, prednet, vocab_size, normalization_mode=None, random_state_sampling=False, blank_as_pad=True)
```

No `multisoftmax` parameter exists anywhere in this class in this install.

### Attempt 3 — with `multisoftmax` also stripped from the decoder config

Instantiation proceeds further still, then fails on the RNNT joint network:

```
TypeError: RNNTJoint.__init__() got an unexpected keyword argument 'multilingual'
```

Same story: `joint.multilingual: true` in the checkpoint's config, no `multilingual` kwarg on this NeMo's `RNNTJoint.__init__`.

### What this means

This is **not** the "pick the right pip-installable NeMo version" problem `02-*.md` guessed at. `multisoftmax` and `joint.multilingual` are not parameters that exist in any upstream NeMo release this analyst could find in the installed package's own source or changelog references — they read as features of a **customised/forked NeMo used for training** (consistent with AI4Bharat's IndicConformer family being trained in-house with multilingual-aware RNNT extensions that were apparently never merged upstream), not a version drift within stock NeMo. **I did not chase this further** — not because I hit a wall, but because it's the wrong thing to chase: **the documented Su-śrotā decode path (HF model card "Usage" section, and the shipped verify-against-text method in `04`/`05`) never uses the RNNT decoder or joint at all.** It uses only the encoder and the CTC head. So instead of hunting for a NeMo build that can construct the RNNT half, I bypassed it entirely.

### The working fix: reconstruct the CTC-only model directly

Implemented in `scripts/load_susrota_ctc.py` (new, this session). Method, in full:

1. Extract the `.nemo` tar to a folder (needed so `nemo:<hash>_file` tokenizer artifact references resolve — normally `restore_from()` does this internally; replicated manually via `nemo.utils.app_state.AppState().nemo_file_folder`).
2. Build a config for the **plain** `EncDecCTCModelBPE` class (not the hybrid class) using only the checkpoint's `preprocessor`, `encoder`, `tokenizer` (relabelled `agg`), and `aux_ctc.decoder` (the checkpoint's own CTC head config — a plain `ConvASRDecoder`, `feat_in=512 → num_classes=5632`, also with a stray `multisoftmax: true` key that gets stripped the same way) sections. The `decoder`/`joint` (RNNT) sections are **dropped entirely** — not needed, not compatible.
3. Load a state dict built from the checkpoint's own `model_weights.ckpt`, taking `encoder.*` and `preprocessor.*` verbatim and remapping `ctc_decoder.*` → `decoder.*` (the attribute name `EncDecCTCModelBPE` uses for its CTC head). The original `decoder.*` (RNNT prednet, 6.89 M) and `joint.*` (4.36 M) keys are dropped.

**Result, verified 2026-09-15:**

```
model.load_state_dict(new_sd, strict=True)  ->  missing=[], unexpected=[]
```

Every single parameter this reconstructed model has is filled from the checkpoint's own trained weights — nothing is randomly initialised, nothing is silently dropped. Total: **118,001,153 params (~118.0 M)** via `sum(p.numel() for p in model.parameters())`. (This is ~38K lower than the raw `encoder+ctc_decoder+preprocessor` state-dict tensor sum of 118,039,538 — the expected effect of `state_dict()` including a handful of non-trainable buffers, e.g. normalisation statistics, that `.parameters()` correctly excludes; not a sign of anything missing, since the strict load already proved key-for-key equality.)

### End-to-end mechanics test (not an accuracy test)

Round-tripped the saved state dict (`load_state_dict(strict=True)` again, succeeds), then ran a real forward pass on 3 seconds of synthetic silence:

```
log_probs shape [B,T,V] = (1, 76, 5633)
```

5,633 = 5,632 real sub-tokens + 1 blank — matches the checkpoint's own vocab size exactly. Then independently **re-derived** (not assumed) the model card's decode constants directly from the loaded model, rather than trusting the card's numbers a second time:

```
sorted language codes: [as, bn, brx, doi, gu, hi, kn, kok, ks, mai, ml,
                         mni, mr, ne, or, pa, sa, sat, sd, ta, te, ur]
'sa' is at sorted index 16  ->  offset 16*256 = 4096   (card says SANSKRIT_OFFSET=4096: match)
model.tokenizer.tokenizers_dict['sa'].vocab_size = 256  (card says SANSKRIT_WIDTH=256: match)
BLANK_ID = 5632 (last of 5633 output columns, add_blank=True convention: match)
```

Ran the full documented pipeline — slice to the 257 Sanskrit+blank columns, re-`log_softmax`, greedy argmax, CTC collapse, map through `tokenizers_dict["sa"]`, detokenise — on the silence input. It produced a decoded string (garbage, as expected for pure silence — this is a plumbing test, not an accuracy test; see `10-*.md` for real-audio decode quality). **The documented decode path executes end to end with the currently installed NeMo 3.0.0, via this workaround.**

---

## What remains untested (say so plainly)

- **The full hybrid RNNT+CTC model** was not made to load. It very likely could be, with further config surgery around the RNNT joint (stripping `multilingual` too, and possibly others not yet hit), or by finding whatever internal NeMo fork AI4Bharat trained this on. Not pursued because the product doesn't need it.
- **ONNX export / quantisation / a WASM runtime** — not attempted this session. The 118 M-param CTC-only figure materially changes the plausibility argument for `08-*.md`'s decision D2(c) but does **not** by itself prove browser viability; that needs an actual export-and-run test, which is a distinct piece of work.
- **CPU inference latency** was measured (not simulated) as a bonus data point for D2, see `10-*.md` — native CPU PyTorch, not WASM.
- Whether the same fix applies to the `v5` checkpoint (not downloaded/tested — `v13b` is the deployed one per `01-*.md`'s table and is what this report and `10-*.md` use throughout).

## Reusable artifacts

- `scripts/load_susrota_ctc.py` — the working loader, fully documented inline (new).
- `scripts/_p3_b2_probe.py` — the exact probe script that produced the numbers in this report (new).
- `scripts/asr_susrota_decode.py` — the original naive `restore_from()` attempt, kept for the historical record, header updated to point at the working replacement.
- `scripts/models/` — downloaded checkpoint + extracted artifacts (~2.5 GB, git-ignored; re-derivable via `huggingface_hub.hf_hub_download` per `SETUP.md`).

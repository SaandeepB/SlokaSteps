# 11 — On-device (in-browser) inference feasibility: ONNX export, size, speed, accuracy after quantization

_Dated 2026-09-15. Research-analyst. Directly answers the single fact
blocking decision D2. Builds on `09-*.md` (the working CTC-only PyTorch
reconstruction, 118,001,153 params) and the 16 real clips + harness from
`10-*.md`. New narrow install this pass, with authorization: `onnx` (already
present, 1.22.0), `onnxruntime` (installed, 1.30.0, ~14 MB wheel). No other
packages installed. `onnxruntime.transformers.float16` (ships inside the
already-installed `onnxruntime` package) was used for fp16 conversion — no
additional install needed for that. `brotli.exe` (already present on this
machine at `S:\Git\mingw64\bin\brotli.exe`, part of an existing Git-for-Windows
install) was used for compression measurements — not a new install._

---

## Verdict box

| | |
|---|---|
| **What I set out to test** | Whether on-device (in-browser) inference of the Su-śrotā CTC-only model is actually feasible: does it export to ONNX, how big is the shippable artifact, how fast does it run, and does quantization (needed to shrink it) wreck accuracy. |
| **What I actually did** | Exported the reconstructed 118M-param CTC-only model (`09-*.md`) to ONNX via NeMo's own `.export()` method — succeeded. Attempted to also export the raw-audio-to-mel-spectrogram preprocessor — failed, with a specific, diagnosed error. Measured on-disk and compressed (gzip, brotli) size for fp32, fp16, and dynamically-quantized int8 variants. Ran all three through `onnxruntime` CPU inference on the same 16 real clips used in `10-*.md`, measuring wall time and re-decoding to compare accuracy against the `10-*.md` baseline. Searched for, and am citing by name and link, published data on WASM-vs-native ONNX Runtime slowdown — I did not and cannot measure browser performance from this environment, and say so explicitly everywhere that matters. |
| **What I concluded** | **Viable-with-caveats — not a clean yes, not a no.** The compute itself is not the obstacle: the model exports cleanly to a small-op, standard ONNX graph, and native CPU inference runs at roughly 13× real-time. But three concrete, unresolved gaps stand between here and "ships to a phone": (1) **the audio-to-features step does not export to ONNX** and needs a separate solution; (2) **the only quantization path that meaningfully shrinks the model (int8) roughly doubled the error rate and made it slower, not faster, on this CPU** — fp16 is accuracy-safe but only halves the size and doesn't speed anything up; (3) **real browser (WASM) speed is genuinely unknown** — native CPU numbers here are an explicit lower bound, and documented slowdown ranges from other ONNX Runtime Web deployments span roughly 4×–40×, which is too wide a spread to call this decision from Python alone. Each gap has a specific, nameable next step (below). |

---

## Q1 — Does the 129M (118M CTC-only) model export to ONNX cleanly?

### The encoder + CTC head: yes, cleanly

```python
model.export("susrota_ctc_fp32.onnx")
```

on the `EncDecCTCModelBPE` reconstruction from `09-*.md` (via its inherited
`Exportable`/`ExportableEncDecModel` mixins — this is NeMo's own native
export path, not a third-party tool) **succeeds**, producing a single
492,987,726-byte ONNX file in 12.8 seconds. The only messages are benign,
standard PyTorch-ONNX-exporter warnings (dynamic-axis auto-naming;
constant-folding skipped for a couple of `Slice` ops at opset ≥10) — no
errors, no fallback, no missing-op warnings.

Inspecting the exported graph directly (`onnx` package, not trusted from a
log line):

```
opset: 17         IR version: 8         nodes: 3,647
inputs:  audio_signal  float32  [batch, 80, time]
         length         int64  [batch]
outputs: logprobs      float32  [batch, time, 5633]
top ops: Constant(1287) Unsqueeze(281) Add(263) MatMul(205) Reshape(200)
         Transpose(175) Concat(169) Shape(158) Gather(128) Mul(120)
         Cast(106) Slice(88) LayerNormalization(85) Sigmoid(68) Where(63)
```

Every op here is a standard ONNX op with broad runtime support (CPU and
WASM alike) — no custom/contrib ops. Opset 17 is well within what current
`onnxruntime`/`onnxruntime-web` support. **This is a genuinely portable
graph.**

**One important, concrete limitation:** the input is `audio_signal` shaped
`[batch, 80, time]` — **pre-computed 80-dim log-mel features, not raw
audio samples.** The Sanskrit-slice + greedy-decode + detokenize
post-processing (the last step of the documented decode recipe) is also
outside the graph — that part is cheap, pure array/string logic, trivially
portable to JS. The feature-extraction step is not.

### The preprocessor (raw audio → mel features): fails, specific and diagnosed

```python
model.preprocessor.export("susrota_preprocessor_fp32.onnx")
```

**Fails**, with a precise, quoted error:

```
SymbolicValueError: STFT does not currently support complex types
[Caused by the value '...Reshape...' (type 'Tensor') in the TorchScript graph]
  (raised inside nemo/collections/asr/parts/preprocessing/features.py:379, .stft())
```

This is a known limitation of the PyTorch→ONNX exporter's handling of
`torch.stft`'s complex-valued intermediate representation, not something
specific to this checkpoint or to NeMo's code. **Diagnosis, not guesswork:**
I read the exact failing call site (`features.py:379`, `.stft()` inside
`FilterbankFeatures.forward()`), and the error is PyTorch's ONNX exporter
itself refusing to trace the complex-tensor codepath `torch.stft` takes
internally.

**What this means concretely:** the exportable ONNX subset (encoder + CTC
head) is **not, by itself, sufficient for a raw-audio-in browser pipeline.**
Getting from a microphone recording to the 80-dim log-mel features this
graph expects needs one of:
- reimplementing STFT + mel-filterbank + log directly in JS/WASM outside
  the ONNX graph (the common pattern in existing browser-ASR projects —
  e.g. whisper.cpp/whisper-web-style deployments typically do exactly this,
  though I have not verified any specific project's approach this session,
  and note it only as a known general pattern, not a citation), bit-matched
  against NeMo's own filterbank parameters (`preprocessor` config: sample
  rate 16kHz, 80 mel bins, etc. — not fully enumerated here);
- or finding an export workaround for `torch.stft` (e.g. a real-valued
  reformulation, a different opset, or a newer PyTorch/exporter version) —
  not attempted this session.

Neither is fatal, but neither is done. **This is a real, unresolved piece
of engineering, not a detail.**

### Does AI4Bharat's own ONNX tooling apply here?

The coordinator asked specifically about this. Fetched `huggingface.co/
ai4bharat/indic-conformer-600m-multilingual` (2026-09-15) and its file
listing:

- The model card is tagged **`ONNX`** and its install instructions pin
  `onnxruntime==1.20.1`, `onnx==1.20.1`, `onnxruntime-gpu==1.20.1`.
- The repo's file list includes **`model_onnx.py`** (9.64 kB) and
  **`model_onnx_1b_batched_rnnt.py`** (15.3 kB), alongside `model_ts.py`
  (TorchScript), last updated roughly a year ago per the listing.
- Its own usage snippet loads the model via
  `AutoModel.from_pretrained("ai4bharat/indic-conformer-600m-multilingual",
  trust_remote_code=True)` — i.e. these `.py` files are **custom
  `trust_remote_code` wrapper code for that repo's own HF-Transformers-style
  model class**, not a generic NeMo→ONNX exporter.

**I could not read the actual contents of `model_onnx.py`** — the repo is
auto-gated (same blocker recorded in `01-*.md`/`06-*.md`/`SETUP.md`: it
requires accepting terms via a logged-in HF account in a browser before any
programmatic download works, which I did not do, consistent with not
expanding scope beyond the narrow install authorization for this pass).

**Reasoned conclusion (not verified by reading the code):** this tooling is
almost certainly written against that repo's own custom wrapper class
around the full 600M **hybrid CTC+RNNT** model, not a raw NeMo
`EncDecHybridRNNTCTCBPEModel`/`EncDecCTCModelBPE` object like the Su-śrotā
checkpoint. It would need non-trivial adaptation to point at a different
checkpoint with a different class hierarchy and a different (smaller)
architecture, and — even adapted — it would face the same RNNT-half
incompatibility documented in `09-*.md` if it tried to export the full
hybrid model rather than the CTC-only path I used. **Untested either way.**
My own export (above), done directly against the actual Su-śrotā checkpoint
using NeMo's native, model-agnostic `Exportable` mixin, is the more directly
relevant result for this question.

---

## Q2 — Real download size

Measured directly (`os.path.getsize`, then `gzip -9` via Python's stdlib
`gzip`, then `brotli` via the CLI binary already present on this machine —
no new install for either):

| Variant | Raw (disk) | gzip -9 | brotli -q9 |
|---|---:|---:|---:|
| **fp32** (as exported) | 492,987,726 B = **470.1 MiB** | 456,863,657 B = 435.7 MiB (−7.3%) | 450,129,701 B = 429.3 MiB (−8.7%) |
| **fp16** (`onnxruntime.transformers.float16`, `keep_io_types=True`) | 247,011,594 B = **235.6 MiB** | 225,826,568 B = 215.4 MiB (−8.6%) | 221,393,339 B = 211.1 MiB (−10.4%) |
| **int8** (`onnxruntime.quantization.quantize_dynamic`, `QInt8` weights) | 140,337,333 B = **133.8 MiB** | 98,699,304 B = 94.1 MiB (−29.7%) | 91,322,166 B = 87.1 MiB (−34.9%) |

All three brotli figures are at quality 9 (max practical quality for files
this size — quality 11 was tried on the int8 file first and took over 3.5
minutes for 134 MB alone; q9 was used consistently across all three for a
fair comparison). As expected: raw floating-point weights barely compress
(gzip/brotli gain 7–10%, since IEEE-754 float bit patterns from a trained
network are close to incompressible entropy); int8 weights compress
noticeably better (30–35% further reduction) because the value range is
narrower. int8 is 3.5× smaller than fp32 on disk; fp16 is exactly 2×
smaller, as expected for a straight bit-width halving.

### Is this a plausible thing to ship to a phone? Plainly: not as a normal page load.

None of these — **~211–215 MB compressed (236 MB uncompressed; fp16, accuracy-safe) or ~87–94 MB compressed (134 MB uncompressed; int8,
accuracy-degraded, see Q4)** — is a size a browser tab downloads
transparently the way it does a normal web page's assets (typically
single-digit to low-tens of MB). Shipping either would need an explicit
"download once, cache for later" pattern — a first-run install-style fetch,
ideally Wi-Fi-gated, using the browser's Cache API / IndexedDB (both can
hold artifacts this size, though exact storage-quota behaviour differs by
browser and was **not verified this session** — a concrete open item). This
is a real product-UX commitment, not a transparent technical detail, and
matters especially for a children's education app whose stated user base
spans multiple language/region communities (`05-*.md`) where bandwidth and
data-plan cost are not safe to assume away.

**Neither variant is "small."** fp16 is the accuracy-safe one and is still
~211–215 MB compressed; int8 nearly halves that again but costs real
accuracy (Q4) and, on this CPU, real speed (Q3) — a lose-lose as tested, not
a clean win to offset the size gain.

---

## Q3 — Inference speed (native CPU — an explicit lower bound, not a browser number)

Measured with `onnxruntime` 1.30.0, `CPUExecutionProvider` only
(`ort.get_available_providers()` → `['AzureExecutionProvider',
'CPUExecutionProvider']`), 4 intra-op threads, on an **Intel Core i7-10750H
@ 2.60GHz (6 cores / 12 threads, Comet Lake — no AVX-512/VNNI)** — this
exact CPU model is stated because it matters for reading the numbers below.
Mel-feature extraction (the part that doesn't export, see Q1) was computed
via the PyTorch preprocessor outside the timed ONNX Runtime call, so these
numbers cover the part that **does** export and **is** the dominant cost of
a forward pass (a 17-layer Conformer encoder), on all 16 real clips from
`10-*.md` (1.96s–24.15s):

| Variant | mean RTF (compute-s / audio-s) | reading |
|---|---:|---|
| fp32 | **0.073** | ~13.7× faster than real time |
| fp16 | **0.078** | ~12.9× faster than real time — no CPU speedup from fp16 (expected: this CPU has no native fp16 compute path; `onnxruntime` most likely upcasts to fp32 internally) |
| int8 (dynamic) | **0.365** | ~2.7× real time, i.e. **~5× *slower* than fp32** — a real, measured, unexpected result |

The int8 slowdown is real and reproducible across all 16 clips (every
single clip was slower under int8 than fp32 — see `onnx_pipeline_results.
json`). **I did not conclusively diagnose why** — plausibly (not confirmed
this session) this CPU's lack of AVX-512 VNNI means `onnxruntime`'s CPU
execution provider has no fast int8 GEMM kernel for this op mix and falls
back to a slower path, with the per-op quantize/dequantize overhead of
*dynamic* quantization (as opposed to statically pre-quantized activations)
adding further cost. This is a plausible explanation, stated as such, not a
verified one.

### CRITICAL: this is native Python/CPU, not a browser number

**I cannot measure `onnxruntime-web`/WASM performance from this Python
environment**, and did not attempt to fake it. The numbers above are a
**lower bound** on what a browser would see. To size the uncertainty
honestly, here is what is actually documented elsewhere (not measured by
me, quoted and linked):

- microsoft/onnxruntime GitHub issue [#11181](https://github.com/microsoft/onnxruntime/issues/11181): _"onnxruntime-web is 11-17x times slower than native inference"_ (MobileNet-class model).
- microsoft/onnxruntime GitHub issue [#16412](https://github.com/microsoft/onnxruntime/issues/16412): _"Web ~40x slower than native"_.
- microsoft/onnxruntime GitHub issue [#15483](https://github.com/microsoft/onnxruntime/issues/15483): a specific 1×1 Conv op measured _"almost 4x slower than native"_ under WASM.
- Mozilla engineering blog, [_"Speeding up Firefox Local AI Runtime"_](https://blog.mozilla.org/en/firefox/firefox-ai/speeding-up-firefox-local-ai-runtime/): replacing default `onnxruntime-web` with a native-backed approach yielded _"2 to 10× faster inference"_, attributing the gap to WASM SIMD not matching hardware-specific instructions (AVX-512 on Intel, NEON on Apple Silicon) for the matrix multiplications that dominate cost — directly relevant here since this Conformer is dominated by `MatMul`/`LayerNormalization` (205 + 85 of the graph's 3,647 nodes).
- The same search found that enabling WASM SIMD + threads (the current `onnxruntime-web` default since v1.19) can close much of this gap versus a *non-SIMD scalar* WASM baseline (one source cites up to ~26× over that specific baseline) — but "faster than unoptimized WASM" is not the same claim as "close to native," and none of these sources describe a Conformer-CTC ASR model specifically.

**I am not going to manufacture a single number from this.** Applying any
one of these ratios to my measured 0.073–0.078 native RTF is an
extrapolation from *other models' behaviour*, not evidence about this
model. For calibration only — **not a prediction** — the documented range
of roughly 4×–40× would put a naive browser estimate somewhere between
≈0.29 and ≈3.1 RTF: anywhere from comfortably-faster-than-real-time to
noticeably-slower-than-real-time. **That spread is exactly the open
question, and it can only be closed by an actual `onnxruntime-web`
benchmark of this exact exported graph in a real browser — not attempted
this session.**

**One piece of product context worth stating plainly, since it changes how
much this uncertainty should worry anyone deciding D2:** this product scores
a *finished* recitation clip (2–30s in this sample), not a live stream. Even
the pessimistic end of that illustrative range (~3× real time) means
waiting roughly 6–70 seconds for a result on a clip this length — tolerable
for a "let me check that" UX, not viable for anything expecting live
feedback while chanting. Which of those UX shapes the product actually
needs is a decision this report doesn't make.

---

## Q4 — Accuracy after quantization, against the `10-*.md` baseline (5.34% mean / 3.85% median CER)

Re-ran the full decode-and-score pipeline through each ONNX variant on the
same 16 clips, using the same `common_text.py` CER/WER/SN-WER code as
`10-*.md`.

| Variant | mean CER | median CER | mean WER | identical decode to fp32 (of 16) |
|---|---:|---:|---:|---:|
| fp32 ONNX | **5.34%** | **3.85%** | 37.80% | — (reference) |
| fp16 ONNX | **5.34%** | **3.85%** | 37.80% | **16 / 16** |
| int8 ONNX (dynamic) | **10.15%** | **6.38%** | 51.56% | 5 / 16 |

**Two findings worth separating:**

1. **The fp32 ONNX export is accuracy-lossless versus the original PyTorch
   model.** Its mean CER (0.053412659120045364) and median CER
   (0.038461538461538464) match `10-*.md`'s PyTorch-measured figures to
   full floating-point precision — every digit. This is a clean, strong
   confirmation that NeMo's ONNX export of this graph is faithful, not an
   approximation.
2. **fp16 is completely free on this sample: byte-for-byte identical
   decoded text on all 16 clips**, hence identical CER/WER down to the same
   digits. Halving the model's size cost nothing measurable here.
3. **int8 dynamic quantization is not free: mean CER nearly doubled
   (5.34%→10.15%), median CER rose by two-thirds (3.85%→6.38%), and only
   5 of 16 clips even produced the same decoded string as fp32.** Per the
   coordinator's framing — "quantization that wrecks accuracy is not a
   viable path" — this doesn't reach "wrecked" in the sense of becoming
   unusable garbage, but it is a real, substantial, measured regression,
   and combined with the Q3 finding that this same quantization made
   inference **slower**, not faster, on this CPU: **`onnxruntime`'s default
   dynamic int8 quantization, as tested here, is a lose-lose. It is not
   the path to a smaller, faster on-device model.**

**Not tested, and a concrete next step if this path is pursued further:**
*static* (calibration-based) int8 quantization, which typically performs
meaningfully better than dynamic quantization on CPU for both speed and
accuracy because activation ranges are pre-computed rather than measured
per-inference. This needs a representative calibration audio set and more
engineering than fit in this pass; `neural-compressor` was authorized for
this but not installed, since I could not tell in advance whether it would
actually resolve the problem versus costing setup time for an uncertain
gain — worth a dedicated follow-up rather than a rushed attempt here.

---

## Direct answer to the question the user is waiting on

**On-device (in-browser) inference is viable-with-caveats: plausible on the
evidence gathered, not yet proven, gated on a short, specific list — not an
open-ended one.**

What is now known, not guessed:
- The model that matters (118M-param encoder + CTC head) exports cleanly to
  a small, standard-ops ONNX graph — no custom ops, no fallback, no
  RNNT-half fork issues (`09-*.md`) because the RNNT half was never part of
  this export.
- Native CPU inference is fast (~13× real time) and, at fp16, **exactly as
  accurate as the original model** — a real, clean, low-risk win on the
  accuracy axis specifically.
- The two things that actually gate shipping this to a browser are **not**
  proven yet, and neither is a matter of opinion — both are concrete,
  boundable engineering questions:
  1. **Real browser (WASM) speed** — native is an explicit lower bound;
     documented ranges elsewhere span roughly 4×–40× slower, which spans
     "fine for this product's non-streaming use case" to "too slow." Needs
     an actual `onnxruntime-web` benchmark of this exact graph, in a real
     browser, on representative hardware (especially low/mid-range Android
     phones, not just this development laptop).
  2. **Download size.** fp16 (the only variant that's accuracy-free here)
     is ~211–215 MB compressed. int8 nearly halves that but costs real
     accuracy and, on this CPU, real speed — not a usable trade as tested.
     Neither is a "normal" web asset; shipping either requires deliberate
     one-time-download product UX, not a technical afterthought.
- A third, smaller gap: **raw audio → mel features doesn't export to ONNX**
  (`torch.stft`/complex-type limitation, precisely diagnosed above) and
  needs a separate JS/WASM implementation, bit-matched against NeMo's own
  feature extraction — solvable, standard pattern in the field, not started.

**What this means for the age-based routing idea the coordinator raised:**
this result does **not** yet make that routing scheme unnecessary. It also
doesn't rule it out. If the WASM benchmark comes back close to the native
numbers here, and the product accepts a ~200+ MB one-time download (or
finds a better quantization path than the one tested here), the case for
routing everyone through on-device gets strong and the whole COPPA/DPDP
backend question in `08-*.md` may become moot for the reasons the
coordinator named. If the WASM benchmark comes back near the pessimistic
end of the documented range, or the download-size UX is rejected, on-device
stays real for some contexts and not others — which is exactly what an
age-based (or device-based, or connection-based) routing scheme exists to
handle. **This report narrows the uncertainty considerably; it does not
eliminate the need for the routing decision to stay open until the WASM
benchmark exists.**

---

## What would still need proving (concrete, not open-ended)

1. An actual `onnxruntime-web` (WASM, SIMD+threads) micro-benchmark of
   `susrota_ctc_fp16.onnx` in a real browser, ideally on a representative
   low/mid-range Android device — the single highest-value next step.
2. A JS/WASM mel-spectrogram feature extractor matched against
   `AudioToMelSpectrogramPreprocessor`'s exact parameters, verified to
   produce the same features (or close enough not to change the decode)
   as the PyTorch preprocessor used to generate the numbers in this report.
3. Either a better quantization technique (static/calibrated int8, tested
   properly with a representative calibration set) or acceptance that fp16
   (~211–215 MB compressed) is the shippable size floor for an
   accuracy-safe model.
4. Actual browser storage-quota/eviction behaviour for a ~200+ MB cached
   asset across the browsers/devices this product actually targets — not
   checked this session.
5. Everything already flagged as open in `01-*.md`/`05-*.md`/`10-*.md`
   still applies on top of this: nothing here used child audio or the
   product's actual target devices.

## Reusable artifacts (all new this session)

- `scripts/run_onnx_pipeline.py` — the Q3+Q4 harness (ONNX Runtime timing +
  re-decode + CER/WER/SN-WER for fp32/fp16/int8) → `onnx_pipeline_results.json`.
- `scripts/models/susrota_ctc_fp32.onnx`, `..._fp16.onnx`, `..._int8.onnx`
  — the three exported/converted model files (git-ignored, ~870 MB
  combined; reproducible via NeMo's `.export()` +
  `onnxruntime.transformers.float16.convert_float_to_float16` +
  `onnxruntime.quantization.quantize_dynamic`, no external tooling, no
  code copied from anywhere).

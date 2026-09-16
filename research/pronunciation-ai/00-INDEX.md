# Pronunciation AI evaluation — index & settled/blocked split

_Research-analyst. SlokaSteps (`feature/v2-foundation`). Work dated 2026-08-30,_
_updated 2026-09-15 once the ML stack was installed and real audio acquired._

_Resources: Su-śrotā Sanskrit ASR + dataset, Vāgdhenu chant TTS, Vāgbodhinī experiment log._

> **Reading rule (updated 2026-09-15):** every CER, WER, false-positive rate,
> caught-rate, or latency figure dated 2026-09-15 or in reports `09`/`10` **was
> measured by running real code against the real checkpoint and real audio** —
> see those reports for exact methodology, sample size, and caveats (every
> number there is explicitly flagged as a technique-viability figure on a
> small sample, biased by train/test relationship, not a product-accuracy
> claim). Numbers dated 2026-08-30 in reports `01`–`08` predate ML being
> installed; per those reports' original rule, nothing numeric in them was
> measured by me — they are the two model cards'/experiment log's own claims,
> labelled and linked, or "ran, passed" for the non-ML text/logic layer.
> Report `11` (also 2026-09-15) adds ONNX export/size/speed/quantization
> numbers on the same basis, with one extra rule specific to it: every native
> CPU timing figure there is explicitly labelled a **lower bound** on browser
> performance, never presented as a browser number, and any WASM-vs-native
> slowdown range cited is a **quoted, linked claim from a named external
> source**, never blended with anything measured.

---

## SETTLED — actionable now

- **S1 — the "verify, don't transcribe" approach is real and shipped.** Su-śrotā
  dropped GOP forced-alignment scoring (_"validated (AUC 0.97–0.99) but too
  false-positive-prone for a tutor → superseded"_) for akṣara-level
  decode-vs-reference comparison with **decode-consensus + abstain**. The task
  brief's framing is confirmed against primary sources. → `05`
- **S2 — Vāgdhenu's per-metre reference bank covers this repo.** 8 of 9 slokas
  map to a shipped metre (`anuṣṭubh` ×6, `upajāti` ×1, `indravajrā`-pāda ×1). The
  9th (Asato Ma) is a non-metrical Upaniṣadic mantra → prose fallback, and is a
  coming-soon lesson with no activities. → `03`
- **S3 — licence status is known, mostly clean, one gap.** Datasets CC BY 4.0 ×3;
  Vāgdhenu stack Apache-2.0 and internally consistent; **Su-śrotā ASR weights
  have no `license:` field / no explicit grant**; the Su-śrotā experiment-log
  repo has **no LICENSE = all rights reserved** (method only, never copy). → `06`
- **S4 — interface impact is small and cheap to fix now.** Nothing in the app
  constructs or reads a `SegmentScore` today, so adding an `unclear` state is
  "breaking" only in the pure-type sense. → `07`
- **S5 — the "where does it run" decision is framed with per-option
  consequences.** (b) deferred = current state, zero risk. (a) backend = full
  COPPA + DPDP regime, needs an explicit lift of the no-backend rule. (c)
  on-device = only option that adds the capability without new child-data risk,
  if a browser-viable export is feasible (unverified). → `08`
- **S6 — the harness exists; its non-ML parts run and pass.** `check_akshara_counts.py`,
  `test_verify_logic.py` (5/5). Nothing copied from the licence-less repo. → `scripts/`
- **S7 (2026-09-15) — the 129M vs 600M discrepancy is resolved: 129 M, confirmed
  three independent ways** (checkpoint byte size, embedded config hyperparameters,
  and a full tensor count of the real loaded weights: 129,289,352 params). The
  600 M base hypothesis is ruled out. Materially improves D2(c)'s plausibility
  (the part that matters for inference is ~118 M params, not 600 M) — does
  **not** by itself prove on-device/WASM viability, which is untested. → `09`
- **S8 (2026-09-15) — the documented decode path executes**, via a from-scratch
  CTC-only reconstruction that works around three confirmed NeMo-version/fork
  incompatibilities in the RNNT half (never used by the documented path anyway).
  Loads with zero missing/unexpected keys against the real checkpoint; forward
  pass + full greedy decode confirmed end to end. `restore_from()` unmodified
  does **not** work with NeMo 3.0.0 — exact errors and the fix are in `09`. → `09`
- **S9 (2026-09-15) — first real-audio measurements exist**, on 16 clips from
  the Su-śrotā dataset's own held-out split (CC BY 4.0, dataset author's
  "leakage-free" claim). Proxy false-positive rate 2.1% (284 akṣaras); text-
  corruption detection 100% caught, 0% missed, with a measured 3.3% collateral
  false-'incorrect' rate on untouched neighbours (vs. 2.1% baseline) — a new,
  previously undocumented "corruption contamination" effect. CER (5.34% mean,
  3.22% excluding one outlier clip, 4.36% is the card's own claim on the full
  327-clip version of this split) roughly replicates the card's claim; their
  SN-WER figure is **not** comparable to this repo's simplified SN-WER proxy —
  methodology differs, not model quality. All numbers technique-viability only,
  see the caveats in `10`. → `10`
- **S10 (2026-09-15) — the `04`-identified coverage-gate gap is confirmed on the
  real model, not just inferred from synthetic strings, and it is severe: real,
  correctly-spoken audio scored against the WRONG sloka's text produced
  `incorrect` on 32/32 (100%) syllables with zero abstention.** Silence and
  white noise also produced false `incorrect` (12.5% each); noise additionally
  produced 2 false `correct` hits by chance-agreement across decode variants —
  a new risk (decode-consensus's 4 variants share one frozen encoder output,
  so they can correlate more than a true ensemble). Truncated audio was the
  one well-handled case (1.6% false-incorrect; mostly routes to `unclear`). A
  coverage/front-gate check ahead of per-akṣara scoring is not optional. → `10`
- **S11 (2026-09-15) — on-device (in-browser) inference is viable-with-caveats,
  not proven, not ruled out.** The 118M-param encoder+CTC graph (`09`) exports
  cleanly to ONNX (standard ops only, opset 17); the raw-audio→mel-features
  preprocessor does **not** export (`torch.stft` complex-type limitation,
  exact error diagnosed). fp16 quantization is **accuracy-free** (identical
  decode to fp32 on all 16 clips) but only ~211–215 MB compressed; int8
  dynamic quantization shrinks further (~87–94 MB compressed) but **nearly
  doubled CER (5.3%→10.2%) and made inference ~5× slower, not faster**, on
  the test CPU — a lose-lose as tested, not a path forward as-is. Native CPU
  RTF ≈ 0.07–0.08 (~13× real time) is an explicit **lower bound**; real
  browser/WASM speed is undetermined — documented ranges from other models
  (named, linked sources) span ~4×–40× slower than native, too wide to
  settle from Python alone. Does **not** make the age-based routing question
  moot; narrows it to specific, named next steps. → `11`

## BLOCKED — and what unblocks each

- **B1 — real CER/WER (Su-śrotā vs generic)** → **partially unblocked
  2026-09-15**: Su-śrotā's own CER now measured on 16 real clips (`10`). Still
  blocked on: the generic-IndicConformer comparison (not downloaded — auto-
  gated, needs a logged-in HF acceptance click) and, for a meaningful **product**
  number, a consented **child**-recitation corpus (none exists). → `01`, `10`
- **B2 — confirming the Sanskrit-slice decode executes** → **resolved
  2026-09-15, with a documented caveat**: not a simple version pin (the
  checkpoint needs a customised/forked NeMo for its RNNT half — not
  reproduced), but the **CTC-only path the product actually uses** loads and
  runs with the real weights, zero missing/unexpected keys. → `09`
- **B3 — Vāgdhenu vs general-TTS quality** → still blocked: needs Python 3.10 +
  CUDA 12.1 GPU + blind MOS raters. Not touched this session. → `03`
- **B4 — verify-against-text prototype on real audio** → **unblocked and run
  2026-09-15** on 16 real clips (`10`). What's still missing to call this
  "done": more clips, a random (not duration-spread) sample, and — see B5. → `04`, `10`
- **B5 — a real (blind-expert-labelled) false-positive rate** → **a proxy
  version now exists** (`10`, 2.1% on the dataset's own accepted transcripts).
  Still blocked on the actual thing `05` specifies: blind per-akṣara labels
  from ≥3 qualified Sanskrit educators on a **consented child** corpus,
  independent of the tool's own output, plus the full subgroup breakdown
  (age/language/device/room-noise/metre/akṣara-type). Nothing here
  substitutes for that. → `05`, `10`

**No number anywhere in this folder is estimated or invented. Every number is
either (a) measured, with the exact script and sample that produced it named,
or (b) an explicitly labelled claim from a model card / dataset README /
experiment log, with a link and a quote.**

## OPEN DECISIONS — for humans

- **D1** Collect a consented child-recitation corpus? Everything measurable
  depends on it. (COPPA verifiable consent; DPDP child = under 18, no profiling;
  separate consent for training use.)
- **D2** Where does inference run — (a) backend / (b) deferred / (c) on-device?
  **Updated 2026-09-15 (second pass, `11`):** this is now the most
  thoroughly tested option. The model exports to a clean, small-op ONNX
  graph; fp16 is accuracy-free; native CPU runs ~13× real time. But it is
  still not a "yes": the audio-feature step doesn't export (needs a JS/WASM
  reimplementation), the only quantization tested that shrinks the model
  enough (int8) wrecked both accuracy and speed, the accuracy-safe fp16
  artifact is ~211–215 MB compressed (not a "normal" web asset), and real
  WASM speed is unmeasured — documented ranges elsewhere span ~4×–40×
  slower than native. **Not resolved; resolved enough to say what the next
  concrete test is** (a real `onnxruntime-web` benchmark + a JS feature
  extractor). Until that exists, (c) is promising but not provably ready to
  replace (a)/(b) for everyone, which keeps an age-based (or
  connection/device-based) routing scheme live as an option, not moot. → `08`, `09`, `10`, `11`
- **D3** Ask the Su-śrotā author for an explicit `license:` + the NeMo version +
  exact base checkpoint. **Updated 2026-09-15:** we now know more precisely
  what to ask — the checkpoint's RNNT half uses config keys (`multisoftmax`,
  `joint.multilingual`) that don't exist in any upstream NeMo release found;
  it looks like a customised/forked training NeMo, not just an unpinned
  version. Worth asking the author which fork/branch, not just which release. → `02`, `06`, `09`
- **D4** Adopt the `07` interface changes now (blast radius ~zero) or later?
- **D5** Child-facing build says only **correct / unclear**, never "incorrect"? → `04`, `05`
- **D6** Persist per-syllable scores over time against a child profile? Separate
  decision from computing them; the main DPDP "profiling" question. → `08`,
  `FUTURE_ROADMAP` #4
- **D7 (new, 2026-09-15)** Build the coverage/front-gate before per-akṣara
  scoring ships in any form? `10` found this is not a theoretical nicety: on
  real audio, wrong-sloka input produced `incorrect` on 100% of syllables with
  zero abstention. Given `05`'s asymmetry argument (a false "you got it wrong"
  is the worst outcome for this app), shipping per-akṣara scoring **without**
  a coverage gate first reads as actively unsafe, not merely incomplete. → `04`, `10`

---

## Files

| File | One line |
|---|---|
| `01-susrota-vs-generic-indicconformer-cer-wer.md` | Blocked (no audio, no ML). Both cards' claimed numbers tabulated; harness ready; audio spec. |
| `02-sanskrit-slice-decode-usage.md` | Decode path documented consistently, looks sound; blocked on install + unstated NeMo version + no audio. |
| `03-vagdhenu-metre-coverage.md` | Quality comparison blocked. Coverage **yes** — 8/9 slokas; Asato Ma the only gap. |
| `04-verify-against-known-text-prototype.md` | Full design + harness; abstain logic tested passing; what the threshold must be tuned against. |
| `05-decode-consensus-abstain-false-positive-rate.md` | Blocked. "False positive" defined for a child app; full test protocol + clip set. |
| `06-license-status-all-three-resources.md` | Weights/dataset/code separately, quoted lines. Datasets clean; Vāgdhenu clean; ASR weights = gap; ASR repo = all rights reserved. |
| `07-interface-impact-chantevaluationresult.md` | `SegmentScore` needs `unclear`; verification needs a no-audio-reference result. Concrete shapes, additive/breaking. |
| `08-where-inference-runs-decision-doc.md` | (a) backend / (b) deferred / (c) on-device, COPPA + DPDP per option. Does not choose. |
| `09-parameter-count-and-decode-path-execution.md` | **2026-09-15, measured.** 129 M params confirmed (not 600 M) 3 ways. `restore_from()` diagnosed in full — 3 exact NeMo-incompatibility errors — and a working CTC-only reconstruction built, verified zero missing/unexpected keys. |
| `10-real-audio-verify-consensus-abstain-hard-negatives.md` | **2026-09-15, measured, on 16 real CC-BY-4.0 clips.** Proxy false-positive rate 2.1%; corruption detection 100% caught / 3.3% neighbour contamination; **wrong-sloka hard negative = 100% false `incorrect`, 0% abstain** — the coverage-gate gap is now confirmed, not just predicted. CER roughly replicates the card's own claim; SN-WER is not comparable (methodology differs). |
| `11-onnx-on-device-feasibility.md` | **2026-09-15, measured.** Directly answers D2's on-device question. ONNX export succeeds for encoder+CTC (standard ops); preprocessor export fails (`torch.stft` complex-type limit, diagnosed). fp16 = accuracy-free, ~211–215 MB compressed; int8 = smaller but **worse accuracy AND ~5× slower** on this CPU. Native CPU RTF≈0.07–0.08 stated as an explicit lower bound; real WASM speed cited as an open ~4×–40× range from named sources, not measured. Verdict: **viable-with-caveats**, with a named, concrete next test. |
| `scripts/` | From-scratch harness. Non-ML scripts run & pass. **2026-09-15: the ASR scripts now run too** — `load_susrota_ctc.py` (the working loader), `extract_held_out_clips.py`, `run_holdout_decode.py`, `run_p4_p5_tests.py`, `run_onnx_pipeline.py` (new, ONNX timing+accuracy). `models/` and `clips/*.wav` are git-ignored (~3.4 GB incl. 3 ONNX variants + compressed copies, re-derivable). `SETUP.md` is now historical for the install step (done) but still accurate for what's still missing (ffmpeg, generic-baseline checkpoint, child audio). |

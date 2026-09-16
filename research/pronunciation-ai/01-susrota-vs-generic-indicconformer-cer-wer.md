# 01 — Su-śrotā vs generic IndicConformer: real CER/WER on this repo's sloka text

_Dated 2026-08-30. Research-analyst. SlokaSteps (`feature/v2-foundation`)._

---

## Verdict box

| | |
|---|---|
| **What I set out to test** | Whether the Su-śrotā finetune beats a generic IndicConformer on **this app's actual sloka text** (`src/content/slokas/*.ts`), measured as CER / WER / SN-WER. |
| **What I actually did** | Extracted the reference text for all 9 slokas into a machine-readable file; built the complete, tested evaluation harness; verified the text-scoring layer (CER/WER/SN-WER + akshara segmentation) by running it; extracted and tabulated **both model cards' own claimed numbers**, labelled as their claims. Ran **no ASR**. |
| **What I concluded** | **Blocked — cannot produce a measured CER/WER.** Two hard blockers: (1) nothing ML is installed (multi-GB); (2) **the repo contains zero audio**, and a result that means anything for this app needs *child* recitation audio collected with verifiable parental consent. The harness is ready; `SETUP.md` has the exact commands. Su-śrotā's *claimed* edge over generic Sanskrit ASR is real and specific (see table below) but is measured on their eval sets, not this app's. |

**Do not read any number in the "claimed" tables below as my measurement.** They are quotes from the two model cards / the experiment log, with links.

---

## Why this is blocked, precisely

### Blocker 1 — no ML stack
`torch`, `torchaudio`, `nemo_toolkit`, `soundfile`, `librosa`, `numpy` are all absent. `nemo_toolkit[asr]` + a matching torch is **~2.5–4 GB installed** (CPU) or ~5–7 GB with CUDA. Per the role brief I do not run that install. Commands are in `scripts/SETUP.md`, pending approval.

### Blocker 2 — no audio, and the *right* audio does not exist anywhere
- `public/audio/manifest.json` is `{"schemaVersion":1,"generatedAt":null,"assets":[]}`. There are no sample recordings anywhere in the tree.
- The app's recorder (`src/hooks/useRecorder.ts`) yields an in-memory `Blob` of `recorder.mimeType || 'audio/webm'` — WebM/Opus on Chromium, MP4/AAC on Safari — at the browser's default sample rate. The model needs **16 kHz mono**. That transcode needs **ffmpeg, which is not on PATH**.
- Even with adult test audio, the result would not answer the product question. SlokaSteps is used by children 4–10. Child speech differs from adult speech in pitch, rate, disfluency, and articulation; ASR error rates on children are routinely much higher than on adults. A CER measured on adults would be an optimistic proxy at best and must be labelled as such.

### What "run it properly" requires

| Dimension | Minimum credible | Better |
|---|---|---|
| **Speakers** | Consenting adult Sanskrit learners/reciters as a labelled *proxy* (≥10). | Children 4–10, balanced across the app's 6 first-language backgrounds (en/hi/te/kn/ta/mr families), with **verifiable parental consent** (COPPA) and DPDP-compliant handling (child = under 18; no profiling). |
| **Material** | Each of the 7 `complete` slokas, plain recitation (not melodic — the model is tuned for *plain* śāstric/recitational Sanskrit, per its card). | Add the 2 coming-soon slokas; 2–3 takes per speaker; include deliberate mistakes for the error-localisation work in `04`/`05`. |
| **Volume** | ~20–40 clips for a smoke test (does it transcribe recitation at all). | ≥100 clips per age band for a mean CER with a usable confidence interval; the worst subgroup still needs a tight enough interval to decide on. The exact N is a question for the validation-plan statisticians (`docs/CHANT_COACH_VALIDATION_PLAN.md` §3), not something I can derive here. |
| **Recording** | Quiet room, one verse per clip, phone mic, 16 kHz mono WAV, reference text logged per clip. | Multiple device/mic types (cheap headset, tablet, phone), realistic home noise, plus hard negatives (silence, wrong sloka, sibling talking, replayed reference). |
| **Ground truth** | The known reference text (verification framing — you know what they were asked to chant). | Plus per-akshara pronunciation judgements from ≥3 qualified Sanskrit teachers, blind to model output, for `04`/`05`. |

### The harness (ready to run once unblocked)
`scripts/cer_wer_eval.py` → decodes each clip with Su-śrotā (Sanskrit slice) **and** a generic IndicConformer, scores both against `scripts/slokas_reference.json` using the model card's "content-only" normalisation, reports per-model mean CER/WER/SN-WER with a bootstrap 95% interval and a per-sloka/per-clip breakdown. Feeder scripts: `transcode_to_wav.py`, `make_nemo_manifest.py`. The text-scoring math (`common_text.py`) is **tested and passing** — `char_error_rate`, `word_error_rate`, `sandhi_normalised_wer`, and Devanagari akshara segmentation all run correctly on the repo's sloka text today.

---

## What the two model cards *claim* (their numbers, not mine)

### Su-śrotā (`prathoshap/sushrota-sanskrit-asr`) — claimed

Source: <https://huggingface.co/prathoshap/sushrota-sanskrit-asr> and the experiment log <https://github.com/prathoshap/sushrota-sanskrit-asr>, both read 2026-08-30. Model: finetuned AI4Bharat IndicConformer, CTC head on the Sanskrit token slice. Deployed checkpoint `v13b` (= studio base `v5` continued on consented in-the-wild data). Metrics: CER on space-stripped text; WER on whitespace tokens; SN-WER = sandhi-normalised WER, reported as a `lo..hi` band.

| Eval set (their held-outs) | CER | WER | SN-WER | which checkpoint |
|---|---|---|---|---|
| In-the-wild user audio, 327-clip leakage-free | **4.36 %** | **30.4 %** | 10.8–13.2 % | v13b (deployed) |
| — same set, studio-only base for contrast | 7.70 % | 45.4 % | 20.7–24.4 % | v5 |
| Studio held-out (305 clips) | 4.4 % | 20.2 % | 13.0–15.7 % | v13b |
| Bhāgavata chant (968) | ~6.0 % | ~46 % | ~22–26 % | v13b |
| Vedānta prose (718) | ~7.2 % | ~31 % | ~15–19 % | v13b |

Their framing (quoted): _"roughly half of Sanskrit 'WER' is spacing; CER and SN-WER (sandhi-normalised) are the meaningful numbers."_ And: _"The acoustic model is saturated on studio audio (~6% CER)"_ — the flywheel's gain was **in-the-wild robustness**, not studio accuracy.

### Generic IndicConformer — claimed

- `ai4bharat/indic-conformer-600m-multilingual` (<https://huggingface.co/ai4bharat/indic-conformer-600m-multilingual>, read 2026-08-30): **no Sanskrit-specific CER/WER on the card.** The only result shown is "Hindi WER 13.2" on Vaani-Benchmark-V1.0. License MIT; download **auto-gated** (must accept "share contact information"). 600M params. Supports `sa`.
- The Su-śrotā experiment log characterises generic Sanskrit ASR (quoted): _"Off-the-shelf Sanskrit ASR is trained on conversational IndicVoices-style data and degrades badly on **recitation and śāstra**."_ Their experiment #13 (quoted): _"Baselines: Whisper-sa, wav2vec2 finetunes — v5 (IndicConformer-CTC) remained the best on chant/prose."_ **No number is given for a generic model on chant/recitation.**

### What this means

There is **no published, directly comparable number** — not for a generic IndicConformer on recitation, and certainly not for either model on *this repo's slokas read by children*. Su-śrotā's own numbers are on Bhāgavata/Vedānta/in-the-wild sets. The claimed advantage (specialising for recitation; halving in-the-wild error with consented data) is plausible and well-documented, but "plausible and documented by the authors" is not "measured by us for our use case." The gap between the two is exactly what `scripts/cer_wer_eval.py` exists to fill.

---

## Notes for whoever unblocks this

1. **The generic baseline must expose a Sanskrit decode path.** `indic-conformer-600m-multilingual` does (per its card). Confirm the decode API and that `sa` is a real slice before trusting the comparison.
2. **Normalisation parity matters.** Su-śrotā's card specifies dropping daṇḍa, digits, avagraha, oṁ, Vedic accents; NFC; collapse whitespace. `common_text.normalise_devanagari` does this. Use the *same* normalisation on both models' output or the comparison is meaningless.
3. **Report CER and SN-WER, not raw WER, as the headline** — the app's slokas are full of sandhi and compounds (`गुरुर्ब्रह्मा`, `सर्वकार्येषु`), exactly where raw WER over-penalises.
4. **Melodic vs plain.** If any child sings the sloka (many will), that clip is out of the model's stated domain. Tag recitation style per clip; report melodic clips separately or exclude them.
5. **Asato Ma** is a non-metrical Upaniṣadic mantra with a `ॐ शान्तिः शान्तिः शान्तिः` line — `oṁ` is dropped by the model's own normalisation, so expect the reference/hyp to both lose it. Fine, as long as it's symmetric.

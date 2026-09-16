# 06 — Licence status: weights, datasets, and code, assessed separately

_Dated 2026-08-30. Research-analyst. Every licence below is recorded **as stated at the source on 2026-08-30**, with a direct link and a quoted line. This is not legal advice._

---

## Verdict box

| | |
|---|---|
| **What I set out to check** | The licence of every resource, with **weights / dataset / code assessed separately**, quoting the source. Whether Vāgdhenu's Apache-2.0 claim is consistent with its IndicF5 base. Whether the ASR model inherits upstream or gated-download restrictions. |
| **What I actually did** | Fetched and quoted the YAML frontmatter / LICENSE / THIRD_PARTY_NOTICES / model-card licence sections of all nine relevant artefacts (3 resources × up to 3 layers, plus 4 upstreams). |
| **What I concluded** | **Datasets: clean** (CC BY 4.0 ×3). **Vāgdhenu stack: clean and internally consistent** (Apache-2.0 code + MIT-derived Apache-2.0 weights; MIT ⇒ Apache-2.0 relicensing is fine and the MIT notices are preserved). **Su-śrotā ASR weights: a real gap** — the model card carries **no `license:` field and no explicit grant**, only "observe the base model's license terms"; the base (AI4Bharat IndicConformer) is **MIT** but its current multilingual repo is **download-gated**. **Su-śrotā experiment-log repo: all rights reserved** — no LICENSE file; usable for method only, never code. |

---

## Resource 1 — Su-śrotā Sanskrit ASR

### 1a. Model weights — `prathoshap/sushrota-sanskrit-asr`

- Source: <https://huggingface.co/prathoshap/sushrota-sanskrit-asr>, raw `README.md` read 2026-08-30.
- **YAML frontmatter has NO `license:` field.** It is: `language: sa`, `library_name: nemo`, `pipeline_tag: automatic-speech-recognition`, `tags: [...]`. (Confirmed via `https://huggingface.co/api/models/prathoshap/sushrota-sanskrit-asr` → `gated: false`, no licence in `cardData`.)
- The entire License section, quoted verbatim:
  > ## License
  > Finetuned from AI4Bharat's IndicConformer — please observe the base model's license terms.
- **Assessment:** the finetuned weights (the delta produced by Prathosh's training) carry **no explicit licence grant**. "Observe the base model's license terms" points downstream but does not itself grant permission to use, modify, or redistribute *this checkpoint*. For **local evaluation** this is low-risk (you're using it as the author plainly intends). For **bundling the weights into SlokaSteps** — redistribution — this is a gap that should be closed by the author adding an SPDX `license:` field. Do not assume MIT flows through automatically; a derivative work needs its own stated licence.

### 1b. Base model — AI4Bharat IndicConformer

- The card says base = `EncDecHybridRNNTCTCBPEModel, ~129 M params`, aggregate multilingual, decode on the Sanskrit slice. The likely current repo is `ai4bharat/indic-conformer-600m-multilingual` (param-count discrepancy noted in `02`).
- `ai4bharat/indic-conformer-600m-multilingual` (<https://huggingface.co/ai4bharat/indic-conformer-600m-multilingual>, read 2026-08-30): `cardData.license: "mit"`; `gated: "auto"`. The page states: _"You need to agree to share your contact information to access this model."_
- `ai4bharat/IndicConformer` (older) and the language-specific `indicconformer_stt_*_hybrid_ctc_rnnt_large` repos: **MIT** per their model cards (web search 2026-08-30; the multilingual one confirmed above).
- **Assessment:** the base is **MIT** — permissive: commercial use, modification, redistribution allowed, with the MIT copyright + permission notice retained. **But** the current multilingual repo is **auto-gated**: a click-through agreement to share contact info before download. Auto-gating is an *access* control, not a licence term — once you have the file, MIT governs reuse — but it does mean **programmatic download requires a logged-in HF account that has accepted the gate**, which matters for any automated build or CI.

### 1c. Training dataset — `prathoshap/sushrota-sanskrit-asr-data`

- Source: <https://huggingface.co/datasets/prathoshap/sushrota-sanskrit-asr-data>, raw `README.md` read 2026-08-30.
- Frontmatter, quoted: `license: cc-by-4.0`.
- Consent/PII, quoted: _"In-the-wild clips are collected only with explicit user consent and store no raw IP or personal identifiers (an anonymous per-session id only)."_ and _"Individual reciter names are not published."_
- **Assessment:** **CC BY 4.0** — use, share, adapt, including commercially, with attribution and an indication of changes. Clean. **One caveat for a children's product:** the card makes **no statement about whether any speakers are minors.** The flywheel data comes from public Sanskrit practice tools (adult scholars, by description), but this is not asserted. If SlokaSteps ever trained on or shipped anything derived from this dataset, that question needs an answer (COPPA / DPDP on children's voice data).

### 1d. Experiment-log code — `github.com/prathoshap/sushrota-sanskrit-asr`

- `https://api.github.com/repos/prathoshap/sushrota-sanskrit-asr` (read 2026-08-30): **`"license": null`**. Repo root contents: `.gitignore`, `README.md`, `docs/`, `scripts/`, `vagbodhini/` — **no LICENSE, LICENSE.md, COPYING, or equivalent.**
- **Assessment:** **all rights reserved by default.** Absent a licence, US (and most) copyright law grants the public **no permission** to copy, modify, or redistribute any code in that repo — not a function, not a snippet. It may be **read** and its **methods described** in one's own words (facts and methods are not copyrightable; specific code expression is). This is exactly the constraint the role brief states, and it is correct. Everything in `research/pronunciation-ai/scripts/` was written from scratch on that basis.

---

## Resource 2 — Vāgdhenu chant TTS

### 2a. Model weights — `prathoshap/vagdhenu`

- Source: <https://huggingface.co/prathoshap/vagdhenu>, raw `README.md` + `THIRD_PARTY_NOTICES.md` read 2026-08-30.
- Frontmatter, quoted: `license: apache-2.0`, `base_model: ai4bharat/IndicF5`.
- Card "License & attribution", quoted:
  > Our contribution under **Apache-2.0**. Built on **AI4Bharat IndicF5** (MIT), **NVIDIA BigVGAN-v2**, and **F5-TTS** — the vocoder is a BigVGAN-v2 derivative; please observe NVIDIA's BigVGAN license terms.
- `THIRD_PARTY_NOTICES.md`, quoted verbatim:
  > The released weights are derivatives of MIT-licensed base models. Per the MIT License, the original copyright and permission notices are reproduced below.
  > - `voice_armA_ema_2026-06-11.pt`, `voice_steer_ema_2026-06-17.pt` — fine-tuned from **AI4Bharat IndicF5** (https://huggingface.co/ai4bharat/IndicF5), MIT.
  > - `vocab.txt` — the tokenizer vocabulary from **AI4Bharat IndicF5**, MIT (redistributed unchanged so this release is self-contained; the IndicF5 model itself is not required or included).
  > - `voc_bigvgan_EMA_2026-06-11.pth` — fine-tuned from **NVIDIA BigVGAN-v2** (https://github.com/NVIDIA/BigVGAN), MIT.
  > The Vāgdhenu weights and the fine-tuning code are released under Apache-2.0 (see the repository).
- **Assessment:** **Apache-2.0, and consistent with the MIT bases.** MIT permits redistribution and sublicensing, including relicensing a derivative under Apache-2.0, **provided the original MIT copyright + permission notices are retained** — which `THIRD_PARTY_NOTICES.md` does explicitly, per-file. No conflict. Apache-2.0 additionally grants a patent licence and requires a NOTICE-style attribution, both satisfied here. **This stack is clean to use and redistribute.**

### 2b. Upstreams (checked independently)

| Upstream | Licence at source (2026-08-30) | Gated? | Note |
|---|---|---|---|
| `ai4bharat/IndicF5` | model card: `License: mit` | **Yes** — _"You need to agree to share your contact information to access this model"_ + ToU: _"you agree to only clone voices for which you have explicit permission. Unauthorized voice cloning is strictly prohibited."_ | MIT text does not itself permit adding downstream restrictions; the gate + ToU are an access-layer overlay. **Vāgdhenu sidesteps this for redistribution** by shipping `vocab.txt` itself and noting "the IndicF5 model itself is not required or included." Low risk for SlokaSteps (fixed single author voice, no third-party voice cloning). |
| NVIDIA BigVGAN (`github.com/NVIDIA/BigVGAN`) | `LICENSE` = **MIT** (standard MIT text, verified) | code not gated | The v2 checkpoint `nvidia/bigvgan_v2_24khz_100band_256x` model card also shows `license: mit`, not gated. Vāgdhenu's "observe NVIDIA's BigVGAN license terms" = MIT. |
| F5-TTS (`github.com/SWivid/F5-TTS`) | `LICENSE` = **MIT**, "Copyright (c) 2024 Yushen CHEN" | not gated | Consistent with Vāgdhenu's "(MIT)". |
| NVIDIA NeMo (needed to load the ASR `.nemo`) | **Apache-2.0** (`github.com/NVIDIA-NeMo/NeMo` LICENSE; web search 2026-08-30) | not gated | Relevant to `01`/`02`, not to shipping anything. |

### 2c. Code — `github.com/prathoshap/vagdhenu`

- `https://api.github.com/repos/prathoshap/vagdhenu/git/trees/main` (read 2026-08-30): a **`LICENSE`** file exists at root.
- Fetched: it is the **Apache License 2.0** standard text. **The copyright line in the appendix is the unfilled template** (`Copyright [yyyy] [name of copyright owner]`). The README states: _"Code: **Apache-2.0** (`LICENSE`)."_
- **Assessment:** **Apache-2.0.** The unfilled appendix copyright placeholder is a cosmetic imperfection, not a defect in the grant — choosing the Apache-2.0 file plus the explicit README statement establishes the licence. This means `src/reference_bank/bank.json`, the metre-detection modules (`tts_meter.py`, `gana_uni.py`, `chandas_labeler.py`), and the render pipeline **are reusable** under Apache-2.0 (attribution + NOTICE). This is a materially better position than the ASR experiment-log repo.

### 2d. Training data — `prathoshap/vagdhenu-data`

- <https://huggingface.co/datasets/prathoshap/vagdhenu-data>, read 2026-08-30. Frontmatter: `license: cc-by-4.0`. Quoted: _"One reciter (the author); classical śāstra chant, no Vedic svaras."_ and _"The voice and recordings are the author's own. Please cite Vāgdhenu."_
- **Assessment:** **CC BY 4.0**, single adult speaker = the author, no third-party-consent issues. Clean.

---

## Consolidated table

| Artefact | Layer | Licence at source (2026-08-30) | Gated | Reusable by SlokaSteps? |
|---|---|---|---|---|
| `prathoshap/sushrota-sanskrit-asr` | ASR weights | **none stated** ("observe base model's terms") | no | **Local eval: yes. Bundling: not until an explicit licence is added.** |
| AI4Bharat IndicConformer (base) | weights | **MIT** | **yes (auto)** on the 600m-multilingual repo | Yes under MIT; automated download needs an account that accepted the gate |
| `prathoshap/sushrota-sanskrit-asr-data` | dataset | **CC BY 4.0** | no | Yes, with attribution. (Minor-speaker status unstated.) |
| `github.com/prathoshap/sushrota-sanskrit-asr` | code | **none — all rights reserved** | n/a | **Method only. Never copy code.** |
| `prathoshap/vagdhenu` | TTS weights | **Apache-2.0** (MIT-derived, notices preserved) | no | Yes |
| `ai4bharat/IndicF5` (base) | weights | **MIT** | **yes** + no-voice-cloning ToU | Yes under MIT; Vāgdhenu already avoids requiring it |
| NVIDIA BigVGAN-v2 / F5-TTS | code + ckpt | **MIT** | no | Yes |
| `github.com/prathoshap/vagdhenu` | code | **Apache-2.0** (appendix copyright line blank) | n/a | Yes, with attribution + NOTICE |
| `prathoshap/vagdhenu-data` | dataset | **CC BY 4.0** | no | Yes, with attribution |
| NVIDIA NeMo | toolkit | **Apache-2.0** | no | Yes (build-time only) |

---

## Actions this implies

1. **Before shipping the ASR weights in any form** (backend or in-browser), get the author to add an explicit `license:` (SPDX) to the Su-śrotā model card. Until then, treat the checkpoint as **evaluation-only**.
2. **Never copy code** from `github.com/prathoshap/sushrota-sanskrit-asr`. The `research/pronunciation-ai/scripts/` harness is written from scratch on that basis; keep it that way.
3. If an automated pipeline ever downloads the base IndicConformer, it needs an HF account that has accepted the auto-gate; document that in the build, don't let CI fail mysteriously.
4. The Vāgdhenu **code** repo (Apache-2.0) is the one piece of this ecosystem that can be reused directly — relevant if metre-aware reference audio is ever pre-generated for the app (`03`).
5. Record all of the above in `CONTENT_REVIEW.md` / a licence ledger if any of these resources moves from "research" to "in the product" — this project has been burned by an unchecked licence assumption before.

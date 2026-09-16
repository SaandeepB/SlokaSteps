# 03 — Vāgdhenu vs a general Indic TTS: metre-coverage check

_Dated 2026-08-30. Research-analyst._

---

## Verdict box

| | |
|---|---|
| **What I set out to test** | (a) Quality of Vāgdhenu vs a general Indic TTS — and (b) the answerable half: does Vāgdhenu's shipped **per-metre reference bank** cover the metres this repo's slokas actually use? |
| **What I actually did** | (a) Nothing runnable — see "blocked" below. (b) Identified each of the **9** slokas' metre from `src/content/slokas/*.ts` (analyst scansion + a syllable-count check I ran), then cross-referenced against `src/reference_bank/bank.json` fetched from `github.com/prathoshap/vagdhenu` on 2026-08-30. |
| **What I concluded** | **(a) Quality comparison: blocked** (no TTS installed, no GPU assumed, nothing to listen to). **(b) Coverage: YES — comfortably.** 8 of 9 slokas map to a metre the reference bank ships (`anuṣṭubh`, `upajāti`, `indravajrā`). The 9th, **Asato Ma**, is a non-metrical Upaniṣadic mantra that would hit the prose/generic fallback — and it is a coming-soon lesson with no activities. The dominant metre across the catalogue is **Anuṣṭubh** (6 of 9), which is the single best-resourced entry in the bank. |

---

## Part (a) — quality comparison: blocked

Not runnable here and I will not guess a quality verdict:
- Vāgdhenu ships as weights only (`prathoshap/vagdhenu`: two voice `.pt`, a BigVGAN `.pth`, `vocab.txt`). Inference needs the `github.com/prathoshap/vagdhenu` repo, `bash scripts/setup.sh` (installs `torch+cu121`, BigVGAN, downloads weights), then `python src/render.py …`. The repo's own README states **"Requires Python 3.10 and a CUDA 12.1 GPU."**
- Nothing ML is installed here; GPU availability is not established; and there is no existing Vāgdhenu or baseline audio in the repo to A/B.
- A credible quality comparison would need: a fixed set of the app's slokas rendered by Vāgdhenu and by the baseline, then blind MOS / preference ratings by listeners who know Sanskrit chant — ideally the same qualified reviewers `docs/CHANT_COACH_VALIDATION_PLAN.md` already calls for. The Vāgdhenu card claims **"MOS ~4.6 (expert listener)"** and **"conjuncts including retroflex aspirates render 100% correctly"** — those are the authors' claims, not measured here.
- One material qualitative fact from the card, not a rating: **"No Vedic svaras."** Two of the repo's slokas (Asato Ma, Sarve Bhavantu) end with `ॐ शान्तिः शान्तिः शान्तिः`, a śānti formula that some traditions intone with Vedic accent. Vāgdhenu will render it as plain chant, not accented. That is a content/tradition decision for the editorial reviewers, not a bug.

---

## Part (b) — reference-bank coverage: the answerable question

### How Vāgdhenu uses metre (so we know what "coverage" buys)

From `docs/VAGBODHINI_2026-07-13.md` (§6) and the Vāgdhenu card, read 2026-08-30:
- Metre is detected **internally only** and **never displayed** — quoted: _"a wrong label would erode trust."_ It is used for two things: picking the reference-bank clip that conditions the TTS voice/pace, and setting pāda (¼) / ardha (½) boundaries.
- Detection: match pāda 1 to a known laghu/guru signature (tolerant of later-pāda liberties) → else `anuṣṭubh` by count (8/16/32) → else "generic identical-quarters" → else prose.
- So a metre that is *not* in the bank still renders — it falls back to a nearest-length or prose reference. Coverage improves fidelity; it is not pass/fail.

### The shipped bank

`src/reference_bank/bank.json` (fetched 2026-08-30) has these metre keys, each with a reference WAV, `ref_text`, precomputed L/G signature, and a locked `sec_per_syll`:

`anuṣṭubh`, `pramāṇikā`, `vasantatilakā`, `upajāti`, `indravajrā`, `upendravajrā`, `vaṃśastha`, `rathoddhatā`, `śālinī`, `indravaṃśā`, `drutavilambita`, `bhujaṅgaprayāta`, `mālinī`, `śārdūlavikrīḍita`, `sragdharā`, `vrutta-1`, plus `repeat_primes` (alliteration priming) and `gadya` / `gadya_mbtn` (prose).

`anuṣṭubh` entry: `sec_per_syll 0.326`, `mode "half"`, 4.73 s reference — i.e. the best-exercised entry (the docs note this value is "identical across MBTN and Bhāgavatam production").

### Metre of each sloka in this repo

Method: analyst scansion of the Devanagari in `src/content/slokas/*.ts`, plus a **syllable-count check I ran** (`scripts/check_akshara_counts.py`, output reproduced in `scripts/`), which is a first gate — 8-count → Anuṣṭubh class, 11-count → Triṣṭubh class. Full laghu/guru scansion for the metre *name* is the analyst's; where I am not confident I say so.

| # | id | status | Devanāgarī (line 1) | Metre (analyst) | Confidence | Bank entry it maps to |
|---|---|---|---|---|---|---|
| 1 | `saraswati-namastubhyam` | complete | सरस्वति नमस्तुभ्यं… | **Anuṣṭubh** (śloka), 8×4 (count check: 16+16) | high | `anuṣṭubh` ✅ |
| 2 | `vakratunda-mahakaya` | complete | वक्रतुण्ड महाकाय… | **Anuṣṭubh**, 8×4 (16+16) | high | `anuṣṭubh` ✅ |
| 3 | `guru-brahma` | complete | गुरुर्ब्रह्मा गुरुर्विष्णुर्… | **Anuṣṭubh**, 8×4 (16+16) | high | `anuṣṭubh` ✅ |
| 4 | `tvameva-mata` | complete | त्वमेव माता च पिता त्वमेव | **Upajāti** (Indravajrā/Upendravajrā mix), Triṣṭubh class, 11×4 (count check: 11×4) | high for the Triṣṭubh-11 family; medium for "Upajāti" vs "pure Upendravajrā" | `upajāti` ✅ (`indravajrā`, `upendravajrā` also in bank) |
| 5 | `karagre-vasate` | complete | कराग्रे वसते लक्ष्मीः… | **Anuṣṭubh**, 8×4 (16+16) | high | `anuṣṭubh` ✅ |
| 6 | `shubham-karoti` | complete | शुभं करोति कल्याणम्… | **Anuṣṭubh**, 8×4 (count check 17+16 — the +1 is an orthographic artefact of halanta+vowel sandhi in `कल्याणम् आरोग्यं`; spoken it is 8+8) | high | `anuṣṭubh` ✅ |
| 7 | `lokah-samastah-sukhino-bhavantu` | complete | लोकाः समस्ताः सुखिनो भवन्तु | **Triṣṭubh-class single pāda**; the L/G pattern is an **Indravajrā** pāda (11 syllables). Repo ships only this one line. | medium-high (one pāda does not fully fix the vṛtta) | `indravajrā` ✅ (or `upajāti`) |
| 8 | `asato-ma` | **coming-soon** | असतो मा सद्गमय… | **NOT a regular classical vṛtta.** Bṛhadāraṇyaka Up. 1.3.28 — uneven pādas (count check: 8 / 9 / 9), then a śānti formula. | n/a — cannot assign a classical metre | **falls back** to `gadya` / generic ⚠️ |
| 9 | `sarve-bhavantu` | **coming-soon** | सर्वे भवन्तु सुखिनः… | **Anuṣṭubh**, 8×4 (count check: 8+8+8+8 for the verse) with a light 5–7 cadence in pāda 1 (a known vipulā); then an appended śānti line | medium-high | `anuṣṭubh` ✅ |

### Result

- **7 of 7 `complete` slokas** map to a bank metre: 5 × `anuṣṭubh`, 1 × `upajāti`, 1 × `indravajrā`-pāda. All three are present with full reference clips + L/G signatures + locked pace.
- **Of the 2 coming-soon slokas:** `sarve-bhavantu` is `anuṣṭubh` (covered); `asato-ma` is the one genuine gap — a non-metrical mantra that Vāgbodhinī's detector would route to "generic identical-quarters" or `gadya` (prose). Given it is coming-soon with **zero activities**, this is not urgent.
- **Anuṣṭubh is the workhorse** — 6 of 9 slokas. It is also the metre the bank documents as most production-hardened. If SlokaSteps only ever shipped Anuṣṭubh + Upajāti verses, the bank would be sufficient with room to spare.

### Caveats on my metre calls

- I did **not** run laghu/guru scansion software; the vṛtta *names* are my manual analysis of well-known verses. The *class* (8-syllable Anuṣṭubh vs 11-syllable Triṣṭubh) is backed by the count check I ran.
- `tvameva-mata`: standardly cited as Upajāti; a purist might scan all four pādas as Upendravajrā. Either way it is Triṣṭubh-11 and the bank has all of `upajāti` / `indravajrā` / `upendravajrā`.
- `lokah-samastah`: the repo ships a single line. Its L/G reads as Indravajrā; a single pāda cannot uniquely determine a full-verse vṛtta. Vāgbodhinī splits on `॥`/blank line, so it would treat this as one pāda and condition on the Indravajrā (or Upajāti) reference — fine.
- `asato-ma` / `sarve-bhavantu` closing line `ॐ शान्तिः शान्तिः शान्तिः`: not metrical; `ॐ` is stripped by normalisation anyway. Vāgdhenu renders it as plain chant (no Vedic accent).

---

## If SlokaSteps ever wired Vāgdhenu in (not asked, but adjacent)

The Vāgdhenu **code** repo is Apache-2.0 (see `06`), so `src/reference_bank/bank.json`, the metre-detection modules (`tts_meter.py`, `gana_uni.py`, `chandas_labeler.py`), and the render pipeline are reusable. That is a different licensing position from the ASR experiment log (no licence). But: it needs a CUDA GPU per its own README, which points to build-time pre-rendering of reference audio (consistent with `docs/AUDIO_ARCHITECTURE.md`'s "pregenerated in a trusted environment" model), **not** runtime synthesis in the browser or on a server the app runs. Pre-rendered Vāgdhenu clips would still go through the existing manifest + editorial `approved` gate before any child hears them.

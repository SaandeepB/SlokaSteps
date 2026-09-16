# 10 — Real-audio tests: verify-against-text false positives, corrupted-text detection, and hard negatives

_Dated 2026-09-15. Research-analyst. Uses the CTC-only Su-śrotā model
reconstruction from `09-*.md` (`scripts/load_susrota_ctc.py`) and 16 real
clips sampled from a licensed public dataset (provenance below). This is
the **first time** any of this harness has run against real audio — `04-*.md`
and `05-*.md` were logic-only, tested against hand-written synthetic decode
strings._

---

## Verdict box

| | |
|---|---|
| **What I set out to test** | (P2) Find openly-licensed Sanskrit recitation audio without bulk-downloading anything or touching YouTube/streaming sources. (P4) On real audio: a proxy false-positive rate against true transcripts, and whether decode-consensus + abstain catches deliberately corrupted transcripts without collateral damage to untouched syllables. (P5) Whether hard negatives (silence, noise, wrong sloka, truncated audio) produce the false-"incorrect" pile-up that `04-*.md` flagged as a design gap. |
| **What I actually did** | Downloaded only the smallest, held-out split of the Su-śrotā dataset (CC BY 4.0) — 327 clips, ~2 hours — and extracted a small, duration-spread sample of 16 real clips with their ground-truth transcripts. Ran the real ASR (via `09-*.md`'s working loader) on all 16, computed a proxy false-positive rate against true transcripts, built a text-corruption test with exactly-known corrupted positions, and constructed 4 hard-negative probes (silence, white noise, wrong-sloka-real-audio, truncated audio). All numbers below are **measured**, from real runs, on real (for the negatives, partly synthetic) audio. |
| **What I concluded** | **Proxy false-positive rate 2.1% (6/284 akṣaras)** on real correct audio + true transcript — genuinely low, but see the caveats, this is not the blind-expert-labelled number `05-*.md` specifies. **Corruption detection: 100%** of deliberately-substituted akṣaras were caught (never silently passed as `correct`); a small **3.3% contamination** effect leaked onto untouched neighbours (vs. 2.1% baseline). **The `04-*.md` coverage-gate gap is now confirmed on the real model, not just inferred**: silence produced 12.5% false `incorrect`, white noise produced both false `incorrect` (12.5%) *and* 2 false `correct` hits by chance, and — the most important number in this report — **feeding the right sloka's audio against the WRONG sloka's text produced `incorrect` on 32/32 (100%) of syllables, zero abstention.** A coverage gate ahead of per-syllable scoring is not optional; it is the single most consequential gap this pass identified. |

**MANDATORY CAVEAT, stated once here and implied everywhere below:** the model under test was trained on data from the same project as the audio used to test it. The `in_the_wild_test` split is described by the dataset's own README as "leakage-free held-out" — that is the **dataset author's claim**, quoted and linked below, not something this analyst independently re-verified (e.g. by hashing every train-split clip to rule out near-duplicates). Every number in this report is a **technique-viability figure on this specific 16-clip sample of this specific checkpoint**, not a product-accuracy figure, and is likely optimistically biased relative to what a genuinely external, child-voice corpus would show.

---

## P2 — audio acquired, with full provenance and license

### What I downloaded and why

**Source:** `huggingface.co/datasets/prathoshap/sushrota-sanskrit-asr-data`, split `in_the_wild_test`.

**License, quoted directly from the dataset's own `README.md` (fetched 2026-09-15):**
```
---
language: sa
license: cc-by-4.0
...
---
...
Released under CC-BY-4.0. Please cite:
> Prathosh A P, Su-śrotā: Scholar-grade Sanskrit ASR and metre-aware chant
> practice, Indian Institute of Science, Bengaluru, 2026.
```
This is the **dataset's** license (distinct from the ASR model weights, which `06-*.md` already found have no explicit license grant — that finding is unchanged and not re-litigated here).

**Why this split, not `train`:** the task brief asked to prefer a held-out/test split if one exists. The dataset ships exactly one: `in_the_wild_test`, 327 clips (~2h), described in the README as:

> `in_the_wild_test` | 327 | ~2 | **leakage-free held-out of consented in-the-wild user recordings** (phones, rooms, varied speakers) — the real-world benchmark

This is also, structurally, the smallest file in the repo (57.4 MB parquet vs. 220–440 MB per train shard), consistent with "keep the clip set small, do not bulk-download." **I downloaded only this one file** — none of the five `train-*.parquet` shards were fetched.

**Consent, quoted from the same README:** _"In-the-wild clips are included only with explicit user consent; records carry no raw IP or personal identifiers (an anonymous per-session id only, not published). Individual reciter names are not published."_ This is the dataset curator's own consent claim, not independently audited by this analyst.

**Sample extracted:** 16 of the 327 clips, chosen by spreading evenly across the split's duration distribution (1.96s–24.15s) rather than randomly, so the sample includes both short and long utterances. All 16 are `source=flywheel` (100% of this split, per the dataset's own field) — i.e. all "consented in-the-wild user recordings," not studio/scholar/TTS material. Full per-clip provenance (original parquet row index, original filename, duration, source tag) is recorded in `scripts/clips/held_out_manifest.json`. The clips are saved as individual 16 kHz mono WAVs under `scripts/clips/held_out/` (git-ignored — see `scripts/.gitignore` — re-derivable by re-running `scripts/extract_held_out_clips.py` against the downloaded parquet).

**Not pursued:** Wikimedia Commons / archive.org. The Su-śrotā held-out split already gave exactly what P2 asked for (audio paired with ground-truth transcript, a held-out split, an explicit CC BY 4.0 license, small and quick to acquire) and doing a second, separate acquisition pass for P2's fallback tier was not necessary to unblock P4/P5. If a genuinely independent (non-Su-śrotā-trained) audio source is wanted later, that fallback tier is still open.

**Not pursued at all:** YouTube, streaming, commercial devotional audio — per the explicit instruction, and unnecessary given the above.

---

## P4a — correct audio + true transcript: proxy false-positive rate

Ran `verify_against_text.score_against_text()` (decode-consensus + abstain, `N_DECODES=4`, blank penalties `{0,2,4,6}`, strict `T_OK=4`/`T_BAD=0`, consensus-wrong required — unchanged defaults from `04-*.md`) on each of the 16 clips against its own true transcript.

```
TOTAL aksharas scored: 284
  correct   = 220  (0.7746)
  incorrect =   6  (0.0211)   <- proxy false-positive rate
  unclear   =  58  (0.2042)   <- abstain rate
```

**What "proxy" means here, precisely:** this is *not* the false-positive rate `05-*.md` specifies (which needs ≥3 blind qualified Sanskrit teachers labelling every akṣara, independent of the tool). No such labels exist. The ground truth substituted here is **the dataset curators' own claim** that this transcript matches this audio — per the dataset README, in-the-wild clips are "automatically quality-graded at the akṣara level against that reference. Only clean-tier clips are included" (quoted, `09-*.md`'s sibling report `06-*.md` covers this pipeline's own self-audit: _"re-decoding every quarantined `review` clip with the current model recovered only 4.3% as model error"_ — that number is about the *training-data* auto-grader, a different component, cited here only as background, not blended into this measurement). So: **2.11% is how often the tool disagreed with the dataset's own accepted ground truth, on this 16-clip sample** — a reasonable proxy, but weaker evidence than a blind human panel.

The 6 `incorrect` flags, all inspected:

```
heldout_07  idx=6   ref='र्ख'  heard=['र्क','र्क','र्क','र्क']       (मूर्खत्वं)
heldout_09  idx=14  ref='त्वि' heard=['द्वि','द्वि','द्वि','द्व्वि']  (देवमृत्विजं)
heldout_11  idx=14  ref='त्वि' heard=['द्वि','द्वि','द्वि','द्व्वि']  (same word, different clip)
heldout_15  idx=25  ref='दा'   heard=['-','दाात्','दाात्','दाात्']    (तदात्मानं, long clip)
heldout_15  idx=26  ref='त्मा' heard=['दाात्','मा','मा','मा']          (same word)
heldout_15  idx=59  ref='मि'   heard=['मिे','मिे','मिे','मिे']         (सम्भवामि)
```

Two clear patterns, both genuinely informative for the abstain-threshold discussion in `04-*.md`:
- **Aspiration/voicing confusion** (`र्ख`→`र्क`, `त्वि`→`द्वि`, twice on the same word in two different clips) — a real, repeatable ASR confusion class, not a one-off. This is exactly the "retroflex/aspirate/conjunct akṣara" risk `04-*.md` flagged as needing extra-conservative thresholds.
- **Boundary smearing on a long clip** (`heldout_15`, 24s, idx 25–26): the model merges/misplaces two adjacent syllables around a sandhi-heavy stretch (`तदात्मानं`). Worth noting for `03-*.md`'s point about per-metre/tempo tuning and for whether very long single-clip recitations (a full śloka pair, not one pāda at a time) need chunking.

None of the 6 look like a "confidently wrong about a clearly correct syllable" case in the dangerous sense `05-*.md` worries about most (e.g. flagging a plainly correct, unambiguous akṣara as wrong for no discernible acoustic reason) — all 6 sit on genuinely acoustically-confusable pairs. That is a mildly reassuring qualitative read, not a substitute for the real measurement.

---

## P4b — correct audio + deliberately corrupted transcript

For each clip, substituted 25% of reference akṣaras (positions chosen with a fixed seed, recorded exactly) with a different real akṣara drawn from the pool of akṣaras seen across the 16 clips' own transcripts. Re-scored the *same* real audio decodes against the corrupted text, and split results into "corrupted positions" vs. "untouched (clean) neighbours."

```
CORRUPTED positions (n=72):     {correct: 0, incorrect: 65, unclear: 7}
  caught (incorrect+unclear, i.e. NOT silently passed as correct) = 100.0%
  falsely still labelled 'correct' (missed)                       =   0.0%

CLEAN (untouched) positions (n=212): {correct: 161, incorrect: 7, unclear: 44}
  false-'incorrect' rate on untouched neighbours                  =   3.30%
```

**Detection: every single deliberately-corrupted position was caught** — none were silently scored `correct`. 90.3% resolved to a confident `incorrect` (the decode and the corrupted reference genuinely diverge, so this is the expected/correct behaviour, not a surprising result architecturally — but it's the first time it's been confirmed against real audio+decode pairs rather than hand-written synthetic strings).

**The more interesting number is the 3.30% figure**: on *untouched* neighbouring akṣaras, the false-`incorrect` rate rose from the P4a baseline of 2.11% to 3.30% purely because a nearby position was corrupted. This is a real, measured **corruption-contamination / alignment-drag effect** — when the reference text is locally wrong, the edit-distance alignment can shift enough to mis-align a genuinely-correct neighbouring akṣara too. It's a modest effect (72 clean positions is a small denominator for a 7-vs-4 count difference), but it is a genuine, previously-undocumented finding worth flagging for `04-*.md`'s alignment design: **a single wrong akṣara in the reference (or a genuine child mispronunciation) can, rarely, drag a correctly-pronounced neighbour into a false `incorrect` via alignment shift, not just via acoustic confusion.**

---

## P5 — hard negatives: is the coverage-gate gap real on the actual model?

`04-*.md` predicted, from synthetic-string tests only, that silence/wrong-sloka/noise inputs would "flow into per-akṣara scoring and produce 'incorrect' flags." This is the first test of that prediction against the real model and real (or realistically synthetic) audio.

| Hard negative | Reference text | Result (n=akṣaras) |
|---|---|---|
| **Silence** (3s of zeros) | Saraswati Namastubhyam (this repo's own sloka text) | `correct=0, incorrect=4 (12.5%), unclear=28 (87.5%)` (n=32) |
| **White noise** (3s, amplitude 0.05) | same text | `correct=2 (6.25%), incorrect=4 (12.5%), unclear=26 (81.25%)` (n=32) |
| **Wrong sloka** — real speech (heldout_13, actually says "वसुदेवसुतं देवं कंसचाणूरमर्दनं...") | a genuinely different real sloka text (Guru Brahma, this repo's own text) | `correct=0, incorrect=32 (100%), unclear=0` (n=32) |
| **Truncated** — first 15% (3.6s of 24.1s) of the longest clip | that clip's own full, correct transcript | `correct=8 (12.5%), incorrect=1 (1.6%), unclear=55 (85.9%)` (n=64) |

**Reading these, worst to best:**

1. **Wrong sloka is the severe failure mode, confirmed decisively.** A child reciting one sloka correctly while the app expects a different one currently gets **every single syllable marked wrong, with zero abstention** — the worst possible experience for exactly the axis `05-*.md` identifies as the cardinal error (falsely telling a child they got something wrong). This is real audio, correctly and clearly spoken, just matched against the wrong reference. **This is the single clearest, most actionable finding in this pass: a coverage/front-gate check ahead of per-akṣara scoring is not a nice-to-have, it is required before this technique is safe to ship in any form**, exactly as `04-*.md` designed for but had not yet confirmed.

2. **Noise produced two false `correct` hits.** This is a new, distinct risk not previously called out: it's not just "false incorrect on garbage," it's that **decode-consensus can, occasionally, agree across all 4 blank-penalty variants on a syllable that happens to match the reference purely by chance**, because the 4 "variants" are re-argmaxes of the *same* frozen encoder output, not independent re-encodes — they can correlate more than a true ensemble would. Two false `correct`s out of 32 on pure noise is small, but it's a real, previously-undocumented mechanism worth flagging for `05-*.md`'s design discussion: consensus alone doesn't guarantee independence.

3. **Silence is bad (12.5% false `incorrect`) but not catastrophic**, and mostly (87.5%) correctly abstains.

4. **Truncation is the best-handled case** — only 1.6% false `incorrect`; the missing tail of the recording mostly (85.9%) routes to `unclear`, which is the safe, designed-for behaviour (a deletion in the alignment, not a mismatch). This suggests the *design* is doing its job for the "ran out of audio" case; it is specifically **whole-content mismatch** (wrong sloka) and **content-free audio** (noise, silence) where the current pipeline has no defence, because there is currently no explicit coverage/voice-activity check before per-akṣara scoring runs at all — precisely the gap `04-*.md` named.

**Acceptance check against `05-*.md`'s own protocol step 6** ("none of these produce `incorrect` on any akṣara — Any `incorrect` here is a protocol failure, not a tuning issue"): **fails**, clearly, on 3 of 4 probes (silence, noise, wrong-sloka). This is exactly the kind of measured "no" that report is for.

---

## Bonus, cheap to gather: CPU inference latency (feeds `08-*.md`'s D2)

Measured (native CPU PyTorch, 4 threads, this machine — **not** a WASM/browser measurement, not simulated):

| clip | audio duration | forward+decode wall time | real-time factor |
|---|---:|---:|---:|
| heldout_01 | 3.2s | 0.319s | 0.10 |
| heldout_08 | 5.2s | 0.509s | 0.10 |
| heldout_13 | 10.2s | 0.840s | 0.08 |
| heldout_15 | 24.1s | 2.206s | 0.09 |

Model cold-load (extraction + weight remap + construction): 18.35s (one-time cost, not per-clip). At RTF ≈ 0.09 on ordinary CPU threads, server-side CPU inference is clearly fast enough for this product's clip lengths. This says nothing about a WASM/on-device path specifically — that would need an actual export-and-run test, not attempted here — but combined with `09-*.md`'s 118 M-parameter figure for the part that matters, it removes "the model is too slow/too big to consider" as a reason to rule out D2(c) without testing it directly.

---

## Independent replication of the model card's own claimed numbers

`01-*.md` tabulated Su-śrotā's own claimed numbers on **this exact split** ("In-the-wild user audio, 327-clip leakage-free," their table, quoted): **CER 4.36%, WER 30.4%, SN-WER 10.8–13.2%** (checkpoint v13b). Running the now-working decode across all 16 sampled clips and scoring with `common_text.py`'s CER/WER/SN-WER (already-tested code, unchanged):

```
mean CER    = 5.34%   (n=16; 3.22% excluding one 24s-clip outlier at 37.1% CER; median 3.85%)
mean WER    = 37.8%
mean SN-WER = 33.43%
```

**CER is the fair comparison** (straightforward character-level edit distance on space-stripped, content-normalised text — same recipe the card documents) and it lands close to their claim: my median (3.85%) and outlier-excluded mean (3.22%) sit slightly under their 4.36%; my raw 16-clip mean (5.34%) sits slightly over, pulled up by one long clip that dropped a whole clause (`heldout_14`, see below). Given n=16 vs. their n=327, this spread is unsurprising and reads as a genuine, if noisy, independent replication of their claimed CER.

**SN-WER is not a fair comparison and should not be read as one.** `common_text.sandhi_normalised_wer` is explicitly documented in its own docstring as *"a single point estimate (the card reports a lo..hi band from alternative sandhi splits; that band is out of scope here)"* — it's a simplified proxy algorithm (character-in-order-within-a-drift-window matching), not a reimplementation of whatever the card's own SN-WER computation actually does. A 33% vs. 10.8–13.2% gap here is most likely a **methodology difference**, not a real model-quality discrepancy — flagging clearly so this number is never later mistaken for a real SN-WER measurement or blended with the card's claim.

**One concrete, worth-flagging failure mode observed directly:** `heldout_14` (13.8s, "वसुदेवसुतं देवं कंसचाणूरमर्दनं देवकीपरमानन्दं कृष्णं वन्दे जगद्गुरुं") decoded to "वसुदेवसुतं देवंं देवकीपरमानन्दं कष्ण जगद्गु" — the model **silently dropped an entire clause** ("कंसचाणूरमर्दनं", "कृष्णं वन्दे") rather than mis-transcribing it. This is a real, observed omission failure (not a substitution), relevant to both the coverage-gate discussion above and to `04-*.md`'s note about encoder ramp-up/dropout — worth keeping as a concrete example when this technique is next discussed with the educator/validation panel.

---

## Reusable artifacts (all new this session)

- `scripts/extract_held_out_clips.py` — pulls the 16-clip sample + manifest from the downloaded parquet.
- `scripts/clips/held_out_manifest.json` — full per-clip provenance (text, duration, source, original filename, parquet row).
- `scripts/run_holdout_decode.py` — real decode + CER/WER/SN-WER across all 16 clips → `holdout_decode_results.json`.
- `scripts/run_p4_p5_tests.py` — P4a/P4b/P5 exactly as reported above → `p4_p5_results.json`.
- `scripts/verify_against_text.py` — `decode_variants()` updated to use the working loader from `09-*.md` instead of the broken `restore_from()` path.
- `scripts/.gitignore` — excludes the ~2.5 GB of downloaded model/weight artifacts and the extracted third-party audio from being accidentally committed; the small JSON manifests/results are kept.

## What this does not answer

- Not a substitute for `05-*.md`'s full protocol: no blind qualified-educator labels, no children's voices, no device/mic/noise-condition matrix, no subgroup breakdown, no confidence intervals, n=16 not a powered sample.
- Not a test of legitimate regional-tradition pronunciation variants (the corpus and the corruption test both operate against a single "true" transcript).
- Does not test "child + sibling talking" or "TV/music behind" specifically — approximated only by synthetic white noise, which is a much cleaner signal than real overlapping speech would be; real background-speech hard negatives are still an open gap.
- Does not test the "replayed reference recording into the mic" hard negative (would need TTS or the reference audio itself; not attempted this session).

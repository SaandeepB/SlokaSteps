# 04 — Prototype: "verify against known text" per-syllable scoring

_Dated 2026-08-30. Research-analyst._

---

## Verdict box

| | |
|---|---|
| **What I set out to do** | Design the smallest thing that takes `expected_text` + audio and returns per-syllable **correct / incorrect / unclear**; write the script; be honest that it can't be tested yet. |
| **What I actually did** | Wrote the full design (below) and a runnable harness (`scripts/verify_against_text.py`). **Ran and passed** a 5-case offline test of the consensus + abstain *logic* (`scripts/test_verify_logic.py`) using synthetic decode strings. Did **not** run any ASR — no model, no audio. |
| **What I concluded** | The design is small and the abstain-first logic is sound on synthetic input. It is **untestable for real** without the Su-śrotā model + child recitation audio. The hard part is not the code — it is **what the abstain threshold must be tuned against**, covered in detail here and in `05`. One concrete gap surfaced by the test: a wrong-sloka / silence / noise input currently produces a pile of "incorrect" flags; the pipeline needs a **coverage gate before per-syllable scoring**. |

---

## The design (smallest viable version)

### Inputs / output

```
verify(expected_text: Devanagari, audio: 16kHz mono wav)
  -> [ { index, akshara, label: 'correct'|'incorrect'|'unclear', evidence } ]
```

`evidence` = `{ decodes: N, matched: k, heard: [...] }`. **No overall percentage. No number shown to a child.** A parent sees the per-akshara list + counts + playback of their child against the reference.

### Pipeline

1. **Normalise + segment the reference.** `expected_text` → NFC → drop daṇḍa/digits/avagraha/oṁ/Vedic accents → canonicalise (dedup doubled marks; word-final `म्` ≡ anusvāra) → segment into akṣaras. Deterministic Unicode work, no ML. `common_text.py` does this and is tested.

2. **One ASR forward pass.** Encoder + CTC head on the Sanskrit slice (`02`). This is the only expensive step.

3. **K cheap decode variants.** Re-argmax the same CTC log-probs K times with the **blank column penalised** by each value in a grid (prototype: `{0, 2, 4, 6}`, K=4). No re-encoding. Rationale from the experiment log's finding #5 (quoted): _"CTC is spiky: a correctly-heard syllable fires at one frame with blank ('continuation') around it… treat blank as neutral, not as evidence against the target."_ Penalising blank recovers dropped onsets / repha; sweeping the penalty gives cheap diversity without a second model. (The Vāgbodhinī doc uses 3 decodes at `{0,3,6}`; I widened it slightly — the exact grid is a tuning parameter, not a fixed truth.)

4. **Canonicalise every decode identically to the reference**, then segment each into akṣaras.

5. **Align each decode to the reference** by akṣara-level edit distance (Needleman–Wunsch). For each reference position, record what that decode delivered (a matching akṣara, a different akṣara, or nothing = deletion).

6. **Per-reference-akṣara vote:**
   - `matched` = how many of the K decodes put the right akṣara there.
   - **correct** iff `matched >= T_OK` (strict default: `T_OK = K`, i.e. *all* decodes agree it's right).
   - **incorrect** iff `matched <= T_BAD` (strict default: 0) **and** the non-matching decodes **agree on the same wrong akṣara** (consensus-wrong).
   - **unclear** otherwise — this is the default bucket and absorbs: split decodes, deletions/ramp-up dropouts, low-agreement disagreement, everything the model isn't sure about.

7. **Return per-akṣara label + evidence.** The tutor/UI layer decides how to phrase it; it must never turn "3 of 4 decodes" into "75%".

### Knobs that are *tuning parameters*, not constants

`N_DECODES`, `BLANK_PENALTIES`, `T_OK`, `T_BAD`, whether to require consensus-wrong, and (later) a per-age-band variant of all of the above. The prototype hard-codes defaults; a real deployment tunes them against a labelled corpus (next section).

### What the harness proves today (ran, passed)

`scripts/test_verify_logic.py`, 5/5:
- 4 identical correct decodes → every akṣara `correct`.
- 4 decodes agreeing on one wrong akṣara → exactly that akṣara `incorrect`, rest `correct`.
- decodes **disagree** about a deviation → `unclear`, **never a false `incorrect`**.
- ASR drops the first two akṣaras (encoder ramp-up, the log's finding #12) → those positions `unclear`, not `incorrect`.
- garbage / wrong-sloka input → not called mostly `correct` — **but** currently yields ~7/16 `incorrect` (documented gap, see below).

This exercises the alignment + vote + abstain math with the ASR replaced by hand-written strings. It says **nothing** about real ASR behaviour.

---

## The gap the test surfaced: a coverage gate must come first

With no front gate, silence / wrong sloka / a sibling talking / the reference audio played back all flow into per-akṣara scoring and produce "incorrect" flags — the exact false-accusation the abstain design exists to prevent, just relocated.

**Fix (design, not yet built):** before step 6, compute a cheap coverage check — e.g. the best decode's aligned-match fraction against the reference, and total voiced duration vs expected. If coverage is below a floor, return an **`unavailable`** result ("we couldn't hear the whole chant — try again in a quieter spot"), never per-akṣara flags. This mirrors `docs/CHANT_COACH_ARCHITECTURE.md`'s "Low confidence returns `unable-to-evaluate`; it does not guess." `05` treats these hard negatives as first-class test cases.

---

## What the abstain threshold has to be tuned against

This is the real work, and it cannot be shortcut.

### 1. A labelled corpus that looks like the actual users
Children 4–10 reciting **this repo's slokas**, on real consumer devices, in real rooms, across the six first-language backgrounds the app serves. Collected with **verifiable parental consent** (COPPA) and DPDP-compliant handling (child = under 18; no profiling; the recording is regulated personal information). `docs/CHANT_COACH_VALIDATION_PLAN.md` §3 already specifies the balance required (age, language background, accent, device, mic, room noise, speech differences, plus silence / truncation / wrong sloka / background speech / replayed reference / corrupted files).

### 2. Ground truth that is not the model's own output
≥3 qualified Sanskrit teachers label every akṣara of every clip — **correct / incorrect / ambiguous**, plus notes on legitimate regional-tradition variation — **blind to the tool's output**. Measure inter-rater agreement; adjudicate disagreements without erasing minority-tradition readings (validation plan §4). The known reference text gives you the *target*; the teachers give you the *per-akṣara pronunciation judgement* the tool is trying to approximate.

### 3. The quantity to hold down
Among akṣaras the teacher panel agreed were pronounced **correctly**, the fraction the tool labels **`incorrect`** — the **false-alarm rate**. Everything uncertain must land in `unclear`, not `incorrect`. The secondary quantity: how often the tool abstains on clearly-correct akṣaras (`unclear` rate on correct akṣaras) — high abstention is *safe* but makes the feature feel useless, so it's a quality metric, not a safety one. **Recall — catching real errors — is explicitly the lowest priority for a child app.**

### 4. Tune separately for each condition, and re-tune on every change
- **Per age band** (4–6 / 7–8 / 9–10) — younger children's acoustics and the ASR's error profile on them differ enough that one threshold will not fit all.
- **Per recitation style** — the model is tuned for *plain* recitation. A child who sings the sloka is out of domain; those clips should probably route to `unavailable`, not be scored harder.
- **Per device / mic class** and **per room-noise level** — SN-WER and CTC blank behaviour shift with signal quality.
- **Per metre / tempo** — a fast Anuṣṭubh vs a drawn-out Upajāti change the frame-to-akṣara ratio.
- **Per akṣara type** — retroflex / aspirate / conjunct akṣaras (`ष्ट`, `ड्ढ`, `र्ब्र`) are where both the model and children genuinely struggle; the threshold may need to be *more* conservative there, not less.
- **On every model or reference-text change** — `docs/CHANT_COACH_VALIDATION_PLAN.md` §8: a model/reference change starts a new validation version and can trigger rollback.

### 5. The threshold is not a single number
It is (mode) × (age band) × (device class) × possibly (akṣara type). "Be-strict / Be-liberal" (the Vāgbodhinī modes) are one axis of that; for a child app the default must be at or beyond "Be-strict", and there is a real argument that a child-facing build should **only** ever say `correct` or `unclear` — never `incorrect` — with `incorrect` surfaced to the parent view only. That is a product + educator decision, flagged here.

---

## Honest status

- **Design:** done, small, abstain-first, consistent with `docs/CHANT_COACH_ARCHITECTURE.md` and the documented Vāgbodhinī method.
- **Code:** `scripts/verify_against_text.py` written; the text/vote/abstain layer tested and passing on synthetic input.
- **Real test:** blocked on the Su-śrotā model (`02`) and on a consented child-recitation corpus that does not exist. No false-positive rate, no abstention rate, no accuracy — none of those numbers can be produced now, and none are invented here.

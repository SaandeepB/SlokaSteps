# 05 — Decode-consensus + abstain: false-positive rate

_Dated 2026-08-30. Research-analyst._

---

## Verdict box

| | |
|---|---|
| **What I set out to measure** | The false-positive rate of the decode-consensus + abstain scoring approach — how often it flags a correctly-chanted syllable as wrong. |
| **What I actually did** | Confirmed from the primary sources that this approach is what the Su-śrotā project actually shipped and *why*. Defined "false positive" for a child app. Specified the full test protocol and the clip set that would credibly measure it. Ran **no measurement** — no model, no clips. |
| **What I concluded** | **Blocked — no false-positive rate can be produced, and none is invented here.** The blocker is a consented child-recitation corpus with blind expert per-syllable labels; that corpus does not exist. The experiment log itself reports **no false-positive number** — it moved to this approach precisely because GOP scoring was _"too false-positive-prone for a tutor"_ (qualitative), and it manages the risk by design (abstain), not by a measured bound. |

---

## What the sources actually say (read 2026-08-30)

From `github.com/prathoshap/sushrota-sanskrit-asr` README and `docs/VAGBODHINI_2026-07-13.md`:

- **Experiment #14, quoted:** _"GOP forced alignment … validated (AUC 0.97–0.99) but **too false-positive-prone for a tutor** → superseded."_ So the AUC-0.97–0.99 figure is theirs, for the *superseded* GOP approach, and the reason it was dropped is false positives — stated qualitatively, no rate given.
- **Experiment #15 / §6, quoted:** the shipped approach is _"akshara-level text comparison of the ASR decode vs the reference, made robust by **decode-consensus + abstain**: only flag a syllable red when several decodes agree; when the model is unsure, say 'unclear' rather than falsely accuse."_
- **Scoring mechanism (VAGBODHINI §5), quoted:** _"One forward pass → 3 greedy decodes at blank penalties {0,3,6}… Be-strict (default): green only if ALL decodes match; red if NO decode matches; else amber… amber = 'unclear' — the tool abstains rather than confidently false-accuse."_
- **Design principle, quoted:** _"never confidently wrong, and always verifiable. The ASR (~6% CER) is imperfect, so the tool points and the user's ear judges."_
- **The summariser of the system doc explicitly noted:** _"No false-positive analysis or quantitative numbers are provided."_ I confirmed this against the fetched text — there is no false-positive rate anywhere in the Su-śrotā materials.
- Indirect signal only: experiment #20, quoted — _"re-decoding every quarantined `review` clip with the current model recovered only 4.3% as model error."_ That is about the *training-data auto-grader*, a different component (it decides which flywheel clips are clean enough to train on), not the tutor's per-syllable false-positive rate. Do not conflate them.

**Net:** the approach is real and shipped, the concern is real and named, but there is no published false-positive rate to cite or to beat.

---

## What "false positive" means for a child-facing app

A **false positive** = the tool tells a child (or their parent) that a syllable was chanted **wrong** when a qualified Sanskrit teacher, hearing the same clip, judges it **correct** — including "correct within an accepted regional or family tradition."

Why this is the cardinal error here, and worse than a miss:
- The text is sacred and the child is 4–10. Being wrongly told they mispronounced a prayer teaches self-doubt about something their family may chant daily, and can directly contradict how their tradition actually says it.
- A **false negative** (missing a real error) costs almost nothing in this product: the child simply doesn't get that correction this round. The "listen to the teacher" and "chant with the teacher" activities, and actual humans, are still there. The app's whole stance (`AGENTS.md`, `docs/CHANT_COACH_ARCHITECTURE.md`) is encouragement-first and "never invent scores."
- Therefore the asymmetry is extreme: a design that **abstains** on 60% of syllables and is **never wrong** on the 40% it does judge is far more acceptable than one that judges everything and is wrong 5% of the time.

Corollaries for how to report the metric:
- The rate must be computed **only over syllables the expert panel agreed were correct** (the denominator is "correct syllables," the numerator is "correct syllables the tool flagged incorrect").
- `unclear` on a correct syllable is **not** a false positive — it is the system working as designed. Report it separately as an abstention rate (a usefulness metric, not a safety one).
- Report the **worst subgroup**, not the mean (see protocol step 5). A 1% mean that hides 12% on 4-year-olds on cheap tablet mics is a failure.

---

## Test protocol (exact)

**Precondition:** the Su-śrotā model running (`02`) and the `verify_against_text.py` pipeline with the coverage gate added (`04`).

1. **Assemble the clip set** (spec below).
2. **Blind expert labelling.** ≥3 qualified Sanskrit educators independently label **every akṣara of every clip**: `correct` / `incorrect` / `ambiguous`, plus a free-text note for regional-tradition variants. They do **not** see the tool's output. Provide the reference text and audio only. (`docs/CHANT_COACH_VALIDATION_PLAN.md` §4.)
3. **Adjudicate + measure agreement.** Compute inter-rater agreement (e.g. Krippendorff's α) per dimension. Adjudicate material disagreements; keep minority-tradition notes. Freeze the adjudicated ground truth.
4. **Run the tool** across the full parameter grid: mode ∈ {strict, and any child-only "correct/unclear-only" mode}, blank-penalty grid, `T_OK`/`T_BAD`, and any per-age-band variants. For each configuration:
   - **False-positive rate** = P(tool = `incorrect` | panel = `correct`), with a Wilson or bootstrap 95% interval.
   - **Abstention rate on correct** = P(tool = `unclear` | panel = `correct`).
   - **Detection rate** (secondary) = P(tool = `incorrect` | panel = `incorrect`).
   - **Error-localisation** — when the tool and panel both say an error exists in a pāda, do they point at the same akṣara.
5. **Subgroup breakdown — this is the report, not an appendix.** Slice every metric by: age band (4–6 / 7–8 / 9–10); first-language background (en/hi/te/kn/ta/mr families); device & mic class; room-noise level; sloka; metre/tempo; recitation style (plain vs melodic); and **akṣara type** (simple vs retroflex/aspirate/conjunct). Report confusion matrices, CIs, and the worst-case examples — per the validation plan §5, _"not just one aggregate score."_
6. **Hard-negative pass.** Run the silence / wrong-sloka / background-speech / replayed-reference / truncated / corrupted clips. **Acceptance:** none of these produce `incorrect` on any akṣara — they must resolve to `unavailable` or `unclear`. Any `incorrect` here is a protocol failure, not a tuning issue.
7. **Go/no-go.** The qualified educators + child-safety reviewers + a statistician set the acceptance thresholds **before** step 4 (the validation plan deliberately refuses to pre-invent one). Only then does a number "pass."

---

## The clip set that would credibly measure it

| Property | Requirement |
|---|---|
| **Speakers** | Children 4–10 (the actual users). A parallel consenting-adult set is useful for pipeline debugging but **cannot** substitute for the child numbers. |
| **Coverage of correct chanting** | Deliberately over-sample **strong** child reciters, so the "correct akṣara" denominator is large and the false-positive rate is tightly estimated. A set full of beginners making real errors measures detection, not false positives. |
| **Balance** | Across age bands, the six first-language backgrounds, genders, ≥3 device/mic classes (phone, tablet, cheap headset), quiet and noisy rooms, plain and melodic delivery. |
| **Material** | This repo's 7 `complete` slokas (add the 2 coming-soon if their activities ship). 2–3 takes per child. |
| **Hard negatives** | Silence; wrong sloka; child + sibling talking; TV/music behind; the reference recording played into the mic; a clip cut off mid-verse; a corrupted upload. |
| **Size** | Enough that the **worst subgroup** has a confidence interval tight enough for the reviewers to decide on. As a rough floor: ≥30 children, ≥3 clips each, ≥3 device classes — but the real N comes from the reviewers' target precision and the base rate of correct akṣaras, which I cannot set here. Under-powering the worst subgroup is the classic failure (the log's own finding #3: _"small held-outs mislead"_ — a 48-clip set gave ~24% CER where a 327-clip set showed ~5–8%). |
| **Consent & handling** | Verifiable parental consent (COPPA). DPDP: child = under 18, verifiable parental consent, **no profiling**. The clips are regulated personal information; **separate, explicit consent** is required before any of them are used to improve a model (COPPA treats AI-training use as a distinct purpose). De-identify research records; minimise retention; deletion on request. |

---

## Honest status

- **Approach:** confirmed as the shipped Su-śrotā method, with primary-source quotes.
- **"False positive" for this app:** defined, with the asymmetry argument.
- **Protocol + clip set:** specified in full.
- **A false-positive rate:** **not measured, not estimated, not invented.** Blocked on the consented child corpus + blind expert labels. "Blocked, here is exactly what unblocks it" is the complete answer.

# DECISIONS.md — Sloka Steps

Product and engineering decisions made where the specification left room for
judgment. None of these affect product safety or correctness guarantees.

## Architecture

1. **Scaffold written directly, not via `npm create vite`.** The interactive
   scaffolder can misbehave in a non-empty directory and prompts for input;
   the equivalent template files (Vite 6 + React 19 + TS strict, same
   tsconfig layout as the official `react-ts` template) were written
   explicitly into the project root so nothing could land in a nested folder.
2. **Language and daily goal live in `UserSettings`, not `ChildProfile`.**
   Setup collects them together, but they are settings a parent may change
   later; keeping one source of truth avoids sync bugs. `ChildProfile` holds
   `displayName` and `ageRange` only.
3. **`lastCompletion` is runtime-only state.** The completion screen reads
   the result of the just-finished lesson from memory; it is intentionally
   excluded from the persisted schema, so a refresh on `/complete/:id`
   safely redirects to the learning path.
4. **Reducer imports static content.** Unlock/award guards live inside the
   reducer (`isLessonEnterable`) so no action — including hand-crafted
   ones — can complete a locked or coming-soon lesson. Content is static
   typed data, so this stays pure and testable.
5. **The `completion` activity is a marker, not a screen.** The engine
   dispatches `COMPLETE_LESSON` from the final interactive step's button
   handler (never from an effect, avoiding StrictMode double-dispatch) and
   navigates to `/complete/:slokaId`, which renders the celebration.
6. **Estimated minutes: 1 minute per finished activity.** A deliberately
   simple, surveillance-free approximation for the daily goal
   (`ESTIMATED_MINUTES_PER_ACTIVITY` in `src/utils/rewards.ts`).
7. **Practice completions count as streak-qualifying.** The same-day rule
   already prevents inflation (multiple completions on one day never
   increment twice), and punishing practice would contradict the
   encouragement-first design.
8. **History capped at 100 entries** to bound localStorage growth; the
   dashboard shows the latest 20.

## Content and localization

9. **Match pairs are whole lines.** Each line's transliteration matches its
   child-friendly line meaning — big touch targets and age-appropriate
   difficulty for 4–10.
10. **Fill-blank distractors are hand-picked** per sloka from other words of
    the same sloka (always 3 options), so options are plausible but fair.
11. **UI translation coverage:** all six languages fully cover the required
    navigation/control keys plus common lesson strings (~50 keys each);
    longer prose (privacy page, some parent-area text) intentionally falls
    back to English and is flagged in the Parent Area notice. All non-English
    packs are marked `prototype-draft`.
12. **Sloka meanings ship in English (all 8) and Hindi (the 6 interactive
    lessons).** Telugu, Kannada, Tamil, and Marathi meanings fall back to
    English pending qualified review — honest fallback was preferred over
    machine-quality translations of religious content.
13. **No regional-script (Telugu/Kannada/Tamil) renderings of the Sanskrit
    text ship in V1.** The data model supports them (`regionalScripts`), but
    generating them mechanically risks errors in sacred text. The UI shows
    the documented fallback notice instead.
14. **Badge names are English-only in V1** (proper-noun-like reward names);
    localizing them is listed for the content-review pass.
15. **Theme strings are English-only in V1**; the meaning card carries the
    localized substance of each lesson.

## Audio

16. **Speech synthesis uses the `hi-IN` voice** as the closest widely
    available approximation for Devanagari-based text, clearly labeled in
    the UI as "a simple computer voice, not a Sanskrit teacher."
17. **Repeat/full-chant steps gate Continue on a recording attempt** (per
    spec) but any microphone error or unsupported browser unlocks
    Continue/finish immediately — recording can never block a lesson.
18. **Recording playback uses a custom button over an `Audio` element**
    (consistent, child-sized controls) rather than native `<audio controls>`.

## Design

19. **Primary action color is deep teal** (contrast ≥ 4.5:1 with white
    text); saffron is reserved for accents, stars, and progress. The palette
    follows the suggested warm cream / saffron / teal / sky / lavender /
    lotus scheme with an added soft leaf green for success states.
20. **Fonts are system stacks** (Nirmala UI ships with Windows and covers
    Devanagari, Telugu, Kannada, and Tamil; Noto Sans fallbacks elsewhere).
    No runtime font downloads, per the privacy guardrail.
21. **Desktop layout centers a tablet-width column (max-w-3xl)** over soft
    radial background decoration, so the app never looks like a bare mobile
    strip on a large screen.

---

# Version 2 / 3 — evaluation contract

Decisions taken while designing the chant evaluation contract. Evidence for
each lives in `research/pronunciation-ai/`.

## Child-facing feedback

1. **A child is never shown "incorrect" (D5).** The child surface shows only
   `matched` and `unclear`; deviations are confined to the parent view.
   Measured false-positive rate on correct audio matched against its true
   transcript was 2.1% (`research/pronunciation-ai/10`), which on a
   32-syllable sloka means roughly every other attempt would wrongly tell a
   child who chanted correctly that they got something wrong. Missing a real
   mispronunciation costs a repeat attempt; falsely correcting a child costs
   their confidence. The errors are not symmetric and are not treated as such.
2. **This lives in the presentation layer, not the type.** The parent view
   legitimately needs `deviation`, so banning it from the contract would
   destroy the feature's only useful output. `VerifiedChantEvaluation` is
   identical under either answer; a single projection function applies the
   policy.
3. **Feedback may be tiered by `ageBand`.** `ChantEvaluationRequest` already
   carries it. Both the abstain threshold and feedback sternness may vary by
   age — be more willing to abstain for younger children. This is a
   pedagogical decision only.

## Age and privacy

4. **Age is not used as a privacy or legal gate.** Self-declared age cannot
   gate a legal obligation, the app is child-directed under COPPA on its
   objective characteristics (mascot, age bands topping out at 10, rewards,
   parent gate), and India's DPDP defines a child as anyone under 18 — so
   there is no meaningful adult tier among the current audience. Using age as
   a gate would additionally require collecting verified age, i.e. more
   identity data from children, which `AGENTS.md` forbids and which is the
   opposite of the goal.
5. **Privacy is settled by where inference runs, not by who is using it.**
   If audio never leaves the device, the consent regime never triggers, for
   every user at every age. This is why on-device is the preferred target.
6. **An adult audience is a product track, not a privacy strategy.** Adults
   learning slokas is a real and probably larger market, worth pursuing on
   its own merits. It would require a genuine adult path (setup flow,
   surface, copy) and an `AgeBand` change touching ~17 files plus a
   persistence migration. It does not reduce child-privacy obligations,
   because under-18 covers most of the users it would add.

## Where inference runs (D2) — deferred, not decided

7. **No backend.** Nothing in the contract requires one, and none is
   proposed. The "no backend without explicit request" rule stands.
8. **On-device is the target, pending two bounded tests.** ONNX export of the
   encoder + CTC head is clean (opset 17, standard ops only); fp16 is
   accuracy-free (byte-identical decodes, 16/16 clips); int8 dynamic
   quantization nearly doubled CER and ran ~5x slower, so it is not viable as
   tested. Two things remain unproven: a real `onnxruntime-web` browser
   benchmark, and a JS/WASM mel-feature extractor, because the raw-audio
   preprocessor cannot export (`torch.stft` complex-type limitation).
   See `research/pronunciation-ai/11`.

## On-device Chant Coach — shipped to internal testing (2026-09-18)

The two D2 unknowns above are now resolved, and the analyzer ships behind the
validation plan's stage-1–2 gates. Decisions taken:

9. **D2 resolved to on-device (c), fp16, WebGPU with wasm fallback.** The two
   open tests passed: the mel preprocessor was ported to TypeScript and holds
   to the checkpoint's own eval-mode output on real audio
   (`src/test/chantFrontend.test.ts`), and the fp16 ONNX graph runs in the
   browser via `onnxruntime-web` in a dedicated worker. Verified end to end in
   Edge/WebGPU on real held-out audio: JS features → ONNX → JS decode reproduce
   the Python pipeline's decode strings on every non-degenerate clip
   (`src/test/model/chantModelParity.test.ts`, 84/84 variants; digital silence
   excepted — its logits sit at the numeric noise floor where the decode string
   is ORT-version-dependent, so it is asserted on its safety property instead).
   int8 stays rejected (accuracy and speed both worse, per `11`). No backend was
   added; audio never leaves the device; `allowModelTraining` stays `false`.
10. **Weights are provisioned, never bundled.** The Su-śrotā checkpoint has no
    explicit licence grant (`research/pronunciation-ai/06`), so the ~235 MB of
    assets live in git-ignored `models-local/chant/`, are served by a vite
    middleware in dev/preview, and are deployed separately in production
    (`docs/WEB_DEPLOYMENT.md`). Absent assets degrade to participation-only.
11. **D4 (adopt the interface changes) — yes, already done.** The unified
    `ChantEvaluationService` and the `verified` provenance were the contract the
    analyzer targets. It registers into a single scored slot at runtime; the
    default remains `ParticipationEvaluationService`, and clearing the slot
    restores it everywhere at once.
12. **D5 (child never sees "incorrect") — upheld in the UI.** `ChantFeedback`
    renders a deliberately two-state child surface: `matched` vs. a gentle
    "keep practicing" that folds in BOTH `deviation` and `unclear`. A false
    positive can therefore only ever under-claim, never accuse. The precise
    matched/deviation/unclear breakdown stays in the result for the parent
    summary and the dev Chant Lab.
13. **D7 (coverage gate before per-akṣara scoring) — built and gating.**
    `coverage.ts` runs before any segment verdict and refuses wrong-text,
    silence, and noise (the measured hard negatives) with an enumerated
    unavailable reason. Its thresholds are provisional, calibrated only against
    the adult fixture set, and pinned by `src/test/chantCoverage.test.ts`; they
    must be re-derived against a labelled child corpus before stage 3.
14. **The chant check is a per-recording convenience, not a longitudinal
    record.** Nothing persists per-akṣara scores against a child profile
    (`FUTURE_ROADMAP` #4 / the DPDP "profiling" question is untouched):
    compute-and-show-once only, and rewards stay independent of the outcome.

## Graded Chant Test — self-referenced, gates completion (2026-09-18)

A separate feature from the ASR Chant Coach above, added at the product owner's
request for a real graded test rather than unconditional completion.

15. **Grading is audio-to-audio against the learner's OWN reference, not a
    teacher recording.** Measured first: cross-speaker spectral matching
    overlaps (a different recitation can outscore a correct one across voices —
    `research/pronunciation-ai/test_audio_similarity.py`), so grading a child
    against an adult teacher would penalise the voice, not the pronunciation.
    Same-speaker retakes separate cleanly (0.81–0.92 vs ≤0.58; a 0.64 bar gives
    0% false-reject / 0% false-accept on the probe — `test_self_reference.py`).
    So the learner records their own reference; attempts are graded against it.
16. **Scorer needs no model.** MFCC+CMVN+DTW over the mel frontend, using
    committed licence-free mel constants (a standard librosa filterbank + hann
    window, not the Su-śrotā weights). Ported faithfully from Python and held to
    it by committed fixtures (`chantSimilarity`, `model/similarityParity`).
17. **This deliberately reverses "recording never blocks a lesson" — for the
    Chant Test step only, and never on a technical fault.** The final full-chant
    step gates completion on passing, and stars come from the grade
    (`COMPLETE_LESSON.testStars`). But a microphone that is off, unsupported, or
    failing always unlocks finishing (ungraded), so the accessibility guarantee
    holds: only a real low-similarity *result* gates, never a tech problem.
    Retries are unlimited. The first take saves the reference (a baseline,
    honestly not a grade), so it never shows a fake 100%.
18. **References are stored on-device (IndexedDB), deletable, never uploaded.**
    They are the learner's own voice recorded deliberately as a reference — a
    different category from captured child practice audio — and exist only to
    grade the learner against themselves. Self-reference measures consistency,
    not authoritative correctness; it is honestly framed as such and is not a
    qualified-teacher standard.

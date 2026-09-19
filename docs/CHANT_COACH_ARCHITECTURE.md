# Chant Coach architecture

Chant Coach is an on-device analyzer in the **internal-testing** stage of
`CHANT_COACH_VALIDATION_PLAN.md` (§8 stage 1–2). It runs entirely in the
browser, never uploads audio, and is gated three ways: the build-time
`chantCoachEnabled` flag, a parent-only preference (`onDeviceChantCheck`,
default **off**), and the presence of locally provisioned model assets. With
any gate closed, recordings receive participation-only encouragement exactly as
before. It must never imply that its output is a qualified teacher's judgement:
every child-facing surface carries the "coach preview — in family testing"
label and the "checked against the sloka text on this device" provenance note.

## What it does, and does not, claim

The analyzer compares the recording against the sloka's reference **text** (not
against an approved recording), abstaining per-akṣara wherever the decode
consensus is absent, and refusing the whole recording through a coverage gate
before any per-segment verdict exists. It therefore produces a `verified`
result, never an `analyzed` one — see `src/types/chant.ts`. Its thresholds are
provisional and not yet educator-validated; the staged-release gates in
`CHANT_COACH_VALIDATION_PLAN.md` still govern any move beyond internal testing.
The measured basis for the coverage gate (wrong-text input producing 32/32
false deviations without it) is in `research/pronunciation-ai/10`.

## Pipeline (all on-device)

```text
session-only Blob -> Web Audio decode to 16 kHz mono -> energy VAD (voicedMs)
  -> log-mel frontend (melFrontend.ts) -> ONNX encoder+CTC (worker, WebGPU/wasm)
  -> Sanskrit-slice greedy decode x4 blank penalties (ctcDecode.ts)
  -> coverage gate (coverage.ts) --insufficient--> unscored `unavailable`
                                 --sufficient----> per-akṣara verify + abstain
  -> VerifiedChantEvaluation (segments: matched | deviation | unclear)
```

Every layer is a verified TypeScript port of the research harness, held to
byte-identical output against the real checkpoint by the fixtures under
`src/test/fixtures/chant/` (`chantText`, `chantFrontend`, `chantScore`,
`chantCoverage`, and the end-to-end `model/chantModelParity` suite).

## User experience boundary

A future completed sloka may offer:

1. Listen to the teacher.
2. Chant with the teacher.
3. Chant by myself.
4. Try Chant Coach.

The first three can use local reviewed playback and session-only recording.
The fourth remains “Coming in a future update” until the validation and privacy
release gates are complete. Recording failure can never block lesson progress.

## Separate evaluation dimensions

- **Audio quality and confidence:** whether the signal is usable at all.
- **Completeness:** whether expected segments appear, without judging accent.
- **Pronunciation:** segment-level evidence reviewed against an appropriate
  reference and tradition.
- **Rhythm and pauses:** timing relative to the chosen reference.
- **Melody:** optional and meaningful only for a compatible melodic reference.

Do not collapse these into one unexplained percentage. Each dimension has its
own status, optional score, confidence, and child-friendly message. Low
confidence returns `unable-to-evaluate`; it does not guess.

## References and traditions

`ChantReference` identifies a reviewed, versioned reference with a recitation
style: plain, melodic, Vedic, or teacher-specific. References may carry slow
audio, waveform, pitch-contour, and alignment assets.

- Do not assume one universally correct tune or raaga.
- Keep distinct traditions and teacher versions separate and visibly labeled.
- Only `approved` references can support child-facing evaluation.
- A changed audio checksum or alignment creates a new reviewable version.
- Sanskrit pronunciation and cultural reviewers approve different concerns.

## Service boundary

`ChantEvaluationService.evaluate(request)` accepts a session-only `Blob`, sloka
and reference IDs, age band, and explicitly requested dimensions. It returns a
versioned result whose dimensions remain separate.

- `ParticipationEvaluationService` (`services/pronunciation.ts`) is the default
  registered evaluator: it inspects nothing and returns participation-only
  encouragement whose type cannot carry a score.
- `OnDeviceChantEvaluationService` (`services/chantAnalysis/`) is the shipped
  analyzer. The Chant Coach runtime registers it into the single scored slot
  only after the worker loads; clearing the slot (parent toggle off, worker
  disposed) restores participation-only behaviour everywhere at once. Call
  sites keep calling `getEvaluationService()` and never learn which is active —
  the result's `provenance` is the only truth about what happened.
- `MockChantEvaluationService`, `LocalPitchEvaluationService`, and
  `ServerChantEvaluationService` remain fail-closed placeholders for UI
  development and future cloud/pitch work; none inspect or upload audio.

Provider clients must live behind this domain interface. UI components must not
know vendor request formats or API keys.

## Privacy and data flow

The default path is local and ephemeral:

```text
explicit Record press -> in-memory Blob -> local playback -> delete/unmount
```

Cloud evaluation requires a parent to enable it separately, a just-in-time
notice, a protected server endpoint, minimized encrypted transfer, enforced
retention/deletion, vendor review, and the ability to withdraw consent. Browser
code never contains provider secrets. Recordings are not retained or used for
training by default, and `allowModelTraining` remains `false`.

## Failure and safety behavior

- Unsupported APIs, denied permission, poor signal, missing assets, offline
  state, and service errors all yield calm `unable-to-evaluate` guidance.
- Never award lesson completion, XP, or a badge based only on passive listening
  or an unavailable evaluation.
- Do not show raw waveforms, filenames, model internals, or technical errors to
  children in production.
- Cancel pending permission and evaluation work on navigation; stop media tracks
  and revoke object URLs on every exit path.

## Release requirements

The analyzer is in the internal-testing stage. Moving it beyond that — to a
consented parent-supervised study and then any broader release — still requires
everything the validation plan lists: educator-defined acceptance criteria,
reviewed references where audio-reference dimensions are enabled, per-dimension
validation on a consented corpus across every supported subgroup, recorded
privacy/security/legal reviews, human escalation and correction paths, and
production monitoring that detects harm without retaining child audio or
identifiers. Two invariants hold at every stage: `allowModelTraining` stays
`false`, and lesson rewards (XP, stars, badges) stay independent of evaluation
availability and outcome.


# Chant Coach architecture

Chant Coach is a disabled future feature. It must never imply that prototype,
mock, or unvalidated processing can judge a child's Sanskrit pronunciation.
The current feature flag is `false`; the development Chant Lab provides only
structured placeholders and does not analyze or upload audio.

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

- `MockChantEvaluationService` is for UI development. It does not inspect audio,
  labels every result simulated, returns `unable-to-evaluate`, and omits scores.
- `LocalPitchEvaluationService` is a placeholder for optional on-device signal
  processing. It currently returns unavailable with no score.
- `ServerChantEvaluationService` is a fail-closed placeholder. It performs no
  network request and throws an `unable-to-evaluate` error.

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

Keep `chantCoachEnabled` false until approved reference recordings exist, the
validation plan passes for every enabled dimension and supported population,
privacy/security/legal reviews are recorded, human escalation and correction
paths exist, and production monitoring can detect harm without retaining child
audio or identifiers unnecessarily.


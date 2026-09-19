# Chant Coach validation plan

This plan defines evidence required before Chant Coach can move beyond a
disabled prototype. It deliberately sets no invented accuracy threshold;
qualified pronunciation educators, child-safety reviewers, and statistical
specialists must define acceptance criteria before evaluation begins.

> **Current stage (2026-09-18): §8 stage 1–2, internal / adult testing.** The
> on-device analyzer is implemented and running behind a parent-off-by-default
> toggle, with a "coach preview — in family testing" label on every child-facing
> surface. What software could verify has been verified: byte-for-byte parity
> with the research checkpoint across all layers, the coverage gate refusing the
> measured hard negatives (wrong-text, silence, noise), fail-closed behaviour on
> every error path, and an end-to-end browser run on real held-out audio
> (WebGPU). What this plan reserves for people has **not** been done and is not
> claimed: no educator-defined acceptance criteria, no reviewed reference
> recordings, no consented child corpus, no blind expert ground truth, no
> subgroup validation, and no legal review. Stages 3–5 remain gated on those.
> Thresholds in `services/chantAnalysis/coverage.ts` are provisional, calibrated
> only against the small adult fixture set, and must be re-derived against a
> labelled corpus before any move past internal testing.

## 1. Define intended use

- State the supported slokas, age bands, languages, devices, environments,
  recitation styles, reference traditions, and evaluation dimensions.
- State exclusions explicitly. A model validated for plain recitation must not
  score melodic or Vedic chanting without separate evidence.
- Keep lesson rewards independent from evaluation availability or outcome.

## 2. Build reviewed references

- Record qualified teachers with documented consent and tradition labels.
- Review text segmentation, pronunciation, pauses, melody where applicable,
  recording quality, and child-facing attribution.
- Version audio, checksum, alignments, waveform data, and pitch contours.
- Retain multiple approved references where legitimate variations exist.

## 3. Assemble an evaluation corpus

- Obtain explicit, reviewed consent before collecting any child voice data.
- Minimize retention and de-identify research records where valid and safe.
- Balance age bands, supported language backgrounds, accents, genders, devices,
  microphones, room noise, speech differences, and recitation experience.
- Include silence, truncated audio, wrong sloka, background speech, replayed
  teacher audio, severe noise, and adversarial/corrupted files.
- Keep training, tuning, and final test participants separate.

## 4. Establish ground truth

- Use multiple qualified raters who are blind to model output.
- Write dimension-specific rubrics before rating; do not substitute overall
  “sounds good” judgments.
- Record tradition/reference compatibility and legitimate variation.
- Measure inter-rater agreement and adjudicate material disagreements without
  erasing minority-tradition notes.

## 5. Validate each dimension

- **Audio quality:** unusable-audio detection, false rejection, and calibration.
- **Completeness:** segment recall/precision and handling of repetition, restart,
  omission, and extra speech.
- **Pronunciation:** agreement with adjudicated segment judgments, error
  localization, and accent/dialect subgroup performance.
- **Rhythm:** timing deviation and agreement with reviewed pause/tempo ranges.
- **Melody:** contour agreement only for compatible melodic references.
- **Confidence:** calibration; low-confidence cases must reliably abstain.

Report confusion matrices, confidence intervals, subgroup results, and worst-case
examples—not just one aggregate score.

## 6. Validate child-facing behavior

- Educators review every feedback template for clarity and pedagogical value.
- Children must never see shame, definitive spiritual/cultural claims, technical
  model language, or feedback beyond the evidence available.
- Test that `unable-to-evaluate` is common and reassuring for bad or unsupported
  input, and that repeated failure does not trap the lesson.
- Verify accessibility without audio-only instructions or color-only status.

## 7. Privacy, security, and operational validation

- Threat-model microphone permission, blobs, object URLs, upload, storage,
  logs, vendors, deletion, incident response, and administrator access.
- Prove browser bundles contain no API keys and that the server rejects
  unauthorized, oversized, malformed, or unsupported requests.
- Verify retention/deletion in practice and prohibit model-training reuse.
- Run permission-race, navigation, offline, timeout, cancellation, and service
  outage tests. Fail closed without uploading when cloud evaluation is off.

## 8. Staged release

1. Internal adults using non-child test audio.
2. Expert review with approved references and scripted edge cases.
3. Small, consented parent-supervised study with independent safety oversight.
4. Limited opt-in release with the ability to disable immediately.
5. Broader release only after predefined gates pass across all subgroups.

Every stage requires a written go/no-go decision. Monitor abstention, complaints,
disagreement with experts, subgroup disparities, and harmful feedback without
retaining raw child audio longer than approved. A model/reference change starts
a new validation version and can trigger rollback.


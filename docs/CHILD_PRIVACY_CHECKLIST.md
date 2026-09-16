# Child privacy engineering checklist

This is an engineering checklist, not legal advice or a claim of compliance.
Obtain formal privacy and legal review before production distribution or any
feature that transmits a child's data or voice.

## Data minimization

- [ ] Collect only a nickname, age band (`4-6`, `7-8`, or `9-10`), and learning
  preferences. Do not request a legal name or exact birth date.
- [ ] Do not collect precise location, address, school, contacts, photos,
  phone number, email address, advertising identifiers, or social handles.
- [ ] Do not add targeted advertising or behavioral profiling.
- [ ] Keep child and parent fields documented in the persisted-state schema.
- [ ] Review every new field for purpose, retention, visibility, and deletion.

## Local progress and reset

- [ ] Store progress through the versioned repository abstraction, under only
  the application's owned key(s).
- [ ] Migrate older schemas without silently deleting valid progress.
- [ ] Treat malformed storage defensively and never clear unrelated keys.
- [ ] Require the parent confirmation flow before reset.
- [ ] Verify reset removes profile/progress data and document whether an empty
  default record is subsequently saved.

## Microphone and recordings

- [ ] Default `allowMicrophone` to `true`, but request permission only after an
  explicit press and let the parent disable microphone activities.
- [ ] Default `retainPracticeRecordings` and `allowCloudEvaluation` to `false`.
- [ ] Keep `allowModelTraining` permanently `false` in this foundation.
- [ ] Keep recordings in memory by default; do not put blobs or object URLs in
  localStorage, IndexedDB, logs, analytics, crash reports, or URLs.
- [ ] Stop every media track and revoke every object URL on stop, replacement,
  reset, navigation, permission failure, and unmount—including a permission
  promise that resolves after navigation.
- [ ] Provide a complete non-microphone path through every lesson.

## Cloud or third-party processing

- [ ] Never send recordings to a paid TTS or evaluation provider directly from
  the browser. Never expose provider keys through `VITE_` variables.
- [ ] Require a protected service, explicit parent opt-in, a clear just-in-time
  notice, transport security, deletion policy, processor review, and audit log
  before any cloud evaluation.
- [ ] Send the minimum payload and use short, enforced retention.
- [ ] Do not reuse recordings for model training, product research, or quality
  review without a separately reviewed consent design.
- [ ] Inventory providers, subprocessors, regions, contracts, and failure paths.

## Community and communication

- [ ] Keep `communityEnabled` false.
- [ ] Do not expose child-facing free-text chat, direct messages, private rooms,
  external links, or contact exchange.
- [ ] Complete the gates in `LESSON_CIRCLE_SAFETY_ARCHITECTURE.md` before any
  staged community experiment.

## Product, diagnostics, and access

- [ ] Avoid guilt-based engagement, public rankings, and manipulative streaks.
- [ ] Do not add behavioral analytics without a documented privacy review.
- [ ] Scrub audio, names, storage values, and free-form text from logs/errors.
- [ ] Restrict production administration and content systems by least privilege.
- [ ] Define breach response, deletion, correction, and parent-support paths.
- [ ] Test with blocked storage, denied permissions, offline use, and corrupted
  state without exposing technical errors to children.

## Release evidence

- [ ] Data-flow diagram and current data inventory
- [ ] Threat model covering local state, microphone, build scripts, and backend
- [ ] Automated tests for disabled flags, local recording defaults, reset scope,
  migration, and absence of secrets from browser bundles
- [ ] Accessibility and child-safety review
- [ ] Privacy and legal approval recorded for the target release


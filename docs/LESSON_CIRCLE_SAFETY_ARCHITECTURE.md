# Lesson Circle safety architecture

Lesson Circle is a future community concept, not a current product feature.
`communityEnabled` is frozen to `false` in `src/config/featureFlags.ts`. There
must be no production route, navigation item, child-facing text box, direct
message system, or community network request while the flag is off.

## Non-negotiable boundary

Sloka Steps will not ship unrestricted child-to-child chat. A UI prototype is
not authorization to collect, transmit, moderate, or retain child content.
Each rollout stage requires fresh product, privacy, legal, security,
accessibility, cultural, and child-safety approval.

## Staged rollout

1. **Predefined reactions only**
   - A small, reviewed vocabulary such as encouragement or acknowledgement.
   - No custom text, media, links, usernames, search, follower graph, or direct
     messages. Rate limits and parent controls are required.
2. **Verified parent discussion**
   - Separate adult-only spaces with verified parent access, community rules,
     reporting, blocking, moderation, retention limits, and audit tooling.
   - Child profiles and learning details are not public by default.
3. **Restricted child participation**
   - Consider only after verifiable parental consent, privacy/legal review,
     automated moderation validated for all supported languages, trained human
     review, reporting, blocking, appeals, incident response, and independent
     child-safety testing.
   - Participation remains structured; unrestricted free text and private
     messaging are outside the approved design.

## Prohibited capabilities and content

The system must prohibit direct messages, private chats, external links, phone
numbers, email addresses, social-media handles, and location sharing. It must
detect and act on hate speech, bullying, harassment, sexual content, grooming,
threats, graphic violence, spam, impersonation, coercive religious recruitment,
and pressure to change religion.

Respectful educational discussion of culture or religion must not be blocked
merely because it discusses belief. Moderation policy and reviewer training
must distinguish cultural learning and disagreement from coercion, targeting,
or abuse across all six supported languages.

## Proposed service boundaries

- The child app receives only already-authorized, minimized view models.
- Identity/consent, message/reaction storage, moderation, reporting, and audit
  services remain separate protected server responsibilities.
- Every submission passes synchronous policy checks before publication and
  asynchronous review afterward. High-risk items remain quarantined.
- A policy decision records rule version, language, confidence, action, and a
  non-sensitive reason. Child-facing errors reveal no moderation internals.
- Parent tools support consent withdrawal, visibility, reporting, blocking,
  correction, and deletion.
- No moderator or model vendor may use child content for training by default.

## Abuse handling

1. Prevent contact exchange and private-channel migration at input and output.
2. Rate-limit reactions/reports and detect coordinated abuse without behavioral
   advertising profiles.
3. Quarantine urgent grooming, threat, or sexual-safety signals and escalate to
   trained reviewers under a documented incident policy.
4. Preserve only the minimum evidence legally and operationally required.
5. Notify parents and users with safe, age-appropriate explanations when
   permitted; offer meaningful appeals and correction.
6. Measure false positives across languages and traditions so safety systems do
   not suppress respectful cultural expression.

## Launch gate

The feature flag may not change until the exact stage has a threat model,
consent model, data-retention plan, moderation policy, multilingual validation,
human-operations coverage, reporting/blocking/appeals, incident drills, and
recorded legal/privacy approval. If any dependency is unavailable, Lesson
Circle stays off.


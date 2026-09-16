# Android migration roadmap

The web application remains the current product. This roadmap keeps domain and
content work portable without committing prematurely to PWA, Capacitor, React
Native, or Expo.

## Portability principles

- Keep content, types, progression, rewards, migrations, search, and feature
  policy in framework-neutral TypeScript.
- Put browser APIs behind interfaces: progress repository, audio playback,
  recording, secure narration generation, evaluation, file/cache, and lifecycle.
- Keep React pages and DOM accessibility separate from domain services.
- Use stable content IDs and schema migrations across every platform.
- Treat privacy, offline behavior, accessibility, and low-end Android performance
  as architecture constraints rather than release cleanup.

## Platform options

- **PWA:** smallest change and shared web deployment; limited native audio,
  background, file, and store capabilities vary by Android/browser.
- **Capacitor:** reuses the web UI while adding native plugins and Play Store
  packaging; requires careful lifecycle and permission testing.
- **React Native/Expo:** strongest native UI and ecosystem path, but DOM-based
  pages/styles need rebuilding. Framework-neutral content and domain services
  remain reusable.

Choose only after a short proof of concept measures audio latency, recording,
offline packs, Indic text, screen-reader behavior, bundle size, and maintenance
cost on representative low-end devices.

## Phased plan

### Phase 1 — web foundation

- Complete versioned repository interfaces and deterministic V1 migration.
- Keep six-language locale IDs, audio manifests, story/sloka content, feature
  flags, and editorial metadata independent of browser components.
- Remove direct browser-global use from domain logic and add contract tests.
- Establish performance budgets and lazy route/audio loading.

### Phase 2 — PWA readiness

- Add an app manifest, icons, install behavior, offline shell, and versioned cache
  strategy only after update/rollback behavior is designed.
- Cache approved static audio on demand; do not preload every language.
- Ensure corrected or revoked editorial assets invalidate offline caches.
- Test storage pressure, interrupted downloads, offline completion, and updates.

### Phase 3 — native adapter proof of concept

- Implement repository, playback, recording, permission, secure storage, and
  lifecycle adapters behind existing interfaces.
- Demonstrate one complete sloka and one story chapter offline.
- Measure cold start, memory, battery, audio focus, interruptions, Bluetooth,
  headphones, and microphone release on background/termination.
- Validate Indic rendering, TalkBack, font scaling, keyboard/switch access, and
  large touch targets.

### Phase 4 — migration and parity

- Define a one-time, idempotent import path for existing local progress where a
  technically and legally sound transfer is possible. Never silently reset.
- Add platform contract suites so web and Android award the same XP, streaks,
  locks, bookmarks, and completion states.
- Add deep links, safe update recovery, diagnostics without personal data, and
  parent-controlled voice settings.
- Keep Chant Coach and Lesson Circle disabled unless their independent release
  gates have passed on Android too.

### Phase 5 — release preparation

- Complete Play Families policy, privacy/legal, content/editorial, security, and
  accessibility reviews; this repository makes no compliance claim.
- Test supported Android versions and a low/mid/high device matrix, offline and
  poor-network behavior, backup/restore, uninstall/reinstall, and upgrades from
  every supported schema.
- Prepare store disclosures, data-safety declarations, parent support, incident
  response, staged rollout, rollback, and asset-correction procedures.

## Definition of portable foundation

The foundation is portable when domain suites run without DOM globals, platform
adapters pass the same contracts, approved content/audio can be selectively
cached, migrations preserve user progress, and disabling cloud/community/coach
features requires no platform-specific workaround.


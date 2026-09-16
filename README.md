# Sloka Steps

**Learn. Chant. Understand.**

Sloka Steps is a child-friendly, multilingual web application for learning
beginner Sanskrit slokas and exploring short Ramayana and Mahabharata story
chapters. It uses calm, focused activities, reviewed-content gates, local
progress, and positive reinforcement while keeping its own original visual and
learning identity.

This branch contains the **Version 2 foundation**. It preserves the working
Version 1 sloka lessons and introduces versioned preferences and persistence,
Slokas/Stories learning modes, two functional story demonstrations, a
provider-independent audio manifest, secure build-time narration tooling, and
disabled future Chant Coach and Lesson Circle architecture.

## Current status

- Seven interactive beginner sloka lessons are available; Asato Ma and Sarve
  Bhavantu remain honest coming-soon previews.
- The complete Saraswati Namastubhyam flow is preserved: introduction, line
  listening and repetition, meaning, matching, fill-in-the-blank, word
  ordering, full chant, and completion.
- The Learn experience separates **Slokas** and **Stories** and remembers the
  last selected mode.
- Ramayana and Mahabharata each have one functional development sample:
  **Ayodhya and King Dasharatha** and **The Kuru Family**.
- Story samples include five scenes, character introductions, keyboard-friendly
  ordering, three guarded comprehension questions, guided values reflection,
  recap, and completion reward.
- Both story samples are marked `editorial-review`. Development builds show
  that warning; production treats unapproved chapters as coming soon.
- Six BCP-47 language choices are structurally supported:
  `en-IN`, `hi-IN`, `te-IN`, `kn-IN`, `ta-IN`, and `mr-IN`.
- Version 1 local progress migrates into a Version 2 schema through a repository
  interface; Sloka and Story progress remain separate while XP and streak are
  shared.
- Reviewed static audio is preferred over browser speech. No approved canonical
  human recordings ship yet, so browser SpeechSynthesis remains a clearly
  labelled fallback.
- Chant Coach and Lesson Circle are feature-flagged off. Neither performs
  genuine evaluation nor exposes child community chat.

Sloka text, meanings, translations, story content, and generated audio remain
prototype/editorial material unless their metadata says `approved`.

## Technology

React 19 · TypeScript strict mode · Vite 6 · Tailwind CSS v4 · React Router 7 ·
Lucide React · Vitest + React Testing Library · ESLint 9 · localStorage · Web
Speech and MediaRecorder browser APIs.

The learner runtime has no account system, advertisements, analytics, cloud
database, or paid-provider API key. Provider calls belong only in trusted
build-time tooling or a future protected service.

## Windows PowerShell setup

```powershell
Set-Location "S:\Sloka App"
npm.cmd ci
npm.cmd run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

On systems where the PowerShell execution policy permits `npm.ps1`, `npm` and
`npm.cmd` are interchangeable. `npm.cmd` avoids the common “running scripts is
disabled” PowerShell error.

No environment file is required to build or use the web app. Sarvam credentials
are optional and used only by the offline/build-time audio workflow.

## Commands

```powershell
npm.cmd run dev          # development server
npm.cmd run typecheck    # strict TypeScript project check
npm.cmd run lint         # ESLint
npm.cmd run test         # Vitest, single run
npm.cmd run test:watch   # Vitest watch mode
npm.cmd run build        # typecheck and production Vite build
npm.cmd run preview      # serve the production build locally
npm.cmd run check        # typecheck + lint + test + build

npm.cmd run audio:list-voices
npm.cmd run audio:sample -- --language=te-IN
npm.cmd run audio:generate -- --content=saraswati-namastubhyam
npm.cmd run audio:generate -- --type=story --content=ramayana-ayodhya
npm.cmd run audio:verify
```

Run `npm.cmd run check` and `npm.cmd run audio:verify` before release. Audio
verification is separate because generation and editorial approval are not
normal frontend build steps.

## Web deployment

Root hosting needs no configuration value. For a nested mount such as a GitHub
project page, build with the public path that will contain the app:

```powershell
$env:VITE_BASE_PATH = "/SlokaSteps/"
npm.cmd run build
```

The base path configures both Vite assets and the React Router basename.
Production hosts must also rewrite unknown application routes to `index.html`
without rewriting real asset or audio files. Every build creates a matching
`dist/404.html` as a static-host/GitHub Pages fallback. See
[Web deployment](docs/WEB_DEPLOYMENT.md) for the deployment contract, rewrite
examples, and release checks.

## Application routes

```text
/
/setup
/learn
/slokas
/slokas/:slokaId
/slokas/:slokaId/activity/:activityId
/stories
/stories/:epicId
/stories/:epicId/:chapterId
/practice
/rewards
/complete/:contentType/:contentId
/parent
/settings
/privacy
```

The lightweight parent arithmetic gate is a deterrent, not authentication.
Legacy Version 1 lesson URLs redirect through the centralized route table.

These inspection pages are development-only and are absent from production
navigation:

```text
/dev/audio-lab
/dev/chant-lab
```

## Language behavior

First-time setup asks which language Sloka Steps should use and stores it as
`defaultLanguage`. It initially drives interface text, instructions, meanings,
story text, activities, rewards, and parent-facing text.

Settings then expose three separate concerns:

- **Display language** controls interface and readable content.
- **Narration language** follows display language by default and may be unlinked
  by a parent.
- **Sloka script preference** supports regional script, Devanagari, Roman
  transliteration, or regional script with transliteration.

English is the canonical complete UI pack. Non-English packs and story
translations are draft content and may fall back to English. Fallback is
explicit and never displays raw translation keys. Sanskrit text is not
“translated” into a different prayer, and unavailable regional-script
renderings fall back to reviewed source text/transliteration.

## Versioned progress and migration

`src/services/persistence.ts` defines `ProgressRepository` and
`LocalStorageProgressRepository`. Domain state is no longer designed around a
direct localStorage dependency, so a future native or cloud adapter can
implement the same contract.

Version 2 uses:

```text
sloka-steps:v2
```

On first load, a valid `sloka-steps:v1` record is migrated in memory:

- display name → nickname
- age range → age band
- short language code → BCP-47 language
- daily goal and reduced-motion settings → Version 2 preferences
- lesson progress, XP, badges, streak, daily progress, and history → unified
  learning progress

Migration is defensive and does not automatically erase the legacy key. Reset
is available only after parent confirmation and removes only Sloka Steps-owned
keys. Corrupt or future schemas fail safely without clearing unrelated browser
data.

## Audio architecture

Version 2 separates three audio systems.

### Canonical Sanskrit chanting

Production teaching audio must use qualified, approved human recordings.
Normal, slow-teaching, full-sloka, and future phrase/word assets are represented
in `public/audio/manifest.json`. The resolver selects only approved assets and
always ranks human audio above generated sources.

No canonical human audio files ship in this foundation. Existing lessons
therefore use the visibly labelled browser voice fallback and remain completable
when playback is unavailable.

### Native-language narration

Meaning, instruction, encouragement, and story narration are pregenerated in a
trusted environment. `AudioAsset`, `TextToSpeechRequest`, `GeneratedAudio`, and
`TextToSpeechProvider` keep generation independent of Sarvam, Google, or Azure.

- Sarvam is the functional build-time provider when credentials are available.
- Google and Azure are secure placeholders.
- Browser SpeechSynthesis is runtime fallback only.
- Missing credentials cause generation scripts to skip safely; the app still
  builds and runs.

### Suno-produced content

Suno is an offline creative-production tool, not runtime TTS. Reviewed imports
may be used for melodic learning, instrumental practice, story background
music, character songs, memory rhymes, or reward jingles. A raw Suno output must
never become canonical Sanskrit teaching audio.

Import Suno output by placing the file under the appropriate
`public/audio/.../melodic`, `instrumental`, `background`, or reward path, adding
a manifest entry with `source: "suno"` and `reviewStatus: "needs-review"`,
recording provenance/checksum, and completing cultural, pronunciation where
relevant, child-safety, and audio review before changing it to `approved`.

See [Audio architecture](docs/AUDIO_ARCHITECTURE.md) for resolution, review,
privacy, and checksum rules.

## Sarvam setup

Copy the example to an ignored local file and fill only the values needed in
the trusted terminal environment:

```powershell
Copy-Item .env.example .env.local
```

```env
TTS_PROVIDER=sarvam
SARVAM_API_KEY=
SARVAM_DEFAULT_ENGLISH_SPEAKER=
SARVAM_DEFAULT_HINDI_SPEAKER=
SARVAM_DEFAULT_TELUGU_SPEAKER=
SARVAM_DEFAULT_KANNADA_SPEAKER=
SARVAM_DEFAULT_TAMIL_SPEAKER=
SARVAM_DEFAULT_MARATHI_SPEAKER=
```

Never use a `VITE_` prefix for paid-provider credentials. Vite variables are
browser-visible. Do not commit `.env` or `.env.local`; `.env.example` contains
names only and is intentionally tracked.

The audio scripts read `scripts/audio/content-catalog.json`, hash generation
inputs, generate only missing/changed segments, save provider metadata, update
the manifest, and refuse to overwrite unmanaged, approved, or approved-human
audio. Generated assets start as `needs-review`.

## Development labs

### Audio Lab

`/dev/audio-lab` inspects manifest metadata, previews reviewed static assets,
compares provider/voice configuration, varies pace, records an in-memory
preferred voice, and tests the labelled browser fallback. It cannot call a paid
provider; generation remains a trusted script workflow.

### Chant Lab

`/dev/chant-lab` is a structured, disabled prototype for selecting a sloka and
reference, choosing a local test file, and viewing waveform, pitch-contour, and
evaluation JSON placeholders. It performs no signal processing, uploads
nothing, produces no score, and marks its output simulated.

The future Chant Coach keeps audio quality, completeness, pronunciation, rhythm,
and optional melody separate. The mock returns only `unable-to-evaluate`; local
pitch and server implementations are fail-closed placeholders. Multiple
reviewed recitation traditions can coexist.

## Adding content

### Add a sloka

1. Create `src/content/slokas/<name>.ts` with stable IDs, lines,
   transliteration, meanings, badge, duration, content/editorial metadata, and
   data-driven activities.
2. Use `buildStandardActivities` rather than creating a one-off lesson page.
3. Mark unreviewed work `draft` or `editorial-review`.
4. Register the sloka in `src/content/slokas/index.ts`.
5. Record textual variants and review status in `CONTENT_REVIEW.md`.
6. Add progression, activity, localization, and content-gating tests.

### Add a story chapter

1. Add structured `Epic → StoryBook → StoryChapter → StoryScene` data under
   `src/content/stories`; do not embed curriculum prose in a page.
2. Provide stable IDs, localized text/fallbacks, age band, duration, scenes,
   characters, ordering activity, three age-appropriate questions, values
   reflection, recap, and editorial metadata.
3. Register it through `src/content/stories/index.ts`.
4. Keep it out of production until status is `approved`.
5. Add content, keyboard interaction, locked/completion, listening-only, and
   progress separation tests.

### Add or complete a translation

1. Use one of the six BCP-47 locale IDs in `src/types/content.ts`.
2. Update the corresponding pack under `src/content/translations`.
3. Add reviewed sloka meanings and story localized text separately from UI
   strings.
4. Preserve variable interpolation and English fallback.
5. Add script-aware fonts/rules only when a new script requires them.
6. Record native-language review; do not relabel draft machine text approved.

### Add reviewed audio

1. Place the file below `public/audio/slokas` or `public/audio/stories`; human
   files must not live in a `generated` directory.
2. Add a stable, versioned manifest entry with purpose, language, source,
   checksum, URL, and review state.
3. Keep it `needs-review` until the applicable pronunciation, cultural, and
   audio-quality reviews finish.
4. Never replace an approved file in place; add a new version.
5. Run `npm.cmd run audio:verify`.

## Privacy and safety

- The profile uses a nickname and broad age band; no legal name, exact birthday,
  precise location, school, email, phone, photo, or contacts are requested.
- Practice recordings remain session-only object URLs and are not uploaded or
  persisted. Microphone access follows an explicit press and lessons have a
  non-microphone path.
- Cloud evaluation, recording retention, and model training default off;
  `allowModelTraining` is fixed to `false`.
- Microphone, cloud-evaluation, recording-retention, and future-community
  choices are hidden behind a fresh lightweight parent check in Settings.
- `chantCoachEnabled` and `communityEnabled` are frozen off.
- Lesson Circle has no child-facing free-text input, direct messages, private
  chat, or contact sharing.
- These safeguards are engineering choices, not a claim of COPPA, GDPR-K, or
  other legal compliance.

See [Child privacy checklist](docs/CHILD_PRIVACY_CHECKLIST.md) and
[Lesson Circle safety architecture](docs/LESSON_CIRCLE_SAFETY_ARCHITECTURE.md).

## Accessibility and child experience

The app uses semantic controls, keyboard-operable ordering instead of
drag-and-drop-only tasks, visible focus, large touch targets, labelled
progress/forms, `aria-live` feedback, generous Indic line height, and
reduced-motion/calm preferences. Audio has readable text alternatives and is
never the only instruction. Wrong answers do not complete activities, and
correct answers are not visually revealed before selection.

Real-device TalkBack/VoiceOver, switch access, live microphone, Indic-font,
breakpoint, and child usability testing are still required before a public
release.

## Project structure

```text
public/audio/                  reviewed static assets + manifest
scripts/audio/                 trusted generation/verification workflow
src/app/                       application route composition
src/components/                common, audio, lesson, story, parent, learn UI
src/config/                    frozen safety-sensitive feature flags
src/content/slokas/            typed sloka curriculum
src/content/stories/           typed Ramayana/Mahabharata curriculum
src/content/translations/      six UI language packs
src/context/                   application reducer/provider
src/pages/                     route-level screens and development labs
src/services/                  persistence, audio, and evaluation boundaries
src/test/                      domain and interaction tests
src/types/                     content, state, story, audio, and chant contracts
src/utils/                     rewards, progression, dates, streaks, helpers
docs/                          architecture, safety, privacy, validation roadmaps
```

Tailwind CSS v4 uses the official Vite plugin and the `@theme` block in
`src/styles/index.css`; there is intentionally no `tailwind.config.js`.

## Documentation

- [Audio architecture](docs/AUDIO_ARCHITECTURE.md)
- [Content editorial workflow](docs/CONTENT_EDITORIAL_WORKFLOW.md)
- [Child privacy checklist](docs/CHILD_PRIVACY_CHECKLIST.md)
- [Lesson Circle safety architecture](docs/LESSON_CIRCLE_SAFETY_ARCHITECTURE.md)
- [Chant Coach architecture](docs/CHANT_COACH_ARCHITECTURE.md)
- [Chant Coach validation plan](docs/CHANT_COACH_VALIDATION_PLAN.md)
- [Android migration roadmap](docs/ANDROID_MIGRATION_ROADMAP.md)
- [Web deployment](docs/WEB_DEPLOYMENT.md)
- [Content review status](CONTENT_REVIEW.md)
- [Decisions](DECISIONS.md)
- [Detailed privacy notes](PRIVACY_NOTES.md)
- [Historical Version 1 QA report](QA_REPORT.md)

## Known limitations

- No approved human Sanskrit recordings are bundled.
- Browser Sanskrit speech is approximate fallback audio, not a teacher or
  pronunciation reference.
- Non-English UI/story text and sloka meanings still contain draft or English
  fallback content awaiting qualified native review.
- The two sample epic chapters require cultural/editorial approval and are not
  public production curriculum.
- Sarvam generation requires a private API key and creates review-pending files;
  Google and Azure generation are placeholders.
- Sentence/word timing, full read-with-me highlighting, offline audio packs,
  search, cloud sync, accounts, and native Android packaging are not complete.
- Chant Coach does not analyze recordings, and Lesson Circle is not implemented.
- No formal privacy, legal, production security, Sanskrit editorial, or
  accessibility certification has been completed.

The framework-neutral content, progress, migration, and service contracts are
intended to support a future PWA, Capacitor, React Native, or Expo path. See the
[Android migration roadmap](docs/ANDROID_MIGRATION_ROADMAP.md) before choosing a
native stack.

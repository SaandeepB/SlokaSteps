# Sloka Steps

**Learn. Chant. Understand.**

Sloka Steps is an original, child-friendly web app that helps children
(ages ~4–10) learn beginner Sanskrit slokas through listening, repetition,
meaning, interactive exercises, and positive progress tracking — guided by
**Mitra**, a friendly glowing lotus. Version 1 is a fully local prototype:
no accounts, no backend, no uploads.

## Version 1 features

- **Beginner Path — Level 1** with 8 slokas: 6 fully interactive lessons
  (Saraswati Namastubhyam, Vakratunda Mahakaya, Guru Brahma, Tvameva Mata,
  Karagre Vasate, Shubham Karoti) and 2 coming-soon previews (Asato Ma,
  Sarve Bhavantu) that never award progress.
- **Reusable, data-driven lesson engine**: introduction → listen + repeat
  per line → meaning → matching → fill-in-the-blank → arrange-words →
  full chant → completion. One activity at a time, progress bar, safe back
  navigation, exit confirmation, URL-tamper protection.
- **Audio**: browser speech synthesis as a clearly labeled prototype
  practice voice (normal + slow), one utterance at a time, full fallback
  when unsupported. Data model ready for reviewed prerecorded audio.
- **Recording**: in-memory, session-only chanting recordings with instant
  playback, delete-and-retry, and friendly microphone error handling.
  Nothing is uploaded or persisted. Feedback is participation-only — the
  app never fakes pronunciation scores.
- **Rewards**: stars (first-try accuracy), 10 XP on first completion
  (idempotent), original badges, gentle daily goal, calendar-safe streaks,
  practice history. No shame, no loss aversion.
- **Six languages** (English, Hindi, Telugu, Kannada, Tamil, Marathi) with
  honest prototype-draft marking and safe English fallback — raw keys are
  never shown.
- **Parent Area** behind a lightweight arithmetic gate (a deterrent, not
  security): progress review, badges, history, settings link, confirmed
  reset that clears only the app's own storage key.
- **Accessibility**: semantic HTML, keyboard operability, skip link,
  visible focus, labeled progress bars and forms, `aria-live` feedback,
  large touch targets, reduced-motion support (OS preference + in-app
  toggle), no color-only state.
- **Privacy by design**: everything stays in this browser. See
  `PRIVACY_NOTES.md` and the in-app `/privacy` page.

## Technology stack

React 19 · TypeScript (strict) · Vite 6 · Tailwind CSS v4 (Vite plugin) ·
React Router 7 · Lucide React · Vitest 3 + React Testing Library ·
ESLint 9 · Browser SpeechSynthesis + MediaRecorder APIs · localStorage.

No backend, no analytics, no external runtime requests.

## Getting started (Windows PowerShell)

```powershell
Set-Location "S:\Sloka App"
npm install
npm run dev
```

Then open the printed local URL (default `http://localhost:5173`).

### All commands

```powershell
npm run dev        # start the dev server
npm run typecheck  # TypeScript project build check (tsc -b)
npm run lint       # ESLint
npm run test       # Vitest (single run)
npm run test:watch # Vitest (watch mode)
npm run build      # production build (tsc -b && vite build) -> dist/
npm run preview    # serve the production build locally
npm run check      # typecheck + lint + test + build
```

## Folder structure

```text
S:\Sloka App
├── public/                  favicon
├── src
│   ├── app/                 route table
│   ├── components
│   │   ├── audio/           play controls, recorder panel
│   │   ├── common/          Button, Card, dialogs, Mitra, stars, badges…
│   │   ├── lesson/          the eight activity components
│   │   └── parent/          gate + dashboard
│   ├── content
│   │   ├── slokas/          typed sloka data + activity builder
│   │   └── translations/    six language packs + engine
│   ├── context/             AppState provider + pure reducer
│   ├── hooks/               useAppState, useTranslation, useRecorder…
│   ├── layouts/             app frame (skip link, header, footer)
│   ├── pages/               one component per route
│   ├── routes/              central path builders + profile guard
│   ├── services/            persistence, audio playback, pronunciation
│   ├── styles/              Tailwind v4 theme tokens
│   ├── test/                Vitest + RTL suite (57 tests)
│   ├── types/               all shared interfaces
│   └── utils/               rewards, streak, progression, dates…
├── AGENTS.md / CLAUDE.md    coding-agent instructions
├── CONTENT_REVIEW.md        content status + known variations
├── DECISIONS.md             recorded product/engineering decisions
├── FUTURE_ROADMAP.md        deliberately-not-built items
├── PRIVACY_NOTES.md         privacy behavior in detail
└── QA_REPORT.md             validation results
```

## Tailwind CSS v4 setup

This project uses **Tailwind CSS v4** with the official Vite integration —
no `tailwind.config.js` and no `npx tailwindcss init` (that command belongs
to v3 tutorials and is not valid here):

1. `tailwindcss` + `@tailwindcss/vite` are dev dependencies.
2. `vite.config.ts` registers the `tailwindcss()` plugin.
3. `src/styles/index.css` starts with `@import 'tailwindcss';` and defines
   all design tokens (colors, script-aware font stacks, shadows, keyframes)
   in an `@theme` block, which generates the custom utilities
   (`bg-cream-50`, `text-teal-700`, `animate-gentle-pop`, …).

Verified: the emitted production CSS contains the custom tokens and the
built app renders with them.

## Browser support and fallbacks

- Evergreen Chromium, Firefox, and Safari on desktop and mobile.
- **Speech synthesis unavailable** → a friendly notice appears and the
  child can read the line and continue; the voice is always described as a
  simple computer voice, never an authoritative Sanskrit model.
- **MediaRecorder unavailable / permission denied / no microphone** → a
  reassuring message appears and the lesson continues; recording is never
  required to finish.
- **Corrupted or foreign localStorage** → defensive parsing recovers safe
  defaults without crashing and without touching other keys.

## Microphone and privacy behavior

The microphone is requested only when the child presses **Record**.
Recordings live in memory for the current session only (object URLs,
revoked on replace/delete/unmount), are never uploaded, and never persisted.
Full details: `PRIVACY_NOTES.md`. This prototype makes no legal-compliance
claims; a formal privacy review is required before production.

## Localization structure

- `src/content/translations/en.ts` is the canonical key set (~100 keys);
  `hi/te/kn/ta/mr.ts` are `Partial` packs marked `prototype-draft`.
- `translate(language, key, vars)` falls back to English, warns once per
  missing key in dev, and never renders a raw key.
- Sloka meanings live per-language inside each sloka file
  (`meanings: Partial<Record<SupportedLanguage, SlokaMeaning>>`) with the
  same fallback rule. Regional-script renderings render only when reviewed
  content exists; otherwise a documented fallback notice shows the Roman
  transliteration.

## How to add a new sloka

1. Create `src/content/slokas/<name>.ts` exporting a `Sloka`: lines
   (Devanagari + transliteration), badge, meanings (at least `en`), and
   `activities: buildStandardActivities({ slokaId, lines, fillBlank,
   arrangeLineIndex })`.
2. Set `order` (next number) and `implementationStatus: 'complete'`
   (or `'coming-soon'` with `activities: []` for a preview).
3. Register it in `src/content/slokas/index.ts` (`SLOKAS` array).
4. Add its review row to `CONTENT_REVIEW.md`.
Progression, rewards, the path, and the lesson engine pick it up
automatically.

## How to add a new language

1. Add the code to `SupportedLanguage`, `SUPPORTED_LANGUAGES`, and
   `LANGUAGES` in `src/types/content.ts`.
2. Create `src/content/translations/<code>.ts` (Partial pack,
   `prototype-draft`) and register it in `translations/index.ts`.
3. Add a script-aware font stack + `[lang='<code>']` rule in
   `src/styles/index.css` if the script is new.
4. Add per-sloka meanings when reviewed content exists — everything else
   falls back to English automatically.

## Known limitations

- Practice voice is browser speech synthesis (hi-IN approximation) — a
  labeled prototype fallback, not reviewed Sanskrit audio.
- Meanings ship in English (all lessons) + Hindi (six interactive lessons);
  te/kn/ta/mr meanings and regional-script sloka text await qualified
  review and fall back honestly.
- Lessons 7–8 are coming-soon previews by design.
- All curriculum content is prototype-status (see `CONTENT_REVIEW.md`).
- No cloud sync, accounts, or offline packaging (see `FUTURE_ROADMAP.md`).

## Troubleshooting

- **Port already in use**: `npm run dev -- --port 5174`.
- **Stale build artifacts**: delete `dist/` and `node_modules/.tmp`, then
  `npm run build`.
- **Styles look unstyled**: ensure `@tailwindcss/vite` is installed and the
  plugin is present in `vite.config.ts`; restart the dev server.
- **Indic text shows boxes**: install/enable a Devanagari-capable system
  font (Windows ships Nirmala UI by default).
- **Progress seems stuck**: the Parent Area → Reset Progress safely clears
  only the app's `sloka-steps:v1` key.

## Future mobile migration notes

Reward/streak/progression logic (`src/utils`), content (`src/content`), and
types are plain TypeScript with no DOM dependencies — reusable directly in
a React Native/Expo app. Persistence and audio/recording services are
isolated behind small interfaces (`src/services`) so AsyncStorage and
native audio modules can replace them per platform. See `FUTURE_ROADMAP.md`.

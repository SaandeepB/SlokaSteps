# Sloka Steps — Agent Instructions

Sloka Steps is a child-friendly web app for learning beginner Sanskrit slokas
(tagline: "Learn. Chant. Understand."). Version 1 is a fully local,
frontend-only React + TypeScript + Vite + Tailwind CSS v4 application.

## Filesystem boundary (non-negotiable)

- The ONLY authorized project directory is `S:\Sloka App`.
- Never create, modify, move, or delete files outside it.
- Never modify parent/sibling directories, global npm/Git config, VS Code
  user settings, or any other repository.
- Quote the path in PowerShell — it contains a space: `Set-Location "S:\Sloka App"`.
- Never run broad deletion commands (e.g. `Remove-Item S:\* -Recurse`).

## Commands

```powershell
npm install          # install dependencies
npm run dev          # start dev server
npm run typecheck    # tsc -b
npm run lint         # eslint .
npm run test         # vitest run
npm run build        # tsc -b && vite build
npm run check        # typecheck + lint + test + build
```

Run `npm run check` before declaring any work complete. Do not claim a check
passed unless it was actually run and succeeded.

## Architecture

- State: React Context + `useReducer` (`src/context`), typed actions, pure
  reward/streak/progression functions in `src/utils`. No Redux.
- Persistence: single localStorage key `sloka-steps:v1`, versioned schema,
  defensive parsing (`src/services/persistence.ts`). Never clear other keys.
- Content: data-driven typed sloka definitions in `src/content/slokas`;
  no curriculum content hardcoded in page components.
- Localization: translation packs in `src/content/translations` for
  en/hi/te/kn/ta/mr; missing values fall back to English; never render raw keys.
- Lesson engine: one reusable engine (`src/pages/ActivityPage.tsx` + activity
  components in `src/components/lesson`) renders discriminated-union activity
  data. Do not build per-lesson hardcoded pages.

## Content safety and honesty

- Sanskrit text, transliterations, and meanings are PROTOTYPE content. Never
  describe them as official, certified, or definitive. Log content changes in
  `CONTENT_REVIEW.md`; never silently "correct" supplied Sanskrit.
- Never invent authoritative pronunciation scores, fake percentages, or fake
  AI analysis. Pronunciation feedback is participation-only
  (`src/services/pronunciation.ts`).
- Use respectful, non-exclusionary wording ("Many families chant…",
  "This sloka expresses…").

## Child privacy (hard rules)

- No backend, accounts, analytics, ads, social features, or cloud storage.
  Do not introduce a backend without a future explicit request.
- Never upload, persist, or transmit child audio. Recordings stay in memory
  for the session only (object URLs, revoked when replaced/unmounted).
- Request microphone access only after an explicit button press.
- Collect no email, phone, birth date, address, school, or photos.
- Do not claim COPPA/GDPR compliance; a formal legal review is required
  before any production release.

## Accessibility expectations

- Semantic HTML, keyboard operability, visible focus, skip link, large touch
  targets, labeled progress bars/forms, careful `aria-live` for feedback,
  reduced-motion support (media query AND in-app setting), no color-only
  state, no autoplaying audio.

## Coding standards

- TypeScript strict; no `any`; no `@ts-ignore` without a documented reason.
- `verbatimModuleSyntax` is on: use `import type` for type-only imports.
- Functional components, small and focused; no giant pages; no dead code;
  no console noise in production paths.
- Tailwind CSS v4 via `@tailwindcss/vite` plugin and `@theme` tokens in
  `src/styles/index.css`. There is no `tailwind.config.js` — do not add one
  or run `npx tailwindcss init`.

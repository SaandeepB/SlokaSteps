# PRIVACY_NOTES.md — Sloka Steps Version 1

Sloka Steps V1 is a **local-only prototype for children**. These notes
document exactly what it does and does not do with data. The in-app
`/privacy` page presents the same facts in family-friendly language.

## What is stored, and where

Everything lives in a single localStorage key in the family's own browser:

```text
sloka-steps:v1
```

It contains: child display name (nickname allowed, empty allowed), age range
(4–6 / 7–8 / 9–10), interface/meaning language, daily goal, reduced-motion
preference, lesson progress (status, saved step, stars, XP, badges), streak
dates, estimated daily learning minutes, and practice history entries
(lesson id + timestamp + stars).

Reset (Parent Area) removes only this key — never other browser data.

## What is deliberately NOT collected or done

- No production accounts, sign-in, or social login
- No cloud database or backend of any kind
- No advertisements or purchases
- No third-party analytics or behavioral tracking
- No social features, public profiles, or child-to-child messaging
- No email addresses, phone numbers, full birth dates, addresses, schools,
  or profile photographs
- No precise location, contacts, camera, or notification permissions
- No runtime calls to third-party font/image/CDN services (all assets are
  bundled; fonts are system stacks)
- No API keys or secrets in the code (no populated `.env` required)

## Child audio recordings

- The microphone is requested **only after the child presses Record** —
  never on page load.
- Audio stays **in memory for the current browser session only**, exposed
  through temporary object URLs for instant playback.
- Object URLs are revoked when a recording is replaced, deleted, or the
  screen is left. Nothing is written to localStorage, IndexedDB, or disk.
- Recordings are **never uploaded** — not to a server, analytics, an AI
  API, or any third-party service. Only the fact that a recording step was
  attempted (a boolean) is persisted.
- Pronunciation "feedback" is participation-only encouragement from a local
  mock (`src/services/pronunciation.ts`); no audio analysis occurs.

## Honest limits

- The parent gate (a simple addition question) is a **child-access
  deterrent, not authentication or security**, and its passed state is
  never persisted.
- These guardrails are design choices, **not a claim of legal compliance**
  with COPPA, GDPR, GDPR-K, or any other regulation. A formal legal and
  privacy review is required before any production release.

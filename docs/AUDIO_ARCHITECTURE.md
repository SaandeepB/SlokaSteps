# Audio architecture

Sloka Steps separates canonical Sanskrit teaching, native-language narration,
and creative music. The browser consumes reviewed static assets and never holds
paid-provider credentials.

## Runtime resolution policy

`src/types/audio.ts` defines provider-independent assets and generation
contracts. `src/services/audioManifest.ts` validates `public/audio/manifest.json`
and resolves an exact content ID, segment ID, purpose, and language.

Playback priority is deterministic:

1. An `approved` human recording.
2. An `approved` pregenerated static provider asset.
3. The visibly labelled browser SpeechSynthesis fallback, when allowed.
4. A graceful unavailable result when fallback text or browser support is absent.

Draft, `needs-review`, and rejected assets are never selected. Suno assets may
serve approved melodic, instrumental, background, or reward purposes, but the
resolver excludes them from canonical chanting and slow teaching. Human audio
always outranks generated audio, regardless of array order or version.

The existing lesson controls remain backward compatible with `SlokaLine.audioUrl`.
If a static file fails, playback attempts the labelled browser fallback and the
lesson remains usable. Stopping prerecorded playback settles its pending Promise,
so replay cannot become stuck.

## Manifest and review lifecycle

Each manifest entry records its stable content/segment identity, purpose,
BCP-47 language, source, URL, version, review state, file SHA-256, generation
input SHA-256, and optional provider metadata. Generated entries always start as
`needs-review`.

An editor imports canonical human audio by placing it outside a `generated/`
directory and adding a `source: "human"` entry. It becomes eligible only after
pronunciation/cultural review changes its status to `approved`. Approved files
must have checksums. Never reuse an approved URL for a new recording; add a new
version and retain the review trail.

Run `npm run audio:verify` before release. It checks manifest structure, file
existence, checksums, canonical-human policy, duplicate paths, provider/cache
metadata, public environment files, and provider-auth material in the browser
bundle.

## Build-time TTS

Provider adapters live only in `scripts/audio/`; frontend code must never import
them. The shared `GeneratedAudio` contract uses `Uint8Array`; Node's `Buffer` is
a compatible subtype without introducing Node globals into the browser build.

Sarvam is the functional build-time adapter. It follows the official REST API:

- `POST https://api.sarvam.ai/text-to-speech`
- `api-subscription-key` authentication
- BCP-47 `target_language_code`
- Bulbul v3 by default
- base64 audio decoded to a local MP3 or WAV

Official references:

- <https://docs.sarvam.ai/api-reference/text-to-speech/convert>
- <https://docs.sarvam.ai/api-reference/authentication>

Bulbul v3 supports pace but not pitch; the adapter rejects a non-zero pitch
instead of silently ignoring it. Google and Azure adapters are explicit secure
server-side placeholders. Browser speech is runtime fallback only and cannot
produce reviewable assets.

Copy `.env.example` to an ignored `.env.local`, or set variables in the trusted
terminal session. Never use a `VITE_` prefix for provider credentials.

```powershell
Copy-Item .env.example .env.local
$env:SARVAM_API_KEY = "your-key-for-this-shell"
npm run audio:list-voices
npm run audio:sample -- --language=te-IN
npm run audio:generate -- --content=saraswati-namastubhyam
npm run audio:generate -- --type=story --content=ramayana-ayodhya
npm run audio:verify
```

When credentials are absent, sample/generate report a skip, make no network
request, and exit safely. The generator reads structured segments from
`scripts/audio/content-catalog.json`; `--catalog=PATH` can select another
reviewed catalog. It skips unchanged inputs, refuses unmanaged output files,
never overwrites an approved asset, and skips a slot already satisfied by an
approved human recording. Story aliases support both short command IDs and the
stable chapter IDs used by content.

## Audio Lab

`src/pages/AudioLabPage.tsx` is a development-only component for inspecting the
manifest, previewing static audio, comparing configuration, testing browser
fallback speech, pace, provider/voice choices, and marking an in-memory preferred
voice. It intentionally cannot call Sarvam, Google, or Azure. The application
route `/dev/audio-lab` must be mounted only as a development route and must not
appear in production navigation.

## Privacy and limitations

Practice recordings remain in the existing in-memory recorder and are not added
to this manifest, uploaded, cached, or generated. Static asset approval is an
editorial assertion, not automatic pronunciation scoring. No canonical human
recordings ship in the foundation manifest yet; qualified recording and review
are required before production teaching audio is available.

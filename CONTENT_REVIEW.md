# CONTENT_REVIEW.md — Sloka Steps Version 1

All curriculum content in this prototype — Sanskrit text, Roman
transliteration, meanings, and cultural notes — is **prototype content
supplied with the product specification**. It is not official, certified,
definitive, or the only correct interpretation, and the app never presents
it as such.

**Final production content must be reviewed by qualified Sanskrit scholars
and native regional-language reviewers before any public release.**

## Review status by sloka

Legend: ⏳ prototype (needs qualified review) · — not present in V1

| # | Sloka | Sanskrit text | Transliteration | English meaning | Hindi meaning | te/kn/ta/mr meaning | Regional scripts | Audio |
|---|-------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | Saraswati Namastubhyam | ⏳ | ⏳ | ⏳ | ⏳ | — (falls back to English) | — (fallback notice) | — (speech-synthesis fallback) |
| 2 | Vakratunda Mahakaya | ⏳ | ⏳ | ⏳ | ⏳ | — | — | — |
| 3 | Guru Brahma | ⏳ | ⏳ | ⏳ | ⏳ | — | — | — |
| 4 | Tvameva Mata Cha Pita Tvameva | ⏳ | ⏳ | ⏳ | ⏳ | — | — | — |
| 5 | Karagre Vasate Lakshmi | ⏳ | ⏳ | ⏳ | ⏳ | — | — | — |
| 6 | Shubham Karoti Kalyanam | ⏳ | ⏳ | ⏳ | ⏳ | — | — | — |
| 7 | Asato Ma Sadgamaya (coming soon) | ⏳ | ⏳ | ⏳ | — | — | — | — |
| 8 | Sarve Bhavantu Sukhinah (coming soon) | ⏳ | ⏳ | ⏳ | — | — | — | — |

## Notes, normalizations, and known variations

- **No supplied Sanskrit text was altered.** The Devanagari and Roman
  transliterations were used exactly as provided in the specification.
- The supplied transliteration is a **child-friendly informal scheme**, not
  IAST. Reviewers may prefer IAST or ISO 15919 with diacritics; the data
  model stores one transliteration string per line, so replacing the scheme
  is a content-only change.
- **Known textual variations reviewers should weigh:**
  - *Guru Brahma*: some traditions write "गुरुर्देवो" as "गुरुर्देवो महेश्वरः"
    with variant sandhi renderings; "साक्षात् परब्रह्म" also appears alongside
    "परं ब्रह्म".
  - *Karagre Vasate*: a common variant reads "करमूले तु गोविन्दः" as
    "करमूले स्थितो ब्रह्मा", and the closing line sometimes appears as
    "प्रभाते करदर्शनम्" vs. "प्रभाते करदर्शनम् ॥" with the danda placement
    differing by source.
  - *Shubham Karoti*: "दीपज्योतिर्नमोऽस्तु ते" also circulates as
    "दीपज्योतिर्नमोऽस्तुते" (joined form — the form supplied was kept).
  - *Asato Ma*: "मृत्योर्मा अमृतं गमय" is often printed with sandhi as
    "मृत्योर्माऽमृतं गमय".
  These are recorded for reviewers; none were "corrected" unilaterally.
- **Line meanings are simplified paraphrases for ages 4–10**, written with
  respectful, non-exclusionary framing ("This sloka expresses…", "Many
  families chant…"). They are not literal word-by-word translations.
- **Hindi meanings** are prototype drafts (`reviewStatus:
  "prototype-draft"`) written for this prototype; they need native review.
- **UI translations** for Hindi, Telugu, Kannada, Tamil, and Marathi are
  prototype drafts; untranslated keys fall back to English (a notice in the
  Parent Area says so).
- **Audio**: no recorded audio ships. The browser speech-synthesis voice
  (hi-IN) is a labeled prototype fallback and must not be treated as a
  pronunciation reference. Professionally recorded, reviewed audio is a
  roadmap item.
- **Imagery**: only neutral cultural motifs are used (lotus, lamp, book,
  bell, sun, decorative geometry). No deity artwork was attempted, per the
  content guardrail.

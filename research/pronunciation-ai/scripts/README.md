# Harness scripts

All written by the research-analyst from scratch. **No code is copied from
`github.com/prathoshap/sushrota-sanskrit-asr`** (no LICENSE — method only) or
from the Su-śrotā model-card snippet. Where a method is borrowed (the
Sanskrit-slice decode, the decode-consensus + abstain vote) it is reimplemented
in the analyst's own words and the source is cited in the file header.

**UPDATE 2026-09-15: the ML stack is installed and the ASR scripts now run.**
See `09-*.md` / `10-*.md` for what actually happened (short version: the naive
`restore_from()` in `asr_susrota_decode.py` does **not** work with the
installed NeMo 3.0.0 — three confirmed API incompatibilities in the checkpoint's
RNNT half. `load_susrota_ctc.py` is the working replacement: it reconstructs
just the encoder + CTC head, the only part the documented decode path uses,
and loads it with the real weights, zero missing/unexpected keys).

| file | needs ML? | needs audio? | ran? | what it does |
|---|---|---|---|---|
| `common_text.py` | no | no | **yes — passes** | Devanagari normalise / akshara-segment / align / CER / WER / SN-WER |
| `check_akshara_counts.py` | no | no | **yes — passes** | per-pāda akshara counts for all 9 slokas (first gate for metre) |
| `test_verify_logic.py` | no | no | **yes — 5/5 pass** | offline test of the consensus + abstain vote with synthetic decodes |
| `slokas_reference.json` | — | — | — | reference text for all 9 slokas, extracted from `src/content/slokas/*.ts` |
| `load_susrota_ctc.py` | **yes** | no | **yes** | **(new 2026-09-15)** the working CTC-only loader/decoder — see `09-*.md` |
| `asr_susrota_decode.py` | **yes** | **yes** | tried — fails as documented in `09-*.md` | original naive `restore_from()` attempt; kept for the record, superseded by `load_susrota_ctc.py` |
| `verify_against_text.py` | **yes** | **yes** | **yes** | `expected_text` + audio → per-akshara correct / incorrect / **unclear**; `decode_variants()` now uses `load_susrota_ctc.py` |
| `extract_held_out_clips.py` | no | writes audio | **yes** | **(new)** pulls a 16-clip CC-BY-4.0 sample from the Su-śrotā dataset's held-out split |
| `run_holdout_decode.py` | **yes** | **yes** | **yes** | **(new)** real decode + CER/WER/SN-WER across the 16 clips → `holdout_decode_results.json` |
| `run_p4_p5_tests.py` | **yes** | **yes** | **yes** | **(new)** proxy false-positive rate, corrupted-transcript detection, hard negatives → `p4_p5_results.json` |
| `cer_wer_eval.py` | **yes** | **yes** | no — still blocked (see below) | Su-śrotā vs generic IndicConformer CER/WER/SN-WER on repo sloka text |
| `transcode_to_wav.py` | needs ffmpeg | yes | not needed yet | browser WebM/Opus → 16 kHz mono WAV (dataset audio came pre-transcoded) |
| `make_nemo_manifest.py` | no | yes | yes (on empty dir) | build a NeMo JSONL manifest from transcoded clips |
| `requirements.txt`, `SETUP.md` | — | — | install done | exact install recipe used; now mostly historical, see note in `SETUP.md` |

## Run the parts that work now

```powershell
Set-Location "S:\Sloka App\research\pronunciation-ai\scripts"
$env:PYTHONUTF8 = "1"          # else Devanagari prints crash on cp1252 stdout
py -3.11 check_akshara_counts.py
py -3.11 test_verify_logic.py
# ML + audio, now working (downloads ~575MB on first run: checkpoint + held-out split):
py -3.11 extract_held_out_clips.py
py -3.11 run_holdout_decode.py
py -3.11 run_p4_p5_tests.py
```

## Still blocked on

1. `cer_wer_eval.py`'s generic-IndicConformer comparison — `ai4bharat/indic-conformer-600m-multilingual`
   is auto-gated on HF (needs a logged-in browser acceptance click before any
   programmatic download works);
2. `ffmpeg` (not on PATH; not needed for the dataset audio, which is
   pre-transcoded 16kHz WAV; still needed for any browser-recorded WebM/Opus input);
3. **real *child* recitation audio — still none.** `09`/`10` use real adult/
   general in-the-wild Sanskrit speakers from a licensed dataset, which is a
   large step up from synthetic input but is still not the product's actual
   user population. For a child-facing result this remains the real blocker
   (COPPA + DPDP verifiable-consent corpus, per `01`/`05`).

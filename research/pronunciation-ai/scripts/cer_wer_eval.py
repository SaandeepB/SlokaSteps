"""
CER / WER / SN-WER of Su-srota vs a generic IndicConformer, on this repo's own
sloka text.

STATUS: NOT RUN. Needs (a) torch + nemo_toolkit installed, (b) both .nemo
checkpoints downloaded, (c) ffmpeg to transcode, and (d) real recitation
audio -- the repo has ZERO audio assets. See 01-*.md for exactly what audio
must be collected, by whom, and how much, and SETUP.md for install commands.

Given a manifest of {wav, sloka_id} pairs (build one with make_nemo_manifest.py),
this:
  * decodes each clip with the Su-srota checkpoint (Sanskrit slice)
  * decodes each clip with a generic IndicConformer (its own Sanskrit path)
  * scores both decodes against the sloka's Devanagari reference text from
    slokas_reference.json, using the same normalisation the model card describes
  * reports per-model mean CER / WER / SN-WER with a bootstrap 95% interval,
    and a per-sloka / per-clip breakdown

It writes NOTHING that claims to be a measurement unless it actually ran.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import statistics

from common_text import (
    char_error_rate,
    normalise_devanagari,
    sandhi_normalised_wer,
    word_error_rate,
)

HERE = pathlib.Path(__file__).parent
REFS = {
    s["id"]: " ".join(s["devanagari_lines"])
    for s in json.loads((HERE / "slokas_reference.json").read_text(encoding="utf-8"))["slokas"]
}


def _bootstrap_ci(xs: list[float], n: int = 2000):
    import random

    if not xs:
        return (float("nan"), float("nan"))
    means = []
    for _ in range(n):
        sample = [random.choice(xs) for _ in xs]
        means.append(sum(sample) / len(sample))
    means.sort()
    return (means[int(0.025 * n)], means[int(0.975 * n)])


def evaluate(manifest_path: str, susrota_nemo: str, generic_nemo: str) -> dict:
    from asr_susrota_decode import transcribe as susrota_transcribe

    try:
        import nemo.collections.asr as nemo_asr
    except Exception as exc:  # pragma: no cover
        raise SystemExit(
            f"[blocked] nemo not installed ({exc!r}). See SETUP.md."
        )

    generic = nemo_asr.models.ASRModel.restore_from(generic_nemo, map_location="cpu")
    generic.eval()

    rows = [json.loads(l) for l in open(manifest_path, encoding="utf-8") if l.strip()]
    per_model: dict[str, dict[str, list[float]]] = {
        "susrota": {"cer": [], "wer": [], "snwer": []},
        "generic": {"cer": [], "wer": [], "snwer": []},
    }
    detail = []
    for r in rows:
        ref = normalise_devanagari(REFS[r["sloka_id"]])
        su = susrota_transcribe(susrota_nemo, r["wav"])
        ge = generic.transcribe([r["wav"]])[0]
        ge = ge.text if hasattr(ge, "text") else ge
        for name, hyp in (("susrota", su), ("generic", ge)):
            per_model[name]["cer"].append(char_error_rate(ref, hyp))
            per_model[name]["wer"].append(word_error_rate(ref, hyp))
            per_model[name]["snwer"].append(sandhi_normalised_wer(ref, hyp))
        detail.append({"wav": r["wav"], "sloka_id": r["sloka_id"],
                       "susrota_decode": su, "generic_decode": ge})

    summary = {}
    for name, m in per_model.items():
        summary[name] = {
            k: {
                "mean": statistics.fmean(v) if v else float("nan"),
                "ci95": _bootstrap_ci(v),
                "n": len(v),
            }
            for k, v in m.items()
        }
    return {"summary": summary, "detail": detail,
            "note": "MEASURED values -- this run actually executed."}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--susrota-nemo", required=True)
    ap.add_argument("--generic-nemo", required=True,
                    help="a generic IndicConformer .nemo with a Sanskrit path")
    ap.add_argument("--out", default="cer_wer_result.json")
    args = ap.parse_args()
    result = evaluate(args.manifest, args.susrota_nemo, args.generic_nemo)
    pathlib.Path(args.out).write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(result["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

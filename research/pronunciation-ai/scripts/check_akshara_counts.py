"""
Sanity check: akshara (orthographic-syllable) counts per pada for every sloka,
using the deterministic segmenter in common_text.py. Pure stdlib.

This does NOT identify metre by itself - metre needs laghu/guru scansion, which
this script does not do. It only confirms syllable *counts*, which is the first
gate ('is this an 8-count Anushtubh pada or an 11-count Trishtubh pada?').

Run:  PYTHONUTF8=1 py -3.11 check_akshara_counts.py
"""

from __future__ import annotations

import json
import pathlib

from common_text import segment_aksharas, normalise_devanagari

HERE = pathlib.Path(__file__).parent
DATA = json.loads((HERE / "slokas_reference.json").read_text(encoding="utf-8"))


def main() -> None:
    for s in DATA["slokas"]:
        print(f"\n=== {s['id']}  (order {s['order']}, {s['implementationStatus']})")
        print(f"    analyst metre: {s['metre']}")
        total = 0
        for i, line in enumerate(s["devanagari_lines"], 1):
            ak = segment_aksharas(line)
            total += len(ak)
            print(f"    line {i}: {len(ak):2d} aksharas | {' '.join(ak)}")
        print(f"    total aksharas (incl. any om/shanti line): {total}")


if __name__ == "__main__":
    main()

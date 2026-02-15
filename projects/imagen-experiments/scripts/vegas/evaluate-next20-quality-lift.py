#!/usr/bin/env python3
"""Evaluate next-round C-vs-best(A/B) quality lift against baseline."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable


def load_rows(path: Path) -> list[dict]:
    rows: list[dict] = []
    if not path.exists():
        return rows
    for raw in path.read_text(encoding="utf-8").splitlines():
        raw = raw.strip()
        if not raw:
            continue
        try:
            row = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if isinstance(row, dict):
            rows.append(row)
    return rows


def avg(values: Iterable[float]) -> float:
    vals = [float(v) for v in values]
    return sum(vals) / len(vals) if vals else 0.0


def concept_number(concept_name: str) -> int | None:
    try:
        return int(str(concept_name).split("-", 1)[0])
    except Exception:
        return None


def filtered_deltas(rows: list[dict], min_num: int, max_num: int) -> list[float]:
    deltas: list[float] = []
    for r in rows:
        n = concept_number(str(r.get("concept", "")))
        if n is None or n < min_num or n > max_num:
            continue
        v = ((r.get("performance") or {}).get("deltas") or {}).get("C_vs_best_ab")
        if isinstance(v, (int, float)):
            deltas.append(float(v))
    return deltas


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline-jsonl", required=True)
    parser.add_argument("--next-jsonl", required=True)
    parser.add_argument("--baseline-range", default="521-540")
    parser.add_argument("--next-range", default="541-560")
    parser.add_argument("--target-lift-pct", type=float, default=50.0)
    args = parser.parse_args()

    b_min, b_max = [int(x) for x in args.baseline_range.split("-", 1)]
    n_min, n_max = [int(x) for x in args.next_range.split("-", 1)]

    baseline_rows = load_rows(Path(args.baseline_jsonl))
    next_rows = load_rows(Path(args.next_jsonl))

    baseline_deltas = filtered_deltas(baseline_rows, b_min, b_max)
    next_deltas = filtered_deltas(next_rows, n_min, n_max)
    baseline_mean = avg(baseline_deltas)
    next_mean = avg(next_deltas)

    baseline_shortfall = abs(min(0.0, baseline_mean))
    next_shortfall = abs(min(0.0, next_mean))
    if baseline_shortfall <= 1e-9:
        lift_pct = 0.0
    else:
        lift_pct = ((baseline_shortfall - next_shortfall) / baseline_shortfall) * 100.0

    target_hit = len(next_deltas) > 0 and lift_pct >= args.target_lift_pct

    print(
        json.dumps(
            {
                "baseline_range": args.baseline_range,
                "next_range": args.next_range,
                "baseline_count": len(baseline_deltas),
                "next_count": len(next_deltas),
                "baseline_mean_c_vs_best_ab": round(baseline_mean, 6),
                "next_mean_c_vs_best_ab": round(next_mean, 6),
                "baseline_shortfall_abs": round(baseline_shortfall, 6),
                "next_shortfall_abs": round(next_shortfall, 6),
                "lift_pct": round(lift_pct, 4),
                "target_lift_pct": args.target_lift_pct,
                "target_hit": target_hit,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

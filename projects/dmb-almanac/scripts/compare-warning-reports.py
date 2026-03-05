#!/usr/bin/env python3
import json
import sys
from pathlib import Path

def load(path: Path) -> dict:
    return json.loads(path.read_text())

def parse_args(argv):
    if len(argv) == 3 and not argv[1].startswith("--"):
        return Path(argv[1]), Path(argv[2]), False
    current = None
    baseline = None
    fail_on_signature = False
    it = iter(argv[1:])
    for token in it:
        if token in ("--current", "-c"):
            current = Path(next(it, ""))
        elif token in ("--baseline", "-b"):
            baseline = Path(next(it, ""))
        elif token in ("--fail-on-signature", "--fail-signature"):
            fail_on_signature = True
    if not current or not baseline:
        return None, None, False
    return current, baseline, fail_on_signature

def main() -> int:
    current_path, baseline_path, fail_on_signature = parse_args(sys.argv)
    if not current_path or not baseline_path:
        print("usage: compare-warning-reports.py <current.json> <baseline.json>")
        print("   or: compare-warning-reports.py --current <current.json> --baseline <baseline.json>")
        print("   or: compare-warning-reports.py --current <current.json> --baseline <baseline.json> --fail-on-signature")
        return 2
    current = load(current_path)
    baseline = load(baseline_path)
    empty = current.get("emptySelectors", 0) - baseline.get("emptySelectors", 0)
    missing = current.get("missingFields", 0) - baseline.get("missingFields", 0)
    print(f"emptySelectors delta: {empty:+}")
    print(f"missingFields delta: {missing:+}")
    current_missing_ctx = current.get("missingByContext", {}) or {}
    baseline_missing_ctx = baseline.get("missingByContext", {}) or {}
    if isinstance(current_missing_ctx, dict) and isinstance(baseline_missing_ctx, dict):
        deltas = {}
        for key, value in current_missing_ctx.items():
            try:
                delta = int(value) - int(baseline_missing_ctx.get(key, 0))
            except (TypeError, ValueError):
                continue
            if delta:
                deltas[key] = delta
        if deltas:
            print("missingByContext deltas:")
            for key, delta in sorted(deltas.items(), key=lambda item: abs(item[1]), reverse=True)[:10]:
                sign = "+" if delta >= 0 else ""
                print(f"  {key}: {sign}{delta}")
    if fail_on_signature:
        current_sig = current.get("signature")
        baseline_sig = baseline.get("signature")
        if current_sig and baseline_sig and current_sig != baseline_sig:
            print(f"signature mismatch: {current_sig} != {baseline_sig}")
            return 1
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env bash
set -euo pipefail

INTERNAL_ROOT="${INTERNAL_ROOT:-$HOME/nanobanana-output/_internal}"
RUN_DIR=""
REF_TAG=""
INTERVAL="${INTERVAL:-20}"
STALE_SECONDS="${STALE_SECONDS:-300}"
FOLLOW=1

usage() {
  cat <<'EOF'
Usage:
  monitor-v29-managed-run.sh [options]

Options:
  --run-dir DIR         Monitor a specific managed run directory
  --ref-tag TAG         Reference tag under internal root (e.g. img_1300)
  --internal-root DIR   Internal root containing <ref-tag>/runs (default: $HOME/nanobanana-output/_internal)
  --interval SEC        Poll interval when following (default: 20)
  --stale-seconds SEC   Mark run as stale when run.log age exceeds this (default: 300)
  --once                Print one snapshot and exit
  -h, --help            Show help

Examples:
  monitor-v29-managed-run.sh --ref-tag img_1300
  monitor-v29-managed-run.sh --run-dir /Users/me/nanobanana-output/_internal/img_1300/runs/2026-02-21T12-30-50-c522-522
  monitor-v29-managed-run.sh --ref-tag img_1300 --interval 15 --stale-seconds 180
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --run-dir)
      RUN_DIR="${2:-}"
      shift 2
      ;;
    --ref-tag)
      REF_TAG="${2:-}"
      shift 2
      ;;
    --internal-root)
      INTERNAL_ROOT="${2:-}"
      shift 2
      ;;
    --interval)
      INTERVAL="${2:-}"
      shift 2
      ;;
    --stale-seconds)
      STALE_SECONDS="${2:-}"
      shift 2
      ;;
    --once)
      FOLLOW=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [ -n "$RUN_DIR" ] && [ "${RUN_DIR:0:1}" != "/" ]; then
  echo "--run-dir must be an absolute path" >&2
  exit 1
fi
if [ "${INTERNAL_ROOT:0:1}" != "/" ]; then
  echo "--internal-root must be an absolute path" >&2
  exit 1
fi
if ! [[ "$INTERVAL" =~ ^[0-9]+$ ]] || [ "$INTERVAL" -lt 1 ]; then
  echo "--interval must be a positive integer" >&2
  exit 1
fi
if ! [[ "$STALE_SECONDS" =~ ^[0-9]+$ ]] || [ "$STALE_SECONDS" -lt 1 ]; then
  echo "--stale-seconds must be a positive integer" >&2
  exit 1
fi

if [ -z "$RUN_DIR" ]; then
  RUN_DIR="$(python3 - "$INTERNAL_ROOT" "$REF_TAG" <<'PY'
import os
import sys
from pathlib import Path

internal_root = Path(sys.argv[1]).expanduser()
ref_tag = (sys.argv[2] or "").strip()

def latest_run_dir(base: Path):
    candidates = []
    if not base.exists():
        return ""
    for p in base.rglob("run.log"):
        if p.name != "run.log":
            continue
        run_dir = p.parent
        try:
            mt = p.stat().st_mtime
        except Exception:
            continue
        candidates.append((mt, str(run_dir)))
    if not candidates:
        return ""
    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]

if ref_tag:
    base = internal_root / ref_tag / "runs"
else:
    base = internal_root

print(latest_run_dir(base))
PY
)"
fi

if [ -z "$RUN_DIR" ]; then
  echo "No managed runs found under $INTERNAL_ROOT${REF_TAG:+ (ref-tag=$REF_TAG)}" >&2
  exit 1
fi

RUN_LOG="$RUN_DIR/run.log"
if [ ! -f "$RUN_LOG" ]; then
  echo "run.log not found in run dir: $RUN_DIR" >&2
  exit 1
fi

snapshot() {
  python3 - "$RUN_DIR" "$RUN_LOG" "$STALE_SECONDS" <<'PY'
import json
import re
import sys
from datetime import datetime
from pathlib import Path

run_dir = Path(sys.argv[1])
run_log = Path(sys.argv[2])
stale_seconds = int(sys.argv[3])
now = datetime.now().timestamp()

def count_png(path: Path) -> int:
    if not path.exists():
        return 0
    return sum(1 for p in path.glob("*.png") if p.is_file())

def concept_name(line: str):
    m = re.search(r"([0-9]{3}-[A-Za-z0-9_-]+)", line)
    return m.group(1) if m else None

def read_text(path: Path, max_bytes: int = 6 * 1024 * 1024) -> str:
    if not path.exists():
        return ""
    with path.open("rb") as fh:
        fh.seek(0, 2)
        size = fh.tell()
        fh.seek(max(size - max_bytes, 0))
        return fh.read().decode("utf-8", errors="ignore")

text = read_text(run_log)
lines = text.splitlines()

try:
    age_s = int(max(0, now - run_log.stat().st_mtime))
except Exception:
    age_s = -1

target = 0
m_target = re.search(r"Range:\s*\d+\s*-\s*\d+\s*\(count=(\d+)\)", text)
if m_target:
    target = int(m_target.group(1))

phase_markers = {
    "A": max(text.rfind("PHASE A START"), text.rfind("PHASE A SAFETY REVISIT START")),
    "B": max(text.rfind("PHASE B START"), text.rfind("PHASE B SAFETY REVISIT START")),
    "C": text.rfind("PHASE C + FINAL AUDIT START"),
}
phase = "unknown"
if max(phase_markers.values()) >= 0:
    phase = max(phase_markers, key=phase_markers.get)

done_a = set()
done_b = set()
done_c = set()
fail_a = set()
fail_b = set()
fail_c = set()
defer_a = set()
defer_b = set()

for line in lines:
    if "PHASE A DONE" in line or "PHASE A SAFETY-REVISIT DONE" in line or "PHASE A SKIP" in line:
        name = concept_name(line)
        if name:
            done_a.add(name)
    if "PHASE B DONE" in line or "PHASE B SAFETY-REVISIT DONE" in line:
        name = concept_name(line)
        if name:
            done_b.add(name)
    if "PHASE C AUDIT " in line:
        name = concept_name(line)
        if name:
            done_c.add(name)

    if "PHASE A FAIL " in line or "PHASE A SAFETY-REVISIT EXHAUSTED " in line:
        name = concept_name(line)
        if name:
            fail_a.add(name)
    if "PHASE B FAIL " in line or "PHASE B SAFETY-REVISIT EXHAUSTED " in line:
        name = concept_name(line)
        if name:
            fail_b.add(name)
    if "PHASE C FAIL " in line:
        name = concept_name(line)
        if name:
            fail_c.add(name)

    if "PHASE A SAFETY-DEFER" in line or "SAFETY-DEFER PASS A" in line:
        name = concept_name(line)
        if name:
            defer_a.add(name)
    if "PHASE B SAFETY-DEFER" in line or "SAFETY-DEFER PASS B" in line:
        name = concept_name(line)
        if name:
            defer_b.add(name)

phased_summary_seen = "V29 APEX PHASED RESULTS" in text
success_pair = None
for line in reversed(lines):
    m = re.search(r"Success:\s*(\d+)\s*/\s*(\d+)", line)
    if m:
        success_pair = (int(m.group(1)), int(m.group(2)))
        break

completed = phased_summary_seen and success_pair is not None
if completed:
    status = "completed"
elif age_s >= 0 and age_s > stale_seconds:
    status = "stale"
else:
    status = "running"

active = ""
for line in reversed(lines):
    if re.search(r"\[\d+/\d+\]\s+PASS\s+[ABC]\s+", line):
        active = line.strip()
        break

last = ""
for line in reversed(lines):
    if line.strip():
        last = line.strip()
        break

final_count = sum(1 for p in run_dir.glob("[0-9][0-9][0-9]-*.png") if p.is_file())
pass_a_legacy = count_png(run_dir / "passA")
pass_a_a = count_png(run_dir / "passA" / "approach-A")
pass_a_b = count_png(run_dir / "passA" / "approach-B")
pass_a_c = count_png(run_dir / "passA" / "approach-C")
strat_a = count_png(run_dir / "strategy-A")
strat_b = count_png(run_dir / "strategy-B")
strat_c = count_png(run_dir / "strategy-C")

payload = {
    "ts": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "run_dir": str(run_dir),
    "run_log": str(run_log),
    "status": status,
    "phase": phase,
    "target": target,
    "age_s": age_s,
    "done": {"A": len(done_a), "B": len(done_b), "C": len(done_c)},
    "fail": {"A": len(fail_a), "B": len(fail_b), "C": len(fail_c)},
    "safety_defer": {"A": len(defer_a), "B": len(defer_b)},
    "files": {
        "final": final_count,
        "passA_root": pass_a_legacy,
        "passA_A": pass_a_a,
        "passA_B": pass_a_b,
        "passA_C": pass_a_c,
        "strategy_A": strat_a,
        "strategy_B": strat_b,
        "strategy_C": strat_c,
    },
    "active": active,
    "last": last,
    "success_pair": success_pair,
}
print(json.dumps(payload))
PY
}

print_snapshot() {
  local js="$1"
  python3 - <<'PY' "$js"
import json
import sys

j = json.loads(sys.argv[1])
target = j.get("target", 0)
done = j.get("done", {})
fail = j.get("fail", {})
defer = j.get("safety_defer", {})
files = j.get("files", {})
success_pair = j.get("success_pair")

target_text = str(target) if target > 0 else "?"
summary = ""
if success_pair:
    summary = f" success={success_pair[0]}/{success_pair[1]}"

print(
    f"[{j.get('ts')}] status={j.get('status')} phase={j.get('phase')} age_s={j.get('age_s')} target={target_text}{summary}"
)
print(
    f"  progress  A={done.get('A',0)}/{target_text} B={done.get('B',0)}/{target_text} C={done.get('C',0)}/{target_text} "
    f"fails(A/B/C)={fail.get('A',0)}/{fail.get('B',0)}/{fail.get('C',0)} "
    f"defer(A/B)={defer.get('A',0)}/{defer.get('B',0)}"
)
print(
    f"  artifacts final={files.get('final',0)} passA(A/B/C/root)={files.get('passA_A',0)}/{files.get('passA_B',0)}/{files.get('passA_C',0)}/{files.get('passA_root',0)} "
    f"strategy(A/B/C)={files.get('strategy_A',0)}/{files.get('strategy_B',0)}/{files.get('strategy_C',0)}"
)
if j.get("active"):
    print(f"  active    {j.get('active')}")
if j.get("last"):
    print(f"  last      {j.get('last')[:220]}")
print(f"  run_dir   {j.get('run_dir')}")
PY
}

if [ "$FOLLOW" -eq 0 ]; then
  print_snapshot "$(snapshot)"
  exit 0
fi

echo "Monitoring run: $RUN_DIR"
echo "Polling every ${INTERVAL}s (stale threshold: ${STALE_SECONDS}s)"
while true; do
  snap="$(snapshot)"
  print_snapshot "$snap"
  status="$(python3 - <<'PY' "$snap"
import json,sys
print(json.loads(sys.argv[1]).get("status","unknown"))
PY
)"
  if [ "$status" = "completed" ]; then
    exit 0
  fi
  sleep "$INTERVAL"
done

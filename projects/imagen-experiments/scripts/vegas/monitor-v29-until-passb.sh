#!/usr/bin/env bash
set -euo pipefail

INTERNAL_ROOT="${INTERNAL_ROOT:-$HOME/nanobanana-output/_internal}"
RUN_DIR=""
REF_TAG=""
BASE_INTERVAL="${INTERVAL:-20}"
MIN_INTERVAL="${MIN_INTERVAL:-5}"
MAX_INTERVAL="${MAX_INTERVAL:-45}"
STALE_SECONDS="${STALE_SECONDS:-240}"
FOLLOW=1

usage() {
  cat <<'EOF'
Usage:
  monitor-v29-until-passb.sh [options]

Options:
  --run-dir DIR         Monitor a specific managed run directory
  --ref-tag TAG         Reference tag under internal root (e.g. img_1300)
  --internal-root DIR   Internal root containing <ref-tag>/runs (default: $HOME/nanobanana-output/_internal)
  --interval SEC        Base poll interval (default: 20)
  --min-interval SEC    Fastest adaptive interval (default: 5)
  --max-interval SEC    Slowest adaptive interval (default: 45)
  --stale-seconds SEC   Mark stale when run.log age exceeds this (default: 240)
  --once                Print one snapshot and exit
  -h, --help            Show help

Stop condition:
  - Exits with code 0 once all Phase B work is done:
    - "PHASE C + FINAL AUDIT START" appears, OR
    - done_B + fail_B >= target_count (for the run range)
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
      BASE_INTERVAL="${2:-}"
      shift 2
      ;;
    --min-interval)
      MIN_INTERVAL="${2:-}"
      shift 2
      ;;
    --max-interval)
      MAX_INTERVAL="${2:-}"
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
for v in BASE_INTERVAL MIN_INTERVAL MAX_INTERVAL STALE_SECONDS; do
  if ! [[ "${!v}" =~ ^[0-9]+$ ]] || [ "${!v}" -lt 1 ]; then
    echo "Invalid numeric value for ${v}" >&2
    exit 1
  fi
done
if [ "$MIN_INTERVAL" -gt "$BASE_INTERVAL" ]; then
  MIN_INTERVAL="$BASE_INTERVAL"
fi
if [ "$MAX_INTERVAL" -lt "$BASE_INTERVAL" ]; then
  MAX_INTERVAL="$BASE_INTERVAL"
fi

resolve_run_dir() {
  python3 - "$INTERNAL_ROOT" "$REF_TAG" <<'PY'
import sys
from pathlib import Path

internal_root = Path(sys.argv[1]).expanduser()
ref_tag = (sys.argv[2] or "").strip()

def newest_run_dir(base: Path) -> str:
    if not base.exists():
        return ""
    cands = []
    for p in base.rglob("run.log"):
        run_dir = p.parent
        try:
            mt = p.stat().st_mtime
        except Exception:
            continue
        cands.append((mt, str(run_dir)))
    if not cands:
        return ""
    cands.sort(key=lambda x: x[0], reverse=True)
    return cands[0][1]

base = internal_root / ref_tag / "runs" if ref_tag else internal_root
print(newest_run_dir(base))
PY
}

if [ -z "$RUN_DIR" ]; then
  RUN_DIR="$(resolve_run_dir)"
fi
if [ -z "$RUN_DIR" ]; then
  echo "No run found under $INTERNAL_ROOT${REF_TAG:+ (ref-tag=$REF_TAG)}" >&2
  exit 1
fi

RUN_LOG="$RUN_DIR/run.log"
if [ ! -f "$RUN_LOG" ]; then
  echo "run.log not found: $RUN_LOG" >&2
  exit 1
fi

snapshot_json() {
  python3 - "$RUN_DIR" "$RUN_LOG" "$STALE_SECONDS" <<'PY'
import json
import re
import sys
from datetime import datetime
from pathlib import Path

run_dir = Path(sys.argv[1])
run_log = Path(sys.argv[2])
stale_seconds = int(sys.argv[3])

def concept_name(line: str):
    m = re.search(r"([0-9]{3}-[A-Za-z0-9_-]+)", line)
    return m.group(1) if m else None

def read_tail(path: Path, max_bytes: int = 6 * 1024 * 1024) -> str:
    if not path.exists():
        return ""
    with path.open("rb") as fh:
        fh.seek(0, 2)
        size = fh.tell()
        fh.seek(max(size - max_bytes, 0))
        return fh.read().decode("utf-8", errors="ignore")

text = read_tail(run_log)
lines = text.splitlines()

now = datetime.now().timestamp()
try:
    age_s = int(max(0, now - run_log.stat().st_mtime))
    size_b = int(run_log.stat().st_size)
except Exception:
    age_s = -1
    size_b = -1

target = 0
m_target = re.search(r"Range:\s*\d+\s*-\s*\d+\s*\(count=(\d+)\)", text)
if m_target:
    target = int(m_target.group(1))

phase_b_started = "PHASE B START" in text
phase_c_started = "PHASE C + FINAL AUDIT START" in text

done_b = set()
fail_b = set()
defer_b = set()
for line in lines:
    if "PHASE B DONE" in line or "PHASE B SAFETY-REVISIT DONE" in line:
        name = concept_name(line)
        if name:
            done_b.add(name)
    if "PHASE B FAIL " in line or "PHASE B SAFETY-REVISIT EXHAUSTED " in line:
        name = concept_name(line)
        if name:
            fail_b.add(name)
    if "PHASE B SAFETY-DEFER" in line:
        name = concept_name(line)
        if name:
            defer_b.add(name)

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

strategy_b_count = sum(1 for p in (run_dir / "strategy-B").glob("*.png")) if (run_dir / "strategy-B").exists() else 0
pass_b_stage_done = False
done_reason = ""
if phase_c_started:
    pass_b_stage_done = True
    done_reason = "phase_c_started"
elif target > 0 and phase_b_started and (len(done_b) + len(fail_b)) >= target:
    pass_b_stage_done = True
    done_reason = "done_b_plus_fail_b_reached_target"

if pass_b_stage_done:
    status = "passb_done"
elif age_s >= 0 and age_s > stale_seconds:
    status = "stale"
else:
    status = "running"

payload = {
    "ts": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "run_dir": str(run_dir),
    "status": status,
    "target": target,
    "age_s": age_s,
    "size_b": size_b,
    "phase_b_started": phase_b_started,
    "phase_c_started": phase_c_started,
    "done_b": len(done_b),
    "fail_b": len(fail_b),
    "defer_b": len(defer_b),
    "strategy_b_png": strategy_b_count,
    "pass_b_stage_done": pass_b_stage_done,
    "done_reason": done_reason,
    "active": active,
    "last": last,
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
target_txt = str(target) if target > 0 else "?"
print(
    f"[{j.get('ts')}] status={j.get('status')} age_s={j.get('age_s')} "
    f"B={j.get('done_b')}/{target_txt} failB={j.get('fail_b')} deferB={j.get('defer_b')} "
    f"strategyB={j.get('strategy_b_png')} phaseB={str(j.get('phase_b_started')).lower()} phaseC={str(j.get('phase_c_started')).lower()}"
)
if j.get("active"):
    print(f"  active {j.get('active')}")
if j.get("last"):
    print(f"  last   {j.get('last')[:220]}")
if j.get("pass_b_stage_done"):
    print(f"  done   reason={j.get('done_reason')}")
print(f"  run    {j.get('run_dir')}")
PY
}

extract_field() {
  local js="$1"
  local field="$2"
  python3 - <<'PY' "$js" "$field"
import json, sys
j = json.loads(sys.argv[1])
v = j.get(sys.argv[2])
if isinstance(v, bool):
    print("1" if v else "0")
else:
    print(v if v is not None else "")
PY
}

if [ "$FOLLOW" -eq 0 ]; then
  print_snapshot "$(snapshot_json)"
  exit 0
fi

echo "Monitoring Pass B until completion"
echo "run_dir=$RUN_DIR"
echo "base_interval=${BASE_INTERVAL}s min=${MIN_INTERVAL}s max=${MAX_INTERVAL}s stale=${STALE_SECONDS}s"

current_interval="$BASE_INTERVAL"
last_size="-1"
last_done_b="-1"
idle_polls=0
adaptations=0

while true; do
  snap="$(snapshot_json)"
  print_snapshot "$snap"

  pass_b_done="$(extract_field "$snap" pass_b_stage_done)"
  if [ "$pass_b_done" = "1" ]; then
    echo "Pass B stage complete."
    echo "adaptive_summary: adaptations_made=${adaptations} final_interval=${current_interval}s"
    exit 0
  fi

  size_b="$(extract_field "$snap" size_b)"
  done_b="$(extract_field "$snap" done_b)"
  age_s="$(extract_field "$snap" age_s)"
  phase_b_started="$(extract_field "$snap" phase_b_started)"
  active_line="$(extract_field "$snap" active)"

  progressed=0
  if [ "$size_b" != "$last_size" ] || [ "$done_b" != "$last_done_b" ]; then
    progressed=1
  fi
  last_size="$size_b"
  last_done_b="$done_b"

  if [ "$progressed" -eq 1 ]; then
    idle_polls=0
  else
    idle_polls=$((idle_polls + 1))
  fi

  desired_interval="$BASE_INTERVAL"
  if [ "$phase_b_started" = "1" ]; then
    desired_interval="$BASE_INTERVAL"
    if printf '%s' "$active_line" | rg -q "PASS B "; then
      half=$((BASE_INTERVAL / 2))
      if [ "$half" -lt "$MIN_INTERVAL" ]; then
        half="$MIN_INTERVAL"
      fi
      desired_interval="$half"
    fi
    if [ "$idle_polls" -ge 3 ]; then
      desired_interval=$((BASE_INTERVAL * 2))
      if [ "$desired_interval" -gt "$MAX_INTERVAL" ]; then
        desired_interval="$MAX_INTERVAL"
      fi
    fi
  fi

  if [ "$age_s" -ge "$STALE_SECONDS" ]; then
    desired_interval="$MIN_INTERVAL"
  fi

  if [ "$desired_interval" != "$current_interval" ]; then
    adaptations=$((adaptations + 1))
    echo "adaptive_change #${adaptations}: interval ${current_interval}s -> ${desired_interval}s (idle_polls=${idle_polls}, age_s=${age_s}, phase_b_started=${phase_b_started})"
    current_interval="$desired_interval"
  fi

  sleep "$current_interval"
done


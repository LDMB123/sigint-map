#!/usr/bin/env bash
set -u
set +e
set -o pipefail

OUT_DIR="${OUT_DIR:-/Users/louisherman/nanobanana-output/pool-luxe-lace-v1-dual-ab-batch-20260213}"
SRC_JSONL="${SRC_JSONL:-$OUT_DIR/learning-audit.jsonl}"
FINDINGS_DIR="${FINDINGS_DIR:-$OUT_DIR/findings}"
RUN_ID="${RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
START_TS="${START_TS:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
OUT_JSONL="$FINDINGS_DIR/findings-$RUN_ID.jsonl"
OUT_MD="$FINDINGS_DIR/findings-$RUN_ID.md"
HEARTBEAT_LOG="$FINDINGS_DIR/findings-$RUN_ID.log"
LOCK_DIR="${LOCK_DIR:-/tmp/v29_findings_monitor.lock}"

ts(){ date '+%Y-%m-%d %H:%M:%S'; }

mkdir -p "$FINDINGS_DIR"
touch "$OUT_JSONL" "$HEARTBEAT_LOG"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  if [ -f "$LOCK_DIR/pid" ]; then
    old_pid="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
    if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
      echo "[$(ts)] findings_monitor_exit reason=already_running pid=$old_pid" | tee -a "$HEARTBEAT_LOG"
      exit 0
    fi
    rm -rf "$LOCK_DIR" 2>/dev/null || true
  else
    rm -rf "$LOCK_DIR" 2>/dev/null || true
  fi
  mkdir "$LOCK_DIR" 2>/dev/null || {
    echo "[$(ts)] findings_monitor_exit reason=lock_acquire_failed path=$LOCK_DIR" | tee -a "$HEARTBEAT_LOG"
    exit 1
  }
fi
echo $$ > "$LOCK_DIR/pid"
cleanup_lock() { rm -rf "$LOCK_DIR" 2>/dev/null || true; }
trap cleanup_lock EXIT INT TERM

cat > "$OUT_MD" <<EOF
# V29 Findings Since $START_TS

Run ID: \`$RUN_ID\`
Source: \`$SRC_JSONL\`

## Entries
EOF

echo "[$(ts)] findings_monitor_start run_id=$RUN_ID start_ts=$START_TS source=$SRC_JSONL" | tee -a "$HEARTBEAT_LOG"

if [ ! -f "$SRC_JSONL" ]; then
  echo "[$(ts)] findings_monitor_wait source_missing path=$SRC_JSONL" | tee -a "$HEARTBEAT_LOG"
  while [ ! -f "$SRC_JSONL" ]; do sleep 10; done
fi

tail -n 0 -F "$SRC_JSONL" | while IFS= read -r line; do
  printf '%s\n' "$line" | python3 - "$START_TS" "$OUT_JSONL" "$OUT_MD" "$HEARTBEAT_LOG" <<'PY'
import json
import sys
from datetime import datetime
from pathlib import Path

start_ts = sys.argv[1]
out_jsonl = Path(sys.argv[2])
out_md = Path(sys.argv[3])
hb = Path(sys.argv[4])
raw = sys.stdin.read().strip()
if not raw:
    raise SystemExit(0)

def parse_iso(s: str):
    s = (s or "").strip()
    if not s:
        return None
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(s)
    except Exception:
        return None

start_dt = parse_iso(start_ts)
rec = None
try:
    rec = json.loads(raw)
except Exception:
    hb.write_text(hb.read_text() + f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] findings_monitor_warn invalid_json\n")
    raise SystemExit(0)

rec_ts_raw = str(rec.get("timestamp", "")).strip()
rec_dt = parse_iso(rec_ts_raw)
if start_dt and rec_dt and rec_dt < start_dt:
    raise SystemExit(0)

concept = rec.get("concept", "unknown")
winner = (rec.get("winner") or {}).get("approach", "n/a")
winner_score = (rec.get("winner") or {}).get("score", 0)
perf = rec.get("performance") or {}
deltas = perf.get("deltas") or {}
c_gain = deltas.get("C_vs_best_ab", 0)
risk_flags = (rec.get("audit_quality") or {}).get("risk_flags") or []
actions = rec.get("recommended_actions") or []
top_actions = actions[:3]

with out_jsonl.open("a", encoding="utf-8") as f:
    f.write(raw + "\n")

actions_txt = " | ".join(top_actions) if top_actions else "none"
flags_txt = ", ".join(risk_flags) if risk_flags else "none"
line = (
    f"- {rec_ts_raw} | {concept} | winner={winner} ({float(winner_score):.2f}) "
    f"| C_vs_best_ab={float(c_gain):+.2f} | risk_flags={flags_txt} | top_actions={actions_txt}\n"
)
with out_md.open("a", encoding="utf-8") as f:
    f.write(line)

with hb.open("a", encoding="utf-8") as f:
    f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] findings_monitor_entry concept={concept} winner={winner} c_gain={float(c_gain):+.2f}\n")
PY
done

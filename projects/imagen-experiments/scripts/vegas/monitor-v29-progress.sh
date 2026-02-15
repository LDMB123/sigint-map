#!/usr/bin/env bash
set -u
set +e
set -o pipefail

OUT="${OUT_DIR:-/Users/louisherman/nanobanana-output/pool-luxe-lace-v1-dual-ab-batch-20260213}"
RUN_LOG="${RUN_LOG:-/Users/louisherman/gen-pool-luxe-lace-v29-full.log}"
LOG="${PROGRESS_LOG:-/Users/louisherman/gen-pool-luxe-lace-v29-progress.log}"
INTERVAL="${INTERVAL:-60}"
INPUT_IMAGE="${INPUT_IMAGE:-/Users/louisherman/Documents/491231442_10232851854971067_1036101440880166670_n.jpeg}"
START_IDX="${START_IDX:-0}"
END_IDX="${END_IDX:-20}"
TARGET_COUNT="${TARGET_COUNT:-20}"
LOCK_DIR="${LOCK_DIR:-/tmp/v29_monitor.lock}"

ts(){ date '+%Y-%m-%d %H:%M:%S'; }

# Singleton guard: prevent multiple monitors from racing each other.
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  if [ -f "$LOCK_DIR/pid" ]; then
    old_pid="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
    if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
      echo "[$(ts)] monitor_exit reason=already_running pid=$old_pid" >> "$LOG"
      exit 0
    fi
    rm -rf "$LOCK_DIR" 2>/dev/null || true
  else
    rm -rf "$LOCK_DIR" 2>/dev/null || true
  fi
  mkdir "$LOCK_DIR" 2>/dev/null || {
    echo "[$(ts)] monitor_exit reason=lock_acquire_failed path=$LOCK_DIR" >> "$LOG"
    exit 1
  }
fi
echo $$ > "$LOCK_DIR/pid"
cleanup_lock() { rm -rf "$LOCK_DIR" 2>/dev/null || true; }
trap cleanup_lock EXIT INT TERM

is_v29_full_up() {
  ps -Aww -o command | awk -v input="$INPUT_IMAGE" -v s="$START_IDX" -v e="$END_IDX" '
    $0 ~ "^node[[:space:]]+\\./vegas-v29-apex\\.js[[:space:]]+" input "[[:space:]]+" s "[[:space:]]+" e "([[:space:]]|$)" { found=1 }
    END { exit(found ? 0 : 1) }
  '
}

while true; do
  python3 - "$OUT" "$RUN_LOG" "$(is_v29_full_up && echo up || echo down)" "$TARGET_COUNT" <<'PY' >> "$LOG"
import sys
import re
from pathlib import Path
from datetime import datetime

out = Path(sys.argv[1])
run_log = Path(sys.argv[2])
up = sys.argv[3]
target_expected = int(sys.argv[4]) if len(sys.argv) > 4 else 0

def count_png(path: Path) -> int:
    return len(list(path.glob("*.png"))) if path.exists() else 0

def read_tail_text(path: Path, max_bytes: int = 2 * 1024 * 1024) -> str:
    if not path.exists():
        return ""
    with path.open("rb") as fh:
        fh.seek(0, 2)
        size = fh.tell()
        fh.seek(max(size - max_bytes, 0))
        return fh.read().decode("utf-8", errors="ignore")

count_a = count_png(out / "strategy-A")
count_b = count_png(out / "strategy-B")
count_c = count_png(out / "strategy-C")
count_final = len(list(out.glob("*.png")))

target = target_expected if target_expected > 0 else 0
target_from_log = 0
phase = "unknown"
last_event = ""

tail_text = read_tail_text(run_log)
run_log_age_s = -1
if run_log.exists():
    try:
        run_log_age_s = int(max(0, datetime.now().timestamp() - run_log.stat().st_mtime))
    except Exception:
        run_log_age_s = -1
if tail_text:
    progress = re.findall(r"\[(\d+)\/(\d+)\]", tail_text)
    if progress:
        target_from_log = int(progress[-1][1])
        if target <= 0:
            target = target_from_log

    markers = {
        "phase_a": tail_text.rfind("PHASE A START"),
        "phase_b": tail_text.rfind("PHASE B START"),
        "phase_c": tail_text.rfind("PHASE C + FINAL AUDIT START"),
    }
    phase = max(markers, key=markers.get) if max(markers.values()) >= 0 else "unknown"

    for line in reversed(tail_text.splitlines()):
        if re.search(r"(PASS [ABC]|PHASE [ABC]|SAVED PASS|winner=|AB ITER)", line):
            last_event = line.strip()
            break

need_c = max(target - count_c, 0)
need_final = max(target - count_final, 0)
done = target > 0 and need_c == 0 and need_final == 0
status = "done" if done else "running"

print(
    f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
    f"up={up} phase={phase} target={target} "
    f"log_target={target_from_log} "
    f"run_log_age_s={run_log_age_s} "
    f"A={count_a} B={count_b} C={count_c} final={count_final} "
    f"needC={need_c} needFinal={need_final} status={status} "
    f"last={last_event[:180] if last_event else 'n/a'}"
)
PY
  tail -n 1 "$LOG"
  if tail -n 1 "$LOG" | rg -q "status=done"; then
    exit 0
  fi
  sleep "$INTERVAL"
done
